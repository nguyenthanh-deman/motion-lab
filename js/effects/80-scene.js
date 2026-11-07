/* =============================================================================
   80 · Nhóm đa cảnh — nhiều nhịp trong một vòng lặp
   ========================================================================== */
(function () {
  'use strict';
  const H = ML.h;

  /* ------------------------------------------------------------------ Bloom Belt */
  ML.register({
    id: 'bloom-belt', name: 'Bloom Belt', vn: 'Nở vòng rồi dải', group: 'scene',
    desc: 'Chồng thẻ nở thành vòng, xoay từng phần tư, nâng một thẻ lên trước rồi trải thành dải chéo và hàng ngang.',
    duration: 16, slots: [6, 20],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 26, min: 10, max: 50, step: 1, unit: '%' },
      { id: 'ringSize', label: 'Bán kính', type: 'number', default: 42, min: 15, max: 60, step: 1, unit: '%' },
      { id: 'spread', label: 'Độ trải', type: 'number', default: 100, min: 40, max: 160, step: 5, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: [
        { value: '1:1', label: 'Vuông' }, { value: '16:9', label: 'Ngang' }] }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize, ch = cw / ar;
      const cx = w / 2, cy = h / 2;
      const bloom = H.smooth(H.q(t, 0, 0.26));
      const turn = H.smooth(H.q(t, 0.12, 0.52));       // xoay một phần tư
      const belt = H.smooth(H.q(t, 0.56, 0.82));
      const level = H.smooth(H.q(t, 0.82, 1));
      const R = Math.min(w, h) * (p.ringSize / 100);
      const active = Math.floor(t * 4) % n;
      const lift = H.pulse((t * 4) % 1, 0.3, 0.3);
      for (let i = 0; i < n; i++) {
        const s = n > 1 ? (i - (n - 1) / 2) : 0;
        const a = (i / n) * Math.PI * 2 + turn * (Math.PI / 2);
        const rx = cx + Math.cos(a) * R, ry = cy + Math.sin(a) * R * 0.72;
        const bx = cx + s * cw * 0.6 * (p.spread / 100);
        const by = cy + s * ch * 0.38 * (p.spread / 100) + h * 0.16 - belt * h * 0.16;
        const lx = cx + s * cw * 0.86 * (p.spread / 100);
        const ly = cy + h * 0.22;
        const px = H.lerp(cx, H.lerp(rx, H.lerp(bx, lx, level), belt), bloom);
        const py = H.lerp(cy, H.lerp(ry, H.lerp(by, ly, level), belt), bloom);
        const sc = H.lerp(0.72, 1, bloom) * (i === active ? 1 + lift * 0.22 * (1 - belt) : 1);
        const rot = (1 - bloom) * (i - n / 2) * 0.03 + bloom * (1 - belt) * (a + Math.PI / 2) * 0.35;
        H.card(ctx, imgs[i % n], px - (cw * sc) / 2, py - (ch * sc) / 2, cw * sc, ch * sc, u * 2,
          { rot, shadow: 18, alpha: 0.85 + 0.15 * bloom });
      }
    }
  });

  /* ----------------------------------------------------------------- Collage Reel */
  ML.register({
    id: 'collage-reel', name: 'Collage Reel', vn: 'Collage mở ra', group: 'scene',
    desc: 'Collage so le tách ra nhường chỗ cho một thẻ hero, lật qua mọi ảnh rồi ráp lại.',
    duration: 16, slots: [6, 16],
    params: [
      { id: 'heroSize', label: 'Cỡ hero', type: 'number', default: 52, min: 30, max: 80, step: 1, unit: '%' },
      { id: 'staggerX', label: 'Lệch ngang', type: 'number', default: 68, min: 20, max: 100, step: 4, unit: '%' },
      { id: 'rowPitch', label: 'Khoảng hàng', type: 'number', default: 61, min: 20, max: 100, step: 4, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ hero', type: 'select', default: '16:9', options: [
        { value: '16:9', label: 'Ngang' }, { value: '1:1', label: 'Vuông' }, { value: '4:5', label: 'Dọc' }] }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * 24, ch = cw / 1.4;
      const heroW = Math.min(w * (p.heroSize / 100), h * (p.heroSize / 100) * ar);
      const heroH = heroW / ar;
      const open = H.pulse(H.q(t, 0.05, 0.9), 0.32, 0.3);   // 1 = đã tách ra
      const reel = H.q(t, 0.3, 0.72);
      const cols = Math.ceil(Math.sqrt(n));
      for (let i = 0; i < n; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const gx = (col - (cols - 1) / 2) * cw * (p.staggerX / 100) * 1.5;
        const gy = (row - (Math.ceil(n / cols) - 1) / 2) * ch * (p.rowPitch / 100) * 1.2;
        const dir = col % 2 ? 1 : -1;
        const x = w / 2 + gx + dir * open * w * 0.22;
        const y = h / 2 + gy - open * h * 0.12 * dir;
        const sc = 1 - open * 0.18;
        H.card(ctx, imgs[i % n], x - (cw * sc) / 2, y - (ch * sc) / 2, cw * sc, ch * sc, u * 2,
          { alpha: 1 - open * 0.75, shadow: 14, rot: open * dir * 0.12 });
      }
      if (open > 0.15) {
        const idx = Math.floor(reel * n) % n;
        const fw = heroW * open, fh = heroH * open;
        H.card(ctx, imgs[idx], w / 2 - fw / 2, h / 2 - fh / 2, fw, fh, u * 2,
          { alpha: H.clamp01(open * 1.6), shadow: 30 });
      }
    }
  });

  /* ----------------------------------------------------------------- Triple Scene */
  ML.register({
    id: 'triple-scene', name: 'Triple Scene', vn: 'Ba cảnh', group: 'scene',
    desc: 'Ba cảnh trong một vòng: hero trượt vào, băng cột trôi, rồi hàng chéo hạ xuống một hero.',
    duration: 18, slots: [9, 20],
    params: [
      { id: 'heroSize', label: 'Cỡ hero', type: 'number', default: 58, min: 30, max: 85, step: 1, unit: '%' },
      { id: 'columns', label: 'Số cột', type: 'number', default: 3, min: 2, max: 4, step: 1 },
      { id: 'perColumn', label: 'Thẻ mỗi cột', type: 'number', default: 6, min: 3, max: 10, step: 1 },
      { id: 'rowTilt', label: 'Nghiêng hàng', type: 'number', default: 17, min: -45, max: 45, step: 1, unit: '°' },
      { id: 'cardAspect', label: 'Tỉ lệ', type: 'select', default: '16:9', options: [
        { value: '16:9', label: 'Ngang' }, { value: '1:1', label: 'Vuông' }] }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const seg = H.steps(t, 3);
      const cx = w / 2, cy = h / 2;
      if (seg.i === 0) {
        const k = H.easeOutQuint(seg.local);
        const bw = w * (p.heroSize / 100) * 0.9, bh = bw / ar;
        const x = H.lerp(w * 1.2, cx, k), y = cy;
        for (let i = 0; i < Math.min(3, n); i++) {
          const off = (i - 1) * u * 4;
          H.card(ctx, imgs[i % n], x - bw / 2 + off, y - bh / 2 + off * 0.6, bw, bh, u * 2,
            { alpha: i === 0 ? 1 : 0.0, shadow: 26 });
        }
      } else if (seg.i === 1) {
        const cols = Math.max(2, Math.round(p.columns));
        const per = Math.max(3, Math.round(p.perColumn));
        const cw = w / cols * 0.72, ch = cw / ar;
        const drift = seg.local * (ch + u * 2) * per;
        for (let k = 0; k < cols; k++) {
          const dir = k % 2 ? -1 : 1;
          for (let i = -1; i <= per; i++) {
            const y = ((i * (ch + u * 2) + drift * dir) % (per * (ch + u * 2)) + per * (ch + u * 2)) % (per * (ch + u * 2));
            H.card(ctx, imgs[(k * per + i + n * 2) % n], (k + 0.5) * (w / cols) - cw / 2, y - ch - u * 2,
              cw, ch, u * 2, { shadow: 14 });
          }
        }
      } else {
        const k = H.easeInOut(seg.local);
        const tilt = (p.rowTilt * Math.PI) / 180;
        const cw = u * 22, ch = cw / ar;
        for (let i = 0; i < n; i++) {
          const s = i - (n - 1) / 2;
          const x = cx + s * cw * 0.8 * Math.cos(tilt) * (1 - k * 0.55);
          const y = H.lerp(cy - h * 0.3, cy + s * cw * 0.8 * Math.sin(tilt) * (1 - k * 0.55), k);
          const active = Math.abs(s) < 0.5;
          const sc = active ? 1 + k * 0.9 : 1 - k * 0.35;
          H.card(ctx, imgs[i % n], x - (cw * sc) / 2, y - (ch * sc) / 2, cw * sc, ch * sc, u * 2,
            { alpha: active ? 1 : 1 - k * 0.75, rot: tilt, shadow: 16 + 14 * k * (active ? 1 : 0) });
        }
      }
    }
  });

  /* ------------------------------------------------------------------ Fan Shuffle */
  ML.register({
    id: 'fan-shuffle', name: 'Fan Shuffle', vn: 'Xoè bài', group: 'scene',
    desc: 'Bộ bài xoè ra, một bức tường thẻ trôi qua, rồi bộ bài xoè lại và khép.',
    duration: 16, slots: [8, 20],
    params: [
      { id: 'fanAngle', label: 'Góc xoè', type: 'number', default: -30, min: -70, max: 70, step: 2, unit: '°' },
      { id: 'fanSpread', label: 'Độ xoè', type: 'number', default: 8, min: 2, max: 20, step: 0.5, unit: '%' },
      { id: 'columns', label: 'Số cột', type: 'number', default: 3, min: 2, max: 4, step: 1 },
      { id: 'cardAspect', label: 'Tỉ lệ', type: 'select', default: '16:9', options: [
        { value: '16:9', label: 'Ngang' }, { value: '1:1', label: 'Vuông' }] }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const seg = H.steps(t, 3);
      const cx = w / 2, cy = h / 2;
      const cw = u * 26, ch = cw / ar;
      if (seg.i === 0 || seg.i === 2) {
        const k = seg.i === 0 ? H.easeOut(seg.local) : 1 - H.easeIn(seg.local);
        const base = (p.fanAngle * Math.PI) / 180;
        for (let i = 0; i < n; i++) {
          const s = i - (n - 1) / 2;
          const a = base + s * (p.fanSpread / 100) * 1.6;
          const x = cx + Math.sin(a) * cw * 1.6 * k;
          const y = cy + (1 - Math.cos(a)) * ch * 1.2 * k - s * u * 0.6;
          H.card(ctx, imgs[i % n], x - cw / 2, y - ch / 2, cw, ch, u * 2,
            { rot: a * k, shadow: 16, alpha: 0.9 });
        }
      } else {
        const cols = Math.max(2, Math.round(p.columns));
        const colW = w / cols;
        const drift = H.easeInOut(seg.local) * h * 1.2;
        for (let k = 0; k < cols; k++) {
          const dir = k % 2 ? -1 : 1;
          for (let i = -1; i <= n; i++) {
            const y = ((i * (ch + u * 2) - drift * dir) % ((n + 1) * (ch + u * 2)) + (n + 1) * (ch + u * 2)) % ((n + 1) * (ch + u * 2));
            H.card(ctx, imgs[(k * n + i + n * 3) % n], k * colW + (colW - cw) / 2, y - ch, cw, ch, u * 2,
              { shadow: 12, alpha: 0.85 });
          }
        }
      }
    }
  });

  /* ---------------------------------------------------------------- Flyby Rolodex */
  ML.register({
    id: 'flyby-rolodex', name: 'Flyby Rolodex', vn: 'Lướt rồi xoay', group: 'scene',
    desc: 'Bay ngang qua các thẻ rải trong chiều sâu, cuộn chúng thành cột, rồi xoè thành rolodex và gập lại.',
    duration: 18, slots: [8, 24],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 26, min: 10, max: 45, step: 1, unit: '%' },
      { id: 'spread', label: 'Độ rải', type: 'number', default: 100, min: 40, max: 160, step: 5, unit: '%' },
      { id: 'columnSize', label: 'Cỡ cột', type: 'number', default: 35, min: 15, max: 55, step: 1, unit: '%' },
      { id: 'roll', label: 'Độ xoay', type: 'number', default: 100, min: 0, max: 100, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cw = u * p.cardSize, ch = cw * 0.72;
      const seg = H.steps(t, 3);
      const cx = w / 2, cy = h / 2;
      const fly = seg.i === 0 ? H.easeInOut(seg.local) : seg.i === 1 ? 1 : 1;
      const colK = H.smooth(H.q(t, 0.33, 0.55));
      const fanK = H.smooth(H.q(t, 0.66, 0.88));
      const closeK = H.smooth(H.q(t, 0.88, 1));
      for (let i = 0; i < n; i++) {
        const s = n > 1 ? i / (n - 1) - 0.5 : 0;
        // cảnh 1: rải trong chiều sâu, trôi ngang
        const depth = 0.5 + H.hash(i, 2) * 0.9;
        const fx = cx + s * w * (p.spread / 100) - fly * w * 0.35;
        const fy = cy + (H.hash(i, 3) - 0.5) * h * 0.7;
        // cảnh 2: cột dọc, thẻ nhỏ dần phía trên
        const colY = cy + s * h * 0.55;
        const colX = cx;
        // cảnh 3: rolodex — xoay quanh trục dọc
        const a = s * Math.PI * 1.2 * (p.roll / 100) - closeK * Math.PI * 0.6;
        const rx = Math.cos(a) * u * p.columnSize;
        const rz = Math.sin(a);
        // trộn vị trí
        const p1x = H.lerp(fx, colX, colK), p1y = H.lerp(fy, colY, colK);
        const p2x = H.lerp(p1x, cx + rx, fanK), p2y = H.lerp(p1y, cy + s * h * 0.1, fanK);
        const sc = H.lerp(depth, 0.72, colK) * H.lerp(1, 0.85 + 0.15 * (rz + 1) / 2, fanK);
        const alpha = H.clamp01(0.35 + 0.65 * (1 - Math.abs(s) * 1.4)) * (1 - closeK * 0.55);
        H.card(ctx, imgs[i % n], p2x - (cw * sc) / 2, p2y - (ch * sc) / 2, cw * sc, ch * sc, u * 2,
          { alpha, rot: fanK * rz * 0.25, shadow: 12 * sc, brightness: -0.2 * (1 - (rz + 1) / 2) });
      }
    }
  });
})();
