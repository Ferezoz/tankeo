import type { Station, FuelType } from "@/app/lib/stations";
import { formatDistance } from "@/app/lib/distance";
import DirectionsButton from "./DirectionsButton";

interface StationCardProps {
  station: Station;
  fuelType: FuelType;
  isCheapest: boolean;
  isClosest: boolean;
  isSelected: boolean;
  cheapestPrice: number | null;
  onClick: () => void;
}

export default function StationCard({
  station,
  fuelType,
  isCheapest,
  isClosest,
  isSelected,
  cheapestPrice,
  onClick,
}: StationCardProps) {
  const price = station.prices[fuelType];
  const diff = price != null && cheapestPrice != null && !isCheapest ? price - cheapestPrice : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer ${
        isSelected
          ? "border-gray-900 bg-gray-100 dark:border-white/60 dark:bg-gray-800"
          : "border-gray-200 bg-white hover:border-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
      }`}
    >
      {/* Top row: name + price */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">{station.name}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {isCheapest && (
              <span className="text-xs bg-green-900/70 text-green-300 px-2 py-0.5 rounded-full font-medium">
                💰 Más barata
              </span>
            )}
            {isClosest && (
              <span className="text-xs bg-blue-900/70 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                📍 Más cercana
              </span>
            )}
            <span className="text-xs text-gray-500">{formatDistance(station.distance)}</span>
          </div>
        </div>

        <div className="shrink-0 text-right pt-0.5">
          {price != null ? (
            <>
              <span className="text-xl font-bold text-gray-900 dark:text-white">${price.toFixed(2)}</span>
              {diff != null && (
                <p className="text-xs text-gray-400 font-medium">+${diff.toFixed(2)}</p>
              )}
              {isCheapest && (
                <p className="text-xs text-green-600 dark:text-green-500 font-medium">más barata</p>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-600">—</span>
          )}
          {/* Desktop: inline */}
          <div className="hidden md:block mt-2" onClick={(e) => e.stopPropagation()}>
            <DirectionsButton lat={station.lat} lng={station.lng} />
          </div>
        </div>
      </div>

      {/* Mobile: full-width */}
      <div className="md:hidden mt-3" onClick={(e) => e.stopPropagation()}>
        <DirectionsButton lat={station.lat} lng={station.lng} fullWidth />
      </div>
    </button>
  );
}
