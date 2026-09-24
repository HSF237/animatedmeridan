import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* =========================================================
   MERIDIAN VILLA — a procedural luxury residence at dusk.
   Units are metres. The front door faces +z; the house runs
   back to a glass wall at z = -22 and an infinity terrace beyond.
   ========================================================= */

// Deterministic random so the villa looks the same on every load
let seed = 20090;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + rnd() * (b - a);

/* ---------- Procedural textures ---------- */
function canvasTexture(size, draw, { rotate = false, srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (rotate) {
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
  }
  return t;
}

function veins(ctx, s, count, color, alpha, step = 12, width = [0.5, 3]) {
  ctx.lineCap = "round";
  ctx.filter = "blur(0.7px)";
  for (let i = 0; i < count; i++) {
    let x = rnd() * s, y = rnd() * s, a = rnd() * Math.PI * 2;
    ctx.lineWidth = rr(width[0], width[1]);
    ctx.strokeStyle = `rgba(${color},${alpha * rr(0.35, 1)})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 30 + ((rnd() * 70) | 0);
    for (let k = 0; k < steps; k++) {
      a += (rnd() - 0.5) * 0.55;
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.filter = "none";
}

function marbleTex(base, vein, count, alpha, grout = true) {
  return canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 30; i++) {
      const x = rnd() * s, y = rnd() * s, r = rr(120, 440);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${vein},0.05)`);
      g.addColorStop(1, `rgba(${vein},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
    veins(ctx, s, count, vein, alpha);
    if (grout) {
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, s, s);
    }
  });
}

function onyxTex() {
  return canvasTexture(1024, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#e6a652");
    g.addColorStop(0.5, "#f3c77e");
    g.addColorStop(1, "#c9812f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(${rnd() < 0.5 ? "120,60,15" : "255,236,200"},${rr(0.12, 0.35)})`;
      ctx.lineWidth = rr(8, 40);
      ctx.beginPath();
      const y0 = rnd() * s;
      ctx.moveTo(-50, y0);
      for (let x = 0; x <= s + 50; x += 64) ctx.lineTo(x, y0 + Math.sin(x * 0.01 + i) * rr(20, 80));
      ctx.stroke();
    }
    veins(ctx, s, 60, "110,55,10", 0.5, 10, [0.5, 2]);
    veins(ctx, s, 40, "255,245,225", 0.6, 10, [0.5, 2]);
  });
}

function woodTex(base, planks = 0, rotate = false) {
  return canvasTexture(1024, (ctx, s) => {
    for (let y = 0; y < s; y++) {
      const n = Math.sin(y * 0.045 + Math.sin(y * 0.013) * 3) * 0.5 + 0.5;
      const k = 0.78 + n * 0.22 + (rnd() - 0.5) * 0.06;
      ctx.fillStyle = `rgb(${(base[0] * k) | 0},${(base[1] * k) | 0},${(base[2] * k) | 0})`;
      ctx.fillRect(0, y, s, 1);
    }
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(20,10,5,${rnd() * 0.14})`;
      ctx.fillRect(rnd() * s, rnd() * s, rr(80, 500), rr(1, 3));
    }
    if (planks) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      const ph = s / planks;
      for (let i = 0; i < planks; i++) {
        ctx.fillRect(0, i * ph, s, 2);
        ctx.fillRect(rnd() * s, i * ph, 2, ph);
      }
    }
  }, { rotate });
}

function travertineTex() {
  return canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = "#d2c4ab";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 520; i++) {
      ctx.fillStyle = rnd() < 0.5 ? `rgba(255,248,235,${rnd() * 0.18})` : `rgba(120,100,75,${rnd() * 0.14})`;
      ctx.fillRect(0, rnd() * s, s, rr(1, 6));
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(95,78,58,${rr(0.15, 0.45)})`;
      ctx.fillRect(rnd() * s, rnd() * s, rr(2, 14), rr(1, 3));
    }
    ctx.strokeStyle = "rgba(60,50,40,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, s, s);
  });
}

function artTex(palette) {
  return canvasTexture(1024, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, palette[0]);
    g.addColorStop(1, palette[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = palette[2];
    ctx.beginPath();
    ctx.arc(s * 0.62, s * 0.46, s * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = palette[3 + (i % 3)];
      ctx.globalAlpha = rr(0.45, 0.9);
      ctx.lineWidth = rr(8, 56);
      ctx.beginPath();
      ctx.arc(s * rr(0.3, 0.7), s * rr(0.4, 0.7), s * rr(0.2, 0.55), rr(0, 6), rr(0, 6) + 1.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // canvas weave
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "0,0,0"},0.04)`;
      ctx.fillRect(rnd() * s, rnd() * s, 2, 2);
    }
  });
}

function rugTex() {
  return canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = "#4a433d";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 16000; i++) {
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? "255,240,220" : "0,0,0"},${rnd() * 0.07})`;
      ctx.fillRect(rnd() * s, rnd() * s, 2, 3);
    }
    // soft abstract pattern
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#cdb48a";
    ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.ellipse(s * 0.5, s * 0.5, 60 + i * 30, 40 + i * 22, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(210,180,130,0.55)";
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, s - 80, s - 80);
  });
}

// Greyscale noise used as a bump map for fabrics, leather and stone
function noiseTex(size, grain, soft = 0) {
  const t = canvasTexture(size, (ctx, s) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s * s * 0.25; i++) {
      const v = (rnd() * 255) | 0;
      ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
      ctx.fillRect(rnd() * s, rnd() * s, grain, grain);
    }
    if (soft) {
      ctx.filter = `blur(${soft}px)`;
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.filter = "none";
    }
  }, { srgb: false });
  return t;
}

function frondTex() {
  return canvasTexture(512, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = "#3f5a2e";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, s / 2);
    ctx.lineTo(s, s / 2);
    ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * s;
      const len = Math.sin((i / 60) * Math.PI) * s * 0.46 + 10;
      ctx.strokeStyle = `rgb(${50 + rnd() * 30},${80 + rnd() * 40},${40 + rnd() * 20})`;
      ctx.lineWidth = 7;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, s / 2);
        ctx.quadraticCurveTo(x + 30, s / 2 + dir * len * 0.5, x + 55, s / 2 + dir * len);
        ctx.stroke();
      }
    }
  });
}

function barkTex() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = "#6b5a48";
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) {
      ctx.fillStyle = `rgba(40,30,20,${rr(0.3, 0.6)})`;
      ctx.fillRect(0, y, s, rr(2, 4));
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? "150,130,110" : "30,22,15"},0.3)`;
      ctx.fillRect(rnd() * s, rnd() * s, rr(2, 10), 1);
    }
  });
}

function waterfallTex() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = `rgba(200,225,255,${rr(0.05, 0.35)})`;
      ctx.fillRect(rnd() * s, rnd() * s, rr(1, 2), rr(20, 90));
    }
  });
}

// Scale BoxGeometry UVs so textures keep a constant real-world size
function scaleBoxUV(geo, w, h, d, tile) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
    }
  }
}

export function buildVilla(scene, { nightEnv, lite = false }) {
  const root = new THREE.Group();
  scene.add(root);
  const animated = [];

  /* ---------- Materials ---------- */
  const ENV = 0.35;
  const std = (o) => new THREE.MeshStandardMaterial({ envMapIntensity: ENV, ...o });
  const phys = (o) => new THREE.MeshPhysicalMaterial({ envMapIntensity: ENV, ...o });
  const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });

  const boucleBump = noiseTex(256, 3, 0.6);
  boucleBump.repeat.set(5, 5);
  const velvetBump = noiseTex(256, 1, 0.8);
  velvetBump.repeat.set(4, 4);
  const leatherBump = noiseTex(256, 2, 1.2);
  leatherBump.repeat.set(3, 3);
  const linenBump = noiseTex(256, 1, 0);
  linenBump.repeat.set(8, 8);

  const M = {
    marbleFloor: phys({ map: marbleTex("#ebe7e1", "110,104,98", 26, 0.45), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.5 }),
    marble: phys({ map: marbleTex("#f1eee9", "120,112,104", 40, 0.55, false), roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    calacatta: phys({ map: marbleTex("#f3f0ea", "150,120,80", 22, 0.7, false), roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    nero: phys({ map: marbleTex("#0f0f11", "235,230,220", 30, 0.35, false), roughness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.1 }),
    travertine: std({ map: travertineTex(), roughness: 0.8 }),
    walnut: std({ map: woodTex([92, 58, 36]), roughness: 0.5 }),
    walnutV: std({ map: woodTex([92, 58, 36], 0, true), roughness: 0.5 }),
    oakFloor: phys({ map: woodTex([150, 112, 76], 8), roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    plaster: std({ color: 0xe7e2da, roughness: 0.95 }),
    charcoal: std({ color: 0x1d1e21, roughness: 0.6, metalness: 0.3 }),
    black: std({ color: 0x0c0c0d, roughness: 0.35, metalness: 0.6 }),
    brass: std({ color: 0xcaa468, roughness: 0.26, metalness: 1, envMapIntensity: 1 }),
    bronze: std({ color: 0x4a3a2a, roughness: 0.4, metalness: 0.9, envMapIntensity: 0.8 }),
    lacquer: phys({ color: 0x050506, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1 }),
    ivoryKey: std({ color: 0xf4f1ea, roughness: 0.3 }),
    boucle: phys({ color: 0xe8dfd0, roughness: 1, sheen: 1, sheenColor: 0xfff5e6, sheenRoughness: 0.8, bumpMap: boucleBump, bumpScale: 2.5 }),
    velvet: phys({ color: 0x28433c, roughness: 0.85, sheen: 1, sheenColor: 0x8fb5a6, sheenRoughness: 0.35, bumpMap: velvetBump, bumpScale: 0.6 }),
    velvetRust: phys({ color: 0x7a3a22, roughness: 0.85, sheen: 1, sheenColor: 0xe0a080, sheenRoughness: 0.35, bumpMap: velvetBump, bumpScale: 0.6 }),
    linen: phys({ color: 0xf2eee7, roughness: 1, sheen: 0.6, sheenColor: 0xffffff, sheenRoughness: 0.9, bumpMap: linenBump, bumpScale: 0.8 }),
    taupe: phys({ color: 0xa89886, roughness: 1, sheen: 0.8, sheenColor: 0xe8dccb, sheenRoughness: 0.7, bumpMap: linenBump, bumpScale: 0.8 }),
    cognac: phys({ color: 0x7a4526, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.45, bumpMap: leatherBump, bumpScale: 0.5 }),
    ceramic: phys({ color: 0xece7de, roughness: 0.35, clearcoat: 0.6 }),
    ceramicDark: phys({ color: 0x2a2622, roughness: 0.5, clearcoat: 0.4 }),
    stoneTub: phys({ color: 0xf4f2ed, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.08 }),
    rug: std({ map: rugTex(), roughness: 1 }),
    art1: std({ map: artTex(["#1b1714", "#2b221b", "#0b0a09", "#e3c07a", "#b8864a", "#efe6d6"]), roughness: 0.9 }),
    art2: std({ map: artTex(["#e9e2d6", "#cfc4b2", "#8a6c4c", "#1c1a18", "#b07a4a", "#5b6e6a"]), roughness: 0.9 }),
    leaf: std({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide }),
    bark: std({ map: barkTex(), roughness: 1 }),
    frond: std({ map: frondTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }),
    ground: std({ color: 0x0f130f, roughness: 1 }),
    lawn: std({ color: 0x17221a, roughness: 1 }),
    rock: std({ color: 0x0c0d0f, roughness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x9fb8c6, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.13,
      envMap: nightEnv, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide,
    }),
    sheer: phys({ color: 0xf4efe6, roughness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, sheen: 1, sheenColor: 0xffffff, depthWrite: false }),
    mirrorWater: std({ color: 0x020305, roughness: 0.03, metalness: 1, envMap: nightEnv, envMapIntensity: 1.6 }),
    poolWater: new THREE.MeshStandardMaterial({
      color: 0x1aa3c7, emissive: 0x0a6f8c, emissiveIntensity: 1.1, roughness: 0.05, metalness: 0.1,
      transparent: true, opacity: 0.82, envMap: nightEnv, envMapIntensity: 1,
    }),
    tubWater: new THREE.MeshStandardMaterial({ color: 0x9cc8d6, roughness: 0.02, metalness: 0.2, transparent: true, opacity: 0.6, envMap: nightEnv }),
    poolTile: glow(0.05, 0.55, 0.7),
    onyx: new THREE.MeshBasicMaterial({ map: onyxTex(), color: new THREE.Color(1.5, 1.2, 0.85) }),
    waterfall: new THREE.MeshBasicMaterial({ map: waterfallTex(), color: new THREE.Color(1.2, 1.4, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    led: glow(3.2, 2.3, 1.4),
    ledSoft: glow(1.5, 1.05, 0.62),
    ledDim: glow(0.55, 0.36, 0.2),
    bulb: glow(5, 3.6, 2.2),
    flame: glow(5, 2.4, 0.6),
    fire: glow(4, 1.6, 0.35),
    shade: std({ color: 0xf1e6d2, emissive: 0xffc98a, emissiveIntensity: 0.9, roughness: 1, side: THREE.DoubleSide }),
  };

  /* ---------- Geometry helpers ---------- */
  function R(mat, x0, x1, y0, y1, z0, z1, { tile = 1.2, parent = root } = {}) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const geo = new THREE.BoxGeometry(w, h, d);
    if (mat.map) scaleBoxUV(geo, w, h, d, tile);
    const m = new THREE.Mesh(geo, mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    parent.add(m);
    return m;
  }
  // Rounded box by extents — the workhorse for upholstery
  function RB(mat, x0, x1, y0, y1, z0, z1, r = 0.04, parent = root, seg = 3) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    parent.add(m);
    return m;
  }
  function cyl(mat, rt, rb, h, x, y, z, seg = 24, parent = root) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
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
  function tube(mat, pts, radius, parent = root, seg = 48, radial = 10) {
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
  function spot(color, intensity, x, y, z, tx, ty, tz, angle = 0.8, shadow = true) {
    const l = new THREE.SpotLight(color, intensity, 16, angle, 0.9, 2);
    l.position.set(x, y, z);
    l.target.position.set(tx, ty, tz);
    root.add(l, l.target);
    if (shadow && !lite) {
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.0004;
      l.shadow.normalBias = 0.02;
      l.shadow.camera.near = 0.5;
      l.shadow.camera.far = 14;
    }
    return l;
  }
  const mtx = new THREE.Matrix4();
  const col = new THREE.Color();
  const q = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();

  /* =========================================================
     FURNITURE & DECOR
     ========================================================= */
  function sofa(x, z, len, rot, mat = M.boucle, depth = 1.1) {
    const g = grp(x, 0, z, rot);
    const hd = depth / 2;
    R(M.black, -len / 2 + 0.08, len / 2 - 0.08, 0, 0.09, -hd + 0.08, hd - 0.08, { parent: g });
    RB(mat, -len / 2, len / 2, 0.09, 0.4, -hd, hd, 0.06, g);
    const n = Math.max(2, Math.round((len - 0.44) / 1.05));
    const cw = (len - 0.44) / n;
    for (let i = 0; i < n; i++) {
      const x0 = -len / 2 + 0.22 + i * cw;
      RB(mat, x0 + 0.01, x0 + cw - 0.01, 0.38, 0.58, -hd + 0.3, hd - 0.02, 0.08, g);
      const back = RB(mat, x0 + 0.01, x0 + cw - 0.01, 0.4, 0.95, -hd + 0.02, -hd + 0.3, 0.11, g);
      back.rotation.x = -0.13;
    }
    RB(mat, -len / 2, -len / 2 + 0.24, 0.09, 0.68, -hd, hd, 0.1, g);
    RB(mat, len / 2 - 0.24, len / 2, 0.09, 0.68, -hd, hd, 0.1, g);
    // Throw pillows
    const pillows = [M.velvet, M.taupe, M.velvetRust, M.linen];
    for (let i = 0; i < Math.min(4, n + 1); i++) {
      const px = -len / 2 + 0.45 + (i * (len - 0.9)) / Math.max(1, Math.min(3, n));
      const p = RB(pillows[i % pillows.length], px - 0.25, px + 0.25, 0.56, 1.02, -hd + 0.34, -hd + 0.5, 0.07, g);
      p.rotation.set(-0.3, rr(-0.15, 0.15), rr(-0.08, 0.08));
    }
    // Throw draped over one arm
    const t1 = RB(M.taupe, len / 2 - 0.26, len / 2 + 0.02, 0.64, 0.68, -0.35, 0.3, 0.02, g);
    t1.rotation.z = -0.05;
    const t2 = RB(M.taupe, len / 2 + 0.0, len / 2 + 0.03, 0.2, 0.66, -0.35, 0.3, 0.015, g);
    t2.rotation.z = 0.05;
    return g;
  }

  function loungeChair(x, z, rot, mat = M.velvet, y = 0) {
    const g = grp(x, y, z, rot);
    // Brass sled base
    for (const sx of [-0.36, 0.36]) {
      tube(M.brass, [[sx, 0.01, 0.4], [sx, 0.01, -0.35], [sx, 0.3, -0.4], [sx, 0.32, 0.38]], 0.012, g, 24, 6);
    }
    RB(mat, -0.42, 0.42, 0.28, 0.46, -0.4, 0.42, 0.08, g);
    const back = RB(mat, -0.42, 0.42, 0.38, 0.95, -0.46, -0.22, 0.1, g);
    back.rotation.x = -0.22;
    RB(mat, -0.46, -0.32, 0.28, 0.66, -0.42, 0.34, 0.06, g);
    RB(mat, 0.32, 0.46, 0.28, 0.66, -0.42, 0.34, 0.06, g);
    return g;
  }

  function clubChair(x, z, rot, mat = M.cognac, y = 0) {
    const g = grp(x, y, z, rot);
    RB(mat, -0.5, 0.5, 0.12, 0.44, -0.48, 0.48, 0.1, g);
    RB(mat, -0.36, 0.36, 0.42, 0.56, -0.3, 0.46, 0.07, g);
    const back = RB(mat, -0.5, 0.5, 0.4, 0.9, -0.48, -0.26, 0.1, g);
    back.rotation.x = -0.12;
    RB(mat, -0.52, -0.34, 0.4, 0.68, -0.48, 0.48, 0.08, g);
    RB(mat, 0.34, 0.52, 0.4, 0.68, -0.48, 0.48, 0.08, g);
    for (const [lx, lz] of [[-0.42, -0.4], [0.42, -0.4], [-0.42, 0.4], [0.42, 0.4]]) cyl(M.walnut, 0.025, 0.018, 0.12, lx, 0, lz, 10, g);
    return g;
  }

  function books(x, y, z, rot, n = 3, parent = root) {
    const g = grp(x, y, z, rot, parent);
    const cols = [0x2a2622, 0xc9b79a, 0x5a3a2a, 0x2f4a43, 0xe8e1d4];
    let h = 0;
    for (let i = 0; i < n; i++) {
      const t = rr(0.03, 0.05);
      const m = RB(std({ color: cols[(i + ((rnd() * 5) | 0)) % 5], roughness: 0.7 }), -0.16, 0.16, h, h + t, -0.12, 0.12, 0.004, g, 1);
      m.rotation.y = rr(-0.15, 0.15);
      h += t;
    }
    return g;
  }

  function vase(x, y, z, scale = 1, mat = M.ceramic, branches = false) {
    const pts = [[0, 0], [0.09, 0], [0.14, 0.08], [0.16, 0.2], [0.12, 0.34], [0.06, 0.42], [0.055, 0.5], [0.07, 0.52], [0.06, 0.53]];
    const m = lathe(mat, pts.map(([r, h]) => [r * scale, h * scale]), x, y, z, 40);
    if (branches) {
      for (let i = 0; i < 5; i++) {
        const a = rnd() * Math.PI * 2;
        const top = [x + Math.cos(a) * rr(0.2, 0.45) * scale, y + rr(1.0, 1.5) * scale, z + Math.sin(a) * rr(0.2, 0.45) * scale];
        tube(M.bark, [[x, y + 0.4 * scale, z], [(x + top[0]) / 2, (y + top[1]) / 2 + 0.1, (z + top[2]) / 2], top], 0.006 * scale + 0.004, root, 12, 5);
        leafCluster(top[0], top[1], top[2], 0.18 * scale, 14, 0x6f7f5a, 0.04);
      }
    }
    return m;
  }

  function bowl(x, y, z, r = 0.22, mat = M.ceramicDark) {
    return lathe(mat, [[0, 0], [r * 0.4, 0], [r * 0.8, r * 0.18], [r, r * 0.42], [r * 0.95, r * 0.44], [r * 0.75, r * 0.2], [0, r * 0.08]], x, y, z, 40);
  }

  function tableLamp(x, y, z, scale = 1) {
    lathe(M.ceramicDark, [[0, 0], [0.1, 0], [0.14, 0.1], [0.12, 0.26], [0.04, 0.36], [0.02, 0.42], [0, 0.42]].map(([r, h]) => [r * scale, h * scale]), x, y, z, 32);
    cyl(M.brass, 0.008, 0.008, 0.1 * scale, x, y + 0.42 * scale, z, 8);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 0.24 * scale, 32, 1, true), M.shade);
    s.position.set(x, y + 0.6 * scale, z);
    root.add(s);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.035 * scale, 12, 8), M.bulb);
    b.position.set(x, y + 0.55 * scale, z);
    root.add(b);
  }

  // Leaves: instanced flattened ellipsoids scattered in a cluster
  const leafGeo = new THREE.SphereGeometry(1, 6, 4);
  leafGeo.scale(1, 0.12, 0.45);
  function leafCluster(x, y, z, radius, count, color, size = 0.07, spread = [1, 0.7, 1]) {
    const mesh = new THREE.InstancedMesh(leafGeo, M.leaf, count);
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const u = rnd(), vv = rnd();
      const th = u * Math.PI * 2, ph = Math.acos(2 * vv - 1);
      const r = radius * Math.cbrt(rnd());
      v3.set(x + Math.sin(ph) * Math.cos(th) * r * spread[0], y + Math.cos(ph) * r * spread[1], z + Math.sin(ph) * Math.sin(th) * r * spread[2]);
      eul.set(rr(-1, 1), rr(0, 6.28), rr(-0.6, 0.6));
      q.setFromEuler(eul);
      const sz = size * rr(0.7, 1.3);
      s3.set(sz, sz, sz);
      mtx.compose(v3, q, s3);
      mesh.setMatrixAt(i, mtx);
      col.copy(base).offsetHSL(rr(-0.02, 0.02), rr(-0.08, 0.08), rr(-0.08, 0.08));
      mesh.setColorAt(i, col);
    }
    root.add(mesh);
    return mesh;
  }

  function olive(x, y, z, s = 1) {
    const g = grp(x, y, z, rnd() * 6);
    const lean = rr(-0.4, 0.4);
    const pts = [[0, 0, 0], [0.1 * s, 0.7 * s, 0.05], [lean * s, 1.5 * s, -0.1 * s], [lean * 1.3 * s, 2.1 * s, 0.1 * s]];
    tube(M.bark, pts, 0.13 * s, g, 24, 8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rr(0, 0.5);
      const end = [lean * s + Math.cos(a) * 0.9 * s, rr(2.3, 2.8) * s, Math.sin(a) * 0.9 * s];
      tube(M.bark, [[lean * 1.1 * s, 1.7 * s, 0], [(lean * s + end[0]) / 2, (1.9 * s + end[1]) / 2, end[2] / 2], end], 0.05 * s, g, 12, 6);
    }
    g.updateMatrixWorld();
    const c = new THREE.Vector3(lean * s, 2.7 * s, 0).applyMatrix4(g.matrixWorld);
    leafCluster(c.x, c.y, c.z, 1.4 * s, lite ? 500 : 1400, 0x6b7d58, 0.085 * s, [1.1, 0.55, 1.1]);
    return g;
  }

  function palm(x, y, z, h = 7, lean = 0.12) {
    const dir = rnd() * Math.PI * 2;
    const dx = Math.cos(dir) * lean * h, dz = Math.sin(dir) * lean * h;
    const pts = [[x, y, z], [x + dx * 0.2, y + h * 0.35, z + dz * 0.2], [x + dx * 0.6, y + h * 0.7, z + dz * 0.6], [x + dx, y + h, z + dz]];
    const trunkCurve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const geo = new THREE.TubeGeometry(trunkCurve, 40, 0.16, 10, false);
    // taper the trunk
    const pos = geo.attributes.position;
    const center = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / 11);
      const t = ring / 40;
      trunkCurve.getPoint(t, center);
      v3.fromBufferAttribute(pos, i).sub(center).multiplyScalar(1.25 - t * 0.5).add(center);
      pos.setXYZ(i, v3.x, v3.y, v3.z);
    }
    M.bark.map.repeat.set(1, 6);
    root.add(new THREE.Mesh(geo, M.bark));
    const top = new THREE.Vector3(x + dx, y + h, z + dz);
    const frondGeo = new THREE.PlaneGeometry(2.8, 1.1, 14, 1);
    frondGeo.translate(1.4, 0, 0);
    const fp = frondGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      const fx = fp.getX(i);
      fp.setZ(i, -Math.pow(fx / 2.8, 2) * 1.2);
    }
    frondGeo.rotateX(-Math.PI / 2);
    const fronds = new THREE.Group();
    fronds.position.copy(top);
    for (let i = 0; i < 14; i++) {
      const f = new THREE.Mesh(frondGeo, M.frond);
      f.rotation.set(rr(-0.2, 0.2), (i / 14) * Math.PI * 2 + rr(-0.1, 0.1), rr(-0.35, 0.35) + (i % 2 ? 0.25 : -0.1));
      fronds.add(f);
    }
    root.add(fronds);
    animated.push((t) => (fronds.rotation.y = Math.sin(t * 0.4 + x) * 0.03));
  }

  function planter(x, y, z, r = 0.35, h = 0.6, mat = M.ceramicDark) {
    return lathe(mat, [[0, 0], [r * 0.7, 0], [r, h * 0.2], [r * 1.05, h * 0.95], [r * 0.95, h], [r * 0.9, h * 0.96], [0, h * 0.9]], x, y, z, 40);
  }

  function fiddleLeaf(x, y, z) {
    planter(x, y, z, 0.32, 0.55);
    const g = grp(x, y + 0.5, z, 0);
    tube(M.bark, [[0, 0, 0], [0.05, 0.8, 0], [-0.05, 1.6, 0.05]], 0.025, g, 12, 6);
    const leaf = new THREE.SphereGeometry(1, 8, 6);
    leaf.scale(0.14, 0.02, 0.22);
    const inst = new THREE.InstancedMesh(leaf, M.leaf, 46);
    for (let i = 0; i < 46; i++) {
      const hgt = 0.4 + (i / 46) * 1.4;
      const a = i * 2.4;
      v3.set(x + Math.cos(a) * 0.25, y + 0.5 + hgt, z + Math.sin(a) * 0.25);
      eul.set(rr(-0.6, -0.2), -a, rr(-0.3, 0.3));
      q.setFromEuler(eul);
      mtx.compose(v3, q, s3.set(1, 1, 1));
      inst.setMatrixAt(i, mtx);
      inst.setColorAt(i, col.setHSL(0.27, rr(0.35, 0.5), rr(0.18, 0.28)));
    }
    root.add(inst);
  }

  function diningChair(x, z, rot) {
    const g = grp(x, 0, z, rot);
    for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
      const leg = cyl(M.walnut, 0.018, 0.012, 0.46, lx, 0, lz, 10, g);
      leg.rotation.set(lz * 0.25, 0, -lx * 0.25);
    }
    RB(M.taupe, -0.25, 0.25, 0.44, 0.52, -0.24, 0.26, 0.035, g);
    const back = RB(M.taupe, -0.25, 0.25, 0.52, 0.98, -0.26, -0.18, 0.04, g);
    back.rotation.x = -0.1;
    return g;
  }

  function barStool(x, z, y = 0) {
    lathe(M.brass, [[0, 0], [0.2, 0], [0.2, 0.012], [0.02, 0.02], [0, 0.02]], x, y, z, 32);
    cyl(M.brass, 0.018, 0.018, 0.68, x, y, z, 10);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.01, 6, 32), M.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + 0.28, z);
    root.add(ring);
    lathe(M.cognac, [[0, 0], [0.19, 0], [0.21, 0.03], [0.2, 0.07], [0.12, 0.085], [0, 0.085]], x, y + 0.68, z, 32);
    const back = RB(M.cognac, -0.17, 0.17, 0.0, 0.2, -0.03, 0.03, 0.02, root);
    back.position.set(x + 0.18, y + 0.86, z);
    back.rotation.y = Math.PI / 2;
  }

  function piano(x, z, rot) {
    const g = grp(x, 0, z, rot);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1.5, 0);
    shape.lineTo(1.5, 0.55);
    shape.bezierCurveTo(1.5, 1.0, 0.95, 1.05, 0.8, 1.5);
    shape.bezierCurveTo(0.65, 1.95, 0.5, 2.1, 0.22, 2.1);
    shape.lineTo(0, 2.1);
    shape.lineTo(0, 0);
    const body = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 32 });
    body.rotateX(-Math.PI / 2);
    const bm = new THREE.Mesh(body, M.lacquer);
    bm.position.set(-0.75, 0.64, 0.25);
    g.add(bm);
    // Soundboard (visible under the lid)
    const sb = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), M.walnut);
    sb.rotation.x = -Math.PI / 2;
    sb.position.set(-0.75, 0.9, 0.25);
    g.add(sb);
    for (let i = 0; i < 28; i++) R(M.brass, -0.72 + i * 0.05, -0.715 + i * 0.05, 0.905, 0.91, -1.6 + i * 0.02, 0.1, { parent: g });
    // Lid, propped open along the straight side
    const lidGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 32 });
    lidGeo.rotateX(-Math.PI / 2);
    const lidPivot = new THREE.Group();
    lidPivot.position.set(-0.75, 0.95, 0.25);
    lidPivot.rotation.z = 0.62;
    g.add(lidPivot);
    lidPivot.add(new THREE.Mesh(lidGeo, M.lacquer));
    cyl(M.black, 0.01, 0.01, 0.95, 0.35, 0.9, -0.9, 8, g).rotation.z = -0.35;
    // Keybed + keys
    R(M.lacquer, -0.77, 0.77, 0.66, 0.78, 0.25, 0.55, { parent: g });
    R(M.lacquer, -0.8, -0.72, 0.64, 0.9, 0.2, 0.6, { parent: g });
    R(M.lacquer, 0.72, 0.8, 0.64, 0.9, 0.2, 0.6, { parent: g });
    const wk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0255, 0.022, 0.15), M.ivoryKey, 52);
    for (let i = 0; i < 52; i++) {
      mtx.makeTranslation(-0.7 + i * 0.0272, 0.79, 0.47);
      wk.setMatrixAt(i, mtx);
    }
    g.add(wk);
    const bk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.02, 0.09), M.lacquer, 36);
    let n = 0;
    for (let i = 0; i < 51 && n < 36; i++) {
      if ([2, 6].includes(i % 7)) continue;
      mtx.makeTranslation(-0.7 + i * 0.0272 + 0.0136, 0.81, 0.43);
      bk.setMatrixAt(n++, mtx);
    }
    bk.count = n;
    g.add(bk);
    R(M.lacquer, -0.3, 0.3, 0.9, 1.12, 0.26, 0.28, { parent: g }).rotation.x = -0.25; // music desk
    // Legs + pedal lyre
    for (const [lx, lz] of [[-0.62, 0.35], [0.62, 0.35], [-0.45, -1.55]]) {
      lathe(M.lacquer, [[0, 0], [0.05, 0], [0.045, 0.1], [0.06, 0.5], [0.07, 0.64], [0, 0.64]], lx, 0, lz, 20, g);
      cyl(M.brass, 0.045, 0.045, 0.02, lx, 0, lz, 16, g);
    }
    R(M.lacquer, -0.08, 0.08, 0.05, 0.64, 0.12, 0.16, { parent: g });
    for (const px of [-0.05, 0, 0.05]) R(M.brass, px - 0.012, px + 0.012, 0.06, 0.075, 0.12, 0.26, { parent: g });
    // Bench
    RB(M.lacquer, -0.42, 0.42, 0.46, 0.52, 0.85, 1.2, 0.02, g);
    RB(M.cognac, -0.4, 0.4, 0.52, 0.56, 0.87, 1.18, 0.02, g);
    for (const [lx, lz] of [[-0.38, 0.88], [0.38, 0.88], [-0.38, 1.17], [0.38, 1.17]]) R(M.lacquer, lx - 0.02, lx + 0.02, 0, 0.46, lz - 0.02, lz + 0.02, { parent: g });
    return g;
  }

  function curtain(x0, x1, z, y0, y1, folds = 14, parent = root) {
    const w = x1 - x0, h = y1 - y0;
    const geo = new THREE.PlaneGeometry(w, h, folds * 6, 1);
    const pos = geo.attributes.position;
    const base = pos.array.slice();
    const apply = (t) => {
      for (let i = 0; i < pos.count; i++) {
        const px = base[i * 3];
        const py = base[i * 3 + 1];
        const sway = (py < 0 ? 1 : 0.2) * Math.sin(t * 0.8 + px * 2) * 0.02;
        pos.setZ(i, Math.sin((px / w) * folds * Math.PI * 2) * 0.06 + sway);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };
    apply(0);
    const m = new THREE.Mesh(geo, M.sheer);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    parent.add(m);
    R(M.black, x0 - 0.05, x1 + 0.05, y1, y1 + 0.03, z - 0.03, z + 0.03, { parent });
    if (!lite) animated.push(apply);
    return m;
  }

  /* =========================================================
     SITE
     ========================================================= */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 112), M.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.15, 24);
  root.add(ground);
  // Lawn beds either side of the reflecting pool
  R(M.lawn, -24, -10, -0.15, -0.1, 2.2, 22);
  R(M.lawn, 10, 24, -0.15, -0.1, 2.2, 22);
  R(M.rock, -80, 80, -70, -0.15, -33, -32); // cliff face beyond the terrace
  R(M.rock, -80, 80, -70.5, -70, -600, -32);

  // Front reflecting pool with travertine coping and a floating stepping-stone path
  R(M.travertine, -9.6, 9.6, -0.15, 0.0, 16.9, 17.5);
  R(M.travertine, -9.6, -9, -0.15, 0.0, 2.2, 16.9);
  R(M.travertine, 9, 9.6, -0.15, 0.0, 2.2, 16.9);
  R(M.mirrorWater, -9, 9, -0.15, -0.05, 2.2, 16.9);
  R(M.travertine, -11.4, 11.4, -0.15, 0.0, 0.0, 2.2); // entrance landing
  for (let i = 0; i < 10; i++) {
    const z = 15.9 - i * 1.4;
    RB(M.travertine, -1.1, 1.1, -0.02, 0.1, z - 0.45, z + 0.45, 0.02);
    R(M.ledSoft, -1.0, 1.0, -0.04, -0.02, z - 0.47, z - 0.45);
  }
  // Sculpture in the reflecting pool
  const orb = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.09, 24, 96), M.bronze);
  orb.position.set(-5.2, 1.25, 9.5);
  orb.rotation.y = 0.5;
  root.add(orb);
  cyl(M.travertine, 0.35, 0.4, 0.12, -5.2, -0.05, 9.5, 32);
  // Path bollards
  for (let i = 0; i < 6; i++) {
    for (const sx of [-10.4, 10.4]) {
      cyl(M.bronze, 0.07, 0.07, 0.7, sx, -0.15, 16 - i * 2.8, 16);
      cyl(M.bulb, 0.071, 0.071, 0.04, sx, 0.45, 16 - i * 2.8, 16);
    }
  }
  // Façade uplights
  for (const x of [-10.2, -8, -5.8, 3, 5.5, 8, 10.5]) cyl(M.bulb, 0.06, 0.06, 0.02, x, 0.0, 1.2, 12);

  // Landscape: palms and olive trees
  palm(-13.5, -0.15, 5, 8.5, 0.1);
  palm(-15.5, -0.15, 12, 7.2, 0.14);
  palm(13.6, -0.15, 6.5, 9, 0.08);
  palm(16, -0.15, 14, 7.5, 0.15);
  palm(-13.5, -0.15, -28, 8, 0.12);
  palm(13.8, -0.15, -30, 7, 0.16);
  olive(-12.2, -0.15, 16.5, 1.1);
  olive(12.5, -0.15, 18.5, 1.0);

  /* =========================================================
     SHELL
     ========================================================= */
  R(M.marbleFloor, -11, 11, -0.15, 0.0, -22, 0.0);
  // Brass inlay grid in the marble floor
  for (let x = -9.6; x < 11; x += 3.6) R(M.brass, x - 0.01, x + 0.01, 0.0, 0.002, -22, 0);
  for (let z = -3.6; z > -22; z -= 3.6) R(M.brass, -11, 11, 0.0, 0.002, z - 0.01, z + 0.01);
  // Terrace (leaves a void for the infinity pool)
  R(M.travertine, -11.4, 11.4, -0.3, 0.0, -24.6, -22);
  R(M.travertine, 5, 11.4, -0.3, 0.0, -32, -24.6);
  R(M.travertine, -11.4, -9, -0.3, 0.0, -32, -24.6);
  R(M.travertine, -9, 5, -0.45, -0.18, -32, -30.9);

  // Left travertine monolith (full height) and left side wall
  R(M.travertine, -11.4, -4.5, 0, 8.6, -0.6, 0.0);
  R(M.travertine, -11.4, -11, 0, 8.6, -22, -0.6);
  // Water wall cut into the monolith
  R(M.black, -10.4, -5.2, 0.35, 4.2, 0.0, 0.04);
  const water = R(M.waterfall, -10.3, -5.3, 0.4, 4.15, 0.05, 0.06);
  R(M.black, -10.5, -5.1, -0.15, 0.35, 0.0, 0.6);
  R(M.mirrorWater, -10.4, -5.2, 0.33, 0.35, 0.04, 0.55);
  R(M.led, -10.4, -5.2, 0.33, 0.35, 0.02, 0.04);
  animated.push((t) => (M.waterfall.map.offset.y = -t * 0.6));

  // Glass: foyer sidelight, clerestory over the entrance, right façade
  R(M.glass, -4.5, -0.9, 0, 4.0, -0.04, 0.0);
  R(M.glass, -4.5, 2.6, 4.35, 8.2, -0.04, 0.0);
  R(M.glass, 0.9, 2.6, 0, 4.0, -0.04, 0.0);
  R(M.glass, 2.6, 11, 0, 3.6, -0.04, 0.0);
  R(M.travertine, -0.9, 0.9, 3.6, 4.0, -0.3, 0.0);
  for (const x of [-4.5, -0.9, 0.9, 2.6, 4.7, 6.8, 8.9, 11]) R(M.bronze, x - 0.035, x + 0.035, 0, x < 2.7 ? 4.0 : 3.6, -0.07, 0.03);
  for (const x of [-4.5, -1.8, 0.6, 2.6]) R(M.bronze, x - 0.035, x + 0.035, 4.35, 8.2, -0.07, 0.03);

  // Entrance canopy with lit soffit
  R(M.charcoal, -4.5, 2.6, 4.0, 4.35, 0.0, 3.0);
  R(M.led, -4.4, 2.5, 3.98, 4.0, 2.85, 2.9);
  for (const x of [-3.4, -1.6, 0.2, 1.8]) cyl(M.bulb, 0.06, 0.06, 0.01, x, 3.99, 1.5, 12);

  // Living roof (double height) — overhangs the terrace
  R(M.plaster, -11.4, 2.6, 8.2, 8.6, -26, 0.8);
  R(M.charcoal, -11.4, 2.6, 8.6, 8.75, -26, 0.8);
  R(M.led, -11.3, 2.5, 8.18, 8.2, -25.9, -25.85);
  // Walnut slat ceiling with linear lights
  {
    const n = 88;
    const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.1, 21), M.walnut, n);
    for (let i = 0; i < n; i++) {
      mtx.makeTranslation(-10.9 + i * 0.152, 8.14, -11);
      slats.setMatrixAt(i, mtx);
    }
    root.add(slats);
    for (const x of [-8.5, -5.2, -1.6]) R(M.ledSoft, x - 0.02, x + 0.02, 8.06, 8.08, -21, -1);
  }

  // Upper volume (mezzanine / master suite) — cantilevers over the entrance
  R(M.oakFloor, 2.6, 11.4, 3.6, 3.9, -22, 3.0, { tile: 2.4 });
  R(M.plaster, 2.6, 11.4, 3.58, 3.6, -22, 0.0);
  R(M.charcoal, 2.6, 11.4, 3.3, 3.6, 0.0, 3.0);
  R(M.led, 2.7, 11.3, 3.28, 3.3, 2.85, 2.9);
  R(M.charcoal, 2.6, 11.6, 7.8, 8.1, -22, 3.0);
  R(M.charcoal, 11, 11.4, 0, 7.8, -22, 3.0);
  R(M.walnutV, 10.9, 11, 0, 3.58, -22, 0, { tile: 2 });
  R(M.plaster, 2.6, 11, 7.78, 7.8, -22, 2.9);
  // Front of upper volume: glass behind bronze fins
  R(M.charcoal, 2.6, 11.4, 3.9, 4.3, 2.9, 3.0);
  R(M.charcoal, 2.6, 11.4, 7.4, 7.8, 2.9, 3.0);
  R(M.glass, 2.6, 11.4, 4.3, 7.4, 2.9, 2.94);
  {
    const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 3.1, 0.35), M.bronze, 26);
    for (let i = 0; i < 26; i++) {
      mtx.makeTranslation(2.75 + i * 0.33, 5.85, 3.2);
      fins.setMatrixAt(i, mtx);
    }
    root.add(fins);
    R(M.bronze, 2.6, 11.4, 7.4, 7.5, 3.0, 3.4);
    R(M.bronze, 2.6, 11.4, 4.2, 4.3, 3.0, 3.4);
  }
  // Mezzanine edge: LED reveal, glass balustrade, brass rail (opening at the stair landing)
  R(M.led, 2.56, 2.6, 3.6, 3.64, -22, 3.0);
  R(M.glass, 2.62, 2.66, 3.9, 5.0, -22, -12.5);
  R(M.glass, 2.62, 2.66, 3.9, 5.0, -11, 2.9);
  R(M.brass, 2.61, 2.67, 5.0, 5.04, -22, -12.5);
  R(M.brass, 2.61, 2.67, 5.0, 5.04, -11, 2.9);

  // Rear glass wall
  R(M.glass, -11, 11, 0, 8.2, -22.03, -21.97);
  for (let x = -11; x <= 11.01; x += 2.75) R(M.bronze, x - 0.035, x + 0.035, 0, 8.2, -22.06, -21.94);
  // Sheer curtains gathered at the edges of the glass
  curtain(-10.9, -9.2, -21.8, 0.02, 8.0, 10);
  curtain(0.6, 2.4, -21.8, 0.02, 8.0, 10);
  curtain(9.2, 10.9, -21.8, 3.95, 7.7, 10);

  /* =========================================================
     ENTRANCE — pivot door
     ========================================================= */
  const door = new THREE.Group();
  door.position.set(-0.45, 0, -0.1);
  root.add(door);
  R(M.walnutV, -0.45, 1.35, 0, 3.6, -0.06, 0.06, { parent: door, tile: 1.8 });
  for (let i = 1; i < 6; i++) R(M.bronze, -0.45 + i * 0.3 - 0.004, -0.45 + i * 0.3 + 0.004, 0.2, 3.4, 0.058, 0.064, { parent: door });
  R(M.brass, 1.05, 1.1, 0.6, 3.0, 0.06, 0.12, { parent: door });
  R(M.brass, 1.05, 1.1, 0.6, 3.0, -0.12, -0.06, { parent: door });

  /* =========================================================
     FOYER — sculpture, console, tall vases
     ========================================================= */
  RB(M.travertine, -3.3, -2.5, 0, 1.05, -2.9, -2.1, 0.02);
  const sculpture = new THREE.Mesh(new THREE.TorusKnotGeometry(0.26, 0.07, 200, 20, 2, 3), M.brass);
  sculpture.position.set(-2.9, 1.5, -2.5);
  root.add(sculpture);
  cyl(M.bulb, 0.12, 0.12, 0.01, -2.9, 8.05, -2.5, 16);
  vase(-4.0, 0, -0.9, 2.2, M.ceramicDark);
  vase(-3.6, 0, -1.3, 1.6, M.ceramic, true);

  /* =========================================================
     ONYX BAR (under the mezzanine, by the entrance)
     ========================================================= */
  R(M.onyx, 3.9, 3.95, 0.05, 1.05, -3.6, -0.7);
  RB(M.brass, 3.85, 4.75, 1.05, 1.1, -3.7, -0.6, 0.01);
  R(M.walnut, 3.95, 4.7, 0.05, 1.05, -3.6, -0.7);
  R(M.black, 3.95, 4.6, 0, 0.05, -3.55, -0.75);
  R(M.onyx, 10.85, 10.9, 0.3, 3.4, -3.8, -0.4);
  R(M.walnut, 9.7, 10.85, 0.9, 0.95, -3.8, -0.4);
  for (const y of [1.6, 2.3]) {
    R(M.brass, 10.2, 10.85, y, y + 0.02, -3.7, -0.5);
    for (let i = 0; i < 9; i++) {
      const bx = 10.5, bz = -3.5 + i * 0.35;
      lathe(M.glass, [[0, 0], [0.04, 0], [0.045, 0.2], [0.02, 0.26], [0.015, 0.32], [0, 0.32]], bx, y + 0.02, bz, 16);
    }
  }
  barStool(3.45, -1.3);
  barStool(3.45, -2.4);
  bowl(4.3, 1.1, -1.6, 0.14, M.brass);

  /* =========================================================
     GRAND LIVING — double height
     ========================================================= */
  // Fireplace wall in Nero Marquina with a linear fire and art above
  R(M.nero, -11, -10.6, 0, 8.2, -14, -4.5, { tile: 2.2 });
  R(M.black, -10.62, -10.5, 0.75, 1.55, -12, -6.5);
  RB(M.nero, -10.6, -10.1, 0.62, 0.72, -12.4, -6.1, 0.02); // hearth ledge
  const flames = [];
  for (let i = 0; i < 26; i++) {
    const f = R(M.fire, -10.6, -10.55, 0.8, 1.25, -11.9 + i * 0.2, -11.78 + i * 0.2);
    f.userData.seed = rnd() * 10;
    flames.push(f);
  }
  for (let i = 0; i < 8; i++) {
    const log = cyl(M.bark, 0.06, 0.06, 0.8, -10.57, 0.72, -11.4 + i * 0.65, 10);
    log.rotation.x = Math.PI / 2 + rr(-0.2, 0.2);
    log.position.y = 0.8;
  }
  R(M.led, -10.6, -10.52, 0.78, 0.8, -12, -6.5);
  R(M.art1, -10.6, -10.55, 3.2, 5.8, -11.2, -7.3, { tile: 3.9 });
  R(M.brass, -10.61, -10.54, 3.12, 3.16, -11.3, -7.2);
  R(M.brass, -10.6, -10.3, 5.95, 6.0, -10.2, -8.3); // picture light
  R(M.led, -10.4, -10.3, 5.94, 5.95, -10.1, -8.4);

  // Rug, sofas, chairs, tables
  R(M.rug, -9.2, -1.2, 0.0, 0.025, -14.4, -6.4, { tile: 8 });
  sofa(-2.0, -10.4, 5.6, -Math.PI / 2);
  sofa(-5.7, -13.75, 3.6, 0);
  loungeChair(-8.4, -8.2, Math.PI / 2 + 0.4, M.velvet);
  loungeChair(-8.4, -12.4, Math.PI / 2 - 0.4, M.velvet);
  cyl(M.brass, 0.22, 0.22, 0.02, -8.6, 0.02, -10.3, 24);
  cyl(M.brass, 0.012, 0.012, 0.5, -8.6, 0.02, -10.3, 8);
  RB(M.nero, -8.85, -8.35, 0.52, 0.56, -10.55, -10.05, 0.01);
  // Coffee tables: sculpted travertine + nero side table, styled
  lathe(M.travertine, [[0, 0], [0.62, 0], [0.7, 0.04], [0.8, 0.3], [0.82, 0.34], [0.78, 0.36], [0, 0.36]], -5.4, 0.02, -10.2, 64);
  lathe(M.nero, [[0, 0], [0.3, 0], [0.34, 0.42], [0.46, 0.44], [0.46, 0.46], [0, 0.46]], -4.1, 0.02, -11.7, 48);
  books(-5.7, 0.38, -10.0, 0.3, 3);
  bowl(-5.0, 0.38, -10.5, 0.2, M.ceramicDark);
  vase(-4.1, 0.48, -11.7, 0.7, M.ceramic, true);
  // Side table + lamp at the sofa end
  lathe(M.brass, [[0, 0], [0.24, 0], [0.24, 0.02], [0.03, 0.03], [0.03, 0.54], [0.26, 0.55], [0.26, 0.57], [0, 0.57]], -2.0, 0.02, -7.05, 40);
  tableLamp(-2.0, 0.59, -7.05, 1.2);
  lathe(M.brass, [[0, 0], [0.24, 0], [0.24, 0.02], [0.03, 0.03], [0.03, 0.54], [0.26, 0.55], [0.26, 0.57], [0, 0.57]], -2.0, 0.02, -13.9, 40);
  books(-2.0, 0.59, -13.9, 1.2, 2);
  // Floor vases
  vase(-9.8, 0, -5.2, 1.9, M.ceramicDark, true);
  vase(-9.9, 0, -13.2, 1.5, M.ceramic);

  // Cascading glass-rod chandelier — the centrepiece
  const chandelier = new THREE.Group();
  chandelier.position.set(-5.4, 0, -10.2);
  root.add(chandelier);
  const rods = 96;
  const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
  const rodMesh = new THREE.InstancedMesh(rodGeo, glow(1.7, 1.3, 0.85), rods);
  const cordPts = [];
  for (let i = 0; i < rods; i++) {
    const a = i * 2.39996;
    const r = 0.25 + Math.sqrt(i / rods) * 1.8;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = 4.3 + (r / 2) * 1.7 + rnd() * 0.5;
    mtx.makeTranslation(x, y, z);
    rodMesh.setMatrixAt(i, mtx);
    cordPts.push(new THREE.Vector3(x, y + 0.4, z), new THREE.Vector3(x, 8.05, z));
  }
  chandelier.add(rodMesh);
  chandelier.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(cordPts),
    new THREE.LineBasicMaterial({ color: 0x8a7a66, transparent: true, opacity: 0.35 })
  ));
  const canopy = cyl(M.brass, 0.6, 0.6, 0.04, 0, 8.02, 0, 48, chandelier);
  canopy.position.y = 8.03;

  // Music corner: grand piano by the glass, fiddle-leaf fig
  piano(-6.4, -17.6, 0.55);
  fiddleLeaf(-9.8, 0, -20.4);
  clubChair(-2.2, -19.2, Math.PI + 0.5);
  lathe(M.nero, [[0, 0], [0.22, 0], [0.24, 0.5], [0.3, 0.52], [0.3, 0.54], [0, 0.54]], -3.2, 0, -19.9, 40);
  vase(-3.2, 0.54, -19.9, 0.5, M.ceramic);

  /* =========================================================
     FLOATING STAIR + walnut slat wall
     ========================================================= */
  for (let i = 0; i < 17; i++) {
    const zc = -18.2 + i * 0.36;
    const y = 0.2 + (i + 1) * 0.215;
    RB(M.walnut, 0.9, 2.55, y - 0.08, y, zc - 0.17, zc + 0.17, 0.012);
    R(M.ledSoft, 0.95, 2.5, y - 0.085, y - 0.08, zc + 0.12, zc + 0.16);
    R(M.brass, 0.93, 0.945, y, 8.2, zc - 0.006, zc + 0.006);
  }
  R(M.oakFloor, 0.9, 2.6, 3.6, 3.9, -12.5, -11, { tile: 2.4 });
  {
    const slat = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 3.58, 0.05), M.walnutV, 54);
    for (let i = 0; i < 54; i++) {
      mtx.makeTranslation(2.6, 1.79, -19 + i * 0.12 + 0.025);
      slat.setMatrixAt(i, mtx);
    }
    root.add(slat);
  }

  /* =========================================================
     KITCHEN
     ========================================================= */
  R(M.walnut, 9.8, 10.4, 0.1, 0.9, -12.8, -4.2);
  R(M.black, 9.85, 10.4, 0, 0.1, -12.8, -4.2);
  for (let z = -12.8; z <= -4.19; z += 0.86) R(M.black, 9.79, 9.8, 0.1, 0.9, z - 0.004, z + 0.004);
  RB(M.calacatta, 9.72, 10.42, 0.9, 0.95, -12.8, -4.2, 0.01);
  R(M.calacatta, 10.38, 10.42, 0.95, 1.62, -12.8, -4.2);
  R(M.led, 10.1, 10.38, 1.6, 1.62, -12.8, -4.2);
  R(M.walnutV, 10.05, 10.42, 1.62, 3.58, -12.8, -4.2, { tile: 2 });
  for (let z = -12.8; z <= -4.19; z += 1.075) R(M.black, 10.03, 10.05, 1.62, 3.58, z - 0.005, z + 0.005);
  // Range + brass hood
  R(M.black, 9.75, 10.35, 0.951, 0.96, -9.3, -7.7);
  RB(M.brass, 9.7, 10.4, 2.4, 3.58, -9.4, -7.6, 0.02);
  // Island: waterfall calacatta
  R(M.calacatta, 5.9, 7.0, 0, 0.93, -11, -5.5, { tile: 1.6 });
  RB(M.calacatta, 5.55, 7.05, 0.93, 0.99, -11.05, -5.45, 0.012);
  R(M.black, 6.3, 6.8, 0.991, 0.995, -9.2, -7.8);
  // Sink + brass faucet
  R(M.black, 6.4, 6.8, 0.97, 0.992, -6.9, -6.2);
  tube(M.brass, [[6.9, 0.99, -6.55], [6.9, 1.35, -6.55], [6.75, 1.42, -6.55], [6.6, 1.3, -6.55]], 0.015, root, 24, 8);
  // Styling on the island
  bowl(6.4, 0.99, -10.1, 0.2, M.ceramic);
  for (let i = 0; i < 6; i++) {
    const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), std({ color: 0xe8c547, roughness: 0.6 }));
    lemon.position.set(6.4 + rr(-0.08, 0.08), 1.05 + rr(0, 0.04), -10.1 + rr(-0.08, 0.08));
    lemon.scale.set(1, 0.85, 1);
    root.add(lemon);
  }
  vase(6.5, 0.99, -8.4, 0.55, M.ceramicDark, true);
  // Stools
  for (const z of [-6.4, -7.6, -8.8, -10]) barStool(5.05, z);
  // Brass dome pendants
  for (const z of [-6.5, -8.25, -10]) {
    R(M.black, 6.44, 6.46, 2.4, 3.58, z - 0.004, z + 0.004);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.brass);
    dome.material.side = THREE.DoubleSide;
    dome.position.set(6.45, 2.2, z);
    root.add(dome);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), M.bulb);
    b.position.set(6.45, 2.18, z);
    root.add(b);
  }
  spot(0xffe0b0, 40, 6.45, 3.5, -8.25, 6.45, 0.9, -8.25, 0.95, true);
  // Downlights
  for (let x = 4; x <= 9.5; x += 2.75) for (let z = -2; z >= -20; z -= 3) cyl(M.bulb, 0.06, 0.06, 0.01, x, 3.575, z, 12);

  /* =========================================================
     WINE WALL + DINING
     ========================================================= */
  R(M.ledDim, 10.6, 10.62, 0.2, 3.4, -21.5, -13.3);
  R(M.bronze, 10.25, 10.6, 0.15, 0.2, -21.5, -13.3);
  R(M.bronze, 10.25, 10.6, 3.4, 3.45, -21.5, -13.3);
  for (let z = -21.5; z <= -13.29; z += 0.82) R(M.bronze, 10.25, 10.6, 0.2, 3.4, z - 0.012, z + 0.012);
  R(M.glass, 10.22, 10.24, 0.15, 3.45, -21.5, -13.3);
  {
    const bottleGeo = new THREE.LatheGeometry([[0, 0], [0.038, 0], [0.038, 0.2], [0.03, 0.24], [0.013, 0.28], [0.013, 0.33], [0, 0.33]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
    bottleGeo.rotateZ(-Math.PI / 2);
    const bottleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1, clearcoat: 1, envMapIntensity: 0.8 });
    const rows = 13, cols = 30;
    const bottles = new THREE.InstancedMesh(bottleGeo, bottleMat, rows * cols);
    let bi = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        mtx.makeTranslation(10.28, 0.4 + r * 0.235, -21.3 + c * 0.27);
        bottles.setMatrixAt(bi, mtx);
        bottles.setColorAt(bi++, col.set(rnd() < 0.55 ? 0x2a0d12 : rnd() < 0.6 ? 0x14261a : 0x3a2a12));
      }
    }
    root.add(bottles);
  }
  // Dining table: book-matched nero slab on bronze pedestals
  RB(M.nero, 6.05, 7.55, 0.72, 0.78, -19.6, -14.4, 0.015);
  for (const z of [-18.4, -15.6]) {
    lathe(M.bronze, [[0, 0], [0.35, 0], [0.35, 0.03], [0.1, 0.1], [0.08, 0.62], [0.3, 0.7], [0.3, 0.72], [0, 0.72]], 6.8, 0, z, 40);
  }
  for (const z of [-18.9, -17.7, -16.5, -15.3]) {
    diningChair(5.55, z, Math.PI / 2);
    diningChair(8.05, z, -Math.PI / 2);
  }
  diningChair(6.8, -20.2, 0);
  diningChair(6.8, -13.8, Math.PI);
  // Table styling: candles + low arrangement
  for (const z of [-18.2, -17.6, -16.4, -15.8]) {
    lathe(M.brass, [[0, 0], [0.05, 0], [0.05, 0.01], [0.012, 0.02], [0.012, 0.18], [0.025, 0.2], [0, 0.2]], 6.8, 0.78, z, 20);
    cyl(M.linen, 0.012, 0.012, 0.16, 6.8, 0.98, z, 10);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.flame);
    fl.scale.set(1, 2, 1);
    fl.position.set(6.8, 1.16, z);
    root.add(fl);
  }
  bowl(6.8, 0.78, -17, 0.28, M.brass);
  leafCluster(6.8, 0.92, -17, 0.28, 90, 0x5f7050, 0.05, [1, 0.4, 1.6]);
  // Tiered ring chandelier
  for (const [r, y] of [[1.4, 2.55], [1.0, 2.35], [0.6, 2.15]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 10, 96), M.led);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(6.8, y, -17);
    root.add(ring);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.05, 96, 1, true), M.brass);
    band.material.side = THREE.DoubleSide;
    band.position.set(6.8, y + 0.02, -17);
    root.add(band);
  }
  for (const a of [0, 2.1, 4.2]) R(M.black, 6.8 + Math.cos(a) * 1.4 - 0.004, 6.8 + Math.cos(a) * 1.4 + 0.004, 2.55, 3.58, -17 + Math.sin(a) * 1.4 - 0.004, -17 + Math.sin(a) * 1.4 + 0.004);
  spot(0xffd6a0, 35, 6.8, 3.5, -17, 6.8, 0.7, -17, 1.0, true);

  /* =========================================================
     UPPER LEVEL — library lounge + master suite
     ========================================================= */
  // Library wall with rolling brass ladder
  R(M.walnut, 10.6, 11, 3.9, 7.6, -10, 2.4);
  {
    const booksMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 300);
    let bk = 0;
    for (let s = 0; s < 6; s++) {
      const y0 = 4.05 + s * 0.58;
      R(M.walnut, 10.3, 10.6, y0 - 0.04, y0, -10, 2.4);
      R(M.ledSoft, 10.3, 10.32, y0 + 0.5, y0 + 0.52, -10, 2.4);
      let z = -9.9;
      while (z < 2.2 && bk < 300) {
        const w = rr(0.035, 0.08), h = rr(0.26, 0.44);
        if (rnd() < 0.07) {
          z += 0.35;
          continue;
        }
        const tilt = rnd() < 0.05 ? 0.25 : 0;
        q.setFromEuler(eul.set(tilt, 0, 0));
        mtx.compose(v3.set(10.45, y0 + h / 2, z + w / 2), q, s3.set(0.24, h, w));
        booksMesh.setMatrixAt(bk, mtx);
        booksMesh.setColorAt(bk++, col.setHSL(rr(0.03, 0.12), rr(0.15, 0.45), rr(0.1, 0.5)));
        z += w + 0.004;
      }
    }
    booksMesh.count = bk;
    root.add(booksMesh);
    R(M.brass, 10.2, 10.23, 7.35, 7.38, -10, 2.4);
    for (const dz of [-0.25, 0.25]) {
      const rail = R(M.brass, 9.55, 9.58, 3.9, 7.4, -3 + dz - 0.015, -3 + dz + 0.015);
      rail.rotation.z = -0.17;
      rail.position.x = 9.85;
    }
    for (let i = 0; i < 9; i++) {
      const y = 4.2 + i * 0.36;
      const rung = R(M.brass, 0, 0.02, 0, 0.02, -3.25, -2.75);
      rung.position.set(9.62 + (y - 3.9) * 0.17, y, -3);
    }
  }
  // Desk
  RB(M.walnut, 6.2, 8.6, 4.62, 4.68, -5.4, -4.4, 0.01);
  R(M.brass, 6.3, 6.33, 3.9, 4.62, -5.3, -4.5);
  R(M.brass, 8.47, 8.5, 3.9, 4.62, -5.3, -4.5);
  tableLamp(8.2, 4.68, -4.7, 0.9);
  books(6.8, 4.68, -4.9, 0.2, 4);
  loungeChair(7.4, -3.4, Math.PI, M.cognac, 3.9);
  clubChair(4.4, -7, Math.PI / 2, M.cognac, 3.9);
  R(M.rug, 3.6, 9.6, 3.9, 3.92, -9.5, -1.5, { tile: 6 });

  // Master suite — channel-tufted headboard wall, bench, bath by the glass
  R(M.rug, 7.0, 10.7, 3.9, 3.92, -20.4, -15.2, { tile: 4.8 });
  for (let i = 0; i < 14; i++) {
    const z0 = -20.3 + i * 0.36;
    RB(M.taupe, 10.78, 10.95, 3.95, 5.9, z0, z0 + 0.34, 0.06);
  }
  R(M.ledSoft, 10.8, 10.95, 5.92, 5.94, -20.3, -15.3);
  RB(M.walnut, 8.2, 10.8, 3.9, 4.18, -19.1, -16.5, 0.02);
  RB(M.linen, 8.3, 10.75, 4.18, 4.46, -19.0, -16.6, 0.08);
  RB(M.linen, 8.25, 10.1, 4.3, 4.52, -19.05, -16.55, 0.1); // duvet
  RB(M.cognac, 8.25, 9.0, 4.46, 4.56, -19.08, -16.52, 0.04); // folded throw
  for (const [z0, z1, m, h] of [[-18.9, -17.9, M.linen, 0.3], [-17.75, -16.7, M.linen, 0.3], [-18.7, -18.0, M.velvet, 0.26], [-17.6, -16.9, M.velvet, 0.26]]) {
    const p = RB(m, 10.25, 10.62, 4.46, 4.46 + h, z0, z1, 0.08);
    p.rotation.z = 0.25;
    if (m === M.velvet) p.position.x -= 0.2;
  }
  // Bench at the foot of the bed
  RB(M.velvet, 7.4, 7.9, 4.3, 4.42, -19.0, -16.6, 0.04);
  for (const [lx, lz] of [[7.45, -18.95], [7.85, -18.95], [7.45, -16.65], [7.85, -16.65]]) R(M.brass, lx - 0.015, lx + 0.015, 3.9, 4.3, lz - 0.015, lz + 0.015);
  for (const z of [-19.75, -15.85]) {
    RB(M.walnut, 10.2, 10.75, 3.9, 4.45, z - 0.3, z + 0.3, 0.02);
    R(M.brass, 10.19, 10.2, 4.25, 4.27, z - 0.12, z + 0.12);
    // Hanging glass globe pendants
    R(M.black, 10.35, 10.36, 4.95, 7.78, z - 0.005, z + 0.005);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), glow(2.6, 2, 1.3));
    globe.position.set(10.35, 4.85, z);
    root.add(globe);
  }
  // Art above the bench wall
  R(M.art2, 2.9, 2.95, 4.6, 6.4, -19.5, -16.5, { tile: 3 });
  // Freestanding stone tub by the glass
  const tub = lathe(M.stoneTub, [[0, 0], [0.3, 0], [0.37, 0.06], [0.42, 0.3], [0.44, 0.56], [0.42, 0.6], [0.38, 0.57], [0.35, 0.32], [0.3, 0.14], [0, 0.12]], 0, 0, 0, 48);
  tub.scale.set(2.0, 1, 1);
  tub.position.set(5.2, 3.9, -20.6);
  const tubWater = new THREE.Mesh(new THREE.CircleGeometry(0.37, 48), M.tubWater);
  tubWater.rotation.x = -Math.PI / 2;
  tubWater.scale.set(2.0, 1, 1);
  tubWater.position.set(5.2, 4.34, -20.6);
  root.add(tubWater);
  tube(M.brass, [[6.35, 3.9, -20.6], [6.35, 4.85, -20.6], [6.2, 5.0, -20.6], [6.05, 4.9, -20.6]], 0.018, root, 20, 8);
  planter(3.4, 3.9, -21.2, 0.25, 0.5, M.ceramic);
  leafCluster(3.4, 4.9, -21.2, 0.45, 160, 0x4e6a45, 0.08);

  /* =========================================================
     INFINITY TERRACE
     ========================================================= */
  R(M.poolTile, -9, 5, -1.4, -1.35, -30.9, -24.6);
  R(M.poolTile, -9, -8.95, -1.4, -0.3, -30.9, -24.6);
  R(M.poolTile, 4.95, 5, -1.4, -0.3, -30.9, -24.6);
  R(M.poolTile, -9, 5, -1.4, -0.3, -24.65, -24.6);
  for (let i = 0; i < 3; i++) {
    RB(M.travertine, 1.5, 4.95, -0.35 - i * 0.3, -0.3 - i * 0.3, -25.0 - i * 0.4, -24.6, 0.01);
    R(M.led, 1.5, 4.95, -0.36 - i * 0.3, -0.35 - i * 0.3, -25.02 - i * 0.4, -25.0 - i * 0.4);
  }
  const pool = R(M.poolWater, -9, 5, -0.12, -0.08, -30.95, -24.6);
  // Sun loungers with cushions
  for (const z of [-25.4, -27.3, -29.2]) {
    const g = grp(8.2, 0, z, 0);
    R(M.walnut, -1.05, 1.05, 0.18, 0.26, -0.38, 0.38, { parent: g });
    RB(M.linen, -1.0, 0.45, 0.26, 0.36, -0.36, 0.36, 0.04, g);
    const back = RB(M.linen, 0.4, 1.1, 0.26, 0.36, -0.36, 0.36, 0.04, g);
    back.rotation.z = 0.6;
    back.position.set(0.95, 0.52, 0);
    const towel = RB(M.velvet, -0.4, 0.0, 0.36, 0.38, -0.34, 0.34, 0.01, g);
    towel.material = std({ color: 0xd9cbb4, roughness: 1 });
    for (const [lx, lz] of [[-0.95, -0.32], [0.95, -0.32], [-0.95, 0.32], [0.95, 0.32]]) R(M.walnut, lx - 0.03, lx + 0.03, 0, 0.18, lz - 0.03, lz + 0.03, { parent: g });
  }
  // Fire-pit lounge
  sofa(8.6, -31.2, 2.4, Math.PI, M.linen, 0.95);
  lathe(M.nero, [[0, 0], [0.5, 0], [0.62, 0.3], [0.65, 0.38], [0.5, 0.4], [0, 0.35]], 8.4, 0, -29.9, 40);
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 8), M.flame);
    f.position.set(8.4 + Math.cos(i * 0.63) * 0.3, 0.5, -29.9 + Math.sin(i * 0.63) * 0.3);
    f.userData.seed = rnd() * 10;
    flames.push(f);
    root.add(f);
  }
  // Cabana
  {
    const g = grp(-10.2, 0, -27.8, 0);
    for (const [px, pz] of [[-1.1, -1.4], [1.1, -1.4], [-1.1, 1.4], [1.1, 1.4]]) R(M.walnut, px - 0.05, px + 0.05, 0, 2.7, pz - 0.05, pz + 0.05, { parent: g });
    R(M.walnut, -1.2, 1.2, 2.7, 2.8, -1.5, 1.5, { parent: g });
    RB(M.linen, -1.0, 1.0, 0.1, 0.45, -1.3, 1.3, 0.08, g);
    for (let i = 0; i < 3; i++) {
      const p = RB([M.taupe, M.velvet, M.linen][i], -0.95, -0.8, 0.45, 0.95, -1.0 + i * 0.7, -0.45 + i * 0.7, 0.06, g);
      p.rotation.z = -0.2;
    }
    curtain(-1.2, 1.2, 1.5, 0.1, 2.68, 8, g).position.set(0, 1.39, 1.45);
  }

  /* ---------- Distant city lights beyond the cliff ---------- */
  {
    const N = 3200;
    const cp = new Float32Array(N * 3);
    const cc = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const cluster = rnd() < 0.7;
      cp[i * 3] = (rnd() - 0.5) * (cluster ? 360 : 900);
      cp[i * 3 + 1] = -68 + rnd() * 2;
      cp[i * 3 + 2] = -120 - Math.pow(rnd(), cluster ? 1.6 : 0.8) * 480;
      col.setHSL(rr(0.08, 0.14), 0.6, rr(0.55, 0.9));
      if (rnd() < 0.2) col.setRGB(0.8, 0.85, 1);
      cc.set([col.r, col.g, col.b], i * 3);
    }
    const cityGeo = new THREE.BufferGeometry();
    cityGeo.setAttribute("position", new THREE.BufferAttribute(cp, 3));
    cityGeo.setAttribute("color", new THREE.BufferAttribute(cc, 3));
    root.add(new THREE.Points(cityGeo, new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.9 })));
  }

  /* ---------- Lights ---------- */
  const L = {
    entrance: pointLight(0xffc98a, 14, 10, 0, 3.6, 1.8),
    foyer: pointLight(0xffd9a8, 8, 7, -2.6, 3.2, -2.2),
    bar: pointLight(0xffb060, 10, 6, 5, 1.5, -2),
    chandelier: pointLight(0xffc27a, 45, 18, -5.4, 5.2, -10.2),
    fire: pointLight(0xff7a2a, 14, 8, -9.8, 1.2, -9.2),
    bedroom: pointLight(0xffc88a, 14, 9, 8.2, 6.4, -17),
    library: pointLight(0xffc88a, 12, 9, 8, 6.4, -4),
    pool: pointLight(0x3fd0ff, 30, 12, -2, -0.5, -27.8),
    firepit: pointLight(0xff8a3a, 12, 7, 8.4, 0.9, -29.9),
  };
  spot(0xffd2a0, 60, -5.4, 7.9, -9.6, -5.4, 0, -10.6, 1.0, true);
  spot(0xffd2a0, 30, 9, 7.6, -17.6, 9.3, 3.9, -17.8, 0.9, false);

  // Shadows: everything opaque casts and receives
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    const opaque = m && !m.transparent && !m.isMeshBasicMaterial;
    o.castShadow = opaque && !o.isInstancedMesh;
    o.receiveShadow = opaque;
  });
  ground.castShadow = false;

  /* ---------- Per-frame animation ---------- */
  function update(t) {
    for (const f of flames) {
      const s = f.userData.seed;
      const k = 0.55 + 0.45 * Math.abs(Math.sin(t * 5.3 + s) * Math.sin(t * 2.1 + s * 1.7));
      f.scale.y = k;
    }
    L.fire.intensity = 11 + Math.sin(t * 13) * 1.5 + Math.sin(t * 7.3) * 2;
    L.firepit.intensity = 10 + Math.sin(t * 11) * 2;
    chandelier.rotation.y = t * 0.04;
    sculpture.rotation.y = t * 0.3;
    orb.rotation.y = 0.5 + t * 0.1;
    M.poolWater.emissiveIntensity = 1 + Math.sin(t * 1.7) * 0.12;
    pool.position.y = -0.1 + Math.sin(t * 1.3) * 0.004;
    for (const fn of animated) fn(t);
  }

  return { root, door, update };
}
