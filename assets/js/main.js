(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isPhone = () => window.matchMedia('(max-width: 720px)').matches;

  /* Ripple on every button press */
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const size = Math.hypot(r.width, r.height) * 2;
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.width = dot.style.height = size + 'px';
    dot.style.left = e.clientX - r.left - size / 2 + 'px';
    dot.style.top = e.clientY - r.top - size / 2 + 'px';
    btn.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  });

  /* Magnetic pull on the big buttons, tilt on the coaching tiles (mouse only) */
  if (!reduce && finePointer) {
    document.querySelectorAll('.btn-big').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.2;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
      btn.addEventListener('pointerdown', () => { btn.style.transform += ' scale(0.95)'; });
    });
    document.querySelectorAll('.tile').forEach((tile) => {
      tile.addEventListener('pointermove', (e) => {
        const r = tile.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        tile.style.transform = `rotateY(${x * 8}deg) rotateX(${y * -8}deg) translateZ(0)`;
      });
      tile.addEventListener('pointerleave', () => { tile.style.transform = ''; });
    });
  }

  /* Entrances, staggered within each group */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

  const stagger = (selector, step) => {
    document.querySelectorAll(selector).forEach((el) => {
      const siblings = Array.from(el.parentElement.children).filter((c) => c.matches(selector));
      el.style.setProperty('--d', siblings.indexOf(el) * step + 'ms');
      io.observe(el);
    });
  };
  stagger('.reveal', 90);
  stagger('.reveal-mask', 0);
  stagger('.review', 90);
  stagger('.strikes li', 140);

  /* Hero numbers count up once */
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    if (reduce) return;
    const start = performance.now();
    const dur = 1400;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  setTimeout(() => document.querySelectorAll('[data-count]').forEach(countUp), 850);

  /* ---------- Bulk or cut check ---------- */
  const form = document.getElementById('calc');
  const inH = document.getElementById('in-height');
  const inW = document.getElementById('in-weight');
  const outH = document.getElementById('out-height');
  const outW = document.getElementById('out-weight');
  const rVerdict = document.getElementById('r-verdict');
  const rWhy = document.getElementById('r-why');
  const rMarker = document.getElementById('r-marker');
  const rKcal = document.getElementById('r-kcal');
  const rProtein = document.getElementById('r-protein');
  const rPace = document.getElementById('r-pace');
  const rPaceLabel = document.getElementById('r-pace-label');

  const val = (name) => form.querySelector(`input[name="${name}"]:checked`).value;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const ftIn = (cm) => {
    const inches = Math.round(cm / 2.54);
    return `${Math.floor(inches / 12)}′${inches % 12}″`;
  };

  const WHY = {
    bulk: [
      'Your beginner gains are waiting. Eat in a small surplus and build your base.',
      'You have room to grow. A small surplus builds muscle without the fat.',
      'You are lean enough to grow. A controlled surplus beats a dirty bulk.',
      'Lean and experienced: a slow, controlled surplus keeps progress coming.'
    ],
    recomp: [
      'Build muscle and lose fat at the same time. This is where beginners win big.',
      'Build muscle and lose fat at the same time. Perfect at your level.',
      'Stay near maintenance, train hard and let your body recompose.',
      'Hold maintenance and push performance. Small, steady changes add up.'
    ],
    cut: [
      'Drop fat first while you learn to train. The muscle will show faster than you think.',
      'Drop fat first and keep every kg of muscle. Your physique will show.',
      'A focused cut will reveal the muscle you already built.',
      'Time to cut. A structured deficit keeps your hard-earned muscle.'
    ]
  };
  const LABEL = { bulk: 'Lean bulk', recomp: 'Recomp', cut: 'Cut' };

  const assess = ({ sex, h, w, exp }) => {
    const bmi = w / Math.pow(h / 100, 2);
    // Years of training carry more muscle at the same BMI; women sit about one point lower.
    const allow = [0, 0.5, 1.5, 2.5][exp];
    const adj = bmi + (sex === 'f' ? 1 : 0) - allow;

    let verdict;
    if (adj < 20.5) verdict = 'bulk';
    else if (adj < 23.5) verdict = exp >= 2 && adj < 22 ? 'bulk' : 'recomp';
    else if (adj < 25.5) verdict = exp === 0 ? 'recomp' : 'cut';
    else verdict = 'cut';

    // Rough maintenance from Mifflin-St Jeor at an assumed age of 28 and a training lifestyle.
    const bmr = 10 * w + 6.25 * h - 5 * 28 + (sex === 'f' ? -161 : 5);
    const maint = bmr * 1.55;
    let kcal = maint;
    if (verdict === 'bulk') kcal = maint + 250;
    if (verdict === 'cut') kcal = maint - Math.min(750, maint * 0.2);
    kcal = Math.round(kcal / 50) * 50;

    // Protein on a lean reference weight so heavier bodies don't get absurd numbers.
    const refBmi = 25 + allow - (sex === 'f' ? 1 : 0);
    const refW = Math.min(w, refBmi * Math.pow(h / 100, 2));
    const protein = Math.round((refW * 2) / 5) * 5;

    let pace = [0, 0];
    if (verdict === 'bulk') pace = [w * 0.0025, w * 0.005];
    if (verdict === 'cut') pace = [-w * 0.005, -w * 0.01];

    const marker = Math.max(3, Math.min(97, ((adj - 17) / (29 - 17)) * 100));
    return { verdict, kcal, protein, pace, marker };
  };

  const setFill = (el) => {
    const ratio = (el.value - el.min) / (el.max - el.min);
    const thumb = 30;
    el.style.setProperty('--fill-px', ratio * (el.clientWidth - thumb) + thumb / 2 + 'px');
  };

  let lastVerdict = null;
  const update = () => {
    const metric = val('unit') === 'metric';
    const h = parseFloat(inH.value);
    const w = parseFloat(inW.value);
    outH.textContent = metric ? `${Math.round(h)} cm` : ftIn(h);
    outW.textContent = metric ? `${w % 1 ? w.toFixed(1) : w} kg` : `${Math.round(w * 2.2046)} lbs`;
    setFill(inH); setFill(inW);

    const exp = parseInt(val('exp'), 10);
    const res = assess({ sex: val('sex'), h, w, exp });

    if (res.verdict !== lastVerdict) {
      rVerdict.textContent = LABEL[res.verdict];
      rVerdict.classList.remove('is-swap');
      void rVerdict.offsetWidth;
      if (lastVerdict !== null) rVerdict.classList.add('is-swap');
      lastVerdict = res.verdict;
    }
    rWhy.textContent = WHY[res.verdict][exp];
    rMarker.style.setProperty('--m', res.marker + '%');
    rKcal.textContent = fmt(res.kcal);
    rProtein.textContent = res.protein + ' g';

    if (res.verdict === 'recomp') {
      rPace.textContent = 'Stable';
      rPaceLabel.textContent = 'Weight per week';
    } else {
      const k = metric ? 1 : 2.2046;
      const unit = metric ? 'kg' : 'lbs';
      const sign = res.verdict === 'bulk' ? '+' : '−';
      const a = Math.abs(res.pace[0] * k).toFixed(1);
      const b = Math.abs(res.pace[1] * k).toFixed(1);
      rPace.textContent = `${sign}${a}–${b}`;
      rPaceLabel.textContent = `${unit} per week`;
    }
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  window.addEventListener('resize', () => { setFill(inH); setFill(inW); });
  update();

  /* ---------- Before / after compare ---------- */
  const cmp = document.getElementById('compare');
  const range = document.getElementById('cmp-range');
  const before = document.getElementById('cmp-before');
  const after = document.getElementById('cmp-after');
  const setPos = (v) => {
    cmp.style.setProperty('--pos', v + '%');
    cmp.querySelector('.tag-before').style.opacity = v < 18 ? 0 : 1;
    cmp.querySelector('.tag-after').style.opacity = v > 82 ? 0 : 1;
  };
  range.addEventListener('input', () => setPos(range.value));

  let dragging = false;
  const fromPointer = (e) => {
    const r = cmp.getBoundingClientRect();
    const v = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    range.value = v;
    setPos(v);
  };
  cmp.addEventListener('pointerdown', (e) => {
    dragging = true;
    cmp.classList.add('is-dragging');
    cmp.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  cmp.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
  const stop = () => { dragging = false; cmp.classList.remove('is-dragging'); };
  cmp.addEventListener('pointerup', stop);
  cmp.addEventListener('pointercancel', stop);

  // A sweep the first time the slider comes into view, to show it moves
  const hint = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    hint.disconnect();
    if (reduce) return;
    const start = performance.now();
    const tick = (t) => {
      if (dragging) return;
      const p = Math.min(1, (t - start) / 1800);
      const v = 50 + Math.sin(p * Math.PI * 2) * 30 * (1 - p);
      range.value = v; setPos(v);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: 0.6 });
  hint.observe(cmp);

  const clients = Array.from(document.querySelectorAll('.client'));
  const clientList = document.querySelector('.clients');
  const nextBtn = document.getElementById('trafo-next');
  const prevBtn = document.getElementById('trafo-prev');
  const trafoIndex = document.getElementById('trafo-index');
  const trafoLabel = document.getElementById('trafo-label');
  document.getElementById('trafo-total').textContent = clients.length;

  const selectClient = (btn, { scrollToPhoto }) => {
      if (btn.classList.contains('is-active')) return;
      clients.forEach((c) => { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      const id = btn.dataset.id;
      cmp.classList.add('is-switching');
      const nextB = new Image(); const nextA = new Image();
      nextB.src = `assets/img/client-${id}-before.jpg`;
      nextA.src = `assets/img/client-${id}-after.jpg`;
      Promise.all([nextB.decode().catch(() => {}), nextA.decode().catch(() => {})]).then(() => {
        setTimeout(() => {
          before.src = nextB.src; after.src = nextA.src;
          before.style.objectPosition = after.style.objectPosition = btn.dataset.pos;
          after.alt = 'Client after: ' + btn.dataset.alt;
          range.value = 50; setPos(50);
          requestAnimationFrame(() => cmp.classList.remove('is-switching'));
        }, reduce ? 0 : 220);
      });
      const i = clients.indexOf(btn);
      trafoIndex.textContent = i + 1;
      trafoLabel.textContent = btn.querySelector('.client-delta').textContent;
      if (isPhone()) {
        clientList.scrollTo({ left: btn.offsetLeft - clientList.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' });
        if (scrollToPhoto) cmp.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
  };
  clients.forEach((btn) => btn.addEventListener('click', () => { stopNudge(); selectClient(btn, { scrollToPhoto: true }); }));

  const step = (dir) => {
    stopNudge();
    const i = clients.findIndex((c) => c.classList.contains('is-active'));
    selectClient(clients[(i + dir + clients.length) % clients.length], { scrollToPhoto: false });
  };
  nextBtn.addEventListener('click', () => step(1));
  prevBtn.addEventListener('click', () => step(-1));
  trafoLabel.textContent = clients[0].querySelector('.client-delta').textContent;

  // Draw attention to the next button once the slider has shown itself, until it is used
  function stopNudge() { nextBtn.classList.remove('is-nudging'); }
  if (!reduce) {
    const nudgeIo = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      nudgeIo.disconnect();
      setTimeout(() => nextBtn.classList.add('is-nudging'), 2000);
    }, { threshold: 0.8 });
    nudgeIo.observe(nextBtn);
  }
  (window.requestIdleCallback || setTimeout)(() => {
    clients.forEach((c) => ['before', 'after'].forEach((t) => { new Image().src = `assets/img/client-${c.dataset.id}-${t}.jpg`; }));
  });

  /* ---------- Story: words light up as you read ---------- */
  const story = document.getElementById('story-text');
  const words = [];
  const wrapWords = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = part;
          frag.appendChild(s);
          words.push(s);
        });
        child.replaceWith(frag);
      } else if (child.nodeName === 'MARK') {
        child.classList.add('w');
        words.push(child);
      } else {
        wrapWords(child);
      }
    });
  };
  if (!reduce) wrapWords(story);

  /* ---------- Scroll-driven pieces ---------- */
  const progress = document.getElementById('progress');
  const nav = document.getElementById('nav');
  const heroImg = document.querySelector('.hero-photo img');
  const ctaImg = document.querySelector('.cta-photo img');
  const ctaSec = document.querySelector('.cta');
  const mobileCta = document.querySelector('.mobile-cta');
  const heroSec = document.querySelector('.hero');
  const pricing = document.getElementById('pricing');
  const footer = document.querySelector('.footer');
  let lastY = window.scrollY;
  let velocity = 0;
  let ticking = false;

  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const dy = y - lastY;
    velocity = Math.max(-60, Math.min(60, velocity + dy * 0.15));
    lastY = y;

    const max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (dy > 4 && y > 300) nav.classList.add('is-hidden');
    else if (dy < -4 || y < 300) nav.classList.remove('is-hidden');

    if (!reduce) {
      if (y < vh * 1.2) heroImg.style.transform = `scale(${1.08 + y * 0.00012}) translateY(${y * 0.08}px)`;
      const r = ctaSec.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        const p = (vh - r.top) / (vh + r.height);
        ctaImg.style.transform = `translateY(${(0.5 - p) * 20}%)`;
      }
      const sr = story.getBoundingClientRect();
      if (sr.top < vh && sr.bottom > 0) {
        const p = Math.min(1, Math.max(0, (vh * 0.85 - sr.top) / (sr.height + vh * 0.3)));
        const n = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle('on', i < n));
      }
    }

    const pastHero = heroSec.getBoundingClientRect().bottom < 0;
    const atPlan = pricing.getBoundingClientRect().top < vh && pricing.getBoundingClientRect().bottom > 0;
    const atFooter = footer.getBoundingClientRect().top < vh;
    if (!pastHero || atPlan || atFooter || dy > 2) mobileCta.classList.remove('is-shown');
    else if (dy < -2) mobileCta.classList.add('is-shown');
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Jump bar: highlight the section in view and keep its chip visible */
  const bar = document.getElementById('nav-bar');
  const chips = Array.from(bar.querySelectorAll('.chip'));
  const sections = chips.map((c) => document.querySelector(c.getAttribute('href')));
  let activeChip = null;
  const setActive = (chip) => {
    if (chip === activeChip) return;
    if (activeChip) activeChip.classList.remove('is-active');
    activeChip = chip;
    if (!chip) return;
    chip.classList.add('is-active');
    const left = chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2;
    bar.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
  };
  const spy = () => {
    const line = window.innerHeight * 0.35;
    let current = null;
    sections.forEach((sec, i) => { if (sec && sec.getBoundingClientRect().top <= line) current = chips[i]; });
    const last = sections[sections.length - 1];
    if (current === chips[chips.length - 1] && last.getBoundingClientRect().bottom < line) current = null;
    setActive(current);
  };
  window.addEventListener('scroll', spy, { passive: true });
  spy();

  /* Marquee: drifts on its own and speeds up with scroll */
  const track = document.getElementById('band-track');
  if (!reduce) {
    let x = 0;
    const loop = () => {
      const half = track.scrollWidth / 2;
      x -= 0.9 + Math.abs(velocity) * 0.5;
      if (x <= -half) x += half;
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      velocity *= 0.92;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- Reviews: drag to scroll on desktop, tap to open ---------- */
  const strip = document.getElementById('reviews-strip');
  let down = false, startX = 0, startScroll = 0, moved = 0;
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = 0; startX = e.clientX; startScroll = strip.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (moved > 4) strip.classList.add('is-grabbing');
    strip.scrollLeft = startScroll - dx;
  });
  window.addEventListener('pointerup', () => { down = false; strip.classList.remove('is-grabbing'); });

  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  strip.querySelectorAll('.review').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (moved > 6) { e.preventDefault(); moved = 0; return; }
      lbImg.src = btn.dataset.full;
      lbImg.alt = btn.querySelector('img').alt;
      lb.showModal();
    });
  });
  document.getElementById('lightbox-close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
})();
