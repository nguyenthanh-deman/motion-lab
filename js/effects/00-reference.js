/* =============================================================================
   00 · Hiệu ứng mẫu (chuẩn tham chiếu cho toàn bộ thư viện)
   Mỗi hiệu ứng: id, name (EN), vn (tên Việt), group, desc, duration, params, render()
   ========================================================================== */
(function () {
  'use strict';
  const H = ML.h;

  /* ---------------------------------------------------------------- Pop Grid */
  ML.register({
    id: 'pop-grid',
    name: 'Pop Grid',
    vn: 'Lưới bật nảy',
    group: 'grid',
    desc: 'Các ô lưới tự bật ra rồi thu lại theo nhịp lệch nhau.',
    duration: 8,
    slots: [2, 12],
    params: [
      { id: 'gap', label: 'Khe hở', type: 'number', default: 3, min: 0, max: 10, step: 0.5, unit: '%' },
      { id: 'visible', label: 'Tỉ lệ hiện', type: 'number', default: 62, min: 30, max: 85, step: 1, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const gapPx = (p.gap * u);
      const vis = H.clamp(p.visible / 100, 0.3, 0.95);
      const rects = H.grid(n, w, h, gapPx);
      const hide = (1 - vis) / 2;
      for (let i = 0; i < n; i++) {
        const r = rects[i];
        const phase = (t + H.hash(i, 5)) % 1;
        let s = 0;
        if (phase > hide && phase < 1 - hide) {
          const local = (phase - hide) / vis;
          const a = H.smooth(H.q(local, 0, 0.16));
          const b = H.smooth(H.q(local, 0.84, 1));
          s = a * (1 - b);
          s = H.back(H.clamp01(s), 2.1);
        }
        if (s <= 0.001) continue;
        const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
        H.card(ctx, imgs[i % n], cx - (r[2] * s) / 2, cy - (r[3] * s) / 2, r[2] * s, r[3] * s,
          u * 2 * s, { alpha: H.clamp01(s * 1.4), shadow: 14 * s });
      }
    }
  });

  /* -------------------------------------------------------------- Grid Reveal */
  ML.register({
    id: 'grid-reveal',
    name: 'Grid Reveal',
    vn: 'Lưới ráp dần',
    group: 'grid',
    desc: 'Lưới 2×2 ráp từng ô, giữ nhịp rồi tản ra.',
    duration: 6,
    slots: [2, 9],
    params: [
      { id: 'gap', label: 'Khe hở', type: 'number', default: 3, min: 0, max: 10, step: 0.5, unit: '%' },
      {
        id: 'order', label: 'Thứ tự', type: 'select', default: 'row',
        options: [{ value: 'row', label: 'Theo hàng' }, { value: 'column', label: 'Theo cột' }, { value: 'diagonal', label: 'Chéo' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const gapPx = p.gap * u;
      const cols = Math.ceil(Math.sqrt(n));
      const rects = H.grid(n, w, h, gapPx, cols);
      const order = p.order;
      const idx = Array.from({ length: n }, (_, i) => i);
      const row = (i) => Math.floor(i / cols), col = (i) => i % cols;
      let sorted = idx;
      if (order === 'column') sorted = [...idx].sort((a, b) => col(a) - col(b) || row(a) - row(b));
      if (order === 'diagonal') sorted = [...idx].sort((a, b) => row(a) + col(a) - (row(b) + col(b)) || row(a) - row(b));
      for (let i = 0; i < n; i++) {
        const rank = sorted.indexOf(i);
        const outRank = sorted.indexOf(i);
        let k;
        if (t < 0.65) k = H.easeOutQuint(H.stagger(H.q(t, 0, 0.35), rank, n, 0.55));
        else k = 1 - H.easeOutQuint(H.stagger(H.q(t, 0.65, 1), n - 1 - outRank, n, 0.55));
        const r = rects[i];
        const scale = 0.72 + 0.28 * k;
        const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
        H.card(ctx, imgs[i % n], cx - (r[2] * scale) / 2, cy - (r[3] * scale) / 2, r[2] * scale, r[3] * scale,
          u * 2, { alpha: 0.25 + 0.75 * k, shadow: 16 * k });
      }
    }
  });

  /* ----------------------------------------------------------- Spotlight Zoom */
  ML.register({
    id: 'spotlight-zoom',
    name: 'Spotlight Zoom',
    vn: 'Ô toả sáng',
    group: 'spotlight',
    desc: 'Từng ô trong lưới lần lượt phóng to phủ kín khung.',
    duration: 9,
    slots: [2, 12],
    params: [
      { id: 'gap', label: 'Khe hở', type: 'number', default: 3, min: 0, max: 10, step: 0.5, unit: '%' },
      { id: 'dimming', label: 'Độ mờ nền', type: 'number', default: 45, min: 0, max: 85, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const rects = H.grid(n, w, h, p.gap * u);
      const seg = H.steps(t, n);
      const focus = seg.i;
      const e = H.pulse(seg.local, 0.28, 0.28);
      const zoom = H.smooth(e);
      ctx.save();
      for (let i = 0; i < n; i++) {
        if (i === focus) continue;
        const r = rects[i];
        const dim = 1 - (p.dimming / 100) * zoom;
        H.card(ctx, imgs[i % n], r[0], r[1], r[2], r[3], u * 2, { alpha: dim * (1 - 0.25 * zoom), edge: false });
      }
      const r = rects[focus];
      const inset = u * 1.5;
      const x = H.lerp(r[0], inset, zoom), y = H.lerp(r[1], inset, zoom);
      const ww = H.lerp(r[2], w - inset * 2, zoom), hh = H.lerp(r[3], h - inset * 2, zoom);
      H.card(ctx, imgs[focus % n], x, y, ww, hh, u * 2 + 6 * zoom, { shadow: 12 + 26 * zoom });
      ctx.restore();
    }
  });

  /* ------------------------------------------------------------- Center Stage */
  ML.register({
    id: 'center-stage',
    name: 'Center Stage',
    vn: 'Sân khấu giữa',
    group: 'spotlight',
    desc: 'Mỗi lần một thiết kế bước vào tâm sân khấu.',
    duration: 12,
    slots: [3, 12],
    params: [
      { id: 'travel', label: 'Quãng trượt', type: 'number', default: 60, min: 20, max: 90, step: 5, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 86, min: 50, max: 95, step: 1, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const seg = H.steps(t, n);
      const aspect = w / h > 1.2 ? 16 / 10 : 4 / 5;
      const bw = Math.min(w * (p.cardSize / 100), h * (p.cardSize / 100) * aspect);
      const bh = bw / aspect;
      const travel = p.travel * u;
      for (let i = 0; i < n; i++) {
        let d = i - seg.all;
        while (d > n / 2) d -= n;
        while (d < -n / 2) d += n;
        const ad = Math.abs(d);
        if (ad > 1.6) continue;
        const s = 1 - Math.min(0.25, ad * 0.14);
        const alpha = ad < 0.02 ? 1 : H.clamp01(1 - ad * 0.6);
        const cx = w / 2 + d * travel;
        const cy = h / 2 + Math.sin(d * Math.PI) * u * 3;
        H.card(ctx, imgs[i % n], cx - (bw * s) / 2, cy - (bh * s) / 2, bw * s, bh * s, u * 2.5,
          { alpha, shadow: 20 * alpha, rot: d * 0.05 });
      }
    }
  });

  /* --------------------------------------------------------------- Card Tunnel */
  ML.register({
    id: 'card-tunnel',
    name: 'Card Tunnel',
    vn: 'Đường hầm thẻ',
    group: '3d',
    desc: 'Bay xuyên hành lang thẻ về phía điểm tụ.',
    duration: 12,
    slots: [4, 24],
    params: [
      { id: 'tunnelSize', label: 'Cỡ hầm', type: 'number', default: 90, min: 40, max: 100, step: 1, unit: '%' },
      { id: 'cardLength', label: 'Dài thẻ', type: 'number', default: 55, min: 20, max: 90, step: 5, unit: '%' },
      { id: 'gap', label: 'Khoảng cách', type: 'number', default: 10, min: 2, max: 25, step: 1, unit: '%' },
      {
        id: 'direction', label: 'Chiều', type: 'select', default: 'forward',
        options: [{ value: 'forward', label: 'Tiến' }, { value: 'back', label: 'Lùi' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const dir = p.direction === 'back' ? -1 : 1;
      const count = Math.max(8, n * 2);
      const items = [];
      for (let i = 0; i < count; i++) {
        let z = ((i / count + t * dir) % 1 + 1) % 1;
        items.push({ i, z: 1 - z });
      }
      items.sort((a, b) => b.z - a.z);
      const base = Math.min(w, h) * (p.tunnelSize / 100);
      const cl = p.cardLength / 100;
      for (const it of items) {
        const depth = it.z;
        const s = 1 / (1 + depth * 3.4);
        const cw = base * 0.78 * s * (1 + cl * 0.4);
        const ch = cw / (16 / 9);
        const side = (H.hash(it.i, 2) - 0.5) * base * 0.9 * s;
        const top = (H.hash(it.i, 9) - 0.5) * base * 0.55 * s;
        const alpha = H.clamp01(1 - depth * (p.gap / 100 + 0.85) * 0.9);
        const rot = (H.hash(it.i, 4) - 0.5) * 0.16;
        H.card(ctx, imgs[it.i % n], cx + side - cw / 2, cy + top - ch / 2, cw, ch, u * 2 * s,
          { alpha: alpha * 0.95, rot, shadow: 18 * s });
      }
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.5);
      g.addColorStop(0, 'rgba(8,10,18,0.0)');
      g.addColorStop(1, 'rgba(8,10,18,0.55)');
    }
  });

  /* ---------------------------------------------------------------- Card Globe */
  ML.register({
    id: 'sphere-globe',
    name: 'Card Globe',
    vn: 'Quả cầu thẻ',
    group: '3d',
    desc: 'Quả cầu thẻ xoay 360°, mặt sau mờ dần.',
    duration: 20,
    slots: [4, 30],
    params: [
      { id: 'globeSize', label: 'Cỡ cầu', type: 'number', default: 70, min: 40, max: 95, step: 1, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 20, min: 8, max: 30, step: 1, unit: '%' },
      { id: 'backFade', label: 'Mờ mặt sau', type: 'number', default: 55, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'tilt', label: 'Nghiêng', type: 'number', default: 0, min: -45, max: 45, step: 1, unit: '°' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * (p.globeSize / 100) * 0.5;
      const cw = Math.min(w, h) * (p.cardSize / 100) * 1.35;
      const ch = cw / H.aspect('16:9', w, h);
      const tilt = (p.tilt * Math.PI) / 180;
      const spin = t * Math.PI * 2;
      const GOLD = Math.PI * (3 - Math.sqrt(5));
      const items = [];
      // rải đều trên mặt cầu (Fibonacci) để quả cầu kín ở mọi số ảnh
      for (let i = 0; i < n; i++) {
        const yy = 1 - (2 * (i + 0.5)) / n;
        const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
        const th = i * GOLD + spin;
        const x3 = Math.cos(th) * rr * R;
        const z3 = Math.sin(th) * rr * R;
        const y3 = yy * R;
        items.push({
          i,
          x: x3,
          y: y3 * Math.cos(tilt) - z3 * Math.sin(tilt),
          z: y3 * Math.sin(tilt) + z3 * Math.cos(tilt),
          yaw: H.clamp(Math.atan2(x3, z3), -1.05, 1.05)
        });
      }
      items.sort((a, b) => a.z - b.z);
      for (const it of items) {
        const front = it.z >= -R * 0.02;
        const sc = 1 + it.z / (R * 3.2);
        const alpha = front ? 1 : H.clamp01(1 - (p.backFade / 100) * 1.1);
        if (alpha <= 0.02) continue;
        H.perspCard(ctx, imgs[it.i % n], cx + it.x, cy + it.y, cw * sc, ch * sc, it.yaw,
          { perspective: 760, radius: u * 2, alpha: alpha * (front ? 1 : 0.9) });
      }
    }
  });
})();
