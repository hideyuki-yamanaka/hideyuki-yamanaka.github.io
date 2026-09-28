/* cut.js — 三角形でできた立体を、平面で2つに切る。切り口には平らなふたを付ける。
   点（位置・元の形・速さ）と描画用の頂点（UV）を分けて持つので、
   切り口の角はくっきり、表面はなめらかなまま切れる。 */
import * as THREE from 'three';

/**
 * src = {
 *   P:     Float32Array(3*np)  点の位置（どちら側かの判定と、新しい点の位置に使う）
 *   A:     [Float32Array(3*np)…] 点ごとに一緒に分ける値（元の形・速さなど。3つ組）
 *   vp:    Uint32Array(nv)     描画の頂点 → 点
 *   uv:    Float32Array(2*nv) | null
 *   index: Uint32Array(3*nt)
 * }
 * 平面は n·p = d。n の向きの側を「＋側」とする。
 * capUV: 切り口のふたに使う UV（null ならふたの UV は 0）
 * 返す値: [＋側, −側]（どちらかが空なら null）
 */
export function splitMesh(src, n, d, capUV) {
  const P = src.P, np = P.length / 3, vp = src.vp, nv = vp.length, idx = src.index;
  const s = new Float64Array(np);
  for (let i = 0; i < np; i++) {
    let v = n[0] * P[3 * i] + n[1] * P[3 * i + 1] + n[2] * P[3 * i + 2] - d;
    if (Math.abs(v) < 1e-7) v = 1e-7;
    s[i] = v;
  }
  /* 切り口にできる新しい点（元の2点の間） */
  const newPts = [], ptKey = new Map();
  const crossPoint = (a, b) => {
    const key = a < b ? a * 4194304 + b : b * 4194304 + a;
    let id = ptKey.get(key);
    if (id !== undefined) return id;
    id = np + newPts.length;
    newPts.push({ a, b, t: s[a] / (s[a] - s[b]) });
    ptKey.set(key, id);
    return id;
  };
  /* 新しい描画用の頂点 */
  const newVerts = [], vKey = new Map();
  const crossVert = (ra, rb) => {
    const key = ra < rb ? ra * 4194304 + rb : rb * 4194304 + ra;
    let id = vKey.get(key);
    if (id !== undefined) return id;
    const pa = vp[ra], pb = vp[rb];
    id = nv + newVerts.length;
    newVerts.push({ ra, rb, t: s[pa] / (s[pa] - s[pb]), point: crossPoint(pa, pb) });
    vKey.set(key, id);
    return id;
  };
  const pointOfVert = r => (r < nv ? vp[r] : newVerts[r - nv].point);

  const triPos = [], triNeg = [], segs = [];
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [idx[t], idx[t + 1], idx[t + 2]];
    const sp = [s[vp[tri[0]]] > 0, s[vp[tri[1]]] > 0, s[vp[tri[2]]] > 0];
    const cnt = (sp[0] ? 1 : 0) + (sp[1] ? 1 : 0) + (sp[2] ? 1 : 0);
    if (cnt === 3) { triPos.push(tri[0], tri[1], tri[2]); continue; }
    if (cnt === 0) { triNeg.push(tri[0], tri[1], tri[2]); continue; }
    const loneIsPos = cnt === 1;
    const li = loneIsPos ? sp.indexOf(true) : sp.indexOf(false);
    const L = tri[li], M = tri[(li + 1) % 3], N = tri[(li + 2) % 3];
    const X = crossVert(L, M), Y = crossVert(L, N);
    const lone = loneIsPos ? triPos : triNeg, other = loneIsPos ? triNeg : triPos;
    lone.push(L, X, Y);
    other.push(X, M, N, X, N, Y);
    segs.push(pointOfVert(X), pointOfVert(Y));
  }
  if (!triPos.length || !triNeg.length) return [null, null];

  /* 点の値を読む（元の点か、新しい点か） */
  const getP = (pid, out) => {
    if (pid < np) { out[0] = P[3 * pid]; out[1] = P[3 * pid + 1]; out[2] = P[3 * pid + 2]; return out; }
    const e = newPts[pid - np], a = e.a, b = e.b, t = e.t;
    out[0] = P[3 * a] + (P[3 * b] - P[3 * a]) * t;
    out[1] = P[3 * a + 1] + (P[3 * b + 1] - P[3 * a + 1]) * t;
    out[2] = P[3 * a + 2] + (P[3 * b + 2] - P[3 * a + 2]) * t;
    return out;
  };
  const getA = (arr, pid, out) => {
    if (pid < np) { out[0] = arr[3 * pid]; out[1] = arr[3 * pid + 1]; out[2] = arr[3 * pid + 2]; return out; }
    const e = newPts[pid - np], a = e.a, b = e.b, t = e.t;
    out[0] = arr[3 * a] + (arr[3 * b] - arr[3 * a]) * t;
    out[1] = arr[3 * a + 1] + (arr[3 * b + 1] - arr[3 * a + 1]) * t;
    out[2] = arr[3 * a + 2] + (arr[3 * b + 2] - arr[3 * a + 2]) * t;
    return out;
  };
  const getUV = (r, out) => {
    const uv = src.uv;
    if (!uv) { out[0] = 0; out[1] = 0; return out; }
    if (r < nv) { out[0] = uv[2 * r]; out[1] = uv[2 * r + 1]; return out; }
    const e = newVerts[r - nv];
    out[0] = uv[2 * e.ra] + (uv[2 * e.rb] - uv[2 * e.ra]) * e.t;
    out[1] = uv[2 * e.ra + 1] + (uv[2 * e.rb + 1] - uv[2 * e.ra + 1]) * e.t;
    return out;
  };

  /* 切り口の線をつないで輪にする */
  const adj = new Map();
  for (let i = 0; i < segs.length; i += 2) {
    const a = segs[i], b = segs[i + 1];
    if (a === b) continue;
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b); adj.get(b).push(a);
  }
  const loops = [], seen = new Set();
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [start];
    seen.add(start);
    let prev = -1, cur = start;
    for (;;) {
      let next = -1;
      for (const x of adj.get(cur)) if (x !== prev && !seen.has(x)) { next = x; break; }
      if (next < 0) break;
      loop.push(next); seen.add(next); prev = cur; cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }

  /* 平面の上の2つの向き（切り口を平らに並べて三角形に分けるため） */
  const nx = n[0], ny = n[1], nz = n[2];
  let ux = 0, uy = 0, uz = 0;
  if (Math.abs(nx) < 0.9) { ux = 0; uy = -nz; uz = ny; } else { ux = nz; uy = 0; uz = -nx; }
  let ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
  const wx = ny * uz - nz * uy, wy = nz * ux - nx * uz, wz = nx * uy - ny * ux;
  const tmp = [0, 0, 0], tA = [0, 0, 0], tB = [0, 0, 0], tC = [0, 0, 0];
  const capTris = [];
  for (const loop of loops) {
    const contour = loop.map(pid => { getP(pid, tmp); return new THREE.Vector2(tmp[0] * ux + tmp[1] * uy + tmp[2] * uz, tmp[0] * wx + tmp[1] * wy + tmp[2] * wz); });
    let faces;
    try { faces = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { faces = []; }
    for (const f of faces) capTris.push([loop[f[0]], loop[f[1]], loop[f[2]]]);
  }

  const build = (tris, sign) => {
    /* ふたの向き：＋側のかたまりのふたは −n を向く */
    const cnx = -sign * nx, cny = -sign * ny, cnz = -sign * nz;
    const usedV = new Map(), vList = [];
    const useV = r => { let k = usedV.get(r); if (k === undefined) { k = vList.length; usedV.set(r, k); vList.push({ r }); } return k; };
    const outIdx = [];
    for (let i = 0; i < tris.length; i++) outIdx.push(useV(tris[i]));
    const capMap = new Map();
    const capV = pid => { let k = capMap.get(pid); if (k === undefined) { k = vList.length; capMap.set(pid, k); vList.push({ cap: pid }); } return k; };
    for (const [a, b, c] of capTris) {
      getP(a, tA); getP(b, tB); getP(c, tC);
      const e1x = tB[0] - tA[0], e1y = tB[1] - tA[1], e1z = tB[2] - tA[2];
      const e2x = tC[0] - tA[0], e2y = tC[1] - tA[1], e2z = tC[2] - tA[2];
      const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
      if (fx * cnx + fy * cny + fz * cnz >= 0) outIdx.push(capV(a), capV(b), capV(c));
      else outIdx.push(capV(a), capV(c), capV(b));
    }
    /* 使っている点を詰めて並べ直す */
    const pMap = new Map(), pList = [];
    const vpOut = new Uint32Array(vList.length);
    const uvOut = new Float32Array(vList.length * 2);
    const uvt = [0, 0];
    for (let i = 0; i < vList.length; i++) {
      const it = vList[i];
      const pid = it.cap !== undefined ? it.cap : pointOfVert(it.r);
      let k = pMap.get(pid);
      if (k === undefined) { k = pList.length; pMap.set(pid, k); pList.push(pid); }
      vpOut[i] = k;
      if (it.cap !== undefined) {
        uvOut[2 * i] = capUV ? capUV[0] : 0; uvOut[2 * i + 1] = capUV ? capUV[1] : 0;
      } else {
        getUV(it.r, uvt); uvOut[2 * i] = uvt[0]; uvOut[2 * i + 1] = uvt[1];
      }
    }
    const Pout = new Float32Array(pList.length * 3);
    const Aout = (src.A || []).map(() => new Float32Array(pList.length * 3));
    for (let k = 0; k < pList.length; k++) {
      getP(pList[k], tmp);
      Pout[3 * k] = tmp[0]; Pout[3 * k + 1] = tmp[1]; Pout[3 * k + 2] = tmp[2];
      for (let j = 0; j < Aout.length; j++) {
        getA(src.A[j], pList[k], tmp);
        Aout[j][3 * k] = tmp[0]; Aout[j][3 * k + 1] = tmp[1]; Aout[j][3 * k + 2] = tmp[2];
      }
    }
    return { P: Pout, A: Aout, vp: vpOut, uv: src.uv ? uvOut : null, index: new Uint32Array(outIdx), capCount: capMap.size };
  };
  return [build(triPos, 1), build(triNeg, -1)];
}

/** 閉じた立体の体積（点の値 Q で測る。面の向きがそろっていれば＋） */
export function meshVolume(Q, vp, index) {
  let v = 0;
  for (let t = 0; t < index.length; t += 3) {
    const a = 3 * vp[index[t]], b = 3 * vp[index[t + 1]], c = 3 * vp[index[t + 2]];
    v += Q[a] * (Q[b + 1] * Q[c + 2] - Q[b + 2] * Q[c + 1])
       - Q[a + 1] * (Q[b] * Q[c + 2] - Q[b + 2] * Q[c])
       + Q[a + 2] * (Q[b] * Q[c + 1] - Q[b + 1] * Q[c]);
  }
  return v / 6;
}
