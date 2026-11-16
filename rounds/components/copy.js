// Copies words to the clipboard (COPY AND OPEN, COPY AGAIN). True when it
// worked; where the clipboard can't be reached, a hidden box is selected and
// copied the old way.
export async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position: fixed; opacity: 0;';
    document.body.append(t);
    t.select();
    const ok = document.execCommand?.('copy');
    t.remove();
    return !!ok;
  }
}
