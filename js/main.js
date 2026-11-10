/* ==========================================================================
   The Boat Shop Corporation — motion + interaction
   No dependencies. Everything below respects prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const simpleMQ = window.matchMedia('(max-width: 860px)');
  const hoverMQ = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ------------------------------------------------------------------ */
  /* Split headings into masked words                                    */
  /* ------------------------------------------------------------------ */
  function splitWords(el) {
    const text = el.textContent.trim();
    let idx = 0;
    const out = document.createElement('span');
    out.setAttribute('aria-hidden', 'true');
    el.childNodes.forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { out.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span'); s.textContent = tok; s.style.setProperty('--i', idx++);
          w.appendChild(s); out.appendChild(w);
        });
      } else if (n.nodeName === 'BR') {
        out.appendChild(n.cloneNode());
      }
    });
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text;
    el.textContent = ''; el.appendChild(sr); el.appendChild(out);
  }
  $$('.split').forEach(splitWords);

  /* ------------------------------------------------------------------ */
  /* Intro curtain, then the hero sequence                               */
  /* ------------------------------------------------------------------ */
  const intro = $('#intro');
  const hasIntro = !root.classList.contains('no-intro') && !reduceMQ.matches;
  let readyDone = false;
  function ready() {
    if (readyDone) return; readyDone = true;
    document.body.classList.add('ready');
    const h1 = $('#hero-title'); if (h1) h1.classList.add('in');
  }
  if (hasIntro && intro) {
    const t0 = performance.now();
    const go = () => {
      const wait = Math.max(0, 1500 - (performance.now() - t0));
      setTimeout(() => {
        intro.classList.add('out');
        setTimeout(ready, 450);
        setTimeout(() => { intro.style.display = 'none'; }, 1100);
        try { sessionStorage.setItem('tbsc-intro', '1'); } catch (e) {}
      }, wait);
    };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    setTimeout(go, 3500); // safety net
  } else {
    if (intro) intro.style.display = 'none';
    requestAnimationFrame(() => setTimeout(ready, 80));
  }

  /* ------------------------------------------------------------------ */
  /* Reveal on view                                                      */
  /* ------------------------------------------------------------------ */
  const revealTargets = $$('.fade, .split:not(#hero-title), .legacy-photo');
  $$('.stat-row .stat').forEach((s, i) => s.style.setProperty('--d', (i * 0.12) + 's'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('in'));
  }

  /* ------------------------------------------------------------------ */
  /* Count-up stats                                                      */
  /* ------------------------------------------------------------------ */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMQ.matches) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target, target = +el.dataset.count, dur = 1700, t0 = performance.now();
        const tick = now => {
          const k = clamp((now - t0) / dur, 0, 1);
          el.textContent = Math.round(target * easeOut(k));
          if (k < 1) requestAnimationFrame(tick);
        };
        el.textContent = '0';
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  }

  /* ------------------------------------------------------------------ */
  /* Mobile navigation                                                   */
  /* ------------------------------------------------------------------ */
  const header = $('#site-header');
  const menuToggle = $('.menu-toggle');
  const navLinks = $('#site-header .nav-links');
  if (menuToggle && navLinks) {
    const icon = menuToggle.querySelector('.menu-icon');
    const setMenu = open => {
      header.classList.toggle('menu-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      if (icon) icon.textContent = open ? '\u00d7' : '\u2630';
    };
    menuToggle.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
    $$('a[href^="#"]', navLinks).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) setMenu(false); }, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* Inquiry buttons (Google Forms) + spotlight + magnetic hover         */
  /* ------------------------------------------------------------------ */
  $$('.js-inquiry-trigger').forEach(el => el.addEventListener('click', () => {
    const url = el.getAttribute('data-form-url');
    if (url) window.open(url, '_blank', 'noopener');
  }));
  $$('.inquiry-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  if (hoverMQ.matches && !reduceMQ.matches) {
    $$('.hero-actions .btn').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.32;
        btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero video                                                          */
  /* ------------------------------------------------------------------ */
  const video = $('#hero-video');
  if (video && !reduceMQ.matches) {
    video.src = window.matchMedia('(max-width: 760px)').matches ? 'assets/video/hero-mobile.mp4' : 'assets/video/hero.mp4';
    video.muted = true;
    const pr = video.play(); if (pr && pr.catch) pr.catch(() => {});
  }

  /* ------------------------------------------------------------------ */
  /* Capabilities: expanding panels                                      */
  /* ------------------------------------------------------------------ */
  const caps = $$('#caps .cap');
  const activateCap = c => caps.forEach(x => x.classList.toggle('active', x === c));
  caps.forEach(c => {
    c.addEventListener('click', () => activateCap(c));
    c.addEventListener('focus', () => activateCap(c));
    c.addEventListener('mouseenter', () => { if (hoverMQ.matches) activateCap(c); });
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateCap(c); } });
  });

  let scrollVel = 0;

  /* ------------------------------------------------------------------ */
  /* Recent builds: arrow-driven carousel (page scroll is never hijacked) */
  /* ------------------------------------------------------------------ */
  const section = $('#gallery');
  const deck = $('#deck');
  const cards = $$('.card', deck);
  const N = cards.length;
  const cardImgs = cards.map(c => c.querySelector('img'));
  const cApp = $('#c-app'), cName = $('#c-name'), cCap = $('#deck-caption');
  const countEl = $('#deck-count');
  let active = 0, capTimer = null, justSwiped = false, stacked = true, staggerTimer = null;
  const PILE = [[0, 0, 0], [-12, 5, -5], [14, -4, 4.5], [-20, 8, -9], [22, -7, 8]];

  // Fetch the photos a screen or two before they are needed
  if ('IntersectionObserver' in window) {
    const pre = new IntersectionObserver(en => {
      if (!en[0].isIntersecting) return;
      cardImgs.forEach(im => { im.loading = 'eager'; });
      pre.disconnect();
    }, { rootMargin: '1500px 0px' });
    pre.observe(section);
  } else {
    cardImgs.forEach(im => { im.loading = 'eager'; });
  }

  function setCaption(idx, instant) {
    const write = () => {
      cApp.textContent = cards[idx].dataset.app;
      cName.textContent = cards[idx].dataset.name;
      countEl.textContent = stacked ? N + ' builds' : (idx + 1) + ' of ' + N;
    };
    clearTimeout(capTimer);
    if (instant) { write(); return; }
    cCap.classList.add('swap');
    capTimer = setTimeout(() => { write(); cCap.classList.remove('swap'); }, 180);
  }

  function layoutDeck(stagger) {
    const cw = cards[0].offsetWidth;
    const step = cw + 26;
    const stageW = deck.clientWidth;
    for (let i = 0; i < N; i++) {
      const c = cards[i];
      let dist = i - active;
      if (dist > N / 2) dist -= N; else if (dist < -N / 2) dist += N;
      const a = Math.abs(dist);
      if (stacked) {
        // a loose pile, the active build on top
        const rank = (i - active + N) % N, p = PILE[Math.min(rank, 4)];
        c.style.transitionDelay = '0s';
        c.style.transform = 'translate3d(' + p[0] + 'px,' + p[1] + 'px,0) rotate(' + p[2] + 'deg) scale(' + (rank === 0 ? 1 : 0.97) + ')';
        c.style.zIndex = 100 - rank;
        c.style.opacity = rank < 5 ? '1' : '0';
        c.style.pointerEvents = rank === 0 ? '' : 'none';
        c.tabIndex = rank === 0 ? 0 : -1;
        c.setAttribute('aria-hidden', rank === 0 ? 'false' : 'true');
        c.classList.toggle('is-top', rank === 0);
        c.classList.toggle('is-active', rank === 0);
        c.setAttribute('aria-label', 'Spread out the recent builds');
        cardImgs[i].style.transform = 'none';
        continue;
      }
      const x = dist * step, y = dist * dist * 5, r = dist * 1.8;
      const sc = 1 - Math.min(a, 2) * 0.05;
      const shown = a * step - cw / 2 < stageW / 2;
      c.style.transitionDelay = stagger ? (a * 45) + 'ms' : '0s';
      c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + r.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      c.style.zIndex = 100 - Math.round(a * 4);
      c.style.opacity = shown ? '1' : '0';
      c.style.pointerEvents = shown ? '' : 'none';
      c.tabIndex = shown ? 0 : -1;
      c.setAttribute('aria-hidden', shown ? 'false' : 'true');
      c.classList.remove('is-top');
      c.classList.toggle('is-active', i === active);
      c.setAttribute('aria-label', c.dataset.name + ', ' + c.dataset.app + '. ' + (i === active ? 'View details' : 'Bring to front'));
      cardImgs[i].style.transform = 'translate3d(' + clamp(-dist * 18, -34, 34).toFixed(1) + 'px,0,0)';
    }
  }

  function spreadOut() {
    if (!stacked) return;
    stacked = false;
    section.classList.remove('is-stacked');
    layoutDeck(true);
    setCaption(active, true);
    clearTimeout(staggerTimer);
    staggerTimer = setTimeout(() => cards.forEach(c => { c.style.transitionDelay = '0s'; }), 1200);
  }

  function goTo(i, instant) {
    if (stacked) return;
    active = (i + N) % N;
    layoutDeck();
    setCaption(active, instant);
  }

  window.addEventListener('resize', () => layoutDeck(false), { passive: true });
  $('#deck-prev').addEventListener('click', () => goTo(active - 1));
  $('#deck-next').addEventListener('click', () => goTo(active + 1));

  deck.addEventListener('click', e => {
    if (justSwiped) return;
    const card = e.target.closest('.card'); if (!card) return;
    if (stacked) { spreadOut(); return; }
    const i = +card.dataset.i;
    if (i === active) openModal(i, card); else goTo(i);
  });
  $('#deck-open').addEventListener('click', () => openModal(active, cards[active]));

  // horizontal swipe / drag on the deck
  let px = 0, py = 0, pid = null;
  deck.addEventListener('pointerdown', e => { px = e.clientX; py = e.clientY; pid = e.pointerId; justSwiped = false; });
  deck.addEventListener('pointerup', e => {
    if (e.pointerId !== pid) return; pid = null;
    const dx = e.clientX - px, dy = e.clientY - py;
    if (!stacked && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      goTo(active + (dx < 0 ? 1 : -1));
      justSwiped = true; setTimeout(() => { justSwiped = false; }, 60);
    }
  });
  deck.addEventListener('pointercancel', () => { pid = null; });

  // arrow keys step the carousel while focus is inside the section
  section.addEventListener('keydown', e => {
    if (isOpen || stacked) return;
    if (e.key === 'ArrowRight') { goTo(active + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { goTo(active - 1); e.preventDefault(); }
  });

  /* ------------------------------------------------------------------ */
  /* Build detail modal with a card-to-panel morph                       */
  /* ------------------------------------------------------------------ */
  const modal = $('#modal'), mPanel = $('#modal-panel'), mMedia = $('#m-media'), mImg = $('#m-img');
  const mBody = $('#m-body'), mApp = $('#m-app'), mTitle = $('#m-title'), mSpecs = $('#m-specs');
  let current = 0, opener = null, isOpen = false;

  function fill(i) {
    const c = cards[i], d = c.dataset;
    mImg.src = c.querySelector('img').currentSrc || c.querySelector('img').src;
    mImg.alt = c.querySelector('img').alt;
    mApp.textContent = d.app;
    mTitle.textContent = d.name;
    const rows = [['Application', d.app], ['Hull', 'Fiberglass (GRP)']];
    if (d.engines) rows.push(['Engines', d.engines + (d.engines === '1' ? ' engine' : ' engines')]);
    if (d.where) rows.push(['Operating area', d.where]);
    rows.push(['Built at', 'Rosario, Cavite']);
    mSpecs.innerHTML = '';
    rows.forEach(r => {
      const row = document.createElement('div'); row.className = 'spec';
      const a = document.createElement('span'); a.textContent = r[0];
      const b = document.createElement('span'); b.textContent = r[1];
      row.appendChild(a); row.appendChild(b); mSpecs.appendChild(row);
    });
  }

  function openModal(i, fromCard) {
    current = i; opener = fromCard || null; isOpen = true;
    fill(i);
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.body.classList.add('is-locked');
    if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    // measure before the fade so the morph starts from the real card position
    const f = fromCard ? fromCard.getBoundingClientRect() : null;
    const t = mMedia.getBoundingClientRect();
    requestAnimationFrame(() => {
      modal.classList.add('show');
      if (f && !reduceMQ.matches && !simpleMQ.matches && mMedia.animate) {
        mMedia.animate([
          { transform: 'translate(' + (f.left - t.left) + 'px,' + (f.top - t.top) + 'px) scale(' + (f.width / t.width) + ',' + (f.height / t.height) + ')', borderRadius: '20px' },
          { transform: 'none', borderRadius: '0px' }
        ], { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      if (mBody.animate && !reduceMQ.matches) {
        mBody.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 280, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      }
      $('#m-close').focus({ preventScroll: true });
    });
  }

  function closeModal() {
    if (!isOpen) return; isOpen = false;
    modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      modal.classList.remove('open');
      document.body.classList.remove('is-locked'); document.body.style.paddingRight = '';
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }, 420);
  }

  function stepModal(dir) {
    current = (current + dir + N) % N;
    mBody.classList.add('swap');
    if (mImg.animate && !reduceMQ.matches) mImg.animate([{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
    setTimeout(() => { fill(current); opener = cards[current]; mBody.classList.remove('swap'); }, 220);
  }

  $('#m-close').addEventListener('click', closeModal);
  $('#modal-scrim').addEventListener('click', closeModal);
  $('#m-prev').addEventListener('click', () => stepModal(-1));
  $('#m-next').addEventListener('click', () => stepModal(1));
  document.addEventListener('keydown', e => {
    if (!isOpen) return;
    if (e.key === 'Escape') closeModal();
    else if (e.key === 'ArrowRight') stepModal(1);
    else if (e.key === 'ArrowLeft') stepModal(-1);
    else if (e.key === 'Tab') {
      const f = $$('button, a[href]', mPanel).filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------------------------------------------ */
  /* One scroll loop for everything scroll-linked                        */
  /* ------------------------------------------------------------------ */
  const progress = $('#progress');
  const heroBg = $('#hero-bg'), heroInner = $('#hero-inner'), hero = $('.hero');
  const legacyPhoto = $('.legacy-photo'), legacyImg = $('#legacy-img');
  let ticking = false, prevY = window.scrollY;

  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  function update() {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    const dy = y - prevY; prevY = y;
    scrollVel = lerp(scrollVel, clamp(dy, -60, 60), 0.35);

    // header
    header.classList.toggle('solid', y > 60);
    if (!header.classList.contains('menu-open')) {
      if (y > 420 && dy > 4) header.classList.add('hide');
      else if (dy < -4 || y < 420) header.classList.remove('hide');
    }
    // progress
    const docH = document.documentElement.scrollHeight - vh;
    progress.style.transform = 'scaleX(' + (docH > 0 ? clamp(y / docH, 0, 1) : 0).toFixed(4) + ')';

    if (!reduceMQ.matches) {
      // hero parallax
      if (y < vh * 1.2 && hero) {
        if (video) video.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
        heroInner.style.transform = 'translate3d(0,' + (y * 0.14).toFixed(1) + 'px,0)';
        heroInner.style.opacity = clamp(1 - y / (vh * 0.75), 0, 1).toFixed(3);
      }
      // legacy photo depth
      if (legacyPhoto && legacyImg) {
        const r = legacyPhoto.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          const k = (r.top + r.height / 2 - vh / 2) / vh;
          legacyImg.style.transform = 'translate3d(0,' + clamp(-k * 56, -44, 44).toFixed(1) + 'px,0)';
        }
      }
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  

  /* ------------------------------------------------------------------ */
  /* Font experiment panel (add ?nofonts to the URL to hide it)           */
  /* ------------------------------------------------------------------ */
  if (!/[?&]nofonts/.test(location.search)) {
    const serif = n => "'" + n + "',Georgia,serif";
    const names = ['Italiana', 'Prata', 'Cinzel', 'Theano Didot', 'Balthazar', 'Abhaya Libre', 'Antic Didone', 'Yeseva One'];
    const groups = [
      { key: 'tbsc-font', prop: '--display', title: 'Heading font', def: 'Prata', opts: [['Fraunces (current)', serif('Fraunces')]].concat(names.map(n => [n, serif(n)])) },
      { key: 'tbsc-numfont', prop: '--num', title: 'Number font', def: 'Same as headings', opts: [['Same as headings', 'var(--display)'], ['Inter', "'Inter',system-ui,sans-serif"]].concat(names.map(n => [n, serif(n)])) }
    ];
    const box = document.createElement('div'); box.className = 'fonttest';
    box.innerHTML = '<b role="button" tabindex="0">Fonts <span>+</span></b><section></section>';
    const head = box.querySelector('b'), body = box.querySelector('section');
    const flip = () => { const o = box.classList.toggle('open'); head.querySelector('span').textContent = o ? '\u2212' : '+'; };
    head.addEventListener('click', flip);
    head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    groups.forEach(g => {
      const label = document.createElement('em'); label.textContent = g.title;
      const wrap = document.createElement('div');
      let saved = null; try { saved = localStorage.getItem(g.key); } catch (err) {}
      const apply = (btn, val) => {
        root.style.setProperty(g.prop, val);
        $$('button', wrap).forEach(x => x.classList.toggle('on', x === btn));
        try { localStorage.setItem(g.key, val); } catch (err) {}
      };
      g.opts.forEach(o => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = o[0];
        btn.addEventListener('click', () => apply(btn, o[1]));
        wrap.appendChild(btn);
        if ((saved && saved === o[1]) || (!saved && o[0] === g.def)) apply(btn, o[1]);
      });
      body.appendChild(label); body.appendChild(wrap);
    });
    document.body.appendChild(box);
  }

  layoutDeck(false);
  setCaption(0, true);
  update();
})();
