/* shapes.js — ゼリーの形（ドーム・まる・しかく）・当たり判定の玉・中に入れる果物の輪切り（配色は仮置き） */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { FRUITS, spawnFruit } from './fruit2d/fruits.js';
import { Renderer, bodyPath } from './fruit2d/render.js';

/* ゼリーの色（うすく色づく） */
export const TINT = { orange: '#FFB25C', strawberry: '#FF8FA6', kiwi: '#B6E07A', lemon: '#FFE36B' };
/* 果物を切った時の中の色 */
const FLESH = { orange: '#FFA43A', strawberry: '#F4707F', kiwi: '#9FCD4C', lemon: '#FFE066' };
export const KINDS = ['orange', 'strawberry', 'kiwi', 'lemon'];
export const KIND_NAME = { orange: 'オレンジ', strawberry: 'いちご', kiwi: 'キウイ', lemon: 'レモン' };

/* ---------- ゼリーの形（半径1で作り、あとで大きさを掛ける） ---------- */
const baseCache = new Map();

function shapeVertex(shape, x, y, z) {
  if (shape === 'cube') {
    const m = 6, r = Math.pow(Math.abs(x) ** m + Math.abs(y) ** m + Math.abs(z) ** m, -1 / m);
    x *= r; y *= r; z *= r;
    if (y < -0.9) y = -0.9 + (y + 0.9) * 0.12;
    return [x, y * 0.78, z];
  }
  if (shape === 'ball') {
    if (y < -0.8) y = -0.8 + (y + 0.8) * 0.12;
    return [x, y * 0.95, z];
  }
  /* ドーム：下を平らにつぶした、少し背の低い丸 */
  if (y < -0.25) y = -0.25 + (y + 0.25) * 0.1;
  return [x, y * 0.82, z];
}

export function jellyBase(shape, detail) {
  const key = shape + ':' + detail;
  if (baseCache.has(key)) return baseCache.get(key);
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const src = g.attributes.position.array, P = new Float32Array(src.length);
  let minY = Infinity;
  for (let i = 0; i < src.length; i += 3) {
    const [x, y, z] = shapeVertex(shape, src[i], src[i + 1], src[i + 2]);
    P[i] = x; P[i + 1] = y; P[i + 2] = z;
    if (y < minY) minY = y;
  }
  let maxY = -Infinity;
  for (let i = 1; i < P.length; i += 3) { P[i] -= minY; if (P[i] > maxY) maxY = P[i]; }
  const res = { P, index: Uint32Array.from(g.index.array), height: maxY, spheres: null };
  g.dispose();
  baseCache.set(key, res);
  return res;
}

/** 形の中を小さな玉で埋める（ほかのゼリーとの当たり判定に使う） */
export function jellySpheres(base) {
  if (base.spheres) return base.spheres;
  const P = base.P, idx = base.index, np = P.length / 3;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]);
    y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]);
    z0 = Math.min(z0, P[i + 2]); z1 = Math.max(z1, P[i + 2]);
  }
  const inside = (px, py, pz) => {
    let hits = 0;
    for (let t = 0; t < idx.length; t += 3) {
      const a = 3 * idx[t], b = 3 * idx[t + 1], c = 3 * idx[t + 2];
      const ay = P[a + 1], az = P[a + 2], by = P[b + 1], bz = P[b + 2], cy = P[c + 1], cz = P[c + 2];
      const d = (by - ay) * (cz - az) - (cy - ay) * (bz - az);
      if (Math.abs(d) < 1e-12) continue;
      const u = ((py - ay) * (cz - az) - (cy - ay) * (pz - az)) / d;
      const v = ((by - ay) * (pz - az) - (py - ay) * (bz - az)) / d;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const hx = P[a] + (P[b] - P[a]) * u + (P[c] - P[a]) * v;
      if (hx > px) hits++;
    }
    return hits % 2 === 1;
  };
  const cand = [];
  const h = 0.22;
  for (let x = x0 + h / 2; x < x1; x += h) {
    for (let y = y0 + h / 2; y < y1; y += h) {
      for (let z = z0 + h / 2; z < z1; z += h) {
        const px = x + 1.3e-4, py = y + 0.7e-4, pz = z + 1.9e-4;
        if (!inside(px, py, pz)) continue;
        let r2 = Infinity;
        for (let i = 0; i < np; i++) {
          const dx = P[3 * i] - px, dy = P[3 * i + 1] - py, dz = P[3 * i + 2] - pz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < r2) r2 = d2;
        }
        const r = Math.sqrt(r2) * 0.94;
        if (r > 0.1) cand.push({ x: px, y: py, z: pz, r });
      }
    }
  }
  cand.sort((a, b) => b.r - a.r);
  const kept = [];
  for (const s of cand) {
    let covered = false;
    for (const k of kept) {
      const d = Math.hypot(s.x - k.x, s.y - k.y, s.z - k.z);
      if (d + s.r <= k.r * 1.08 || d < k.r * 0.45) { covered = true; break; }
    }
    if (!covered) kept.push(s);
    if (kept.length >= 64) break;
  }
  const c = new Float32Array(kept.length * 3), r = new Float32Array(kept.length);
  kept.forEach((s, i) => { c[3 * i] = s.x; c[3 * i + 1] = s.y; c[3 * i + 2] = s.z; r[i] = s.r; });
  base.spheres = { c, r };
  return base.spheres;
}

/* ---------- 中に入れる果物（輪切り） ---------- */
const painter = new Renderer(document.createElement('canvas'));
const texCache = new Map();

/** 果物の断面を絵に描いて、立体に貼る絵を作る（2D版の果物の描き方をそのまま使う） */
export function fruitTexture(key) {
  if (texCache.has(key)) return texCache.get(key);
  const def = FRUITS[key];
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 640;
  const ctx = cv.getContext('2d');
  const R2D = 232;
  const b = spawnFruit(key, R2D / def.scale, 'jelly', 256, 256, 0);
  b.frame(0);
  b.path = bodyPath(b);
  b.mapFeatures();
  const rind = def.pal.rind ? def.pal.rind[def.pal.rind.length - 1].color : '#cccccc';
  ctx.fillStyle = FLESH[key];
  ctx.fillRect(0, 0, 512, 640);
  ctx.save();
  ctx.clip(b.path);
  ctx.fillStyle = painter.fill(ctx, b, def.pal.fills.base);
  ctx.fill(b.path);
  painter.features(ctx, b, 1);
  painter.bands(ctx, b, 'jelly');
  ctx.restore();
  ctx.fillStyle = rind;
  ctx.fillRect(0, 512, 256, 128);
  ctx.fillStyle = FLESH[key];
  ctx.fillRect(256, 512, 256, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const out = { tex, canvas: cv, b, R2D, rindUV: [0.25, 0.1], fleshUV: [0.75, 0.1] };
  texCache.set(key, out);
  return out;
}

function orient(P, vp, index, expect) {
  for (let t = 0; t < index.length; t += 3) {
    const a = 3 * vp[index[t]], b = 3 * vp[index[t + 1]], c = 3 * vp[index[t + 2]];
    const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
    const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const [ex, ey, ez] = expect(t, (P[a] + P[b] + P[c]) / 3, (P[a + 1] + P[b + 1] + P[c + 1]) / 3, (P[a + 2] + P[b + 2] + P[c + 2]) / 3);
    if (nx * ex + ny * ey + nz * ez < 0) { const k = index[t + 1]; index[t + 1] = index[t + 2]; index[t + 2] = k; }
  }
}

/**
 * 果物の輪切りを立体にする（面は XY、厚みは Z）。
 * r: 半径（ワールドの長さ） / thick: 厚み
 * 返す値: { P（点）, vp, uv, index, tex }
 */
export function fruitSlice(key, r, thick) {
  const T = fruitTexture(key), b = T.b, n = b.n, k = r / T.R2D, h = thick / 2;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += b.x[i]; my += b.y[i]; }
  mx /= n; my /= n;
  const P = new Float32Array((2 * n + 2) * 3);
  for (let i = 0; i < n; i++) {
    const X = (b.x[i] - mx) * k, Y = -(b.y[i] - my) * k;
    P[3 * i] = X; P[3 * i + 1] = Y; P[3 * i + 2] = h;
    P[3 * (n + i)] = X; P[3 * (n + i) + 1] = Y; P[3 * (n + i) + 2] = -h;
  }
  P[3 * 2 * n + 2] = h;
  P[3 * (2 * n + 1) + 2] = -h;
  const vp = [], uv = [], index = [];
  const cu = mx / 512, cv = 1 - my / 640;
  const tc = vp.length; vp.push(2 * n); uv.push(cu, cv);
  const tr = vp.length; for (let i = 0; i < n; i++) { vp.push(i); uv.push(b.x[i] / 512, 1 - b.y[i] / 640); }
  const bc = vp.length; vp.push(2 * n + 1); uv.push(cu, cv);
  const br = vp.length; for (let i = 0; i < n; i++) { vp.push(n + i); uv.push(b.x[i] / 512, 1 - b.y[i] / 640); }
  const st = vp.length; for (let i = 0; i < n; i++) { vp.push(i); uv.push(T.rindUV[0], T.rindUV[1]); }
  const sb = vp.length; for (let i = 0; i < n; i++) { vp.push(n + i); uv.push(T.rindUV[0], T.rindUV[1]); }
  const kinds = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    index.push(tc, tr + i, tr + j); kinds.push(0);
    index.push(bc, br + j, br + i); kinds.push(1);
    index.push(st + i, sb + i, sb + j); kinds.push(2);
    index.push(st + i, sb + j, st + j); kinds.push(2);
  }
  const vpA = Uint32Array.from(vp), idxA = Uint32Array.from(index);
  orient(P, vpA, idxA, (t, x, y) => {
    const kind = kinds[t / 3];
    if (kind === 0) return [0, 0, 1];
    if (kind === 1) return [0, 0, -1];
    return [x, y, 0];
  });
  return { P, vp: vpA, uv: Float32Array.from(uv), index: idxA, tex: T };
}

/** 点を回転・移動する（行列は行ごと 3×3、そのあと t を足す） */
export function transformPoints(P, M, t) {
  for (let i = 0; i < P.length; i += 3) {
    const x = P[i], y = P[i + 1], z = P[i + 2];
    P[i] = M[0] * x + M[1] * y + M[2] * z + t[0];
    P[i + 1] = M[3] * x + M[4] * y + M[5] * z + t[1];
    P[i + 2] = M[6] * x + M[7] * y + M[8] * z + t[2];
  }
  return P;
}

export function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
export function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
export function mulM(a, b) {
  const o = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}

/** 小さな丸い見本（ふやすトレイ用） */
export function fruitThumb(key, size) {
  const T = fruitTexture(key), cv = document.createElement('canvas');
  const d = Math.min(2, window.devicePixelRatio || 1);
  cv.width = cv.height = size * d;
  const c = cv.getContext('2d');
  c.scale(d, d);
  const b = T.b;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < b.n; i++) { x0 = Math.min(x0, b.x[i]); x1 = Math.max(x1, b.x[i]); y0 = Math.min(y0, b.y[i]); y1 = Math.max(y1, b.y[i]); }
  const s = Math.max(x1 - x0, y1 - y0);
  c.drawImage(T.canvas, x0, y0, s, s, 2, 2, size - 4, size - 4);
  return cv;
}
