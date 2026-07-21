---
name: Spot system
description: Fishing spot database, AtlasSpots module, new ATLAS AI intents, river.js deep-link integration, and spot card UI.
---

## Spot database (database.json)
Every river now has a `spots: []` array. Total: 19 spots across 13 rivers.
- Sesia: 3 | Cervo: 2 | Sessera: 2 | Lys: 2 | Mastallone: 2 | others: 1 each
- Each spot has: `id, name, type, difficulty, coordinates, description, fishingScore, techniques[], walkingMinutes, scenicView, crowded, bigFish, familyFriendly, stocking, notes, parking{name,description,distanceMeters,coordinates}, path[{step,emoji,text}], markers[{type,emoji,name,description}]`
- Marker objects do **not** have their own `coordinates` (markers serve as POI labels, not map pins with exact coords) — river.js guards with `if(!mk.coordinates) return;` so this is safe

## AtlasSpots module (atlas.js §1.5)
- `all()` — flat list of all spots, each with `_river` back-reference
- `find(criteria)` — filter by: riverId, familyFriendly, scenicView, bigFish, stocking, lowCrowd, maxDifficulty, maxWalk, technique, type
- `best(criteria, n)` — sorted by fishingScore descending, top N
- `parseCriteria(msg, hintRiver)` — NLP criteria extraction from Italian message
- `spotTag(spot)` — returns `[[SPOT:riverId:spotId:name:score]]` string for embedding in AI response text

## AtlasPrefs (atlas.js §3.5)
- localStorage key `atlas_prefs`
- defaults: `{ technique: null, maxWalkMin: 60, level: "intermedio", goal: "divertimento" }`
- `load()` / `save(updates)` — ready for future personalization features

## New intents (atlas.js detectIntent)
Four new intents checked BEFORE `dove_pescare` (order matters — more specific first):
- `trova_spot` — matches: "trova uno spot", "spot facile/panoramico/poco frequentato/per bambini", "tratto facile", "zona ripopolata", "spot.*ninfa/secca/spinning"
- `parcheggio` — matches: "parcheg", "dove mi fermo", "dove lascio.*auto"
- `itinerario` — matches: "itinerario", "come arrivo/raggiungo/si arriva", "percorso per arrivare"
- `marker_info` — matches: "cosa c'è.*map", "marker", "strutture.*torrente", "cascate.*torrente", "cosa trovo"

## New response generators (atlas.js §4.4)
- `respTrovaSpot(ctx, hintRiver, msg)` — finds best 3 matching spots, formats numbered list with score/walk/tags + [[SPOT:]] card per entry
- `respItinerario(ctx, hintRiver, msg)` — step-by-step path with parking info + [[SPOT:]] card
- `respParcheggio(ctx, hintRiver)` — lists up to 4 parkings with spot link cards
- `respMarkerInfo(ctx, hintRiver)` — full map of spots, POI markers, and parkings for a river
- Helper: `_formatSpotList(spots, ctx)` — reusable rich spot list renderer
- Helper: `_describeCriteria(c)` — human-readable criteria description

## [[SPOT:...]] tag rendering (atlas.js renderMarkdown)
Format: `[[SPOT:riverId:spotId:Name:score]]`  
Renders as `.atlas-spot-card` div with spot name, score badge, and "Mostra sulla mappa →" link to `river.html?id=X&spot=Y`

## river.js deep-link integration
`river.html?id=X&spot=Y` — all spot logic is INSIDE the `if (river.coordinates)` block where `map` is scoped:
- All river spots shown as dim 🎣 markers
- Target spot highlighted with 🎯 marker, popup opened, map centered (zoom 15)
- Parking shown as 🅿️ marker
- Named markers (with coordinates) shown with their emoji
- ATLAS AI banner injected above map: `.atlas-river-banner` class, shows spot name + description
- "Portami qui" Google Maps button navigates to spot coords (not river origin) when ?spot= is present

## CSS classes added (style.css)
- `.atlas-spot-card`, `.atlas-spot-card-info`, `.atlas-spot-card-icon`, `.atlas-spot-card-name`, `.atlas-spot-card-score`, `.atlas-spot-card-btn`
- `.atlas-river-banner`, `.atlas-river-banner-sub`

## SW cache
Bumped to `troutatlas-v14` after these changes.

**Why:** Additive-only spec — existing rivers/logic untouched. All new data is self-contained in the `spots` array; all new JS is new modules/functions that don't mutate existing ones.
