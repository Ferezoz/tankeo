"use client";

import { useState, useEffect, useCallback } from "react";
import type { Station, FuelType } from "@/app/lib/stations";
import { FUEL_LABELS } from "@/app/lib/stations";
import type { GeoCenter } from "@/app/lib/geo";
import StationList from "@/app/components/StationList";
import MapWrapper from "@/app/components/MapWrapper";
import { MapAppPicker } from "@/app/components/DirectionsButton";

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied" };

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; stations: Station[] }
  | { status: "error"; message: string };

const FUEL_TYPES: FuelType[] = ["magna", "premium", "diesel"];
const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10000 };
// Cell/Wi-Fi based, not a full GPS satellite lock — resolves in ~1s instead of
// potentially timing out on a cold GPS start. Precise enough for "nearby stations".
const SILENT_GEO_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 8000 };

export default function HomeClient({ initialCenter }: { initialCenter: GeoCenter }) {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [fuelType, setFuelType] = useState<FuelType>("magna");
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);

  const selectStation = useCallback((id: string) => {
    setSelectedId(id);
    setFocusKey((k) => k + 1);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeo({ status: "denied" }); return; }
    setGeo({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ status: "granted", lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSearchCenter(null);
      },
      () => setGeo({ status: "denied" }),
      GEO_OPTIONS
    );
  }, []);

  // Checking permission status never prompts — if a prior visit already granted
  // it, upgrade to precise location immediately instead of waiting for a tap on ◎.
  // Unsupported/unreliable (iOS) just silently no-ops, leaving the default center.
  useEffect(() => {
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGeo({ status: "granted", lat: pos.coords.latitude, lng: pos.coords.longitude });
            setSearchCenter(null);
          },
          () => {}, // silent — the ◎ button remains available as a manual, high-accuracy retry
          SILENT_GEO_OPTIONS
        );
      })
      .catch(() => {});
  }, []);

  // "Home" location: precise GPS once granted, otherwise the IP-based city center
  // computed server-side — never gates rendering on a permission decision.
  const homeLat = geo.status === "granted" ? geo.lat : initialCenter.lat;
  const homeLng = geo.status === "granted" ? geo.lng : initialCenter.lng;
  const hasPrecise = geo.status === "granted";
  const fetchCenter = searchCenter ?? { lat: homeLat, lng: homeLng };

  // Fetch stations whenever the effective center or fuel type changes
  useEffect(() => {
    setFetchState({ status: "loading" });
    setSelectedId(null);
    const url = new URL("/api/stations", window.location.origin);
    url.searchParams.set("lat", String(fetchCenter.lat));
    url.searchParams.set("lng", String(fetchCenter.lng));
    url.searchParams.set("fuelType", fuelType);
    fetch(url.toString())
      .then((r) => r.json())
      .then((data: { stations: Station[]; error?: string }) => {
        setFetchState({ status: "done", stations: data.stations ?? [] });
      })
      .catch((err) => setFetchState({ status: "error", message: String(err) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeLat, homeLng, searchCenter, fuelType]);

  const stations = fetchState.status === "done" ? fetchState.stations : [];

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden">

      {/* LEFT COLUMN: title + map */}
      <div className="flex flex-col h-[45dvh] md:h-auto md:flex-1 overflow-hidden">
        <div className="md:hidden safe-top-header shrink-0 flex items-center gap-3 px-4 pb-2 border-b border-gray-200 dark:border-gray-800">
          <img src="/apple-icon" alt="Tankeo" className="w-7 h-7 rounded-lg" />
          <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight mr-auto">Tankeo</h1>
          <MapAppPicker />
        </div>
        <div className="safe-top hidden md:flex shrink-0 items-center gap-2 px-4 h-[52px] border-b border-gray-200 dark:border-gray-800">
          <img src="/apple-icon" alt="Tankeo" className="w-7 h-7 rounded-lg" />
          <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Tankeo</h1>
        </div>
        <div className="flex-1 p-3">
          <MapWrapper
            userLat={homeLat}
            userLng={homeLng}
            activeLat={fetchCenter.lat}
            activeLng={fetchCenter.lng}
            hasPrecise={hasPrecise}
            city={initialCenter.city}
            requestingLocation={geo.status === "requesting"}
            stations={stations}
            fuelType={fuelType}
            selectedId={selectedId}
            focusKey={focusKey}
            onSelectStation={selectStation}
            onSearchHere={(lat, lng) => setSearchCenter({ lat, lng })}
            onRecenter={() => setSearchCenter(null)}
            onRequestLocation={requestLocation}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: fuel buttons + station list */}
      <div className="flex flex-col flex-1 min-h-0 md:flex-none md:w-[420px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="shrink-0 flex items-center px-4 h-[52px] border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-1.5 flex-1 justify-center">
            {FUEL_TYPES.map((ft) => (
              <button key={ft} onClick={() => setFuelType(ft)}
                className={`w-20 py-1.5 text-sm rounded-lg font-medium transition-colors text-center cursor-pointer ${
                  fuelType === ft ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}>
                {FUEL_LABELS[ft]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col px-4 py-3">
          {fetchState.status === "error" ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-400">
              <p className="text-3xl">⚠️</p>
              <p className="text-sm">{fetchState.message}</p>
              <button onClick={() => setFuelType(fuelType)} className="text-xs text-green-600 dark:text-green-500 underline cursor-pointer">
                Reintentar
              </button>
            </div>
          ) : fetchState.status === "loading" ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-300 dark:border-white/40 border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Buscando gasolineras...</span>
            </div>
          ) : (
            <StationList
              stations={stations}
              fuelType={fuelType}
              selectedId={selectedId}
              onSelect={selectStation}
            />
          )}
        </div>
      </div>

    </div>
  );
}
