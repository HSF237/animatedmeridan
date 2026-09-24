# Meridian Arch Studio — 3D motion website

A single-page website for **Meridian Arch Studio** with a real-time 3D scene built in Three.js.

## Features
- **Scroll-driven 3D walkthrough of a luxury villa at dusk.** The page opens outside, beside a reflecting pool with a bronze ring sculpture, a water wall, palms, olive trees and bronze façade fins. As you scroll, the walnut pivot door swings open and the camera moves through the house:
  1. Arrival and entrance
  2. Foyer, with a brass sculpture under a spotlight and ceramic vases
  3. Backlit onyx bar
  4. Double-height living room: a Nero Marquina fireplace with logs and a live fire, lit art, a walnut slat ceiling, a cascading glass-rod chandelier, bouclé sofas with pillows and a throw, velvet lounge chairs on brass sleds, and a styled travertine coffee table
  5. Music corner: a black lacquer grand piano with its lid propped open, and a fiddle-leaf fig
  6. Kitchen: a Calacatta waterfall island with a brass faucet, a brass range hood, dome pendants and leather stools
  7. Wine wall with backlit bottles, and a dining room with upholstered chairs, candles and a tiered brass chandelier
  8. Floating walnut stair on brass rods, lit from below
  9. Library with a rolling brass ladder
  10. Master suite: a channel-tufted headboard wall, layered bedding, glass globe pendants, and a freestanding stone bathtub by the glass
  11. Infinity-pool terrace with lit steps, sun loungers, a fire-pit lounge, a cabana and the city lights below
- **Realistic materials:** fabric sheen and weave for bouclé, velvet and linen; lacquered and clearcoated surfaces; leather grain; rounded upholstery; soft shadows; sheer curtains that move gently
- Procedural marble, onyx, walnut, oak, travertine, bark and art textures, reflections from an environment map, and a bloom effect on the lighting
- Render resolution scales automatically so slower devices stay smooth
- A room label shows where you are in the house
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
