// Options' Back up and Restore a backup, the same as every notebook's: Back
// up is the sheet they share (components/shared/backup-sheet.js: just
// Rounds, or all four), and Restore puts a backup of Rounds back, or asks
// first when it has all four (components/shared/restore-sheet.js). On its
// own, only Rounds' part of a backup of all four can go back, and the sheets
// say so. Rounds' sync key (data/device.js) is never in a backup.

// Just this notebook, or all four notebooks, as one zip (a few on a phone).
export function backUp() {
  window.DFBackupSheet.open({ here: 'rounds' });
}

// close: closes Options, once the restore's going ahead.
export async function restoreBackup(close) {
  const R = window.DFRestore;
  const files = await window.DFData.pickFiles(R.PICK); // straight from the tap, or iOS won't open the picker
  if (!files.length) return;
  const pick = await R.which(files, 'rounds');
  if (!pick) return;
  close();
  R.confirm(pick.all ? files : pick.files, { only: pick.all ? null : 'rounds', alone: !window.DF_SUITE });
}
