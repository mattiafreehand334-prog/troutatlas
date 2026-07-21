---
name: Service Worker pattern
description: The correct SW pattern for TroutAtlas — no clients.claim(), cache-first with bg update.
---

## Pattern
- Small shell precache (HTML/CSS/JS/JSON)
- Cache-first for all assets; background update after serving
- Separate tile cache for OpenStreetMap tiles
- **Never** use `clients.claim()` — was causing race conditions (page loaded before new SW activated)

## Current cache key
`troutatlas-v13` — must be bumped after every asset change

**Why:** stale cache with wrong version serves old files silently. Bump = users get fresh assets on next visit.

## How to apply
After any change to CSS, JS, HTML, or data files: `sed -i 's/troutatlas-vN/troutatlas-vM/' sw.js`
