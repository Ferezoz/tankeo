"use client";

import { useState } from "react";
import type { Station, FuelType } from "@/app/lib/stations";
import StationCard from "./StationCard";

type SortMode = "distance" | "price";

interface StationListProps {
  stations: Station[];
  fuelType: FuelType;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function StationList({
  stations,
  fuelType,
  selectedId,
  onSelect,
}: StationListProps) {
  const [sortMode, setSortMode] = useState<SortMode>("distance");

  const withPrice = stations.filter((s) => s.prices[fuelType] != null);
  const withoutPrice = stations.filter((s) => s.prices[fuelType] == null);

  const cheapestId =
    withPrice.length > 0
      ? withPrice.reduce((a, b) =>
          (a.prices[fuelType] ?? Infinity) < (b.prices[fuelType] ?? Infinity)
            ? a
            : b
        ).id
      : null;

  const closestId = stations.length > 0 ? stations[0].id : null;

  const sorted = [...stations].sort((a, b) => {
    if (sortMode === "price") {
      const pa = a.prices[fuelType] ?? Infinity;
      const pb = b.prices[fuelType] ?? Infinity;
      return pa - pb;
    }
    return a.distance - b.distance;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Sort toggle */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <span className="text-xs text-gray-500 mr-1">Ordenar:</span>
        <button
          onClick={() => setSortMode("distance")}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            sortMode === "distance"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          📍 Distancia
        </button>
        <button
          onClick={() => setSortMode("price")}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            sortMode === "price"
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          💰 Precio
        </button>
      </div>

      {/* Summary row */}
      {withPrice.length > 0 && (
        <div className="flex gap-3 mb-4 shrink-0">
          {cheapestId && (
            <div className="flex-1 bg-green-950/50 border border-green-800 rounded-lg p-3">
              <p className="text-xs text-green-500 mb-0.5">Más barata</p>
              <p className="text-sm font-semibold text-green-300 truncate">
                {stations.find((s) => s.id === cheapestId)?.name}
              </p>
              <p className="text-xl font-bold text-green-400">
                ${stations
                  .find((s) => s.id === cheapestId)
                  ?.prices[fuelType]?.toFixed(2)}
              </p>
            </div>
          )}
          {closestId && (
            <div className="flex-1 bg-blue-950/50 border border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-500 mb-0.5">Más cercana</p>
              <p className="text-sm font-semibold text-blue-300 truncate">
                {stations.find((s) => s.id === closestId)?.name}
              </p>
              <p className="text-xl font-bold text-blue-400">
                {formatDistanceShort(
                  stations.find((s) => s.id === closestId)?.distance ?? 0
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <p className="text-4xl mb-3">⛽</p>
            <p>No se encontraron gasolineras</p>
            <p className="text-xs mt-1">Intenta con otra ubicación</p>
          </div>
        ) : (
          sorted.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              fuelType={fuelType}
              isCheapest={station.id === cheapestId}
              isClosest={station.id === closestId}
              isSelected={station.id === selectedId}
              onClick={() => onSelect(station.id)}
            />
          ))
        )}
        {withoutPrice.length > 0 && withPrice.length > 0 && (
          <p className="text-xs text-center text-gray-700 py-2">
            {withoutPrice.length} estación(es) sin precio disponible
          </p>
        )}
      </div>
    </div>
  );
}

function formatDistanceShort(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
