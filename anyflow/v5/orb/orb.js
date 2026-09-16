/* ============================================================
   液体オーブ — キービジュアル別案（2026-08-21 ヒデさん依頼）
   参考画像: パステルの液体のような球体（青/ピンク/紫/白・絹糸の流線・白い折り目）
   作り: WebGL フラグメントシェーダー1枚。本物の流体計算ではなく
     「3色のブロブ + ノイズで歪ませた絹糸の流線 + 白い三日月の折り目」を
     球に貼る定石構成（リアルさと軽さの両立）。
   数値は全部 window.ORB（tune-panel が直接書き換える）を毎フレーム読む。
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('orb');
  /* preserveDrawingBuffer: 検証でいつでもピクセルを読めるように（描画コストは軽微） */
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true });
  if (!gl) { document.getElementById('nogl').style.display = 'block'; return; }

  const VS = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';
  const FS = `
precision highp float;
uniform vec2  uRes;
uniform float uT;
uniform float uSize, uWobAmp, uWobSpd;                 /* かたち */
uniform float uFlowSpd, uWarpAmp, uWarpScl, uBlobSpd;  /* 揺らぎ */
uniform float uThFreq, uThAmp, uThSharp;               /* 絹糸 */
uniform float uBlobSoft, uHiKey;                       /* 色 */
uniform float uFresAmp, uFresPow, uCresAmp, uCresAng, uCresWidth, uGlowW, uGlowAmp, uShade; /* 光 */
uniform vec3  uCol1, uCol2, uCol3;

float hash(vec2 p){ p = fract(p*vec2(127.1, 311.7)); p += dot(p, p+34.5); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a*vnoise(p); p = p*2.03 + vec2(19.7, 7.3); a *= 0.5; }
  return s; }

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 p = (fc*2.0 - uRes)/min(uRes.x, uRes.y);
  float t = uT;

  /* ---- 輪郭の揺らぎ（低周波。方向ベクトル基準なので継ぎ目なし） ---- */
  vec2 dir = normalize(p + vec2(1e-5, 0.0));
  float wob = fbm(dir*1.6 + vec2(t*uWobSpd, -t*uWobSpd*0.7)) - 0.5;
  float R = uSize*(1.0 + uWobAmp*wob*2.0);
  float d = length(p);
  vec2 q = p/R;                          /* 球内の正規化座標 -1..1 */
  float rr = clamp(length(q), 0.0, 1.0);
  float z = sqrt(max(1.0 - rr*rr, 0.0));
  vec3 N = normalize(vec3(q, z));

  /* ---- 大きな色ブロブ（3色がゆっくり泳ぐ）----
     初期位置は参考画像の配置: 青=上寄り / マゼンタ=左端 / 紫=右下 */
  float bt = t*uBlobSpd;
  vec2 c1 = 0.40*vec2(cos(bt*0.50 + 1.9),  sin(bt*0.50 + 1.9));   /* 青は中心寄り＝面積広く */
  vec2 c2 = 0.60*vec2(cos(-bt*0.36 + 3.1), sin(-bt*0.36 + 3.1));
  vec2 c3 = 0.55*vec2(cos(bt*0.28 - 0.9),  sin(bt*0.28 - 0.9));
  float k = 1.0/max(uBlobSoft, 0.05);
  float w1 = exp(-k*dot(q-c1, q-c1));
  float w2 = exp(-k*dot(q-c2, q-c2));
  float w3 = exp(-k*dot(q-c3, q-c3));
  w1 *= 1.25;                                   /* 参考画像は青の面積が広い */
  vec3 base = (uCol1*w1 + uCol2*w2 + uCol3*w3)/(w1 + w2 + w3 + 1e-4);
  /* 参考画像は「逆光のガラス」: ふちに近いほど彩度が上がって発光し、
     中心は白っぽく淡い。彩度を rr(中心0→ふち1) で持ち上げる */
  base = mix(vec3(dot(base, vec3(0.333))), base, 1.10 + 0.50*rr);

  /* ---- 立体感（絹糸より先。参考画像は高キーなので控えめ）---- */
  vec3 col = base;
  col *= (1.0-uShade) + uShade*(0.62 + 0.38*dot(N, normalize(vec3(0.40, 0.50, 0.75))));
  col = mix(col, vec3(1.0), 0.24*pow(1.0-rr, 1.5));   /* 中心の白い抜け */

  /* ---- 白い三日月の折り目の座標（絹糸がこれに沿うので先に計算）---- */
  float ca = radians(uCresAng);
  vec2 L = vec2(cos(ca), sin(ca));
  float along = dot(q, L) + 0.30*(fbm(q*1.8 + vec2(t*uFlowSpd*0.3)) - 0.5);
  float cres = smoothstep(uCresWidth, uCresWidth + 0.38, along) * smoothstep(0.10, 0.55, rr);
  cres = clamp(cres*uCresAmp, 0.0, 1.0);

  /* ---- 絹糸 ----
     参考画像の糸は「折り目と並行に走る長いアーク」。折り目の外側に置いた
     仮想中心からの距離の等高線＝同心円アークを基本に、ノイズで軽く揺らす */
  vec2 arcC = L*1.45;                                   /* 折り目の少し外の仮想中心 */
  vec2 warp = vec2(fbm(q*uWarpScl + vec2(0.0,  t*uFlowSpd)),
                   fbm(q*uWarpScl + vec2(5.2, -t*uFlowSpd*0.85))) - 0.5;
  float f = length(q - arcC)*1.15 + (fbm(q*uWarpScl*1.3 + warp*uWarpAmp + vec2(t*uFlowSpd*0.25)) - 0.5)*0.22;
  float th = 0.5 + 0.5*sin(6.28318*(f*uThFreq));
  th = pow(th, uThSharp);
  float band = smoothstep(0.20, 0.75, fbm(q*1.5 - warp*uWarpAmp*0.4 + vec2(3.1, t*uFlowSpd*0.4)));
  band *= 0.35 + 0.65*smoothstep(-0.45, 0.25, along);   /* 折り目から遠いほど糸を薄く */
  /* 色の上では白い糸に、白い折り目の上では薄いグレーの糸に（参考画像どおり） */
  col = mix(col, vec3(1.0), clamp(th*uThAmp*band, 0.0, 1.0)*(1.0-cres));
  col -= vec3(0.085, 0.075, 0.045)*th*uThAmp*cres*(0.4 + 0.6*band);

  /* ---- 折り目を白く塗り、境界に明るいリムライン（波の縁の光）---- */
  col = mix(col, vec3(1.0), cres);
  float rimLine = exp(-pow((along - uCresWidth)/0.055, 2.0));
  col += vec3(1.0)*rimLine*0.50*uCresAmp*smoothstep(0.15, 0.5, rr);
  /* 折り目のすぐ手前にうっすら溝（液体の折り返し感） */
  float fold = smoothstep(uCresWidth-0.16, uCresWidth-0.02, along) - smoothstep(uCresWidth-0.02, uCresWidth+0.14, along);
  col *= 1.0 - 0.08*fold*uCresAmp;

  /* ---- ふちの光（上側ほど明るい: 参考画像は上端が白く光る）---- */
  float fres = pow(1.0 - N.z, uFresPow);
  col += vec3(1.0)*fres*uFresAmp*(0.55 + 0.45*dot(normalize(q + vec2(1e-5, 0.0)), vec2(0.25, 0.95)));
  col = mix(col, vec3(1.0), uHiKey*0.25);     /* 高キー = パステル寄せ */

  /* ---- 縁のAAと外側のにじみ（内側の色が外へ溶け出す）---- */
  float px = 2.0/min(uRes.x, uRes.y);
  float body = 1.0 - smoothstep(R-px, R+px, d);
  float glow = exp(-max(d-R, 0.0)/max(uGlowW, 0.001))*uGlowAmp;
  vec3 outc = col*body + base*glow*(1.0-body);
  float a = clamp(body + glow*(1.0-body), 0.0, 1.0);
  gl_FragColor = vec4(outc, a);   /* premultiplied 前提の合成 */
}`;

  function sh(ty, src) {
    const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('[orb]', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error('[orb]', gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  /* uniform 名 ←→ ORB パラメータの対応（パネルが増えたらここに1行足すだけ） */
  const UNIS = [
    ['uSize', 'body.size'], ['uWobAmp', 'body.wobAmp'], ['uWobSpd', 'body.wobSpd'],
    ['uFlowSpd', 'flow.speed'], ['uWarpAmp', 'flow.warpAmp'], ['uWarpScl', 'flow.warpScl'], ['uBlobSpd', 'flow.blobSpd'],
    ['uThFreq', 'silk.freq'], ['uThAmp', 'silk.amp'], ['uThSharp', 'silk.sharp'],
    ['uBlobSoft', 'color.soft'], ['uHiKey', 'color.hiKey'],
    ['uFresAmp', 'light.fresAmp'], ['uFresPow', 'light.fresPow'],
    ['uCresAmp', 'light.cresAmp'], ['uCresAng', 'light.cresAng'], ['uCresWidth', 'light.cresWidth'],
    ['uGlowW', 'light.glowW'], ['uGlowAmp', 'light.glowAmp'], ['uShade', 'light.shade'],
  ];
  const U = {};
  UNIS.forEach(([n]) => { U[n] = gl.getUniformLocation(prog, n); });
  U.uRes = gl.getUniformLocation(prog, 'uRes');
  U.uT = gl.getUniformLocation(prog, 'uT');
  ['uCol1', 'uCol2', 'uCol3'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

  const get = (obj, path) => path.split('.').reduce((o, k) => o[k], obj);
  const hex2v = h => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim());
    const n = m ? parseInt(m[1], 16) : 0xffffff;
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  };

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = Math.round(Math.min(window.innerWidth * 0.82, window.innerHeight * 0.74));
    canvas.style.width = s + 'px'; canvas.style.height = s + 'px';
    canvas.width = Math.round(s * dpr); canvas.height = Math.round(s * dpr);
  }
  window.addEventListener('resize', fit); fit();

  /* 検証用: ?freeze=1 で静止 */
  const FREEZE = new URLSearchParams(location.search).get('freeze') === '1';
  function frame(now) {
    const P = window.ORB;
    const t = (FREEZE ? 0 : now / 1000) * P.body.timeScale;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uT, t);
    UNIS.forEach(([n, p]) => gl.uniform1f(U[n], +get(P, p)));
    gl.uniform3fv(U.uCol1, hex2v(P.color.c1));
    gl.uniform3fv(U.uCol2, hex2v(P.color.c2));
    gl.uniform3fv(U.uCol3, hex2v(P.color.c3));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
