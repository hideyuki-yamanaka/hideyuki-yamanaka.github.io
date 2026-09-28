/* m3.js — 3×3 の行列の計算（形の記憶の計算で使う）。行列は行ごとに並べた 9 個の数 */

export function inv3(m, out) {
  const a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-14) { out.fill(0); return false; }
  const k = 1 / det;
  out[0] = A * k; out[1] = -(b * i - c * h) * k; out[2] = (b * f - c * e) * k;
  out[3] = B * k; out[4] = (a * i - c * g) * k; out[5] = -(a * f - c * d) * k;
  out[6] = C * k; out[7] = -(a * h - b * g) * k; out[8] = (a * e - b * d) * k;
  return true;
}

export function det3(m) {
  return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
}

export function mul3(a, b, out) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  }
  return out;
}

export function quatToMat(q, R) {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  R[0] = 1 - 2 * (y * y + z * z); R[1] = 2 * (x * y - z * w); R[2] = 2 * (x * z + y * w);
  R[3] = 2 * (x * y + z * w); R[4] = 1 - 2 * (x * x + z * z); R[5] = 2 * (y * z - x * w);
  R[6] = 2 * (x * z - y * w); R[7] = 2 * (y * z + x * w); R[8] = 1 - 2 * (x * x + y * y);
  return R;
}

/**
 * 行列 A から回転だけを取り出す（Müller ほか 2016）。q は前回の回転（四元数 [x,y,z,w]）で、書き換えて返す。
 * 前回の答えから始めるので、1〜2回でほぼ決まる。
 */
export function extractRotation(A, q, iters, R) {
  for (let k = 0; k < iters; k++) {
    quatToMat(q, R);
    const r0x = R[0], r0y = R[3], r0z = R[6], r1x = R[1], r1y = R[4], r1z = R[7], r2x = R[2], r2y = R[5], r2z = R[8];
    const a0x = A[0], a0y = A[3], a0z = A[6], a1x = A[1], a1y = A[4], a1z = A[7], a2x = A[2], a2y = A[5], a2z = A[8];
    let ox = (r0y * a0z - r0z * a0y) + (r1y * a1z - r1z * a1y) + (r2y * a2z - r2z * a2y);
    let oy = (r0z * a0x - r0x * a0z) + (r1z * a1x - r1x * a1z) + (r2z * a2x - r2x * a2z);
    let oz = (r0x * a0y - r0y * a0x) + (r1x * a1y - r1y * a1x) + (r2x * a2y - r2y * a2x);
    const den = Math.abs(r0x * a0x + r0y * a0y + r0z * a0z + r1x * a1x + r1y * a1y + r1z * a1z + r2x * a2x + r2y * a2y + r2z * a2z) + 1e-9;
    ox /= den; oy /= den; oz /= den;
    const w = Math.hypot(ox, oy, oz);
    if (w < 1e-9) break;
    const s = Math.sin(w / 2) / w, c = Math.cos(w / 2);
    const ax = ox * s, ay = oy * s, az = oz * s, aw = c;
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    let nx = aw * qx + ax * qw + ay * qz - az * qy;
    let ny = aw * qy - ax * qz + ay * qw + az * qx;
    let nz = aw * qz + ax * qy - ay * qx + az * qw;
    let nw = aw * qw - ax * qx - ay * qy - az * qz;
    const l = Math.hypot(nx, ny, nz, nw) || 1;
    q[0] = nx / l; q[1] = ny / l; q[2] = nz / l; q[3] = nw / l;
  }
  return quatToMat(q, R);
}
