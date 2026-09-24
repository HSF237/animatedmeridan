import * as THREE from "three";

/* =========================================================
   MERIDIAN VILLA — a procedural luxury residence at dusk.
   Units are metres. The front door faces +z; the house runs
   back to a glass wall at z = -22 and an infinity terrace beyond.
   ========================================================= */

// Deterministic random so the villa looks the same on every load
let seed = 20090;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/* ---------- Procedural textures ---------- */
function canvasTexture(size, draw, rotate = false) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (rotate) {
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
  }
  return t;
}

function marbleTex(base, vein, count, alpha, grout = true) {
  return canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 30; i++) {
      const x = rnd() * s, y = rnd() * s, r = 120 + rnd() * 320;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${vein},0.05)`);
      g.addColorStop(1, `rgba(${vein},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
    ctx.lineCap = "round";
    ctx.filter = "blur(0.7px)";
    for (let i = 0; i < count; i++) {
      let x = rnd() * s, y = rnd() * s, a = rnd() * Math.PI * 2;
      ctx.lineWidth = 0.5 + rnd() * 2.6;
      ctx.strokeStyle = `rgba(${vein},${alpha * (0.35 + rnd() * 0.65)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const steps = 30 + ((rnd() * 70) | 0);
      for (let k = 0; k < steps; k++) {
        a += (rnd() - 0.5) * 0.55;
        x += Math.cos(a) * 12;
        y += Math.sin(a) * 12;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.filter = "none";
    if (grout) {
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, s, s);
    }
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
      ctx.fillRect(rnd() * s, rnd() * s, 80 + rnd() * 420, 1 + rnd() * 2);
    }
    if (planks) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      const ph = s / planks;
      for (let i = 0; i < planks; i++) {
        ctx.fillRect(0, i * ph, s, 2);
        ctx.fillRect(rnd() * s, i * ph, 2, ph);
      }
    }
  }, rotate);
}

function travertineTex() {
  return canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = "#cdbfa7";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 520; i++) {
      ctx.fillStyle = rnd() < 0.5 ? `rgba(255,248,235,${rnd() * 0.18})` : `rgba(120,100,75,${rnd() * 0.14})`;
      ctx.fillRect(0, rnd() * s, s, 1 + rnd() * 5);
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(95,78,58,${0.15 + rnd() * 0.3})`;
      ctx.fillRect(rnd() * s, rnd() * s, 2 + rnd() * 12, 1 + rnd() * 2);
    }
    ctx.strokeStyle = "rgba(60,50,40,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, s, s);
  });
}

function artTex() {
  return canvasTexture(1024, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#1b1714");
    g.addColorStop(1, "#2b221b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#0b0a09";
    ctx.beginPath();
    ctx.arc(s * 0.62, s * 0.46, s * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = i % 3 === 0 ? "#e3c07a" : i % 3 === 1 ? "#b8864a" : "#efe6d6";
      ctx.globalAlpha = 0.5 + rnd() * 0.4;
      ctx.lineWidth = 8 + rnd() * 50;
      ctx.beginPath();
      ctx.arc(s * (0.3 + rnd() * 0.4), s * (0.4 + rnd() * 0.3), s * (0.2 + rnd() * 0.35), rnd() * 6, rnd() * 6 + 1.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

function rugTex() {
  return canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = "#3b3632";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? "255,240,220" : "0,0,0"},${rnd() * 0.06})`;
      ctx.fillRect(rnd() * s, rnd() * s, 2, 2);
    }
    ctx.strokeStyle = "rgba(210,180,130,0.45)";
    ctx.lineWidth = 6;
    ctx.strokeRect(50, 50, s - 100, s - 100);
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, s - 160, s - 160);
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

export function buildVilla(scene, { nightEnv }) {
  const root = new THREE.Group();
  scene.add(root);

  /* ---------- Materials ---------- */
  const ENV = 0.35;
  const std = (o) => new THREE.MeshStandardMaterial({ envMapIntensity: ENV, ...o });
  const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });

  const M = {
    marbleFloor: std({ map: marbleTex("#e8e4de", "110,104,98", 26, 0.45), roughness: 0.14 }),
    marble: std({ map: marbleTex("#efece7", "120,112,104", 40, 0.5, false), roughness: 0.18 }),
    nero: std({ map: marbleTex("#0f0f11", "235,230,220", 30, 0.35, false), roughness: 0.22 }),
    travertine: std({ map: travertineTex(), roughness: 0.8 }),
    walnut: std({ map: woodTex([92, 58, 36]), roughness: 0.55 }),
    walnutV: std({ map: woodTex([92, 58, 36], 0, true), roughness: 0.55 }),
    oakFloor: std({ map: woodTex([150, 112, 76], 8), roughness: 0.45 }),
    plaster: std({ color: 0xe7e2da, roughness: 0.95 }),
    charcoal: std({ color: 0x1d1e21, roughness: 0.6, metalness: 0.3 }),
    black: std({ color: 0x0c0c0d, roughness: 0.35, metalness: 0.6 }),
    brass: std({ color: 0xc9a266, roughness: 0.25, metalness: 1, envMapIntensity: 1 }),
    boucle: std({ color: 0xded6c8, roughness: 1 }),
    linen: std({ color: 0xf1ede6, roughness: 1 }),
    cognac: std({ color: 0x7c4a28, roughness: 0.5 }),
    rug: std({ map: rugTex(), roughness: 1 }),
    art: std({ map: artTex(), roughness: 0.9 }),
    leaf: std({ color: 0x33503c, roughness: 0.9, flatShading: true }),
    bark: std({ color: 0x3b2c22, roughness: 1 }),
    ground: std({ color: 0x101311, roughness: 1 }),
    rock: std({ color: 0x0c0d0f, roughness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x9fb8c6, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.14,
      envMap: nightEnv, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide,
    }),
    mirrorWater: std({ color: 0x020305, roughness: 0.03, metalness: 1, envMap: nightEnv, envMapIntensity: 1.6 }),
    poolWater: new THREE.MeshStandardMaterial({
      color: 0x1aa3c7, emissive: 0x0a6f8c, emissiveIntensity: 1.1, roughness: 0.05, metalness: 0.1,
      transparent: true, opacity: 0.82, envMap: nightEnv, envMapIntensity: 1,
    }),
    poolTile: glow(0.05, 0.55, 0.7),
    led: glow(3.2, 2.3, 1.4),
    ledSoft: glow(1.5, 1.05, 0.62),
    ledDim: glow(0.55, 0.36, 0.2),
    bulb: glow(5, 3.6, 2.2),
    fire: glow(4, 1.6, 0.35),
  };

  function R(mat, x0, x1, y0, y1, z0, z1, { tile = 1.2, parent = root } = {}) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const geo = new THREE.BoxGeometry(w, h, d);
    if (mat.map) scaleBoxUV(geo, w, h, d, tile);
    const m = new THREE.Mesh(geo, mat);
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
  function pointLight(color, intensity, dist, x, y, z) {
    const l = new THREE.PointLight(color, intensity, dist, 2);
    l.position.set(x, y, z);
    root.add(l);
    return l;
  }

  /* =========================================================
     SITE
     ========================================================= */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 112), M.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.15, 24);
  root.add(ground);
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
    R(M.travertine, -1.1, 1.1, 0.0, 0.1, z - 0.45, z + 0.45);
    R(M.ledSoft, -1.0, 1.0, -0.04, -0.02, z - 0.47, z - 0.45);
  }
  // Façade uplights
  for (const x of [-10.2, -8, -5.8, 3, 5.5, 8, 10.5]) cyl(M.bulb, 0.06, 0.06, 0.02, x, 0.0, 1.2, 12);

  // Sculpted olive trees
  function tree(x, z, s = 1, parent = root) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 2.2, 7), M.bark);
    trunk.position.y = 1.1;
    trunk.rotation.z = (rnd() - 0.5) * 0.25;
    g.add(trunk);
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + rnd() * 0.5, 0), M.leaf);
      c.position.set((rnd() - 0.5) * 1.6, 2.3 + rnd() * 1.1, (rnd() - 0.5) * 1.6);
      g.add(c);
    }
    g.position.set(x, -0.15, z);
    g.scale.setScalar(s);
    parent.add(g);
    return g;
  }
  const trees = [tree(-12.5, 6, 1.3), tree(12.8, 8, 1.1), tree(-13.5, 14, 1.2), tree(14, 16, 1.4), tree(-12.8, -27, 1.1)];
  for (const [x, z] of [[-12.5, 6], [12.8, 8], [-13.5, 14], [14, 16]]) cyl(M.bulb, 0.08, 0.08, 0.02, x + 0.6, -0.15, z + 0.6, 10);

  /* =========================================================
     SHELL
     ========================================================= */
  // Floors
  R(M.marbleFloor, -11, 11, -0.15, 0.0, -22, 0.0);
  // Terrace (leaves a void for the infinity pool)
  R(M.travertine, -11.4, 11.4, -0.3, 0.0, -24.6, -22);
  R(M.travertine, 5, 11.4, -0.3, 0.0, -32, -24.6);
  R(M.travertine, -11.4, -9, -0.3, 0.0, -32, -24.6);
  R(M.travertine, -9, 5, -0.45, -0.18, -32, -30.9);

  // Left travertine monolith (full height) and left side wall
  R(M.travertine, -11.4, -4.5, 0, 8.6, -0.6, 0.0);
  R(M.travertine, -11.4, -11, 0, 8.6, -22, -0.6);
  // Glass: foyer sidelight, clerestory over the entrance, right façade
  R(M.glass, -4.5, -0.9, 0, 4.0, -0.04, 0.0);
  R(M.glass, -4.5, 2.6, 4.35, 8.2, -0.04, 0.0);
  R(M.glass, 0.9, 2.6, 0, 4.0, -0.04, 0.0);
  R(M.glass, 2.6, 11, 0, 3.6, -0.04, 0.0);
  R(M.travertine, -0.9, 0.9, 3.6, 4.0, -0.3, 0.0); // stone transom over the door
  for (const x of [-4.5, -0.9, 0.9, 2.6, 4.7, 6.8, 8.9, 11]) R(M.black, x - 0.03, x + 0.03, 0, x < 2.7 ? 4.0 : 3.6, -0.06, 0.02);
  for (const x of [-4.5, -1.8, 0.6, 2.6]) R(M.black, x - 0.03, x + 0.03, 4.35, 8.2, -0.06, 0.02);

  // Entrance canopy with lit soffit
  R(M.charcoal, -4.5, 2.6, 4.0, 4.35, 0.0, 3.0);
  R(M.led, -4.4, 2.5, 3.98, 4.0, 2.85, 2.9);

  // Living roof (double height) — overhangs the terrace
  R(M.plaster, -11.4, 2.6, 8.2, 8.6, -26, 0.8);
  R(M.charcoal, -11.4, 2.6, 8.6, 8.7, -26, 0.8);
  R(M.led, -11.3, 2.5, 8.18, 8.2, -25.9, -25.85);
  // Recessed linear lights in the living ceiling
  for (const x of [-8.5, -5, -1.5]) R(M.ledSoft, x - 0.03, x + 0.03, 8.18, 8.2, -21, -1);

  // Upper volume (mezzanine / master suite) — cantilevers over the entrance
  R(M.oakFloor, 2.6, 11.4, 3.6, 3.9, -22, 3.0, { tile: 2.4 });
  R(M.plaster, 2.6, 11.4, 3.58, 3.6, -22, 0.0); // kitchen ceiling
  R(M.charcoal, 2.6, 11.4, 3.3, 3.6, 0.0, 3.0); // cantilever soffit
  R(M.led, 2.7, 11.3, 3.28, 3.3, 2.85, 2.9);
  R(M.charcoal, 2.6, 11.6, 7.8, 8.1, -22, 3.0); // roof
  R(M.charcoal, 11, 11.4, 0, 7.8, -22, 3.0); // right wall
  R(M.walnutV, 10.9, 11, 0, 3.58, -22, 0, { tile: 2 });
  // Front of upper volume: charcoal fascia with ribbon window
  R(M.charcoal, 2.6, 11.4, 3.9, 5.0, 2.9, 3.0);
  R(M.charcoal, 2.6, 11.4, 6.7, 7.8, 2.9, 3.0);
  R(M.charcoal, 2.6, 3.4, 5.0, 6.7, 2.9, 3.0);
  R(M.charcoal, 10.6, 11.4, 5.0, 6.7, 2.9, 3.0);
  R(M.glass, 3.4, 10.6, 5.0, 6.7, 2.92, 2.96);
  R(M.ledSoft, 3.4, 10.6, 6.66, 6.7, 2.7, 2.9);
  // Mezzanine edge: LED reveal, glass balustrade, brass rail (opening at the stair landing)
  R(M.led, 2.56, 2.6, 3.6, 3.64, -22, 3.0);
  R(M.glass, 2.62, 2.66, 3.9, 5.0, -22, -12.5);
  R(M.glass, 2.62, 2.66, 3.9, 5.0, -11, 2.9);
  R(M.brass, 2.61, 2.67, 5.0, 5.04, -22, -12.5);
  R(M.brass, 2.61, 2.67, 5.0, 5.04, -11, 2.9);

  // Rear glass wall
  R(M.glass, -11, 11, 0, 8.2, -22.03, -21.97);
  for (let x = -11; x <= 11.01; x += 2.75) R(M.black, x - 0.03, x + 0.03, 0, 8.2, -22.05, -21.95);

  /* =========================================================
     ENTRANCE — pivot door
     ========================================================= */
  const door = new THREE.Group();
  door.position.set(-0.45, 0, -0.1);
  root.add(door);
  R(M.walnutV, -0.45, 1.35, 0, 3.6, -0.06, 0.06, { parent: door, tile: 1.8 });
  R(M.brass, 1.05, 1.1, 0.6, 3.0, 0.06, 0.12, { parent: door });
  R(M.brass, 1.05, 1.1, 0.6, 3.0, -0.12, -0.06, { parent: door });

  /* =========================================================
     FOYER
     ========================================================= */
  R(M.travertine, -3.3, -2.5, 0, 1.05, -2.9, -2.1);
  const sculpture = new THREE.Mesh(new THREE.TorusKnotGeometry(0.26, 0.07, 160, 16, 2, 3), M.brass);
  sculpture.position.set(-2.9, 1.5, -2.5);
  root.add(sculpture);
  R(M.bulb, -3.1, -2.7, 8.18, 8.2, -2.7, -2.3);

  /* =========================================================
     GRAND LIVING — double height
     ========================================================= */
  // Fireplace wall in Nero Marquina with a linear fire and art above
  R(M.nero, -11, -10.6, 0, 8.2, -14, -4.5, { tile: 2.2 });
  R(M.black, -10.62, -10.5, 0.75, 1.55, -12, -6.5);
  const flames = [];
  for (let i = 0; i < 26; i++) {
    const f = R(M.fire, -10.6, -10.55, 0.8, 1.25, -11.9 + i * 0.2, -11.78 + i * 0.2);
    f.userData.seed = rnd() * 10;
    flames.push(f);
  }
  R(M.led, -10.6, -10.52, 0.78, 0.8, -12, -6.5);
  R(M.art, -10.6, -10.55, 3.2, 5.8, -11.2, -7.3, { tile: 3.9 });
  R(M.brass, -10.61, -10.54, 3.12, 3.16, -11.3, -7.2);

  // Rug, sofas, coffee tables
  R(M.rug, -8.8, -1.4, 0.0, 0.02, -14.2, -6.6, { tile: 7.4 });
  function sofa(x, z, len, rot, depth = 1.05) {
    const g = new THREE.Group();
    R(M.boucle, -len / 2, len / 2, 0.08, 0.4, -depth / 2, depth / 2, { parent: g });
    const n = Math.max(2, Math.round(len / 1.2));
    for (let i = 0; i < n; i++) {
      const x0 = -len / 2 + 0.15 + (i * (len - 0.3)) / n;
      R(M.boucle, x0 + 0.02, x0 + (len - 0.3) / n - 0.02, 0.4, 0.55, -depth / 2 + 0.25, depth / 2 - 0.02, { parent: g });
    }
    R(M.boucle, -len / 2, len / 2, 0.4, 0.85, -depth / 2, -depth / 2 + 0.25, { parent: g });
    R(M.boucle, -len / 2, -len / 2 + 0.15, 0.4, 0.62, -depth / 2, depth / 2, { parent: g });
    R(M.boucle, len / 2 - 0.15, len / 2, 0.4, 0.62, -depth / 2, depth / 2, { parent: g });
    R(M.black, -len / 2 + 0.05, len / 2 - 0.05, 0, 0.08, -depth / 2 + 0.05, depth / 2 - 0.05, { parent: g });
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    root.add(g);
    return g;
  }
  sofa(-2.1, -10.4, 5.4, -Math.PI / 2);
  sofa(-5.6, -13.7, 3.4, 0);
  function armchair(x, z, rot) {
    const g = new THREE.Group();
    R(M.cognac, -0.45, 0.45, 0.2, 0.45, -0.45, 0.45, { parent: g });
    R(M.cognac, -0.45, 0.45, 0.45, 0.9, -0.45, -0.3, { parent: g });
    R(M.cognac, -0.45, -0.35, 0.45, 0.62, -0.45, 0.45, { parent: g });
    R(M.cognac, 0.35, 0.45, 0.45, 0.62, -0.45, 0.45, { parent: g });
    for (const [lx, lz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) cyl(M.brass, 0.02, 0.02, 0.2, lx, 0, lz, 8, g);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    root.add(g);
    return g;
  }
  armchair(-8.4, -8.3, Math.PI / 2 + 0.35);
  armchair(-8.4, -12.3, Math.PI / 2 - 0.35);
  cyl(M.travertine, 0.8, 0.8, 0.34, -5.4, 0.02, -10.2, 48);
  cyl(M.nero, 0.45, 0.45, 0.44, -4.2, 0.02, -11.6, 40);
  cyl(M.brass, 0.25, 0.25, 0.55, -2.1, 0.02, -7.2, 24);
  cyl(M.ledSoft, 0.14, 0.2, 0.32, -2.1, 0.57, -7.2, 20);

  // Cascading glass-rod chandelier — the centrepiece
  const chandelier = new THREE.Group();
  chandelier.position.set(-5.4, 0, -10.2);
  root.add(chandelier);
  const rods = 64;
  const rodGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.75, 6);
  const rodMesh = new THREE.InstancedMesh(rodGeo, glow(1.7, 1.3, 0.85), rods);
  const cordPts = [];
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < rods; i++) {
    const a = i * 2.39996;
    const r = 0.25 + Math.sqrt(i / rods) * 1.75;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = 4.4 + (r / 2) * 1.6 + rnd() * 0.5;
    mtx.makeTranslation(x, y, z);
    rodMesh.setMatrixAt(i, mtx);
    cordPts.push(new THREE.Vector3(x, y + 0.37, z), new THREE.Vector3(x, 8.2, z));
  }
  chandelier.add(rodMesh);
  chandelier.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(cordPts),
    new THREE.LineBasicMaterial({ color: 0x8a7a66, transparent: true, opacity: 0.35 })
  ));
  const canopy = cyl(M.brass, 0.5, 0.5, 0.05, 0, 8.15, 0, 32, chandelier);
  canopy.position.y = 8.17;

  // Reading nook by the glass: lounge chairs, arc lamp, indoor tree
  armchair(-5.6, -18.6, Math.PI + 0.25);
  armchair(-3.6, -18.6, Math.PI - 0.25);
  cyl(M.nero, 0.3, 0.3, 0.45, -4.6, 0, -18.4, 32);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.025, 8, 48, Math.PI * 0.7), M.brass);
  arc.position.set(-7.1, 1.1, -18.2);
  arc.rotation.y = Math.PI / 2;
  root.add(arc);
  cyl(M.black, 0.2, 0.2, 0.06, -7.1, 0, -18.2, 24);
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.brass);
  shade.position.set(-7.1, 2.0, -17.1);
  shade.material.side = THREE.DoubleSide;
  root.add(shade);
  cyl(M.bulb, 0.08, 0.08, 0.06, -7.1, 1.84, -17.1, 12);
  R(M.travertine, -10.2, -8.2, 0, 0.6, -20.8, -18.8);
  trees.push(tree(-9.2, -19.8, 0.95));
  trees[trees.length - 1].position.y = 0.6;

  /* =========================================================
     FLOATING STAIR + walnut slat wall
     ========================================================= */
  for (let i = 0; i < 17; i++) {
    const zc = -18.2 + i * 0.36;
    const y = 0.2 + (i + 1) * 0.215;
    R(M.walnut, 0.9, 2.55, y - 0.07, y, zc - 0.17, zc + 0.17);
    R(M.ledSoft, 0.95, 2.5, y - 0.075, y - 0.07, zc + 0.12, zc + 0.16);
    R(M.black, 0.93, 0.95, y, 8.2, zc - 0.006, zc + 0.006); // suspension rods
  }
  R(M.oakFloor, 0.9, 2.6, 3.6, 3.9, -12.5, -11, { tile: 2.4 });
  for (let z = -19; z < -12.6; z += 0.12) R(M.walnutV, 2.56, 2.64, 0, 3.58, z, z + 0.05, { tile: 2 });

  /* =========================================================
     KITCHEN
     ========================================================= */
  R(M.walnut, 9.8, 10.4, 0, 0.9, -12.8, -4.2);
  R(M.marble, 9.75, 10.4, 0.9, 0.95, -12.8, -4.2);
  R(M.marble, 10.38, 10.42, 0.95, 1.62, -12.8, -4.2);
  R(M.led, 10.1, 10.38, 1.6, 1.62, -12.8, -4.2);
  R(M.walnutV, 10.05, 10.42, 1.62, 3.58, -12.8, -4.2, { tile: 2 });
  for (let z = -12.8; z <= -4.19; z += 1.075) R(M.black, 10.03, 10.05, 1.62, 3.58, z - 0.005, z + 0.005);
  // Island: waterfall marble
  R(M.marble, 5.9, 7.0, 0, 0.93, -11, -5.5);
  R(M.marble, 5.6, 7.05, 0.93, 0.98, -11.05, -5.45);
  R(M.black, 6.3, 6.8, 0.981, 0.985, -9.2, -7.8);
  // Stools
  for (const z of [-6.4, -7.6, -8.8, -10]) {
    cyl(M.black, 0.02, 0.02, 0.72, 5.1, 0, z, 8);
    cyl(M.black, 0.2, 0.2, 0.02, 5.1, 0, z, 16);
    cyl(M.cognac, 0.2, 0.2, 0.07, 5.1, 0.72, z, 20);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 24), M.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(5.1, 0.3, z);
    root.add(ring);
  }
  // Brass pendants
  for (const z of [-6.5, -8.25, -10]) {
    R(M.black, 6.44, 6.46, 2.35, 3.58, z - 0.01, z + 0.01);
    const shadeM = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.34, 32, 1, true), M.brass);
    shadeM.material.side = THREE.DoubleSide;
    shadeM.position.set(6.45, 2.2, z);
    root.add(shadeM);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), M.bulb);
    b.position.set(6.45, 2.07, z);
    root.add(b);
  }
  // Downlights
  for (let x = 4; x <= 9.5; x += 2.75) for (let z = -2; z >= -20; z -= 3) cyl(M.bulb, 0.07, 0.07, 0.01, x, 3.575, z, 12);

  /* =========================================================
     WINE WALL + DINING
     ========================================================= */
  R(M.ledDim, 10.6, 10.62, 0.2, 3.4, -21.5, -13.3);
  R(M.black, 10.25, 10.6, 0.15, 0.2, -21.5, -13.3);
  R(M.black, 10.25, 10.6, 3.4, 3.45, -21.5, -13.3);
  for (let z = -21.5; z <= -13.29; z += 0.82) R(M.black, 10.25, 10.6, 0.2, 3.4, z - 0.012, z + 0.012);
  R(M.glass, 10.22, 10.24, 0.15, 3.45, -21.5, -13.3);
  const bottleGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.32, 8);
  bottleGeo.rotateZ(Math.PI / 2);
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.2 });
  const rows = 13, cols = 30;
  const bottles = new THREE.InstancedMesh(bottleGeo, bottleMat, rows * cols);
  const col = new THREE.Color();
  let bi = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      mtx.makeTranslation(10.44, 0.4 + r * 0.235, -21.3 + c * 0.27);
      bottles.setMatrixAt(bi, mtx);
      bottles.setColorAt(bi++, col.set(rnd() < 0.55 ? 0x2a0d12 : rnd() < 0.6 ? 0x14261a : 0x3a2a12));
    }
  }
  root.add(bottles);

  R(M.nero, 6.1, 7.5, 0.72, 0.77, -19.4, -14.6);
  R(M.black, 6.5, 7.1, 0, 0.72, -18.7, -18.6);
  R(M.black, 6.5, 7.1, 0, 0.72, -15.4, -15.3);
  function chair(x, z, rot) {
    const g = new THREE.Group();
    R(M.linen, -0.25, 0.25, 0.44, 0.5, -0.25, 0.25, { parent: g });
    R(M.linen, -0.25, 0.25, 0.5, 0.95, -0.25, -0.2, { parent: g });
    for (const [lx, lz] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) R(M.black, lx - 0.015, lx + 0.015, 0, 0.44, lz - 0.015, lz + 0.015, { parent: g });
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    root.add(g);
  }
  for (const z of [-18.6, -17.4, -16.2, -15.0]) {
    chair(5.6, z, Math.PI / 2);
    chair(8.0, z, -Math.PI / 2);
  }
  const ringLight = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.03, 10, 96), M.led);
  ringLight.rotation.x = Math.PI / 2;
  ringLight.position.set(6.8, 2.5, -17);
  root.add(ringLight);
  for (const a of [0, 2.1, 4.2]) R(M.black, 6.8 + Math.cos(a) * 1.3 - 0.005, 6.8 + Math.cos(a) * 1.3 + 0.005, 2.5, 3.58, -17 + Math.sin(a) * 1.3 - 0.005, -17 + Math.sin(a) * 1.3 + 0.005);

  /* =========================================================
     UPPER LEVEL — library lounge + master suite
     ========================================================= */
  // Library wall
  R(M.walnut, 10.6, 11, 3.9, 7.6, -10, 2.4);
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 260);
  let bk = 0;
  for (let s = 0; s < 6; s++) {
    const y0 = 4.05 + s * 0.58;
    R(M.walnut, 10.3, 10.6, y0 - 0.04, y0, -10, 2.4);
    let z = -9.9;
    while (z < 2.2 && bk < 260) {
      const w = 0.04 + rnd() * 0.05, h = 0.26 + rnd() * 0.18;
      if (rnd() < 0.08) { z += 0.3; continue; }
      mtx.compose(new THREE.Vector3(10.45, y0 + h / 2, z + w / 2), new THREE.Quaternion(), new THREE.Vector3(0.24, h, w));
      books.setMatrixAt(bk, mtx);
      books.setColorAt(bk++, col.setHSL(0.05 + rnd() * 0.08, 0.2 + rnd() * 0.3, 0.12 + rnd() * 0.35));
      z += w + 0.005;
    }
  }
  books.count = bk;
  root.add(books);
  R(M.ledSoft, 10.3, 10.6, 7.56, 7.6, -10, 2.4);
  // Desk
  R(M.walnut, 6.2, 8.6, 4.62, 4.67, -5.4, -4.4);
  R(M.black, 6.3, 6.34, 3.9, 4.62, -5.3, -4.5);
  R(M.black, 8.46, 8.5, 3.9, 4.62, -5.3, -4.5);
  cyl(M.brass, 0.1, 0.1, 0.02, 8.2, 4.67, -4.7, 16);
  cyl(M.brass, 0.01, 0.01, 0.45, 8.2, 4.67, -4.7, 8);
  cyl(M.bulb, 0.12, 0.08, 0.1, 8.2, 5.1, -4.7, 16);
  armchair(7.4, -3.4, Math.PI).position.y = 3.9;
  armchair(4.4, -7, Math.PI / 2).position.y = 3.9;

  // Master suite
  R(M.rug, 7.2, 10.6, 3.9, 3.92, -20.2, -15.4, { tile: 4.8 });
  R(M.walnut, 10.8, 11, 3.9, 5.5, -20.2, -15.2);
  R(M.ledSoft, 10.78, 10.8, 5.46, 5.5, -20.2, -15.2);
  R(M.walnut, 8.3, 10.8, 3.9, 4.2, -18.95, -16.65);
  R(M.linen, 8.4, 10.75, 4.2, 4.5, -18.85, -16.75);
  R(M.cognac, 8.4, 9.3, 4.5, 4.53, -18.9, -16.7);
  R(M.linen, 10.2, 10.7, 4.5, 4.72, -18.6, -17.85);
  R(M.linen, 10.2, 10.7, 4.5, 4.72, -17.65, -16.95);
  for (const z of [-19.7, -16.1]) {
    R(M.walnut, 10.25, 10.8, 3.9, 4.4, z - 0.3, z + 0.3);
    cyl(M.bulb, 0.1, 0.12, 0.3, 10.5, 4.4, z, 16);
  }
  armchair(4.4, -18.6, Math.PI + 0.4).position.y = 3.9;

  /* =========================================================
     INFINITY TERRACE
     ========================================================= */
  R(M.poolTile, -9, 5, -1.4, -1.35, -30.9, -24.6);
  R(M.poolTile, -9, -8.95, -1.4, -0.3, -30.9, -24.6);
  R(M.poolTile, 4.95, 5, -1.4, -0.3, -30.9, -24.6);
  R(M.poolTile, -9, 5, -1.4, -0.3, -24.65, -24.6);
  const pool = R(M.poolWater, -9, 5, -0.12, -0.08, -30.95, -24.6);
  for (const z of [-25.4, -27.4, -29.4]) {
    R(M.linen, 7, 9.2, 0.25, 0.4, z - 0.4, z + 0.4);
    const back = R(M.linen, 8.9, 9.6, 0.3, 0.45, z - 0.4, z + 0.4);
    back.rotation.z = 0.7;
    back.position.set(9.4, 0.62, z);
    R(M.black, 7.1, 9.1, 0, 0.25, z - 0.35, z - 0.33);
    R(M.black, 7.1, 9.1, 0, 0.25, z + 0.33, z + 0.35);
  }
  cyl(M.nero, 0.55, 0.45, 0.4, 8.2, 0, -31, 32);
  cyl(M.fire, 0.35, 0.35, 0.03, 8.2, 0.4, -31, 32);

  /* ---------- Distant city lights beyond the cliff ---------- */
  const N = 3200;
  const cp = new Float32Array(N * 3);
  const cc = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const cluster = rnd() < 0.7;
    cp[i * 3] = (rnd() - 0.5) * (cluster ? 360 : 900);
    cp[i * 3 + 1] = -68 + rnd() * 2;
    cp[i * 3 + 2] = -120 - Math.pow(rnd(), cluster ? 1.6 : 0.8) * 480;
    col.setHSL(0.08 + rnd() * 0.06, 0.6, 0.55 + rnd() * 0.35);
    if (rnd() < 0.2) col.setRGB(0.8, 0.85, 1);
    cc.set([col.r, col.g, col.b], i * 3);
  }
  const cityGeo = new THREE.BufferGeometry();
  cityGeo.setAttribute("position", new THREE.BufferAttribute(cp, 3));
  cityGeo.setAttribute("color", new THREE.BufferAttribute(cc, 3));
  root.add(new THREE.Points(cityGeo, new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.9 })));

  /* ---------- Lights ---------- */
  const L = {
    entrance: pointLight(0xffc98a, 14, 10, 0, 3.6, 1.8),
    foyer: pointLight(0xffc98a, 10, 8, -2.4, 3.5, -2.5),
    chandelier: pointLight(0xffc27a, 50, 18, -5.4, 5.2, -10.2),
    fire: pointLight(0xff7a2a, 14, 8, -9.8, 1.2, -9.2),
    kitchen: pointLight(0xffd29a, 22, 10, 6.4, 2.6, -8.2),
    dining: pointLight(0xffc27a, 18, 9, 6.8, 2.3, -17),
    bedroom: pointLight(0xffc88a, 16, 9, 8.2, 6.4, -17),
    library: pointLight(0xffc88a, 12, 9, 8, 6.4, -4),
    pool: pointLight(0x3fd0ff, 30, 12, -2, -0.5, -27.8),
  };

  /* ---------- Per-frame animation ---------- */
  function update(t) {
    for (const f of flames) {
      const s = f.userData.seed;
      f.scale.y = 0.55 + 0.45 * Math.abs(Math.sin(t * 5.3 + s) * Math.sin(t * 2.1 + s * 1.7));
      f.position.y = 0.8 + (0.45 * f.scale.y) / 2;
    }
    L.fire.intensity = 11 + Math.sin(t * 13) * 1.5 + Math.sin(t * 7.3) * 2;
    chandelier.rotation.y = t * 0.05;
    sculpture.rotation.y = t * 0.3;
    M.poolWater.emissiveIntensity = 1 + Math.sin(t * 1.7) * 0.12;
    pool.position.y = -0.1 + Math.sin(t * 1.3) * 0.004;
    trees.forEach((tr, i) => (tr.rotation.z = Math.sin(t * 0.7 + i) * 0.012));
  }

  return { root, door, update };
}
