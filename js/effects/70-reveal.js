/* =============================================================================
   70 · Nhóm lộ ảnh & tiêu điểm — 5 hiệu ứng
   mosaic-wipe / split-reveal        → group 'reveal'
   focus-shift / focus-slider / hero-reel → group 'spotlight'
   ========================================================================== */
(function () {
  'use strict';
  const H = ML.h;

  /* ----------------------------------------------------------------- Mosaic Wipe */
  ML.register({
    id: 'mosaic-wipe', name: 'Mosaic Wipe', vn: 'Ráp ô màn trập', group: 'reveal',
    desc: 'Ảnh mới lộ ra qua từng ô nhỏ mở dần từ tâm, hoặc quét ngang như rèm chớp.',
    duration: 9, slots: [2, 20],
    params: [
      { id: 'tile', label: 'Cỡ ô', type: 'number', default: 11, min: 6, max: 22, step: 1, unit: '%' },
      {
        id: 'style', label: 'Kiểu mở', type: 'select', default: 'iris',
        options: [{ value: 'iris', label: 'Mở từ tâm' }, { value: 'blind', label: 'Rèm chớp' }]
      },
      { id: 'stagger', label: 'Lệch nhịp', type: 'number', default: 60, min: 0, max: 85, step: 5, unit: '%' },
      { id: 'glow', label: 'Mép sáng', type: 'number', default: 70, min: 0, max: 100, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const seg = H.steps(t, n);
      const from = imgs[seg.i % n];
      const to = imgs[(seg.i + 1) % n];

      // ảnh cũ nằm dưới, ảnh mới chỉ hiện qua các ô đang mở
      H.card(ctx, from, 0, 0, w, h, 0, { edge: false });

      // lưới ô, khống chế số ô để mỗi khung hình vẫn nhẹ
      let tilePx = Math.max(u * 5, u * p.tile);
      let cols = 0, rows = 0;
      for (let guard = 0; guard < 6; guard++) {
        cols = Math.max(2, Math.round(w / tilePx));
        rows = Math.max(2, Math.round(h / tilePx));
        if (cols * rows <= 220) break;
        tilePx *= 1.18;
      }
      const tw = w / cols, th = h / rows;
      const stag = H.clamp(p.stagger / 100, 0, 0.92);
      const prog = H.easeInOut(H.q(seg.local, 0.03, 0.7));

      const rects = [];   // ô đã mở (dùng cho clip)
      const lit = [];     // ô đang mở dở (dùng cho mép sáng)
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < cols; k++) {
          let d;
          if (p.style === 'iris') {
            const nx = (k + 0.5) / cols - 0.5;
            const ny = (r + 0.5) / rows - 0.5;
            d = H.clamp01(Math.hypot(nx, ny) / 0.7072);
          } else {
            d = cols > 1 ? k / (cols - 1) : 0;
          }
          const kk = H.clamp01((prog - d * stag) / (1 - stag || 1));
          if (kk <= 0.001) continue;
          const s = H.easeOutQuint(kk);
          const x = k * tw + (tw - tw * s) / 2;
          const y = r * th + (th - th * s) / 2;
          rects.push([x, y, tw * s + 0.6, th * s + 0.6]);
          if (kk > 0.02 && kk < 0.98) lit.push([x - 0.3, y - 0.3, tw * s + 1.2, th * s + 1.2]);
        }
      }

      if (rects.length) {
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < rects.length; i++) ctx.rect(rects[i][0], rects[i][1], rects[i][2], rects[i][3]);
        ctx.clip();
        H.card(ctx, to, 0, 0, w, h, 0, { edge: false });
        ctx.restore();
      }

      const glow = p.glow / 100;
      if (glow > 0.01 && lit.length) {
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < lit.length; i++) ctx.rect(lit[i][0], lit[i][1], lit[i][2], lit[i][3]);
        ctx.strokeStyle = 'rgba(226,244,255,' + (0.42 * glow) + ')';
        ctx.lineWidth = Math.max(1, u * 0.35);
        ctx.shadowColor = 'rgba(150,220,255,' + (0.85 * glow) + ')';
        ctx.shadowBlur = u * 2.4 * glow;
        ctx.stroke();
        ctx.restore();
      }
    }
  });

  /* ---------------------------------------------------------------- Split Reveal */
  ML.register({
    id: 'split-reveal', name: 'Split Reveal', vn: 'Hai panel trượt', group: 'reveal',
    desc: 'Hai panel trượt vào từ hai mép đối diện rồi khép khe giữa thành một khung.',
    duration: 10, slots: [2, 20],
    params: [
      { id: 'splitRatio', label: 'Tỉ lệ chia', type: 'number', default: 50, min: 25, max: 75, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe giữa', type: 'number', default: 2.5, min: 0, max: 8, step: 0.5, unit: '%' },
      {
        id: 'direction', label: 'Hướng chia', type: 'select', default: 'vertical',
        options: [{ value: 'vertical', label: 'Chia dọc' }, { value: 'horizontal', label: 'Chia ngang' }]
      },
      { id: 'stagger', label: 'Lệch nhịp', type: 'number', default: 20, min: 0, max: 40, step: 5, unit: '%' },
      { id: 'glow', label: 'Mép sáng', type: 'number', default: 65, min: 0, max: 100, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const seg = H.steps(t, n);
      const from = imgs[seg.i % n];
      const to = imgs[(seg.i + 1) % n];
      H.card(ctx, from, 0, 0, w, h, 0, { edge: false });

      const vertical = p.direction !== 'horizontal';
      const lag = H.clamp(p.stagger / 100, 0, 0.4) * 0.2;
      const eA = H.easeInOut(H.q(seg.local, 0.02, 0.6 - lag));
      const eB = H.easeInOut(H.q(seg.local, 0.02 + lag, 0.6));
      const gapPx = p.gap * u * (1 - (eA + eB) / 2);   // khe khép dần khi hai panel gặp nhau
      const full = vertical ? w : h;
      const cut = full * (p.splitRatio / 100);
      const sizeA = Math.max(0, cut - gapPx / 2);
      const sizeB = Math.max(0, full - cut - gapPx / 2);
      const frontA = sizeA * eA;
      const frontB = sizeB * eB;
      const glow = p.glow / 100;

      // vệt tối mờ ngay sau đường biên: panel trông dày và đang trượt vào
      const shadeBand = (edge, along, toward, intensity) => {
        const band = Math.min(u * 9, along * 0.9);
        if (intensity <= 0.02 || band <= 1) return;
        let x = 0, y = 0, bw2 = 0, bh2 = 0, g;
        if (vertical) {
          if (toward < 0) { x = edge - band; bw2 = band; bh2 = h; g = ctx.createLinearGradient(edge, 0, edge - band, 0); }
          else { x = edge; bw2 = band; bh2 = h; g = ctx.createLinearGradient(edge, 0, edge + band, 0); }
        } else if (toward < 0) { y = edge - band; bw2 = w; bh2 = band; g = ctx.createLinearGradient(0, edge, 0, edge - band); }
        else { y = edge; bw2 = w; bh2 = band; g = ctx.createLinearGradient(0, edge, 0, edge + band); }
        g.addColorStop(0, 'rgba(4,7,14,' + (0.5 * intensity) + ')');
        g.addColorStop(1, 'rgba(4,7,14,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, bw2, bh2);
      };

      // mép sáng chạy theo đường biên mỗi panel, tắt dần khi panel đã vào chỗ
      const seamLine = (edge, intensity) => {
        if (intensity <= 0.02) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(238,250,255,' + (0.55 * intensity) + ')';
        ctx.lineWidth = Math.max(1, u * 0.45);
        ctx.shadowColor = 'rgba(160,225,255,' + (0.9 * intensity) + ')';
        ctx.shadowBlur = u * 3 * intensity;
        ctx.beginPath();
        if (vertical) { ctx.moveTo(edge, 0); ctx.lineTo(edge, h); }
        else { ctx.moveTo(0, edge); ctx.lineTo(w, edge); }
        ctx.stroke();
        ctx.restore();
      };

      const litA = Math.sin(Math.PI * H.clamp01(eA)) * glow;
      const litB = Math.sin(Math.PI * H.clamp01(eB)) * glow;

      if (frontA > 0.5) {
        ctx.save();
        ctx.beginPath();
        if (vertical) ctx.rect(0, 0, frontA, h); else ctx.rect(0, 0, w, frontA);
        ctx.clip();
        H.card(ctx, to, vertical ? -(1 - eA) * sizeA * 0.35 : 0, vertical ? 0 : -(1 - eA) * sizeA * 0.35,
          w, h, 0, { edge: false });
        ctx.restore();
        shadeBand(frontA, frontA, -1, litA);
      }
      if (frontB > 0.5) {
        ctx.save();
        ctx.beginPath();
        if (vertical) ctx.rect(w - frontB, 0, frontB, h); else ctx.rect(0, h - frontB, w, frontB);
        ctx.clip();
        H.card(ctx, to, vertical ? (1 - eB) * sizeB * 0.35 : 0, vertical ? 0 : (1 - eB) * sizeB * 0.35,
          w, h, 0, { edge: false });
        ctx.restore();
        shadeBand(vertical ? w - frontB : h - frontB, frontB, 1, litB);
      }
      seamLine(frontA, litA);
      seamLine(vertical ? w - frontB : h - frontB, litB);
    }
  });

  /* ------------------------------------------------------------------ Focus Shift */
  ML.register({
    id: 'focus-shift', name: 'Focus Shift', vn: 'Ảnh nhỏ nở lớn', group: 'spotlight',
    desc: 'Từng ảnh nhỏ trên dải nở ra chiếm vị trí tiêu điểm, đẩy ảnh cũ về cuối dải.',
    duration: 12, slots: [3, 12],
    params: [
      { id: 'railSize', label: 'Cỡ ảnh nhỏ', type: 'number', default: 22, min: 12, max: 32, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 2, min: 0, max: 6, step: 0.5, unit: '%' },
      { id: 'hold', label: 'Giữ nhịp', type: 'number', default: 42, min: 10, max: 70, step: 2, unit: '%' },
      {
        id: 'heroAspect', label: 'Tỉ lệ lớn', type: 'select', default: '16:10',
        options: [{ value: '16:10', label: 'Ngang' }, { value: '1:1', label: 'Vuông' }, { value: '4:5', label: 'Dọc' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const seg = H.steps(t, n);
      const idx = seg.i % n;
      const m = Math.max(1, n - 1);                 // số ô của dải (không tính ảnh lớn)
      const span = H.clamp(1 - p.hold / 100, 0.2, 0.9);
      const v = H.easeOutQuint(H.q(seg.local, 0.05, 0.05 + span));

      const pad = u * 4;
      const gap = p.gap * u;
      const railH = u * p.railSize;
      const ar = p.heroAspect === '1:1' ? 1 : p.heroAspect === '4:5' ? 0.8 : 1.6;

      // khung ảnh lớn: phần còn lại phía trên dải
      const areaTop = pad;
      const areaH = Math.max(u * 22, h - railH - gap - pad * 2);
      let heroH = areaH;
      let heroW = heroH * ar;
      if (heroW > w - pad * 2) { heroW = w - pad * 2; heroH = heroW / ar; }
      const hero = [(w - heroW) / 2, areaTop + (areaH - heroH) / 2, heroW, heroH];

      // dải ảnh nhỏ
      const railY = h - pad - railH;
      const avail = w - pad * 2 - gap * (m - 1);
      const slotW = Math.max(1.5, Math.min(railH * 1.15, avail / m));
      const railW = slotW * m + gap * (m - 1);
      const railX = (w - railW) / 2;
      const slot = (k) => [railX + k * (slotW + gap), railY, slotW, railH];

      const blend = (a, b, k) => [
        H.lerp(a[0], b[0], k), H.lerp(a[1], b[1], k),
        H.lerp(a[2], b[2], k), H.lerp(a[3], b[3], k)
      ];
      const put = (img, r, opts) => H.card(ctx, img, r[0], r[1], r[2], r[3], u * 2, opts);

      // ảnh cuối dải trượt về ô đầu, các ô còn lại dịch một bậc
      for (let k = m - 1; k >= 1; k--) {
        const r = blend(slot(k), slot(k - 1), v);
        put(imgs[(idx + 1 + k) % n], r, { alpha: 1, shadow: 8 });
      }
      // ảnh lớn cũ thu về ô cuối dải
      put(imgs[idx], blend(hero, slot(m - 1), v), { alpha: 1, shadow: 8 + 18 * (1 - v) });
      // ảnh sắp làm tiêu điểm: nhích khỏi dải rồi nở ra
      const beat = H.pulse(H.q(seg.local, 0.05 + span * 0.86, 1), 0.45, 0.55);
      const bump = 1 + 0.035 * beat;
      const inRect = blend(slot(0), hero, v);
      const bw = inRect[2] * bump, bh = inRect[3] * bump;
      put(imgs[(idx + 1) % n], [
        inRect[0] + (inRect[2] - bw) / 2, inRect[1] + (inRect[3] - bh) / 2, bw, bh
      ], { alpha: 1, shadow: 8 + 18 * v });
    }
  });

  /* ----------------------------------------------------------------- Focus Slider */
  ML.register({
    id: 'focus-slider', name: 'Focus Slider', vn: 'Bước zíc zắc', group: 'spotlight',
    desc: 'Hàng thẻ bước ngang theo đường zíc zắc, thẻ ở tâm nảy to hơn hẳn hàng xóm.',
    duration: 12, slots: [4, 16],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 30, min: 14, max: 55, step: 1, unit: '%' },
      { id: 'centerScale', label: 'Phóng tâm', type: 'number', default: 185, min: 110, max: 260, step: 5, unit: '%' },
      { id: 'offset', label: 'Độ zíc zắc', type: 'number', default: 55, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 4, min: 0, max: 14, step: 1, unit: '%' },
      {
        id: 'weave', label: 'Kiểu zíc zắc', type: 'select', default: 'alternate',
        options: [{ value: 'alternate', label: 'Đổi chiều' }, { value: 'up', label: 'Lên' }, { value: 'down', label: 'Xuống' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cw = u * p.cardSize;
      const ch = cw / 1.15;
      const pitch = cw + p.gap * u;
      const seg = H.steps(t, n);
      // mỗi nhịp: trượt đúng một bước rồi giữ → t=1 trùng khít t=0 sau khi quy vòng
      const pos = seg.i + H.easeOutQuint(H.q(seg.local, 0.04, 0.6));
      const amp = ch * (p.offset / 100) * 0.55;
      const grow = Math.max(0, p.centerScale / 100 - 1);
      const items = [];
      const j0 = Math.floor(pos) - 4;
      for (let j = j0; j <= j0 + 8; j++) {
        const d = j - pos;
        const ad = Math.abs(d);
        if (ad > 4.2) continue;
        const id = ((j % n) + n) % n;
        const v = H.smooth(H.clamp01(1 - ad));
        items.push({ d, id, v, sc: 1 + grow * v });
      }
      items.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const zig = p.weave === 'alternate' ? (it.id % 2 ? -1 : 1)
          : (p.weave === 'down' ? 1 : -1);
        const x = w / 2 + it.d * pitch;
        const y = h / 2 + zig * amp * (1 - it.v);
        const cw2 = cw * it.sc, ch2 = ch * it.sc;
        H.card(ctx, imgs[it.id], x - cw2 / 2, y - ch2 / 2, cw2, ch2, u * 2, {
          alpha: 0.42 + 0.58 * it.v,
          shadow: 8 + 20 * it.v,
          rot: it.d * 0.035 * (1 - it.v)
        });
      }
    }
  });

  /* -------------------------------------------------------------------- Hero Reel */
  ML.register({
    id: 'hero-reel', name: 'Hero Reel', vn: 'Nền đổi theo', group: 'spotlight',
    desc: 'Ảnh nhỏ đang hoạt động được nâng lên, nền toàn khung chuyển sang ảnh đó.',
    duration: 14, slots: [3, 14],
    params: [
      { id: 'lift', label: 'Độ nâng', type: 'number', default: 7, min: 0, max: 18, step: 1, unit: '%' },
      { id: 'activeScale', label: 'Cỡ ảnh chọn', type: 'number', default: 118, min: 100, max: 150, step: 2, unit: '%' },
      { id: 'kenBurns', label: 'Trôi Ken Burns', type: 'number', default: 55, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'hold', label: 'Giữ nhịp', type: 'number', default: 45, min: 10, max: 70, step: 5, unit: '%' },
      { id: 'gap', label: 'Khe ảnh', type: 'number', default: 1.6, min: 0, max: 4, step: 0.2, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const seg = H.steps(t, n);
      const idx = seg.i % n;
      const prev = (idx + n - 1) % n;
      const span = H.clamp(1 - p.hold / 100, 0.18, 0.9);
      const fade = H.easeInOut(H.q(seg.local, 0.01, span));       // nền trước → nền nay
      const pop = H.pulse(H.q(seg.local, 0, Math.min(1, span + 0.2)), 0.34, 0.34);

      // nền toàn khung: Ken Burns chạy theo t nên t=0 và t=1 trùng nhau
      const kb = p.kenBurns / 100;
      const breathe = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      const z = 1 + kb * 0.12 * breathe;
      const bw = w * z, bh = h * z;
      const bx = (w - bw) / 2 + Math.sin(t * Math.PI * 2) * kb * w * 0.02;
      const by = (h - bh) / 2 + Math.cos(t * Math.PI * 2) * kb * h * 0.015;
      H.card(ctx, imgs[prev], bx, by, bw, bh, 0, { edge: false, brightness: -0.12 });
      H.card(ctx, imgs[idx], bx, by, bw, bh, 0, { edge: false, brightness: -0.12, alpha: Math.max(0.005, fade) });

      // lớp tối dưới chân để dải ảnh nhỏ đọc rõ
      const g = ctx.createLinearGradient(0, h * 0.32, 0, h);
      g.addColorStop(0, 'rgba(6,9,16,0)');
      g.addColorStop(1, 'rgba(6,9,16,0.92)');
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.32, w, h * 0.68);

      // dải ảnh nhỏ
      const gap = p.gap * u;
      const pad = u * 5;
      const thumbW = Math.max(2, Math.min(u * 14, (w - pad * 2 - gap * (n - 1)) / n));
      const thumbH = thumbW * 0.76;
      const railY = h - pad - thumbH / 2 - u;
      const totalW = thumbW * n + gap * (n - 1);
      const x0 = (w - totalW) / 2 + thumbW / 2;

      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < n; i++) {
          const active = i === idx;
          if ((pass === 0) === active) continue;   // lượt 1: ảnh thường, lượt 2: ảnh đang chọn
          const k = active ? pop : 0;
          const sc = active ? 1 + (p.activeScale / 100 - 1) * k : 1;
          const x = x0 + i * (thumbW + gap);
          const y = railY - (active ? p.lift * u * k : 0);
          H.card(ctx, imgs[i % n], x - (thumbW * sc) / 2, y - (thumbH * sc) / 2,
            thumbW * sc, thumbH * sc, u * 2, {
              alpha: 0.5 + 0.5 * k,
              shadow: 8 + 18 * k,
              brightness: -0.05 + 0.11 * k
            });
        }
      }
    }
  });
})();
