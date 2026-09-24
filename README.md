# Meridian Arch Studio — 3D motion website

A single-page website for **Meridian Arch Studio** with a real-time 3D scene built in Three.js.

## Features
- **Walk-through of a luxury villa at sunset, driven by scrolling.** Each room is a photograph rendered through a WebGL shader:
  - **Walking:** scrolling moves you forward. Near areas grow faster than far ones, like a real camera move, with a gentle head-bob in step with your scroll.
  - **Turning:** to reach the next room you turn your head 90° around the corner, and the next room sits on the adjoining wall. There's a soft shadow and a stone jamb where the walls meet. No fades, no blur.
  - **Parallax:** moving the pointer shifts near objects more than far ones.
  - **Route:** driveway arrival → infinity terrace → grand living → kitchen → master suite → sunset terrace
- A room label shows where you are in the house
- Loader (waits for the room images), reveal animations, a custom cursor, magnetic buttons, 3D tilt project cards and blueprint drawings that draw themselves
- Responsive layout (content sits in a left column on wide screens so the rooms stay visible); respects `prefers-reduced-motion`

To change the rooms, edit `SHOTS` in `main.js`. Each shot sets:
- `src`: the image
- `vp`: the point the camera walks towards
- `depth`: how "near" the edges and the floor feel
- `focus`: the crop centre on phones
- `turn`: which way you turn to the next room (1 = right, -1 = left)

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
- `assets/villa/` — the room images
- `main.js` — walkthrough shader, scroll mapping and UI interactions
