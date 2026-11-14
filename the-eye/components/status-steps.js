// The status card on a shoot's page (round 5, 12-shoot-status-card): the
// stages a shoot goes through in order (Prospect to Delivered, with the
// photo or video steps between), each a bar a little taller than the one
// before: done, now, or still to come. Postponed and Canceled are off that
// line, so the card says so instead. Statuses in, plain parts out (no page,
// no saved data), so it's unit tested (tests/unit/the-eye/status-steps.test.mjs).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addStatusSteps = function addStatusSteps(ed) {
  Object.assign(ed, { statusSteps });
  const OFF = ['rescheduled', 'canceled'];
  const LOW = 10;
  const HIGH = 28;

  // keys: the statuses the shoot's status field offers, in order
  // (statusOptionKeys); current: the shoot's. Gives each stage's bar (its
  // state and height in px), where the shoot is ("3 of 7"; empty off the
  // line), and whether it's off the line.
  function statusSteps(keys, current) {
    const stages = keys.filter(k => !OFF.includes(k));
    const at = stages.indexOf(current);
    const rise = (HIGH - LOW) / Math.max(stages.length - 1, 1);
    const state = i => (i < at ? 'done' : (i === at ? 'now' : 'later'));
    return {
      off: OFF.includes(current),
      count: at < 0 ? '' : `${at + 1} of ${stages.length}`,
      bars: stages.map((key, i) => ({ key, state: state(i), height: Math.round((LOW + rise * i) * 10) / 10 })),
    };
  }
};
