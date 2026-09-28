/* softbody.js — ぷるぷるの物理
   ・形の記憶（シェイプマッチング）：押されても引っぱられても、元の形へ戻ろうとする＝ぷるぷる
   ・点どうしの当たり判定：ゼリー同士がむにっと押し合う
   ・切る：まっすぐな線で、形の記憶も模様も2つに分ける
   長さの単位は画面の px、時間は秒。1回の計算は 1/240 秒ずつ進める。 */
import { TAU, polyArea, polyAreaFlat, pointInPoly, mvcWeights, lineHits, sideOf, clipPolyHalf, clipLineHalf } from './geom.js';

let uid = 1;
export const STEP = 1 / 240;
const MAX_BODIES = 96;
const MIN_AREA = 360;       /* これより小さいかけらになる切り方はしない（px²・仮置き） */
const MIN_THICK = 8;        /* かけらの平均の厚み（面積×2÷まわりの長さ）の下限（px・仮置き） */
const VMAX = 1500;          /* 点の速さの上限（px/秒）。速すぎると薄いかけらを突き抜けるため（仮置き） */

export class Body {
  /**
   * o.pts    いまの位置 [x,y,...]
   * o.rest   形の記憶 [x,y,...]（どこを中心にしてもよい。中で中心合わせする）
   * o.vel    速さ [vx,vy,...]（無ければ0）
   * o.edges  辺ごとの種類 0＝皮 1＝切り口
   * o.feats  模様（rest と同じ座標）
   * o.origin 果物の中心（rest と同じ座標）
   */
  constructor(o) {
    const n = o.pts.length >> 1;
    this.id = uid++;
    this.fruit = o.fruit; this.look = o.look;
    this.n = n; this.spacing = o.spacing; this.fruitR = o.fruitR;
    this.x = new Float64Array(n); this.y = new Float64Array(n);
    this.vx = new Float64Array(n); this.vy = new Float64Array(n);
    this.px = new Float64Array(n); this.py = new Float64Array(n);
    this.qx = new Float64Array(n); this.qy = new Float64Array(n);
    this.gx = new Float64Array(n); this.gy = new Float64Array(n);
    this.edge = new Uint8Array(n);
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += o.rest[2 * i]; my += o.rest[2 * i + 1]; }
    mx /= n; my /= n;
    for (let i = 0; i < n; i++) {
      this.x[i] = o.pts[2 * i]; this.y[i] = o.pts[2 * i + 1];
      this.qx[i] = o.rest[2 * i] - mx; this.qy[i] = o.rest[2 * i + 1] - my;
      if (o.vel) { this.vx[i] = o.vel[2 * i]; this.vy[i] = o.vel[2 * i + 1]; }
      this.edge[i] = o.edges ? o.edges[i] : 0;
    }
    this.ox = (o.origin ? o.origin[0] : 0) - mx;
    this.oy = (o.origin ? o.origin[1] : 0) - my;
    this.feats = (o.feats || []).map(f => {
      const pts = new Float64Array(f.pts.length);
      for (let k = 0; k < f.pts.length; k += 2) { pts[k] = f.pts[k] - mx; pts[k + 1] = f.pts[k + 1] - my; }
      return { ...f, pts };
    });
    let a = 0, b = 0, d = 0;
    for (let i = 0; i < n; i++) { a += this.qx[i] * this.qx[i]; b += this.qx[i] * this.qy[i]; d += this.qy[i] * this.qy[i]; }
    const det = a * d - b * b || 1;
    this.iaqq = [d / det, -b / det, -b / det, a / det];
    this.restArea = Math.abs(polyArea(this.qx, this.qy, n));
    this.size = Math.sqrt(this.restArea / Math.PI);   /* 同じ面積の円の半径 */
    this.T = new Float64Array([1, 0, 0, 1]);
    this.cx = 0; this.cy = 0; this.ang = 0; this.rmax = this.size;
    this.z = o.z || 0; this.vz = o.vz || 0; this.zHold = null;
    this.press = null; this.ripples = [];
    this.grabbed = false;
    this.stuck = 0; this.ghost = 0;
    this.path = null;
    this._runs();
    this._map();
    this.frame(0);
    this.bbox();
  }

  /** 皮・切り口が続いている所をまとめる（描画で塗り分ける） */
  _runs() {
    const n = this.n, e = this.edge;
    this.runs = [];
    let s = -1;
    for (let i = 0; i < n; i++) if (e[i] !== e[(i - 1 + n) % n]) { s = i; break; }
    if (s < 0) { this.runs.push({ kind: e[0], start: 0, len: n, full: true }); return; }
    let i = s, count = 0;
    while (count < n) {
      const kind = e[i];
      let len = 0;
      while (count < n && e[(i + len) % n] === kind) { len++; count++; }
      this.runs.push({ kind, start: i, len, full: false });
      i = (i + len) % n;
    }
  }

  /** 模様の点ごとに、ふちの点への重みを作る（形が変わってもついてくる） */
  _map() {
    let m = 0;
    for (const f of this.feats) { f.i0 = m; m += f.pts.length >> 1; }
    this.fm = m;
    this.fw = new Float32Array(m * this.n);
    this.fx = new Float32Array(m); this.fy = new Float32Array(m);
    const tmp = new Float64Array(this.n);
    for (const f of this.feats) {
      for (let k = 0; k < f.pts.length; k += 2) {
        mvcWeights(this.qx, this.qy, this.n, f.pts[k], f.pts[k + 1], tmp, 0);
        this.fw.set(tmp, (f.i0 + (k >> 1)) * this.n);
      }
    }
  }

  bbox() {
    const n = this.n, x = this.x, y = this.y;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      if (x[i] < x0) x0 = x[i]; if (x[i] > x1) x1 = x[i];
      if (y[i] < y0) y0 = y[i]; if (y[i] > y1) y1 = y[i];
    }
    this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1;
  }

  /** いまの形にいちばん合う「元の形の置き方」（中心・回転・伸び）を求める */
  frame(beta) {
    const n = this.n, x = this.x, y = this.y, qx = this.qx, qy = this.qy;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += x[i]; cy += y[i]; }
    cx /= n; cy /= n;
    let a00 = 0, a01 = 0, a10 = 0, a11 = 0;
    for (let i = 0; i < n; i++) {
      const px = x[i] - cx, py = y[i] - cy;
      a00 += px * qx[i]; a01 += px * qy[i]; a10 += py * qx[i]; a11 += py * qy[i];
    }
    const ang = Math.atan2(a10 - a01, a00 + a11), c = Math.cos(ang), s = Math.sin(ang);
    let t00 = c, t01 = -s, t10 = s, t11 = c;
    if (beta > 0) {
      const I = this.iaqq;
      const l00 = a00 * I[0] + a01 * I[2], l01 = a00 * I[1] + a01 * I[3];
      const l10 = a10 * I[0] + a11 * I[2], l11 = a10 * I[1] + a11 * I[3];
      const det = l00 * l11 - l01 * l10;
      if (det > 1e-8) {
        const k = 1 / Math.sqrt(det);   /* 面積は変えない */
        t00 = beta * l00 * k + (1 - beta) * c; t01 = beta * l01 * k - (1 - beta) * s;
        t10 = beta * l10 * k + (1 - beta) * s; t11 = beta * l11 * k + (1 - beta) * c;
      }
    }
    this.cx = cx; this.cy = cy; this.ang = ang;
    const T = this.T;
    T[0] = t00; T[1] = t01; T[2] = t10; T[3] = t11;
  }

  /** 元の形の座標 → 画面の座標 */
  toWorld(lx, ly) {
    const T = this.T;
    return [T[0] * lx + T[1] * ly + this.cx, T[2] * lx + T[3] * ly + this.cy];
  }

  /** 画面の座標 → 元の形の座標 */
  toLocal(x, y) {
    const T = this.T, det = T[0] * T[3] - T[1] * T[2] || 1;
    const rx = x - this.cx, ry = y - this.cy;
    return [(T[3] * rx - T[1] * ry) / det, (-T[2] * rx + T[0] * ry) / det];
  }

  /** 速さの手当て：床のすべり（まるごとの動き）と、揺れの減り（形の揺れ）を分けて減らす */
  forces(P) {
    const n = this.n, x = this.x, y = this.y, vx = this.vx, vy = this.vy;
    let cx = 0, cy = 0, mvx = 0, mvy = 0;
    for (let i = 0; i < n; i++) { cx += x[i]; cy += y[i]; mvx += vx[i]; mvy += vy[i]; }
    cx /= n; cy /= n; mvx /= n; mvy /= n;
    let L = 0, I = 0;
    for (let i = 0; i < n; i++) {
      const rx = x[i] - cx, ry = y[i] - cy;
      L += rx * (vy[i] - mvy) - ry * (vx[i] - mvx);
      I += rx * rx + ry * ry;
    }
    const w = I > 0 ? L / I : 0;
    const kd = Math.exp(-P.wobbleDamp * STEP);
    const lifted = this.z > 2;
    const kf = Math.exp(-(lifted ? P.friction * 0.15 : P.friction) * STEP);
    const kr = Math.exp(-(lifted ? P.friction * 0.2 : P.friction * 1.3) * STEP);
    const nmx = mvx * kf + (lifted ? 0 : P.gx * STEP), nmy = mvy * kf + (lifted ? 0 : P.gy * STEP);
    const nw = w * kr;
    for (let i = 0; i < n; i++) {
      const rx = x[i] - cx, ry = y[i] - cy;
      const dvx = (vx[i] - (mvx - w * ry)) * kd, dvy = (vy[i] - (mvy + w * rx)) * kd;
      vx[i] = nmx - nw * ry + dvx;
      vy[i] = nmy + nw * rx + dvy;
    }
  }

  updatePress() {
    const pr = this.press;
    if (!pr) return;
    const tau = pr.hold ? 0.1 : 0.03;
    const target = pr.hold ? pr.max : 0;
    pr.depth += (target - pr.depth) * (1 - Math.exp(-STEP / tau));
    if (!pr.hold && pr.depth < 1e-4) this.press = null;
  }

  predict() {
    const n = this.n, x = this.x, y = this.y;
    for (let i = 0; i < n; i++) {
      this.px[i] = x[i]; this.py[i] = y[i];
      x[i] += this.vx[i] * STEP; y[i] += this.vy[i] * STEP;
    }
  }

  /** 形の記憶へ引き戻す（ここがぷるぷるの正体） */
  match(P) {
    this.frame(P.stretch);
    const n = this.n, x = this.x, y = this.y, qx = this.qx, qy = this.qy, gx = this.gx, gy = this.gy;
    const T = this.T, cx = this.cx, cy = this.cy;
    for (let i = 0; i < n; i++) {
      gx[i] = T[0] * qx[i] + T[1] * qy[i] + cx;
      gy[i] = T[2] * qx[i] + T[3] * qy[i] + cy;
    }
    const pr = this.press;
    if (pr && pr.depth > 1e-4) {
      /* 上から押されると、つぶれて横へ広がる（押した所の近くほど大きく） */
      const amp = pr.depth * this.size, sig2 = (this.size * 0.9) ** 2;
      for (let i = 0; i < n; i++) {
        const dx = gx[i] - pr.x, dy = gy[i] - pr.y, d = Math.hypot(dx, dy) || 1;
        const f = amp * (0.3 + 0.7 * Math.exp(-(d * d) / sig2)) / d;
        gx[i] += dx * f; gy[i] += dy * f;
      }
    }
    const al = Math.min(1, P.k * STEP * STEP);
    for (let i = 0; i < n; i++) {
      x[i] += (gx[i] - x[i]) * al;
      y[i] += (gy[i] - y[i]) * al;
    }
  }

  settle() {
    const n = this.n, inv = 1 / STEP;
    for (let i = 0; i < n; i++) {
      let vx = (this.x[i] - this.px[i]) * inv, vy = (this.y[i] - this.py[i]) * inv;
      const v2 = vx * vx + vy * vy;
      if (v2 > VMAX * VMAX) { const k = VMAX / Math.sqrt(v2); vx *= k; vy *= k; }
      this.vx[i] = vx; this.vy[i] = vy;
    }
  }

  /** 高さ（持ち上げ・落下）と波紋の時間を進める */
  tick(dt, world) {
    if (this.zHold != null) {
      this.vz += (700 * (this.zHold - this.z) - 50 * this.vz) * dt;
      this.z += this.vz * dt;
      if (this.z < 0) { this.z = 0; this.vz = 0; }
    } else if (this.z > 0 || this.vz > 0) {
      this.vz -= 2600 * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        const hit = -this.vz;
        this.z = 0;
        this.vz = hit > 500 ? hit * 0.18 : 0;
        world.land(this, hit);
      }
    }
    for (const r of this.ripples) r.t += dt;
    while (this.ripples.length && this.ripples[0].t > 0.6) this.ripples.shift();
  }

  addVel(vx, vy) {
    for (let i = 0; i < this.n; i++) { this.vx[i] += vx; this.vy[i] += vy; }
  }

  /** 中心から外へ（a>0）／内へ（a<0）はじく。単位は 1/秒 */
  kickRadial(a) {
    this.frame(0);
    for (let i = 0; i < this.n; i++) {
      this.vx[i] += (this.x[i] - this.cx) * a;
      this.vy[i] += (this.y[i] - this.cy) * a;
    }
  }

  kickShear(a) {
    this.frame(0);
    for (let i = 0; i < this.n; i++) this.vx[i] += (this.y[i] - this.cy) * a;
  }

  /** ぷにっ：押した所のまわりを外へはじく＋波紋 */
  poke(x, y, strength) {
    const n = this.n, sig2 = (this.size * 0.7) ** 2;
    const amp = 240 * strength * Math.sqrt(this.size / 80);
    for (let i = 0; i < n; i++) {
      const dx = this.x[i] - x, dy = this.y[i] - y, d = Math.hypot(dx, dy) || 1;
      const f = amp * Math.exp(-(d * d) / sig2) / d;
      this.vx[i] += dx * f; this.vy[i] += dy * f;
    }
    this.frame(0);
    const [lx, ly] = this.toLocal(x, y);
    this.ripples.push({ lx, ly, t: 0 });
  }

  contains(x, y) {
    if (x < this.x0 || x > this.x1 || y < this.y0 || y > this.y1) return false;
    return pointInPoly(this.x, this.y, this.n, x, y);
  }

  /** 模様の点を、いまのふちの形に合わせて置き直す（描く直前に呼ぶ） */
  mapFeatures() {
    const n = this.n, m = this.fm, W = this.fw, x = this.x, y = this.y, fx = this.fx, fy = this.fy;
    for (let k = 0; k < m; k++) {
      let X = 0, Y = 0;
      const o = k * n;
      for (let i = 0; i < n; i++) { const w = W[o + i]; X += w * x[i]; Y += w * y[i]; }
      fx[k] = X; fy[k] = Y;
    }
    const pr = this.press;
    if (pr && pr.depth > 1e-3) {
      /* 押した所の中身は、指に押しのけられて外へ逃げる */
      const amp = pr.depth * this.size * 0.9, sig2 = (this.size * 0.45) ** 2, near = this.size * 0.2;
      for (let k = 0; k < m; k++) {
        const dx = fx[k] - pr.x, dy = fy[k] - pr.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1;
        const f = amp * Math.exp(-d2 / sig2) / d * Math.min(1, d / near);
        fx[k] += dx * f; fy[k] += dy * f;
      }
    }
    let r = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - this.cx, dy = y[i] - this.cy, d = dx * dx + dy * dy;
      if (d > r) r = d;
    }
    this.rmax = Math.sqrt(r);
  }
}

/* ---------------- つかむ（ドラッグ） ---------------- */
class Grab {
  constructor(b, x, y, P) {
    this.b = b; b.grabbed = true;
    b.frame(0);
    const [lx, ly] = b.toLocal(x, y);
    const n = b.n;
    this.w = new Float64Array(n);
    mvcWeights(b.qx, b.qy, n, lx, ly, this.w, 0);
    /* つまんだ所の近くほど強く引っぱる（全体にも少し効かせて、まるごとついてくる） */
    this.om = new Float64Array(n);
    const g = 1 - P.pinch, sig2 = (b.size * 0.6) ** 2;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const dx = b.qx[i] - lx, dy = b.qy[i] - ly;
      const v = g + (1 - g) * Math.exp(-(dx * dx + dy * dy) / sig2);
      this.om[i] = v; sum += v;
    }
    const k = n / (sum || 1);
    for (let i = 0; i < n; i++) this.om[i] *= k;
    this.tx = x; this.ty = y; this.tvx = 0; this.tvy = 0;
  }
  apply(P) {
    const b = this.b, n = b.n, w = this.w;
    let ax = 0, ay = 0, avx = 0, avy = 0;
    for (let i = 0; i < n; i++) { ax += w[i] * b.x[i]; ay += w[i] * b.y[i]; avx += w[i] * b.vx[i]; avy += w[i] * b.vy[i]; }
    let fx = P.followK * (this.tx - ax) + P.followC * (this.tvx - avx);
    let fy = P.followK * (this.ty - ay) + P.followC * (this.tvy - avy);
    const m = Math.hypot(fx, fy), lim = 140000;
    if (m > lim) { fx *= lim / m; fy *= lim / m; }
    for (let i = 0; i < n; i++) { b.vx[i] += fx * this.om[i] * STEP; b.vy[i] += fy * this.om[i] * STEP; }
  }
}

/* ---------------- 当たり判定 ---------------- */
/**
 * a の点が b の中に入っていたら、b の辺へ半分ずつ押し戻す。
 * 押し戻す辺は「その点が入ってきた時に横切った辺」（見つからなければ、いちばん近い辺）。
 * いちばん近い辺だけで選ぶと、深くめりこんだ時に反対側へ押し抜けて、形が絡まったままになるため。
 * 深いめりこみは1回に少しずつ押し出す（はじけ飛ばない）。
 */
function pushOut(a, b) {
  const n = b.n, bx = b.x, by = b.y;
  const lim = Math.max(2, a.spacing * 0.6);
  let inside = 0;
  for (let i = 0; i < a.n; i++) {
    const px = a.x[i], py = a.y[i];
    if (px < b.x0 || px > b.x1 || py < b.y0 || py > b.y1) continue;
    if (!pointInPoly(bx, by, n, px, py)) continue;
    inside++;
    const ox = a.px[i], oy = a.py[i], mx = px - ox, my = py - oy;
    let bj = -1, bs = -1;
    if (mx * mx + my * my > 1e-10) {
      for (let j = 0; j < n; j++) {
        const k = j + 1 === n ? 0 : j + 1;
        const ex = bx[k] - bx[j], ey = by[k] - by[j];
        const den = mx * ey - my * ex;
        if (Math.abs(den) < 1e-12) continue;
        const wx = bx[j] - ox, wy = by[j] - oy;
        const s = (wx * ey - wy * ex) / den, t = (wx * my - wy * mx) / den;
        if (s >= 0 && s <= 1 && t >= 0 && t <= 1 && s > bs) { bs = s; bj = j; }
      }
    }
    let bt = 0, qx = 0, qy = 0;
    const crossed = bj >= 0;
    if (crossed) {
      const k = bj + 1 === n ? 0 : bj + 1;
      const ex = bx[k] - bx[bj], ey = by[k] - by[bj], L = ex * ex + ey * ey;
      bt = L > 0 ? ((px - bx[bj]) * ex + (py - by[bj]) * ey) / L : 0;
      bt = bt < 0 ? 0 : bt > 1 ? 1 : bt;
      qx = bx[bj] + ex * bt; qy = by[bj] + ey * bt;
    } else {
      let best = Infinity;
      for (let j = 0; j < n; j++) {
        const k = j + 1 === n ? 0 : j + 1;
        const ex = bx[k] - bx[j], ey = by[k] - by[j], L = ex * ex + ey * ey;
        let t = L > 0 ? ((px - bx[j]) * ex + (py - by[j]) * ey) / L : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = bx[j] + ex * t, cy = by[j] + ey * t;
        const d = (px - cx) * (px - cx) + (py - cy) * (py - cy);
        if (d < best) { best = d; bj = j; bt = t; qx = cx; qy = cy; }
      }
    }
    let dx = qx - px, dy = qy - py;
    if (!crossed) {
      const d = Math.hypot(dx, dy);
      if (d > lim) { dx *= lim / d; dy *= lim / d; }
    }
    dx *= 1.02; dy *= 1.02;
    a.x[i] += dx * 0.5; a.y[i] += dy * 0.5;
    const k = bj + 1 === n ? 0 : bj + 1;
    const w0 = 1 - bt, w1 = bt, s = 0.5 / (w0 * w0 + w1 * w1);
    b.x[bj] -= dx * s * w0; b.y[bj] -= dy * s * w0;
    b.x[k] -= dx * s * w1; b.y[k] -= dy * s * w1;
  }
  /* 4分の1以上めりこんでいたら、絡まる前に中心どうしを少しずつ引き離す */
  if (inside > a.n * 0.25) {
    let ax = 0, ay = 0, cx = 0, cy = 0;
    for (let i = 0; i < a.n; i++) { ax += a.x[i]; ay += a.y[i]; }
    for (let j = 0; j < n; j++) { cx += bx[j]; cy += by[j]; }
    ax /= a.n; ay /= a.n; cx /= n; cy /= n;
    let ux = ax - cx, uy = ay - cy;
    const L = Math.hypot(ux, uy);
    if (L < 1e-6) { ux = 1; uy = 0; } else { ux /= L; uy /= L; }
    const step = 1.5;
    for (let i = 0; i < a.n; i++) { a.x[i] += ux * step; a.y[i] += uy * step; }
    for (let j = 0; j < n; j++) { bx[j] -= ux * step; by[j] -= uy * step; }
  }
}

/* ---------------- 切る ---------------- */
const lerp = (a, b, t) => a + (b - a) * t;
const lerpV = (A, B, t) => ({
  x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t), vx: lerp(A.vx, B.vx, t), vy: lerp(A.vy, B.vy, t),
  qx: lerp(A.qx, B.qx, t), qy: lerp(A.qy, B.qy, t)
});

/** 近すぎる点をまとめ、長すぎる辺に点を足す（切った後のかけらを整える） */
function refine(vs, es, spacing) {
  const minD = spacing * 0.35;
  let V = [], E = [];
  for (let i = 0; i < vs.length; i++) {
    const prev = V[V.length - 1];
    if (prev && Math.hypot(vs[i].qx - prev.qx, vs[i].qy - prev.qy) < minD) {
      E[E.length - 1] = es[i];            /* 消える点の「次の辺」の種類を引きつぐ */
      continue;
    }
    V.push(vs[i]); E.push(es[i]);
  }
  while (V.length > 3) {
    const last = V[V.length - 1], first = V[0];
    if (Math.hypot(last.qx - first.qx, last.qy - first.qy) >= minD) break;
    E[E.length - 2] = E[E.length - 1];
    V.pop(); E.pop();
  }
  const V2 = [], E2 = [];
  for (let i = 0; i < V.length; i++) {
    const A = V[i], B = V[(i + 1) % V.length];
    const L = Math.hypot(B.qx - A.qx, B.qy - A.qy);
    V2.push(A); E2.push(E[i]);
    if (L > spacing * 1.5) {
      const k = Math.ceil(L / spacing);
      for (let j = 1; j < k; j++) { V2.push(lerpV(A, B, j / k)); E2.push(E[i]); }
    }
  }
  while (V2.length < 10 && V2.length >= 3) {
    let bi = 0, bl = -1;
    for (let i = 0; i < V2.length; i++) {
      const A = V2[i], B = V2[(i + 1) % V2.length];
      const L = Math.hypot(B.qx - A.qx, B.qy - A.qy);
      if (L > bl) { bl = L; bi = i; }
    }
    const A = V2[bi], B = V2[(bi + 1) % V2.length];
    V2.splice(bi + 1, 0, lerpV(A, B, 0.5));
    E2.splice(bi + 1, 0, E2[bi]);
  }
  return { V: V2, E: E2 };
}

function clipFeats(feats, ax, ay, dx, dy, sgn) {
  const out = [];
  for (const f of feats) {
    if (f.kind === 'poly') {
      const p = clipPolyHalf(f.pts, ax, ay, dx, dy, sgn);
      if (p.length >= 6 && Math.abs(polyAreaFlat(p)) > 0.5) out.push({ ...f, pts: p });
    } else if (f.kind === 'line') {
      for (const piece of clipLineHalf(f.pts, !!f.closed, ax, ay, dx, dy, sgn)) out.push({ ...f, pts: piece.pts, closed: piece.closed });
    } else {
      let mx = 0, my = 0;
      const m = f.pts.length >> 1;
      for (let k = 0; k < f.pts.length; k += 2) { mx += f.pts[k]; my += f.pts[k + 1]; }
      mx /= m; my /= m;
      if (sgn * sideOf(ax, ay, dx, dy, mx, my) >= 0) out.push(f);
    }
  }
  return out;
}

/** I1・I2（ふちと切る線の交わり）で b を2つに分ける。分けられない時は null */
function splitBody(b, I1, I2) {
  const n = b.n;
  if (I1.edge > I2.edge) { const t = I1; I1 = I2; I2 = t; }
  const ia = I1.edge, ib = I2.edge;
  if (ia === ib) return null;
  const ja = (ia + 1) % n, jb = (ib + 1) % n;
  const onEdge = (i, j, t, X, Y) => ({
    x: X, y: Y, vx: lerp(b.vx[i], b.vx[j], t), vy: lerp(b.vy[i], b.vy[j], t),
    qx: lerp(b.qx[i], b.qx[j], t), qy: lerp(b.qy[i], b.qy[j], t)
  });
  const A = onEdge(ia, ja, I1.t, I1.x, I1.y), B = onEdge(ib, jb, I2.t, I2.x, I2.y);
  const vtx = i => ({ x: b.x[i], y: b.y[i], vx: b.vx[i], vy: b.vy[i], qx: b.qx[i], qy: b.qy[i] });
  const m = Math.max(1, Math.round(Math.hypot(B.qx - A.qx, B.qy - A.qy) / b.spacing));
  const chord = (P0, P1) => { const out = []; for (let k = 1; k < m; k++) out.push(lerpV(P0, P1, k / m)); return out; };

  const v1 = [A], e1 = [b.edge[ia]];
  for (let k = ja; ; k = (k + 1) % n) { v1.push(vtx(k)); e1.push(b.edge[k]); if (k === ib) break; }
  v1.push(B); e1.push(1);
  for (const c of chord(B, A)) { v1.push(c); e1.push(1); }

  const v2 = [B], e2 = [b.edge[ib]];
  for (let k = jb; ; k = (k + 1) % n) { v2.push(vtx(k)); e2.push(b.edge[k]); if (k === ia) break; }
  v2.push(A); e2.push(1);
  for (const c of chord(A, B)) { v2.push(c); e2.push(1); }

  /* 形の記憶の上での切る線（模様もこの線で分ける） */
  const dx = B.qx - A.qx, dy = B.qy - A.qy;
  let s1 = 0;
  for (let k = 1; k < v1.length; k++) {
    const s = sideOf(A.qx, A.qy, dx, dy, v1[k].qx, v1[k].qy);
    if (Math.abs(s) > Math.abs(s1)) s1 = s;
  }
  if (s1 === 0) return null;
  const sg1 = Math.sign(s1);

  const r1 = refine(v1, e1, b.spacing), r2 = refine(v2, e2, b.spacing);
  const make = (r, sgn) => {
    const pts = [], rest = [], vel = [];
    for (const v of r.V) { pts.push(v.x, v.y); rest.push(v.qx, v.qy); vel.push(v.vx, v.vy); }
    /* 小さすぎるかけら・紙のように薄いかけらになる切り方はしない（絡まりやすいため） */
    const area = Math.abs(polyAreaFlat(rest));
    let per = 0;
    for (let i = 0, m = rest.length >> 1; i < m; i++) {
      const j = (i + 1) % m;
      per += Math.hypot(rest[2 * j] - rest[2 * i], rest[2 * j + 1] - rest[2 * i + 1]);
    }
    if (area < MIN_AREA || 2 * area / per < MIN_THICK) return null;
    return new Body({
      fruit: b.fruit, look: b.look, spacing: b.spacing, fruitR: b.fruitR,
      pts, rest, vel, edges: r.E, feats: clipFeats(b.feats, A.qx, A.qy, dx, dy, sgn),
      origin: [b.ox, b.oy], z: b.z, vz: b.vz
    });
  };
  const c1 = make(r1, sg1);
  const c2 = c1 && make(r2, -sg1);
  if (!c1 || !c2) return null;
  return { kids: [c1, c2], A, B };
}

/* ---------------- 世界（お皿の上） ---------------- */
export class World {
  constructor() {
    this.bodies = [];
    this.grabs = new Set();
    this.acc = 0;
    this.W = 800; this.H = 600; this.wall = 16; this.bottomSafe = 0;
    this.P = null;
    this.on = {};
  }
  emit(name, ...a) { if (this.on[name]) this.on[name](...a); }
  clear() { this.bodies.length = 0; this.grabs.clear(); }
  add(b) { this.bodies.push(b); return b; }
  toFront(b) {
    const i = this.bodies.indexOf(b);
    if (i >= 0 && i !== this.bodies.length - 1) { this.bodies.splice(i, 1); this.bodies.push(b); }
  }

  step(dt, P) {
    this.P = P;
    this.acc += Math.min(dt, 0.05);
    let k = 0;
    while (this.acc >= STEP && k < 12) { this.sub(P); this.acc -= STEP; k++; }
    if (k >= 12) this.acc = 0;
    for (const b of this.bodies.slice()) b.tick(dt, this);
    /* はさまれて、へこんだまま戻らないかけらは、少しの間だけ当たり判定を外して形を戻す */
    for (const b of this.bodies) {
      if (b.ghost > 0) { b.ghost -= dt; continue; }
      let dev = 0;
      for (let i = 0; i < b.n; i++) {
        const d = (b.x[i] - b.gx[i]) ** 2 + (b.y[i] - b.gy[i]) ** 2;
        if (d > dev) dev = d;
      }
      dev = Math.sqrt(dev) / b.size;
      if (dev > 0.3 && !b.grabbed && !b.press) b.stuck += dt;
      else b.stuck = Math.max(0, b.stuck - dt * 2);
      if (b.stuck > 0.8) { b.stuck = 0; b.ghost = 0.5; }
    }
  }

  sub(P) {
    const B = this.bodies;
    for (const b of B) { b.forces(P); b.updatePress(); }
    for (const g of this.grabs) g.apply(P);
    for (const b of B) b.predict();
    for (const b of B) b.match(P);
    for (let pass = 0; pass < 2; pass++) {
      for (const b of B) b.bbox();
      for (let i = 0; i < B.length; i++) {
        const a = B[i];
        if (a.z > 40 || a.ghost > 0) continue;
        for (let j = i + 1; j < B.length; j++) {
          const b = B[j];
          if (b.z > 40 || b.ghost > 0) continue;
          if (a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0) continue;
          pushOut(a, b); pushOut(b, a);
        }
      }
    }
    const L = this.wall, R = this.W - this.wall, T = this.wall, Bt = this.H - this.wall - this.bottomSafe;
    for (const b of B) {
      const n = b.n, x = b.x, y = b.y;
      for (let i = 0; i < n; i++) {
        if (x[i] < L) x[i] = L; else if (x[i] > R) x[i] = R;
        if (y[i] < T) y[i] = T; else if (y[i] > Bt) y[i] = Bt;
      }
      b.settle();
    }
  }

  /** 落ちてきて着地した：ぽよんと広がる */
  land(b, hit) {
    const P = this.P || { poke: 1 };
    if (hit > 80) b.kickRadial(Math.min(1, hit / 1400) * 6 * P.poke);
    this.emit('land', b, hit);
  }

  /** 指の下にあるいちばん上の果物（小さなかけらは少し外側でも拾う） */
  pick(x, y) {
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];
      if (b.contains(x, y)) return b;
    }
    let best = null, bd = 14 * 14;
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];
      if (x < b.x0 - 14 || x > b.x1 + 14 || y < b.y0 - 14 || y > b.y1 + 14) continue;
      for (let j = 0; j < b.n; j++) {
        const d = (b.x[j] - x) ** 2 + (b.y[j] - y) ** 2;
        if (d < bd) { bd = d; best = b; }
      }
    }
    return best;
  }

  pressStart(b, x, y, P) {
    b.press = { x, y, depth: b.press ? b.press.depth : 0, max: 0.17 * P.press, hold: true };
  }
  pressMove(b, x, y) { if (b.press) { b.press.x = x; b.press.y = y; } }
  /** 指を離した。quick＝すぐ離した（ぷにっ）／silent＝つかむ動きに変わった（波紋なし） */
  pressEnd(b, quick, P, silent = false) {
    const pr = b.press;
    if (!pr) return 0;
    pr.hold = false;
    const depth = pr.depth / Math.max(1e-6, pr.max);
    if (silent) return depth;
    if (quick) b.poke(pr.x, pr.y, P.poke);
    else { b.frame(0); const [lx, ly] = b.toLocal(pr.x, pr.y); b.ripples.push({ lx, ly, t: 0 }); }
    return depth;
  }

  grabStart(b, x, y, P) { const g = new Grab(b, x, y, P); this.grabs.add(g); return g; }
  grabEnd(g) { if (!g) return; g.b.grabbed = false; this.grabs.delete(g); }

  /** 直線 a→b が通るところで、b を切る。切れたら true */
  cutChord(body, ax, ay, bx, by) {
    if (this.bodies.length >= MAX_BODIES) return false;
    if (Math.hypot(bx - ax, by - ay) < 2) return false;
    const hits = lineHits(body.x, body.y, body.n, ax, ay, bx, by, true);
    if (hits.length < 2) return false;
    let best = -1, bestOv = -Infinity;
    for (let k = 0; k + 1 < hits.length; k += 2) {
      const ov = Math.min(1, hits[k + 1].s) - Math.max(0, hits[k].s);
      if (ov > bestOv) { bestOv = ov; best = k; }
    }
    if (best < 0) return false;
    const res = splitBody(body, hits[best], hits[best + 1]);
    if (!res) return false;
    const idx = this.bodies.indexOf(body);
    if (idx < 0) return false;
    for (const g of [...this.grabs]) if (g.b === body) this.grabEnd(g);
    this.bodies.splice(idx, 1, ...res.kids);
    /* 切り口から少し離れて、ぷるんと揺れる */
    const P = this.P || { split: 1 };
    const ux = res.B.x - res.A.x, uy = res.B.y - res.A.y, ul = Math.hypot(ux, uy) || 1;
    const nx = -uy / ul, ny = ux / ul;
    for (const c of res.kids) {
      c.frame(0);
      const sd = Math.sign((c.cx - res.A.x) * nx + (c.cy - res.A.y) * ny) || 1;
      c.addVel(nx * sd * 70 * P.split, ny * sd * 70 * P.split);
      c.kickRadial(2.2 * P.split);
    }
    this.emit('cut', { body, kids: res.kids, ax: res.A.x, ay: res.A.y, bx: res.B.x, by: res.B.y });
    return true;
  }

  /** ナイフが x0,y0 → x1,y1 と動いた。g はなぞり1回ぶんの記録 */
  knife(g, x0, y0, x1, y1) {
    const jobs = [];
    const sx0 = Math.min(x0, x1), sx1 = Math.max(x0, x1), sy0 = Math.min(y0, y1), sy1 = Math.max(y0, y1);
    for (const b of this.bodies) {
      if (b.z > 60) continue;
      if (sx1 < b.x0 || sx0 > b.x1 || sy1 < b.y0 || sy0 > b.y1) continue;
      const in0 = b.contains(x0, y0), in1 = b.contains(x1, y1);
      if (!in0 && !in1) {
        const h = lineHits(b.x, b.y, b.n, x0, y0, x1, y1, false);
        if (h.length >= 2) jobs.push([b, h[0].x, h[0].y, h[1].x, h[1].y]);
      } else if (!in0 && in1) {
        const h = lineHits(b.x, b.y, b.n, x0, y0, x1, y1, false);
        const e = h[h.length - 1] || { x: x0, y: y0 };
        g.inside.set(b, { x: e.x, y: e.y });
      } else if (in0 && !in1) {
        const h = lineHits(b.x, b.y, b.n, x0, y0, x1, y1, false);
        const q = h[h.length - 1] || { x: x1, y: y1 };
        const ent = g.inside.get(b) || { x: g.sx, y: g.sy };
        g.inside.delete(b);
        jobs.push([b, ent.x, ent.y, q.x, q.y]);
      } else if (!g.inside.has(b)) {
        g.inside.set(b, { x: x0, y: y0, started: true });
      }
    }
    for (const [b, ax, ay, bx, by] of jobs) if (this.bodies.includes(b)) this.cutChord(b, ax, ay, bx, by);
  }

  /** お皿をゆらす */
  shake() {
    for (const b of this.bodies) {
      const a = Math.random() * TAU, sp = 90 + Math.random() * 150;
      b.addVel(Math.cos(a) * sp, Math.sin(a) * sp);
      b.kickRadial((Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 2));
      b.kickShear((Math.random() - 0.5) * 6);
      if (b.z < 1) b.vz = 160 + Math.random() * 180;
    }
  }
}
