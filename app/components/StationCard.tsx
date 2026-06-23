import type { Station, FuelType } from "@/app/lib/stations";
import { formatDistance } from "@/app/lib/distance";

interface StationCardProps {
  station: Station;
  fuelType: FuelType;
  isCheapest: boolean;
  isClosest: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export default function StationCard({
  station,
  fuelType,
  isCheapest,
  isClosest,
  isSelected,
  onClick,
}: StationCardProps) {
  const price = station.prices[fuelType];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
        isSelected
          ? "border-green-500 bg-green-950/40"
          : "border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-850"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-100 truncate">{station.name}</span>
            {isCheapest && (
              <span className="shrink-0 text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full font-medium">
                💰 Más barata
              </span>
            )}
            {isClosest && (
              <span className="shrink-0 text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                📍 Más cercana
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">{station.brand}</p>
          <p className="text-xs text-gray-600 mt-1 truncate">{station.address}</p>
        </div>

        <div className="shrink-0 text-right">
          {price != null ? (
            <div className="text-2xl font-bold text-green-400">
              ${price.toFixed(2)}
            </div>
          ) : (
            <div className="text-sm text-gray-600">—</div>
          )}
          <div className="text-xs text-gray-500 mt-0.5">
            {formatDistance(station.distance)}
          </div>
        </div>
      </div>
    </button>
  );
}
