import * as THREE from "three";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 760px)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

document.body.classList.add("loading");
document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   THREE.JS SCENE — a procedural twisting tower in a wireframe city
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

// Site rings — survey-style circles around the tower
const rings = new THREE.Group();
for (let i = 0; i < 3; i++) {
  const r = 4.5 + i * 2.2;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r, r + 0.02, 128),
    new THREE.MeshBasicMaterial({ color: i === 0 ? ACCENT : COOL, transparent: true, opacity: 0.35 - i * 0.08, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  rings.add(ring);
}
scene.add(rings);

/* ---------- The tower ---------- */
const tower = new THREE.Group();
scene.add(tower);

const FLOORS = isMobile ? 34 : 46;
const FLOOR_H = 0.34;
const slabMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.55, metalness: 0.05 });
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x6f93a8, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.42,
  emissive: 0x0f1c24, emissiveIntensity: 1,
});
const edgeMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55 });
const floors = [];

for (let i = 0; i < FLOORS; i++) {
  const t = i / (FLOORS - 1);
  // Tapering profile with a subtle belly
  const w = 3.2 * (1 - t * 0.42) + Math.sin(t * Math.PI) * 0.35;
  const d = w * 0.72;
  const floor = new THREE.Group();

  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), slabMat);
  slab.castShadow = true;
  slab.receiveShadow = true;
  floor.add(slab);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, FLOOR_H - 0.07, d * 0.94), glassMat);
  glass.position.y = FLOOR_H / 2;
  floor.add(glass);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), edgeMat);
  floor.add(edges);

  // Vertical mullions at the corners
  if (i < FLOORS - 1) {
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.035, FLOOR_H, 0.035), slabMat);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
      const m = mull.clone();
      m.position.set((sx * w) / 2 * 0.97, FLOOR_H / 2, (sz * d) / 2 * 0.97);
      floor.add(m);
    });
  }

  floor.position.y = i * FLOOR_H;
  floor.userData = { baseY: i * FLOOR_H, t, seed: Math.random() * Math.PI * 2 };
  tower.add(floor);
  floors.push(floor);
}

// Crown spire
const spire = new THREE.Mesh(
  new THREE.ConeGeometry(0.08, 2.4, 8),
  new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.3 })
);
spire.position.y = FLOORS * FLOOR_H + 1.1;
tower.add(spire);

// Glowing core
const core = new THREE.Mesh(
  new THREE.CylinderGeometry(0.28, 0.4, FLOORS * FLOOR_H, 16, 1, true),
  new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
);
core.position.y = (FLOORS * FLOOR_H) / 2;
tower.add(core);

const TOWER_H = FLOORS * FLOOR_H;

/* ---------- Wireframe city ---------- */
const city = new THREE.Group();
scene.add(city);
const cityEdgeMat = new THREE.LineBasicMaterial({ color: COOL, transparent: true, opacity: 0.28 });
const cityFillMat = new THREE.MeshStandardMaterial({ color: 0x151920, roughness: 0.9, transparent: true, opacity: 0.9 });
const blocks = [];
const cityCount = isMobile ? 70 : 140;
for (let i = 0; i < cityCount; i++) {
  const ang = Math.random() * Math.PI * 2;
  const rad = 7 + Math.random() * 30;
  if (rad < 16 && Math.abs(ang - Math.atan2(20, 15)) < 0.5) { i--; continue; }
  const x = Math.cos(ang) * rad;
  const z = Math.sin(ang) * rad;
  const h = 0.5 + Math.random() * Math.random() * 8 * (1 - rad / 45);
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
// Each keyframe: camera position, look-at target, tower twist (radians total), explode (0..1), tower x-offset
const keys = [
  { pos: [15, 6, 21], look: [-3.2, 6.2, 0], twist: 1.2, explode: 0, x: 3.4 },   // hero
  { pos: [-10, 13, 14], look: [0, 8, 0], twist: 2.2, explode: 0.0, x: -3.5 },    // studio
  { pos: [0, 30, 0.01], look: [0, 0, 0], twist: 3.2, explode: 0.25, x: 0 },       // projects — plan view
  { pos: [18, 4, -10], look: [2, 9, 0], twist: 1.6, explode: 1, x: -5 },          // services — exploded
  { pos: [-6, 7, -18], look: [0, 6, 0], twist: 0.6, explode: 0.4, x: -2.5 },      // process
  { pos: [4, 1.6, 9], look: [0, 12, 0], twist: 2.6, explode: 0, x: 0 },           // quote — worm's-eye
  { pos: [22, 16, 22], look: [0, 4, 0], twist: 1.4, explode: 0, x: 4 },           // contact — aerial
];

const sections = [...document.querySelectorAll("[data-scene]")];
const state = { pos: new THREE.Vector3(), look: new THREE.Vector3(), twist: 1.2, explode: 0, x: 3.2 };
const target = { pos: new THREE.Vector3(...keys[0].pos), look: new THREE.Vector3(...keys[0].look), twist: 1.2, explode: 0, x: 3.2 };
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
  target.twist = lerp(a.twist, b.twist, k);
  target.explode = lerp(a.explode, b.explode, k);
  target.x = lerp(a.x, b.x, k);
  if (isMobile) target.x *= 0.25;
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
  state.twist = lerp(state.twist, target.twist, ease);
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

  // Tower: build floors from the ground up, twist, breathe, explode
  tower.position.x = state.x;
  tower.rotation.y = t * 0.06 * drift + scrollP * 1.2;
  for (let i = 0; i < floors.length; i++) {
    const fl = floors[i];
    const u = fl.userData;
    const built = smooth(clamp01(ie * 1.6 - u.t * 0.9));
    const explodeY = state.explode * u.t * 6;
    const wobble = Math.sin(t * 1.2 + u.seed) * 0.05 * state.explode;
    fl.position.y = (u.baseY + explodeY) * built + wobble;
    fl.scale.setScalar(0.001 + built * 0.999);
    fl.rotation.y = u.t * state.twist + Math.sin(t * 0.5 + u.t * 4) * 0.02 * drift;
    // explode outward sideways a little
    fl.position.x = Math.sin(u.seed) * state.explode * 0.6 * u.t;
    fl.position.z = Math.cos(u.seed) * state.explode * 0.6 * u.t;
  }
  const topY = floors[floors.length - 1].position.y;
  spire.position.y = topY + 1.2;
  spire.scale.setScalar(Math.max(0.001, smooth(clamp01(ie * 1.6 - 0.9))));
  core.scale.y = Math.max(0.001, (topY + FLOOR_H) / TOWER_H);
  core.position.y = (topY + FLOOR_H) / 2;
  core.material.opacity = 0.14 + Math.sin(t * 2) * 0.05 + state.explode * 0.2;
  edgeMat.opacity = 0.35 + state.explode * 0.5;

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
