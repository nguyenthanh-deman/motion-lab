/* =============================================================================
   50 · Nhóm chồng thẻ — chồng, bóc, tung, xoè, bung
   stack-slide · deck-peel · card-toss · cascade-deck · cascade-drop
   spread-rows · spread-columns · poster-burst · scatter-dial

   Quy ước chung của nhóm: mọi vị trí là hàm tuần hoàn của t, nên khung t=1
   trùng khít khung t=0 (kể cả khi dùng pha riêng cho từng thẻ: fract(t + i/n)).
   ========================================================================== */
(function () {
  'use strict';
  const H = ML.h;

  const ASPECT = [
    { value: '1:1', label: 'Vuông' },
    { value: '16:9', label: 'Ngang' },
    { value: '4:5', label: 'Dọc' }
  ];

  /** phần lẻ trong [0,1) — dịch pha cho từng thẻ mà vòng lặp vẫn kín */
  const fract = (x) => x - Math.floor(x);

  /* ------------------------------------------------------------------ Stack Slide */
  ML.register({
    id: 'stack-slide', name: 'Stack Slide', vn: 'Chồng trượt', group: 'grid',
    desc: 'Thẻ trượt lên từ dưới, hạ cánh nảy lò xo rồi đẩy các lớp cũ lùi dần về sau.',
    duration: 10, slots: [3, 8],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 52, min: 24, max: 80, step: 1, unit: '%' },
      { id: 'inset', label: 'Thụt mỗi lớp', type: 'number', default: 4, min: 0, max: 10, step: 0.5, unit: '%' },
      { id: 'depthScale', label: 'Thu nhỏ lớp', type: 'number', default: 94, min: 80, max: 100, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize, ch = cw / ar;
      const scaleStep = p.depthScale / 100;
      const g = t * n;                       // 0..n, không kẹp để t=1 ≡ t=0
      const layers = [];
      for (let i = 0; i < n; i++) {
        // 0 = vừa lên đỉnh chồng, càng lớn càng lùi sâu; tăng liên tục nên không giật
        const depth = fract((g - i) / n) * n;
        layers.push({ i, depth });
      }
      layers.sort((a, b) => b.depth - a.depth);   // lớp sâu vẽ trước, lớp mới đè lên trên
      for (let j = 0; j < layers.length; j++) {
        const it = layers[j], d = it.depth;
        const s = Math.pow(scaleStep, d);
        const land = H.clamp01(d / 0.45);              // thẻ mới: rơi từ dưới lên
        const drop = (1 - H.back(land, 2.2)) * h * 0.55;
        const y = h * 0.58 - d * p.inset * u * 0.9 + drop;   // hạ bệ chồng để không cắt mép trên
        const fade = H.clamp01(1 - d / Math.max(1, n - 0.02));
        const rot = Math.sin(d * 0.8) * 0.03 + (1 - land) * 0.05;
        H.card(ctx, imgs[it.i % n], w / 2 - (cw * s) / 2, y - (ch * s) / 2, cw * s, ch * s, u * 2.2,
          { rot, shadow: 24 * s, alpha: 0.25 + 0.75 * fade, brightness: -0.06 * Math.min(3, d) });
      }
    }
  });

  /* -------------------------------------------------------------------- Deck Peel */
  ML.register({
    id: 'deck-peel', name: 'Deck Peel', vn: 'Bóc bài', group: 'grid',
    desc: 'Bộ bài đứng ở tâm, lá trên cùng lần lượt rơi khỏi chồng, xoay và tan dần.',
    duration: 11, slots: [4, 8],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 48, min: 24, max: 72, step: 1, unit: '%' },
      { id: 'peek', label: 'Ló lớp dưới', type: 'number', default: 4, min: 1, max: 9, step: 0.5, unit: '%' },
      { id: 'spin', label: 'Xoay khi rơi', type: 'number', default: 16, min: 0, max: 45, step: 1, unit: '°' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize, ch = cw / ar;
      const step = t * n;
      const beat = Math.floor(step);
      const local = step - beat;             // tiến trình bóc lá trong nhịp hiện tại
      const top = beat % n;
      const peek = p.peek * u * 0.75;

      // phần bài còn lại: lá kế tiếp trượt dần lên chỗ lá vừa rơi
      const deck = [];
      for (let j = 0; j < n; j++) {
        if (j === top) continue;
        const rank = Math.max(0, ((j - top + n) % n) - local);
        deck.push({ j, rank });
      }
      deck.sort((a, b) => b.rank - a.rank);
      for (let d = 0; d < deck.length; d++) {
        const it = deck[d], r = it.rank;
        const s = 1 - r * 0.012;
        H.card(ctx, imgs[it.j % n], w / 2 - (cw * s) / 2 + r * peek, h / 2 - (ch * s) / 2 - r * peek,
          cw * s, ch * s, u * 2,
          { rot: r * 0.012, shadow: 20 * s, alpha: H.clamp01(1.02 - r / (n * 0.9)) });
      }

      // lá bị bóc: rơi nhanh dần, xoay, mờ dần rồi tắt trước khi nhịp sau bắt đầu
      const fall = H.easeIn(local);
      const dropY = h / 2 + fall * h * 0.8;
      const dropX = w / 2 + fall * u * 5;
      H.card(ctx, imgs[top % n], dropX - cw / 2, dropY - ch / 2, cw, ch, u * 2,
        {
          rot: fall * (p.spin * Math.PI) / 180,
          shadow: 26 * (1 - fall * 0.5),
          alpha: 1 - H.smooth(H.q(local, 0.55, 0.94))
        });
    }
  });

  /* ------------------------------------------------------------------- Card Toss */
  ML.register({
    id: 'card-toss', name: 'Card Toss', vn: 'Tung thẻ', group: 'scene',
    desc: 'Thẻ lần lượt được tung lên từ dưới, lơ lửng đổi hướng rồi rơi trở lại.',
    duration: 12, slots: [4, 16],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 28, min: 12, max: 46, step: 1, unit: '%' },
      { id: 'throwHeight', label: 'Độ cao tung', type: 'number', default: 72, min: 30, max: 95, step: 1, unit: '%' },
      { id: 'spread', label: 'Độ toả ngang', type: 'number', default: 72, min: 0, max: 100, step: 1, unit: '%' },
      { id: 'spin', label: 'Độ xoay', type: 'number', default: 16, min: 0, max: 60, step: 1, unit: '°' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '4:5', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const base = u * p.cardSize;
      const lift = (p.throwHeight / 100) * h;
      const spread = p.spread / 100;
      const spin = (p.spin * Math.PI) / 180;
      const items = [];
      for (let i = 0; i < n; i++) {
        const ph = fract(t + i / n);              // 0 = vừa rời tay, 1 = đã nằm dưới đất
        const flight = H.clamp01(ph / 0.58);      // chỉ 58% vòng là đang bay → thưa thẻ
        const arc = 4 * flight * (1 - flight);    // parabol: 0 → 1 → 0
        const s = (0.82 + 0.3 * H.hash(i, 2)) * (0.93 + 0.13 * arc);
        const sway = Math.sin((flight + H.hash(i, 6)) * Math.PI * 2) * u * 2.2 * (H.hash(i, 7) - 0.5);
        const x = w / 2 + (H.hash(i, 3) - 0.5) * w * spread * (0.45 + 0.55 * arc) + sway;
        const y = h * 1.06 - arc * lift;
        const rot = (H.hash(i, 4) - 0.5) * spin * (0.35 + arc) + flight * (H.hash(i, 5) - 0.5) * 0.6;
        items.push({ i, x, y, s, rot, ph });
      }
      items.sort((a, b) => b.ph - a.ph);          // lá sắp rơi vẽ trước, lá mới tung nằm trên
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        const cw = base * it.s, ch = cw / ar;
        H.card(ctx, imgs[it.i % n], it.x - cw / 2, it.y - ch / 2, cw, ch, u * 2.2,
          { rot: it.rot, shadow: 22 * it.s, alpha: H.clamp01(0.45 + it.ph * 4) });
      }
    }
  });

  /* ---------------------------------------------------------------- Cascade Deck */
  ML.register({
    id: 'cascade-deck', name: 'Cascade Deck', vn: 'Bài xoè chéo', group: 'scene',
    desc: 'Chồng bài ở tâm lần lượt trượt ra thành bộ bài chéo, lật mặt rồi xếp lại.',
    duration: 9, slots: [3, 12],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 42, min: 18, max: 70, step: 1, unit: '%' },
      { id: 'spread', label: 'Độ xoè', type: 'number', default: 78, min: 10, max: 100, step: 1, unit: '%' },
      { id: 'tilt', label: 'Nghiêng bộ bài', type: 'number', default: 10, min: -30, max: 30, step: 1, unit: '°' },
      { id: 'flip', label: 'Độ lật', type: 'number', default: 55, min: 0, max: 100, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize, ch = cw / ar;
      const sp = p.spread / 100;
      const tilt = (p.tilt * Math.PI) / 180;
      const flip = p.flip / 100;
      const list = [];
      for (let i = 0; i < n; i++) {
        const s = n > 1 ? i / (n - 1) - 0.5 : 0;                  // -0.5 .. 0.5 dọc bộ bài
        const k = H.pulse(fract(t + i / n), 0.3, 0.3);            // xoè theo làn sóng
        const yawPhase = 2 * Math.PI * t + i * 0.9;                // tuần hoàn theo t
        const sx = 1 - flip * (0.5 - 0.5 * Math.abs(Math.cos(yawPhase)));  // bẹp ngang = lật
        const x = w / 2 + s * w * 0.62 * sp * k;
        const y = h / 2 + s * h * 0.42 * sp * k;
        const rot = tilt * (0.25 + 0.75 * k) + s * 0.12 * k;
        list.push({ i, x, y, sx, rot, s });
      }
      list.sort((a, b) => a.s - b.s);            // phía sau bên trái vẽ trước
      for (let j = 0; j < list.length; j++) {
        const it = list[j];
        const cw2 = Math.max(1, cw * it.sx);
        H.card(ctx, imgs[it.i % n], it.x - cw2 / 2, it.y - ch / 2, cw2, ch, u * 2,
          { rot: it.rot, shadow: 18, brightness: -0.22 * (1 - it.sx) });
      }
    }
  });

  /* ---------------------------------------------------------------- Cascade Drop */
  ML.register({
    id: 'cascade-drop', name: 'Cascade Drop', vn: 'Rơi chồng', group: 'scene',
    desc: 'Thẻ rơi lộn xộn xuống thành chồng lỏng rồi bị quét khỏi khung hình.',
    duration: 10, slots: [3, 12],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 44, min: 18, max: 72, step: 1, unit: '%' },
      { id: 'scatter', label: 'Độ lộn xộn', type: 'number', default: 55, min: 0, max: 100, step: 1, unit: '%' },
      { id: 'rotation', label: 'Độ xoay', type: 'number', default: 110, min: 0, max: 200, step: 5, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize, ch = cw / ar;
      const spin = (p.rotation / 100) * 1.5;
      const spreadX = w * 0.5 * (p.scatter / 100);
      const list = [];
      for (let i = 0; i < n; i++) {
        const ph = fract(t + i / n);
        const fall = H.clamp01(ph / 0.45);
        const drop = H.easeIn(fall);                       // rơi nhanh dần
        const sweep = H.smooth(H.q(ph, 0.78, 1));          // bị quét sang phải
        const pileY = h * 0.62 + (H.hash(i, 2) - 0.5) * h * 0.13;
        const pileX = w / 2 + (H.hash(i, 3) - 0.5) * spreadX * 1.15
          + (i - (n - 1) / 2) * u * 0.6;
        const y = H.lerp(-h * 0.55, pileY, drop) + sweep * h * 0.1;
        const x = pileX + sweep * w * 1.25 + (H.hash(i, 4) - 0.5) * u * 6 * (1 - drop);
        const rot = (H.hash(i, 5) - 0.5) * spin * (1 - drop * 0.65)
          + sweep * (H.hash(i, 6) - 0.3) * 1.4;
        list.push({ i, x, y, rot, ph, sweep });
      }
      list.sort((a, b) => a.ph - b.ph);          // lá rơi trước nằm dưới chồng
      for (let j = 0; j < list.length; j++) {
        const it = list[j];
        H.card(ctx, imgs[it.i % n], it.x - cw / 2, it.y - ch / 2, cw, ch, u * 2,
          { rot: it.rot, shadow: 20, alpha: H.clamp01(1 - it.sweep * 1.15) });
      }
    }
  });

  /* ----------------------------------------------------------------- Spread Rows */
  ML.register({
    id: 'spread-rows', name: 'Spread Rows', vn: 'Xoè hàng', group: 'grid',
    desc: 'Các hàng thẻ tách khỏi chồng giữa, trôi ngang nhẹ rồi khép lại thành một chồng.',
    duration: 8, slots: [3, 24],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 24, min: 8, max: 45, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 2, min: 0, max: 8, step: 0.5, unit: '%' },
      { id: 'rowCount', label: 'Số hàng', type: 'number', default: 3, min: 1, max: 5, step: 1 },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '16:9', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const rows = Math.max(1, Math.round(p.rowCount));
      const cols = Math.ceil(n / rows);
      let cw = u * p.cardSize, ch = cw / ar, gap = p.gap * u;

      // thu vừa khung để n lớn vẫn không tràn
      const totalW = cols * cw + (cols - 1) * gap;
      const totalH = rows * ch + (rows - 1) * gap;
      const fit = Math.min(1, (w * 0.9) / totalW, (h * 0.9) / totalH);
      cw *= fit; ch *= fit; gap *= fit;

      const k = H.pulse(t, 0.3, 0.3);                  // 0 ở hai đầu vòng lặp
      const drift = Math.sin(t * Math.PI * 2) * u * 2.4 * Math.min(1, fit * 1.4);
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols), col = i % cols;
        const rowK = H.stagger(k, r, rows, 0.6);       // hàng tách ra theo nhịp lệch
        const colK = H.stagger(k, col, cols, 0.55);    // rồi mới bung ngang
        const f = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;       // -1..1: độ lệch trong chồng
        const tx = w / 2 + (col - (cols - 1) / 2) * (cw + gap);
        const ty = h / 2 + (r - (rows - 1) / 2) * (ch + gap);
        const sx = w / 2 + f * u * 9;                      // chồng là một quạt mảnh
        const sy = h / 2 - f * u * 10;
        const x = H.lerp(sx, tx, colK) + drift * colK * (r % 2 ? 1 : -1);
        const y = H.lerp(sy, ty, rowK);
        const rot = H.lerp(f * 0.06, drift * 0.006 * (r % 2 ? 1 : -1), rowK);
        const s = H.lerp(1.5, 1, Math.max(rowK, colK));   // còn chồng thì thẻ to hơn
        H.card(ctx, imgs[i % n], x - (cw * s) / 2, y - (ch * s) / 2, cw * s, ch * s, u * 2,
          { rot, shadow: 10 + 16 * rowK, alpha: 0.62 + 0.38 * rowK });
      }
    }
  });

  /* -------------------------------------------------------------- Spread Columns */
  ML.register({
    id: 'spread-columns', name: 'Spread Columns', vn: 'Xoè cột', group: 'grid',
    desc: 'Các cột thẻ bung ra khỏi chồng giữa theo chiều dọc, nhấp nhô rồi dồn lại.',
    duration: 8, slots: [3, 24],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 26, min: 8, max: 45, step: 1, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 2, min: 0, max: 8, step: 0.5, unit: '%' },
      { id: 'colCount', label: 'Số cột', type: 'number', default: 3, min: 1, max: 5, step: 1 },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '4:5', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cols = Math.max(1, Math.round(p.colCount));
      const rows = Math.ceil(n / cols);
      let cw = u * p.cardSize, ch = cw / ar, gap = p.gap * u;

      const totalW = cols * cw + (cols - 1) * gap;
      const totalH = rows * ch + (rows - 1) * gap;
      const fit = Math.min(1, (w * 0.9) / totalW, (h * 0.9) / totalH);
      cw *= fit; ch *= fit; gap *= fit;

      // nhịp khác hẳn spread-rows: bung nhanh có vượt biên rồi khép chậm
      const raw = H.pulse(H.q(t, 0.02, 0.98), 0.18, 0.42);
      const k = H.back(raw, 1.5);
      const bob = Math.cos(t * Math.PI * 2) * u * 2.6;
      for (let i = 0; i < n; i++) {
        const col = Math.floor(i / rows), r = i % rows;   // xếp theo cột
        const colK = H.stagger(k, cols - 1 - col, cols, 0.5);   // cột phải bung trước
        const rowK = H.stagger(k, r, rows, 0.55);
        const f = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;        // -1..1: độ lệch trong chồng
        const tx = w / 2 + (col - (cols - 1) / 2) * (cw + gap);
        const ty = h / 2 + (r - (rows - 1) / 2) * (ch + gap);
        const sx = w / 2 - f * u * 10;                      // chồng quạt theo chiều dọc
        const sy = h / 2 + f * u * 11;
        const x = H.lerp(sx, tx, colK);
        const y = H.lerp(sy, ty, rowK) + bob * colK * (col % 2 ? 1 : -1);
        const rot = H.lerp(-f * 0.05, (col % 2 ? 1 : -1) * 0.05, colK);
        const s = H.lerp(1.5, 1, Math.max(colK, rowK));   // còn chồng thì thẻ to hơn
        H.card(ctx, imgs[i % n], x - (cw * s) / 2, y - (ch * s) / 2, cw * s, ch * s, u * 2,
          { rot, shadow: 10 + 16 * colK, alpha: 0.62 + 0.38 * colK });
      }
    }
  });

  /* ----------------------------------------------------------------- Poster Burst */
  ML.register({
    id: 'poster-burst', name: 'Poster Burst', vn: 'Bung áp phích', group: 'scene',
    desc: 'Áp phích bung từ tâm, lớn dần tới khi phủ kín tấm ảnh trước rồi nhường lượt.',
    duration: 12, slots: [2, 10],
    params: [
      { id: 'startSize', label: 'Cỡ lúc bung', type: 'number', default: 8, min: 2, max: 35, step: 1, unit: '%' },
      { id: 'hold', label: 'Giữ ảnh', type: 'number', default: 30, min: 0, max: 70, step: 5, unit: '%' },
      { id: 'tilt', label: 'Độ nghiêng', type: 'number', default: 7, min: 0, max: 25, step: 1, unit: '°' },
      { id: 'cardAspect', label: 'Tỉ lệ ảnh', type: 'select', default: '1:1', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      // phóng đủ lớn để phủ kín khung ở mọi tỉ lệ
      const bw = Math.max(w, h * ar) * 1.04, bh = bw / ar;
      const step = t * n;
      const beat = Math.floor(step);
      const local = step - beat;
      const cur = beat % n;
      const prev = (cur - 1 + n) % n;
      const hold = p.hold / 100;
      const grow = H.q(local, 0, Math.max(0.15, 1 - hold));
      const tilt = (p.tilt * Math.PI) / 180;

      // ảnh nền: ảnh vừa bị phủ, vẫn đứng yên làm nền cho ảnh mới
      H.card(ctx, imgs[prev % n], w / 2 - bw / 2, h / 2 - bh / 2, bw, bh, u * 2,
        { rot: (H.hash(prev, 3) - 0.5) * tilt, shadow: 18, brightness: -0.12 });

      // ảnh mới: bung từ tâm, xoay khi còn nhỏ rồi thẳng lại đúng lúc phủ kín
      const sc = H.lerp(p.startSize / 100, 1, H.easeOutQuint(grow));
      const rot = (H.hash(cur, 4) - 0.5) * tilt * 2 * (1 - grow);
      H.card(ctx, imgs[cur % n], w / 2 - (bw * sc) / 2, h / 2 - (bh * sc) / 2, bw * sc, bh * sc, u * 2.4,
        { rot, shadow: 14 + 26 * sc, alpha: H.clamp01(grow * 2.2) });
    }
  });

  /* ------------------------------------------------------------------ Scatter Dial */
  ML.register({
    id: 'scatter-dial', name: 'Scatter Dial', vn: 'Mặt đồng hồ', group: 'scene',
    desc: 'Thẻ rải rác tụ thành vòng, chìm xuống mép dưới và nhích vòng quanh như mặt đồng hồ.',
    duration: 18, slots: [5, 12],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 16, min: 6, max: 30, step: 1, unit: '%' },
      { id: 'ringSize', label: 'Bán kính vòng', type: 'number', default: 36, min: 15, max: 50, step: 1, unit: '%' },
      { id: 'scatter', label: 'Độ rải', type: 'number', default: 78, min: 10, max: 100, step: 1, unit: '%' },
      { id: 'turns', label: 'Vòng quay', type: 'number', default: 1, min: 0, max: 3, step: 1 },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '16:9', options: ASPECT }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = u * p.cardSize, ch = cw / ar;
      const R = Math.min(w, h) * (p.ringSize / 100);
      const spreadX = w * (p.scatter / 100), spreadY = h * (p.scatter / 100);
      const gather = H.pulse(t, 0.24, 0.26);                     // 0 ở hai đầu
      const sink = H.pulse(H.q(t, 0.14, 0.94), 0.4, 0.4);
      const turns = Math.round(p.turns);
      const ringCy = h / 2 + sink * h * 0.45;                     // tâm vòng chìm dần

      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + t * Math.PI * 2 * turns;
        const rx = w / 2 + Math.cos(a) * R;
        const ry = ringCy + Math.sin(a) * R * 0.52;
        const bx = w / 2 + (H.hash(i, 2) - 0.5) * spreadX;
        const by = h / 2 + (H.hash(i, 3) - 0.5) * spreadY;
        const x = H.lerp(bx, rx, gather);
        const y = H.lerp(by, ry, gather);
        // xếp như vạch đồng hồ: thẻ quay theo tiếp tuyến của vòng elip
        const tanA = Math.atan2(Math.cos(a) * R * 0.52, -Math.sin(a) * R);
        const rot = H.lerp((H.hash(i, 5) - 0.5) * 1.2, tanA, gather);
        H.card(ctx, imgs[i % n], x - cw / 2, y - ch / 2, cw, ch, u * 2,
          { rot, shadow: 14, alpha: 0.92 });
      }
    }
  });
})();
