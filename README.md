# Tankeo ⛽

Find the nearest and cheapest gas stations in Mexico using your current location. Live at [tankeo.mx](https://tankeo.mx). Works as a PWA — installable on iOS via "Add to Home Screen".

## Features

- Interactive map with price labels on markers (green = cheapest, blue = closest)
- Sort stations by price or distance
- Filter by Magna, Premium, or Diesel
- "Buscar en esta zona" — pan the map and search a new area
- "Cómo llegar" — opens Google Maps, Apple Maps, or Waze (remembers your preference); available on each card and in map popups
- Light/dark theme following system preference
- Fully responsive — desktop and mobile

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and grant location permission when prompted.

## Deploy

Push to `main` — Vercel auto-deploys. No environment variables needed.

## Data source

Two public XML endpoints from CRE (Comisión Reguladora de Energía):

| Endpoint | What it provides |
|---|---|
| `.../publicaciones/places` | ~11,000 stations with name, permit ID, lat/lng |
| `.../publicaciones/prices` | Current prices per station (regular, premium, diesel) |

The API route at `/api/stations` fetches both in parallel, joins on `place_id`, filters to 10 km, and returns the 30 nearest stations. Responses are cached 1 hour server-side.

## Tech stack

| Tool | Version |
|---|---|
| Next.js | 16 |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | v4 |
| Leaflet | 1.9 |
| pnpm | latest |
