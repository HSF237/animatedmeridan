# Meridian Arch Studio — 3D motion website

A single-page website for **Meridian Arch Studio** with a real-time 3D scene built in Three.js.

## Features
- **The villa photos rebuilt as real 3D.** Each room image has a depth map (made with Depth Anything V2), and the site turns every pixel into 3D geometry at its estimated distance. Scrolling moves the camera through the space, so furniture, walls and the view shift correctly as you move.
- **Walking and turning:**
  - You walk forward through each room with a head-bob in step with your scroll, and moving the pointer lets you look around.
  - To reach the next room you turn 90° in 3D. The room you leave bursts into thousands of gold particles, and the next room assembles from particles in 3D, then solidifies behind a gold scan line.
  - The page opens with the villa assembling itself.
  - **Route:** arrival → infinity terrace → grand living → kitchen → master suite → sunset terrace
- **Motion graphics:** gold labels that draw themselves onto points in the 3D scene (for example "Crystal cascade chandelier"), big animated room titles, glowing dust in the light, and a room label in the bottom-left
- Loader (waits for the images and depth maps), reveal animations, a custom cursor, magnetic buttons, 3D tilt project cards and blueprint drawings that draw themselves
- Responsive layout; respects `prefers-reduced-motion`

### Adding or changing rooms
1. Put the image at `assets/villa/<name>.webp`.
2. Generate its depth map with `tools/make_depth.py`; the file itself explains how.
3. Add an entry to `ROOMS` in `main.js`. Each entry sets:
   - `turn`: which way you turn to the next room (1 = left, -1 = right, 0 = last room)
   - `near` / `far`: the depth range in metres
   - `walk`: how many metres you walk forward
   - `anchors`: where labels go, as image coordinates

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
- `assets/villa/` — the room images and their depth maps
- `tools/make_depth.py` — generates depth maps
- `main.js` — 3D reconstruction, particles, camera walk, labels and UI interactions
