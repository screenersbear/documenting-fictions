// Shared helpers for the browser tests.
import cfg from '../../kit.config.mjs';

export { cfg };

export const CLICKABLE = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[onclick]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'summary',
  'label[for]',
].join(',');

/** Collect every problem a page reports while we use it. */
export function watch(page, origin) {
  const problems = [];
  const ignored = (text) => cfg.ignoreConsoleErrors.some((s) => text.includes(s));
  page.on('pageerror', (e) => problems.push(`JS crash: ${e.message}`));
  page.on('console', (m) => {
    // "Failed to load resource" is reported below with its URL, so skip the URL-less duplicate.
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource') && !ignored(m.text())) {
      problems.push(`console.error: ${m.text()}`);
    }
  });
  page.on('response', (r) => {
    if (r.url().startsWith(origin) && r.status() >= 400 && !ignored(r.url())) {
      problems.push(`HTTP ${r.status()} for ${r.url()}`);
    }
  });
  page.on('requestfailed', (r) => {
    if (r.url().startsWith(origin) && !ignored(r.url())) {
      problems.push(`request failed: ${r.url()} (${r.failure()?.errorText})`);
    }
  });
  // Never let an alert/confirm freeze the run. Dismiss = the "cancel" path.
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  return problems;
}

/**
 * Tag every visible, clickable, same-site element with data-safety-idx
 * and return a fingerprint + human label for each, in page order.
 */
export async function markClickables(page) {
  return page.evaluate(
    ({ sel, skip, modalSel }) => {
      document.querySelectorAll('[data-safety-idx]').forEach((e) => e.removeAttribute('data-safety-idx'));
      const out = [];
      // While a modal dialog is open, a person can only use what's inside it
      // (the page behind is dimmed and covered), so only those count. The last
      // open one in page order is the one on top.
      const shown = (e) => {
        const b = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden]');
      };
      const modals = [...document.querySelectorAll(modalSel)].filter(shown);
      const scope = modals.length ? modals[modals.length - 1] : document;
      for (const el of scope.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
        // Faded out to nothing and not taking taps: nobody can see or press it.
        if (cs.pointerEvents === 'none') continue;
        let faded = false;
        for (let a = el; a && a !== document.documentElement; a = a.parentElement) if (getComputedStyle(a).opacity === '0') { faded = true; break; }
        if (faded) continue;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
        if (skip.some((s) => el.closest(s))) continue;
        if (el.tagName === 'A') {
          const href = el.getAttribute('href') || '';
          if (/^(mailto:|tel:|sms:|javascript:)/i.test(href)) continue;
          const u = new URL(el.href, location.href);
          if (u.origin !== location.origin || el.target === '_blank' || el.hasAttribute('download')) continue;
        }
        const label = (
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          el.innerText ||
          el.value ||
          el.id ||
          el.getAttribute('class') ||
          el.tagName
        )
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 60);
        const fp = [el.tagName, el.id, el.getAttribute('class'), el.getAttribute('href'), label].join('|');
        el.setAttribute('data-safety-idx', String(out.length));
        out.push({ fp, label: `<${el.tagName.toLowerCase()}> "${label}"` });
      }
      return out;
    },
    { sel: CLICKABLE, skip: cfg.skipClickSelectors, modalSel: (cfg.modalSelectors || ['[aria-modal="true"]', 'dialog[open]']).join(',') },
  );
}

/** A brand new, isolated browser tab (fresh storage) with the same device settings as the project. */
// returning: start with safety.config.json's returningVisitor.localStorage saved,
// as someone who has opened the app before. Otherwise storage is empty, and we
// wait firstVisitWaitMs for anything shown on a first visit to come up.
export async function freshPage(browser, testInfo, path, { returning = false } = {}) {
  const u = testInfo.project.use;
  const ctx = await browser.newContext({
    baseURL: u.baseURL,
    viewport: u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: u.isMobile,
    hasTouch: u.hasTouch,
  });
  if (returning) {
    await ctx.addInitScript((saved) => {
      for (const [k, v] of Object.entries(saved)) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } }
    }, cfg.returningVisitor?.localStorage || {});
  }
  const page = await ctx.newPage();
  const problems = watch(page, new URL(u.baseURL).origin);
  await page.goto(path);
  await page.waitForLoadState('networkidle').catch(() => {});
  if (!returning && cfg.firstVisitWaitMs) await page.waitForTimeout(cfg.firstVisitWaitMs);
  return { ctx, page, problems };
}

export async function clickIdx(page, idx) {
  await page.locator(`[data-safety-idx="${idx}"]`).first().click({ timeout: 3000 });
  await page.waitForTimeout(cfg.settleMs);
}
