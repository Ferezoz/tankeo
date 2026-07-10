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
15. Desktop header has an "Enviar a tu celular" button (hidden on mobile) that shows a QR code encoding the current search center and selected station (if any) — scanning it on a phone opens the app pre-centered on that zone/station via URL query params (`?lat=&lng=&station=`)

## Data source

Two public XML endpoints from CRE (Comisión Reguladora de Energía), no authentication needed:

- **Places**: `https://publicacionexterna.azurewebsites.net/publicaciones/places` — ~11,000 stations with name, CRE permit ID (`cre_id`), and lat/lng (`<x>` = longitude, `<y>` = latitude)
- **Prices**: `https://publicacionexterna.azurewebsites.net/publicaciones/prices` — current prices per station (regular, premium, diesel), keyed by `place_id`

The old `api.datos.gob.mx/v1/precio-gasolinas` API is dead. The new `datos.gob.mx` (Sistema Ajolote) only offers monthly CSV downloads with no coordinates. These CRE Azure endpoints are the only live real-time source with per-station location + prices.

The API route at `/api/stations?lat=X&lng=Y` reads pre-parsed CRE data (refreshed daily into Vercel Blob storage by a cron job, with a direct-fetch fallback — see Architecture decisions), joins on `place_id`, strips legal suffixes from station names, filters to 10 km using Haversine, and returns the 30 nearest stations sorted by distance.

## Key files

- `app/page.tsx` — server component; reads Vercel's IP geolocation headers via `next/headers`, also reads `searchParams` (`lat`/`lng`/`station`) for the QR handoff deep link, passes both to `HomeClient`
- `app/components/HomeClient.tsx` — the actual app: two-column layout, geolocation state machine, fuel type + search center state (client component)
- `app/lib/geo.ts` — resolves the default map center from `x-vercel-ip-*` request headers; falls back to Ciudad de México outside Mexico or when headers are missing
- `app/api/stations/route.ts` — reads parsed CRE data (from Vercel Blob, or CRE directly as a fallback), joins by `place_id`, filters by distance
- `app/lib/creFeeds.ts` — shared CRE XML fetch+parse logic, used by both `app/api/stations/route.ts` and the cron job
- `app/api/cron/refresh-stations/route.ts` — daily Vercel Cron job that refreshes the CRE data blob
- `app/components/Map.tsx` — Leaflet map with price divIcons, "Buscar en esta zona" button, re-center button, city chip, precise-location dot
- `app/components/MapWrapper.tsx` — wraps Map with `dynamic(..., { ssr: false })`
- `app/components/StationList.tsx` — sort toggle, summary tiles (cheapest + closest), scrollable card list with bottom fade
- `app/components/StationCard.tsx` — price, distance, badges, "Cómo llegar" link
- `app/components/DirectionsButton.tsx` — directions link + `MapAppPicker` modal for nav app preference
- `app/components/PhoneHandoff.tsx` — desktop-only "Enviar a tu celular" button + QR code popover for the send-to-phone handoff
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

Work happens on the `dev` branch, merged into `main` via PR. Vercel auto-deploys on every push: `main` deploys to production (tankeo.mx), other branches (including `dev`) get preview deployments. No environment variables needed.

## Architecture decisions

- Map is client-only (`ssr: false`) because Leaflet uses `window` and `document`
- `page.tsx`/`HomeClient.tsx` split: the server component reads geolocation headers (needs `next/headers`), the client component owns all interactive state (needs `navigator.geolocation`) — keeps the default-center resolution server-side so there's no client-side flash before real data renders
- No permission gate: the app always renders real stations immediately using the IP-based default center; GPS is an opt-in upgrade, never a blocker. `x-vercel-ip-country` is checked in `geo.ts` so visitors outside Mexico get the Ciudad de México default (there's no CRE data to show at their real location) instead of an empty result
- On mount, `navigator.permissions.query({ name: "geolocation" })` checks status without prompting — if already granted from a prior visit, GPS is requested silently instead of waiting for a tap on ◎. Unsupported/unreliable (iOS) just no-ops, leaving the default center
- API route proxies CRE feeds to avoid CORS; XML parsed with regex (no library needed — feed structure is simple and stable)
- CRE XML caching: Next.js's built-in `fetch()` cache silently refuses to store responses over 2MB (the places feed alone is ~4MB), so `next: { revalidate }` never actually cached anything and every request re-fetched/re-parsed both feeds from scratch. A daily Vercel Cron job (`app/api/cron/refresh-stations/route.ts`, running at 04:00 UTC / 2am Mexico City time — CRE's actual update schedule couldn't be reliably confirmed from available sources, so this runs early to minimize staleness for early risers rather than targeting a specific unverified update time) now fetches+parses both feeds via the shared `app/lib/creFeeds.ts` and writes the result to Vercel Blob storage — as compact tuples with the unused `cre_id` field dropped, keeping it ~1.3MB well under blob/cache size concerns. `app/api/stations/route.ts` reads that blob (still behind a module-level in-memory cache for the lifetime of a warm instance, so most requests don't even hit Blob storage), falling back to fetching CRE directly if the blob is missing, unreadable, or older than 48h — so a cron outage degrades to the old per-request behavior instead of breaking the app. The cron itself retries the CRE fetch up to 3 times before giving up and leaving the last-good blob untouched. Requires a Blob store created and connected to the project in the Vercel dashboard (auto-injects `BLOB_READ_WRITE_TOKEN`) to take effect — see GROWTH.md. Every `/api/stations` response carries an `x-stations-source` header (`memory` / `blob` / `cre`) — a cheap, permanent way to confirm which path actually served a request instead of guessing from response timing
- `unstable_cache`/Next's Data Cache was considered instead of Vercel Blob for the above, but rejected: it's an explicitly unstable API, the parsed data (~3MB combined) is uncomfortably close to the same 2MB per-entry limit that caused the original problem, and there's no way to inspect what's actually cached. Blob storage has no meaningful size ceiling for this, is inspectable directly in the dashboard, and isn't relying on undocumented cache-eviction behavior
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
- Send-to-phone QR (`PhoneHandoff.tsx`): encodes `window.location.origin` + `lat`/`lng`/`station` query params client-side via the `qrcode` package. On the receiving end, `sharedStationId` is only applied once the matching station fetch actually completes (guarded by a ref so it only fires once) — `selectStation`'s focusKey bump is what scrolls to/opens the popup for it, and marker refs don't exist until real station data has rendered
- The silent GPS auto-upgrade (permission already granted from a prior visit) must never clobber a shared location from a QR link — it only clears `searchCenter` when there's no `sharedLocation`. Only an explicit tap on ◎ should override a shared zone/station with the recipient's own GPS position
- Tapping ◎ (whether it triggers a fresh `requestLocation` call or the device already has a precise fix and just recenters via `onRecenter`) clears any shared-link query params via `history.replaceState` — otherwise reloading the page would re-seed `searchCenter` from the stale URL params and silently override the GPS choice just made. Both code paths call a shared `clearSharedLocationUrl` helper since the "already precise" recenter path never goes through `requestLocation`
- The map's actual camera (`<Recenter>` and `MapContainer`'s initial `center`) follows `activeLat`/`activeLng` (the active search/fetch center), not `userLat`/`userLng` (home/GPS) — otherwise a shared zone from a QR link would never visually move the map there, since dragging manually was the only thing that ever made the camera match the fetch center before. `atHome` is derived by directly comparing `activeLat`/`activeLng` to `userLat`/`userLng` rather than assuming recenters always target home, which also fixes the city chip flashing the wrong city on a shared-zone link
- `closestId` (in both `Map.tsx` and `StationList.tsx`) is scoped to stations with a price for the selected fuel type, same as `cheapestId` — otherwise a station with no price data could get the "Más cercana" badge and summary tile while showing "—", which isn't an actionable recommendation
- Selected map markers get `zIndexOffset={1000}` — Leaflet stacks markers by vertical position/insertion order by default, so an overlapping selected marker could render underneath another and become hard to see or click
- PWA link capture (opening a scanned QR link inside the installed "Add to Home Screen" app instead of the browser) isn't implemented: iOS has no mechanism for this at all (Home Screen web apps can't intercept external links), and Chrome's `capture_links` manifest field never reached stable/reliable support — not worth adding for an inconsistent, Android-only, best-effort gain
- `HomeClient`'s station-fetch effect intentionally excludes `fuelType` from its dependencies — every `/api/stations` response already carries all three fuel prices, and station selection has been purely distance-based since the dead server-side `fuelType` filtering was removed, so switching Magna/Premium/Diesel is a local re-render using already-fetched data, not a network round-trip. Only an actual location change (home or search center) triggers a refetch

## Growth & Business

See `GROWTH.md` for the full phased growth plan — distribution steps, monetization options, analytics events to add, and product pivots. Currently in Phase 1 (seeding).

- Brand: **Tankeo** — domain tankeo.mx registered
- Future brand domain: Tankeo.com (currently $6k premium, defer to Phase 3-4)
- SEO keyword domain: GasolinaBarata.mx — consider buying in Phase 2 if most traffic comes from Google
