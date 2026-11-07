/* =============================================================================
   30 · Nhóm dải chạy — feed, marquee, mosaic, wipe, parallax
   Cả 9 hiệu ứng đều chạy vòng kín: trạng thái ở t=0 và t=1 trùng nhau.
   ========================================================================== */
(function () {
  'use strict';
  const H = ML.h;
  const DEG = Math.PI / 180;
  const mod = (v, m) => ((v % m) + m) % m;
  const RATIO = [
    { value: '1:1', label: 'Vuông' },
    { value: '16:9', label: 'Ngang' },
    { value: '4:5', label: 'Dọc' }
  ];
  const SWEEP = [
    { value: 'left', label: 'Sang trái' },
    { value: 'right', label: 'Sang phải' }
  ];

  /* ------------------------------------------------------------------ Feed Scroll */
  ML.register({
    id: 'feed-scroll', name: 'Feed Scroll', vn: 'Cuộn tin', group: 'flow',
    desc: 'Cột thẻ so le bị vuốt văng lên theo từng nhịp như newsfeed, thẻ hiện dần ở đáy và tan ở đỉnh.',
    duration: 12, slots: [5, 24],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 54, min: 24, max: 80, step: 1, unit: '%' },
      { id: 'spacing', label: 'Khoảng cách', type: 'number', default: 58, min: 10, max: 130, step: 2, unit: '%' },
      { id: 'lanes', label: 'Lệch ngang', type: 'number', default: 74, min: 0, max: 100, step: 2, unit: '%' },
      { id: 'flick', label: 'Độ giật', type: 'number', default: 58, min: 0, max: 100, step: 2, unit: '%' },
      { id: 'ratio', label: 'Tỉ lệ thẻ', type: 'select', default: '16:9', options: RATIO },
      { id: 'edgeFade', label: 'Mờ mép', type: 'number', default: 65, min: 0, max: 100, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.ratio, w, h);
      const cw = Math.min(w * 0.46, u * p.cardSize * 1.5);
      const ch = cw / ar;
      const pitch = ch * (1 + p.spacing / 100) + u * 0.6;
      const seg = H.steps(t, n);
      // nhịp "vuốt": văng nhanh trong 42% nhịp rồi đứng yên, trộn với chuyển động đều
      const flickK = Math.min(1, H.easeOutQuint(seg.local / 0.42));
      const move = H.lerp(seg.local, flickK, H.clamp01(p.flick / 100));
      const offset = (seg.i + move) * pitch;      // t=1 → offset ≡ 0 (mod span) nên vòng kín
      const laneSpread = (p.lanes / 100) * w * 0.3;
      const first = Math.floor(offset / pitch) - 1;
      const count = Math.ceil(h / pitch) + 3;
      for (let j = first; j <= first + count; j++) {
        const ii = mod(j, n);
        const yTop = h * 0.96 - (j * pitch - offset);
        const aIn = H.clamp01((h * 1.02 - yTop) / (ch * 1.1));
        const aOut = H.clamp01((yTop + ch) / (ch * 0.9));
        const edge = Math.min(aIn, aOut);
        const alpha = 1 - (p.edgeFade / 100) * (1 - edge);
        if (alpha <= 0.012) continue;
        const x = w / 2 + (H.hash(ii, 3) - 0.5) * laneSpread - cw / 2;
        H.card(ctx, imgs[ii], x, yTop, cw, ch, u * 2.2, {
          alpha: alpha,
          shadow: 18,
          rot: (H.hash(ii, 9) - 0.5) * 0.035,
          brightness: -0.28 * (1 - edge)
        });
      }
      if (p.edgeFade > 0) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(6,8,14,' + (0.55 * p.edgeFade) / 100 + ')');
        g.addColorStop(0.24, 'rgba(6,8,14,0)');
        g.addColorStop(0.76, 'rgba(6,8,14,0)');
        g.addColorStop(1, 'rgba(6,8,14,' + (0.6 * p.edgeFade) / 100 + ')');
        ctx.save();
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }
  });

  /* ------------------------------------------------------------------ Ticker Loop */
  ML.register({
    id: 'ticker-loop', name: 'Ticker Loop', vn: 'Marquee nghiêng', group: 'flow',
    desc: 'Nhiều hàng marquee nghiêng, hàng chẵn lẻ chạy ngược chiều, quấn vòng vô tận không hở mép.',
    duration: 16, slots: [6, 24],
    params: [
      { id: 'zoom', label: 'Cỡ thẻ', type: 'number', default: 26, min: 10, max: 46, step: 1, unit: '%' },
      { id: 'angle', label: 'Góc nghiêng', type: 'number', default: -7, min: -30, max: 30, step: 1, unit: '°' },
      { id: 'rowGap', label: 'Khe hàng', type: 'number', default: 5, min: 0, max: 22, step: 1, unit: '%' },
      { id: 'ratio', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: RATIO },
      { id: 'flow', label: 'Chiều chạy', type: 'select', default: 'opposed', options: [
        { value: 'opposed', label: 'Ngược nhau' }, { value: 'same', label: 'Cùng chiều' }] }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.ratio, w, h);
      const ch = u * p.zoom * 1.7;
      const cw = ch * ar;
      const gap = ch * (p.rowGap / 100) + u * 1.4;
      const stride = cw + gap;
      const rowPitch = ch + gap;
      const diag = Math.hypot(w, h);
      const rowW = n * stride;                       // một chu kỳ ảnh = n thẻ
      const rows = Math.ceil(diag / rowPitch) + 2;
      const cols = Math.ceil(diag / stride) + 2;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(p.angle * DEG);
      const top = -diag / 2 - rowPitch * 0.6;
      for (let r = 0; r < rows; r++) {
        const dir = p.flow === 'same' ? 1 : (r % 2 === 0 ? -1 : 1);
        const shift = mod(t * rowW * dir, rowW);     // t=1 → shift = 0
        const y = top + r * rowPitch;
        const first = Math.floor((-diag / 2 - shift) / stride) - 1;
        for (let k = first; k <= first + cols + 1; k++) {
          const x = k * stride + shift;
          if (x > diag / 2 + stride || x + cw < -diag / 2 - stride) continue;
          const ii = mod(k, n);
          H.card(ctx, imgs[ii], x, y, cw, ch, u * 2,
            { shadow: 10, rot: (H.hash(ii, r + 2) - 0.5) * 0.02 });
        }
      }
      ctx.restore();
    }
  });

  /* ------------------------------------------------------------------ Ticker Tilt */
  ML.register({
    id: 'ticker-tilt', name: 'Ticker Tilt', vn: 'Marquee nghiêng 3D', group: 'flow',
    desc: 'Các hàng marquee nằm trên mặt phẳng nghiêng, hàng càng xa càng nhỏ, chậm và tối dần.',
    duration: 14, slots: [6, 24],
    params: [
      { id: 'zoom', label: 'Cỡ thẻ', type: 'number', default: 30, min: 12, max: 55, step: 1, unit: '%' },
      { id: 'tilt', label: 'Độ xiên', type: 'number', default: 24, min: -55, max: 55, step: 1, unit: '°' },
      { id: 'perspective', label: 'Phối cảnh', type: 'number', default: 62, min: 10, max: 100, step: 2, unit: '%' },
      { id: 'rowGap', label: 'Khe hàng', type: 'number', default: 4, min: 0, max: 20, step: 1, unit: '%' },
      { id: 'direction', label: 'Chiều chạy', type: 'select', default: 'left', options: SWEEP }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.ratio, w, h);
      const nearH = u * p.zoom * 1.9;
      const nearW = nearH * ar;
      const gapW = nearW * (p.rowGap / 100) + u * 1.4;
      const stride = nearW + gapW;
      const rows = 5;
      const persp = H.clamp(p.perspective / 100, 0.1, 1);
      const sFar = 0.5 - persp * 0.06;                     // tỉ lệ hàng xa nhất
      const yFar = h * 0.12, yNear = h * 1.02;
      const vpX = w / 2 + Math.tan(H.clamp(p.tilt, -60, 60) * DEG) * w * 0.42;
      const dir = p.direction === 'right' ? 1 : -1;
      const rowW = n * stride;
      const shiftWorld = mod(t * rowW * dir, rowW);        // t=1 → 0
      for (let r = rows - 1; r >= 0; r--) {
        const f = rows > 1 ? r / (rows - 1) : 0;           // 1 = xa, 0 = gần
        const s = 1 + (sFar - 1) * f;                      // tỉ lệ phối cảnh của hàng
        const cww = nearW * s, chh = nearH * s;
        const yc = yNear + (yFar - yNear) * f;
        const xc0 = w / 2 + (vpX - w / 2) * f;             // hàng xa hội tụ ngang về điểm tụ
        const half = w / (2 * s);
        const first = Math.floor((-half - shiftWorld + rowW / 2) / stride) - 2;
        const count = Math.ceil((2 * half) / stride) + 4;
        const alpha = H.clamp01(0.45 + 0.75 * (1 - f));
        for (let k = first; k <= first + count; k++) {
          const world = k * stride + shiftWorld - rowW / 2;
          const xc = xc0 + world * s;
          if (xc + cww / 2 < -cww || xc - cww / 2 > w + cww) continue;
          H.card(ctx, imgs[mod(k, n)], xc - cww / 2, yc - chh / 2, cww, chh, u * 2 * s, {
            alpha: alpha, shadow: 16 * s, brightness: -0.22 * f, edge: false
          });
        }
      }
    }
  });

  /* ---------------------------------------------------------------- Mosaic Marquee */
  /** dựng một băng masonry: ô lớn chiếm hết băng, ô đôi xếp 2 thẻ chồng */
  function buildBelt(band, bandH, gap, ar, w) {
    const items = [];
    let cursor = 0, idx = 0;
    // băng phải dài hơn khung ít nhất 1,4 lần để bản sao một chu kỳ phủ kín mép
    const target = Math.max(w * 1.45, bandH * 6) + bandH;
    while (cursor < target && items.length < 24) {
      const pair = H.hash(band * 37 + idx, 5) > 0.55;
      const unit = pair ? Math.max(1, (bandH - gap) / 2) : bandH;
      const iw = Math.max(unit * 0.55, unit * ar * (0.78 + H.hash(idx * 3 + band * 11, 8) * 0.7));
      items.push({ x: cursor, w: iw, pair: pair, idx: idx });
      cursor += iw + gap;
      idx++;
    }
    return { items: items, total: cursor };
  }

  ML.register({
    id: 'mosaic-marquee', name: 'Mosaic Marquee', vn: 'Băng mosaic', group: 'flow',
    desc: 'Băng ngang kiểu masonry gồm thẻ lớn và cặp thẻ nhỏ, trôi qua liên tục rồi lặp lại.',
    duration: 16, slots: [6, 24],
    params: [
      { id: 'bands', label: 'Số băng', type: 'number', default: 2, min: 1, max: 3, step: 1 },
      { id: 'size', label: 'Cỡ thẻ', type: 'number', default: 100, min: 55, max: 165, step: 5, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 3, min: 0, max: 12, step: 1, unit: '%' },
      { id: 'ratio', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: RATIO },
      { id: 'direction', label: 'Chiều chạy', type: 'select', default: 'left', options: SWEEP }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.ratio, w, h);
      const bands = Math.max(1, Math.round(p.bands));
      const gap = p.gap * u;
      const bandH = Math.max(6, (h - gap * (bands - 1)) / bands);
      const chunk = H.clamp(p.size / 100, 0.55, 1.65);
      const dir = p.direction === 'right' ? -1 : 1;
      const rad = u * 2;
      for (let b = 0; b < bands; b++) {
        const belt = buildBelt(b, bandH, gap, ar * chunk, w);
        const total = belt.total;
        const shift = mod(t * total * dir, total);       // t=1 → 0
        const y = b * (bandH + gap);
        for (let k = 0; k < belt.items.length; k++) {
          const it = belt.items[k];
          for (let cp = 0; cp < 2; cp++) {
            const x = it.x - shift + cp * total;         // bản sao một chu kỳ để không hở mép
            if (x > w || x + it.w < 0) continue;
            if (it.pair) {
              const hh = (bandH - gap) / 2;
              H.card(ctx, imgs[mod(b * 5 + it.idx * 2, n)], x, y, it.w, hh, rad, { shadow: 10 });
              H.card(ctx, imgs[mod(b * 5 + it.idx * 2 + 1, n)], x, y + hh + gap, it.w, hh, rad, { shadow: 10 });
            } else {
              H.card(ctx, imgs[mod(b * 5 + it.idx * 3, n)], x, y, it.w, bandH, rad, { shadow: 12 });
            }
          }
        }
      }
    }
  });

  /* ----------------------------------------------------------------- Column Drift */
  ML.register({
    id: 'column-drift', name: 'Column Drift', vn: 'Ba cột trôi', group: 'flow',
    desc: 'Ba cột thẻ trôi dọc ngược chiều nhau, mỗi cột một tốc độ, hai mép mờ dần.',
    duration: 16, slots: [6, 24],
    params: [
      { id: 'columns', label: 'Số cột', type: 'number', default: 3, min: 2, max: 4, step: 1 },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 3, min: 0, max: 12, step: 1, unit: '%' },
      { id: 'ratio', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: RATIO },
      { id: 'speed', label: 'Tốc độ', type: 'number', default: 62, min: 20, max: 100, step: 2, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cols = Math.max(2, Math.round(p.columns));
      const ar = H.aspect(p.ratio, w, h);
      const gap = p.gap * u;
      const colW = w / cols;
      const cw = Math.min(colW * 0.86, u * 48);
      const ch = cw / ar;
      const pitch = ch + gap;
      const tiles = Math.ceil(h / pitch) + 2;            // số thẻ đủ phủ kín một cột
      const period = tiles * pitch;
      const baseCycles = Math.max(1, Math.round(p.speed / 30));   // vòng/nhịp, số nguyên → vòng kín
      for (let col = 0; col < cols; col++) {
        const dirSign = col % 2 ? 1 : -1;                  // cột chẵn lẻ ngược chiều
        const cycles = baseCycles * ((col % 3) + 1);       // mỗi cột một tốc độ
        const shift = mod(t * cycles * period * dirSign, period);
        const stagger = (col % 2) * pitch * 0.5;
        const x = col * colW + (colW - cw) / 2;
        const iStart = Math.ceil((-ch - shift - stagger) / pitch);
        for (let i = iStart; ; i++) {
          const y = i * pitch + shift + stagger;
          if (y > h + pitch) break;
          const ii = mod(i, tiles);
          const jx = (H.hash(ii + col * 17, 5) - 0.5) * Math.max(0, colW - cw);
          H.card(ctx, imgs[mod(col * tiles + ii, n)], x + jx, y, cw, ch, u * 2.2, {
            alpha: 0.92, shadow: 14, brightness: col % 2 ? -0.12 : 0
          });
        }
      }
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(6,8,14,0.52)');
      g.addColorStop(0.2, 'rgba(6,8,14,0)');
      g.addColorStop(0.8, 'rgba(6,8,14,0)');
      g.addColorStop(1, 'rgba(6,8,14,0.52)');
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  });

  /* ----------------------------------------------------------------- Diagonal Wipe */
  ML.register({
    id: 'diagonal-wipe', name: 'Diagonal Wipe', vn: 'Mép chéo quét', group: 'reveal',
    desc: 'Ảnh giữ một nhịp rồi bị một mép chéo có viền sáng quét qua, lộ ra ảnh kế tiếp.',
    duration: 9, slots: [2, 20],
    params: [
      { id: 'angle', label: 'Góc mép', type: 'number', default: -22, min: -60, max: 60, step: 1, unit: '°' },
      { id: 'glow', label: 'Viền sáng', type: 'number', default: 65, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'hold', label: 'Nhịp giữ', type: 'number', default: 58, min: 15, max: 90, step: 1, unit: '%' },
      { id: 'push', label: 'Độ lùi', type: 'number', default: 45, min: 0, max: 100, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const seg = H.steps(t, n);
      const from = imgs[mod(seg.i, n)];
      const to = imgs[mod(seg.i + 1, n)];
      const sweep = H.easeInOut(H.q(seg.local, p.hold / 100, 1));   // 0..1 trong phần cuối nhịp
      const ang = p.angle * DEG;
      const D = Math.hypot(w, h);
      // ảnh cũ hơi lùi lại (parallax), đến khi bị phủ kín thì thôi vẽ
      if (sweep < 0.999) {
        const sc = 1 + (p.push / 100) * 0.08 * sweep;
        H.card(ctx, from, w / 2 - (w * sc) / 2, h / 2 - (h * sc) / 2, w * sc, h * sc, 0,
          { edge: false, brightness: -0.2 * sweep });
      }
      if (sweep > 0.002) {
        // mép chạy từ ngoài khung phía phải vào tới mép trái ⇒ phủ kín khi sweep = 1
        const edge = D / 2 - sweep * D;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.rect(edge, -D, D, D * 2);
        ctx.clip();
        ctx.rotate(-ang);
        ctx.translate(-w / 2, -h / 2);
        H.card(ctx, to, 0, 0, w, h, 0, { edge: false });
        ctx.restore();
        if (p.glow > 0 && sweep > 0.01 && sweep < 0.99) {
          const ga = Math.sin(Math.PI * sweep) * (p.glow / 100);
          const band = Math.max(u * 1.2, D * 0.012);
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.rotate(ang);
          const g = ctx.createLinearGradient(edge - band, 0, edge + band, 0);
          g.addColorStop(0, 'rgba(150,205,255,0)');
          g.addColorStop(0.5, 'rgba(205,235,255,' + (0.75 * ga).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(150,205,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(edge - band, -D, band * 2, D * 2);
          ctx.restore();
        }
      }
    }
  });

  /* ------------------------------------------------------------------ Image Trail */
  ML.register({
    id: 'image-trail', name: 'Image Trail', vn: 'Vệt ảnh', group: 'reveal',
    desc: 'Một đầu quét chạy dọc cung tròn, mỗi thẻ bật ra ở vị trí nó đi qua rồi tan dần phía sau.',
    duration: 10, slots: [4, 20],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 20, min: 8, max: 34, step: 1, unit: '%' },
      { id: 'trailLength', label: 'Số thẻ vệt', type: 'number', default: 16, min: 6, max: 26, step: 1 },
      { id: 'life', label: 'Độ dài vệt', type: 'number', default: 46, min: 15, max: 85, step: 1, unit: '%' },
      { id: 'arc', label: 'Độ mở cung', type: 'number', default: 118, min: 40, max: 160, step: 2, unit: '°' },
      { id: 'ratio', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: RATIO }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.ratio, w, h);
      const cw = u * p.cardSize * 1.9;
      const ch = cw / ar;
      const count = Math.max(6, Math.round(p.trailLength));
      const life = H.clamp(p.life / 100, 0.15, 0.9);
      const open = H.clamp(p.arc, 40, 170) * DEG;
      // cung elip: luôn vừa khung ở mọi tỉ lệ (cung tròn sẽ tràn ra ngoài khi khung dọc)
      const cx = w / 2, cy = h * 0.34;
      const Rx = w * 0.56, Ry = h * 0.42;
      const a0 = Math.PI / 2 - open / 2;
      const a1 = Math.PI / 2 + open / 2;
      const pointAt = (ang) => {
        const px = cx + Math.cos(ang) * Rx;
        const py = cy + Math.sin(ang) * Ry;
        const radial = Math.atan2(Ry * Math.sin(ang), Rx * Math.cos(ang));
        return { x: px, y: py, rot: radial + Math.PI / 2 };
      };
      // cung dẫn đường mờ
      ctx.save();
      ctx.strokeStyle = 'rgba(160,205,255,0.12)';
      ctx.lineWidth = Math.max(1, u * 0.35);
      ctx.beginPath();
      ctx.ellipse(cx, cy, Rx, Ry, 0, a0, a1);
      ctx.stroke();
      ctx.restore();
      // đầu quét + vệt thẻ phía sau (tuổi tính theo mod nên t=0 và t=1 trùng nhau)
      const items = [];
      for (let j = 0; j < count; j++) {
        const s = count > 1 ? j / (count - 1) : 0;
        const age = mod(t - s, 1);
        if (age >= life) continue;
        items.push({ j: j, age: age, ang: a0 + (a1 - a0) * s });
      }
      items.sort((a, b) => b.age - a.age);        // thẻ già vẽ trước, thẻ mới nằm trên
      for (let q = 0; q < items.length; q++) {
        const it = items[q];
        const pop = H.back(H.easeOut(H.q(it.age, 0, 0.18)), 1.9);
        const fade = 1 - H.smooth(H.q(it.age, life * 0.4, life));
        const alpha = H.clamp01(fade * (0.35 + pop * 0.75));
        if (alpha <= 0.012) continue;
        const sc = (0.55 + 0.45 * fade) * (0.45 + 0.55 * H.clamp01(pop));
        const pt = pointAt(it.ang);
        H.card(ctx, imgs[mod(it.j, n)], pt.x - (cw * sc) / 2, pt.y - (ch * sc) / 2, cw * sc, ch * sc,
          u * 2.2 * Math.max(0.4, sc), {
            alpha: alpha, rot: pt.rot, shadow: 18 * fade, brightness: -0.25 * (1 - fade)
          });
      }
      // đốm sáng của đầu quét
      const hp = pointAt(a0 + (a1 - a0) * mod(t, 1));
      const glow = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, u * 13);
      glow.addColorStop(0, 'rgba(195,228,255,0.5)');
      glow.addColorStop(1, 'rgba(195,228,255,0)');
      ctx.save();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, u * 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  /* ----------------------------------------------------------------- Zoom Parallax */
  ML.register({
    id: 'zoom-parallax', name: 'Zoom Parallax', vn: 'Trôi Ken Burns', group: 'reveal',
    desc: 'Ảnh trôi và phóng chậm kiểu Ken Burns, ảnh kế trượt vào ngược hướng tạo parallax.',
    duration: 12, slots: [2, 20],
    params: [
      { id: 'zoom', label: 'Độ phóng', type: 'number', default: 14, min: 2, max: 40, step: 1, unit: '%' },
      { id: 'pan', label: 'Độ trôi', type: 'number', default: 70, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'direction', label: 'Hướng trôi', type: 'select', default: 'alternate', options: [
        { value: 'alternate', label: 'Đổi chiều' }, { value: 'left', label: 'Sang trái' }, { value: 'right', label: 'Sang phải' }] }
    ],
    render(c) {
      const { ctx, t, w, h, p, imgs, n } = c;
      const seg = H.steps(t, n);
      const cur = seg.i % n;
      const nxt = (seg.i + 1) % n;
      const z = p.zoom / 100;
      const pan = p.pan / 100;
      const sign = p.direction === 'alternate'
        ? (seg.i % 2 ? -1 : 1)
        : (p.direction === 'left' ? -1 : 1);
      const cross = H.smooth(H.q(seg.local, 0.72, 1));       // 22% cuối nhịp chuyển ảnh
      if (cross < 0.999) {
        const sc = 1 + z * seg.local;
        const mx = (w * (sc - 1)) / 2, my = (h * (sc - 1)) / 2;
        const ox = sign * seg.local * pan * Math.min(w * 0.06, mx * 0.85);
        const oy = -sign * seg.local * pan * Math.min(h * 0.05, my * 0.85);
        H.card(ctx, imgs[cur], w / 2 - (w * sc) / 2 + ox, h / 2 - (h * sc) / 2 + oy, w * sc, h * sc, 0,
          { edge: false });
      }
      if (cross > 0.002) {
        const sc2 = 1 + z * 0.55 * (1 - cross);               // ảnh mới hơi lớn rồi khép về khung
        const ox2 = -sign * (1 - cross) * pan * w * 0.18;
        H.card(ctx, imgs[nxt], w / 2 - (w * sc2) / 2 + ox2, h / 2 - (h * sc2) / 2, w * sc2, h * sc2, 0,
          { alpha: cross, edge: false });
      }
    }
  });

  /* ----------------------------------------------------------------- Stripe Reveal */
  ML.register({
    id: 'stripe-reveal', name: 'Stripe Reveal', vn: 'Ráp dải', group: 'reveal',
    desc: 'Ảnh được ráp lại từ các dải trượt vào so le, mỗi dải một hướng, ráp kín thì giữ nguyên.',
    duration: 9, slots: [2, 20],
    params: [
      { id: 'strips', label: 'Số dải', type: 'number', default: 7, min: 3, max: 14, step: 1 },
      { id: 'stagger', label: 'Lệch nhịp', type: 'number', default: 62, min: 0, max: 95, step: 5, unit: '%' },
      { id: 'travel', label: 'Quãng trượt', type: 'number', default: 100, min: 30, max: 130, step: 5, unit: '%' },
      { id: 'style', label: 'Kiểu dải', type: 'select', default: 'row', options: [
        { value: 'row', label: 'Dải ngang' }, { value: 'column', label: 'Dải dọc' }] }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const seg = H.steps(t, n);
      const cur = imgs[mod(seg.i, n)];
      const nxt = imgs[mod(seg.i + 1, n)];
      const strips = Math.max(3, Math.round(p.strips));
      const colStyle = p.style === 'column';
      const span = colStyle ? w : h;
      const band = span / strips;
      const travel = (p.travel / 100) * span;
      H.card(ctx, cur, 0, 0, w, h, 0, { edge: false });        // nền: ảnh hiện tại
      for (let s = 0; s < strips; s++) {
        const k = H.easeOut(H.stagger(seg.local, s, strips, p.stagger / 100));
        if (k <= 0.004) continue;
        const dirSign = s % 2 ? 1 : -1;
        const off = dirSign * (1 - k) * travel;
        ctx.save();
        ctx.translate(colStyle ? off : 0, colStyle ? 0 : off);
        ctx.beginPath();
        if (colStyle) ctx.rect(s * band, 0, band + 0.7, h);
        else ctx.rect(0, s * band, w, band + 0.7);
        ctx.clip();
        H.card(ctx, nxt, 0, 0, w, h, 0, { edge: false });
        ctx.restore();
        if (k < 0.995) {                                       // đường ráp mờ dần khi khép kín
          ctx.save();
          ctx.fillStyle = 'rgba(220,238,255,' + (0.16 * (1 - k)).toFixed(3) + ')';
          const seam = Math.max(1, u * 0.4);
          if (colStyle) ctx.fillRect(s * band + off, 0, seam, h);
          else ctx.fillRect(0, s * band + off, w, seam);
          ctx.restore();
        }
      }
    }
  });
})();
