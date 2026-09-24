import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildVilla } from "./villa.js?v=3";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 760px)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

document.body.classList.add("loading");
document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   RENDERER + SCENE — a scroll-driven walkthrough of a luxury villa
   ========================================================= */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0c12, 0.011);

// Dusk sky: deep navy overhead, warm afterglow on the horizon behind the house
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {},
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `varying vec3 vDir;
    void main(){
      float h = vDir.y;
      vec3 top = vec3(0.012,0.016,0.035);
      vec3 mid = vec3(0.05,0.05,0.1);
      vec3 col = mix(mid, top, smoothstep(0.0, 0.55, h));
      float glowAmt = exp(-abs(h) * 9.0) * (0.35 + 0.65 * max(0.0, -vDir.z));
      col += vec3(0.55, 0.26, 0.14) * glowAmt * 0.55;
      col = mix(col, vec3(0.012,0.013,0.018), smoothstep(0.0, -0.12, h));
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24), skyMat);
sky.renderOrder = -1;
const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.2), fog: false }));
moon.position.set(-220, 170, -480);

// Night environment map for glass and water reflections
const pmrem = new THREE.PMREMGenerator(renderer);
const skyScene = new THREE.Scene();
skyScene.add(sky.clone(), moon.clone());
const nightEnv = pmrem.fromScene(skyScene, 0.02).texture;
// Soft studio environment for interior materials
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.add(sky, moon);

// Stars
{
  const n = 1800;
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(Math.random() * 0.92);
    p.set([Math.sin(ph) * Math.cos(th) * 650, Math.cos(ph) * 650, Math.sin(ph) * Math.sin(th) * 650], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.75 })));
}

scene.add(new THREE.HemisphereLight(0x2c3a5a, 0x0a0a0c, 0.45));
const moonLight = new THREE.DirectionalLight(0x9fb4d8, 0.55);
moonLight.position.set(-30, 40, 30);
scene.add(moonLight);

const villa = buildVilla(scene, { nightEnv });

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 1500);

// Post-processing: bloom for the lighting
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.55, 0.6, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* =========================================================
   CAMERA PATH — keyframes in "section units"
   0 hero · 1 studio · 2 projects · 3 services · 4 process · 5 quote · 6 contact · 7 end
   ========================================================= */
const K = [
  { t: 0.0, pos: [8, 2.6, 26], look: [-3.5, 3.4, 0], room: "Arrival" },
  { t: 0.85, pos: [1.6, 1.75, 10.5], look: [0, 2.1, 0], room: "Arrival" },
  { t: 1.35, pos: [0.15, 1.7, 2.6], look: [0, 1.8, -4], room: "The Entrance" },
  { t: 1.8, pos: [0, 1.7, -2.2], look: [-3.5, 2.6, -9], room: "Foyer" },
  { t: 2.3, pos: [-1.2, 1.75, -6.4], look: [-10.5, 1.9, -9.2], room: "Grand Living" },
  { t: 2.8, pos: [-1.0, 1.6, -3.6], look: [-5.6, 4.6, -11.5], room: "Grand Living" },
  { t: 3.25, pos: [2.0, 1.75, -4.6], look: [7.5, 1.0, -9.4], room: "Kitchen" },
  { t: 3.75, pos: [4.3, 1.7, -11.6], look: [10.4, 1.7, -17.5], room: "Wine & Dining" },
  { t: 4.25, pos: [-1.6, 1.8, -9.2], look: [1.8, 2.0, -16], room: "Floating Stair" },
  { t: 4.75, pos: [1.7, 3.45, -15.4], look: [2.6, 4.7, -9.5], room: "Floating Stair" },
  { t: 5.25, pos: [4.2, 5.5, -12.6], look: [9.4, 4.4, -18.6], room: "Master Suite" },
  { t: 5.75, pos: [0.6, 5.9, -15.2], look: [-3, 2.2, -32], room: "Gallery" },
  { t: 6.35, pos: [-1.8, 1.6, -23.3], look: [-2, 0.4, -48], room: "Infinity Terrace" },
  { t: 7.0, pos: [-6, 4.2, -44], look: [0, 3.2, -16], room: "Infinity Terrace" },
];
const posCurve = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
const lookCurve = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");

const sections = [...document.querySelectorAll("[data-scene]")];
let sectionTops = [];
function measure() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  sectionTops = sections.map((s) => Math.min(s.getBoundingClientRect().top + window.scrollY, max - 1));
  sectionTops.push(max);
  for (let i = 1; i < sectionTops.length; i++) sectionTops[i] = Math.max(sectionTops[i], sectionTops[i - 1] + 1);
}
// Scroll position → section units (0..7)
function sceneTime() {
  const y = window.scrollY;
  for (let i = 0; i < sectionTops.length - 1; i++) {
    if (y < sectionTops[i + 1]) return i + clamp01((y - sectionTops[i]) / (sectionTops[i + 1] - sectionTops[i]));
  }
  return sectionTops.length - 1;
}
// Section units → curve parameter, easing into each keyframe so shots "hold"
function curveParam(st) {
  let i = 0;
  while (i < K.length - 2 && st > K[i + 1].t) i++;
  const f = clamp01((st - K[i].t) / (K[i + 1].t - K[i].t));
  return { u: (i + smooth(f)) / (K.length - 1), room: K[f < 0.5 ? i : i + 1].room, idx: f < 0.5 ? i : i + 1 };
}

/* ---------- Pointer ---------- */
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
});

/* ---------- Render loop ---------- */
let started = false;
let intro = 0;
let uSmooth = 0;
let scrollP = 0;
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const roomName = document.getElementById("roomName");
const roomNum = document.getElementById("roomNum");
let lastRoom = "";
const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (started) intro = Math.min(1, intro + dt * 0.5);
  const ie = 1 - Math.pow(1 - intro, 3);

  const { u, room, idx } = curveParam(sceneTime());
  uSmooth = lerp(uSmooth, u, 1 - Math.pow(0.001, dt * (reducedMotion ? 6 : 1.6)));
  posCurve.getPoint(uSmooth, camPos);
  lookCurve.getPoint(uSmooth, camLook);

  // Intro: drift in from further out while the page reveals
  camPos.z += (1 - ie) * 10;
  camPos.y += (1 - ie) * 2;

  pointer.sx = lerp(pointer.sx, pointer.x, 0.05);
  pointer.sy = lerp(pointer.sy, pointer.y, 0.05);
  const drift = reducedMotion ? 0 : 1;
  camera.position.set(
    camPos.x + pointer.sx * 0.25 * drift,
    camPos.y - pointer.sy * 0.15 * drift + Math.sin(t * 0.6) * 0.03 * drift,
    camPos.z
  );
  camera.lookAt(camLook.x + pointer.sx * 0.6 * drift, camLook.y - pointer.sy * 0.4 * drift, camLook.z);

  // The pivot door swings open as the camera approaches
  const open = smooth(clamp01((9 - camPos.z) / 6));
  villa.door.rotation.y = -1.42 * open;

  villa.update(t);

  if (room !== lastRoom) {
    lastRoom = room;
    roomName.textContent = room;
    const n = [...new Set(K.map((k) => k.room))].indexOf(room) + 1;
    roomNum.textContent = String(n).padStart(2, "0");
  }

  composer.render();
  requestAnimationFrame(tick);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = window.innerWidth < window.innerHeight ? 68 : 50;
  // On wide screens, frame the villa to the right of the content column
  if (window.innerWidth > 960) camera.setViewOffset(window.innerWidth, window.innerHeight, -window.innerWidth * 0.14, 0, window.innerWidth, window.innerHeight);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
  measure();
}
window.addEventListener("resize", onResize);
window.addEventListener("load", measure);
onResize();
uSmooth = curveParam(sceneTime()).u;
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

// Scroll-linked UI: progress bar, nav, timeline
const nav = document.getElementById("nav");
const progressBar = document.getElementById("progressBar");
const timelineFill = document.getElementById("timelineFill");
const timeline = document.querySelector(".timeline");
function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollP = max > 0 ? window.scrollY / max : 0;
  progressBar.style.transform = `scaleX(${scrollP})`;
  nav.classList.toggle("scrolled", window.scrollY > 40);
  const r = timeline.getBoundingClientRect();
  const k = clamp01((window.innerHeight * 0.8 - r.top) / (r.height + window.innerHeight * 0.3));
  timelineFill.style.transform = window.innerWidth > 960 ? `scaleY(${k})` : `scaleX(${k})`;
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
