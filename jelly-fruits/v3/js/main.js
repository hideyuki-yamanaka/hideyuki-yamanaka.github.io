/* main.js — 「Citrus Matter.」のオレンジの輪切りゼリーの再現（V3）
   つまんで持ち上げると、そこだけ持ち上がってぐにゃっと折れる。離すと落ちてぷるぷる。タップでぷにっ。
   色・形は参考画像から実測（スペック表は settings/docs/jelly-fruits/README.md）。動きの値は仮置き。 */
import * as THREE from 'three';
import { SoftSlice, SliceGrab, STEP } from './softslice.js';
import { buildSlice, sliceMaterial, sliceUniforms } from './slice.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2, DEG = Math.PI / 180;

/* 調整パネルで触れる値（色は実測・ほかは仮置き） */
const DEFAULTS = {
  look: { bg: '#F1F1EF', seg: '#F86712', segDeep: '#E33A04', segLight: '#FA8B2B', mem: '#F6D097', band: '#F59B2B', pith: '#FBCC87', rind: '#FC9C26', side: '#F97F16', red: '#FF4011', shadow: '#190F00' },
  shape: { size: 62, thick: 0.16, segN: 11, cam: 42 },
  fx: { deep: 0.75, glow: 0.16, gloss: 0.025, env: 1, shadow: 0.7, blur: 26 },
  motion: { firm: 3, damp: 1, stretch: 0.2, bend: 0.5, pinch: 0.85, lift: 0.32, follow: 6, gravity: 1, slide: 1 }
};
const params = structuredClone(DEFAULTS);

const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.NoToneMapping; /* 色を白っぽくしない（参考の濃い橙のまま出す） */
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(params.look.bg);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

/* 明かり：色がほぼ参考の色のまま出るように、全体をやわらかく照らす（上の面・側面 ≒ 1、下を向いた面 ≒ 0.5）
   影は左奥の上からの明かりで落とす（影は右手前へ伸びる） */
const key = new THREE.DirectionalLight(0xffffff, 1.0);
key.position.set(-5.5, 7, -4);
key.castShadow = true;
key.shadow.mapSize.set(512, 512);
key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
key.shadow.camera.near = 1; key.shadow.camera.far = 30;
key.shadow.bias = -0.002;
key.shadow.radius = params.fx.blur;
key.shadow.blurSamples = 24;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xffffff, 1.28);
fill.position.set(0, 3.5, 10);
scene.add(fill, fill.target);
scene.add(new THREE.AmbientLight(0xffffff, 1.19));
scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0.37));
/* 床：影だけ見える透明な床（背景の色そのまま） */
const floorMat = new THREE.ShadowMaterial({ color: new THREE.Color(params.look.shadow), opacity: params.fx.shadow });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

/* 写り込み：暗めのまわり＋細長い明るい光の帯（くっきりした白い光の筋になる） */
const pmrem = new THREE.PMREMGenerator(renderer);
function stripEnv() {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(30, 64, 32), pos = geo.attributes.position, col = [];
  const top = new THREE.Color('#4a4642'), mid = new THREE.Color('#2e2b28'), low = new THREE.Color('#d9d4cb'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 30;
    if (y > 0.05) c.copy(mid).lerp(top, Math.min(1, (y - 0.05) / 0.6));
    else c.copy(mid).lerp(low, Math.min(1, (0.05 - y) / 0.25));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const strip = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  /* 光の帯は、平らな上の面に映らない向き（真後ろの斜め上は空ける）に置く → 曲がった所とふちにだけ、くっきり映る */
  strip(14, 1.4, -9, 8, 2, 30);
  strip(12, 1.2, -3, 11, 8, 40);
  strip(10, 1.0, 9, 6, 3, 20);
  strip(3, 10, 12, 4, -6, 10);
  const t = pmrem.fromScene(s, 0.01).texture;
  s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return t;
}
const env = stripEnv();
scene.environment = env;

/* ---------- 輪切り ---------- */
const mat = sliceMaterial(env);
let body = null, mesh = null, geoInfo = null, lastShape = '';
const view = { short: 8 };
function sliceR() { return view.short * clamp(params.shape.size, 10, 100) / 100 / 2; }
function makeSlice() {
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
  const t = clamp(params.shape.thick, 0.04, 0.5);
  geoInfo = buildSlice({ M: innerWidth <= 600 ? 72 : 96, K: innerWidth <= 600 ? 10 : 12, t });
  const R = sliceR();
  body = new SoftSlice(geoInfo, R, [-0.1 * R, R * 0.6, 0], { radius: clamp(params.motion.bend, 0.3, 0.9) });
  const nv = geoInfo.vp.length, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const aU0 = new Float32Array(nv * 3);
  for (let r = 0; r < nv; r++) { const p = 3 * geoInfo.vp[r]; aU0[3 * r] = geoInfo.P[p]; aU0[3 * r + 1] = geoInfo.P[p + 1]; aU0[3 * r + 2] = geoInfo.P[p + 2]; }
  g.setAttribute('aU0', new THREE.BufferAttribute(aU0, 3));
  g.setAttribute('aFace', new THREE.BufferAttribute(geoInfo.face, 1));
  g.setIndex(new THREE.BufferAttribute(geoInfo.index, 1));
  mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
  sliceUniforms.uT.value = t;
  lastShape = shapeKey();
  sync();
}
const shapeKey = () => `${params.shape.size}|${params.shape.thick}|${params.motion.bend}|${innerWidth <= 600}`;
function sync() {
  const pos = mesh.geometry.attributes.position.array, vp = geoInfo.vp, x = body.x;
  for (let r = 0; r < vp.length; r++) { const p = 3 * vp[r]; pos[3 * r] = x[p]; pos[3 * r + 1] = x[p + 1]; pos[3 * r + 2] = x[p + 2]; }
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
}

/* ---------- カメラ ---------- */
let W = 1, H = 1;
const bounds = { x0: -8, x1: 8, z0: -6, z1: 6 };
function layout() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H);
  camera.aspect = W / H;
  const tanH = Math.tan(camera.fov * DEG / 2);
  const dist = W >= H ? view.short / (2 * tanH) : view.short / (2 * tanH * camera.aspect);
  const el = clamp(params.shape.cam, 15, 89) * DEG;
  const target = new THREE.Vector3(0.35, 0.2, 0.25);
  camera.position.set(target.x, target.y + dist * Math.sin(el), target.z + dist * Math.cos(el));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/* ---------- 物理の値 ---------- */
function physics() {
  const m = params.motion, w = TAU * Math.max(0.3, m.firm);
  return {
    k: w * w, wobbleDamp: 1.6 / Math.max(0.05, m.damp), stretch: clamp(m.stretch, 0, 0.9),
    gravity: 30 * Math.max(0, m.gravity), grabSpeed: 2.4 * Math.max(0.5, m.follow), grabStiff: 0.6,
    pinch: clamp(m.pinch, 0, 1), floorFric: clamp(0.3 / Math.max(0.1, m.slide), 0, 0.95)
  };
}

/* ---------- 指の操作 ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function setRay(sx, sy) { ndc.set(sx / W * 2 - 1, -(sy / H) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray; }
function toPlane(sx, sy, h) {
  const r = setRay(sx, sy), t = (h - r.origin.y) / (r.direction.y || -1e-6);
  return r.origin.clone().addScaledVector(r.direction, Math.max(0, t));
}
function pick(sx, sy) {
  setRay(sx, sy);
  const hit = ray.intersectObject(mesh, false)[0];
  if (!hit) return null;
  const x = body.x;
  let best = 0, bd = Infinity;
  for (let i = 0; i < body.n; i++) {
    const d = (x[3 * i] - hit.point.x) ** 2 + (x[3 * i + 1] - hit.point.y) ** 2 + (x[3 * i + 2] - hit.point.z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  const dir = ray.ray.direction;
  return { idx: best, p: [hit.point.x, hit.point.y, hit.point.z], dir: [dir.x, dir.y, dir.z] };
}
let grab = null, st = null;
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const hit = pick(e.clientX, e.clientY);
  if (!hit) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 何もしない */ }
  body.press = { x: hit.p[0], y: hit.p[1], z: hit.p[2], dx: hit.dir[0], dy: hit.dir[1], dz: hit.dir[2], depth: 0, max: 0.14, hold: true };
  st = { id: e.pointerId, hit, x0: e.clientX, y0: e.clientY, t0: performance.now(), lt: performance.now(), drag: false, vx: 0, vy: 0, vz: 0 };
  canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', e => {
  if (!st || e.pointerId !== st.id) { canvas.style.cursor = pick(e.clientX, e.clientY) ? 'grab' : ''; return; }
  const t = performance.now();
  if (!st.drag && Math.hypot(e.clientX - st.x0, e.clientY - st.y0) > 8) {
    st.drag = true;
    if (body.press) body.press.hold = false;
    const P = physics();
    st.h = st.hit.p[1] + Math.max(0, params.motion.lift) * body.R;
    st.tp = toPlane(e.clientX, e.clientY, st.h);
    grab = new SliceGrab(body, st.hit.idx, [st.tp.x, st.tp.y, st.tp.z], P);
  }
  if (st.drag) {
    const tp = toPlane(e.clientX, e.clientY, st.h), dt = Math.max(4, t - st.lt) / 1000;
    st.vx = st.vx * 0.5 + (tp.x - st.tp.x) / dt * 0.5;
    st.vy = st.vy * 0.5 + (tp.y - st.tp.y) / dt * 0.5;
    st.vz = st.vz * 0.5 + (tp.z - st.tp.z) / dt * 0.5;
    st.tp = tp;
    grab.t = [tp.x, tp.y, tp.z];
    grab.tv = [st.vx, st.vy, st.vz];
  }
  st.lt = t;
});
function end(e) {
  if (!st || e.pointerId !== st.id) return;
  if (!st.drag) {
    if (body.press) body.press.hold = false;
    if (performance.now() - st.t0 < 260) body.poke(st.hit.p, st.hit.dir, 1);
  }
  grab = null; st = null;
  canvas.style.cursor = '';
}
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);

/* ---------- 調整パネル ---------- */
let panel = null;
if (window.TunePanel) {
  panel = TunePanel.create({
    title: '調整パネル', storageKey: 'jelly-fruits-citrus', version: 1,
    params, defaults: DEFAULTS,
    schema: [
      { cat: 'オレンジの輪切り', items: [
        { sub: '輪切り', grp: 'basic', items: [
          { slider: '大きさ', path: 'shape.size', min: 20, max: 90, step: 1, unit: '%', grid: false, hint: '画面の短い辺に対する直径の割合。手を離すと作り直します。' },
          { slider: '厚み', path: 'shape.thick', min: 0.06, max: 0.4, step: 0.01, fmt: 'n2', hint: '半径に対する厚み（参考画像の実測は約 0.16）。手を離すと作り直します。' },
          { slider: '房の数', path: 'shape.segN', min: 6, max: 14, step: 1, fmt: 'int', hint: '房の数（参考画像はおよそ 11）。' }
        ]},
        { sub: 'カメラ', grp: 'basic', items: [
          { slider: '見下ろす角度', path: 'shape.cam', min: 15, max: 89, step: 1, unit: '°', hint: '参考画像からの見積もりは約 42°。' }
        ]},
        { sub: '色', grp: 'fxtex', items: [
          { color: '背景', path: 'look.bg', hint: '実測 #F1F1EF。' },
          { color: '房', path: 'look.seg', hint: '房の地の色。実測 #F86712（面の約半分）。' },
          { color: '房の炎の形', path: 'look.segDeep', hint: '赤っぽい炎のような形。実測 #E33A04（面の約1.5割）。' },
          { color: '房の明るい所', path: 'look.segLight', hint: '実測 #FA8B2B（面の約2割）。' },
          { color: '薄皮の線', path: 'look.mem', hint: '実測 #F6D097。' },
          { color: '外側の帯', path: 'look.band', hint: 'わたの輪のすぐ内側の、明るい橙の帯。実測 #F59B2B。' },
          { color: 'わたの輪', path: 'look.pith', hint: '実測 #FBCC87。' },
          { color: '皮', path: 'look.rind', hint: '実測 #FC9C26。' },
          { color: '側面', path: 'look.side', hint: '実測 #F97F16。' },
          { color: 'ふちの赤', path: 'look.red', hint: '折れて厚く見える所の色。実測 #FF4011。' }
        ]},
        { sub: '質感', grp: 'fxtex', items: [
          { slider: 'ふちの赤み', path: 'fx.deep', min: 0, max: 1.5, step: 0.05, fmt: 'n2', hint: 'ふちや折れた所ほど赤く深くなる量。' },
          { slider: '内側の光', path: 'fx.glow', min: 0, max: 1, step: 0.01, fmt: 'n2', hint: 'ゼリーの中で光が回って、ほんのり光る量。' },
          { slider: 'ツヤのくもり', path: 'fx.gloss', min: 0, max: 0.5, step: 0.005, fmt: 'n2', hint: '上塗りのツヤのぼやけ。0 に近いほど、光の筋がくっきり。' },
          { slider: '映り込み', path: 'fx.env', min: 0, max: 3, step: 0.05, fmt: 'x', hint: 'まわりの光の帯の映り込みの強さ。' }
        ]},
        { sub: '影', grp: 'fxtex', items: [
          { color: '色', path: 'look.shadow', hint: '影の色（濃さ 0.7 で、参考画像の影のまん中 #5A5348 になる色）。' },
          { slider: '濃さ', path: 'fx.shadow', min: 0, max: 1, step: 0.01, fmt: 'n2', clamp: true, hint: '床に落ちる影の濃さ。' },
          { slider: 'ぼかし', path: 'fx.blur', min: 1, max: 60, step: 1, fmt: 'int', hint: '影のふちのやわらかさ。' }
        ]},
        { sub: 'ぷるぷる', grp: 'anim', items: [
          { slider: '硬さ', path: 'motion.firm', min: 0.5, max: 8, step: 0.1, unit: 'Hz', hint: '1秒に何回揺れるか。下げるほど、ぐにゃっと折れやすい。' },
          { slider: '揺れの減り', path: 'motion.damp', min: 0.1, max: 3, step: 0.05, fmt: 'x', hint: '揺れが止まるまでの長さ。' },
          { slider: '伸びやすさ', path: 'motion.stretch', min: 0, max: 0.9, step: 0.05, fmt: 'n2', clamp: true, hint: 'むにっと伸び縮みする量。' },
          { slider: '曲がりのなだらかさ', path: 'motion.bend', min: 0.3, max: 0.9, step: 0.05, fmt: 'n2', hint: '大きいほど、広い範囲でゆるやかに曲がる。小さいと、つまんだ所だけ急に折れる。手を離すと作り直します。' }
        ]},
        { sub: 'つかんだ時', grp: 'anim', items: [
          { slider: '持ち上げる高さ', path: 'motion.lift', min: 0, max: 2, step: 0.01, fmt: 'x', hint: 'つまんだ所が持ち上がる高さ（半径の何倍か）。参考画像の画面の表示は LIFT 0.32。' },
          { slider: 'つまむ所の狭さ', path: 'motion.pinch', min: 0, max: 1, step: 0.01, fmt: 'n2', clamp: true, hint: '上げるほど、つまんだ所だけが持ち上がって、ほかは垂れる（折れる）。' },
          { slider: '追従', path: 'motion.follow', min: 1, max: 16, step: 0.5, unit: 'Hz', hint: '指にどれだけ速くついてくるか。' }
        ]},
        { sub: 'テーブル', grp: 'anim', items: [
          { slider: '重さ', path: 'motion.gravity', min: 0, max: 3, step: 0.05, fmt: 'x', hint: '落ちる速さ（重力）。' },
          { slider: 'すべりやすさ', path: 'motion.slide', min: 0.1, max: 4, step: 0.05, fmt: 'x', hint: 'テーブルの上のすべりやすさ。下げるほど、置いた所がずれずに折れる。' }
        ]}
      ]}
    ],
    onSettle: info => { if (info && (info.path === 'shape.size' || info.path === 'shape.thick' || info.path === 'motion.bend' || info.reset || info.imported)) makeSlice(); if (info && info.path === 'shape.cam') layout(); }
  });
}

/* ---------- 毎フレーム ---------- */
addEventListener('resize', () => { layout(); if (shapeKey() !== lastShape) makeSlice(); });
let last = performance.now(), acc = 0;
const perf = { ms: 0 };
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const P = physics();
  const t0 = performance.now();
  acc += dt;
  let k = 0;
  while (acc >= STEP && k < 12) { body.step(P, bounds, grab); acc -= STEP; k++; }
  if (k >= 12) acc = 0;
  sync();
  perf.ms = perf.ms * 0.95 + (performance.now() - t0) * 0.05;
  /* 見た目の値 */
  const L = params.look;
  scene.background.set(L.bg);
  sliceUniforms.cSeg.value.set(L.seg); sliceUniforms.cSegDeep.value.set(L.segDeep); sliceUniforms.cSegLight.value.set(L.segLight);
  sliceUniforms.cMem.value.set(L.mem); sliceUniforms.cBand.value.set(L.band); sliceUniforms.cPith.value.set(L.pith); sliceUniforms.cRind.value.set(L.rind);
  sliceUniforms.cSide.value.set(L.side); sliceUniforms.cRed.value.set(L.red);
  sliceUniforms.uSegN.value = clamp(Math.round(params.shape.segN), 6, 14);
  sliceUniforms.uDeep.value = params.fx.deep; sliceUniforms.uGlow.value = params.fx.glow;
  mat.clearcoatRoughness = clamp(params.fx.gloss, 0, 1);
  mat.envMapIntensity = Math.max(0, params.fx.env);
  floorMat.opacity = clamp(params.fx.shadow, 0, 1);
  floorMat.color.set(L.shadow);
  key.shadow.radius = Math.max(1, params.fx.blur);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

layout();
makeSlice();
requestAnimationFrame(loop);

/* 確認用（ブラウザのコンソールから触れる） */
window.__citrus = { get body() { return body; }, params, camera, renderer, pick, toPlane, perf, makeSlice,
  /* 画像と見比べる用：右の端をつまんで持ち上げる */
  lift(sx, sy, tx, ty) {
    const hit = pick(sx, sy);
    if (!hit) return false;
    const P = physics(), h = hit.p[1] + params.motion.lift * body.R, tp = toPlane(tx, ty, h);
    grab = new SliceGrab(body, hit.idx, [tp.x, tp.y, tp.z], P);
    return true;
  },
  release() { grab = null; }
};
