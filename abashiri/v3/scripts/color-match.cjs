/* 写真の色を、元の写真の色に合わせる道具（2026-10-21 ヒデさん「フィルター加工などせず、渡した画像を直接いじって、元の画像の青みに近づける」）
   使い方： node scripts/color-match.cjs <新しい写真> <元の写真> <書き出し先(.jpg/.webp)> quad
   同じ構図の2枚を縮小して1点ずつ対応させ、新→元 の色の変換を最小二乗で求めて、新しい写真の全画素に当てる（細かさは新しい写真のまま）。
   色合わせ（改良）：少ない色（雲の白・崖の草）も数に入るよう、色ごとの数で重みを均して最小二乗。
   モデル：affine（色の行列）／quad（2次）／cubic（3次）を比べ、場所ごとの差を出す。MODEL を指定すると書き出す */
const sharp = require('sharp');
const [NEW, OLD, OUT, ONLY] = process.argv.slice(2);
const MODELS = {
  affine: (r, g, b) => [1, r, g, b],
  quad: (r, g, b) => [1, r, g, b, r * r, g * g, b * b, r * g, r * b, g * b],
  cubic: (r, g, b) => [1, r, g, b, r * r, g * g, b * b, r * g, r * b, g * b, r * r * r, g * g * g, b * b * b, r * g * b],
};
function solve(A, y) { const n = A.length; const M = A.map((row, i) => [...row, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; } } return M.map((row, i) => row[n] / row[i]); }
const REGIONS = { 空: [0.05, 0.1, 0.4, 0.3], 雲: [0.6, 0.22, 0.25, 0.22], 海: [0.05, 0.8, 0.4, 0.15], 崖: [0.68, 0.9, 0.3, 0.09] };
(async () => {
  const m = await sharp(NEW).metadata();
  const W = 500, H = Math.round(W * m.height / m.width);
  const a = await sharp(NEW).resize(W, H, { fit: 'fill' }).blur(1.0).removeAlpha().raw().toBuffer();
  const b = await sharp(OLD).resize(W, H, { fit: 'fill' }).blur(1.0).removeAlpha().raw().toBuffer();
  /* 色ごとの数（16段×16段×16段の箱）で重みを均す */
  const cnt = new Map(); const key = (i) => ((a[i] >> 4) << 8) | ((a[i + 1] >> 4) << 4) | (a[i + 2] >> 4);
  for (let i = 0; i < a.length; i += 3) cnt.set(key(i), (cnt.get(key(i)) || 0) + 1);
  const results = {};
  for (const [name, feats] of Object.entries(MODELS)) {
    if (ONLY && name !== ONLY) continue;
    const K = feats(0, 0, 0).length; const coefs = [];
    for (let ch = 0; ch < 3; ch++) {
      const AtA = Array.from({ length: K }, () => new Array(K).fill(0)), Aty = new Array(K).fill(0);
      for (let i = 0; i < a.length; i += 3) { const w = 1 / Math.sqrt(cnt.get(key(i))); const f = feats(a[i] / 255, a[i + 1] / 255, a[i + 2] / 255); const y = b[i + ch] / 255; for (let p = 0; p < K; p++) { Aty[p] += w * f[p] * y; for (let q = 0; q < K; q++) AtA[p][q] += w * f[p] * f[q]; } }
      for (let p = 0; p < K; p++) AtA[p][p] += 1e-4;
      coefs.push(solve(AtA, Aty));
    }
    const map = (r, g, bb) => { const f = feats(r / 255, g / 255, bb / 255); return [0, 1, 2].map(ch => Math.max(0, Math.min(255, Math.round(255 * coefs[ch].reduce((s, c, k) => s + c * f[k], 0))))); };
    const line = [];
    for (const [rn, [l, t, w, h]] of Object.entries(REGIONS)) { let e = 0, n = 0, wb = 0, wo = 0; for (let y = Math.round(t * H); y < Math.round((t + h) * H); y++) for (let x = Math.round(l * W); x < Math.round((l + w) * W); x++) { const i = (y * W + x) * 3; const o = map(a[i], a[i + 1], a[i + 2]); for (let ch = 0; ch < 3; ch++) e += Math.abs(o[ch] - b[i + ch]); n += 3; } line.push(`${rn} ${(e / n).toFixed(1)}`); }
    console.log(name.padEnd(7), line.join('・'));
    results[name] = map;
    if (ONLY) {
      const { data, info } = await sharp(NEW).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const cache = new Map();
      for (let i = 0; i < data.length; i += 3) { const k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]; let o = cache.get(k); if (!o) { o = map(data[i], data[i + 1], data[i + 2]); cache.set(k, o); } data[i] = o[0]; data[i + 1] = o[1]; data[i + 2] = o[2]; }
      { const im = sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }); if (OUT.endsWith(".jpg")) await im.jpeg({ quality: 92, mozjpeg: true }).toFile(OUT); else await im.webp({ quality: 90 }).toFile(OUT); }
    }
  }
  /* 合わせる前（そのまま）の差も */
  const line0 = []; for (const [rn, [l, t, w, h]] of Object.entries(REGIONS)) { let e = 0, n = 0; for (let y = Math.round(t * H); y < Math.round((t + h) * H); y++) for (let x = Math.round(l * W); x < Math.round((l + w) * W); x++) { const i = (y * W + x) * 3; for (let ch = 0; ch < 3; ch++) e += Math.abs(a[i + ch] - b[i + ch]); n += 3; } line0.push(`${rn} ${(e / n).toFixed(1)}`); }
  console.log('そのまま', line0.join('・'));
})().catch(e => { console.error('FAILED', e); process.exit(1); });
