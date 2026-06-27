# Gasolineras MX — Growth Plan

## Current State
- Gas station finder for Mexico (closest + cheapest)
- Real-time CRE data, mobile-first, works as PWA
- No monetization, no user accounts, no ads

---

## 1. Analytics Foundation (Before Growing)

Add custom event tracking once traffic justifies it. Key events:

| Event | Why |
|---|---|
| `directions_clicked` + map app | Which app users prefer, which stations get navigated to |
| `fuel_type_changed` | Is Premium/Diesel worth supporting? |
| `search_area_moved` | Are users exploring or just looking near home? |
| `permission_denied` | Funnel drop-off rate |
| `cheapest_selected` vs `closest_selected` | What drives the decision? |

Use PostHog (1M events/month free) when ready.

---

## 2. Growth Channels

### SEO
- Add city-specific landing pages: `/gasolineras/cdmx`, `/gasolineras/guadalajara`, etc.
- Target "gasolineras baratas cerca de mí" and similar queries
- Add structured data (schema.org LocalBusiness) for station pages
- Blog/content: weekly cheapest gas by city

### Social
- Auto-tweet/post cheapest gas price daily per city (bot)
- "Gasolina más barata en CDMX hoy: $X.XX" — shareable image
- TikTok/Reels showing price comparisons

### Word of Mouth
- Share button: "La gasolina más barata cerca de mí está en X a $X.XX"
- WhatsApp-friendly share format (most used in Mexico)

---

## 3. Business Models (Ranked by Effort)

### Low effort
**Google AdSense** — banner or interstitial ads. Easy to add, low CPM in Mexico (~$0.50-2). Not worth it until 10k+ daily users.

**Affiliate links** — link to Waze/Google Maps (already have), potentially earn from map app referrals if programs exist.

### Medium effort
**Featured listings** — gas stations pay $X/month to appear highlighted in the list. Direct sales to station owners or chains (Oxxo Gas, Petro 7, etc.). Requires sales effort but high margin.

**Price alerts** — users subscribe to get notified when a station near them drops below a threshold. Monetize with a freemium model (1 alert free, more with subscription ~$29 MXN/month).

**Station reviews/ratings** — UGC layer. Monetize via premium insights sold back to station owners.

### High effort
**B2B / Fleet management** — companies with delivery trucks or fleets need to optimize fuel costs. Sell a dashboard showing cheapest routes + fuel stops. $500-2000 MXN/month per company.

**White label** — license the product to other companies (insurance, fleet, logistics). One-time + monthly fee.

**API access** — sell real-time gas price API to other apps, fintechs, or comparison sites. Tiered pricing.

---

## 4. Product Pivots

### Expand data
- Add **historical price trends** per station (CRE data is public, store it daily)
- Show **price change indicators** (↑↓ vs last week)
- Add **station amenities** (convenience store, car wash, 24h)

### Expand geography
- **LATAM expansion** — find equivalent public APIs in Colombia, Chile, Argentina
- **US border cities** — compare US vs MX prices for cross-border drivers

### Expand use case
- **Route planner** — given a route, find the cheapest station along the way
- **Price prediction** — ML model predicting when prices will drop
- **Loyalty integration** — partner with Spin by OXXO or similar for rewards

### Pivot to marketplace
- Let stations **claim their listing** and update amenities, hours, photos
- Stations pay to **promote offers** (e.g. "Free car wash with fill-up")
- Becomes a Yelp-like layer on top of the CRE data

---

## 5. Immediate Next Steps (No Code)

1. Share the app in Mexican car/driving Facebook groups and subreddits
2. Set up Google Search Console to track organic traffic
3. Enable Vercel Analytics (done) — wait for data
4. Post on Twitter/X about cheapest gas price today in CDMX
5. Submit to Mexican app directories and "herramientas útiles" lists
