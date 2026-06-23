"use client";

import { useState, useEffect, useCallback } from "react";
import type { Station, FuelType } from "@/app/lib/stations";
import { FUEL_LABELS } from "@/app/lib/stations";
import StationList from "@/app/components/StationList";
import MapWrapper from "@/app/components/MapWrapper";

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied"; message: string };

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; stations: Station[] }
  | { status: "error"; message: string };

const FUEL_TYPES: FuelType[] = ["magna", "premium", "diesel"];

export default function Home() {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [fuelType, setFuelType] = useState<FuelType>("magna");
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    setGeo({ status: "requesting" });
    if (!navigator.geolocation) {
      setGeo({
        status: "denied",
        message: "Tu navegador no soporta geolocalización.",
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: "granted",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setGeo({
          status: "denied",
          message: `No se pudo obtener la ubicación: ${err.message}`,
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Auto-request on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Fetch stations whenever location or fuel type changes
  useEffect(() => {
    if (geo.status !== "granted") return;

    setFetchState({ status: "loading" });
    setSelectedId(null);

    const url = new URL("/api/stations", window.location.origin);
    url.searchParams.set("lat", String(geo.lat));
    url.searchParams.set("lng", String(geo.lng));
    url.searchParams.set("fuelType", fuelType);

    fetch(url.toString())
      .then((res) => res.json())
      .then((data: { stations: Station[]; error?: string }) => {
        setFetchState({ status: "done", stations: data.stations ?? [] });
      })
      .catch((err) => {
        setFetchState({ status: "error", message: String(err) });
      });
  }, [geo, fuelType]);

  // --- Render: permission screens ---
  if (geo.status === "idle" || geo.status === "requesting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
        <div className="text-6xl">⛽</div>
        <h1 className="text-3xl font-bold text-white">Gasolineras MX</h1>
        <p className="text-gray-400 max-w-sm">
          Encuentra las gasolineras más cercanas y baratas en tu área.
        </p>
        {geo.status === "requesting" ? (
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span>Obteniendo ubicación...</span>
          </div>
        ) : (
          <button
            onClick={requestLocation}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
          >
            📍 Compartir ubicación
          </button>
        )}
      </div>
    );
  }

  if (geo.status === "denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
        <div className="text-5xl">🚫</div>
        <h1 className="text-2xl font-bold text-white">Ubicación denegada</h1>
        <p className="text-gray-400 max-w-sm">{geo.message}</p>
        <button
          onClick={requestLocation}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  // geo.status === "granted"
  const stations =
    fetchState.status === "done" ? fetchState.stations : [];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⛽</span>
          <h1 className="text-lg font-bold text-white">Gasolineras MX</h1>
        </div>

        {/* Fuel type selector */}
        <div className="flex gap-1">
          {FUEL_TYPES.map((ft) => (
            <button
              key={ft}
              onClick={() => setFuelType(ft)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                fuelType === ft
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {FUEL_LABELS[ft]}
            </button>
          ))}
        </div>

        {fetchState.status === "loading" && (
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        )}
      </header>

      {/* Body: map + list */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-0">
        {/* Map */}
        <div className="h-64 md:h-full md:flex-1 p-3">
          <MapWrapper
            userLat={geo.lat}
            userLng={geo.lng}
            stations={stations}
            fuelType={fuelType}
            selectedId={selectedId}
            onSelectStation={setSelectedId}
          />
        </div>

        {/* Station list */}
        <div className="flex-1 md:w-96 md:flex-none overflow-hidden flex flex-col p-3">
          {fetchState.status === "error" ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-500">
              <p className="text-3xl">⚠️</p>
              <p className="text-sm">{fetchState.message}</p>
              <button
                onClick={() => setFuelType(fuelType)}
                className="text-xs text-green-500 underline"
              >
                Reintentar
              </button>
            </div>
          ) : fetchState.status === "loading" ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Buscando gasolineras...</span>
            </div>
          ) : (
            <StationList
              stations={stations}
              fuelType={fuelType}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
