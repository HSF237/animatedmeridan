/* PROJECTS — showroom. Six architectural models on lit pedestals in a dark gallery;
   scrolling turns the ring so each project steps forward into the light. */
import { THREE, createStage, createScroll, makeLabel, run, makeDust, lerp, clamp01, smooth, ease, range, isMobile, rnd, rr } from "./kit.js";

const stage = createStage({ bg: 0x0d0b0a, fog: [0x0d0b0a, 0.022], fov: 38, far: 300, bloom: { strength: 0.42, radius: 0.6, threshold: 0.55 }, exposure: 1.05, shadows: true });
const { scene, camera, renderer, pointer } = stage;
stage.shiftRight(0.16);
const scroll = createScroll();
const label = makeLabel();

const COUNT = 6, R = 11, STEP = (Math.PI * 2) / COUNT;
const NAMES = ["Solstice Tower", "Aurora Pavilion", "Cantilever House", "Terrace Library", "Meridian Villa", "Helios Museum"];

// materials
const stone = new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: 0.7 });
const stone2 = new THREE.MeshStandardMaterial({ color: 0xb9ad9a, roughness: 0.85 });
const dark = new THREE.MeshStandardMaterial({ color: 0x241f1b, roughness: 0.5, metalness: 0.4 });
const wood = new THREE.MeshStandardMaterial({ color: 0xb98454, roughness: 0.6 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x8fd0d8, roughness: 0.05, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false });
const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 1.1) });
const water = new THREE.MeshStandardMaterial({ color: 0x2bb5c4, emissive: 0x0a5560, emissiveIntensity: 0.9, roughness: 0.1 });
const grass = new THREE.MeshStandardMaterial({ color: 0x5f7f4a, roughness: 1 });
const gold = new THREE.MeshStandardMaterial({ color: 0xe0b070, roughness: 0.3, metalness: 1 });

const box = (parent, mat, w, h, d, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
};

/* ---------- the six models, each ~4 units wide, sitting on y = 0 ---------- */
const builders = [
  // 0 — Solstice Tower: a stack of floors twisting 1.5° each, around a glass core
  (g) => {
    const N = 32;
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1), w = 2.3 * (1 - k * 0.32);
      const f = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, w * 0.9), stone);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.14, w * 0.84), glass);
      gl.position.y = 0.1;
      slab.castShadow = true;
      f.add(slab, gl);
      f.position.y = 0.05 + i * 0.2;
      f.userData = { twist: i * 0.075, delay: i / N };
      g.add(f);
    }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 6.6, 16), glow);
    core.position.y = 3.3;
    core.userData.delay = 0.1;
    g.add(core);
    g.userData.floors = true;
  },
  // 1 — Aurora Pavilion: nested timber ribs and shells around a glowing oculus
  (g) => {
    for (let k = 0; k < 4; k++) {
      const r = 1.9 - k * 0.42, L = 3.6 - k * 0.3;
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 40, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0xc4925f, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
      shell.rotation.x = Math.PI / 2;
      shell.userData.delay = k * 0.2;
      g.add(shell);
      for (let i = 0; i <= 10; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 32, Math.PI), wood);
        rib.position.z = -L / 2 + (i / 10) * L;
        rib.userData.delay = k * 0.2 + i * 0.015;
        rib.castShadow = true;
        g.add(rib);
      }
    }
    const base = box(g, stone2, 4.6, 0.25, 4.2, 0, -0.25, 0);
    base.userData.delay = 0;
    const oc = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 40), glow);
    oc.position.y = 1.62;
    oc.rotation.x = Math.PI / 2;
    oc.userData.delay = 0.9;
    g.add(oc);
  },
  // 2 — Cantilever House: stone core, floating slab, glass box, pool
  (g) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 0), stone2);
    rock.scale.set(1.4, 0.32, 1.1);
    rock.position.y = -0.1;
    rock.userData.delay = 0;
    g.add(rock);
    const core = box(g, stone2, 1.2, 2.8, 1.4, -1.2, 0.2, 0);
    core.userData.delay = 0.2;
    const slab = box(g, stone, 5.0, 0.28, 1.9, 0.5, 1.7, 0);
    slab.userData.delay = 0.45;
    const gl = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.3, 1.6), glass);
    gl.position.set(1.15, 2.63, 0);
    gl.userData.delay = 0.6;
    g.add(gl);
    const roof = box(g, dark, 4.4, 0.16, 2.1, 0.75, 3.28, 0);
    roof.userData.delay = 0.7;
    const pool = box(g, water, 2.4, 0.06, 1.0, 0.7, 0.25, 1.6);
    pool.userData.delay = 0.8;
    const post = box(g, dark, 0.1, 1.5, 0.1, 2.9, 0.2, 0.7);
    post.userData.delay = 0.9;
  },
  // 3 — Terrace Library: stepped terraces with green roofs and glazed fronts
  (g) => {
    for (let i = 0; i < 5; i++) {
      const w = 4.4 - i * 0.7, y = i * 0.62;
      const b = box(g, stone, w, 0.6, 3.2 - i * 0.1, 0, y, -i * 0.28);
      b.userData.delay = i * 0.15;
      const gr = box(g, grass, w + 0.05, 0.08, 3.25 - i * 0.1, 0, y + 0.6, -i * 0.28);
      gr.userData.delay = i * 0.15 + 0.08;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.4, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.65) }));
      fr.position.set(0, y + 0.32, 1.62 - i * 0.38);
      fr.userData.delay = i * 0.15 + 0.1;
      g.add(fr);
      const tree = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x3f6b3a }));
      tree.position.set(-w / 2 + 0.3 + (i % 2) * 0.4, y + 0.9, 0.4 - i * 0.28);
      tree.userData.delay = i * 0.15 + 0.2;
      g.add(tree);
    }
  },
  // 4 — Meridian Villa: pavilion with wings, roofs, terrace pool (the home-page house)
  (g) => {
    const k = 0.135;
    const P = (x0, x1, y0, y1, z0, z1, mat, d) => {
      const m = box(g, mat, (x1 - x0) * k, (y1 - y0) * k, (z1 - z0) * k, ((x0 + x1) / 2) * k, y0 * k, ((z0 + z1) / 2 + 7) * k);
      m.userData.delay = d;
      return m;
    };
    P(-22, 22, -0.4, 0, -28, 0, stone2, 0);
    P(-7, 7, 0, 7.6, -14, 0, stone, 0.15);
    P(-20.4, -7.4, 0, 7.2, -14, -1, stone, 0.25);
    P(7.4, 20.4, 0, 7.2, -14, -1, stone, 0.3);
    P(-7.2, -4.2, 0, 7.6, -1, 0.1, stone2, 0.35);
    P(4.2, 7.2, 0, 7.6, -1, 0.1, stone2, 0.35);
    P(-7.6, 7.6, 7.6, 8.1, -16, 2.2, dark, 0.5);
    P(-20.7, -7.1, 7.2, 7.7, -18.2, 0.4, dark, 0.55);
    P(7.1, 20.7, 7.2, 7.7, -18.2, 0.4, dark, 0.6);
    P(-13.2, 9, -0.02, 0.04, -26.6, -18.4, water, 0.7);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(2.6 * k * 2, 5 * k, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.25, 0.7) }));
    fr.position.set(0, 3.8 * k, 0.4 * k + 7 * k);
    fr.userData.delay = 0.8;
    g.add(fr);
    g.position.z = -0.9;
  },
  // 5 — Helios Museum: dome over a colonnade with a glowing oculus
  (g) => {
    const steps = box(g, stone2, 4.6, 0.2, 4.6, 0, -0.2, 0);
    steps.userData.delay = 0;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.3, 10), stone);
      c.position.set(Math.cos(a) * 1.9, 0.65, Math.sin(a) * 1.9);
      c.castShadow = true;
      c.userData.delay = 0.1 + (i / 16) * 0.3;
      g.add(c);
    }
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.16, 48), stone);
    drum.position.y = 1.38;
    drum.userData.delay = 0.45;
    g.add(drum);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.75, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), stone);
    dome.position.y = 1.46;
    dome.userData.delay = 0.6;
    dome.castShadow = true;
    g.add(dome);
    for (let i = 0; i < 12; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(1.77, 0.02, 6, 24, Math.PI / 2), gold);
      rib.position.y = 1.46;
      rib.rotation.y = (i / 12) * Math.PI;
      rib.rotation.z = 0;
      rib.userData.delay = 0.7;
      g.add(rib);
    }
    const oc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), glow);
    oc.rotation.x = -Math.PI / 2;
    oc.position.y = 3.22;
    oc.userData.delay = 0.9;
    g.add(oc);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 24), glass);
    core.position.y = 0.7;
    core.userData.delay = 0.8;
    g.add(core);
  },
];

/* ---------- gallery ---------- */
scene.add(new THREE.HemisphereLight(0xffe2c0, 0x201810, 0.5));
const key = new THREE.DirectionalLight(0xffd9b0, 1.2);
key.position.set(8, 16, 14);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
scene.add(key);

const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 96), new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.42, metalness: 0.55 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.5;
floor.receiveShadow = true;
scene.add(floor);
const floorRings = new THREE.Group();
for (const r of [R - 2.6, R + 2.6, R + 8, R + 16]) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.05, 128), new THREE.MeshBasicMaterial({ color: 0xe0b070, transparent: true, opacity: r < R ? 0.45 : 0.16, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.49;
  floorRings.add(m);
}
scene.add(floorRings);
// LED columns and a light ring high above
const pillars = new THREE.Group();
for (let i = 0; i < 40; i++) {
  const a = (i / 40) * Math.PI * 2;
  if (Math.sin(a) > 0.3) continue; // keep the columns behind the models, away from the camera
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 26, 0.16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.95, 0.45) }));
  p.position.set(Math.cos(a) * 34, 12, Math.sin(a) * 34);
  pillars.add(p);
}
scene.add(pillars);
const halo = new THREE.Mesh(new THREE.TorusGeometry(R, 0.09, 8, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.8) }));
halo.rotation.x = Math.PI / 2;
halo.position.y = 15;
scene.add(halo);

const ring = new THREE.Group();
scene.add(ring);
const slots = [];
for (let i = 0; i < COUNT; i++) {
  const a = i * STEP;
  const slot = new THREE.Group();
  slot.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
  slot.rotation.y = a; // pedestal faces outward, so the front project faces the camera
  ring.add(slot);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.5, 64), new THREE.MeshStandardMaterial({ color: 0x1c1613, roughness: 0.4, metalness: 0.6 }));
  ped.position.y = -0.25;
  ped.receiveShadow = true;
  slot.add(ped);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.04, 8, 96), new THREE.MeshBasicMaterial({ color: 0xe0b070, transparent: true, opacity: 0.5 }));
  rim.rotation.x = Math.PI / 2;
  slot.add(rim);
  const model = new THREE.Group();
  slot.add(model);
  builders[i](model);
  model.children.forEach((c) => (c.userData.base = { y: c.position.y }));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(4.2, 16, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  cone.position.y = 8;
  cone.rotation.x = Math.PI;
  slot.add(cone);
  const spot = new THREE.SpotLight(0xffe0b8, 0, 40, 0.42, 0.6, 1.4);
  spot.position.set(0, 15, 0);
  spot.target.position.set(0, 1, 0);
  slot.add(spot, spot.target);
  slots.push({ slot, model, rim, cone, spot, ped });
}
const dust = makeDust({ count: isMobile ? 500 : 1100, size: 1.8, color: 0xffd9a0, box: [70, 24, 70], opacity: 0.45 });
scene.add(dust);

let introT = 0;
const camP = new THREE.Vector3(), camL = new THREE.Vector3();
run((dt, time, started) => {
  if (started) introT = Math.min(1, introT + dt / 3.2);
  const t = scroll.update(dt, 1.2);
  const p = clamp01((t - 1) / 5) * 5; // 0..5 project index
  ring.rotation.y = -p * STEP;
  // camera: wide at the intro, close for each project, wider again at the end
  const wide = 1 - smooth(range(t, 0.15, 1)) + smooth(range(t, 6.2, 7));
  camP.set(pointer.sx * 1.4, lerp(4.2, 9, wide), R + lerp(16.5, 28, wide));
  camL.set(0, lerp(2.6, 1.2, wide), R);
  pointer.sx += (pointer.x - pointer.sx) * 0.04;
  camera.position.copy(camP);
  camera.lookAt(camL);

  slots.forEach((s, i) => {
    const d = Math.abs(p - i);
    const a = t < 0.95 && i === 0 ? 0.4 : smooth(1 - clamp01(d / 0.75));
    s.spot.intensity = 260 * a;
    s.cone.material.opacity = 0.09 * a;
    s.rim.material.opacity = 0.25 + 0.75 * a;
    s.model.rotation.y = time * (0.12 + 0.35 * a) + i;
    s.model.position.y = a * 0.12 + Math.sin(time * 1.3 + i) * 0.02 * a;
    s.model.scale.setScalar(1 + a * 0.06);
    // assemble on entry: parts rise into place, staggered
    const asm = ease(clamp01((introT - i * 0.06) * 1.3));
    s.model.children.forEach((c) => {
      const dl = c.userData.delay ?? 0;
      const k = ease(clamp01(asm * 1.6 - dl * 0.6));
      c.scale.setScalar(Math.max(0.001, k));
      if (c.userData.base) c.position.y = c.userData.base.y + (1 - k) * 1.2;
      if (c.userData.twist !== undefined) c.rotation.y = c.userData.twist * (0.7 + 0.3 * Math.sin(time * 0.6));
    });
  });
  dust.rotation.y = time * 0.01;
  halo.rotation.z = time * 0.05;
  const idx = Math.round(clamp01((t - 1) / 5) * 5);
  label(t < 0.7 ? "Overview" : NAMES[idx], t < 0.7 ? 0 : idx);
  stage.render();
});
