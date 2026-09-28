/* render.js — 描画
   テーブル → 果汁のしみ → 影と色の光 → ゼリー（地・模様・皮・切り口・厚みの影・へこみ・ツヤ）→ しぶき → ナイフの跡 */
import { TAU } from './geom.js';

/** ふちの点をなめらかにつないだ形 */
export function bodyPath(b) {
  const n = b.n, x = b.x, y = b.y, p = new Path2D();
  p.moveTo((x[n - 1] + x[0]) / 2, (y[n - 1] + y[0]) / 2);
  for (let i = 0; i < n; i++) {
    const j = i + 1 === n ? 0 : i + 1;
    p.quadraticCurveTo(x[i], y[i], (x[i] + x[j]) / 2, (y[i] + y[j]) / 2);
  }
  p.closePath();
  return p;
}

/** 皮だけ・切り口だけのふち（開いた線） */
function runPath(b, run) {
  if (run.full) return b.path;
  const n = b.n, x = b.x, y = b.y, p = new Path2D(), s = run.start, L = run.len;
  const id = k => (s + k) % n;
  p.moveTo(x[id(0)], y[id(0)]);
  p.lineTo((x[id(0)] + x[id(1)]) / 2, (y[id(0)] + y[id(1)]) / 2);
  for (let k = 1; k < L; k++) {
    const a = id(k), c = id(k + 1);
    p.quadraticCurveTo(x[a], y[a], (x[a] + x[c]) / 2, (y[a] + y[c]) / 2);
  }
  p.lineTo(x[id(L)], y[id(L)]);
  return p;
}

function addPoly(path, f, fx, fy) {
  const m = f.pts.length >> 1, o = f.i0;
  if (m < 3) return;
  if (!f.smooth) {
    path.moveTo(fx[o], fy[o]);
    for (let k = 1; k < m; k++) path.lineTo(fx[o + k], fy[o + k]);
    path.closePath();
    return;
  }
  const L = o + m - 1;
  path.moveTo((fx[L] + fx[o]) / 2, (fy[L] + fy[o]) / 2);
  for (let k = 0; k < m; k++) {
    const a = o + k, c = o + (k + 1) % m;
    path.quadraticCurveTo(fx[a], fy[a], (fx[a] + fx[c]) / 2, (fy[a] + fy[c]) / 2);
  }
  path.closePath();
}

function addLine(path, f, fx, fy) {
  const m = f.pts.length >> 1, o = f.i0;
  if (m < 2) return;
  path.moveTo(fx[o], fy[o]);
  for (let k = 1; k < m; k++) path.lineTo(fx[o + k], fy[o + k]);
  if (f.closed) path.closePath();
}

function addSeed(path, f, fx, fy) {
  const o = f.i0;
  const bx = fx[o], by = fy[o], tx = fx[o + 1], ty = fy[o + 1];
  const len = Math.hypot(tx - bx, ty - by);
  if (len < 0.2) return;
  const ang = Math.atan2(ty - by, tx - bx);
  const mx = (bx + tx) / 2, my = (by + ty) / 2;
  path.moveTo(mx + Math.cos(ang) * len / 2, my + Math.sin(ang) * len / 2);
  path.ellipse(mx, my, len / 2, f.width / 2, ang, 0, TAU);
}

let noiseTile = null;
function makeNoise() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 10;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.la = document.createElement('canvas');
    this.lb = document.createElement('canvas');
    this.filterOK = typeof this.ctx.filter === 'string';
    this.W = 0; this.H = 0; this.dpr = 1;
    this.table = null; this.bgDirty = true;
    this.shakeT = 0;
  }

  resize(W, H, dpr) {
    this.W = W; this.H = H; this.dpr = dpr;
    this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.bg.width = this.cv.width; this.bg.height = this.cv.height;
    this.lw = Math.max(1, Math.ceil(W / 4)); this.lh = Math.max(1, Math.ceil(H / 4));
    this.la.width = this.lb.width = this.lw;
    this.la.height = this.lb.height = this.lh;
    this.bgDirty = true;
  }

  setTable(color) { if (color !== this.table) { this.table = color; this.bgDirty = true; } }

  drawBg() {
    const c = this.bg.getContext('2d'), W = this.W, H = this.H;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = this.table || '#F3EFE9';
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W * 0.28, H * 0.18, 0, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.72);
    g.addColorStop(0, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(60,40,20,0.06)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    /* 方眼（寒天の案で、後ろがゆがんで見えるように） */
    const step = 48, ox = (W % step) / 2, oy = (H % step) / 2;
    c.beginPath();
    for (let x = ox; x <= W; x += step) { c.moveTo(Math.round(x) + 0.5, 0); c.lineTo(Math.round(x) + 0.5, H); }
    for (let y = oy; y <= H; y += step) { c.moveTo(0, Math.round(y) + 0.5); c.lineTo(W, Math.round(y) + 0.5); }
    c.strokeStyle = 'rgba(96,74,52,0.08)';
    c.lineWidth = 1;
    c.stroke();
    if (!noiseTile) noiseTile = makeNoise();
    c.fillStyle = c.createPattern(noiseTile, 'repeat');
    c.fillRect(0, 0, W, H);
    this.bgDirty = false;
  }

  /** 低い解像度でぼかす（影・色の光用） */
  blurInto(dst, src, r) {
    const d = dst.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.clearRect(0, 0, this.lw, this.lh);
    if (this.filterOK) {
      d.filter = `blur(${r}px)`;
      d.drawImage(src, 0, 0);
      d.filter = 'none';
    } else {
      d.globalCompositeOperation = 'lighter';
      d.globalAlpha = 1 / 9;
      for (const dx of [-r, 0, r]) for (const dy of [-r, 0, r]) d.drawImage(src, dx, dy);
      d.globalAlpha = 1;
      d.globalCompositeOperation = 'source-over';
    }
  }

  shadows(ctx, B, look, fx) {
    const A = this.la.getContext('2d'), q = this.lw / this.W;
    /* 床に落ちる影 */
    A.setTransform(1, 0, 0, 1, 0, 0);
    A.clearRect(0, 0, this.lw, this.lh);
    A.setTransform(q, 0, 0, q, 0, 0);
    const sk = fx.shadow * (look === 'gummy' ? 1.15 : 1);
    for (const b of B) {
      const z = b.z, a = Math.max(0, 0.3 * sk * (1 - z / 460));
      if (a < 0.004) continue;
      const s = 1 + z * 0.0012;
      A.save();
      A.translate(b.cx + 2 + z * 0.22, b.cy + 6 + z * 0.4);
      A.scale(s, s);
      A.translate(-b.cx, -b.cy);
      A.fillStyle = `rgba(72,52,34,${a})`;
      A.fill(b.path);
      A.restore();
    }
    this.blurInto(this.lb, this.la, 2);
    ctx.drawImage(this.lb, 0, 0, this.W, this.H);
    /* 透けたゼリーを通った色つきの光 */
    if (look === 'gummy' || fx.caustic <= 0) return;
    A.setTransform(1, 0, 0, 1, 0, 0);
    A.clearRect(0, 0, this.lw, this.lh);
    A.setTransform(q, 0, 0, q, 0, 0);
    for (const b of B) {
      const z = b.z, a = Math.max(0, 0.34 * fx.caustic * (1 - z / 460));
      if (a < 0.004) continue;
      A.save();
      A.translate(b.cx + 4 + z * 0.28, b.cy + 10 + z * 0.45);
      A.scale(0.9, 0.9);
      A.translate(-b.cx, -b.cy);
      A.fillStyle = `rgba(${b.fruit.pal.glow},${a})`;
      A.fill(b.path);
      A.restore();
    }
    this.blurInto(this.lb, this.la, 3);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.lb, 0, 0, this.W, this.H);
    ctx.restore();
  }

  fill(ctx, b, spec) {
    if (typeof spec === 'string') return spec;
    const T = b.T;
    const lx = b.ox + (spec.x || 0) * b.fruitR, ly = b.oy + (spec.y || 0) * b.fruitR;
    const X = T[0] * lx + T[1] * ly + b.cx, Y = T[2] * lx + T[3] * ly + b.cy;
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, Math.max(1, b.fruitR * (spec.r || 1)));
    for (const [s, c] of spec.stops) g.addColorStop(s, c);
    return g;
  }

  features(ctx, b, sugar = 1) {
    const F = b.feats, fx = b.fx, fy = b.fy, fills = b.fruit.pal.fills;
    let i = 0;
    while (i < F.length) {
      const f = F[i];
      const path = new Path2D();
      let j = i;
      if (f.kind === 'poly') {
        while (j < F.length && F[j].kind === 'poly' && F[j].fill === f.fill) addPoly(path, F[j++], fx, fy);
        ctx.fillStyle = this.fill(ctx, b, fills[f.fill] ?? f.fill);
        ctx.fill(path);
      } else if (f.kind === 'line') {
        while (j < F.length && F[j].kind === 'line' && F[j].color === f.color && F[j].width === f.width) addLine(path, F[j++], fx, fy);
        ctx.strokeStyle = f.color; ctx.lineWidth = f.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke(path);
      } else if (f.kind === 'seed') {
        while (j < F.length && F[j].kind === 'seed' && F[j].color === f.color) addSeed(path, F[j++], fx, fy);
        ctx.fillStyle = f.color;
        ctx.fill(path);
      } else if (f.kind === 'dot') {
        while (j < F.length && F[j].kind === 'dot' && F[j].color === f.color) {
          const d = F[j++], k = d.i0;
          path.moveTo(fx[k] + d.r, fy[k]);
          path.arc(fx[k], fy[k], d.r, 0, TAU);
        }
        const keep = ctx.globalAlpha;
        if (f.sugar) ctx.globalAlpha = keep * Math.max(0, Math.min(1, sugar));
        ctx.fillStyle = f.color;
        ctx.fill(path);
        ctx.globalAlpha = keep;
      } else j++;
      i = j;
    }
  }

  bands(ctx, b, look) {
    const pal = b.fruit.pal;
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    for (const run of b.runs) {
      const p = runPath(b, run);
      if (run.kind === 0) {
        if (look !== 'clear' && pal.rind) {
          for (const band of pal.rind) {
            ctx.lineWidth = band.w * b.fruitR * 2;
            ctx.strokeStyle = band.color;
            ctx.stroke(p);
          }
        }
      } else {
        /* 切り口：丸ごとの果物は中の色がのぞく。どれも切りたての光る筋 */
        if (b.fruit.whole && look !== 'clear') {
          const w = b.size * 0.9;
          ctx.strokeStyle = pal.flesh;
          ctx.lineCap = 'round';
          for (const [k, a] of [[1, 0.22], [0.64, 0.32], [0.34, 0.5]]) { ctx.globalAlpha = a; ctx.lineWidth = w * k; ctx.stroke(p); }
          ctx.globalAlpha = 1;
          ctx.lineCap = 'butt';
        }
        ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.stroke(p);
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke(p);
      }
    }
  }

  body(ctx, b, look, fx) {
    const pal = b.fruit.pal, path = b.path, sz = b.size, cx = b.cx, cy = b.cy;
    const gloss = fx.gloss, x = b.x, y = b.y, n = b.n;
    ctx.save();
    const s = 1 + b.z * 0.0011;
    if (s !== 1) { ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }

    /* 1) からだの地 */
    if (look === 'clear') {
      ctx.save();
      ctx.clip(path);
      const k = fx.refract;
      ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
      ctx.drawImage(this.bg, 0, 0, this.W, this.H);
      ctx.restore();
      const op = fx.opacity / 100;
      ctx.fillStyle = `rgba(${pal.glow},${op * 0.55})`;
      ctx.fill(path);
      ctx.fillStyle = `rgba(255,255,255,${op * 0.6})`;
      ctx.fill(path);
    } else {
      ctx.globalAlpha = look === 'gummy' ? 1 : fx.opacity / 100;
      ctx.fillStyle = this.fill(ctx, b, pal.fills.base);
      ctx.fill(path);
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.clip(path);
    /* 2) 模様 */
    ctx.globalAlpha = look === 'jelly' ? Math.min(1, fx.opacity / 100 + 0.12) : 1;
    this.features(ctx, b, fx.sugar);
    ctx.globalAlpha = 1;
    /* 3) 皮と切り口 */
    this.bands(ctx, b, look);
    /* 4) 厚みの影（ふちほど色が濃く見える） */
    const g = ctx.createRadialGradient(cx - sz * 0.2, cy - sz * 0.25, sz * 0.1, cx, cy, Math.max(4, b.rmax * 1.02));
    const ra = (look === 'clear' ? 0.26 : look === 'gummy' ? 0.3 : 0.46) * fx.rim;
    const deep = look === 'clear' ? '40,60,80' : pal.deep;
    g.addColorStop(0, `rgba(${deep},0)`);
    g.addColorStop(0.6, `rgba(${deep},0)`);
    g.addColorStop(1, `rgba(${deep},${ra})`);
    ctx.fillStyle = g;
    ctx.fill(path);
    if (look === 'gummy') {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fill(path);
    }
    /* 5) 押したへこみ（真ん中は薄くなって明るく、まわりに盛り上がりの影） */
    const pr = b.press;
    if (pr && pr.depth > 0.002) {
      const d = Math.min(1, pr.depth / 0.17);
      const r = sz * (0.2 + 0.22 * d);
      const g1 = ctx.createRadialGradient(pr.x + r * 0.18, pr.y + r * 0.22, 0, pr.x, pr.y, r * 1.3);
      g1.addColorStop(0, `rgba(255,255,255,${0.3 * d})`);
      g1.addColorStop(0.5, `rgba(255,255,255,${0.08 * d})`);
      g1.addColorStop(0.78, `rgba(${pal.deep},${0.24 * d})`);
      g1.addColorStop(1, `rgba(${pal.deep},0)`);
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, r * 1.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.4 * d})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, r * 1.08, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
    }
    /* 波紋 */
    for (const rp of b.ripples) {
      const k = rp.t / 0.6;
      const [X, Y] = b.toWorld(rp.lx, rp.ly);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k) * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X, Y, sz * (0.12 + 1.1 * k), 0, TAU); ctx.stroke();
    }
    /* 6) ツヤ（左上から光） */
    const hs = look === 'gummy' ? 0.7 : 0.58, ox = -0.2 * sz, oy = -0.26 * sz;
    const hp = new Path2D();
    const hx = i => cx + (x[i] - cx) * hs + ox, hy = i => cy + (y[i] - cy) * hs + oy;
    hp.moveTo((hx(n - 1) + hx(0)) / 2, (hy(n - 1) + hy(0)) / 2);
    for (let i = 0; i < n; i++) {
      const j = i + 1 === n ? 0 : i + 1;
      hp.quadraticCurveTo(hx(i), hy(i), (hx(i) + hx(j)) / 2, (hy(i) + hy(j)) / 2);
    }
    const ga = (look === 'gummy' ? 0.26 : look === 'clear' ? 0.7 : 0.6) * gloss;
    const lg = ctx.createLinearGradient(cx + ox - sz * 0.6, cy + oy - sz * 0.6, cx + ox + sz * 0.3, cy + oy + sz * 0.3);
    lg.addColorStop(0, `rgba(255,255,255,${Math.min(1, ga)})`);
    lg.addColorStop(0.5, `rgba(255,255,255,${Math.min(1, ga * 0.22)})`);
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.fill(hp);
    /* 右下のふちに回りこむ光 */
    const rg = ctx.createLinearGradient(cx - sz * 0.7, cy - sz * 0.7, cx + sz * 0.8, cy + sz * 0.8);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.6, 'rgba(255,255,255,0)');
    rg.addColorStop(1, `rgba(255,255,255,${Math.min(1, (look === 'gummy' ? 0.2 : 0.55) * gloss)})`);
    ctx.lineWidth = Math.max(2, sz * 0.06);
    ctx.strokeStyle = rg;
    ctx.stroke(path);
    /* 小さな光の点 */
    if (look !== 'gummy' && gloss > 0.01) {
      let best = -Infinity, bi = 0;
      for (let i = 0; i < n; i++) { const v = -(x[i] - cx) * 0.62 - (y[i] - cy) * 0.78; if (v > best) { best = v; bi = i; } }
      const ex = x[bi], ey = y[bi];
      const sx = ex + (cx - ex) * 0.2, sy = ey + (cy - ey) * 0.2;
      const j = (bi + 1) % n, h = (bi - 1 + n) % n;
      const ang = Math.atan2(y[j] - y[h], x[j] - x[h]);
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, 0.9 * gloss)})`;
      ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(1.5, sz * 0.09), Math.max(1, sz * 0.045), ang, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + (cx - sx) * 0.34, sy + (cy - sy) * 0.34, Math.max(1, sz * 0.025), 0, TAU); ctx.fill();
    }
    ctx.restore();   /* clip */
    ctx.restore();
  }

  trail(ctx, tr, now) {
    const life = 180;
    const pts = tr.pts.filter(p => now - p.t < life);
    if (pts.length < 2) return;
    const Lx = [], Ly = [], Rx = [], Ry = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
      let dx = c.x - a.x, dy = c.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const w = Math.max(0, 1 - (now - pts[i].t) / life) * 4.5 * Math.min(1, (i + 1) / pts.length * 1.6);
      Lx.push(pts[i].x - dy * w); Ly.push(pts[i].y + dx * w);
      Rx.push(pts[i].x + dy * w); Ry.push(pts[i].y - dx * w);
    }
    const p = new Path2D();
    p.moveTo(Lx[0], Ly[0]);
    for (let i = 1; i < Lx.length; i++) p.lineTo(Lx[i], Ly[i]);
    for (let i = Rx.length - 1; i >= 0; i--) p.lineTo(Rx[i], Ry[i]);
    p.closePath();
    ctx.save();
    ctx.shadowColor = 'rgba(40,44,60,0.4)';
    ctx.shadowBlur = 8 * this.dpr;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill(p);
    ctx.restore();
  }

  render(world, effects, look, fx, now, knife) {
    const ctx = this.ctx;
    if (this.bgDirty) this.drawBg();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.drawImage(this.bg, 0, 0, this.W, this.H);
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { sx = (Math.random() - 0.5) * 12 * this.shakeT; sy = (Math.random() - 0.5) * 12 * this.shakeT; }
    ctx.save();
    ctx.translate(sx, sy);
    effects.drawUnder(ctx);
    const B = world.bodies;
    for (const b of B) { b.path = bodyPath(b); b.mapFeatures(); }
    this.shadows(ctx, B, look, fx);
    for (const b of B) this.body(ctx, b, look, fx);
    /* 切りかけの筋（ゆっくり切っている途中） */
    for (const inc of knife.incisions) {
      if (!B.includes(inc.b)) continue;
      ctx.save();
      ctx.clip(inc.b.path);
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(${inc.b.fruit.pal.deep},0.35)`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(inc.ax, inc.ay); ctx.lineTo(inc.bx, inc.by); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    effects.drawOver(ctx);
    ctx.restore();
    for (const tr of knife.trails) this.trail(ctx, tr, now);
  }

  /** 道具バーの「ふやす」に出す小さな見本 */
  thumb(cv, b, look, fx) {
    const c = cv.getContext('2d'), d = Math.min(2, window.devicePixelRatio || 1);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(d, 0, 0, d, 0, 0);
    b.path = bodyPath(b);
    b.mapFeatures();
    c.save();
    c.translate(1, 2);
    c.fillStyle = 'rgba(72,52,34,0.16)';
    c.fill(b.path);
    c.restore();
    this.body(c, b, look, fx);
  }
}
