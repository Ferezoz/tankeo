# Gasolineras MX

Nearest and cheapest Mexican gas stations using geolocation + OpenStreetMap.

## Data Source
- `https://api.datos.gob.mx/v1/precio-gasolinas` — Mexican government public API, no key needed
- Proxied via Next.js API route at `/api/stations?lat=X&lng=Y&fuelType=magna`

## Run locally
```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 — grant location permission when prompted.

## Key files
- `app/page.tsx` — main client page, geolocation flow
- `app/api/stations/route.ts` — API proxy + Haversine distance sort
- `app/components/Map.tsx` — Leaflet map (SSR disabled via MapWrapper)
- `app/components/StationList.tsx` — sortable list by distance or price
- `app/lib/stations.ts` — Station type and fuel constants
- `app/lib/distance.ts` — Haversine formula

## Deploy
```bash
vercel deploy --prod
```
No environment variables needed for the public API.
