/* mikan.js — みかんゼリーの材質
   色は絵を貼るのではなく「元のみかんの中のどこか」から決める（房・房の間の白い薄皮・真ん中の芯・皮の内側の白いわた・皮）。
   だから、どこをどの向きで切っても、その切り口に合った断面が出る。
   外側（皮）は、少し透けて中の房がうっすら見える。切り口（ふた）は、みずみずしく透ける果肉。
   色の値は仮置き。 */
import * as THREE from 'three';

export const mikanUniforms = {
  uSeg: { value: 10 },        /* 房の数 */
  uPeelSee: { value: 0.25 },  /* 皮越しに房が見える量 */
  uBump: { value: 0.5 }       /* つぶつぶのでこぼこ */
};

const GLSL = /* glsl */`
varying vec3 vU0;
varying float vCap;
uniform float uSeg;
uniform float uPeelSee;
uniform float uBump;
float jHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float jNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(jHash(i), jHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(jHash(i + vec3(0.0, 1.0, 0.0)), jHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(jHash(i + vec3(0.0, 0.0, 1.0)), jHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(jHash(i + vec3(0.0, 1.0, 1.0)), jHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
/* 中身：房（つぶつぶの果肉）・房の間の薄皮・房の外側の薄皮・真ん中の芯 */
void jInside(vec3 p, out vec3 col, out float tr, out float h) {
  float rho = length(p.xz);
  float phi = atan(p.z, p.x);
  float seg = 6.2831853 / uSeg;
  float f = fract((phi + 3.14159265) / seg);
  float dm = min(f, 1.0 - f) * seg * rho;
  float r = length(vec3(p.x, p.y / 0.82, p.z));
  float ves = jNoise(vec3(rho * 6.0, phi * 12.0, p.y * 18.0));
  float ves2 = jNoise(vec3(rho * 3.0, phi * 6.0, p.y * 9.0));
  col = mix(vec3(1.0, 0.52, 0.1), vec3(1.0, 0.72, 0.32), smoothstep(0.2, 0.85, ves * 0.7 + ves2 * 0.3));
  tr = 0.95;
  h = ves * 0.18;
  float mem = 1.0 - smoothstep(0.01, 0.022, dm);
  float outer = smoothstep(0.83, 0.87, r);
  float core = 1.0 - smoothstep(0.055, 0.085, rho);
  float white = max(max(mem, outer), core);
  col = mix(col, vec3(1.0, 0.93, 0.8), white * 0.85);
  tr = mix(tr, 0.62, white);
  h = mix(h, 0.12, white);
}
/* 切り口：外から 皮 → 白いわた → 房 */
void jCut(vec3 p, out vec3 col, out float tr, out float h) {
  float r = length(vec3(p.x, p.y / 0.82, p.z));
  jInside(p, col, tr, h);
  float pith = smoothstep(0.875, 0.895, r);
  col = mix(col, vec3(1.0, 0.91, 0.74), pith);
  tr = mix(tr, 0.55, pith);
  h = mix(h, 0.08, pith);
  float d = jNoise(p * 26.0);
  float peel = smoothstep(0.945, 0.965, r);
  col = mix(col, mix(vec3(0.97, 0.44, 0.04), vec3(1.0, 0.6, 0.14), d), peel);
  tr = mix(tr, 0.42, peel);
}
/* 外側：皮（毛穴のようなくぼみ）＋皮越しの房＋へた */
void jSkin(vec3 p, out vec3 col, out float tr, out float h) {
  float d = jNoise(p * 26.0);
  float d2 = jNoise(p * 9.0);
  vec3 peel = mix(vec3(0.97, 0.44, 0.04), vec3(1.0, 0.6, 0.14), d * 0.7 + d2 * 0.3);
  vec3 ic; float it; float ih;
  jInside(p * 0.8, ic, it, ih);
  col = mix(peel, ic, uPeelSee);
  tr = mix(0.6, 0.95, uPeelSee);
  h = d * 0.7 + d2 * 0.4;
  float rho = length(p.xz);
  float top = step(0.0, p.y);
  float stem = (1.0 - smoothstep(0.045, 0.07, rho)) * top;
  float ring = (1.0 - smoothstep(0.07, 0.12, rho)) * top * (1.0 - stem);
  col = mix(col, vec3(0.36, 0.45, 0.16), stem);
  col = mix(col, vec3(0.9, 0.52, 0.1), ring * 0.5);
  h += stem * 0.6;
}
vec3 jPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = normalize(dFdx(surfPos.xyz));
  vec3 sy = normalize(dFdy(surfPos.xyz));
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`;

export function mikanMaterial(envMap) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.06, transmission: 0.85, ior: 1.34, thickness: 1.5,
    attenuationColor: new THREE.Color('#FF9A2E'), attenuationDistance: 2.4,
    clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1, envMap, envMapIntensity: 1
  });
  let ok = true;
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, mikanUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aU0;\nattribute float aCap;\nvarying vec3 vU0;\nvarying float vCap;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvU0 = aU0;\nvCap = aCap;');
    const trans = THREE.ShaderChunk.transmission_fragment;
    if (!trans.includes('material.transmission = transmission;')) ok = false;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\nvec3 jCol; float jTr; float jH;\nif (vCap > 0.5) jCut(vU0, jCol, jTr, jH); else jSkin(vU0, jCol, jTr, jH);\ndiffuseColor.rgb = pow(jCol, vec3(2.2));')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, max(roughnessFactor, 0.1), vCap);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= 1.0 - vCap * 0.85;\n#endif')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = jPerturb(-vViewPosition, normal, vec2(dFdx(jH), dFdy(jH)) * uBump, faceDirection);')
      .replace('#include <transmission_fragment>', trans.replace('material.transmission = transmission;', 'material.transmission = transmission * jTr;'));
    if (!ok) console.warn('みかんの透け方を場所ごとに変える所が見つかりませんでした（全体が同じ透け方になります）');
  };
  m.customProgramCacheKey = () => 'mikan-jelly-3';
  return m;
}
