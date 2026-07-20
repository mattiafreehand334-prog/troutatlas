# TroutAtlas

A mobile-friendly static web app for trout fishermen in Piemonte, Italy. Shows a searchable list of rivers with fishing details, a swipeable photo gallery, difficulty ratings, and an interactive map with a "Portami qui" button that opens Google Maps navigation.

## Stack

- Pure HTML / CSS / JavaScript (no build step, no framework)
- Leaflet.js (CDN) for interactive maps
- OpenStreetMap tiles (free, no API key)
- Static JSON database (`database.json`)

## How to run

Served by a simple Python static HTTP server on port 5000:

```
python3 -m http.server 5000
```

## File structure

| File | Purpose |
|------|---------|
| `index.html` + `app.js` | River list with search |
| `river.html` + `river.js` | Individual river detail page |
| `style.css` | All styles |
| `database.json` | River data (name, species, gear, coordinates, images) |
| `sesia_*.jpeg` | Photos for the Sesia river |

## Adding a new river

Add a JSON entry to `database.json` following the existing schema. Include:
- `id` (URL-safe slug)
- `images` (array of filenames in the root folder)
- `coordinates` with `lat` / `lng` for the map

## User preferences

- Italian language for UI text
- Dark navy colour scheme
