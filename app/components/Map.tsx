"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { getDirectionsUrl, useMapApp } from "./DirectionsButton";
import L from "leaflet";
import type { Station, FuelType } from "@/app/lib/stations";
import { formatDistance } from "@/app/lib/distance";

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

const currentLocationIcon = L.divIcon({
  html: `<div style="position:relative;width:16px;height:16px;">
      <div class="animate-ping [animation-duration:2.5s]" style="
          position:absolute;inset:0;border-radius:50%;
          background:#2563eb;opacity:0.5;
        "></div>
      <div style="
          position:relative;width:16px;height:16px;border-radius:50%;
          background:#2563eb;border:3px solid white;
          box-shadow:0 0 0 2px rgba(37,99,235,0.5),0 1px 4px rgba(0,0,0,0.4);
        "></div>
    </div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

function createPriceIcon(price: number | null, isCheapest: boolean, isClosest: boolean, isSelected: boolean): L.DivIcon {
  const label = price != null ? `$${price.toFixed(2)}` : "—";
  const bg = isCheapest ? "#16a34a" : isClosest ? "#9333ea" : isSelected ? "#ffffff" : "#374151";
  const border = isCheapest ? "#15803d" : isClosest ? "#7e22ce" : isSelected ? "#d1d5db" : "#4b5563";
  const color = isSelected && !isCheapest && !isClosest ? "#111827" : "white";
  const scale = isSelected ? "scale(1.15)" : "scale(1)";

  return L.divIcon({
    html: `<div style="
        background:${bg};
        border:2px solid ${border};
        border-radius:6px;
        padding:2px 5px;
        font-size:11px;
        font-weight:700;
        color:white;
        white-space:nowrap;
        box-shadow:0 2px 6px rgba(0,0,0,0.5);
        transform:${scale};
        transform-origin:bottom center;
        text-align:center;
        color:${color};
        position:relative;
      ">
        ${label}
        <div style="
          position:absolute;bottom:-6px;left:50%;
          transform:translateX(-50%);
          width:0;height:0;
          border-left:5px solid transparent;
          border-right:5px solid transparent;
          border-top:6px solid ${border};
        "></div>
      </div>`,
    className: "",
    iconSize: [52, 28],
    iconAnchor: [26, 28],
    popupAnchor: [0, -34],
  });
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

function SearchHereButton({ activeLat, activeLng, onSearchHere }: { activeLat: number; activeLng: number; onSearchHere: (lat: number, lng: number) => void }) {
  const [moved, setMoved] = useState(false);
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const dist = Math.sqrt((center.lat - activeLat) ** 2 + (center.lng - activeLng) ** 2);
      setMoved(dist > 0.005);
    },
  });

  if (!moved) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
      <button
        onClick={() => {
          const center = map.getCenter();
          onSearchHere(center.lat, center.lng);
          setMoved(false);
        }}
        className="bg-white hover:bg-gray-100 text-gray-900 text-xs font-medium px-4 py-2 rounded-full shadow-lg cursor-pointer transition-colors"
      >
        🔍 Buscar en esta zona
      </button>
    </div>
  );
}

function HomeProximityTracker({
  userLat,
  userLng,
  onChange,
}: {
  userLat: number;
  userLng: number;
  onChange: (atHome: boolean) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const dist = Math.sqrt((center.lat - userLat) ** 2 + (center.lng - userLng) ** 2);
      onChange(dist <= 0.005);
    },
  });
  return null;
}

function CityChip({ city }: { city: string }) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
      <span className="bg-white text-gray-900 text-xs font-medium px-4 py-2 rounded-full shadow-lg">
        {city}
      </span>
    </div>
  );
}

interface MapProps {
  userLat: number;
  userLng: number;
  activeLat: number;
  activeLng: number;
  hasPrecise: boolean;
  city: string;
  requestingLocation: boolean;
  stations: Station[];
  fuelType: FuelType;
  selectedId: string | null;
  focusKey: number;
  onSelectStation: (id: string) => void;
  onSearchHere: (lat: number, lng: number) => void;
  onRecenter: () => void;
  onRequestLocation: () => void;
}

function RecenterButton({
  userLat,
  userLng,
  hasPrecise,
  isAtGpsLocation,
  requesting,
  onRecenter,
  onRequestLocation,
}: {
  userLat: number;
  userLng: number;
  hasPrecise: boolean;
  isAtGpsLocation: boolean;
  requesting: boolean;
  onRecenter: () => void;
  onRequestLocation: () => void;
}) {
  const map = useMap();

  const handleClick = () => {
    if (requesting) return;
    if (hasPrecise) {
      map.setView([userLat, userLng], typeof window !== "undefined" && window.innerWidth < 768 ? 14 : 15);
      onRecenter();
    } else {
      onRequestLocation();
    }
  };

  return (
    <div className="absolute bottom-8 right-2 z-[1000]">
      {!hasPrecise && !requesting && (
        <>
          <span className="absolute inset-0 rounded border-2 border-green-500 animate-ping [animation-duration:2.5s]" />
          <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-medium text-gray-900 shadow-lg">
            Usar mi ubicación
            <div className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 bg-white" />
          </div>
        </>
      )}
      <button
        onClick={handleClick}
        title={hasPrecise ? "Mi ubicación" : requesting ? "Buscando ubicación..." : "Usar mi ubicación exacta"}
        className={`relative w-8 h-8 bg-white hover:bg-gray-100 text-gray-700 rounded shadow-md flex items-center justify-center text-sm cursor-pointer border border-gray-300 transition-colors disabled:opacity-60 ${
          !hasPrecise ? "ring-2 ring-green-500" : ""
        }`}
        disabled={requesting}
      >
        {requesting ? (
          <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : isAtGpsLocation ? (
          <span className="relative w-3 h-3">
            <span className="absolute inset-0 rounded-full border-2 border-blue-600 animate-ping [animation-duration:2.5s]" />
            <span className="relative block w-3 h-3 rounded-full border-2 border-blue-600" />
          </span>
        ) : (
          "◎"
        )}
      </button>
    </div>
  );
}

export default function Map({ userLat, userLng, activeLat, activeLng, hasPrecise, city, requestingLocation, stations, fuelType, selectedId, focusKey, onSelectStation, onSearchHere, onRecenter, onRequestLocation }: MapProps) {
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const preferred = useMapApp();
  const [atHome, setAtHome] = useState(true);
  const [hasMovedOnce, setHasMovedOnce] = useState(false);
  const isAtGpsLocation = hasPrecise && atHome;

  const handleHomeProximityChange = useCallback((newAtHome: boolean) => {
    setAtHome(newAtHome);
    if (!newAtHome) setHasMovedOnce(true);
  }, []);

  // <Recenter> always re-centers the map whenever home coordinates change, so we
  // know synchronously we're at home — no need to wait on Leaflet's async moveend,
  // which can fire with a stale closure (still comparing against the old home) and
  // wrongly latch atHome to false.
  useEffect(() => {
    setAtHome(true);
  }, [userLat, userLng]);

  const withPrice = stations.filter((s) => s.prices[fuelType] != null);
  const cheapestId = withPrice.length > 0
    ? withPrice.reduce((a, b) => (a.prices[fuelType] ?? Infinity) < (b.prices[fuelType] ?? Infinity) ? a : b).id
    : null;
  const closestId = stations.length > 0 ? stations[0].id : null;

  useEffect(() => {
    if (selectedId && markerRefs.current[selectedId]) {
      markerRefs.current[selectedId].openPopup();
    }
  }, [selectedId, focusKey]);

  return (
    <MapContainer center={[userLat, userLng]} zoom={typeof window !== "undefined" && window.innerWidth < 768 ? 14 : 15} className="h-full w-full rounded-xl" style={{ background: "#1a1a2e" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={userLat} lng={userLng} />
      <HomeProximityTracker userLat={userLat} userLng={userLng} onChange={handleHomeProximityChange} />
      <SearchHereButton activeLat={activeLat} activeLng={activeLng} onSearchHere={onSearchHere} />
      {!hasPrecise && atHome && !hasMovedOnce && <CityChip city={city} />}
      <RecenterButton
        userLat={userLat}
        userLng={userLng}
        hasPrecise={hasPrecise}
        isAtGpsLocation={isAtGpsLocation}
        requesting={requestingLocation}
        onRecenter={onRecenter}
        onRequestLocation={onRequestLocation}
      />

      {hasPrecise && (
        <Marker position={[userLat, userLng]} icon={currentLocationIcon}>
          <Popup><strong>Tu ubicación</strong></Popup>
        </Marker>
      )}

      {stations.map((station) => {
        const price = station.prices[fuelType];
        const isCheapest = station.id === cheapestId;
        const isClosest = station.id === closestId;
        const isSelected = station.id === selectedId;

        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={createPriceIcon(price, isCheapest, isClosest, isSelected)}
            ref={(ref) => { if (ref) markerRefs.current[station.id] = ref; }}
            eventHandlers={{ click: () => onSelectStation(station.id) }}
          >
            <Popup>
              <div style={{ minWidth: 140 }}>
                <strong className="block text-xs leading-snug mb-1">{station.name}</strong>
                <div className="flex items-center gap-2">
                  {price != null && <span className="text-green-700 font-bold text-sm">${price.toFixed(2)}</span>}
                  <span className="text-gray-400 text-xs">{formatDistance(station.distance)}</span>
                </div>
                {isCheapest && <div className="text-xs text-green-600 font-medium mt-0.5">💰 Más barata</div>}
                {isClosest && <div className="text-xs text-purple-600 font-medium mt-0.5">📍 Más cercana</div>}
                <a
                  href={getDirectionsUrl(preferred, station.lat, station.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center justify-center gap-1.5 text-xs border border-gray-300 hover:bg-gray-100 !text-gray-600 px-2 py-1 rounded transition-colors"
                >
                  → Cómo llegar
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
