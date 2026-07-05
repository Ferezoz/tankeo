export interface GeoCenter {
  lat: number;
  lng: number;
  city: string;
}

// Fallback when Vercel's IP geolocation headers aren't present (local dev, other hosts).
export const DEFAULT_CENTER: GeoCenter = {
  lat: 19.4326,
  lng: -99.1332,
  city: "Ciudad de México",
};

// Vercel populates these on every request at the edge — no permission prompt needed.
// https://vercel.com/docs/edge-network/headers#x-vercel-ip-city
export function getInitialCenter(headers: Headers): GeoCenter {
  // CRE data only covers Mexican stations — outside Mexico there's nothing to show
  // at the visitor's real location, so fall back to a working demo view instead.
  const country = headers.get("x-vercel-ip-country");
  if (country && country !== "MX") return DEFAULT_CENTER;

  const lat = parseFloat(headers.get("x-vercel-ip-latitude") ?? "");
  const lng = parseFloat(headers.get("x-vercel-ip-longitude") ?? "");
  const rawCity = headers.get("x-vercel-ip-city");

  if (Number.isNaN(lat) || Number.isNaN(lng)) return DEFAULT_CENTER;

  const city = rawCity ? decodeURIComponent(rawCity) : DEFAULT_CENTER.city;
  return { lat, lng, city };
}
