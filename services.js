/* SERVICES — clay model. A light studio scene: the villa is pulled apart into layers
   (site, structure, envelope, interior, systems); each service lights up its own layer. */
import { THREE, createStage, createScroll, makeLabel, run, lerp, clamp01, smooth, ease, range, isMobile, rnd, rr } from "./kit.js";

const BG = 0xece6da;
const stage = createStage({ bg: BG, fog: [BG, 0.006], fov: 34, far: 400, exposure: 1.0, shadows: true });
const { scene, camera, renderer, pointer } = stage;
stage.shiftRight(0.15);
const scroll = createScroll();
const label = makeLabel();

// lighting: warm key with soft shadows, cool fill
scene.add(new THREE.HemisphereLight(0xfff6ea, 0xb8aa96, 0.95));
const sunL = new THREE.DirectionalLight(0xfff0dc, 2.4);
sunL.position.set(14, 26, 18);
sunL.castShadow = true;
sunL.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
Object.assign(sunL.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
sunL.shadow.bias = -0.0004;
sunL.shadow.radius = 5;
scene.add(sunL);
const fill = new THREE.DirectionalLight(0xbfd6e6, 0.6);
fill.position.set(-16, 8, -10);
scene.add(fill);
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.16 }));
catcher.rotation.x = -Math.PI / 2;
catcher.position.y = -0.8;
catcher.receiveShadow = true;
scene.add(catcher);

const ACCENT = new THREE.Color(0xc2603a);
const INK = new THREE.Color(0x2a241d);

// one material set + edge material per layer, so a whole layer can fade / highlight
function layerMats() {
  const clay = new THREE.MeshStandardMaterial({ color: 0xf7f1e6, roughness: 0.92, transparent: true });
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xd8ccb8, roughness: 0.95, transparent: true });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x8fc4cc, roughness: 0.1, transparent: true, opacity: 0.4, depthWrite: false });
  const dark = new THREE.MeshStandardMaterial({ color: 0x27384f, roughness: 0.35, metalness: 0.4, transparent: true });
  const warm = new THREE.MeshStandardMaterial({ color: 0xc78a5a, roughness: 0.7, transparent: true });
  const green = new THREE.MeshStandardMaterial({ color: 0x7fa06a, roughness: 1, transparent: true });
  const water = new THREE.MeshStandardMaterial({ color: 0x59b8c8, roughness: 0.15, transparent: true });
  const edge = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.4 });
  const all = [clay, stoneM, glassM, dark, warm, green, water];
  all.forEach((m) => (m.userData.base = m.opacity));
  return { clay, stone: stoneM, glass: glassM, dark, warm, green, water, edge, all };
}

const S = 0.26; // metres → scene units
const layers = [];
function makeLayer(name, order) {
  const g = new THREE.Group();
  scene.add(g);
  const L = { name, order, group: g, mats: layerMats(), y: 0, opacity: 1, hl: 0 };
  layers.push(L);
  return L;
}
function add(L, mat, [x0, x1, y0, y1, z0, z1], lines = true) {
  const geo = new THREE.BoxGeometry((x1 - x0) * S, (y1 - y0) * S, (z1 - z0) * S);
  const m = new THREE.Mesh(geo, L.mats[mat]);
  m.position.set(((x0 + x1) / 2) * S, ((y0 + y1) / 2) * S, ((z0 + z1) / 2 + 7) * S);
  m.castShadow = mat !== "glass";
  m.receiveShadow = true;
  if (lines) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), L.mats.edge));
  L.group.add(m);
  return m;
}

// ---- L0 SITE: ground plate, terrace, pool, trees (+ urban context that appears for Urban Planning)
const site = makeLayer("Site", 0);
add(site, "stone", [-24, 24, -1.2, 0, -30, 6]);
add(site, "clay", [-22, 22, 0, 0.3, -28, -14]);
add(site, "water", [-13.2, 9, 0.3, 0.45, -26.6, -18.4], false);
add(site, "clay", [-3.2, 3.2, 0, 0.2, 0, 4.2]);
for (let i = 0; i < 16; i++) {
  const t = new THREE.Mesh(new THREE.SphereGeometry(rr(0.9, 1.5) * S, 12, 10), site.mats.green);
  t.position.set(rr(-22, 22) * S, 1.4 * S, (rr(-30, 4) + 7) * S);
  if (Math.abs(t.position.x) < 8 * S && t.position.z < 7 * S && t.position.z > -7 * S) t.position.x += 12 * S;
  t.castShadow = true;
  site.group.add(t);
}
const context = new THREE.Group();
site.group.add(context);
const contextMats = site.mats;
for (let i = 0; i < 46; i++) {
  const ring = 30 + rnd() * 34, a = rnd() * Math.PI * 2;
  const w = rr(2.4, 5.5), d = rr(2.4, 5.5), h = rr(2, 9) * (1 - ring / 90);
  const geo = new THREE.BoxGeometry(w * S, h * S, d * S);
  const b = new THREE.Mesh(geo, contextMats.clay);
  b.position.set(Math.cos(a) * ring * S * 1.3, (h / 2 - 1.2) * S, (Math.sin(a) * ring * 0.9 - 6 + 7) * S);
  b.castShadow = b.receiveShadow = true;
  b.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), contextMats.edge));
  b.userData.k = rnd();
  context.add(b);
}
// streets: thin lines on the site plate for planning
const roads = [];
for (let i = -3; i <= 3; i++) roads.push(new THREE.Vector3(i * 8 * S, 0.02, -30 * S + 7 * S), new THREE.Vector3(i * 8 * S, 0.02, 6 * S + 7 * S));

// ---- L1 STRUCTURE: slabs, columns, stone cores
const struct = makeLayer("Structure", 2);
for (const [x0, x1, z0, z1, lv] of [[-7, 7, -14, 0, 0], [-20.4, -7.4, -14, -1, 0], [7.4, 20.4, -14, -1, 0]]) {
  add(struct, "clay", [x0, x1, 0, 0.35, z0, z1]);
  add(struct, "clay", [x0, x1, lv === 0 && x0 === -7 ? 7.6 : 3.7, lv === 0 && x0 === -7 ? 8.1 : 4.05, z0, z1]);
}
add(struct, "clay", [-20.7, -7.1, 7.2, 7.7, -18.2, 0.4]);
add(struct, "clay", [7.1, 20.7, 7.2, 7.7, -18.2, 0.4]);
add(struct, "clay", [-7.6, 7.6, 7.6, 8.1, -16, 2.2]);
add(struct, "stone", [-7.2, -4.2, 0, 7.6, -0.9, 0]);
add(struct, "stone", [4.2, 7.2, 0, 7.6, -0.9, 0]);
for (const xs of [[-20, -14, -8], [8, 14, 20]]) for (const x of xs) for (const z of [-13.5, -8, -1.5]) add(struct, "stone", [x - 0.25, x + 0.25, 0.35, 7.2, z - 0.25, z + 0.25]);
for (const x of [-6, -2, 2, 6]) for (const z of [-13.5, -7, -1]) add(struct, "stone", [x - 0.25, x + 0.25, 0.35, 7.6, z - 0.25, z + 0.25]);

// ---- L2 ENVELOPE: glazing, fins (the parametric façade lives here)
const env = makeLayer("Envelope", 3);
add(env, "glass", [-4.2, 4.2, 0.35, 7.6, -0.1, 0.1], false);
add(env, "glass", [-7, 7, 0.35, 7.6, -14.1, -13.9], false);
add(env, "glass", [-20.4, -7.4, 0.35, 3.7, -1.1, -0.9], false);
add(env, "glass", [7.4, 20.4, 0.35, 3.6, -1.1, -0.9], false);
add(env, "glass", [-20.4, -7.4, 4.05, 7.2, -1.1, -0.9], false);
add(env, "glass", [7.4, 20.4, 4.05, 7.0, -1.1, -0.9], false);
add(env, "stone", [-20.6, -20.2, 0.35, 7.2, -14, -1]);
add(env, "stone", [20.2, 20.6, 0.35, 7.2, -14, -1]);
const fins = [];
for (let i = 0; i < 36; i++) {
  const x = 7.8 + i * 0.35;
  const f = add(env, "dark", [x - 0.05, x + 0.05, 4.05, 7.1, -0.9 - 0.7, -0.9], false);
  f.userData.x = x;
  fins.push(f);
}

// ---- L3 INTERIOR: furniture blocks
const inter = makeLayer("Interior", 1);
add(inter, "warm", [-6, 0, 0.35, 1.0, -12.2, -10.6]); // sofa
add(inter, "warm", [-6, -5, 0.35, 1.0, -10.6, -7.8]);
add(inter, "stone", [-3.6, -1.4, 0.35, 0.8, -9.4, -8.0]); // coffee table
add(inter, "clay", [-16, -11, 0.35, 1.3, -6.8, -5.0]); // island
add(inter, "clay", [-17.5, -12.5, 0.35, 1.1, -12.4, -10.8]); // dining
add(inter, "warm", [9, 11.4, 3.7, 4.5, -9.2, -6.8]); // bed
add(inter, "stone", [7.6, 8.2, 3.7, 5.6, -10.5, -5.5]);
add(inter, "clay", [12.5, 17, 3.7, 4.3, -11, -6.5]); // spa pool
add(inter, "water", [12.7, 16.8, 4.3, 4.45, -10.8, -6.7], false);
const chand = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * S, 0.6 * S, 2.2 * S, 24, 1, true), inter.mats.glass);
chand.position.set(-0.7 * S, 6.4 * S, -2.2 * S + 7 * S);
inter.group.add(chand);
for (const [x, z] of [[-9, -12], [4, -3], [17, -4]]) {
  const t = new THREE.Mesh(new THREE.SphereGeometry(0.9 * S, 12, 10), inter.mats.green);
  t.position.set(x * S, 1.5 * S, (z + 7) * S);
  t.castShadow = true;
  inter.group.add(t);
}

// ---- L4 SYSTEMS: roof solar array, sun path, pipes
const sysL = makeLayer("Systems", 4);
const panels = [];
for (let r = 0; r < 5; r++)
  for (let c = 0; c < 9; c++) {
    const p = add(sysL, "dark", [-6.8 + c * 1.5, -5.5 + c * 1.5, 8.1, 8.3, -14.5 + r * 2.4, -12.7 + r * 2.4], false);
    p.rotation.x = -0.28;
    p.userData.r = r;
    panels.push(p);
  }
for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
  const p = add(sysL, "dark", [s * (10 + i * 2.6) - 1.1, s * (10 + i * 2.6) + 1.1, 7.7, 7.9, -16.5, -12], false);
  p.rotation.x = -0.28;
}
const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * S, 1.2 * S, 3 * S, 20), sysL.mats.clay);
tank.position.set(-2 * S, 9.6 * S, -5 * S + 7 * S);
tank.castShadow = true;
sysL.group.add(tank);
const pipePts = [[-2, 8.1, -5], [-2, 6, -5], [-12, 6, -5], [-12, 0.4, -5], [-12, 0.4, -20]].map(([x, y, z]) => new THREE.Vector3(x * S, y * S, (z + 7) * S));
const pipe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pipePts, false, "catmullrom", 0.02), 60, 0.18 * S, 8, false), new THREE.MeshStandardMaterial({ color: 0x3d6f7a, roughness: 0.4, transparent: true }));
sysL.mats.all.push(pipe.material);
pipe.material.userData.base = 1;
sysL.group.add(pipe);
const sunArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 60 }, (_, i) => new THREE.Vector3(Math.cos((i / 59) * Math.PI) * -30 * S, Math.sin((i / 59) * Math.PI) * 16 * S + 11 * S, -3 * S))), new THREE.LineDashedMaterial({ color: 0xc2603a, dashSize: 0.5, gapSize: 0.3, transparent: true, opacity: 0 }));
sunArc.computeLineDistances();
sysL.group.add(sunArc);
const sunBall = new THREE.Mesh(new THREE.SphereGeometry(0.9 * S, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0 }));
sysL.group.add(sunBall);

// street grid overlay on the site plate
const roadLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(roads), new THREE.LineBasicMaterial({ color: 0xc2603a, transparent: true, opacity: 0 }));
site.group.add(roadLines);

// service ↔ layer: 1 Architecture→structure, 2 Interior, 3 Urban→site, 4 Computational→envelope, 5 Sustainability→systems
const FOCUS = [null, struct, inter, site, env, sysL];
const NAMES = ["Assembled", "Architecture", "Interior Design", "Urban Planning", "Computational Design", "Sustainability", "Overview"];
// camera keyframes are relative to the focused layer's height
const K = [
  { pos: [14, 7, 25], look: [0, 1.6, -1] },
  { pos: [-13, 6.5, 19], look: [0, 1.2, -1] },
  { pos: [10, 5.5, 18], look: [0, 1.0, -1] },
  { pos: [15, 10, 15], look: [0, 0.6, -1] },
  { pos: [-4, 4.5, 19], look: [0, 1.4, -1] },
  { pos: [10, 9, -14], look: [0, 1.4, -1] },
  { pos: [16, 10, 25], look: [0, 3.2, -1] },
];
const posC = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
const lookC = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");
const cp = new THREE.Vector3(), cl = new THREE.Vector3();
const GAP = 2.7;
let focusY = 0;

run((dt, time) => {
  const t = scroll.update(dt, 1.2);
  posC.getPoint(clamp01(t / (K.length - 1)), cp);
  lookC.getPoint(clamp01(t / (K.length - 1)), cl);
  pointer.sx += (pointer.x - pointer.sx) * 0.04;
  pointer.sy += (pointer.y - pointer.sy) * 0.04;

  // (camera is placed below, once we know which layer is in focus)
  // explode from the hero into the layered view, and close again for the closing section
  const ex = smooth(range(t, 0.3, 1.1)) * (1 - smooth(range(t, 5.75, 6.4))) * 0.92 + 0.08 * smooth(range(t, 0.3, 1.1));
  const focusIdx = t < 0.95 || t > 5.9 ? -1 : Math.min(5, Math.floor(t + 0.05));
  layers.forEach((L, i) => {
    const targetY = L.order * GAP * ex;
    L.y = lerp(L.y, targetY, 0.2);
    L.group.position.y = L.y;
    const focus = FOCUS[focusIdx] === L;
    const targetOp = focusIdx < 0 ? 1 : focus ? 1 : 0.16;
    L.opacity = lerp(L.opacity, targetOp, 0.12);
    L.hl = lerp(L.hl, focus ? 1 : 0, 0.12);
    L.mats.all.forEach((m) => {
      m.opacity = (m.userData.base ?? 1) * L.opacity;
      m.depthWrite = m.opacity > 0.9 && m !== L.mats.glass;
    });
    L.mats.edge.opacity = 0.4 * L.opacity;
    L.mats.edge.color.copy(INK).lerp(ACCENT, L.hl);
  });
  const focusTarget = focusIdx < 0 ? 0 : FOCUS[focusIdx].order * GAP * ex;
  focusY = lerp(focusY, focusTarget, 1 - Math.pow(0.003, dt));
  camera.position.set(cp.x + pointer.sx * 1.2, cp.y + focusY + pointer.sy * 0.6, cp.z);
  camera.lookAt(cl.x, cl.y + focusY, cl.z);
  context.visible = true;
  const urban = focusIdx === 3 ? 1 : 0;
  context.children.forEach((b) => {
    const k = ease(clamp01(range(t, 3.0, 3.6) * 1.6 - b.userData.k * 0.6));
    b.scale.y = Math.max(0.001, k);
    b.position.y = (b.geometry.parameters.height / 2 - 1.2 * S) * k * 1 + (-1.2 * S) * 0 - (1 - k) * 0.0;
    b.position.y = -1.2 * S + (b.geometry.parameters.height / 2) * k;
  });
  roadLines.material.opacity = smooth(range(t, 3.0, 3.6)) * (1 - smooth(range(t, 4, 4.4))) * 0.9;
  // parametric façade: fins sway in a travelling wave while Computational Design is in focus
  const wave = smooth(range(t, 3.9, 4.4)) * (1 - smooth(range(t, 5, 5.3)));
  fins.forEach((f) => {
    f.rotation.y = Math.sin(f.userData.x * 0.5 - time * 1.6) * 0.9 * wave;
    f.scale.z = 1 + Math.sin(f.userData.x * 0.5 - time * 1.6 + 1) * 0.7 * wave;
  });
  // sustainability: solar panels tilt to the sun, sun crosses the sky
  const sus = smooth(range(t, 4.9, 5.4)) * (1 - smooth(range(t, 5.8, 6.2)));
  sunArc.material.opacity = sus * 0.9;
  sunBall.material.opacity = sus;
  const a = clamp01(range(t, 5.0, 5.9)) * Math.PI;
  sunBall.position.set(Math.cos(a) * -30 * S, Math.sin(a) * 16 * S + 11 * S, -3 * S);
  panels.forEach((p) => (p.rotation.x = -0.28 - Math.sin(a) * 0.15 * sus));

  const idx = t < 0.95 ? 0 : t > 5.95 ? 6 : Math.min(5, Math.floor(t + 0.05));
  label(NAMES[idx], idx);
  stage.render();
});
