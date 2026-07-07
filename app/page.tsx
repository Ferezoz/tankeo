import { headers } from "next/headers";
import { getInitialCenter } from "@/app/lib/geo";
import HomeClient from "@/app/components/HomeClient";

interface HomeProps {
  searchParams: Promise<{ lat?: string; lng?: string; station?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const initialCenter = await getInitialCenter(await headers());

  // Populated when opened via the desktop "send to phone" QR code — lets the
  // phone show the same station/area even before it has its own GPS fix.
  const params = await searchParams;
  const lat = parseFloat(params.lat ?? "");
  const lng = parseFloat(params.lng ?? "");
  const sharedLocation = !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
  const sharedStationId = params.station ?? null;

  return (
    <HomeClient
      initialCenter={initialCenter}
      sharedLocation={sharedLocation}
      sharedStationId={sharedStationId}
    />
  );
}
