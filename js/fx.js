// 特效系統：全螢幕 canvas 疊層 + 簡單粒子
// 依「快速出現 → 短暫停留 → 不均勻消散」的節奏設計

const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

export class FX {
  constructor(canvas, shakeTarget) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.shakeTarget = shakeTarget;
    this.items = []; // { t0, dur, draw(ctx, t, age) }
    this.parts = [];
    this.shake = { amp: 0, t0: 0, dur: 0 };
    this.running = false;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.cv.width = innerWidth * dpr;
    this.cv.height = innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  now() { return performance.now(); }

  add(dur, draw, delay = 0) {
    this.items.push({ t0: this.now() + delay, dur, draw });
    this.kick();
  }

  part(p) { this.parts.push({ life: 1, age: 0, drag: 0.9, g: 0, rot: 0, vr: 0, comp: 'source-over', ...p }); this.kick(); }

  doShake(amp, dur) {
    this.shake = { amp, t0: this.now(), dur };
    this.kick();
  }

  kick() {
    if (this.running) return;
    this.running = true;
    this.last = this.now();
    requestAnimationFrame(() => this.loop());
  }

  loop() {
    const ctx = this.ctx;
    const t = this.now();
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    this.items = this.items.filter((it) => {
      const age = t - it.t0;
      if (age < 0) return true;
      const k = age / it.dur;
      if (k >= 1) return false;
      ctx.save();
      it.draw(ctx, k, age);
      ctx.restore();
      return true;
    });

    this.parts = this.parts.filter((p) => {
      p.age += dt;
      if (p.age >= p.life) return false;
      const f = Math.pow(p.drag, dt * 60);
      p.vx *= f; p.vy *= f; p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      ctx.save();
      ctx.globalCompositeOperation = p.comp;
      p.draw(ctx, p, p.age / p.life);
      ctx.restore();
      return true;
    });

    // 畫面震動（衰減）
    const s = this.shake;
    const sk = (t - s.t0) / s.dur;
    if (this.shakeTarget) {
      if (sk < 1 && s.amp > 0) {
        const a = s.amp * Math.pow(1 - sk, 2);
        this.shakeTarget.style.transform = `translate(${rand(-a, a)}px, ${rand(-a, a)}px)`;
      } else this.shakeTarget.style.transform = '';
    }

    if (this.items.length || this.parts.length || sk < 1) requestAnimationFrame(() => this.loop());
    else { this.running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  // ───────── 手槍處決 ─────────
  // rect: 目標格的 DOMRect；origin: 開槍位置（指揮官）。回傳 Promise，於命中時呼叫 onHit
  pistol(rect, origin, onHit, sfx) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const s = rect.width;
    const AIM = 420;
    return new Promise((resolve) => {
      // 1) 準星收束（預備動作）
      this.add(AIM + 140, (ctx, k, age) => {
        const a = clamp01(age / AIM);
        const r = s * (1.1 - 0.62 * easeOut(a));
        const alpha = age > AIM ? 1 - (age - AIM) / 140 : 0.35 + 0.65 * a;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ff3b30';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff3b30';
        ctx.shadowBlur = 10;
        ctx.translate(cx, cy);
        ctx.rotate((1 - easeOut(a)) * 0.9);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath(); ctx.moveTo(r * 0.45, 0); ctx.lineTo(r * 1.25, 0); ctx.stroke();
        }
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
      });
      setTimeout(() => {
        sfx?.('gun');
        // 2) 槍口火光（指揮官位置）
        this.add(90, (ctx, k) => {
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, 46);
          g.addColorStop(0, `rgba(255,255,230,${1 - k})`);
          g.addColorStop(0.4, `rgba(255,190,60,${0.8 * (1 - k)})`);
          g.addColorStop(1, 'rgba(255,120,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(origin.x, origin.y, 46, 0, Math.PI * 2); ctx.fill();
        });
        // 3) 彈道曳光（前端亮、尾端漸淡）
        this.add(120, (ctx, k) => {
          ctx.globalCompositeOperation = 'lighter';
          const head = clamp01(k * 3);
          const tail = clamp01(k * 3 - 0.6);
          const hx = origin.x + (cx - origin.x) * head, hy = origin.y + (cy - origin.y) * head;
          const tx = origin.x + (cx - origin.x) * tail, ty = origin.y + (cy - origin.y) * tail;
          const g = ctx.createLinearGradient(tx, ty, hx, hy);
          g.addColorStop(0, 'rgba(255,200,80,0)');
          g.addColorStop(1, `rgba(255,250,220,${1 - k})`);
          ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        });
        setTimeout(() => {
          // 4) 命中：閃光 + 火花 + 綠色體液噴濺 + 小震動
          onHit?.();
          this.doShake(7, 220);
          this.add(160, (ctx, k) => {
            ctx.globalCompositeOperation = 'lighter';
            const r = s * (0.25 + 0.35 * easeOut(k));
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0, `rgba(255,255,240,${1 - k})`);
            g.addColorStop(0.5, `rgba(255,170,60,${0.6 * (1 - k)})`);
            g.addColorStop(1, 'rgba(255,80,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
          });
          const dir = Math.atan2(cy - origin.y, cx - origin.x);
          for (let i = 0; i < 16; i++) {
            const a = dir + rand(-0.9, 0.9);
            const v = rand(180, 520);
            this.part({
              x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.18, 0.38), drag: 0.86, comp: 'lighter',
              draw: (ctx, p, k) => {
                ctx.strokeStyle = `rgba(255,${200 - 120 * k | 0},80,${1 - k})`;
                ctx.lineWidth = 2 * (1 - k) + 0.5;
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
              },
            });
          }
          for (let i = 0; i < 12; i++) {
            const a = dir + rand(-1.2, 1.2);
            const v = rand(60, 220);
            const sz = rand(2, 6);
            this.part({
              x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.4, 0.7), drag: 0.82,
              draw: (ctx, p, k) => {
                ctx.fillStyle = `rgba(90,170,40,${0.9 * (1 - k * k)})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, sz * (1 - 0.4 * k), 0, Math.PI * 2); ctx.fill();
              },
            });
          }
          setTimeout(resolve, 280);
        }, 45);
      }, AIM);
    });
  }

  // ───────── 爆炸處決（範圍 = 所有群聚格的外框） ─────────
  explosion(rects, onBoom, sfx) {
    const L = Math.min(...rects.map((r) => r.left)), T = Math.min(...rects.map((r) => r.top));
    const R = Math.max(...rects.map((r) => r.right)), B = Math.max(...rects.map((r) => r.bottom));
    const cx = (L + R) / 2, cy = (T + B) / 2;
    const rad = Math.hypot(R - L, B - T) / 2 + 6;
    const WARN = 700;
    return new Promise((resolve) => {
      // 1) 預警：每格閃紅框 + 倒數嗶聲
      this.add(WARN, (ctx, k, age) => {
        const blink = Math.floor(age / 120) % 2 === 0 ? 1 : 0.25;
        ctx.strokeStyle = `rgba(255,60,40,${blink})`;
        ctx.fillStyle = `rgba(255,40,20,${0.18 * blink})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -age / 20;
        for (const r of rects) { ctx.fillRect(r.left, r.top, r.width, r.height); ctx.strokeRect(r.left + 2, r.top + 2, r.width - 4, r.height - 4); }
      });
      [0, 240, 480].forEach((d) => setTimeout(() => sfx?.('beep'), d));

      setTimeout(() => {
        sfx?.('boom');
        onBoom?.();
        this.doShake(16, 520);
        // 2) 全螢幕閃白
        this.add(110, (ctx, k) => {
          ctx.fillStyle = `rgba(255,245,220,${0.55 * (1 - k)})`;
          ctx.fillRect(0, 0, innerWidth, innerHeight);
        });
        // 3) 火球主體：瞬間撐滿範圍 → 停留 → 轉暗
        this.add(520, (ctx, k) => {
          ctx.globalCompositeOperation = 'lighter';
          const grow = easeOut(clamp01(k / 0.18));
          const fade = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
          const r = rad * (0.55 + 0.55 * grow);
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(255,255,235,${fade})`);
          g.addColorStop(0.25, `rgba(255,220,110,${fade})`);
          g.addColorStop(0.55, `rgba(255,120,30,${0.85 * fade})`);
          g.addColorStop(0.85, `rgba(180,30,10,${0.5 * fade})`);
          g.addColorStop(1, 'rgba(80,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        });
        // 4) 衝擊波環
        this.add(480, (ctx, k) => {
          const r = rad * (0.6 + 1.5 * easeOut(k));
          ctx.strokeStyle = `rgba(255,230,190,${0.8 * (1 - k)})`;
          ctx.lineWidth = 10 * (1 - k) + 1;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        });
        // 5) 火焰團（不規則，大中小混合）
        for (let i = 0; i < 34; i++) {
          const a = rand(0, Math.PI * 2);
          const v = rand(40, 260) * (rad / 80);
          const sz = rand(0.18, 0.45) * rad;
          this.part({
            x: cx + rand(-rad, rad) * 0.3, y: cy + rand(-rad, rad) * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            life: rand(0.35, 0.75), drag: 0.88, comp: 'lighter',
            draw: (ctx, p, k) => {
              const r = sz * (0.6 + 0.7 * k);
              const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
              const heat = 1 - k;
              g.addColorStop(0, `rgba(255,${150 + 100 * heat | 0},${60 * heat | 0},${0.8 * heat})`);
              g.addColorStop(1, 'rgba(200,40,0,0)');
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
            },
          });
        }
        // 6) 濃煙：較晚出現、緩慢擴散、最後消散
        for (let i = 0; i < 26; i++) {
          const a = rand(0, Math.PI * 2);
          const v = rand(20, 110) * (rad / 80);
          const sz = rand(0.25, 0.55) * rad;
          setTimeout(() => this.part({
            x: cx + rand(-rad, rad) * 0.4, y: cy + rand(-rad, rad) * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10,
            life: rand(1.2, 2.2), drag: 0.94,
            draw: (ctx, p, k) => {
              const r = sz * (0.7 + 1.1 * easeOut(k));
              const al = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.55;
              const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
              g.addColorStop(0, `rgba(48,44,40,${al})`);
              g.addColorStop(1, 'rgba(48,44,40,0)');
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
            },
          }), rand(80, 260));
        }
        // 7) 碎片 + 火星
        for (let i = 0; i < 26; i++) {
          const a = rand(0, Math.PI * 2);
          const v = rand(250, 700);
          const w = rand(3, 9), h = rand(2, 6);
          const hot = Math.random() < 0.45;
          this.part({
            x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.5, 1.1), drag: 0.9, vr: rand(-12, 12),
            comp: hot ? 'lighter' : 'source-over',
            draw: (ctx, p, k) => {
              ctx.translate(p.x, p.y); ctx.rotate(p.rot);
              ctx.fillStyle = hot ? `rgba(255,${220 - 150 * k | 0},90,${1 - k})` : `rgba(40,36,30,${1 - k * k})`;
              ctx.fillRect(-w / 2, -h / 2, hot ? w * 0.5 : w, hot ? h * 0.5 : h);
            },
          });
        }
        setTimeout(resolve, 900);
      }, WARN);
    });
  }

  // ───────── 勝利：金色光芒 + 彩帶 + 煙火 ─────────
  victory(center) {
    const { x: cx, y: cy } = center;
    this.add(2600, (ctx, k) => {
      ctx.globalCompositeOperation = 'lighter';
      const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      ctx.translate(cx, cy);
      ctx.rotate(k * 0.8);
      const R = Math.max(innerWidth, innerHeight);
      for (let i = 0; i < 14; i++) {
        ctx.rotate((Math.PI * 2) / 14);
        const g = ctx.createLinearGradient(0, 0, R, 0);
        g.addColorStop(0, `rgba(255,220,120,${0.35 * a})`);
        g.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, -R * 0.09); ctx.lineTo(R, R * 0.09); ctx.closePath(); ctx.fill();
      }
    });
    const colors = ['#ffd34d', '#4dd18a', '#5aa9ff', '#ff6b6b', '#ffffff', '#c58bff'];
    for (let i = 0; i < 140; i++) {
      const col = colors[i % colors.length];
      const w = rand(6, 11), h = rand(3, 6);
      setTimeout(() => this.part({
        x: rand(0, innerWidth), y: rand(-60, -10), vx: rand(-40, 40), vy: rand(120, 260), g: 60, drag: 0.995,
        life: rand(2.6, 4), vr: rand(-8, 8), sway: rand(0, 6.28),
        draw: (ctx, p, k) => {
          ctx.translate(p.x + Math.sin(p.age * 3 + p.sway) * 18, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.age * 7 + p.sway));
          ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
          ctx.fillStyle = col;
          ctx.fillRect(-w / 2, -h / 2, w, h);
        },
      }), rand(0, 900));
    }
    const burst = (bx, by, col) => {
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * Math.PI * 2 + rand(-0.05, 0.05);
        const v = rand(160, 300);
        this.part({
          x: bx, y: by, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 90, drag: 0.93, life: rand(0.9, 1.4), comp: 'lighter',
          draw: (ctx, p, k) => {
            ctx.strokeStyle = col; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2.2 * (1 - k) + 0.6;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
          },
        });
      }
    };
    [[0.25, 0.3, '#ffd34d', 200], [0.75, 0.25, '#5aa9ff', 600], [0.5, 0.18, '#ff7b7b', 1000], [0.35, 0.4, '#4dd18a', 1400]]
      .forEach(([fx, fy, col, d]) => setTimeout(() => burst(innerWidth * fx, innerHeight * fy, col), d));
  }

  // ───────── 失敗：紅色暗角脈動 + 雜訊掃描線 + 心電圖歸零 ─────────
  defeat() {
    this.doShake(10, 400);
    this.add(2600, (ctx, k, age) => {
      const W = innerWidth, H = innerHeight;
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(age / 260));
      const a = (k < 0.1 ? k / 0.1 : 1 - Math.max(0, k - 0.7) / 0.3) * pulse;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(120,0,0,0)');
      g.addColorStop(1, `rgba(150,0,0,${0.75 * a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (age < 700) {
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(255,${rand(0, 80) | 0},${rand(0, 60) | 0},${rand(0.05, 0.18)})`;
          ctx.fillRect(0, rand(0, H), W, rand(2, 18));
        }
      }
      // 心電圖：跳兩下後變成直線
      const y = H * 0.5, prog = clamp01(age / 1600) * W;
      ctx.strokeStyle = `rgba(255,70,70,${0.9 * a})`;
      ctx.lineWidth = 3; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= prog; x += 4) {
        let dy = 0;
        for (const bx of [W * 0.22, W * 0.42]) {
          const d = x - bx;
          if (d > 0 && d < 40) dy = d < 10 ? -d * 6 : d < 22 ? -60 + (d - 10) * 9 : d < 30 ? 48 - (d - 22) * 6 : 0;
        }
        ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    });
  }
}
