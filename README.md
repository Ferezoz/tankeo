# Tankeo ⛽

Find the nearest and cheapest gas stations in Mexico. Live at [tankeo.mx](https://tankeo.mx). Works as a PWA — installable on iOS via "Add to Home Screen".

## Features

- Loads instantly with real nearby stations — no location permission gate. Defaults to your city via IP geolocation (Ciudad de México if outside Mexico); tap the ◎ button to upgrade to your precise GPS location
- Interactive map with price labels on markers (green = cheapest, purple = closest, white = selected) plus a pulsing blue dot for your precise location
- Sort stations by price or distance
- Filter by Magna, Premium, or Diesel
- "Buscar en esta zona" — pan the map and search a new area
- "Cómo llegar" — opens Google Maps, Apple Maps, or Waze (remembers your preference); available on each card and in map popups
- "Enviar a tu celular" — desktop-only button that shows a QR code to send the current zone/station to your phone
- Light/dark theme following system preference
- Fully responsive — desktop and mobile

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 — it renders immediately with a default city (Ciudad de México locally). Tap ◎ to grant precise location.

## Deploy

Work happens on the `dev` branch, merged into `main` via PR. Vercel auto-deploys on every push — `main` deploys to production, other branches get preview deployments. Requires a Vercel Blob store created and connected to the project (auto-injects `BLOB_READ_WRITE_TOKEN`) for the daily data-refresh cron — see CLAUDE.md.

## Data source

Two public XML endpoints from CRE (Comisión Reguladora de Energía):

| Endpoint | What it provides |
|---|---|
| `.../publicaciones/places` | ~11,000 stations with name, permit ID, lat/lng |
| `.../publicaciones/prices` | Current prices per station (regular, premium, diesel) |

A daily Vercel Cron job fetches+parses both feeds and stores the result in Vercel Blob storage. The `/api/stations` route reads that (falling back to fetching CRE directly if the blob is missing or stale), joins on `place_id`, filters to 10 km, and returns the 30 nearest stations.

## Tech stack

| Tool | Version |
|---|---|
| Next.js | 16 |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | v4 |
| Leaflet | 1.9 |
| pnpm | latest |
