/* =============================================================================
   10 · Nhóm 3D — thẻ trong không gian: tường cong, quả cầu, trống quay
   Chỉ vẽ thẻ, không vẽ nền. Mọi chuyển động đều khép kín ở t = 0 ↔ t = 1.
   ========================================================================== */
(function () {
  'use strict';
  const H = ML.h;
  const TAU = Math.PI * 2;

  /* ------------------------------------------------- tiện ích dùng chung ---- */

  /** vẽ thẻ theo tâm thay vì góc trên trái */
  function cardAt(ctx, img, cx, cy, cw, ch, radius, opts) {
    H.card(ctx, img, cx - cw / 2, cy - ch / 2, cw, ch, radius, opts);
  }

  /** thẻ uốn ngang theo mặt trụ đứng: đặt tâm cung phía dưới để thẻ cong xuống */
  function bendCardH(ctx, img, cx, cy, cw, ch, bendR, alpha) {
    const r = Math.max(cw * 0.62, bendR);
    H.arcCard(ctx, img, cx, cy + r, r, -Math.PI / 2, cw, ch, { alpha: alpha });
  }

  /** thẻ uốn dọc theo mặt trống quay: cắt 6 dải ngang, mỗi dải chiếu một góc */
  function bendCardV(ctx, img, cw, ch, alpha, project) {
    const B = 6;
    const sl = 1 / B;
    const base = ctx.globalAlpha;
    for (let b = 0; b < B; b++) {
      const pt = project((b + 0.5) * sl);
      const bw = cw * pt.k;
      const bh = ch * sl * pt.k * 1.18;
      if (bw < 0.8 || bh < 0.8) continue;
      ctx.globalAlpha = Math.min(1, base * alpha * (0.84 + 0.16 * Math.min(1.1, pt.k)));
      ctx.drawImage(img, 0, img.height * b * sl, img.width, img.height * sl,
        pt.x - bw / 2, pt.y - bh / 2, bw, bh);
    }
    ctx.globalAlpha = base;
  }

  /** chỉ số vòng không âm — khoá ngẫu nhiên tất định bám theo ảnh */
  function slotIndex(i, m) {
    return ((i % m) + m) % m;
  }

  /* ------------------------------------------------------------ Card Totem -- */
  ML.register({
    id: 'card-totem',
    name: 'Card Totem',
    vn: 'Trống thẻ đứng',
    group: '3d',
    desc: 'Dải thẻ dựng đứng lướt qua giữa khung rồi uốn cong vào chiều sâu ở hai đầu.',
    duration: 12,
    slots: [4, 12],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 34, min: 22, max: 50, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 2.5, min: 1, max: 8, step: 0.5, unit: '%' },
      { id: 'curve', label: 'Độ cong 3D', type: 'number', default: 70, min: -100, max: 100, step: 5, unit: '%' },
      { id: 'backFade', label: 'Mờ phía xa', type: 'number', default: 55, min: 0, max: 90, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cw = u * p.cardSize;
      const ch = cw * 1.28;
      const step = ch + u * p.gap;
      const span = h / 2 + ch * 1.3;                 // nửa dải còn nhìn thấy
      const need = Math.ceil((h + ch * 2) / step) + 1;
      const count = Math.max(n, Math.ceil(need / n) * n);
      const loopLen = step * count;
      const off = loopLen * t;
      const bend = p.curve / 100;
      const fade = p.backFade / 100;
      const items = [];
      for (let i = 0; i < count; i++) {
        let d = (i * step - off) % loopLen;
        if (d < 0) d += loopLen;
        d -= loopLen / 2;
        if (Math.abs(d) > span) continue;
        const nd = H.clamp(d / span, -1, 1);
        const s = H.clamp(1 - 0.5 * bend * nd * nd, 0.34, 1.6);
        const squeeze = H.clamp(1 - 0.3 * bend * Math.abs(nd), 0.45, 1.5);  // nén dần về hai đầu
        items.push({ i, d: d * squeeze, s, alpha: H.clamp01(1 - fade * Math.abs(nd)) });
      }
      items.sort((a, b) => a.s - b.s);               // thẻ xa (nhỏ) vẽ trước
      for (const it of items) {
        cardAt(ctx, H.pick(imgs, it.i), w / 2, h / 2 + it.d, cw * it.s, ch * it.s,
          u * 2.4 * it.s, { alpha: it.alpha, shadow: 16 * it.s });
      }
    }
  });

  /* ------------------------------------------------------------- Film Strip */
  ML.register({
    id: 'film-strip',
    name: 'Film Strip',
    vn: 'Dải phim cong',
    group: '3d',
    desc: 'Dải phim trượt ngang qua giữa khung, hai đầu quay lưng vào người xem.',
    duration: 12,
    slots: [4, 12],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 32, min: 22, max: 48, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 2.5, min: 1, max: 8, step: 0.5, unit: '%' },
      { id: 'curve', label: 'Độ cong 3D', type: 'number', default: 70, min: -100, max: 100, step: 5, unit: '%' },
      { id: 'backFade', label: 'Mờ phía xa', type: 'number', default: 50, min: 0, max: 90, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cw = u * p.cardSize;
      const ch = cw / 1.55;
      const step = cw + u * p.gap;
      const span = w / 2 + cw * 1.3;
      const need = Math.ceil((w + cw * 2) / step) + 1;
      const count = Math.max(n, Math.ceil(need / n) * n);
      const loopLen = step * count;
      const off = loopLen * t;
      const bend = p.curve / 100;
      const fade = p.backFade / 100;
      const items = [];
      for (let i = 0; i < count; i++) {
        let d = (i * step - off) % loopLen;
        if (d < 0) d += loopLen;
        d -= loopLen / 2;
        if (Math.abs(d) > span) continue;
        const nd = H.clamp(d / span, -1, 1);
        const s = H.clamp(1 - 0.42 * bend * nd * nd, 0.36, 1.6);
        const squeeze = H.clamp(1 - 0.26 * bend * Math.abs(nd), 0.5, 1.45); // nén dần về hai đầu
        items.push({ i, d: d * squeeze, nd, s, alpha: H.clamp01(1 - fade * Math.abs(nd)) });
      }
      items.sort((a, b) => a.s - b.s);
      for (const it of items) {
        const s = it.s;
        H.perspCard(ctx, H.pick(imgs, it.i), w / 2 + it.d, h / 2, cw * s, ch * s,
          it.nd * bend * 0.8,                          // hai đầu quay đi theo độ cong
          { alpha: it.alpha, radius: u * 2.2 * s, perspective: 820 });
      }
    }
  });

  /* ------------------------------------------------------------ Orbit Globe */
  ML.register({
    id: 'orbit-globe',
    name: 'Orbit Globe',
    vn: 'Cầu thẻ xoay',
    group: '3d',
    desc: 'Quả cầu thẻ xoay 360°, thẻ luôn hướng về người xem và chỉ lớn nhỏ theo chiều sâu.',
    duration: 20,
    slots: [6, 30],
    params: [
      { id: 'globeSize', label: 'Cỡ cầu', type: 'number', default: 52, min: 30, max: 95, step: 1, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 20, min: 8, max: 30, step: 1, unit: '%' },
      { id: 'backFade', label: 'Mờ mặt sau', type: 'number', default: 55, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'tilt', label: 'Nghiêng trục', type: 'number', default: 27, min: -45, max: 45, step: 1, unit: '°' },
      {
        id: 'direction', label: 'Chiều xoay', type: 'select', default: 'left',
        options: [{ value: 'left', label: 'Sang trái' }, { value: 'right', label: 'Sang phải' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const R = u * p.globeSize;
      const cw = u * p.cardSize;
      const ch = cw * 1.14;
      const fade = p.backFade / 100;
      const tl = (p.tilt * Math.PI) / 180;
      const ct = Math.cos(tl), st = Math.sin(tl);
      const spin = TAU * t * (p.direction === 'right' ? -1 : 1);
      const ringCount = H.clamp(Math.round(Math.sqrt(n * 1.2)), 3, 7);
      const perRing = Math.max(3, Math.round(n / ringCount) + 1);
      const maxLat = Math.PI * 0.46;
      const cells = [];
      for (let r = 0; r < ringCount; r++) {
        const lat = -maxLat + (2 * maxLat * (r + 0.5)) / ringCount;
        const rr = Math.cos(lat) * R;
        const y3 = Math.sin(lat) * R;
        const cap = Math.max(3, Math.round((TAU * rr) / (cw * 1.04)));
        const per = Math.min(perRing, cap);
        for (let k = 0; k < per; k++) {
          const th = spin + (TAU * k) / per + r * 0.37;
          const x3 = Math.sin(th) * rr;
          const z3 = Math.cos(th) * rr;
          const y2 = y3 * ct - z3 * st;
          const z2 = y3 * st + z3 * ct;
          const zn = z2 / R;
          const s = 1 + 0.42 * zn;
          cells.push({
            slot: r * perRing + k,
            x: cx + x3 * s,
            y: cy + y2 * s,
            s, zn,
            alpha: H.clamp01(1 - fade * (1 - zn) / 2)
          });
        }
      }
      cells.sort((a, b) => a.zn - b.zn);             // mặt xa vẽ trước
      for (const cell of cells) {
        cardAt(ctx, H.pick(imgs, cell.slot), cell.x, cell.y, cw * cell.s, ch * cell.s,
          u * 2 * cell.s, { alpha: cell.alpha, shadow: cell.zn > 0 ? 14 * cell.s : 0 });
      }
    }
  });

  /* ------------------------------------------------------------- Sphere Wall */
  ML.register({
    id: 'sphere-wall',
    name: 'Sphere Wall',
    vn: 'Tường thẻ cong',
    group: '3d',
    desc: 'Bức tường thẻ uốn theo mặt trụ đứng, lia ngang qua khung.',
    duration: 16,
    slots: [4, 30],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 34, min: 20, max: 50, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 4, min: 1, max: 10, step: 1, unit: '%' },
      { id: 'curve', label: 'Độ cong', type: 'number', default: 60, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'backFade', label: 'Mờ phía xa', type: 'number', default: 60, min: 0, max: 90, step: 5, unit: '%' },
      {
        id: 'direction', label: 'Chiều', type: 'select', default: 'left',
        options: [{ value: 'left', label: 'Sang trái' }, { value: 'right', label: 'Sang phải' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const cw = u * p.cardSize;
      const ch = cw * 0.68;
      const gapPx = u * p.gap;
      const curve = H.clamp(p.curve / 100, 0, 1);
      const Rc = Math.min(w, h) / (0.26 + 1.3 * curve);   // bán kính mặt trụ
      const dA = (cw + gapPx) / Rc;                       // góc giữa hai cột
      const cam = Rc * 3.2;
      const pan = dA * n * t * (p.direction === 'right' ? -1 : 1);
      const rowGap = ch + gapPx;
      const rows = H.clamp(Math.round(h / rowGap), 1, 2);
      const halfArc = Math.asin(H.clamp((w * 0.62) / Rc, 0.05, 0.98));
      const q0 = Math.floor((pan - halfArc) / dA) - 1;
      const q1 = Math.ceil((pan + halfArc) / dA) + 1;
      const fade = p.backFade / 100;
      const cells = [];
      for (let q = q0; q <= q1; q++) {
        const a = q * dA - pan;
        const zn = Math.cos(a);
        if (zn < -0.2) continue;
        const k = cam / (cam - Rc * zn);
        const sx = cx + Rc * Math.sin(a) * k;
        if (sx < -cw || sx > w + cw) continue;
        const edge = H.clamp01(1 - Math.abs(sx - cx) / (w * 0.7));
        for (let r = 0; r < rows; r++) {
          const sy = cy + (r - (rows - 1) / 2) * rowGap * k;
          cells.push({
            q, r, zn, k, sx, sy,
            alpha: H.clamp01((1 - fade * (1 - zn) / 2) * (0.45 + 0.55 * edge))
          });
        }
      }
      cells.sort((a, b) => a.zn - b.zn);
      const start = Math.max(0, cells.length - 12);
      for (let i = start; i < cells.length; i++) {
        const cell = cells[i];
        const img = H.pick(imgs, cell.q + cell.r * 5);
        const bw = cw * cell.k;
        const bh = ch * cell.k;
        if (cell.zn > 0.7) {
          bendCardH(ctx, img, cell.sx, cell.sy, bw, bh, Rc * 0.8, cell.alpha);
        } else {
          cardAt(ctx, img, cell.sx, cell.sy, bw, bh, u * 2 * cell.k, { alpha: cell.alpha });
        }
      }
    }
  });

  /* ---------------------------------------------------------- Sphere Cascade */
  ML.register({
    id: 'sphere-cascade',
    name: 'Sphere Cascade',
    vn: 'Thác thẻ cong',
    group: '3d',
    desc: 'Tường thẻ cong theo phương đứng, cuộn từ dưới lên trên mặt trống.',
    duration: 18,
    slots: [4, 30],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 30, min: 18, max: 48, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 4, min: 1, max: 10, step: 1, unit: '%' },
      { id: 'columns', label: 'Số cột', type: 'number', default: 3, min: 2, max: 5, step: 1 },
      { id: 'curve', label: 'Độ cong', type: 'number', default: 60, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'backFade', label: 'Mờ phía xa', type: 'number', default: 60, min: 0, max: 90, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const cols = H.clamp(Math.round(p.columns), 2, 5);
      const cw = u * p.cardSize;
      const ch = cw * 1.1;
      const gapPx = u * p.gap;
      const curve = H.clamp(p.curve / 100, 0, 1);
      const Rc = Math.min(w, h) / (0.3 + 1.35 * curve);
      const dRow = (ch + gapPx) / Rc;
      const cam = Rc * 3.2;
      const pan = dRow * n * t;
      const halfArc = Math.asin(H.clamp((h * 0.6) / Rc, 0.05, 0.98));
      const q0 = Math.floor((pan - halfArc) / dRow) - 1;
      const q1 = Math.ceil((pan + halfArc) / dRow) + 1;
      const fade = p.backFade / 100;
      const cells = [];
      for (let q = q0; q <= q1; q++) {
        const a = q * dRow - pan;
        const zn = Math.cos(a);
        if (zn < -0.25) continue;
        const k = cam / (cam - Rc * zn);
        const yBase = cy + Rc * Math.sin(a) * k;
        if (yBase < -ch || yBase > h + ch) continue;
        for (let j = 0; j < cols; j++) {
          const colX = (j - (cols - 1) / 2) * (cw + gapPx);
          cells.push({
            q, j, zn,
            alpha: H.clamp01(1 - fade * (1 - zn) / 2),
            project(f) {
              const ab = a + (f - 0.5) * (ch / Rc);
              const kk = cam / (cam - Rc * Math.cos(ab));
              return { x: cx + colX * kk, y: cy + Rc * Math.sin(ab) * kk, k: kk };
            }
          });
        }
      }
      cells.sort((a, b) => a.zn - b.zn);
      const start = Math.max(0, cells.length - 14);
      for (let i = start; i < cells.length; i++) {
        const cell = cells[i];
        bendCardV(ctx, H.pick(imgs, cell.q * cols + cell.j), cw, ch, cell.alpha, cell.project);
      }
    }
  });

  /* -------------------------------------------------------- Showcase Stream */
  ML.register({
    id: 'showcase-stream',
    name: 'Showcase Stream',
    vn: 'Vòng thẻ nghiêng',
    group: '3d',
    desc: 'Thẻ xếp thành vành 3D nghiêng, uốn theo vành và xoay đều quanh tâm.',
    duration: 16,
    slots: [4, 16],
    params: [
      { id: 'ringTilt', label: 'Nghiêng vành', type: 'number', default: -28, min: -60, max: 60, step: 1, unit: '°' },
      { id: 'ringDepth', label: 'Độ mở vành', type: 'number', default: 55, min: 15, max: 85, step: 5, unit: '%' },
      { id: 'ringWidth', label: 'Cỡ vành', type: 'number', default: 80, min: 50, max: 95, step: 1, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 21, min: 12, max: 32, step: 1, unit: '%' },
      { id: 'backFade', label: 'Mờ phía xa', type: 'number', default: 70, min: 10, max: 95, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.5 * (p.ringWidth / 100) * 1.16;
      const open = H.clamp(p.ringDepth / 100, 0.15, 0.85);
      const tl = (p.ringTilt * Math.PI) / 180;
      const ct = Math.cos(tl), st = Math.sin(tl);
      const cw = u * p.cardSize;
      const ch = cw * 1.12;
      const fade = p.backFade / 100;
      const count = Math.max(4, n);
      const items = [];
      for (let k = 0; k < count; k++) {
        const phi = TAU * (t + k / count);
        const ex = Math.cos(phi) * R;
        const ey = Math.sin(phi) * R * open;
        const dx = -Math.sin(phi) * R;               // tiếp tuyến theo tham số φ
        const dy = Math.cos(phi) * R * open;
        const depth = Math.sin(phi);                  // +1: nửa vành phía trước
        const s = 1 + 0.2 * depth;
        items.push({
          k, depth, s,
          x: cx + (ex * ct - ey * st) * s,
          y: cy + (ex * st + ey * ct) * s,
          rot: Math.atan2(dx * st + dy * ct, dx * ct - dy * st),
          alpha: H.clamp01(1 - fade * (1 - depth) / 2)
        });
      }
      items.sort((a, b) => a.depth - b.depth);
      for (const it of items) {
        cardAt(ctx, H.pick(imgs, it.k), it.x, it.y, cw * it.s, ch * it.s, u * 2.2 * it.s,
          { alpha: it.alpha, rot: it.rot, shadow: 14 * it.s });
      }
    }
  });

  /* ---------------------------------------------------------- Parallax Totem */
  ML.register({
    id: 'parallax-totem',
    name: 'Parallax Totem',
    vn: 'Trống thẻ lệch',
    group: '3d',
    desc: 'Thẻ rải rác trên mặt trống quay, mỗi lớp chiều sâu trôi một nhịp khác nhau.',
    duration: 20,
    slots: [4, 24],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 18, min: 10, max: 34, step: 1, unit: '%' },
      { id: 'scatter', label: 'Độ rải', type: 'number', default: 70, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'sizeVar', label: 'Chênh cỡ', type: 'number', default: 30, min: 0, max: 50, step: 5, unit: '%' },
      { id: 'parallax', label: 'Trôi chiều sâu', type: 'number', default: 50, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'backFade', label: 'Mờ phía xa', type: 'number', default: 55, min: 0, max: 90, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const cw = u * p.cardSize;
      const ch = cw * 1.2;
      const Rc = Math.min(w, h) * 0.95;
      const dRow = (ch * 0.62 + u * 2.4) / Rc;
      const pan = dRow * n * t;
      const halfArc = Math.asin(H.clamp((h * 0.58) / Rc, 0.05, 0.95));
      const q0 = Math.floor((pan - halfArc) / dRow) - 1;
      const q1 = Math.ceil((pan + halfArc) / dRow) + 1;
      const scatter = p.scatter / 100;
      const sizeVar = p.sizeVar / 100;
      const par = p.parallax / 100;
      const fade = p.backFade / 100;
      const cells = [];
      for (let q = q0; q <= q1; q++) {
        const key = slotIndex(q, n);                  // khoá tất định, bám theo ảnh
        const a = q * dRow - pan;
        const zn = Math.cos(a);
        if (zn < -0.12) continue;
        const layer = Math.floor(H.hash(key, 4) * 3);
        const kBase = 3.2 / (3.2 - zn);
        const sv = 1 + (H.hash(key, 6) - 0.5) * 2 * sizeVar;
        const drift = Math.sin(TAU * t + H.hash(key, 9) * TAU) * par * u * 5 * (1 + layer * 0.6);
        cells.push({
          key, zn,
          x: cx + (H.hash(key, 3) - 0.5) * scatter * w * 0.8 * kBase + drift,
          y: cy + Rc * Math.sin(a) * kBase,
          yaw: (H.hash(key, 7) - 0.5) * 0.9,
          scale: kBase * sv * (1 - 0.14 * layer * par),
          alpha: H.clamp01((1 - fade * (1 - zn) / 2) * (1 - 0.18 * layer * par))
        });
      }
      cells.sort((a, b) => a.zn - b.zn);
      const start = Math.max(0, cells.length - 14);
      for (let i = start; i < cells.length; i++) {
        const cell = cells[i];
        const img = H.pick(imgs, cell.key);
        const bw = cw * cell.scale;
        const bh = ch * cell.scale;
        if (Math.abs(cell.yaw) > 0.16) {
          H.perspCard(ctx, img, cell.x, cell.y, bw, bh, cell.yaw,
            { alpha: cell.alpha, radius: u * 2, perspective: 700 });
        } else {
          cardAt(ctx, img, cell.x, cell.y, bw, bh, u * 2,
            { alpha: cell.alpha, shadow: 12 * cell.scale });
        }
      }
    }
  });

  /* --------------------------------------------------------------- Totem Wall */
  ML.register({
    id: 'totem-wall',
    name: 'Totem Wall',
    vn: 'Trống nhiều cột',
    group: '3d',
    desc: 'Nhiều cột thẻ cùng cuộn trên mặt trống, mỗi cột lệch nhịp một chút.',
    duration: 20,
    slots: [4, 30],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 26, min: 16, max: 44, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 4.5, min: 1, max: 12, step: 0.5, unit: '%' },
      { id: 'columns', label: 'Số cột', type: 'number', default: 3, min: 2, max: 5, step: 1 },
      { id: 'curve', label: 'Độ cong', type: 'number', default: 55, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'backFade', label: 'Mờ phía xa', type: 'number', default: 55, min: 0, max: 90, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const cols = H.clamp(Math.round(p.columns), 2, 5);
      const cw = u * p.cardSize;
      const ch = cw * 1.12;
      const gapPx = u * p.gap;
      const curve = H.clamp(p.curve / 100, 0, 1);
      const Rc = Math.min(w, h) / (0.3 + 1.25 * curve);
      const dRow = (ch + gapPx) / Rc;
      const cam = Rc * 3.2;
      const pan = dRow * n * t;
      const halfArc = Math.asin(H.clamp((h * 0.6) / Rc, 0.05, 0.96));
      const q0 = Math.floor((pan - halfArc) / dRow) - 1;
      const q1 = Math.ceil((pan + halfArc) / dRow) + 1;
      const fade = p.backFade / 100;
      const cells = [];
      for (let q = q0; q <= q1; q++) {
        for (let j = 0; j < cols; j++) {
          const a = q * dRow - pan + j * 0.42;        // mỗi cột lệch nhịp
          const zn = Math.cos(a);
          if (zn < -0.18) continue;
          const k = cam / (cam - Rc * zn);
          const x = cx + (j - (cols - 1) / 2) * (cw + gapPx) * k;
          const y = cy + Rc * Math.sin(a) * k;
          if (y < -ch || y > h + ch) continue;
          const edge = H.clamp01(1 - Math.abs(x - cx) / (w * 0.66));
          cells.push({
            q, j, zn, k, x, y,
            alpha: H.clamp01((1 - fade * (1 - zn) / 2) * (0.4 + 0.6 * edge))
          });
        }
      }
      cells.sort((a, b) => a.zn - b.zn);
      const start = Math.max(0, cells.length - 16);
      for (let i = start; i < cells.length; i++) {
        const cell = cells[i];
        cardAt(ctx, H.pick(imgs, cell.q * cols + cell.j), cell.x, cell.y,
          cw * cell.k, ch * cell.k, u * 2 * cell.k,
          { alpha: cell.alpha, shadow: 12 * cell.k });
      }
    }
  });

  /* ------------------------------------------------------ Depth Stack Scroll */
  ML.register({
    id: 'depth-stack-scroll',
    name: 'Depth Stack Scroll',
    vn: 'Xuyên chồng thẻ',
    group: '3d',
    desc: 'Camera lao thẳng qua chồng thẻ lùi dần, thẻ gần phóng to rồi bay khỏi khung.',
    duration: 14,
    slots: [4, 16],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 30, min: 18, max: 60, step: 1, unit: '%' },
      { id: 'cardCount', label: 'Số thẻ', type: 'number', default: 24, min: 8, max: 40, step: 1 },
      { id: 'spread', label: 'Độ toả', type: 'number', default: 74, min: 0, max: 120, step: 2, unit: '%' },
      { id: 'depthFade', label: 'Mờ chiều sâu', type: 'number', default: 55, min: 0, max: 100, step: 5, unit: '%' },
      {
        id: 'direction', label: 'Chiều bay', type: 'select', default: 'forward',
        options: [{ value: 'forward', label: 'Tiến' }, { value: 'back', label: 'Lùi' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const cw = u * p.cardSize;
      const ch = cw * 1.1;
      const spread = (p.spread / 100) * Math.min(w, h);
      const fade = p.depthFade / 100;
      const dir = p.direction === 'back' ? -1 : 1;
      const want = Math.max(8, Math.round(p.cardCount));
      const count = Math.max(n, Math.ceil(want / n) * n);
      const cells = [];
      for (let i = 0; i < count; i++) {
        const raw = (((i + dir * t * count) % count) + count) % count;
        const ph = raw / count;                       // 0 = sát camera, 1 = xa nhất
        const k = 2.2 / (1 + ph * 5.2);
        cells.push({
          i, ph, k,
          x: cx + (H.hash(i, 3) - 0.5) * spread * 1.1 * k,
          y: cy + (H.hash(i, 8) - 0.5) * spread * 0.76 * k,
          rot: (H.hash(i, 5) - 0.5) * 0.24,
          alpha: H.clamp01((1 - fade * ph) * H.smooth(H.q(ph, 0, 0.09)))
        });
      }
      cells.sort((a, b) => b.ph - a.ph);              // xa vẽ trước
      for (const cell of cells) {
        cardAt(ctx, H.pick(imgs, cell.i), cell.x, cell.y, cw * cell.k, ch * cell.k,
          u * 2.2 * cell.k,
          { alpha: cell.alpha, rot: cell.rot, shadow: 16 * Math.min(1, cell.k) });
      }
    }
  });

  /* -------------------------------------------------------------- Vortex Spin */
  ML.register({
    id: 'vortex-spin',
    name: 'Vortex Spin',
    vn: 'Xoáy thẻ',
    group: '3d',
    desc: 'Các vành thẻ xoay ngược chiều nhau quanh tâm, vành sau nhỏ và mờ dần.',
    duration: 20,
    slots: [4, 16],
    params: [
      { id: 'rings', label: 'Số vành', type: 'number', default: 3, min: 2, max: 4, step: 1 },
      { id: 'ringSize', label: 'Cỡ vành', type: 'number', default: 38, min: 20, max: 90, step: 1, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 17, min: 8, max: 24, step: 1, unit: '%' },
      { id: 'depth', label: 'Chiều sâu', type: 'number', default: 50, min: 10, max: 100, step: 5, unit: '%' },
      { id: 'backFade', label: 'Mờ vành sau', type: 'number', default: 45, min: 0, max: 80, step: 5, unit: '%' },
      {
        id: 'direction', label: 'Chiều xoay', type: 'select', default: 'alternate',
        options: [
          { value: 'cw', label: 'Cùng chiều kim' },
          { value: 'ccw', label: 'Ngược chiều kim' },
          { value: 'alternate', label: 'Xen kẽ' }
        ]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const rings = H.clamp(Math.round(p.rings), 2, 4);
      const cw = u * p.cardSize;
      const ch = cw / 1.6;
      const perRing = Math.max(4, Math.round(n / rings));
      const depth = p.depth / 100;
      const fade = p.backFade / 100;
      const baseR = u * p.ringSize;
      const squash = 0.62;                            // vành nhìn nghiêng
      for (let r = rings - 1; r >= 0; r--) {
        const kR = 1 / (1 + r * depth * 0.55);
        const R = baseR * kR;
        const sgn = p.direction === 'cw' ? 1 : p.direction === 'ccw' ? -1 : (r % 2 ? -1 : 1);
        const spin = TAU * t * sgn + r * 0.8;
        const alphaRing = rings > 1 ? H.clamp01(1 - fade * (r / (rings - 1))) : 1;
        const items = [];
        for (let j = 0; j < perRing; j++) {
          const th = spin + (TAU * j) / perRing;
          const zn = Math.sin(th);                    // +1: nửa vành phía trước
          items.push({
            slot: j * rings + r,
            x: cx + Math.cos(th) * R,
            y: cy + zn * R * squash,
            rot: th + Math.PI / 2,
            k: kR * (0.82 + 0.36 * (zn + 1) / 2),
            zn,
            alpha: alphaRing * H.clamp01(0.5 + 0.5 * (zn + 1) / 2)
          });
        }
        items.sort((a, b) => a.zn - b.zn);            // nửa vành xa vẽ trước
        for (const it of items) {
          cardAt(ctx, H.pick(imgs, it.slot), it.x, it.y, cw * it.k, ch * it.k, u * 2 * it.k,
            { alpha: it.alpha, rot: it.rot, shadow: 10 * it.k });
        }
      }
    }
  });
})();
