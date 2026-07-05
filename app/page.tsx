import { headers } from "next/headers";
import { getInitialCenter } from "@/app/lib/geo";
import HomeClient from "@/app/components/HomeClient";

export default async function Home() {
  const initialCenter = await getInitialCenter(await headers());
  return <HomeClient initialCenter={initialCenter} />;
}
