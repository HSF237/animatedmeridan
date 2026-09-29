# Meridian Arch Studio — 3D motion website

A single-page website for **Meridian Arch Studio** with a real-time 3D scene built in Three.js.

## Pages
Each page has its own theme and its own 3D scene, all driven by scrolling.

| Page | Theme | 3D scene |
| --- | --- | --- |
| `index.html` | Gold & dark | **Villa tour.** A continuous walk through a full 3D luxury villa, inside and out (see below). |
| `studio.html` | Blueprint blue | **Drafting table.** The villa draws itself as line-work on a drafting sheet, a scan plane makes it solid, dimension lines appear, then a sun path arcs overhead. |
| `projects.html` | Dark showroom | **Rotating gallery.** Six architectural models on lit pedestals that assemble part by part; scrolling turns the ring and spotlights each project. |
| `services.html` | Light clay model | **Exploded layers.** A clay model of the villa separates into layers (site, interior, structure, envelope, systems), and each service lights up its layer. Fins ripple for Computational Design, solar panels track the sun for Sustainability. |
| `process.html` | Construction orange | **Site time-lapse.** A drone surveys terrain with contour lines, massing options appear, a sun study runs, then a crane and scaffolding build the house, ending at night with the lights on. |
| `contact.html` | Night globe | **Dotted Earth.** Three glowing studio beacons with flight arcs. The camera flies to each office, and sending an enquiry launches a light pulse to New York. |

## Home page: the villa tour
- **A real, fully modelled 3D villa**, based on the reference renders in `reference/`: split-face limestone, bronze-framed double-height glazing, flat roofs with walnut soffits and downlights, and cantilevered upper terraces.
- **One continuous camera path, driven by scrolling.** No cuts, shake or transition effects: arrival and driveway → entrance hall → grand living → kitchen and dining → glass wine vault → spiral stair → gallery → library → glass bridge → spa → infinity pool → master suite.
- **Golden-hour setting:** sky with drifting clouds and sun, sea with a glitter path, coastal hills, soft sun shadows and a light glow on the lamps
- Labels drawn onto points in the 3D model, and a room label in the bottom-left

## Shared features
- Page transitions with a curtain wipe, a loader, reveal animations, a custom cursor, magnetic buttons, 3D tilt cards and counters
- Responsive layout (on phones the 3D scene sits above the text); respects `prefers-reduced-motion`
- Add `?snap` to any page URL to disable scroll smoothing, which is useful for automated screenshots

To change the villa's camera route, edit `K` in `home.js`. The villa model is in `villa.js`.

## Run locally
No build step. Serve the folder with any static server (ES modules need http, not `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Three.js and the add-ons it uses are vendored in `vendor/`, so the site runs without a CDN. Fonts load from Google Fonts, with fallbacks if they're unavailable.

## Files
- `index.html`, `studio.html`, `projects.html`, `services.html`, `process.html`, `contact.html`: the pages
- `styles.css`: the design system, per-page themes (`theme-*` classes) and layout
- `ui.js`: interface behaviour shared by every page (loader, reveals, cursor, transitions, menu, form)
- `kit.js`: shared 3D helpers (renderer, bloom, scroll mapping, labels, dust)
- `home.js` and `villa.js`: the villa scene and model
- `studio.js`, `projects.js`, `services.js`, `process.js`, `contact.js`: one scene per page
- `reference/`: the reference renders the villa is based on
- `vendor/`: Three.js and the add-ons it uses
