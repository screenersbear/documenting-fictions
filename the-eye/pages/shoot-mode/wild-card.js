// Shoot mode: the Wild card.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootModeWildCard = function addShootModeWildCard(ed) {
  // Deliberately no backdrop-click dismiss: this is a mode you're working in
  // with a camera in your other hand, not a popup to swipe away by accident.

  // ---------- Shoot mode: Wild card ----------
  // A nudge to try something different mid-shoot: one short card, in the
  // spirit of Eno and Schmidt's Oblique Strategies but in our own words, and
  // general enough for any shoot — photo or video, and the ones (weddings,
  // events) where you can't direct anybody. Drawn from a shuffled deck rather
  // than at random each time, so every card comes up once before any
  // repeats; the deck is saved, so the next shoot carries on through it.
  const WILD_CARD_DECK_KEY = 'dailies_wild_card_deck_v1';

  const WILD_CARDS = [
    'Hold the camera up as high as you safely can and shoot straight down.',
    'Find a shadow more interesting than whatever casts it, and make the shadow the subject.',
    'Shoot through something: a doorway, leaves, a glass, the gap between two shoulders.',
    'Put something soft and blurry right in front of the lens so it covers a third of the shot.',
    'Focus on the background and let the person become a soft shape.',
    'Shoot much darker than feels right. What does the light alone show you?',
    'Let the bright parts burn to pure white. Does the shot still hold together?',
    'Find a reflection in a window, puddle, car door or polished table, and shoot only that.',
    'Get close until one detail is all you see: a cuff, a shoelace, an earring, a button.',
    'Move until the strongest light is right behind your subject, and let it glow around them.',
    'Find the one strongly colored thing in sight and build a shot around it.',
    'For the next five minutes, only shoot things that share one color.',
    'Follow something moving with the camera so it stays sharp while the world streaks behind it.',
    'Find the softest light here, then the harshest. Shoot something in each and compare.',
    'Find a pool of light on a wall or floor and wait for someone to step into it.',
    'Shoot everything at your widest setting for the next five minutes.',
    'Use your longest lens or tightest zoom and find one honest moment from across the room.',
    'Use only light that was here before you arrived, and find the best of it: a window, lamp, sign or candle.',
    'Let half the shot fall into deep shadow.',
    'Place your subject hard against one edge of the shot and leave the rest open.',
    'Find the darkest corner here and look for the little light that still reaches it.',
    'Hold the camera perfectly still on one view and let people wander in and out of the shot.',
    'Find a thin slice of light, like a gap in the curtains, and use only that.',
    'Shoot from the eye height of a five-year-old for the next few minutes.',
    'Find a colored light, like a sign, candle or screen, and catch someone as it falls across them.',
    'Shoot one scene twice: once with the camera dead still, once with it moving.',
    'Wait for the light to shift, like a cloud passing or a door opening, and shoot as it changes.',
    'Find where two kinds of light meet, like window and lamp, and look for faces on that line.',
    'Ask about the last thing that made them laugh, and shoot while they answer.',
    'Shoot only hands for the next five minutes.',
    'Keep shooting for three seconds after everyone thinks you\'re done.',
    'Find the person watching your subject and make them the story for one shot.',
    'Shoot what your subject is looking at, then shoot them looking at it.',
    'Find someone holding something that matters to them, and shoot what their hands do with it.',
    'Lower the camera and talk for two minutes, then raise it mid-sentence.',
    'Catch someone in the breath just before they speak.',
    'Turn away from what everyone is watching and shoot their faces instead.',
    'Find two people who aren\'t talking but are standing the same way.',
    'Wait for the second laugh; the first one is usually for you.',
    'Shoot someone from behind and let their posture tell the story.',
    'Catch someone fixing themselves: a sleeve, a collar, a stray hair.',
    'When people hug, move to the side where only one face shows.',
    'Hold the camera at your chest, chat face to face, and shoot without looking.',
    'Find someone taking a photo on their phone, and shoot their face while they do it.',
    'Look for someone holding something for someone else: a bag, a coat, a drink.',
    'Watch for the moment their shoulders drop, and shoot that instead of the smile.',
    'Find someone showing another person how to do something, and shoot the teaching.',
    'Hunt for small touches: a hand on a back, a nudge, a squeeze of fingers.',
    'Ask an odd little question, like their favorite smell, and shoot the thinking face.',
    'Shoot the waiting: people killing time between the moments that matter.',
    'Ask who they got their smile from, and catch the face they make remembering.',
    'Mirror their posture for a minute, then shoot whatever shifts in them.',
    'Find whoever is quietly making today work, and give them one great shot.',
    'Shoot an exit: someone leaving a room, a car or a conversation.',
    'Catch the face someone makes when they spot a person they\'re glad to see.',
    'Wait for two people to look at each other instead of at you.',
    'Catch people arriving, in the second before they\'ve arranged their face.',
    'Turn around and shoot whatever is behind you for the next minute.',
    'Turn, walk twenty paces away, then face the scene again and shoot from there.',
    'Plant your feet for the next ten minutes. Turn, crouch and lean, but don\'t step.',
    'Make the place the subject: let the people be tiny, or leave them out entirely.',
    'Wait for something to pass between you and your subject, and shoot as it crosses.',
    'Look straight up, then straight down. Shoot something there you\'d been ignoring.',
    'Find the spot nobody would think to shoot from, and work from there.',
    'Find the plainest wall here and wait for someone interesting to pass in front of it.',
    'Pick one object that\'s already here and get it into every shot for the next five minutes.',
    'Set a silent three-minute timer. When it goes off, shoot what\'s in front of you without adjusting anything.',
    'Look for what people have left behind, like a glass, a coat or a pushed-back chair, and shoot it.',
    'Take your next shot from a spot you\'ve already walked past twice.',
    'Keep shooting, but pick three things here worth coming back to, then go get each one.',
    'Shoot something that will be gone within the hour: a patch of light, a melting drink, a crowd.',
    'Find something here that thousands of hands have touched, and shoot it up close.',
    'Flip a coin: heads, your next shot is from higher up; tails, from much lower down.',
    'What is this place for on an ordinary day? Make one shot that shows it.',
    'What does this place sound like? Make a shot someone could almost hear.',
    'Wait for everything to go still, and shoot in the second after it does.',
    'Bring today\'s weather into one shot, even indoors: a wet umbrella, a steamy window, sun on the floor.',
    'Take your next shot from exactly where you stood when you first arrived.',
    'Find something that doesn\'t belong in this place and make it the point of the shot.',
    'Find the stillest thing here and line it up in one shot with something moving.',
    'Shoot from where a guest or visitor would sit. What do they actually see?',
  ];

  // Read from storage once a launch, then kept here: a save that fails
  // (storage full) can't hand back an old deck and repeat the card just seen.
  let wildCardDeck = null;

  function loadWildCardDeck() {
    if (wildCardDeck) return wildCardDeck;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(WILD_CARD_DECK_KEY)); } catch (e) { /* ignore */ }
    // Saved as the cards' text, so rewording or cutting one later just drops
    // it from the current pass; cards added since join the next one.
    const left = saved && Array.isArray(saved.left)
      ? [...new Set(saved.left)].filter(text => WILD_CARDS.includes(text)) : [];
    wildCardDeck = { left, last: saved && typeof saved.last === 'string' ? saved.last : null };
    return wildCardDeck;
  }

  function drawWildCard() {
    const deck = loadWildCardDeck();
    if (!deck.left.length) deck.left = ed.shuffleArray([...WILD_CARDS]);
    // The one repeat a shuffle can't rule out: a new pass opening on the card
    // that ended the last one. That card goes to the back instead.
    if (deck.left.length > 1 && deck.left[0] === deck.last) deck.left.push(deck.left.shift());
    deck.last = deck.left.shift();
    try { localStorage.setItem(WILD_CARD_DECK_KEY, JSON.stringify(deck)); } catch (e) { /* ignore */ }
    return deck.last;
  }

  function showWildCard() {
    // A shot or Shooting notes left focused (tapping a button on iOS never
    // blurs one) would keep the keyboard up over the card and go on taking
    // typing and Return under it — same as askConfirm.
    const focused = document.activeElement;
    if (focused && focused !== document.body && typeof focused.blur === 'function') focused.blur();
    document.getElementById('shootModeWildCardText').textContent = drawWildCard();
    syncWildCardTried();
    document.getElementById('shootModeWildCardOverlay').hidden = false;
  }

  function closeWildCard() {
    document.getElementById('shootModeWildCardOverlay').hidden = true;
  }

  // "Tried it", or once it's been tapped for this card on this shoot, the
  // line saying it's kept.
  function syncWildCardTried() {
    const shoot = ed.state.shoots.find(s => s.id === ed.getShootModeShootId());
    const card = document.getElementById('shootModeWildCardText').textContent;
    const tried = !!shoot && Array.isArray(shoot.triedWildCards) && shoot.triedWildCards.includes(card);
    document.getElementById('shootModeWildCardTriedBtn').hidden = tried;
    document.getElementById('shootModeWildCardSaved').hidden = !tried;
  }

  document.getElementById('shootModeWildCardBtn').addEventListener('click', showWildCard);
  // "Another" draws the next card in place, from the same deck.
  document.getElementById('shootModeWildCardAnotherBtn').addEventListener('click', showWildCard);
  document.getElementById('shootModeWildCardCloseBtn').addEventListener('click', closeWildCard);
  document.getElementById('shootModeWildCardOkBtn').addEventListener('click', closeWildCard);
  // Keeps the card on screen with the shoot (triedWildCards: the card's own
  // words, oldest first, each once) for its reflection to ask how it went
  // (see wildCardReflectQuestions). Looked up fresh: the shoot page's
  // autosave swaps the shoot object for a new one.
  document.getElementById('shootModeWildCardTriedBtn').addEventListener('click', () => {
    const shoot = ed.state.shoots.find(s => s.id === ed.getShootModeShootId());
    const card = document.getElementById('shootModeWildCardText').textContent;
    if (!shoot || !card) return;
    if (!Array.isArray(shoot.triedWildCards)) shoot.triedWildCards = [];
    if (!shoot.triedWildCards.includes(card)) shoot.triedWildCards.push(card);
    ed.saveState();
    syncWildCardTried();
  });
};
