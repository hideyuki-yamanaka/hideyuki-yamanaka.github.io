/* ============================================================
   キービジュアル V2 — カンプ忠実版
   カンプ: figma jSLFEubHMoy3Hxgcw1AZuR / 15294-31034（TOP 3枚組・1440×920）
   ・レイアウト/線/ドット/箱/アイコンはすべてカンプ実測値
   ・中央エージェントのグラデは、カンプ3枚をキーフレームにした
     「光の波が右上へ抜けていく」アニメーション（LUTテクスチャ方式）
   ・もう1モードとして V1.0 の「B ハーフトーン」柄を移植
   切替: KV.setBoxStyle('flat'|'solid'|'iso') / KV.setAgentMode('grad'|'halftone')
   ============================================================ */
(function (global) {
  'use strict';

  const STAGE = { w: 1440, h: 920 };
  /* エージェント（カンプ 15294:29336 実測） */
  const AGENT = { x: 912.62, y: 348.85, w: 227.855, h: 182.065, r: 13 };

  /* ---- 配線（カンプの Vector 1〜6 のパスを座標解決したもの。白60%・2px）----
     向きは「箱 → エージェント」。ドットはこの順に流れる。 */
  const LINES = [
    { id: 'TL', dot: '#0EBBFF', pts: [[694.33, 259.93], [777.80, 259.93], [777.80, 406.87], [909.19, 406.87]] },
    { id: 'ML', dot: '#0E4497', pts: [[693.98, 542.14], [779.51, 542.14], [779.51, 475.17], [937.60, 475.17]] },
    { id: 'TC', dot: '#FF5D97', pts: [[1017.98, 212.08], [1017.98, 348.06]] },
    { id: 'TR', dot: '#0EBBFF', pts: [[1226.83, 268.98], [1178.04, 268.98], [1178.04, 415.92], [1103.38, 415.92]] },
    { id: 'BC', dot: '#FF5D97', pts: [[950.04, 707.66], [950.04, 622.13], [1001.00, 622.13], [1001.00, 522.34]] },
    { id: 'BR', dot: '#0E4497', pts: [[1254.63, 599.45], [1073.93, 599.45], [1073.93, 499.67]] },
  ];
  const DOT_R = 6.5867;   /* カンプの Ellipse 87〜92 = 13.173px */

  /* ---- 箱（カンプ実測 109.778×109.778 / r10）----
     kind: css   = ガラス箱を CSS で作りアイコン SVG を中に置く
           asset = カンプが箱ごと1枚のSVGで書き出しているもの（そのまま置く）
           empty = アイコン無しのフェード箱 */
  /* 【2026-08-19 ヒデさん指定】アイコン4種はループアニメ化（下の ICO_ANIM 参照）。
     箱ごと1枚SVG(asset)や固定アイコンはやめ、全部「白ガラス箱 + パーツ組み立て」に。
     組み立て済みの静止状態＝カンプの見た目（アニメOFF時はこの状態に戻る） */
  const BOXES = [
    { id: 'folder', kind: 'css',   x: 584.20, y: 203.89 },
    { id: 'mail',   kind: 'css',   x: 584.20, y: 490.68 },
    { id: 'tc',     kind: 'empty', x: 967.12, y: 101.81, flip: false },
    { id: 'bc',     kind: 'empty', x: 895.15, y: 709.97, flip: true },
    { id: 'chart',  kind: 'css',   x: 1228.66, y: 214.09 },
    { id: 'cal',    kind: 'css',   x: 1256.22, y: 542.14 },
  ];
  const BOX_S = 109.778;

  /* ===== アイコンのループアニメ =====
     【2026-08-19 ヒデさん指定】Figma Make「Create Icon Animations」(GE91u2SPWqjwNbNizrDy8R)
     の App.tsx から移植。形状・座標・SVGパス・ガラスのスタイルは全て Make の実測値のまま。
     Make のカードは 109.778px 角＝この KV の箱と同寸なので、
     「Make の絶対座標 − カード原点(フォルダ25/メール171.78/グラフ318.56/カレンダー465.33)」
     がそのまま箱内の相対座標になる。1周6秒・無限ループ。
     【2026-08-19 ヒデさん指定・改】Make 原案の「出ては消える」演出は廃止。
     全パーツ常時表示のまま、アイコンの中で「ちょっと動く」控えめなループに変更。
     KV.setIconAnim(false) で全停止＝静止状態（カンプの見た目）に戻る。 */
  const ICO_D   = 6000;                              /* Make: const D = 6 (秒) */
  const ICO_LIN = 'linear';
  const ICO_IO  = 'cubic-bezier(0.45, 0, 0.55, 1)';  /* なめらかな ease-in-out */
  /* pulse: 1周(6秒)のうち s の位置で一度だけ、w×2 の時間かけて dip して戻る。
     不透明度は一切いじらない（消えるアニメ禁止）ので transform 1トラックだけ */
  const pulse = (f, base, dip, s, w) => ({
    f, v: [base, base, dip, base, base],
    t: [0, s, s + w, s + w * 2, 1],
    e: [ICO_LIN, ICO_IO, ICO_IO, ICO_LIN],
  });
  /* Make の svg-2977cc967k.ts より（パスは一切いじらない） */
  const ICO_PATHS = {
    tab:    'M0 13.7482C0 10.3001 2.49286 7.35737 5.89406 6.7905L46.0508 0.0977185C50.3502 -0.618855 54.2641 2.69668 54.2641 7.05542V14.2852C54.2641 18.1808 51.106 21.3389 47.2104 21.3389H7.05368C3.15804 21.3389 0 18.1808 0 14.2852V13.7482Z',
    vlines: 'M0.457 0.662883C1.13924 -0.133058 2.33753 -0.225235 3.13348 0.457L27.2369 21.1171C27.9477 21.7264 28.9967 21.7264 29.7075 21.1171L53.8109 0.457C54.6069 -0.225235 55.8052 -0.133058 56.4874 0.662883C57.1696 1.45882 57.0775 2.65712 56.2815 3.33936L32.1781 23.9994C30.0456 25.8273 26.8988 25.8273 24.7663 23.9994L0.662883 3.33936C-0.133058 2.65712 -0.225235 1.45882 0.457 0.662883Z',
    cyl1:   'M0 4.07842C0 1.82597 1.82597 0 4.07842 0H8.15684C10.4093 0 12.2353 1.82597 12.2353 4.07842V20.3921C12.2353 22.6445 10.4093 24.4705 8.15684 24.4705H4.07842C1.82597 24.4705 0 22.6445 0 20.3921V4.07842Z',
    cyl2:   'M28.5489 4.07842C28.5489 1.82597 30.3749 0 32.6273 0H36.7058C38.9582 0 40.7842 1.82597 40.7842 4.07842V20.3921C40.7842 22.6445 38.9582 24.4705 36.7058 24.4705H32.6273C30.3749 24.4705 28.5489 22.6445 28.5489 20.3921V4.07842Z',
  };
  /* ガラス面の共通スタイル（Make の3層を1枚に統合。見た目は同じ） */
  const icoGrad  = deg => `linear-gradient(${deg}deg, rgba(130,232,255,0.2) 0%, rgba(55,159,255,0.2) 100%), linear-gradient(90deg, rgba(241,241,241,0.1), rgba(241,241,241,0.1))`;
  const icoGlass = (r, blur, bw, sy, sb, deg) =>
    `position:absolute;border-radius:${r}px;background-image:${icoGrad(deg)};` +
    `backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);` +
    `border:${bw}px solid #7EE5FF;box-shadow:inset 0 ${sy}px ${sb}px rgba(255,255,255,0.4);`;
  const icoBar =   /* 棒グラフのガラス棒（Make の barStyle） */
    'position:absolute;border-radius:5.46px;transform-origin:50% 100%;' +
    'backdrop-filter:blur(5.46px);-webkit-backdrop-filter:blur(5.46px);' +
    'background-image:linear-gradient(108.7deg, rgba(130,232,255,0.2) 0%, rgba(55,159,255,0.2) 100%);' +
    'background-color:rgba(241,241,241,0.1);border:0.73px solid rgba(126,229,255,0.72);' +
    'box-shadow:inset 0 1.82px 3.64px rgba(255,255,255,0.4);';
  const icoCell =  /* カレンダーの日付セル */
    'position:absolute;border-radius:4.078px;background:rgba(255,255,255,0.16);' +
    'box-shadow:inset 0 2.039px 2.039px rgba(255,255,255,0.4);';
  const trY  = v => `translateY(${v}px)`;
  const trS  = v => `scale(${v})`;
  const trSY = v => `scaleY(${v})`;
  const FOLDER_TAB_HTML =
    `<div style="position:absolute;inset:5.62% 0 0 0"><svg style="display:block;width:100%;height:100%" fill="none" preserveAspectRatio="none" viewBox="0 0 54.2641 21.3389"><path d="${ICO_PATHS.tab}" fill="url(#kvfg)"/><defs><linearGradient id="kvfg" gradientUnits="userSpaceOnUse" x1="0" x2="49.6165" y1="-1.27116" y2="28.9653"><stop stop-color="#82E8FF"/><stop offset="1" stop-color="#379FFF"/></linearGradient></defs></svg></div>`;
  const MAIL_VLINES_HTML =
    `<svg style="display:block;width:100%;height:100%" fill="none" preserveAspectRatio="none" viewBox="0 0 56.9444 25.3703"><g filter="url(#kvmf)"><path clip-rule="evenodd" fill-rule="evenodd" d="${ICO_PATHS.vlines}" fill="white" fill-opacity="0.16"/></g><defs><filter id="kvmf" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" x="0" y="0" width="56.9444" height="27.2685"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape"/><feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dy="1.89814"/><feGaussianBlur stdDeviation="0.949072"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.4 0"/><feBlend in2="shape" mode="normal" result="effect1_innerShadow"/></filter></defs></svg>`;
  const CAL_TABS_HTML =
    `<svg style="display:block;width:100%;height:100%" fill="none" preserveAspectRatio="none" viewBox="0 0 40.7842 24.4705"><path d="${ICO_PATHS.cyl1}" fill="url(#kvcg1)"/><path d="${ICO_PATHS.cyl2}" fill="url(#kvcg2)"/><defs><linearGradient id="kvcg1" gradientUnits="userSpaceOnUse" x1="0" x2="43.3722" y1="0" y2="18.355"><stop stop-color="#82E8FF"/><stop offset="1" stop-color="#379FFF"/></linearGradient><linearGradient id="kvcg2" gradientUnits="userSpaceOnUse" x1="0" x2="43.3722" y1="0" y2="18.355"><stop stop-color="#82E8FF"/><stop offset="1" stop-color="#379FFF"/></linearGradient></defs></svg>`;
  /* カレンダー日付セル: [x, y, w, h]。ヘッダー帯→上段→下段の順に時差でふわっと縮んで戻る */
  const calCells = [
    [26.08, 38.54, 57.098,  8.157],   /* ヘッダー帯 */
    [26.08, 50.78, 16.314, 12.235],
    [46.48, 50.78, 16.314, 12.235],
    [66.87, 50.78, 16.314, 12.235],
    [26.08, 67.09, 16.314, 12.235],
    [46.48, 67.09, 16.314, 12.235],
    [66.87, 67.09, 16.314, 12.235],
  ].map(([x, y, w, h], i) => ({
    x, y, w, h, css: icoCell,
    tr: pulse(trS, 1, 0.85, 0.04 + i * 0.045, 0.06),
  }));
  /* 各アイコンのパーツ（配列順 = 重なり順）。形状・座標は Make 実測のまま、
     動きは「常時表示のまま、時差でひと呼吸だけ動く」パルスに置き換え。
     位相はアイコンごとにずらす: カレンダー0.05 → フォルダ0.16 → メール0.42 → グラフ0.68 */
  const ICO_ANIM = {
    folder: [
      { x: 28.20, y: 16.56, w: 54.264, h: 22.61, html: FOLDER_TAB_HTML,
        tr: pulse(trY, 0, -2.5, 0.16, 0.09) },                 /* タブがひょこっと持ち上がる */
      { x: 19.16, y: 30.12, w: 72.352, h: 54.264, css: icoGlass(7.11, 10.581, 1.411, 3.527, 14.107, 108.7),
        tr: pulse(trY, 0, 1.2, 0.18, 0.09) },                  /* ガラス面はわずかに沈む(対の動き) */
    ],
    mail: [
      { x: 29.02, y: 24.84, w: 51.737, h: 22.173,              /* 封筒の中の色面がのぞく */
        css: 'position:absolute;border-radius:3.696px;background-image:linear-gradient(120.65deg, #82E8FF 0%, #379FFF 100%);',
        tr: pulse(trY, 0, -3, 0.42, 0.09) },
      { x: 17.93, y: 28.54, w: 73.91, h: 55.433, css: icoGlass(11.087, 5.543, 0.739, 1.848, 7.391, 108.7) },
      { x: 26.41, y: 37.33, w: 56.944, h: 25.37, html: MAIL_VLINES_HTML,
        tr: pulse(trS, 1, 1.06, 0.45, 0.09) },                 /* V字ラインが軽くふくらむ */
    ],
    chart: [
      { x: 18.46, y: 80.38, w: 76.485, h: 10.926,              /* 土台の濃いグラデ: 静止 */
        css: 'position:absolute;border-radius:3.642px;background-image:linear-gradient(150.64deg, #82E8FF 0%, #379FFF 100%);' },
      { x: 22.10, y: 43.96, w: 18.21, h: 43.71, css: icoBar,   /* 棒3本が左→中→右で軽く上下 */
        tr: pulse(trSY, 1, 0.88, 0.68, 0.07) },
      { x: 47.60, y: 22.11, w: 18.21, h: 65.56, css: icoBar,
        tr: pulse(trSY, 1, 0.86, 0.74, 0.07) },
      { x: 73.10, y: 54.89, w: 18.21, h: 32.78, css: icoBar,
        tr: pulse(trSY, 1, 0.90, 0.80, 0.07) },
    ],
    cal: [
      { x: 34.24, y: 22.23, w: 40.784, h: 24.4705, html: CAL_TABS_HTML,
        tr: pulse(trY, 0, -1.8, 0.05, 0.08) },                 /* 円柱2本がひょこっと浮く */
      { x: 17.93, y: 30.38, w: 73.412, h: 57.098, css: icoGlass(12.235, 6.118, 0.816, 2.039, 8.157, 108.08) },
    ].concat(calCells),
  };
  const icoParts = [];   /* { el, p } — アニメ対象パーツ */
  const icoAnims = [];   /* 稼働中の WAAPI Animation（オフで全 cancel） */
  let icoOn = true;
  function buildIconParts(b, face) {
    const defs = ICO_ANIM[b.id]; if (!defs) return;
    const wrap = document.createElement('div');
    wrap.className = 'kv-ico-parts';   /* setIconColor のフィルタはこの箱ごと掛かる */
    wrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    defs.forEach(pt => {
      const d = document.createElement('div');
      d.style.cssText = (pt.css || 'position:absolute;') +
        `left:${pt.x}px;top:${pt.y}px;width:${pt.w}px;height:${pt.h}px;`;
      if (pt.html) d.innerHTML = pt.html;
      wrap.appendChild(d);
      if (pt.op || pt.tr) icoParts.push({ el: d, p: pt });
    });
    face.appendChild(wrap);
  }
  /* Make のキーフレーム（values/times/ease配列）を WAAPI 形式へ。
     easing はその区間の入口キーフレームに付ける（Web Animations の仕様どおり） */
  function icoKF(track, isTr) {
    return track.t.map((t, i) => {
      const kf = { offset: t, easing: track.e[i] || 'linear' };
      if (isTr) kf.transform = track.f(track.v[i]); else kf.opacity = track.v[i];
      return kf;
    });
  }
  function setIconAnim(on) {
    icoOn = !!on;
    icoAnims.forEach(a => a.cancel()); icoAnims.length = 0;
    if (!icoOn) return;   /* 止めると基準スタイル＝全パーツそろった静止状態に戻る */
    icoParts.forEach(({ el, p }) => {
      if (p.op) icoAnims.push(el.animate(icoKF(p.op, false), { duration: ICO_D, iterations: Infinity }));
      if (p.tr) icoAnims.push(el.animate(icoKF(p.tr, true),  { duration: ICO_D, iterations: Infinity }));
    });
  }

  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
  function polyAt(p, t) {
    const total = polyLen(p); let d = t * total;
    for (let i = 1; i < p.length; i++) {
      const seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (d <= seg || i === p.length - 1) { const k = seg ? d / seg : 0; return [lerp(p[i - 1][0], p[i][0], k), lerp(p[i - 1][1], p[i][1], k)]; }
      d -= seg;
    }
    return p[p.length - 1];
  }

  /* ===== グラデーション LUT（512×2・循環）=====
     【2026-08-19 ヒデさん指定】キーフレーム補間はガタつくのでやめ、
     「循環するグラデ帯を一定速度でスクロール」する方式に。完全に滑らかな一方向。
     row0 = 対角の帯（カンプ F1 実測の並びを循環化: cy→bl→wh→mg→lb→cy）
     row1 = 放射の帯（カンプ 15332 実測: 薄ピンク→マゼンタ→シアン→濃青 を循環化）
     シェーダーは fract() でサンプルするので、先頭と末尾の色は必ず一致させること。 */
  const LUT_N = 512;
  const lutData = new Uint8Array(LUT_N * 2 * 4);
  const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  /* 対角（カンプF1のストップ間隔を周期1.332で正規化・lb→cyの橋で一周） */
  const ROW0 = [
    ['#0EBBFF', 0.0000], ['#477ED1', 0.0621], ['#EFEEEF', 0.2364],
    ['#FF5D97', 0.5397], ['#B6E0FF', 0.7897], ['#0EBBFF', 1.0000],
  ];
  /* 放射（カンプ 15332:18998 実測。0.92 に圧縮し、末尾→先頭の橋を足して循環化） */
  const ROW1_RAW = [
    ['#FEE0F8', 0.142], ['#FF9EC7', 0.356], ['#FF7EAF', 0.463], ['#FF5D97', 0.570],
    ['#C375B1', 0.644], ['#878CCB', 0.719], ['#6898D8', 0.756], ['#4AA4E5', 0.793],
    ['#2CAFF2', 0.830], ['#0EBBFF', 0.867], ['#2B9CE8', 0.933], ['#477ED1', 1.000],
  ];
  const ROW1 = [['#FEE0F8', 0]].concat(ROW1_RAW.map(([c, p]) => [c, p * 0.92])).concat([['#FEE0F8', 1.0]]);
  function bakeRow(stops, row) {
    const st = stops.map(([c, p]) => ({ c: hex2rgb(c), p })).sort((a, b) => a.p - b.p);
    for (let i = 0; i < LUT_N; i++) {
      const x = i / (LUT_N - 1);
      let c = st[st.length - 1].c;
      if (x <= st[0].p) c = st[0].c;
      else for (let k = 1; k < st.length; k++) if (x <= st[k].p) {
        const a2 = st[k - 1], b2 = st[k], u = (x - a2.p) / Math.max(1e-6, b2.p - a2.p);
        c = [lerp(a2.c[0], b2.c[0], u), lerp(a2.c[1], b2.c[1], u), lerp(a2.c[2], b2.c[2], u)]; break;
      }
      const o = (row * LUT_N + i) * 4;
      lutData[o] = c[0]; lutData[o + 1] = c[1]; lutData[o + 2] = c[2]; lutData[o + 3] = 255;
    }
  }
  bakeRow(ROW0, 0); bakeRow(ROW1, 1);

  /* ===== シェーダー（ディザはカンプ同様ベイヤー8で全域均一） ===== */
  const VS = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos,0.0,1.0);} ';
  const FS = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uMode;    /* 0=グラデ(LUT) 1=V1.0ハーフトーン */
uniform float uFlow;    /* 0=一方向 1=混ざる 2=端→中央 3=軸ゆらぎ 4=中央→端 */
uniform float uEnergy;
uniform float uAspect;
uniform float uCell;
uniform vec4  uPA;      /* x=速度 y=帯の広がり z=混ざり強さ w=混ざり速さ */
uniform vec4  uPB;      /* x=揺れ幅(rad) y=揺れ速さ z=放射の速度 w=放射の密度 */
uniform vec2  uPC;      /* x=ハーフトーン波速 y=うねり */
uniform vec2  uPD;      /* x=ドットのなじみ(AA幅) y=網点の角度(度) */
uniform sampler2D uLUT; /* 512×2: row0=対角の循環帯 / row1=放射の循環帯 */

/* Figma のレイヤー効果 実測: Bayer16×16 / Size1 / Levels3 / 明るさ104% / コントラスト1.38 */
float bayer2(vec2 a){ a=floor(a); return fract(a.x/2.0 + a.y*a.y*0.75); }
float bayer4(vec2 a){ return bayer2(0.5*a)*0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5*a)*0.25 + bayer2(a); }
float bayer16(vec2 a){ return bayer8(0.5*a)*0.25 + bayer2(a); }
float hash(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+34.5); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }

vec3 rampV1(float x){
  x = clamp(x, 0.0, 1.0);
  vec3 mg = vec3(1.000, 0.365, 0.592);
  vec3 pu = vec3(0.502, 0.459, 0.863);
  vec3 bl = vec3(0.102, 0.659, 0.984);
  vec3 cy = vec3(0.043, 0.867, 1.000);
  vec3 wh = vec3(0.918, 1.000, 1.000);
  if (x < 0.075) return mix(mg, pu, x / 0.075);
  if (x < 0.115) return mix(pu, bl, (x - 0.075) / 0.040);
  if (x < 0.355) return mix(bl, cy, (x - 0.115) / 0.240);
  if (x < 0.915) return mix(cy, mix(cy, wh, 0.22), (x - 0.355) / 0.560);
  return mix(mix(cy, wh, 0.22), wh, (x - 0.915) / 0.085);
}
float sdRound(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b+r; return min(max(d.x,d.y),0.0)+length(max(d,0.0))-r; }

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 P0 = (fc*2.0 - uRes)/uRes.y;

  /* グラデは全面。角丸(13px相当)だけ落とす（余白の枠を作らない） */
  vec2 hs = vec2(uAspect, 1.0);
  float sd = sdRound(P0, hs, 0.143);
  float pxw = 2.0/uRes.y;
  float mask = 1.0 - smoothstep(-1.5*pxw, 1.5*pxw, sd);
  if (mask <= 0.0){ gl_FragColor = vec4(0.0); return; }

  vec3 col;
  if (uMode < 0.5) {
    float tm = uTime;
    float speed = uPA.x, scale = uPA.y;
    vec2 DIR = vec2(-0.75512, 0.65559);      /* カンプ 229.049° */
    float L = 2.0*hs.x*0.75512 + 2.0*hs.y*0.65559;

    /* ===== ガタつき対策（2026-08-20 フレーム解析レポート反映）=====
       ・位相は performance.now 由来の時刻だけで決める完全単調。
         以前あった「ドット到着エネルギーで位相を-0.04*eズラす」演出は、
         不規則な逆行(実測35%)とランダムウォーク的な揺れの主因だったので廃止。
       ・網点セルへの量子化(セル中心での色再計算)も廃止。色はピクセル単位の連続値。
       ・「動きが絵に出ない」問題は下の AA付き量子化で解決する。 */
    float row = 0.25;
    float sample_;
    if (uFlow < 0.5) {          /* ① 一方向 */
      float t = 0.5 + dot(vec2(P0.x, -P0.y), DIR)/L;
      sample_ = t*scale + tm*speed;
    } else if (uFlow < 1.5) {   /* ② 混ざり合い（ノイズ項はこのモードの意図的表現） */
      float t = 0.5 + dot(vec2(P0.x, -P0.y), DIR)/L;
      float w = vnoise(vec2(P0.x, -P0.y)*1.6 + tm*uPA.w) - 0.5;
      sample_ = t*scale + tm*speed + w*uPA.z;
    } else if (uFlow < 2.5) {   /* ③ 端→中央（カンプ15332） */
      row = 0.75;
      float rr = length(vec2(P0.x/uAspect, P0.y)) / 1.42;
      sample_ = rr*uPB.w + tm*uPB.z;
    } else if (uFlow < 3.5) {   /* ④ 軸ゆらぎ */
      float ang = sin(tm*uPB.y)*uPB.x;
      vec2 D2 = vec2(DIR.x*cos(ang) - DIR.y*sin(ang), DIR.x*sin(ang) + DIR.y*cos(ang));
      float t2 = 0.5 + dot(vec2(P0.x, -P0.y), D2)/L;
      sample_ = t2*scale + tm*speed;
    } else {                    /* ⑤ 中央→端 */
      row = 0.75;
      float rr = length(vec2(P0.x/uAspect, P0.y)) / 1.42;
      sample_ = rr*uPB.w - tm*uPB.z;
    }

    /* 網点は画面固定。uPD.y で格子だけ回転できる（0°=カンプどおり軸平行。
       レポート指摘: グラデ45°×格子0°は行単位で一斉点滅する最悪の組合せ。
       15°前後にずらすと切替が個別セルに分散する） */
    float ga = radians(uPD.y);
    mat2 GR = mat2(cos(ga), -sin(ga), sin(ga), cos(ga));
    float dith = bayer16(floor(GR*fc/uCell));

    vec3 src = texture2D(uLUT, vec2(fract(sample_), row)).rgb;
    src = clamp(src * 1.04, 0.0, 1.0);
    src = clamp((src - 0.5) * 1.38 + 0.5, 0.0, 1.0);

    /* ===== AA付き Levels3 量子化（レポート修正案Aの核心）=====
       旧: floor(x)/2 の完全二値 → 1フレーム0.2pxの進みが7フレームに1回の
           「ドット一斉点灯」に丸められ、体感8.7Hzだった。
       新: 段が上がる手前 aa ぶんを smoothstep で滑らかに繋ぐ。
           各ドットが数フレームかけてフェード点灯するので、60fpsぶん全部絵に出る。
       aa(uPD.x)はパネルの「ドットのなじみ」。小さくするほどカンプの2値に近づく */
    vec3 xq = src * 2.0 + vec3(dith);
    float aa = clamp(uPD.x, 0.005, 0.6);
    col = clamp((floor(xq) + smoothstep(vec3(1.0 - aa), vec3(1.0), fract(xq))) / 2.0, 0.0, 1.0);
  } else {
    /* V1.0 ハーフトーン（ディザ無し・滑らか） */
    vec2 pc = vec2(P0.x, -P0.y);
    vec2 axis = normalize(vec2(0.70, 0.62));
    float u = dot(pc, axis) / 0.9;
    float v = dot(pc, vec2(-axis.y, axis.x)) / 0.9;
    float wave = u*2.2 + sin(v*2.1 + uTime*0.5)*uPC.y - uTime*uPC.x;
    float lum = 0.5 + 0.5*sin(wave*3.14159265);
    lum += (vnoise(pc*2.4 + uTime*0.1) - 0.5)*0.10;
    lum += 0.15*uEnergy;
    col = rampV1(clamp(lum, 0.0, 1.0));
  }
  gl_FragColor = vec4(col*mask, mask);
}`;

  function makeGL(canvas) {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) return null;
    const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('[KV]', gl.getShaderInfoLog(s)); return null; } return s; };
    const v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return null;
    const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('[KV]', gl.getProgramInfoLog(p)); return null; }
    gl.useProgram(p);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const U = n => gl.getUniformLocation(p, n);
    const u = { uRes: U('uRes'), uTime: U('uTime'), uMode: U('uMode'), uEnergy: U('uEnergy'), uAspect: U('uAspect'), uCell: U('uCell'), uFlow: U('uFlow'), uPA: U('uPA'), uPB: U('uPB'), uPC: U('uPC'), uPD: U('uPD'), uLUT: U('uLUT') };
    gl.uniform1i(u.uLUT, 0);
    /* LUT は静的（循環グラデ2本）。ここで1回だけ焼き込む */
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LUT_N, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, lutData);
    return {
      draw(w, h, o) {
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform2f(u.uRes, w, h); gl.uniform1f(u.uTime, o.time); gl.uniform1f(u.uMode, o.mode);
        gl.uniform1f(u.uEnergy, o.energy); gl.uniform1f(u.uAspect, o.aspect); gl.uniform1f(u.uCell, o.cell); gl.uniform1f(u.uFlow, o.flow || 0);
        gl.uniform4f(u.uPA, PARAMS.speed, PARAMS.scale, PARAMS.mixAmp, PARAMS.mixSpeed);
        gl.uniform4f(u.uPB, PARAMS.swayAmp, PARAMS.swaySpeed, PARAMS.radSpeed, PARAMS.radScale);
        gl.uniform2f(u.uPC, PARAMS.htSpeed, PARAMS.htSwell);
        gl.uniform2f(u.uPD, PARAMS.ditherAA, PARAMS.gridAngle);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  }
  function fallbackGL(canvas) {
    const ctx = canvas.getContext('2d');
    return { draw(w, h) { if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const g = ctx.createLinearGradient(w, 0, 0, h);
      g.addColorStop(0, '#0EBBFF'); g.addColorStop(0.281, '#0EBBFF');
      g.addColorStop(0.364, '#477ED1'); g.addColorStop(0.596, '#EFEEEF'); g.addColorStop(1, '#FF5D97');
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); } };
  }

  /* ===================== 構築 ===================== */
  let rootEl = null, agentMode = 0;
  /* 調整パネルから触れるパラメータ（2026-08-19 ヒデさん指定） */
  const PARAMS = {
    speed: 0.035,     /* 一方向/混ざる/軸ゆらぎ: 流れる速度 */
    scale: 0.75,      /* 同: 帯の広がり（小さいほど色の帯が太い） */
    mixAmp: 0.5,      /* 混ざる: 渦の強さ */
    mixSpeed: 0.08,   /* 混ざる: 渦の動く速さ */
    swayAmp: 0.35,    /* 軸ゆらぎ: 揺れ幅(rad) */
    swaySpeed: 0.13,  /* 軸ゆらぎ: 揺れの速さ */
    radSpeed: 0.030,  /* 端→中央/中央→端: 流れる速度 */
    radScale: 0.80,   /* 同: リングの密度 */
    htSpeed: 0.30,    /* ハーフトーン: 波の速さ */
    htSwell: 0.28,    /* ハーフトーン: うねり */
    ditherAA: 0.06,   /* ドットのなじみ(AA幅)。0に近いほどカンプの2値に近い(=ガタつきも戻る) */
    gridAngle: 0,     /* 網点の角度(度)。0=カンプどおり。15前後で行単位の一斉点滅が散る */
  };
  function start(cfg) {
    cfg = cfg || {};
    const root = document.getElementById(cfg.mount || 'kv');
    rootEl = root;
    root.classList.add('kv-root', 'mode-flat');

    const stage = document.createElement('div'); stage.className = 'kv-stage'; root.appendChild(stage);
    const world = document.createElement('div'); world.className = 'kv-world'; stage.appendChild(world);

    /* 線＋ドット（カンプのパス座標をそのまま描く） */
    const svg = el('svg', { class: 'kv-lines', viewBox: `0 0 ${STAGE.w} ${STAGE.h}` });
    svg.setAttribute('width', STAGE.w); svg.setAttribute('height', STAGE.h);
    world.appendChild(svg);
    const dots = [];
    /* 【2026-08-20 ヒデさん依頼】線の見せ方5案の比較用。
       各線は track(パイプ案の受け皿)/main(本線)/glow(通過グロー案) の3層で作り、
       KV.setLineStyle() のクラス切替でどの層を見せるか決める。
       グラデ案用に「各線の始点(箱)→終点(エージェント)」のブランド色グラデも defs に用意 */
    const lineDefs = el('defs', {});
    svg.appendChild(lineDefs);
    LINES.forEach((ln, i) => {
      const p0 = ln.pts[0], pe = ln.pts[ln.pts.length - 1];
      const g = el('linearGradient', { id: 'kvlg' + i, gradientUnits: 'userSpaceOnUse',
        x1: p0[0], y1: p0[1], x2: pe[0], y2: pe[1] });
      g.appendChild(el('stop', { offset: '0', 'stop-color': '#0EBBFF' }));
      g.appendChild(el('stop', { offset: '1', 'stop-color': '#FF5D97' }));
      lineDefs.appendChild(g);
    });
    LINES.forEach((ln, i) => {
      const d = 'M' + ln.pts.map(p => `${p[0]} ${p[1]}`).join(' L');
      svg.appendChild(el('path', { d, class: 'kv-line-track', fill: 'none' }));
      svg.appendChild(el('path', { d, class: 'kv-line', fill: 'none' }));
      const glowP = el('path', { d, class: 'kv-line-glow', fill: 'none' });
      glowP.style.stroke = ln.dot; glowP.style.color = ln.dot;   /* currentColor で発光色も同じに */
      svg.appendChild(glowP);
      /* 【2026-08-19 ヒデさん指定】ドットは SVG の円だとアイソメで床ごと倒れて
         平べったく見える。div の球体（ラジアルグラデ＋影）にして、
         傾けたビューでは常にカメラへ向ける（ビルボード）。 */
      const c = document.createElement('div');
      c.className = 'kv-dot3';
      /* 【2026-08-19 ヒデさん指定】3Dの球体はやめる。
         2Dの平らな円のまま、傾いたビューでは常にカメラへ向ける（ビルボード）。
         床ごと倒れないので楕円に潰れず、カンプの見た目のまま立体空間に馴染む */
      c.style.setProperty('--dc', ln.dot);
      world.appendChild(c);
      dots.push({ ln, node: c, t: (i * 0.37) % 1, speed: 0.14 * (0.9 + 0.25 * (i % 3) / 2), len: polyLen(ln.pts), glow: glowP });
    });

    /* 白キューブの厚み（Blender風）。z=0 が天面、下へ layers 枚重ねて側面を作る。
       ぼかした接地影も敷いて、上からのソフトな光で置いてある感じにする */
    function buildSlab(host, thick, layers, lightTop) {
      const sh = document.createElement('div'); sh.className = 'kv-slab-shadow';
      sh.style.transform = `translateZ(${-thick - 2}px)`;
      host.appendChild(sh);
      for (let i = layers; i >= 1; i--) {
        const L = document.createElement('div'); L.className = 'kv-slab-layer';
        const k = i / layers;                     /* 1=最下段 */
        const light = lightTop ? 1 : 0;
        L.style.transform = `translateZ(${(-thick * k).toFixed(2)}px)`;
        L.style.background = light
          ? `hsl(222 30% ${92 - 14 * k}%)`        /* 白キューブの側面（下ほど陰） */
          : `hsl(222 34% ${86 - 20 * k}%)`;
        host.appendChild(L);
      }
    }

    /* 箱（3種類の作りをカンプどおりに） */
    BOXES.forEach(b => {
      const d = document.createElement('div');
      d.className = 'kv-box kv-box--' + b.kind;
      d.style.left = b.x + 'px'; d.style.top = b.y + 'px';
      d.style.width = BOX_S + 'px'; d.style.height = BOX_S + 'px';
      /* 【2026-08-19 ヒデさん指定】Blender風キューブは 幅=縦=高さ を統一して
         きれいな立方体に見せる。厚み = 一辺(109.778px)そのもの */
      buildSlab(d, BOX_S, 28, true);   /* 枚数が少ないと側面が縞になる（12枚で実際に縞が出た） */
      const face = document.createElement('div'); face.className = 'kv-face';
      d.appendChild(face);
      b._face = face;   /* アイコン色変更(setIconColor)が参照する */
      buildIconParts(b, face);   /* アイコン4種はここでパーツを組む（Make実測） */
      if (b.kind === 'asset') {
        fetch(b.svg).then(r => r.text()).then(t => { face.innerHTML = t; const s = face.querySelector('svg');
          if (s) { s.style.width = '100%'; s.style.height = '100%'; s.style.display = 'block'; } });
      } else if (b.kind === 'empty') {
        if (b.flip) face.classList.add('is-flip');
      } else if (b.icon) {
        fetch(b.icon.svg).then(r => r.text()).then(t => {
          const w = document.createElement('div'); w.className = 'kv-box-ico';
          w.style.left = b.icon.x + 'px'; w.style.top = b.icon.y + 'px';
          w.style.width = b.icon.w + 'px'; w.style.height = b.icon.h + 'px';
          w.innerHTML = t; const s = w.querySelector('svg');
          if (s) { s.style.width = '100%'; s.style.height = '100%'; s.style.display = 'block'; }
          face.appendChild(w);
        });
      } else if (b.lightBlue24) {
        /* カンプの Light-Blue-24 インスタンス: 色バー(グラデ) + ガラスSVG */
        const w = document.createElement('div'); w.className = 'kv-lb24';
        const bar = document.createElement('div'); bar.className = 'kv-lb24-bar'; w.appendChild(bar);
        const glass = document.createElement('div'); glass.className = 'kv-lb24-glass';
        fetch('assets/icon-cal-glass.svg').then(r => r.text()).then(t => { glass.innerHTML = t;
          const s = glass.querySelector('svg'); if (s) { s.style.width = '100%'; s.style.height = '100%'; s.style.display = 'block'; } });
        w.appendChild(glass);
        face.appendChild(w);
      }
      world.appendChild(d);
    });

    /* エージェント */
    const agentBox = document.createElement('div'); agentBox.className = 'kv-agent';
    agentBox.style.left = AGENT.x + 'px'; agentBox.style.top = AGENT.y + 'px';
    agentBox.style.width = AGENT.w + 'px'; agentBox.style.height = AGENT.h + 'px';
    agentBox.style.borderRadius = AGENT.r + 'px';
    buildSlab(agentBox, 30, 12, false);
    const canvas = document.createElement('canvas'); canvas.className = 'kv-agent-cv'; agentBox.appendChild(canvas);
    world.appendChild(agentBox);
    const agent = makeGL(canvas) || fallbackGL(canvas);

    function fit() {
      const rw = root.clientWidth, rh = root.clientHeight;
      const s = Math.min(rw / STAGE.w, rh / STAGE.h);
      stage.style.transform = `translate(${(rw - STAGE.w * s) / 2}px, ${(rh - STAGE.h * s) / 2}px) scale(${s})`;
      root._scale = s;
    }
    window.addEventListener('resize', fit); fit();

    let energy = 0, last = performance.now();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    /* 検証用: ?freeze=1 で静止状態に固定 */
    const qs = new URLSearchParams(location.search);
    const FREEZE = qs.get('freeze') === '1';
    setIconAnim(!FREEZE);   /* アイコンのループアニメ開始（?freeze=1 なら静止） */
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const time = FREEZE ? 0 : now / 1000;
      dots.forEach(d => {
        d.t += d.speed * dt;
        if (d.t >= 1) { d.t -= 1; energy = Math.min(1.2, energy + 0.4); }
        const pos = polyAt(d.ln.pts, d.t);
        /* 【2026-08-19 ヒデさん指定】終点(エージェント)で急に消えず、
           到達する頃にフェードアウト＋少し縮んで「取り込まれる」感じにする。
           出はじめも軽くフェードイン。 */
        const fadeIn = Math.min(1, d.t / 0.10);
        const fadeOut = Math.min(1, (1 - d.t) / 0.16);
        const shrink = 1 - 0.35 * Math.max(0, 1 - (1 - d.t) / 0.16);
        /* ⚠️ z はエージェントの面(2.5px)より必ず低くする。7px にしていた時、
           ドットがエージェントの上を滑って見えた（ヒデさん報告）。
           線(z=0)よりは上、面より下の 1px に置く */
        d.node.style.transform = `translate3d(${(pos[0] - DOT_R).toFixed(1)}px, ${(pos[1] - DOT_R).toFixed(1)}px, 1px) ${view.billboard} scale(${shrink.toFixed(3)})`;
        /* 【2026-08-19 ヒデさん指定】道中は完全不透明（下の線が透けない）。
           フェードは出はじめと取り込まれる端だけ */
        d.node.style.opacity = (fadeIn * fadeOut).toFixed(2);
        /* 線スタイル「通過で光る」: ドットの後ろ34pxぶんの軌道をドット色で光らせる。
           dasharray [光る長さ, 線全長+α] で光る区間は常に1つ。offset=G-s で位置追従 */
        if (lineStyle === 'glow') {
          const G = 34, sAlong = d.t * d.len;
          d.glow.style.strokeDasharray = G + ' ' + Math.ceil(d.len + G);
          d.glow.style.strokeDashoffset = (G - sAlong).toFixed(1);
          d.glow.style.opacity = d.node.style.opacity;
        }
      });
      energy = Math.max(0, energy - dt * 1.4);
      const s = (root._scale || 1) * dpr;
      /* ⚠️ Figma の Size=1 ＝「ステージ座標の1px」がディザ1セル。
         キャンバスのデバイスpx换算では scale×dpr がちょうど1セルになる */
      agent.draw(Math.max(2, Math.round(AGENT.w * s)), Math.max(2, Math.round(AGENT.h * s)),
        { time, mode: agentMode, flow: agentFlowRef.v, energy: FREEZE ? 0 : clamp01(energy),
          aspect: AGENT.w / AGENT.h, cell: Math.max(1, Math.round(s)) });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return root;
  }

  /* ===== ビュー（回転XYZ + 拡大率）=====
     普通(0,0,0)ならカンプそのまま。傾いている時は白キューブの3D表示に切り替わる */
  const view = { x: 0, y: 0, z: 0, s: 1, billboard: '' };
  function setView(v) {
    Object.assign(view, v);
    /* ドットをカメラへ向ける = ワールド回転の逆順・逆符号 */
    view.billboard = (view.x || view.y || view.z)
      ? `rotateZ(${-view.z}deg) rotateY(${-view.y}deg) rotateX(${-view.x}deg)` : '';
    const world = rootEl.querySelector('.kv-world');
    world.style.transform =
      `rotateX(${view.x}deg) rotateY(${view.y}deg) rotateZ(${view.z}deg) scale(${view.s})`;
    rootEl.classList.toggle('mode-3d', !!(view.x || view.y || view.z));
    rootEl.classList.toggle('mode-flat', !(view.x || view.y || view.z));
  }
  const VIEWS = {
    flat: { x: 0,  y: 0, z: 0,   s: 1.00 },
    d3:   { x: 26, y: 0, z: -14, s: 1.06 },   /* 3D ライト（浅い俯瞰） */
    iso1: { x: 54, y: 0, z: -42, s: 1.26 },   /* アイソメ標準 */
    iso2: { x: 40, y: 0, z: -28, s: 1.14 },   /* アイソメ浅め */
    iso3: { x: 62, y: 0, z: -45, s: 1.32 },   /* アイソメ深め */
    iso4: { x: 54, y: 0, z: 42,  s: 1.26 },   /* アイソメ右流し */
  };
  /* ===== 線の見せ方（2026-08-20 ヒデさん依頼の5案比較）=====
     plain=いま(カンプの白60%) / bold=濃いめ / dash=流れる破線 /
     grad=ブランドグラデ / pipe=パイプ / glow=通過で光る */
  let lineStyle = 'plain';
  function setLineStyle(m) {
    lineStyle = m;
    ['plain', 'bold', 'dash', 'grad', 'pipe', 'glow'].forEach(k =>
      rootEl.classList.toggle('line-' + k, k === m));
    /* グラデ案だけ各線に個別の stroke(始点→終点グラデ) を書く。他はCSSに任せる */
    rootEl.querySelectorAll('.kv-line').forEach((pth, i) => {
      pth.style.stroke = (m === 'grad') ? `url(#kvlg${i})` : '';
    });
  }
  /* ===== 線の色味（2026-08-20 第2弾）=====
     ヒデさん指定: 形は 実線(plain)/流れる破線(dash) を残し、色味・ライトの入り具合だけ変える。
     now=白60%(カンプ) / w95=白くっきり / glow1=白発光弱 / glow2=白発光強 /
     cyan=水色ライト / navy=淡ネイビー。形と色味は自由に組合せ可 */
  function setLineColor(m) {
    ['now', 'w95', 'glow1', 'glow2', 'cyan', 'navy'].forEach(k =>
      rootEl.classList.toggle('line-c-' + k, k === m));
  }
  let agentFlowRef = { v: 0 };
  function setAgentMode(m) {
    if (m === 'halftone') { agentMode = 1; return; }
    agentMode = 0;
    const map = { flow0: 0, flow1: 1, flow2: 2, flow3: 3, flow4: 4, grad: 0 };
    agentFlowRef.v = map[m] != null ? map[m] : 0;
  }

  /* ===== アイコンの色変更（2026-08-19 ヒデさん指定）=====
     カンプのアイコンSVGは青系ガラスの多層構造で、パスの塗りを個別に書き換えるのは
     現実的でない。単色ベース(青 h≈210°)なので、CSSフィルタで丸ごと色相を回す。
       hue-rotate = 目標色相 − 210° / saturate・brightness も目標のHSLから近似
     白・透明の部分は hue-rotate の影響をほぼ受けないので、ガラスの質感は保たれる。 */
  function hexToHsl(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return { h: 0, s: 0, l };
    const d = mx - mn;
    const sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h;
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (mx === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
    return { h, s: sat, l };
  }
  const ICON_BASE = { h: 210, s: 0.9, l: 0.62 };   /* カンプアイコンの支配色の実測近似 */
  function setIconColor(id, hex) {
    const box = BOXES.find(x => x.id === id);
    if (!box) return false;
    const host = box._face && (box._face.querySelector('.kv-ico-parts') || box._face.querySelector('.kv-box-ico') || box._face.querySelector('.kv-lb24') || box._face);
    if (!host) return false;
    if (!hex) { host.style.filter = ''; return true; }   /* 空文字で元の色へ */
    const c = hexToHsl(hex);
    if (!c) return false;
    const dh = Math.round(c.h - ICON_BASE.h);
    const sat = Math.max(0.02, Math.min(2, c.s / ICON_BASE.s));
    /* ⚠️ asset種(箱ごと1枚のSVG)は、明度補正が白い箱まで暗くしてグレーの箱になる
       （緑#22C55Eで実際にグレー化した）。箱を巻き込まないよう明度はほぼ固定にする */
    const briRange = box.kind === 'asset' ? [0.94, 1.10] : [0.55, 1.45];
    const bri = Math.max(briRange[0], Math.min(briRange[1], c.l / ICON_BASE.l));
    host.style.filter = `hue-rotate(${dh}deg) saturate(${sat.toFixed(2)}) brightness(${bri.toFixed(2)})`;
    return true;
  }

  function setParam(k, v) { if (k in PARAMS) PARAMS[k] = +v; }
  global.KV = { start, setView, getView: () => ({ ...view }), VIEWS, setAgentMode, setLineStyle, setLineColor, setIconColor, setIconAnim, isIconAnimOn: () => icoOn, setParam, getParams: () => ({ ...PARAMS }), STAGE, AGENT };
})(window);
