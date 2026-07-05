# Tankeo ⛽

Next.js 16 app (App Router, React 19, TypeScript, Tailwind v4, pnpm) that shows Mexican gas stations near the user — closest and cheapest — with an interactive map. Live at [tankeo.mx](https://tankeo.mx). Works as a PWA (installable on iOS via "Add to Home Screen").

## What it does

1. App renders immediately with real, nearby stations — no permission gate. The default center comes from Vercel's IP geolocation headers (falls back to Ciudad de México if outside Mexico or the headers are unavailable, e.g. local dev)
2. Tapping ◎ (recenter button) requests precise browser geolocation. If permission was already granted on a prior visit, it silently upgrades to GPS on load instead (checked via `navigator.permissions.query`, which never triggers a prompt)
3. Fetches nearby stations from CRE XML feeds (10 km radius, 30 stations max) for whichever center is currently active
4. Shows an interactive Leaflet map with price-labeled markers (green = cheapest, purple = closest, white = selected) plus a pulsing blue dot for precise GPS location
5. Shows a sortable list — sort by price (default) or distance
6. Summary tiles for cheapest (green) and closest (purple) stations at the top of the list
7. Fuel type selector: Magna, Premium, Diesel
8. "Buscar en esta zona" button appears when panning away from the active search center — re-fetches for the new center
9. ◎ recenter button: gray ring + pulse + "Usar mi ubicación" label before GPS is granted; blue ring + pulse + filled dot once centered on precise GPS; reverts to plain when panned away from it
10. A city-name chip appears at the top of the map while showing the unconfirmed default center; disappears permanently once GPS is granted or the user pans the map
11. "Cómo llegar" opens preferred navigation app (Google Maps / Apple Maps / Waze — saved in localStorage); also available in map marker popups
12. Map marker popups are compact: name, price, distance, "Cómo llegar" link
13. Light/dark theme follows system preference
14. Bottom fade gradient on station list hints at scrollability

## Data source

Two public XML endpoints from CRE (Comisión Reguladora de Energía), no authentication needed:

- **Places**: `https://publicacionexterna.azurewebsites.net/publicaciones/places` — ~11,000 stations with name, CRE permit ID (`cre_id`), and lat/lng (`<x>` = longitude, `<y>` = latitude)
- **Prices**: `https://publicacionexterna.azurewebsites.net/publicaciones/prices` — current prices per station (regular, premium, diesel), keyed by `place_id`

The old `api.datos.gob.mx/v1/precio-gasolinas` API is dead. The new `datos.gob.mx` (Sistema Ajolote) only offers monthly CSV downloads with no coordinates. These CRE Azure endpoints are the only live real-time source with per-station location + prices.

The API route at `/api/stations?lat=X&lng=Y&fuelType=magna` fetches both XMLs in parallel (cached 1 hour via an in-memory module-level cache — see Architecture decisions), parses with regex, joins on `place_id`, strips legal suffixes from station names, filters to 10 km using Haversine, and returns the 30 nearest stations sorted by distance.

## Key files

- `app/page.tsx` — server component; reads Vercel's IP geolocation headers via `next/headers`, passes the resolved default center to `HomeClient`
- `app/components/HomeClient.tsx` — the actual app: two-column layout, geolocation state machine, fuel type + search center state (client component)
- `app/lib/geo.ts` — resolves the default map center from `x-vercel-ip-*` request headers; falls back to Ciudad de México outside Mexico or when headers are missing
- `app/api/stations/route.ts` — fetches CRE XML feeds, parses, joins by `place_id`, filters by distance
- `app/components/Map.tsx` — Leaflet map with price divIcons, "Buscar en esta zona" button, re-center button, city chip, precise-location dot
- `app/components/MapWrapper.tsx` — wraps Map with `dynamic(..., { ssr: false })`
- `app/components/StationList.tsx` — sort toggle, summary tiles (cheapest + closest), scrollable card list with bottom fade
- `app/components/StationCard.tsx` — price, distance, badges, "Cómo llegar" link
- `app/components/DirectionsButton.tsx` — directions link + `MapAppPicker` modal for nav app preference
- `app/lib/stations.ts` — `Station` type, `FuelType` type
- `app/lib/distance.ts` — Haversine formula + distance formatter
- `app/icon.tsx` — auto-generated favicon (32×32)
- `app/apple-icon.tsx` — auto-generated Apple touch icon (180×180), also used as the header logo
- `public/manifest.json` — PWA manifest

## Analytics

- **Vercel Analytics** — pageviews, visitors, referrers (enabled, production only)
- **Vercel Speed Insights** — Core Web Vitals (enabled, production only)
- Custom event tracking (PostHog) planned for Phase 2 — see `GROWTH.md`

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 — it renders immediately with the Ciudad de México default (no `x-vercel-ip-*` headers locally). Tap ◎ to grant precise location if you want to test the GPS flow.

**Note**: geolocation requires a secure context — use `localhost:3000`, not the container's IP address directly.

## Deploy

Push to `main` — Vercel auto-deploys on every push. No environment variables needed.

## Architecture decisions

- Map is client-only (`ssr: false`) because Leaflet uses `window` and `document`
- `page.tsx`/`HomeClient.tsx` split: the server component reads geolocation headers (needs `next/headers`), the client component owns all interactive state (needs `navigator.geolocation`) — keeps the default-center resolution server-side so there's no client-side flash before real data renders
- No permission gate: the app always renders real stations immediately using the IP-based default center; GPS is an opt-in upgrade, never a blocker. `x-vercel-ip-country` is checked in `geo.ts` so visitors outside Mexico get the Ciudad de México default (there's no CRE data to show at their real location) instead of an empty result
- On mount, `navigator.permissions.query({ name: "geolocation" })` checks status without prompting — if already granted from a prior visit, GPS is requested silently instead of waiting for a tap on ◎. Unsupported/unreliable (iOS) just no-ops, leaving the default center
- API route proxies CRE feeds to avoid CORS; XML parsed with regex (no library needed — feed structure is simple and stable)
- CRE XML caching: Next.js's built-in `fetch()` cache silently refuses to store responses over 2MB (the places feed alone is ~4MB), so `next: { revalidate }` never actually cached anything and every request re-fetched/re-parsed both feeds from scratch. `app/api/stations/route.ts` now uses a module-level in-memory cache of the *parsed* data (much smaller than raw XML) with a manual 1-hour TTL, and falls back to serving stale data rather than failing outright if CRE's feeds are temporarily down. This only persists for the lifetime of a warm serverless instance — fine at current traffic, but a shared store (Vercel KV + a scheduled refresh) would be the proper fix if cold starts become frequent enough to matter (see GROWTH.md)
- Station names are title-cased and stripped of Mexican legal suffixes (Sa De Cv, S De Rl De Cv, etc.)
- Search center state (`searchCenter`) separates "where to search" from GPS/default location — enables pan-and-search without losing the user's position. `SearchHereButton` compares the map's current center against the *active* fetch center (`searchCenter ?? home`), not always home — otherwise panning back to the original spot after confirming a search elsewhere wouldn't re-offer "Buscar en esta zona"
- `atHome` (in `Map.tsx`) tracks whether the map is currently centered on the home/GPS location, via a `moveend` listener comparing distance to a ~550m threshold. It's force-reset to `true` whenever home coordinates change (`useEffect` on `[userLat, userLng]`) rather than relying solely on Leaflet's async `moveend` — that event can fire once with a stale closure (still holding the *previous* home coords) right as GPS is granted, permanently latching `atHome` to `false` with no further map movement to self-correct
- The city chip (shows the unconfirmed default city, e.g. "Ciudad de México") uses a one-way `hasMovedOnce` latch, separate from the reversible `atHome` state — once the user has panned even once, the chip never reappears even if they scroll back near the original center, since by then they've demonstrated intent to explore
- Color meanings are deliberately non-overlapping: green = cheapest (also the app's general CTA/accent color), purple = closest station, blue = precise GPS location (map dot + recenter button ring/dot) — blue was chosen to match the Google/Apple Maps "current location" convention, so closest-station couldn't reuse it once introduced
- Nav app preference stored in `localStorage`, read on mount
- Light/dark theme via Tailwind `dark:` prefix (media query, no toggle needed)
- PWA: manifest + Apple meta tags + `viewport-fit=cover` + safe area insets via `.safe-top` CSS class (NOT on body — body padding would push height beyond 100dvh and cause page scroll). The mobile header uses `.safe-top-header` instead, which *adds* to its own 8px baseline (`calc(env(safe-area-inset-top) + 8px)`) rather than replacing it, so top/bottom padding stays symmetric on devices with no real inset
- `dvh` units used throughout to handle mobile browser chrome correctly
- Mobile scroll lock: `html, body { overflow: hidden }` (safe since heights are exactly 100dvh — nothing clips) + `overscroll-contain` on the list div prevents iOS rubber-band bounce
- Nav app preference (`mapapp-changed` custom event): `MapAppPicker` dispatches it on select, `useMapApp` listens — this is needed because `storage` events don't fire in the same tab
- iOS PWA geolocation: permission popup may not appear in standalone mode if permission was previously denied at domain level — user must reset via Safari AA menu → Website Settings → Location
- Leaflet popup font overridden to page system font (`.leaflet-container { font-family: inherit }`) — Leaflet defaults to Helvetica Neue which renders arrows differently
- `!text-gray-600` (Tailwind `!important`) needed on Leaflet popup links — Leaflet CSS has higher specificity than regular Tailwind classes for anchor colors
- `/apple-icon` (no extension) is the correct path for Next.js metadata-generated images — `/apple-icon.png` returns 404
- pnpm is the package manager (not npm or yarn)

## Growth & Business

See `GROWTH.md` for the full phased growth plan — distribution steps, monetization options, analytics events to add, and product pivots. Currently in Phase 1 (seeding).

- Brand: **Tankeo** — domain tankeo.mx registered
- Future brand domain: Tankeo.com (currently $6k premium, defer to Phase 3-4)
- SEO keyword domain: GasolinaBarata.mx — consider buying in Phase 2 if most traffic comes from Google
