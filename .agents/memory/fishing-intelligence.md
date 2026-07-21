---
name: Fishing Intelligence 3.0
description: Architecture, data sources, scoring model, and transparency rules for the TroutAtlas Fishing Intelligence module.
---

## Files
- `intelligence.js` — complete self-contained module (~950 lines, 18 sections)
- Injected into `river.html` via `<div id="intel-section">` + `<script src="intelligence.js">`
- Called from `river.js` as: `loadFishingIntelligence(river)` at the end of the data fetch callback
- CSS at the end of `style.css` (lines 363+)

## API
- **Open-Meteo** (`api.open-meteo.com`) — free, no key, CORS-open ✅
  - `past_days=7 + forecast_days=2` for chart data (216 hourly rows)
  - current: temp, apparent_temp, dew_point, weather_code, pressure, wind, gusts, cloud, visibility, precip, uv
  - hourly: temp, apparent_temp, precip, precip_probability, pressure, wind, gusts, cloud, dew_point
  - daily: max/min temp, sunrise, sunset, daylight_duration, precip_sum, precip_prob_max, wind_max, uv_max
- **ARPA Piemonte / VdA / Protezione Civile** — attempted but always CORS-blocked from browser; fail silently in < 3s timeout
- **Cache TTL**: weather = 15 min, stored in localStorage keyed by `btoa(url.slice(-80))`

## 10 sections (in order)
1. 🎯 AI Fishing Score (0–100, SVG ring gauge, factors+/−, reliability %)
2. 🌤️ Meteo Professionale (expanded: feels-like, dew point, UV, gusts, moon, sunrise, sunset, daylight)
3. 💧 Condizioni Idriche (honest N/D for level/portata/temp-water after ARPA attempts; precip sums from real data)
4. 🔬 Analisi AI Acqua (4-level clarity from precip; trend vs yesterday; next-24h forecast)
5. 🌊 Stato del Torrente (4-level: Perfetto/Buono/Attenzione/Critico)
6. 🧠 Consiglio AI (Italian advice prose, data-driven, 3-paragraph structure)
7. 🏆 Tecniche (5 techniques ranked; each with depth/color/hook/weight/retrieval; expandable details)
8. ⏰ Attività Trote (6 periods: Alba/Mattino/Tarda mattina/Pomeriggio/Sera/Notte; best+worst highlighted)
9. 📈 Grafici Storici (SVG polyline + bar; tabs: 24h / 72h / 7d; temp/precip/pressure charts)
10. 📡 Fonti Dati (source dots, AI/real/N.D. labels, last-update timestamp)

## Transparency rules (from spec §15)
- All ARPA-sourced fields show "Non disponibile per questa stazione." — never fake values
- Water temperature and level trend labeled with `<span class="intel-ai-tag">Stima AI</span>`
- Coach text and clarity analysis labeled with `.intel-ai-badge`
- Score reliability baseline: 72%; +5% if water crystal-clear; +3% if pressure stable

## Scoring model (§9 computeScore)
Weighted sum, max 100:
- Air temp 15 pts (ideal 10–16°C) + Water temp 12 pts (ideal 8–15°C)
- Pressure 12 pts (ideal 1015–1028) + Pressure trend 10 pts
- Wind 10 pts + Precipitation 8 pts + Cloud cover 8 pts
- Water clarity 12 pts + Moon phase 5 pts + Season 8 pts

## Moon phase
- Classic Julian-date formula from known new moon: 2000-01-06 18:14 UTC, SYNODIC = 29.53058770576 days
- Fishing factor: best near new moon (day 0–3), decent at quarter moons, worst mid-cycle after full moon

## Water temperature estimate
- Formula: `Tw = max(0.5, min(22, 0.68 * Ta_avg3d + seasonal_offset + altitude_adjust))`
- Ta_avg3d = mean of last 3–4 daily (max+min)/2
- Seasonal offsets: spring −1.5, summer +1.0, autumn 0, winter −1.0
- Altitude adjust: −0.4°C per 200m above 400m

## Chart tab switching
- Global `_intelHourly` stores hourly data after render
- `intelSetChartWindow(win)` (called from inline onclick) re-renders `#intel-chart-content`
- `renderChartContent(hourly, win)` filters to window, downsamples if >100 pts

## SW cache
- Currently `troutatlas-v11` — must bump after every asset change
- `intelligence.js` is in the precache shell list in `sw.js`

**Why:** No clients.claim() — was causing race conditions in earlier versions. Never re-introduce it.
