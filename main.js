import * as THREE from "three";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 760px)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

document.body.classList.add("loading");
document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   REAL-3D VILLA
   Every room photo is rebuilt as 3D geometry from a depth map
   (Depth Anything V2): each pixel is pushed out to its distance, so the
   camera genuinely moves through the space. You walk forward through a
   room, then turn 90° in 3D — the room you leave bursts into gold
   particles and the next one assembles from them, solidifying behind a
   gold scan line. Labels draw themselves onto the 3D scene.
   ========================================================= */
const HFOV = THREE.MathUtils.degToRad(64); // assumed horizontal field of view of the photos
const IMG_ASPECT = 1672 / 941;

// anchors: [u, v from top, label, detail]
const ROOMS = [
  {
    key: "arrival", room: "Arrival", t: 0, turn: -1, near: 3, far: 70, walk: 6,
    anchors: [[0.42, 0.58, "Grand entrance stair", "Floating travertine treads"], [0.66, 0.4, "Cantilevered terrace", "Frameless glass balustrade"], [0.86, 0.66, "Infinity pool", "Overflow edge to the bay"]],
  },
  {
    key: "terrace", room: "Infinity Terrace", t: 1.0, turn: 1, near: 2.2, far: 60, walk: 4,
    anchors: [[0.84, 0.84, "Infinity edge", "Cascading water wall"], [0.28, 0.62, "Travertine sun deck", "Daybeds in Belgian linen"], [0.55, 0.28, "Master terrace", "Glass & bronze"]],
  },
  {
    key: "living", room: "Grand Living", t: 2.05, turn: 1, near: 2, far: 30, walk: 2.2,
    anchors: [[0.48, 0.12, "Crystal cascade chandelier", "Hand-blown glass rods"], [0.42, 0.42, "7.2 m glazing", "Double-height sea view"], [0.9, 0.68, "Linear fireplace", "Book-matched marble"], [0.28, 0.66, "Bouclé lounge", "Bespoke modular sofa"]],
  },
  {
    key: "kitchen", room: "Kitchen", t: 3.15, turn: -1, near: 2, far: 26, walk: 2,
    anchors: [[0.38, 0.68, "Quartzite waterfall island", "Single-slab, 4.8 m"], [0.52, 0.2, "Blown-glass pendants", "Brass & amber"], [0.16, 0.2, "Walnut millwork", "Floor-to-ceiling"], [0.03, 0.45, "Wine wall", "Climate-controlled"]],
  },
  {
    key: "suite", room: "Master Suite", t: 4.25, turn: -1, near: 1.8, far: 28, walk: 2,
    anchors: [[0.14, 0.26, "Hand-split stone wall", "Backlit relief"], [0.72, 0.34, "Panoramic sliders", "Opens to the terrace"], [0.34, 0.6, "Bespoke bed", "Silk & bouclé"]],
  },
  {
    key: "terrace", room: "Sunset Terrace", t: 5.4, turn: 0, near: 2.2, far: 60, walk: 1.6,
    anchors: [[0.95, 0.47, "Golden hour", "Due west over the bay"], [0.58, 0.58, "Outdoor lounge", "Fire table & loggia"]],
  },
];
const END_T = 7;
const HOLD = 0.58; // part of each segment spent walking through a room

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x0b0c0f, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0c0f, 60, 140);
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.05, 400);

/* ---------- Assets ---------- */
const keys = [...new Set(ROOMS.map((r) => r.key))];
const uniqueSrcs = keys.flatMap((k) => [`assets/villa/${k}.webp`, `assets/villa/${k}-depth.png`]);
let loadedCount = 0;
const tex = {};
const depthPixels = {};
const texLoader = new THREE.TextureLoader();
function loadTex(src, isDepth) {
  return new Promise((resolve) => {
    texLoader.load(src, (t) => {
      t.colorSpace = isDepth ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (isDepth) {
        // keep CPU-side depth for placing labels and camera paths
        const c = document.createElement("canvas");
        c.width = t.image.width;
        c.height = t.image.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(t.image, 0, 0);
        depthPixels[src] = { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
      }
      tex[src] = t;
      loadedCount++;
      resolve();
    }, undefined, () => { loadedCount++; resolve(); });
  });
}
const assetsReady = Promise.all(keys.flatMap((k) => [loadTex(`assets/villa/${k}.webp`, false), loadTex(`assets/villa/${k}-depth.png`, true)]));

/* ---------- Shaders ---------- */
const common = /* glsl */ `
  uniform sampler2D colorMap, depthMap;
  uniform float tanH, imgAspect, invNear, invFar;
  vec3 unproject(vec2 uv, float d) {
    float z = 1.0 / mix(invFar, invNear, d);
    return vec3((uv.x - 0.5) * 2.0 * tanH * z, (uv.y - 0.5) * 2.0 * tanH / imgAspect * z, -z);
  }
`;

const meshVert = /* glsl */ `
  ${common}
  uniform float lod, backOffset;
  varying vec2 vUv;
  varying float vDisp, vStretch;
  void main() {
    vUv = uv;
    float d = textureLod(depthMap, uv, lod).r;
    float e = 1.5 / 1024.0;
    float dx = abs(textureLod(depthMap, uv + vec2(e, 0.0), lod).r - textureLod(depthMap, uv - vec2(e, 0.0), lod).r);
    float dy = abs(textureLod(depthMap, uv + vec2(0.0, e * 1.78), lod).r - textureLod(depthMap, uv - vec2(0.0, e * 1.78), lod).r);
    vStretch = max(dx, dy);
    vDisp = d;
    vec3 p = unproject(uv, d) * (1.0 + backOffset);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const meshFrag = /* glsl */ `
  uniform sampler2D colorMap;
  uniform float solid, stretchCut;
  varying vec2 vUv;
  varying float vDisp, vStretch;
  void main() {
    if (vStretch > stretchCut) discard;
    // materialise from far to near behind a gold scan front
    float front = solid * 1.25 - 0.1;
    if (vDisp > front) discard;
    vec3 col = texture2D(colorMap, vUv).rgb;
    float band = smoothstep(front - 0.07, front, vDisp) * step(solid, 0.999);
    col = mix(col, vec3(1.0, 0.78, 0.45) * 1.6, band * 0.85);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const pointsVert = /* glsl */ `
  ${common}
  attribute vec3 rdir;
  attribute float rnd;
  uniform float scatter, time, pxScale, gather;
  varying vec3 vColor;
  varying float vGlow, vAlpha;
  void main() {
    float d = textureLod(depthMap, uv, 1.0).r;
    vec3 p = unproject(uv, d);
    float s = scatter;
    float z = -p.z;
    // burst outwards, drift up, swirl around the room's axis
    vec3 off = rdir * (0.6 + rnd * 2.4) * z * 0.18 * s + vec3(0.0, s * s * (1.0 + rnd * 4.0), 0.0);
    p += off;
    float a = s * (0.6 + rnd) * 1.4 * (rnd > 0.5 ? 1.0 : -1.0);
    float ca = cos(a), sa = sin(a);
    p.xz = mat2(ca, -sa, sa, ca) * p.xz;
    p += vec3(sin(time * 0.7 + rnd * 20.0), cos(time * 0.5 + rnd * 13.0), sin(time * 0.6 + rnd * 7.0)) * 0.08 * s * z * 0.1;
    vColor = texture2D(colorMap, uv).rgb;
    vGlow = clamp(s * 1.4, 0.0, 1.0);
    vAlpha = (1.0 - smoothstep(0.75, 1.0, s)) * gather;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = pxScale * (1.0 + s * (1.0 + rnd * 2.0));
  }
`;
const pointsFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vGlow, vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    vec3 gold = vec3(1.0, 0.76, 0.42);
    vec3 col = mix(vColor, gold * 1.3, vGlow * 0.75);
    float soft = mix(1.0, smoothstep(0.5, 0.0, r), vGlow);
    gl_FragColor = vec4(col, vAlpha * soft);
    #include <colorspace_fragment>
  }
`;

/* ---------- Build rooms ---------- */
const SEG_X = isMobile ? 220 : 320;
const SEG_Y = Math.round(SEG_X / IMG_ASPECT);
const meshGeo = new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y);
const backGeo = new THREE.PlaneGeometry(1, 1, 96, 54);
const PX = isMobile ? 150 : 220;
const PY = Math.round(PX / IMG_ASPECT);
const pointsGeo = (() => {
  const n = PX * PY;
  const uv = new Float32Array(n * 2);
  const rdir = new Float32Array(n * 3);
  const rnd = new Float32Array(n);
  const pos = new Float32Array(n * 3);
  let i = 0;
  for (let y = 0; y < PY; y++) {
    for (let x = 0; x < PX; x++, i++) {
      uv[i * 2] = (x + Math.random()) / PX;
      uv[i * 2 + 1] = (y + Math.random()) / PY;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
      rdir.set([Math.sin(ph) * Math.cos(th), Math.cos(ph) * 0.6, Math.sin(ph) * Math.sin(th)], i * 3);
      rnd[i] = Math.random();
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setAttribute("rdir", new THREE.BufferAttribute(rdir, 3));
  g.setAttribute("rnd", new THREE.BufferAttribute(rnd, 1));
  return g;
})();

const rooms = ROOMS.map((cfg) => {
  const group = new THREE.Group();
  scene.add(group);
  const base = {
    colorMap: { value: null },
    depthMap: { value: null },
    tanH: { value: Math.tan(HFOV / 2) },
    imgAspect: { value: IMG_ASPECT },
    invNear: { value: 1 / cfg.near },
    invFar: { value: 1 / cfg.far },
  };
  const mk = (lod, backOffset, stretchCut) =>
    new THREE.ShaderMaterial({
      uniforms: { ...base, lod: { value: lod }, backOffset: { value: backOffset }, solid: { value: 0 }, stretchCut: { value: stretchCut } },
      vertexShader: meshVert,
      fragmentShader: meshFrag,
      side: THREE.DoubleSide,
    });
  const front = new THREE.Mesh(meshGeo, mk(0, 0, 0.05));
  const back = new THREE.Mesh(backGeo, mk(4, 0.04, 10));
  front.frustumCulled = back.frustumCulled = false;
  group.add(back, front);
  const pmat = new THREE.ShaderMaterial({
    uniforms: { ...base, scatter: { value: 1 }, time: { value: 0 }, pxScale: { value: 3 }, gather: { value: 0 } },
    vertexShader: pointsVert,
    fragmentShader: pointsFrag,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(pointsGeo, pmat);
  points.frustumCulled = false;
  group.add(points);
  group.visible = false;
  return { cfg, group, front, back, points, base, anchors3D: [] };
});

/* ---------- Floating dust in the light ---------- */
const dust = (() => {
  const n = isMobile ? 500 : 1100;
  const p = new Float32Array(n * 3);
  const r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    p.set([(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 7, -Math.random() * 16 - 1], i * 3);
    r[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  g.setAttribute("rnd", new THREE.BufferAttribute(r, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, px: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float rnd; uniform float time, px; varying float vA;
      void main(){ vec3 q = position; q.y += mod(time * (0.05 + rnd * 0.12) + rnd * 7.0, 7.0) - 3.5; q.x += sin(time * 0.3 + rnd * 30.0) * 0.4;
        vec4 mv = modelViewMatrix * vec4(q, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.5 + rnd * 3.0) * px * (6.0 / -mv.z); vA = (0.25 + 0.5 * rnd) * (0.6 + 0.4 * sin(time * 2.0 + rnd * 40.0)); }`,
    fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(1.0, 0.82, 0.55, vA * smoothstep(0.5, 0.0, r)); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  camera.add(pts);
  scene.add(camera);
  return m;
})();

/* ---------- Room layout in world space ---------- */
// Each room's camera origin sits where the previous walk ended, turned 90° left or right.
const tmpV = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
function sampleDepth(key, u, vTop) {
  const dp = depthPixels[`assets/villa/${key}-depth.png`];
  if (!dp) return 0.5;
  const x = Math.min(dp.w - 1, Math.max(0, Math.round(u * (dp.w - 1))));
  const y = Math.min(dp.h - 1, Math.max(0, Math.round(vTop * (dp.h - 1))));
  return dp.data[(y * dp.w + x) * 4] / 255;
}
function unprojectCPU(cfg, u, vTop, d) {
  const z = 1 / lerp(1 / cfg.far, 1 / cfg.near, d);
  const t = Math.tan(HFOV / 2);
  return new THREE.Vector3((u - 0.5) * 2 * t * z, (0.5 - vTop) * 2 * (t / IMG_ASPECT) * z, -z);
}
function layoutRooms() {
  let origin = new THREE.Vector3();
  let yaw = 0;
  for (const r of rooms) {
    const cfg = r.cfg;
    r.base.colorMap.value = tex[`assets/villa/${cfg.key}.webp`];
    r.base.depthMap.value = tex[`assets/villa/${cfg.key}-depth.png`];
    r.group.position.copy(origin);
    r.group.rotation.y = yaw;
    r.origin = origin.clone();
    r.yaw = yaw;
    r.walkDist = cfg.walk; // metres walked forward through the room
    r.walkEnd = origin.clone().add(tmpV.set(0, 0, -r.walkDist).applyAxisAngle(up, yaw));
    r.anchors3D = cfg.anchors.map(([u, v, label, detail]) => ({
      local: unprojectCPU(cfg, u, v, sampleDepth(cfg.key, u, v)),
      label,
      detail,
    }));
    origin = r.walkEnd.clone().add(tmpV.set(0, 0, -1.5).applyAxisAngle(up, yaw));
    yaw += cfg.turn * (Math.PI / 2);
  }
}

/* ---------- Motion-graphic labels ---------- */
const annoLayer = document.createElement("div");
annoLayer.className = "annos";
document.body.appendChild(annoLayer);
let annoEls = [];
function buildAnnos(r) {
  annoLayer.innerHTML = "";
  annoEls = r.anchors3D.map((a, i) => {
    const el = document.createElement("div");
    el.className = "anno";
    el.style.setProperty("--d", `${0.15 + i * 0.18}s`);
    el.innerHTML = `<i class="anno__dot"></i><span class="anno__line"></span><span class="anno__label"><b>${String(i + 1).padStart(2, "0")}</b>${a.label}<small>${a.detail}</small></span>`;
    annoLayer.appendChild(el);
    return { el, a };
  });
}
const titleEl = document.createElement("div");
titleEl.className = "roomtitle";
document.body.appendChild(titleEl);
function showTitle(name, n) {
  titleEl.innerHTML = `<span class="roomtitle__num">${String(n).padStart(2, "0")}</span><span class="roomtitle__name">${[...name].map((ch, i) => `<i style="--i:${i}">${ch === " " ? "&nbsp;" : ch}</i>`).join("")}</span>`;
  titleEl.classList.remove("show");
  void titleEl.offsetWidth;
  titleEl.classList.add("show");
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
let ready = false;
let intro = 0;
let tSmooth = 0;
let prevT = 0;
let stepPhase = 0;
let bobAmt = 0;
let scrollP = 0;
let lastRoom = -1;
let annoRoom = -1;
const roomName = document.getElementById("roomName");
const roomNum = document.getElementById("roomNum");
const clock = new THREE.Clock();
const camPos = new THREE.Vector3();
const lookDir = new THREE.Vector3();
const proj = new THREE.Vector3();

function setRoomState(r, solid, scatter, gather) {
  r.group.visible = solid > 0.001 || gather > 0.001;
  r.front.material.uniforms.solid.value = solid;
  r.back.material.uniforms.solid.value = solid;
  r.points.visible = gather > 0.001 && solid < 0.999;
  r.points.material.uniforms.scatter.value = scatter;
  r.points.material.uniforms.gather.value = gather;
}

assetsReady.then(() => {
  layoutRooms();
  ready = true;
});

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  requestAnimationFrame(tick);
  if (!ready) {
    renderer.render(scene, camera);
    return;
  }
  if (started) intro = Math.min(1, intro + dt * 0.32);

  tSmooth = lerp(tSmooth, sceneTime(), 1 - Math.pow(0.001, dt * (reducedMotion ? 6 : 1.3)));
  let i = 0;
  while (i < rooms.length - 1 && tSmooth >= rooms[i + 1].cfg.t) i++;
  const cur = rooms[i];
  const next = rooms[i + 1];
  const segEnd = next ? next.cfg.t : END_T;
  const f = clamp01((tSmooth - cur.cfg.t) / (segEnd - cur.cfg.t));
  const hold = next ? HOLD : 1;
  const w = ease(clamp01(f / hold));

  for (const r of rooms) if (r !== cur && r !== next) r.group.visible = false;

  // Intro: the first room assembles itself from particles
  const introScatter = 1 - ease(clamp01(intro / 0.6));
  const introSolid = ease(clamp01((intro - 0.45) / 0.55));

  let yaw = cur.yaw;
  camPos.copy(cur.origin).lerp(cur.walkEnd, w);
  let k = 0;
  if (next && f > hold) {
    k = (f - hold) / (1 - hold);
    // The room breaks into particles first, then you turn and the next room assembles
    camPos.copy(cur.walkEnd).lerp(next.origin, ease(k));
    yaw = lerp(cur.yaw, next.yaw, ease(clamp01((k - 0.15) / 0.85)));
    setRoomState(cur, 1 - smooth(clamp01(k / 0.28)), smooth(clamp01((k - 0.04) / 0.55)), 1);
    setRoomState(next, smooth(clamp01((k - 0.66) / 0.34)), 1 - ease(clamp01((k - 0.25) / 0.5)), smooth(clamp01((k - 0.15) / 0.3)));
  } else {
    const isFirst = i === 0;
    setRoomState(cur, isFirst ? Math.min(introSolid, 1) : 1, isFirst ? introScatter : 0, isFirst ? clamp01(intro * 3) : 1);
    if (next) setRoomState(next, 0, 1, 0);
  }

  // Walking: head-bob with scroll-driven steps, plus a slight lean
  const moved = Math.abs(tSmooth - prevT);
  prevT = tSmooth;
  stepPhase += moved * Math.PI * 2 * 8;
  bobAmt = lerp(bobAmt, reducedMotion ? 0 : clamp01((moved / Math.max(dt, 1e-3)) * 2.5), 0.08);
  pointer.sx = lerp(pointer.sx, reducedMotion ? 0 : pointer.x, 0.05);
  pointer.sy = lerp(pointer.sy, reducedMotion ? 0 : pointer.y, 0.05);

  const side = tmpV.set(1, 0, 0).applyAxisAngle(up, yaw);
  camera.position.copy(camPos)
    .addScaledVector(side, pointer.sx * 0.22 + Math.sin(stepPhase) * 0.05 * bobAmt)
    .add(tmpV.set(0, pointer.sy * 0.12 + Math.abs(Math.sin(stepPhase)) * 0.06 * bobAmt + (1 - ease(clamp01(intro))) * 1.2, 0));
  const look = yaw + pointer.sx * -0.12 + Math.sin(t * 0.2) * 0.012;
  lookDir.set(-Math.sin(look), pointer.sy * 0.08 + Math.sin(t * 0.17) * 0.006, -Math.cos(look));
  camera.lookAt(tmpV.copy(camera.position).add(lookDir));
  camera.rotateZ(Math.sin(stepPhase) * 0.006 * bobAmt);

  for (const r of rooms) r.points.material.uniforms.time.value = t;
  dust.uniforms.time.value = t;

  // Room label + big motion title
  const activeIdx = k > 0.5 ? i + 1 : i;
  if (activeIdx !== lastRoom) {
    lastRoom = activeIdx;
    const r = rooms[activeIdx];
    roomName.textContent = r.cfg.room;
    roomNum.textContent = String(activeIdx + 1).padStart(2, "0");
    if (started) showTitle(r.cfg.room, activeIdx + 1);
  }

  // Labels: shown while standing in a fully built room
  const showAnnos = started && intro > 0.95 && k === 0 && f < hold * 0.92;
  if (showAnnos && annoRoom !== i) {
    annoRoom = i;
    buildAnnos(cur);
  }
  annoLayer.classList.toggle("on", showAnnos && annoRoom === i);
  if (annoRoom >= 0) {
    const r = rooms[annoRoom];
    r.group.updateMatrixWorld();
    for (const { el, a } of annoEls) {
      proj.copy(a.local).applyMatrix4(r.group.matrixWorld).project(camera);
      const vis = proj.z < 1 && Math.abs(proj.x) < 0.98 && Math.abs(proj.y) < 0.95;
      el.style.transform = `translate(${((proj.x + 1) / 2) * window.innerWidth}px, ${((1 - proj.y) / 2) * window.innerHeight}px)`;
      el.style.opacity = vis ? "" : "0";
    }
  }

  renderer.render(scene, camera);
}

function onResize() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  // cover-fit: match the photo's framing, cropping rather than letterboxing
  const vfovImg = 2 * Math.atan(Math.tan(HFOV / 2) / IMG_ASPECT);
  camera.fov = THREE.MathUtils.radToDeg(aspect >= IMG_ASPECT ? 2 * Math.atan(Math.tan(HFOV / 2) / aspect) : vfovImg);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const px = (window.innerWidth * renderer.getPixelRatio() * (aspect >= IMG_ASPECT ? 1 : IMG_ASPECT / aspect)) / PX;
  for (const r of rooms) r.points.material.uniforms.pxScale.value = Math.max(1.5, px * 1.25);
  dust.uniforms.px.value = renderer.getPixelRatio();
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
