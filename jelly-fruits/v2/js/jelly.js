/* jelly.js — 3Dのぷるぷる物理
   ・形の記憶（シェイプマッチング）：いまの形にいちばん合う「元の形の置き方」へ、表面の点を引き戻す
   ・重力とテーブル：落ちて着地すると、ぷるんとつぶれて戻る
   ・ほかのゼリーとは、中を埋めた小さな玉で押し合う
   ・切る：平面で表面を2つに分け、元の形・中の果物・当たり判定の玉も同じ平面で分ける
   長さの単位は「ワールドの長さ」（ゼリーの半径がおよそ 1.3）、時間は秒。1回の計算は 1/240 秒。 */
import { inv3, det3, mul3, extractRotation } from './m3.js';
import { splitMesh, meshVolume } from './cut.js';

export const STEP = 1 / 240;
const VMAX = 28;          /* 点の速さの上限（仮置き） */
const MAX_BODIES = 24;

export class JellyBody {
  /**
   * o.P 位置（ワールド）/ o.Q 元の形（どこ中心でもよい）/ o.V 速さ / o.vp 描画の頂点→点 / o.index 三角形
   * o.fruit 中の果物 { P, vp, uv, index, tex }（Q と同じ座標）/ o.spheres { c, r }（Q と同じ座標）
   */
  constructor(o) {
    const n = o.P.length / 3;
    this.n = n; this.kind = o.kind; this.R = o.R;
    this.x = Float32Array.from(o.P);
    this.v = o.V ? Float32Array.from(o.V) : new Float32Array(3 * n);
    this.p = new Float32Array(3 * n); this.g = new Float32Array(3 * n);
    let mx = 0, my = 0, mz = 0;
    for (let i = 0; i < n; i++) { mx += o.Q[3 * i]; my += o.Q[3 * i + 1]; mz += o.Q[3 * i + 2]; }
    mx /= n; my /= n; mz /= n;
    this.q = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { this.q[3 * i] = o.Q[3 * i] - mx; this.q[3 * i + 1] = o.Q[3 * i + 1] - my; this.q[3 * i + 2] = o.Q[3 * i + 2] - mz; }
    this.vp = o.vp; this.index = o.index;
    const Aqq = new Float64Array(9);
    for (let i = 0; i < n; i++) {
      const x = this.q[3 * i], y = this.q[3 * i + 1], z = this.q[3 * i + 2];
      Aqq[0] += x * x; Aqq[1] += x * y; Aqq[2] += x * z; Aqq[4] += y * y; Aqq[5] += y * z; Aqq[8] += z * z;
    }
    Aqq[3] = Aqq[1]; Aqq[6] = Aqq[2]; Aqq[7] = Aqq[5];
    this.iaqq = new Float64Array(9);
    inv3(Aqq, this.iaqq);
    this.volume = Math.abs(meshVolume(this.q, this.vp, this.index));
    this.size = Math.cbrt(this.volume * 3 / (4 * Math.PI));
    if (o.fruit) {
      const F = Float32Array.from(o.fruit.P);
      for (let i = 0; i < F.length; i += 3) { F[i] -= mx; F[i + 1] -= my; F[i + 2] -= mz; }
      this.fruit = { P: F, vp: o.fruit.vp, uv: o.fruit.uv, index: o.fruit.index, tex: o.fruit.tex };
    } else this.fruit = null;
    const sc = Float32Array.from(o.spheres.c);
    for (let i = 0; i < sc.length; i += 3) { sc[i] -= mx; sc[i + 1] -= my; sc[i + 2] -= mz; }
    this.sc = sc; this.sr = Float32Array.from(o.spheres.r); this.wsc = new Float32Array(sc.length);
    this.quat = o.quat ? o.quat.slice() : [0, 0, 0, 1];
    this.T = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    this.Rm = new Float64Array(9); this.Apq = new Float64Array(9); this.L = new Float64Array(9);
    this.c = [0, 0, 0]; this.minY = 0; this.rmax = this.size;
    this.press = null; this.grabbed = false; this.stuck = 0; this.ghost = 0;
    this.air = false;
    this.frame(0);
  }

  /** いまの形にいちばん合う「元の形の置き方」（中心・回転・伸び） */
  frame(beta) {
    const n = this.n, x = this.x, q = this.q, A = this.Apq;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += x[3 * i]; cy += x[3 * i + 1]; cz += x[3 * i + 2]; }
    cx /= n; cy /= n; cz /= n;
    A.fill(0);
    let minY = Infinity, r2 = 0;
    for (let i = 0; i < n; i++) {
      const px = x[3 * i] - cx, py = x[3 * i + 1] - cy, pz = x[3 * i + 2] - cz;
      const qx = q[3 * i], qy = q[3 * i + 1], qz = q[3 * i + 2];
      A[0] += px * qx; A[1] += px * qy; A[2] += px * qz;
      A[3] += py * qx; A[4] += py * qy; A[5] += py * qz;
      A[6] += pz * qx; A[7] += pz * qy; A[8] += pz * qz;
      if (x[3 * i + 1] < minY) minY = x[3 * i + 1];
      const d = px * px + py * py + pz * pz;
      if (d > r2) r2 = d;
    }
    extractRotation(A, this.quat, 3, this.Rm);
    const T = this.T, Rm = this.Rm;
    if (beta > 0) {
      mul3(A, this.iaqq, this.L);
      const dt = det3(this.L);
      if (dt > 1e-9) {
        const k = 1 / Math.cbrt(dt);
        for (let j = 0; j < 9; j++) T[j] = beta * this.L[j] * k + (1 - beta) * Rm[j];
      } else T.set(Rm);
    } else T.set(Rm);
    this.c[0] = cx; this.c[1] = cy; this.c[2] = cz;
    this.minY = minY; this.rmax = Math.sqrt(r2);
  }

  /** 速さの手当て：まるごとの動きと、形の揺れを分けて減らす＋重力 */
  forces(P) {
    const n = this.n, x = this.x, v = this.v;
    let cx = 0, cy = 0, cz = 0, vx = 0, vy = 0, vz = 0;
    for (let i = 0; i < n; i++) {
      cx += x[3 * i]; cy += x[3 * i + 1]; cz += x[3 * i + 2];
      vx += v[3 * i]; vy += v[3 * i + 1]; vz += v[3 * i + 2];
    }
    cx /= n; cy /= n; cz /= n; vx /= n; vy /= n; vz /= n;
    let Lx = 0, Ly = 0, Lz = 0, I00 = 0, I11 = 0, I22 = 0, I01 = 0, I02 = 0, I12 = 0;
    for (let i = 0; i < n; i++) {
      const rx = x[3 * i] - cx, ry = x[3 * i + 1] - cy, rz = x[3 * i + 2] - cz;
      const ux = v[3 * i] - vx, uy = v[3 * i + 1] - vy, uz = v[3 * i + 2] - vz;
      Lx += ry * uz - rz * uy; Ly += rz * ux - rx * uz; Lz += rx * uy - ry * ux;
      I00 += ry * ry + rz * rz; I11 += rx * rx + rz * rz; I22 += rx * rx + ry * ry;
      I01 -= rx * ry; I02 -= rx * rz; I12 -= ry * rz;
    }
    const I = [I00, I01, I02, I01, I11, I12, I02, I12, I22], Ii = new Float64Array(9);
    let wx = 0, wy = 0, wz = 0;
    if (inv3(I, Ii)) {
      wx = Ii[0] * Lx + Ii[1] * Ly + Ii[2] * Lz;
      wy = Ii[3] * Lx + Ii[4] * Ly + Ii[5] * Lz;
      wz = Ii[6] * Lx + Ii[7] * Ly + Ii[8] * Lz;
    }
    const kd = Math.exp(-P.wobbleDamp * STEP), ka = Math.exp(-0.25 * STEP), kr = Math.exp(-0.8 * STEP);
    const nvx = vx * ka, nvy = vy * ka - P.gravity * STEP, nvz = vz * ka;
    const nwx = wx * kr, nwy = wy * kr, nwz = wz * kr;
    for (let i = 0; i < n; i++) {
      const rx = x[3 * i] - cx, ry = x[3 * i + 1] - cy, rz = x[3 * i + 2] - cz;
      const dx = (v[3 * i] - (vx + wy * rz - wz * ry)) * kd;
      const dy = (v[3 * i + 1] - (vy + wz * rx - wx * rz)) * kd;
      const dz = (v[3 * i + 2] - (vz + wx * ry - wy * rx)) * kd;
      v[3 * i] = nvx + nwy * rz - nwz * ry + dx;
      v[3 * i + 1] = nvy + nwz * rx - nwx * rz + dy;
      v[3 * i + 2] = nvz + nwx * ry - nwy * rx + dz;
    }
  }

  updatePress() {
    const pr = this.press;
    if (!pr) return;
    const tau = pr.hold ? 0.12 : 0.035, target = pr.hold ? pr.max : 0;
    pr.depth += (target - pr.depth) * (1 - Math.exp(-STEP / tau));
    if (!pr.hold && pr.depth < 1e-4) this.press = null;
  }

  predict() {
    const x = this.x, v = this.v, p = this.p;
    for (let i = 0; i < x.length; i++) { p[i] = x[i]; x[i] += v[i] * STEP; }
  }

  /** 形の記憶へ引き戻す（ここがぷるぷるの正体） */
  match(P) {
    this.frame(P.stretch);
    const n = this.n, x = this.x, q = this.q, g = this.g, T = this.T, c = this.c;
    for (let i = 0; i < n; i++) {
      const qx = q[3 * i], qy = q[3 * i + 1], qz = q[3 * i + 2];
      g[3 * i] = T[0] * qx + T[1] * qy + T[2] * qz + c[0];
      g[3 * i + 1] = T[3] * qx + T[4] * qy + T[5] * qz + c[1];
      g[3 * i + 2] = T[6] * qx + T[7] * qy + T[8] * qz + c[2];
    }
    const pr = this.press;
    if (pr && pr.depth > 1e-4) {
      /* 押した所は指の向きにへこみ、全体は低く・横に広がる */
      const amp = pr.depth * this.size, sig2 = (this.size * 0.55) ** 2, sp = pr.depth * 0.5, y0 = this.minY;
      for (let i = 0; i < n; i++) {
        let gx = g[3 * i], gy = g[3 * i + 1], gz = g[3 * i + 2];
        const dx = gx - pr.x, dy = gy - pr.y, dz = gz - pr.z;
        const w = Math.exp(-(dx * dx + dy * dy + dz * dz) / sig2);
        gx += pr.dx * amp * w; gy += pr.dy * amp * w; gz += pr.dz * amp * w;
        gx += (gx - c[0]) * sp; gz += (gz - c[2]) * sp;
        gy = y0 + (gy - y0) * (1 - sp * 0.8);
        g[3 * i] = gx; g[3 * i + 1] = gy; g[3 * i + 2] = gz;
      }
    }
    const al = Math.min(1, P.k * STEP * STEP);
    for (let i = 0; i < 3 * n; i++) x[i] += (g[i] - x[i]) * al;
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

  /** 当たり判定の玉を、いまの置き方でワールドへ */
  spheresToWorld() {
    const T = this.T, c = this.c, s = this.sc, w = this.wsc;
    for (let i = 0; i < s.length; i += 3) {
      const x = s[i], y = s[i + 1], z = s[i + 2];
      w[i] = T[0] * x + T[1] * y + T[2] * z + c[0];
      w[i + 1] = T[3] * x + T[4] * y + T[5] * z + c[1];
      w[i + 2] = T[6] * x + T[7] * y + T[8] * z + c[2];
    }
  }

  addVel(vx, vy, vz) {
    const v = this.v;
    for (let i = 0; i < v.length; i += 3) { v[i] += vx; v[i + 1] += vy; v[i + 2] += vz; }
  }

  /** 中心から外へ（a>0）はじく。単位は 1/秒 */
  kickRadial(a, yScale = 1) {
    this.frame(0);
    const x = this.x, v = this.v, c = this.c;
    for (let i = 0; i < x.length; i += 3) {
      v[i] += (x[i] - c[0]) * a; v[i + 1] += (x[i + 1] - c[1]) * a * yScale; v[i + 2] += (x[i + 2] - c[2]) * a;
    }
  }

  /** ぷにっ：押した所を指の向きにはじく */
  poke(px, py, pz, dx, dy, dz, strength) {
    const x = this.x, v = this.v, sig2 = (this.size * 0.6) ** 2, amp = 3.2 * strength * Math.sqrt(this.size);
    for (let i = 0; i < x.length; i += 3) {
      const ex = x[i] - px, ey = x[i + 1] - py, ez = x[i + 2] - pz;
      const w = Math.exp(-(ex * ex + ey * ey + ez * ez) / sig2);
      v[i] += dx * amp * w; v[i + 1] += dy * amp * w; v[i + 2] += dz * amp * w;
    }
  }

  /** 画面の座標 → 元の形の座標 */
  toLocal(px, py, pz) {
    const Ti = new Float64Array(9);
    inv3(this.T, Ti);
    const x = px - this.c[0], y = py - this.c[1], z = pz - this.c[2];
    return [Ti[0] * x + Ti[1] * y + Ti[2] * z, Ti[3] * x + Ti[4] * y + Ti[5] * z, Ti[6] * x + Ti[7] * y + Ti[8] * z];
  }
}

/* ---------------- つかむ ---------------- */
class Grab3 {
  constructor(b, hx, hy, hz, P) {
    this.b = b; b.grabbed = true;
    b.frame(P.stretch);
    const [lx, ly, lz] = b.toLocal(hx, hy, hz);
    const n = b.n, q = b.q, sa2 = (b.size * 0.32) ** 2, so2 = (b.size * 0.7) ** 2, g = 1 - P.pinch;
    const ids = [], ws = [];
    let sw = 0, so = 0;
    this.om = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const dx = q[3 * i] - lx, dy = q[3 * i + 1] - ly, dz = q[3 * i + 2] - lz, d2 = dx * dx + dy * dy + dz * dz;
      const w = Math.exp(-d2 / sa2);
      if (w > 1e-3) { ids.push(i); ws.push(w); sw += w; }
      const o = g + (1 - g) * Math.exp(-d2 / so2);
      this.om[i] = o; so += o;
    }
    if (!ids.length) { let bi = 0, bd = Infinity; for (let i = 0; i < n; i++) { const d = (q[3 * i] - lx) ** 2 + (q[3 * i + 1] - ly) ** 2 + (q[3 * i + 2] - lz) ** 2; if (d < bd) { bd = d; bi = i; } } ids.push(bi); ws.push(1); sw = 1; }
    this.ids = Uint32Array.from(ids);
    this.ws = Float32Array.from(ws.map(w => w / sw));
    const k = n / so;
    for (let i = 0; i < n; i++) this.om[i] *= k;
    this.t = [hx, hy, hz]; this.tv = [0, 0, 0];
  }
  anchor() {
    const b = this.b, x = b.x, ids = this.ids, ws = this.ws;
    let ax = 0, ay = 0, az = 0;
    for (let k = 0; k < ids.length; k++) { const i = 3 * ids[k], w = ws[k]; ax += w * x[i]; ay += w * x[i + 1]; az += w * x[i + 2]; }
    return [ax, ay, az];
  }
  apply(P) {
    const b = this.b, x = b.x, v = b.v, ids = this.ids, ws = this.ws;
    let ax = 0, ay = 0, az = 0, vx = 0, vy = 0, vz = 0;
    for (let k = 0; k < ids.length; k++) {
      const i = 3 * ids[k], w = ws[k];
      ax += w * x[i]; ay += w * x[i + 1]; az += w * x[i + 2];
      vx += w * v[i]; vy += w * v[i + 1]; vz += w * v[i + 2];
    }
    let fx = P.followK * (this.t[0] - ax) + P.followC * (this.tv[0] - vx);
    let fy = P.followK * (this.t[1] - ay) + P.followC * (this.tv[1] - vy) + P.gravity;
    let fz = P.followK * (this.t[2] - az) + P.followC * (this.tv[2] - vz);
    const m = Math.hypot(fx, fy, fz), lim = 900;
    if (m > lim) { fx *= lim / m; fy *= lim / m; fz *= lim / m; }
    const om = this.om;
    for (let i = 0; i < b.n; i++) { const o = om[i] * STEP; v[3 * i] += fx * o; v[3 * i + 1] += fy * o; v[3 * i + 2] += fz * o; }
  }
}

/* ---------------- 当たり判定 ---------------- */
/** a の表面の点が、b の中の玉に入っていたら押し出す */
function pushOut(a, b) {
  const cx = b.c[0], cy = b.c[1], cz = b.c[2], rr = (b.rmax + 0.05) ** 2;
  const S = b.wsc, R = b.sr, k = R.length, x = a.x;
  for (let i = 0; i < x.length; i += 3) {
    const ex = x[i] - cx, ey = x[i + 1] - cy, ez = x[i + 2] - cz;
    if (ex * ex + ey * ey + ez * ez > rr) continue;
    for (let s = 0; s < k; s++) {
      const dx = x[i] - S[3 * s], dy = x[i + 1] - S[3 * s + 1], dz = x[i + 2] - S[3 * s + 2];
      const d2 = dx * dx + dy * dy + dz * dz, r = R[s];
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2) || 1e-6, push = Math.min(r - d, 0.08) / d;
      x[i] += dx * push; x[i + 1] += dy * push; x[i + 2] += dz * push;
    }
  }
}

/* ---------------- 世界（テーブルの上） ---------------- */
export class World3D {
  constructor() {
    this.bodies = [];
    this.grabs = new Set();
    this.acc = 0;
    this.P = null;
    this.on = {};
    /* テーブルの見えている範囲（手前 zNear・奥 zFar、左右は奥ほど広い） */
    this.bounds = { zNear: 4, zFar: -4, xn0: -6, xn1: 6, xf0: -8, xf1: 8 };
  }
  emit(name, ...a) { if (this.on[name]) this.on[name](...a); }
  add(b) { this.bodies.push(b); return b; }
  clear() { this.bodies.length = 0; this.grabs.clear(); }

  step(dt, P) {
    this.P = P;
    this.acc += Math.min(dt, 0.05);
    let k = 0;
    while (this.acc >= STEP && k < 12) { this.sub(P); this.acc -= STEP; k++; }
    if (k >= 12) this.acc = 0;
    for (const b of this.bodies) {
      b.frame(P.stretch);
      /* 着地の知らせ */
      const up = b.minY > 0.02 * b.R;
      if (b.air && !up) {
        let vy = 0;
        for (let i = 1; i < b.v.length; i += 3) vy += b.v[i];
        this.emit('land', b, Math.abs(vy / b.n));
      }
      b.air = up;
      /* はさまれて、へこんだまま戻らない時は、少しの間だけ当たり判定を外す */
      if (b.ghost > 0) { b.ghost -= dt; continue; }
      let dev = 0;
      const x = b.x, g = b.g;
      for (let i = 0; i < x.length; i += 3) {
        const d = (x[i] - g[i]) ** 2 + (x[i + 1] - g[i + 1]) ** 2 + (x[i + 2] - g[i + 2]) ** 2;
        if (d > dev) dev = d;
      }
      dev = Math.sqrt(dev) / b.size;
      if (dev > 0.35 && !b.grabbed && !b.press) b.stuck += dt; else b.stuck = Math.max(0, b.stuck - dt * 2);
      if (b.stuck > 0.8) { b.stuck = 0; b.ghost = 0.5; }
    }
  }

  sub(P) {
    const B = this.bodies;
    for (const b of B) { b.forces(P); b.updatePress(); }
    for (const g of this.grabs) g.apply(P);
    for (const b of B) b.predict();
    for (const b of B) b.match(P);
    for (const b of B) b.spheresToWorld();
    for (let i = 0; i < B.length; i++) {
      const a = B[i];
      if (a.ghost > 0) continue;
      for (let j = i + 1; j < B.length; j++) {
        const b = B[j];
        if (b.ghost > 0) continue;
        const dx = a.c[0] - b.c[0], dy = a.c[1] - b.c[1], dz = a.c[2] - b.c[2], rr = a.rmax + b.rmax;
        if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
        pushOut(a, b); pushOut(b, a);
      }
    }
    const bd = this.bounds, fr = P.floorFric;
    for (const b of B) {
      const x = b.x, p = b.p;
      for (let i = 0; i < x.length; i += 3) {
        if (x[i + 1] < 0) {
          x[i + 1] = 0;
          x[i] = p[i] + (x[i] - p[i]) * (1 - fr);
          x[i + 2] = p[i + 2] + (x[i + 2] - p[i + 2]) * (1 - fr);
        }
        let z = x[i + 2];
        if (z > bd.zNear) z = x[i + 2] = bd.zNear; else if (z < bd.zFar) z = x[i + 2] = bd.zFar;
        const t = (z - bd.zNear) / (bd.zFar - bd.zNear || 1);
        const xl = bd.xn0 + (bd.xf0 - bd.xn0) * t, xr = bd.xn1 + (bd.xf1 - bd.xn1) * t;
        if (x[i] < xl) x[i] = xl; else if (x[i] > xr) x[i] = xr;
      }
      b.settle();
    }
  }

  pressStart(b, hit, dir, P) {
    b.press = { x: hit[0], y: hit[1], z: hit[2], dx: dir[0], dy: dir[1], dz: dir[2], depth: b.press ? b.press.depth : 0, max: 0.2 * P.press, hold: true };
  }
  /** 指を離した。quick＝すぐ離した（ぷにっ）／silent＝つかむ動きに変わった */
  pressEnd(b, quick, P, silent = false) {
    const pr = b.press;
    if (!pr) return 0;
    pr.hold = false;
    const depth = pr.depth / Math.max(1e-6, pr.max);
    if (!silent && quick) b.poke(pr.x, pr.y, pr.z, pr.dx, pr.dy, pr.dz, P.poke);
    return depth;
  }

  grabStart(b, hit, P) { const g = new Grab3(b, hit[0], hit[1], hit[2], P); this.grabs.add(g); return g; }
  grabEnd(g) { if (!g) return; g.b.grabbed = false; this.grabs.delete(g); }

  /** ワールドの平面 n·p = d で b を切る。切れたら true */
  cut(b, n, d, P) {
    if (this.bodies.length >= MAX_BODIES) return false;
    const idx = this.bodies.indexOf(b);
    if (idx < 0) return false;
    const [A, B] = splitMesh({ P: b.x, A: [b.q, b.v], vp: b.vp, uv: null, index: b.index }, n, d, null);
    if (!A || !B) return false;
    const whole = 4 / 3 * Math.PI * b.R ** 3;
    const vA = meshVolume(A.A[0], A.vp, A.index), vB = meshVolume(B.A[0], B.vp, B.index);
    if (vA < whole * 0.025 || vB < whole * 0.025) return false;
    /* 元の形の上での平面（中の果物と当たり判定の玉はこちらで分ける） */
    b.frame(P.stretch);
    const T = b.T;
    let rx = T[0] * n[0] + T[3] * n[1] + T[6] * n[2];
    let ry = T[1] * n[0] + T[4] * n[1] + T[7] * n[2];
    let rz = T[2] * n[0] + T[5] * n[1] + T[8] * n[2];
    let rd = d - (n[0] * b.c[0] + n[1] * b.c[1] + n[2] * b.c[2]);
    const rl = Math.hypot(rx, ry, rz) || 1;
    rx /= rl; ry /= rl; rz /= rl; rd /= rl;
    let fA = null, fB = null;
    if (b.fruit) {
      const f = b.fruit;
      const [pa, pb] = splitMesh({ P: f.P, A: [], vp: f.vp, uv: f.uv, index: f.index }, [rx, ry, rz], rd, f.tex.fleshUV);
      if (pa && pb) {
        fA = { P: pa.P, vp: pa.vp, uv: pa.uv, index: pa.index, tex: f.tex };
        fB = { P: pb.P, vp: pb.vp, uv: pb.uv, index: pb.index, tex: f.tex };
      } else {
        let sx = 0, sy = 0, sz = 0;
        const m = f.P.length / 3;
        for (let i = 0; i < f.P.length; i += 3) { sx += f.P[i]; sy += f.P[i + 1]; sz += f.P[i + 2]; }
        if (rx * sx / m + ry * sy / m + rz * sz / m - rd > 0) fA = f; else fB = f;
      }
    }
    const sphA = { c: [], r: [] }, sphB = { c: [], r: [] };
    for (let i = 0; i < b.sr.length; i++) {
      const cx = b.sc[3 * i], cy = b.sc[3 * i + 1], cz = b.sc[3 * i + 2];
      const s = rx * cx + ry * cy + rz * cz - rd;
      const r = Math.min(b.sr[i], Math.abs(s) * 0.98);
      if (r < 0.06 * b.R) continue;
      const to = s > 0 ? sphA : sphB;
      to.c.push(cx, cy, cz); to.r.push(r);
    }
    const make = (side, fruit, sph) => {
      if (!sph.r.length) {
        let mx = 0, my = 0, mz = 0;
        const Q = side.A[0], m = Q.length / 3;
        for (let i = 0; i < Q.length; i += 3) { mx += Q[i]; my += Q[i + 1]; mz += Q[i + 2]; }
        sph.c.push(mx / m, my / m, mz / m); sph.r.push(0.15 * b.R);
      }
      return new JellyBody({
        P: side.P, Q: side.A[0], V: side.A[1], vp: side.vp, index: side.index,
        fruit, spheres: { c: Float32Array.from(sph.c), r: Float32Array.from(sph.r) },
        kind: b.kind, R: b.R, quat: b.quat
      });
    };
    const kA = make(A, fA, sphA), kB = make(B, fB, sphB);
    for (const g of [...this.grabs]) if (g.b === b) this.grabEnd(g);
    this.bodies.splice(idx, 1, kA, kB);
    const sep = 0.9 * P.split;
    kA.addVel(n[0] * sep, n[1] * sep, n[2] * sep);
    kB.addVel(-n[0] * sep, -n[1] * sep, -n[2] * sep);
    kA.kickRadial(1.2 * P.split); kB.kickRadial(1.2 * P.split);
    this.emit('cut', { body: b, kids: [kA, kB], n, d });
    return true;
  }

  /** お皿をゆらす */
  shake() {
    for (const b of this.bodies) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 1.5;
      b.addVel(Math.cos(a) * sp, 3 + Math.random() * 2, Math.sin(a) * sp);
      b.kickRadial((Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 1.5), 0.5);
    }
  }
}
