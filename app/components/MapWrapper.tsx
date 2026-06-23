"use client";

import dynamic from "next/dynamic";
import type { Station, FuelType } from "@/app/lib/stations";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-xl bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Cargando mapa...</span>
      </div>
    </div>
  ),
});

interface MapWrapperProps {
  userLat: number;
  userLng: number;
  stations: Station[];
  fuelType: FuelType;
  selectedId: string | null;
  onSelectStation: (id: string) => void;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <Map {...props} />;
}
