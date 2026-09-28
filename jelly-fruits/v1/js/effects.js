/* effects.js — 果汁のしぶき・床のしみ・切った瞬間の光 */
import { TAU } from './geom.js';

function hexToRgb(h) {
  const v = parseInt(h.slice(1), 16);
  return `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`;
}

export class Effects {
  constructor() { this.drops = []; this.stains = []; this.flashes = []; }
  clear() { this.drops.length = 0; this.stains.length = 0; this.flashes.length = 0; }

  /** 切り口 a→b から果汁を飛ばす */
  juice(ax, ay, bx, by, color, amount, size) {
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux;
    const rgb = hexToRgb(color);
    const count = Math.min(70, Math.round(len / 4 * amount));
    const k = Math.sqrt(size / 80);
    for (let i = 0; i < count; i++) {
      const t = Math.random(), side = Math.random() < 0.5 ? -1 : 1;
      const sp = (70 + Math.random() * 280) * k;
      this.drops.push({
        x: ax + (bx - ax) * t, y: ay + (by - ay) * t,
        vx: nx * side * sp + ux * (Math.random() - 0.5) * 140,
        vy: ny * side * sp + uy * (Math.random() - 0.5) * 140,
        z: 0, vz: 120 + Math.random() * 260,
        r: (1 + Math.random() * 2.6) * k, rgb
      });
    }
    this.flashes.push({ ax, ay, bx, by, t: 0 });
    if (this.drops.length > 400) this.drops.splice(0, this.drops.length - 400);
  }

  update(dt) {
    for (const d of this.drops) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      const k = Math.exp(-3 * dt);
      d.vx *= k; d.vy *= k;
      d.vz -= 1800 * dt; d.z += d.vz * dt;
      if (d.z <= 0) {
        d.dead = true;
        if (Math.random() < 0.8) {
          this.stains.push({ x: d.x, y: d.y, r: d.r * (1.2 + Math.random() * 0.8), rot: Math.random() * TAU, sq: 0.6 + Math.random() * 0.4, rgb: d.rgb, age: 0 });
        }
      }
    }
    this.drops = this.drops.filter(d => !d.dead);
    for (const s of this.stains) s.age += dt;
    this.stains = this.stains.filter(s => s.age < 6);
    if (this.stains.length > 300) this.stains.splice(0, this.stains.length - 300);
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter(f => f.t < 0.22);
  }

  /** 床のしみ（ゼリーより下） */
  drawUnder(ctx) {
    for (const s of this.stains) {
      const a = 0.32 * Math.max(0, 1 - s.age / 6);
      ctx.fillStyle = `rgba(${s.rgb},${a})`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * s.sq, s.rot, 0, TAU);
      ctx.fill();
    }
  }

  /** 飛んでいるしぶき・切った瞬間の光（ゼリーより上） */
  drawOver(ctx) {
    for (const d of this.drops) {
      const s = 1 + d.z * 0.004;
      ctx.fillStyle = 'rgba(60,40,20,0.12)';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(${d.rgb},0.9)`;
      ctx.beginPath(); ctx.arc(d.x - d.z * 0.12, d.y - d.z * 0.3, d.r * s, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(d.x - d.z * 0.12 - d.r * 0.3, d.y - d.z * 0.3 - d.r * 0.3, d.r * s * 0.3, 0, TAU); ctx.fill();
    }
    for (const f of this.flashes) {
      const k = f.t / 0.22;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
      ctx.lineWidth = 5 * (1 - k) + 1;
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 12;
      const ex = (f.bx - f.ax) * 0.08, ey = (f.by - f.ay) * 0.08;
      ctx.beginPath(); ctx.moveTo(f.ax - ex, f.ay - ey); ctx.lineTo(f.bx + ex, f.by + ey); ctx.stroke();
      ctx.restore();
    }
  }
}
