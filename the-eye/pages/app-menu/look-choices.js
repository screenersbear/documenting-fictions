// The notebook's colour and where the app starts: the choices drawn on
// Options (round 2, 08-options) and on the standalone sun menu, and what a
// tap on one of them does. Saved in state.presentation, as before.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuLookChoices = function addAppMenuLookChoices(ed) {
  Object.assign(ed, { colorChoicesHtml, startChoicesHtml, pickLookChoice });
  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"/></svg>';
  // Inside Documenting Fictions the shelf is the shut notebook, so there's
  // no starting on it.
  const START_CHOICES = [['last', 'Where I left off'], ['notebook', 'Notebook'], ['first', 'Overview']]
    .filter(([key]) => !window.DF_SUITE || key !== 'notebook');

  // A swatch for each colour: the band with its partner's line and half
  // circle (styles/options-sheet.css draws them), ticked when it's the one.
  function colorChoicesHtml() {
    const now = ed.state.presentation.color;
    return `<div class="opt-colors" role="radiogroup" aria-label="Notebook color">${ed.APP_COLORS.map(([key, name]) => `
      <button type="button" class="opt-color" role="radio" data-color="${key}" aria-checked="${key === now}">
        <span class="opt-swatch" data-swatch="${key}"><span class="opt-swatch-line"></span><span class="opt-swatch-sun"></span>${key === now ? `<span class="opt-swatch-tick">${TICK}</span>` : ''}</span>
        <span class="opt-color-name">${name}</span>
      </button>`).join('')}</div>`;
  }

  function startChoicesHtml() {
    const now = ed.state.presentation.start;
    return `<div class="opt-seg opt-seg-fit">${START_CHOICES.map(([key, name]) => `
      <button type="button" data-start="${key}" class="${now === key ? 'active' : ''}" aria-pressed="${now === key}">${name}</button>`).join('')}</div>`;
  }

  // A tap on a colour or a start: saved, shown, and true; anything else false.
  // `redraw` puts the choices back with the new one marked.
  function pickLookChoice(button, redraw) {
    if (button.dataset.color) {
      ed.state.presentation.color = button.dataset.color;
      ed.saveState();
      ed.applyAppColor(ed.state.presentation.color);
    } else if (button.dataset.start) {
      ed.state.presentation.start = button.dataset.start;
      ed.state.presentation.startPicked = true;
      ed.saveState();
    } else {
      return false;
    }
    redraw();
    return true;
  }
};
