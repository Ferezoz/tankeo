# Gasolineras MX ⛽

Find the nearest and cheapest gas stations in Mexico using your current location.

Built with Next.js 16, React 19, Leaflet + OpenStreetMap (no API key needed), and the CRE (Comisión Reguladora de Energía) public XML feeds for real-time fuel prices.

## Features

- Geolocation permission flow
- Interactive map with station markers
- Sort by distance or by price
- Filter by Magna, Premium, or Diesel
- Highlights cheapest and closest stations
- Fully responsive (mobile-first)

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and grant location access.

## Deploy to Vercel

```bash
pnpm dlx vercel deploy --prod
```

No environment variables required for the data source.

## Data source

Two public XML endpoints from CRE (Comisión Reguladora de Energía), fetched in parallel and joined by `place_id`:

| Endpoint | What it provides |
|---|---|
| `https://publicacionexterna.azurewebsites.net/publicaciones/places` | ~11,000 stations with name, CRE permit ID, and lat/lng |
| `https://publicacionexterna.azurewebsites.net/publicaciones/prices` | Current prices per station (regular, premium, diesel) |

The Next.js API route at `/api/stations` fetches both, parses the XML, joins on `place_id`, filters to stations within 10 km of the user using the Haversine formula, and returns the 30 nearest.

## Tech stack

| Tool | Version |
|------|---------|
| Next.js | 16.2.9 |
| React | 19.0.0 |
| TypeScript | 5 |
| Tailwind CSS | v4 |
| react-leaflet | 5 |
| pnpm | latest |
