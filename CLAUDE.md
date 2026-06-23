# Gasolineras MX

Next.js 16 app (App Router, React 19, TypeScript, Tailwind v4, pnpm) that shows Mexican gas stations near the user — closest and cheapest — with an interactive map.

## What it does

1. User opens the app → browser asks for geolocation permission
2. Once location is granted, the app fetches nearby stations from the CRE XML feeds
3. Shows an interactive map (Leaflet + OpenStreetMap, no API key needed) with colored markers
4. Shows a sortable list of stations — toggle between "by distance" and "by price"
5. Highlights the closest station and the cheapest station with badges
6. Fuel type selector: Magna, Premium, Diesel

## Data source

Two public XML endpoints from CRE (Comisión Reguladora de Energía), no authentication needed:

- **Places**: `https://publicacionexterna.azurewebsites.net/publicaciones/places` — ~11,000 stations with name, CRE permit ID (`cre_id`), and lat/lng (`<x>` = longitude, `<y>` = latitude)
- **Prices**: `https://publicacionexterna.azurewebsites.net/publicaciones/prices` — current prices per station (regular, premium, diesel), keyed by `place_id`

The old `api.datos.gob.mx/v1/precio-gasolinas` API is dead. The new `datos.gob.mx` (Sistema Ajolote) only offers monthly CSV downloads with no coordinates. These CRE Azure endpoints are the only live real-time source with per-station location + prices.

The API route at `/api/stations?lat=X&lng=Y&fuelType=magna` fetches both XMLs in parallel, parses with regex, joins on `place_id`, filters to a 10 km radius using Haversine, and returns the 30 nearest stations.

## Key files

- `app/page.tsx` — main client component ("use client"), owns geolocation state machine and fuel type selection
- `app/api/stations/route.ts` — fetches CRE XML feeds, parses and joins by place_id, filters by distance, returns sorted Station[]
- `app/components/Map.tsx` — Leaflet map, blue marker = user, green = cheapest station, red = others
- `app/components/MapWrapper.tsx` — wraps Map with `dynamic(..., { ssr: false })` because Leaflet requires browser APIs
- `app/components/StationList.tsx` — sortable list, summary tiles for cheapest and closest at the top
- `app/components/StationCard.tsx` — card with price, distance, address, cheapest/closest badges
- `app/lib/stations.ts` — Station type, FuelType type
- `app/lib/distance.ts` — Haversine formula + distance formatter

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and grant location permission when prompted.

**Note**: geolocation requires a secure context — use `localhost:3000`, not the container's IP address directly.

## Deploy

```bash
vercel deploy --prod
```

No environment variables needed for the data source — the CRE feeds are fully public.

## What still needs work

- **UI polish** — styling can be improved. The app uses Tailwind v4 (CSS-first, no tailwind.config.js needed).
- **Vercel deployment** — connect the GitHub repo (github.com/Ferezoz/gasolineras) to Vercel for auto-deploys on push to main.
- **Filter by brand** — optionally add a brand filter (Pemex, BP, Shell, etc.)
- **Radius control** — let the user adjust the search radius (currently fixed at 10 km)
- **Address** — the CRE places feed doesn't include street addresses; could geocode by coordinates if needed

## Architecture decisions

- Map is client-only (`ssr: false`) because Leaflet uses `window` and `document`
- The main `page.tsx` is a client component because it needs `navigator.geolocation`
- API route proxies the CRE feeds to avoid CORS issues in the browser
- XML is parsed with regex (no library) — the CRE feed structure is simple and stable
- No auth, no database — purely reads from the public CRE feeds
- pnpm is the package manager (not npm or yarn)
