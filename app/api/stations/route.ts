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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const fuelType = (searchParams.get("fuelType") ?? "magna") as FuelType;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const [placesRes, pricesRes] = await Promise.all([
      fetch(PLACES_URL, { next: { revalidate: 3600 } }),
      fetch(PRICES_URL, { next: { revalidate: 3600 } }),
    ]);

    if (!placesRes.ok) throw new Error(`places responded ${placesRes.status}`);
    if (!pricesRes.ok) throw new Error(`prices responded ${pricesRes.status}`);

    const [placesXml, pricesXml] = await Promise.all([placesRes.text(), pricesRes.text()]);

    const places = parsePlaces(placesXml);
    const prices = parsePrices(pricesXml);

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
