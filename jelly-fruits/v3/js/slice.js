/* slice.js — オレンジの輪切りゼリーの形と質感（参考: 「Citrus Matter.」の画像・2026-09-28）
   色は画像から実測した値（スペック表は settings/docs/jelly-fruits/README.md）。
   模様は絵を貼らずに「元の輪切りのどこか」から計算する：外から 皮 → わたの輪 → 細い橙 → 房（11くらい・不ぞろい・薄皮の線は少し曲がる）。
   質感：上にもう1枚つるつるの層（くっきりした白い光の筋）／ふちほど赤みが深い／中からほんのり光る。 */
import * as THREE from 'three';

/* ---------- 形（半径1の単位） ---------- */
/**
 * 厚み t の円盤。ふちは丸く、上の面は少しだけふくらむ。
 * 返す値: { P（点）, vp（描画の頂点→点）, face（描画の頂点ごと：0＝上の面・1＝下の面・2＝側面）, index }
 */
export function buildSlice({ M = 96, K = 12, NB = 3, t = 0.16, bevel = 0.06, dome = 0.012 } = {}) {
  const b = Math.min(bevel, t * 0.45);
  const P = [];
  const addP = (x, y, z) => { P.push(x, y, z); return P.length / 3 - 1; };
  const ang = i => i / M * Math.PI * 2;
  /* 側面の輪（外への出っぱり o、高さ y） */
  const prof = [];
  for (let s = 0; s <= NB; s++) { const th = s / NB * Math.PI / 2; prof.push([-b + b * Math.sin(th), t - b + b * Math.cos(th)]); }
  prof.push([0, t / 2]);
  for (let s = 0; s <= NB; s++) { const th = Math.PI / 2 + s / NB * Math.PI / 2; prof.push([-b + b * Math.sin(th), b + b * Math.cos(th)]); }
  const ring = (rad, y) => { const ids = []; for (let i = 0; i < M; i++) ids.push(addP(Math.cos(ang(i)) * rad, y, Math.sin(ang(i)) * rad)); return ids; };
  const side = prof.map(([o, y]) => ring(1 + o, y));
  const top = [side[0]];
  for (let j = 1; j < K; j++) { const s = 1 - j / K; top.push(ring((1 - b) * s, t + dome * (1 - s * s))); }
  const topC = addP(0, t + dome, 0);
  const bot = [side[side.length - 1]];
  for (let j = 1; j < K; j++) { const s = 1 - j / K; bot.push(ring((1 - b) * s, 0)); }
  const botC = addP(0, 0, 0);

  const vp = [], face = [], idx = [], region = [];
  const addV = (pid, f) => { vp.push(pid); face.push(f); return vp.length - 1; };
  /* 上の面・下の面の頂点。側面の上の丸みは上の面の模様（皮）、下の丸みは下の面の模様の続きにする。
     面と丸みの境目の頂点は共有して、なめらかにつなぐ（折り目の光の線を出さない） */
  const topV = top.map(r => r.map(p => addV(p, 0))), topCV = addV(topC, 0);
  const botV = bot.map(r => r.map(p => addV(p, 1))), botCV = addV(botC, 1);
  const last = side.length - 1;
  const sideV = side.map((r, si) => {
    if (si === 0) return topV[0];
    if (si === last) return botV[0];
    const f = si < NB ? 0 : (si > last - NB ? 1 : 2);
    return r.map(p => addV(p, f));
  });
  const quad = (a, b2, c, d, reg) => { idx.push(a, b2, c, a, c, d); region.push(reg, reg); };
  for (let j = 0; j < K - 1; j++) for (let i = 0; i < M; i++) { const i2 = (i + 1) % M; quad(topV[j][i], topV[j][i2], topV[j + 1][i2], topV[j + 1][i], 0); }
  for (let i = 0; i < M; i++) { idx.push(topV[K - 1][i], topV[K - 1][(i + 1) % M], topCV); region.push(0); }
  for (let p = 0; p < sideV.length - 1; p++) for (let i = 0; i < M; i++) { const i2 = (i + 1) % M; quad(sideV[p][i], sideV[p][i2], sideV[p + 1][i2], sideV[p + 1][i], 2); }
  for (let j = 0; j < K - 1; j++) for (let i = 0; i < M; i++) { const i2 = (i + 1) % M; quad(botV[j][i], botV[j][i2], botV[j + 1][i2], botV[j + 1][i], 1); }
  for (let i = 0; i < M; i++) { idx.push(botV[K - 1][i], botV[K - 1][(i + 1) % M], botCV); region.push(1); }
  /* 面の向きをそろえる（上の面は上・下の面は下・側面は外） */
  const Pf = Float32Array.from(P), vpA = Uint32Array.from(vp), index = Uint32Array.from(idx);
  for (let t3 = 0; t3 < index.length; t3 += 3) {
    const a = 3 * vpA[index[t3]], b3 = 3 * vpA[index[t3 + 1]], c = 3 * vpA[index[t3 + 2]];
    const e1x = Pf[b3] - Pf[a], e1y = Pf[b3 + 1] - Pf[a + 1], e1z = Pf[b3 + 2] - Pf[a + 2];
    const e2x = Pf[c] - Pf[a], e2y = Pf[c + 1] - Pf[a + 1], e2z = Pf[c + 2] - Pf[a + 2];
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const reg = region[t3 / 3];
    let ex = 0, ey = 0, ez = 0;
    if (reg === 0) ey = 1; else if (reg === 1) ey = -1; else { ex = (Pf[a] + Pf[b3] + Pf[c]) / 3; ez = (Pf[a + 2] + Pf[b3 + 2] + Pf[c + 2]) / 3; }
    if (nx * ex + ny * ey + nz * ez < 0) { const k = index[t3 + 1]; index[t3 + 1] = index[t3 + 2]; index[t3 + 2] = k; }
  }
  return { P: Pf, vp: vpA, face: Float32Array.from(face), index, t };
}

/* ---------- 質感 ---------- */
export const sliceUniforms = {
  uSegN: { value: 11 },
  uDeep: { value: 0.75 },
  uGlow: { value: 0.16 },
  uT: { value: 0.16 },
  uEnvDiffuse: { value: 0 },
  cSeg: { value: new THREE.Color('#F86712') },
  cSegDeep: { value: new THREE.Color('#E33A04') },
  cSegLight: { value: new THREE.Color('#FA8B2B') },
  cMem: { value: new THREE.Color('#F6D097') },
  cBand: { value: new THREE.Color('#F59B2B') },
  cPith: { value: new THREE.Color('#FBCC87') },
  cRind: { value: new THREE.Color('#FC9C26') },
  cSide: { value: new THREE.Color('#F97F16') },
  cRed: { value: new THREE.Color('#FF4011') }
};

const GLSL = /* glsl */`
varying vec3 vU0;
varying float vFace;
uniform float uSegN, uDeep, uGlow, uT, uEnvDiffuse;
uniform vec3 cSeg, cSegDeep, cSegLight, cMem, cBand, cPith, cRind, cSide, cRed;
float sHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float sHash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sNoise(vec2 x) {
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sHash2(i), sHash2(i + vec2(1.0, 0.0)), f.x), mix(sHash2(i + vec2(0.0, 1.0)), sHash2(i + vec2(1.0, 1.0)), f.x), f.y);
}
float sWrap(float a) { return mod(a + 3.14159265, 6.2831853) - 3.14159265; }
float sLine(float d, float w, float aa) { return 1.0 - smoothstep(w - aa, w + aa, d); }
/* 炎の形（中なら正）：r0〜r1 の間で、両はしが細くなる。真ん中の線はゆるく揺れる */
float sFlame(float r, float u, float seed) {
  float r0 = 0.1 + 0.28 * sHash(seed + 1.0);
  float r1 = min(0.84, r0 + 0.3 + 0.32 * sHash(seed + 2.0));
  float t = clamp((r - r0) / (r1 - r0), 0.0, 1.0);
  float uc = 0.22 + 0.56 * sHash(seed + 3.0) + 0.34 * (sNoise(vec2(r * 3.4, seed)) - 0.5) + 0.08 * sin(r * 17.0 + seed);
  float wdt = (0.08 + 0.2 * sHash(seed + 4.0)) * pow(sin(3.14159 * t), 0.6) * (0.6 + 0.8 * sNoise(vec2(r * 7.0, seed + 7.0)));
  float du = u - uc;
  /* 左右で太さを変える（ふぞろい） */
  du *= du > 0.0 ? (0.7 + 0.6 * sHash(seed + 9.0)) : (0.7 + 0.6 * sHash(seed + 13.0));
  return wdt - abs(du);
}
/* 輪切りの面の模様（p＝上から見た位置、半径1）
   参考画像の色の集まり（実測）：房の地 #F86712 が約半分／明るい所 #FA8B2B が約2割／赤っぽい炎の形 #E33A04 が約1.5割／
   薄皮の線 #F6D097。形は、ぼかさずに、はっきりした境目で塗り分ける（イラストのような塗り） */
vec3 sFace(vec2 p) {
  float r = length(p);
  float phi = atan(p.y, p.x);
  float aa = max(fwidth(r), 0.0015) * 1.2;
  float segW = 6.2831853 / uSegN;
  /* 房の境目（不ぞろいな角度・ほぼまっすぐ・外の方で少し曲がる） */
  float dmin = 10.0, segId = 0.0, best = 10.0;
  for (int k = 0; k < 14; k++) {
    if (float(k) >= uSegN) break;
    float fk = float(k);
    float a0 = fk * segW + (sHash(fk + 3.0) - 0.5) * segW * 0.45 + 0.4;
    float bend = (sHash(fk + 11.0) - 0.5) * 0.35;
    float kink = (sHash(fk + 17.0) - 0.5) * 0.12 * smoothstep(0.35, 0.75, r);
    float a = a0 + bend * r * r + kink;
    float s = sWrap(phi - a);
    if (s > 0.0 && s < best) { best = s; segId = fk; }
    /* 線ごとに、真ん中から少しずれた所から出る（参考は1点に集まらず、小さく交わる） */
    vec2 o = 0.045 * vec2(sHash(fk + 23.0) - 0.5, sHash(fk + 29.0) - 0.5);
    vec2 q = p - o;
    float rq = length(q);
    float sq = sWrap(atan(q.y, q.x) - (a0 + bend * rq * rq + kink));
    dmin = min(dmin, abs(sq) < 1.4 ? abs(sq) * rq : 10.0);
  }
  float u = best / segW;
  /* 赤っぽい炎の形：房の中に1〜2本、両はしがとがった細長い形（房に沿って外へ伸びる） */
  float fl = max(sFlame(r, u, segId * 13.7 + 1.0), sFlame(r, u, segId * 13.7 + 5.0) - step(0.45, sHash(segId + 41.0)));
  float e1 = fwidth(fl) + 0.002;
  float dark = smoothstep(-e1, e1, fl);
  /* 明るい所：外側に多い、大きくてなだらかな形 */
  float f2 = sNoise(vec2(r * 2.2 + segId * 2.93 + 11.0, u * 1.8 + segId * 5.17)) + 0.35 * (r - 0.55);
  float e2 = fwidth(f2) + 0.003;
  float light = smoothstep(0.66 - e2, 0.66 + e2, f2) * (1.0 - dark);
  float halo = smoothstep(-e1, e1, fl + 0.035) * (1.0 - dark);
  vec3 col = mix(mix(cSeg, cSegLight, light), cSegDeep, dark);
  col = mix(col, mix(cSeg, cSegDeep, 0.45), halo * 0.8);
  /* 細い筋（果肉のきめ・外へ向かう） */
  float gr = sNoise(vec2(r * 90.0, u * 40.0 + segId * 13.0));
  col *= 1.0 + 0.09 * (gr - 0.5) * (1.0 - dark);
  /* 小さなつぶ（濃い点＋片側に明るいふち） */
  vec2 cell = floor(p * 22.0);
  float pick = step(0.95, sHash2(cell + 7.0)) * step(0.06, r) * (1.0 - step(0.85, r));
  vec2 cp = (cell + 0.3 + 0.4 * vec2(sHash2(cell + 1.0), sHash2(cell + 2.0))) / 22.0;
  vec2 dp = (p - cp) * 22.0;
  float dotR = 0.14 + 0.1 * sHash2(cell + 5.0);
  float dd = length(dp * vec2(1.0, 1.35));
  float ea = fwidth(dd) + 0.01;
  float dotv = pick * (1.0 - smoothstep(dotR - ea, dotR + ea, dd));
  float rim = pick * (1.0 - smoothstep(0.0, 0.05 + ea, abs(dd - dotR * 0.8))) * step(0.02, dp.y - dp.x);
  col = mix(col, cSegDeep * 0.9, dotv * 0.8);
  col = mix(col, cSegLight, rim * 0.6);
  /* 薄皮の線（細い・クリーム色。きわが少し濃い）と、真ん中 */
  float w = 0.0042 + 0.0015 * (1.0 - r);
  float inSeg = smoothstep(0.02, 0.05, r) * (1.0 - smoothstep(0.855, 0.865, r));
  col = mix(col, cSegDeep, sLine(dmin, w * 2.4, aa) * 0.18 * inSeg);
  col = mix(col, cMem, sLine(dmin, w, aa) * inSeg);
  col = mix(col, cMem, 1.0 - smoothstep(0.018 - aa, 0.03 + aa, r));
  /* 外から（参考の拡大から実測・半径に対して）：皮 0.065 → わたの輪 0.04 → 明るい橙の帯 0.03 → 房の外側の細い線 */
  col = mix(col, cBand, smoothstep(0.865 - aa, 0.865 + aa, r));
  col = mix(col, mix(cMem, cBand, 0.35), sLine(abs(r - 0.865), 0.003, aa));
  col = mix(col, cPith, smoothstep(0.895 - aa, 0.895 + aa, r));
  col = mix(col, cRind, smoothstep(0.935 - aa, 0.935 + aa, r));
  return col;
}
/* 側面：皮の橙。上のふちが少し明るく、下は少し深い */
vec3 sSide(vec3 u) {
  float h = clamp(u.y / uT, 0.0, 1.0);
  vec3 col = mix(cSide * vec3(0.96, 0.86, 0.8), cSide, smoothstep(0.1, 0.6, h));
  return mix(col, mix(cSide, cPith, 0.35), smoothstep(0.86, 0.98, h));
}
`;

export function sliceMaterial(envMap) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.38, specularIntensity: 0.1,
    clearcoat: 1, clearcoatRoughness: 0.025, envMap, envMapIntensity: 1,
    transmission: 0, thickness: 0.3, ior: 1.36, attenuationColor: new THREE.Color('#FF5A10'), attenuationDistance: 0.6
  });
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, sliceUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aU0;\nattribute float aFace;\nvarying vec3 vU0;\nvarying float vFace;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvU0 = aU0;\nvFace = aFace;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\nvec3 sCol = vFace > 1.5 ? sSide(vU0) : sFace(vU0.xz);\ndiffuseColor.rgb = sCol;')
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        /* ふちほど赤みが深い（厚い所を光が通る感じ） */
        'float sNV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);',
        /* 平らな面を上から見た角度（約0.67）では赤くしない。ななめに見える所（折れた所・ふち）ほど赤く深く */
        'diffuseColor.rgb = mix(diffuseColor.rgb, cRed * vec3(0.9, 0.75, 0.7), smoothstep(0.62, 0.12, sNV) * uDeep);'
      ].join('\n'))
      /* まわりの光の帯は「ツヤ（映り込み）」だけに使い、色の明るさには足さない（足すと白っぽく飛ぶ） */
      .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\niblIrradiance *= uEnvDiffuse;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uGlow * (0.6 + 0.4 * sNV);');
  };
  m.customProgramCacheKey = () => 'citrus-slice-7';
  return m;
}
