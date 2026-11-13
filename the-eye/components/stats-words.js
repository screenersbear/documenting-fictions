// The one-line sentence over each chart on Stats ("Nine of fourteen shoots
// delivered. Two are waiting on your edit."). A chart's rows in, words out
// (no page, no saved data), so it's unit tested
// (tests/unit/the-eye/stats-words.test.mjs).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addStatsWords = function addStatsWords(ed) {
  Object.assign(ed, { numberWord, statsSentence });
  const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const IN_THE_EDIT = ['waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions'];
  const NOT_A_PLACE = ['No location set', '__other_locations__'];

  // Up to twenty in words, then figures.
  function numberWord(n) {
    return Number.isInteger(n) && n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
  }
  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
  const count = (n, one, many) => `${numberWord(n)} ${n === 1 ? one : many}`;
  const sum = rows => rows.reduce((total, d) => total + d.value, 0);

  function status(rows) {
    const total = sum(rows);
    const delivered = sum(rows.filter(d => d.key === 'delivered'));
    const edit = sum(rows.filter(d => IN_THE_EDIT.includes(d.key)));
    const first = total === 1
      ? (delivered ? 'Your one shoot is delivered.' : "Your one shoot isn't delivered yet.")
      : `${capital(delivered ? numberWord(delivered) : 'none')} of ${numberWord(total)} shoots delivered.`;
    if (!edit) return first;
    return `${first} ${capital(numberWord(edit))} ${edit === 1 ? 'is' : 'are'} waiting on your edit.`;
  }

  // A kind of shoot as a countable noun: a row's `plural` ("wedding
  // shoots"), else made from its label ("Content shoot" -> "content shoots").
  const kinds = d => d.plural || d.label.toLowerCase().replace(/( shoot)?$/, ' shoots');
  const aOrAn = words => `${/^[aeiou]/.test(words) ? 'an' : 'a'} ${words}`;

  function categories(rows) {
    const [top, next] = rows;
    if (rows.length === 1 && top.value === 1) return `Your one shoot is ${aOrAn(kinds(top).replace(/s$/, ''))}.`;
    if (rows.length === 1) return `${top.value === 2 ? 'Both' : `All ${numberWord(top.value)}`} are ${kinds(top)}.`;
    if (next.value === top.value) return `${capital(kinds(top))} and ${kinds(next)} are level, ${numberWord(top.value)} each.`;
    return `More ${kinds(top)} than anything else: ${numberWord(top.value)} of ${numberWord(sum(rows))}.`;
  }

  function team(rows) {
    const roles = rows.filter(d => d.key !== '__none__');
    if (!roles.length) return 'Just you on every shoot so far.';
    const [top, next] = roles;
    if (top.key === 'other') return 'Most of your team is listed as Other.';
    const role = d => aOrAn(d.label.toLowerCase());
    const level = next && next.value === top.value && next.key !== 'other';
    return `You work with ${role(top)}${level ? ` and ${role(next)}` : ''} most often.`;
  }

  function locations(rows) {
    const places = rows.filter(d => !NOT_A_PLACE.includes(d.key));
    if (!places.length) return 'No locations set yet.';
    const [top, next] = places;
    if (top.value === 1) return places.length === 1 ? `One shoot so far, at ${top.label}.` : `${capital(numberWord(places.length))} places, one shoot each.`;
    if (next && next.value === top.value) return `${top.label} and ${next.label} are level, ${numberWord(top.value)} shoots each.`;
    return `${top.label} is where you shoot most: ${numberWord(top.value)} shoots.`;
  }

  function visualLanguages(rows) {
    const [top, next] = rows;
    if (next && next.value === top.value) return `${top.label} and ${next.label} come up most, on ${count(top.value, 'shoot', 'shoots')} each.`;
    return `${top.label} comes up most, on ${count(top.value, 'shoot', 'shoots')}.`;
  }

  function regions(rows) {
    if (rows.length === 1) return `Every shoot so far is in ${rows[0].label}.`;
    if (rows[1].value === rows[0].value) return `Shot across ${numberWord(rows.length)} countries.`;
    return `Shot across ${numberWord(rows.length)} countries, most in ${rows[0].label}.`;
  }

  const SENTENCES = { status, shootCategory: categories, teamMembers: team, location: locations, visualLanguage: visualLanguages, regions };

  // `rows` as the chart draws them, most first: { key, label, value }.
  function statsSentence(pageKey, rows) {
    const say = SENTENCES[pageKey];
    if (!say || !Array.isArray(rows) || !sum(rows)) return '';
    return say(rows);
  }
};
