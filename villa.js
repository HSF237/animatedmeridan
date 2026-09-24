import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* =========================================================
   MERIDIAN VILLA — a clifftop Mediterranean villa at golden hour,
   modelled after the reference renders. Units are metres.
   +z is the arrival side (driveway), -z faces the sea and sunset.
   Ground floor is y = 0; the driveway sits 1.2 m lower.
   ========================================================= */

let seed = 7919;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + rnd() * (b - a);

/* ---------- Procedural textures ---------- */
function makeCanvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function toTex(c, { srgb = true, repeat = null, rotate = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  if (rotate) {
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
  }
  return t;
}
function veins(ctx, s, count, color, alpha, step = 12, width = [0.5, 3]) {
  ctx.lineCap = "round";
  ctx.filter = "blur(0.8px)";
  for (let i = 0; i < count; i++) {
    let x = rnd() * s, y = rnd() * s, a = rnd() * Math.PI * 2;
    ctx.lineWidth = rr(width[0], width[1]);
    ctx.strokeStyle = `rgba(${color},${alpha * rr(0.35, 1)})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 30 + ((rnd() * 80) | 0);
    for (let k = 0; k < steps; k++) {
      a += (rnd() - 0.5) * 0.5;
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.filter = "none";
}
function marble(base, veinA, veinB, count, grout = false) {
  const c = makeCanvas(1024);
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 1024, y = rnd() * 1024, r = rr(100, 460);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rnd() < 0.5 ? veinA : veinB},0.07)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);
  }
  veins(ctx, 1024, count, veinA, 0.55, 14, [0.6, 4]);
  veins(ctx, 1024, count * 0.6, veinB, 0.5, 10, [0.4, 2]);
  if (grout) {
    ctx.strokeStyle = "rgba(90,75,60,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 1024, 1024);
  }
  return c;
}
function wood(base, rotate = false) {
  const c = makeCanvas(1024);
  const ctx = c.getContext("2d");
  for (let y = 0; y < 1024; y++) {
    const n = Math.sin(y * 0.04 + Math.sin(y * 0.011) * 3.5) * 0.5 + 0.5;
    const k = 0.8 + n * 0.22 + (rnd() - 0.5) * 0.05;
    ctx.fillStyle = `rgb(${(base[0] * k) | 0},${(base[1] * k) | 0},${(base[2] * k) | 0})`;
    ctx.fillRect(0, y, 1024, 1);
  }
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(30,15,5,${rnd() * 0.12})`;
    ctx.fillRect(rnd() * 1024, rnd() * 1024, rr(80, 600), rr(1, 3));
  }
  return toTex(c, { rotate });
}
// Split-face limestone cladding: irregular coursed blocks with relief (colour + bump)
function stoneCladding() {
  const S = 1024;
  const col = makeCanvas(S), bump = makeCanvas(S);
  const c = col.getContext("2d"), b = bump.getContext("2d");
  c.fillStyle = "#b3a58d";
  c.fillRect(0, 0, S, S);
  b.fillStyle = "#000";
  b.fillRect(0, 0, S, S);
  let y = 0;
  while (y < S) {
    const h = Math.round(rr(46, 110));
    let x = -rr(0, 200);
    while (x < S) {
      const w = rr(110, 330);
      const tone = rr(0.88, 1.08);
      const base = [232 * tone, 220 * tone, 196 * tone].map((v) => Math.min(255, v | 0));
      const g = c.createLinearGradient(x, y, x + w * 0.4, y + h);
      g.addColorStop(0, `rgb(${base.map((v) => Math.min(255, v + 18)).join(",")})`);
      g.addColorStop(1, `rgb(${base.map((v) => v - 22).join(",")})`);
      c.fillStyle = g;
      c.fillRect(x + 3, y + 3, w - 6, h - 6);
      b.fillStyle = "#b0b0b0";
      b.fillRect(x + 3, y + 3, w - 6, h - 6);
      // split-face relief
      for (let i = 0; i < 26; i++) {
        const px = x + rr(4, w - 8), py = y + rr(4, h - 8), r = rr(4, 22);
        const v = rr(0, 1);
        c.fillStyle = `rgba(${v < 0.5 ? "255,248,232" : "90,74,55"},${rr(0.05, 0.18)})`;
        c.beginPath();
        c.ellipse(px, py, r * 1.6, r, rr(0, 3), 0, Math.PI * 2);
        c.fill();
        const bv = (150 + rr(-70, 90)) | 0;
        b.fillStyle = `rgba(${bv},${bv},${bv},0.6)`;
        b.beginPath();
        b.ellipse(px, py, r * 1.6, r, rr(0, 3), 0, Math.PI * 2);
        b.fill();
      }
      x += w;
    }
    y += h;
  }
  b.filter = "blur(2px)";
  b.drawImage(bump, 0, 0);
  return { map: toTex(col), bump: toTex(bump, { srgb: false }) };
}
function travertineTiles() {
  const c = makeCanvas(1024);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#e3d6bf";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = rnd() < 0.5 ? `rgba(255,250,240,${rnd() * 0.2})` : `rgba(150,125,95,${rnd() * 0.14})`;
    ctx.fillRect(0, rnd() * 1024, 1024, rr(1, 6));
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(120,100,78,${rr(0.12, 0.35)})`;
    ctx.fillRect(rnd() * 1024, rnd() * 1024, rr(2, 12), rr(1, 3));
  }
  ctx.strokeStyle = "rgba(120,100,80,0.45)";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 1024, 1024);
  ctx.beginPath();
  ctx.moveTo(512, 0);
  ctx.lineTo(512, 1024);
  ctx.stroke();
  return toTex(c);
}
function cobbles() {
  const c = makeCanvas(1024);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#3d3a37";
  ctx.fillRect(0, 0, 1024, 1024);
  const s = 64;
  for (let row = 0; row < 1024 / (s / 2); row++) {
    for (let col = 0; col < 1024 / s + 1; col++) {
      const x = col * s + (row % 2 ? s / 2 : 0), y = row * (s / 2);
      const v = rr(0.75, 1.15);
      ctx.fillStyle = `rgb(${(132 * v) | 0},${(126 * v) | 0},${(118 * v) | 0})`;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, s - 4, s / 2 - 4, 6);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${rr(0.02, 0.08)})`;
      ctx.fillRect(x + 4, y + 4, s - 10, 4);
    }
  }
  return toTex(c);
}
function mosaic() {
  const c = makeCanvas(512);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0e5a63";
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 16)
    for (let x = 0; x < 512; x += 16) {
      ctx.fillStyle = `hsl(${rr(178, 192)},${rr(45, 70)}%,${rr(38, 56)}%)`;
      ctx.fillRect(x + 1, y + 1, 14, 14);
    }
  return toTex(c);
}
function waterNormal() {
  const S = 512;
  const c = makeCanvas(S);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(S, S);
  const h = (x, y) =>
    Math.sin((x / S) * Math.PI * 2 * 3 + Math.sin((y / S) * Math.PI * 2 * 2) * 1.5) * 0.5 +
    Math.sin((y / S) * Math.PI * 2 * 5 + Math.cos((x / S) * Math.PI * 2 * 4)) * 0.35 +
    Math.sin(((x + y) / S) * Math.PI * 2 * 7) * 0.15;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
      const n = new THREE.Vector3(-dx * 2, -dy * 2, 1).normalize();
      const i = (y * S + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return toTex(c, { srgb: false });
}
function noise(size, grain, blur = 0) {
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.3; i++) {
    const v = (rnd() * 255) | 0;
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    ctx.fillRect(rnd() * size, rnd() * size, grain, grain);
  }
  if (blur) {
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(c, 0, 0);
  }
  return toTex(c, { srgb: false });
}
function knit() {
  const c = makeCanvas(256);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#6b5646";
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16)
    for (let y = 0; y < 256; y += 10) {
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? "150,125,100" : "60,45,35"},0.5)`;
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 5, 7, 4, (x / 16) % 2 ? 0.5 : -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  return toTex(c, { repeat: [3, 3] });
}
function tvScreen() {
  const c = makeCanvas(1024, 576);
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 576);
  g.addColorStop(0, "#3b4b7a");
  g.addColorStop(0.5, "#e9906a");
  g.addColorStop(0.62, "#f2b36b");
  g.addColorStop(0.64, "#2a3350");
  g.addColorStop(1, "#141a2c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 576);
  ctx.fillStyle = "#ffe2a8";
  ctx.beginPath();
  ctx.arc(640, 350, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1b1a1c";
  ctx.beginPath();
  ctx.moveTo(0, 576);
  ctx.bezierCurveTo(220, 300, 420, 420, 560, 380);
  ctx.lineTo(560, 576);
  ctx.fill();
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(255,210,150,${rr(0.1, 0.5)})`;
    ctx.fillRect(560 + rr(0, 200), 372 + rr(0, 90), rr(10, 60), 2);
  }
  return toTex(c);
}
function reliefArt() {
  const c = makeCanvas(512, 640);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#d9cdb8";
  ctx.fillRect(0, 0, 512, 640);
  ctx.strokeStyle = "rgba(120,100,80,0.45)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(260, 60);
  ctx.bezierCurveTo(120, 220, 380, 330, 220, 580);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(300, 90);
  ctx.bezierCurveTo(200, 240, 420, 360, 280, 560);
  ctx.stroke();
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "100,85,70"},0.06)`;
    ctx.fillRect(rnd() * 512, rnd() * 640, 3, 3);
  }
  return toTex(c);
}
function roomGlow() {
  // warm interior seen through upper-floor glass: ceiling light, curtains, furniture silhouettes
  const c = makeCanvas(512, 256);
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#ffd9a0");
  g.addColorStop(0.5, "#e8a867");
  g.addColorStop(1, "#6b4428");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = "rgba(255,240,215,0.9)";
    ctx.beginPath();
    ctx.arc(30 + i * 64, 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const x = rr(20, 480);
    ctx.fillStyle = "rgba(255,245,230,0.35)";
    ctx.fillRect(x, 0, rr(20, 50), 256);
  }
  ctx.fillStyle = "rgba(60,38,22,0.75)";
  for (let i = 0; i < 3; i++) {
    const x = rr(40, 420);
    ctx.beginPath();
    ctx.roundRect(x, 170, rr(60, 110), 60, 12);
    ctx.fill();
  }
  return toTex(c);
}
function streaks() {
  const c = makeCanvas(256);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(210,240,255,${rr(0.06, 0.4)})`;
    ctx.fillRect(rnd() * 256, rnd() * 256, rr(1, 3), rr(20, 100));
  }
  return toTex(c);
}

// Scale BoxGeometry UVs so textures keep a constant real-world size
function scaleBoxUV(geo, w, h, d, tile) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
    }
}

export function buildVilla(scene, { env, lite = false, sunDir }) {
  const root = new THREE.Group();
  scene.add(root);
  const animated = [];

  /* ---------- Materials ---------- */
  const std = (o) => new THREE.MeshStandardMaterial({ envMapIntensity: 0.6, ...o });
  const phys = (o) => new THREE.MeshPhysicalMaterial({ envMapIntensity: 0.6, ...o });
  const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });

  const stone = stoneCladding();
  const boucleBump = noise(256, 3, 0.7);
  boucleBump.repeat.set(6, 6);
  const linenBump = noise(256, 1);
  linenBump.repeat.set(10, 10);
  const shagBump = noise(256, 4, 1.5);
  shagBump.repeat.set(4, 4);
  const waterN = waterNormal();
  waterN.repeat.set(3, 3);

  const M = {
    stone: std({ map: stone.map, bumpMap: stone.bump, bumpScale: 3, roughness: 0.92 }),
    floor: phys({ map: toTex(marble("#efe2cc", "175,150,120", "120,100,80", 18, true)), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.55 }),
    deck: std({ map: travertineTiles(), roughness: 0.75 }),
    cobble: std({ map: cobbles(), roughness: 0.85 }),
    quartzite: phys({ map: toTex(marble("#c3b29b", "245,236,220", "95,78,60", 14)), roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 }),
    emperador: phys({ map: toTex(marble("#3c2a1f", "215,185,145", "20,12,8", 34)), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1 }),
    creamMarble: phys({ map: toTex(marble("#efe7da", "170,150,125", "130,110,90", 16)), roughness: 0.2, clearcoat: 0.8 }),
    walnut: std({ map: wood([112, 72, 46], true), roughness: 0.5 }),
    walnutH: std({ map: wood([112, 72, 46]), roughness: 0.5 }),
    teak: std({ map: wood([150, 105, 70]), roughness: 0.6 }),
    soffit: std({ map: wood([142, 96, 60]), roughness: 0.6 }),
    plaster: std({ color: 0xf0e8dc, roughness: 0.95 }),
    render: std({ color: 0xece3d4, roughness: 0.9 }),
    fascia: std({ color: 0x2a2623, roughness: 0.5, metalness: 0.4 }),
    bronze: std({ color: 0x3a2c22, roughness: 0.35, metalness: 0.85, envMapIntensity: 1 }),
    brass: std({ color: 0xd2ab6c, roughness: 0.22, metalness: 1, envMapIntensity: 1.2 }),
    black: std({ color: 0x111111, roughness: 0.3, metalness: 0.5 }),
    screen: new THREE.MeshBasicMaterial({ map: tvScreen(), color: new THREE.Color(1.1, 1.1, 1.1) }),
    boucle: phys({ color: 0xe9dfcf, roughness: 1, sheen: 1, sheenColor: 0xfff6e8, sheenRoughness: 0.8, bumpMap: boucleBump, bumpScale: 3 }),
    oat: phys({ color: 0xd8c9b1, roughness: 1, sheen: 1, sheenColor: 0xf5ead8, sheenRoughness: 0.8, bumpMap: boucleBump, bumpScale: 2 }),
    mocha: phys({ color: 0x5c4332, roughness: 1, sheen: 1, sheenColor: 0xb89878, sheenRoughness: 0.5, bumpMap: linenBump, bumpScale: 1 }),
    taupe: phys({ color: 0x9c8570, roughness: 1, sheen: 1, sheenColor: 0xe0cdb5, sheenRoughness: 0.6, bumpMap: linenBump, bumpScale: 1 }),
    linen: phys({ color: 0xf6f2eb, roughness: 1, sheen: 0.6, sheenColor: 0xffffff, sheenRoughness: 0.9, bumpMap: linenBump, bumpScale: 0.8 }),
    knit: phys({ map: knit(), roughness: 1, sheen: 0.8, sheenColor: 0xd9c2a4 }),
    rug: phys({ color: 0xa89583, roughness: 1, sheen: 1, sheenColor: 0xe8dccb, sheenRoughness: 0.4, bumpMap: shagBump, bumpScale: 4 }),
    ceramic: phys({ color: 0xe5dccd, roughness: 0.45, clearcoat: 0.4 }),
    stonePot: std({ color: 0x8c8176, roughness: 0.9, bumpMap: stone.bump, bumpScale: 1 }),
    art: std({ map: reliefArt(), roughness: 0.95, bumpMap: reliefArt(), bumpScale: 2 }),
    leaf: std({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }),
    bark: std({ color: 0x5a4a3b, roughness: 1 }),
    soil: std({ color: 0x2b241d, roughness: 1 }),
    hill: std({ color: 0x2e3522, roughness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbfd0d6, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.12, envMap: env, envMapIntensity: 1.3, depthWrite: false, side: THREE.DoubleSide }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0xfff1d6, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, envMap: env, envMapIntensity: 2, emissive: 0xffc27a, emissiveIntensity: 0.9 }),
    pendantGlass: new THREE.MeshPhysicalMaterial({ color: 0xf2e6cf, roughness: 0.05, transparent: true, opacity: 0.25, envMap: env, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false }),
    sheer: phys({ color: 0xfbf4e8, roughness: 1, transparent: true, opacity: 0.5, side: THREE.DoubleSide, sheen: 1, sheenColor: 0xffffff, depthWrite: false }),
    water: new THREE.MeshStandardMaterial({ color: 0x2bb5c4, roughness: 0.04, metalness: 0.15, normalMap: waterN, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.82, envMap: env, envMapIntensity: 1.4, emissive: 0x0b5d6a, emissiveIntensity: 0.5 }),
    mosaic: std({ map: mosaic(), roughness: 0.3, emissive: 0x0a4a52, emissiveIntensity: 0.4 }),
    fall: new THREE.MeshBasicMaterial({ map: streaks(), color: new THREE.Color(1.3, 1.6, 1.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    roomGlow: new THREE.MeshBasicMaterial({ map: roomGlow(), color: new THREE.Color(1.15, 1.05, 0.95) }),
    led: glow(4, 2.9, 1.8),
    ledSoft: glow(1.8, 1.25, 0.75),
    bulb: glow(6, 4.4, 2.6),
    fire: glow(6, 2.6, 0.7),
    shade: std({ color: 0xf3e7d3, emissive: 0xffc98a, emissiveIntensity: 1.1, roughness: 1, side: THREE.DoubleSide }),
  };
  M.fall.map.repeat.set(4, 1);

  /* ---------- Geometry helpers ---------- */
  function R(mat, x0, x1, y0, y1, z0, z1, { tile = 1.2, parent = root } = {}) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const geo = new THREE.BoxGeometry(w, h, d);
    if (mat === M.stone) tile = 3.4;
    const fit = mat === M.screen || mat === M.roomGlow || mat === M.art;
    if (!fit && (mat.map || mat.bumpMap)) scaleBoxUV(geo, w, h, d, tile);
    const m = new THREE.Mesh(geo, mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    parent.add(m);
    return m;
  }
  function RB(mat, x0, x1, y0, y1, z0, z1, r = 0.05, parent = root, seg = 3) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    parent.add(m);
    return m;
  }
  function cyl(mat, rt, rb, h, x, y, z, seg = 24, parent = root, open = false) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat);
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  }
  function lathe(mat, pts, x, y, z, seg = 40, parent = root) {
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function tube(mat, pts, radius, parent = root, seg = 32, radial = 8) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius, radial, false), mat);
    parent.add(m);
    return m;
  }
  function grp(x, y, z, rotY = 0, parent = root) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    parent.add(g);
    return g;
  }
  function pointLight(color, intensity, dist, x, y, z) {
    const l = new THREE.PointLight(color, intensity, dist, 2);
    l.position.set(x, y, z);
    root.add(l);
    return l;
  }
  const mtx = new THREE.Matrix4();
  const col = new THREE.Color();
  const q = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();

  // Glazing: glass pane with bronze frame and mullion grid (in the XY plane at z, or ZY plane at x)
  function glazing(axis, fixed, a0, a1, y0, y1, cols, transoms = [], frame = 0.06) {
    const t = 0.05;
    if (axis === "z") {
      R(M.glass, a0, a1, y0, y1, fixed - 0.015, fixed + 0.015);
      for (let i = 0; i <= cols; i++) {
        const x = a0 + ((a1 - a0) * i) / cols;
        R(M.bronze, x - frame / 2, x + frame / 2, y0, y1, fixed - t, fixed + t);
      }
      for (const y of [y0, y1, ...transoms]) R(M.bronze, a0, a1, y - frame / 2, y + frame / 2, fixed - t, fixed + t);
    } else {
      R(M.glass, fixed - 0.015, fixed + 0.015, y0, y1, a0, a1);
      for (let i = 0; i <= cols; i++) {
        const z = a0 + ((a1 - a0) * i) / cols;
        R(M.bronze, fixed - t, fixed + t, y0, y1, z - frame / 2, z + frame / 2);
      }
      for (const y of [y0, y1, ...transoms]) R(M.bronze, fixed - t, fixed + t, y - frame / 2, y + frame / 2, a0, a1);
    }
  }
  // Roof slab: dark fascia, walnut soffit with recessed downlights
  function roof(x0, x1, y, z0, z1, lights = true) {
    R(M.render, x0, x1, y + 0.12, y + 0.5, z0, z1);
    R(M.fascia, x0 - 0.02, x1 + 0.02, y, y + 0.55, z1 - 0.12, z1 + 0.02);
    R(M.fascia, x0 - 0.02, x1 + 0.02, y, y + 0.55, z0 - 0.02, z0 + 0.12);
    R(M.fascia, x0 - 0.02, x0 + 0.12, y, y + 0.55, z0, z1);
    R(M.fascia, x1 - 0.12, x1 + 0.02, y, y + 0.55, z0, z1);
    R(M.soffit, x0 + 0.12, x1 - 0.12, y, y + 0.12, z0 + 0.12, z1 - 0.12, { tile: 2.4 });
    if (lights) {
      const n = Math.max(2, Math.round((x1 - x0) / 1.8));
      for (let i = 0; i < n; i++) {
        const x = x0 + 0.9 + (i * (x1 - x0 - 1.8)) / Math.max(1, n - 1);
        for (const z of [z0 + 0.6, z1 - 0.6]) {
          const d = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), M.bulb);
          d.rotation.x = Math.PI / 2;
          d.position.set(x, y - 0.002, z);
          root.add(d);
        }
      }
    }
  }
  function cove(x0, x1, y, z0, z1) {
    // hidden LED cove around a ceiling perimeter
    R(M.ledSoft, x0, x1, y - 0.03, y, z0, z0 + 0.04);
    R(M.ledSoft, x0, x1, y - 0.03, y, z1 - 0.04, z1);
    R(M.ledSoft, x0, x0 + 0.04, y - 0.03, y, z0, z1);
    R(M.ledSoft, x1 - 0.04, x1, y - 0.03, y, z0, z1);
  }
  function downlights(x0, x1, z0, z1, y, step = 2.2) {
    for (let x = x0 + step / 2; x < x1; x += step)
      for (let z = z0 + step / 2; z < z1; z += step) {
        const d = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), M.bulb);
        d.rotation.x = Math.PI / 2;
        d.position.set(x, y - 0.003, z);
        root.add(d);
      }
  }
  function curtain(axis, fixed, a0, a1, y0, y1, folds = 10) {
    const w = a1 - a0, h = y1 - y0;
    const geo = new THREE.PlaneGeometry(w, h, folds * 6, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / w) * folds * Math.PI * 2) * 0.05);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, M.sheer);
    if (axis === "z") m.position.set((a0 + a1) / 2, (y0 + y1) / 2, fixed);
    else {
      m.rotation.y = Math.PI / 2;
      m.position.set(fixed, (y0 + y1) / 2, (a0 + a1) / 2);
    }
    root.add(m);
  }

  /* ---------- Plants ---------- */
  const leafGeo = new THREE.SphereGeometry(1, 6, 4);
  leafGeo.scale(1, 0.12, 0.42);
  function leafCluster(x, y, z, radius, count, color, size = 0.07, spread = [1, 0.7, 1], parent = root) {
    const mesh = new THREE.InstancedMesh(leafGeo, M.leaf, count);
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
      const r = radius * Math.cbrt(rnd());
      v3.set(x + Math.sin(ph) * Math.cos(th) * r * spread[0], y + Math.cos(ph) * r * spread[1], z + Math.sin(ph) * Math.sin(th) * r * spread[2]);
      q.setFromEuler(eul.set(rr(-1, 1), rr(0, 6.28), rr(-0.6, 0.6)));
      const sz = size * rr(0.7, 1.3);
      mtx.compose(v3, q, s3.set(sz, sz, sz));
      mesh.setMatrixAt(i, mtx);
      mesh.setColorAt(i, col.copy(base).offsetHSL(rr(-0.02, 0.02), rr(-0.08, 0.08), rr(-0.08, 0.1)));
    }
    parent.add(mesh);
    return mesh;
  }
  function olive(x, y, z, s = 1) {
    const g = grp(x, y, z, rnd() * 6);
    const lean = rr(-0.3, 0.3);
    tube(M.bark, [[0, 0, 0], [0.12 * s, 0.6 * s, 0.05], [lean * s, 1.3 * s, -0.08 * s], [lean * 1.2 * s, 1.9 * s, 0.1 * s]], 0.12 * s, g, 20, 8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rr(0, 0.5);
      const end = [lean * s + Math.cos(a) * 0.8 * s, rr(2.1, 2.6) * s, Math.sin(a) * 0.8 * s];
      tube(M.bark, [[lean * s, 1.5 * s, 0], [(lean * s + end[0]) / 2, 1.9 * s, end[2] / 2], end], 0.045 * s, g, 10, 6);
    }
    g.updateMatrixWorld();
    const c = new THREE.Vector3(lean * s, 2.5 * s, 0).applyMatrix4(g.matrixWorld);
    leafCluster(c.x, c.y, c.z, 1.25 * s, lite ? 450 : 1100, 0x7d8a63, 0.075 * s, [1.1, 0.6, 1.1]);
    return g;
  }
  function cypress(x, y, z, h = 7) {
    const count = lite ? 260 : 520;
    const mesh = new THREE.InstancedMesh(leafGeo, M.leaf, count);
    for (let i = 0; i < count; i++) {
      const t = rnd();
      const r = (0.55 + 0.1 * Math.sin(t * 9)) * Math.sin(Math.PI * Math.pow(t, 0.8)) * (h / 7);
      const a = rnd() * Math.PI * 2;
      v3.set(x + Math.cos(a) * r * rnd(), y + 0.3 + t * h, z + Math.sin(a) * r * rnd());
      q.setFromEuler(eul.set(rr(-0.5, 0.5), rr(0, 6), rr(-1.4, -0.9)));
      const sz = rr(0.18, 0.3);
      mtx.compose(v3, q, s3.set(sz, sz * 1.6, sz));
      mesh.setMatrixAt(i, mtx);
      mesh.setColorAt(i, col.setHSL(0.27, rr(0.3, 0.45), rr(0.1, 0.2)));
    }
    root.add(mesh);
    cyl(M.bark, 0.07, 0.12, 0.8, x, y, z, 8);
  }
  function shrubs(x0, x1, z0, z1, y, n, color, size = 0.35) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(geo, M.leaf, n);
    for (let i = 0; i < n; i++) {
      const s = size * rr(0.6, 1.3);
      mtx.compose(v3.set(rr(x0, x1), y + s * 0.6, rr(z0, z1)), q.identity(), s3.set(s, s * rr(0.7, 1), s));
      mesh.setMatrixAt(i, mtx);
      mesh.setColorAt(i, col.set(color).offsetHSL(rr(-0.02, 0.02), rr(-0.1, 0.1), rr(-0.08, 0.08)));
    }
    root.add(mesh);
  }
  function lavender(x0, x1, z0, z1, y, n) {
    const stem = new THREE.CylinderGeometry(0.008, 0.008, 1, 3);
    stem.translate(0, 0.5, 0);
    const bloom = new THREE.SphereGeometry(1, 5, 4);
    const sm = new THREE.InstancedMesh(stem, std({ color: 0x6f7c57, roughness: 1 }), n);
    const bm = new THREE.InstancedMesh(bloom, std({ color: 0xffffff, roughness: 1 }), n);
    for (let i = 0; i < n; i++) {
      const h = rr(0.35, 0.6);
      const x = rr(x0, x1), z = rr(z0, z1);
      q.setFromEuler(eul.set(rr(-0.25, 0.25), 0, rr(-0.25, 0.25)));
      mtx.compose(v3.set(x, y, z), q, s3.set(1, h, 1));
      sm.setMatrixAt(i, mtx);
      const top = new THREE.Vector3(0, h, 0).applyQuaternion(q).add(v3);
      mtx.compose(top, q, s3.set(0.025, 0.07, 0.025));
      bm.setMatrixAt(i, mtx);
      bm.setColorAt(i, col.setHSL(rr(0.72, 0.77), rr(0.3, 0.5), rr(0.55, 0.72)));
    }
    root.add(sm, bm);
  }
  function agave(x, y, z, s = 1) {
    const blade = new THREE.ConeGeometry(0.06, 1, 4);
    blade.translate(0, 0.5, 0);
    const n = 18;
    const mesh = new THREE.InstancedMesh(blade, std({ color: 0x8aa08d, roughness: 0.6 }), n);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rr(0, 0.3);
      const tilt = rr(0.4, 1.1);
      q.setFromEuler(eul.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt));
      mtx.compose(v3.set(x, y, z), q, s3.set(s * 1.3, s * rr(0.6, 0.9), s * 0.5));
      mesh.setMatrixAt(i, mtx);
    }
    root.add(mesh);
  }
  function planterBox(x0, x1, z0, z1, y0, h, ledSide = true) {
    R(M.stone, x0, x1, y0, y0 + h, z0, z1, { tile: 1.6 });
    R(M.soil, x0 + 0.1, x1 - 0.1, y0 + h, y0 + h + 0.01, z0 + 0.1, z1 - 0.1);
    if (ledSide) R(M.led, x0, x1, y0 + 0.02, y0 + 0.05, z1, z1 + 0.02);
  }
  function uplight(x, y, z) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), M.bulb);
    d.rotation.x = -Math.PI / 2;
    d.position.set(x, y + 0.012, z);
    root.add(d);
  }
  function pot(x, y, z, r = 0.45, h = 0.8, mat = M.stonePot) {
    return lathe(mat, [[0, 0], [r * 0.6, 0], [r, h * 0.35], [r * 1.02, h * 0.8], [r * 0.9, h], [r * 0.82, h * 0.97], [0, h * 0.92]], x, y, z, 40);
  }

  /* ---------- Furniture ---------- */
  function sectionalRun(g, x0, x1, depth, mat, backOn = true, armL = false, armR = false) {
    R(M.black, x0 + 0.05, x1 - 0.05, 0, 0.06, -depth / 2 + 0.06, depth / 2 - 0.06, { parent: g });
    RB(mat, x0, x1, 0.06, 0.4, -depth / 2, depth / 2, 0.08, g);
    const n = Math.max(1, Math.round((x1 - x0) / 1.0));
    const cw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * cw;
      RB(mat, a + 0.01, a + cw - 0.01, 0.38, 0.56, -depth / 2 + (backOn ? 0.3 : 0.02), depth / 2 - 0.02, 0.1, g);
      if (backOn) {
        const b = RB(mat, a + 0.01, a + cw - 0.01, 0.4, 0.9, -depth / 2 + 0.02, -depth / 2 + 0.32, 0.13, g);
        b.rotation.x = -0.12;
      }
    }
    if (armL) RB(mat, x0 - 0.02, x0 + 0.22, 0.06, 0.62, -depth / 2, depth / 2, 0.1, g);
    if (armR) RB(mat, x1 - 0.22, x1 + 0.02, 0.06, 0.62, -depth / 2, depth / 2, 0.1, g);
  }
  function pillow(g, x, y, z, w, mat, rotY = 0, lean = -0.35) {
    const p = RB(mat, x - w / 2, x + w / 2, y, y + w, z - 0.08, z + 0.08, 0.07, g);
    p.rotation.set(lean, rotY, rr(-0.06, 0.06));
    return p;
  }
  function barrelChair(x, z, rot) {
    // round bouclé swivel chair
    const g = grp(x, 0, z, rot);
    const outer = lathe(M.boucle, [[0, 0.05], [0.5, 0.05], [0.56, 0.2], [0.56, 0.5], [0.5, 0.72], [0.44, 0.74], [0.42, 0.5], [0.42, 0.44], [0, 0.44]], 0, 0, 0, 48, g);
    outer.scale.set(1, 1, 0.95);
    // open the front of the backrest by overlaying a seat cushion and hiding the front with a seat face
    RB(M.boucle, -0.4, 0.4, 0.42, 0.56, -0.3, 0.45, 0.12, g);
    lathe(M.bronze, [[0, 0], [0.3, 0], [0.3, 0.03], [0.05, 0.05], [0, 0.05]], 0, 0, 0, 32, g);
    pillow(g, 0, 0.55, -0.32, 0.42, M.mocha, 0, -0.25);
    return g;
  }
  function boucleBench(x0, x1, y, z0, z1) {
    RB(M.boucle, x0, x1, y + 0.08, y + 0.48, z0, z1, 0.12);
    R(M.bronze, x0 + 0.08, x1 - 0.08, y, y + 0.08, z0 + 0.08, z1 - 0.08);
  }
  function tableLamp(x, y, z, s = 1, baseMat = M.creamMarble) {
    lathe(baseMat, [[0, 0], [0.09, 0], [0.1, 0.05], [0.08, 0.34], [0.03, 0.38], [0, 0.38]].map(([r, h]) => [r * s, h * s]), x, y, z, 32);
    cyl(M.brass, 0.008, 0.008, 0.08 * s, x, y + 0.38 * s, z, 8);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.22 * s, 0.28 * s, 32, 1, true), M.shade);
    sh.position.set(x, y + 0.58 * s, z);
    root.add(sh);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 10, 8), M.bulb);
    b.position.set(x, y + 0.52 * s, z);
    root.add(b);
  }
  function vase(x, y, z, s = 1, mat = M.ceramic, sprigs = true) {
    lathe(mat, [[0, 0], [0.08, 0], [0.13, 0.08], [0.15, 0.2], [0.11, 0.32], [0.06, 0.38], [0.065, 0.42], [0, 0.42]].map(([r, h]) => [r * s, h * s]), x, y, z, 36);
    if (sprigs) leafCluster(x, y + 0.62 * s, z, 0.32 * s, 90, 0x6d7d55, 0.05 * s, [1, 0.8, 1]);
  }
  function candle(x, y, z, h = 0.12) {
    lathe(M.glass, [[0, 0], [0.05, 0], [0.05, h], [0, h]], x, y, z, 20);
    cyl(M.linen, 0.035, 0.035, h * 0.6, x, y, z, 16);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.fire);
    f.scale.set(1, 2, 1);
    f.position.set(x, y + h * 0.6 + 0.02, z);
    root.add(f);
  }
  function booksStack(x, y, z, rot, n = 3) {
    const g = grp(x, y, z, rot);
    const cols = [0xd8cbb5, 0x5b4636, 0xefe7da, 0x8a7560];
    let h = 0;
    for (let i = 0; i < n; i++) {
      const t = rr(0.03, 0.05);
      RB(std({ color: cols[i % 4], roughness: 0.7 }), -0.17, 0.17, h, h + t, -0.12, 0.12, 0.004, g, 1).rotation.y = rr(-0.15, 0.15);
      h += t;
    }
  }
  function crystalChandelier(x, yTop, z, s = 1) {
    const g = grp(x, 0, z, 0);
    cyl(M.brass, 0.02, 0.02, 1.2 * s, 0, yTop - 1.2 * s, 0, 8, g);
    cyl(M.brass, 0.25 * s, 0.25 * s, 0.04, 0, yTop - 0.04, 0, 32, g);
    const tiers = [[1.25, 0.95, 30], [0.9, 0.85, 22], [0.55, 0.75, 14], [0.25, 0.65, 8]];
    const rodGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 8);
    const total = tiers.reduce((a, t) => a + t[2], 0);
    const rods = new THREE.InstancedMesh(rodGeo, M.crystal, total);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), M.bulb, total);
    let n = 0;
    tiers.forEach(([r, len, count], ti) => {
      const ringY = yTop - 1.2 * s + ti * 0.28 * s;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * s, 0.012, 8, 64), M.brass);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ringY;
      g.add(ring);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ti * 0.3;
        const L = len * s * rr(0.85, 1.15);
        mtx.compose(v3.set(Math.cos(a) * r * s, ringY - L / 2, Math.sin(a) * r * s), q.identity(), s3.set(1, L, 1));
        rods.setMatrixAt(n, mtx);
        mtx.makeTranslation(Math.cos(a) * r * s, ringY - 0.02, Math.sin(a) * r * s);
        bulbs.setMatrixAt(n++, mtx);
      }
    });
    g.add(rods, bulbs);
    return g;
  }
  function glassPendant(x, y, z) {
    R(M.black, x - 0.004, x + 0.004, y + 0.4, 3.6, z - 0.004, z + 0.004);
    cyl(M.brass, 0.1, 0.1, 0.05, x, y + 0.38, z, 24);
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 32, 1, true), M.pendantGlass);
    g.position.set(x, y + 0.17, z);
    root.add(g);
    cyl(M.pendantGlass, 0.13, 0.13, 0.01, x, y - 0.04, z, 32);
    cyl(M.bulb, 0.012, 0.012, 0.22, x, y + 0.05, z, 8);
  }
  function daybed(x, z, rot) {
    const g = grp(x, 0, z, rot);
    R(M.teak, -1.1, 1.1, 0.05, 0.3, -1.0, 1.0, { parent: g });
    R(M.teak, -1.05, 1.05, 0, 0.05, -0.95, 0.95, { parent: g });
    RB(M.linen, -1.05, 1.05, 0.3, 0.52, -0.95, 0.95, 0.08, g);
    const back = RB(M.linen, -1.05, 1.05, 0.45, 1.05, -0.95, -0.72, 0.1, g);
    back.rotation.x = -0.2;
    pillow(g, -0.5, 0.52, -0.62, 0.45, M.mocha, 0, -0.35);
    pillow(g, 0.3, 0.52, -0.62, 0.4, M.taupe, 0.2, -0.35);
    const towel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 16), M.linen);
    towel.rotation.z = Math.PI / 2;
    towel.position.set(0.5, 0.6, 0.3);
    g.add(towel);
    return g;
  }
  function lantern(x, y, z, h = 0.55) {
    R(M.bronze, x - 0.14, x + 0.14, y, y + 0.03, z - 0.14, z + 0.14);
    R(M.bronze, x - 0.14, x + 0.14, y + h, y + h + 0.04, z - 0.14, z + 0.14);
    R(M.glass, x - 0.13, x + 0.13, y + 0.03, y + h, z - 0.13, z + 0.13);
    for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) R(M.bronze, x + dx - 0.01, x + dx + 0.01, y, y + h, z + dz - 0.01, z + dz + 0.01);
    candle(x, y + 0.03, z, 0.22);
  }

  /* =========================================================
     SITE: driveway, hill, retaining walls
     ========================================================= */
  const DRIVE_Y = -1.2;
  R(M.cobble, -34, 34, DRIVE_Y - 0.3, DRIVE_Y, 4, 44, { tile: 2.2 });
  // Platform the house sits on
  R(M.stone, -22, 22, DRIVE_Y - 0.3, 0, 3.9, 4.05, { tile: 1.6 });
  R(M.deck, -22, 22, -0.3, 0, -1, 4, { tile: 1.6 });
  // Entrance stair: 7 lit steps
  const steps = 7, rise = 1.2 / steps, run = 0.6;
  for (let i = 0; i < steps; i++) {
    const y1 = DRIVE_Y + (i + 1) * rise;
    const z1 = 4 + (steps - 1 - i) * run;
    R(M.deck, -3.2, 3.2, DRIVE_Y - 0.3, y1, z1, z1 + run, { tile: 1.6 });
    R(M.led, -3.15, 3.15, y1 - 0.03, y1 - 0.015, z1 + run + 0.001, z1 + run + 0.012);
  }
  // Stair-side planters with olives & uplights
  planterBox(-6.2, -3.4, 4.2, 8.6, DRIVE_Y, 1.0);
  planterBox(3.4, 6.2, 4.2, 8.6, DRIVE_Y, 1.0);
  olive(-4.8, DRIVE_Y + 1.0, 6.4, 1.15);
  olive(4.8, DRIVE_Y + 1.0, 6.4, 1.05);
  uplight(-4.3, DRIVE_Y + 1.0, 7.4);
  uplight(4.3, DRIVE_Y + 1.0, 7.4);
  shrubs(-6.1, -3.5, 4.3, 8.5, DRIVE_Y + 1.0, 18, 0x4f6041, 0.28);
  shrubs(3.5, 6.1, 4.3, 8.5, DRIVE_Y + 1.0, 18, 0x4f6041, 0.28);
  lavender(-6.1, -3.5, 7.6, 8.5, DRIVE_Y + 1.0, lite ? 60 : 140);
  lavender(3.5, 6.1, 7.6, 8.5, DRIVE_Y + 1.0, lite ? 60 : 140);

  // Curved stone planter walls with LED along the driveway (right-hand side)
  {
    const cx = 26, cz = 22, r = 15;
    const segs = 30;
    for (let i = 0; i < segs; i++) {
      const a0 = Math.PI * 0.62 + (i / segs) * Math.PI * 0.55;
      const a1 = Math.PI * 0.62 + ((i + 1) / segs) * Math.PI * 0.55;
      const x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r;
      const x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
      const len = Math.hypot(x1 - x0, z1 - z0) + 0.05;
      const g = grp((x0 + x1) / 2, DRIVE_Y, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0));
      R(M.stone, -len / 2, len / 2, 0, 0.9, -0.3, 0.3, { parent: g, tile: 1.6 });
      R(M.led, -len / 2, len / 2, 0.02, 0.05, -0.33, -0.3, { parent: g });
    }
    // plants behind the curve
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.66 + (i / 9) * Math.PI * 0.5;
      const x = cx + Math.cos(a) * (r + 2.2), z = cz + Math.sin(a) * (r + 2.2);
      if (i % 3 === 0) olive(x, DRIVE_Y + 0.9, z, 1.2);
      else if (i % 3 === 1) agave(x, DRIVE_Y + 0.9, z, 0.9);
      else cypress(x, DRIVE_Y + 0.9, z, 6.5);
    }
    R(M.soil, 8, 40, DRIVE_Y + 0.3, DRIVE_Y + 0.88, 4.2, 40).visible = false;
    shrubs(11, 22, 8, 24, DRIVE_Y + 0.6, lite ? 30 : 70, 0x55663f, 0.45);
    lavender(12, 20, 10, 22, DRIVE_Y + 0.7, lite ? 120 : 300);
  }
  // Left-side planter along the drive
  planterBox(-24, -12, 10, 12, DRIVE_Y, 0.9);
  for (const x of [-22, -18, -14]) olive(x, DRIVE_Y + 0.9, 11, 1.1);
  shrubs(-23.8, -12.2, 10.1, 11.9, DRIVE_Y + 0.9, 30, 0x4d5d3f, 0.3);

  // Cypress and olive trees framing the house front
  for (const [x, z, h] of [[-9, 2.2, 8.5], [-7.6, 2.4, 7.2], [9, 2.2, 8.5], [7.6, 2.4, 7.5], [-21, 2, 7.5], [21, 2, 7.8]]) cypress(x, 0, z, h);
  for (const [x, z] of [[-12.5, 2.5], [12.5, 2.5]]) olive(x, 0, z, 1.2);
  shrubs(-20, -10, 1.4, 3.6, 0, 26, 0x4e5f40, 0.35);
  shrubs(10, 20, 1.4, 3.6, 0, 26, 0x4e5f40, 0.35);
  for (const x of [-12.5, -9, 9, 12.5]) uplight(x + 0.4, 0, 3);

  // Hillside falling away to the sea, with Mediterranean vegetation
  {
    const hill = new THREE.PlaneGeometry(900, 520, 90, 52);
    hill.rotateX(-Math.PI / 2);
    const p = hill.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i) - 260 - 28; // from z = -28 outwards
      const t = Math.min(1, Math.max(0, (-z - 28) / 380));
      const y = -2 - Math.pow(t, 0.7) * 58 + Math.sin(x * 0.03) * 3 * t + Math.cos(z * 0.05 + x * 0.02) * 2 * t;
      p.setXYZ(i, x, y, z);
    }
    hill.computeVertexNormals();
    root.add(new THREE.Mesh(hill, M.hill));
    // trees on the hill
    const n = lite ? 700 : 1800;
    const treeGeo = new THREE.IcosahedronGeometry(1, 1);
    const trees = new THREE.InstancedMesh(treeGeo, M.leaf, n);
    for (let i = 0; i < n; i++) {
      const x = rr(-420, 420);
      const z = -75 - Math.pow(rnd(), 1.4) * 320;
      const t = Math.min(1, (-z - 28) / 380);
      const y = -2 - Math.pow(t, 0.7) * 58 + Math.sin(x * 0.03) * 3 * t + Math.cos(z * 0.05 + x * 0.02) * 2 * t;
      const tall = rnd() < 0.25;
      const sz = rr(1.2, 2.6) * (1 + t);
      mtx.compose(v3.set(x, y + sz * (tall ? 2 : 0.8), z), q.identity(), s3.set(sz * (tall ? 0.5 : 1), sz * (tall ? 2.5 : 0.9), sz * (tall ? 0.5 : 1)));
      trees.setMatrixAt(i, mtx);
      trees.setColorAt(i, col.setHSL(rr(0.2, 0.28), rr(0.25, 0.4), rr(0.12, 0.22)));
    }
    root.add(trees);
    // near cypresses beside the terrace
    for (const [x, z, h] of [[-22, -30, 8], [-19, -33, 9], [23, -31, 8], [26, -36, 9.5], [-26, -40, 10]]) cypress(x, -2.5, z, h);
  }

  /* =========================================================
     MAIN PAVILION — double-height entrance hall & grand living
     x -7..7, z -14..0, height 7.6
     ========================================================= */
  const H = 7.6;
  R(M.floor, -20, 20, -0.3, 0, -14, -1, { tile: 1.2 });
  R(M.floor, -7, 7, -0.3, 0.001, -14, 0, { tile: 1.2 });
  // Front: stone piers + bronze-framed glass curtain wall
  R(M.stone, -7.2, -4.2, 0, H, -0.9, 0, { tile: 1.6 });
  R(M.stone, 4.2, 7.2, 0, H, -0.9, 0, { tile: 1.6 });
  glazing("z", -0.45, -4.2, -1.4, 0, H, 2, [3.2, 6.0]);
  glazing("z", -0.45, 1.4, 4.2, 0, H, 2, [3.2, 6.0]);
  glazing("z", -0.45, -1.4, 1.4, 3.2, H, 2, [6.0]);
  // Pivoting glass entrance doors
  const doorL = grp(-1.4, 0, -0.45, 0);
  const doorR = grp(1.4, 0, -0.45, 0);
  for (const [g, s] of [[doorL, 1], [doorR, -1]]) {
    const x0 = s > 0 ? 0 : -1.4, x1 = s > 0 ? 1.4 : 0;
    R(M.glass, x0, x1, 0, 3.2, -0.015, 0.015, { parent: g });
    R(M.bronze, x0, x1, 0, 0.06, -0.04, 0.04, { parent: g });
    R(M.bronze, x0, x1, 3.14, 3.2, -0.04, 0.04, { parent: g });
    R(M.bronze, x0, x0 + 0.06, 0, 3.2, -0.04, 0.04, { parent: g });
    R(M.bronze, x1 - 0.06, x1, 0, 3.2, -0.04, 0.04, { parent: g });
    const hx = s > 0 ? 1.25 : -1.25;
    R(M.brass, hx - 0.015, hx + 0.015, 0.8, 2.4, -0.1, -0.06, { parent: g });
    R(M.brass, hx - 0.015, hx + 0.015, 0.8, 2.4, 0.06, 0.1, { parent: g });
  }
  roof(-7.6, 7.6, H, -16, 2.2);
  // Interior ceiling with cove light
  R(M.plaster, -7, 7, H - 0.02, H, -14, -0.9);
  cove(-6.9, 6.9, H - 0.02, -13.9, -1);
  downlights(-6, 6, -13, -2, H - 0.02, 2.4);
  // Rear: double-height glass to the sea
  glazing("z", -14, -7, 7, 0, H, 6, [5.2]);
  curtain("z", -13.8, -6.9, -5.8, 0.02, H - 0.1, 8);
  curtain("z", -13.8, 5.6, 6.8, 0.02, H - 0.1, 8);

  // Mezzanine gallery on the left with glass balustrade (dining sits beneath in the kitchen wing)
  R(M.render, -7, -4, 3.8, 4.15, -13.8, -1);
  R(M.floor, -7, -4, 4.15, 4.16, -13.8, -1);
  R(M.glass, -4.02, -3.98, 4.16, 5.2, -13.8, -1);
  R(M.brass, -4.03, -3.97, 5.18, 5.22, -13.8, -1);
  R(M.ledSoft, -4.02, -3.99, 3.78, 3.8, -13.8, -1);
  downlights(-6.6, -4.2, -13.4, -1.5, 3.8, 1.8);
  // Left wall at x = -7: stone with a wide opening into the kitchen wing
  R(M.stone, -7.4, -7, 0, 3.8, -1, -3, { tile: 1.6 });
  R(M.stone, -7.4, -7, 0, 3.8, -11.4, -14, { tile: 1.6 });
  R(M.stone, -7.4, -7, 3.8, H, -14, -1, { tile: 1.6 });

  // Right wall x = 7: split-face stone feature wall with TV, linear fireplace, lit shelving
  R(M.stone, 6.6, 7.4, 0, H, -14, -2.8, { tile: 1.6 });
  R(M.stone, 6.6, 7.4, 2.9, H, -2.8, -0.9, { tile: 1.6 }); // over the corridor door
  R(M.emperador, 5.7, 6.6, 0, 0.42, -12.2, -3.8, { tile: 1.6 }); // hearth
  R(M.black, 6.45, 6.6, 0.5, 0.95, -11.6, -4.4);
  const flames = [];
  for (let i = 0; i < 30; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.36, 6), M.fire);
    f.position.set(6.48, 0.66, -11.4 + i * 0.235);
    f.userData.seed = rnd() * 10;
    root.add(f);
    flames.push(f);
  }
  R(M.led, 5.7, 6.6, 0.0, 0.02, -12.2, -3.8).position.y = 0.43;
  R(M.black, 6.5, 6.6, 1.55, 4.15, -10.8, -5.2); // TV body
  R(M.screen, 6.49, 6.5, 1.6, 4.1, -10.75, -5.25);
  // Shelving niches either side of the TV
  for (const zc of [-12.8, -3.9]) {
    R(M.walnutH, 6.3, 6.6, 0.5, 6.4, zc - 0.7, zc + 0.7);
    for (let s = 0; s < 5; s++) {
      const y = 1.2 + s * 1.1;
      R(M.walnutH, 6.25, 6.6, y - 0.04, y, zc - 0.68, zc + 0.68);
      R(M.led, 6.25, 6.28, y - 0.045, y - 0.04, zc - 0.66, zc + 0.66);
      if (s % 2) vase(6.42, y, zc + rr(-0.3, 0.3), 0.7, M.ceramic, false);
      else booksStack(6.42, y, zc, Math.PI / 2, 3);
    }
  }
  // Sheer curtain beside the fireplace wall
  curtain("x", 6.2, -13.9, -12.9, 0.02, H - 0.1, 5);

  // Living: rug, L-sectional, emperador coffee table, bouclé chairs
  RB(M.rug, -5, 5.2, 0, 0.03, -13.2, -6.2, 0.02);
  {
    const back = grp(-1.2, 0.03, -11.9, 0);
    sectionalRun(back, -3.3, 3.2, 1.1, M.oat, true, false, true);
    const chaise = grp(-4.0, 0.03, -10.2, 0);
    RB(M.oat, -0.6, 0.6, 0.06, 0.4, -2.3, 1.9, 0.1, chaise);
    RB(M.oat, -0.59, 0.59, 0.38, 0.56, -2.28, 1.88, 0.12, chaise);
    const cb = RB(M.oat, -0.6, 0.6, 0.4, 0.9, -2.3, -2.0, 0.13, chaise);
    cb.rotation.x = -0.12;
    RB(M.oat, -0.62, -0.4, 0.06, 0.62, -2.3, 1.9, 0.1, chaise);
    // pillows
    pillow(back, -2.6, 0.56, -0.28, 0.55, M.mocha, 0.1);
    pillow(back, -1.7, 0.56, -0.28, 0.5, M.taupe, -0.1);
    pillow(back, -0.6, 0.56, -0.28, 0.5, M.oat, 0.05);
    pillow(back, 0.6, 0.56, -0.28, 0.52, M.mocha, -0.08);
    pillow(back, 1.7, 0.56, -0.28, 0.5, M.taupe, 0.1);
    pillow(back, 2.6, 0.56, -0.28, 0.45, M.oat, -0.05);
    pillow(chaise, 0, 0.56, -1.95, 0.5, M.mocha, 0);
    // knit throw over the chaise
    const t1 = RB(M.knit, -0.62, 0.62, 0.56, 0.6, 0.2, 1.3, 0.02, chaise);
    t1.rotation.z = 0.04;
    RB(M.knit, 0.6, 0.64, 0.12, 0.58, 0.2, 1.3, 0.02, chaise);
  }
  RB(M.emperador, -2.4, 0.9, 0.03, 0.42, -10.1, -8.4, 0.02);
  candle(-1.9, 0.42, -9.0, 0.1);
  candle(-0.1, 0.42, -9.4, 0.14);
  candle(0.4, 0.42, -8.9, 0.1);
  booksStack(-0.9, 0.42, -8.9, 0.3, 3);
  lathe(M.bronze, [[0, 0], [0.2, 0], [0.26, 0.06], [0.24, 0.08], [0, 0.03]], -1.4, 0.42, -9.5, 32);
  vase(-0.7, 0.42, -9.6, 1.1, M.bronze, true);
  barrelChair(2.6, -7.3, -2.2);
  barrelChair(3.9, -9.4, -1.7);
  lathe(M.emperador, [[0, 0], [0.26, 0], [0.26, 0.55], [0, 0.55]], 3.6, 0.03, -7.9, 40);
  candle(3.6, 0.58, -7.9, 0.1);
  // Olive tree in a stone planter by the glass
  pot(5.2, 0, -12.6, 0.55, 0.9);
  olive(5.2, 0.85, -12.6, 0.8);
  pot(-6.2, 0, -12.9, 0.4, 0.7, M.ceramic);
  leafCluster(-6.2, 1.3, -12.9, 0.5, 160, 0x607552, 0.07);
  // Chandeliers: entrance hall and living
  crystalChandelier(0, H - 0.02, -3, 1.0);
  crystalChandelier(-0.7, H - 0.02, -9.2, 1.15);
  // Floor vases in the hall
  vase(-5.8, 0, -1.6, 2.4, M.stonePot, true);
  vase(5.8, 0, -1.6, 2.4, M.stonePot, true);

  /* =========================================================
     WEST WING — kitchen & dining (upper floor above)
     x -20..-7, z -14..-1, ceiling 3.8
     ========================================================= */
  const HW = 3.8;
  R(M.stone, -20.4, -7.4, 0, HW, -1.4, -1, { tile: 1.6 }); // front wall
  R(M.plaster, -20, -7.4, HW - 0.02, HW, -14, -1.4);
  cove(-19.9, -7.5, HW - 0.02, -13.9, -1.5);
  downlights(-19.5, -7.5, -13.5, -1.5, HW - 0.02, 2.1);
  glazing("z", -14, -20, -7.4, 0, HW, 5, []);
  curtain("z", -13.8, -8.6, -7.5, 0.02, HW - 0.1, 5);
  // Walnut end wall with ovens, wine fridge, slab backsplash and uppers
  const KX = -19.6;
  R(M.walnut, KX, KX + 0.65, 0, HW - 0.02, -4.8, -1.5, { tile: 2 }); // tall pantry left
  R(M.walnut, KX, KX + 0.65, 0, HW - 0.02, -13.8, -10.3, { tile: 2 }); // tall right
  for (let z = -4.8; z <= -1.5; z += 0.55) R(M.black, KX + 0.65, KX + 0.66, 0, HW - 0.02, z - 0.004, z + 0.004);
  for (let z = -13.8; z <= -10.3; z += 0.58) R(M.black, KX + 0.65, KX + 0.66, 0, HW - 0.02, z - 0.004, z + 0.004);
  // ovens
  for (const y of [1.0, 1.75]) {
    R(M.black, KX + 0.64, KX + 0.67, y, y + 0.65, -3.9, -3.1);
    R(M.brass, KX + 0.67, KX + 0.69, y + 0.55, y + 0.57, -3.8, -3.2);
  }
  // wine fridge
  R(M.ledSoft, KX + 0.1, KX + 0.12, 0.2, 2.6, -2.9, -2.0);
  R(M.glass, KX + 0.66, KX + 0.68, 0.2, 2.6, -2.9, -2.0);
  for (let y = 0.35; y < 2.55; y += 0.18) {
    R(M.walnutH, KX + 0.12, KX + 0.62, y - 0.01, y, -2.88, -2.02);
    for (let z = -2.8; z < -2.05; z += 0.12) {
      const b = cyl(std({ color: rnd() < 0.5 ? 0x2a0d12 : 0x1d2a18, roughness: 0.2 }), 0.035, 0.035, 0.3, KX + 0.4, y + 0.04, z, 8);
      b.rotation.z = Math.PI / 2;
    }
  }
  // base run + counter + slab backsplash + uppers
  R(M.walnut, KX, KX + 0.62, 0.1, 0.9, -10.3, -4.8);
  R(M.black, KX, KX + 0.58, 0, 0.1, -10.3, -4.8);
  R(M.quartzite, KX, KX + 0.66, 0.9, 0.94, -10.3, -4.8, { tile: 2.4 });
  R(M.quartzite, KX, KX + 0.03, 0.94, 2.25, -10.3, -4.8, { tile: 2.4 });
  R(M.black, KX + 0.3, KX + 0.62, 0.941, 0.95, -8.3, -7.1); // cooktop
  R(M.walnut, KX, KX + 0.4, 2.25, 3.2, -10.3, -4.8, { tile: 2 });
  R(M.led, KX + 0.3, KX + 0.4, 2.24, 2.25, -10.3, -4.8);
  R(M.quartzite, KX, KX + 0.03, 3.2, HW - 0.02, -10.3, -4.8, { tile: 2.4 });
  vase(KX + 0.35, 0.94, -5.4, 0.8, M.stonePot, true);
  for (const z of [-9.4, -9.2]) cyl(std({ color: 0x2c1a10, roughness: 0.2 }), 0.035, 0.035, 0.3, KX + 0.3, 0.94, z, 12);
  lathe(M.walnutH, [[0, 0], [0.18, 0], [0.18, 0.02], [0, 0.02]], KX + 0.35, 0.94, -9.9, 32).rotation.z = 0;
  // Waterfall quartzite island with LED toe-kick
  R(M.quartzite, -16, -15.9, 0, 0.95, -6.8, -5.0, { tile: 1.4 });
  R(M.quartzite, -11.1, -11.0, 0, 0.95, -6.8, -5.0, { tile: 1.4 });
  R(M.quartzite, -16, -11.0, 0.9, 0.97, -6.8, -5.0, { tile: 1.4 });
  R(M.walnut, -15.9, -11.1, 0.08, 0.9, -6.4, -5.1);
  R(M.quartzite, -15.9, -11.1, 0.08, 0.9, -5.1, -5.0, { tile: 1.4 });
  R(M.led, -15.9, -11.1, 0.0, 0.03, -6.45, -6.4);
  R(M.black, -14.2, -13.4, 0.965, 0.975, -6.2, -5.5); // sink
  tube(M.bronze, [[-13.8, 0.97, -5.3], [-13.8, 1.35, -5.3], [-13.8, 1.45, -5.5], [-13.8, 1.3, -5.75]], 0.016, root, 20, 8);
  lathe(M.bronze, [[0, 0], [0.32, 0], [0.4, 0.06], [0.38, 0.08], [0, 0.03]], -12.2, 0.97, -5.8, 40);
  leafCluster(-12.2, 1.08, -5.8, 0.28, 80, 0x6a7a50, 0.05, [1, 0.35, 1]);
  vase(-11.7, 0.97, -5.4, 0.9, M.stonePot, true);
  // Bouclé bar stools with bronze frames
  for (const x of [-15, -13.9, -12.8, -11.7]) {
    const g = grp(x, 0, -7.35, Math.PI);
    for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) R(M.bronze, lx - 0.012, lx + 0.012, 0, 0.72, lz - 0.012, lz + 0.012, { parent: g });
    R(M.bronze, -0.2, 0.2, 0.28, 0.3, -0.21, -0.19, { parent: g });
    RB(M.boucle, -0.25, 0.25, 0.68, 0.8, -0.24, 0.24, 0.06, g);
    const back = lathe(M.boucle, [[0.22, 0], [0.26, 0.05], [0.26, 0.3], [0.2, 0.34], [0.18, 0.3], [0.18, 0.05]], 0, 0.78, 0, 32, g);
    back.scale.set(1, 1, 1);
    back.geometry = new THREE.LatheGeometry([[0.22, 0], [0.26, 0.05], [0.26, 0.3], [0.2, 0.34], [0.18, 0.3], [0.18, 0.05]].map(([a, b]) => new THREE.Vector2(a, b)), 32, Math.PI * 0.15, Math.PI * 0.7);
    back.rotation.y = Math.PI * 0.5;
  }
  // Glass cylinder pendants
  for (const x of [-15, -13.5, -12]) glassPendant(x, 2.2, -5.9);
  // Dining by the glass
  RB(M.walnutH, -17.2, -12.4, 0.72, 0.78, -12.4, -10.6, 0.02);
  for (const x of [-16.2, -13.4]) R(M.bronze, x - 0.1, x + 0.1, 0, 0.72, -11.8, -11.2);
  for (const x of [-16.6, -15.4, -14.2, -13]) {
    for (const [z, rot] of [[-10.1, 0], [-12.9, Math.PI]]) {
      const g = grp(x, 0, z, rot);
      for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.2], [0.2, 0.2]]) {
        const leg = cyl(M.walnutH, 0.018, 0.013, 0.46, lx, 0, lz, 10, g);
        leg.rotation.set(lz * 0.2, 0, -lx * 0.2);
      }
      RB(M.oat, -0.25, 0.25, 0.44, 0.54, -0.22, 0.26, 0.05, g);
      const b = RB(M.oat, -0.26, 0.26, 0.5, 0.95, 0.18, 0.28, 0.06, g);
      b.rotation.x = 0.1;
    }
  }
  vase(-14.8, 0.78, -11.5, 1.0, M.ceramic, true);
  for (const x of [-16, -13.6]) candle(x, 0.78, -11.5, 0.14);
  // linear pendant over the dining table
  R(M.bronze, -16.8, -12.8, 2.35, 2.4, -11.55, -11.45);
  for (let i = 0; i < 10; i++) {
    const x = -16.6 + i * 0.42;
    R(M.black, x - 0.004, x + 0.004, 2.4, HW, -11.504, -11.496);
    cyl(M.crystal, 0.03, 0.03, 0.35, x, 2.0, -11.5, 10);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.bulb);
    b.position.set(x, 2.02, -11.5);
    root.add(b);
  }

  /* =========================================================
     EAST WING — master suite (upper floor above)
     x 7..20, z -14..-1, ceiling 3.6
     ========================================================= */
  const HE = 3.6;
  R(M.stone, 7.4, 20.4, 0, HE, -1.4, -1, { tile: 1.6 });
  R(M.stone, 20, 20.4, 0, HE, -8, -1.4, { tile: 1.6 });
  // ceiling tray with cove
  R(M.plaster, 7.4, 20, HE - 0.02, HE, -14, -1.4);
  R(M.plaster, 8.6, 18.8, HE - 0.35, HE - 0.3, -12.8, -2.6);
  R(M.ledSoft, 8.6, 18.8, HE - 0.36, HE - 0.35, -12.8, -12.75);
  R(M.ledSoft, 8.6, 18.8, HE - 0.36, HE - 0.35, -2.65, -2.6);
  downlights(8, 19.5, -13.5, -1.5, HE - 0.02, 2.4);
  // Suite glass: sea side sliders + corner glass on the east side
  glazing("z", -14, 7.4, 20, 0, HE, 5, []);
  glazing("x", 20.2, -14, -8, 0, HE, 3, []);
  curtain("z", -13.8, 7.5, 8.6, 0.02, HE - 0.1, 5);
  curtain("x", 19.9, -8.4, -7.2, 0.02, HE - 0.1, 5);
  // Stone feature wall behind the bed with relief art & backlit edges
  R(M.stone, 7.4, 7.7, 0, HE, -13.8, -2.9, { tile: 1.6 });
  R(M.led, 7.7, 7.72, 0.05, HE - 0.4, -4.3, -4.25);
  R(M.led, 7.7, 7.72, 0.05, HE - 0.4, -10.75, -10.7);
  R(M.art, 7.7, 7.74, 1.7, 3.1, -8.3, -6.7, { tile: 1.6 });
  // Bed: channel-tufted bouclé headboard, low upholstered base, layered bedding
  for (let i = 0; i < 6; i++) {
    const z0 = -9.2 + i * 0.4;
    RB(M.boucle, 7.72, 7.95, 0.3, 1.45, z0, z0 + 0.39, 0.1);
  }
  RB(M.boucle, 7.9, 10.3, 0.05, 0.45, -9.2, -6.8, 0.12);
  RB(M.linen, 7.95, 10.25, 0.45, 0.7, -9.15, -6.85, 0.1);
  RB(M.linen, 8.6, 10.32, 0.6, 0.76, -9.22, -6.78, 0.12); // duvet
  RB(M.knit, 9.3, 10.0, 0.74, 0.8, -9.3, -6.7, 0.03); // knit throw
  RB(M.knit, 9.3, 10.0, 0.3, 0.76, -9.32, -9.26, 0.02);
  for (const [z, m, w, xo] of [[-8.7, M.linen, 0.6, 0], [-7.3, M.linen, 0.6, 0], [-8.6, M.linen, 0.55, 0.18], [-7.4, M.linen, 0.55, 0.18], [-8.4, M.mocha, 0.45, 0.35], [-7.6, M.mocha, 0.45, 0.35], [-8.0, M.taupe, 0.4, 0.5]]) {
    const p = RB(m, 8.05 + xo, 8.25 + xo, 0.7, 0.7 + w * 0.75, z - w / 2, z + w / 2, 0.08);
    p.rotation.z = -0.3;
  }
  boucleBench(10.5, 11.1, 0, -9.0, -7.0);
  RB(M.knit, 10.45, 11.15, 0.46, 0.5, -8.7, -8.1, 0.02);
  booksStack(10.8, 0.5, -7.5, 0.2, 2);
  // Nightstands with marble tops, lamps and hanging pendants
  for (const z of [-9.9, -6.1]) {
    RB(M.walnutH, 7.75, 8.35, 0, 0.55, z - 0.35, z + 0.35, 0.02);
    R(M.creamMarble, 7.74, 8.36, 0.55, 0.58, z - 0.36, z + 0.36);
    R(M.brass, 8.35, 8.36, 0.28, 0.3, z - 0.2, z + 0.2);
    tableLamp(8.05, 0.58, z, 1.1);
    R(M.black, 8.3, 8.305, 1.6, HE, z - 0.003, z + 0.003);
    cyl(M.brass, 0.05, 0.05, 0.35, 8.3, 1.25, z, 16);
    cyl(M.bulb, 0.04, 0.04, 0.02, 8.3, 1.24, z, 12);
  }
  vase(8.2, 0.58, -10.1, 0.5, M.ceramic, true);
  // Shaggy rug, lounge chair, side table, olive tree, sideboard
  RB(M.rug, 8.6, 13.4, 0, 0.035, -11.2, -4.8, 0.02);
  barrelChair(13.4, -11.4, -0.7);
  lathe(M.bronze, [[0, 0], [0.18, 0], [0.18, 0.02], [0.03, 0.03], [0.03, 0.52], [0.2, 0.53], [0.2, 0.56], [0, 0.56]], 14.2, 0, -12.2, 32);
  vase(14.2, 0.56, -12.2, 0.4, M.ceramic, true);
  pot(11.6, 0, -12.8, 0.45, 0.8);
  olive(11.6, 0.75, -12.8, 0.75);
  RB(M.walnutH, 19.2, 19.8, 0, 0.8, -6.8, -3.2, 0.02);
  R(M.creamMarble, 19.15, 19.85, 0.8, 0.84, -6.85, -3.15);
  vase(19.5, 0.84, -4, 1.0, M.bronze, true);
  booksStack(19.5, 0.84, -5.8, 1.5, 3);
  // Door from the living room corridor
  R(M.plaster, 7.4, 8.4, 2.9, HE, -2.8, -0.9);

  /* =========================================================
     UPPER FLOORS (exterior) — over both wings, with cantilevered terraces
     ========================================================= */
  for (const [x0, x1, y0] of [[-20.4, -7.4, HW], [7.4, 20.4, HE]]) {
    const y1 = 7.2;
    R(M.render, x0, x1, y0, y0 + 0.35, -17.6, -0.6); // slab + cantilever
    R(M.fascia, x0, x1, y0, y0 + 0.35, -17.7, -17.6);
    R(M.soffit, x0 + 0.05, x1 - 0.05, y0 - 0.01, y0, -17.55, -14);
    for (let x = x0 + 1; x < x1 - 0.5; x += 1.8) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), M.bulb);
      d.rotation.x = Math.PI / 2;
      d.position.set(x, y0 - 0.012, -16.8);
      root.add(d);
    }
    R(M.deck, x0 + 0.1, x1 - 0.1, y0 + 0.35, y0 + 0.37, -17.5, -14);
    R(M.glass, x0 + 0.1, x1 - 0.1, y0 + 0.37, y0 + 1.45, -17.56, -17.52);
    R(M.brass, x0 + 0.1, x1 - 0.1, y0 + 1.43, y0 + 1.46, -17.57, -17.51).visible = false;
    // lit rooms behind glass
    R(M.roomGlow, x0 + 0.5, x1 - 0.5, y0 + 0.37, y1, -12.5, -12.4, {});
    glazing("z", -14, x0 + 0.3, x1 - 0.3, y0 + 0.37, y1, 5, []);
    R(M.roomGlow, x0 + 0.5, x1 - 0.5, y0 + 0.37, y1, -2.2, -2.1, {});
    glazing("z", -0.8, x0 + 1.2, x1 - 1.2, y0 + 0.37, y1, 4, []);
    R(M.stone, x0, x0 + 1.2, y0 + 0.35, y1, -1, -0.6, { tile: 1.6 });
    R(M.stone, x1 - 1.2, x1, y0 + 0.35, y1, -1, -0.6, { tile: 1.6 });
    R(M.stone, x0 - 0.01, x0 + 0.4, 0, y1, -14, -1, { tile: 1.6 });
    R(M.stone, x1 - 0.4, x1 + 0.01, y0, y1, -14, -1, { tile: 1.6 });
    R(M.plaster, x0 + 0.3, x1 - 0.3, y0 + 0.37, y1, -12.6, -12.5).visible = false;
    roof(x0 - 0.3, x1 + 0.3, y1, -18.2, 0.4);
    // balcony furniture
    for (let i = 0; i < 2; i++) {
      const cx = x0 + 3 + i * 2.4;
      const g = grp(cx, y0 + 0.37, -16.2, Math.PI);
      RB(M.linen, -0.42, 0.42, 0.2, 0.42, -0.4, 0.4, 0.08, g);
      const b = RB(M.linen, -0.42, 0.42, 0.35, 0.8, 0.28, 0.42, 0.08, g);
      b.rotation.x = 0.15;
      R(M.teak, -0.42, 0.42, 0, 0.2, -0.4, 0.4, { parent: g });
    }
    pot(x1 - 1.6, y0 + 0.37, -16.6, 0.4, 0.7);
    olive(x1 - 1.6, y0 + 1.0, -16.6, 0.6);
  }
  // Tall stone chimney/piers between volumes
  R(M.stone, -7.6, -7, HW, H, -14.3, -13.7, { tile: 1.6 });
  R(M.stone, 7, 7.6, HE, H, -14.3, -13.7, { tile: 1.6 });

  /* =========================================================
     TERRACE & INFINITY POOL
     ========================================================= */
  R(M.deck, -22, 22, -0.3, 0, -18.4, -14, { tile: 1.6 });
  R(M.deck, -22, -13.2, -0.3, 0, -28, -18.4, { tile: 1.6 });
  R(M.deck, 11, 22, -0.3, 0, -28, -18.4, { tile: 1.6 });
  // Pool basin (x -13.2..9, z -18.4..-26.6)
  R(M.mosaic, -13.2, 9, -1.6, -1.5, -26.6, -18.4, { tile: 1 });
  R(M.mosaic, -13.2, -13.1, -1.6, -0.02, -26.6, -18.4, { tile: 1 });
  R(M.mosaic, -13.2, 9, -1.6, -0.02, -18.5, -18.4, { tile: 1 });
  for (const x of [-10, -5, 0, 5]) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), M.bulb);
    l.position.set(x, -0.6, -18.39);
    root.add(l);
  }
  const pool = R(M.water, -13.1, 9.05, -0.1, -0.06, -26.65, -18.45);
  // Infinity edges spilling into a lower trough on the east and south sides
  R(M.deck, 9.05, 9.25, -1.5, -0.08, -26.8, -18.4, { tile: 1.2 }); // weir wall east
  R(M.deck, -13.2, 9.25, -1.5, -0.08, -26.85, -26.65, { tile: 1.2 }); // weir wall south
  const fallE = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 1.3), M.fall);
  fallE.rotation.y = Math.PI / 2;
  fallE.position.set(9.28, -0.75, -22.55);
  root.add(fallE);
  const fallS = new THREE.Mesh(new THREE.PlaneGeometry(22.4, 1.3), M.fall);
  fallS.position.set(-2.1, -0.75, -26.88);
  root.add(fallS);
  R(M.mosaic, 9.25, 11, -1.45, -1.4, -28, -18.4, { tile: 1 });
  R(M.water, 9.25, 11, -1.4, -1.36, -28, -18.4);
  R(M.mosaic, -13.2, 11, -1.45, -1.4, -28, -26.85, { tile: 1 });
  R(M.water, -13.2, 9.25, -1.4, -1.36, -28, -26.85);
  R(M.stone, -22, 22, -2.6, -1.4, -28.3, -28, { tile: 1.6 }); // outer retaining wall
  R(M.stone, 10.95, 11.2, -1.45, 0, -28, -18.4, { tile: 1.6 });
  for (let z = -27.5; z < -18.5; z += 1.5) uplight(10.2, -1.4, z);
  // Glass balustrade along the terrace edge
  R(M.glass, -22, -13.2, 0, 1.05, -28.02, -27.98);
  R(M.glass, 11.2, 22, 0, 1.05, -28.02, -27.98);
  // Daybeds on the pool deck, with lanterns
  for (const [x, rot] of [[-11.2, 0.18], [-8.4, 0.08], [-5.6, 0]]) daybed(x, -16.2, rot + Math.PI);
  for (const x of [-12.7, -9.8, -7.0, -4.2]) lantern(x, 0, -17.6, rr(0.45, 0.6));
  lathe(M.teak, [[0, 0], [0.25, 0], [0.25, 0.45], [0, 0.45]], -9.8, 0, -15.1, 24);
  vase(-9.8, 0.45, -15.1, 0.6, M.ceramic, true);
  // Outdoor lounge with fire table under the east cantilever
  {
    const g = grp(15.5, 0, -15.3, 0);
    R(M.teak, -2.4, 2.4, 0, 0.12, -0.5, 0.5, { parent: g });
    sectionalRun(g, -2.3, 2.3, 1.0, M.linen, true, true, true);
    for (const [x, m] of [[-1.6, M.mocha], [-0.6, M.taupe], [0.5, M.mocha], [1.5, M.taupe]]) pillow(g, x, 0.56, -0.26, 0.48, m, rr(-0.1, 0.1));
    RB(M.linen, 0.9, 2.3, 0.06, 0.52, 0.5, 2.1, 0.1, g); // return
  }
  RB(M.stone, 13.4, 16.4, 0, 0.42, -17.6, -16.4, 0.03);
  R(M.black, 13.8, 16.0, 0.42, 0.43, -17.2, -16.8);
  const fireTable = [];
  for (let i = 0; i < 12; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 6), M.fire);
    f.position.set(13.9 + i * 0.18, 0.56, -17 + (i % 2) * 0.1);
    f.userData.seed = rnd() * 10;
    root.add(f);
    flames.push(f);
    fireTable.push(f);
  }
  for (const [x, z] of [[12.4, -17.2], [18.2, -17.3]]) {
    RB(M.linen, x - 0.45, x + 0.45, 0.12, 0.45, z - 0.45, z + 0.45, 0.1);
    R(M.teak, x - 0.45, x + 0.45, 0, 0.12, z - 0.45, z + 0.45);
  }
  // Big pots with olive trees on the terrace
  for (const [x, z, s] of [[-2.6, -15.2, 1], [8.6, -16.8, 0.9], [20.6, -19.5, 1.05], [-14.6, -19.8, 0.95]]) {
    pot(x, 0, z, 0.55, 0.95);
    olive(x, 0.9, z, s * 0.85);
  }
  // Planting beds on the terrace edge with lavender and agaves
  planterBox(-22, -14.6, -27.9, -26.4, 0, 0.5, false);
  lavender(-21.8, -14.8, -27.8, -26.5, 0.5, lite ? 120 : 300);
  planterBox(12, 22, -27.9, -26.4, 0, 0.5, false);
  lavender(12.2, 21.8, -27.8, -26.5, 0.5, lite ? 120 : 300);
  agave(-19, 0.5, -27.1, 0.9);
  agave(17, 0.5, -27.1, 0.9);
  shrubs(-21.8, -14.8, -27.8, -26.5, 0.5, 18, 0x56663f, 0.3);

  /* ---------- Lights ---------- */
  const L = {
    hall: pointLight(0xffc98a, 40, 16, 0, 5.5, -3),
    living: pointLight(0xffc27a, 55, 18, -0.7, 5, -9.2),
    fire: pointLight(0xff8a3a, 14, 7, 5.9, 0.9, -8),
    kitchen: pointLight(0xffd29a, 26, 12, -13.5, 2.6, -6),
    dining: pointLight(0xffc27a, 16, 8, -14.8, 2.2, -11.5),
    suite: pointLight(0xffc88a, 22, 12, 11, 2.8, -7.5),
    lamps: pointLight(0xffc27a, 10, 5, 8.2, 1.3, -8),
    soffitFront: pointLight(0xffc98a, 30, 14, 0, 6.8, 1.2),
    stairs: pointLight(0xffc98a, 12, 8, 0, 0.2, 6),
    pool: pointLight(0x5fe0ff, 30, 14, -2, -0.9, -22.5),
    lounge: pointLight(0xff9a50, 14, 8, 15, 1.0, -16.8),
  };

  // Shadows from the sun on all opaque geometry
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    const opaque = m && !m.transparent && !m.isMeshBasicMaterial;
    o.castShadow = opaque;
    o.receiveShadow = opaque;
  });

  function update(t) {
    for (const f of flames) {
      const s = f.userData.seed;
      f.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(t * 5.1 + s) * Math.sin(t * 2.3 + s * 1.7));
    }
    L.fire.intensity = 12 + Math.sin(t * 13) * 1.5 + Math.sin(t * 7.1) * 2;
    L.lounge.intensity = 12 + Math.sin(t * 11) * 2;
    waterN.offset.set(t * 0.012, t * 0.008);
    M.fall.map.offset.y = t * 0.8;
    pool.position.y = -0.08 + Math.sin(t * 1.2) * 0.003;
  }

  return { root, doors: [doorL, doorR], update };
}
