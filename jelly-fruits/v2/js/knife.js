/* knife.js — 包丁（刃の面で切る）
   刃は手元（左）から切っ先（右）へ向かう。向き＝上から見た刃の向き、傾き＝刃を立てた状態からの傾き。
   切る面は「刃の面」そのもの。下ろす時も刃の面に沿って動くので、見えている刃の角度のとおりに切れる。
   大きさは、ゼリーの半径 1 の時の寸法で作って、あとで拡大する。 */
import * as THREE from 'three';

export class Knife {
  constructor(scene, envMap, makeShadow) {
    const L = 2.4, H = 0.62, T = 0.028;
    this.L = L; this.H = H;
    this.g = new THREE.Group();
    this.g.rotation.order = 'YXZ';
    /* 刃（三徳包丁のような形） */
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.8 * L, 0);
    shape.quadraticCurveTo(0.96 * L, 0.01 * H, L, 0.3 * H);
    shape.quadraticCurveTo(0.94 * L, 0.98 * H, 0.7 * L, H);
    shape.lineTo(0, H);
    shape.lineTo(0, 0);
    const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 2, curveSegments: 24 });
    bladeGeo.translate(-L / 2, 0, -T / 2);
    this.steel = new THREE.MeshPhysicalMaterial({ color: '#e6eaee', metalness: 1, roughness: 0.2, envMap, envMapIntensity: 1.7, clearcoat: 0.5, clearcoatRoughness: 0.08 });
    const blade = new THREE.Mesh(bladeGeo, this.steel);
    /* 柄 */
    const handleGeo = new THREE.CapsuleGeometry(0.095, 0.95, 8, 20);
    handleGeo.rotateZ(Math.PI / 2);
    handleGeo.scale(1, 1, 0.72);
    this.wood = new THREE.MeshPhysicalMaterial({ color: '#2B2622', roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25 });
    const handle = new THREE.Mesh(handleGeo, this.wood);
    handle.position.set(-L / 2 - 0.62, H * 0.62, 0);
    const bolsterGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.12, 24);
    bolsterGeo.rotateZ(Math.PI / 2);
    bolsterGeo.scale(1, 1, 0.72);
    const bolster = new THREE.Mesh(bolsterGeo, this.steel);
    bolster.position.set(-L / 2 - 0.06, H * 0.62, 0);
    this.g.add(blade, handle, bolster);
    for (const dx of [-0.35, -0.75]) {
      const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.15, 12).rotateX(Math.PI / 2), this.steel);
      rv.position.set(-L / 2 + dx - 0.12, H * 0.62, 0);
      this.g.add(rv);
    }
    this.g.visible = false;
    scene.add(this.g);
    /* 影と、刃が下りる所の目印（テーブルの上） */
    this.shadow = makeShadow('#5a5048');
    this.guide = makeShadow('#3a332d');
    scene.add(this.shadow, this.guide);
    this.shadow.visible = this.guide.visible = false;

    this.yaw = 0; this.tilt = 0; this.scale = 1;
    this.K = new THREE.Vector3();      /* 刃のまん中が下りる、テーブルの上の点 */
    this.depth = 0;                    /* 0＝上で待つ／1＝刃がテーブルまで下りた */
    this.hoverY = 2;                   /* 待っている時の刃の高さ */
    this.chop = null;
    this.showGuide = false;
  }

  /** 刃の向き（e＝刃に沿った横向き・up＝刃の面の上向き・n＝刃の面の向き） */
  axes() {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), ct = Math.cos(this.tilt), st = Math.sin(this.tilt);
    return { e: [cy, 0, -sy], up: [sy * st, ct, cy * st], n: [sy * ct, -st, cy * ct] };
  }

  /** 切る面（刃の面）：n·p = d */
  plane(K = this.K) {
    const { n } = this.axes();
    return { n, d: n[0] * K.x + n[1] * K.y + n[2] * K.z };
  }

  /** ストンと下ろす（途中で onCut を1回呼ぶ） */
  startChop(onCut) {
    if (this.chop) return false;
    this.chop = { t: 0, onCut, cut: false };
    return true;
  }

  update(dt, speed) {
    const c = this.chop;
    if (c) {
      c.t += dt * Math.max(0.1, speed) / 0.55;
      const ease = k => k * k * (3 - 2 * k);
      if (c.t < 0.4) this.depth = ease(c.t / 0.4);
      else if (c.t < 0.55) this.depth = 1;
      else this.depth = 1 - ease(Math.min(1, (c.t - 0.55) / 0.45));
      if (!c.cut && c.t >= 0.3) { c.cut = true; c.onCut(); }
      if (c.t >= 1) { this.chop = null; this.depth = 0; }
    }
    this.apply();
  }

  apply() {
    const { up } = this.axes();
    const ct = Math.max(0.3, Math.cos(this.tilt));
    const dist = this.hoverY / ct * (1 - this.depth);
    this.g.position.set(this.K.x + up[0] * dist, this.K.y + up[1] * dist, this.K.z + up[2] * dist);
    this.g.rotation.set(this.tilt, this.yaw, 0);
    this.g.scale.setScalar(this.scale);
    const vis = this.g.visible;
    const lift = this.g.position.y;
    const fade = Math.max(0, 1 - lift / (this.hoverY * 2.2));
    this.shadow.visible = vis;
    this.shadow.position.set(this.g.position.x + lift * 0.25, 0.002, this.g.position.z + lift * 0.35);
    this.shadow.rotation.set(-Math.PI / 2, 0, this.yaw);
    this.shadow.scale.set((this.L + 1.2) * this.scale * 1.05, 0.5 * this.scale + lift * 0.2, 1);
    this.shadow.material.uniforms.strength.value = 0.5 * fade;
    this.guide.visible = vis && this.showGuide;
    this.guide.position.set(this.K.x, 0.003, this.K.z);
    this.guide.rotation.set(-Math.PI / 2, 0, this.yaw);
    this.guide.scale.set(this.L * this.scale, 0.07 * this.scale, 1);
    this.guide.material.uniforms.strength.value = 0.55;
  }
}
