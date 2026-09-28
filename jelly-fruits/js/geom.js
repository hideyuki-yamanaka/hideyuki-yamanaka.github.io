/* geom.js — 形の計算まわり
   面積・内外の判定・平均値座標（ゼリーの中の模様を、ふちの動きに合わせて動かすための重み）・
   線との交わり・線で切り分けた片側だけを残す処理 */

export const TAU = Math.PI * 2;

/** 多角形の面積（符号つき。この作りでは果物の点の並びが＋になる） */
export function polyArea(xs, ys, n) {
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) a += xs[j] * ys[i] - xs[i] * ys[j];
  return a / 2;
}

/** [x0,y0,x1,y1,...] の形の多角形の面積 */
export function polyAreaFlat(p) {
  let a = 0;
  const m = p.length >> 1;
  for (let i = 0, j = m - 1; i < m; j = i++) a += p[2 * j] * p[2 * i + 1] - p[2 * i] * p[2 * j + 1];
  return a / 2;
}

/** 点が多角形の内側か */
export function pointInPoly(xs, ys, n, px, py) {
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = ys[i], yj = ys[j];
    if ((yi > py) !== (yj > py)) {
      const xi = xs[i] + (py - yi) * (xs[j] - xs[i]) / (yj - yi);
      if (px < xi) inside = !inside;
    }
  }
  return inside;
}

/**
 * 平均値座標（Mean Value Coordinates）。
 * 点 (px,py) を、多角形の頂点の重み付き平均で表す重みを out[o..o+n-1] に書く。
 * ふちがどう形を変えても、中の点がなめらかについてくる。
 */
export function mvcWeights(qx, qy, n, px, py, out, o) {
  const sx = new Float64Array(n), sy = new Float64Array(n), r = new Float64Array(n), tn = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    sx[i] = qx[i] - px; sy[i] = qy[i] - py;
    r[i] = Math.hypot(sx[i], sy[i]);
    if (r[i] < 1e-9) { for (let k = 0; k < n; k++) out[o + k] = 0; out[o + i] = 1; return; }
  }
  for (let i = 0; i < n; i++) {
    const j = i + 1 === n ? 0 : i + 1;
    const A = sx[i] * sy[j] - sx[j] * sy[i];
    const D = sx[i] * sx[j] + sy[i] * sy[j];
    if (Math.abs(A) < 1e-9 * r[i] * r[j]) {
      if (D < 0) {                     /* 辺の上に乗っている → その辺の2点だけで表す */
        const t = r[i] / (r[i] + r[j]);
        for (let k = 0; k < n; k++) out[o + k] = 0;
        out[o + i] = 1 - t; out[o + j] = t;
        return;
      }
      tn[i] = 0;
    } else {
      tn[i] = (r[i] * r[j] - D) / A;   /* tan(角度/2) */
    }
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const w = (tn[i === 0 ? n - 1 : i - 1] + tn[i]) / r[i];
    out[o + i] = w; sum += w;
  }
  if (Math.abs(sum) < 1e-12) {        /* 念のため：いちばん近い頂点に寄せる */
    let bi = 0;
    for (let i = 1; i < n; i++) if (r[i] < r[bi]) bi = i;
    for (let k = 0; k < n; k++) out[o + k] = 0;
    out[o + bi] = 1;
    return;
  }
  for (let i = 0; i < n; i++) out[o + i] /= sum;
}

/**
 * 線分（infinite=true なら直線）と多角形の辺の交わり。線に沿った位置 s の順に並べて返す。
 * 返す値: { s, t, edge, x, y }（edge 番目の辺の t の位置）
 */
export function lineHits(xs, ys, n, ax, ay, bx, by, infinite) {
  const dx = bx - ax, dy = by - ay;
  const res = [];
  for (let i = 0; i < n; i++) {
    const j = i + 1 === n ? 0 : i + 1;
    const ex = xs[j] - xs[i], ey = ys[j] - ys[i];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const wx = xs[i] - ax, wy = ys[i] - ay;
    const s = (wx * ey - wy * ex) / den;
    const t = (wx * dy - wy * dx) / den;
    if (t < 0 || t >= 1) continue;
    if (!infinite && (s < 0 || s > 1)) continue;
    res.push({ s, t, edge: i, x: xs[i] + ex * t, y: ys[i] + ey * t });
  }
  res.sort((a, b) => a.s - b.s);
  return res;
}

/** 直線 a + d·s のどちら側か（＋／−） */
export function sideOf(ax, ay, dx, dy, px, py) {
  return dx * (py - ay) - dy * (px - ax);
}

/** 多角形を直線で切って、sgn の側だけ残す（Sutherland–Hodgman） */
export function clipPolyHalf(pts, ax, ay, dx, dy, sgn) {
  const out = [];
  const m = pts.length >> 1;
  for (let k = 0; k < m; k++) {
    const k2 = k + 1 === m ? 0 : k + 1;
    const x1 = pts[2 * k], y1 = pts[2 * k + 1], x2 = pts[2 * k2], y2 = pts[2 * k2 + 1];
    const s1 = sgn * sideOf(ax, ay, dx, dy, x1, y1);
    const s2 = sgn * sideOf(ax, ay, dx, dy, x2, y2);
    if (s1 >= 0) out.push(x1, y1);
    if ((s1 >= 0) !== (s2 >= 0)) {
      const t = s1 / (s1 - s2);
      out.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
    }
  }
  return out;
}

/** 折れ線を直線で切って、sgn の側だけ残す。返す値: [{ pts, closed }] */
export function clipLineHalf(pts, closed, ax, ay, dx, dy, sgn) {
  const m = pts.length >> 1;
  let allIn = true, allOut = true;
  for (let k = 0; k < m; k++) {
    const s = sgn * sideOf(ax, ay, dx, dy, pts[2 * k], pts[2 * k + 1]);
    if (s >= 0) allOut = false; else allIn = false;
  }
  if (allIn) return [{ pts: Array.from(pts), closed }];
  if (allOut) return [];
  const segs = closed ? m : m - 1;
  const res = [];
  let cur = null;
  for (let k = 0; k < segs; k++) {
    const k2 = k + 1 === m ? 0 : k + 1;
    const x1 = pts[2 * k], y1 = pts[2 * k + 1], x2 = pts[2 * k2], y2 = pts[2 * k2 + 1];
    const s1 = sgn * sideOf(ax, ay, dx, dy, x1, y1);
    const s2 = sgn * sideOf(ax, ay, dx, dy, x2, y2);
    const in1 = s1 >= 0, in2 = s2 >= 0;
    if (in1 && in2) {
      if (!cur) cur = [x1, y1];
      cur.push(x2, y2);
    } else if (in1) {
      const t = s1 / (s1 - s2);
      if (!cur) cur = [x1, y1];
      cur.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
      res.push(cur); cur = null;
    } else if (in2) {
      const t = s1 / (s1 - s2);
      cur = [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, x2, y2];
    }
  }
  if (cur) res.push(cur);
  /* 輪の線は、最初と最後のかけらが始点でつながっていれば1本にする */
  if (closed && res.length > 1) {
    const first = res[0], last = res[res.length - 1];
    if (first[0] === pts[0] && first[1] === pts[1] &&
        last[last.length - 2] === pts[0] && last[last.length - 1] === pts[1]) {
      res[0] = last.concat(first.slice(2));
      res.pop();
    }
  }
  return res.filter(l => l.length >= 4).map(l => ({ pts: l, closed: false }));
}

/** 決まった乱数（毎回同じ模様にするため） */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
