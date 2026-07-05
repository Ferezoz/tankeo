export interface GeoCenter {
  lat: number;
  lng: number;
  city: string;
}

// Fallback when no IP geolocation source resolves (local dev, other hosts, or
// every lookup below failing).
export const DEFAULT_CENTER: GeoCenter = {
  lat: 19.4326,
  lng: -99.1332,
  city: "Ciudad de México",
};

function getVisitorIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip");
}

interface IpWhoIsResponse {
  success: boolean;
  country_code?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// ipwho.is is free, keyless, and — per user testing — noticeably more accurate
// for Mexican mobile carriers than Vercel's own IP geolocation headers, which
// misattributed a Toluca visitor to Puebla (a different state entirely).
async function getCenterFromIpWhoIs(ip: string): Promise<GeoCenter | null> {
  try {
    const res = await fetch(`https://ipwho.is/${ip}?lang=es`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;

    const data: IpWhoIsResponse = await res.json();
    if (!data.success) return null;
    if (data.country_code && data.country_code !== "MX") return DEFAULT_CENTER;
    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return null;

    return { lat: data.latitude, lng: data.longitude, city: data.city ?? DEFAULT_CENTER.city };
  } catch {
    return null;
  }
}

// Vercel populates these on every request at the edge — kept as a fast, no-network
// fallback if ipwho.is is slow, rate-limited, or down.
// https://vercel.com/docs/edge-network/headers#x-vercel-ip-city
function getCenterFromVercelHeaders(headers: Headers): GeoCenter | null {
  const country = headers.get("x-vercel-ip-country");
  if (country && country !== "MX") return DEFAULT_CENTER;

  const lat = parseFloat(headers.get("x-vercel-ip-latitude") ?? "");
  const lng = parseFloat(headers.get("x-vercel-ip-longitude") ?? "");
  const rawCity = headers.get("x-vercel-ip-city");

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const city = rawCity ? decodeURIComponent(rawCity) : DEFAULT_CENTER.city;
  return { lat, lng, city };
}

export async function getInitialCenter(headers: Headers): Promise<GeoCenter> {
  const ip = getVisitorIp(headers);
  if (ip) {
    const fromIpWhoIs = await getCenterFromIpWhoIs(ip);
    if (fromIpWhoIs) return fromIpWhoIs;
  }

  return getCenterFromVercelHeaders(headers) ?? DEFAULT_CENTER;
}
