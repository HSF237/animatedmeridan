/* CONTACT — globe. A dotted Earth at night with the three studios as glowing beacons,
   flight arcs between them, and a light pulse that flies to New York when you send an enquiry. */
import { THREE, createStage, createScroll, makeLabel, run, makeDust, textSprite, lerp, clamp01, smooth, ease, range, isMobile, rnd } from "./kit.js";

const stage = createStage({ bg: 0x050a18, fov: 34, far: 600, bloom: { strength: 0.6, radius: 0.6, threshold: 0.2 }, exposure: 1.05 });
const { scene, camera, pointer } = stage;
stage.shiftRight(0.18);
const scroll = createScroll();
const label = makeLabel();

const R = 10;
const toVec = (lat, lon, r = R) => {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
};

/* ---------- rough continent outlines [lon, lat] ---------- */
const LAND = [
  [[-168,66],[-162,71],[-140,70],[-120,70],[-96,73],[-82,73],[-70,68],[-62,60],[-56,52],[-60,47],[-66,44],[-70,42],[-74,40],[-76,35],[-81,31],[-80,26],[-83,29],[-88,30],[-94,29],[-97,26],[-97,21],[-94,18],[-90,21],[-87,21],[-88,16],[-84,15],[-83,10],[-79,8.5],[-85,11],[-92,15],[-96,16],[-105,20],[-110,24],[-113,31],[-117,32],[-121,35],[-124,40],[-124,48],[-130,54],[-140,60],[-150,60],[-160,58],[-165,62]],
  [[-73,78],[-60,82],[-30,83],[-20,78],[-20,70],[-30,68],[-42,60],[-50,62],[-56,68],[-66,76]],
  [[-77,8],[-72,12],[-63,10],[-52,5],[-50,0],[-44,-2],[-35,-6],[-38,-13],[-40,-22],[-48,-26],[-53,-34],[-58,-38],[-64,-41],[-66,-47],[-68,-53],[-72,-51],[-74,-44],[-73,-37],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0],[-78,3]],
  [[-17,21],[-16,28],[-9,32],[-5,36],[10,37],[11,33],[20,31],[32,31],[34,28],[37,22],[43,12],[51,12],[48,4],[41,-3],[40,-11],[36,-19],[33,-26],[28,-33],[20,-35],[17,-30],[12,-17],[13,-8],[9,-1],[9,4],[4,6],[-8,4],[-13,8],[-17,14]],
  [[-9,37],[-9,43],[-2,43.5],[-1,46],[-4,48],[2,51],[5,53],[8,55],[10,57],[11,54],[14,54],[20,55],[21,57],[24,59],[30,60],[24,65],[26,70],[30,70],[40,67],[45,68],[60,68],[60,50],[50,46],[40,46],[37,45],[30,45],[28,42],[26,40],[23,37],[19,40],[16,38],[12,42],[9,44],[3,43],[0,39],[-5,36]],
  [[5,58],[5,62],[14,68],[22,70],[28,71],[30,69],[26,65],[22,64],[18,60],[16,56],[12,56],[8,58]],
  [[-6,50],[1,51],[2,53],[-2,56],[-2,58],[-6,58.5],[-5,55],[-3,54],[-5,52]],
  [[-10,52],[-6,52],[-6,55],[-10,54.5]],
  [[60,68],[70,73],[80,73],[100,77],[112,74],[130,72],[142,72],[160,70],[170,66],[178,65],[170,60],[162,58],[156,52],[156,58],[142,58],[136,54],[140,48],[135,43],[130,42],[128,39],[126,35],[126,38],[122,40],[118,38],[121,32],[120,26],[112,22],[108,21],[106,17],[109,12],[105,9],[100,13],[101,7],[104,1],[100,4],[98,9],[98,16],[94,17],[92,22],[88,22],[86,20],[80,15],[78,8],[73,17],[72,22],[67,25],[62,25],[57,26],[50,30],[48,29],[51,25],[56,25],[58,22],[53,17],[44,12],[39,21],[35,28],[34,31],[36,36],[30,36],[27,37],[26,40],[29,41],[36,41],[41,41],[40,43],[38,46],[48,42],[50,46],[60,50]],
  [[130,31],[132,34],[136,35],[140,36],[141,41],[142,45],[145,44],[142,42],[140,38],[139,35],[135,33]],
  [[120,18],[122,18],[124,13],[126,7],[122,7],[120,14]],
  [[95,5],[98,4],[106,-6],[104,-6],[100,-2]],
  [[105,-6],[114,-7],[114,-8.5],[106,-7.5]],
  [[109,1],[113,3],[118,7],[119,1],[116,-4],[110,-3]],
  [[131,-1],[141,-3],[150,-10],[142,-9],[138,-8],[132,-4]],
  [[114,-22],[122,-18],[129,-15],[136,-12],[141,-12],[142,-17],[146,-19],[153,-26],[151,-34],[146,-39],[141,-38],[135,-34],[131,-31],[124,-33],[115,-34],[113,-26]],
  [[172,-34],[178,-38],[175,-41],[172,-41]],
  [[172,-41],[174,-42],[170,-46],[166,-46]],
  [[44,-25],[47,-25],[50,-15],[49,-12],[44,-17]],
  [[-24,64],[-14,64],[-14,66],[-22,66.5]],
  [[-85,22],[-74,20],[-77,21.5]],
  [[-180,-72],[-120,-74],[-60,-72],[0,-70],[60,-68],[120,-66],[180,-72],[180,-90],[-180,-90]],
];
const inPoly = (lon, lat, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const isLand = (lon, lat) => LAND.some((p) => inPoly(lon, lat, p));

/* ---------- the globe ---------- */
const globe = new THREE.Group();
scene.add(globe);
globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0x07122b })));
// graticule
const grat = [];
for (let lat = -60; lat <= 60; lat += 30) for (let i = 0; i < 96; i++) grat.push(toVec(lat, (i / 96) * 360, R * 1.001), toVec(lat, ((i + 1) / 96) * 360, R * 1.001));
for (let lon = 0; lon < 360; lon += 30) for (let i = 0; i < 64; i++) grat.push(toVec(-90 + (i / 64) * 180, lon, R * 1.001), toVec(-90 + ((i + 1) / 64) * 180, lon, R * 1.001));
globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grat), new THREE.LineBasicMaterial({ color: 0x1b3a78, transparent: true, opacity: 0.35 })));

// land as dots
const N = isMobile ? 9000 : 16000;
const dp = [], dc = [], dsz = [];
const golden = Math.PI * (3 - Math.sqrt(5));
const cool = new THREE.Color(0x4f7dff), warm = new THREE.Color(0xf0c27a), c = new THREE.Color();
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
  const lat = (Math.asin(y) * 180) / Math.PI, lon = (Math.atan2(Math.sin(th) * r, Math.cos(th) * r) * 180) / Math.PI;
  if (!isLand(lon, lat)) continue;
  const v = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
  // fibonacci uses x,z from theta; convert to lon-based position so land matches
  const p = toVec(lat, lon, R * 1.002);
  dp.push(p.x, p.y, p.z);
  c.copy(cool).lerp(warm, clamp01(0.15 + rnd() * 0.3 + Math.max(0, 1 - Math.abs(lat - 40) / 60) * 0.15));
  dc.push(c.r, c.g, c.b);
  dsz.push(0.6 + rnd() * 0.8);
}
const dotGeo = new THREE.BufferGeometry();
dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
dotGeo.setAttribute("color", new THREE.Float32BufferAttribute(dc, 3));
dotGeo.setAttribute("size", new THREE.Float32BufferAttribute(dsz, 1));
const dotMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uPx: { value: 1 }, uTime: { value: 0 } },
  vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; varying float vFront; uniform float uPx, uTime;
    void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(mat3(modelMatrix) * position); vec3 toCam = normalize(cameraPosition - (modelMatrix * vec4(position,1.0)).xyz);
      vFront = smoothstep(-0.05, 0.25, dot(n, toCam));
      gl_PointSize = min(size * uPx * (300.0 / -mv.z) * (0.85 + 0.15 * sin(uTime * 1.3 + position.x * 3.0)), 9.0 * uPx);
      gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying vec3 vC; varying float vFront; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(vC * 1.6, vFront * smoothstep(0.5, 0.2, r)); }`,
});
const dots = new THREE.Points(dotGeo, dotMat);
dots.frustumCulled = false;
globe.add(dots);
// atmosphere glow (rim)
const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.14, 64, 48), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  vertexShader: "varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = (modelViewMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "varying vec3 vN; varying vec3 vP; void main(){ float f = pow(clamp(0.72 + dot(normalize(vN), normalize(-vP)) , 0.0, 1.0), 3.0); gl_FragColor = vec4(vec3(0.25,0.45,1.0) * f * 0.9, f); }",
}));
scene.add(atmo);
const inner = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 64, 48), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: "varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = (modelViewMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "varying vec3 vN; varying vec3 vP; void main(){ float f = pow(1.0 - clamp(dot(normalize(vN), normalize(-vP)), 0.0, 1.0), 2.5); gl_FragColor = vec4(vec3(0.3,0.5,1.0) * f * 0.55, f * 0.6); }",
}));
scene.add(inner);

/* ---------- studios, arcs, pulses ---------- */
const CITIES = [
  { name: "New York", lat: 40.71, lon: -74.0 },
  { name: "Lisbon", lat: 38.72, lon: -9.14 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
];
const beacons = [];
for (const ct of CITIES) {
  const p = toVec(ct.lat, ct.lon, R * 1.004);
  const g = new THREE.Group();
  g.position.copy(p);
  g.lookAt(p.clone().multiplyScalar(2));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.6) }));
  g.add(core);
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const rg = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 0.9), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    g.add(rg);
    rings.push(rg);
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, 3.2, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xf0c27a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.rotation.x = Math.PI / 2;
  beam.position.z = 1.6;
  g.add(beam);
  globe.add(g);
  const sp = textSprite(ct.name, { color: "#ffe3b0", size: 64, scale: 0.0085 });
  sp.userData.base = sp.scale.clone();
  sp.position.copy(p.clone().multiplyScalar(1.28));
  sp.material.opacity = 0;
  globe.add(sp);
  beacons.push({ ...ct, p, rings, beam, sprite: sp, core });
}
const arcs = [];
function arc(a, b, lift = 0.32) {
  const pa = toVec(a.lat, a.lon), pb = toVec(b.lat, b.lon);
  const mid = pa.clone().add(pb).multiplyScalar(0.5);
  const dist = pa.distanceTo(pb);
  mid.setLength(R + dist * lift);
  const curve = new THREE.QuadraticBezierCurve3(pa.clone().multiplyScalar(1.004), mid, pb.clone().multiplyScalar(1.004));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.035, 6, false), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uAlpha: { value: 0 }, uHead: { value: -1 } },
    vertexShader: "varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying float vU; uniform float uT, uAlpha, uHead;
      void main(){ float dash = smoothstep(0.35, 0.5, fract(vU * 24.0 - uT * 2.0)); float draw = step(vU, uAlpha);
        float head = exp(-abs(vU - uHead) * 28.0) * step(0.0, uHead);
        vec3 col = mix(vec3(0.95,0.72,0.4), vec3(1.0,0.95,0.8), head);
        gl_FragColor = vec4(col, draw * (0.28 + 0.4 * dash) + head * 1.4); }`,
  }));
  globe.add(tube);
  const item = { curve, tube, head: new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 1.8) })), pulse: -1 };
  item.head.visible = false;
  globe.add(item.head);
  arcs.push(item);
  return item;
}
arc(CITIES[0], CITIES[1]);
arc(CITIES[1], CITIES[2], 0.4);
arc(CITIES[2], CITIES[0], 0.42);
// enquiry pulse: from a random point on Earth to New York
let sendT = -1;
let sendArc = null;
window.addEventListener("enquiry-sent", () => {
  const from = { lat: rnd() * 80 - 30, lon: rnd() * 360 - 180 };
  if (sendArc) { globe.remove(sendArc.tube, sendArc.head); }
  sendArc = arc(from, CITIES[0], 0.36);
  arcs.pop();
  sendArc.tube.material.uniforms.uAlpha.value = 1;
  sendT = 0;
});

const stars = makeDust({ count: isMobile ? 500 : 1400, size: 1.5, color: 0xbcd0ff, box: [220, 140, 220], opacity: 0.8 });
stars.position.y = 0;
scene.add(stars);
scene.add(new THREE.AmbientLight(0xffffff, 1));

/* ---------- camera / globe orientation per section ---------- */
const NAMES = ["Worldwide", "New York", "Lisbon", "Singapore", "Enquiry"];
const qFor = (lat, lon, tilt = 0) => {
  const p = toVec(lat, lon).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(p, new THREE.Vector3(0, 0, 1));
  return q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt));
};
const Q = [qFor(20, -20, 0.1), qFor(CITIES[0].lat, CITIES[0].lon, -0.1), qFor(CITIES[1].lat, CITIES[1].lon, -0.1), qFor(CITIES[2].lat, CITIES[2].lon, -0.1), qFor(25, 20, 0.2)];
const DIST = [40, 22, 22, 22, 42];
const qA = new THREE.Quaternion();
let spin = 0;
let introT = 0;
run((dt, time, started) => {
  if (started) introT = Math.min(1, introT + dt / 2.6);
  const t = scroll.update(dt, 1.2);
  const i = Math.min(3, Math.floor(t)), f = smooth(clamp01(range(t, i + 0.25, i + 1)));
  const j = Math.min(4, i + 1);
  qA.copy(Q[i]).slerp(Q[j], f);
  const dist = lerp(DIST[i], DIST[j], f);
  spin += dt * 0.12 * (1 - clamp01(t)) * (1 - 0.0); // slow idle spin only at the start
  globe.quaternion.copy(qA);
  if (t < 1) globe.rotateY(-spin * 0 + time * 0.1 * (1 - smooth(clamp01(t * 1.5))) - 0);
  pointer.sx += (pointer.x - pointer.sx) * 0.04;
  pointer.sy += (pointer.y - pointer.sy) * 0.04;
  const z = dist * (1.5 - 0.5 * ease(introT));
  camera.position.set(pointer.sx * 1.5, pointer.sy * 1.0 + 1.2, z);
  camera.lookAt(0, 0, 0);

  dotMat.uniforms.uTime.value = time;
  dotMat.uniforms.uPx.value = stage.renderer.getPixelRatio();
  atmo.scale.setScalar(1);
  // beacons: pulsing rings; label of the focused office
  beacons.forEach((b, k) => {
    const focus = smooth(1 - Math.abs(t - (k + 1)) * 1.6 > 0 ? clamp01(1 - Math.abs(t - (k + 1)) * 1.6) : 0);
    b.rings.forEach((r, n) => {
      const ph = (time * 0.6 + n / 3 + k * 0.2) % 1;
      r.scale.setScalar(1 + ph * (3 + focus * 3));
      r.material.opacity = (1 - ph) * (0.55 + focus * 0.4);
    });
    b.core.scale.setScalar(1 + focus * 0.8 + Math.sin(time * 3 + k) * 0.1);
    b.beam.material.opacity = 0.35 + focus * 0.5;
    b.beam.scale.set(1, 1, 1 + focus * 0.6);
    b.sprite.material.opacity = 0.25 + focus * 0.75;
    b.sprite.scale.copy(b.sprite.userData.base).multiplyScalar(dist / 34);
  });
  // arcs draw in, then pulses fly along them
  const drawK = ease(range(introT, 0.3, 1));
  arcs.forEach((a, n) => {
    a.tube.material.uniforms.uT.value = time;
    a.tube.material.uniforms.uAlpha.value = drawK;
    const cyc = (time * 0.18 + n * 0.33) % 1;
    a.tube.material.uniforms.uHead.value = drawK > 0.98 ? cyc : -1;
    a.head.visible = drawK > 0.98;
    if (a.head.visible) a.head.position.copy(a.curve.getPoint(cyc));
  });
  if (sendArc && sendT >= 0) {
    sendT += dt / 2.6;
    const s = clamp01(sendT);
    sendArc.tube.material.uniforms.uHead.value = ease(s);
    sendArc.head.visible = true;
    sendArc.head.position.copy(sendArc.curve.getPoint(ease(s)));
    sendArc.head.scale.setScalar(1 + Math.sin(s * Math.PI) * 0.8);
    if (sendT > 1.4) { globe.remove(sendArc.tube, sendArc.head); sendArc = null; sendT = -1; }
  }
  stars.rotation.y = time * 0.004;
  const idx = Math.min(4, Math.floor(t + 0.4));
  label(NAMES[idx], idx);
  stage.render();
});
