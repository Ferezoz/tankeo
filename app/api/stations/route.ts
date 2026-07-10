import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";
import type { Station } from "@/app/lib/stations";
import { haversineDistance } from "@/app/lib/distance";
import { fetchAndParseCreFeeds, type StationsData } from "@/app/lib/creFeeds";

const LEGAL_SUFFIXES = /[\s,]+(S\.?A\.?\s+De\s+C\.?V\.?|S\s+De\s+R\.?L\.?\s+(De\s+C\.?V\.?)?|S\.?A\.?P\.?I\.?\s+De\s+C\.?V\.?|S\.?C\.?|Inc\.?|S\.?A\.?)\.?$/i;

function cleanName(raw: string): string {
  const titleCased = raw.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return titleCased.replace(LEGAL_SUFFIXES, "").trim();
}

const RADIUS_KM = 10;
const BLOB_PATHNAME = "stations-data.json";

// Next.js's built-in fetch cache silently refuses to store responses over 2MB
// (the places feed alone is ~4MB), so `next: { revalidate }` never actually
// cached anything — every request re-fetched and re-parsed both feeds from
// scratch. A `/api/cron/refresh-stations` cron job (once daily, matching
// CRE's own update cadence) now fetches+parses both feeds and writes the
// small result to Vercel Blob storage; this route just reads that blob. This
// module-level object still caches the read for the lifetime of a warm
// instance, so most requests don't even hit Blob storage.
const CACHE_TTL_MS = 60 * 60 * 1000;
// If the cron hasn't refreshed the blob in this long (i.e. it's failed
// outright for over a day), the data is stale enough that fetching CRE
// directly is a better fallback than serving it.
const BLOB_MAX_AGE_MS = 48 * 60 * 60 * 1000;

let cache: { data: StationsData; fetchedAt: number } | null = null;

async function getStationsData(): Promise<StationsData> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const blobInfo = await head(BLOB_PATHNAME);
    const age = Date.now() - new Date(blobInfo.uploadedAt).getTime();
    if (age > BLOB_MAX_AGE_MS) throw new Error("blob too stale");
    const res = await fetch(blobInfo.url);
    if (!res.ok) throw new Error(`blob fetch responded ${res.status}`);
    const data: StationsData = await res.json();
    cache = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    // Blob missing (first deploy, before the cron has run once), too stale,
    // or unreadable — fall through to fetching CRE directly.
  }

  try {
    const data = await fetchAndParseCreFeeds();
    cache = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) {
    // CRE's feeds temporarily down too — serve stale data rather than fail outright.
    if (cache) return cache.data;
    throw err;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const { places, prices } = await getStationsData();

    const stations: Station[] = [];

    for (const placeId in places) {
      const [name, placeLat, placeLng] = places[placeId];
      const distance = haversineDistance(lat, lng, placeLat, placeLng);
      if (distance > RADIUS_KM) continue;

      const [regular, premium, diesel] = prices[placeId] ?? [null, null, null];

      stations.push({
        id: placeId,
        name: cleanName(name),
        brand: "",
        address: "",
        lat: placeLat,
        lng: placeLng,
        prices: { magna: regular, premium, diesel },
        distance,
        lastUpdate: new Date().toISOString(),
      });
    }

    stations.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ stations: stations.slice(0, 30) });
  } catch (err) {
    console.error("Error fetching stations:", err);
    return NextResponse.json({ stations: [], error: String(err) });
  }
}
