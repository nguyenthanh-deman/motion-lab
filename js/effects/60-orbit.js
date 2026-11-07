/* =============================================================================
   60 · Nhóm quỹ đạo — vòng ellipse, cụm quay, chiều sâu giả, xoáy ốc
   orbit-showcase · photo-orbit · orbit-carousel · orbit-bloom
   focus-orbit · lens-orbit · sweep-ring · spiral-stream

   Quy ước chung của nhóm: mọi vị trí là hàm tuần hoàn của t — góc luôn chạy đủ
   2π (đưa về [0,2π) bằng wrap để t=1 cho đúng 0), pha từng thẻ dùng fract(t+i/n).
   Các hiệu ứng nhiều nhịp chia cảnh bằng H.steps và kết thúc đúng ở trạng thái
   đầu, nên khung t=1 trùng khít khung t=0. Chiều sâu giả: z = sin/cos của góc,
   scale = 1 + z*k, alpha giảm dần về phía sau, vẽ xa trước gần sau.
   ========================================================================== */
(function () {
  'use strict';
  const H = ML.h;
  const TAU = Math.PI * 2;

  /** đưa góc về [0, 2π): ở t=1 trả đúng 0 nên vòng lặp kín tuyệt đối */
  const wrap = (a) => a - Math.floor(a / TAU) * TAU;
  /** phần lẻ trong [0,1) — dịch pha cho từng thẻ mà vòng lặp vẫn kín */
  const fract = (x) => x - Math.floor(x);

  const ASPECT = [
    { value: '1:1', label: 'Vuông' },
    { value: '16:9', label: 'Ngang' },
    { value: '4:5', label: 'Dọc' }
  ];

  /* ------------------------------------------------------------ Orbit Showcase */
  ML.register({
    id: 'orbit-showcase', name: 'Orbit Showcase', vn: 'Quỹ đạo phối cảnh', group: 'flow',
    desc: 'Thẻ phẳng chạy trên quỹ đạo ellipse: phía trước to và rõ, phía sau nhỏ và mờ dần.',
    duration: 15, slots: [5, 24],
    params: [
      { id: 'ringWidth', label: 'Bề rộng vòng', type: 'number', default: 66, min: 25, max: 95, step: 1, unit: '%' },
      { id: 'ringDepth', label: 'Chiều sâu vòng', type: 'number', default: 30, min: 8, max: 60, step: 1, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 22, min: 8, max: 40, step: 1, unit: '%' },
      { id: 'perspective', label: 'Độ phối cảnh', type: 'number', default: 60, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'backFade', label: 'Mờ phía sau', type: 'number', default: 50, min: 0, max: 90, step: 5, unit: '%' },
      {
        id: 'direction', label: 'Chiều quay', type: 'select', default: 'right',
        options: [{ value: 'right', label: 'Thuận' }, { value: 'left', label: 'Ngược' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cw = u * p.cardSize, ch = cw;
      const rx = w * 0.44 * (p.ringWidth / 100);
      const ry = h * 0.40 * (p.ringDepth / 100);
      const dir = p.direction === 'left' ? -1 : 1;
      const spin = wrap(dir * t * TAU);
      const k = (p.perspective / 100) * 0.6;          // biên độ phóng theo chiều sâu
      const items = [];
      for (let i = 0; i < n; i++) {
        const a = spin + (i / n) * TAU;
        items.push({ i, a, z: Math.sin(a) });         // z = +1 sát trước, -1 xa nhất
      }
      items.sort((m, o) => m.z - o.z);                // xa vẽ trước, gần đè lên
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        const back = (1 - it.z) / 2;                  // 0 = trước, 1 = sau
        const sc = 1 + k * it.z;
        const bw = cw * sc, bh = ch * sc;
        H.card(ctx, imgs[it.i % n],
          w / 2 + Math.cos(it.a) * rx - bw / 2,
          h / 2 + Math.sin(it.a) * ry - bh / 2,
          bw, bh, u * 2 * sc, {
            alpha: 1 - (p.backFade / 100) * back,
            shadow: 22 * sc,
            brightness: -0.24 * back,
            rot: Math.cos(it.a) * 0.05
          });
      }
    }
  });

  /* --------------------------------------------------------------- Photo Orbit */
  ML.register({
    id: 'photo-orbit', name: 'Photo Orbit', vn: 'Cụm quay chậm', group: 'flow',
    desc: 'Một cụm ảnh dán lệch nhau quay chậm quanh tâm như tấm moodboard sống.',
    duration: 18, slots: [4, 20],
    params: [
      { id: 'ringWidth', label: 'Bề rộng cụm', type: 'number', default: 52, min: 10, max: 90, step: 1, unit: '%' },
      { id: 'ringHeight', label: 'Chiều cao cụm', type: 'number', default: 52, min: 10, max: 90, step: 1, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 25, min: 8, max: 45, step: 1, unit: '%' },
      { id: 'tilt', label: 'Độ nghiêng thẻ', type: 'number', default: 14, min: 0, max: 40, step: 1, unit: '°' },
      {
        id: 'direction', label: 'Chiều quay', type: 'select', default: 'right',
        options: [{ value: 'right', label: 'Thuận' }, { value: 'left', label: 'Ngược' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cw = u * p.cardSize, ch = cw * 0.84;
      const rx = w * 0.40 * (p.ringWidth / 100);
      const ry = h * 0.40 * (p.ringHeight / 100);
      const dir = p.direction === 'left' ? -1 : 1;
      const spin = wrap(dir * t * TAU);
      const tilt = (p.tilt * Math.PI) / 180;
      const items = [];
      for (let i = 0; i < n; i++) {
        // lệch pha + bán kính theo hash: cụm dán tay chứ không đều như vòng kỹ thuật
        const a = spin + (i / n) * TAU + (H.hash(i, 3) - 0.5) * 0.45;
        items.push({ i, a, rad: 0.82 + H.hash(i, 7) * 0.34, y: Math.sin(a) });
      }
      items.sort((m, o) => m.y - o.y);                // thẻ phía dưới nằm trên
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        const sc = 0.9 + H.hash(it.i, 11) * 0.16;     // phối cảnh yếu, chỉ hơi khác cỡ
        const x = w / 2 + Math.cos(it.a) * rx * it.rad;
        const y = h / 2 + Math.sin(it.a) * ry * it.rad;
        H.card(ctx, imgs[it.i % n], x - (cw * sc) / 2, y - (ch * sc) / 2, cw * sc, ch * sc, u * 2 * sc, {
          rot: (H.hash(it.i, 5) - 0.5) * tilt * 2 + Math.sin(it.a) * 0.04,
          shadow: 20,
          alpha: 0.96
        });
      }
    }
  });

  /* ------------------------------------------------------------- Orbit Carousel */
  ML.register({
    id: 'orbit-carousel', name: 'Orbit Carousel', vn: 'Quỹ đạo 3D', group: 'flow',
    desc: 'Thẻ quay quanh trong chiều sâu giả 3D, thẻ gần nhất to và nét, phía sau nhoè dần.',
    duration: 14, slots: [5, 20],
    params: [
      { id: 'spread', label: 'Độ trải ngang', type: 'number', default: 76, min: 20, max: 100, step: 2, unit: '%' },
      { id: 'depth', label: 'Độ sâu', type: 'number', default: 62, min: 0, max: 100, step: 2, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 30, min: 10, max: 55, step: 1, unit: '%' },
      { id: 'backBlur', label: 'Nhoè phía sau', type: 'number', default: 5, min: 0, max: 14, step: 1 },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize, ch = cw / ar;
      const rx = w * 0.44 * (p.spread / 100);
      const k = (p.depth / 100) * 0.55;
      const spin = wrap(t * TAU);
      const items = [];
      for (let i = 0; i < n; i++) {
        const a = spin + (i / n) * TAU;
        items.push({ i, a, z: Math.cos(a) });         // z = +1 thẻ sát mắt nhất
      }
      items.sort((m, o) => m.z - o.z);
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        const back = (1 - it.z) / 2;
        const sc = 1 + k * it.z;
        const bw = cw * sc, bh = ch * sc;
        H.card(ctx, imgs[it.i % n],
          w / 2 + Math.sin(it.a) * rx - bw / 2,
          h / 2 + it.z * h * 0.06 - bh / 2,
          bw, bh, u * 2 * sc, {
            alpha: 1 - 0.7 * back,
            shadow: 14 + 18 * (1 - back),
            blur: p.backBlur * back * back,           // chỉ thẻ xa mới nhoè → thẻ trước "lấy nét"
            brightness: -0.2 * back,
            rot: -Math.sin(it.a) * 0.06
          });
      }
    }
  });

  /* ---------------------------------------------------------------- Orbit Bloom */
  ML.register({
    id: 'orbit-bloom', name: 'Orbit Bloom', vn: 'Cánh hoa quay', group: 'flow',
    desc: 'Thẻ cắm như nan hoa quanh trục, mép trong hướng vào tâm, đỉnh hơi nghiêng như cánh hoa.',
    duration: 16, slots: [5, 18],
    params: [
      { id: 'ringWidth', label: 'Bề rộng vòng', type: 'number', default: 58, min: 20, max: 95, step: 1, unit: '%' },
      { id: 'ringDepth', label: 'Chiều sâu vòng', type: 'number', default: 30, min: 8, max: 60, step: 1, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 20, min: 8, max: 34, step: 1, unit: '%' },
      { id: 'lean', label: 'Độ nghiêng cánh', type: 'number', default: 14, min: -40, max: 40, step: 1, unit: '°' },
      { id: 'backFade', label: 'Mờ phía sau', type: 'number', default: 45, min: 0, max: 90, step: 5, unit: '%' },
      {
        id: 'direction', label: 'Chiều quay', type: 'select', default: 'right',
        options: [{ value: 'right', label: 'Thuận' }, { value: 'left', label: 'Ngược' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cw = u * p.cardSize, ch = cw * 1.55;      // thẻ dài: cắm như nan hoa
      const rx = w * 0.40 * (p.ringWidth / 100);
      const ry = h * 0.40 * (p.ringDepth / 100);
      const dir = p.direction === 'left' ? -1 : 1;
      const spin = wrap(dir * t * TAU);
      const lean = (p.lean * Math.PI) / 180;
      const items = [];
      for (let i = 0; i < n; i++) {
        const a = spin + (i / n) * TAU;
        items.push({ i, a, z: Math.sin(a) });
      }
      items.sort((m, o) => m.z - o.z);
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        const back = (1 - it.z) / 2;
        const sc = 0.82 + 0.18 * (1 - back);
        const bw = cw * sc, bh = ch * sc;
        // điểm mọc trên vòng ellipse + pháp tuyến để đẩy thẻ ra ngoài
        const hx = Math.cos(it.a) * rx, hy = Math.sin(it.a) * ry;
        const nl = Math.hypot(hx, hy) || 1;
        const push = bh / 2;                          // mép trong (đáy thẻ) nằm đúng trên vòng
        H.card(ctx, imgs[it.i % n],
          w / 2 + hx + (hx / nl) * push - bw / 2,
          h / 2 + hy + (hy / nl) * push - bh / 2,
          bw, bh, u * 2 * sc, {
            rot: it.a + Math.PI / 2 + lean,           // đỉnh thẻ hướng ra ngoài, nghiêng theo lean
            alpha: 1 - (p.backFade / 100) * back,
            shadow: 20 * sc,
            brightness: -0.22 * back
          });
      }
    }
  });

  /* ----------------------------------------------------------------- Focus Orbit */
  ML.register({
    id: 'focus-orbit', name: 'Focus Orbit', vn: 'Quay rồi lấy nét', group: 'scene',
    desc: 'Moodboard quay tròn, thu cảnh vào một thẻ, xoay quanh nó rồi lại lùi ra.',
    duration: 14, slots: [6, 20],
    params: [
      { id: 'ringSize', label: 'Bán kính vòng', type: 'number', default: 34, min: 15, max: 50, step: 1, unit: '%' },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 17, min: 6, max: 30, step: 1, unit: '%' },
      { id: 'zoom', label: 'Độ phóng', type: 'number', default: 2.4, min: 1.2, max: 3.4, step: 0.1 },
      { id: 'spins', label: 'Số vòng xoay', type: 'number', default: 1, min: 1, max: 4, step: 1 },
      {
        id: 'direction', label: 'Chiều quay', type: 'select', default: 'right',
        options: [{ value: 'right', label: 'Thuận' }, { value: 'left', label: 'Ngược' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cw = u * p.cardSize, ch = cw;
      const R = Math.min(w, h) * (p.ringSize / 100);
      const cx = w / 2, cy = h / 2;
      const dir = p.direction === 'left' ? -1 : 1;
      const seg = H.steps(t, 4);                     // quay · vào · xoay tại chỗ · lùi ra
      let k = 0, spinK = 0;                          // k: 0 vòng bình thường · 1 đã phóng vào thẻ
      if (seg.i === 1) k = H.smooth(seg.local);      // vào
      else if (seg.i === 2) { k = 1; spinK = H.easeInOut(seg.local); }   // xoay quanh thẻ
      else if (seg.i === 3) { k = 1 - H.smooth(seg.local); spinK = 1; }  // lùi ra
      const rot = wrap(dir * t * TAU + dir * spinK * Math.round(p.spins) * TAU);
      const S = 1 + (p.zoom - 1) * k;
      // thẻ 0 là tâm ngắm: dịch cả cảnh để nó luôn ở giữa khi phóng
      const p0x = Math.cos(rot) * R;
      const p0y = Math.sin(rot) * R * 0.72;
      const items = [];
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * TAU;
        items.push({ i, a, z: Math.sin(a) });
      }
      items.sort((m, o) => m.z - o.z);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.translate(-p0x * k, -p0y * k);
      ctx.scale(S, S);
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 0; j < items.length; j++) {
          const it = items[j];
          const isTarget = it.i === 0;
          if ((pass === 1) !== isTarget) continue;    // thẻ tâm ngắm vẽ sau cùng
          const back = (1 - it.z) / 2;
          const sc = (1 + 0.08 * it.z) * (isTarget ? 1 + 0.14 * k : 1);
          H.card(ctx, imgs[it.i % n],
            Math.cos(it.a) * R - (cw * sc) / 2,
            Math.sin(it.a) * R * 0.72 - (ch * sc) / 2,
            cw * sc, ch * sc, u * 2 * sc, {
              alpha: isTarget ? 1 : 0.95 - 0.25 * back - 0.1 * k,
              shadow: 18,
              brightness: isTarget ? 0.06 * k : -0.18 * back,
              rot: isTarget ? k * 0.18 : 0
            });
        }
      }
      ctx.restore();
    }
  });

  /* ------------------------------------------------------------------ Lens Orbit */
  ML.register({
    id: 'lens-orbit', name: 'Lens Orbit', vn: 'Mắt cá mở vòng', group: 'scene',
    desc: 'Một thẻ tách ra thành hàng carousel mắt cá, gập lại thành thẻ, rồi tám thẻ nở vòng quanh và quay.',
    duration: 18, slots: [8, 20],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ hàng', type: 'number', default: 34, min: 12, max: 60, step: 1, unit: '%' },
      { id: 'lensStrength', label: 'Độ mắt cá', type: 'number', default: 55, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'focusSize', label: 'Cỡ thẻ tâm', type: 'number', default: 110, min: 60, max: 160, step: 5, unit: '%' },
      { id: 'cardGap', label: 'Khe hở', type: 'number', default: 4, min: -20, max: 30, step: 1, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cx = w / 2, cy = h / 2;
      const cw = u * p.cardSize, ch = cw;
      const seg = H.steps(t, 4);                     // tách hàng · gập · nở vòng · gập vòng
      let fold, bloom;
      if (seg.i === 0) { fold = 1; bloom = 0; }
      else if (seg.i === 1) { fold = H.easeInOut(seg.local); bloom = 0; }
      else if (seg.i === 2) { fold = 1; bloom = H.easeInOut(seg.local); }
      else { fold = 1; bloom = 1 - H.easeInOut(seg.local); }
      const gap = cw * (1 + p.cardGap / 100);
      const span = Math.min(w * 0.46, gap * Math.max(1, n * 0.55));
      const lens = p.lensStrength / 100;
      const focusSc = p.focusSize / 100;
      for (let i = 0; i < n; i++) {
        // dải hàng: nén hai mép kiểu mắt cá, thẻ giữa phình to
        const s = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
        const fish = Math.sin((s * Math.PI) / 2);
        const rowX = cx + fish * span;
        const rowY = cy + (1 - Math.abs(fish)) * u * 2.2;
        const rowSc = 1 + lens * 0.55 * (1 - Math.abs(fish));
        // cảnh 0: từng thẻ bước ra khỏi chồng (so le) thay vì bung cùng lúc
        const f = seg.i === 0 ? 1 - H.easeOutQuint(H.stagger(seg.local, i, n, 0.55)) : fold;
        const px = H.lerp(cx, rowX, 1 - f);
        const py = H.lerp(cy, rowY, 1 - f);
        const sc = H.lerp(focusSc, rowSc, 1 - f);
        H.card(ctx, imgs[i % n], px - (cw * sc) / 2, py - (ch * sc) / 2, cw * sc, ch * sc, u * 2 * sc, {
          alpha: 1 - f,                               // chồng lại thì nhoè vào thẻ tâm
          rot: s * 0.09 * (1 - f),
          shadow: 18,
          edge: false
        });
      }
      // vòng tám thẻ nở quanh thẻ tâm
      if (bloom > 0.01) {
        const ringN = Math.min(8, n);
        const R = Math.min(w, h) * 0.33 * (0.55 + 0.45 * bloom);
        const orbit = bloom * TAU * 0.75;             // nở ra thì vòng cũng quay
        const sw = cw * 0.44;
        for (let j = 0; j < ringN; j++) {
          const a = orbit + (j / ringN) * TAU;
          const sc = bloom;
          H.card(ctx, imgs[(j + 1) % n],
            cx + Math.cos(a) * R - (sw * sc) / 2,
            cy + Math.sin(a) * R * 0.74 - (sw * sc) / 2,
            sw * sc, sw * sc, u * 2 * sc, {
              alpha: bloom,
              rot: a + Math.PI / 2,
              shadow: 14,
              brightness: -0.08
            });
        }
      }
      // thẻ tâm: lật qua lật lại bằng phối cảnh thật, vẽ sau cùng nên luôn nổi
      if (fold > 0.01) {
        const fw = cw * focusSc;
        H.perspCard(ctx, imgs[0], cx, cy, fw, fw, Math.sin(TAU * t) * 0.9, {
          radius: u * 2,
          alpha: fold,
          perspective: 720
        });
      }
    }
  });

  /* ------------------------------------------------------------------ Sweep Ring */
  ML.register({
    id: 'sweep-ring', name: 'Sweep Ring', vn: 'Quét rồi xoay', group: 'scene',
    desc: 'Chồng thẻ xoè thành hàng ngang gợn sóng, quét qua một lượt rồi tụ lại thành vòng đang quay.',
    duration: 17, slots: [6, 18],
    params: [
      { id: 'rowCard', label: 'Cỡ thẻ hàng', type: 'number', default: 26, min: 8, max: 55, step: 1, unit: '%' },
      { id: 'cardGap', label: 'Khe hở hàng', type: 'number', default: 4, min: 0, max: 20, step: 1, unit: '%' },
      { id: 'ringCard', label: 'Cỡ thẻ vòng', type: 'number', default: 20, min: 6, max: 45, step: 1, unit: '%' },
      { id: 'ringSize', label: 'Bán kính vòng', type: 'number', default: 34, min: 12, max: 50, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cx = w / 2, cy = h / 2;
      const seg = H.steps(t, 4);                     // xoè hàng · quét · tụ vòng · thu về chồng
      let fan = 0, gather = 0, wave = 0;
      if (seg.i === 0) fan = H.easeOutQuint(seg.local);
      else if (seg.i === 1) { fan = 1; wave = Math.sin(seg.local * Math.PI); }
      else if (seg.i === 2) { fan = 1; gather = H.easeInOut(seg.local); }
      else { fan = 1 - H.easeInOut(seg.local); gather = 1 - H.easeInOut(seg.local); }
      const spin = wrap(H.q(seg.all, 0.5, 1) * TAU * 1);   // t=1 → 2π ≡ 0
      const cwRow = u * p.rowCard, cwRing = u * p.ringCard;
      const pitch0 = cwRow * (1 + p.cardGap / 100);
      // hàng dài hơn khung thì siết bước chứ không thu nhỏ thẻ → vẫn là hàng thẻ lớn chồng nhau
      const pitch = Math.min(pitch0, (w * 0.94 - cwRow) / Math.max(1, n - 1));
      const rw = cwRow;
      const R = Math.min(w, h) * (p.ringSize / 100);
      const items = [];
      for (let i = 0; i < n; i++) {
        const a = spin + (i / n) * TAU;
        const d = n > 1 ? i - (n - 1) / 2 : 0;
        items.push({
          i, a, d,
          z: Math.sin(a),
          stX: cx + d * u * 0.55,                    // chồng lệch nhẹ như bộ bài
          stY: cy - d * u * 0.45,
          stRot: d * 0.012,
          key: gather * Math.sin(a) + (1 - gather) * (i / Math.max(1, n))
        });
      }
      items.sort((m, o) => m.key - o.key);           // vòng: xa trước; hàng: theo thứ tự
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        const wob = wave * Math.sin(it.i * 0.8 - seg.local * TAU);   // gợn sóng khi quét
        const rowX = cx + it.d * pitch;
        const rowY = cy + wob * h * 0.06;
        const ringX = cx + Math.cos(it.a) * R;
        const ringY = cy + Math.sin(it.a) * R * 0.78;
        const px = H.lerp(it.stX, H.lerp(rowX, ringX, gather), fan);
        const py = H.lerp(it.stY, H.lerp(rowY, ringY, gather), fan);
        const cwNow = H.lerp(cwRow * 0.92, H.lerp(rw, cwRing, gather), fan);
        const chNow = cwNow / ar;
        const rot = H.lerp(it.stRot, H.lerp(wob * 0.08, it.a + Math.PI / 2, gather), fan);
        H.card(ctx, imgs[it.i % n], px - cwNow / 2, py - chNow / 2, cwNow, chNow, u * 2, {
          rot,
          shadow: 18,
          brightness: -0.1 * gather * ((1 - it.z) / 2)
        });
      }
    }
  });

  /* ---------------------------------------------------------------- Spiral Stream */
  ML.register({
    id: 'spiral-stream', name: 'Spiral Stream', vn: 'Xoáy ốc dọc', group: '3d',
    desc: 'Thẻ trôi xuống theo một đường xoắn ốc 3D đứng, vòng trước to rõ, vòng sau nhỏ mờ.',
    duration: 20, slots: [6, 24],
    params: [
      { id: 'turns', label: 'Số vòng xoắn', type: 'number', default: 3.25, min: 1, max: 6, step: 0.25 },
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 26, min: 10, max: 50, step: 1, unit: '%' },
      { id: 'ringSize', label: 'Bán kính xoắn', type: 'number', default: 34, min: 12, max: 70, step: 1, unit: '%' },
      { id: 'taper', label: 'Thu nhỏ dần', type: 'number', default: 20, min: 0, max: 70, step: 5, unit: '%' },
      { id: 'backFade', label: 'Mờ phía sau', type: 'number', default: 55, min: 0, max: 95, step: 5, unit: '%' },
      {
        id: 'direction', label: 'Hướng trôi', type: 'select', default: 'down',
        options: [{ value: 'down', label: 'Xuống' }, { value: 'up', label: 'Lên' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cw = u * p.cardSize, ch = cw;
      const R = Math.min(w, h) * (p.ringSize / 100);
      const dir = p.direction === 'up' ? -1 : 1;
      const turns = Math.round(p.turns * 4) / 4;
      const items = [];
      for (let i = 0; i < n; i++) {
        const f = fract(i / n + t * dir);             // 0 = trên cùng, 1 = dưới cùng
        const a = f * turns * TAU;
        items.push({ i, f, a, z: Math.sin(a) });
      }
      items.sort((m, o) => m.z - o.z);                // nửa sau vẽ trước
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        const back = (1 - it.z) / 2;
        const taper = 1 - (p.taper / 100) * it.f;     // càng xuống càng nhỏ và hẹp lại
        const sc = (0.72 + 0.36 * (1 - back)) * taper;
        const bw = cw * sc, bh = ch * sc;
        const x = w / 2 + Math.cos(it.a) * R * (0.55 + 0.45 * taper);
        const y = -bh * 0.6 + it.f * (h + bh * 1.2);
        H.card(ctx, imgs[it.i % n], x - bw / 2, y - bh / 2, bw, bh, u * 2 * sc, {
          alpha: 1 - (p.backFade / 100) * back,
          shadow: 16 * sc,
          brightness: -0.2 * back,
          rot: Math.cos(it.a) * 0.12
        });
      }
    }
  });
})();
