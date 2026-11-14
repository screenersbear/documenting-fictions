// Handing a file over, and picking one to bring in: the same as the suite's
// shared files.js (Rounds doesn't load the shared data; see data/eye.js).

// The share sheet where there is one (Save to Files on a phone), else a download.
export async function saveFile(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: file.name }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

// Asks for a file (from Files, OneDrive or iCloud on a phone); resolves with it.
export function pickFile(accept) {
  return new Promise((ok) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => { ok(input.files && input.files[0] ? input.files[0] : null); input.remove(); });
    document.body.appendChild(input);
    input.click();
  });
}
