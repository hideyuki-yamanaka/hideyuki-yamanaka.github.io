/* softslice.js — 折れ曲がる輪切りゼリーの物理
   ・部分ごとの形の記憶（クラスター・シェイプマッチング）：輪切りを、重なり合った小さな部分に分けて、
     部分ごとに「元の形の置き方」へ引き戻す。部分と部分の間で曲がれるので、端をつまむと
     そこだけ持ち上がって、ぐにゃっと折れる（全体で1つだと、全体が傾くだけ）
   ・ずれを近所でならす（細かいしわを作らない）・重力・テーブル（すべりにくい）
   長さはワールドの長さ、時間は秒。1回の計算は 1/240 秒。 */
import { inv3, det3, mul3, extractRotation } from './m3.js';

export const STEP = 1 / 240;
const VMAX = 30;

export class SoftSlice {
  /**
   * geo.P 元の形（半径1の単位）/ geo.vp 描画の頂点→点 / geo.index 三角形
   * R 大きさ（ワールドの半径）/ at 置く場所 [x, y, z]
   */
  constructor(geo, R, at, opts = {}) {
    const n = geo.P.length / 3;
    this.n = n; this.R = R;
    this.vp = geo.vp; this.index = geo.index;
    this.q = new Float32Array(3 * n);
    this.x = new Float32Array(3 * n);
    for (let i = 0; i < 3 * n; i++) this.q[i] = geo.P[i] * R;
    for (let i = 0; i < n; i++) {
      this.x[3 * i] = this.q[3 * i] + at[0];
      this.x[3 * i + 1] = this.q[3 * i + 1] + at[1];
      this.x[3 * i + 2] = this.q[3 * i + 2] + at[2];
    }
    this.v = new Float32Array(3 * n); this.p = new Float32Array(3 * n);
    this.g = new Float32Array(3 * n); this.cnt = new Float32Array(n);
    this.d = new Float32Array(3 * n);
    this.c = [0, 0, 0]; this.minY = 0;
    this.press = null;
    this.buildClusters(geo.P, opts.spacing || 0.3, opts.radius || 0.5);
    this.buildAdj();
    this.buildThick(geo.P);
  }

  /** 重なり合った部分（上から見て 0.3 おきに、半径 0.5 の円柱）。真ん中ほど重く、ふちへ行くほど軽い重みで入る
      （重みがなめらかなので、部分の境目に折り目やしわが出ない） */
  buildClusters(U, spacing = 0.3, radius = 0.5) {
    const n = this.n, list = [], r2 = radius * radius;
    for (let gx = -1.05; gx <= 1.051; gx += spacing) {
      for (let gz = -1.2; gz <= 1.21; gz += spacing) {
        const off = (Math.round((gx + 1.05) / spacing) % 2) * spacing / 2;
        const cx = gx, cz = gz + off;
        if (Math.hypot(cx, cz) > 1.08) continue;
        const ids = [], ws = [];
        for (let i = 0; i < n; i++) {
          const d2 = (U[3 * i] - cx) ** 2 + (U[3 * i + 2] - cz) ** 2;
          if (d2 < r2) { const s = 1 - d2 / r2; ids.push(i); ws.push(s * s); }
        }
        if (ids.length >= 12) list.push({ ids, ws });
      }
    }
    /* どの部分にもほとんど入らない点が無いように（念のため） */
    const tot = new Float32Array(n);
    for (const c of list) c.ids.forEach((i, k) => { tot[i] += c.ws[k]; });
    for (let i = 0; i < n; i++) {
      if (tot[i] > 0.05) continue;
      let best = 0, bd = Infinity;
      list.forEach((c, k) => { let mx = 0, mz = 0; c.ids.forEach(j => { mx += U[3 * j]; mz += U[3 * j + 2]; }); mx /= c.ids.length; mz /= c.ids.length; const d = Math.hypot(U[3 * i] - mx, U[3 * i + 2] - mz); if (d < bd) { bd = d; best = k; } });
      list[best].ids.push(i); list[best].ws.push(0.1);
    }
    const q = this.q;
    this.clusters = list.map(({ ids, ws }) => {
      const m = Uint32Array.from(ids), w = Float32Array.from(ws);
      let W = 0, bx = 0, by = 0, bz = 0;
      for (let k = 0; k < m.length; k++) { const i = m[k], a = w[k]; W += a; bx += a * q[3 * i]; by += a * q[3 * i + 1]; bz += a * q[3 * i + 2]; }
      bx /= W; by /= W; bz /= W;
      const Aqq = new Float64Array(9);
      for (let k = 0; k < m.length; k++) {
        const i = m[k], a = w[k];
        const x = q[3 * i] - bx, y = q[3 * i + 1] - by, z = q[3 * i + 2] - bz;
        Aqq[0] += a * x * x; Aqq[1] += a * x * y; Aqq[2] += a * x * z; Aqq[4] += a * y * y; Aqq[5] += a * y * z; Aqq[8] += a * z * z;
      }
      Aqq[3] = Aqq[1]; Aqq[6] = Aqq[2]; Aqq[7] = Aqq[5];
      const iA = new Float64Array(9);
      inv3(Aqq, iA);
      return { m, w, W, bar: [bx, by, bz], iA, quat: [0, 0, 0, 1], A: new Float64Array(9), L: new Float64Array(9), Rm: new Float64Array(9), T: new Float64Array(9) };
    });
  }

  /** 厚みを保つ組（上から見て同じ所にある、上の面と下の面の点どうし） */
  buildThick(U) {
    const map = new Map(), n = this.n, q = this.q;
    for (let i = 0; i < n; i++) {
      const key = Math.round(U[3 * i] * 2000) + ',' + Math.round(U[3 * i + 2] * 2000);
      let a = map.get(key);
      if (!a) map.set(key, a = []);
      a.push(i);
    }
    const pairs = [];
    for (const ids of map.values()) {
      if (ids.length < 2) continue;
      ids.sort((a, b) => U[3 * a + 1] - U[3 * b + 1]);
      for (let k = 0; k + 1 < ids.length; k++) pairs.push(ids[k], ids[k + 1]);
      if (ids.length > 2) pairs.push(ids[0], ids[ids.length - 1]);
    }
    this.tp = Uint32Array.from(pairs);
    this.tl = new Float32Array(pairs.length / 2);
    for (let k = 0; k < this.tl.length; k++) {
      const a = 3 * pairs[2 * k], b = 3 * pairs[2 * k + 1];
      this.tl[k] = Math.hypot(q[a] - q[b], q[a + 1] - q[b + 1], q[a + 2] - q[b + 2]);
    }
  }

  /** 厚みを保つ（重さでつぶれて、ぺらぺらにならないように） */
  keepThick(s) {
    const x = this.x, tp = this.tp, tl = this.tl;
    for (let k = 0; k < tl.length; k++) {
      const a = 3 * tp[2 * k], b = 3 * tp[2 * k + 1];
      const dx = x[a] - x[b], dy = x[a + 1] - x[b + 1], dz = x[a + 2] - x[b + 2];
      const d = Math.hypot(dx, dy, dz) || 1e-9, c = (d - tl[k]) / d * 0.5 * s;
      x[a] -= dx * c; x[a + 1] -= dy * c; x[a + 2] -= dz * c;
      x[b] += dx * c; x[b + 1] += dy * c; x[b + 2] += dz * c;
    }
  }

  buildAdj() {
    const n = this.n, vp = this.vp, idx = this.index, cnt = new Uint32Array(n), pairs = [], seen = new Set();
    const add = (a, b) => {
      if (a === b) return;
      const k = a < b ? a * 4194304 + b : b * 4194304 + a;
      if (seen.has(k)) return;
      seen.add(k); pairs.push(a, b); cnt[a]++; cnt[b]++;
    };
    for (let t = 0; t < idx.length; t += 3) {
      const a = vp[idx[t]], b = vp[idx[t + 1]], c = vp[idx[t + 2]];
      add(a, b); add(b, c); add(c, a);
    }
    const start = new Uint32Array(n + 1);
    for (let i = 0; i < n; i++) start[i + 1] = start[i] + cnt[i];
    const fill = start.slice(0, n), adj = new Uint32Array(start[n]);
    for (let k = 0; k < pairs.length; k += 2) { const a = pairs[k], b = pairs[k + 1]; adj[fill[a]++] = b; adj[fill[b]++] = a; }
    this.adjStart = start; this.adj = adj;
  }

  /** 速さの手当て：まるごとの動きと形の揺れを分けて減らす＋重力 */
  forces(P) {
    const n = this.n, x = this.x, v = this.v;
    let cx = 0, cy = 0, cz = 0, vx = 0, vy = 0, vz = 0;
    for (let i = 0; i < n; i++) {
      cx += x[3 * i]; cy += x[3 * i + 1]; cz += x[3 * i + 2];
      vx += v[3 * i]; vy += v[3 * i + 1]; vz += v[3 * i + 2];
    }
    cx /= n; cy /= n; cz /= n; vx /= n; vy /= n; vz /= n;
    const kd = Math.exp(-P.wobbleDamp * STEP), ka = Math.exp(-0.3 * STEP);
    for (let i = 0; i < n; i++) {
      const j = 3 * i;
      v[j] = vx * ka + (v[j] - vx) * kd;
      v[j + 1] = vy * ka + (v[j + 1] - vy) * kd - P.gravity * STEP;
      v[j + 2] = vz * ka + (v[j + 2] - vz) * kd;
    }
    this.c[0] = cx; this.c[1] = cy; this.c[2] = cz;
  }

  predict() {
    const x = this.x, v = this.v, p = this.p;
    for (let i = 0; i < x.length; i++) { p[i] = x[i]; x[i] += v[i] * STEP; }
  }

  /** 部分ごとに形の記憶へ引き戻す（行き先は、入っている部分の行き先の平均） */
  match(P) {
    const x = this.x, q = this.q, g = this.g, cnt = this.cnt, beta = P.stretch;
    g.fill(0); cnt.fill(0);
    for (const cl of this.clusters) {
      const m = cl.m, w = cl.w, A = cl.A, bar = cl.bar;
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < m.length; k++) { const j = 3 * m[k], a = w[k]; cx += a * x[j]; cy += a * x[j + 1]; cz += a * x[j + 2]; }
      cx /= cl.W; cy /= cl.W; cz /= cl.W;
      A.fill(0);
      for (let k = 0; k < m.length; k++) {
        const j = 3 * m[k], a = w[k];
        const px = (x[j] - cx) * a, py = (x[j + 1] - cy) * a, pz = (x[j + 2] - cz) * a;
        const qx = q[j] - bar[0], qy = q[j + 1] - bar[1], qz = q[j + 2] - bar[2];
        A[0] += px * qx; A[1] += px * qy; A[2] += px * qz;
        A[3] += py * qx; A[4] += py * qy; A[5] += py * qz;
        A[6] += pz * qx; A[7] += pz * qy; A[8] += pz * qz;
      }
      extractRotation(A, cl.quat, 2, cl.Rm);
      const T = cl.T;
      T.set(cl.Rm);
      if (beta > 0) {
        mul3(A, cl.iA, cl.L);
        const dt = det3(cl.L);
        if (dt > 1e-9) {
          const s = 1 / Math.cbrt(dt);
          for (let k = 0; k < 9; k++) T[k] = beta * cl.L[k] * s + (1 - beta) * cl.Rm[k];
        }
      }
      for (let k = 0; k < m.length; k++) {
        const i = m[k], j = 3 * i, a = w[k];
        const qx = q[j] - bar[0], qy = q[j + 1] - bar[1], qz = q[j + 2] - bar[2];
        g[j] += a * (T[0] * qx + T[1] * qy + T[2] * qz + cx);
        g[j + 1] += a * (T[3] * qx + T[4] * qy + T[5] * qz + cy);
        g[j + 2] += a * (T[6] * qx + T[7] * qy + T[8] * qz + cz);
        cnt[i] += a;
      }
    }
    const n = this.n;
    for (let i = 0; i < n; i++) {
      if (cnt[i] < 1e-6) { g[3 * i] = x[3 * i]; g[3 * i + 1] = x[3 * i + 1]; g[3 * i + 2] = x[3 * i + 2]; continue; }
      const w = 1 / cnt[i]; g[3 * i] *= w; g[3 * i + 1] *= w; g[3 * i + 2] *= w;
    }
    const pr = this.press;
    if (pr && pr.depth > 1e-4) {
      const R = this.R, amp = pr.depth * R, sig2 = (R * 0.35) ** 2;
      for (let i = 0; i < n; i++) {
        const j = 3 * i, dx = g[j] - pr.x, dy = g[j + 1] - pr.y, dz = g[j + 2] - pr.z;
        const w = Math.exp(-(dx * dx + dy * dy + dz * dz) / sig2);
        g[j] += pr.dx * amp * w; g[j + 1] += pr.dy * amp * w; g[j + 2] += pr.dz * amp * w;
      }
    }
    const al = Math.min(1, P.k * STEP * STEP);
    for (let i = 0; i < 3 * n; i++) x[i] += (g[i] - x[i]) * al;
  }

  /** 元の形からのずれを、となりどうしでならす */
  smooth(lambda) {
    const n = this.n, x = this.x, g = this.g, S = this.adjStart, A = this.adj, d = this.d;
    for (let i = 0; i < n; i++) {
      const s0 = S[i], s1 = S[i + 1];
      if (s1 === s0) { d[3 * i] = d[3 * i + 1] = d[3 * i + 2] = 0; continue; }
      let sx = 0, sy = 0, sz = 0;
      for (let k = s0; k < s1; k++) { const j = 3 * A[k]; sx += x[j] - g[j]; sy += x[j + 1] - g[j + 1]; sz += x[j + 2] - g[j + 2]; }
      const inv = 1 / (s1 - s0);
      d[3 * i] = sx * inv - (x[3 * i] - g[3 * i]);
      d[3 * i + 1] = sy * inv - (x[3 * i + 1] - g[3 * i + 1]);
      d[3 * i + 2] = sz * inv - (x[3 * i + 2] - g[3 * i + 2]);
    }
    for (let i = 0; i < 3 * n; i++) x[i] += d[i] * lambda;
  }

  /** テーブル（すべりにくい）と、動ける範囲 */
  constrain(P, bounds) {
    const x = this.x, p = this.p, fr = P.floorFric;
    let minY = Infinity;
    for (let i = 0; i < x.length; i += 3) {
      if (x[i + 1] < 0) {
        x[i + 1] = 0;
        x[i] = p[i] + (x[i] - p[i]) * (1 - fr);
        x[i + 2] = p[i + 2] + (x[i + 2] - p[i + 2]) * (1 - fr);
      }
      if (x[i] < bounds.x0) x[i] = bounds.x0; else if (x[i] > bounds.x1) x[i] = bounds.x1;
      if (x[i + 2] < bounds.z0) x[i + 2] = bounds.z0; else if (x[i + 2] > bounds.z1) x[i + 2] = bounds.z1;
      if (x[i + 1] < minY) minY = x[i + 1];
    }
    this.minY = minY;
  }

  settle() {
    const x = this.x, p = this.p, v = this.v, inv = 1 / STEP;
    for (let i = 0; i < x.length; i += 3) {
      let a = (x[i] - p[i]) * inv, b = (x[i + 1] - p[i + 1]) * inv, c = (x[i + 2] - p[i + 2]) * inv;
      const s2 = a * a + b * b + c * c;
      if (s2 > VMAX * VMAX) { const k = VMAX / Math.sqrt(s2); a *= k; b *= k; c *= k; }
      v[i] = a; v[i + 1] = b; v[i + 2] = c;
    }
  }

  updatePress() {
    const pr = this.press;
    if (!pr) return;
    const tau = pr.hold ? 0.12 : 0.035, target = pr.hold ? pr.max : 0;
    pr.depth += (target - pr.depth) * (1 - Math.exp(-STEP / tau));
    if (!pr.hold && pr.depth < 1e-4) this.press = null;
  }

  /** ぷにっ：押した所を、指の向きにはじく */
  poke(h, dir, strength) {
    const x = this.x, v = this.v, sig2 = (this.R * 0.35) ** 2, amp = 3 * strength;
    for (let i = 0; i < x.length; i += 3) {
      const ex = x[i] - h[0], ey = x[i + 1] - h[1], ez = x[i + 2] - h[2];
      const w = Math.exp(-(ex * ex + ey * ey + ez * ez) / sig2);
      v[i] += dir[0] * amp * w; v[i + 1] += dir[1] * amp * w; v[i + 2] += dir[2] * amp * w;
    }
  }

  /** ゆらす：まるごと少し跳ねて、ぷるぷる */
  nudge() {
    const v = this.v, x = this.x, c = this.c;
    const a = Math.random() * Math.PI * 2;
    for (let i = 0; i < v.length; i += 3) {
      v[i] += Math.cos(a) * 0.6 + (x[i] - c[0]) * 1.5;
      v[i + 1] += 3.2;
      v[i + 2] += Math.sin(a) * 0.6 + (x[i + 2] - c[2]) * 1.5;
    }
  }

  step(P, bounds, grab) {
    this.forces(P);
    this.updatePress();
    this.predict();
    this.match(P);
    this.smooth(0.3);
    this.keepThick(0.8);
    if (grab) grab.constrain(P);
    this.constrain(P, bounds);
    this.settle();
  }
}

/* ---------------- つかむ ---------------- */
/* 指でつまむように、つまんだ所（上から見て近い所・厚み全部）を、向きを保ったまま指の位置へ動かす。
   ほかの所は重さで垂れる → 手前はテーブルからの坂、先はだらんと垂れて、ぐにゃっと折れる。 */
export class SliceGrab {
  /** hitIdx＝つかんだ点に近い粒の番号 / target＝行き先 [x, y, z] */
  constructor(b, hitIdx, target, P) {
    this.b = b;
    const q = b.q, x = b.x, n = b.n, R = b.R;
    const hx = q[3 * hitIdx], hz = q[3 * hitIdx + 2];
    const pinch = Math.min(1, Math.max(0, P.pinch));
    const ra = R * (0.3 - 0.2 * pinch), ra2 = ra * ra;
    const ids = [], ws = [];
    for (let i = 0; i < n; i++) {
      const dx = q[3 * i] - hx, dz = q[3 * i + 2] - hz;
      const w = Math.exp(-(dx * dx + dz * dz) / ra2);
      if (w > 0.03) { ids.push(i); ws.push(w); }
    }
    this.ids = Uint32Array.from(ids);
    this.ws = Float32Array.from(ws);
    /* つまんだ所の、元の形での並びと、今の向き */
    let sw = 0, qx = 0, qy = 0, qz = 0, cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < ids.length; k++) {
      const i = 3 * ids[k], w = ws[k];
      sw += w; qx += w * q[i]; qy += w * q[i + 1]; qz += w * q[i + 2]; cx += w * x[i]; cy += w * x[i + 1]; cz += w * x[i + 2];
    }
    qx /= sw; qy /= sw; qz /= sw; cx /= sw; cy /= sw; cz /= sw;
    const A = new Float64Array(9);
    for (let k = 0; k < ids.length; k++) {
      const i = 3 * ids[k], w = ws[k];
      const px = (x[i] - cx) * w, py = (x[i + 1] - cy) * w, pz = (x[i + 2] - cz) * w;
      const ox = q[i] - qx, oy = q[i + 1] - qy, oz = q[i + 2] - qz;
      A[0] += px * ox; A[1] += px * oy; A[2] += px * oz;
      A[3] += py * ox; A[4] += py * oy; A[5] += py * oz;
      A[6] += pz * ox; A[7] += pz * oy; A[8] += pz * oz;
    }
    const Rg = new Float64Array(9);
    extractRotation(A, [0, 0, 0, 1], 12, Rg);
    this.off = new Float32Array(3 * ids.length);
    for (let k = 0; k < ids.length; k++) {
      const i = 3 * ids[k], ox = q[i] - qx, oy = q[i + 1] - qy, oz = q[i + 2] - qz;
      this.off[3 * k] = Rg[0] * ox + Rg[1] * oy + Rg[2] * oz;
      this.off[3 * k + 1] = Rg[3] * ox + Rg[4] * oy + Rg[5] * oz;
      this.off[3 * k + 2] = Rg[6] * ox + Rg[7] * oy + Rg[8] * oz;
    }
    this.cur = [cx, cy, cz];
    this.t = target.slice(); this.tv = [0, 0, 0];
  }
  constrain(P) {
    /* 行き先へは、決まった速さまでで近づく（いきなり飛ばない） */
    const c = this.cur, lim = (P.grabSpeed || 14) * STEP;
    let dx = this.t[0] - c[0], dy = this.t[1] - c[1], dz = this.t[2] - c[2];
    const d = Math.hypot(dx, dy, dz);
    if (d > lim) { dx *= lim / d; dy *= lim / d; dz *= lim / d; }
    c[0] += dx; c[1] += dy; c[2] += dz;
    const x = this.b.x, ids = this.ids, ws = this.ws, off = this.off, k = P.grabStiff || 0.6;
    const hold = Math.min(1, Math.max(0, P.hold || 0));
    /* つまんだ所の今の真ん中（重みつき） */
    let ax = 0, ay = 0, az = 0, sw = 0;
    for (let j = 0; j < ids.length; j++) { const i = 3 * ids[j], w = ws[j]; ax += w * x[i]; ay += w * x[i + 1]; az += w * x[i + 2]; sw += w; }
    ax /= sw; ay /= sw; az /= sw;
    for (let j = 0; j < ids.length; j++) {
      const i = 3 * ids[j], w = ws[j] * k;
      /* hold 0：まるごと平行に動かす（自由に回れる）／1：元の向きの並びへ */
      const gx = c[0] + (x[i] - ax) * (1 - hold) + off[3 * j] * hold;
      const gy = c[1] + (x[i + 1] - ay) * (1 - hold) + off[3 * j + 1] * hold;
      const gz = c[2] + (x[i + 2] - az) * (1 - hold) + off[3 * j + 2] * hold;
      x[i] += (gx - x[i]) * w; x[i + 1] += (gy - x[i + 1]) * w; x[i + 2] += (gz - x[i + 2]) * w;
    }
  }
}
