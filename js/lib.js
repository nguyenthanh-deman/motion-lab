/* =============================================================================
   Motion Lab — engine chuyển động (canvas 2D, không thư viện)
   Mọi hiệu ứng đăng ký qua ML.register({...}); hàm render nhận một "frame":
     { ctx, t, w, h, u, p, imgs, n, radius }
   t  : tiến trình 0..1 (lặp)
   u  : đơn vị = min(w,h)/100  (tham số % dùng u)
   p  : bảng tham số đã trộn mặc định
   imgs: mảng poster (canvas) để vẽ
   ========================================================================== */
(function () {
  'use strict';

  const ML = (window.ML = window.ML || {});
  ML.defs = [];
  ML.byId = {};
  ML.register = function (def) {
    if (!def || !def.id) throw new Error('def thiếu id');
    ML.byId[def.id] = def;
    ML.defs.push(def);
  };

  /* ---------------------------------------------------------------- toán cơ bản */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = (v) => clamp(v, 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = lerp;
  /** đổi t trong [a,b] thành 0..1 rồi kẹp */
  const q = (t, a, b) => clamp01((t - a) / (b - a || 1e-6));
  const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const easeIn = (t) => Math.pow(clamp01(t), 3);
  const easeInOut = (t) => {
    t = clamp01(t);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  const easeOutQuint = (t) => 1 - Math.pow(1 - clamp01(t), 5);
  const easeExpo = (t) => {
    t = clamp01(t);
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };
  /** vượt biên nhẹ rồi trả về (overshoot) */
  const back = (t, s = 1.7) => {
    t = clamp01(t) - 1;
    return t * t * ((s + 1) * t + s) + 1;
  };
  /** nhịp chờ - bật - chờ: trả 0..1 với phần "nở" ở giữa */
  const pulse = (t, rise = 0.25, fall = 0.25) => {
    t = clamp01(t);
    if (t < rise) return smooth(t / rise);
    if (t > 1 - fall) return smooth((1 - t) / fall);
    return 1;
  };
  /** lặp bước: chia 1 thành n bước, trả tiến trình trong bước hiện tại + chỉ số */
  const steps = (t, n) => {
    const g = clamp01(t) * n;
    const i = Math.min(n - 1, Math.floor(g));
    return { i, local: g - i, all: g };
  };
  /** so le: phần tử i chạy trong khoảng riêng, chồng nhau theo overlap (0..1) */
  const stagger = (p, i, n, overlap = 0.6) => {
    if (n <= 1) return clamp01(p);
    const dur = 1 / (1 + overlap * (n - 1));
    const start = (i * (1 - dur)) / (n - 1);
    return clamp01((p - start) / dur);
  };
  /** ngẫu nhiên tất định theo khoá */
  const hash = (i, s = 1) => {
    let x = Math.sin((i + 1) * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  /* ------------------------------------------------------------------ hình học */
  function roundRect(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.min(Math.abs(w), Math.abs(h)) / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function coverSource(img, w, h) {
    const iw = img.width || 1, ih = img.height || 1;
    const s = Math.max(w / iw, h / ih);
    const sw = w / s, sh = h / s;
    return [(iw - sw) / 2, (ih - sh) / 2, sw, sh];
  }

  /** vẽ một tấm ảnh phủ kín rect, bo góc, có bóng */
  function card(c, img, x, y, w, h, radius, opts) {
    opts = opts || {};
    if (!(w > 0.6 && h > 0.6)) return;
    const alpha = opts.alpha === undefined ? 1 : clamp01(opts.alpha);
    if (alpha <= 0.002) return;
    c.save();
    c.globalAlpha *= alpha;
    if (opts.blur) c.filter = 'blur(' + opts.blur + 'px)';
    if (opts.rot) {
      const cx = x + w / 2, cy = y + h / 2;
      c.translate(cx, cy);
      c.rotate(opts.rot);
      c.translate(-cx, -cy);
    }
    if (opts.shadow) {
      c.save();
      c.shadowColor = 'rgba(0,0,0,' + clamp(opts.shadow * 0.9, 0, 0.85) + ')';
      c.shadowBlur = opts.shadow * 2.2;
      c.shadowOffsetY = opts.shadow * 0.7;
      c.fillStyle = '#05070c';
      roundRect(c, x, y, w, h, radius);
      c.fill();
      c.restore();
    }
    c.save();
    roundRect(c, x, y, w, h, radius);
    c.clip();
    if (img) {
      const s = coverSource(img, w, h);
      c.drawImage(img, s[0], s[1], s[2], s[3], x, y, w, h);
    } else {
      c.fillStyle = 'rgba(120,140,180,0.25)';
      c.fillRect(x, y, w, h);
    }
    if (opts.brightness) {
      c.fillStyle = opts.brightness > 0
        ? 'rgba(255,255,255,' + opts.brightness + ')'
        : 'rgba(0,0,0,' + -opts.brightness + ')';
      c.fillRect(x, y, w, h);
    }
    c.restore();
    if (opts.edge !== false) {
      c.strokeStyle = 'rgba(255,255,255,0.10)';
      c.lineWidth = 1;
      roundRect(c, x + 0.5, y + 0.5, w - 1, h - 1, Math.max(0, radius - 0.5));
      c.stroke();
    }
    c.restore();
  }

  /** rect từ tâm + kích thước + tỉ lệ phóng */
  function at(cx, cy, w, h, scale = 1) {
    return [cx - (w * scale) / 2, cy - (h * scale) / 2, w * scale, h * scale];
  }

  /** thẻ có phối cảnh quanh trục dọc (yaw). Vẽ theo cột để giữ đúng luật xa–gần */
  function perspCard(c, img, cx, cy, cw, ch, yaw, opts) {
    opts = opts || {};
    const radius = opts.radius || 0;
    const alpha = opts.alpha === undefined ? 1 : clamp01(opts.alpha);
    if (alpha <= 0.002 || cw <= 0) return;
    const d = opts.perspective || 900;
    const N = clamp(Math.round(Math.abs(cw) / 14), 6, 26);
    const rot = opts.rot || 0;
    c.save();
    c.globalAlpha *= alpha;
    if (rot) { c.translate(cx, cy); c.rotate(rot); c.translate(-cx, -cy); }
    c.save();
    roundRect(c, cx - cw / 2, cy - ch / 2, cw, ch, radius);
    c.clip();
    const sw = Math.max(1, img.width / N);
    const step = cw / N;
    for (let i = 0; i < N; i++) {
      const sx = (i + 0.5) * step - cw / 2;
      const z = sx * Math.sin(yaw);
      const s = d / (d + z);
      const dx = sx * Math.cos(yaw) * s;
      const dw = step * Math.abs(Math.cos(yaw)) * s + 1.2;
      const dh = ch * s;
      c.drawImage(img, i * sw, 0, sw, img.height, cx + dx - dw / 2, cy - dh / 2, dw, dh);
    }
    // tối dần phía xa
    const g = c.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
    const far = Math.sin(yaw) > 0 ? 1 : 0;
    g.addColorStop(0, 'rgba(0,0,0,' + 0.34 * far + ')');
    g.addColorStop(1, 'rgba(0,0,0,' + 0.34 * (1 - far) + ')');
    c.fillStyle = g;
    c.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.10)';
    c.lineWidth = 1;
    roundRect(c, cx - cw / 2 + 0.5, cy - ch / 2 + 0.5, cw - 1, ch - 1, Math.max(0, radius - 0.5));
    c.stroke();
    c.restore();
  }

  /** thẻ uốn theo cung tròn (tường cong, quả cầu). angle = hướng tâm→thẻ */
  function arcCard(c, img, cx, cy, ringR, angle, cw, ch, opts) {
    opts = opts || {};
    const alpha = opts.alpha === undefined ? 1 : clamp01(opts.alpha);
    if (alpha <= 0.002 || cw <= 0) return;
    const N = clamp(Math.round(cw / 9), 8, 30);
    const sliceW = (cw / N) * 1.12;
    const rad = angle + Math.PI / 2; // tiếp tuyến
    c.save();
    c.globalAlpha *= alpha;
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N;
      const a = angle + (u - 0.5) * (cw / Math.max(1, ringR));
      const x = cx + Math.cos(a) * ringR;
      const y = cy + Math.sin(a) * ringR;
      c.save();
      c.translate(x, y);
      c.rotate(a - Math.PI / 2 + (opts.flip ? Math.PI : 0));
      c.drawImage(img, (img.width * i) / N, 0, img.width / N, img.height, -sliceW / 2, -ch / 2, sliceW, ch);
      c.restore();
    }
    c.restore();
    void rad;
  }

  /** lưới đều: trả mảng rect */
  function grid(n, w, h, gap, cols) {
    cols = cols || Math.max(1, Math.round(Math.sqrt(n * (w / h))));
    const rows = Math.ceil(n / cols);
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = (h - gap * (rows - 1)) / rows;
    const out = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c0 = i % cols;
      out.push([c0 * (cw + gap), r * (ch + gap), cw, ch]);
    }
    return out;
  }

  /** ảnh phủ kín khung theo tỉ lệ, canh giữa */
  function fitBox(aspect, w, h) {
    const bw = Math.min(w, h * aspect), bh = bw / aspect;
    return [w / 2 - bw / 2, h / 2 - bh / 2, bw, bh];
  }

  /* ------------------------------------------------------- sinh poster mẫu */
  const PALETTES = [
    ['#0a0f1f', '#1d3fbf', '#4cc9f0'],
    ['#140b1e', '#7b2ff7', '#f107a3'],
    ['#0b1a12', '#0f9d58', '#d7f9a8'],
    ['#1c0d08', '#e4572e', '#ffd166'],
    ['#071318', '#0e7490', '#67e8f9'],
    ['#161018', '#8b5cf6', '#22d3ee'],
    ['#101010', '#e5e5e5', '#f59e0b'],
    ['#0d0b21', '#3b82f6', '#a78bfa'],
    ['#1a1206', '#d97706', '#fde68a'],
    ['#08120f', '#10b981', '#5eead4'],
    ['#150a10', '#db2777', '#f9a8d4'],
    ['#0a0d14', '#64748b', '#e2e8f0'],
    ['#0b1418', '#0891b2', '#a5f3fc'],
    ['#141005', '#a16207', '#fef08a'],
    ['#0e0b16', '#6d28d9', '#f472b6'],
    ['#05100d', '#059669', '#bbf7d0']
  ];

  function makePoster(i, size) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const pal = PALETTES[i % PALETTES.length];
    const r1 = hash(i, 3), r2 = hash(i, 7), r3 = hash(i, 11);

    const g = c.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, pal[1]);
    g.addColorStop(0.55, pal[0]);
    g.addColorStop(1, pal[2]);
    c.fillStyle = p => p;
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);

    // khối hình học
    c.save();
    c.globalAlpha = 0.9;
    c.fillStyle = pal[2];
    if (i % 3 === 0) {
      c.beginPath();
      c.arc(size * (0.2 + r1 * 0.6), size * (0.3 + r2 * 0.4), size * (0.16 + r3 * 0.16), 0, Math.PI * 2);
      c.fill();
    } else if (i % 3 === 1) {
      c.translate(size * 0.5, size * 0.5);
      c.rotate(-0.5 + r1);
      c.fillRect(-size * 0.42, -size * 0.1, size * 0.84, size * 0.2);
      c.globalAlpha = 0.55;
      c.fillStyle = '#ffffff';
      c.fillRect(-size * 0.42, size * 0.16, size * 0.5, size * 0.03);
    } else {
      c.globalAlpha = 0.5;
      for (let k = 0; k < 5; k++) {
        c.beginPath();
        c.arc(size * 0.5, size * 0.5, size * (0.12 + k * 0.08), 0, Math.PI * 2);
        c.lineWidth = size * 0.012;
        c.strokeStyle = '#ffffff';
        c.stroke();
      }
    }
    c.restore();

    // lưới mờ
    c.save();
    c.globalAlpha = 0.14;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    for (let k = 1; k < 6; k++) {
      c.beginPath(); c.moveTo((size * k) / 6, 0); c.lineTo((size * k) / 6, size); c.stroke();
      c.beginPath(); c.moveTo(0, (size * k) / 6); c.lineTo(size, (size * k) / 6); c.stroke();
    }
    c.restore();

    // thanh "giao diện" giả
    c.save();
    c.globalAlpha = 0.92;
    c.fillStyle = 'rgba(8,10,16,0.72)';
    roundRect(c, size * 0.1, size * 0.66, size * 0.8, size * 0.22, size * 0.03);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(c, size * 0.14, size * 0.71, size * (0.2 + r1 * 0.3), size * 0.02, size * 0.01);
    c.fill();
    c.globalAlpha = 0.45;
    roundRect(c, size * 0.14, size * 0.765, size * 0.5, size * 0.02, size * 0.01);
    c.fill();
    roundRect(c, size * 0.14, size * 0.805, size * 0.34, size * 0.02, size * 0.01);
    c.fill();
    c.restore();

    // số thứ tự + nhãn
    c.save();
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.font = '600 ' + size * 0.11 + 'px ui-sans-serif, system-ui, sans-serif';
    c.textBaseline = 'top';
    c.fillText(('0' + (i + 1)).slice(-2), size * 0.1, size * 0.1);
    c.globalAlpha = 0.6;
    c.font = '500 ' + size * 0.026 + 'px ui-monospace, monospace';
    c.fillText('MOTION LAB / ' + ['UI', 'BRAND', '3D', 'EDIT'][i % 4], size * 0.1, size * 0.225);
    c.restore();

    return cv;
  }

  ML.images = [];
  ML.buildImages = function (count, size) {
    if (!ML.images.length) {
      for (let i = 0; i < count; i++) ML.images.push(makePoster(i, size || 560));
    }
    return ML.images;
  };

  /* --------------------------------------------------------------- công khai */
  ML.h = {
    clamp, clamp01, q, lerp, mix, smooth, easeOut, easeIn, easeInOut, easeOutQuint, easeExpo,
    back, pulse, steps, stagger, hash,
    roundRect, coverSource, card, at, perspCard, arcCard, grid, fitBox,
    /** tiện: số ảnh + ảnh theo chỉ số vòng */
    pick(imgs, i) { return imgs[((i % imgs.length) + imgs.length) % imgs.length]; },
    aspect(str, w, h) {
      if (!str || str === 'frame') return w / h;
      if (str === 'square') return 1;
      const parts = String(str).split(':');
      if (parts.length === 2) return parseFloat(parts[0]) / parseFloat(parts[1]) || 1;
      return 1;
    }
  };

  /* một khung vẽ: dùng cho cả site lẫn bộ kiểm thử */
  ML.renderOnce = function (def, canvas, t, params) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const p = Object.assign({}, params || {});
    (def.params || []).forEach((pr) => {
      if (p[pr.id] === undefined) p[pr.id] = pr.default;
    });
    const imgs = ML.images;
    def.render({
      ctx, t: clamp01(t), w, h, u: Math.min(w, h) / 100, p, imgs, n: imgs.length,
      radius: (p.cornerRadius || 2) * (Math.min(w, h) / 100)
    });
  };
})();
