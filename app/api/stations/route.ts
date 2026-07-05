import { NextRequest, NextResponse } from "next/server";
import type { Station, FuelType } from "@/app/lib/stations";
import { haversineDistance } from "@/app/lib/distance";

const LEGAL_SUFFIXES = /[\s,]+(S\.?A\.?\s+De\s+C\.?V\.?|S\s+De\s+R\.?L\.?\s+(De\s+C\.?V\.?)?|S\.?A\.?P\.?I\.?\s+De\s+C\.?V\.?|S\.?C\.?|Inc\.?|S\.?A\.?)\.?$/i;

function cleanName(raw: string): string {
  const titleCased = raw.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return titleCased.replace(LEGAL_SUFFIXES, "").trim();
}


const PLACES_URL = "https://publicacionexterna.azurewebsites.net/publicaciones/places";
const PRICES_URL = "https://publicacionexterna.azurewebsites.net/publicaciones/prices";
const RADIUS_KM = 10;

interface PlaceEntry {
  placeId: string;
  name: string;
  cre_id: string;
  lat: number;
  lng: number;
}

interface PriceEntry {
  placeId: string;
  regular: number | null;
  premium: number | null;
  diesel: number | null;
}

function parsePlaces(xml: string): Map<string, PlaceEntry> {
  const map = new Map<string, PlaceEntry>();
  const placeRe = /<place place_id="(\d+)">([\s\S]*?)<\/place>/g;
  let m: RegExpExecArray | null;
  while ((m = placeRe.exec(xml)) !== null) {
    const placeId = m[1];
    const body = m[2];
    const name = (/<name>([\s\S]*?)<\/name>/.exec(body)?.[1] ?? "").trim();
    const cre_id = (/<cre_id>([\s\S]*?)<\/cre_id>/.exec(body)?.[1] ?? "").trim();
    const x = parseFloat(/<x>([\s\S]*?)<\/x>/.exec(body)?.[1] ?? "");
    const y = parseFloat(/<y>([\s\S]*?)<\/y>/.exec(body)?.[1] ?? "");
    if (!isNaN(x) && !isNaN(y)) {
      map.set(placeId, { placeId, name, cre_id, lat: y, lng: x });
    }
  }
  return map;
}

function parsePrices(xml: string): Map<string, PriceEntry> {
  const map = new Map<string, PriceEntry>();
  const placeRe = /<place place_id="(\d+)">([\s\S]*?)<\/place>/g;
  let m: RegExpExecArray | null;
  while ((m = placeRe.exec(xml)) !== null) {
    const placeId = m[1];
    const body = m[2];
    const getPrice = (type: string) => {
      const val = parseFloat(
        new RegExp(`<gas_price type="${type}">(.*?)<\\/gas_price>`).exec(body)?.[1] ?? ""
      );
      return isNaN(val) ? null : val;
    };
    const entry = map.get(placeId) ?? { placeId, regular: null, premium: null, diesel: null };
    entry.regular = entry.regular ?? getPrice("regular");
    entry.premium = entry.premium ?? getPrice("premium");
    entry.diesel = entry.diesel ?? getPrice("diesel");
    map.set(placeId, entry);
  }
  return map;
}

// Next.js's built-in fetch cache silently refuses to store responses over 2MB
// (the places feed alone is ~4MB), so `next: { revalidate }` never actually
// cached anything — every request re-fetched and re-parsed both feeds from
// scratch. This module-level cache stores the already-parsed (much smaller)
// data instead, with a manual 1-hour TTL. It persists only for the lifetime of
// a warm serverless instance, which is good enough at current traffic; a
// shared store (Vercel KV + a scheduled refresh) would be the proper fix if
// cold starts become frequent enough to matter — see GROWTH.md.
const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { places: Map<string, PlaceEntry>; prices: Map<string, PriceEntry>; fetchedAt: number } | null = null;

async function getStationsData(): Promise<{ places: Map<string, PlaceEntry>; prices: Map<string, PriceEntry> }> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  try {
    const [placesRes, pricesRes] = await Promise.all([fetch(PLACES_URL), fetch(PRICES_URL)]);

    if (!placesRes.ok) throw new Error(`places responded ${placesRes.status}`);
    if (!pricesRes.ok) throw new Error(`prices responded ${pricesRes.status}`);

    const [placesXml, pricesXml] = await Promise.all([placesRes.text(), pricesRes.text()]);

    cache = { places: parsePlaces(placesXml), prices: parsePrices(pricesXml), fetchedAt: Date.now() };
    return cache;
  } catch (err) {
    // CRE's feeds temporarily down — serve stale data rather than fail outright.
    if (cache) return cache;
    throw err;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const fuelType = (searchParams.get("fuelType") ?? "magna") as FuelType;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const { places, prices } = await getStationsData();

    // Map fuelType to price key
    const priceKey: Record<FuelType, keyof PriceEntry> = {
      magna: "regular",
      premium: "premium",
      diesel: "diesel",
    };
    const key = priceKey[fuelType];

    const stations: Station[] = [];

    for (const [placeId, place] of places) {
      const distance = haversineDistance(lat, lng, place.lat, place.lng);
      if (distance > RADIUS_KM) continue;

      const price = prices.get(placeId);
      const priceValue = price ? (price[key] as number | null) : null;

      stations.push({
        id: placeId,
        name: cleanName(place.name),
        brand: "",
        address: "",
        lat: place.lat,
        lng: place.lng,
        prices: {
          magna: price?.regular ?? null,
          premium: price?.premium ?? null,
          diesel: price?.diesel ?? null,
        },
        distance,
        lastUpdate: new Date().toISOString(),
      });

      void priceValue;
    }

    stations.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ stations: stations.slice(0, 30) });
  } catch (err) {
    console.error("Error fetching stations:", err);
    return NextResponse.json({ stations: [], error: String(err) });
  }
}
