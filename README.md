# Meridian Arch Studio — 3D motion website

A single-page website for **Meridian Arch Studio** with a real-time 3D scene built in Three.js.

## Features
- **Procedural 3D modern house**: glass ground floor, a white upper floor that projects out over a pool, timber cladding, a concrete fin wall, a deck and trees. It assembles itself piece by piece when the page loads, inside a wireframe city that rises in waves
- **Scroll-driven camera**: each section has its own camera shot (hero, orbit, top-down plan, exploded axonometric, worm's-eye, aerial), and the house turns and separates into an exploded view as you scroll
- A **sun that moves along its arc** as you scroll (the "meridian"), with lighting and shadows that follow it
- Mouse parallax, a custom cursor, magnetic buttons, 3D tilt project cards, blueprint drawings that draw themselves, animated counters, a marquee, a scroll progress bar and a loader
- Responsive layout with a mobile menu; respects `prefers-reduced-motion`

## Run locally
No build step. Serve the folder with any static server (ES modules need http, not `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Three.js is vendored in `vendor/`, so the site runs without a CDN. Fonts load from Google Fonts, with fallbacks if they're unavailable.

## Files
- `index.html` — page structure and content
- `styles.css` — design system, layout and CSS motion
- `main.js` — Three.js scene, scroll choreography and UI interactions
