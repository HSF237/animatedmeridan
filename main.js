import * as THREE from "three";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 760px)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

document.body.classList.add("loading");
document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   CINEMATIC WALKTHROUGH
   Each room is a photograph rendered through a depth-aware shader.
   Scrolling walks you forward (near areas grow faster than far ones,
   with a gentle head-bob in step with your scroll), and to reach the
   next room you turn — the camera rotates 90° around the corner, where
   the next room waits on the adjoining wall. No fades, no blur.
   ========================================================= */
// vp: the point the camera moves towards (uv, y up)
// depth: [radial weight, floor weight] — how "near" edges and the lower frame are
// focus: horizontal crop centre on narrow screens
const SHOTS = [
  { src: "assets/villa/arrival.webp", room: "Arrival", t: 0.0, vp: [0.38, 0.5], depth: [0.45, 0.75], focus: 0.42, turn: 1 },
  { src: "assets/villa/terrace.webp", room: "Infinity Terrace", t: 1.0, vp: [0.2, 0.62], depth: [0.4, 0.8], focus: 0.4, turn: -1 },
  { src: "assets/villa/living.webp", room: "Grand Living", t: 2.05, vp: [0.52, 0.52], depth: [0.75, 0.45], focus: 0.5, turn: -1 },
  { src: "assets/villa/kitchen.webp", room: "Kitchen", t: 3.15, vp: [0.86, 0.55], depth: [0.7, 0.5], focus: 0.62, turn: 1 },
  { src: "assets/villa/suite.webp", room: "Master Suite", t: 4.25, vp: [0.66, 0.55], depth: [0.7, 0.5], focus: 0.62, turn: 1 },
  { src: "assets/villa/terrace.webp", room: "Sunset Terrace", t: 5.4, vp: [0.93, 0.56], depth: [0.4, 0.8], focus: 0.8 },
];
const END_T = 7;
const HOLD = 0.55; // portion of each segment spent walking through a room before turning to the next

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const loaderTex = new THREE.TextureLoader();
let loadedCount = 0;
const uniqueSrcs = [...new Set(SHOTS.map((s) => s.src))];
const texBySrc = {};
Promise.all(
  uniqueSrcs.map(
    (src) =>
      new Promise((resolve) => {
        loaderTex.load(
          src,
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.minFilter = THREE.LinearMipmapLinearFilter;
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
            t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
            texBySrc[src] = t;
            loadedCount++;
            resolve();
          },
          undefined,
          () => { loadedCount++; resolve(); }
        );
      })
  )
);
const blank = new THREE.DataTexture(new Uint8Array([11, 12, 15, 255]), 1, 1);
blank.needsUpdate = true;

const shotUniforms = () => ({
  tex: { value: blank },
  aspect: { value: 16 / 9 },
  vp: { value: new THREE.Vector2(0.5, 0.5) },
  depth: { value: new THREE.Vector2(0.5, 0.5) },
  focus: { value: 0.5 },
  push: { value: 0 },
});
const A = shotUniforms();
const B = shotUniforms();
const prefix = (o, p) => Object.fromEntries(Object.entries(o).map(([k, v]) => [p + k, v]));

const material = new THREE.ShaderMaterial({
  uniforms: {
    ...prefix(A, "a_"),
    ...prefix(B, "b_"),
    turnAmt: { value: 0 },
    turnDir: { value: 1 },
    bob: { value: new THREE.Vector3() },
    screenAspect: { value: window.innerWidth / window.innerHeight },
    pointer: { value: new THREE.Vector2() },
    time: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform float screenAspect, turnAmt, turnDir, time;
    uniform vec2 pointer;
    uniform vec3 bob; // x, y offset and roll from walking
    uniform sampler2D a_tex, b_tex;
    uniform float a_aspect, a_focus, a_push, b_aspect, b_focus, b_push;
    uniform vec2 a_vp, a_depth, b_vp, b_depth;

    // Map a face uv to image uv with "cover" fitting and a horizontal focus point
    vec2 coverUv(vec2 uv, float imgAspect, float focus) {
      vec2 scale = screenAspect < imgAspect ? vec2(screenAspect / imgAspect, 1.0) : vec2(1.0, imgAspect / screenAspect);
      float fx = clamp(focus, scale.x * 0.5, 1.0 - scale.x * 0.5);
      return vec2(fx, 0.5) + (uv - 0.5) * scale;
    }
    // Approximate "nearness": far at the vanishing point, near at the edges and the floor
    float nearness(vec2 uv, vec2 vp, vec2 w, float imgAspect) {
      float r = distance(uv * vec2(imgAspect, 1.0), vp * vec2(imgAspect, 1.0)) / imgAspect;
      float radial = smoothstep(0.02, 0.75, r);
      float floorN = smoothstep(vp.y, 0.0, uv.y);
      return clamp(w.x * radial + w.y * floorN, 0.0, 1.0);
    }
    vec3 shot(sampler2D tex, vec2 faceUv, float imgAspect, float focus, vec2 vp, vec2 w, float push) {
      vec2 uv = coverUv(faceUv, imgAspect, focus);
      float n = nearness(uv, vp, w, imgAspect);
      // walking forward: depth-aware dolly towards the vanishing point
      float s = 1.0 + push * (0.18 + 0.55 * n);
      vec2 p = vp + (uv - vp) / s;
      // parallax: near things shift more than far things
      p += pointer * vec2(0.012, 0.008) * (n - 0.35);
      p += vec2(sin(time * 0.21), cos(time * 0.17)) * 0.0015 * n;
      return texture2D(tex, clamp(p, 0.001, 0.999)).rgb;
    }
    void main() {
      // Screen → view ray. Horizontal FOV is 90°, so each room fills one wall of a cube around the viewer.
      vec2 sc = vUv * 2.0 - 1.0;
      float cr = cos(bob.z), sr = sin(bob.z);
      sc = mat2(cr, -sr, sr, cr) * sc + bob.xy;
      vec3 d = normalize(vec3(sc.x, sc.y / screenAspect, -1.0));
      // Turn the head
      float yaw = -turnDir * turnAmt * 1.5707963;
      float cy = cos(yaw), sy = sin(yaw);
      d = vec3(cy * d.x + sy * d.z, d.y, -sy * d.x + cy * d.z);

      vec3 col;
      float corner;
      // Current room on the front wall (z = -1); next room on the side wall (x = ±1)
      float side = d.x * turnDir;
      if (-d.z >= side) {
        vec3 h = d / -d.z;
        vec2 f = vec2(h.x * 0.5 + 0.5, h.y * screenAspect * 0.5 + 0.5);
        col = shot(a_tex, f, a_aspect, a_focus, a_vp, a_depth, a_push);
        corner = 1.0 - h.x * turnDir;
      } else {
        vec3 h = d / side;
        vec2 f = vec2(turnDir * h.z * 0.5 + 0.5, h.y * screenAspect * 0.5 + 0.5);
        col = shot(b_tex, f, b_aspect, b_focus, b_vp, b_depth, b_push);
        corner = 1.0 + h.z;
      }
      // soft ambient occlusion where the two walls meet, only while turning
      float turning = smoothstep(0.0, 0.05, turnAmt) * smoothstep(1.0, 0.95, turnAmt);
      col *= 1.0 - 0.45 * exp(-corner * 28.0) * turning;
      // a slim stone jamb where the walls meet, like walking past a door frame
      col = mix(col, vec3(0.16, 0.13, 0.1), smoothstep(0.014, 0.008, corner) * turning);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
  depthTest: false,
  depthWrite: false,
});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

function assignShot(target, shot) {
  const tex = texBySrc[shot.src] || blank;
  if (target.tex.value !== tex) target.tex.value = tex;
  target.aspect.value = tex.image && tex.image.width ? tex.image.width / tex.image.height : 16 / 9;
  target.vp.value.set(...shot.vp);
  target.depth.value.set(...shot.depth);
  target.focus.value = shot.focus;
}

/* ---------- Scroll → walkthrough time ---------- */
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

/* ---------- Pointer ---------- */
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
});

/* ---------- Render loop ---------- */
let started = false;
let intro = 0;
let tSmooth = 0;
let prevT = 0;
let stepPhase = 0;
let bobAmt = 0;
let scrollP = 0;
const roomName = document.getElementById("roomName");
const roomNum = document.getElementById("roomNum");
const roomList = [...new Set(SHOTS.map((s) => s.room))];
let lastRoom = "";
const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (started) intro = Math.min(1, intro + dt * 0.45);
  const ie = 1 - Math.pow(1 - intro, 3);

  tSmooth = lerp(tSmooth, sceneTime(), 1 - Math.pow(0.001, dt * (reducedMotion ? 6 : 1.4)));
  let i = 0;
  while (i < SHOTS.length - 1 && tSmooth >= SHOTS[i + 1].t) i++;
  const cur = SHOTS[i];
  const next = SHOTS[i + 1];
  const segEnd = next ? next.t : END_T;
  const f = clamp01((tSmooth - cur.t) / (segEnd - cur.t));

  assignShot(A, cur);
  const hold = next ? HOLD : 1;
  const inHold = clamp01(f / hold);
  // Walk forward through the room; the final shot steps back out onto the terrace
  const walk = next ? smooth(inHold) * 0.5 : 0.5 - smooth(inHold) * 0.45;
  A.push.value = walk + (1 - ie) * 0.3;

  let turnAmt = 0;
  if (next && f > hold) {
    const k = (f - hold) / (1 - hold);
    assignShot(B, next);
    turnAmt = smooth(k);
    A.push.value += smooth(k) * 0.12; // keep walking while turning
    B.push.value = 0;
    material.uniforms.turnDir.value = cur.turn;
  }
  material.uniforms.turnAmt.value = turnAmt;

  // Head-bob: steps advance with scroll distance, and fade out when you stop
  const moved = Math.abs(tSmooth - prevT);
  prevT = tSmooth;
  stepPhase += moved * Math.PI * 2 * 7;
  bobAmt = lerp(bobAmt, reducedMotion ? 0 : clamp01((moved / Math.max(dt, 1e-3)) * 2.5), 0.08);
  material.uniforms.bob.value.set(
    Math.sin(stepPhase) * 0.006 * bobAmt,
    Math.abs(Math.sin(stepPhase)) * 0.012 * bobAmt - 0.006 * bobAmt,
    Math.sin(stepPhase) * 0.004 * bobAmt
  );

  pointer.sx = lerp(pointer.sx, reducedMotion ? 0 : pointer.x, 0.05);
  pointer.sy = lerp(pointer.sy, reducedMotion ? 0 : pointer.y, 0.05);
  material.uniforms.pointer.value.set(pointer.sx, pointer.sy);
  material.uniforms.time.value = t;

  const room = (turnAmt > 0.5 ? next : cur).room;
  if (room !== lastRoom) {
    lastRoom = room;
    roomName.textContent = room;
    roomNum.textContent = String(roomList.indexOf(room) + 1).padStart(2, "0");
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  material.uniforms.screenAspect.value = window.innerWidth / window.innerHeight;
  measure();
}
window.addEventListener("resize", onResize);
window.addEventListener("load", measure);
onResize();
tSmooth = prevT = sceneTime();
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
