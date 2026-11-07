/* =============================================================================
   20 · Nhóm carousel — cover flow, bánh xe, vòng xoay
   Thẻ luôn bám đường tròn (cos/sin) hoặc băng trượt; vẽ từ xa tới gần.
   ========================================================================== */
(function () {
  'use strict';

  const H = ML.h;
  const TAU = Math.PI * 2;

  const ASPECT = [
    { value: '1:1', label: 'Vuông' },
    { value: '16:9', label: 'Ngang' },
    { value: '4:5', label: 'Dọc' }
  ];

  const DIR_LR = [
    { value: 'left', label: 'Sang trái' },
    { value: 'right', label: 'Sang phải' }
  ];

  /** khoảng cách có dấu (đơn vị: thẻ) giữa thẻ i và vị trí chạy pos trên vòng n thẻ */
  function ringDelta(i, pos, n) {
    let d = (i - pos) % n;
    if (d > n / 2) d -= n;
    else if (d <= -n / 2) d += n;   // biên ±n/2 luôn quy về phía dương → t=0 và t=1 trùng
    return d;
  }

  /** thẻ nghiêng quanh trục NGANG (pitch): vẽ theo hàng để giữ đúng luật xa–gần */
  function pitchCard(ctx, img, cx, cy, cw, ch, pitch, opts) {
    opts = opts || {};
    const alpha = opts.alpha === undefined ? 1 : H.clamp01(opts.alpha);
    if (alpha <= 0.004 || cw <= 0.6 || ch <= 0.6) return;
    const radius = opts.radius || 0;
    const persp = opts.perspective || 900;
    const rows = H.clamp(Math.round(ch / 16), 5, 16);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const step = ch / rows;
    const sh = (img.height || 1) / rows;
    ctx.save();
    ctx.globalAlpha *= alpha;
    H.roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, radius);
    ctx.clip();
    for (let r = 0; r < rows; r++) {
      const sy = (r + 0.5) * step - ch / 2;
      const s = persp / (persp + sy * sinP);
      const dy = sy * cosP * s;
      const dh = step * Math.abs(cosP) * s + 1.2;
      const dw = cw * s;
      ctx.drawImage(img, 0, r * sh, img.width || 1, sh, cx - dw / 2, cy + dy - dh / 2, dw, dh);
    }
    // phía xa tối dần
    const far = sinP >= 0 ? 1 : 0;
    const g = ctx.createLinearGradient(0, cy - ch / 2, 0, cy + ch / 2);
    g.addColorStop(0, 'rgba(0,0,0,' + (0.32 * far).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(0,0,0,' + (0.32 * (1 - far)).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    H.roundRect(ctx, cx - cw / 2 + 0.5, cy - ch / 2 + 0.5, cw - 1, ch - 1, Math.max(0, radius - 0.5));
    ctx.stroke();
    ctx.restore();
  }

  /* ----------------------------------------------------------------- Cover Flow */
  ML.register({
    id: 'cover-flow', name: 'Cover Flow', vn: 'Thẻ xoay ngang', group: 'flow',
    desc: 'Băng thẻ chạy ngang trên một cung tròn: thẻ giữa phẳng, hai bên nghiêng 3D vào trong.',
    duration: 14, slots: [4, 20],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 44, min: 18, max: 80, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: ASPECT },
      { id: 'sideTilt', label: 'Nghiêng hai bên', type: 'number', default: 52, min: 0, max: 78, step: 2, unit: '°' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 6, min: 0, max: 20, step: 1, unit: '%' },
      { id: 'backFade', label: 'Mờ phía sau', type: 'number', default: 45, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'direction', label: 'Chiều', type: 'select', default: 'left', options: DIR_LR }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize;
      const ch = cw / ar;
      const pitch = cw + cw * (p.gap / 100);          // bước một thẻ trên cung
      const R = Math.max(ch * 2.2, pitch * 2.6);      // bán kính cung
      const stepA = pitch / R;                        // góc mỗi thẻ
      const persp = R * 3;
      const wpx = H.clamp01(p.backFade / 100);
      const tilt = (p.sideTilt * Math.PI) / 180;
      const dir = p.direction === 'right' ? -1 : 1;

      const seg = H.steps(t, n);
      const pos = dir * (seg.i + H.easeInOut(H.q(seg.local, 0, 0.78)));

      const items = [];
      for (let i = 0; i < n; i++) {
        const d = ringDelta(i, pos, n);
        if (Math.abs(d) > 2.3) continue;
        const a = H.clamp(d * stepA, -1.15, 1.15);
        const x3 = Math.sin(a) * R;
        const z3 = R * (1 - Math.cos(a));             // càng xa tâm càng lùi
        const s = persp / (persp + z3);
        items.push({
          i, z: z3,
          x: w / 2 + x3 * s,
          y: h / 2 + ch * 0.04 * Math.abs(d),
          cw: cw * s, ch: ch * s,
          yaw: H.clamp(d, -1.5, 1.5) * tilt
        });
      }
      items.sort((A, B) => B.z - A.z);                // thẻ phía sau vẽ trước
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const depth = H.clamp01(it.z / (R * 0.55));
        const alpha = (1 - wpx * depth) * (1 - 0.25 * depth);
        H.perspCard(ctx, imgs[it.i % n], it.x, it.y, it.cw, it.ch, it.yaw,
          { perspective: 900, radius: u * 2, alpha });
      }
    }
  });

  /* -------------------------------------------------------- Cover Flow Vertical */
  ML.register({
    id: 'cover-flow-vertical', name: 'Cover Flow Vertical', vn: 'Thẻ xoay dọc', group: 'flow',
    desc: 'Băng thẻ chạy dọc trên cung đứng: thẻ tâm thẳng, thẻ trên dưới gập theo trục ngang.',
    duration: 14, slots: [4, 20],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 42, min: 16, max: 74, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '4:5', options: ASPECT },
      { id: 'sideTilt', label: 'Gập trên dưới', type: 'number', default: 56, min: 0, max: 80, step: 2, unit: '°' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 6, min: 0, max: 20, step: 1, unit: '%' },
      { id: 'backFade', label: 'Mờ phía xa', type: 'number', default: 50, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'direction', label: 'Chiều', type: 'select', default: 'up',
        options: [{ value: 'up', label: 'Lên trên' }, { value: 'down', label: 'Xuống dưới' }] }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize;
      const ch = cw / ar;
      const pitch = ch + ch * (p.gap / 100);          // bước dọc của một thẻ
      const R = Math.max(cw * 2.4, pitch * 2.4);      // bán kính cung đứng
      const stepA = pitch / R;
      const persp = R * 3;
      const fade = H.clamp01(p.backFade / 100);
      const tilt = (p.sideTilt * Math.PI) / 180;
      const dir = p.direction === 'down' ? -1 : 1;

      const seg = H.steps(t, n);
      const pos = dir * (seg.i + H.easeInOut(H.q(seg.local, 0, 0.78)));

      const items = [];
      for (let i = 0; i < n; i++) {
        const d = ringDelta(i, pos, n);
        if (Math.abs(d) > 2.3) continue;
        const a = H.clamp(d * stepA, -1.15, 1.15);
        const y3 = Math.sin(a) * R;                   // trục DỌC của cung
        const z3 = R * (1 - Math.cos(a));
        const s = persp / (persp + z3);
        items.push({
          i, z: z3,
          x: w / 2,
          y: h / 2 + y3 * s,
          cw: cw * s, ch: ch * s,
          rot: H.clamp(d, -1.6, 1.6) * tilt         // gập quanh trục ngang
        });
      }
      items.sort((A, B) => B.z - A.z);
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const depth = H.clamp01(it.z / (R * 0.55));
        pitchCard(ctx, imgs[it.i % n], it.x, it.y, it.cw, it.ch, it.rot,
          { perspective: 900, radius: u * 2, alpha: (1 - fade * depth) * (1 - 0.2 * depth) });
      }
    }
  });

  /* ------------------------------------------------------------------ Cover Ring */
  ML.register({
    id: 'cover-ring', name: 'Cover Ring', vn: 'Vòng thẻ nghiêng', group: 'flow',
    desc: 'Thẻ phẳng chạy trọn một vòng 3D nghiêng, thẻ phía xa nhỏ và mờ dần.',
    duration: 16, slots: [5, 24],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 30, min: 12, max: 56, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '4:5', options: ASPECT },
      { id: 'ringSize', label: 'Bán kính vòng', type: 'number', default: 62, min: 20, max: 100, step: 1, unit: '%' },
      { id: 'tilt', label: 'Độ nghiêng vòng', type: 'number', default: 62, min: 0, max: 88, step: 2, unit: '°' },
      { id: 'backFade', label: 'Mờ phía sau', type: 'number', default: 55, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'direction', label: 'Chiều', type: 'select', default: 'right', options: DIR_LR }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const R = Math.min(w, h) * 0.5 * (p.ringSize / 100) * 1.15;
      const cw = Math.min(u * p.cardSize, (TAU * R) / n * 1.6);   // đừng dày quá khi n lớn
      const ch = cw / ar;
      const ct = Math.cos((p.tilt * Math.PI) / 180);
      const st = Math.sin((p.tilt * Math.PI) / 180);
      const persp = R * 3.2;
      const fade = H.clamp01(p.backFade / 100);
      const dir = p.direction === 'left' ? -1 : 1;
      const spin = t * TAU * dir;
      const depthR = Math.max(1e-3, R * st);

      const items = [];
      for (let i = 0; i < n; i++) {
        const phi = spin + (i / n) * TAU;
        const x3 = Math.cos(phi) * R;
        const y3 = Math.sin(phi) * R * ct;             // trục dọc co theo cos(tilt)
        const z3 = Math.sin(phi) * depthR;             // chiều sâu
        const s = persp / (persp + z3);
        items.push({ i, z: z3, x: w / 2 + x3 * s, y: h / 2 + y3 * s, s });
      }
      items.sort((A, B) => B.z - A.z);                 // xa trước, gần sau
      const radius = Math.min(cw, ch) * 0.12;
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const near = H.clamp01((1 - it.z / depthR) / 2);  // 0 = xa, 1 = gần
        const cw2 = cw * it.s;
        const ch2 = ch * it.s;
        H.card(ctx, imgs[it.i % n], it.x - cw2 / 2, it.y - ch2 / 2, cw2, ch2, radius,
          { alpha: 1 - fade * (1 - near), shadow: 6 + 14 * near, brightness: -0.18 * (1 - near) });
      }
    }
  });

  /* --------------------------------------------------------- Cover Ring Vertical */
  ML.register({
    id: 'cover-ring-vertical', name: 'Cover Ring Vertical', vn: 'Vòng đu quay', group: 'flow',
    desc: 'Vòng thẻ dựng đứng như vòng đu quay, thẻ chạy lên xuống quanh tâm vòng.',
    duration: 16, slots: [5, 24],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 14, min: 6, max: 34, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '4:5', options: ASPECT },
      { id: 'ringSize', label: 'Bán kính vòng', type: 'number', default: 86, min: 30, max: 100, step: 1, unit: '%' },
      { id: 'rotate', label: 'Mở vòng', type: 'number', default: 52, min: 0, max: 88, step: 2, unit: '°' },
      { id: 'tilt', label: 'Nghiêng cả vòng', type: 'number', default: -8, min: -40, max: 40, step: 1, unit: '°' },
      { id: 'backFade', label: 'Mờ phía sau', type: 'number', default: 50, min: 0, max: 90, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const R = Math.min(w, h) * 0.5 * (p.ringSize / 100) * 1.1;
      // cỡ thẻ không vượt quá khoảng cách giữa hai thẻ trên vòng
      const cw = Math.min(u * p.cardSize, (TAU * R) / n * 0.9);
      const ch = cw / ar;
      const cr = Math.cos((p.rotate * Math.PI) / 180);
      const sr = Math.sin((p.rotate * Math.PI) / 180);
      const persp = R * 3.4;
      const fade = H.clamp01(p.backFade / 100);
      const spin = t * TAU;
      const depthR = Math.max(1e-3, R * Math.abs(sr));

      const items = [];
      for (let i = 0; i < n; i++) {
        const phi = spin + (i / n) * TAU;
        const ux = Math.cos(phi) * R;                  // ngang trên mặt vòng
        const vy = Math.sin(phi) * R;                  // dọc trên mặt vòng
        const x3 = ux * cr;
        const z3 = -ux * sr;                           // mở vòng sang chiều sâu
        const s = persp / (persp + z3);
        items.push({ i, z: z3, x: w / 2 + x3 * s, y: h / 2 + vy * s, s });
      }
      items.sort((A, B) => B.z - A.z);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((p.tilt * Math.PI) / 180);            // nghiêng cả vòng đu quay
      ctx.translate(-w / 2, -h / 2);
      const radius = Math.min(cw, ch) * 0.12;
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const near = H.clamp01((1 - it.z / depthR) / 2);
        const cw2 = cw * it.s;
        const ch2 = ch * it.s;
        H.card(ctx, imgs[it.i % n], it.x - cw2 / 2, it.y - ch2 / 2, cw2, ch2, radius,
          { alpha: 1 - fade * (1 - near), shadow: 6 + 14 * near, brightness: -0.16 * (1 - near) });
      }
      ctx.restore();
    }
  });

  /* --------------------------------------------------------------- Carousel Flow */
  ML.register({
    id: 'carousel-flow', name: 'Carousel Flow', vn: 'Băng thẻ lấy nét', group: 'flow',
    desc: 'Băng thẻ trượt đều; thẻ đi qua tâm phóng to, sáng lên và đổ bóng đậm hơn.',
    duration: 12, slots: [4, 22],
    params: [
      { id: 'direction', label: 'Hướng', type: 'select', default: 'horizontal',
        options: [{ value: 'horizontal', label: 'Ngang' }, { value: 'vertical', label: 'Dọc' }] },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 30, min: 12, max: 56, step: 1, unit: '%' },
      { id: 'sideScale', label: 'Cỡ thẻ bên', type: 'number', default: 76, min: 50, max: 100, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 6, min: 0, max: 25, step: 1, unit: '%' },
      { id: 'backFade', label: 'Mờ hai bên', type: 'number', default: 50, min: 0, max: 90, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const vert = p.direction === 'vertical';
      const cw = u * p.cardSize;
      const ch = cw * 1.2;                             // thẻ hơi dọc
      const pitch = (vert ? ch : cw) * (1 + p.gap / 100);
      const side = p.sideScale / 100;
      const fade = H.clamp01(p.backFade / 100);
      const phase = t * n;                             // chạy theo đơn vị "thẻ" → t=0 và t=1 trùng khít

      const items = [];
      for (let i = 0; i < n; i++) {
        const k = ringDelta(i, phase, n);
        const off = -k * pitch;                        // dương = trôi sang phải / xuống
        const dist = Math.abs(k) / Math.max(1, n / 2);
        const focus = H.smooth(H.clamp01(1 - dist * 1.6));
        items.push({
          i, off, dist, focus,
          x: vert ? w / 2 : w / 2 + off,
          y: vert ? h / 2 + off : h / 2
        });
      }
      items.sort((A, B) => B.dist - A.dist);            // xa tâm vẽ trước
      const radius = Math.min(cw, ch) * 0.09;
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const sc = side + (1 - side) * it.focus;
        const cw2 = cw * sc;
        const ch2 = ch * sc;
        if (it.x < -cw2 || it.x > w + cw2 || it.y < -ch2 || it.y > h + ch2) continue;
        H.card(ctx, imgs[it.i % n], it.x - cw2 / 2, it.y - ch2 / 2, cw2, ch2, radius, {
          alpha: (1 - fade * 0.75 * (1 - it.focus)) * (1 - 0.5 * it.dist),
          brightness: 0.12 * it.focus - 0.16 * (1 - it.focus),
          shadow: 4 + 18 * it.focus
        });
      }
    }
  });

  /* -------------------------------------------------------------- Wheel Carousel */
  ML.register({
    id: 'wheel-carousel', name: 'Wheel Carousel', vn: 'Bánh xe nhích', group: 'flow',
    desc: 'Thẻ trên bánh xe khổng lồ nhích từng nấc: lấy đà lùi, bật tới vượt nhẹ rồi dừng.',
    duration: 15, slots: [5, 22],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 30, min: 10, max: 54, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '4:5', options: ASPECT },
      { id: 'wheelSize', label: 'Bán kính bánh', type: 'number', default: 135, min: 60, max: 200, step: 5, unit: '%' },
      { id: 'anticipation', label: 'Lấy đà', type: 'number', default: 22, min: 0, max: 45, step: 1, unit: '%' },
      { id: 'overshoot', label: 'Vượt nhẹ', type: 'number', default: 10, min: 0, max: 30, step: 1, unit: '%' },
      { id: 'backFade', label: 'Mờ hai bên', type: 'number', default: 45, min: 0, max: 90, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize;
      const ch = cw / ar;
      const R = Math.max(h * 0.62, w * 0.5) * (p.wheelSize / 100);
      const hubX = w / 2;
      const hubY = h / 2 + R;                          // tâm bánh nằm dưới khung
      const slots = n * 2;                             // xếp đôi để cung thẻ dày hơn
      const stepA = TAU / slots;
      const anti = p.anticipation / 100;
      const over = p.overshoot / 100;
      const fade = H.clamp01(p.backFade / 100);
      const hold = 0.3;

      const seg = H.steps(t, n);
      const raw = H.clamp01((seg.local - hold) / Math.max(1e-3, 1 - hold));
      let k;
      if (raw < 0.22) k = -anti * H.smooth(raw / 0.22);                        // lấy đà lùi
      else if (raw < 0.66) k = H.lerp(-anti, 1 + over, H.easeOutQuint(H.q(raw, 0.22, 0.66)));
      else k = H.lerp(1 + over, 1, H.smooth(H.q(raw, 0.66, 1)));               // trả về nấc
      const pos = (seg.i + k) * 2;                     // quy ra nấc của vòng xếp đôi

      const items = [];
      for (let i = 0; i < slots; i++) {
        const d = ringDelta(i, pos, slots);
        if (Math.abs(d) > 3.4) continue;
        const a = d * stepA;
        items.push({
          i, d, a,
          x: hubX + Math.sin(a) * R,
          y: hubY - Math.cos(a) * R
        });
      }
      items.sort((A, B) => Math.abs(B.d) - Math.abs(A.d));   // thẻ ngoài cùng vẽ trước
      const radius = Math.min(cw, ch) * 0.1;
      for (let q = 0; q < items.length; q++) {
        const it = items[q];
        if (it.x < -cw || it.x > w + cw || it.y < -ch || it.y > h + ch) continue;
        const far = H.clamp01(Math.abs(it.d) / 3.4);
        H.card(ctx, imgs[it.i % n], it.x - cw / 2, it.y - ch / 2, cw, ch, radius, {
          rot: it.a,                                  // bám vành bánh
          alpha: (1 - fade * far) * (1 - 0.2 * far),
          shadow: 16 - 6 * far
        });
      }
    }
  });

  /* ------------------------------------------------------------------- Wheel Spin */
  ML.register({
    id: 'wheel-spin', name: 'Wheel Spin', vn: 'Bánh xe quay', group: 'flow',
    desc: 'Cả bánh xe nằm gọn trong khung, quay đều liên tục không dừng.',
    duration: 14, slots: [4, 26],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 20, min: 8, max: 36, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '4:5', options: ASPECT },
      { id: 'wheelSize', label: 'Bán kính bánh', type: 'number', default: 78, min: 35, max: 98, step: 1, unit: '%' },
      { id: 'rotations', label: 'Số vòng mỗi nhịp', type: 'number', default: 1, min: 1, max: 4, step: 1 },
      { id: 'backFade', label: 'Mờ nửa xa', type: 'number', default: 45, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'direction', label: 'Chiều', type: 'select', default: 'right', options: DIR_LR }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const R = Math.min(w, h) * 0.42 * (p.wheelSize / 100);  // cả bánh nằm trong khung
      const cw = Math.min(u * p.cardSize, (TAU * R) / n * 0.95);
      const ch = cw / ar;
      const dir = p.direction === 'left' ? -1 : 1;
      const spin = t * TAU * p.rotations * dir;
      const fade = H.clamp01(p.backFade / 100);

      const items = [];
      for (let i = 0; i < n; i++) {
        const a = spin + (i / n) * TAU;
        items.push({ i, a, far: (Math.cos(a) + 1) / 2 });     // 0 = phía gần, 1 = phía xa
      }
      items.sort((A, B) => B.far - A.far);                    // nửa xa vẽ trước
      const radius = Math.min(cw, ch) * 0.1;
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const x = w / 2 + Math.cos(it.a) * R;
        const y = h / 2 + Math.sin(it.a) * R * 0.68;          // vòng hơi bẹt theo trục dọc
        const sc = 1 - 0.12 * it.far;
        H.card(ctx, imgs[it.i % n], x - (cw * sc) / 2, y - (ch * sc) / 2, cw * sc, ch * sc, radius, {
          rot: it.a,                                          // thẻ quay theo vành
          alpha: (1 - fade * 0.8 * it.far) * (1 - 0.25 * it.far),
          brightness: -0.12 * it.far,
          shadow: 12
        });
      }
    }
  });

  /* ------------------------------------------------------------ Wheel Spin Bottom */
  ML.register({
    id: 'wheel-spin-bottom', name: 'Wheel Spin Bottom', vn: 'Vòm thẻ quay', group: 'flow',
    desc: 'Vòm nửa vòng thẻ xếp đôi quay đều quanh tâm bánh nằm dưới khung hình.',
    duration: 14, slots: [5, 28],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 19, min: 8, max: 36, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '4:5', options: ASPECT },
      { id: 'wheelSize', label: 'Bán kính vòm', type: 'number', default: 62, min: 25, max: 100, step: 1, unit: '%' },
      { id: 'rotations', label: 'Số vòng mỗi nhịp', type: 'number', default: 1, min: 1, max: 4, step: 1 },
      { id: 'backFade', label: 'Mờ hai mép', type: 'number', default: 45, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'direction', label: 'Chiều', type: 'select', default: 'right', options: DIR_LR }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize;
      const ch = cw / ar;
      const R = Math.max(w * 0.62, h * 0.9) * (p.wheelSize / 100);
      const hubY = h + R * 0.16;                       // tâm bánh nằm dưới khung
      const dir = p.direction === 'left' ? -1 : 1;
      const spin = t * TAU * p.rotations * dir;
      const fade = H.clamp01(p.backFade / 100);
      const total = Math.min(44, n * 2);               // xếp đôi như vòm trùng lớp
      const stepA = TAU / total;

      const items = [];
      for (let j = 0; j < total; j++) {
        const a = spin + j * stepA;
        const c = Math.cos(a);
        if (c < 0.08) continue;                        // chỉ vẽ nửa trên của vòng
        items.push({
          j, a, near: H.clamp01((c - 0.08) / 0.9),
          x: w / 2 + Math.sin(a) * R * 1.2,
          y: hubY - c * R
        });
      }
      items.sort((A, B) => A.near - B.near);           // mép xa vẽ trước
      const radius = Math.min(cw, ch) * 0.1;
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        if (it.x < -cw || it.x > w + cw || it.y < -ch || it.y > h + ch) continue;
        const sc = 0.86 + 0.14 * it.near;
        H.card(ctx, imgs[it.j % n], it.x - (cw * sc) / 2, it.y - (ch * sc) / 2, cw * sc, ch * sc, radius, {
          rot: it.a,                                    // bám vành vòm
          alpha: (1 - fade * (1 - it.near)) * (1 - 0.2 * (1 - it.near)),
          shadow: 6 + 10 * it.near
        });
      }
    }
  });

  /* ----------------------------------------------------------- Diagonal Carousel */
  ML.register({
    id: 'diagonal-carousel', name: 'Diagonal Carousel', vn: 'Bài xoè chéo', group: 'flow',
    desc: 'Thẻ chồng nhau trượt theo một đường chéo như bộ bài xoè ra rồi gom lại.',
    duration: 12, slots: [4, 22],
    params: [
      { id: 'direction', label: 'Hướng chéo', type: 'select', default: 'downRight', options: [
        { value: 'downRight', label: 'Xuống phải ↘' }, { value: 'downLeft', label: 'Xuống trái ↙' },
        { value: 'upRight', label: 'Lên phải ↗' }, { value: 'upLeft', label: 'Lên trái ↖' }] },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 34, min: 12, max: 64, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '4:5', options: ASPECT },
      { id: 'overlap', label: 'Chồng lấp', type: 'number', default: 58, min: 0, max: 88, step: 2, unit: '%' },
      { id: 'backFade', label: 'Mờ hai đầu', type: 'number', default: 40, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'fan', label: 'Độ xoè', type: 'number', default: 9, min: 0, max: 24, step: 1, unit: '°' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize;
      const ch = cw / ar;
      const dirName = p.direction;
      const sx = dirName === 'downLeft' || dirName === 'upLeft' ? -1 : 1;
      const sy = dirName === 'upLeft' || dirName === 'upRight' ? -1 : 1;
      const diag = Math.SQRT1_2;
      const step = Math.max(cw, ch) * (1 - p.overlap / 100) * 0.92;
      const phase = t * n;                             // đơn vị "thẻ" → vòng lặp khít
      const fade = H.clamp01(p.backFade / 100);
      const fan = (p.fan * Math.PI) / 180;

      const items = [];
      for (let k = 0; k < n; k++) {
        const u2 = ringDelta(k, phase, n);
        const off = -u2 * step;
        const d = off / Math.max(1, (step * n) / 2);    // -1..1
        items.push({
          i: k, d,
          x: w / 2 + sx * off * diag,
          y: h / 2 + sy * off * diag
        });
      }
      items.sort((A, B) => Math.abs(B.d) - Math.abs(A.d));  // xa tâm vẽ trước
      const radius = Math.min(cw, ch) * 0.08;
      for (let q = 0; q < items.length; q++) {
        const it = items[q];
        if (it.x < -cw || it.x > w + cw || it.y < -ch || it.y > h + ch) continue;
        const near = 1 - Math.abs(it.d);
        H.card(ctx, imgs[it.i % n], it.x - cw / 2, it.y - ch / 2, cw, ch, radius, {
          rot: fan * it.d * sx * sy,                    // xoè nhẹ như quạt bài
          alpha: (1 - fade * Math.abs(it.d)) * (0.55 + 0.45 * near),
          brightness: 0.1 * near - 0.1 * (1 - near),
          shadow: 6 + 14 * near
        });
      }
    }
  });
})();
