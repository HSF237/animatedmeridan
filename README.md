# Meridian Arch Studio — 3D motion website

A single-page website for **Meridian Arch Studio** with a real-time 3D scene built in Three.js.

## Features
- **Scroll-driven 3D walkthrough of a luxury villa at dusk.** The page opens outside, over a reflecting pool. As you scroll, the walnut pivot door swings open and the camera moves through the house:
  1. Arrival and entrance
  2. Foyer, with a brass sculpture
  3. Double-height living room: a Nero Marquina fireplace wall with a live linear fire, art, a bouclé sectional and a cascading glass-rod chandelier
  4. Kitchen: a waterfall marble island, brass pendants and walnut cabinetry
  5. Wine wall and dining table under a ring light
  6. Floating walnut staircase, lit from below with LED strips
  7. Library and master suite on the upper level
  8. Infinity-pool terrace overlooking the city lights
- A room label in the bottom-left corner shows where you are in the house
- Procedural marble, walnut, oak, travertine and art textures, reflections from an environment map, and a bloom effect on the lighting
- Loader, reveal animations, a custom cursor, magnetic buttons, 3D tilt project cards and blueprint drawings that draw themselves
- Responsive layout (content sits in a left column on wide screens so the villa stays visible); respects `prefers-reduced-motion`

## Run locally
No build step. Serve the folder with any static server (ES modules need http, not `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Three.js and the add-ons it uses (post-processing and environment maps) are vendored in `vendor/`, so the site runs without a CDN. Fonts load from Google Fonts, with fallbacks if they're unavailable.

## Files
- `index.html` — page structure and content
- `styles.css` — design system, layout and CSS motion
- `villa.js` — the procedural villa: textures, materials, architecture, furniture, lights
- `main.js` — renderer, sky, camera path, scroll mapping and UI interactions
