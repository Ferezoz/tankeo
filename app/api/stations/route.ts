import { NextRequest, NextResponse } from "next/server";
import type { Station, FuelType } from "@/app/lib/stations";
import { haversineDistance } from "@/app/lib/distance";

// The datos.gob.mx API response shape (approximate)
interface GobMxStation {
  id?: string;
  cre_id?: string;
  name?: string;
  nombre?: string;
  brand?: string;
  razon_social?: string;
  address?: string;
  direccion?: string;
  latitude?: number;
  latitud?: number;
  longitude?: number;
  longitud?: number;
  price?: number;
  precio?: number;
  fuel_type?: string;
  tipo_combustible?: string;
  last_update?: string;
  fecha_actualizacion?: string;
}

interface GobMxResponse {
  results?: GobMxStation[];
  data?: GobMxStation[];
  pagination?: {
    total: number;
    pageSize: number;
    page: number;
  };
}

function normalizeStation(
  raw: GobMxStation,
  fuelType: FuelType,
  userLat: number,
  userLng: number
): Station | null {
  const lat = Number(raw.latitud ?? raw.latitude);
  const lng = Number(raw.longitud ?? raw.longitude);
  const price = Number(raw.precio ?? raw.price);

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

  const id = String(raw.cre_id ?? raw.id ?? Math.random());
  const name = String(raw.nombre ?? raw.name ?? "Gasolinera");
  const brand = String(raw.razon_social ?? raw.brand ?? "Sin marca");
  const address = String(raw.direccion ?? raw.address ?? "");
  const lastUpdate = String(
    raw.fecha_actualizacion ?? raw.last_update ?? new Date().toISOString()
  );

  const priceValue = isNaN(price) || price === 0 ? null : price;

  const prices: Station["prices"] = {
    magna: null,
    premium: null,
    diesel: null,
  };
  prices[fuelType] = priceValue;

  const distance = haversineDistance(userLat, userLng, lat, lng);

  return { id, name, brand, address, lat, lng, prices, distance, lastUpdate };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const fuelType = (searchParams.get("fuelType") ?? "magna") as FuelType;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  try {
    const apiUrl = new URL("https://api.datos.gob.mx/v1/precio-gasolinas");
    apiUrl.searchParams.set("lat", String(lat));
    apiUrl.searchParams.set("lng", String(lng));
    apiUrl.searchParams.set("type", fuelType);
    apiUrl.searchParams.set("pageSize", "50");

    const res = await fetch(apiUrl.toString(), {
      next: { revalidate: 3600 }, // cache 1 hour
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`datos.gob.mx responded with ${res.status}`);
    }

    const json: GobMxResponse = await res.json();
    const rawList: GobMxStation[] = json.results ?? json.data ?? [];

    const stations: Station[] = rawList
      .map((raw) => normalizeStation(raw, fuelType, lat, lng))
      .filter((s): s is Station => s !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30);

    return NextResponse.json({ stations });
  } catch (err) {
    console.error("Error fetching stations:", err);
    // Return empty list on error — client shows a friendly message
    return NextResponse.json({ stations: [], error: String(err) });
  }
}
