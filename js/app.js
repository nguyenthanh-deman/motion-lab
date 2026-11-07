/* =============================================================================
   Motion Lab — giao diện thư viện + trình xem
   ========================================================================== */
(function () {
  'use strict';
  const H = ML.h;

  const GROUPS = {
    '3d': { name: '3D & phối cảnh', desc: 'Chiều sâu, quả cầu, tường cong, đường hầm.', glow: 'rgba(94,234,212,0.30)' },
    'flow': { name: 'Vòng xoay & dòng chảy', desc: 'Carousel, bánh xe, marquee, quỹ đạo.', glow: 'rgba(139,140,247,0.30)' },
    'grid': { name: 'Lưới & tường', desc: 'Lưới ô, lật, bậc thang, isometric.', glow: 'rgba(244,114,182,0.24)' },
    'reveal': { name: 'Lộ & xoá', desc: 'Mặt nạ, dải trượt, mép chéo, Ken Burns.', glow: 'rgba(250,204,21,0.22)' },
    'spotlight': { name: 'Tiêu điểm', desc: 'Một thẻ được nâng lên, phần còn lại lùi lại.', glow: 'rgba(56,189,248,0.28)' },
    'scene': { name: 'Đa cảnh', desc: 'Nhiều nhịp nối tiếp trong một vòng lặp.', glow: 'rgba(167,139,250,0.30)' }
  };
  const ORDER = ['3d', 'flow', 'grid', 'reveal', 'spotlight', 'scene'];

  ML.buildImages(16, 560);

  const defs = ML.defs.slice().sort((a, b) => {
    const ga = ORDER.indexOf(a.group), gb = ORDER.indexOf(b.group);
    return ga - gb || a.name.localeCompare(b.name);
  });

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };

  /* ------------------------------------------------------------------ hero */
  const heroDef = ML.byId['vortex-spin'] || defs[0];
  const heroCanvas = $('#heroCanvas');
  let heroT = 0;

  /* ------------------------------------------------------------------ views */
  const views = [];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = views.find((x) => x.canvas === e.target);
      if (v) v.visible = e.isIntersecting;
    });
  }, { rootMargin: '120px' });

  let playing = true;
  let lastFrame = performance.now();
  let acc = 0;

  function makeView(def, canvas, opts) {
    const view = {
      def, canvas,
      t: (opts && opts.t) || H.hash(def.id.length + def.name.length, 3),
      speed: (opts && opts.speed) || 1,
      visible: true,
      params: {}
    };
    (def.params || []).forEach((p) => { view.params[p.id] = p.default; });
    views.push(view);
    if (canvas) io.observe(canvas);
    return view;
  }

  function tick(now) {
    const dt = Math.min(0.06, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!document.hidden) {
      acc += dt;
      const draw = acc >= 1 / 34;            // quỹ đạo ~34 fps cho lưới
      if (draw) {
        acc = 0;
        for (const v of views) {
          if (!v.visible || !v.canvas || !v.canvas.isConnected) continue;
          if (playing) v.t = (v.t + (dt * v.speed) / Math.max(2, v.def.duration || 10)) % 1;
          try { ML.renderOnce(v.def, v.canvas, v.t, v.params); } catch (err) { /* bỏ qua khung lỗi */ }
        }
      }
      if (heroCanvas && heroCanvas.isConnected) {
        if (playing) heroT = (heroT + dt / 22) % 1;
        try { ML.renderOnce(heroDef, heroCanvas, heroT); } catch (err) { /* noop */ }
      }
    }
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------- groups */
  function buildGroups() {
    const wrap = $('#groupGrid');
    ORDER.forEach((key) => {
      const g = GROUPS[key];
      const count = defs.filter((d) => d.group === key).length;
      const card = el('a', 'group-card');
      card.href = '#thu-vien';
      card.style.setProperty('--glow', g.glow);
      card.innerHTML =
        '<div><p class="gcount">' + String(count).padStart(2, '0') + ' hiệu ứng</p>' +
        '<h3>' + g.name + '</h3></div><p>' + g.desc + '</p>';
      card.addEventListener('click', () => {
        setFilter(key);
      });
      wrap.appendChild(card);
    });
  }

  /* ---------------------------------------------------------------- library */
  let filter = 'all';
  let query = '';

  function buildChips() {
    const chips = $('#chips');
    chips.innerHTML = '';
    const all = [{ key: 'all', label: 'Tất cả' }].concat(
      ORDER.map((k) => ({ key: k, label: GROUPS[k].name }))
    );
    all.forEach((c) => {
      const b = el('button', 'chip', c.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(filter === c.key));
      b.dataset.key = c.key;
      b.addEventListener('click', () => setFilter(c.key));
      chips.appendChild(b);
    });
  }

  function setFilter(key) {
    filter = key;
    buildChips();
    renderGrid();
  }

  function matches(def) {
    if (filter !== 'all' && def.group !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (def.name + ' ' + (def.vn || '') + ' ' + def.id + ' ' + (def.desc || '')).toLowerCase().includes(q);
  }

  function renderGrid() {
    const grid = $('#grid');
    grid.innerHTML = '';
    views.length = 0;
    views.push(makeView(heroDef, heroCanvas));

    const list = defs.filter(matches);
    $('#countBadge').textContent = list.length;
    $('#empty').hidden = list.length > 0;

    list.forEach((def) => {
      const card = el('button', 'fx-card');
      card.type = 'button';
      card.dataset.id = def.id;
      card.innerHTML =
        '<div class="fx-shot"><canvas></canvas></div>' +
        '<div class="fx-meta"><div class="fx-names"><b>' + (def.vn || def.name) +
        '</b><span>' + def.name + '</span></div>' +
        '<span class="fx-tag">' + GROUPS[def.group].name.split(' ')[0] + '</span></div>';
      card.setAttribute('aria-label', 'Xem hiệu ứng ' + def.name);
      card.addEventListener('click', () => openModal(def));
      grid.appendChild(card);
      const canvas = card.querySelector('canvas');
      makeView(def, canvas);
    });
  }

  /* ------------------------------------------------------------------ modal */
  const modal = $('#modal');
  const mCanvas = $('#mCanvas');
  const mScrub = $('#mScrub');
  let current = null;
  let currentView = null;
  let modalRAF = 0;
  let modalLast = 0;
  let modalPlaying = true;

  function paramLabel(p) {
    return p.label + (p.unit ? ' (' + p.unit + ')' : '');
  }

  function buildParams(def, view) {
    const wrap = $('#mParams');
    wrap.innerHTML = '';
    (def.params || []).forEach((p) => {
      const box = el('div', 'param');
      const lab = el('label');
      const val = el('b');
      if (p.type === 'select') {
        lab.textContent = p.label;
        const sel = document.createElement('select');
        (p.options || []).forEach((o) => {
          const opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          sel.appendChild(opt);
        });
        sel.value = view.params[p.id];
        sel.addEventListener('change', () => { view.params[p.id] = sel.value; });
        box.append(lab, sel);
      } else {
        lab.innerHTML = '<span>' + paramLabel(p) + '</span>';
        val.textContent = view.params[p.id];
        lab.appendChild(val);
        const input = document.createElement('input');
        input.type = 'range';
        input.min = p.min;
        input.max = p.max;
        input.step = p.step || 1;
        input.value = view.params[p.id];
        input.addEventListener('input', () => {
          view.params[p.id] = parseFloat(input.value);
          val.textContent = input.value;
        });
        box.append(lab, input);
      }
      wrap.appendChild(box);
    });
  }

  function openModal(def) {
    current = def;
    currentView = {
      def, canvas: mCanvas, t: 0, params: {},
      duration: Math.max(2, def.duration || 10)
    };
    (def.params || []).forEach((p) => { currentView.params[p.id] = p.default; });
    $('#mTitle').textContent = (def.vn ? def.vn + ' · ' : '') + def.name;
    $('#mGroup').textContent = GROUPS[def.group].name;
    $('#mDesc').textContent = def.desc || '';
    $('#mMeta').textContent = 'id: ' + def.id + ' · ' + (def.params || []).length + ' tham số · vòng lặp ' +
      def.duration + 's · ' + (def.slots ? def.slots[0] + '–' + def.slots[1] + ' ảnh' : 'n ảnh');
    buildParams(def, currentView);
    mScrub.value = 0;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modalPlaying = true;
    $('#mPlay').textContent = '❚❚';
    modalLast = performance.now();
    cancelAnimationFrame(modalRAF);
    modalRAF = requestAnimationFrame(modalLoop);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    cancelAnimationFrame(modalRAF);
    current = null;
    currentView = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  function modalLoop(now) {
    if (!currentView) return;
    const dt = Math.min(0.06, (now - modalLast) / 1000);
    modalLast = now;
    if (modalPlaying) {
      currentView.t = (currentView.t + dt / currentView.duration) % 1;
      mScrub.value = Math.round(currentView.t * 1000);
    }
    const secs = currentView.t * currentView.duration;
    $('#mTime').textContent = secs.toFixed(2).replace('.', ',') + ' s';
    try { ML.renderOnce(currentView.def, mCanvas, currentView.t, currentView.params); } catch (err) { /* noop */ }
    modalRAF = requestAnimationFrame(modalLoop);
  }

  function step(dir) {
    if (!current) return;
    const list = defs.filter(matches);
    const i = list.findIndex((d) => d.id === current.id);
    const next = list[(i + dir + list.length) % list.length];
    if (next) openModal(next);
  }

  /* ----------------------------------------------------------------- events */
  function wire() {
    $('#mClose').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === ' ') {
        e.preventDefault();
        modalPlaying = !modalPlaying;
        $('#mPlay').textContent = modalPlaying ? '❚❚' : '▶';
      }
    });
    $('#mPrev').addEventListener('click', () => step(-1));
    $('#mNext').addEventListener('click', () => step(1));
    $('#mPlay').addEventListener('click', () => {
      modalPlaying = !modalPlaying;
      $('#mPlay').textContent = modalPlaying ? '❚❚' : '▶';
    });
    mScrub.addEventListener('input', () => {
      if (!currentView) return;
      modalPlaying = false;
      $('#mPlay').textContent = '▶';
      currentView.t = parseFloat(mScrub.value) / 1000;
    });
    $('#mFull').addEventListener('click', () => {
      const panel = modal.querySelector('.modal-panel');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (panel.requestFullscreen) panel.requestFullscreen().catch(() => {});
    });
    $('#search').addEventListener('input', (e) => {
      query = e.target.value.trim();
      renderGrid();
    });
    $('#heroPlay').addEventListener('click', () => {
      const first = defs[0];
      openModal(defs.find((d) => d.id === 'sphere-globe') || first);
    });
    document.addEventListener('visibilitychange', () => {
      lastFrame = performance.now();
    });
  }

  /* ------------------------------------------------------------------- boot */
  buildGroups();
  buildChips();
  wire();
  renderGrid();
  requestAnimationFrame(tick);
})();
