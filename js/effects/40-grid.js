/* =============================================================================
   40 · Nhóm lưới / tường / isometric
   grid-dive · grid-zoom-strip · flip-grid · pop-parade · stairway
   iso-cascade · iso-focus · iso-orbit · position-dance
   ========================================================================== */
(function () {
  'use strict';
  const H = ML.h;

  /** hệ trục isometric: dời về tâm cảnh rồi shear dọc (trục x nghiêng xuống) */
  function isoScene(ctx, cx, cy, shearY, fn) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.transform(1, shearY, 0, 1, 0, 0);
    fn();
    ctx.restore();
  }

  /** rect đã ra ngoài khung vẽ (kèm lề an toàn) */
  function outside(x, y, bw, bh, W, Hh, pad) {
    pad = pad || 0;
    return x + bw < -pad || x > W + pad || y + bh < -pad || y > Hh + pad;
  }

  const ASPECTS = [
    { value: '1:1', label: 'Vuông' },
    { value: '16:9', label: 'Ngang' },
    { value: '4:5', label: 'Dọc' }
  ];

  /* --------------------------------------------------------------- Grid Dive */
  ML.register({
    id: 'grid-dive', name: 'Grid Dive', vn: 'Lao vào tường', group: 'grid',
    desc: 'Camera lao dọc bức tường ô, các hàng trượt như xếp hình rồi vỡ tung khi camera xuyên qua.',
    duration: 14, slots: [5, 24],
    params: [
      { id: 'tileSize', label: 'Cỡ ô', type: 'number', default: 40, min: 18, max: 90, step: 2, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 6, min: 0, max: 18, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ ô', type: 'select', default: '1:1', options: ASPECTS },
      { id: 'cameraZoom', label: 'Độ lao', type: 'number', default: 100, min: 30, max: 180, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cols = Math.max(2, Math.min(n, Math.round(Math.sqrt(n * (w / h)))));
      const rows = Math.ceil(n / cols);

      // dựng tường ô, thu vừa khung ở trạng thái đầu để mở cảnh bằng toàn mặt lưới
      let tw = u * p.tileSize;
      let th = tw / ar;
      let gap = p.gap * u;
      const rawW = cols * tw + (cols - 1) * gap;
      const rawH = rows * th + (rows - 1) * gap;
      const fit = Math.min(1.7, (w * 0.96) / rawW, (h * 0.96) / rawH);
      tw *= fit; th *= fit; gap *= fit;

      const totalW = cols * tw + (cols - 1) * gap;
      const totalH = rows * th + (rows - 1) * gap;
      const ox = w / 2 - totalW / 2 + tw / 2;
      const oy = h / 2 - totalH / 2 + th / 2;
      const pitchX = tw + gap, pitchY = th + gap;

      // camera: bước qua từng hàng ô rồi lùi về chỗ cũ
      const push = H.steps(H.q(t, 0, 0.74), Math.max(1, rows - 1));
      const rowFocus = push.i + H.smooth(H.q(push.local, 0.45, 1));
      const dive = H.pulse(t, 0.6, 0.32);
      const zoom = 1 + (p.cameraZoom / 100) * 1.6 * dive;
      const camY = (rowFocus - (rows - 1) / 2) * pitchY * dive;
      // mảnh vỡ: nở ra rồi tắt hẳn trước khi vòng lặp quay lại
      const burst = H.pulse(H.q(t, 0.72, 1), 0.42, 0.58);

      for (let r = 0; r < rows; r++) {
        const slide = Math.sin(t * Math.PI * 2 + r * 0.9) * pitchX * 0.22 * dive;
        for (let k = 0; k < cols; k++) {
          const idx = r * cols + k;
          if (idx >= n) break;
          const wx = ox + k * pitchX + slide;
          const wy = oy + r * pitchY;
          // độ sâu chỉ có ý nghĩa khi camera đã lao vào (dive=0 ở hai đầu vòng lặp)
          const depth = Math.abs(r - rowFocus) * dive;
          const per = 1 / (1 + Math.max(0, depth - 1) * 0.1);
          let s = zoom * per;
          let sx = w / 2 + (wx - w / 2) * s;
          let sy = h / 2 + (wy - h / 2 - camY) * s;
          if (burst > 0.002) {
            const ang = H.hash(idx, 3) * Math.PI * 2;
            const reach = (0.12 + H.hash(idx, 8) * 0.55) * Math.max(w, h) * burst;
            sx += Math.cos(ang) * reach;
            sy += Math.sin(ang) * reach * 0.8 - burst * h * 0.35 * (0.4 + H.hash(idx, 5));
            s *= 1 + burst * 0.55;
          }
          const dw = tw * s, dh = th * s;
          if (outside(sx - dw / 2, sy - dh / 2, dw, dh, w, h, 6)) continue;
          const alpha = H.clamp01(1 - Math.max(0, depth - 1.1) * 0.09) * H.clamp01(1 - burst * 0.75);
          if (alpha < 0.02) continue;
          H.card(ctx, H.pick(imgs, idx), sx - dw / 2, sy - dh / 2, dw, dh,
            u * 2 * Math.min(1.6, Math.max(0.5, s)), {
              alpha: alpha,
              shadow: 16 * Math.min(1, s) * (1 - burst),
              rot: burst * (H.hash(idx, 11) - 0.5) * 1.2
            });
        }
      }
    }
  });

  /* ---------------------------------------------------------- Grid Zoom Strip */
  ML.register({
    id: 'grid-zoom-strip', name: 'Grid Zoom Strip', vn: 'Zoom dải lưới', group: 'grid',
    desc: 'Lưới 3×3 phóng vào một dải rồi trượt qua từng thẻ trước khi thu về toàn cảnh.',
    duration: 14, slots: [4, 12],
    params: [
      { id: 'zoom', label: 'Độ zoom', type: 'number', default: 190, min: 120, max: 320, step: 5, unit: '%' },
      { id: 'gridGap', label: 'Khe lưới', type: 'number', default: 2, min: 0, max: 10, step: 1, unit: '%' },
      {
        id: 'direction', label: 'Hướng trượt', type: 'select', default: 'horizontal',
        options: [{ value: 'horizontal', label: 'Ngang' }, { value: 'vertical', label: 'Dọc' }]
      },
      { id: 'hold', label: 'Nhịp dừng', type: 'number', default: 45, min: 0, max: 80, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs } = c;
      const COLS = 3, ROWS = 3;
      const gap = p.gridGap * u;
      const cw = (w - gap * (COLS + 1)) / COLS;
      const ch = (h - gap * (ROWS + 1)) / ROWS;
      const cellX = (i) => gap + (i % COLS) * (cw + gap);
      const cellY = (i) => gap + ((i / COLS) | 0) * (ch + gap);

      // một hệ số scale + một điểm nhìn dùng chung cho cả cảnh
      const zoomIn = H.easeInOut(H.q(t, 0.02, 0.26));
      const zoomOut = H.easeInOut(H.q(t, 0.78, 0.98));
      const camK = zoomIn * (1 - zoomOut);
      const seg = H.steps(H.q(t, 0.26, 0.78), 2);
      const slide = H.clamp(seg.i + H.smooth(H.q(seg.local, p.hold / 100, 1)), 0, 2);

      const vert = p.direction === 'vertical';
      const strip = vert ? [1, 4, 7] : [3, 4, 5];
      const a0 = strip[0], a2 = strip[2];
      const x0 = cellX(a0) + cw / 2, x2 = cellX(a2) + cw / 2;
      const y0 = cellY(a0) + ch / 2, y2 = cellY(a2) + ch / 2;
      const tx = vert ? w / 2 : H.lerp(x0, x2, slide / 2);
      const ty = vert ? H.lerp(y0, y2, slide / 2) : h / 2;
      const camX = H.lerp(w / 2, tx, camK);
      const camY = H.lerp(h / 2, ty, camK);
      const S = 1 + (p.zoom / 100 - 1) * camK;
      const focusIdx = strip[Math.round(slide)];

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(S, S);
      ctx.translate(-camX, -camY);

      for (let i = 0; i < 9; i++) {
        if (i === focusIdx) continue;
        const onStrip = strip.indexOf(i) >= 0;
        H.card(ctx, H.pick(imgs, i), cellX(i), cellY(i), cw, ch, u * 2, {
          alpha: onStrip ? 1 : 1 - 0.55 * camK,
          shadow: 8 + 18 * camK,
          edge: onStrip || camK < 0.5
        });
      }
      H.card(ctx, H.pick(imgs, focusIdx), cellX(focusIdx), cellY(focusIdx), cw, ch, u * 2,
        { shadow: 8 + 18 * camK });

      ctx.restore();
    }
  });

  /* ---------------------------------------------------------------- Flip Grid */
  ML.register({
    id: 'flip-grid', name: 'Flip Grid', vn: 'Lưới lật ô', group: 'grid',
    desc: 'Từng ô bẹp ngang rồi mở ra bằng ảnh thứ hai, gợn lật lan dần qua lưới.',
    duration: 10, slots: [4, 16],
    params: [
      { id: 'gap', label: 'Khe hở', type: 'number', default: 3, min: 0, max: 12, step: 1, unit: '%' },
      {
        id: 'axis', label: 'Trục lật', type: 'select', default: 'horizontal',
        options: [{ value: 'horizontal', label: 'Ngang' }, { value: 'vertical', label: 'Dọc' }]
      },
      {
        id: 'wave', label: 'Gợn lan', type: 'select', default: 'column',
        options: [{ value: 'column', label: 'Theo cột' }, { value: 'row', label: 'Theo hàng' }, { value: 'diag', label: 'Chéo' }]
      },
      { id: 'flipTime', label: 'Nhịp lật', type: 'number', default: 16, min: 6, max: 30, step: 1, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const cols = Math.max(2, Math.round(Math.sqrt(n * (w / h))));
      const rects = H.grid(n, w, h, p.gap * u, cols);
      const FL = p.flipTime / 100;
      const vert = p.axis === 'vertical';
      const half = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) {
        const col = i % cols, row = (i / cols) | 0;
        let off;
        if (p.wave === 'row') off = row * 0.17;
        else if (p.wave === 'diag') off = (col + row) * 0.12;
        else off = col * 0.17;
        const m = (((t - off) % 1) + 1) % 1;
        // 0..FL: lật sang ảnh B · 0.5..0.5+FL: lật về ảnh A
        let sq = 1, second = false;
        if (m < FL) {
          const e = H.easeInOut(m / FL);
          sq = Math.abs(Math.cos(Math.PI * e));
          second = e >= 0.5;
        } else if (m < 0.5) {
          second = true;
        } else if (m < 0.5 + FL) {
          const e = H.easeInOut((m - 0.5) / FL);
          sq = Math.abs(Math.cos(Math.PI * e));
          second = e < 0.5;
        }
        const r = rects[i];
        const bw = vert ? r[2] : Math.max(0.8, r[2] * sq);
        const bh = vert ? Math.max(0.8, r[3] * sq) : r[3];
        H.card(ctx, H.pick(imgs, second ? i + half : i),
          r[0] + (r[2] - bw) / 2, r[1] + (r[3] - bh) / 2, bw, bh, u * 2, {
            brightness: -(1 - sq) * 0.34,
            shadow: 12 * sq,
            edge: sq > 0.35
          });
      }
    }
  });

  /* --------------------------------------------------------------- Pop Parade */
  ML.register({
    id: 'pop-parade', name: 'Pop Parade', vn: 'Diễu hành bật', group: 'grid',
    desc: 'Thẻ bật ra xếp chồng ở tâm, xoè thành hàng quét đi, rồi đợt hai bật lên trôi ngang.',
    duration: 13, slots: [4, 20],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 44, min: 18, max: 80, step: 2, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: ASPECTS },
      { id: 'overlap', label: 'Chồng lấp', type: 'number', default: 55, min: 0, max: 92, step: 2, unit: '%' },
      { id: 'sweep', label: 'Quãng quét', type: 'number', default: 85, min: 40, max: 140, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = Math.min(u * p.cardSize, w * 0.7, h * 0.7 * ar);
      const ch = cw / ar;
      const cx = w / 2, cy = h / 2;
      const mid = (n - 1) / 2;
      const stackX = (i) => cx + (i - mid) * u * 1.5;
      const stackY = (i) => cy - (i - mid) * u * 1.15;
      const seg = H.steps(t, 3);

      if (seg.i === 0) {
        // 1 · bật ra, xếp chồng ở tâm
        const k = H.easeOut(seg.local);
        for (let i = 0; i < n; i++) {
          const a = Math.max(0.24, H.stagger(k, i, n, 0.75));
          const sc = Math.max(0.02, H.back(a, 2.1));
          H.card(ctx, H.pick(imgs, i), stackX(i) - (cw * sc) / 2, stackY(i) - (ch * sc) / 2,
            cw * sc, ch * sc, u * 2, {
              alpha: H.clamp01(0.55 + 0.5 * a),
              rot: (i - mid) * 0.035,
              shadow: 18 * Math.min(1, sc)
            });
        }
      } else if (seg.i === 1) {
        // 2 · xoè thành hàng rồi cả hàng quét đi, mờ hẳn đúng nhịp chuyển cảnh
        const k = H.easeInOut(H.q(seg.local, 0, 0.42));
        const sweep = H.easeInOut(H.q(seg.local, 0.5, 1));
        const pitch = Math.min(cw * (1 - p.overlap / 100), n > 1 ? (w - cw) / (n - 1) : 0);
        for (let i = 0; i < n; i++) {
          const off = i - mid;
          const rx = cx + off * pitch;
          const ry = cy + Math.sin(i * 0.7) * u * 4;
          const x = H.lerp(stackX(i), rx, k) + sweep * w * 0.12;
          const y = H.lerp(stackY(i), ry, k) - sweep * (p.sweep / 100) * h * 0.6;
          H.card(ctx, H.pick(imgs, i), x - cw / 2, y - ch / 2, cw, ch, u * 2, {
            alpha: 0.16 + 0.84 * (1 - H.q(sweep, 0.62, 1)),
            rot: H.lerp((i - mid) * 0.035, off * 0.012, k) + sweep * 0.2,
            shadow: 16
          });
        }
      } else {
        // 3 · đợt hai bật lên ngay đầu cảnh rồi trôi ngang, tắt dần trước khi khép vòng
        const pop = H.easeOut(H.q(seg.local, 0, 0.2));
        const drift = H.q(seg.local, 0.18, 1);
        for (let i = 0; i < n; i++) {
          const a = Math.max(0.2, H.stagger(pop, i, n, 0.72));
          const sc = Math.max(0.02, H.back(a, 1.9)) * (1 - drift * 0.15);
          const dir = i % 2 ? 1 : -1;
          const x = cx + dir * drift * w * (0.22 + H.hash(i, 2) * 0.5) + (i - mid) * u * 1.4 * (1 - drift);
          const y = cy + (H.hash(i, 7) - 0.5) * h * 0.35 * drift + (i - mid) * u * 0.9 * (1 - drift);
          H.card(ctx, H.pick(imgs, i + Math.ceil(n / 2)), x - (cw * sc) / 2, y - (ch * sc) / 2,
            cw * sc, ch * sc, u * 2, {
              alpha: H.clamp01(0.5 + 0.5 * a) * H.clamp01(1 - drift * 1.1),
              rot: dir * drift * 0.25,
              shadow: 16 * Math.min(1, sc)
            });
        }
      }
    }
  });

  /* ----------------------------------------------------------------- Stairway */
  ML.register({
    id: 'stairway', name: 'Stairway', vn: 'Bậc thang chéo', group: 'grid',
    desc: 'Lưới ba cột gấp thành bậc thang chéo, camera bước xuống từng ô rồi trở lại.',
    duration: 15, slots: [4, 18],
    params: [
      { id: 'tileSize', label: 'Cỡ ô', type: 'number', default: 100, min: 50, max: 130, step: 5, unit: '%' },
      { id: 'gap', label: 'Khe hở', type: 'number', default: 14, min: 0, max: 30, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ ô', type: 'select', default: '1:1', options: ASPECTS },
      { id: 'drop', label: 'Độ dốc', type: 'number', default: 55, min: 0, max: 100, step: 5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const ar = H.aspect(p.cardAspect, w, h);
      const cols = 3;
      const rows = Math.ceil(n / cols);
      const gap = Math.min(p.gap * u * 0.45, Math.min(w / cols, h / rows) * 0.32);
      const availW = (w - gap * (cols - 1)) / cols;
      const availH = (h - gap * (rows - 1)) / rows;
      const tw = Math.min(availW, availH * ar) * (p.tileSize / 100);
      const th = tw / ar;
      const pitchX = tw + gap, pitchY = th + gap;
      const totalW = cols * tw + (cols - 1) * gap;
      const totalH = rows * th + (rows - 1) * gap;
      const baseX = w / 2 - totalW / 2 + tw / 2;
      const baseY = h / 2 - totalH / 2 + th / 2;

      // gấp thành bậc thang rồi mở ra; camera bước xuống rồi về chỗ cũ
      const fold = H.pulse(t, 0.32, 0.36);
      const walk = H.pulse(t, 0.4, 0.34);
      const seg = H.steps(H.q(t, 0.12, 0.86), Math.max(1, rows - 1));
      const pos = seg.i + H.smooth(H.q(seg.local, 0.5, 1));
      const S = 1 + 0.34 * walk;
      const camY = (pos - (rows - 1) / 2) * pitchY * walk;
      const drop = (p.drop / 100) * 1.5;

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(S, S);
      ctx.translate(-w / 2, -h / 2 - camY);
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < cols; k++) {
          const idx = r * cols + k;
          if (idx >= n) break;
          const st = k - 1;
          const x = baseX + k * pitchX + st * pitchX * 0.16 * fold;
          const y = baseY + r * pitchY + st * (th + gap * 0.5) * drop * fold;
          if (Math.abs(y + camY - h / 2) > h / S + th) continue;
          if (x + tw / 2 < -u * 12 || x - tw / 2 > w + u * 12) continue;
          if (fold > 0.02) {
            // mặt bậc phía dưới, tạo cảm giác khối dày
            ctx.fillStyle = 'rgba(8,11,18,' + (0.45 * fold).toFixed(3) + ')';
            H.roundRect(ctx, x - tw / 2 + u * 1.2 * fold, y - th / 2 + u * 5 * fold, tw, th, u * 2);
            ctx.fill();
          }
          H.card(ctx, H.pick(imgs, idx), x - tw / 2, y - th / 2, tw, th, u * 2, {
            rot: st * 0.045 * fold,
            shadow: 8 + 16 * fold,
            brightness: -0.12 * fold * Math.abs(st)
          });
        }
      }
      ctx.restore();
    }
  });

  /* -------------------------------------------------------------- Iso Cascade */
  ML.register({
    id: 'iso-cascade', name: 'Iso Cascade', vn: 'Dải isometric', group: 'grid',
    desc: 'Dải thẻ isometric chạy chéo như băng chuyền nghiêng, thẻ nối tiếp nhau trượt qua khung.',
    duration: 12, slots: [3, 20],
    params: [
      { id: 'size', label: 'Cỡ thẻ', type: 'number', default: 42, min: 15, max: 70, step: 1, unit: '%' },
      { id: 'skew', label: 'Độ nghiêng', type: 'number', default: 55, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'spacing', label: 'Khoảng cách', type: 'number', default: 20, min: 0, max: 90, step: 2, unit: '%' },
      {
        id: 'direction', label: 'Chiều', type: 'select', default: 'up',
        options: [{ value: 'up', label: 'Lên phải' }, { value: 'down', label: 'Xuống phải' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const sz = u * p.size;
      const shearY = (p.skew / 100) * 1.1;
      const pitch = sz * (0.62 + p.spacing / 100);
      const diag = Math.hypot(w, h);
      const band = Math.max(n * pitch, diag * 1.7);
      const count = Math.max(n, Math.ceil(band / pitch));
      const shift = t * band;
      const dirY = p.direction === 'down' ? 1 : -1;
      const cosA = Math.SQRT1_2, sinA = Math.SQRT1_2 * dirY;
      const half = sz * 0.72;

      const items = [];
      for (let k = 0; k < count; k++) {
        const along = ((((k * pitch + shift) % band) + band) % band) - band / 2;
        if (Math.abs(along) > diag * 0.62 + sz) continue;
        items.push({ k: k, along: along });
      }
      items.sort((a, b) => a.along - b.along);

      isoScene(ctx, w / 2, h / 2, shearY, () => {
        for (let j = 0; j < items.length; j++) {
          const it = items[j];
          const x = it.along * cosA;
          const y = it.along * sinA;
          H.card(ctx, H.pick(imgs, it.k), x - half, y - half, half * 2, half * 2, u * 2,
            { shadow: 16 });
        }
      });
    }
  });

  /* ----------------------------------------------------------------- Iso Focus */
  ML.register({
    id: 'iso-focus', name: 'Iso Focus', vn: 'Chồng isometric', group: 'grid',
    desc: 'Các chồng thẻ isometric bước qua vầng sáng ở tâm, chồng đứng giữa phóng to và bừng sáng.',
    duration: 12, slots: [3, 18],
    params: [
      { id: 'size', label: 'Cỡ thẻ', type: 'number', default: 40, min: 12, max: 60, step: 1, unit: '%' },
      { id: 'skew', label: 'Độ nghiêng', type: 'number', default: 30, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'spacing', label: 'Khoảng cách', type: 'number', default: 20, min: 0, max: 90, step: 5, unit: '%' },
      { id: 'centerScale', label: 'Phóng tâm', type: 'number', default: 130, min: 100, max: 180, step: 5, unit: '%' },
      {
        id: 'direction', label: 'Chiều', type: 'select', default: 'down',
        options: [{ value: 'down', label: 'Xuống phải' }, { value: 'up', label: 'Lên phải' }]
      }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n } = c;
      const sz = u * p.size;
      const shearY = p.skew / 100;
      const pitch = sz * (0.8 + p.spacing / 100);
      const seg = H.steps(t, Math.max(3, n));
      const pos = seg.i + H.smooth(H.q(seg.local, 0.38, 1));
      const gapPush = pitch * 0.55;
      const centerScale = p.centerScale / 100;
      const reach = Math.ceil((Math.hypot(w, h) * 0.62) / pitch) + 2;
      const dirY = p.direction === 'up' ? -1 : 1;
      const cosA = Math.SQRT1_2, sinA = Math.SQRT1_2 * dirY;
      const layers = n > 18 ? 2 : 3;

      // vầng sáng tâm (chỉ là ánh sáng, không phải nền đặc)
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, u * 50);
      g.addColorStop(0, 'rgba(150,205,255,0.30)');
      g.addColorStop(0.45, 'rgba(120,175,255,0.10)');
      g.addColorStop(1, 'rgba(120,175,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const list = [];
      for (let i = 0; i < n; i++) {
        let d = i - pos;
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
        if (Math.abs(d) > reach) continue;
        list.push({ i: i, d: d });
      }
      // chồng xa vẽ trước, chồng gần tâm vẽ sau
      list.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));

      isoScene(ctx, w / 2, h / 2, shearY, () => {
        for (let j = 0; j < list.length; j++) {
          const it = list[j];
          const lit = Math.max(0, 1 - Math.abs(it.d));
          const sc = 1 + (centerScale - 1) * lit;
          const along = it.d * pitch + (it.d > 0 ? 1 : it.d < 0 ? -1 : 0) * Math.min(1, Math.abs(it.d)) * gapPush;
          const x = along * cosA;
          const y = along * sinA;
          for (let L = layers - 1; L >= 0; L--) {
            const off = L * u * 1.5;
            const sL = sc * (1 - L * 0.07);
            const side = sz * sL;
            H.card(ctx, H.pick(imgs, it.i + L), x + off - side / 2, y - off - side / 2, side, side,
              u * 2 * sL, {
                shadow: 10 + 16 * lit,
                brightness: (L ? -0.18 : 0) + 0.1 * lit,
                alpha: 1 - L * 0.08
              });
          }
        }
      });
    }
  });

  /* ----------------------------------------------------------------- Iso Orbit */
  ML.register({
    id: 'iso-orbit', name: 'Iso Orbit', vn: 'Lưới isometric', group: 'grid',
    desc: 'Lưới thẻ isometric đung đưa trên quỹ đạo, từng thẻ trôi nổi nhẹ theo nhịp riêng.',
    duration: 14, slots: [4, 24],
    params: [
      { id: 'size', label: 'Cỡ lưới', type: 'number', default: 100, min: 60, max: 140, step: 5, unit: '%' },
      { id: 'spacing', label: 'Khoảng cách', type: 'number', default: 18, min: 0, max: 80, step: 2, unit: '%' },
      { id: 'tilt', label: 'Độ nghiêng', type: 'number', default: 40, min: 0, max: 100, step: 5, unit: '%' },
      {
        id: 'motion', label: 'Chuyển động', type: 'select', default: 'swing',
        options: [{ value: 'swing', label: 'Đung đưa' }, { value: 'spin', label: 'Xoay vòng' }]
      },
      { id: 'swingAngle', label: 'Biên đung đưa', type: 'number', default: 22, min: 4, max: 60, step: 2, unit: '°' },
      { id: 'float', label: 'Trôi nổi', type: 'number', default: 8, min: 0, max: 30, step: 1, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, p, imgs, n } = c;
      const cols = Math.max(2, Math.round(Math.sqrt(n * (w / h))));
      const rows = Math.ceil(n / cols);
      const pitchU = 1 + p.spacing / 100;
      const S = Math.min((w * 0.92) / (cols * pitchU), (h * 0.92) / (rows * pitchU)) * (p.size / 100);
      const shearY = (p.tilt / 100) * 0.9;
      const ang = p.motion === 'spin'
        ? t * Math.PI * 2
        : Math.sin(t * Math.PI * 2) * ((p.swingAngle * Math.PI) / 180);
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const floatAmt = (p.float / 100) * 0.9;
      const side = 0.94;

      const list = [];
      for (let i = 0; i < n; i++) {
        const col = i % cols, row = (i / cols) | 0;
        const lx = (col - (cols - 1) / 2) * pitchU;
        const bob = Math.sin(t * Math.PI * 2 + i * 0.85) * floatAmt;
        const ly = (row - (rows - 1) / 2) * pitchU + bob;
        // độ sâu sau phép quay + shear: dùng để sắp thứ tự vẽ
        const depth = lx * sinA + ly * cosA + shearY * (lx * cosA - ly * sinA);
        list.push({ i: i, lx: lx, ly: ly, depth: depth, bob: bob });
      }
      list.sort((a, b) => a.depth - b.depth);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(S, S);
      ctx.rotate(ang);
      ctx.transform(1, shearY, 0, 1, 0, 0);
      for (let j = 0; j < list.length; j++) {
        const it = list[j];
        const lift = floatAmt > 0.001 ? it.bob / floatAmt : 0;
        H.card(ctx, H.pick(imgs, it.i), it.lx - side / 2, it.ly - side / 2, side, side, 0.08, {
          shadow: 0.22 + 0.12 * Math.abs(lift),
          brightness: 0.05 * lift
        });
      }
      ctx.restore();
    }
  });

  /* ------------------------------------------------------------ Position Dance */
  ML.register({
    id: 'position-dance', name: 'Position Dance', vn: 'Đổi vị trí', group: 'grid',
    desc: 'Mỗi thẻ luân phiên ba vị trí và ba cỡ trong ô của nó, quay vòng liền mạch.',
    duration: 12, slots: [3, 12],
    params: [
      { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 26, min: 12, max: 42, step: 1, unit: '%' },
      { id: 'cardAspect', label: 'Tỉ lệ thẻ', type: 'select', default: '1:1', options: ASPECTS },
      { id: 'spread', label: 'Độ toả', type: 'number', default: 60, min: 0, max: 100, step: 5, unit: '%' },
      { id: 'cornerRadius', label: 'Bo góc', type: 'number', default: 4, min: 0, max: 12, step: 0.5, unit: '%' }
    ],
    render(c) {
      const { ctx, t, w, h, u, p, imgs, n, radius } = c;
      const cells = Math.min(n, 9);
      const cols = cells <= 2 ? cells : cells <= 4 ? 2 : 3;
      const rows = Math.ceil(cells / cols);
      const cellW = w / cols, cellH = h / rows;
      const ar = H.aspect(p.cardAspect, w, h);
      const cw = Math.min(u * p.cardSize, cellW * 0.9, cellH * 0.9 * ar);
      const ch = cw / ar;
      const sp = (p.spread / 100) * 0.36;
      // ba vị trí trong ô, mỗi vị trí một cỡ
      const spots = [
        [0.5 - sp, 0.5 - sp * 0.8, 1.16],
        [0.5 + sp, 0.5 - sp * 0.1, 0.86],
        [0.5, 0.5 + sp * 1.1, 1.0]
      ];
      for (let i = 0; i < cells; i++) {
        const cellX = (i % cols) * cellW;
        const cellY = ((i / cols) | 0) * cellH;
        const g = t * 3 + i * 0.27;
        const idx = ((Math.floor(g) % 3) + 3) % 3;
        const f = H.smooth(H.q(g - Math.floor(g), 0.3, 1));
        const A = spots[idx], B = spots[(idx + 1) % 3];
        const px = cellX + H.lerp(A[0], B[0], f) * cellW;
        const py = cellY + H.lerp(A[1], B[1], f) * cellH;
        const sc = H.lerp(A[2], B[2], f);
        const bw = cw * sc, bh = ch * sc;
        H.card(ctx, H.pick(imgs, i), px - bw / 2, py - bh / 2, bw, bh, radius * sc, {
          rot: Math.sin(f * Math.PI) * 0.07 * (i % 2 ? 1 : -1),
          shadow: 24,
          alpha: 0.98
        });
      }
    }
  });
})();
