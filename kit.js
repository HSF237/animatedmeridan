/* Shared helpers for the per-page 3D scenes. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { initUI } from "./ui.js";

export { THREE };
export const isMobile = window.matchMedia("(max-width: 760px)").matches;
export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const SNAP = new URLSearchParams(location.search).has("snap"); // exact camera for automated screenshots
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (t) => t * t * (3 - 2 * t);
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const range = (v, a, b) => clamp01((v - a) / (b - a));
let seed = 4242;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const rr = (a, b) => a + rnd() * (b - a);

/** Renderer, scene, camera, optional bloom, pointer and resize handling. */
export function createStage({ bg = 0x0b0c0f, fog = null, fov = 50, near = 0.1, far = 2000, bloom = null, exposure = 1, shadows = false, maxRatio = 2 } = {}) {
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const ratio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : maxRatio);
  renderer.setPixelRatio(ratio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.FogExp2(fog[0], fog[1]);
  const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
  scene.add(camera);

  let composer = null;
  let bloomPass = null;
  if (bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), bloom.strength, bloom.radius, bloom.threshold);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  });

  const listeners = [];
  const baseFov = fov;
  const stage = {
    canvas, renderer, scene, camera, pointer, composer,
    onResize: (fn) => listeners.push(fn),
    /** on wide screens, shift the 3D content to the right of the text column */
    shiftRight: (frac = 0.15) => {
      const apply = () => {
        if (window.innerWidth > 960) camera.setViewOffset(window.innerWidth, window.innerHeight, -window.innerWidth * frac, 0, window.innerWidth, window.innerHeight);
        else camera.setViewOffset(window.innerWidth, window.innerHeight, 0, window.innerHeight * 0.2, window.innerWidth, window.innerHeight); // phones: lift the scene above the text card
        camera.updateProjectionMatrix();
      };
      listeners.push(apply);
      apply();
    },
    render: () => (composer ? composer.render() : renderer.render(scene, camera)),
  };
  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = window.innerWidth < window.innerHeight ? baseFov * 1.35 : baseFov;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);
      bloomPass.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
    }
    listeners.forEach((fn) => fn());
  }
  window.addEventListener("resize", resize);
  resize();
  return stage;
}

/** Maps window scroll to "section units": integer = start of a [data-scene] section, fraction = progress through it. */
export function createScroll() {
  const sections = [...document.querySelectorAll("[data-scene]")];
  let tops = [];
  const measure = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    tops = sections.map((s) => Math.min(s.getBoundingClientRect().top + window.scrollY, max - 1));
    tops.push(max);
    for (let i = 1; i < tops.length; i++) tops[i] = Math.max(tops[i], tops[i - 1] + 1);
  };
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  measure();
  let smoothT = null;
  const raw = () => {
    const y = window.scrollY;
    for (let i = 0; i < tops.length - 1; i++) if (y < tops[i + 1]) return i + clamp01((y - tops[i]) / (tops[i + 1] - tops[i]));
    return tops.length - 1;
  };
  return {
    count: sections.length,
    raw,
    /** smoothed value; call once per frame */
    update(dt, speed = 1) {
      const target = raw();
      if (smoothT === null || SNAP) smoothT = target;
      else smoothT = lerp(smoothT, target, 1 - Math.pow(0.0005, dt * (reducedMotion ? 6 : speed)));
      return smoothT;
    },
  };
}

/** Bottom-left label (stage name + number). */
export function makeLabel() {
  const name = document.getElementById("roomName");
  const num = document.getElementById("roomNum");
  let last = "";
  return (text, index) => {
    if (text === last) return;
    last = text;
    if (name) name.textContent = text;
    if (num) num.textContent = String(index + 1).padStart(2, "0");
  };
}

/** Start the shared UI, and run `frame(dt, t)` every animation frame. */
export function run(frame, { ready = () => true, loaderMs = 1300 } = {}) {
  let started = false;
  initUI({ onStart: () => (started = true), loaderMs, isReady: ready });
  const clock = new THREE.Clock();
  (function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    frame(dt, clock.elapsedTime, started);
    requestAnimationFrame(tick);
  })();
}

/** Canvas-drawn text sprite for in-scene labels. */
export function textSprite(text, { color = "#9fe3ff", size = 64, font = "Manrope, system-ui, sans-serif", scale = 0.02 } = {}) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = `500 ${size}px ${font}`;
  const w = Math.ceil(ctx.measureText(text).width) + 24;
  c.width = w;
  c.height = size + 24;
  ctx.font = `500 ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 12, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false }));
  s.scale.set(w * scale, c.height * scale, 1);
  return s;
}

/** Drifting dust / particles. */
export function makeDust({ count = 800, size = 2, color = 0xffffff, box = [40, 20, 40], opacity = 0.6, additive = true } = {}) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) pos.set([(rnd() - 0.5) * box[0], rnd() * box[1], (rnd() - 0.5) * box[2]], i * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

/** Add a mesh with drafting-style edge lines. */
export function boxMesh(parent, mat, [x0, x1, y0, y1, z0, z1], edgeMat = null) {
  const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const m = new THREE.Mesh(geo, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true;
  if (edgeMat) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
  parent.add(m);
  return m;
}
