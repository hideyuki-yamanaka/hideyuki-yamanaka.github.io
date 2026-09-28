/* main.js — 3D版の画面（Three.js の場面・材質・包丁・指の操作・道具バー・調整パネル・毎フレームの流れ）
   さわるモード: 何も無い所からなぞる＝包丁がなぞった向きで切る／ゼリーを押しっぱなし＝へこむ／すぐ離す＝ぷにっ／
                押したまま動かす＝持ち上げて運ぶ（離すと落ちてぽよん）
   きるモード:   包丁が指の所へ来る。「向き」「傾き」で角度を変えて、離した所へストンと下ろす（刃の角度のとおりに切れる） */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { World3D, JellyBody } from './jelly.js';
import { jellyBase, jellySpheres, fruitSlice, fruitThumb, transformPoints, rotX, rotY, mulM, TINT, KINDS, KIND_NAME } from './shapes.js';
import { mikanMaterial, mikanUniforms } from './mikan.js';
import { Knife } from './knife.js';
import { Sound } from './audio.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const MIKAN_TINT = '#FF9A2E';

/* 調整パネルで触れる値（初期値はすべて仮置き） */
const DEFAULTS = {
  look: { variant: 'mikan' },
  base: { shape: 'dome', size: 40, count: 3, fruit: 1, cam: 52, knife: 1 },
  fx: { ior: 1.34, thick: 1, rough: 0.06, tint: 1, rainbow: 0.3, env: 1, mikanTrans: 0.9, peelSee: 0.3, bump: 0.5, fruitGloss: 0.6, table: '#F3EFE9', shadow: 1, caustic: 1 },
  motion: { hz: 3.8, keep: 1, stretch: 0.3, press: 1, poke: 1, follow: 7, lift: 0.7, pinch: 0.5, gravity: 1, slide: 1, split: 1, chop: 1 },
  other: { sound: 1, volume: 1, vibrate: 1 }
};
/* 案ごとの最初の値（みかん以外は、中に果物を入れたゼリー） */
const LOOK_VALUES = {
  clear: { 'fx.ior': 1.3, 'fx.thick': 0.5, 'fx.rough': 0.02, 'fx.tint': 0.7, 'fx.rainbow': 0.5 },
  color: { 'fx.ior': 1.3, 'fx.thick': 0.5, 'fx.rough': 0.05, 'fx.tint': 4, 'fx.rainbow': 0.3 },
  frost: { 'fx.ior': 1.3, 'fx.thick': 0.7, 'fx.rough': 0.2, 'fx.tint': 1.1, 'fx.rainbow': 0, 'motion.hz': 3, 'motion.keep': 1.3 }
};
const INSIDE = ['clear', 'color', 'frost'];
const params = structuredClone(DEFAULTS);

const $ = s => document.querySelector(s);
const canvas = $('#stage');
const snd = new Sound();
const world = new World3D();

/* ---------- 場面 ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(params.fx.table);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
keyLight.position.set(-5, 10, 6);
scene.add(keyLight);
scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e1d6, 0.5));

/* テーブル（方眼があると、透明なゼリー越しに曲がって見える） */
function tableTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 255 - Math.random() * 9;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(80,62,44,0.34)';
  g.lineWidth = 4;
  g.strokeRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const TILE = 0.8, TABLE = 90;
const tableTex = tableTexture();
tableTex.repeat.set(TABLE / TILE, TABLE / TILE);
const tableMat = new THREE.MeshStandardMaterial({ map: tableTex, color: params.fx.table, roughness: 0.95, metalness: 0 });
const table = new THREE.Mesh(new THREE.PlaneGeometry(TABLE, TABLE), tableMat);
table.rotation.x = -Math.PI / 2;
table.renderOrder = 0;
scene.add(table);

/* 影と色の光（ぼかした丸） */
function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const blobTex = blobTexture(), planeGeo = new THREE.PlaneGeometry(1, 1);
/* 影は「テーブルの色にかけ算」で暗く・色づける。不透明として描くので、透明なゼリー越しにも見える */
function shadowMaterial(tint) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: blobTex }, strength: { value: 0.4 }, tint: { value: new THREE.Color(tint) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D map; uniform float strength; uniform vec3 tint; varying vec2 vUv; void main(){ float a = texture2D(map, vUv).a * strength; gl_FragColor = vec4(mix(vec3(1.0), tint, clamp(a, 0.0, 1.0)), 1.0); }',
    blending: THREE.MultiplyBlending, transparent: false, depthWrite: false
  });
}
function shadowMesh(tint, order) {
  const m = new THREE.Mesh(planeGeo, shadowMaterial(tint));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = order;
  return m;
}

/* ---------- 写り込み（撮影スタジオ風：暗めのまわり＋明るい窓）。ガラスらしい、ふちの暗さと光の筋が出る ---------- */
function studioEnv() {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(30, 64, 32), pos = geo.attributes.position, col = [];
  const top = new THREE.Color('#8a847c'), mid = new THREE.Color('#5e5953'), low = new THREE.Color('#e2dbd0'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 30;
    if (y > 0.08) c.copy(mid).lerp(top, Math.min(1, (y - 0.08) / 0.6));
    else c.copy(mid).lerp(low, Math.min(1, (0.08 - y) / 0.3));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  box(10, 6, -10, 12, 6, 30);
  box(7, 3, 11, 8, -3, 14);
  box(20, 4, 0, 15, -10, 26);
  box(4, 8, 14, 4, 8, 6);
  const t = pmrem.fromScene(s, 0.015).texture;
  s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return t;
}
const jellyEnv = studioEnv();

/* ---------- 材質 ---------- */
const jellyMats = new Map(), fruitMats = new Map();
const mikanMat = mikanMaterial(jellyEnv);
function jellyMat(kind) {
  let m = jellyMats.get(kind);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, ior: 1.36, thickness: 1,
      attenuationColor: new THREE.Color(TINT[kind]), attenuationDistance: 6,
      clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, envMapIntensity: 1, envMap: jellyEnv
    });
    jellyMats.set(kind, m);
  }
  return m;
}
function fruitMat(kind, tex) {
  let m = fruitMats.get(kind);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ map: tex.tex, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    fruitMats.set(kind, m);
  }
  return m;
}
const white = new THREE.Color('#ffffff'), tmpC = new THREE.Color();
function updateMaterials() {
  const f = params.fx, R = jellyR();
  for (const [kind, m] of jellyMats) {
    m.roughness = clamp(f.rough, 0, 1);
    m.ior = clamp(f.ior, 1, 2.333);
    m.thickness = Math.max(0, f.thick) * R * 1.6;
    m.attenuationDistance = R * 5 / Math.max(0.05, f.tint);
    m.clearcoat = sceneLook === 'frost' ? 0.25 : 1;
    m.dispersion = Math.max(0, f.rainbow) * 4;
    m.envMapIntensity = Math.max(0, f.env);
    tmpC.set(TINT[kind]);
    m.color.copy(sceneLook === 'color' ? tmpC.lerp(white, 0.55) : white);
  }
  for (const m of fruitMats.values()) m.clearcoat = clamp(f.fruitGloss, 0, 1);
  mikanMat.roughness = clamp(f.rough, 0, 1);
  mikanMat.ior = clamp(f.ior, 1, 2.333);
  mikanMat.thickness = Math.max(0, f.thick) * R * 0.6;
  mikanMat.transmission = clamp(f.mikanTrans, 0, 1);
  mikanMat.attenuationDistance = R * 3 / Math.max(0.05, f.tint);
  mikanMat.dispersion = Math.max(0, f.rainbow) * 2;
  mikanUniforms.uPeelSee.value = clamp(f.peelSee, 0, 1);
  mikanUniforms.uBump.value = Math.max(0, f.bump);
  mikanMat.envMapIntensity = Math.max(0, f.env) * 0.8;
  tableMat.color.set(f.table);
  scene.background.set(f.table);
}

/* ---------- ゼリーを画面に出す・しまう ---------- */
function attach(b) {
  const nv = b.vp.length, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(new THREE.BufferAttribute(b.index, 1));
  b.geo = geo;
  if (b.mode === 'mikan') {
    /* 元のみかんの中のどこか（断面の模様に使う）と、切り口のふたの印 */
    const aU0 = new Float32Array(nv * 3), aCap = new Float32Array(nv);
    for (let r = 0; r < nv; r++) {
      const p = 3 * b.vp[r];
      aU0[3 * r] = b.u0[p]; aU0[3 * r + 1] = b.u0[p + 1]; aU0[3 * r + 2] = b.u0[p + 2];
      aCap[r] = b.flag[r];
    }
    geo.setAttribute('aU0', new THREE.BufferAttribute(aU0, 3));
    geo.setAttribute('aCap', new THREE.BufferAttribute(aCap, 1));
    b.mesh = new THREE.Mesh(geo, mikanMat);
  } else {
    b.mesh = new THREE.Mesh(geo, jellyMat(b.kind));
  }
  b.mesh.userData.body = b;
  b.mesh.frustumCulled = false;
  scene.add(b.mesh);
  if (b.fruit) {
    const f = b.fruit, fv = f.vp.length, pos = new Float32Array(fv * 3);
    for (let r = 0; r < fv; r++) { const p = 3 * f.vp[r]; pos[3 * r] = f.P[p]; pos[3 * r + 1] = f.P[p + 1]; pos[3 * r + 2] = f.P[p + 2]; }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    fg.setAttribute('uv', new THREE.BufferAttribute(f.uv, 2));
    fg.setIndex(new THREE.BufferAttribute(f.index, 1));
    fg.computeVertexNormals();
    b.fruitMesh = new THREE.Mesh(fg, fruitMat(b.kind, f.tex));
    b.fruitMesh.matrixAutoUpdate = false;
    b.fruitMesh.frustumCulled = false;
    scene.add(b.fruitMesh);
  }
  b.shadow = shadowMesh('#6d6258', 1);
  b.glow = shadowMesh(b.mode === 'mikan' ? MIKAN_TINT : TINT[b.kind], 2);
  scene.add(b.shadow, b.glow);
  sync(b);
}
function detach(b) {
  if (!b.mesh) return;
  scene.remove(b.mesh); b.geo.dispose();
  if (b.fruitMesh) { scene.remove(b.fruitMesh); b.fruitMesh.geometry.dispose(); }
  scene.remove(b.shadow); b.shadow.material.dispose();
  scene.remove(b.glow); b.glow.material.dispose();
  b.mesh = null;
}
const fm = new THREE.Matrix4();
function sync(b) {
  const pos = b.geo.attributes.position.array, vp = b.vp, x = b.x;
  for (let r = 0; r < vp.length; r++) { const p = 3 * vp[r]; pos[3 * r] = x[p]; pos[3 * r + 1] = x[p + 1]; pos[3 * r + 2] = x[p + 2]; }
  b.geo.attributes.position.needsUpdate = true;
  b.geo.computeVertexNormals();
  b.geo.computeBoundingSphere();
  const T = b.T, c = b.c;
  if (b.fruitMesh) {
    fm.set(T[0], T[1], T[2], c[0], T[3], T[4], T[5], c[1], T[6], T[7], T[8], c[2], 0, 0, 0, 1);
    b.fruitMesh.matrix.copy(fm);
    b.fruitMesh.matrixWorldNeedsUpdate = true;
  }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < x.length; i += 3) {
    if (x[i] < x0) x0 = x[i]; if (x[i] > x1) x1 = x[i];
    if (x[i + 2] < z0) z0 = x[i + 2]; if (x[i + 2] > z1) z1 = x[i + 2];
  }
  const lift = Math.max(0, b.minY), fade = Math.max(0, 1 - lift / (3 * b.R));
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  b.shadow.position.set(cx + 0.1 * b.R + lift * 0.25, 0.001, cz + 0.16 * b.R + lift * 0.35);
  b.shadow.scale.set(w * 1.3 + lift * 0.6, d * 1.3 + lift * 0.6, 1);
  b.shadow.material.uniforms.strength.value = 0.62 * Math.max(0, params.fx.shadow) * fade;
  b.glow.position.set(cx + 0.18 * b.R + lift * 0.3, 0.002, cz + 0.34 * b.R + lift * 0.45);
  b.glow.scale.set(w * 0.95, d * 0.95, 1);
  b.glow.material.uniforms.strength.value = (sceneLook === 'frost' ? 0.3 : 0.6) * Math.max(0, params.fx.caustic) * fade;
}

/* ---------- カメラとテーブルの範囲 ---------- */
const view = { short: 7.2 };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let W = 1, H = 1, lastCam = -1;
function setRay(sx, sy) { ndc.set(sx / W * 2 - 1, -(sy / H) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray; }
function toPlane(sx, sy, h) {
  const r = setRay(sx, sy), t = (h - r.origin.y) / (r.direction.y || -1e-6);
  return r.origin.clone().addScaledVector(r.direction, Math.max(0, t));
}
function layout() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H);
  camera.aspect = W / H;
  const tanH = Math.tan(camera.fov * Math.PI / 360);
  const dist = W >= H ? view.short / (2 * tanH) : view.short / (2 * tanH * camera.aspect);
  const el = clamp(params.base.cam, 15, 89) * DEG;
  const target = new THREE.Vector3(0, 0.3, 0);
  camera.position.set(0, target.y + dist * Math.sin(el), dist * Math.cos(el));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  lastCam = params.base.cam;
  const phone = W <= 600, bottom = H - (phone ? 88 : 116), top = H * 0.26, side = W * (phone ? 0.06 : 0.08);
  const nl = toPlane(side, bottom, 0), nr = toPlane(W - side, bottom, 0), fl = toPlane(side, top, 0), fr = toPlane(W - side, top, 0);
  world.bounds = { zNear: Math.min(nl.z, nr.z), zFar: Math.max(fl.z, fr.z), xn0: nl.x, xn1: nr.x, xf0: fl.x, xf1: fr.x };
}
/** テーブルの範囲の内側へ寄せる（m だけ内側） */
function clampToTable(p, m) {
  const bd = world.bounds;
  p.z = clamp(p.z, bd.zFar + m, bd.zNear - m);
  const k = (p.z - bd.zNear) / (bd.zFar - bd.zNear || 1);
  p.x = clamp(p.x, bd.xn0 + (bd.xf0 - bd.xn0) * k + m, bd.xn1 + (bd.xf1 - bd.xn1) * k - m);
  return p;
}

/* ---------- ゼリーを作る ---------- */
let sceneLook = params.look.variant;
function jellyR() { return view.short * clamp(params.base.size, 5, 100) / 100 / 2; }
const detailNow = () => (W <= 600 ? 9 : 12);
function spawnJelly(kind, x, z, y) {
  const R = jellyR(), shape = params.base.shape;
  const base = jellyBase(shape, detailNow()), sph = jellySpheres(base), np = base.P.length / 3;
  const Q = new Float32Array(base.P.length);
  for (let i = 0; i < Q.length; i++) Q[i] = base.P[i] * R;
  const ang = (Math.random() - 0.5) * 0.8;
  const Pw = transformPoints(Float32Array.from(Q), rotY(ang), [x, y, z]);
  let fruit = null;
  if (params.base.fruit > 0.01) {
    const sl = fruitSlice(kind, R * 0.42 * params.base.fruit, R * 0.11);
    const el = clamp(params.base.cam, 15, 89) * DEG;
    const M = mulM(rotY(-ang), mulM(rotY((Math.random() - 0.5) * 0.5), rotX(-(el - 0.3))));
    transformPoints(sl.P, M, [0, base.height * R * 0.44, 0]);
    fruit = sl;
  }
  const c = Float32Array.from(sph.c, v => v * R), r = Float32Array.from(sph.r, v => v * R);
  const b = new JellyBody({
    P: Pw, Q, vp: Uint32Array.from({ length: np }, (_, i) => i), index: base.index,
    fruit, spheres: { c, r }, kind, R, quat: [0, Math.sin(ang / 2), 0, Math.cos(ang / 2)]
  });
  world.add(b);
  attach(b);
  return b;
}
/** みかんゼリー（まるごと。切ると中の断面が見える） */
function spawnMikan(x, z, y) {
  const R = jellyR();
  const base = jellyBase('mikan', detailNow()), sph = jellySpheres(base), np = base.P.length / 3;
  const Q = new Float32Array(base.P.length), U = new Float32Array(base.P.length);
  for (let i = 0; i < np; i++) {
    Q[3 * i] = base.P[3 * i] * R; Q[3 * i + 1] = base.P[3 * i + 1] * R; Q[3 * i + 2] = base.P[3 * i + 2] * R;
    U[3 * i] = base.P[3 * i]; U[3 * i + 1] = base.P[3 * i + 1] - base.cy; U[3 * i + 2] = base.P[3 * i + 2];
  }
  const ang = Math.random() * TAU;
  const Pw = transformPoints(Float32Array.from(Q), rotY(ang), [x, y, z]);
  const c = Float32Array.from(sph.c, v => v * R), r = Float32Array.from(sph.r, v => v * R);
  const b = new JellyBody({
    P: Pw, Q, U, vp: Uint32Array.from({ length: np }, (_, i) => i), index: base.index,
    fruit: null, spheres: { c, r }, kind: 'mikan', R, mode: 'mikan', quat: [0, Math.sin(ang / 2), 0, Math.cos(ang / 2)]
  });
  world.add(b);
  attach(b);
  return b;
}
function findSpot(rad, placed) {
  const bd = world.bounds;
  let best = null, bestScore = -Infinity;
  for (let t = 0; t < 200; t++) {
    const z = bd.zNear - rad + Math.random() * Math.min(0, (bd.zFar + rad) - (bd.zNear - rad));
    const k = (z - bd.zNear) / (bd.zFar - bd.zNear || 1);
    const xl = bd.xn0 + (bd.xf0 - bd.xn0) * k + rad, xr = bd.xn1 + (bd.xf1 - bd.xn1) * k - rad;
    const x = xl + Math.random() * Math.max(0, xr - xl);
    let md = 3;
    for (const q of placed) md = Math.min(md, Math.hypot(q.x - x, q.z - z) - q.r - rad);
    const score = md - Math.hypot(x, z) * 0.15;
    if (score > bestScore) { bestScore = score; best = { x, z }; }
  }
  return best || { x: 0, z: 0 };
}
function resetScene() {
  for (const b of world.bodies) detach(b);
  world.clear();
  for (const [id, st] of ptrs) if (st.kind !== 'slice' && st.kind !== 'aim') ptrs.delete(id);
  sceneLook = params.look.variant;
  const n = clamp(Math.round(params.base.count), 1, 6), R = jellyR(), placed = [];
  for (let i = 0; i < n; i++) {
    const p = findSpot(R * 1.12, placed);
    placed.push({ x: p.x, z: p.z, r: R * 1.12 });
    if (sceneLook === 'mikan') spawnMikan(p.x, p.z, R * (1.6 + i * 0.9));
    else spawnJelly(KINDS[i % KINDS.length], p.x, p.z, R * (1.6 + i * 0.9));
  }
  buildTray();
}
function addJelly(kind) {
  if (world.bodies.length >= 20) return;
  const R = jellyR(), placed = world.bodies.map(b => ({ x: b.c[0], z: b.c[2], r: b.rmax }));
  const p = findSpot(R * 1.12, placed);
  if (kind === 'mikan') spawnMikan(p.x, p.z, R * 3); else spawnJelly(kind, p.x, p.z, R * 3);
  snd.pop();
}

/* ---------- 物理の値・世界からの知らせ ---------- */
let P = null;
function physics() {
  const m = params.motion, w = TAU * Math.max(0.3, m.hz), f = TAU * Math.max(0.5, m.follow);
  return {
    k: w * w, wobbleDamp: 1.6 / Math.max(0.05, m.keep), stretch: clamp(m.stretch, 0, 0.9),
    gravity: 30 * Math.max(0, m.gravity), followK: f * f, followC: 2 * 0.9 * f,
    pinch: clamp(m.pinch, 0, 1), press: m.press, poke: m.poke, split: m.split,
    floorFric: clamp(0.14 / Math.max(0.1, m.slide), 0, 0.9)
  };
}
P = physics();
function vibrate(ms) { if (params.other.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* 何もしない */ } } }
const soundSize = b => 50 + b.size * 30;
world.on.cut = info => {
  detach(info.body);
  for (const k of info.kids) attach(k);
  snd.cut(); vibrate(12);
  for (const [id, st] of ptrs) {
    if (st.b !== info.body) continue;
    const hit = pickAt(st.x, st.y);
    const kid = hit && info.kids.includes(hit.b) ? hit.b : null;
    if (!kid) { ptrs.delete(id); continue; }
    st.b = kid;
    if (st.kind === 'hold') world.pressStart(kid, hit.p, hit.dir, P);
    else if (st.kind === 'drag') st.g = world.grabStart(kid, hit.p, P);
  }
};
world.on.land = (b, vy) => { if (vy > 1.2) snd.land(soundSize(b), Math.min(1, vy / 8)); };

/* ---------- 包丁 ---------- */
const knife = new Knife(scene, jellyEnv, tint => shadowMesh(tint, 3));
const kui = { box: $('#knifeCtrl'), yaw: $('#knifeYaw'), tilt: $('#knifeTilt'), yawOut: $('#knifeYawOut'), tiltOut: $('#knifeTiltOut') };
let sliceLive = false, knifeTarget = 0;
const wrapDeg = a => { let d = a % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
function syncKnifeUI() {
  const y = Math.round(wrapDeg(knife.yaw / DEG)), t = Math.round(knife.tilt / DEG);
  kui.yaw.value = y; kui.tilt.value = t;
  kui.yawOut.textContent = y + '°'; kui.tiltOut.textContent = t + '°';
}
kui.yaw.addEventListener('input', () => { knife.yaw = +kui.yaw.value * DEG; syncKnifeUI(); });
kui.tilt.addEventListener('input', () => { knife.tilt = +kui.tilt.value * DEG; syncKnifeUI(); });
function turnKnife(dYaw, dTilt) {
  knife.yaw = wrapDeg(knife.yaw / DEG + dYaw) * DEG;
  knife.tilt = clamp(knife.tilt / DEG + dTilt, -60, 60) * DEG;
  syncKnifeUI();
}
/** 指の所に刃が来るように、刃が下りるテーブルの点を決める（ゼリーの上なら、その点を刃が通るように） */
function aimPoint(sx, sy) {
  const hit = pickAt(sx, sy);
  if (!hit) return clampToTable(toPlane(sx, sy, 0), 0);
  const { up } = knife.axes();
  const t = hit.p[1] / Math.max(0.3, up[1]);
  return new THREE.Vector3(hit.p[0] - up[0] * t, 0, hit.p[2] - up[2] * t);
}
/** 刃が押し込む：切る直前に、刃の近くの点を刃の向きに押し下げる */
function pressBlade(b, n, d, up) {
  const x = b.x, v = b.v, w = b.size * 0.25;
  for (let i = 0; i < x.length; i += 3) {
    const s = n[0] * x[i] + n[1] * x[i + 1] + n[2] * x[i + 2] - d;
    if (Math.abs(s) > w) continue;
    const k = (1 - Math.abs(s) / w) * 3;
    v[i] -= up[0] * k; v[i + 1] -= up[1] * k; v[i + 2] -= up[2] * k;
  }
}
/** ストンと下ろす（刃の面で、刃の長さの中にあるゼリーを切る） */
function chop() {
  const K = knife.K.clone();
  const started = knife.startChop(() => {
    const { n, d } = knife.plane(K);
    const { e, up } = knife.axes();
    const half = knife.L * knife.scale / 2;
    let any = false;
    for (const b of [...world.bodies]) {
      const s = (b.c[0] - K.x) * e[0] + (b.c[2] - K.z) * e[2];
      if (Math.abs(s) > half + b.rmax * 0.7) continue;
      const dist = n[0] * b.c[0] + n[1] * b.c[1] + n[2] * b.c[2] - d;
      if (Math.abs(dist) > b.rmax * 0.98) continue;
      pressBlade(b, n, d, up);
      if (world.cut(b, n, d, P)) any = true;
    }
    if (!any) snd.land(40, 0.3);
  });
  if (started) vibrate(8);
}
/** なぞって切る：なぞった線（ゼリーのまん中の高さ）と刃の傾きでできる面で切る */
function sliceBetween(b, a, sx, sy) {
  if (!world.bodies.includes(b) || Math.hypot(sx - a.x, sy - a.y) < 6) return;
  const h = b.c[1], p0 = toPlane(a.x, a.y, h), p1 = toPlane(sx, sy, h);
  const ex = p1.x - p0.x, ez = p1.z - p0.z, l = Math.hypot(ex, ez);
  if (l < 1e-4) return;
  knife.yaw = Math.atan2(-ez / l, ex / l);
  const { n, up } = knife.axes();
  const d = n[0] * p0.x + n[1] * p0.y + n[2] * p0.z;
  pressBlade(b, n, d, up);
  world.cut(b, n, d, P);
  syncKnifeUI();
}
function sliceTo(st, x1, y1) {
  const x0 = st.lx, y0 = st.ly, steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 12));
  for (let k = 1; k <= steps; k++) {
    const sx = x0 + (x1 - x0) * k / steps, sy = y0 + (y1 - y0) * k / steps;
    const under = bodiesUnder(sx, sy);
    for (const [b, ent] of [...st.over]) if (!under.has(b)) { st.over.delete(b); sliceBetween(b, ent, sx, sy); }
    for (const b of under) if (!st.over.has(b)) st.over.set(b, { x: sx, y: sy });
  }
  st.lx = x1; st.ly = y1;
  /* 包丁も、なぞった所をなぞった向きで動く */
  const p = toPlane(x1, y1, jellyR() * 0.6);
  if (st.wx !== undefined) {
    const dx = p.x - st.wx, dz = p.z - st.wz;
    if (Math.hypot(dx, dz) > 0.04) knife.yaw = Math.atan2(-dz, dx);
  }
  st.wx = p.x; st.wz = p.z;
  knife.K.set(p.x, 0, p.z);
}

/* ---------- 指の操作 ---------- */
let mode = 'touch';
const ptrs = new Map();
function meshes() { return world.bodies.filter(b => b.mesh).map(b => b.mesh); }
function pickAt(sx, sy) {
  setRay(sx, sy);
  const hit = ray.intersectObjects(meshes(), false)[0];
  if (!hit) return null;
  const d = ray.ray.direction;
  return { b: hit.object.userData.body, p: [hit.point.x, hit.point.y, hit.point.z], dir: [d.x, d.y, d.z] };
}
function bodiesUnder(sx, sy) {
  setRay(sx, sy);
  const set = new Set();
  for (const h of ray.intersectObjects(meshes(), false)) set.add(h.object.userData.body);
  return set;
}
function updateCursor(x, y) {
  let c;
  if ([...ptrs.values()].some(s => s.kind === 'drag')) c = 'grabbing';
  else if (mode === 'knife') c = 'crosshair';
  else c = pickAt(x, y) ? 'grab' : 'crosshair';
  if (canvas.style.cursor !== c) canvas.style.cursor = c;
}

canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  snd.unlock();
  closeTray();
  const x = e.clientX, y = e.clientY, t = performance.now();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 何もしない */ }
  if (mode === 'knife') {
    /* 包丁を指の所へ。離した所へ下ろす */
    knife.K.copy(aimPoint(x, y));
    ptrs.set(e.pointerId, { kind: 'aim', x, y, lt: t });
    return;
  }
  const hit = pickAt(x, y);
  if (hit) {
    world.pressStart(hit.b, hit.p, hit.dir, P);
    ptrs.set(e.pointerId, { kind: 'hold', b: hit.b, hit: hit.p, x0: x, y0: y, x, y, t0: t, lt: t, vx: 0, vy: 0, vz: 0 });
    vibrate(6);
  } else {
    const st = { kind: 'slice', over: new Map(), lx: x, ly: y, x, y, lt: t };
    for (const b of bodiesUnder(x, y)) st.over.set(b, { x, y });
    ptrs.set(e.pointerId, st);
    sliceLive = true;
    knife.g.visible = true;
    knife.showGuide = false;
    const p = toPlane(x, y, jellyR() * 0.6);
    knife.K.set(p.x, 0, p.z);
  }
  updateCursor(x, y);
});

canvas.addEventListener('pointermove', e => {
  const st = ptrs.get(e.pointerId);
  const x = e.clientX, y = e.clientY, t = performance.now();
  if (!st) {
    if (e.pointerType === 'mouse') {
      if (mode === 'knife' && !knife.chop) knife.K.copy(aimPoint(x, y));
      updateCursor(x, y);
    }
    return;
  }
  if (st.kind === 'aim') {
    if (!knife.chop) knife.K.copy(aimPoint(x, y));
  } else if (st.kind === 'hold') {
    if (!world.bodies.includes(st.b)) { ptrs.delete(e.pointerId); return; }
    if (Math.hypot(x - st.x0, y - st.y0) > 10) {
      world.pressEnd(st.b, false, P, true);
      st.kind = 'drag';
      st.g = world.grabStart(st.b, st.hit, P);
      st.h = st.hit[1] + Math.max(0, params.motion.lift) * st.b.R;
      st.tp = clampToTable(toPlane(x, y, st.h), st.b.R * 0.6);
      updateCursor(x, y);
    }
  }
  if (st.kind === 'drag') {
    const tp = clampToTable(toPlane(x, y, st.h), st.b.R * 0.6), dt = Math.max(4, t - st.lt) / 1000;
    const k = 0.5;
    st.vx = st.vx * k + (tp.x - st.tp.x) / dt * (1 - k);
    st.vy = st.vy * k + (tp.y - st.tp.y) / dt * (1 - k);
    st.vz = st.vz * k + (tp.z - st.tp.z) / dt * (1 - k);
    st.tp = tp;
    st.g.t = [tp.x, tp.y, tp.z];
    st.g.tv = [st.vx, st.vy, st.vz];
  } else if (st.kind === 'slice') {
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ce of (evs.length ? evs : [e])) {
      if (Math.hypot(ce.clientX - st.lx, ce.clientY - st.ly) < 0.5) continue;
      sliceTo(st, ce.clientX, ce.clientY);
    }
  }
  st.x = x; st.y = y; st.lt = t;
});

function endPointer(e) {
  const st = ptrs.get(e.pointerId);
  if (!st) return;
  ptrs.delete(e.pointerId);
  const t = performance.now();
  if (st.kind === 'aim') {
    if (!knife.chop) knife.K.copy(aimPoint(e.clientX, e.clientY));
    chop();
  } else if (st.kind === 'hold' && world.bodies.includes(st.b)) {
    const quick = t - st.t0 < 260;
    const depth = world.pressEnd(st.b, quick, P);
    if (quick) snd.poke(soundSize(st.b), 0.8 + 0.4 * depth); else snd.wobble(soundSize(st.b), 0.5 + 0.5 * depth);
    vibrate(quick ? 8 : 14);
  } else if (st.kind === 'drag') {
    world.grabEnd(st.g);
  } else if (st.kind === 'slice') {
    sliceLive = [...ptrs.values()].some(s => s.kind === 'slice');
  }
  updateCursor(e.clientX, e.clientY);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', e => e.preventDefault());
/* きるモード：ホイールで向き、Shift＋ホイールで傾き。矢印キーでも回せる */
canvas.addEventListener('wheel', e => {
  if (mode !== 'knife') return;
  e.preventDefault();
  const s = Math.sign(e.deltaY || e.deltaX) * 5;
  if (e.shiftKey) turnKnife(0, s); else turnKnife(s, 0);
}, { passive: false });
addEventListener('keydown', e => {
  if (mode !== 'knife' || e.target.closest && e.target.closest('input, .tp')) return;
  if (e.key === 'ArrowLeft') turnKnife(5, 0);
  else if (e.key === 'ArrowRight') turnKnife(-5, 0);
  else if (e.key === 'ArrowUp') turnKnife(0, 5);
  else if (e.key === 'ArrowDown') turnKnife(0, -5);
  else return;
  e.preventDefault();
});

/* ---------- 道具バー ---------- */
function setMode(m) {
  mode = m;
  for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === m));
  kui.box.hidden = m !== 'knife';
  if (m === 'knife') {
    knife.g.visible = true;
    knife.showGuide = true;
    if (!ptrs.size) knife.K.copy(clampToTable(toPlane(W / 2, H * 0.52, 0), 0));
    syncKnifeUI();
  } else {
    knife.showGuide = false;
  }
}
for (const b of document.querySelectorAll('[data-mode]')) b.addEventListener('click', () => setMode(b.dataset.mode));
const tray = $('#tray'), addBtn = $('#addBtn');
function closeTray() { tray.hidden = true; addBtn.setAttribute('aria-expanded', 'false'); }
addBtn.addEventListener('click', () => {
  const open = tray.hidden;
  tray.hidden = !open;
  addBtn.setAttribute('aria-expanded', String(open));
  if (open) kui.box.hidden = true; else kui.box.hidden = mode !== 'knife';
});
function buildTray() {
  tray.innerHTML = '';
  const kinds = sceneLook === 'mikan' ? ['mikan'] : KINDS;
  for (const kind of kinds) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'tray-btn'; btn.dataset.key = kind;
    const thumb = fruitThumb(kind === 'mikan' ? 'orange' : kind, 48);
    const label = document.createElement('span');
    label.textContent = kind === 'mikan' ? 'みかん' : KIND_NAME[kind];
    btn.append(thumb, label);
    btn.addEventListener('click', () => addJelly(kind));
    tray.append(btn);
  }
}
$('#shakeBtn').addEventListener('click', () => { snd.unlock(); world.shake(); snd.shake(); vibrate(20); });
$('#resetBtn').addEventListener('click', () => { snd.unlock(); resetScene(); });
const soundBtn = $('#soundBtn');
function updateSoundBtn() {
  const on = !!params.other.sound;
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', on ? '音を消す' : '音を出す');
}
soundBtn.addEventListener('click', () => {
  snd.unlock();
  params.other.sound = params.other.sound ? 0 : 1;
  if (panel) panel.sync();
  updateSoundBtn();
});
document.addEventListener('pointerdown', e => {
  if (!tray.hidden && !tray.contains(e.target) && !addBtn.contains(e.target)) { closeTray(); kui.box.hidden = mode !== 'knife'; }
});

/* ---------- 調整パネル ---------- */
let panel = null;
if (window.TunePanel) {
  panel = TunePanel.create({
    title: '調整パネル', storageKey: 'jelly-fruits-3d', version: 2,
    params, defaults: DEFAULTS,
    schema: [
      { cat: 'ゼリー', items: [
        { pills: 'ゼリーの案', path: 'look.variant', options: [
          { name: 'みかんゼリー', value: 'mikan', desc: 'まるごとのみかんの形をした、少し透けるゼリー。切ると中の房の断面が見える。' },
          { name: 'クリアゼリー', value: 'clear', desc: 'ほぼ透明なゼリーの中に果物。後ろの方眼が曲がって見える。', values: LOOK_VALUES.clear },
          { name: '色つきゼリー', value: 'color', desc: '果物の色にうすく染まったゼリーの中に果物。', values: LOOK_VALUES.color },
          { name: 'すりガラス寒天', value: 'frost', desc: 'くもりガラスのように、やわらかく透ける寒天の中に果物。', values: LOOK_VALUES.frost }
        ]},
        { sub: 'ゼリー', grp: 'basic', items: [
          { pills: '形', path: 'base.shape', fixedOptions: true, only: INSIDE, options: [
            { name: 'ドーム', value: 'dome', desc: '下が平らな、背の低い丸。' },
            { name: 'まる', value: 'ball', desc: '水信玄餅のような、ほぼ球。' },
            { name: 'しかく', value: 'cube', desc: '角の丸い四角（寒天のかたまり）。' }
          ], hint: 'ゼリーの形。変えると並べ直します。' },
          { slider: '大きさ', path: 'base.size', min: 10, max: 80, step: 1, unit: '%', grid: false, hint: '画面の短い辺に対する、ゼリーの直径の割合。手を離すと並べ直します。' },
          { slider: '数', path: 'base.count', min: 1, max: 6, step: 1, fmt: 'int', hint: '最初にテーブルへ落ちてくるゼリーの数。手を離すと並べ直します。' }
        ]},
        { sub: '中の果物', grp: 'basic', only: INSIDE, items: [
          { slider: '大きさ', path: 'base.fruit', min: 0, max: 1.4, step: 0.05, fmt: 'x', hint: 'ゼリーの中の果物の大きさ。0 で果物なし（ゼリーだけ）。手を離すと並べ直します。' }
        ]},
        { sub: '包丁', grp: 'basic', items: [
          { slider: '大きさ', path: 'base.knife', min: 0.4, max: 2, step: 0.05, fmt: 'x', hint: '包丁の大きさ。刃が長いほど、一度にたくさん切れる。' }
        ]},
        { sub: 'カメラ', grp: 'basic', items: [
          { slider: '見下ろす角度', path: 'base.cam', min: 15, max: 89, step: 1, unit: '°', hint: 'テーブルを見下ろす角度。90° に近いほど真上から、小さいほど横から見る。' }
        ]},
        { sub: 'ゼリー', grp: 'fxtex', items: [
          { slider: '屈折', path: 'fx.ior', min: 1, max: 2.3, step: 0.01, fmt: 'n2', hint: '後ろがどれだけ曲がって見えるか。1 で曲がらない。水は 1.33。' },
          { slider: '厚み', path: 'fx.thick', min: 0, max: 3, step: 0.05, fmt: 'x', hint: '光が通る厚みの感じ方。上げると、ゆがみが強くなる。' },
          { slider: 'くもり', path: 'fx.rough', min: 0, max: 1, step: 0.01, fmt: 'n2', clamp: true, hint: '0 でつるつる。上げるとすりガラスのようにぼやける。' },
          { slider: '色の濃さ', path: 'fx.tint', min: 0, max: 8, step: 0.1, fmt: 'x', hint: 'ゼリーが果物の色に染まる濃さ。' },
          { slider: '虹色', path: 'fx.rainbow', min: 0, max: 3, step: 0.05, fmt: 'x', hint: 'ふちに出る、うすい虹色のにじみ。0 で出ない。' },
          { slider: '映り込み', path: 'fx.env', min: 0, max: 3, step: 0.05, fmt: 'x', hint: 'まわりの明かりの映り込み（照り返し）の強さ。' }
        ]},
        { sub: 'みかん', grp: 'fxtex', only: 'mikan', items: [
          { slider: '透け具合', path: 'fx.mikanTrans', min: 0, max: 1, step: 0.01, fmt: 'n2', clamp: true, hint: 'みかん全体の透け方。0 で透けない（ふつうのみかん）、1 で一番みずみずしく透ける。' },
          { slider: '皮の透け', path: 'fx.peelSee', min: 0, max: 1, step: 0.01, fmt: 'n2', clamp: true, hint: '皮越しに、中の房がうっすら見える量。' },
          { slider: 'でこぼこ', path: 'fx.bump', min: 0, max: 3, step: 0.05, fmt: 'x', hint: '皮の毛穴のようなくぼみと、果肉のつぶつぶの立体感。' }
        ]},
        { sub: '中の果物', grp: 'fxtex', only: INSIDE, items: [
          { slider: 'ツヤ', path: 'fx.fruitGloss', min: 0, max: 1, step: 0.05, fmt: 'n2', clamp: true, hint: '果物の表面のみずみずしい照り返し。' }
        ]},
        { sub: 'テーブル', grp: 'fxtex', items: [
          { color: '色', path: 'fx.table', hint: 'テーブルの色。' },
          { slider: '影の濃さ', path: 'fx.shadow', min: 0, max: 2, step: 0.05, fmt: 'x', hint: 'ゼリーの下に落ちる影の濃さ。' },
          { slider: '色の光', path: 'fx.caustic', min: 0, max: 2, step: 0.05, fmt: 'x', hint: 'ゼリーを通って床に落ちる、色つきの光の濃さ。' }
        ]},
        { sub: 'ぷるぷる', grp: 'anim', items: [
          { slider: '速さ', path: 'motion.hz', min: 0.5, max: 8, step: 0.1, unit: 'Hz', hint: '1秒に何回ぷるぷる揺れるか。上げるとかため、下げるとやわらかい。' },
          { slider: '続く長さ', path: 'motion.keep', min: 0.1, max: 3, step: 0.05, fmt: 'x', hint: '揺れが止まるまでの長さ。' },
          { slider: '伸びやすさ', path: 'motion.stretch', min: 0, max: 0.9, step: 0.05, fmt: 'n2', clamp: true, hint: '全体がむにっと伸び縮みする量。上げるほど、つぶれたり伸びたりしやすい。' }
        ]},
        { sub: '押した時', grp: 'anim', items: [
          { slider: 'へこみ', path: 'motion.press', min: 0, max: 2, step: 0.05, fmt: 'x', hint: '押しっぱなしにした時のへこみと、横への広がり。' },
          { slider: 'ぷにっの強さ', path: 'motion.poke', min: 0, max: 2, step: 0.05, fmt: 'x', hint: 'タップしてすぐ離した時の、はねる強さ。' }
        ]},
        { sub: 'つかんだ時', grp: 'anim', items: [
          { slider: '追従', path: 'motion.follow', min: 1, max: 16, step: 0.5, unit: 'Hz', hint: '指にどれだけ速くついてくるか。下げるとふんわり遅れてついてくる。' },
          { slider: '持ち上げる高さ', path: 'motion.lift', min: 0, max: 2, step: 0.05, fmt: 'x', hint: 'つかんだ時に持ち上がる高さ（ゼリーの半径の何倍か）。' },
          { slider: '垂れ下がり', path: 'motion.pinch', min: 0, max: 1, step: 0.05, fmt: 'n2', clamp: true, hint: 'つまんだ所だけで持ち上げる感じ。上げると、ほかの所がだらんと垂れる。' }
        ]},
        { sub: 'テーブル', grp: 'anim', items: [
          { slider: '重さ', path: 'motion.gravity', min: 0, max: 3, step: 0.05, fmt: 'x', hint: '落ちる速さ（重力）。下げるとふわっと落ちる。' },
          { slider: 'すべりやすさ', path: 'motion.slide', min: 0.1, max: 4, step: 0.05, fmt: 'x', hint: '投げた時に、テーブルの上をどこまですべるか。' }
        ]},
        { sub: '切った時', grp: 'anim', items: [
          { slider: '離れ方', path: 'motion.split', min: 0, max: 3, step: 0.05, fmt: 'x', hint: '切ったかけらが離れて、断面が上を向くように倒れる勢い。' }
        ]},
        { sub: '包丁', grp: 'anim', items: [
          { slider: '下ろす速さ', path: 'motion.chop', min: 0.2, max: 3, step: 0.05, fmt: 'x', hint: 'きるモードで、包丁をストンと下ろす速さ。' }
        ]},
        { sub: '音', grp: 'other', items: [
          { toggle: '鳴らす', path: 'other.sound', shared: true, hint: '効果音を鳴らすかどうか（右上のボタンと同じ）。' },
          { slider: '音量', path: 'other.volume', min: 0, max: 2, step: 0.05, fmt: 'x', shared: true, hint: '効果音の大きさ。' },
          { toggle: '振動', path: 'other.vibrate', shared: true, hint: 'スマホ（Android）で、さわった時に短く震わせるかどうか。' }
        ]}
      ]}
    ],
    onSettle: info => {
      updateSoundBtn();
      if (!info) return;
      if (info.variant || info.remote || info.imported) { resetScene(); return; }
      if (info.path === 'base.cam') { layout(); return; }
      if (['base.size', 'base.count', 'base.shape', 'base.fruit'].includes(info.path) || (info.reset && !info.path)) resetScene();
    }
  });
}

/* ---------- 毎フレーム ---------- */
addEventListener('resize', layout);
let last = performance.now();
const perf = { ms: 0 };
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  P = physics();
  snd.set(!!params.other.sound, params.other.volume);
  if (params.look.variant !== sceneLook) resetScene();
  if (params.base.cam !== lastCam) layout();
  for (const st of ptrs.values()) {
    if (st.kind === 'drag' && now - st.lt > 40) { st.vx *= 0.8; st.vy *= 0.8; st.vz *= 0.8; st.g.tv = [st.vx, st.vy, st.vz]; }
  }
  const t0 = performance.now();
  world.step(dt, P);
  for (const b of world.bodies) if (b.mesh) sync(b);
  updateMaterials();
  perf.ms = perf.ms * 0.95 + (performance.now() - t0) * 0.05;
  /* 包丁：大きさ・待つ高さ・なぞっている間は刃を下げる */
  const R = jellyR();
  knife.scale = R * Math.max(0.1, params.base.knife);
  knife.hoverY = R * 2.1;
  if (!knife.chop) {
    knifeTarget = sliceLive ? 0.78 : 0;
    knife.depth += (knifeTarget - knife.depth) * (1 - Math.exp(-dt * 14));
    if (mode !== 'knife' && !sliceLive && knife.depth < 0.02) knife.g.visible = false;
  }
  knife.update(dt, params.motion.chop);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

layout();
updateSoundBtn();
resetScene();
syncKnifeUI();
requestAnimationFrame(loop);

/* 確認用（ブラウザのコンソールから触れる） */
window.__jelly3d = { world, params, resetScene, addJelly, setMode, camera, renderer, scene, pickAt, knife, chop, turnKnife, aimPoint, perf, panel: () => panel };
