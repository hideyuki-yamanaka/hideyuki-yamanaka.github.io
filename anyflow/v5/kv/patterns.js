/* ============================================================
   キービジュアル V2 — 右側グラフィック 4案エンジン（KVP）v2
   添付4枚を忠実再現。中央=ダッシュボード / 周囲=Figmaアイコン部品
   ・アイコンは「本物の3D箱」（前面グリフ＋厚みスラブ＝上面/側面が見える）
   ・①③=白い回線ネットワーク＋青いデータ光が流れる / ②=同心円グロー / ④=単一軌道
   ・立体はビルボードをやめ、各要素が自前の3D transform を持つ（アイソメに乗る）
   切替: KVP.setPattern('p1'|'p2'|'p3'|'p4') / KVP.show() / KVP.hide()
   ============================================================ */
(function (global) {
  'use strict';

  const STAGE = { w: 1440, h: 920 };
  const C = { x: 1030, y: 430 };                 /* ダッシュボード中心 */
  const DASH = { w: 600, h: 358 };
  const dashRect = { l: C.x - DASH.w / 2, r: C.x + DASH.w / 2, t: C.y - DASH.h / 2, b: C.y + DASH.h / 2 };
  const ICO = 112;                                /* アイコン箱の一辺 */
  const ICONS_DIR = 'assets/icons/';
  const MASK_DIR = 'assets/masks/';   /* ガラス形状の不透明シルエット（backdrop-filterのマスク用） */

  /* Figma実測: ガラス棒＝border .5px #7EE5FF / backdrop-blur 10px / シアン2色グラデ+白10% / inner inset 0 3px 10px rgba(255,255,255,.4) */
  const GLASS_BAR =
    'border-radius:4px;border:.5px solid #7EE5FF;' +
    'background-image:linear-gradient(96deg,rgba(130,232,255,.2),rgba(55,159,255,.2)),linear-gradient(rgba(241,241,241,.1),rgba(241,241,241,.1));' +
    'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
    'box-shadow:inset 0 3px 10px rgba(255,255,255,.4);';
  const GRAD = 'background-image:linear-gradient(180deg,#58D0FF,#0EBBFF);';
  const CAL_CELL = 'background:#fff;border-radius:3px;box-shadow:inset 0 1px 1px rgba(255,255,255,.6);';

  /* Figmaアイコンの部品（inset:[top,right,bottom,left]% / 100×100内） */
  const ICON_DEFS = {
    chat: [
      { svg: 'chat-body.svg',   inset: [18.57, 32.34, 31.79, 14.68] },
      { glass: 'chat-shape1.svg', inset: [31.82, 14.68, 18.57, 32.34] },
      { css: 'background:#fff;border-radius:6px;', inset: [46, 30, 47, 46] },
      { css: 'background:#fff;border-radius:6px;', inset: [55, 36, 40, 46] },
    ],
    chart: [
      { css: GRAD + 'border-radius:6px;',  inset: [60.34, 17.49, 19.95, 17.49] },
      { css: GLASS_BAR, inset: [20.51, 61.57, 25.8, 24.08] },
      { css: GLASS_BAR, inset: [37.10, 25.05, 25.8, 60.60] },
      { css: GLASS_BAR, inset: [43.23, 43.31, 25.8, 42.34] },
    ],
    person: [
      { svg: 'person-ell98.svg',  inset: [10.5, 24.5, 67.75, 53.75] },
      { glass: 'person-ell97.svg', inset: [15.85, 33.6, 51.36, 33.6] },
      { glass: 'person-vector.svg', inset: [50, 14.36, 21.41, 17.32] },
    ],
    lock: [
      { svg: 'lock-union.svg', inset: [16.66, 33.16, 48.94, 33.16] },
      { svg: 'lock-rect.svg',  inset: [35.52, 17.33, 16.66, 17.33] },
      { svg: 'lock-ell16.svg', inset: [52.91, 42.7, 32.48, 42.7] },
    ],
    folder: [
      { svg: 'folder-shape.svg',  inset: [26.69, 21.44, 32.45, 22.26] },
      { svg: 'folder-shape1.svg', inset: [22.15, 15, 22.15, 15] },
    ],
    cloud: [
      { svg: 'cloud-ell96.svg', inset: [18.14, 14.25, 43.56, 47.45] },
      { glass: 'cloud-union.svg', inset: [27.4, 11.03, 24.28, 11.03] },
    ],
    calendar: [
      { css: GRAD + 'border-radius:99px;', inset: [12.95, 57.98, 58.91, 31.34] },
      { css: GRAD + 'border-radius:99px;', inset: [12.95, 31.34, 58.91, 57.98] },
      { css: 'border:.5px solid rgba(126,229,255,.95);border-radius:9px;background:rgba(255,255,255,.3);background-image:linear-gradient(140deg,rgba(152,225,255,.42),rgba(72,170,255,.34));backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);box-shadow:inset 0 2px 7px rgba(255,255,255,.6);',
        inset: [25.76, 16.41, 21.98, 16.41] },
      { css: CAL_CELL, inset: [53.1, 59.36, 40.76, 28.17] },
      { css: CAL_CELL, inset: [41.09, 59.36, 52.77, 28.17] },
      { css: CAL_CELL, inset: [53.1, 43.76, 40.76, 43.76] },
      { css: CAL_CELL, inset: [41.09, 43.76, 52.77, 43.76] },
      { css: CAL_CELL, inset: [53.1, 28.17, 40.76, 59.36] },
      { css: CAL_CELL, inset: [41.09, 28.17, 52.77, 59.36] },
    ],
  };

  /* ---- レイアウト（2D screen座標。各アイコン中心）---- */
  const LAYOUT_CIRCUIT = [          /* P1 / P3（添付①③） */
    { id: 'chat',     x: 705,  y: 245 },
    { id: 'chart',    x: 1045, y: 150 },
    { id: 'person',   x: 1375, y: 255 },
    { id: 'lock',     x: 1385, y: 580 },
    { id: 'calendar', x: 1070, y: 715 },
    { id: 'folder',   x: 695,  y: 590 },
  ];
  const LAYOUT_RINGS = [            /* P2（添付②） */
    { id: 'chat',     x: 715,  y: 255 },
    { id: 'chart',    x: 1080, y: 150 },
    { id: 'person',   x: 1400, y: 265 },
    { id: 'lock',     x: 1400, y: 615 },
    { id: 'calendar', x: 1085, y: 725 },
    { id: 'folder',   x: 710,  y: 615 },
  ];
  const ORBIT = { rx: 405, ry: 250 };
  const LAYOUT_ORBIT = [            /* P4（添付④・楕円軌道の上） */
    { id: 'chat', a: -90 }, { id: 'person', a: -40 }, { id: 'lock', a: 6 },
    { id: 'calendar', a: 52 }, { id: 'folder', a: 90 }, { id: 'chart', a: 140 }, { id: 'cloud', a: 200 },
  ].map(o => ({ id: o.id, x: C.x + ORBIT.rx * Math.cos(o.a * Math.PI / 180), y: C.y + ORBIT.ry * Math.sin(o.a * Math.PI / 180) }));

  /* ---- E案（Figma 15699 準拠）: 前向きmock＋薄い同心円2本＋周回ドット＋大小ガラスアイコン ---- */
  const EC = { x: 971, y: 435 };                 /* Eの中心（Figma実測） */
  const E_MOCK = { w: 541, h: 325 };
  const E_ORBITS = [217, 324];                    /* 同心円の半径（Figma実測） */
  const LAYOUT_E = [                               /* Figma実測の中心座標＋サイズ */
    { id: 'chart',    x: 668,  y: 605, size: 140 },
    { id: 'chat',     x: 675,  y: 269, size: 85  },
    { id: 'cloud',    x: 960,  y: 209, size: 68  },
    { id: 'person',   x: 1282, y: 216, size: 80  },
    { id: 'calendar', x: 1270, y: 617, size: 71  },
  ];

  const PATTERNS = {
    p1: { conn: 'circuit', box: 'white', layout: LAYOUT_CIRCUIT, iso: false },
    p2: { conn: 'rings',   box: 'glass', layout: LAYOUT_RINGS,   iso: false },
    p3: { conn: 'circuit', box: 'glass', layout: LAYOUT_CIRCUIT, iso: true  },
    p4: { conn: 'orbit',   box: 'white', layout: LAYOUT_ORBIT,   iso: true  },
    p5: { conn: 'econc',   box: 'glass', layout: LAYOUT_E,       iso: false },
    p6: { conn: 'svgimport', box: 'glass', layout: LAYOUT_E,    iso: false },
    p7: { conn: 'svgimport', box: 'glass', layout: LAYOUT_E,    iso: false, img: true },   /* 画像ベタ貼り版(PNG) */
    p8: { conn: 'svgimport', box: 'glass', layout: LAYOUT_E,    iso: false, bgpick: true }, /* 背景色を拾った版(すりガラス＋地色) */
    p9: { conn: 'svgimport', box: 'glass', layout: LAYOUT_E,    iso: false, img: true, tilt: true }, /* 2Dだけど立体的(PNG＋緩い3D角度) */
  };
  const PNG_DIR = 'assets/png/';   /* 書き出しPNG（frost焼込み済み・透過）。影はCSSで付ける */

  /* ---- SVG忠実版（Figmaから書き出したSVGを実座標に配置。静止・ズレゼロ）---- */
  const SVG_DIR = 'assets/figma/';
  /* [file, centerX, centerY, w, h, figmaSize]（w/h=書き出しviewBox＝影込み。fs=実ガラス矩形の一辺）*/
  const SVG_ICONS = [
    ['icon-4.svg', 667, 604, 198, 198, 140],   // chart(大)
    ['icon-3.svg', 675, 269, 124, 125, 85],    // chat
    ['icon-2.svg', 1282, 216, 117, 117, 80],   // person
    ['icon-1.svg', 1270, 617, 104, 104, 71],   // calendar
    ['icon.svg',   960, 209, 99, 99, 68],      // cloud
  ];
  const SVG_OC = { x: 971.5, y: 439.5 };            /* 同心円の中心（ellipse実座標より） */
  function spinDots(parent, cx, cy, r, defs, dur, rev) {
    const spin = document.createElement('div'); spin.className = 'kvp-espin';
    spin.dataset.baseDur = dur;                         /* 素の周期。速度倍率で割る */
    spin.style.left = cx + 'px'; spin.style.top = cy + 'px';
    spin.style.animationDuration = (dur / (dotSpeed || 1)) + 's';
    spin.style.animationName = dotEase === 'pulse' ? 'kvpSpinPulse' : 'kvpSpin';
    if (rev) spin.style.animationDirection = 'reverse';
    defs.forEach(([ang, col]) => {
      const a = ang * Math.PI / 180; const d = document.createElement('div'); d.className = 'kvp-edot';
      d.style.left = (Math.cos(a) * r) + 'px'; d.style.top = (Math.sin(a) * r) + 'px';
      d.style.background = col; spin.appendChild(d);   /* フラット（影/ブラー無し）*/
    });
    eSpins.push(spin);
    parent.appendChild(spin);
  }
  /* 軌道ドットの速度倍率（大きいほど速い） */
  function setDotSpeed(mult) {
    dotSpeed = Math.max(0.1, +mult || 1);
    eSpins.forEach(s => { s.style.animationDuration = ((+s.dataset.baseDur || 30) / dotSpeed) + 's'; });
  }
  /* 軌道ドットの緩急: 'linear'=一定 / 'pulse'=ゆっくり→急加速→ゆっくり */
  function setDotEase(mode) {
    dotEase = (mode === 'pulse') ? 'pulse' : 'linear';
    eSpins.forEach(s => { s.style.animationName = dotEase === 'pulse' ? 'kvpSpinPulse' : 'kvpSpin'; });
  }
  function buildSvgScene(useImg) {
    /* ⚠️ .kvp-intro（初期非表示 opacity:0）はシーン生成時に付ける。
       後から付けると、appendChild → startEMock の強制リフロー(void offsetWidth)で
       アイコン/モックのopacityが 1 のまま確定してしまい、opacityのtransitionが
       「1→0(消える)→0→1(また出る)」と余計に走ってチラつく（出て消えてまた出る）。
       生成時から付ければ“最初の算出値が0”になり、無駄なフェードアウトが起きない。 */
    const scene = document.createElement('div'); scene.className = 'kvp-svgscene kvp-intro';
    const back = document.createElement('div'); back.className = 'kvp-e-back';
    const front = document.createElement('div'); front.className = 'kvp-e-icons';
    const put = (parent, f, left, top, w, h) => {
      const el = document.createElement('img'); el.className = 'kvp-svgel';
      el.src = SVG_DIR + f; el.style.left = left + 'px'; el.style.top = top + 'px';
      el.style.width = w + 'px'; el.style.height = h + 'px'; parent.appendChild(el); return el;
    };
    const frost = (parent, left, top, w, h, r, blur) => {
      const d = document.createElement('div'); d.className = 'kvp-frost';
      d.style.cssText = `left:${left}px;top:${top}px;width:${w}px;height:${h}px;border-radius:${r}px;` +
        `backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);`;
      parent.appendChild(d); return d;
    };
    /* --- 背面: 同心円→周回ドット→mock（背景の発光は不要との指示で撤去） --- */
    put(back, 'ellipse-102.svg', 647, 115, 649, 649);
    put(back, 'ellipse-101.svg', 754, 222, 435, 435);
    eSpins = [];                                        /* 作り直しのたびに回転要素を採り直す */
    spinDots(back, SVG_OC.x, SVG_OC.y, 324.5, [[-30, '#FF5D97'], [150, '#0E4497']], 42, true);
    spinDots(back, SVG_OC.x, SVG_OC.y, 217.5, [[10, '#0EBBFF']], 30, false);
    /* モックもCSSで作り直す（mock.svgは背景ブラーが<foreignObject>で死ぬため）。
       buildDashE = Figmaのmockと同じ構成(エディタ+チャット)のCSS版・すりガラスが本当に効く。
       アニメは setPattern('p6') 側で startEMock を回す（開発者体験1と同じ：入力→自分の吹き出し→
       コードがスケルトン→出現→AIの吹き出し）。ここでは静止マークを付けない。 */
    back.appendChild(buildDashE());
    /* --- 前面: アイコン（各wrapperで浮遊。中にライブブラー＋SVG）---
       ⚠️ Figma書き出しSVGは背景ブラーを <foreignObject backdrop-filter> として持つが、
       <img> で読むと完全に無効化される（imgのforeignObjectはページ背景を合成しない）。
       残るのは「白30%の箱＋影」だけ → 透ける。裏に .kvp-frost を敷いて補っている。
       【実験 2026-08-25】chart(icon-4.svg)だけ CSS で作り直す（Framer式＝箱に直接
       backdrop-filter＋白30%）。SVG方式との差をヒデさんのブラウザで比較する。 */
    /* SVGは背景ブラーを持てない(foreignObjectがimgで死ぬ)と確定 → 全アイコンをCSSで作り直す */
    const CSS_REBUILD = { 'icon-4.svg': 'chart', 'icon-3.svg': 'chat', 'icon-2.svg': 'person', 'icon-1.svg': 'calendar', 'icon.svg': 'cloud' };
    SVG_ICONS.forEach(([f, x, y, w, h, fs], i) => {
      if (useImg) {
        /* 画像ベタ貼り版: 書き出しPNG（frost焼込み・透過・箱ぴったり@3x）をそのまま貼る。影だけCSS。
           ⚠️ PNGは"箱そのもの"なので、表示は viewBox(w) ではなく Figmaの箱サイズ fs で（カンプ忠実）。 */
        const ico = document.createElement('div'); ico.className = 'kvp-ico-svg';
        ico.style.left = (x - fs / 2) + 'px'; ico.style.top = (y - fs / 2) + 'px';
        ico.style.width = fs + 'px'; ico.style.height = fs + 'px';
        ico.style.setProperty('--fd', (i * 0.6) + 's');
        const im = document.createElement('img'); im.className = 'kvp-png-ico';
        im.src = PNG_DIR + f.replace('.svg', '.png');
        im.style.width = fs + 'px'; im.style.height = fs + 'px';
        /* 影(2026-08-25 精緻化): Figma実測（chart 16.08/16.53/28.79 @140.4px ≈ 0.11/0.12/0.20×箱）通りに。
           以前は 0.06/0.09/0.16 と実測より小さく浅かった。実測の柔らかい down-right の主影＋接地の締め影の2枚重ね。
           色は青みのある濃色(#101828系)で無地の地色に浮きすぎないように。 */
        im.style.filter =
          `drop-shadow(${(fs * 0.11).toFixed(1)}px ${(fs * 0.12).toFixed(1)}px ${(fs * 0.20).toFixed(1)}px rgba(16,24,40,.20))` +
          ` drop-shadow(${(fs * 0.03).toFixed(1)}px ${(fs * 0.045).toFixed(1)}px ${(fs * 0.07).toFixed(1)}px rgba(16,24,40,.12))`;
        ico.appendChild(im); front.appendChild(ico);
        return;
      }
      if (CSS_REBUILD[f]) {
        const ico = buildIcon(CSS_REBUILD[f], 'glass', fs);
        ico.classList.add('kvp-ico-svg', 'kvp-ico--rebuilt');
        /* アイソメ厚み用: スラブを不透明白＋奥ほど暗く、Zは --thk で可変（普通ビューでは display:none）。
           slabのサイズ基準は fs。①積層スラブ方式の実体。 */
        const slabs = ico.querySelectorAll('.kvp-slab');
        slabs.forEach((s, j) => {
          const k = (slabs.length - j) / slabs.length;   /* 0(手前)〜1(奥) */
          s.style.background = 'hsl(220 16% ' + (100 - 15 * k).toFixed(1) + '%)';
          s.style.transform = 'translateZ(calc(var(--thk, 26px) * ' + (-k).toFixed(3) + ' * ' + (fs / 112).toFixed(3) + '))';
        });
        placeIcon(ico, x, y, fs);
        ico.style.setProperty('--fd', (i * 0.6) + 's');
        front.appendChild(ico);
        return;
      }
      const ico = document.createElement('div'); ico.className = 'kvp-ico-svg';
      ico.style.left = (x - w / 2) + 'px'; ico.style.top = (y - h / 2) + 'px';
      ico.style.width = w + 'px'; ico.style.height = h + 'px';
      ico.style.setProperty('--fd', (i * 0.6) + 's');
      const fl = document.createElement('div'); fl.className = 'kvp-frost';
      fl.style.cssText = `left:${(w - fs) / 2 + 3}px;top:${(h - fs) / 2 + 3}px;width:${fs - 6}px;height:${fs - 6}px;` +
        `border-radius:${(fs * 0.085).toFixed(1)}px;backdrop-filter:blur(${Math.round(fs * 1.19)}px);-webkit-backdrop-filter:blur(${Math.round(fs * 1.19)}px);`;
      const im = document.createElement('img'); im.className = 'kvp-svgel'; im.src = SVG_DIR + f;
      im.style.left = '0'; im.style.top = '0'; im.style.width = w + 'px'; im.style.height = h + 'px';
      ico.appendChild(fl); ico.appendChild(im); front.appendChild(ico);
    });
    scene.appendChild(back); scene.appendChild(front);
    return scene;
  }

  /* KV入場アニメ: mock→アイコンがランダムにバラバラ出現→軌道/周回ドット/発光。
     scene に .kvp-intro を付け、順に .in を付与。演出後は .kvp-intro を外す（transformを残さない）。 */
  let introTimers = [];
  function playIntro(scene) {
    introTimers.forEach(clearTimeout); introTimers = [];
    scene.classList.add('kvp-intro');
    const T = (fn, ms) => introTimers.push(setTimeout(fn, ms));
    const mock = scene.querySelector('.kvp-emock-slot');
    const icons = [].slice.call(scene.querySelectorAll('.kvp-ico-svg'));
    const bg = [].slice.call(scene.querySelectorAll('.kvp-eorbits, .kvp-svgel, .kvp-espin'));
    /* 【2026-08-25 ヒデさん指定】順番: ①モックが出てタイピング → ②タイピング完了後にアイコンが浮上
       → ③最後に軌道が出てドットが回り始める。各要素は1回だけ出して出っ放し(再出現なし)。 */
    /* 各フェーズの出始めは introTiming(秒)。本体の調整パネルから postMessage で変えられる。
       ① モック → ② アイコン(iconsStagger でばらけて) → ③ 軌道＋ドット。 */
    const tm = introTiming || { mockAt: 0.08, iconsAt: 0.7, iconsStagger: 0.11, orbitAt: 1.5 };
    const mockMs = Math.max(0, (tm.mockAt || 0) * 1000);
    const iconsMs = Math.max(0, (tm.iconsAt || 0) * 1000);
    const stagMs = Math.max(0, (tm.iconsStagger || 0) * 1000);
    const orbitMs = Math.max(0, (tm.orbitAt || 0) * 1000);
    requestAnimationFrame(() => {
      T(() => mock && mock.classList.add('in'), mockMs);                       /* ① モック */
      icons.forEach((ic, i) => T(() => ic.classList.add('in'), iconsMs + i * stagMs)); /* ② アイコン(ばらけて) */
      T(() => bg.forEach(e => e.classList.add('in')), orbitMs);                /* ③ 軌道＋ドット */
      const endMs = Math.max(iconsMs + icons.length * stagMs, orbitMs) + 900;
      T(() => scene.classList.remove('kvp-intro'), endMs);                     /* 演出終了：初期scopeを解除 */
    });
  }

  const SVGNS = 'http://www.w3.org/2000/svg';
  const elS = (t, a) => { const e = document.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const svgCache = {};
  function loadSVG(file, host) {
    if (svgCache[file]) { host.innerHTML = svgCache[file]; return; }
    fetch(ICONS_DIR + file).then(r => r.text()).then(t => { svgCache[file] = t; host.innerHTML = t; });
  }
  function insetToBox(ins) { const [t, r, b, l] = ins; return { left: l, top: t, width: 100 - l - r, height: 100 - t - b }; }

  /* 多点の丸角ポリライン（PCB風の配線）。全ての中間角を半径 r で丸める */
  function roundedPoly(pts, r) {
    if (pts.length < 3) return 'M' + pts.map(p => p[0] + ' ' + p[1]).join(' L');
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], e = pts[i], p2 = pts[i + 1];
      const v1x = e[0] - p0[0], v1y = e[1] - p0[1], l1 = Math.hypot(v1x, v1y) || 1;
      const v2x = p2[0] - e[0], v2y = p2[1] - e[1], l2 = Math.hypot(v2x, v2y) || 1;
      const rr = Math.min(r, l1 / 2, l2 / 2);
      const a = [e[0] - v1x / l1 * rr, e[1] - v1y / l1 * rr];
      const b = [e[0] + v2x / l2 * rr, e[1] + v2y / l2 * rr];
      d += ` L${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${e[0]} ${e[1]} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L${last[0]} ${last[1]}`;
    return d;
  }
  const iconPos = (layout, id) => layout.find(i => i.id === id);

  let rootEl, worldEl, cur = null;
  let eMockStop = null, eBack = null, eFront = null;      /* E案の状態 */
  let pendingIntro = null;                                /* 埋め込み時: 親(見出しタイピング完了)の合図で入場を始めるため保留する */
  /* 入場の各フェーズの出始めタイミング(秒・合図から)。本体パネルから postMessage で上書き可能。 */
  let introTiming = { mockAt: 0.08, iconsAt: 0.7, iconsStagger: 0.11, orbitAt: 1.5 };
  let mockAnimOn = true, eMockSlot = null;                /* モックアニメのオン/オフ・現在のモック枠 */
  let eMockDur = 0;                                        /* モックのタイピング再生尺(ms)。playIntro が完了後に右グラフィックを出すのに使う */
  let eSpins = [], dotSpeed = 3, dotEase = 'linear';      /* 軌道ドット: 回転要素・速度倍率(既定3x・2026-08-25 ヒデさん指定)・緩急(linear/pulse) */
  let floatOn = true, parallaxOn = false;                 /* 浮遊/パララックス（Eのみ） */
  let curTransform = { x: 0, y: 0, z: 0, s: 1 };          /* XYZ・大きさ（選択案の傾き/拡大） */
  let viewMode = 'flat';                                   /* 普通/アイソメ（全案共通） */
  const ISO_PRESET = { x: 44, y: 0, z: -8, s: 1.04 };     /* アイソメの標準角度 */
  const FLAT_PRESET = { x: 0, y: 0, z: 0, s: 1 };

  /* ---------- アイコン1個＝本物の3D箱（size=一辺px。Eは大小バラバラ）---------- */
  function buildIcon(id, boxStyle, size) {
    size = size || ICO;
    const wrap = document.createElement('div');
    wrap.className = 'kvp-ico kvp-ico--' + boxStyle;
    wrap.style.width = size + 'px'; wrap.style.height = size + 'px';
    /* Figma実測比: 角丸=size×0.085 / backdrop-blur=size×1.19 / ドロップシャドウ=(0.073,0.075,0.13)×size rgba(0,0,0,.2) */
    wrap.style.setProperty('--ico-r', (size * 0.085).toFixed(1) + 'px');
    wrap.style.setProperty('--blur', Math.round(size * 1.19) + 'px');
    wrap.style.setProperty('--drop',
      `${(size * 0.073).toFixed(1)}px ${(size * 0.075).toFixed(1)}px ${(size * 0.13).toFixed(1)}px rgba(0,0,0,.2)`);
    const shadow = document.createElement('div'); shadow.className = 'kvp-ico-shadow';
    wrap.appendChild(shadow);
    const box = document.createElement('div'); box.className = 'kvp-ico-box';
    /* 厚みスラブ（前面の後ろに積む＝側面/上面になる。多層で角丸をなめらかに） */
    const LAYERS = 16, THICK = 30 * size / 112;
    for (let i = LAYERS; i >= 1; i--) {
      const L = document.createElement('div'); L.className = 'kvp-slab';
      const k = i / LAYERS;
      L.style.transform = `translateZ(${(-THICK * k).toFixed(2)}px)`;
      L.style.background = boxStyle === 'white'
        ? `hsl(220 22% ${95 - 17 * k}%)`
        : `hsla(202 100% ${90 - 12 * k}% / ${0.12 + 0.06 * k})`;
      box.appendChild(L);
    }
    const face = document.createElement('div'); face.className = 'kvp-ico-face';
    /* 箱のすりガラスは「面」ではなく別レイヤー(frost)に載せる。こうしないとグリフが
       backdrop-filter要素の入れ子になり、Chrome/Safari共に子のブラーが描画されない(Chromium #993644)。
       frostをグリフの兄弟(背面)にすることで、グリフのガラス部品のbackdrop-filterが生きる。 */
    const frost = document.createElement('div'); frost.className = 'kvp-ico-frost';
    face.appendChild(frost);
    const glyph = document.createElement('div'); glyph.className = 'kvp-ico-glyph';
    (ICON_DEFS[id] || []).forEach(part => {
      const b = insetToBox(part.inset);
      const s = document.createElement('span');
      s.style.left = b.left + '%'; s.style.top = b.top + '%';
      s.style.width = b.width + '%'; s.style.height = b.height + '%';
      if (part.css) s.style.cssText += ';' + part.css;
      if (part.svg) loadSVG(part.svg, s);
      if (part.glass) {
        /* ガラス部品＝ライブCSS backdrop-filter を SVG形状でマスク。後ろ(前面の青ソリッド等)を本当にボカす。
           シアン薄グラデ＋内側の光＝Figmaのガラス質感。SVGのforeignObjectブラーは死ぬので使わない */
        const m = MASK_DIR + part.glass;
        const gb = Math.max(4, size * 0.09).toFixed(1);   /* ガラスのブラーはアイコンサイズ比 */
        s.style.cssText += ';background:linear-gradient(140deg,rgba(152,225,255,.42),rgba(72,170,255,.34));'
          + `backdrop-filter:blur(${gb}px) saturate(1.5);-webkit-backdrop-filter:blur(${gb}px) saturate(1.5);`
          + 'box-shadow:inset 0 2px 6px rgba(255,255,255,.55),inset 0 0 1px rgba(120,210,255,.8);'
          + `-webkit-mask:url(${m}) no-repeat center/contain;mask:url(${m}) no-repeat center/contain;`;
      }
      glyph.appendChild(s);
    });
    face.appendChild(glyph);
    box.appendChild(face);
    wrap.appendChild(box);
    return wrap;
  }
  function placeIcon(node, x, y, size) {
    size = size || ICO;
    node.style.left = (x - size / 2) + 'px';
    node.style.top = (y - size / 2) + 'px';
  }

  /* ---------- 中央ダッシュボード ---------- */
  function buildDash() {
    const wrap = document.createElement('div'); wrap.className = 'kvp-dash-wrap';
    wrap.style.left = dashRect.l + 'px'; wrap.style.top = dashRect.t + 'px';
    wrap.style.width = DASH.w + 'px'; wrap.style.height = DASH.h + 'px';
    const shadow = document.createElement('div'); shadow.className = 'kvp-dash-shadow'; wrap.appendChild(shadow);
    const dash = document.createElement('div'); dash.className = 'kvp-dash';
    const code = document.createElement('div'); code.className = 'dash-code';
    [['#FF5D97', 38], ['#0EBBFF', 62], ['#379FFF', 30], ['#e4e8ee', 74], ['#0EBBFF', 46],
     ['#FF5D97', 34], ['#379FFF', 58], ['#e4e8ee', 42], ['#0EBBFF', 68]].forEach(([c, w]) => {
      const el = document.createElement('div'); el.className = 'cbar';
      el.style.width = w + '%'; el.style.background = c; code.appendChild(el);
    });
    dash.appendChild(code);
    const side = document.createElement('div'); side.className = 'dash-side';
    const logo = document.createElement('div'); logo.className = 'dash-logo';
    logo.innerHTML = '<img src="assets/header-logo.svg" alt="">';
    side.appendChild(logo);
    ['#0EBBFF', '#FF5D97', '#0EBBFF'].forEach(c => {
      const row = document.createElement('div'); row.className = 'srow';
      const dot = document.createElement('div'); dot.className = 'sdot';
      dot.style.background = `linear-gradient(150deg,#58D0FF,${c})`;
      const lines = document.createElement('div'); lines.className = 'slines';
      lines.innerHTML = '<i></i><i class="short"></i>';
      row.appendChild(dot); row.appendChild(lines); side.appendChild(row);
    });
    dash.appendChild(side);
    wrap.appendChild(dash);
    return wrap;
  }

  /* ---------- 回線ネットワーク（白線＋ジャンクション）＋青いデータ光 ---------- */
  function anchorOnDash(ix, iy) {
    const ax = Math.max(dashRect.l + 30, Math.min(dashRect.r - 30, ix));
    const ay = Math.max(dashRect.t + 30, Math.min(dashRect.b - 30, iy));
    const dl = Math.abs(ix - dashRect.l), dr = Math.abs(ix - dashRect.r);
    const dt = Math.abs(iy - dashRect.t), db = Math.abs(iy - dashRect.b);
    const m = Math.min(dl, dr, dt, db);
    if (m === dt) return [ax, dashRect.t];
    if (m === db) return [ax, dashRect.b];
    if (m === dl) return [dashRect.l, ay];
    return [dashRect.r, ay];
  }
  function buildCircuit(layout) {
    const box = document.createElement('div'); box.className = 'kvp-net';
    const svg = elS('svg', { class: 'kvp-lines', viewBox: `0 0 ${STAGE.w} ${STAGE.h}` });
    svg.setAttribute('width', STAGE.w); svg.setAttribute('height', STAGE.h);
    const dataLayer = document.createElement('div'); dataLayer.className = 'kvp-data-layer';
    const T = dashRect.t, B = dashRect.b, Lx = dashRect.l, Rx = dashRect.r;
    const spineY = T - 42, botY = B + 46, h = ICO / 2;
    const chat = iconPos(layout, 'chat'), chart = iconPos(layout, 'chart'), person = iconPos(layout, 'person');
    const lock = iconPos(layout, 'lock'), cal = iconPos(layout, 'calendar'), folder = iconPos(layout, 'folder');
    /* 配線網（多点ポリライン）＝ トップ/ボトムのスパイン＋分岐＋側面直結 */
    const P = [];
    const nodes = [];
    /* ---- トップ・スパイン（chat/chart/person を束ねる横バス）＋ダッシュへの2本の縦リンク ---- */
    P.push([[Lx + 48, spineY], [Rx - 48, spineY]]);
    P.push([[Lx + 150, spineY], [Lx + 150, T]]);
    P.push([[Rx - 150, spineY], [Rx - 150, T]]);
    nodes.push([Lx + 48, spineY], [Rx - 48, spineY], [Lx + 150, T], [Rx - 150, T]);
    if (chart)  { P.push([[chart.x, chart.y + h - 12], [chart.x, spineY]]); nodes.push([chart.x, spineY]); }
    if (chat)   { P.push([[chat.x + h - 12, chat.y], [chat.x + h + 34, chat.y], [chat.x + h + 34, spineY]]); nodes.push([chat.x + h + 34, spineY]); }
    if (person) { P.push([[person.x - h + 12, person.y], [person.x - h - 34, person.y], [person.x - h - 34, spineY]]); nodes.push([person.x - h - 34, spineY]); }
    /* ---- 側面・下：直結の丸角L ---- */
    if (lock)   { P.push([[Rx, lock.y], [lock.x - h + 12, lock.y]]); nodes.push([Rx, lock.y]); }
    if (cal)    { P.push([[cal.x, B], [cal.x, cal.y - h + 12]]); nodes.push([cal.x, B]); }
    if (folder) { P.push([[Lx + 80, B], [Lx + 80, botY], [folder.x, botY], [folder.x, folder.y + h - 12]]); nodes.push([Lx + 80, B]); }
    /* ---- 左の入力線（データ流入。添付①の左側の短い線）---- */
    P.push([[Lx - 150, T + 120], [Lx - 24, T + 120]]);
    P.push([[Lx - 150, T + 162], [Lx - 24, T + 162]]);
    P.push([[Lx - 128, T + 204], [Lx - 24, T + 204]]);
    /* 描画：白トレース＋青データ光 */
    P.forEach((pts, i) => {
      const d = roundedPoly(pts, 18);
      svg.appendChild(elS('path', { d, class: 'kvp-line' }));
      const dot = document.createElement('div'); dot.className = 'kvp-data';
      dot.style.offsetPath = `path('${d}')`; dot.style.webkitOffsetPath = `path('${d}')`;
      dot.style.animationDelay = (-(i * 0.33)) + 's';
      dataLayer.appendChild(dot);
    });
    nodes.forEach(n => svg.appendChild(elS('circle', { cx: n[0], cy: n[1], r: 4, class: 'kvp-node' })));
    box.appendChild(svg); box.appendChild(dataLayer);
    return box;
  }

  /* ---------- 同心円グロー（P2） ---------- */
  function buildRings() {
    const wrap = document.createElement('div'); wrap.className = 'kvp-rings';
    [235, 330, 425, 510].forEach((r, i) => {
      const ring = document.createElement('div');
      ring.className = 'kvp-ring' + (i === 3 ? ' soft' : '');
      const ry = r * 0.62;
      ring.style.left = (C.x - r) + 'px'; ring.style.top = (C.y - ry) + 'px';
      ring.style.width = (r * 2) + 'px'; ring.style.height = (ry * 2) + 'px';
      ring.style.animation = `kvpBreath ${4 + i * 0.6}s ease-in-out ${i * 0.3}s infinite`;
      wrap.appendChild(ring);
    });
    return wrap;
  }

  /* ---------- 単一軌道（P4）---------- */
  function buildOrbitRing() {
    const ring = document.createElement('div'); ring.className = 'kvp-orbit';
    ring.style.left = (C.x - ORBIT.rx) + 'px'; ring.style.top = (C.y - ORBIT.ry) + 'px';
    ring.style.width = (ORBIT.rx * 2) + 'px'; ring.style.height = (ORBIT.ry * 2) + 'px';
    return ring;
  }

  /* ============ E案: 同心円＋周回ドット ============ */
  function buildEOrbits() {
    const box = document.createElement('div'); box.className = 'kvp-eorbits';
    E_ORBITS.forEach((r, i) => {
      const c = document.createElement('div'); c.className = 'kvp-eorbit';
      c.style.left = (EC.x - r) + 'px'; c.style.top = (EC.y - r) + 'px';
      c.style.width = c.style.height = (r * 2) + 'px';
      box.appendChild(c);
      const spin = document.createElement('div'); spin.className = 'kvp-espin';
      spin.style.left = EC.x + 'px'; spin.style.top = EC.y + 'px';
      spin.style.animationDuration = (28 + i * 12) + 's';
      if (i % 2) spin.style.animationDirection = 'reverse';
      const dots = i === 0 ? [[10, '#0EBBFF']] : [[-30, '#FF5D97'], [150, '#0E4497']];
      dots.forEach(([ang, col]) => {
        const d = document.createElement('div'); d.className = 'kvp-edot';
        const a = ang * Math.PI / 180;
        d.style.left = (Math.cos(a) * r) + 'px'; d.style.top = (Math.sin(a) * r) + 'px';
        d.style.background = col;   /* フラット（影/ブラー無し）*/
        spin.appendChild(d);
      });
      box.appendChild(spin);
    });
    return box;
  }

  /* ============ E案: アニメするmock（打つ→送る→コード生成→返答のループ） ============ */
  const E_CODE_ROWS = [
    [0, [[48, '#ff5d97'], [80, '#0ebbff']]],
    [16, [[64, '#ffffff'], [110, '#0ebbff'], [36, '#ff5d97']]],
    [32, [[92, '#0ebbff'], [44, '#ffffff']]],
    [32, [[120, 'rgba(255,255,255,.5)']]],
    [16, [[24, '#ffffff']]],
    [0, [[36, '#ff5d97'], [100, '#0ebbff']]],
    [16, [[80, '#ffffff'], [54, '#ff5d97']]],
    [32, [[140, '#0ebbff'], [28, '#0ebbff']]],
    [32, [[74, '#ffffff'], [52, 'rgba(255,255,255,.5)']]],
    [48, [[36, '#ff5d97'], [98, '#0ebbff']]],
    [32, [[48, '#ffffff']]],
    [16, [[16, '#ff5d97']]],
  ];
  /* スケルトンローディング用（コード生成前の“溜め”表示。[インデント, 幅]） */
  const E_SKEL_ROWS = [[0, 210], [0, 160], [18, 132], [18, 188], [36, 104], [0, 174], [18, 142]];
  function eBubble(kind, cls, lines) {
    const av = kind === 'user' ? 'em-av-user' : 'em-av-bot';
    const icon = kind === 'user' ? 'user.svg' : 'bot.svg';
    const li = lines.map(([w, o]) => `<span class="em-line" style="width:${w}px;opacity:${o}"></span>`).join('');
    return `<div class="em-msg ${cls}"><span class="em-av ${av}"><img src="../assets/mock/${icon}" alt=""></span><div class="em-bub">${li}</div></div>`;
  }
  /* 思考中ドット（送信後の“AIが考えてる”表示。回答が来たら入れ替え） */
  function eThink(cls) {
    return `<div class="em-msg ${cls}"><span class="em-av em-av-bot"><img src="../assets/mock/bot.svg" alt=""></span><div class="em-bub em-think"><i></i><i></i><i></i></div></div>`;
  }
  const E_MOCK_NAT = { w: 900, h: 540 };
  function buildDashE() {
    const slot = document.createElement('div'); slot.className = 'kvp-emock-slot';
    slot.style.left = (EC.x - E_MOCK.w / 2) + 'px'; slot.style.top = (EC.y - E_MOCK.h / 2) + 'px';
    slot.style.width = E_MOCK.w + 'px'; slot.style.height = E_MOCK.h + 'px';
    const panel = document.createElement('div'); panel.className = 'kvp-emock';
    panel.style.width = E_MOCK_NAT.w + 'px'; panel.style.height = E_MOCK_NAT.h + 'px';
    panel.style.transform = `scale(${(E_MOCK.w / E_MOCK_NAT.w).toFixed(4)})`;
    /* editor */
    const editor = document.createElement('div'); editor.className = 'em-editor';
    const side = document.createElement('div'); side.className = 'em-side';
    /* Figma(15711-26540)準拠: ロゴ=小ドット3つ／区切り線／ナビ=ドット5枠(1つ目は非表示=4つ見える) */
    side.innerHTML = '<div class="em-slogo"><i></i><i></i><i></i></div>' +
      '<div class="em-divider"></div>' +
      '<div class="em-snav"><i class="hidden-dot"></i><i></i><i></i><i></i><i></i></div>';
    const code = document.createElement('div'); code.className = 'em-code';
    E_CODE_ROWS.forEach(([indent, bars]) => {
      const r = document.createElement('div'); r.className = 'em-crow';
      if (indent) { const s = document.createElement('span'); s.className = 'em-ind'; s.style.width = indent + 'px'; r.appendChild(s); }
      bars.forEach(([w, c]) => { const b = document.createElement('span'); b.className = 'em-bar'; b.style.width = w + 'px'; b.style.background = c; r.appendChild(b); });
      code.appendChild(r);
    });
    /* スケルトン（コード生成前のローディング＝“溜め”。シマーで光が横に走る。開発者体験1と同じ） */
    const skel = document.createElement('div'); skel.className = 'em-skel';
    E_SKEL_ROWS.forEach(([indent, w]) => {
      const s = document.createElement('div'); s.className = 'em-skel-bar';
      s.style.width = w + 'px'; if (indent) s.style.marginLeft = indent + 'px';
      skel.appendChild(s);
    });
    code.appendChild(skel);
    editor.appendChild(side); editor.appendChild(code);
    /* chat */
    const chat = document.createElement('div'); chat.className = 'em-chat';
    chat.innerHTML =
      '<div class="em-chead"><span class="em-ctitle"><img src="../assets/mock/sparkles.svg" alt="">AI Assistant</span><img class="em-ell" src="../assets/mock/ellipsis.svg" alt=""></div>' +
      '<div class="em-hist">' +
        eBubble('user', 'em-bub-user', [[210, .8], [190, .6]]) +
        eThink('em-bub-think') +
        eBubble('bot', 'em-bub-ans', [[110, .8], [150, .6]]) +
      '</div>' +
      '<div class="em-input"><span class="em-typed"></span><span class="em-caret"></span><span class="em-ph">Ask anything...</span><span class="em-send"><img src="../assets/mock/arrow-up.svg" alt=""></span></div>';
    panel.appendChild(editor); panel.appendChild(chat);
    slot.appendChild(panel);
    return slot;
  }
  /* 開発者体験1と同じ流れ: 空 → 入力(カーソル追従) → 送信 → 自分の吹き出し → 考え中ドット →
     エディタがスケルトンで“溜め” → コードが左→右に書かれる → AI回答。
     【2026-08-25 ヒデさん指定】表示は“完成状態(全部出た状態)”から始め、約5秒後に最初へ戻って再生する。
     モックアニメは調整パネルでオン/オフ（オフ＝完成状態で静止）。 */
  function startEMock(slot) {
    if (!slot) return () => {};
    eMockSlot = slot;
    const rows  = [].slice.call(slot.querySelectorAll('.em-crow'));
    const skel  = slot.querySelector('.em-skel');
    const typed = slot.querySelector('.em-typed');
    const input = slot.querySelector('.em-input');
    const send  = slot.querySelector('.em-send');
    const userB = slot.querySelector('.em-bub-user');
    const thinkB = slot.querySelector('.em-bub-think');
    const ansB  = slot.querySelector('.em-bub-ans');
    const PROMPT = 'SlackとNotionを連携して';
    const timers = [];
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));

    /* タイムライン(ms)。2026-08-25: タイピング→右グラフィック の全体を短めに(約3秒で完成)。 */
    const CH = 50;
    const typeStart = 300;
    const typeEnd   = typeStart + PROMPT.length * CH;
    const sendAt    = typeEnd + 180;
    const userAt    = sendAt + 150;
    const thinkAt   = userAt + 250;
    const skelAt    = thinkAt + 180;
    const HOLD_DAME = 450;                            /* コード書き出し前の溜め */
    const burstAt   = skelAt + HOLD_DAME;
    const STEP      = 30;
    const answerAt  = burstAt + rows.length * STEP + 260;
    const PLAY_DUR  = answerAt + 400;                 /* 再生が“完成”に至るまで */

    function snapClass(add) { if (add) slot.classList.add('em-snap'); else { void slot.offsetWidth; slot.classList.remove('em-snap'); } }
    /* 完成状態(全部出た状態)へ一瞬で */
    function showDone() {
      snapClass(true);
      rows.forEach(r => r.classList.add('on'));
      if (skel) skel.classList.remove('on');
      userB && userB.classList.add('on');
      thinkB && thinkB.classList.remove('on');       /* 考え中は畳む */
      ansB && ansB.classList.add('on');
      slot.classList.remove('em-out');
      typed.textContent = ''; input.classList.remove('typing');
      if (send) send.classList.remove('is-hit');
      snapClass(false);
    }
    /* 空へ一瞬で */
    function reset() {
      snapClass(true);
      rows.forEach(r => r.classList.remove('on'));
      if (skel) skel.classList.remove('on');
      [userB, thinkB, ansB].forEach(b => b && b.classList.remove('on'));
      slot.classList.remove('em-out');
      typed.textContent = ''; input.classList.remove('typing');
      if (send) send.classList.remove('is-hit');
      snapClass(false);
    }
    /* 空→完成 の再生（末尾でフェードアウトはしない＝完成状態で終わる） */
    function playSeq() {
      T(() => input.classList.add('typing'), typeStart - 80);
      for (let i = 0; i <= PROMPT.length; i++)
        T(() => { typed.textContent = PROMPT.slice(0, i); }, typeStart + i * CH);
      T(() => { if (send) send.classList.add('is-hit'); }, sendAt);
      T(() => { typed.textContent = ''; input.classList.remove('typing'); }, sendAt + 140);
      T(() => { if (send) send.classList.remove('is-hit'); }, sendAt + 230);
      T(() => userB && userB.classList.add('on'), userAt);
      T(() => thinkB && thinkB.classList.add('on'), thinkAt);
      T(() => skel && skel.classList.add('on'), skelAt);
      T(() => skel && skel.classList.remove('on'), burstAt);
      rows.forEach((r, i) => T(() => r.classList.add('on'), burstAt + i * STEP));
      T(() => { thinkB && thinkB.classList.remove('on'); ansB && ansB.classList.add('on'); }, answerAt);
    }
    /* 【2026-08-25 ヒデさん指定】タイピングを1回だけ再生して完成状態で止める(ループなし)。
       右側グラフィック(アイコン→軌道+ドット)は playIntro がこのタイピング完了後に順に出す。 */
    if (!mockAnimOn) { showDone(); eMockDur = 0; return () => {}; }
    reset();       /* 空から */
    playSeq();     /* 1回だけ打つ→完成で終わる */
    eMockDur = PLAY_DUR;
    return () => timers.forEach(t => (typeof t === 'function' ? t() : clearTimeout(t)));
  }
  /* モックアニメのオン/オフ（オフは完成状態で静止）。パネルから呼ぶ */
  function setMockAnim(on) {
    mockAnimOn = !!on;
    if (eMockStop) { eMockStop(); eMockStop = null; }
    if (eMockSlot) eMockStop = startEMock(eMockSlot);
  }

  /* ============ 浮遊 / パララックス / XYZ変形 ============ */
  function applyFloat() {
    rootEl.classList.toggle('float-on', floatOn && (cur === 'p5' || cur === 'p6' || cur === 'p7' || cur === 'p8' || cur === 'p9'));
  }
  function onPointer(e) {
    if ((cur !== 'p5' && cur !== 'p6') || !parallaxOn || !eBack || !eFront) return;
    /* transformを使うと子のbackdrop-filterが無効化されるので left/top で視差移動する */
    const ox = (e.clientX / window.innerWidth - 0.5), oy = (e.clientY / window.innerHeight - 0.5);
    eBack.style.left = (ox * 10).toFixed(1) + 'px'; eBack.style.top = (oy * 10).toFixed(1) + 'px';
    eFront.style.left = (ox * 26).toFixed(1) + 'px'; eFront.style.top = (oy * 26).toFixed(1) + 'px';
  }
  function applyParallax() {
    if (!eBack || !eFront) return;
    if (!((cur === 'p5' || cur === 'p6' || cur === 'p7' || cur === 'p8' || cur === 'p9') && parallaxOn)) {
      eBack.style.left = eBack.style.top = ''; eFront.style.left = eFront.style.top = '';
    }
  }
  function applyTransform() {
    const c = (cur === 'p5' || cur === 'p6' || cur === 'p7' || cur === 'p8' || cur === 'p9') ? EC : C;
    worldEl.style.transformOrigin = `${c.x}px ${c.y}px`;
    const t = curTransform;
    worldEl.style.transform = (t.x || t.y || t.z || t.s !== 1)
      ? `rotateX(${t.x}deg) rotateY(${t.y}deg) rotateZ(${t.z}deg) scale(${t.s})` : '';
  }
  function applyView() {
    rootEl.classList.toggle('is-iso', viewMode === 'iso');
    rootEl.classList.toggle('is-flat', viewMode !== 'iso');
  }
  function setView(m) {
    viewMode = (m === 'iso') ? 'iso' : 'flat';
    applyView();
    curTransform = Object.assign({}, viewMode === 'iso' ? ISO_PRESET : FLAT_PRESET);
    applyTransform();
  }

  /* ---------- 構築 ---------- */
  function start(cfg) {
    cfg = cfg || {};
    rootEl = document.getElementById(cfg.mount || 'kvp');
    rootEl.classList.add('kvp-root', 'hidden', 'thk-1');   /* 既定の厚み方式=①積層スラブ */
    const stage = document.createElement('div'); stage.className = 'kvp-stage'; rootEl.appendChild(stage);
    worldEl = document.createElement('div'); worldEl.className = 'kvp-world'; stage.appendChild(worldEl);
    function fit() {
      /* ⚠️ ステージを縮小(transform/zoom/scale)すると Chrome が子の backdrop-filter を描画しない
         (Chromium #415354762)。なので拡大縮小は最大1倍・横幅fitのみ＝実質スケールしない。
         高さは溢れさせる（中央のグラフィックは収まる）。狭い画面のフィットは移行時にレイアウトで対応。 */
      const rw = rootEl.clientWidth;
      stage.style.zoom = Math.min(1, rw / STAGE.w);
    }
    window.addEventListener('resize', fit); fit(); rootEl._fit = fit;
    window.addEventListener('pointermove', onPointer);
    return rootEl;
  }

  function setPattern(key, opts) {
    opts = opts || {};
    const p = PATTERNS[key]; if (!p) return;
    if (eMockStop) { eMockStop(); eMockStop = null; }
    pendingIntro = null;                                 /* 前の保留があれば捨てる */
    eBack = eFront = null;
    cur = key;
    worldEl.innerHTML = '';
    rootEl.classList.remove('pat-p1', 'pat-p2', 'pat-p3', 'pat-p4', 'pat-p5', 'pat-p6', 'pat-p7', 'pat-p8', 'pat-p9', 'is-iso', 'is-flat');
    rootEl.classList.add('pat-' + key);
    viewMode = p.iso ? 'iso' : 'flat';                  /* 案の既定ビュー（後で普通/アイソメで切替可） */
    applyView();
    curTransform = Object.assign({}, viewMode === 'iso' ? ISO_PRESET : FLAT_PRESET);

    if (key === 'p6' || key === 'p7' || key === 'p8' || key === 'p9') {  /* H/I/J/K: 同じシーン。p7/p9=PNG画像 / p8=背景色拾い / p9=緩い3D角度 */
      const scene = buildSvgScene(key === 'p7' || key === 'p9');
      worldEl.appendChild(scene);
      eBack = scene.querySelector('.kvp-e-back');
      eFront = scene.querySelector('.kvp-e-icons');
      applyFloat(); applyParallax(); applyTransform();
      /* 入場: モックのタイピングを回し→ playIntro が mock→アイコン→軌道の順で出す。
         opts.defer=true（本体に埋め込み時）は、親の「見出しタイピング完了」の合図まで待つ。
         シーンは .kvp-intro で隠したまま置いておき、runDeferredIntro() で開始する。 */
      const runIntro = () => {
        if (eMockStop) { eMockStop(); eMockStop = null; }
        eMockStop = startEMock(scene.querySelector('.kvp-emock-slot'));  /* モックをアニメ（開発者体験1と同じ） */
        playIntro(scene);   /* 入場アニメ: mock→アイコン→軌道/ドット */
      };
      if (opts.defer) pendingIntro = runIntro;   /* 親の合図待ち */
      else runIntro();
      return;
    }

    if (key === 'p5') {                              /* E: 前向きmock＋同心円＋周回ドット＋大小ガラス */
      eBack = document.createElement('div'); eBack.className = 'kvp-e-back';
      eBack.appendChild(buildEOrbits());
      eBack.appendChild(buildDashE());
      eFront = document.createElement('div'); eFront.className = 'kvp-e-icons';
      p.layout.forEach((it, i) => {
        const node = buildIcon(it.id, p.box, it.size);
        placeIcon(node, it.x, it.y, it.size);
        node.style.setProperty('--fd', (i * 0.6) + 's');
        eFront.appendChild(node);
      });
      worldEl.appendChild(eBack); worldEl.appendChild(eFront);
      eMockStop = startEMock(worldEl.querySelector('.kvp-emock-slot'));
      applyFloat(); applyParallax(); applyTransform();
      return;
    }

    if (p.conn === 'rings')  worldEl.appendChild(buildRings());
    if (p.conn === 'orbit')  worldEl.appendChild(buildOrbitRing());
    worldEl.appendChild(buildDash());
    if (p.conn === 'circuit') worldEl.appendChild(buildCircuit(p.layout));
    p.layout.forEach(it => { const node = buildIcon(it.id, p.box); placeIcon(node, it.x, it.y); worldEl.appendChild(node); });
    applyFloat(); applyTransform();
  }

  /* アイソメの厚み: 方式(1=積層/2=面/3=影)と 厚み/光源角度/光の強さ */
  function setThick(n) { rootEl.classList.remove('thk-1', 'thk-2', 'thk-3'); rootEl.classList.add('thk-' + n); }
  function setThickVar(k, v) {
    const map = { thk: '--thk', lang: '--lang', lint: '--lint' };
    if (map[k]) rootEl.style.setProperty(map[k], v);
  }
  function setFloat(on) { floatOn = !!on; applyFloat(); }
  function setParallax(on) { parallaxOn = !!on; applyParallax(); }
  function setTransform(v) { curTransform = Object.assign(curTransform, v); applyTransform(); }
  function show() { rootEl.classList.remove('hidden'); rootEl._fit && rootEl._fit(); }
  function hide() { rootEl.classList.add('hidden'); }
  /* 保留中の入場（opts.defer で待たせたもの）を実行。親の「見出しタイピング完了」の合図で呼ぶ。 */
  function runDeferredIntro() { if (pendingIntro) { const f = pendingIntro; pendingIntro = null; f(); } }
  function hasPendingIntro() { return !!pendingIntro; }
  /* 入場の各フェーズの出始めタイミング(秒)を上書き。本体パネルから postMessage で呼ぶ。 */
  function setIntroTiming(t) { if (t) introTiming = Object.assign({}, introTiming, t); }
  /* 今の案の入場をもう一度頭から再生（パネルでタイミングを変えた時の確認用）。 */
  function replayIntro() { if (cur) setPattern(cur); }

  global.KVP = { start, setPattern, show, hide, setFloat, setParallax, setTransform, setView,
    setThick, setThickVar, setMockAnim, setDotSpeed, setDotEase, runDeferredIntro, hasPendingIntro,
    setIntroTiming, replayIntro,
    get: () => cur, getTransform: () => Object.assign({}, curTransform),
    getMockAnim: () => mockAnimOn, getDotSpeed: () => dotSpeed, getDotEase: () => dotEase,
    PATTERNS, C, STAGE };
})(window);
