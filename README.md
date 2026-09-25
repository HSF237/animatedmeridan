# Meridian Arch Studio — 3D motion website

A single-page website for **Meridian Arch Studio** with a real-time 3D scene built in Three.js.

## Features
- **A real, fully modelled 3D villa**, based on the reference renders in `reference/`: split-face limestone cladding, bronze-framed double-height glazing, flat roofs with walnut soffits and downlights, and cantilevered upper terraces with glass balustrades.
- **One continuous camera path, driven by scrolling.** No cuts, shake or transition effects:
  1. **Arrival:** a cobblestone driveway, lit stone planters, olive and cypress trees, and lit entrance steps. The glass doors open as you approach.
  2. **Entrance hall:** a crystal chandelier and a double-height view to the sea.
  3. **Grand living:** a cream sectional with pillows and a knit throw, an Emperador marble coffee table with candles, round bouclé chairs, a split-stone wall with the TV, a linear fireplace and lit shelving, olive trees in stone pots, and sheer curtains.
  4. **Kitchen and dining:** walnut millwork, ovens and a wine fridge, a waterfall quartzite island with a bronze faucet, bouclé stools, glass pendants, and a walnut dining table with a crystal linear pendant.
  5. **Glass wine vault:** a glass room between the kitchen and living, with a backlit, double-sided bronze rack of bottles.
  6. **Sculptural spiral stair:** one turn of floating walnut treads around a polished brass core, with a brass handrail and lit treads, climbing past the chandelier.
  7. **Gallery:** a mezzanine with relief art, a bronze sculpture and a bouclé bench.
  8. **Library:** floor-to-ceiling walnut shelving with lit shelves and a rolling brass ladder, facing sofas, glass pendants and a writing desk at the sea glass.
  9. **Glass bridge:** across the double-height hall, beside the crystal chandelier, to the private wing.
  10. **Spa:** a raised plunge pool in stone and marble with candles and pendants, a cedar sauna with a glass front, and loungers facing the sea.
  11. **Spa terrace and infinity pool:** out onto the balcony, then down to the pool deck with its waterfall edges, daybeds, lanterns and fire lounge.
  12. **Master suite:** in through the open slider. A stone feature wall with backlit relief art, a channel-tufted bed with layered bedding and a knit throw, a bench and a shag rug, ending on the view back out to the sunset.
- **Golden-hour setting:** a sky with drifting clouds and the sun, a sea with a sun glitter path, coastal hills, soft sun shadows and a light glow on the lamps
- Labels drawn onto points in the 3D model, and a room label in the bottom-left
- Loader, reveal animations, a custom cursor, magnetic buttons, 3D tilt project cards and blueprint drawings that draw themselves
- Responsive layout; respects `prefers-reduced-motion`

To change the camera route, edit `K` in `main.js`. The model is in `villa.js`.

## Run locally
No build step. Serve the folder with any static server (ES modules need http, not `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Three.js and the add-ons it uses are vendored in `vendor/`, so the site runs without a CDN. Fonts load from Google Fonts, with fallbacks if they're unavailable.

## Files
- `index.html` — page structure and content
- `styles.css` — design system, layout and CSS motion
- `villa.js` — the 3D villa: textures, materials, architecture, furniture, landscape, lights
- `reference/` — the reference renders the model is based on
- `main.js` — renderer, sky, sea, camera path, labels and UI interactions
