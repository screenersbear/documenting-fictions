// Shoot mode's clock.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootModeClock = function addShootModeClock(ed) {
  Object.assign(ed, { startShootModeClock, stopShootModeClock, shootDateTime, shootWrapAt, renderShootModeClock });
  // ---------- Shoot mode clock ----------
  // Under the shoot's name: when it wraps and, on the shoot's day, when it
  // starts until it has, then how long is left ("Wrap 6:30 PM · 1h 12m
  // left", then "10m over"). Tapping the wrap
  // time moves it: the shoot's own end time, for a shoot that's running
  // long. Under that, golden hour when it falls inside the shoot, and with
  // MUST_HAVE_WARNING_MINUTES or less to go, how many must-have (starred)
  // shots are still to get. Redrawn every 30 seconds while Shoot mode is up,
  // and whenever a shot is ticked, starred or removed.
  const MUST_HAVE_WARNING_MINUTES = 45;
  let shootModeClockTimer = null;

  function startShootModeClock() {
    stopShootModeClock();
    renderShootModeClock();
    shootModeClockTimer = setInterval(renderShootModeClock, 30000);
  }

  function stopShootModeClock() {
    clearInterval(shootModeClockTimer);
    shootModeClockTimer = null;
  }

  // 'HH:MM' on a shoot's date, as a Date; null without both.
  function shootDateTime(dateStr, timeStr) {
    if (!dateStr || !/^\d{1,2}:\d{2}/.test(timeStr || '')) return null;
    const at = ed.parseShootDate(dateStr);
    const [h, m] = timeStr.split(':').map(Number);
    at.setHours(h, m, 0, 0);
    return at;
  }

  // When a shoot wraps: its end time on its date, or the next morning for a
  // shoot that runs past midnight — an end at or before its start, or with
  // no start time, an end before 5am (the hour the app's day turns over,
  // see effectiveReportDateStr).
  function shootWrapAt(shoot) {
    const wrap = shootDateTime(shoot.date, shoot.endTime);
    const start = shootDateTime(shoot.date, shoot.startTime);
    if (wrap && (start ? wrap <= start : wrap.getHours() < 5)) wrap.setDate(wrap.getDate() + 1);
    return wrap;
  }

  function clockTimeOf(date) {
    return ed.prettyTime(`${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`);
  }

  // "5:41–6:29 PM", or "11:40 AM–12:15 PM" across noon.
  function clockRangeOf(from, to) {
    const a = clockTimeOf(from);
    const b = clockTimeOf(to);
    return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
  }

  // "1h 12m", "2h", "45m".
  function formatMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!h) return `${m}m`;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  // The next whole or half hour from now, as 'HH:MM': what the picker opens
  // on for a shoot with no wrap time yet. Left empty, iOS fills in the time
  // right now as it opens.
  function nextHalfHour(now) {
    const at = new Date(now);
    at.setSeconds(0, 0);
    at.setMinutes(at.getMinutes() < 30 ? 30 : 60);
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  }

  function renderShootModeClock() {
    const shoot = ed.state.shoots.find(s => s.id === ed.getShootModeShootId());
    if (!shoot) return;
    const now = new Date();
    const input = document.getElementById('shootModeWrapInput');
    document.getElementById('shootModeWrapPill').textContent = shoot.endTime ? `Wrap ${ed.prettyTime(shoot.endTime)}` : 'Set wrap time';
    // Not while the picker's open on it: its wheel writes as it turns.
    if (document.activeElement !== input) input.value = shoot.endTime || nextHalfHour(now);

    // A countdown only on the shoot's own day (from 5am, the same day the
    // launch popups use), with a wrap time to count to, and once the shoot
    // has started: before its start time, that's what shows instead.
    const onTheDay = !!shoot.date && shoot.date === ed.effectiveReportDateStr();
    const wrap = onTheDay ? shootWrapAt(shoot) : null;
    const start = onTheDay ? shootDateTime(shoot.date, shoot.startTime) : null;
    let minsLeft = null;
    let leftText = '';
    if (start && now < start) {
      leftText = `Starts ${ed.prettyTime(shoot.startTime)}`;
    } else if (wrap) {
      const ms = wrap - now;
      minsLeft = ms > 0 ? Math.ceil(ms / 60000) : -Math.floor(-ms / 60000);
      if (minsLeft > 0) leftText = `${formatMinutes(minsLeft)} left`;
      else leftText = minsLeft < 0 ? `${formatMinutes(-minsLeft)} over` : "It's wrap time";
    }
    document.getElementById('shootModeTimeLeft').textContent = leftText;

    const mustHaves = (shoot.shotList || []).filter(item => item && item.starred && !item.checked && ed.hasText(item.text)).length;
    const mustHavesEl = document.getElementById('shootModeMustHaves');
    mustHavesEl.hidden = !(mustHaves && minsLeft !== null && minsLeft <= MUST_HAVE_WARNING_MINUTES);
    mustHavesEl.textContent = `${mustHaves} must-have${mustHaves === 1 ? '' : 's'} to go`;

    const goldenEl = document.getElementById('shootModeGoldenHour');
    const coords = onTheDay ? ed.shootModeCoords() : null;
    const golden = coords ? ed.shootGoldenHour(shoot, coords, now) : null;
    goldenEl.hidden = !golden;
    if (golden) {
      goldenEl.textContent = golden.start <= now
        ? `Golden hour now, until ${clockTimeOf(golden.end)}`
        : `Golden hour ${clockRangeOf(golden.start, golden.end)}`;
    }
  }

  // A wrap time picked on the pill. Saved on 'change' and again on blur —
  // iOS changes the value as its wheel turns, and its Done may close the
  // picker without one — straight to the shoot, like everything else in
  // Shoot mode. A project's days don't share their times, so a day's own
  // wrap moves alone. An empty value (the picker's Reset) changes nothing.
  function saveShootModeWrap() {
    const shoot = ed.state.shoots.find(s => s.id === ed.getShootModeShootId());
    const value = document.getElementById('shootModeWrapInput').value.slice(0, 5);
    if (!shoot || !/^\d{2}:\d{2}$/.test(value) || value === shoot.endTime) return;
    shoot.endTime = value;
    ed.saveState();
    renderShootModeClock();
  }

  document.getElementById('shootModeWrapInput').addEventListener('change', saveShootModeWrap);
  document.getElementById('shootModeWrapInput').addEventListener('blur', saveShootModeWrap);
};
