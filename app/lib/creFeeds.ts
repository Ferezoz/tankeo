const PLACES_URL = "https://publicacionexterna.azurewebsites.net/publicaciones/places";
const PRICES_URL = "https://publicacionexterna.azurewebsites.net/publicaciones/prices";

// Tuples instead of keyed objects to keep the blob small — this data is
// re-downloaded on every cold serverless instance, so shape matters for
// cold-start latency, not just storage size.
export type PlaceEntry = [name: string, lat: number, lng: number];
export type PriceEntry = [regular: number | null, premium: number | null, diesel: number | null];

export interface StationsData {
  places: Record<string, PlaceEntry>;
  prices: Record<string, PriceEntry>;
}

function parsePlaces(xml: string): Record<string, PlaceEntry> {
  const out: Record<string, PlaceEntry> = {};
  const placeRe = /<place place_id="(\d+)">([\s\S]*?)<\/place>/g;
  let m: RegExpExecArray | null;
  while ((m = placeRe.exec(xml)) !== null) {
    const placeId = m[1];
    const body = m[2];
    const name = (/<name>([\s\S]*?)<\/name>/.exec(body)?.[1] ?? "").trim();
    const x = parseFloat(/<x>([\s\S]*?)<\/x>/.exec(body)?.[1] ?? "");
    const y = parseFloat(/<y>([\s\S]*?)<\/y>/.exec(body)?.[1] ?? "");
    if (!isNaN(x) && !isNaN(y)) out[placeId] = [name, y, x];
  }
  return out;
}

function parsePrices(xml: string): Record<string, PriceEntry> {
  const out: Record<string, PriceEntry> = {};
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
    const entry = out[placeId] ?? [null, null, null];
    if (entry[0] == null) entry[0] = getPrice("regular");
    if (entry[1] == null) entry[1] = getPrice("premium");
    if (entry[2] == null) entry[2] = getPrice("diesel");
    out[placeId] = entry;
  }
  return out;
}

export async function fetchAndParseCreFeeds(): Promise<StationsData> {
  const [placesRes, pricesRes] = await Promise.all([fetch(PLACES_URL), fetch(PRICES_URL)]);
  if (!placesRes.ok) throw new Error(`places responded ${placesRes.status}`);
  if (!pricesRes.ok) throw new Error(`prices responded ${pricesRes.status}`);
  const [placesXml, pricesXml] = await Promise.all([placesRes.text(), pricesRes.text()]);
  return { places: parsePlaces(placesXml), prices: parsePrices(pricesXml) };
}
