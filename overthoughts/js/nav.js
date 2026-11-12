// Back, from an entry or a review: to where you came from inside the app, or
// to the section it belongs to when the app was opened straight onto it.
let moves = 0;
export const moved = () => { moves += 1; };
export const back = (fallback) => { if (moves > 0) history.back(); else location.hash = fallback; };
