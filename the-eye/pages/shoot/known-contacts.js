// Looking up a handle among the talents and team members you know.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootKnownContacts = function addShootKnownContacts(ed) {
  Object.assign(ed, { lookupBestContactHandle });
  // ---------- Known-contact handle lookup (talents + team members) ----------
  // Scans every shoot's talents/team members for a name match and returns
  // whatever handle(s) were saved for them last time — so a returning
  // client or a repeat team member's handle doesn't have to be retyped.
  // Rebuilt fresh on every lookup (simple over clever: this app's shoot
  // count never gets remotely large enough for that to matter).
  function buildContactHandleRegistry() {
    const registry = new Map(); // name (trimmed, lowercased) -> Map(platform -> handle)
    function record(name, platform, handle) {
      const key = (name || '').trim().toLowerCase();
      if (!key || !ed.hasText(handle)) return;
      if (!registry.has(key)) registry.set(key, new Map());
      registry.get(key).set(platform || 'instagram', handle.trim());
    }
    ed.state.shoots.forEach(s => {
      (s.talents || []).forEach(t => {
        (t.socialHandles || []).forEach(sh => record(t.name, sh.platform, sh.handle));
      });
      (s.teamMembers || []).forEach(tm => record(tm.name, tm.socialPlatform, tm.socialHandle));
    });
    return registry;
  }

  function lookupContactHandles(name) {
    const key = (name || '').trim().toLowerCase();
    if (!key) return [];
    const entry = buildContactHandleRegistry().get(key);
    if (!entry) return [];
    return Array.from(entry.entries()).map(([platform, handle]) => ({ platform, handle }));
  }

  // Team members only have room for one handle — prefer instagram (the
  // default platform) if the contact has one, otherwise whatever's on file.
  function lookupBestContactHandle(name) {
    const matches = lookupContactHandles(name);
    if (!matches.length) return null;
    return matches.find(m => m.platform === 'instagram') || matches[0];
  }
};
