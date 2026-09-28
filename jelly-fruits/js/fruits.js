/* fruits.js — 果物の形と模様（配色・模様の作りはすべて「仮置き」）
   座標は果物の中心が (0,0)。R は果物の半径（px）。
   模様の種類: poly（塗る形）/ line（線）/ seed（小さな粒・向きあり）/ dot（点） */
import { TAU, rng, pointInPoly } from './geom.js';
import { Body } from './softbody.js';

/* ---------- 形を作る道具 ---------- */
function resampleClosed(p, count) {
  const m = p.length >> 1, cum = [0];
  for (let i = 1; i <= m; i++) {
    const a = i - 1, b = i % m;
    cum.push(cum[i - 1] + Math.hypot(p[2 * b] - p[2 * a], p[2 * b + 1] - p[2 * a + 1]));
  }
  const L = cum[m], out = [];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const d = k * L / count;
    while (seg < m - 1 && cum[seg + 1] < d) seg++;
    const t = (d - cum[seg]) / ((cum[seg + 1] - cum[seg]) || 1);
    const a = seg, b = (seg + 1) % m;
    out.push(p[2 * a] + (p[2 * b] - p[2 * a]) * t, p[2 * a + 1] + (p[2 * b + 1] - p[2 * a + 1]) * t);
  }
  return out;
}
function perimeter(p) {
  let L = 0;
  const m = p.length >> 1;
  for (let i = 0; i < m; i++) { const j = (i + 1) % m; L += Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1]); }
  return L;
}
function denseEllipse(rx, ry, cnt = 360) {
  const p = [];
  for (let k = 0; k < cnt; k++) { const a = k / cnt * TAU; p.push(Math.cos(a) * rx, Math.sin(a) * ry); }
  return p;
}
function evenShape(dense, spacing, min = 16) {
  const n = Math.max(min, Math.round(perimeter(dense) / spacing));
  return { pts: resampleClosed(dense, n), kinds: null };
}
function ellipsePts(rx, ry, cnt, cx = 0, cy = 0) {
  const p = [];
  for (let k = 0; k < cnt; k++) { const a = k / cnt * TAU; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); }
  return p;
}
function scalePts(p, k) { return p.map(v => v * k); }

/* ---------- 果物ごとの形 ---------- */
const SHAPES = {
  circle: (R, sp) => evenShape(denseEllipse(R, R), sp),
  kiwi: (R, sp) => evenShape(denseEllipse(R, R * 0.88), sp),
  /* いちごの断面：上が広く、下がすぼまる卵形 */
  egg: (R, sp) => {
    const p = [];
    for (let k = 0; k < 400; k++) {
      const t = k / 400 * TAU;
      const w = 1 + 0.17 * Math.cos(t);
      p.push(Math.sin(t) * R * 0.84 * w, -Math.cos(t) * R);
    }
    return evenShape(p, sp);
  },
  /* すいかの半月切り：下の弧が皮、上のまっすぐな所は最初から切り口 */
  halfMoon: (R, sp) => {
    const pts = [], kinds = [];
    const na = Math.max(8, Math.round(Math.PI * R / sp));
    for (let k = 0; k <= na; k++) {
      const a = k / na * Math.PI;
      pts.push(Math.cos(a) * R, Math.sin(a) * R);
      kinds.push(k < na ? 0 : 1);
    }
    const nt = Math.max(2, Math.round(2 * R / sp));
    for (let k = 1; k < nt; k++) { pts.push(-R + 2 * R * k / nt, 0); kinds.push(1); }
    return { pts, kinds };
  }
};

/* ---------- 模様 ---------- */
function citrusFeats(R, o) {
  const f = [], r = rng(o.seed);
  const N = o.segments, ro = o.outer * R, w = 0.03 * R;
  const radii = [0.13, 0.3, 0.5, 0.7];
  for (let s = 0; s < N; s++) {
    const a0 = s / N * TAU, a1 = (s + 1) / N * TAU;
    const pts = [];
    for (const q of radii) { const rr = q * R, da = Math.asin(Math.min(0.9, (w / 2) / rr)); pts.push(Math.cos(a0 + da) * rr, Math.sin(a0 + da) * rr); }
    const d0 = Math.asin((w / 2) / ro);
    for (let k = 0; k <= 6; k++) { const a = a0 + d0 + (a1 - a0 - 2 * d0) * k / 6; pts.push(Math.cos(a) * ro, Math.sin(a) * ro); }
    for (const q of radii.slice().reverse()) { const rr = q * R, da = Math.asin(Math.min(0.9, (w / 2) / rr)); pts.push(Math.cos(a1 - da) * rr, Math.sin(a1 - da) * rr); }
    f.push({ kind: 'poly', pts, fill: 'seg', smooth: true });
  }
  /* 果肉のつぶつぶ（すじ） */
  for (let s = 0; s < N; s++) {
    const a0 = s / N * TAU, a1 = (s + 1) / N * TAU;
    for (let k = 0; k < 5; k++) {
      const a = a0 + (0.22 + 0.56 * r()) * (a1 - a0);
      const r0 = (0.28 + r() * 0.42) * R, len = (0.07 + r() * 0.09) * R;
      f.push({ kind: 'line', pts: [Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len)], color: 'rgba(255,255,255,0.34)', width: 0.022 * R });
    }
  }
  if (o.seeds) {
    for (const s of o.seeds) {
      const a = (s + 0.5) / N * TAU, r0 = 0.24 * R;
      f.push({ kind: 'seed', pts: [Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * (r0 + 0.14 * R), Math.sin(a) * (r0 + 0.14 * R)], color: o.seedColor, width: 0.065 * R });
    }
  }
  f.push({ kind: 'poly', pts: ellipsePts(0.075 * R, 0.075 * R, 12), fill: 'center', smooth: true });
  return f;
}

function kiwiFeats(R) {
  const f = [], r = rng(7), ry = 0.88;
  for (let k = 0; k < 60; k++) {
    const a = k / 60 * TAU + (r() - 0.5) * 0.05;
    const r0 = 0.27, r1 = 0.74 + r() * 0.1;
    f.push({ kind: 'line', pts: [Math.cos(a) * r0 * R, Math.sin(a) * r0 * R * ry, Math.cos(a) * r1 * R, Math.sin(a) * r1 * R * ry], color: 'rgba(238,252,196,0.36)', width: 0.012 * R });
  }
  f.push({ kind: 'poly', pts: ellipsePts(0.25 * R, 0.2 * R, 22), fill: 'core', smooth: true });
  for (const ring of [{ q: 0.36, n: 30, off: 0 }, { q: 0.455, n: 26, off: 0.1 }]) {
    for (let k = 0; k < ring.n; k++) {
      const a = k / ring.n * TAU + ring.off + (r() - 0.5) * 0.08;
      const q = ring.q + (r() - 0.5) * 0.05;
      const bx = Math.cos(a) * q * R, by = Math.sin(a) * q * R * ry;
      f.push({ kind: 'seed', pts: [bx, by, bx + Math.cos(a) * 0.1 * R, by + Math.sin(a) * 0.1 * R * ry], color: '#231A11', width: 0.045 * R });
    }
  }
  return f;
}

function strawberryFeats(R) {
  const f = [], r = rng(11);
  f.push({ kind: 'poly', pts: ellipsePts(0.15 * R, 0.5 * R, 24, 0, -0.06 * R), fill: 'core', smooth: true });
  for (let k = 0; k < 12; k++) {
    const t = (k + 0.5) / 12 * TAU;
    const sx = Math.sin(t) * 0.14 * R, sy = -0.06 * R - Math.cos(t) * 0.46 * R;
    const w = 1 + 0.17 * Math.cos(t);
    const ex = Math.sin(t) * 0.84 * R * w * 0.8, ey = -Math.cos(t) * R * 0.8;
    const mx = (sx + ex) / 2 + (r() - 0.5) * 0.08 * R, my = (sy + ey) / 2 + 0.06 * R;
    f.push({ kind: 'line', pts: [sx, sy, mx, my, ex, ey], color: 'rgba(255,236,238,0.5)', width: 0.024 * R });
  }
  for (let k = 0; k < 20; k++) {
    const t = (k + 0.5) / 20 * TAU;
    const w = 1 + 0.17 * Math.cos(t);
    const px = Math.sin(t) * 0.84 * R * w, py = -Math.cos(t) * R;
    f.push({ kind: 'seed', pts: [px * 0.84, py * 0.84, px * 0.92, py * 0.92], color: '#F4CB4A', width: 0.04 * R });
  }
  return f;
}

function watermelonFeats(R) {
  const f = [], r = rng(5);
  for (let k = 0; k < 44; k++) {
    const a = 0.08 * Math.PI + r() * 0.84 * Math.PI, q = 0.12 + r() * 0.7;
    f.push({ kind: 'dot', pts: [Math.cos(a) * q * R, Math.sin(a) * q * R], r: 0.016 * R, color: 'rgba(255,226,230,0.5)' });
  }
  for (const ring of [{ q: 0.5, n: 6 }, { q: 0.7, n: 8 }]) {
    for (let k = 0; k < ring.n; k++) {
      const a = (0.16 + 0.68 * (k + 0.5) / ring.n) * Math.PI + (r() - 0.5) * 0.06;
      const q = ring.q + (r() - 0.5) * 0.04;
      const bx = Math.cos(a) * q * R, by = Math.sin(a) * q * R;
      f.push({ kind: 'seed', pts: [bx, by, bx - Math.cos(a) * 0.1 * R, by - Math.sin(a) * 0.1 * R], color: '#20160F', width: 0.055 * R });
    }
  }
  return f;
}

function grapeFeats(R) {
  return [{ kind: 'poly', pts: ellipsePts(0.94 * R, 0.94 * R, 28), fill: 'bloom', smooth: true }];
}

/* ---------- 果物の定義（配色は仮置き） ---------- */
export const FRUITS = {
  orange: {
    name: 'オレンジ', scale: 1, shape: 'circle',
    feats: R => citrusFeats(R, { segments: 10, outer: 0.84, seed: 3 }),
    pal: {
      fills: {
        base: { stops: [[0, '#FFF6E4'], [1, '#FFE9C4']], r: 1 },
        seg: { stops: [[0, '#FFD28E'], [0.55, '#FFAA3C'], [1, '#FF8A14']], r: 0.9 },
        center: '#FFF7EA'
      },
      rind: [{ w: 0.12, color: '#FFF1D2' }, { w: 0.07, color: '#F7911E' }],
      deep: '214,96,8', juice: '#FF9F1C', glow: '255,150,40'
    }
  },
  kiwi: {
    name: 'キウイ', scale: 0.94, shape: 'kiwi',
    feats: R => kiwiFeats(R),
    pal: {
      fills: {
        base: { stops: [[0, '#E6F4A6'], [0.3, '#B6DD5E'], [0.72, '#8DC53F'], [1, '#76AF34']], r: 1 },
        core: { stops: [[0, '#FFFDEB'], [1, '#EEF3C3']], r: 0.26 }
      },
      rind: [{ w: 0.07, color: '#6FA531' }, { w: 0.04, color: '#7A5A36' }],
      deep: '70,120,20', juice: '#9ACD32', glow: '140,200,60'
    }
  },
  strawberry: {
    name: 'いちご', scale: 0.9, shape: 'egg',
    feats: R => strawberryFeats(R),
    pal: {
      fills: {
        base: { stops: [[0, '#FFE8EA'], [0.3, '#FFB0BA'], [0.68, '#F5505F'], [1, '#D9203D']], r: 1, y: -0.06 },
        core: { stops: [[0, '#FFF7F5'], [1, '#FFD5DA']], r: 0.5, y: -0.06 }
      },
      rind: [{ w: 0.055, color: '#C80F2E' }],
      deep: '170,10,40', juice: '#FF3355', glow: '255,70,100'
    }
  },
  watermelon: {
    name: 'すいか', scale: 1.08, shape: 'halfMoon',
    feats: R => watermelonFeats(R),
    pal: {
      fills: {
        base: { stops: [[0, '#FF8A94'], [0.55, '#FF5667'], [0.86, '#F43E51'], [1, '#EE3A4E']], r: 0.9 }
      },
      rind: [{ w: 0.2, color: '#F1FADD' }, { w: 0.13, color: '#A5D67E' }, { w: 0.075, color: '#2F7D3A' }],
      deep: '190,20,40', juice: '#FF4D5E', glow: '255,80,95'
    }
  },
  lemon: {
    name: 'レモン', scale: 0.86, shape: 'circle',
    feats: R => citrusFeats(R, { segments: 9, outer: 0.85, seed: 9, seeds: [1, 5], seedColor: '#F2E9BE' }),
    pal: {
      fills: {
        base: { stops: [[0, '#FFFCEB'], [1, '#FFF4C8']], r: 1 },
        seg: { stops: [[0, '#FFF6B0'], [0.6, '#FFE65C'], [1, '#FFD41F']], r: 0.9 },
        center: '#FFFCEE'
      },
      rind: [{ w: 0.11, color: '#FFF8DC' }, { w: 0.06, color: '#FFD200' }],
      deep: '200,160,0', juice: '#FFE45C', glow: '255,220,60'
    }
  },
  grape: {
    name: 'ぶどう', scale: 0.5, shape: 'circle', whole: true,
    feats: R => grapeFeats(R),
    pal: {
      fills: {
        base: { stops: [[0, '#C9A0E8'], [0.35, '#8E4CBE'], [0.8, '#5A2080'], [1, '#461566']], r: 1.3, x: -0.25, y: -0.3 },
        bloom: { stops: [[0, 'rgba(255,255,255,0)'], [0.7, 'rgba(232,222,255,0.08)'], [1, 'rgba(232,222,255,0.24)']], r: 0.94 }
      },
      rind: [{ w: 0.05, color: '#3E1259' }],
      flesh: '#E2F5B5',
      deep: '60,10,90', juice: '#9B59B6', glow: '150,80,190'
    }
  }
};

export const START_ORDER = ['orange', 'kiwi', 'watermelon', 'strawberry', 'lemon', 'grape', 'grape', 'orange', 'kiwi', 'lemon', 'strawberry', 'watermelon'];
export const TRAY_ORDER = ['orange', 'kiwi', 'strawberry', 'watermelon', 'lemon', 'grape'];

/** 点の間隔（大きさに合わせる） */
export function spacingFor(S) { return Math.max(7, S * 0.105); }

/** グミの砂糖つぶ（形の内側に散らす） */
function sugarDots(outline, R, seed) {
  const r = rng(seed), f = [];
  const m = outline.length >> 1, xs = new Float64Array(m), ys = new Float64Array(m);
  for (let i = 0; i < m; i++) { xs[i] = outline[2 * i]; ys[i] = outline[2 * i + 1]; }
  const step = Math.max(6, R * 0.15);
  for (let y = -R * 1.1; y <= R * 1.1; y += step) {
    for (let x = -R * 1.1; x <= R * 1.1; x += step) {
      const px = x + (r() - 0.5) * step, py = y + (r() - 0.5) * step;
      if (!pointInPoly(xs, ys, m, px, py)) continue;
      f.push({ kind: 'dot', pts: [px, py], r: (0.35 + r() * 0.6) * Math.max(1, R * 0.022), color: 'rgba(255,255,255,0.78)', sugar: true });
    }
  }
  return f;
}

/** 多角形の面積の中心 */
function areaCenter(p) {
  let a = 0, cx = 0, cy = 0;
  const m = p.length >> 1;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m, cr = p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1];
    a += cr; cx += (p[2 * i] + p[2 * j]) * cr; cy += (p[2 * i + 1] + p[2 * j + 1]) * cr;
  }
  return Math.abs(a) < 1e-9 ? [0, 0] : [cx / (3 * a), cy / (3 * a)];
}

/**
 * 果物を1つ作る
 * key 果物の種類 / S 基準の大きさ(px) / look 見た目の案 / x,y 置く場所 / angle 向き（ラジアン）
 */
export function spawnFruit(key, S, look, x, y, angle = 0) {
  const def = FRUITS[key];
  const R = S * def.scale, sp = spacingFor(S);
  const clear = look === 'clear';
  const k = clear ? 0.7 : 1;                /* 寒天の案は、果物をひと回り小さくして中に入れる */
  const shape = SHAPES[def.shape](R, sp);
  let feats = [], shiftX = 0, shiftY = 0;
  if (clear) {
    const inner = SHAPES[def.shape](R * k, sp);
    feats.push({ kind: 'poly', pts: inner.pts, fill: 'base', smooth: true });
    for (const band of (def.pal.rind || [])) {
      const w = band.w * R * k;
      const ins = SHAPES[def.shape](R * k - w / 2, sp);
      if (!ins.kinds) {
        feats.push({ kind: 'line', pts: ins.pts, closed: true, color: band.color, width: w });
      } else {
        const run = [];
        for (let i = 0; i < ins.kinds.length; i++) if (ins.kinds[i] === 0) run.push(ins.pts[2 * i], ins.pts[2 * i + 1]);
        const last = ins.kinds.findIndex(v => v === 1);
        if (last >= 0) run.push(ins.pts[2 * last], ins.pts[2 * last + 1]);
        feats.push({ kind: 'line', pts: run, closed: false, color: band.color, width: w });
      }
    }
    feats = feats.concat(def.feats(R * k));
    /* 中の果物は、ゼリーの形の真ん中（面積の中心）に寄せて置く */
    const [gx, gy] = areaCenter(shape.pts);
    shiftX = (1 - k) * gx; shiftY = (1 - k) * gy;
    feats = feats.map(f => ({ ...f, pts: f.pts.map((v, i) => v + (i % 2 ? shiftY : shiftX)) }));
  } else {
    feats = def.feats(R);
    if (look === 'gummy') feats = feats.concat(sugarDots(shape.pts, R, key.length * 31 + 7));
  }
  const kinds = clear || !shape.kinds ? null : shape.kinds;
  const c = Math.cos(angle), s = Math.sin(angle);
  const pts = [];
  for (let i = 0; i < shape.pts.length; i += 2) {
    const px = shape.pts[i], py = shape.pts[i + 1];
    pts.push(x + c * px - s * py, y + s * px + c * py);
  }
  /* 置く場所は「形の中心」を x,y に合わせる */
  let mx = 0, my = 0;
  const m = shape.pts.length >> 1;
  for (let i = 0; i < m; i++) { mx += pts[2 * i]; my += pts[2 * i + 1]; }
  mx /= m; my /= m;
  for (let i = 0; i < m; i++) { pts[2 * i] += x - mx; pts[2 * i + 1] += y - my; }
  const rest = shape.pts.slice();
  const b = new Body({
    fruit: { key, ...def }, look, spacing: sp, fruitR: R * k,
    pts, rest, edges: kinds, feats, origin: [shiftX, shiftY]
  });
  b.fruitKey = key;
  return b;
}
