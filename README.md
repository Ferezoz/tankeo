# Gasolineras MX ⛽

Find the nearest and cheapest gas stations in Mexico using your current location.

Built with Next.js 16, React 19, Leaflet + OpenStreetMap (no API key needed), and the Mexican government's public fuel price API.

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

No environment variables required — the data source is the public Mexican government API at `https://api.datos.gob.mx/v1/precio-gasolinas`.

## Tech stack

| Tool | Version |
|------|---------|
| Next.js | 16.2.9 |
| React | 19.0.0 |
| TypeScript | 5 |
| Tailwind CSS | v4 |
| react-leaflet | 5 |
| pnpm | latest |
