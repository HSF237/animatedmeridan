/* STUDIO — blueprint. The villa draws itself as line-work on a drafting sheet, a scan plane
   makes it solid, dimensions appear, and a sun path arcs overhead. */
import { THREE, createStage, createScroll, makeLabel, run, textSprite, makeDust, lerp, clamp01, smooth, ease, range, isMobile, rnd } from "./kit.js";

const stage = createStage({ bg: 0x061426, fog: [0x061426, 0.0055], fov: 42, far: 900, bloom: { strength: 0.55, radius: 0.55, threshold: 0.15 }, exposure: 1.1 });
const { scene, camera, renderer, pointer } = stage;
renderer.localClippingEnabled = true;
stage.shiftRight(0.14);
const scroll = createScroll();
const label = makeLabel();

const CYAN = new THREE.Color(0x4fd1ff);
const PALE = new THREE.Color(0xd6f4ff);

// Massing of the villa, in metres: [x0, x1, y0, y1, z0, z1]
const BOXES = [
  [-7, 7, 0, 7.6, -14, 0], [-20.4, -7.4, 0, 3.8, -14, -1], [-20.4, -7.4, 3.8, 7.2, -14, -1], [-20.4, -7.4, 3.8, 4.2, -17.6, -14],
  [7.4, 20.4, 0, 3.6, -14, -1], [7.4, 20.4, 3.6, 7.2, -14, -1], [7.4, 20.4, 3.6, 4.0, -17.6, -14],
  [-7.6, 7.6, 7.6, 8.1, -16, 2.2], [-20.7, -7.1, 7.2, 7.7, -18.2, 0.4], [7.1, 20.7, 7.2, 7.7, -18.2, 0.4],
  [-22, 22, -0.3, 0, -28, -14], [-7.2, -4.2, 0, 7.6, -0.9, 0], [4.2, 7.2, 0, 7.6, -0.9, 0],
  [-13.2, 9, -1.6, -1.4, -26.6, -18.4],
];
for (let i = 0; i < 7; i++) BOXES.push([-3.2, 3.2, -1.2, -1.2 + (i + 1) * 0.171, 3.6 - i * 0.6, 4.2 - i * 0.6]);

const house = new THREE.Group();
house.position.set(0, 0, 7);
scene.add(house);

// --- line work, ordered bottom-up so it draws like a hand drafting
const pos = [], tt = [];
const addLine = (ax, ay, az, bx, by, bz, key) => {
  pos.push(ax, ay, az, bx, by, bz);
  tt.push(key, key + 0.012);
};
for (const [x0, x1, y0, y1, z0, z1] of BOXES) {
  const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
  eg.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const p = eg.attributes.position;
  for (let i = 0; i < p.count; i += 2) {
    const my = (p.getY(i) + p.getY(i + 1)) / 2, mx = (p.getX(i) + p.getX(i + 1)) / 2;
    const key = clamp01((my + 1.6) / 10.4) * 0.72 + (Math.abs(mx) / 24) * 0.22 + rnd() * 0.04;
    addLine(p.getX(i), p.getY(i), p.getZ(i), p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1), key);
  }
}
// glazing mullions on the pavilion, wings and rear wall
for (let x = -4.2; x <= 4.21; x += 1.4) addLine(x, 0, 0.05, x, 7.6, 0.05, 0.45 + Math.abs(x) * 0.01);
for (let x = -7; x <= 7.01; x += 2.33) addLine(x, 0, -14, x, 7.6, -14, 0.5);
for (const y of [3.2, 6.0]) { addLine(-4.2, y, 0.05, 4.2, y, 0.05, 0.5); addLine(-7, y, -14, 7, y, -14, 0.55); }
for (let x = -20; x < -7.5; x += 1.3) addLine(x, 0, -14, x, 3.8, -14, 0.4);
for (let x = 7.8; x < 20.4; x += 1.3) addLine(x, 0, -14, x, 3.6, -14, 0.4);
// terrace paving and pool water lines
for (let x = -22; x <= 22.01; x += 2) addLine(x, 0.01, -28, x, 0.01, -14, 0.08 + Math.abs(x) * 0.004);
for (let z = -28; z <= -14.01; z += 2) addLine(-22, 0.01, z, 22, 0.01, z, 0.1);
for (let i = 0; i < 12; i++) { const z = -18.4 - i * 0.68; addLine(-13.2, -0.05, z, 9, -0.05, z, 0.2); }
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
lineGeo.setAttribute("aT", new THREE.Float32BufferAttribute(tt, 1));
const lineMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uProg: { value: 0 }, uColor: { value: CYAN }, uHead: { value: PALE }, uAlpha: { value: 1 } },
  vertexShader: "attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `varying float vT; uniform float uProg, uAlpha; uniform vec3 uColor, uHead;
    void main(){ if (vT > uProg) discard; float head = smoothstep(uProg - 0.05, uProg, vT); gl_FragColor = vec4(mix(uColor, uHead, head), uAlpha * (0.75 + 0.6 * head)); }`,
});
const lines = new THREE.LineSegments(lineGeo, lineMat);
lines.frustumCulled = false;
house.add(lines);

// --- faces that solidify behind a sweeping scan plane
const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -30);
const faceMat = new THREE.MeshBasicMaterial({ color: 0x1f86c8, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: [clip], blending: THREE.AdditiveBlending });
for (const [x0, x1, y0, y1, z0, z1] of BOXES.slice(0, 13)) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), faceMat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  house.add(m);
}
const scanFrame = new THREE.Group();
scanFrame.add(new THREE.Mesh(new THREE.PlaneGeometry(36, 12), new THREE.MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })));
scanFrame.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-18, -6, 0], [18, -6, 0], [18, 6, 0], [-18, 6, 0]].map((p) => new THREE.Vector3(...p))), new THREE.LineBasicMaterial({ color: 0xbff0ff })));
scanFrame.rotation.y = Math.PI / 2;
scanFrame.position.y = 4;
scanFrame.position.z = -14;
house.add(scanFrame);

// --- dimension lines
const dimMat = new THREE.LineBasicMaterial({ color: 0x9fe3ff, transparent: true, opacity: 0 });
const dims = new THREE.Group();
house.add(dims);
const sprites = [];
function dimension(a, b, off, text) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), O = new THREE.Vector3(...off);
  const a2 = A.clone().add(O), b2 = B.clone().add(O);
  const g = [A, a2.clone().add(O.clone().normalize().multiplyScalar(0.6)), B, b2.clone().add(O.clone().normalize().multiplyScalar(0.6)), a2, b2];
  const dir = B.clone().sub(A).normalize();
  const tick = new THREE.Vector3().crossVectors(dir, O.clone().normalize()).add(O.clone().normalize()).multiplyScalar(0.7);
  g.push(a2.clone().sub(tick), a2.clone().add(tick), b2.clone().sub(tick), b2.clone().add(tick));
  dims.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(g), dimMat));
  const sp = textSprite(text, { color: "#bff0ff", size: 56, scale: 0.014 });
  sp.position.copy(a2.clone().add(b2).multiplyScalar(0.5)).add(O.clone().normalize().multiplyScalar(1.6));
  sp.material.opacity = 0;
  sprites.push(sp);
  dims.add(sp);
}
dimension([-20.7, 0, 0.4], [20.7, 0, 0.4], [0, 0, 4], "41.4 m");
dimension([22, 0, 0], [22, 8.1, 0], [3, 0, 0], "8.1 m");
dimension([-22, 0, 0], [-22, 0, -28], [-3, 0, 0], "28.0 m");
dimension([9, -1.6, -18.4], [9, -1.6, -26.6], [3.5, 0, 0], "pool 8.2 m");

// --- drafting sheet: grid, compass ring, north arrow
const grid = new THREE.GridHelper(400, 200, 0x1b6fa3, 0x0d3a5e);
grid.position.y = -1.7;
grid.material.transparent = true;
grid.material.opacity = 0.45;
scene.add(grid);
const compass = new THREE.Group();
compass.position.set(0, -1.65, -7);
scene.add(compass);
const ringMat = new THREE.LineBasicMaterial({ color: 0x3aa8de, transparent: true, opacity: 0.6 });
for (const r of [62, 66, 78]) {
  const pts = [];
  for (let i = 0; i <= 128; i++) pts.push(new THREE.Vector3(Math.cos((i / 128) * Math.PI * 2) * r, 0, Math.sin((i / 128) * Math.PI * 2) * r));
  compass.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
}
const ticks = [];
for (let d = 0; d < 360; d += 5) {
  const a = (d * Math.PI) / 180, l = d % 30 === 0 ? 4 : 1.6;
  ticks.push(new THREE.Vector3(Math.cos(a) * 66, 0, Math.sin(a) * 66), new THREE.Vector3(Math.cos(a) * (66 + l), 0, Math.sin(a) * (66 + l)));
}
compass.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), ringMat));
for (const [txt, x, z] of [["N", 0, -86], ["E", 86, 0], ["S", 0, 86], ["W", -86, 0]]) {
  const sp = textSprite(txt, { color: "#7fd8ff", size: 96, scale: 0.05 });
  sp.position.set(x, 0, z);
  compass.add(sp);
}

// --- sun path with hour marks
const sunGroup = new THREE.Group();
sunGroup.position.set(0, 0, -7);
scene.add(sunGroup);
const arcPts = [];
for (let i = 0; i <= 80; i++) {
  const a = (i / 80) * Math.PI;
  arcPts.push(new THREE.Vector3(Math.cos(a) * -60, Math.sin(a) * 40, -Math.sin(a) * 22));
}
const arcMat = new THREE.LineDashedMaterial({ color: 0xffd58a, dashSize: 1.4, gapSize: 0.9, transparent: true, opacity: 0 });
const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), arcMat);
arc.computeLineDistances();
sunGroup.add(arc);
const sunMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.1), transparent: true, opacity: 0 });
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), sunMat);
sunGroup.add(sun);
const rayMat = new THREE.LineBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0 });
const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)]), rayMat);
sunGroup.add(ray);
const hourSprites = ["06:00", "09:00", "12:00", "15:00", "18:00"].map((h, i) => {
  const a = (i / 4) * Math.PI;
  const sp = textSprite(h, { color: "#ffe2ac", size: 56, scale: 0.014 });
  sp.position.set(Math.cos(a) * -60, Math.sin(a) * 40 + 3, -Math.sin(a) * 22);
  sp.material.opacity = 0;
  sunGroup.add(sp);
  return sp;
});

const dust = makeDust({ count: isMobile ? 400 : 900, size: 1.6, color: 0x7fd8ff, box: [160, 60, 160], opacity: 0.5 });
scene.add(dust);

// --- camera path (section units 0..5)
const K = [
  { pos: [44, 22, 78], look: [0, 4, -5] },
  { pos: [-52, 26, 62], look: [0, 4, -5] },
  { pos: [2, 112, 26], look: [0, 0, -7] },
  { pos: [-88, 12, -6], look: [0, 4, -7] },
  { pos: [34, 34, -78], look: [0, 3, -7] },
  { pos: [78, 52, 66], look: [0, 0, -7] },
];
const posC = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
const lookC = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");
const cp = new THREE.Vector3(), cl = new THREE.Vector3();
const NAMES = ["Massing", "Elevation", "Plan", "Section", "Sun path", "Model"];

let introT = 0;
run((dt, time, started) => {
  if (started) introT = Math.min(1, introT + dt / 5);
  const t = scroll.update(dt);
  posC.getPoint(clamp01(t / (K.length - 1)), cp);
  lookC.getPoint(clamp01(t / (K.length - 1)), cl);
  pointer.sx += (pointer.x - pointer.sx) * 0.04;
  pointer.sy += (pointer.y - pointer.sy) * 0.04;
  camera.position.set(cp.x + pointer.sx * 3, cp.y + pointer.sy * 1.5, cp.z);
  camera.lookAt(cl);

  lineMat.uniforms.uProg.value = Math.max(ease(range(t, 0.04, 1.45)) * 1.1, ease(introT) * 0.62);
  const solid = range(t, 1.6, 2.7);
  clip.constant = lerp(-30, 30, ease(solid));
  scanFrame.position.x = lerp(-30, 30, ease(solid));
  scanFrame.visible = solid > 0.001 && solid < 0.999;
  dimMat.opacity = smooth(range(t, 2.0, 2.6)) * (1 - smooth(range(t, 4.4, 4.9))) * 0.9;
  sprites.forEach((s) => (s.material.opacity = dimMat.opacity));
  const sunP = smooth(range(t, 3.0, 3.6)) * (1 - smooth(range(t, 5, 5.5)));
  arcMat.opacity = sunP * 0.8;
  sunMat.opacity = sunP;
  rayMat.opacity = sunP * 0.5;
  hourSprites.forEach((s) => (s.material.opacity = sunP));
  const s = clamp01(range(t, 3.4, 4.7) * 0.9 + 0.05);
  const a = s * Math.PI;
  sun.position.set(Math.cos(a) * -60, Math.sin(a) * 40, -Math.sin(a) * 22);
  const g = ray.geometry.attributes.position;
  g.setXYZ(1, -sun.position.x, -sun.position.y, -sun.position.z);
  g.needsUpdate = true;
  ray.position.copy(sun.position);
  compass.rotation.y = time * 0.02;
  dust.rotation.y = time * 0.01;
  label(NAMES[Math.min(5, Math.floor(t + 0.35))], Math.min(5, Math.floor(t + 0.35)));
  stage.render();
});
