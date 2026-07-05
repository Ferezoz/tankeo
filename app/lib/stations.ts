export type FuelType = "magna" | "premium" | "diesel";

export interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  lat: number;
  lng: number;
  prices: {
    magna: number | null;
    premium: number | null;
    diesel: number | null;
  };
  distance: number; // km from user
  lastUpdate: string;
}

export const FUEL_LABELS: Record<FuelType, string> = {
  magna: "Magna",
  premium: "Premium",
  diesel: "Diesel",
};
