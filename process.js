/* PROCESS — site & construction. Survey scan and contour lines, massing options,
   a sun study, then a time-lapse build with crane and scaffolding, ending at dusk. */
import { THREE, createStage, createScroll, makeLabel, run, makeDust, lerp, clamp01, smooth, ease, range, isMobile, rnd, rr } from "./kit.js";

const stage = createStage({ bg: 0x141a23, fog: [0x141a23, 0.012], fov: 40, far: 500, bloom: { strength: 0.4, radius: 0.5, threshold: 0.85 }, exposure: 1.0, shadows: true });
const { scene, camera, renderer, pointer } = stage;
stage.shiftRight(0.15);
const scroll = createScroll();
const label = makeLabel();

const ORANGE = new THREE.Color(0xff8a3d);

/* ---------- lighting ---------- */
const hemi = new THREE.HemisphereLight(0xaab8d0, 0x1a1712, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc890, 0.3);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(2, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.2), fog: false }));
scene.add(sunDisc);

/* ---------- terrain with contour lines + survey scan ---------- */
const H = (x, z) => {
  const r = Math.hypot(x, z);
  const n = Math.sin(x * 0.11 + 1) * Math.cos(z * 0.09) * 1.3 + Math.sin(x * 0.05 + z * 0.07) * 2.2 + Math.sin(x * 0.23) * Math.sin(z * 0.19) * 0.35;
  return (n - z * 0.045) * smooth(clamp01((r - 14) / 10));
};
const SEG = isMobile ? 70 : 110;
const tg = new THREE.PlaneGeometry(110, 110, SEG, SEG);
tg.rotateX(-Math.PI / 2);
{
  const p = tg.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
  tg.computeVertexNormals();
}
const terrainMat = new THREE.MeshStandardMaterial({ color: 0x1d222b, roughness: 1 });
const tU = { uScan: { value: 0 }, uLine: { value: ORANGE }, uMix: { value: 1 } };
terrainMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, tU);
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vWP; uniform float uScan, uMix; uniform vec3 uLine;")
    .replace("#include <dithering_fragment>", `
      float r = length(vWP.xz);
      float c = abs(fract(vWP.y * 1.6) - 0.5);
      float contour = 1.0 - smoothstep(0.0, 0.05, c);
      vec2 g = abs(fract(vWP.xz / 4.0) - 0.5);
      float grid = 1.0 - smoothstep(0.0, 0.03, min(g.x, g.y));
      float inside = 1.0 - smoothstep(uScan - 2.0, uScan, r);
      float ring = smoothstep(uScan - 1.2, uScan, r) * (1.0 - smoothstep(uScan, uScan + 0.6, r));
      gl_FragColor.rgb += uLine * ((contour * 0.75 + grid * 0.3) * inside + ring * 2.2) * uMix;
      #include <dithering_fragment>`);
};
const terrain = new THREE.Mesh(tg, terrainMat);
terrain.receiveShadow = true;
scene.add(terrain);

// survey points
const PTS = [];
for (let x = -32; x <= 32; x += 4) for (let z = -32; z <= 32; z += 4) if (Math.hypot(x, z) < 34) PTS.push([x, z]);
const pointMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.2, 0.5) }), PTS.length);
scene.add(pointMesh);
const dummy = new THREE.Object3D();

// survey drone with scanning beam
const drone = new THREE.Group();
drone.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.9), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 })));
const rotors = [];
for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
  const r = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.02, 18), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.5 }));
  r.position.set(x, 0.15, z);
  rotors.push(r);
  drone.add(r);
}
const beam = new THREE.Mesh(new THREE.ConeGeometry(5, 9, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
beam.position.y = -4.6;
drone.add(beam);
scene.add(drone);

/* ---------- massing options ---------- */
const M_A = [[-8.5, 8.5, 0, 6.6, -5, 5]];
const M_B = [[-8.5, 8.5, 0, 3.4, -5.5, 5.5], [-2.5, 9.5, 3.4, 6.7, -4.5, 4.5]];
const M_C = [[-8.5, 8.5, 0, 3.4, -5, 0], [-8.5, -1.5, 0, 6.6, -5, 5.5], [-8.5, 4, 3.4, 6.6, 0, 5.5]];
const massing = [M_A, M_B, M_C].map((boxes) => {
  const g = new THREE.Group();
  const fillM = new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0, depthWrite: false });
  const lineM = new THREE.LineBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0 });
  for (const [x0, x1, y0, y1, z0, z1] of boxes) {
    const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    const m = new THREE.Mesh(geo, fillM);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineM));
    g.add(m);
  }
  scene.add(g);
  return { g, fillM, lineM };
});
// clay model of the chosen option (option B) for the sun study
const clayM = new THREE.MeshStandardMaterial({ color: 0xe6d8c2, roughness: 0.9, transparent: true, opacity: 0 });
const clay = new THREE.Group();
for (const [x0, x1, y0, y1, z0, z1] of M_B) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), clayM);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true;
  clay.add(m);
}
scene.add(clay);

/* ---------- the real building, built in stages ---------- */
const concrete = new THREE.MeshStandardMaterial({ color: 0x9a9892, roughness: 0.95 });
const stoneM = new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: 0.9 });
const roofM = new THREE.MeshStandardMaterial({ color: 0x2a2623, roughness: 0.55 });
const timberM = new THREE.MeshStandardMaterial({ color: 0xa87447, roughness: 0.6 });
const glassBase = new THREE.MeshPhysicalMaterial({ color: 0x9fc6d0, roughness: 0.05, transparent: true, opacity: 0, depthWrite: false, emissive: 0xffb060, emissiveIntensity: 0 });
const building = new THREE.Group();
scene.add(building);
const parts = [];
function part(mat, [x0, x1, y0, y1, z0, z1], mode, [s, e], fade = false) {
  const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const m = new THREE.Mesh(fade ? geo : geo, fade ? mat.clone() : mat);
  if (mode === "y") { geo.translate(0, (y1 - y0) / 2, 0); m.position.set((x0 + x1) / 2, y0, (z0 + z1) / 2); }
  else if (mode === "x") { geo.translate((x1 - x0) / 2, 0, 0); m.position.set(x0, (y0 + y1) / 2, (z0 + z1) / 2); }
  else m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = !fade;
  m.receiveShadow = true;
  building.add(m);
  parts.push({ m, mode, s, e, fade, base: fade ? mat.opacity || 1 : 1 });
  return m;
}
part(concrete, [-8.5, 8.5, -0.9, 0, -5.5, 5.5], "y", [0, 0.12]);
part(stoneM, [-8.5, -6, 0, 6.7, -2, 2], "y", [0.14, 0.34]);
for (const x of [-4.5, -1.5, 1.5, 4.5, 7.5]) for (const z of [-4.9, 4.9]) part(concrete, [x - 0.18, x + 0.18, 0, 3.2, z - 0.18, z + 0.18], "y", [0.1 + (x + 4.5) * 0.008, 0.3]);
part(concrete, [-8.5, 8.5, 3.2, 3.5, -5.5, 5.5], "x", [0.3, 0.44]);
for (const x of [0, 4, 8.6]) for (const z of [-4, 4]) part(concrete, [x - 0.16, x + 0.16, 3.5, 6.4, z - 0.16, z + 0.16], "y", [0.42, 0.56]);
part(concrete, [-2.5, 9.5, 6.4, 6.7, -4.5, 4.5], "x", [0.54, 0.66]);
part(roofM, [-9, 10, 6.7, 7.05, -6, 6], "x", [0.64, 0.76]);
part(timberM, [-9, 10, 6.62, 6.7, -6, 6], "fade", [0.68, 0.78], true);
part(glassBase, [-8, 8, 0.1, 3.2, 5.4, 5.6], "fade", [0.74, 0.9], true);
part(glassBase, [-2.5, 9.4, 3.5, 6.4, 4.4, 4.6], "fade", [0.78, 0.94], true);
part(glassBase, [-8, 8, 0.1, 3.2, -5.6, -5.4], "fade", [0.76, 0.92], true);
part(glassBase, [8.4, 8.6, 0.1, 3.2, -5, 5], "fade", [0.8, 0.95], true);
part(glassBase, [9.3, 9.5, 3.5, 6.4, -4, 4], "fade", [0.82, 0.96], true);
const glassParts = parts.filter((p) => p.fade && p.m.material.transparent && p.m.material.emissive);
// interior light panels, glowing at night
const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.8), transparent: true, opacity: 0 });
for (const [x0, x1, y0, y1, z0, z1] of [[-7, 7, 0.4, 3.0, -5.2, -5.15], [-2, 9, 3.7, 6.3, -4.2, -4.15]]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), glowM);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  building.add(m);
}
const lightA = new THREE.PointLight(0xffb870, 0, 22, 2);
lightA.position.set(0, 1.8, 0);
const lightB = new THREE.PointLight(0xffb870, 0, 22, 2);
lightB.position.set(4, 5.2, 0);
building.add(lightA, lightB);

// scaffolding
const scaf = [];
{
  const X0 = -10.2, X1 = 11.4, Z0 = -7.2, Z1 = 7.2;
  for (let x = X0; x <= X1 + 0.01; x += 3.6) for (const z of [Z0, Z1]) scaf.push(x, 0, z, x, 8, z);
  for (let z = Z0; z <= Z1 + 0.01; z += 3.6) for (const x of [X0, X1]) scaf.push(x, 0, z, x, 8, z);
  for (const y of [2.5, 5, 7.6]) scaf.push(X0, y, Z0, X1, y, Z0, X0, y, Z1, X1, y, Z1, X0, y, Z0, X0, y, Z1, X1, y, Z0, X1, y, Z1);
  for (let x = X0; x < X1 - 3; x += 7.2) scaf.push(x, 0, Z1, x + 3.6, 5, Z1, x + 3.6, 5, Z1, x + 7.2, 0, Z1);
}
const scafMat = new THREE.LineBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0 });
const scaffold = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(scaf, 3)), scafMat);
scene.add(scaffold);

// tower crane
const crane = new THREE.Group();
crane.position.set(-16, 0, -6);
scene.add(crane);
const craneMat = new THREE.LineBasicMaterial({ color: 0xff9a4d });
const solidOrange = new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.5 });
{
  const pts = [];
  const W = 0.9, HH = 19, N = 19;
  for (let j = 0; j < N; j++) {
    const y0 = (j / N) * HH, y1 = ((j + 1) / N) * HH;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push(a * W, y0, b * W, a * W, y1, b * W);
    pts.push(-W, y1, -W, W, y1, -W, W, y1, -W, W, y1, W, W, y1, W, -W, y1, W, -W, y1, W, -W, y1, -W);
    pts.push(-W, y0, -W, W, y1, -W, W, y0, W, -W, y1, W);
  }
  crane.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)), craneMat));
}
const jibGroup = new THREE.Group();
jibGroup.position.y = 19;
crane.add(jibGroup);
{
  const pts = [];
  const L = 23, BK = 7, N = 23;
  for (let j = -BK; j < L; j += 1) {
    pts.push(j, 0, -0.5, j + 1, 0, -0.5, j, 0, 0.5, j + 1, 0, 0.5, j, 0.9, 0, j + 1, 0.9, 0);
    pts.push(j, 0, -0.5, j, 0.9, 0, j, 0, 0.5, j, 0.9, 0, j, 0, -0.5, j, 0, 0.5);
    pts.push(j, 0.9, 0, j + 1, 0, -0.5, j, 0.9, 0, j + 1, 0, 0.5);
  }
  jibGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)), craneMat));
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), solidOrange);
  cab.position.set(-0.2, 0.5, 1.2);
  jibGroup.add(cab);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  cw.position.set(-BK + 1.2, -0.4, 0);
  jibGroup.add(cw);
  const apex = [];
  apex.push(0, 0.9, 0, 0, 4.2, 0, 0, 4.2, 0, L - 1, 0.9, 0, 0, 4.2, 0, -BK + 1, 0.9, 0);
  jibGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(apex, 3)), craneMat));
}
const trolley = new THREE.Group();
jibGroup.add(trolley);
trolley.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), solidOrange));
const ropeGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0)]);
const rope = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0xdddddd }));
trolley.add(rope);
const hook = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), solidOrange);
trolley.add(hook);
const load = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.0), concrete);
trolley.add(load);

/* ---------- landscape & pool that arrive at handover ---------- */
const landscape = [];
for (let i = 0; i < 26; i++) {
  const a = rnd() * Math.PI * 2, r = rr(11, 22);
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a2a }));
  trunk.position.y = 0.55;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(0.9, 1.5), 1), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rr(0.22, 0.3), 0.35, rr(0.2, 0.3)), roughness: 1, flatShading: true }));
  crown.position.y = 1.9;
  crown.castShadow = trunk.castShadow = true;
  g.add(trunk, crown);
  g.position.set(x, H(x, z), z);
  g.userData.k = rnd();
  scene.add(g);
  landscape.push(g);
}
const poolM = new THREE.MeshStandardMaterial({ color: 0x2bb5c4, emissive: 0x0a6a78, emissiveIntensity: 0.8, roughness: 0.1, transparent: true, opacity: 0 });
const pool = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 9), poolM);
pool.position.set(14.5, 0.03, 0);
scene.add(pool);
const deck = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 11), new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: 0.8, transparent: true, opacity: 0 }));
deck.position.set(14.5, 0.0, 0);
deck.receiveShadow = true;
scene.add(deck);
const dust = makeDust({ count: isMobile ? 300 : 700, size: 1.7, color: 0xffb070, box: [90, 22, 90], opacity: 0.45 });
scene.add(dust);

/* ---------- day/night keys ---------- */
const KEYS = [
  { t: 0, bg: 0x141a23, sun: 0.25, sunC: 0xb8c8e0, hemi: 0.6 },
  { t: 2.2, bg: 0x10141b, sun: 0.2, sunC: 0xb8c8e0, hemi: 0.5 },
  { t: 3.0, bg: 0x2f3648, sun: 1.5, sunC: 0xffc890, hemi: 0.8 },
  { t: 4.0, bg: 0x4a5566, sun: 1.9, sunC: 0xffe0bd, hemi: 0.95 },
  { t: 4.9, bg: 0x2a3140, sun: 1.4, sunC: 0xffb070, hemi: 0.7 },
  { t: 5.5, bg: 0x090c14, sun: 0.25, sunC: 0x8fa6d0, hemi: 0.35 },
  { t: 7, bg: 0x070a10, sun: 0.2, sunC: 0x8fa6d0, hemi: 0.3 },
];
const cA = new THREE.Color(), cB = new THREE.Color();
function key(t) {
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1], f = smooth(clamp01((t - a.t) / (b.t - a.t)));
  return { bg: cA.set(a.bg).lerp(cB.set(b.bg), f).clone(), sun: lerp(a.sun, b.sun, f), sunC: new THREE.Color(a.sunC).lerp(new THREE.Color(b.sunC), f), hemi: lerp(a.hemi, b.hemi, f) };
}

/* ---------- camera ---------- */
const K = [
  { pos: [30, 15, 40], look: [0, 2, 0] },
  { pos: [-32, 30, 30], look: [0, 0, 0] },
  { pos: [26, 12, 24], look: [0, 3, 0] },
  { pos: [-26, 9, 25], look: [0, 3, 0] },
  { pos: [24, 14, 26], look: [-2, 4, 0] },
  { pos: [-20, 7, 34], look: [3, 3, 0] },
  { pos: [34, 12, 44], look: [2, 3, 0] },
];
const posC = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
const lookC = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");
const cp = new THREE.Vector3(), cl = new THREE.Vector3();
const NAMES = ["Survey", "Listen", "Imagine", "Refine", "Build", "Handover", "First light"];

run((dt, time, started) => {
  const t = scroll.update(dt, 1.2);
  posC.getPoint(clamp01(t / (K.length - 1)), cp);
  lookC.getPoint(clamp01(t / (K.length - 1)), cl);
  pointer.sx += (pointer.x - pointer.sx) * 0.04;
  camera.position.set(cp.x + pointer.sx * 1.6, cp.y, cp.z);
  camera.lookAt(cl);

  // sky, light
  const k = key(t);
  scene.background.copy(k.bg);
  scene.fog.color.copy(k.bg);
  hemi.intensity = k.hemi;
  sun.intensity = k.sun;
  sun.color.copy(k.sunC);
  const day = range(t, 3.0, 4.95);
  const az = lerp(-1.1, 1.2, day); // sun crosses from east to west during Refine/Build
  const el = 0.25 + Math.sin(Math.PI * clamp01(range(t, 2.9, 5.0))) * 0.75;
  sun.position.set(Math.sin(az) * 60 * Math.cos(el), Math.sin(el) * 55 + 4, Math.cos(az) * 60 * Math.cos(el) - 10);
  sun.target.position.set(0, 0, 0);
  sunDisc.position.copy(sun.position).multiplyScalar(1.7);
  sunDisc.visible = t > 2.9 && t < 5.2;

  // survey scan (Listen)
  const scan = 60 * ease(range(t, 0.55, 1.9));
  tU.uScan.value = scan;
  tU.uMix.value = 1 - 0.85 * smooth(range(t, 2.9, 3.4));
  PTS.forEach(([x, z], i) => {
    const on = Math.hypot(x, z) < scan - 1 && t < 3.2;
    const sc = on ? ease(clamp01((scan - Math.hypot(x, z)) / 4)) * (1 - smooth(range(t, 2.2, 2.9))) : 0;
    dummy.position.set(x, H(x, z) + 0.2, z);
    dummy.scale.setScalar(Math.max(0.0001, sc));
    dummy.updateMatrix();
    pointMesh.setMatrixAt(i, dummy.matrix);
  });
  pointMesh.instanceMatrix.needsUpdate = true;
  const droneOn = smooth(range(t, 0.5, 0.9)) * (1 - smooth(range(t, 2.0, 2.5)));
  drone.visible = droneOn > 0.01;
  drone.scale.setScalar(droneOn);
  const da = time * 0.6;
  const dr = 8 + 20 * range(t, 0.5, 2.0);
  drone.position.set(Math.cos(da) * dr, 10 + Math.sin(time * 1.3) * 0.5, Math.sin(da) * dr);
  drone.rotation.y = -da;
  rotors.forEach((r, i) => (r.rotation.y = time * 40 * (i % 2 ? 1 : -1)));

  // Imagine: three massing options in turn; option B becomes the clay model
  const o = range(t, 1.95, 2.95) * 3;
  massing.forEach((m, i) => {
    const near = smooth(clamp01(1 - Math.abs(o - (i + 0.5)) * 1.4)) * smooth(range(t, 1.9, 2.1));
    const vis = i === 1 ? Math.max(near, smooth(range(t, 2.85, 3.1))) : near * (1 - smooth(range(t, 2.9, 3.1)));
    const fadeOut = 1 - smooth(range(t, 3.3, 3.8));
    m.lineM.opacity = vis * fadeOut * 0.95;
    m.fillM.opacity = vis * fadeOut * 0.16;
    m.g.rotation.y = Math.sin(time * 0.4 + i) * 0.03;
  });
  clayM.opacity = smooth(range(t, 3.0, 3.35)) * (1 - smooth(range(t, 4.05, 4.5)));

  // Build: parts rise in sequence; scaffold and crane appear with it
  const p = range(t, 4.0, 4.95);
  parts.forEach((q) => {
    const kk = ease(range(p, q.s, q.e));
    if (q.mode === "y") q.m.scale.y = Math.max(0.0001, kk);
    else if (q.mode === "x") q.m.scale.x = Math.max(0.0001, kk);
    else q.m.material.opacity = kk * (q.m.material.transparent && q.m.material.emissive ? 0.4 : 1);
    q.m.visible = kk > 0.001;
  });
  const night = smooth(range(t, 5.05, 5.6));
  glassParts.forEach((q) => (q.m.material.emissiveIntensity = night * 1.6));
  glowM.opacity = night * 0.9;
  lightA.intensity = night * 60;
  lightB.intensity = night * 60;
  const scafK = smooth(range(t, 3.9, 4.3)) * (1 - smooth(range(t, 4.85, 5.15)));
  scafMat.opacity = scafK * 0.7;
  scaffold.scale.y = 0.05 + 0.95 * ease(range(p, 0.05, 0.6));
  const craneK = smooth(range(t, 3.85, 4.2)) * (1 - smooth(range(t, 4.95, 5.3)));
  crane.visible = craneK > 0.01;
  crane.scale.set(1, Math.max(0.01, craneK), 1);
  jibGroup.rotation.y = 0.9 + Math.sin(time * 0.35) * 0.8 + p * 1.2;
  const tr = 9 + Math.sin(time * 0.7) * 5;
  trolley.position.set(tr, -0.4, 0);
  const drop = 4.5 + Math.sin(time * 0.9) * 2.5;
  rope.scale.y = drop;
  hook.position.y = -drop - 0.3;
  load.position.y = -drop - 0.8;
  load.visible = p < 0.85;
  // Handover: pool, deck and landscape settle in, lights on
  const hand = smooth(range(t, 5.0, 5.6));
  poolM.opacity = hand * 0.85;
  deck.material.opacity = hand;
  landscape.forEach((g) => {
    const s = ease(clamp01(range(t, 5.0, 5.8) * 1.8 - g.userData.k * 0.8));
    g.scale.setScalar(Math.max(0.001, s));
  });
  dust.rotation.y = time * 0.01;
  dust.material.opacity = 0.2 + night * 0.5;

  const idx = t < 0.55 ? 0 : Math.min(6, Math.floor(t + 0.3));
  if (idx === 3) {
    const hr = lerp(7, 19, range(t, 3.0, 4.0));
    label(`Refine · ${String(Math.floor(hr)).padStart(2, "0")}:${String(Math.floor((hr % 1) * 60 / 10) * 10).padStart(2, "0")}`, 3);
  } else label(NAMES[idx], idx);
  stage.render();
});
