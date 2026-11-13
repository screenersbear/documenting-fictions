// The time range (the end time starts 2 hours after the start).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootTimeRange = function addShootTimeRange(ed) {
  // ---------- Time range (default end time to 2h after start) ----------
  // The step="1800" attribute keeps a native wheel/spinner picker to :00/:30
  // stops, but a typed-in value (desktop keyboard entry, or a pasted value)
  // can still land off-step — rounding here on commit guarantees the shoot
  // never actually saves an odd time like 2:43 regardless of how it was entered.
  function roundToNearestHalfHour(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = ((Math.round((h * 60 + m) / 30) * 30) + 1440) % 1440;
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }

  document.getElementById('shootStartTime').addEventListener('change', () => {
    const startInput = document.getElementById('shootStartTime');
    const endInput = document.getElementById('shootEndTime');
    if (!startInput.value) return;
    startInput.value = roundToNearestHalfHour(startInput.value);
    const [h, m] = startInput.value.split(':').map(Number);
    const endH = (h + 2) % 24;
    endInput.value = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  document.getElementById('shootEndTime').addEventListener('change', () => {
    const endInput = document.getElementById('shootEndTime');
    if (!endInput.value) return;
    endInput.value = roundToNearestHalfHour(endInput.value);
  });

  // Video-only call times (crew/talent) snap to :00/:30 the same way.
  ['shootCrewCallTime', 'shootTalentCallTime'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      const input = document.getElementById(id);
      if (!input.value) return;
      input.value = roundToNearestHalfHour(input.value);
    });
  });
};
