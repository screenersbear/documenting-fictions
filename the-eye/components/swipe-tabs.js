// Swiping between tabs.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSwipeTabs = function addSwipeTabs(ed) {
  // ---------- swipe between tabs ----------
  (function setupTabSwipe() {
    // A swipe on the page goes to the next section (or a page of this one,
    // if it has more): the page follows the finger and slides over
    // (components/section-slide.js, 14 Nov). Up and down, it scrolls.
    let startX = null;
    let startY = null;
    let tracking = false;
    let sliding = false;
    let axis = '';
    let last = null; // the latest finger point, and the one before, for its speed

    // No tab swipes under any popup (the photo viewer and Stats' slide-over
    // included), so the screen behind one can't change.
    function anyModalOpen() {
      return ed.anyPopupOpen();
    }

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || anyModalOpen()) { tracking = false; return; }
      // Stats (its charts) and the image viewer already own horizontal
      // swipes for their own paging — don't hijack those.
      if (e.target.closest('#view-stats') || e.target.closest('.image-viewer-stage') || e.target.closest('.tabbar') || e.target.closest('.nb-page-num')) {
        tracking = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      sliding = false;
      axis = '';
      last = { x: startX, t: e.timeStamp, before: null };
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!tracking || startX === null || !e.touches.length) return;
      const x = e.touches[0].clientX;
      const dx = x - startX;
      const dy = e.touches[0].clientY - startY;
      last = { x, t: e.timeStamp, before: last };
      // The first 10px decide: sideways (and clearly so) slides, else it scrolls.
      if (!axis) {
        if (Math.hypot(dx, dy) < 10) return;
        axis = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y';
        if (axis === 'x') sliding = ed.startSlideDrag(dx < 0 ? 1 : -1);
      }
      if (sliding) ed.moveSlideDrag(dx);
    }, { passive: true });

    // How fast the finger was going when it let go, in px/ms.
    const speedAt = (e) => {
      const b = last && last.before;
      if (!b || e.timeStamp - last.t > 80 || last.t <= b.t) return 0;
      return (last.x - b.x) / (last.t - b.t);
    };

    document.addEventListener('touchend', (e) => {
      if (!tracking || startX === null) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      startX = null;
      startY = null;
      if (sliding) { sliding = false; ed.endSlideDrag(dx, speedAt(e)); return; }
      if (axis === 'y' || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      ed.stepScreenPage(dx < 0 ? 1 : -1);
    }, { passive: true });

    // The system took the finger (a call, a gesture of its own): back where it was.
    document.addEventListener('touchcancel', () => {
      tracking = false;
      startX = null;
      if (sliding) { sliding = false; ed.endSlideDrag(0, 0); }
    }, { passive: true });
  })();

  // Held still on a page number, it swells into a card: the number big and
  // a tick for every page. Slide sideways and the pages flip under the
  // finger, a tick at a time; let go to stay there (user, 11-11). The same
  // on the screens, inside a shoot, in Archive mode and in Shoot mode.
  (function setupPageNumberScrub() {
    const card = document.createElement('div');
    card.className = 'nb-scrub';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = '<span class="nb-scrub-num"></span><span class="nb-scrub-ticks"></span>';
    document.body.appendChild(card);
    const cardNum = card.querySelector('.nb-scrub-num');
    const ticks = card.querySelector('.nb-scrub-ticks');
    const books = [
      {
        el: document.getElementById('nbScreenNum'),
        ok: () => !ed.anyPopupOpen(),
        count: () => ed.screenPageCount(ed.currentScreen()),
        at: () => ed.screenNow(ed.currentScreen()),
        go: (i) => { const view = ed.currentScreen(); ed.clearPan(); ed.scrollPageTo(0); ed.screenAt[view] = i; ed.drawScreenPage(view); },
      },
      {
        el: document.getElementById('nbPageFoot'),
        ok: () => !ed.shootModalOverlay.hidden && !ed.shootWizardActive && !ed.shootWizardPendingId,
        count: () => ed.shootFlatPages().length,
        at: () => Math.max(0, ed.shootFlatPages().findIndex(p => p.id === ed.shootPageId && p.sub === ed.shootSub)),
        go: (i) => { const page = ed.shootFlatPages()[i]; if (page) ed.showShootPage(page.id, { sub: page.sub }); },
      },
      {
        el: document.getElementById('shootModeFoot'),
        ok: () => !ed.shootModeOverlay.hidden && !!ed.shootModeFlows,
        count: () => ed.shootModePages().length,
        at: () => ed.shootModeAt,
        go: (i) => { ed.shootModeAt = i; ed.drawShootModePage(); },
      },
    ];
    let hold = null;
    let scrub = null;
    function draw() {
      cardNum.textContent = `${scrub.at + 1} / ${scrub.count}`;
      ticks.querySelectorAll('.nb-scrub-tick').forEach((tick, i) => tick.classList.toggle('is-on', i === scrub.at));
    }
    function open(h) {
      hold = null;
      const { book, el } = h;
      if (!book.ok()) return;
      const count = book.count();
      if (count < 2) return;
      const active = document.activeElement;
      if (active && active !== document.body && typeof active.blur === 'function') active.blur();
      const vw = window.innerWidth;
      const at = Math.max(0, Math.min(book.at(), count - 1));
      // One tick a page, with the page you're on right under the finger and
      // every other one within reach of it before the screen's edge; the
      // tick under the finger is the page showing.
      const room = 26; // the card's padding and border, and a little air
      const step = Math.max(3, Math.min(30,
        at ? (h.x - room) / at : 30,
        at < count - 1 ? (vw - room - h.x) / (count - 1 - at) : 30));
      ticks.style.setProperty('--tick', `${step.toFixed(2)}px`);
      ticks.innerHTML = '<span class="nb-scrub-tick"></span>'.repeat(count);
      const ticksLeft0 = h.x - (at + 0.5) * step;
      scrub = { id: h.id, el, book, at, count, step, ticksLeft: ticksLeft0 };
      draw();
      const r = el.getBoundingClientRect();
      const w = card.offsetWidth;
      const centre = Math.max(w / 2 + 8, Math.min(vw - w / 2 - 8, ticksLeft0 + (count * step) / 2));
      scrub.ticksLeft = centre - (count * step) / 2; // the ticks sit in the card's middle
      card.style.left = `${centre.toFixed(1)}px`;
      card.style.top = `${(r.top - 6).toFixed(1)}px`;
      card.classList.add('is-open');
      el.classList.add('is-held');
    }
    function end(e) {
      if (hold && e.pointerId === hold.id) { clearTimeout(hold.timer); hold = null; }
      if (!scrub || e.pointerId !== scrub.id) return;
      scrub.el.classList.remove('is-held');
      scrub = null;
      card.classList.remove('is-open');
    }
    document.addEventListener('pointermove', (e) => {
      if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) >= 8) { clearTimeout(hold.timer); hold = null; }
      if (!scrub || e.pointerId !== scrub.id) return;
      const to = Math.max(0, Math.min(scrub.count - 1, Math.floor((e.clientX - scrub.ticksLeft) / scrub.step)));
      if (to === scrub.at) return;
      scrub.at = to;
      scrub.book.go(to);
      draw();
    });
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    books.forEach((book) => {
      const { el } = book;
      el.classList.add('nb-page-num');
      el.addEventListener('pointerdown', (e) => {
        if (e.button || !e.isPrimary || scrub) return;
        if (hold) clearTimeout(hold.timer);
        const h = { id: e.pointerId, x: e.clientX, y: e.clientY, el, book };
        h.timer = setTimeout(() => { if (hold === h) open(h); }, 380);
        hold = h;
      });
      el.addEventListener('contextmenu', e => e.preventDefault());
    });
  })();
};
