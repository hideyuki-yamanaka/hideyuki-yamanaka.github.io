// Reused verbatim from the frozen public V4 source. No new pictogram geometry.
const SVG_NS="http://www.w3.org/2000/svg";
const clamp01 = v => Math.max(0, Math.min(1, v));
const VAL_VB = 220;                    /* 描画の座標系。表示は 220×220 */
const VAL_INK = '#111';
const VAL_ACC = '#0EBBFF';
const VAL_PINK = '#FF5D97';
/* 【2026-08-30 ヒデさん指定】黒せり上がりの白反転を、ピクトグラムの「黒い図形」にも効かせる(色付きACC/PINKは維持)。
   updateResults が毎フレーム valInkCur をセット(反転中=白寄り / 通常=VAL_INK)。valTake/valStyle が #111 を検知して差し替える。 */
let valInkCur = VAL_INK;
let valStrokeMul = 1;   /* 【2026-09-02 ヒデさん指定】実績ピクトグラムの線幅の倍率(パネル調整)。全ての線幅×この値 */
const valSvgs = {};                    /* { saas:{svg, pool}, ai:{...} } */
function valEnsure(key, id) {
  if (valSvgs[key]) return valSvgs[key];
  const host = document.getElementById(id);
  if (!host) return null;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VAL_VB} ${VAL_VB}`);
  host.innerHTML = '';
  host.appendChild(svg);
  valSvgs[key] = { svg, pool: [], used: 0 };
  return valSvgs[key];
}
/* 形を1つ借りる。使い回すので、毎フレーム作り直さない */
function valTake(st, tag) {
  let el = st.pool[st.used];
  if (!el || el.tagName !== tag) {
    if (el) el.remove();
    el = document.createElementNS(SVG_NS, tag);
    st.svg.appendChild(el);
    st.pool[st.used] = el;
  }
  st.used++;
  el.setAttribute('opacity', '1');
  el.setAttribute('stroke', valInkCur);
  el.setAttribute('stroke-width', (1 * valStrokeMul).toFixed(2));   /* 2026-08-30: 基準1px ×倍率(パネル・2026-09-02) */
  el.removeAttribute('transform');
  return el;
}
function valDone(st) {
  for (let i = st.used; i < st.pool.length; i++) st.pool[i].setAttribute('opacity', '0');
  st.used = 0;
}
/* --- 便利関数(すべて枠線だけ) --- */
function vCircle(st, cx, cy, r, o) { const e = valTake(st, 'circle');
  e.setAttribute('cx', cx.toFixed(1)); e.setAttribute('cy', cy.toFixed(1)); e.setAttribute('r', Math.max(0.1, r).toFixed(1));
  e.__len = 2 * Math.PI * Math.max(0.1, r);
  if (o) valStyle(e, o); return e; }
function vRect(st, cx, cy, w, h, o) { const e = valTake(st, 'rect');
  e.setAttribute('x', (cx - w / 2).toFixed(1)); e.setAttribute('y', (cy - h / 2).toFixed(1));
  e.setAttribute('width', Math.max(0.1, w).toFixed(1)); e.setAttribute('height', Math.max(0.1, h).toFixed(1));
  e.setAttribute('rx', (o && o.rx != null ? o.rx : 0));
  e.__len = 2 * (Math.max(0.1, w) + Math.max(0.1, h));
  if (o) valStyle(e, o); return e; }
function vTri(st, cx, cy, r, rot, o) { const e = valTake(st, 'polygon');
  const p = [];
  for (let i = 0; i < 3; i++) { const a = (rot + i * 120 - 90) * Math.PI / 180;
    p.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1)); }
  e.setAttribute('points', p.join(' '));
  e.__len = 3 * (r * Math.sqrt(3));
  if (o) valStyle(e, o); return e; }
function vLine(st, x1, y1, x2, y2, o) { const e = valTake(st, 'line');
  e.setAttribute('x1', x1.toFixed(1)); e.setAttribute('y1', y1.toFixed(1));
  e.setAttribute('x2', x2.toFixed(1)); e.setAttribute('y2', y2.toFixed(1));
  e.__len = Math.hypot(x2 - x1, y2 - y1);
  if (o) valStyle(e, o); return e; }
/* 楕円。縦を潰すと「寝ている」＝奥行きが出る。2Dのままで立体に見せる要 */
function vEll(st, cx, cy, rx, ry, rot, o) { const e = valTake(st, 'ellipse');
  e.setAttribute('cx', cx.toFixed(1)); e.setAttribute('cy', cy.toFixed(1));
  e.setAttribute('rx', Math.max(0.1, rx).toFixed(1)); e.setAttribute('ry', Math.max(0.1, ry).toFixed(1));
  if (rot) e.setAttribute('transform', `rotate(${rot.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})`);
  /* 楕円の周長(ラマヌジャンの近似)。トリミングに使う */
  const a = Math.max(0.1, rx), b = Math.max(0.1, ry), h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
  e.__len = Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
  if (o) valStyle(e, o); return e; }
/* 楕円の上の点(deg)。傾きも効かせる。奥(上半分)か手前(下半分)かも返す */
function vOn(cx, cy, rx, ry, deg, rot) {
  const t = deg * Math.PI / 180, r = (rot || 0) * Math.PI / 180;
  const lx = rx * Math.cos(t), ly = ry * Math.sin(t);
  return { x: cx + lx * Math.cos(r) - ly * Math.sin(r),
           y: cy + lx * Math.sin(r) + ly * Math.cos(r),
           front: Math.sin(t) > 0, depth: (Math.sin(t) + 1) / 2 };
}
/* 折れ線。ストーリーの「道筋」を描くのに使う */
function vPath(st, pts, o) { const e = valTake(st, 'path');
  e.setAttribute('d', 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L'));
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]);
  e.__len = L; if (o) valStyle(e, o); return e; }
/* 【2026-08-28 ヒデさん指定】パスのトリミング。
   線を「今どこまで描かれたか」で見せると、時間の経過やストーリーが表せる。
   k=0 で何も描かれていない / k=1 で全部描かれた。from を渡すと途中から。 */
function vTrim(e, k, from) {
  const L = e.__len || 0;
  if (!L) return e;
  const a = Math.max(0, Math.min(1, from || 0)), b = Math.max(a, Math.min(1, k));
  const on = L * (b - a);
  e.setAttribute('stroke-dasharray', on.toFixed(2) + ' ' + L.toFixed(2));
  e.setAttribute('stroke-dashoffset', (-L * a).toFixed(2));
  return e;
}
function valStyle(e, o) {
  if (o.c) e.setAttribute('stroke', o.c === VAL_INK ? valInkCur : o.c);
  if (o.w != null) e.setAttribute('stroke-width', (o.w * valStrokeMul).toFixed(2));
  if (o.a != null) e.setAttribute('opacity', Math.max(0, Math.min(1, o.a)).toFixed(3));
  if (o.dash) e.setAttribute('stroke-dasharray', o.dash); else e.removeAttribute('stroke-dasharray');
  e.removeAttribute('stroke-dashoffset');
  if (o.rot != null) e.setAttribute('transform', `rotate(${o.rot.toFixed(1)} ${o.rx0 || 110} ${o.ry0 || 110})`);
}
const vE = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   /* なめらかな出入り */
/* 【2026-09-08 ヒデさん指定・強化】緩急をさらに強く。両端が“ぐっと”遅く、中央で一気に速い
   シグモイド型(指数3.4)。「最初ゆっくり→ぐっと速く→また遅く」。for AI の矢印の線の伸びに使う。 */
const vEIO = u => { u = u < 0 ? 0 : u > 1 ? 1 : u; const a = Math.pow(u, 3.4); return a / (a + Math.pow(1 - u, 3.4)); };
/* 【2026-08-28 ヒデさん指定】全体的にゆったりすぎたので、緩急の強い動きを足す。
   vE2 = 一気に動いて、終わりでぴたっと止まる(見せ場に使う)
   vE3 = 少し行き過ぎて戻る(重なる・刺さる瞬間の気持ちよさ)
   vHold = 前半は止まって待ち、後半で一気に動く(ためを作る) */
const vE2 = k => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3.4);
const vE3 = k => { const c = 1.7; const x = Math.max(0, Math.min(1, k));
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const vHold = (k, wait) => { const w = wait == null ? 0.4 : wait;
  return k <= w ? 0 : vE2((k - w) / (1 - w)); };
/* 矢印(実行を表すのに使う)。dir は度(0=右) */
function vArrow(st, x, y, len, dir, o) {
  const a = (dir || 0) * Math.PI / 180;
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  const h = Math.max(5, len * 0.30);
  const p = [[x, y], [ex, ey]];
  vTrim(vPath(st, p, o), 1);
  const b1 = a + Math.PI * 0.82, b2 = a - Math.PI * 0.82;
  vPath(st, [[ex + Math.cos(b1) * h, ey + Math.sin(b1) * h], [ex, ey],
             [ex + Math.cos(b2) * h, ey + Math.sin(b2) * h]], o);
  return { x: ex, y: ey };
}
const vLoop = (t, T) => (t % T) / T;                                     /* 0→1 のくり返し */

/* ===================== for SaaS: リアルタイムにデータ同期 ===================== */
const VAL_SAAS = {
  /* S1 【2026-08-30 ヒデさん指定・新規】点線が左→右へ伸びてから、青→ピンクの粒が後追いで流れる。
     最初は点線は出ておらず、伸びきってから粒が追いかける。すべて1pxの枠線。 */
  S1(st, t) {
    const C = VAL_VB / 2, x0 = 26, x1 = 194, span = x1 - x0;
    const k = vLoop(t, 4.6);
    /* ① 点線が左から右へ伸びる(トリミングで“描かれていく”) */
    const draw = vE(Math.min(1, k / 0.42));
    vTrim(vLine(st, x0, C, x1, C, { w: 1, dash: '4 5', a: 0.65 }), draw);
    /* 端の小さな受け皿(1px枠) */
    vCircle(st, x0, C, 5, { w: 1, a: 0.5 });
    vCircle(st, x1, C, 5, { w: 1, a: 0.5 });
    /* ② 伸びきってから、青が先・ピンクが少し後ろで後追い */
    const fol = (k - 0.4) / 0.6;
    if (fol > 0) {
      const pB = vE(Math.min(1, fol));
      vRect(st, x0 + span * pB, C, 12, 12, { c: VAL_ACC, w: 1});
      if (fol > 0.16) { const pP = vE(Math.min(1, fol - 0.16)); vRect(st, x0 + span * pP, C, 12, 12, { c: VAL_PINK, w: 1}); }
    }
  },
  /* S2 双方向のやり取り: 2つの箱の間を小さな正方形が行き来し、届くと受け手の枠が太くなる */
  S2(st, t) {
    const C = VAL_VB / 2, L = 46, R = 174;
    const k = vLoop(t, 2.6), fwd = k < 0.5;
    const u = vE(fwd ? k / 0.5 : (k - 0.5) / 0.5);
    const x = fwd ? L + (R - L) * u : R - (R - L) * u;
    const hitL = !fwd && u > 0.86, hitR = fwd && u > 0.86;
    vRect(st, L, C, 46, 60, { rx: 4, w: 1, c: hitL ? VAL_ACC : VAL_INK });
    vRect(st, R, C, 46, 60, { rx: 4, w: 1, c: hitR ? VAL_ACC : VAL_INK });
    for (let i = 0; i < 3; i++) vLine(st, L - 14, C - 16 + i * 16, L + 14, C - 16 + i * 16, { a: 0.3 });
    for (let i = 0; i < 3; i++) vLine(st, R - 14, C - 16 + i * 16, R + 14, C - 16 + i * 16, { a: 0.3 });
    vRect(st, x, C, 13, 13, { c: fwd ? VAL_ACC : VAL_PINK, w: 1, rot: u * 180, rx0: x, ry0: C });
  },
  /* S3 重なって1つになる: 2つの円が寄って重なり、中央に正方形が生まれる＝統合 */
  S3(st, t) {
    const C = VAL_VB / 2;
    const k = vLoop(t, 5);
    const close = k < 0.45 ? vE(k / 0.45) : (k < 0.75 ? 1 : 1 - vE((k - 0.75) / 0.25));
    const gap = 44 * (1 - close);
    /* 常設の受け皿(点線)。どの瞬間も図形の数が他の案とそろうようにする */
    vCircle(st, C, C, 62, { a: 0.18, dash: '4 6' });
    vLine(st, C - 78, C, C + 78, C, { a: 0.15, dash: '4 6' });
    vCircle(st, C - gap, C, 46, { c: VAL_PINK, a: 0.95 });
    vCircle(st, C + gap, C, 46, { c: VAL_ACC, a: 0.95 });
    const one = Math.max(0, (close - 0.72) / 0.28);
    if (one > 0) {
      vRect(st, C, C, 30 * vE(one), 30 * vE(one), { w: 1, a: one });
      vCircle(st, C, C, 46 + (1 - one) * 10, { w: 1, a: one * 0.5 });
    }
  },
  /* S4 一斉にそろう: 3×3 の升目がバラバラに光り、最後に全部が同じ状態へ揃う */
  S4(st, t) {
    const C = VAL_VB / 2, S = 34, G = 8;
    const k = vLoop(t, 4.2);
    const settle = k > 0.68 ? vE((k - 0.68) / 0.32) : 0;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const ph = ((i * 7) % 9) / 9;
      const lit = settle > 0.1 ? settle : (Math.sin((k + ph) * Math.PI * 4) > 0.55 ? 1 : 0);
      vRect(st, C + (c - 1) * (S + G), C + (r - 1) * (S + G), S, S,
        { rx: 3, w: 1, c: lit ? VAL_ACC : VAL_INK, a: lit ? 1 : 0.4 });
    }
  },
  /* S5 すれ違う2本の流れ: 上下の線を、円と正方形が逆向きに流れる。交差で一瞬ふくらむ */
  S5(st, t) {
    const C = VAL_VB / 2;
    vLine(st, 26, C - 26, 194, C - 26, { a: 0.35 });
    vLine(st, 26, C + 26, 194, C + 26, { a: 0.35 });
    for (let i = 0; i < 3; i++) {
      const u = vLoop(t * 0.42 + i / 3, 1);
      const x = 26 + 168 * u;
      const near = Math.abs(x - C) < 16 ? 1 : 0;
      vCircle(st, x, C - 26, 8 + near * 3, { c: VAL_ACC, w: 1});
      const x2 = 194 - 168 * u;
      vRect(st, x2, C + 26, 15 + near * 4, 15 + near * 4, { c: VAL_PINK, w: 1});
    }
  },
  /* ===== ここから 2026-08-28 追加分 =====
     ヒデさん指定の方向: 複数が1つになる / 重なり合う / 時系列が分かる / 緩急がある。
     S6〜S10 はパスのトリミング(線が描かれていく)を使い、時間の経過とストーリーを出す。 */

  /* S6 描かれてつながる: 左から右へ線が引かれ、届いた瞬間に受け手の枠が一周描かれる */
  S6(st, t) {
    const C = VAL_VB / 2, L = 48, R = 172, T = 3.4, k = vLoop(t, T);
    const draw = Math.min(1, k / 0.42);                 /* 速く引く */
    const land = Math.max(0, (k - 0.44) / 0.3);         /* 受け手が一周描かれる */
    const rest = Math.max(0, (k - 0.8) / 0.2);          /* 余韻はゆっくり */
    vRect(st, L, C, 44, 56, { rx: 4, w: 1});
    vTrim(vRect(st, R, C, 44, 56, { rx: 4, w: 1, c: VAL_ACC, a: land > 0 ? 1 : 0 }), vE(land));
    vTrim(vLine(st, L + 24, C, R - 24, C, { c: VAL_ACC, w: 1}), vE(draw));
    vLine(st, L + 24, C, R - 24, C, { a: 0.16, dash: '4 6' });
    const px = L + 24 + (R - L - 48) * vE(draw);
    vRect(st, px, C, 10, 10, { c: VAL_ACC, w: 1, a: draw < 1 ? 1 : 1 - rest });
    vCircle(st, L, C, 8, { a: 0.4 });
  },
  /* S7 4つが1つに: 四隅の四角が中央へ集まり、重なって1つになる。合流の瞬間に外周が一周描かれる */
  S7(st, t) {
    const C = VAL_VB / 2, T = 4.2, k = vLoop(t, T);
    const come = Math.min(1, k / 0.5), hold = Math.max(0, (k - 0.52) / 0.24), back = Math.max(0, (k - 0.82) / 0.18);
    const d = 62 * (1 - vE(come)) + 62 * vE(back);
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 + 45) * Math.PI / 180;
      vRect(st, C + Math.cos(a) * d, C + Math.sin(a) * d, 30, 30,
        { rx: 3, w: 1, c: i % 2 ? VAL_ACC : VAL_PINK, a: 0.9 });
    }
    vTrim(vCircle(st, C, C, 52, { w: 1, c: VAL_ACC, a: hold > 0 ? 1 - back : 0 }), vE(hold));
  },
  /* S8 満ちて同期: 外周が0→100%まで描かれ(進捗)、満ちた瞬間に内側の四角がパッと出る */
  S8(st, t) {
    const C = VAL_VB / 2, T = 3.8, k = vLoop(t, T);
    const fill = Math.min(1, k / 0.72), pop = Math.max(0, (k - 0.72) / 0.28);
    vCircle(st, C, C, 62, { a: 0.16, dash: '3 5' });
    vTrim(vCircle(st, C, C, 62, { w: 1, c: VAL_ACC }), fill);
    vCircle(st, C, C, 40, { a: 0.28 });
    const sz = 34 * (pop > 0 ? (1 + (1 - vE(Math.min(1, pop * 2.4))) * 0.5) : 0);
    if (pop > 0) vRect(st, C, C, sz, sz, { rx: 3, w: 1, c: VAL_ACC, a: 1 - pop * 0.5 });
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 - 90) * Math.PI / 180;
      vLine(st, C + Math.cos(a) * 70, C + Math.sin(a) * 70, C + Math.cos(a) * 78, C + Math.sin(a) * 78, { a: 0.3 });
    }
  },
  /* S9 2つの弧が噛み合う: 左右から弧が伸びて1つの円になる。噛み合った瞬間だけ太くなる */
  S9(st, t) {
    const C = VAL_VB / 2, T = 3.6, k = vLoop(t, T);
    const grow = Math.min(1, k / 0.55), lock = Math.max(0, (k - 0.55) / 0.2), off = Math.max(0, (k - 0.85) / 0.15);
    const R = 56;
    const arc = (a0, a1, kk, col) => {
      const pts = []; const seg = 26;
      for (let i = 0; i <= seg; i++) { const a = (a0 + (a1 - a0) * (i / seg)) * Math.PI / 180;
        pts.push([C + Math.cos(a) * R, C + Math.sin(a) * R]); }
      vTrim(vPath(st, pts, { c: col, w: 1, a: 1 - off }), vE(kk));
    };
    arc(180, 360, grow, VAL_ACC);
    arc(0, 180, grow, VAL_PINK);
    vCircle(st, C, C, R, { a: 0.14, dash: '4 6' });
    /* 常設の印(左右の合わせ目)。どの場面でも密度が落ちないように */
    vLine(st, C - R - 12, C, C - R + 2, C, { a: 0.25 });
    vLine(st, C + R - 2, C, C + R + 12, C, { a: 0.25 });
    if (lock > 0) vCircle(st, C, C, 12 + vE(Math.min(1, lock * 2)) * 6, { c: VAL_ACC, w: 1, a: 1 - lock });
  },
  /* S10 積層して重なる: 3つの円がずれて重なっていき、完全に重なると1つに見える */
  S10(st, t) {
    const C = VAL_VB / 2, T = 4.6, k = vLoop(t, T);
    const stack = Math.min(1, k / 0.46), one = Math.max(0, (k - 0.5) / 0.22), open = Math.max(0, (k - 0.78) / 0.22);
    const sp = 34 * (1 - vE(stack)) + 34 * vE(open);
    for (let i = 0; i < 3; i++) {
      const dy = (i - 1) * sp;
      vCircle(st, C, C + dy, 44, { w: 1, c: i === 1 ? VAL_INK : (i ? VAL_ACC : VAL_PINK), a: 0.9 });
    }
    vTrim(vCircle(st, C, C, 44, { w: 1, c: VAL_ACC, a: one > 0 ? 1 - open : 0 }), vE(one));
    vLine(st, C - 66, C, C + 66, C, { a: 0.14, dash: '4 6' });
  },
  /* ===== ここから 2026-08-28 追加分(躍動感・回転・奥行き) =====
     2Dのフラットなまま立体に見せる手: 楕円を寝かせる / 手前を大きく奥を小さく /
     回転しながら大小を変える / 前後の重なりを入れ替える。 */

  /* S11 二軸のジャイロ: 直交する2つの輪が転がる。交点に印。いちばん躍動感がある */
  S11(st, t) {
    const C = VAL_VB / 2, R = 66;
    const a = t * 46, b = -t * 38;
    const f1 = Math.abs(Math.cos(t * 0.8)), f2 = Math.abs(Math.sin(t * 0.8));
    vEll(st, C, C, R, Math.max(5, R * f1), a, { c: VAL_ACC, w: 1});
    vEll(st, C, C, R, Math.max(5, R * f2), b, { c: VAL_PINK, w: 1});
    for (let i = 0; i < 2; i++) {
      const p = vOn(C, C, R, Math.max(5, R * f1), t * 120 + i * 180, a);
      vRect(st, p.x, p.y, 9 + p.depth * 6, 9 + p.depth * 6, { w: 1, a: 0.4 + p.depth * 0.6 });
    }
    vCircle(st, C, C, 9, { w: 1, a: 0.9 });
  },
  /* S12 立方体が回る: 前後2枚の正方形を線で結んだ枠。横幅の伸び縮みで回転して見せる */
  S12(st, t) {
    const C = VAL_VB / 2, S = 58;
    const k = Math.cos(t * 0.9);                       /* -1〜1 = 回転 */
    const near = 1 + 0.16 * k, far = 1 - 0.16 * k;     /* 手前は大きく、奥は小さく */
    const off = 22 * k;
    const A = { x: C - off, y: C - 10, s: S * far },
          B = { x: C + off, y: C + 10, s: S * near };
    vRect(st, A.x, A.y, A.s, A.s, { w: 1, a: 0.45 });
    for (const [dx, dy] of [[-1,-1],[1,-1],[1,1],[-1,1]])
      vLine(st, A.x + dx * A.s / 2, A.y + dy * A.s / 2, B.x + dx * B.s / 2, B.y + dy * B.s / 2, { a: 0.3 });
    vRect(st, B.x, B.y, B.s, B.s, { w: 1, c: VAL_ACC });
    vCircle(st, B.x, B.y, 7, { c: VAL_PINK, w: 1});
  },
  /* S13 手前と奥をめぐる: 寝かせた輪の上を四角が周回。手前で大きく前面、奥で小さく背面 */
  S13(st, t) {
    const C = VAL_VB / 2, RX = 82, RY = 30, ROT = -18;
    vEll(st, C, C, RX, RY, ROT, { a: 0.4 });
    vEll(st, C, C, RX * 0.62, RY * 0.62, ROT, { a: 0.2, dash: '4 6' });
    vCircle(st, C, C, 16, { w: 1});
    for (let i = 0; i < 4; i++) {
      const p = vOn(C, C, RX, RY, t * 66 + i * 90, ROT);
      const sz = 8 + p.depth * 12;
      vRect(st, p.x, p.y, sz, sz, { w: 1,
        c: i % 2 ? VAL_ACC : VAL_PINK, a: 0.35 + p.depth * 0.65 });
    }
  },
  /* S14 盤が立ち上がる: 寝かせた盤が周期的に立ち上がり、上に乗った3つが一緒に回る */
  S14(st, t) {
    const C = VAL_VB / 2, RX = 74;
    const tilt = 0.14 + 0.76 * (0.5 + 0.5 * Math.sin(t * 0.55));   /* 寝る↔立つ */
    const RY = RX * tilt, ROT = -14;
    vEll(st, C, C, RX, RY, ROT, { c: VAL_ACC, w: 1});
    for (let i = 0; i < 3; i++) {
      const p = vOn(C, C, RX, RY, t * 54 + i * 120, ROT);
      const sz = 10 + p.depth * 8;
      vTri(st, p.x, p.y, sz, t * 40 + i * 120, { w: 1, a: 0.4 + p.depth * 0.6 });
    }
    vLine(st, C - RX - 10, C, C - RX + 4, C, { a: 0.25 });
    vLine(st, C + RX - 4, C, C + RX + 10, C, { a: 0.25 });
  },
  /* S15 逆回転して噛み合う: 2つの正方形が逆に回りながら近づき、45°ずれて重なる */
  S15(st, t) {
    const C = VAL_VB / 2, T = 4.4, k = vLoop(t, T);
    const close = k < 0.46 ? vE(k / 0.46) : (k < 0.74 ? 1 : 1 - vE((k - 0.74) / 0.26));
    const gap = 40 * (1 - close);
    const sp = close * 45;
    vRect(st, C - gap, C, 62, 62, { w: 1, c: VAL_PINK, rot: -sp, rx0: C - gap, ry0: C });
    vRect(st, C + gap, C, 62, 62, { w: 1, c: VAL_ACC, rot: sp, rx0: C + gap, ry0: C });
    vCircle(st, C, C, 62 * 0.72, { a: 0.14, dash: '4 6' });
    const lock = Math.max(0, (close - 0.85) / 0.15);
    if (lock > 0) vCircle(st, C, C, 10 + lock * 8, { c: VAL_ACC, w: 1, a: 1 - lock * 0.5 });
  },
  /* ===== 2026-08-28 追加: 開く → グリンと回る → 重なる =====
     ヒデさん指定「一旦上下に開いた後に右回転でグリンとスピンして、また重なる」。
     緩急を効かせるため、開く/回る/戻る をはっきり分けて、間に“ため”を入れている。 */

  /* S16 開いて回って重なる: 3枚が上下に開き、右へグリンと回って、また1つに重なる */
  S16(st, t) {
    const C = VAL_VB / 2, T = 3.8, k = vLoop(t, T);
    const open = Math.max(0, Math.min(1, k / 0.22));                 /* 一気に開く */
    const spin = vHold(Math.max(0, Math.min(1, (k - 0.26) / 0.38)), 0.1) * 360;  /* ためて回る */
    const back = vE3(Math.max(0, Math.min(1, (k - 0.7) / 0.24)));    /* 戻って重なる */
    const gap = (44 * vE2(open)) * (1 - back);
    const COL = [VAL_PINK, VAL_INK, VAL_ACC];
    for (let i = 0; i < 3; i++) {
      const y = C + (i - 1) * gap;
      vRect(st, C, y, 76, 48, { rx: 5, w: 1, c: COL[i],
        rot: spin, rx0: C, ry0: y });
    }
    vCircle(st, C, C, 66, { a: 0.13, dash: '4 6' });
    const lock = Math.max(0, (back - 0.86) / 0.14);
    if (lock > 0) vCircle(st, C, C, 12 + lock * 10, { c: VAL_ACC, w: 1, a: 1 - lock });
  },
  /* S17 花のように開いて閉じる: 4枚が放射状に開き、全体が回ってから中央へ戻る */
  S17(st, t) {
    const C = VAL_VB / 2, T = 4.2, k = vLoop(t, T);
    const open = vE2(Math.max(0, Math.min(1, k / 0.24)));
    const spin = vHold(Math.max(0, Math.min(1, (k - 0.28) / 0.34)), 0.08) * 270;
    const back = vE3(Math.max(0, Math.min(1, (k - 0.66) / 0.28)));
    const d = 52 * open * (1 - back);
    vCircle(st, C, C, 70, { a: 0.13, dash: '4 6' });
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 + 45 + spin) * Math.PI / 180;
      const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
      vRect(st, x, y, 40, 40, { rx: 4, w: 1, c: i % 2 ? VAL_ACC : VAL_PINK,
        rot: spin + i * 90, rx0: x, ry0: y });
    }
    vCircle(st, C, C, 10, { w: 1, a: 0.4 + back * 0.6 });
  },
  /* S18 カードを配って束ねる: 3枚が扇に開き、グリンと回って、パチンと束に戻る */
  S18(st, t) {
    const C = VAL_VB / 2, T = 3.6, k = vLoop(t, T);
    const fan = vE2(Math.max(0, Math.min(1, k / 0.2)));
    const spin = vHold(Math.max(0, Math.min(1, (k - 0.24) / 0.36)), 0.12) * 360;
    const back = vE3(Math.max(0, Math.min(1, (k - 0.68) / 0.24)));
    const sp = (1 - back) * fan;
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 34 * sp;
      const tilt = (i - 1) * 16 * sp + spin;
      vRect(st, C + off, C, 66, 88, { rx: 5, w: 1,
        c: [VAL_PINK, VAL_INK, VAL_ACC][i], rot: tilt, rx0: C + off, ry0: C });
    }
    vLine(st, C - 74, C + 56, C + 74, C + 56, { a: 0.25 });
    const lock = Math.max(0, (back - 0.88) / 0.12);
    if (lock > 0) vRect(st, C, C, 66 + lock * 12, 88 + lock * 12, { rx: 6, c: VAL_ACC, w: 1, a: 1 - lock });
  },
};

/* ===================== for AI: コンテキスト取得から実行 ===================== */
const VAL_AI = {
  /* A1 一方向のパイプライン: 円(取得)→正方形(処理)→三角(実行)。粒が左から右へ一方向に流れ、段ごとに形が変わる */
  A1(st, t) {
    /* 【2026-08-30 ヒデさん指定】四角の角丸なし・点線をやめて実線・各要素1px枠・終端で光る三角は削除。 */
    const C = VAL_VB / 2, X = [44, 110, 176];
    vCircle(st, X[0], C, 26, { a: 0.9, w: 1});
    vRect(st, X[1], C, 46, 46, { rx: 0, a: 0.9, w: 1});
    vTri(st, X[2], C, 28, 90, { a: 0.9, w: 1});
    vLine(st, X[0] + 30, C, X[1] - 27, C, { a: 0.3, w: 1});
    vLine(st, X[1] + 27, C, X[2] - 26, C, { a: 0.3, w: 1});
    for (let i = 0; i < 2; i++) {
      const u = vLoop(t * 0.5 + i / 2, 1);
      const x = X[0] + (X[2] - X[0]) * u;
      if (u < 0.5) vCircle(st, x, C, 7, { c: VAL_ACC, w: 1});
      else vRect(st, x, C, 12, 12, { c: VAL_ACC, w: 1, rot: u * 240, rx0: x, ry0: C });
    }
    /* 終端で光る三角(fire)は削除(ヒデさん指定) */
  },
  /* A20 レーダー(2026-09-08 ヒデさん指定): 縦の棒が上下するだけのループ。
     長方形の収縮も水色の再生マークが右へずれる動きも無し。棒が波打つのを延々くり返す。 */
  A20(st, t) {
    const C = VAL_VB / 2;
    const N = 5, span = 132, x0 = C - span / 2, gap = span / (N - 1);
    const baseY = C + 48;                 /* 棒の下端(共通の底) */
    const minH = 22, maxH = 100;
    /* 底の基準線(うっすら)。空っぽに見えないように常設 */
    vLine(st, x0 - 12, baseY, x0 + span + 12, baseY, { a: 0.25, w: 1 });
    for (let i = 0; i < N; i++) {
      const x = x0 + i * gap;
      /* 位相を1本ずつずらして波打たせる＝レーダー/イコライザ風の上下 */
      const s = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.8);
      const h = minH + (maxH - minH) * s;
      vLine(st, x, baseY, x, baseY - h, { w: 1, a: 0.9 });
      vCircle(st, x, baseY - h, 2.5, { c: VAL_ACC, w: 1, a: 0.9 });   /* 先端の信号点(水色) */
    }
  },
  /* ===== 2026-09-08 ヒデさん指定・新規7案(コンテキスト取得→実行)。矢印の三角は
     「パスのトリミング」ではなく【線が伸びきる直前にフェードイン】で出す(＝延長線上に矢じりが現れる) ===== */
  /* 共通: 線の終点付近に三角矢じりをフェードインで置く。dir=度(0=右) */
  A21(st, t) {   /* 折れて進む・改(既定): 左下から折れ線→伸びきる直前に三角がフェードイン。
                   線の伸びは緩急強め(vEIO)=最初ゆっくり→速く→また遅く(2026-09-08 ヒデさん指定) */
    const C = VAL_VB / 2, T = 4.4, k = vLoop(t, T);
    const draw = vEIO(Math.min(1, k / 0.72));   /* 進み具合そのものに緩急を掛ける */
    const P = [[36, C + 46], [78, C + 46], [78, C], [130, C], [130, C - 44], [172, C - 44]];
    vPath(st, P, { a: 0.14, dash: '4 6' });
    vTrim(vPath(st, P, { c: VAL_ACC, w: 1 }), draw);
    for (let i = 1; i < P.length - 1; i++) {
      const at = i / (P.length - 1);
      vRect(st, P[i][0], P[i][1], 8, 8, { w: 1, a: draw > at ? 0.9 : 0.18 });
    }
    const tri = vE(clamp01((draw - 0.78) / 0.22));   /* 伸びきる直前にフェードイン */
    vTri(st, 186, C - 44, 20, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A22(st, t) {   /* まっすぐ伸びて実行: 左下→右上の直線、途中に取得点、先端に三角フェードイン(緩急強め) */
    const C = VAL_VB / 2, T = 4.0, k = vLoop(t, T);
    const draw = vEIO(Math.min(1, k / 0.72));
    const A = [40, C + 52], B = [166, C - 40];
    vPath(st, [A, B], { a: 0.14, dash: '4 6' });
    vTrim(vPath(st, [A, B], { c: VAL_ACC, w: 1 }), draw);
    for (let i = 1; i <= 3; i++) { const u = i / 4, x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u;
      vCircle(st, x, y, 3.2, { c: VAL_ACC, w: 1, a: draw > u ? 0.95 : 0.18 }); }
    const dir = Math.atan2(B[1] - A[1], B[0] - A[0]);
    const tri = vE(clamp01((draw - 0.78) / 0.22));
    vTri(st, B[0] + 10 * Math.cos(dir), B[1] + 10 * Math.sin(dir), 18, dir * 180 / Math.PI + 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A23(st, t) {   /* 点をつないで実行: 散らばった文脈の点→中央へ集約→右へ矢印+三角フェードイン */
    const C = VAL_VB / 2, T = 4.6, k = vLoop(t, T);
    const gather = Math.min(1, k / 0.52), go = Math.max(0, (k - 0.5) / 0.5);
    const pts = [[50, C - 42], [42, C + 28], [86, C - 6], [66, C + 50], [92, C + 22]];
    const hub = [112, C];
    pts.forEach(p => { vCircle(st, p[0], p[1], 3.5, { c: VAL_ACC, w: 1, a: 0.45 + 0.5 * vE(gather) });
      vTrim(vPath(st, [p, hub], { a: 0.5, w: 1 }), vE(gather)); });
    vCircle(st, hub[0], hub[1], 10, { w: 1, a: 0.9 });
    vTrim(vPath(st, [hub, [176, C]], { c: VAL_ACC, w: 1 }), vE(go));
    const tri = vE(clamp01((go - 0.78) / 0.22));
    vTri(st, 186, C, 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A24(st, t) {   /* 束ねて放つ: 左の複数線が1本に束なり→右へ矢印を放つ+三角フェードイン */
    const C = VAL_VB / 2, T = 4.2, k = vLoop(t, T);
    const merge = Math.min(1, k / 0.5), shoot = Math.max(0, (k - 0.5) / 0.5);
    const ys = [C - 42, C - 15, C + 15, C + 42], x0 = 36, xm = 104;
    ys.forEach(y => { const yy = y + (C - y) * vE(merge);
      vPath(st, [[x0, y], [xm, yy]], { c: VAL_ACC, w: 1, a: 0.9 - 0.45 * shoot }); });
    vTrim(vPath(st, [[xm, C], [176, C]], { c: VAL_ACC, w: 1 }), vE(shoot));
    const tri = vE(clamp01((shoot - 0.72) / 0.28));
    vTri(st, 186, C, 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A25(st, t) {   /* 満ちて矢が伸びる: 円弧が満ちる(取得)→右へ直線が伸びて三角フェードイン */
    const C = VAL_VB / 2, T = 4.4, k = vLoop(t, T);
    const fill = Math.min(1, k / 0.55), go = Math.max(0, (k - 0.58) / 0.42);
    const r = 34, cx = 70;
    vCircle(st, cx, C, r, { a: 0.16 });
    vTrim(vCircle(st, cx, C, r, { c: VAL_ACC, w: 1 }), vE(fill));
    vCircle(st, cx, C, 4, { c: VAL_PINK, w: 1, a: 0.8 });
    vTrim(vPath(st, [[cx + r, C], [176, C]], { c: VAL_ACC, w: 1 }), vE(go));
    const tri = vE(clamp01((go - 0.78) / 0.22));
    vTri(st, 186, C, 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A26(st, t) {   /* 枠を読み取り実行: 枠内を走査線が走って取得→右へ矢印+三角フェードイン */
    const C = VAL_VB / 2, T = 5.0, k = vLoop(t, T), S = 78;
    const scan = Math.min(1, k / 0.5), go = Math.max(0, (k - 0.55) / 0.45);
    const bx = 64;
    vRect(st, bx, C, S, S + 12, { rx: 0, w: 1, a: 0.9 });
    for (let i = 0; i < 3; i++) { const yy = C - 22 + i * 22;
      vLine(st, bx - 24, yy, bx + 24, yy, { a: (i / 3) < scan ? 0.5 : 0.15, dash: '5 6' }); }
    if (go < 0.35) { const y = C - (S + 12) / 2 + (S + 12) * vE(scan);
      vLine(st, bx - S / 2 + 6, y, bx + S / 2 - 6, y, { c: VAL_ACC, w: 1, a: scan < 1 ? 1 : 0.2 }); }
    vTrim(vPath(st, [[bx + S / 2, C], [176, C]], { c: VAL_ACC, w: 1 }), vE(go));
    const tri = vE(clamp01((go - 0.78) / 0.22));
    vTri(st, 186, C, 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A27(st, t) {   /* ノードが灯り実行: ノードが順に灯って文脈がつながる→右へ矢印+三角フェードイン */
    const C = VAL_VB / 2, T = 4.8, k = vLoop(t, T);
    const light = Math.min(1, k / 0.6), go = Math.max(0, (k - 0.6) / 0.4);
    const nodes = [[46, C - 30], [52, C + 36], [92, C - 2], [84, C + 42], [110, C - 36]];
    const edges = [[0, 2], [1, 2], [2, 4], [3, 2]];
    edges.forEach(e => vTrim(vPath(st, [nodes[e[0]], nodes[e[1]]], { a: 0.5, w: 1 }), vE(Math.min(1, light * 1.2))));
    nodes.forEach((n, i) => vCircle(st, n[0], n[1], 4, { c: VAL_ACC, w: 1, a: light > i / nodes.length ? 0.95 : 0.2 }));
    vTrim(vPath(st, [[110, C], [176, C]], { c: VAL_ACC, w: 1 }), vE(go));
    const tri = vE(clamp01((go - 0.78) / 0.22));
    vTri(st, 186, C, 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A28(st, t) {   /* 段を上って実行: 段(取得→整形→…)が順に現れ、つないで右へ矢印+三角フェードイン */
    const C = VAL_VB / 2, T = 4.6, k = vLoop(t, T);
    const appear = Math.min(1, k / 0.6), go = Math.max(0, (k - 0.62) / 0.38);
    const steps = [[54, C + 34], [96, C + 8], [134, C - 20]];
    vPath(st, steps, { a: 0.14, dash: '4 6' });
    steps.forEach((p, i) => { const kk = clamp01((appear - i * 0.24) / 0.24);
      vRect(st, p[0], p[1], 26, 18, { rx: 0, w: 1, a: 0.16 + 0.8 * kk }); });
    vTrim(vPath(st, steps, { c: VAL_ACC, w: 1 }), vE(appear));
    const last = steps[2];
    vTrim(vPath(st, [[last[0] + 13, last[1]], [176, last[1]]], { c: VAL_ACC, w: 1 }), vE(go));
    const tri = vE(clamp01((go - 0.78) / 0.22));
    vTri(st, 186, last[1], 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A29(st, t) {   /* 波紋が集まって実行: 同心の弧が中心へ集まる(取得)→右へ矢印+三角フェードイン */
    const C = VAL_VB / 2, T = 4.4, k = vLoop(t, T);
    const conv = Math.min(1, k / 0.55), go = Math.max(0, (k - 0.58) / 0.42);
    const cx = 74;
    for (let i = 0; i < 3; i++) { const r = (46 - i * 10) * (1 - 0.5 * vE(conv)) + 6;
      vCircle(st, cx, C, r, { c: VAL_ACC, w: 1, a: 0.3 + 0.2 * i }); }
    vCircle(st, cx, C, 5, { c: VAL_PINK, w: 1, a: 0.85 });
    vTrim(vPath(st, [[cx + 10, C], [176, C]], { c: VAL_ACC, w: 1 }), vE(go));
    const tri = vE(clamp01((go - 0.78) / 0.22));
    vTri(st, 186, C, 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A30(st, t) {   /* 枝が1つに集約して実行: 上下の枝が中央へ集約→右へ矢印+三角フェードイン */
    const C = VAL_VB / 2, T = 4.2, k = vLoop(t, T);
    const grow = Math.min(1, k / 0.55), go = Math.max(0, (k - 0.58) / 0.42);
    const mid = [104, C];
    [[42, C - 42], [42, C + 42]].forEach(tp => {
      vTrim(vPath(st, [tp, [72, C], mid], { c: VAL_ACC, w: 1 }), vE(grow));
      vCircle(st, tp[0], tp[1], 4, { c: VAL_ACC, w: 1, a: 0.4 + 0.5 * vE(grow) }); });
    vCircle(st, mid[0], mid[1], 8, { w: 1, a: 0.9 });
    vTrim(vPath(st, [mid, [176, C]], { c: VAL_ACC, w: 1 }), vE(go));
    const tri = vE(clamp01((go - 0.78) / 0.22));
    vTri(st, 186, C, 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A31(st, t) {   /* 粒がゲートを抜けて実行: 粒が左→ゲートを抜け→右へ矢印+三角フェードイン */
    const C = VAL_VB / 2, T = 4.0, k = vLoop(t, T), gateX = 104;
    vRect(st, gateX, C, 14, 62, { rx: 0, w: 1, a: 0.9 });
    vLine(st, 48, C, gateX - 10, C, { a: 0.2, dash: '4 6' });
    for (let i = 0; i < 3; i++) { const u = vLoop(t * 0.6 + i / 3, 1), x = 44 + u * 132;
      vCircle(st, x, C, 4, { c: x > gateX ? VAL_ACC : VAL_INK, w: 1, a: 0.85 }); }
    const go = Math.max(0, (k - 0.5) / 0.5);
    vTrim(vPath(st, [[gateX + 10, C], [176, C]], { c: VAL_ACC, w: 1 }), vE(go));
    const tri = vE(clamp01((go - 0.78) / 0.22));
    vTri(st, 186, C, 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  A32(st, t) {   /* 格子が満ちて実行: 3×3の格子が順に満ちる(取得)→右へ矢印+三角フェードイン */
    const C = VAL_VB / 2, T = 4.6, k = vLoop(t, T);
    const fill = Math.min(1, k / 0.6), go = Math.max(0, (k - 0.62) / 0.38);
    const gx = 68, n = 3, cell = 18, gap = 4, span = (n - 1) * (cell + gap);
    for (let r = 0; r < n; r++) for (let c2 = 0; c2 < n; c2++) { const idx = r * n + c2, on = fill * n * n > idx;
      vRect(st, gx - span / 2 + c2 * (cell + gap), C - span / 2 + r * (cell + gap), cell, cell, { rx: 0, w: 1, a: on ? 0.9 : 0.16 }); }
    vTrim(vPath(st, [[gx + span / 2 + cell / 2, C], [176, C]], { c: VAL_ACC, w: 1 }), vE(go));
    const tri = vE(clamp01((go - 0.78) / 0.22));
    vTri(st, 186, C, 18, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  /* A2 形が変わる: 円 → 正方形 → 三角 と姿を変え、三角になった瞬間に外へ線が飛ぶ＝実行 */
  A2(st, t) {
    const C = VAL_VB / 2, T = 5.4, k = vLoop(t, T);
    /* 常設の当たり(点線)。どの場面でも図形の数が他の案とそろうようにする */
    vCircle(st, C, C, 78, { a: 0.16, dash: '4 6' });
    vLine(st, C - 92, C, C - 74, C, { a: 0.22 });
    vLine(st, C + 74, C, C + 92, C, { a: 0.22 });
    const seg = k < 0.34 ? 0 : (k < 0.68 ? 1 : 2);
    const u = vE(seg === 0 ? k / 0.34 : seg === 1 ? (k - 0.34) / 0.34 : (k - 0.68) / 0.32);
    /* 見えている形を切り替えつつ、大きさを合わせて「変形」に見せる */
    const R = 52;
    if (seg === 0) { vCircle(st, C, C, R * (0.9 + 0.1 * u), { w: 1}); vRect(st, C, C, R * 1.5 * u, R * 1.5 * u, { w: 1, a: u * 0.9 }); }
    else if (seg === 1) { vRect(st, C, C, R * 1.5, R * 1.5, { w: 1, a: 1 - u * 0.1 }); vTri(st, C, C, R * u, 90, { w: 1, a: u }); }
    else { vTri(st, C, C, R, 90, { w: 1}); }
    if (seg === 2) for (let i = 0; i < 4; i++) {
      const d = 60 + u * 34;
      const a = (-90 + i * 90) * Math.PI / 180;
      vLine(st, C + Math.cos(a) * d, C + Math.sin(a) * d,
               C + Math.cos(a) * (d + 16), C + Math.sin(a) * (d + 16), { c: VAL_ACC, w: 1, a: 1 - u });
    }
    vCircle(st, C, C, 6, { c: VAL_PINK, w: 1, a: 0.8 });
  },
  /* A3 集めて撃つ: 散らばった小さな正方形が中央の円へ集まり、満ちたら右へ三角が飛ぶ */
  A3(st, t) {
    const C = VAL_VB / 2, T = 4.6, k = vLoop(t, T);
    const gather = Math.min(1, k / 0.62), shoot = Math.max(0, (k - 0.66) / 0.34);
    vCircle(st, C - 18, C, 38, { a: 0.9 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + t * 0.35;
      const d = 86 * (1 - vE(gather)) + 26 * vE(gather);
      vRect(st, C - 18 + Math.cos(a) * d, C + Math.sin(a) * d, 12, 12,
        { c: VAL_ACC, w: 1, a: 1 - shoot * 0.7, rot: a * 57, rx0: C - 18 + Math.cos(a) * d, ry0: C + Math.sin(a) * d });
    }
    if (shoot > 0) {
      const x = C - 18 + vE(shoot) * 96;
      vTri(st, x, C, 22, 90, { c: VAL_ACC, w: 1, a: 1 - shoot * 0.3, rot: 90, rx0: x, ry0: C });
    }
  },
  /* A4 走査してから実行: 大きな正方形の中を線が上から下へ走る(取得)。走り終わると三角に変わって右へ抜ける */
  A4(st, t) {
    const C = VAL_VB / 2, T = 5, k = vLoop(t, T), S = 96;
    const scan = Math.min(1, k / 0.55), go = Math.max(0, (k - 0.62) / 0.38);
    const slideX = C + vE(go) * 66;
    /* 常設の枠(点線)と出口の目印。場面が変わっても密度が落ちないように */
    vRect(st, C, C, S + 26, S + 26, { rx: 0, a: 0.14, dash: '5 7' });
    vLine(st, C + S / 2 + 24, C - 14, C + S / 2 + 24, C + 14, { a: 0.22 });
    vLine(st, C - S / 2 - 24, C - 14, C - S / 2 - 24, C + 14, { a: 0.22 });
    if (go < 0.5) {
      vRect(st, C, C, S * (1 - go * 0.5), S * (1 - go * 0.5), { rx: 0, w: 1, a: 1 - go });
      const y = C - S / 2 + S * vE(scan);
      vLine(st, C - S / 2 + 6, y, C + S / 2 - 6, y, { c: VAL_ACC, w: 1, a: scan < 1 ? 1 : 0.2 });
      for (let i = 0; i < 3; i++) {
        const yy = C - 26 + i * 26;
        vLine(st, C - 30, yy, C + 30, yy, { a: yy < y ? 0.55 : 0.15, dash: '5 6' });
      }
    }
    if (go > 0) vTri(st, slideX, C, 30, 90, { c: VAL_ACC, w: 1, a: Math.min(1, go * 2) * (1 - go * 0.4) });
  },
  /* A5 積んで実行 (2026-08-28 ヒデさん指定で作り直し):
     ・フェードインをやめ、【下から入ってくる】動きにした
     ・あとから入ってきた板が、先にあった板を【下から押し上げる】
     ・三角は出さない。積み上がる動きだけで「溜まっていく」を見せる
     ・緩急: 入るのは一気に(vE2)、押し上げは少し行き過ぎて戻る(vE3) */
  A5(st, t) {
    const C = VAL_VB / 2, T = 4.2, k = vLoop(t, T);
    const N = 3, BW = 108, BH = 24, GAP = 5;
    const baseY = C + 44;                 /* いちばん下の段の位置 */
    const fromY = baseY + BH + 30;        /* 画面の下から入ってくる */
    const at = q => q * 0.26, dur = 0.2;
    /* 常設の受け皿(点線)。空の瞬間を作らない */
    for (let q = 0; q < N; q++)
      vRect(st, C, baseY - q * (BH + GAP), BW, BH, { rx: 0, a: 0.13, dash: '4 6' });
    vLine(st, C - BW / 2 - 8, baseY + BH / 2 + 9, C + BW / 2 + 8, baseY + BH / 2 + 9, { a: 0.3 });
    for (let q = 0; q < N; q++) {
      const kk = Math.max(0, Math.min(1, (k - at(q)) / dur));
      if (kk <= 0) continue;
      /* 自分より【あとに】入ってきた枚数だけ、押し上げられる */
      let lift = 0;
      for (let r = q + 1; r < N; r++) lift += vE3(Math.max(0, Math.min(1, (k - at(r)) / dur)));
      const y0 = baseY - lift * (BH + GAP);
      const y = fromY + (y0 - fromY) * vE2(kk);
      vRect(st, C, y, BW, BH, { rx: 0, w: 1, c: q === N - 1 ? VAL_ACC : VAL_INK });
      vLine(st, C - BW / 2 + 12, y, C - BW / 2 + 38, y, { a: 0.35 });
    }
  },
  /* ===== ここから 2026-08-28 追加分 =====
     A6〜A10 はパスのトリミングで「道筋が描かれていく」＝時間の経過とストーリーを出す。
     どれも 取得 → 処理 → 実行 の順番が読み取れるようにしてある。 */

  /* A6 経路が描かれて実行: 円から三角へ折れ線が引かれ、描き切った瞬間に三角が一周描かれて発火 */
  A6(st, t) {
    const C = VAL_VB / 2, T = 3.8, k = vLoop(t, T);
    const draw = Math.min(1, k / 0.5), fire = Math.max(0, (k - 0.52) / 0.28), off = Math.max(0, (k - 0.84) / 0.16);
    const P = [[46, C + 34], [92, C + 34], [92, C - 30], [166, C - 30]];
    vPath(st, P, { a: 0.15, dash: '4 6' });
    vTrim(vPath(st, P, { c: VAL_ACC, w: 1, a: 1 - off }), vE(draw));
    vCircle(st, 46, C + 34, 15, { w: 1});
    vTrim(vTri(st, 178, C - 30, 22, 90, { c: VAL_ACC, w: 1, a: fire > 0 ? 1 - off : 0 }), vE(fire));
    vTri(st, 178, C - 30, 22, 90, { a: 0.16 });
    const kk = vE(draw), idx = Math.min(P.length - 2, Math.floor(kk * 3));
    const seg = kk * 3 - idx;
    vRect(st, P[idx][0] + (P[idx+1][0] - P[idx][0]) * seg, P[idx][1] + (P[idx+1][1] - P[idx][1]) * seg,
      9, 9, { c: VAL_ACC, w: 1, a: draw < 1 ? 1 : 0 });
  },
  /* A7 3ステップ: 取得→解釈→実行の枠が順に描かれて満ちる。最後に三角。時系列そのもの */
  A7(st, t) {
    const C = VAL_VB / 2, T = 5, k = vLoop(t, T);
    for (let i = 0; i < 3; i++) {
      const y = C - 46 + i * 40;
      const at = i * 0.2, kk = Math.max(0, Math.min(1, (k - at) / 0.2));
      vRect(st, C - 12, y, 116, 26, { rx: 0, a: 0.16, dash: '4 6' });
      vTrim(vRect(st, C - 12, y, 116, 26, { rx: 0, c: kk >= 1 ? VAL_INK : VAL_ACC, w: 1}), vE(kk));
    }
    const go = Math.max(0, (k - 0.66) / 0.34);
    if (go > 0) vTrim(vTri(st, C + 74, C + 34, 20, 90, { c: VAL_ACC, w: 1, a: 1 - go * 0.3 }), vE(Math.min(1, go * 2)));
    vLine(st, C - 70, C + 62, C + 86, C + 62, { a: 0.2 });
  },
  /* A8 満ちて発射 (2026-08-28 ヒデさん指定): 発射は三角ではなく【矢印】に。
     円弧が満ちるまでが「取得」。満ちた瞬間に矢印が右へ飛ぶ＝いちばん緩急が強い */
  A8(st, t) {
    const C = VAL_VB / 2, T = 3.2, k = vLoop(t, T);
    const load = Math.min(1, k / 0.62), shoot = Math.max(0, (k - 0.62) / 0.38);
    vCircle(st, C - 30, C, 46, { a: 0.16, dash: '3 5' });
    vTrim(vCircle(st, C - 30, C, 46, { c: VAL_ACC, w: 1, a: 1 - shoot * 0.8 }), load);
    vRect(st, C - 30, C, 20, 20, { w: 1, a: 0.5 + load * 0.5, rot: load * 90, rx0: C - 30, ry0: C });
    if (shoot > 0) {
      const e = vE2(shoot);
      vArrow(st, C - 24 + e * 44, C, 50, 0, { c: VAL_ACC, w: 1, a: 1 - shoot * 0.35 });
    } else {
      vArrow(st, C + 24, C, 44, 0, { a: 0.16 });     /* 出口の目印 */
    }
    vLine(st, C + 84, C - 16, C + 84, C + 16, { a: 0.22 });
  },
  /* A9 重なって答えになる: 3つの円(文脈の断片)が中央で重なり、重なりから四角→三角へ変わって抜ける */
  A9(st, t) {
    const C = VAL_VB / 2, T = 5.2, k = vLoop(t, T);
    const come = Math.min(1, k / 0.4), born = Math.max(0, (k - 0.42) / 0.22),
          morph = Math.max(0, (k - 0.62) / 0.2), go = Math.max(0, (k - 0.8) / 0.2);
    const d = 52 * (1 - vE(come));
    for (let i = 0; i < 3; i++) {
      const a = (i * 120 - 90) * Math.PI / 180;
      vCircle(st, C + Math.cos(a) * d, C + Math.sin(a) * d, 40,
        { w: 1, c: [VAL_PINK, VAL_ACC, VAL_INK][i], a: 0.9 - go * 0.6 });
    }
    /* 常設の当たり。場面が変わっても図形の数がそろうように */
    vCircle(st, C, C, 82, { a: 0.13, dash: '4 6' });
    vLine(st, C + 88, C - 14, C + 88, C + 14, { a: 0.22 });
    if (born > 0 && morph <= 0) vTrim(vRect(st, C, C, 30, 30, { rx: 0, c: VAL_ACC, w: 1}), vE(born));
    if (morph > 0) vTri(st, C + vE(go) * 62, C, 22 + morph * 6, 90, { c: VAL_ACC, w: 1, a: 1 - go * 0.4 });
  },
  /* A10 一本の線が折れて進む: 線が描かれながら3回折れ、先端が三角になって抜ける */
  A10(st, t) {
    const C = VAL_VB / 2, T = 4.4, k = vLoop(t, T);
    const draw = Math.min(1, k / 0.7), tip = Math.max(0, (k - 0.7) / 0.3);
    const P = [[36, C + 46], [78, C + 46], [78, C], [130, C], [130, C - 44], [172, C - 44]];
    vPath(st, P, { a: 0.14, dash: '4 6' });
    vTrim(vPath(st, P, { c: VAL_ACC, w: 1}), vE(draw));
    /* 折れ点に小さな印(＝段を越えた印。時系列が読める) */
    for (let i = 1; i < P.length - 1; i++) {
      const at = i / (P.length - 1);
      vRect(st, P[i][0], P[i][1], 8, 8, { w: 1, a: vE(draw) > at ? 0.9 : 0.18 });
    }
    if (tip > 0) vTrim(vTri(st, 182, C - 44, 20, 90, { c: VAL_ACC, w: 1}), vE(Math.min(1, tip * 1.6)));
    else vTri(st, 182, C - 44, 20, 90, { a: 0.16 });
  },
  /* ===== ここから 2026-08-28 追加分(躍動感・回転・奥行き) ===== */

  /* A11 回り込んで発射: 寝かせた軌道を粒が回り、1周したら中央から三角が飛ぶ。奥は小さく手前は大きく */
  A11(st, t) {
    const C = VAL_VB / 2, RX = 80, RY = 28, ROT = -16, T = 3.6, k = vLoop(t, T);
    vEll(st, C, C, RX, RY, ROT, { a: 0.35 });
    vCircle(st, C, C, 20, { w: 1});
    for (let i = 0; i < 3; i++) {
      const p = vOn(C, C, RX, RY, k * 360 + i * 120, ROT);
      vCircle(st, p.x, p.y, 4 + p.depth * 6, { c: VAL_ACC, w: 1, a: 0.35 + p.depth * 0.65 });
    }
    const fire = Math.max(0, (k - 0.72) / 0.28);
    if (fire > 0) {
      const x = C + vE(fire) * 78;
      vTri(st, x, C, 20 - fire * 4, 90, { c: VAL_ACC, w: 1, a: 1 - fire * 0.4 });
    }
  },
  /* A12 球を走査する: 寝かせた輪を何本も重ねて球の骨組みに。走査線が上から下へ、終わると三角 */
  A12(st, t) {
    const C = VAL_VB / 2, R = 62, T = 4.4, k = vLoop(t, T);
    const scan = Math.min(1, k / 0.62), go = Math.max(0, (k - 0.68) / 0.32);
    vCircle(st, C, C, R, { w: 1, a: 0.8 - go * 0.6 });
    for (let i = 1; i <= 3; i++) {
      const f = Math.cos((i / 4) * Math.PI * 0.5 + t * 0.5);
      vEll(st, C, C, R, Math.max(3, R * Math.abs(f)), 0, { a: (0.5 - go * 0.4) * 0.8 });
    }
    const y = C - R + 2 * R * vE(scan);
    if (go <= 0) {
      const w = Math.sqrt(Math.max(0, R * R - (y - C) * (y - C)));
      vLine(st, C - w, y, C + w, y, { c: VAL_ACC, w: 1});
    }
    if (go > 0) vTri(st, C + vE(go) * 62, C, 24, 90, { c: VAL_ACC, w: 1, a: 1 - go * 0.35 });
  },
  /* A13 カードがめくれる: 長方形が横幅の伸び縮みで3回めくれる。
     【2026-08-30 ヒデさん指定】最後の三角は削除・角丸もすべて無し。 */
  A13(st, t) {
    /* 【2026-08-31 ヒデさん指定】for SaaS(S9: 円R56=上端54〜下端166)とサイズ感・高さを揃える。
       カードを116×86に拡大し、カード上端54・バー下端166.5に配置(全体の占有と中心をS9と一致)。 */
    const C = VAL_VB / 2, T = 4.8, k = vLoop(t, T), W = 116, H = 86, CY = 97, BARY = 163;
    const step = Math.min(2, Math.floor(k / 0.3));
    const u = Math.min(1, (k - step * 0.3) / 0.3);
    const w = W * Math.abs(Math.cos(u * Math.PI));       /* 0 を通る＝真横を向く */
    vRect(st, C, CY, W, H, { rx: 0, a: 0.14, dash: '4 6' });
    vRect(st, C, CY, Math.max(2, w), H, { rx: 0, w: 1, c: [VAL_INK, VAL_ACC, VAL_PINK][step] });
    for (let i = 0; i < 3; i++)
      vRect(st, C - 42 + i * 42, BARY, 28, 7, { rx: 0, w: 1, a: i <= step ? 0.9 : 0.2 });
  },
  /* A14 螺旋で落ちて撃つ: 粒が寝かせた軌道を回りながら中心へ。着いた瞬間に三角が上へ抜ける */
  A14(st, t) {
    const C = VAL_VB / 2, RX = 78, RY = 27, ROT = -20, T = 4.2, k = vLoop(t, T);
    vEll(st, C, C, RX, RY, ROT, { a: 0.28, dash: '4 6' });
    vEll(st, C, C, RX * 0.5, RY * 0.5, ROT, { a: 0.2, dash: '4 6' });
    vCircle(st, C, C, 14, { w: 1});
    for (let i = 0; i < 3; i++) {
      const kk = Math.max(0, Math.min(1, (k - i * 0.14) / 0.66));
      const f = 1 - vE(kk) * 0.9;
      const p = vOn(C, C, RX * f, RY * f, k * 520 + i * 120, ROT);
      vRect(st, p.x, p.y, 6 + p.depth * 8, 6 + p.depth * 8,
        { c: VAL_ACC, w: 1, a: (0.35 + p.depth * 0.65) * (1 - kk * 0.4) });
    }
    const up = Math.max(0, (k - 0.76) / 0.24);
    if (up > 0) vTri(st, C, C - vE(up) * 66, 22, 0, { c: VAL_ACC, w: 1, a: 1 - up * 0.4 });
  },
  /* A15 板が立ち上がる: 寝ていた3枚が順に立ち上がり、揃うと三角に変わって抜ける */
  A15(st, t) {
    const C = VAL_VB / 2, T = 5, k = vLoop(t, T);
    const done = Math.max(0, (k - 0.66) / 0.34);
    for (let i = 0; i < 3; i++) {
      const at = i * 0.2, kk = Math.max(0, Math.min(1, (k - at) / 0.22));
      const x = C - 54 + i * 54;
      const h = 8 + vE(kk) * 62;                        /* 寝ている → 立つ */
      const w = 44 - vE(kk) * 16;
      vRect(st, x, C + 34 - h / 2, w, Math.max(4, h),
        { rx: 0, w: 1, c: kk >= 1 ? VAL_ACC : VAL_INK, a: (0.4 + kk * 0.6) * (1 - done * 0.7) });
    }
    vEll(st, C, C + 44, 86, 12, 0, { a: 0.22 });        /* 床(寝かせた楕円)＝奥行き */
    if (done > 0) vTri(st, C, C + 4 - vE(done) * 48, 24, 90, { c: VAL_ACC, w: 1, a: 1 - done * 0.3 });
  },
  /* ===== 2026-08-28 追加: 矢印で「実行」を表す3案 =====
     ヒデさん指定。三角だけでなく、ふつうの矢印も使ってよいとのこと。 */

  /* A16 伸びて刺さる: 左から矢印が伸びていき、右の枠に刺さると枠が一瞬太くなる */
  A16(st, t) {
    const C = VAL_VB / 2, T = 3.0, k = vLoop(t, T);
    const grow = vE2(Math.min(1, k / 0.46));
    const hitK = Math.max(0, (k - 0.48) / 0.2);
    const rest = Math.max(0, (k - 0.76) / 0.24);
    vCircle(st, 40, C, 17, { w: 1});
    vRect(st, 172, C, 46, 62, { rx: 0, w: 1,
      c: hitK > 0 && hitK < 1 ? VAL_ACC : VAL_INK });
    for (let i = 0; i < 3; i++) vLine(st, 158, C - 18 + i * 18, 186, C - 18 + i * 18, { a: 0.3 });
    vArrow(st, 60, C, 88, 0, { a: 0.14 });
    if (grow > 0.01) vArrow(st, 60, C, 88 * grow, 0, { c: VAL_ACC, w: 1, a: 1 - rest * 0.5 });
  },
  /* A17 三方向へ配信: 中央の四角から矢印が3本、同時に外へ飛ぶ */
  A17(st, t) {
    const C = VAL_VB / 2, T = 3.2, k = vLoop(t, T);
    const load = Math.min(1, k / 0.34);
    const go = Math.max(0, (k - 0.38) / 0.42);
    const out = vE2(go);
    vRect(st, C, C, 46, 46, { rx: 0, w: 1, c: go > 0 ? VAL_ACC : VAL_INK,
      rot: load * 45, rx0: C, ry0: C });
    vCircle(st, C, C, 78, { a: 0.12, dash: '4 6' });
    for (let i = 0; i < 3; i++) {
      const a = -90 + i * 120;
      const r = a * Math.PI / 180;
      const sx = C + Math.cos(r) * (30 + out * 16), sy = C + Math.sin(r) * (30 + out * 16);
      vArrow(st, sx, sy, 46 * out, a, { c: VAL_ACC, w: 1, a: out > 0.02 ? 1 - go * 0.35 : 0 });
      vArrow(st, C + Math.cos(r) * 46, C + Math.sin(r) * 46, 40, a, { a: 0.13 });
    }
  },
  /* A18 向きを決めて飛ぶ: 矢印が中心でぐるっと回り、止まった向きへシュッと飛ぶ */
  A18(st, t) {
    const C = VAL_VB / 2, T = 3.4, k = vLoop(t, T);
    const spin = vHold(Math.min(1, k / 0.48), 0.06);
    const deg = -90 + spin * 400;
    const go = Math.max(0, (k - 0.54) / 0.34);
    const out = vE2(go);
    vCircle(st, C, C, 62, { a: 0.14, dash: '4 6' });
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 - 90) * Math.PI / 180;
      vLine(st, C + Math.cos(a) * 68, C + Math.sin(a) * 68, C + Math.cos(a) * 76, C + Math.sin(a) * 76, { a: 0.3 });
    }
    const r = deg * Math.PI / 180;
    const sx = C + Math.cos(r) * out * 54, sy = C + Math.sin(r) * out * 54;
    vArrow(st, sx, sy, 50, deg, { c: go > 0 ? VAL_ACC : VAL_INK, w: 1, a: 1 - go * 0.3 });
    vCircle(st, C, C, 9, { w: 1, c: VAL_PINK, a: 0.85 });
  },
  /* A19 ひし形を貫く (2026-08-28 ヒデさん指定・Figma 15888:25154 のピクトグラムをもとに)
     ひし形が左から順に現れて右へ4つまで増え、そこを矢印が左から右へ貫く。
     カンプの比率を実測して合わせた(900×520の描画で計測):
       全体の幅 400 に対して ひし形の並びが 45% / 高さが 66% / 矢印は右から24%
       → こちらの 220 の座標系では 全体180(x15〜195) / ひし形の並び81 /
         半幅16.5・半高59 / 中心 x=86,104.6,123.2,141.8 / 中心 y=110
     緩急: ひし形は一気に(vE2)、矢印は ためてから一気に(vHold) */
  A19(st, t) {
    const C = VAL_VB / 2, T = 4.0, k = vLoop(t, T);
    const HW = 16.5, HH = 59;
    const XS = [86, 104.6, 123.2, 141.8];
    /* 1) 左からの線が引かれる */
    const lineK = Math.min(1, k / 0.14);
    vTrim(vLine(st, 15, C, 70, C, { c: VAL_INK, w: 1}), vE2(lineK));
    /* 2) ひし形が左から順に現れる(常設の当たりを薄く置いて、空の瞬間を作らない) */
    for (let i = 0; i < 4; i++) {
      const x = XS[i];
      const pts = [[x, C - HH], [x + HW, C], [x, C + HH], [x - HW, C], [x, C - HH]];
      vPath(st, pts, { a: 0.1 });
      const at = 0.16 + i * 0.09, kk = Math.max(0, Math.min(1, (k - at) / 0.09));
      if (kk > 0) vTrim(vPath(st, pts, { c: VAL_INK, w: 1}), vE2(kk));
    }
    /* 3) 矢印が左から右へ貫く。ためてから一気に */
    const shoot = vHold(Math.max(0, Math.min(1, (k - 0.56) / 0.34)), 0.22);
    const x0 = 58, x1 = 152;                 /* 矢印の【根元】が動く範囲 */
    const ax = x0 + (x1 - x0) * shoot;
    vArrow(st, ax, C, 43, 0, { c: VAL_ACC, w: 1, a: shoot > 0.01 ? 1 : 0 });
    if (shoot <= 0.01) vArrow(st, 152, C, 43, 0, { a: 0.14 });   /* 出口の目印 */
  },
};

export function mountPictograms({staticMode=false, reduced=false}={}) {
  const hosts=[...document.querySelectorAll('[data-picto]')];
  const entries=hosts.map((host,i)=>{host.id=host.id||'study-picto-'+i;const kind=host.dataset.picto; const st=valEnsure(host.id,host.id); st.svg.setAttribute('aria-hidden','true'); return {host,st,kind};});
  let raf,dead=false,start=performance.now();
  const draw=now=>{if(dead)return;const t=staticMode || reduced ? 0.8 : (now-start)/1000 + 0.8; for(const {host,st,kind} of entries){const r=host.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||host.offsetParent===null)continue;valInkCur=host.closest('.dark-surface')?'#E7E7E7':VAL_INK;valStrokeMul=1.5;const mode=host.dataset.pictoMode||(kind==='saas'?'S18':'A21');const f=kind==='saas'?VAL_SAAS[mode]:VAL_AI[mode];f(st,t+(kind==='ai'?3:0));valDone(st);}if(!staticMode&&!reduced)raf=requestAnimationFrame(draw);};
  draw(start);const refresh=()=>{if(staticMode||reduced)draw(performance.now());};window.addEventListener('scroll',refresh,{passive:true});
  return ()=>{dead=true;cancelAnimationFrame(raf);window.removeEventListener('scroll',refresh);for(const {host} of entries)delete valSvgs[host.id];};
}
