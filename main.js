import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildVilla } from "./villa.js?v=7";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 760px)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

document.body.classList.add("loading");
document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   RENDERER — golden hour on the coast
   ========================================================= */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // the villa is static: render the sun's shadows once

const scene = new THREE.Scene();
const SUN = new THREE.Vector3(0.35, 0.055, -1).normalize();

// Sky: gradient, sun disc & glow, drifting sunset clouds
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: { sun: { value: SUN }, time: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    varying vec3 vDir; uniform vec3 sun; uniform float time;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
    void main(){
      vec3 d = normalize(vDir);
      float h = d.y;
      float sd = max(dot(d, sun), 0.0);
      vec3 zenith = vec3(0.2, 0.27, 0.52);
      vec3 mid = vec3(0.66, 0.5, 0.62);
      vec3 horizon = mix(vec3(0.98, 0.6, 0.45), vec3(1.0, 0.5, 0.18), pow(sd, 2.0));
      vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h));
      col = mix(col, zenith, smoothstep(0.15, 0.7, h));
      col += vec3(1.0, 0.5, 0.2) * pow(sd, 8.0) * 0.35;
      col += vec3(1.0, 0.72, 0.4) * pow(sd, 90.0) * 0.5;
      // clouds: a band of broken altocumulus lit from the sun side
      if (h > 0.0) {
        vec2 uv = d.xz / (h + 0.08) * 1.4 + vec2(time * 0.004, 0.0);
        float c = fbm(uv * 1.3);
        float band = smoothstep(0.02, 0.1, h) * (1.0 - smoothstep(0.35, 0.6, h));
        float cov = smoothstep(0.52, 0.72, c) * band;
        vec3 lit = mix(vec3(0.78, 0.46, 0.5), vec3(1.0, 0.56, 0.3), pow(sd, 1.5));
        vec3 edge = vec3(1.0, 0.75, 0.45) * pow(sd, 4.0);
        col = mix(col, lit + edge * 0.6, cov * 0.85);
      }
      // sun disc
      col += vec3(1.0, 0.85, 0.6) * smoothstep(0.9993, 0.9997, sd) * 4.0;
      col = mix(col, vec3(0.55, 0.4, 0.42), smoothstep(0.0, -0.05, h));
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 64, 32), skyMat);
scene.add(sky);

// Sea with a glittering sun path
const seaMat = new THREE.ShaderMaterial({
  fog: false,
  uniforms: { sun: { value: SUN }, time: { value: 0 }, camPos: { value: new THREE.Vector3() } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `
    varying vec3 vW; uniform vec3 sun, camPos; uniform float time;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    void main(){
      vec3 v = normalize(vW - camPos);
      float dist = length(vW - camPos);
      vec2 p = vW.xz * 0.05;
      float n = noise(p + time * 0.15) * 0.6 + noise(p * 3.1 - time * 0.2) * 0.4;
      vec3 nrm = normalize(vec3((n - 0.5) * 0.18, 1.0, (noise(p.yx * 2.0 + time * 0.1) - 0.5) * 0.18));
      vec3 r = reflect(v, nrm);
      float sd = max(dot(r, sun), 0.0);
      float fres = pow(1.0 - max(dot(-v, vec3(0,1,0)), 0.0), 4.0);
      vec3 deep = vec3(0.1, 0.13, 0.24);
      vec3 skyRef = mix(vec3(0.5, 0.45, 0.62), vec3(1.0, 0.6, 0.35), pow(max(dot(normalize(vec3(r.x, 0.0, r.z)), normalize(vec3(sun.x, 0.0, sun.z))), 0.0), 4.0));
      vec3 col = mix(deep, skyRef, 0.25 + fres * 0.6);
      col += vec3(1.0, 0.72, 0.42) * pow(sd, 90.0) * 3.0;
      col += vec3(1.0, 0.8, 0.5) * step(0.9985, sd) * 4.0 * noise(vW.xz * 0.8 + time);
      // haze towards the horizon
      float haze = smoothstep(300.0, 3500.0, dist);
      col = mix(col, vec3(0.98, 0.6, 0.45), haze * 0.85);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), seaMat);
sea.rotation.x = -Math.PI / 2;
sea.position.set(0, -60, -2000);
scene.add(sea);

// Distant coastline ridges in atmospheric haze
{
  const ridge = (x0, x1, z, height, color, seedK) => {
    const shape = new THREE.Shape();
    shape.moveTo(x0, 0);
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const t = i / n;
      const y = height * (Math.sin(t * Math.PI) * 0.7 + 0.3 * Math.sin(t * 17 + seedK) * Math.sin(t * 5 + seedK * 2)) * (0.6 + 0.4 * Math.sin(t * 3 + seedK));
      shape.lineTo(x, Math.max(0, y));
    }
    shape.lineTo(x1, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color, fog: false }));
    m.position.set(0, -60, z);
    scene.add(m);
  };
  ridge(-2600, -300, -2600, 180, new THREE.Color(0.55, 0.42, 0.5), 1.3);
  ridge(-1800, 200, -2200, 110, new THREE.Color(0.45, 0.35, 0.44), 2.1);
  ridge(900, 3200, -2800, 150, new THREE.Color(0.6, 0.46, 0.52), 0.7);
  ridge(1500, 3400, -1900, 90, new THREE.Color(0.5, 0.38, 0.46), 3.3);
}

// Environment for reflections: the sunset sky itself
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
const env = pmrem.fromScene(envScene, 0.03).texture;
scene.environment = env;

// Low golden sun with soft shadows, sky fill
const sunLight = new THREE.DirectionalLight(new THREE.Color(1.0, 0.58, 0.32), 3.4);
sunLight.position.copy(SUN).multiplyScalar(80).add(new THREE.Vector3(0, 12, 0));
sunLight.target.position.set(0, 0, -6);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(isMobile ? 2048 : 4096, isMobile ? 2048 : 4096);
Object.assign(sunLight.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 });
sunLight.shadow.bias = -0.0003;
sunLight.shadow.normalBias = 0.03;
scene.add(sunLight, sunLight.target);
scene.add(new THREE.HemisphereLight(new THREE.Color(0.66, 0.55, 0.62), new THREE.Color(0.36, 0.26, 0.18), 0.42));

const villa = buildVilla(scene, { env, lite: isMobile, sunDir: SUN });
renderer.shadowMap.needsUpdate = true;

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 9000);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.26, 0.4, 0.96);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* =========================================================
   ONE CONTINUOUS WALK — keyframes in "section units"
   0 hero · 1 studio · 2 projects · 3 services · 4 process · 5 quote · 6 contact · 7 end
   ========================================================= */
const K = [
  { t: 0.0, pos: [-14, 1.4, 31], look: [0, 3.2, -2], room: "Arrival" },
  { t: 0.7, pos: [-4, 0.9, 15], look: [0, 3.0, -2], room: "Arrival" },
  { t: 1.2, pos: [0, 0.75, 8.2], look: [0, 2.4, -2], room: "Entrance" },
  { t: 1.6, pos: [0, 1.7, 2.4], look: [0, 2.6, -5], room: "Entrance Hall" },
  { t: 2.0, pos: [0, 1.7, -2.2], look: [0, 4.4, -9], room: "Entrance Hall" },
  { t: 2.5, pos: [-0.3, 1.7, -4.4], look: [0.8, 2.1, -14], room: "Grand Living" },
  { t: 3.0, pos: [1.6, 1.5, -5.9], look: [6.6, 1.7, -8.6], room: "Grand Living" },
  { t: 3.4, pos: [-4.2, 1.7, -3.6], look: [-12, 1.5, -6], room: "Kitchen" },
  { t: 3.8, pos: [-8.6, 1.7, -3.9], look: [-19.6, 1.4, -6.6], room: "Kitchen" },
  { t: 4.2, pos: [-10.2, 1.7, -8.7], look: [-15, 1.1, -14], room: "Dining" },
  { t: 4.65, pos: [-2.2, 1.7, -3.1], look: [7, 1.7, -2], room: "Gallery" },
  { t: 5.0, pos: [8.6, 1.7, -2.1], look: [12, 1.6, -6], room: "Master Suite" },
  { t: 5.4, pos: [15.6, 1.65, -2.9], look: [11, 1.3, -14], room: "Master Suite" },
  { t: 5.9, pos: [14.8, 1.7, -11.2], look: [12.5, 1.4, -24], room: "Master Suite" },
  { t: 6.4, pos: [13.2, 1.8, -20.2], look: [-6, 0.6, -22.5], room: "Infinity Pool" },
  { t: 7.0, pos: [3.5, 2.6, -15.4], look: [12, 0.4, -60], room: "Sunset Terrace" },
];
const posCurve = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
const lookCurve = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");

// Labels anchored to real points in the model, shown while the camera is nearby
const ANNOS = [
  { at: [0, 5.5, -0.5], t: [0.1, 1.3], label: "Bronze-framed glazing", detail: "7.6 m entrance façade" },
  { at: [-5.7, 4.5, 0.1], t: [0.1, 1.3], label: "Split-face limestone", detail: "Hand-dressed cladding" },
  { at: [0, 5.2, -3], t: [1.7, 2.3], label: "Crystal cascade chandelier", detail: "Hand-blown glass, brass" },
  { at: [0.5, 3.4, -14], t: [2.25, 2.8], label: "Double-height glazing", detail: "Uninterrupted sea view" },
  { at: [6.5, 0.7, -8], t: [2.75, 3.2], label: "Linear fireplace", detail: "Book-matched marble hearth" },
  { at: [-0.7, 0.42, -9.2], t: [2.35, 2.95], label: "Emperador coffee table", detail: "Polished marble" },
  { at: [-13.5, 0.97, -5.4], t: [3.6, 4.05], label: "Quartzite waterfall island", detail: "Single slab, 5 m" },
  { at: [-13.5, 2.3, -5.9], t: [3.6, 4.05], label: "Blown-glass pendants", detail: "Brass & amber filament" },
  { at: [-14.8, 0.8, -11.5], t: [4.05, 4.45], label: "Dining for ten", detail: "Walnut & bouclé" },
  { at: [7.7, 2.4, -7.5], t: [5.2, 5.75], label: "Stone feature wall", detail: "Backlit relief" },
  { at: [14, 2, -14], t: [5.2, 5.9], label: "Panoramic sliders", detail: "Open onto the terrace" },
  { at: [9.2, -0.6, -22.5], t: [6.2, 6.85], label: "Infinity edge", detail: "Cascading water wall" },
  { at: [15.2, 0.5, -17], t: [6.25, 6.9], label: "Fire lounge", detail: "Under the cantilever" },
];

const sections = [...document.querySelectorAll("[data-scene]")];
let sectionTops = [];
function measure() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  sectionTops = sections.map((s) => Math.min(s.getBoundingClientRect().top + window.scrollY, max - 1));
  sectionTops.push(max);
  for (let i = 1; i < sectionTops.length; i++) sectionTops[i] = Math.max(sectionTops[i], sectionTops[i - 1] + 1);
}
function sceneTime() {
  const y = window.scrollY;
  for (let i = 0; i < sectionTops.length - 1; i++) {
    if (y < sectionTops[i + 1]) return i + clamp01((y - sectionTops[i]) / (sectionTops[i + 1] - sectionTops[i]));
  }
  return sectionTops.length - 1;
}
// Section units → curve parameter (piecewise-linear between keyframes, so the camera never pauses)
function curveU(st) {
  let i = 0;
  while (i < K.length - 2 && st > K[i + 1].t) i++;
  const f = clamp01((st - K[i].t) / (K[i + 1].t - K[i].t));
  return { u: (i + f) / (K.length - 1), room: K[f < 0.5 ? i : i + 1].room };
}

/* ---------- Labels ---------- */
const annoLayer = document.createElement("div");
annoLayer.className = "annos on";
document.body.appendChild(annoLayer);
const annoEls = ANNOS.map((a, i) => {
  const el = document.createElement("div");
  el.className = "anno";
  el.style.setProperty("--d", "0s");
  el.innerHTML = `<i class="anno__dot"></i><span class="anno__line"></span><span class="anno__label">${a.label}<small>${a.detail}</small></span>`;
  annoLayer.appendChild(el);
  return { el, a, pos: new THREE.Vector3(...a.at) };
});

/* ---------- Render loop ---------- */
let started = false;
let tSmooth = 0;
let scrollP = 0;
let lastRoom = "";
const uniqueSrcs = ["villa"];
let loadedCount = 1;
const roomName = document.getElementById("roomName");
const roomNum = document.getElementById("roomNum");
const roomList = [...new Set(K.map((k) => k.room))];
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const proj = new THREE.Vector3();
const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const target = sceneTime();
  tSmooth = lerp(tSmooth, target, 1 - Math.pow(0.0005, dt * (reducedMotion ? 6 : 1)));
  const { u, room } = curveU(tSmooth);
  posCurve.getPoint(u, camPos);
  lookCurve.getPoint(u, camLook);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  // Entrance doors swing open as you approach
  const open = smooth(clamp01((6 - camPos.z) / 4.5));
  villa.doors[0].rotation.y = open * 1.35;
  villa.doors[1].rotation.y = -open * 1.35;

  villa.update(t);
  skyMat.uniforms.time.value = t;
  seaMat.uniforms.time.value = t;
  seaMat.uniforms.camPos.value.copy(camera.position);

  if (room !== lastRoom) {
    lastRoom = room;
    roomName.textContent = room;
    roomNum.textContent = String(roomList.indexOf(room) + 1).padStart(2, "0");
  }

  for (const { el, a, pos } of annoEls) {
    const on = started && tSmooth > a.t[0] && tSmooth < a.t[1];
    proj.copy(pos).project(camera);
    const vis = on && proj.z < 1 && Math.abs(proj.x) < 0.92 && Math.abs(proj.y) < 0.9;
    el.classList.toggle("show", vis);
    if (vis) el.style.transform = `translate(${((proj.x + 1) / 2) * window.innerWidth}px, ${((1 - proj.y) / 2) * window.innerHeight}px)`;
  }

  composer.render();
  requestAnimationFrame(tick);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = window.innerWidth < window.innerHeight ? 72 : 55;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
  measure();
}
window.addEventListener("resize", onResize);
window.addEventListener("load", measure);
onResize();
tSmooth = sceneTime();
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
  const texP = loadedCount / uniqueSrcs.length;
  loadVal = Math.min(100, Math.floor(Math.min(smooth(clamp01(el / 1800)), texP) * 100));
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
