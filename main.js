import * as THREE from "three";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 760px)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

document.body.classList.add("loading");
document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   THREE.JS SCENE — a modern cantilevered house in a wireframe city
   ========================================================= */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = !isMobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const BG = new THREE.Color("#0b0c0f");
const ACCENT = new THREE.Color("#d9a45b");
const COOL = new THREE.Color("#7fb3c9");

const scene = new THREE.Scene();
scene.background = BG;
scene.fog = new THREE.FogExp2(BG, 0.028);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(14, 6, 18);

// Lights
scene.add(new THREE.HemisphereLight(0xcfd8e6, 0x0b0c0f, 0.55));
const sun = new THREE.DirectionalLight(0xffe2b8, 2.2);
sun.position.set(10, 22, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
sun.shadow.bias = -0.0005;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xbcd0e0, 0.7);
fill.position.set(12, 6, 20);
scene.add(fill);
const rim = new THREE.PointLight(COOL, 60, 40, 2);
rim.position.set(-8, 10, -6);
scene.add(rim);
const glow = new THREE.PointLight(ACCENT, 40, 25, 2);
glow.position.set(0, 2, 4);
scene.add(glow);

// Ground
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(80, 64),
  new THREE.MeshStandardMaterial({ color: 0x101217, roughness: 0.95, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(120, 120, 0x2a3440, 0x1a1f27);
grid.position.y = 0.01;
grid.material.transparent = true;
grid.material.opacity = 0.55;
scene.add(grid);

// Site rings — survey-style circles around the house
const rings = new THREE.Group();
for (let i = 0; i < 3; i++) {
  const r = 10.5 + i * 2.2;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r, r + 0.02, 128),
    new THREE.MeshBasicMaterial({ color: i === 0 ? ACCENT : COOL, transparent: true, opacity: 0.35 - i * 0.08, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  rings.add(ring);
}
scene.add(rings);

/* ---------- The house ---------- */
// A modern cantilevered villa: glass pavilion, floating white upper volume,
// timber box, concrete fin wall, pool, deck and trees. Each part builds in
// by `order` and moves along `ex` in the exploded axonometric view.
const house = new THREE.Group();
house.scale.setScalar(0.9);
scene.add(house);

const M = {
  render: new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.7 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x6b6d70, roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x2e3035, roughness: 0.85 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.75 }),
  deck: new THREE.MeshStandardMaterial({ color: 0xa87447, roughness: 0.8 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.4, metalness: 0.6 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x86a9bb, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false,
  }),
  warm: new THREE.MeshStandardMaterial({ color: 0x2a1a0c, emissive: 0xffb866, emissiveIntensity: 0.9, roughness: 1 }),
  water: new THREE.MeshStandardMaterial({
    color: 0x2f9ec4, emissive: 0x0b5a73, emissiveIntensity: 0.9, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.9,
  }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x40604a, roughness: 0.9, flatShading: true }),
  bark: new THREE.MeshStandardMaterial({ color: 0x3a2b20, roughness: 1 }),
};
const edgeMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.4 });
const parts = [];

function box(w, h, d, mat, x, y, z, { edges = true, shadow = true } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat));
  return mesh;
}
function part(order, ex = [0, 0, 0], ...children) {
  const g = new THREE.Group();
  children.forEach((c) => g.add(c));
  g.userData = { order, ex: new THREE.Vector3(...ex), seed: Math.random() * Math.PI * 2 };
  house.add(g);
  parts.push(g);
  return g;
}

// Plinth
part(0, [0, 0, 0], box(16, 0.5, 11, M.stone, 0, 0.25, 0));

// Pool with white coping
part(0.15, [0, 0.4, 1.5],
  box(6.1, 0.08, 3.4, M.render, -3.25, 0.54, 3.6, { edges: false }),
  box(5.5, 0.06, 2.8, M.water, -3.25, 0.6, 3.6, { shadow: false }),
);

// Timber deck (planks)
const planks = [];
for (let i = 0; i < 12; i++) planks.push(box(0.46, 0.08, 4, M.deck, 1.25 + i * 0.5, 0.54, 3.5, { edges: false }));
part(0.2, [1.5, 0.3, 1.5], ...planks);

// Ground floor glass pavilion with warm interior
const pavilion = [
  box(8, 3, 5.5, M.glass, -1, 2.0, -1.25, { shadow: false }),
  box(7.8, 0.05, 5.3, M.warm, -1, 0.53, -1.25, { edges: false, shadow: false }),
  box(3.2, 0.9, 1.1, M.render, -2.2, 0.98, -2.2, { edges: false }), // kitchen island
  box(2.4, 0.5, 1, M.timber, 1.2, 0.78, -0.4, { edges: false }), // sofa
];
for (let i = 0; i <= 5; i++) {
  const x = -5 + i * 1.6;
  pavilion.push(box(0.06, 3, 0.06, M.frame, x, 2.0, 1.5, { edges: false }));
  pavilion.push(box(0.06, 3, 0.06, M.frame, x, 2.0, -4, { edges: false }));
}
part(0.3, [0, 0, 1.2], ...pavilion);

// Concrete fin wall
part(0.25, [-2.5, 0, 0], box(0.45, 6.9, 7.8, M.concrete, -5.6, 3.95, -1));

// Timber-clad box
const slats = [box(3.5, 3, 5.5, M.timber, 4.75, 2.0, -1.25)];
for (let i = 0; i < 9; i++) slats.push(box(0.05, 3, 0.1, M.frame, 3.2 + i * 0.4, 2.0, 1.52, { edges: false, shadow: false }));
part(0.35, [2.5, 0, 0], ...slats);

// Steel column under the cantilever
part(0.45, [0, 0, 0], box(0.14, 3, 0.14, M.frame, 6.3, 2.0, 3.0, { edges: false }));

// Upper floor — white cantilevered volume with ribbon window
part(0.55, [0, 2.6, 0],
  box(12, 2.8, 5.8, M.render, 0.6, 4.9, 0.4),
  box(9.6, 1.1, 0.05, M.warm, 1.4, 4.9, 3.2, { edges: false, shadow: false }),
  box(10, 1.3, 0.12, M.glass, 1.4, 4.9, 3.32, { shadow: false }),
  box(0.05, 1.3, 0.14, M.frame, -1.8, 4.9, 3.33, { edges: false }),
  box(0.05, 1.3, 0.14, M.frame, 1.4, 4.9, 3.33, { edges: false }),
  box(0.05, 1.3, 0.14, M.frame, 4.6, 4.9, 3.33, { edges: false }),
);

// Roof slab with overhang
part(0.72, [0, 5, 0], box(13, 0.22, 6.6, M.render, 0.6, 6.41, 0.4));

// Rooftop stair core + glass balustrade
part(0.85, [0, 6.5, 0],
  box(2.6, 1.2, 2.2, M.concrete, -3.4, 7.12, -1.3),
  box(12.6, 0.8, 0.05, M.glass, 0.6, 6.92, 3.62, { shadow: false }),
);

// Trees
const trees = [];
[[-7.4, -4.8, 1.2], [7.6, -4.3, 1], [-9.2, 3.8, 1.4], [9.6, 2.6, 0.9], [0.5, -6.8, 1.1], [-10.5, -1.5, 0.8]].forEach(([x, z, s]) => {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 6), M.bark);
  trunk.position.y = 0.8;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), M.leaf);
  crown.position.y = 2.1;
  crown.scale.set(1, 1.25, 1);
  [trunk, crown].forEach((m) => { m.castShadow = true; });
  const tree = new THREE.Group();
  tree.add(trunk, crown);
  tree.position.set(x, 0, z);
  tree.scale.setScalar(s);
  trees.push(tree);
});
part(0.9, [0, 0, 0], ...trees);

// Interior light
const interior = new THREE.PointLight(0xffb866, 18, 12, 2);
interior.position.set(-1, 2.4, -1.2);
house.add(interior);

/* ---------- Wireframe city ---------- */
const city = new THREE.Group();
scene.add(city);
const cityEdgeMat = new THREE.LineBasicMaterial({ color: COOL, transparent: true, opacity: 0.28 });
const cityFillMat = new THREE.MeshStandardMaterial({ color: 0x151920, roughness: 0.9, transparent: true, opacity: 0.9 });
const blocks = [];
const cityCount = isMobile ? 70 : 140;
for (let i = 0; i < cityCount; i++) {
  const ang = Math.random() * Math.PI * 2;
  const rad = 15 + Math.random() * 26;
  if (rad < 24 && Math.abs(ang - Math.atan2(20, 15)) < 0.5) { i--; continue; }
  const x = Math.cos(ang) * rad;
  const z = Math.sin(ang) * rad;
  const h = 0.5 + Math.random() * Math.random() * 7 * (1 - rad / 48);
  const w = 0.8 + Math.random() * 1.8;
  const d = 0.8 + Math.random() * 1.8;
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  const b = new THREE.Mesh(geo, cityFillMat);
  b.position.set(x, 0, z);
  b.rotation.y = Math.round(Math.random() * 4) * (Math.PI / 8);
  b.castShadow = true;
  b.receiveShadow = true;
  b.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), cityEdgeMat));
  b.scale.y = 0.001;
  b.userData = { delay: rad / 40 + Math.random() * 0.3 };
  city.add(b);
  blocks.push(b);
}

/* ---------- Particles: floating dust / survey points ---------- */
const PCOUNT = isMobile ? 600 : 1400;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PCOUNT * 3);
for (let i = 0; i < PCOUNT; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 60;
  pPos[i * 3 + 1] = Math.random() * 30;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
}
pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({ color: 0xf2d7ad, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })
);
scene.add(particles);

/* ---------- Orbiting "sun path" arc ---------- */
const arcCurve = new THREE.EllipseCurve(0, 0, 13, 13, Math.PI * 0.05, Math.PI * 0.95, false, 0);
const arcPts = arcCurve.getPoints(120).map((p) => new THREE.Vector3(p.x, p.y, 0));
const arc = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(arcPts),
  new THREE.LineDashedMaterial({ color: ACCENT, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.5 })
);
arc.computeLineDistances();
arc.rotation.y = Math.PI / 5;
scene.add(arc);
const sunOrb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
scene.add(sunOrb);
const sunHalo = new THREE.Mesh(
  new THREE.SphereGeometry(0.7, 24, 24),
  new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
);
sunOrb.add(sunHalo);

/* =========================================================
   CAMERA CHOREOGRAPHY — keyframes per section
   ========================================================= */
// Each keyframe: camera position, look-at target, house rotation, explode (0..1), house x-offset
const keys = [
  { pos: [15, 7, 20], look: [-4.5, 3.2, 0], rot: -0.25, explode: 0, x: 3.5 },   // hero
  { pos: [-21, 14, 23], look: [1, 3, 0], rot: 0.35, explode: 0, x: -4 },       // studio
  { pos: [0, 34, 0.01], look: [0, 0, 0], rot: 0.9, explode: 0.2, x: 0 },       // projects — plan view
  { pos: [25, 11, -17], look: [2, 5, 0], rot: -0.6, explode: 1, x: -5 },        // services — exploded
  { pos: [-14, 7, -25], look: [0, 3, 0], rot: 0.2, explode: 0.35, x: -3 },      // process
  { pos: [5, 0.9, 12], look: [0, 5.5, 0], rot: -0.1, explode: 0, x: 0 },       // quote — worm's-eye under the cantilever
  { pos: [30, 21, 30], look: [0, 1.5, 0], rot: -0.4, explode: 0, x: 4 },       // contact — aerial
];

const sections = [...document.querySelectorAll("[data-scene]")];
const state = { pos: new THREE.Vector3(), look: new THREE.Vector3(), rot: -0.25, explode: 0, x: 3.5 };
const target = { pos: new THREE.Vector3(...keys[0].pos), look: new THREE.Vector3(...keys[0].look), rot: -0.25, explode: 0, x: 3.5 };
state.pos.copy(target.pos);
state.look.copy(target.look);

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function computeScrollTarget() {
  // Find which two sections the viewport centre sits between
  const mid = window.innerHeight * 0.5;
  let idx = 0;
  let f = 0;
  for (let i = 0; i < sections.length; i++) {
    const r = sections[i].getBoundingClientRect();
    if (r.top <= mid) {
      idx = i;
      f = clamp01((mid - r.top) / r.height);
    }
  }
  const a = keys[Math.min(idx, keys.length - 1)];
  const b = keys[Math.min(idx + 1, keys.length - 1)];
  // hold on a keyframe for the first half of a section, then blend
  const k = smooth(clamp01((f - 0.35) / 0.65));
  target.pos.copy(tmpA.set(...a.pos)).lerp(tmpB.set(...b.pos), k);
  target.look.copy(tmpA.set(...a.look)).lerp(tmpB.set(...b.look), k);
  target.rot = lerp(a.rot, b.rot, k);
  target.explode = lerp(a.explode, b.explode, k);
  target.x = lerp(a.x, b.x, k);
  if (isMobile) {
    target.x *= 0.25;
    target.pos.sub(target.look).multiplyScalar(1.7).add(target.look);
  }
}

/* ---------- Pointer ---------- */
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
});

/* ---------- Intro build-up ---------- */
let intro = 0; // 0 → 1 over the first seconds after load
let started = false;

/* ---------- Render loop ---------- */
const clock = new THREE.Clock();
let scrollP = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (started) intro = Math.min(1, intro + dt * 0.45);
  const ie = 1 - Math.pow(1 - intro, 3);

  computeScrollTarget();
  const ease = 1 - Math.pow(0.001, dt * (reducedMotion ? 4 : 1.1));
  state.pos.lerp(target.pos, ease);
  state.look.lerp(target.look, ease);
  state.rot = lerp(state.rot, target.rot, ease);
  state.explode = lerp(state.explode, target.explode, ease);
  state.x = lerp(state.x, target.x, ease);

  pointer.sx = lerp(pointer.sx, pointer.x, 0.05);
  pointer.sy = lerp(pointer.sy, pointer.y, 0.05);

  // Camera with parallax + slow idle drift
  const drift = reducedMotion ? 0 : 1;
  camera.position.set(
    state.pos.x + pointer.sx * 1.4 + Math.sin(t * 0.15) * 0.6 * drift,
    state.pos.y - pointer.sy * 0.9 + (1 - ie) * 6,
    state.pos.z + Math.cos(t * 0.12) * 0.6 * drift
  );
  camera.lookAt(state.look.x + state.x * -0.2, state.look.y, state.look.z);

  // House: parts drop into place in order, then separate in the exploded view
  house.position.x = state.x;
  house.rotation.y = state.rot + Math.sin(t * 0.08) * 0.08 * drift;
  for (const p of parts) {
    const u = p.userData;
    const built = smooth(clamp01((ie * 1.9 - u.order) * 1.8));
    const hover = Math.sin(t * 1.1 + u.seed) * 0.06 * state.explode;
    p.position.copy(u.ex).multiplyScalar(state.explode);
    p.position.y += (1 - built) * 6 + hover;
    p.scale.setScalar(Math.max(0.001, built));
  }
  trees.forEach((tr, i) => (tr.rotation.z = Math.sin(t * 0.9 + i) * 0.025 * drift));
  interior.intensity = (14 + Math.sin(t * 1.5) * 3) * ie;
  M.water.emissiveIntensity = 0.8 + Math.sin(t * 2.3) * 0.15;
  edgeMat.opacity = 0.3 + state.explode * 0.5;

  // City rises in waves
  for (const b of blocks) {
    const g = smooth(clamp01((ie * 1.8 - b.userData.delay) * 1.6));
    b.scale.y = Math.max(0.001, g);
  }
  city.position.x = state.x * 0.5;
  rings.position.x = state.x;
  rings.children.forEach((r, i) => {
    r.rotation.z = t * (0.05 + i * 0.02) * (i % 2 ? -1 : 1);
    r.scale.setScalar(ie * (1 + Math.sin(t * 0.8 + i) * 0.015));
  });

  // Sun moves along its arc with scroll — the "meridian"
  const sunT = 0.05 + (0.1 + scrollP * 0.8) * 0.9;
  const sp = arcCurve.getPoint(sunT);
  tmpA.set(sp.x, sp.y, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), arc.rotation.y);
  sunOrb.position.set(tmpA.x + state.x, tmpA.y, tmpA.z);
  arc.position.x = state.x;
  sun.position.set(sunOrb.position.x * 1.6, sunOrb.position.y * 1.6 + 2, sunOrb.position.z * 1.6);
  sun.target.position.set(state.x, 0, 0);
  sun.target.updateMatrixWorld();
  sunHalo.scale.setScalar(1 + Math.sin(t * 2.2) * 0.12);
  arc.material.opacity = 0.5 * ie;

  glow.position.set(state.x + Math.sin(t * 0.7) * 3, 3 + Math.sin(t * 0.4) * 2, Math.cos(t * 0.7) * 3);
  rim.position.x = -8 + state.x;

  particles.rotation.y = t * 0.012;
  particles.position.y = Math.sin(t * 0.2) * 0.3;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = window.innerWidth < window.innerHeight ? 52 : 38;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);
onResize();
tick();

/* =========================================================
   LOADER
   ========================================================= */
const loader = document.getElementById("loader");
const loaderCount = document.getElementById("loaderCount");
let loadVal = 0;
const loadStart = performance.now();
function loadStep() {
  const el = performance.now() - loadStart;
  loadVal = Math.min(100, Math.floor(smooth(clamp01(el / 1800)) * 100));
  loaderCount.textContent = loadVal;
  if (loadVal < 100) return requestAnimationFrame(loadStep);
  setTimeout(() => {
    loader.classList.add("done");
    document.body.classList.remove("loading");
    document.body.classList.add("ready");
    started = true;
  }, 250);
}
requestAnimationFrame(loadStep);

/* =========================================================
   UI MOTION
   ========================================================= */
// Reveal on scroll
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
      e.target.querySelectorAll?.("[data-count]").forEach(countUp);
    });
  },
  { threshold: 0.18, rootMargin: "0px 0px -5% 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

function countUp(el) {
  const end = +el.dataset.count;
  const start = performance.now();
  const dur = 2000;
  (function step(now) {
    const k = clamp01((now - start) / dur);
    el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4)));
    if (k < 1) requestAnimationFrame(step);
  })(start);
}

// Scroll-linked UI: progress bar, nav, coords, timeline
const nav = document.getElementById("nav");
const progressBar = document.getElementById("progressBar");
const coords = document.querySelector(".coords");
const coordAlt = document.getElementById("coordAlt");
const coordLat = document.getElementById("coordLat");
const timelineFill = document.getElementById("timelineFill");
const timeline = document.querySelector(".timeline");
function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollP = max > 0 ? window.scrollY / max : 0;
  progressBar.style.transform = `scaleX(${scrollP})`;
  nav.classList.toggle("scrolled", window.scrollY > 40);
  coords.classList.toggle("hidden", window.scrollY > window.innerHeight * 0.6);
  coordAlt.textContent = `ALT ${String(Math.round(scrollP * 248)).padStart(3, "0")} m`;
  coordLat.textContent = `W 73°${String(59 - Math.round(scrollP * 12)).padStart(2, "0")}′`;
  const r = timeline.getBoundingClientRect();
  const k = clamp01((window.innerHeight * 0.8 - r.top) / (r.height + window.innerHeight * 0.3));
  timelineFill.style.transform = `scaleX(${k})`;
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Custom cursor
const cursor = document.getElementById("cursor");
const dot = document.getElementById("cursorDot");
const cur = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2 };
window.addEventListener("pointermove", (e) => {
  cur.x = e.clientX;
  cur.y = e.clientY;
  dot.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
});
(function cursorLoop() {
  cur.cx = lerp(cur.cx, cur.x, 0.16);
  cur.cy = lerp(cur.cy, cur.y, 0.16);
  cursor.style.transform = `translate(${cur.cx}px, ${cur.cy}px)`;
  requestAnimationFrame(cursorLoop);
})();
document.querySelectorAll("[data-hover], a, button, input, textarea, select").forEach((el) => {
  el.addEventListener("pointerenter", () => cursor.classList.add("hover"));
  el.addEventListener("pointerleave", () => cursor.classList.remove("hover"));
});

// 3D tilt cards
if (!reducedMotion) {
  document.querySelectorAll(".tilt").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 12}deg) translateZ(10px)`;
    });
    card.addEventListener("pointerleave", () => (card.style.transform = ""));
  });

  // Magnetic buttons
  document.querySelectorAll(".magnetic").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
  });
}

// Mobile menu
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
burger.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  })
);

// Contact form (front-end only)
document.getElementById("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const note = document.getElementById("formNote");
  const name = new FormData(e.target).get("name");
  note.textContent = `Thank you, ${name}. Our studio will be in touch within two working days.`;
  e.target.reset();
});
