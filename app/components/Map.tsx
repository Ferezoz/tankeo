"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Station, FuelType } from "@/app/lib/stations";
import { formatDistance } from "@/app/lib/distance";

// Fix Leaflet default icon paths broken by webpack/Next.js bundling
// We override the icon prototype so the default icon URL resolution works.
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

const userIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const cheapestIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const defaultStationIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RecenterProps {
  lat: number;
  lng: number;
}

function Recenter({ lat, lng }: RecenterProps) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

interface MapProps {
  userLat: number;
  userLng: number;
  stations: Station[];
  fuelType: FuelType;
  selectedId: string | null;
  onSelectStation: (id: string) => void;
}

export default function Map({
  userLat,
  userLng,
  stations,
  fuelType,
  selectedId,
  onSelectStation,
}: MapProps) {
  const withPrice = stations.filter((s) => s.prices[fuelType] != null);
  const cheapestId =
    withPrice.length > 0
      ? withPrice.reduce((a, b) =>
          (a.prices[fuelType] ?? Infinity) < (b.prices[fuelType] ?? Infinity)
            ? a
            : b
        ).id
      : null;

  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={13}
      className="h-full w-full rounded-xl"
      style={{ background: "#1a1a2e" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={userLat} lng={userLng} />

      {/* User location marker */}
      <Marker position={[userLat, userLng]} icon={userIcon}>
        <Popup>
          <strong>Tu ubicación</strong>
        </Popup>
      </Marker>

      {/* Station markers */}
      {stations.map((station) => {
        const price = station.prices[fuelType];
        const isCheapest = station.id === cheapestId;
        const icon = isCheapest ? cheapestIcon : defaultStationIcon;

        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={icon}
            eventHandlers={{ click: () => onSelectStation(station.id) }}
          >
            <Popup>
              <div className="text-sm">
                <strong className="block mb-1">{station.name}</strong>
                <span className="text-gray-600">{station.brand}</span>
                {price != null && (
                  <div className="mt-1 text-green-700 font-bold">
                    ${price.toFixed(2)} / L
                  </div>
                )}
                <div className="text-gray-500 text-xs mt-0.5">
                  {formatDistance(station.distance)}
                </div>
                {isCheapest && (
                  <div className="mt-1 text-xs text-green-600 font-semibold">
                    💰 Más barata del área
                  </div>
                )}
                {station.id === selectedId && !isCheapest && (
                  <div className="mt-1 text-xs text-blue-600 font-semibold">
                    📍 Seleccionada
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
