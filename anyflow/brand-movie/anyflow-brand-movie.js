/*!
 * <anyflow-brand-movie> — Anyflow Embed ブランドムービー（Web 埋め込み用・依存ゼロ）
 *
 * 使い方:
 *   <script src="anyflow-brand-movie.js" defer></script>
 *   <anyflow-brand-movie></anyflow-brand-movie>
 *
 * 属性:
 *   autoplay      画面に入ったら自動再生（既定 ON。autoplay="false" で OFF）
 *   loop          最後まで行ったら頭から（既定 ON。loop="false" で OFF）
 *   controls      下に再生／シークバーを出す
 *   poster-time   動きを減らす設定の人・再生前に見せるコマ（秒。既定 30）
 *
 * JS から: el.play() / el.pause() / el.seek(秒) / el.currentTime / el.duration
 * 16:9 で幅いっぱいに伸びる。内部は 1920x1080 で描いて縮小（Retina でもにじまない）。
 */
(() => {
  if (customElements.get('anyflow-brand-movie')) return;

  const LOGO_PATHS=[{"d": "M0.0996099 26.7819L0.0996094 38.8493C0.099609 45.0527 6.83286 48.9298 12.2195 45.8282L28.3792 36.523C33.4082 33.6273 33.7421 26.6763 29.3811 23.2419C29.4878 23.326 29.5916 23.4121 29.6926 23.5002C29.2977 23.8445 28.8599 24.1583 28.3792 24.4351L12.2194 33.7402C6.83874 36.8385 0.114336 32.9733 0.0996099 26.7819Z", "fill": "#FF5D97", "evenodd": false}, {"d": "M29.602 23.5781C33.7293 20.0861 33.3216 13.3233 28.3793 10.4774L12.2194 1.17222C6.83288 -1.92949 0.0996343 1.94766 0.0996339 8.1511L0.0996334 20.219C0.099618 20.2257 0.0996102 20.2324 0.0996102 20.2389L0.0996094 26.7614L0.09961 26.7644C0.1007 29.8648 1.7837 32.3838 4.13958 33.7403C1.78295 32.3833 0.0996093 29.8631 0.0996094 26.7614L0.0996334 20.219C0.114035 14.0272 6.83863 10.1617 12.2194 13.26L28.3793 22.5652C28.86 22.8421 29.2977 23.1559 29.6927 23.5002C29.6627 23.5263 29.6325 23.5523 29.602 23.5781Z", "fill": "#0EBBFF", "evenodd": true}, {"d": "M0.0996102 20.2392L0.0996094 26.7617C0.0996094 26.7626 0.0996096 26.7637 0.09961 26.7647C0.10179 32.9664 6.83374 36.8417 12.2194 33.7406L28.3793 24.4354C28.86 24.1585 29.2977 23.8447 29.6927 23.5004C29.2977 23.1562 28.86 22.8423 28.3793 22.5655L12.2194 13.2604C6.83286 10.1586 0.0996106 14.0358 0.0996102 20.2392Z", "fill": "#0E4497", "evenodd": false}, {"d": "M99.0095 17.5496V33.2025H103.612V22.3526H107.606V18.6781H103.612V17.7522C103.612 16.5948 104.393 15.9294 105.493 15.9294C105.84 15.9294 106.304 16.0162 106.738 16.1607L107.722 12.5731C106.796 12.168 105.84 11.9656 104.856 11.9656C101.354 11.9656 99.0095 14.1356 99.0095 17.5496ZM80.0935 24.2911V33.2025H75.4913V25.2748C75.4913 23.5677 74.4782 22.4106 73.002 22.4106C71.1783 22.4106 69.9917 23.6546 69.9917 26.4611V33.2025H65.3605V18.6781H69.9917V20.0669C71.0916 18.9095 72.6257 18.244 74.4492 18.244C77.8357 18.244 80.0935 20.6454 80.0935 24.2911ZM89.2107 38.1212H84.2033L86.5478 32.7107L80.5272 18.6491H85.5057L88.9502 27.1265L92.6263 18.6491H97.6049L89.2107 38.1212ZM109.661 33.2025H114.292V12.3706H109.661V33.2025ZM124.394 22.179C126.188 22.179 127.896 23.6836 127.896 25.9403C127.896 28.226 126.188 29.7018 124.394 29.7018C122.512 29.7018 120.805 28.226 120.805 25.9403C120.805 23.6836 122.512 22.179 124.394 22.179ZM124.394 33.6076C128.706 33.6076 132.354 30.5407 132.354 25.9403C132.354 21.3689 128.706 18.302 124.394 18.302C119.994 18.302 116.347 21.3689 116.347 25.9403C116.347 30.5407 119.994 33.6076 124.394 33.6076ZM150.414 33.2315H146.391L143.786 25.3618L141.152 33.2315H137.129L132.469 18.678H137.014L139.387 26.49L142.137 18.678H145.408L148.157 26.5189L150.53 18.678H155.076L150.414 33.2315ZM51.2649 25.5642L53.7252 19.1989L56.2144 25.5642H51.2649ZM57.8065 29.6728L59.1669 33.2027H64.2613L56.1565 13.8173H51.2649L43.1602 33.2027H48.2835L49.6439 29.6728H57.8065Z", "fill": "black", "evenodd": true}, {"d": "M165.787 30.4571V24.932H176.258V22.1549H165.787V16.6875H177.128V13.8816H162.684V33.2631H177.157V30.4571H165.787Z", "fill": "black", "evenodd": false}, {"d": "M197.846 18.5103C195.467 18.5103 193.64 19.5227 192.48 21.1426C191.552 19.4648 189.753 18.5103 187.694 18.5103C185.635 18.5103 184.127 19.2912 183.083 20.5352V18.9152H180.066V33.2634H183.083V26.1472C183.083 22.9361 184.591 21.2873 186.911 21.2873C188.768 21.2873 190.16 22.618 190.16 24.7296V33.2634H193.176V26.1472C193.176 22.9361 194.713 21.2873 197.062 21.2873C198.919 21.2873 200.311 22.618 200.311 24.7296V33.2634H203.299V24.1222C203.299 20.7376 200.834 18.5103 197.846 18.5103Z", "fill": "black", "evenodd": false}, {"d": "M214.761 18.5098C212.585 18.5098 210.786 19.2619 209.54 20.5636V12.435H206.523V33.2629H209.54V31.614C210.786 32.9158 212.585 33.6679 214.761 33.6679C218.531 33.6679 221.895 30.6304 221.895 26.0889C221.895 21.5761 218.531 18.5098 214.761 18.5098ZM214.267 31.0066C211.889 31.0066 209.54 29.1262 209.54 26.0889C209.54 23.0804 211.889 21.1712 214.267 21.1712C216.906 21.1712 218.966 23.0804 218.966 26.0889C218.966 29.1262 216.906 31.0066 214.267 31.0066Z", "fill": "black", "evenodd": false}, {"d": "M237.978 25.7711C237.862 21.4609 234.672 18.5103 230.814 18.5103C226.754 18.5103 223.359 21.5476 223.359 26.1182C223.359 30.6599 226.782 33.6684 230.698 33.6684C233.888 33.6684 236.441 32.1641 237.63 29.1557L234.932 28.5771C233.917 30.602 232.293 31.0649 230.698 31.0649C228.58 31.0649 226.638 29.4738 226.347 26.8125H238.008V25.7711H237.978ZM230.814 21.1716C232.787 21.1716 234.44 22.3287 234.932 24.6718H226.434C226.899 22.3576 228.928 21.1716 230.814 21.1716Z", "fill": "black", "evenodd": false}, {"d": "M251.849 12.435V20.5636C250.601 19.2619 248.802 18.5098 246.628 18.5098C242.885 18.5098 239.492 21.5761 239.492 26.0889C239.492 30.6304 242.885 33.6679 246.628 33.6679C248.802 33.6679 250.601 32.9158 251.849 31.614V33.2629H254.894V12.435H251.849ZM247.121 31.0066C244.51 31.0066 242.451 29.1262 242.451 26.0889C242.451 23.0804 244.51 21.1712 247.121 21.1712C249.528 21.1712 251.849 23.0804 251.849 26.0889C251.849 29.1262 249.528 31.0066 247.121 31.0066Z", "fill": "black", "evenodd": false}];

  // Noto Sans JP が無いページでも崩れないように読み込む
  function ensureFont() {
    if (!document.querySelector('link[data-afbm-font]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.dataset.afbmFont = '';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;800&display=swap';
      document.head.appendChild(l);
    }
    return Promise.all(['300', '400', '500', '700', '800'].map(w => document.fonts.load(`${w} 40px "Noto Sans JP"`, 'あAnyflow')))
      .then(() => document.fonts.ready).catch(() => {});
  }

  /* 描画エンジン：時間 t だけで 1 コマを描く */
  function createMovie(ctx) {
    /* ============================================================
       Anyflow Embed ブランドムービー
       すべて時間 t（秒）だけで描く → 同じ t なら必ず同じ絵（書き出し用）
       ============================================================ */
    const W = 1920, H = 1080, DURATION = 32;

    /* ---- サイトの色トークン（v5/index.html :root から） ---- */
    const C = {
      surface: '#E7E7E7', grid: '#ACACAC', ink: '#101828', inkMuted: '#545961',
      pink: '#FF5D97', cyan: '#0EBBFF', blueDeep: '#0E4497', blue: '#1e9bff', blue2: '#0b6bff',
      darkTop: '#161616', darkBottom: '#454545', codeGreen: '#7CE7A6',
    };
    const JP = "'Noto Sans JP', sans-serif";
    const EN = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
    const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    /* ---- 共通ヘルパー ---- */
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const seg = (t, a, b) => clamp((t - a) / (b - a));           // 区間 a→b の進み 0..1
    const lerp = (a, b, p) => a + (b - a) * p;
    const eOut = p => 1 - Math.pow(1 - p, 3);
    const eOut5 = p => 1 - Math.pow(1 - p, 5);
    const eInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const eIn = p => p * p * p;
    // 出て→消える 窓（in 区間でフェードイン、out 区間でフェードアウト）
    const win = (t, a, b, c, d) => Math.min(eOut(seg(t, a, b)), 1 - eIn(seg(t, c, d)));

    // 決定的な乱数（毎回同じ配置）
    function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

    function text(str, x, y, o = {}) {
      const { size = 48, weight = 700, color = C.ink, font = JP, align = 'left', alpha = 1,
              ls = 0, rise = 0, fill = null, baseline = 'alphabetic' } = o;
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.font = `${weight} ${size}px ${font}`;
      ctx.letterSpacing = ls + 'px';
      ctx.textAlign = align; ctx.textBaseline = baseline;
      ctx.fillStyle = fill || color;
      ctx.fillText(str, x, y + rise);
      ctx.restore();
    }
    // 下から持ち上がって出る見出し（マスク付き）
    function revealLine(str, x, y, p, o = {}) {
      const size = o.size || 48;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y - size * 1.25, W, size * 1.6);
      ctx.clip();
      text(str, x, y, { ...o, rise: (1 - eOut5(p)) * size * 1.3, alpha: (o.alpha ?? 1) * clamp(p * 3) });
      ctx.restore();
    }
    function measure(str, size, weight = 700, font = JP, ls = 0) {
      ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.letterSpacing = ls + 'px';
      const w = ctx.measureText(str).width; ctx.restore(); return w;
    }
    function brandGrad(x0, y0, x1, y1) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, C.pink); g.addColorStop(.5, '#b58bff'); g.addColorStop(1, C.cyan);
      return g;
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

    /* ---- 背景 ---- */
    function bgLight(alpha = 1) {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.grid; ctx.globalAlpha = alpha * .35; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 160) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
      for (let y = 60; y <= H; y += 160) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
      ctx.restore();
    }
    function bgDark(alpha = 1) {
      ctx.save(); ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, C.darkTop); g.addColorStop(1, C.darkBottom);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    /* ---- 星座ネットワーク（点と線） ---- */
    const NET = (() => {
      const r = rng(42), pts = [];
      for (let i = 0; i < 90; i++) {
        // 球面上に配置 → 回転で立体に見せる
        const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        pts.push({ x: s * Math.cos(th), y: u, z: s * Math.sin(th),
                   sx: r() * W, sy: r() * H, delay: r(), hue: r() });
      }
      const edges = [];
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (d < .42) edges.push({ i, j, d, delay: (a.delay + b.delay) / 2, ph: r() });
      }
      return { pts, edges };
    })();
    // form: 0=画面に散らばる / 1=球体に集まる
    function drawNetwork(t, { cx, cy, R, form, alpha = 1, rot = 0, build = 1, pulses = 1, dark = false }) {
      if (alpha <= 0) return;
      const P = NET.pts.map(p => {
        const ca = Math.cos(rot), sa = Math.sin(rot);
        const x = p.x * ca - p.z * sa, z = p.x * sa + p.z * ca;
        const tilt = .35, y2 = p.y * Math.cos(tilt) - z * Math.sin(tilt), z2 = p.y * Math.sin(tilt) + z * Math.cos(tilt);
        const px = lerp(p.sx, cx + x * R, form), py = lerp(p.sy, cy + y2 * R, form);
        return { x: px, y: py, z: lerp(0, z2, form), vis: eOut(clamp((build - p.delay * .6) / .4)) };
      });
      ctx.save(); ctx.globalAlpha = alpha;
      // 線
      for (const e of NET.edges) {
        const a = P[e.i], b = P[e.j];
        const p = clamp((build - .25 - e.delay * .55) / .35);
        if (p <= 0) continue;
        const depth = .35 + .65 * (1 - (a.z + b.z + 2) / 4);
        ctx.strokeStyle = dark ? `rgba(255,255,255,${.28 * depth})` : `rgba(80,110,160,${.32 * depth})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(lerp(a.x, b.x, eOut(p)), lerp(a.y, b.y, eOut(p))); ctx.stroke();
        // 流れる光（データの粒）
        if (pulses > 0 && p >= 1 && e.ph < .45) {
          const k = (t * .55 + e.ph * 7) % 1;
          const x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k);
          const col = e.ph < .22 ? C.pink : C.cyan;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
          g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = alpha * pulses * Math.sin(k * Math.PI);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
          ctx.globalAlpha = alpha;
        }
      }
      // 点
      for (let i = 0; i < P.length; i++) {
        const q = P[i]; if (q.vis <= 0) continue;
        const col = NET.pts[i].hue < .3 ? C.pink : NET.pts[i].hue < .7 ? C.cyan : (dark ? '#fff' : C.blueDeep);
        ctx.globalAlpha = alpha * q.vis * (.45 + .55 * (1 - (q.z + 1) / 2));
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q.x, q.y, 2.6 + 1.4 * q.vis, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    /* ---- グラデの球体（KVの惑星） ---- */
    function drawSphere(t, cx, cy, R, alpha = 1) {
      if (alpha <= 0 || R <= 1) return;
      ctx.save(); ctx.globalAlpha = alpha;
      // 外側のにじみ
      const halo = ctx.createRadialGradient(cx, cy, R * .6, cx, cy, R * 1.5);
      halo.addColorStop(0, 'rgba(14,187,255,.18)'); halo.addColorStop(1, 'rgba(14,187,255,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
      const base = ctx.createRadialGradient(cx - R * .3, cy - R * .35, R * .1, cx, cy, R * 1.05);
      base.addColorStop(0, '#dff4ff'); base.addColorStop(.35, '#6cc8ff'); base.addColorStop(.75, C.blue2); base.addColorStop(1, C.blueDeep);
      ctx.fillStyle = base; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      // 回るピンクとシアンのにじみ
      ctx.filter = `blur(${R * .18}px)`;
      const a = t * .6;
      const blob = (bx, by, br, col) => { const g = ctx.createRadialGradient(bx, by, 0, bx, by, br); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill(); };
      blob(cx + Math.cos(a) * R * .45, cy + R * .4 + Math.sin(a) * R * .15, R * .7, 'rgba(255,93,151,.85)');
      blob(cx + Math.cos(a + 2.4) * R * .5, cy + Math.sin(a + 2.4) * R * .4, R * .6, 'rgba(14,187,255,.7)');
      blob(cx - R * .35, cy - R * .4, R * .45, 'rgba(255,255,255,.9)');
      ctx.filter = 'none';
      ctx.restore();
    }

    /* ---- ロゴ ---- */
    const LOGO = LOGO_PATHS.map(p => ({ ...p, path: new Path2D(p.d) }));
    // mark: 0..1 マークの組み上がり / word: 0..1 文字の出現
    function drawLogo(x, y, scale, { mark = 1, word = 1, dark = false, embed = false } = {}) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      LOGO.forEach((p, i) => {
        if (i < 3) {
          // 3枚のパーツが別方向から滑り込む
          const off = [[-40, 30], [-40, -30], [30, 0]][i];
          const k = eOut5(clamp(mark * 1.4 - i * .2));
          if (k <= 0) return;
          ctx.save(); ctx.globalAlpha *= k; ctx.translate(off[0] * (1 - k), off[1] * (1 - k));
          ctx.fillStyle = p.fill; ctx.fill(p.path, p.evenodd ? 'evenodd' : 'nonzero'); ctx.restore();
        } else {
          const k = eOut(clamp(word * 1.6 - (i - 3) * .1));
          if (k <= 0) return;
          ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, 12 * (1 - k));
          ctx.fillStyle = dark ? '#fff' : '#000'; ctx.fill(p.path, p.evenodd ? 'evenodd' : 'nonzero'); ctx.restore();
        }
      });
      ctx.restore();
      if (embed) text('Embed', x + 262 * scale, y + 37 * scale, { size: 34 * scale, weight: 500, font: EN, color: dark ? '#fff' : C.ink, alpha: eOut(clamp(word * 1.6 - .8)) });
    }

    /* ============================================================
       シーン
       ============================================================ */

    /* S1 0–4.2s：散らばった点がつながり、球体へ集まる */
    function S1(t) {
      const build = seg(t, .2, 2.6);
      const form = eInOut(seg(t, 2.4, 4.4));
      drawNetwork(t, { cx: 1340, cy: 560, R: 330, form, build, rot: t * .12, pulses: seg(t, 1.6, 2.4) });
      const a = win(t, .6, 1.4, 2.5, 3.1);
      text('Connect', W / 2, 520, { size: 26, weight: 500, font: EN, color: C.inkMuted, align: 'center', ls: 10, alpha: a });
      text('data  ×  AI  ×  product', W / 2, 590, { size: 56, weight: 300, font: EN, color: C.ink, align: 'center', ls: 2, alpha: a });
    }

    /* S2 3.8–9s：KV 見出し＋球体 */
    function S2(t) {
      const lt = t - 3.8;
      drawNetwork(t, { cx: 1340, cy: 560, R: 330, form: 1, build: 1, rot: t * .12, pulses: 1, alpha: 1 - seg(t, 8.4, 9.2) });
      const grow = eOut5(seg(lt, .4, 1.8));
      drawSphere(t, 1340, 560, 250 * grow * (1 + .03 * Math.sin(t * 1.3)), 1 - seg(t, 8.6, 9.3));
      const out = 1 - seg(t, 8.3, 8.9);
      const x = 160;
      revealLine('データ連携で', x, 390, seg(lt, 1.0, 1.9), { size: 92, weight: 700, alpha: out });
      revealLine('AIとプロダクトに', x, 510, seg(lt, 1.2, 2.1), { size: 92, weight: 700, alpha: out });
      revealLine('競争力を', x, 680, seg(lt, 1.5, 2.5), { size: 160, weight: 800, alpha: out, ls: -2 });
      revealLine('AI/プロダクト企業のためのデータ統合プラットフォーム', x + 4, 780, seg(lt, 2.2, 3.0), { size: 28, weight: 500, color: C.inkMuted, alpha: out });
    }

    /* S3 8.8–15s：Our Vision ＋ 5つの機能がAnyflowにつながる図 */
    const NODES = [
      { jp: 'コネクタ', sub: '外部サービスをつなぐ', x: 430, y: 760 },
      { jp: '認証ウィザード', sub: '認証設定を支える', x: 610, y: 560 },
      { jp: 'SDK', sub: '開発環境に組み込む', x: 960, y: 490 },
      { jp: 'ワークフロー', sub: '連携処理を組み立てる', x: 1310, y: 560 },
      { jp: '実行エンジン', sub: '処理を実行する', x: 1490, y: 760 },
    ];
    function S3(t) {
      const lt = t - 8.8;
      const out = 1 - seg(t, 14.4, 15.0);
      // 見出し
      const hx = W / 2;
      text('Our Vision', hx, 110, { size: 24, weight: 500, font: EN, color: C.cyan, align: 'center', ls: 4, alpha: out * eOut(seg(lt, .2, .8)) });
      const l1 = 'データをつなぐことが、', l2 = '強みになる時代へ';
      const sz = 76;
      const g1 = brandGrad(hx - 500, 0, hx + 500, 0);
      // 「つなぐ」「強み」をブランドグラデに
      revealLine(l1, hx, 200, seg(lt, .4, 1.3), { size: sz, weight: 700, align: 'center', alpha: out, fill: C.ink });
      revealLine(l2, hx, 295, seg(lt, .6, 1.5), { size: sz, weight: 700, align: 'center', alpha: out, fill: C.ink });
      // グラデ文字を上から重ねる
      const wl1 = measure(l1, sz), wA = measure('データを', sz), wB = measure('つなぐ', sz);
      const wl2 = measure(l2, sz), wS = measure('強み', sz);
      const gp = eOut(seg(lt, 1.4, 2.2));
      revealLine('つなぐ', hx - wl1 / 2 + wA, 200, seg(lt, .4, 1.3), { size: sz, weight: 700, fill: brandGrad(hx - wl1 / 2 + wA, 0, hx - wl1 / 2 + wA + wB, 0), alpha: out * gp });
      revealLine('強み', hx - wl2 / 2, 295, seg(lt, .6, 1.5), { size: sz, weight: 700, fill: brandGrad(hx - wl2 / 2, 0, hx - wl2 / 2 + wS, 0), alpha: out * gp });

      // 中心のロゴ（マーク）
      const cx = 960, cy = 900;
      const hub = eOut5(seg(lt, 1.6, 2.4));
      ctx.save(); ctx.globalAlpha = out;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 190);
      glow.addColorStop(0, `rgba(14,187,255,${.22 * hub})`); glow.addColorStop(1, 'rgba(14,187,255,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 190, 0, 7); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = out; drawLogo(cx - 255 * 1.35 / 2, cy - 32, 1.35, { mark: hub, word: seg(lt, 2.0, 2.8) }); ctx.restore();

      // 機能ノードと線
      NODES.forEach((n, i) => {
        const p = seg(lt, 2.2 + i * .18, 3.0 + i * .18);
        if (p <= 0) return;
        ctx.save(); ctx.globalAlpha = out;
        // 線（ノード→ハブ）
        const ex = cx, ey = cy - 60;
        ctx.strokeStyle = 'rgba(80,110,160,.45)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(n.x, n.y + 40); ctx.lineTo(lerp(n.x, ex, eOut(p)), lerp(n.y + 40, ey, eOut(p))); ctx.stroke();
        ctx.setLineDash([]);
        // データの光がハブへ流れる
        if (p >= 1) for (let k = 0; k < 2; k++) {
          const q = ((t * .7 + i * .21 + k * .5) % 1);
          const x = lerp(n.x, ex, q), y = lerp(n.y + 40, ey, q);
          const col = (i + k) % 2 ? C.pink : C.cyan;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 12); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = out * Math.sin(q * Math.PI); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = out;
        // ノードの点
        ctx.fillStyle = i % 2 ? C.pink : C.cyan;
        ctx.beginPath(); ctx.arc(n.x, n.y + 40, 5 * eOut5(p), 0, 7); ctx.fill();
        ctx.restore();
        text(n.jp, n.x, n.y - 4, { size: 30, weight: 700, align: 'center', alpha: out * eOut(p), rise: 14 * (1 - eOut(p)) });
        text(n.sub, n.x, n.y + 24, { size: 17, weight: 400, color: C.inkMuted, align: 'center', alpha: out * eOut(p) });
      });
    }

    /* S4 14.8–19.6s：for SaaS / for AI */
    function S4(t) {
      const lt = t - 14.8;
      const out = 1 - seg(t, 19.0, 19.5);
      // 中央の仕切り線
      const lp = eOut5(seg(lt, .1, .9));
      ctx.save(); ctx.globalAlpha = out; ctx.strokeStyle = C.line || '#D1D5DC'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(960, 540 - 330 * lp); ctx.lineTo(960, 540 + 330 * lp); ctx.stroke(); ctx.restore();

      const cols = [
        { x: 480, tag: 'for SaaS Product', col: C.pink, t1: 'リアルタイムに', t2: 'データ同期', d: 0 },
        { x: 1440, tag: 'for AI Product', col: C.blue, t1: 'コンテキスト取得', t2: 'から実行まで', d: .35 },
      ];
      cols.forEach(c => {
        const p = k => seg(lt, c.d + k, c.d + k + .8);
        text(c.tag, c.x, 250, { size: 26, weight: 500, font: EN, color: c.col, align: 'center', alpha: out * eOut(p(.3)), rise: 16 * (1 - eOut(p(.3))) });
        revealLine(c.t1, c.x, 340, p(.45), { size: 58, weight: 700, align: 'center', alpha: out });
        revealLine(c.t2, c.x, 418, p(.55), { size: 58, weight: 700, align: 'center', alpha: out });
      });
      // SaaS アイコン：重なる角丸四角（同期して回る）
      {
        const cx = 480, cy = 690, s = 150;
        const a = eOut5(seg(lt, .9, 1.9));
        const sway = Math.sin(t * 1.4) * .06;
        [[C.pink, -.22, -26], [C.ink, -.05, 0], [C.cyan, .16, 26]].forEach(([col, r, dx], i) => {
          ctx.save(); ctx.globalAlpha = out * a;
          ctx.translate(cx + dx * a, cy); ctx.rotate((r + sway * (i - 1)) * a);
          ctx.strokeStyle = col; ctx.lineWidth = 3; roundRect(-s / 2, -s / 2 * 1.2, s, s * 1.2, 16); ctx.stroke();
          ctx.restore();
        });
      }
      // AI アイコン：点付きの棒グラフが伸びる
      {
        const bx = 1320, by = 780, hs = [120, 190, 150, 230, 175, 205];
        hs.forEach((h, i) => {
          const p = eOut5(seg(lt, 1.2 + i * .08, 2.0 + i * .08));
          const hh = h * p * (1 + .08 * Math.sin(t * 2 + i));
          const x = bx + i * 48;
          ctx.save(); ctx.globalAlpha = out;
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by - hh); ctx.stroke();
          ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(x, by - hh, 7 * p, 0, 7); ctx.fill();
          ctx.restore();
        });
        ctx.save(); ctx.globalAlpha = out * eOut(seg(lt, 1, 1.6)); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(bx - 40, by); ctx.lineTo(bx + 280, by); ctx.stroke(); ctx.restore();
      }
    }

    /* S5 19.4–24.6s：暗転 → エディタでコードが自動生成される */
    const CODE = [
      'import { Kintone } from "@anyflowinc/kintone";',
      '',
      'export async function workflow(',
      '  triggerOutput: TriggerOutput,',
      '  _context: WorkflowContext,',
      '): Promise<void> {',
      '  const client = new Kintone();',
      '  await client.record.addRecord({',
      '    app: _context.endUserInputs.kintoneAppId,',
      '    record: toKintoneRecord(triggerOutput.payload),',
      '  });',
      '}',
    ];
    const CLI = [
      ['$ embed pull', '#fff'], ['  ✔ 4 files synced', C.codeGreen], ['', ''],
      ['$ claude "CSVの顧客データをHubSpotへ"', '#fff'], ['  ✎ main.ts generated', C.codeGreen], ['', ''],
      ['$ embed push', '#fff'], ['  ✔ ready for test run', C.codeGreen],
    ];
    function colorize(line) {
      // ざっくり構文ハイライト
      const out = []; const re = /("[^"]*")|\b(import|from|export|async|function|const|new|await|Promise|void)\b/g;
      let last = 0, m;
      while ((m = re.exec(line))) {
        if (m.index > last) out.push([line.slice(last, m.index), '#d4d4d8']);
        out.push([m[0], m[1] ? C.codeGreen : C.cyan]); last = re.lastIndex;
      }
      if (last < line.length) out.push([line.slice(last), '#d4d4d8']);
      return out;
    }
    function S5(t) {
      const lt = t - 19.4;
      const out = 1 - seg(t, 24.2, 24.7);
      // 見出し
      const headIn = eOut(seg(lt, .5, 1.2));
      const phase2 = seg(lt, 3.0, 3.4); // CLI に切替
      text('Strength 01', 960, 150, { size: 22, weight: 500, font: EN, color: C.cyan, align: 'center', ls: 2, alpha: out * headIn * (1 - phase2) });
      text('自動生成で開発スピードを加速', 960, 215, { size: 52, weight: 700, color: '#fff', align: 'center', alpha: out * headIn * (1 - phase2), rise: 10 * (1 - headIn) });
      text('Strength 02', 960, 150, { size: 22, weight: 500, font: EN, color: C.cyan, align: 'center', ls: 2, alpha: out * phase2 });
      text('開発環境・CLI・SDK に柔軟に適応', 960, 215, { size: 52, weight: 700, color: '#fff', align: 'center', alpha: out * phase2 });

      // エディタ窓
      const wp = eOut5(seg(lt, .7, 1.6));
      const ww = 1180, wh = 640, wx = 960 - ww / 2, wy = 290 + 60 * (1 - wp);
      ctx.save(); ctx.globalAlpha = out * wp;
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
      ctx.fillStyle = '#232326'; roundRect(wx, wy, ww, wh, 18); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.stroke();
      ctx.fillStyle = '#2c2c30'; roundRect(wx, wy, ww, 46, [18, 18, 0, 0]); ctx.fill();
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(wx + 26 + i * 22, wy + 23, 6.5, 0, 7); ctx.fill(); });
      ctx.restore();
      text(phase2 < .5 ? 'main.ts' : 'anyflow — zsh', 960, wy + 30, { size: 16, weight: 500, font: EN, color: '#9ca3af', align: 'center', alpha: out * wp });

      // コード（1文字ずつ生成）
      const fs = 24, lh = 40, ox = wx + 60, oy = wy + 110;
      const total = CODE.join('\n').length;
      let budget = Math.floor(total * eInOut(seg(lt, 1.2, 2.9)));
      const codeA = out * wp * (1 - phase2);
      if (codeA > 0) {
        ctx.save(); ctx.globalAlpha = codeA; ctx.font = `400 ${fs}px ${MONO}`; ctx.textBaseline = 'alphabetic';
        let cursor = null;
        CODE.forEach((line, i) => {
          if (budget < 0) return;
          const shown = line.slice(0, Math.max(0, budget)); budget -= line.length + 1;
          ctx.fillStyle = '#4b5563'; ctx.textAlign = 'right'; ctx.fillText(String(i + 1), ox - 20, oy + i * lh); ctx.textAlign = 'left';
          let x = ox, used = 0;
          for (const [s, col] of colorize(line)) {
            const part = s.slice(0, Math.max(0, shown.length - used)); used += s.length;
            if (!part) break; ctx.fillStyle = col; ctx.fillText(part, x, oy + i * lh); x += ctx.measureText(part).width;
          }
          cursor = [x, oy + i * lh];
        });
        if (cursor && Math.floor(t * 2.5) % 2 === 0) { ctx.fillStyle = C.cyan; ctx.fillRect(cursor[0] + 2, cursor[1] - fs + 4, 12, fs); }
        ctx.restore();
        // AI アシスタントの吹き出し
        const bp = eOut5(seg(lt, .9, 1.5));
        ctx.save(); ctx.globalAlpha = codeA * bp;
        const bx = wx + ww - 420, by = wy + wh - 120 + 20 * (1 - bp);
        ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(bx, by, 380, 70, 14); ctx.fill();
        ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(bx + 32, by + 35, 12, 0, 7); ctx.fill();
        ctx.restore();
        text('AI Assistant', bx + 56, by + 30, { size: 14, weight: 600, font: EN, color: '#9ca3af', alpha: codeA * bp });
        text('kintone にユーザーデータを連携したい', bx + 56, by + 54, { size: 18, weight: 500, color: '#fff', alpha: codeA * bp });
      }
      // CLI
      if (phase2 > 0) {
        ctx.save(); ctx.globalAlpha = out * wp * phase2; ctx.font = `400 ${fs}px ${MONO}`;
        const n = seg(lt, 3.3, 4.7) * CLI.length;
        CLI.forEach(([s, col], i) => {
          const p = clamp(n - i); if (p <= 0 || !s) return;
          ctx.fillStyle = col; ctx.fillText(s.slice(0, Math.ceil(s.length * (col === '#fff' ? p : 1))), ox - 10, oy + 10 + i * lh);
        });
        ctx.restore();
      }
    }

    /* S6 24.4–28.4s：実績カウンター */
    const STATS = [
      { label: '導入企業', v: 100, fmt: v => `${Math.round(v)}`, suf: '+' },
      { label: '連携実績', v: 20000, fmt: v => Math.round(v).toLocaleString('en-US'), suf: '+' },
      { label: '連携アプリ数', v: 200, fmt: v => `${Math.round(v)}`, suf: '+' },
      { label: 'iPaasサービス', v: 1, fmt: () => 'No.1', suf: '' },
    ];
    function S6(t) {
      const lt = t - 24.4;
      const out = 1 - seg(t, 27.9, 28.4);
      revealLine('事業の推進力を、', 960, 330, seg(lt, .2, 1.0), { size: 64, weight: 700, color: '#fff', align: 'center', alpha: out });
      const w1 = measure('Anyflow', 64, 700, EN), w2 = measure(' が支えます。', 64);
      const lx = 960 - (w1 + w2) / 2;
      revealLine('Anyflow', lx, 420, seg(lt, .4, 1.2), { size: 64, weight: 700, font: EN, fill: brandGrad(lx, 0, lx + w1, 0), alpha: out });
      revealLine(' が支えます。', lx + w1, 420, seg(lt, .4, 1.2), { size: 64, weight: 700, color: '#fff', alpha: out });
      STATS.forEach((s, i) => {
        const x = 330 + i * 420, p = seg(lt, 1.0 + i * .15, 2.6 + i * .15);
        const a = out * eOut(seg(lt, .9 + i * .15, 1.4 + i * .15));
        text(s.label, x, 610, { size: 22, weight: 500, color: '#9ca3af', align: 'center', alpha: a });
        const num = s.fmt(s.v * eOut5(p));
        const nw = measure(num, 96, 300, EN);
        text(num, x - measure(s.suf, 48, 300, EN) / 2, 740, { size: 96, weight: 300, font: EN, color: '#fff', align: 'center', alpha: a });
        text(s.suf, x + nw / 2 - measure(s.suf, 48, 300, EN) / 2 + 4, 690, { size: 48, weight: 300, font: EN, color: C.cyan, alpha: a });
        // 下の細い線
        ctx.save(); ctx.globalAlpha = a * .5; ctx.strokeStyle = '#fff'; ctx.beginPath();
        ctx.moveTo(x - 150 * eOut(p), 790); ctx.lineTo(x + 150 * eOut(p), 790); ctx.stroke(); ctx.restore();
      });
    }

    /* S7 28–32s：グラデで締めてロゴ */
    function S7(t) {
      const lt = t - 28.0;
      // 左下から丸く広がるグラデ
      const r = eInOut(seg(lt, 0, 1.0)) * 2400;
      ctx.save();
      ctx.beginPath(); ctx.arc(200, 1000, r, 0, 7); ctx.clip();
      const g = ctx.createLinearGradient(0, H, W, 0);
      const sh = Math.sin(t * .8) * .06;
      g.addColorStop(0, C.pink); g.addColorStop(.3 + sh, '#ffd6e6'); g.addColorStop(.5 + sh, '#ffffff'); g.addColorStop(.75, '#7fd3ff'); g.addColorStop(1, C.blue2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // ぼかし玉（お問い合わせセクションの溶け込み）
      ctx.filter = 'blur(80px)';
      ctx.fillStyle = 'rgba(255,93,151,.55)'; ctx.beginPath(); ctx.arc(420 + Math.sin(t) * 60, 820, 360, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(14,187,255,.55)'; ctx.beginPath(); ctx.arc(1560 + Math.cos(t) * 60, 260, 380, 0, 7); ctx.fill();
      ctx.filter = 'none';
      ctx.restore();
      // 白いカード → ロゴ
      const cp = eOut5(seg(lt, .8, 1.6));
      ctx.save(); ctx.globalAlpha = cp;
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.shadowColor = 'rgba(14,68,151,.18)'; ctx.shadowBlur = 80;
      roundRect(960 - 480, 540 - 200 + 30 * (1 - cp), 960, 400, 36); ctx.fill(); ctx.restore();
      drawLogo(960 - 255 * 2.1 / 2, 450, 2.1, { mark: seg(lt, 1.0, 2.0), word: seg(lt, 1.5, 2.4) });
      const tp = eOut(seg(lt, 2.1, 2.9));
      text('API連携で、AIと事業を強くする。', 960, 640, { size: 34, weight: 500, color: C.ink, align: 'center', alpha: tp, rise: 12 * (1 - tp) });
      // 最後にふわっと暗転（ループ時のつなぎ）
      const fo = seg(t, 31.4, 32);
      if (fo > 0) { ctx.save(); ctx.globalAlpha = fo; ctx.fillStyle = C.surface; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }

    /* ---- 全体の合成 ---- */
    function renderAt(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.filter = 'none';
      // 背景：ライト → (19.2〜20) ダーク → S7 はグラデが上に乗る
      const dark = eInOut(seg(t, 19.2, 20.0));
      bgLight(1);
      if (dark > 0) {
        // 上からシャッターのように暗転
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H * dark); ctx.clip(); bgDark(1); ctx.restore();
      }
      // 冒頭のフェードイン
      if (t < 4.4) S1(t);
      if (t > 3.8 && t < 9.4) S2(t);
      if (t > 8.8 && t < 15.1) S3(t);
      if (t > 14.8 && t < 19.6) S4(t);
      if (t > 19.4 && t < 24.8) {
        // 暗い背景にうっすらネットワーク
        drawNetwork(t, { cx: 960, cy: 560, R: 900, form: 1, build: 1, rot: t * .05, pulses: .6, dark: true, alpha: .35 * dark * (1 - seg(t, 27.6, 28.2)) });
        S5(t);
      }
      if (t > 24.4 && t < 28.6) {
        drawNetwork(t, { cx: 960, cy: 560, R: 900, form: 1, build: 1, rot: t * .05, pulses: .6, dark: true, alpha: .35 * (1 - seg(t, 27.6, 28.2)) });
        S6(t);
      }
      if (t >= 28.0) S7(t);
      const fi = 1 - seg(t, 0, .5);
      if (fi > 0) { ctx.save(); ctx.globalAlpha = fi; ctx.fillStyle = C.surface; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
    return { renderAt, DURATION, W, H };

  }
  window.AnyflowBrandMovie = { createMovie, ensureFont };

  const CSS = `
    :host{display:block;position:relative;aspect-ratio:16/9;background:#E7E7E7;overflow:hidden;contain:content}
    canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    .ui{position:absolute;left:0;right:0;bottom:0;display:flex;gap:10px;align-items:center;padding:10px 14px;
        background:linear-gradient(transparent,rgba(0,0,0,.55));color:#fff;font:12px -apple-system,sans-serif;
        opacity:0;transition:opacity .2s}
    :host(:hover) .ui,:host(:focus-within) .ui{opacity:1}
    button{background:#fff;color:#000;border:0;border-radius:6px;padding:5px 11px;font:inherit;cursor:pointer}
    input{flex:1}
  `;

  class AnyflowBrandMovieEl extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${CSS}</style><canvas width="1920" height="1080" role="img" aria-label="Anyflow Embed ブランドムービー"></canvas>`;
      this.canvas = root.querySelector('canvas');
      this.movie = createMovie(this.canvas.getContext('2d'));
      this._t = 0; this._playing = false; this._raf = 0; this._last = 0; this._inView = false;
    }
    get duration() { return this.movie.DURATION; }
    get currentTime() { return this._t; }
    set currentTime(v) { this.seek(v); }
    _flag(name, def) { const v = this.getAttribute(name); return v === null ? def : v !== 'false'; }
    connectedCallback() {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (this.hasAttribute('controls')) this._buildUI();
      ensureFont().then(() => {
        this._fontReady = true;
        this._t = reduce ? +(this.getAttribute('poster-time') ?? 30) : this._t;
        this._draw();
        if (reduce || !this._flag('autoplay', true)) return;
        this._io = new IntersectionObserver(([e]) => {
          this._inView = e.isIntersecting;
          this._inView ? this.play() : this._stop();
        }, { threshold: .25 });
        this._io.observe(this);
      });
    }
    disconnectedCallback() { this._stop(); this._io?.disconnect(); }
    _buildUI() {
      const ui = document.createElement('div'); ui.className = 'ui';
      ui.innerHTML = `<button type="button">▶</button><input type="range" min="0" max="${this.duration}" step="0.01" value="0" aria-label="再生位置">`;
      this.shadowRoot.appendChild(ui);
      this._btn = ui.querySelector('button'); this._seek = ui.querySelector('input');
      this._btn.onclick = () => this._playing ? this.pause() : this.play();
      this._seek.oninput = () => this.seek(+this._seek.value);
    }
    play() {
      if (this._playing) return;
      if (this._t >= this.duration) this._t = 0;
      this._playing = true; this._last = performance.now(); this._userPaused = false;
      if (this._btn) this._btn.textContent = '⏸';
      const tick = now => {
        this._t += (now - this._last) / 1000; this._last = now;
        if (this._t >= this.duration) {
          if (this._flag('loop', true)) this._t %= this.duration;
          else { this._t = this.duration - .001; this._draw(); this.pause(); this.dispatchEvent(new Event('ended')); return; }
        }
        this._draw();
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }
    pause() { this._stop(); }
    _stop() { cancelAnimationFrame(this._raf); this._playing = false; if (this._btn) this._btn.textContent = '▶'; }
    seek(t) { this._t = Math.max(0, Math.min(this.duration, t)); this._draw(); }
    _draw() {
      if (!this._fontReady) return;
      this.movie.renderAt(this._t);
      if (this._seek) this._seek.value = this._t;
    }
  }
  customElements.define('anyflow-brand-movie', AnyflowBrandMovieEl);
})();
