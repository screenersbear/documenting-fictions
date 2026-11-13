// Made by tools/join.mjs from the files listed in files.txt. Never edit it: change those files, then run node tools/join.mjs.
// \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", {
	value,
	configurable: true
});

// components/keyboard-fit.js
const vv = window.visualViewport;
const html$1 = document.documentElement;
let leftoverTop = 0;
function fitViewport() {
	if (!vv) return;
	const a = document.activeElement;
	const typingNow = !!a && a.matches("input:not([type=\"checkbox\"]), textarea, [contenteditable]");
	if (!typingNow) leftoverTop = vv.offsetTop;
	html$1.style.setProperty("--vv-top", `${typingNow ? Math.max(0, vv.offsetTop - leftoverTop) : 0}px`);
	html$1.style.setProperty("--vv-height", `${typingNow ? vv.height : window.innerHeight}px`);
}
if (vv) {
	vv.addEventListener("resize", fitViewport);
	vv.addEventListener("scroll", fitViewport);
	document.addEventListener("focusin", fitViewport);
	document.addEventListener("focusout", () => setTimeout(fitViewport, 300));
	fitViewport();
}

// components/screen-fit.js
const html = document.documentElement;
const iPhoneApp = /iPhone|iPod/.test(navigator.userAgent) && (navigator.standalone === true || matchMedia("(display-mode: standalone)").matches);
const typing = () => !!document.activeElement && document.activeElement.matches("input, textarea, [contenteditable]");
let probe = null;
function screenGap(full = 0) {
	if (!document.body) return 0;
	if (!probe) {
		probe = document.createElement("div");
		probe.setAttribute("aria-hidden", "true");
		probe.style.cssText = "position: fixed; left: 0; bottom: 0; width: 1px; height: 0; visibility: hidden; pointer-events: none; padding-top: var(--test-safe-top, env(safe-area-inset-top));";
		document.body.appendChild(probe);
	}
	const portrait = Math.abs(window.innerWidth - screen.width) < 2;
	const real = full || (portrait ? screen.height : screen.width);
	html.style.setProperty("--screen-h", `${Math.round(real)}px`);
	const under = parseFloat(getComputedStyle(probe).paddingTop) > 0;
	const gap = Math.round(real - probe.getBoundingClientRect().bottom);
	if (under) return gap > 8 && gap < 120 ? gap : 0;
	return gap > 76 && gap < 150 ? Math.round(gap / 2) : 0;
}
let nudging = false;
function nudgeScreen(tries = 3, full = 0) {
	return new Promise((done) => {
		const go = (left) => {
			if (!left || !screenGap(full) || typing()) {
				nudging = false;
				done(screenGap(full));
				return;
			}
			nudging = true;
			html.classList.add("ios-nudge");
			setTimeout(() => {
				const y = window.scrollY;
				window.scrollTo(0, y + 1);
				setTimeout(() => {
					window.scrollTo(0, y);
					setTimeout(() => {
						html.classList.remove("ios-nudge");
						setTimeout(() => go(left - 1), 200);
					}, 120);
				}, 40);
			}, 30);
		};
		if (nudging) done(screenGap(full));
		else go(tries);
	});
}
let measured = false;
function markShort(gap) {
	html.classList.toggle("is-short", gap > 0);
	if (gap > 0) html.style.setProperty("--short-by", `${gap}px`);
	else html.style.removeProperty("--short-by");
}
if (iPhoneApp) {
	let soonTimer = 0;
	const soon = (ms) => clearTimeout(soonTimer) || (soonTimer = setTimeout(() => {
		if (!nudging && screenGap() > 0) html.classList.remove("settled");
		nudgeScreen().then(async (gap) => {
			if (gap > 0) {
				html.classList.add("ios-hold");
				await new Promise((r) => setTimeout(r, 40));
				window.scrollTo(0, 1);
				await new Promise((r) => setTimeout(r, 60));
				window.scrollTo(0, 0);
				await new Promise((r) => setTimeout(r, 200));
				gap = screenGap();
				if (gap > 0) html.classList.remove("ios-hold");
			}
			measured = true;
			markShort(gap);
			setAppHeight();
			html.classList.add("settled");
		});
	}, ms));
	window.addEventListener("load", () => soon(120));
	window.addEventListener("pageshow", () => soon(80));
	document.addEventListener("visibilitychange", () => {
		if (!document.hidden) soon(80);
	});
	window.addEventListener("orientationchange", () => soon(300));
}
let appH = 0;
function setBookHeight() {
	const portrait = Math.abs(window.innerWidth - screen.width) < 2;
	html.style.setProperty("--book-h", `${iPhoneApp ? portrait ? screen.height : screen.width : window.innerHeight}px`);
}
setBookHeight();
window.addEventListener("resize", setBookHeight);
function setAppHeight() {
	if (html.classList.contains("ios-nudge") || nudging || typing()) return;
	const h = window.innerHeight;
	if (Math.abs(h - appH) < 2) return;
	appH = h;
	html.style.setProperty("--app-h", `${h}px`);
	if (measured) markShort(screenGap());
	window.dispatchEvent(new Event("ref-layout"));
}
setAppHeight();
setTimeout(() => html.classList.add("settled"), iPhoneApp ? 3500 : 0);
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", () => setTimeout(setAppHeight, 350));
document.addEventListener("visibilitychange", () => {
	if (!document.hidden) setTimeout(setAppHeight, 900);
});
window.addEventListener("load", () => setTimeout(setAppHeight, 900));
document.addEventListener("touchmove", (e) => {
	if (!html.classList.contains("ios-hold") || e.touches.length > 1) return;
	for (let el = e.target; el && el !== document.body; el = el.parentElement) {
		const st = getComputedStyle(el);
		if (/auto|scroll/.test(st.overflowY) && el.scrollHeight > el.clientHeight || /auto|scroll/.test(st.overflowX) && el.scrollWidth > el.clientWidth) return;
		if (st.touchAction === "none") return;
	}
	e.preventDefault();
}, { passive: false });

// components/no-zoom.js
document.addEventListener("gesturestart", (e) => e.preventDefault());
if (/iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
	const meta = document.querySelector("meta[name=\"viewport\"]");
	if (meta && !/maximum-scale/.test(meta.content)) meta.content += ", maximum-scale=1";
}

// components/util.js
function uuid() {
	if (crypto.randomUUID) return crypto.randomUUID();
	const b = crypto.getRandomValues(new Uint8Array(16));
	b[6] = b[6] & 15 | 64;
	b[8] = b[8] & 63 | 128;
	const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function nowISO() {
	return new Date().toISOString();
}
function esc(v) {
	return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clone = (v) => JSON.parse(JSON.stringify(v));
function shortDate(iso) {
	const d = new Date(iso);
	const opts = {
		month: "short",
		day: "numeric"
	};
	if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
	return d.toLocaleDateString(undefined, opts);
}
function slug(name) {
	const s = String(name || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
	return s || "post";
}
function debounce(fn, ms) {
	let t;
	const run = (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn(...args), ms);
	};
	run.flush = (...args) => {
		clearTimeout(t);
		return fn(...args);
	};
	run.cancel = () => clearTimeout(t);
	return run;
}
function downloadBlob(blob, name) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 6e4);
}
function canvasToBlob(canvas, type, quality) {
	try {
		const url = canvas.toDataURL(type, quality);
		const comma = url.indexOf(",");
		if (comma < 0 || url.length < 30) throw new Error("Could not make the image");
		const mime = url.slice(5, url.indexOf(";")) || type;
		const bin = atob(url.slice(comma + 1));
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return Promise.resolve(new Blob([bytes], { type: mime }));
	} catch (e) {
		return Promise.reject(e);
	}
}
const nextFrame = () => new Promise((r) => setTimeout(r, 0));
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.decoding = "async";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Could not open the image"));
		img.src = src;
	});
}
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
const isPhone = () => window.matchMedia("(pointer: coarse)").matches;

// components/icons.js
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
	back: svg("<path d=\"M14.5 5l-7 7 7 7\"/>"),
	plus: svg("<path d=\"M12 5v14M5 12h14\"/>"),
	x: svg("<path d=\"M6 6l12 12M18 6L6 18\"/>"),
	trash: svg("<path d=\"M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13\"/>"),
	menu: svg("<path d=\"M4 7h16M4 12h16M4 17h16\"/>"),
	sun: svg("<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4\"/>"),
	entries: svg("<path d=\"M6 3.5h12v17H6z\"/><path d=\"M9 8h6M9 11.5h6M9 15h3.5\"/>"),
	week: svg("<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15.5\" rx=\"1.5\"/><path d=\"M3.5 9.5h17M8 3v4M16 3v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2\"/>"),
	reviews: svg("<path d=\"M4.5 12a7.5 7.5 0 1 0 2.2-5.3\"/><path d=\"M4.5 4.5v3.2h3.2\"/><path d=\"M12 8.2V12l2.6 1.6\"/>"),
	eye: svg("<path d=\"M18 3.5H9.2a3 3 0 0 0-3 3v4.6M6 20.5h8.8a3 3 0 0 0 3-3v-4.6M8.7 6.6l6.6 10.8\"/>"),
	photo: svg("<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"14\" rx=\"1.5\"/><circle cx=\"9\" cy=\"10\" r=\"1.6\"/><path d=\"M4 17.5l5-4.5 3.5 3 3-2.5 4.5 4\"/>"),
	bulb: svg("<path d=\"M9 17.5h6M10 20.5h4M12 3.5a5.5 5.5 0 0 0-3.2 10c.5.4.7 1 .7 1.6v.4h5v-.4c0-.6.2-1.2.7-1.6A5.5 5.5 0 0 0 12 3.5z\"/>")
};

// components/page-head.js
const head = (title, plus, menu) => `<h1 class="head${plus || menu ? " head-add" : ""}">${menu && window.DF_SUITE ? `<button type="button" class="head-plus head-menu" data-app-menu aria-label="Menu">${ICONS.menu}</button>` : ""}${esc(title)}${plus ? `<a class="head-plus" href="#/new" aria-label="Write an entry">${ICONS.plus}</a>` : ""}</h1>`;
const note = (t) => `<p class="note">${esc(t)}</p>`;

// data/store.js
const D$3 = window.DFData;
const hasText = D$3.hasText;
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
];
const db = () => D$3.overthoughts();
const written = (e) => e && e.kind !== "reflection" && e.from !== "the-eye";
async function allEntries() {
	return (await D$3.rows(await db(), "entries")).map(([, e]) => e).filter(written);
}
async function getEntry(id) {
	const e = await D$3.getOne(await db(), "entries", id);
	return written(e) ? e : null;
}
async function saveEntry(e) {
	e.updatedAt = D$3.nowIso();
	await D$3.putMany(await db(), "entries", [e]);
	return e;
}
async function deleteEntry(id) {
	const d = await db();
	const links = (await D$3.rows(d, "links")).map(([, l]) => l).filter((l) => l.toId === id || l.fromId === id);
	const tx = d.transaction([
		"entries",
		"images",
		"links"
	], "readwrite");
	tx.objectStore("entries").delete(id);
	tx.objectStore("images").delete(id);
	links.forEach((l) => tx.objectStore("links").delete(l.id));
	await new Promise((ok, no) => {
		tx.oncomplete = ok;
		tx.onerror = tx.onabort = () => no(tx.error || new Error("That entry wasn't deleted."));
	});
}
function newEntry(date) {
	const now = D$3.nowIso();
	return {
		id: D$3.uid(),
		kind: "free",
		date: date || D$3.todayStr(),
		title: "",
		body: "",
		tags: [],
		takeaway: "",
		shootId: null,
		createdAt: now,
		updatedAt: now
	};
}
async function photos(id) {
	const v = await D$3.getOne(await db(), "images", id);
	return (Array.isArray(v) ? v : []).map((p) => typeof p === "string" ? {
		src: p,
		caption: ""
	} : p);
}
async function setPhotos(id, list) {
	const d = await db();
	if (list.length) await D$3.putMany(d, "images", [[id, list]]);
	else await D$3.deleteOne(d, "images", id);
}
async function photoIds() {
	return new Set((await D$3.rows(await db(), "images")).filter(([, v]) => Array.isArray(v) && v.length).map(([k]) => k));
}
async function allReviews() {
	return (await D$3.rows(await db(), "reviews")).map(([, r]) => r);
}
async function getReview(id) {
	return D$3.getOne(await db(), "reviews", id);
}
async function saveReview(r) {
	r.updatedAt = D$3.nowIso();
	await D$3.putMany(await db(), "reviews", [r]);
}
const hasWords = (e) => hasText(e.title) || hasText(e.body) || hasText(e.takeaway);
const firstLine = (t) => (t || "").replace(/^\[[^\]]*\]\s*/, "").split("\n").map((l) => l.trim()).find(Boolean) || "";
const entryTitle = (e) => e.title || firstLine(e.body) || "Untitled entry";
const oneLine = (t) => (t || "").replace(/\s*\n+\s*/g, " ").trim();
function dayOf(s) {
	const [y, m, d] = String(s || "").slice(0, 10).split("-").map(Number);
	return y ? new Date(y, (m || 1) - 1, d || 1) : new Date();
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function prettyDay(s) {
	const d = dayOf(s);
	return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}
const monthKey = (s) => String(s || "").slice(0, 7);
const monthName = (key) => {
	const [y, m] = key.split("-").map(Number);
	return `${MONTHS[m - 1]} ${y}`;
};
const byNewest = (a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || "");

// pages/entries.js
function entryRow(e) {
	const d = dayOf(e.date);
	const meta = hasText(e.takeaway) ? oneLine(e.takeaway) : oneLine(e.body).slice(0, 90);
	return `<a class="row entry-row" href="#/entry/${encodeURIComponent(e.id)}">
    <span class="row-open">
      <span class="day"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()].slice(0, 3)}</small></span>
      <span class="row-text">
        <span class="row-name">${esc(entryTitle(e))}</span>
        <span class="row-meta">${esc(meta)}</span>
      </span>
    </span>
  </a>`;
}
async function entriesScreen(view) {
	const shown = (await allEntries()).filter(hasWords).sort(byNewest);
	let html = "";
	let month = "";
	shown.forEach((e) => {
		const m = monthKey(e.date);
		if (m !== month) {
			month = m;
			html += `<h2 class="month">${esc(monthName(m))}</h2>`;
		}
		html += entryRow(e);
	});
	const empty = "Nothing here yet. Tap + to write your first entry.";
	view.innerHTML = `<div class="screen">
    ${head("Entries", true, true)}
    <div class="scroll"><div class="rows">${html || note(empty)}</div></div>
  </div>`;
}

// pages/reviews.js
function periodOf(id) {
	const m = /^month-(\d{4})-(\d{2})$/.exec(id);
	return m ? {
		id,
		period: "month",
		key: `${m[1]}-${m[2]}`,
		title: monthName(`${m[1]}-${m[2]}`),
		within: (d) => monthKey(d) === `${m[1]}-${m[2]}`
	} : null;
}
function gather(entries, p) {
	return entries.filter((e) => e.date && p.within(e.date) && hasText(e.takeaway)).sort((a, b) => a.date.localeCompare(b.date));
}
async function reviewsScreen(view) {
	const entries = (await allEntries()).filter((e) => e.date && hasText(e.takeaway));
	const months = [...new Set(entries.map((e) => monthKey(e.date)))].sort().reverse();
	const row = (k) => {
		const n = entries.filter((e) => monthKey(e.date) === k).length;
		return `<a class="row" href="#/review/month-${k}"><span class="row-open"><span class="row-text">
      <span class="row-name">${esc(monthName(k))}</span>
      <span class="row-meta">${n} takeaway${n === 1 ? "" : "s"}</span>
    </span></span></a>`;
	};
	view.innerHTML = `<div class="screen">
    ${head("Reviews")}
    <div class="scroll"><div class="rows">${months.map(row).join("") || note("The takeaways from your entries gather here, month by month.")}</div></div>
  </div>`;
}

// pages/sections.js
const SECTIONS$1 = [entriesScreen, reviewsScreen];

// components/nav.js
let moves = 0;
const moved = () => {
	moves += 1;
};
const back$2 = /* @__PURE__ */ __name((fallback) => {
	if (moves > 0) history.back();
	else location.hash = fallback;
}, "back");

// components/sheet.js
const X_ICON = "<svg class=\"x-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg>";
const open = [];
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && open.length) {
		e.stopPropagation();
		open[open.length - 1].close();
	}
});
const sheetIsOpen = () => open.length > 0;
function openSheet({ title, body = "", className = "", onClose } = {}) {
	const opener = document.activeElement;
	const overlay = document.createElement("div");
	overlay.className = "sheet-overlay";
	overlay.style.zIndex = String(50 + open.length * 2);
	overlay.innerHTML = `
    <div class="sheet ${esc(className)}" role="dialog" aria-modal="true" aria-labelledby="sheetTitle${open.length}">
      <header class="sheet-header">
        <h2 id="sheetTitle${open.length}">${esc(title)}</h2>
        <button type="button" class="close-btn" data-close aria-label="Close">${X_ICON}</button>
      </header>
      <div class="sheet-body">${body}</div>
    </div>`;
	document.body.appendChild(overlay);
	document.body.classList.add("sheet-open");
	const el = overlay.querySelector(".sheet");
	const api = {
		el,
		overlay,
		body: el.querySelector(".sheet-body"),
		setTitle(t) {
			el.querySelector(".sheet-header h2").textContent = t;
		},
		close(result) {
			if (!overlay.isConnected) return;
			overlay.remove();
			open.splice(open.indexOf(api), 1);
			if (!open.length) document.body.classList.remove("sheet-open");
			if (opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true });
			if (onClose) onClose(result);
		}
	};
	open.push(api);
	const openedAt = performance.now();
	overlay.addEventListener("click", (e) => {
		if (performance.now() - openedAt < 450) {
			e.stopPropagation();
			e.preventDefault();
		}
	}, true);
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay || e.target.closest("[data-close]")) api.close();
	});
	el.setAttribute("tabindex", "-1");
	el.focus({ preventScroll: true });
	return api;
}
function closeAllSheets() {
	while (open.length) open[open.length - 1].close();
}

// components/dialogs.js
function confirmSheet({ title, message = "", confirmLabel = "OK", cancelLabel = "Cancel", danger = false }) {
	return new Promise((resolve) => {
		let answer = false;
		const s = openSheet({
			title,
			className: "sheet-small",
			body: `
        ${message ? `<p class="sheet-message">${message}</p>` : ""}
        <div class="sheet-actions">
          <button type="button" class="btn secondary" data-no>${esc(cancelLabel)}</button>
          <button type="button" class="btn ${danger ? "danger" : "primary"}" data-yes>${esc(confirmLabel)}</button>
        </div>`,
			onClose: () => resolve(answer)
		});
		s.body.querySelector("[data-no]").addEventListener("click", () => s.close());
		s.body.querySelector("[data-yes]").addEventListener("click", () => {
			answer = true;
			s.close();
		});
	});
}
function choiceSheet({ title, message = "", options, footer = "" }) {
	return new Promise((resolve) => {
		let answer = null;
		const s = openSheet({
			title,
			className: "sheet-small",
			body: `
        ${message ? `<p class="sheet-message">${message}</p>` : ""}
        <div class="choice-list">
          ${options.map((o) => o.heading ? `<span class="field-label choice-heading">${esc(o.heading)}</span>` : `<button type="button" class="choice${o.current ? " current" : ""}${o.danger ? " is-danger" : ""}" data-key="${esc(o.key)}">
                ${o.icon || ""}<span class="choice-text"><span class="choice-label">${esc(o.label)}</span>
                ${o.detail ? `<span class="choice-detail">${esc(o.detail)}</span>` : ""}</span></button>`).join("")}
        </div>${footer}`,
			onClose: () => resolve(answer)
		});
		s.body.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
			answer = b.dataset.key;
			s.close();
		}));
	});
}
function promptSheet({ title, label = "Name", value = "", confirmLabel = "Save", placeholder = "", allowEmpty = false }) {
	return new Promise((resolve) => {
		let answer = null;
		const s = openSheet({
			title,
			className: "sheet-small",
			body: `
        <form class="form" data-form>
          <label class="field">
            <span class="field-label">${esc(label)}</span>
            <input type="text" name="v" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="80" autocomplete="off" enterkeyhint="done" />
          </label>
          <div class="sheet-actions">
            <button type="button" class="btn secondary" data-no>Cancel</button>
            <button type="submit" class="btn primary">${esc(confirmLabel)}</button>
          </div>
        </form>`,
			onClose: () => resolve(answer)
		});
		const form = s.body.querySelector("[data-form]");
		const input = form.querySelector("input");
		s.body.querySelector("[data-no]").addEventListener("click", () => s.close());
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const v = input.value.trim();
			if (!v && !allowEmpty) {
				input.focus();
				return;
			}
			answer = v;
			s.close();
		});
		setTimeout(() => {
			input.focus();
			input.select();
		}, 60);
	});
}

// components/toast.js
let toastTimer;
function toast(message, { action, ms = 3200 } = {}) {
	const el = document.getElementById("toast");
	el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button" class="toast-action">${esc(action.label)}</button>` : ""}`;
	el.hidden = false;
	el.classList.remove("show");
	void el.offsetWidth;
	el.classList.add("show");
	if (action) {
		el.querySelector(".toast-action").addEventListener("click", () => {
			el.hidden = true;
			action.run();
		});
	}
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		el.hidden = true;
	}, action ? ms + 2e3 : ms);
}
function hideToast() {
	clearTimeout(toastTimer);
	const el = document.getElementById("toast");
	if (el) el.hidden = true;
}

// data/prompts.js
const PROMPTS = [
	"What does the light in your favorite recent image tell you about how your eye has changed this year?",
	"When you look back at your earliest portraits, what technical habit do you notice yourself repeating that you no longer do?",
	"Where in your process do you still hesitate, and what would it take to move through that hesitation?",
	"What is a compositional choice you used to avoid that you now reach for instinctively?",
	"Describe an image where you let a mistake stay in the frame. What did it end up giving you?",
	"Which of your recent edits pulled you further from what your camera actually captured, and why did that feel right?",
	"What have you been quietly practicing behind the scenes that hasn't shown up in your published work yet?",
	"When did you last change your mind mid-shoot about how a story should be told, and what shifted?",
	"What's a piece of gear or software you've been avoiding learning, and what is that avoidance protecting you from?",
	"Think of a portrait you underexposed on purpose. What were you trying to make the viewer feel?",
	"What do your color grades keep telling on you about your current mood or mindset?",
	"Which subject's face have you photographed enough times that you're starting to see new things in familiar light?",
	"What is the difference between the photographer you were a year ago and the one editing tonight?",
	"Where does your eye go first when you walk into a new space, and has that instinct shifted recently?",
	"What's an editing decision you keep un-doing and re-doing on the same image, and what does that back-and-forth reveal?",
	"Which of your recent images relied on someone else's trust more than your own technical skill?",
	"What is a lighting setup you've stopped using, and what replaced it in your instincts?",
	"When did a technical limitation (bad light, wrong lens, no time) accidentally push your storytelling somewhere better?",
	"What's the difference between a photo you took to prove something and one you took because you needed to see it?",
	"Which recurring pose or gesture do you now steer subjects away from, and when did that change?",
	"What have you started noticing in other photographers' work that you didn't have language for a year ago?",
	"Where in your editing workflow do you rush, and what would slowing down there cost you?",
	"What's an image you're proud of that you almost didn't take because it broke one of your own rules?",
	"Which part of your process still feels like performance rather than instinct?",
	"What does your default crop ratio say about how you think a story should be framed?",
	"When did you last choose imperfection over polish in a final image, and how did that sit with you?",
	"What technical skill are you building right now that has nothing to do with the camera itself?",
	"Which recent shoot made you realize your composition instincts have outgrown your gear, or the reverse?",
	"What's a visual habit from your early work you're trying to unlearn on purpose?",
	"Where do you still copy another photographer's choices instead of trusting your own eye?",
	"What's the boldest editing choice you've made this year that a client or viewer never noticed?",
	"Which image took the most technical risk, and what would you have lost by playing it safe?",
	"What do you keep photographing that you haven't figured out how to talk about yet?",
	"When does your work feel most like you, technically speaking: in the shooting or in the editing?",
	"What's a piece of feedback about your style that stung because it was accurate?",
	"Which shadow, reflection, or blur have you been chasing across several shoots without naming why?",
	"What story are you telling with your sequencing choices lately, separate from any single image?",
	"Where has your relationship with sharpness and focus shifted? What used to feel essential that no longer does?",
	"What's an editing preset or look you built for yourself, and what does it protect you from deciding each time?",
	"Which recent portrait required you to abandon your plan entirely? What did you learn from following the moment instead?",
	"What technical constraint are you currently working within on purpose, as a way of forcing growth?",
	"Which of your images do you return to not because it's good, but because it's unresolved?",
	"What have you stopped explaining to clients because you trust your instincts on it now?",
	"Where does your work get quieter, less composed, less controlled, and what happens there?",
	"What's a color, texture, or type of light you avoid because it's difficult, not because it's wrong for the story?",
	"Which recent choice in the edit surprised you, as if someone else made it?",
	"What does the gap between how you shoot and how you were taught to shoot look like right now?",
	"When did you last let a subject's discomfort into the frame instead of directing it away?",
	"What's a narrative device (silence, distance, repetition) you've started borrowing from outside photography?",
	"Which of your technical strengths has quietly become a crutch?",
	"What would your work look like if you removed the safety net you always fall back on?",
	"Where do you sense your next stylistic shift coming from, even if you can't see it clearly yet?",
	"What's an image you keep revisiting in your edits months later, and what does it still ask of you?",
	"Which lighting decision do you make almost without thinking now that used to take real deliberation?",
	"What have you learned about restraint, pulling back rather than adding, in your recent editing?",
	"Where in your body do you feel it when a frame is right, before you can explain why?",
	"What's a technical rule you broke recently on purpose, and what did it cost or earn you?",
	"Which of your images tells a story you didn't consciously intend to tell?",
	"What do you notice yourself avoiding in post-production: a tone, a correction, a truth?",
	"When did your understanding of composition move from rules to something more like intuition?",
	"What's a risk you took with a client's portrait that you wouldn't have taken a year ago?",
	"Which piece of your process have you handed over to trust (in your gear, your instinct, or your subject) that you used to control?",
	"What does your unedited, unfiltered first look at a shoot tell you that the final selects don't?",
	"Where do you find yourself softening an image's harder truths, and is that instinct serving the story?",
	"What's a technique you admire in someone else's work that you've tried and deliberately abandoned?",
	"Which recent shoot asked more of your patience than your technical skill?",
	"What does the pace of your shutter finger these days say about how you're seeing?",
	"Where has your eye for negative space changed, and what filled that space before?",
	"What's an image that only worked because you let go of your original intention for it?",
	"Which technical habit are you currently trying to build so it becomes as automatic as breathing?",
	"What does it feel like in your body when you know a shot is right before you even check the screen?",
	"When was the last time you trusted your first instinct instead of second-guessing it?",
	"What would you shoot differently if you were certain no one would judge the result?",
	"How has the way you carry yourself on a shoot changed since your first paid job?",
	"What would it look like to direct a session without apologizing for your choices?",
	"What part of your personality shows up most clearly in how you pose or direct people?",
	"When did you last shoot something purely because you wanted to, with no client attached?",
	"How do you talk to yourself in your head during a shoot that isn't going well?",
	"What does your instinct to move closer or step back from a subject say about how you relate to people?",
	"What do you notice about yourself in how you wait for a moment versus how you chase one?",
	"What does the way you edit, what you keep and what you cut, reveal about what you value?",
	"When you photograph strangers versus people you love, what changes in you?",
	"Which of your early favorites would you be embarrassed to shoot the same way today?",
	"What have you started noticing in light or gesture that you used to walk right past?",
	"How has your definition of a good portrait changed since you started?",
	"What photographers or images shaped your eye early on, and do they still?",
	"What do you find yourself drawn to now that would have bored you a few years ago?",
	"Which habit in your work do you think you've outgrown but haven't fully let go of?",
	"When did you last say yes to a shoot that scared you, and what happened?",
	"How do you know when a photograph is actually finished versus when you're just tired of looking at it?",
	"What does the pace at which you shoot, rushed or unhurried, say about your state of mind lately?",
	"What went badly with a client or a shoot in a way that reshaped how you work now?",
	"Which technical habit have you kept out of loyalty rather than necessity?",
	"What would it look like to make one image this month purely for yourself, with no audience in mind?",
	"What quality in another photographer's images do you admire but haven't found in your own yet?",
	"Which image by another photographer has stayed with you long after you saw it, and why?",
	"When you study a photograph you love, what are you actually looking for?",
	"What do you notice yourself borrowing, consciously or not, from photographers you admire?",
	"Whose restraint in their work teaches you something your own instincts resist?",
	"What does it feel like in your body the moment a subject stops performing and starts simply being themselves in front of your lens?",
	"Think of a client who arrived guarded. What did you do, or not do, that let them soften?",
	"How do you know, in the middle of a shoot, that you've earned someone's trust rather than just their compliance?",
	"Recall a moment when you had to choose between the shot you wanted and the comfort of the person you were photographing. What did you choose, and how do you feel about it now?",
	"What's a piece of direction you give often that you've never really examined. Where did it come from?",
	"Describe the last time a subject cried in front of your camera, and what you did in that instant.",
	"When has silence on set told you more than anything either of you said?",
	"Who is the collaborator (stylist, assistant, agent, makeup artist) who reads a room better than you do, and what have you learned from watching them work?",
	"What do you do differently when you sense someone has been hurt by a photographer before?",
	"Think about a shoot where the client's vision and your instinct pulled in opposite directions. How did you find the middle, or did you?",
	"What does trust sound like, specifically? What words or tone do you reach for in the first five minutes with someone new?",
	"When was the last time you were wrong about someone before the camera even came out, and what taught you that?",
	"Describe a subject who taught you something about your own way of seeing.",
	"What's the difference between a client who directs you and a client who lets you lead, and which unsettles you more?",
	"Recall a shoot that felt like a genuine conversation rather than a job. What made it that way?",
	"How do you handle the moment a client's expectations and the person actually standing in front of you don't match?",
	"What have you learned about consent and comfort that no one taught you in school?",
	"Think of the collaborator you've worked with the longest. How has your shorthand with them changed over the years?",
	"When has a subject surprised you by trusting you with something vulnerable, on or off camera?"
];
function pickPrompt(not) {
	let p = not;
	while (p === not && PROMPTS.length > 1) p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
	return p;
}

// pages/entry.js
const D$2 = window.DFData;
const back$1 = /* @__PURE__ */ __name(() => back$2("#/entries"), "back");
function eyeShoots() {
	if (!D$2.inSuite()) return [];
	const st = D$2.eyeState();
	if (!st || !Array.isArray(st.shoots)) return [];
	return st.shoots.filter((s) => s && s.id).map((s) => ({
		id: s.id,
		name: D$2.eyeShootName(s, st.titleDisplayMode),
		date: s.date || ""
	})).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
function grow(t) {
	t.style.height = "auto";
	t.style.height = `${t.scrollHeight + 2}px`;
}
function resizePhoto(file, max = 1600) {
	return new Promise((ok, no) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
			const c = document.createElement("canvas");
			c.width = Math.round(img.naturalWidth * k);
			c.height = Math.round(img.naturalHeight * k);
			c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
			URL.revokeObjectURL(url);
			ok(c.toDataURL("image/jpeg", .86));
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			no(new Error("That photo couldn't be opened."));
		};
		img.src = url;
	});
}
async function entryScreen(view, id) {
	const fresh = !id;
	let e = fresh ? newEntry() : await getEntry(id);
	if (!e) {
		view.innerHTML = "<div class=\"screen\"><p class=\"note center\">That entry isn't here any more.</p></div>";
		return () => {};
	}
	let saved = !fresh;
	let pics = fresh ? [] : await photos(e.id);
	const shoots = eyeShoots();
	const eyeLink = (shootId) => D$2.notebookUrl("the-eye", { shoot: shootId });
	const shootName = () => {
		const s = shoots.find((x) => x.id === e.shootId);
		return s ? s.name : e.shootName || "";
	};
	const field = (label, f, opts = {}) => `<label class="group">
      <span class="label">${esc(label)}</span>
      ${opts.area ? `<textarea class="write${opts.big ? " big" : ""}" data-f="${f}" rows="${opts.rows || 3}" placeholder="${esc(opts.placeholder || "")}">${esc(e[f] || "")}</textarea>` : `<input class="hand-input" type="${opts.type || "text"}" data-f="${f}" value="${esc(f === "tags" ? (e.tags || []).join(", ") : e[f] || "")}" placeholder="${esc(opts.placeholder || "")}" autocomplete="off" />`}
    </label>`;
	const body = `${field("Date", "date", { type: "date" })}
      ${field("Title", "title", { placeholder: "If you like" })}
      <div class="group">
        <span class="label">What's on your mind</span>
        <textarea class="write big" data-f="body" rows="7" placeholder="Anything on your mind?">${esc(e.body || "")}</textarea>
        <button type="button" class="link-btn" data-prompt>${ICONS.bulb}<span>Need a starting prompt?</span></button>
      </div>
      <div class="group"><span class="label">Photos</span><div class="pics" data-pics></div></div>
      ${shoots.length || e.shootId ? `<div class="group"><span class="label">About a shoot</span><button type="button" class="pick-line" data-shoot>${esc(shootName() || "None")}</button>${e.shootId && eyeLink(e.shootId) ? `<a class="small-link" href="${eyeLink(e.shootId)}">Open it in The Eye</a>` : ""}</div>` : ""}
      ${field("Takeaway", "takeaway", {
		area: true,
		rows: 2,
		placeholder: "The one thing to keep from this"
	})}`;
	view.innerHTML = `<div class="screen entry-page">
    <div class="folder-head">
      <button type="button" class="icon-btn" data-back aria-label="Back">${ICONS.back}</button>
      <h1>${fresh ? "New entry" : "Entry"}</h1>
      <button type="button" class="icon-btn" data-delete aria-label="Delete this entry">${ICONS.trash}</button>
    </div>
    <div class="scroll"><div class="form-page">${body}</div></div>
  </div>`;
	const root = view.querySelector(".screen");
	root.querySelectorAll("textarea").forEach(grow);
	let dirty = false;
	const store = async () => {
		if (!dirty) return;
		if (!saved && !hasWords(e) && !pics.length) return;
		dirty = false;
		saved = true;
		await saveEntry(e);
		if (fresh && location.hash === "#/new") history.replaceState(null, "", `#/entry/${encodeURIComponent(e.id)}`);
	};
	const later = debounce(() => store().catch((err) => toast(err.message || "That wasn't saved.")), 450);
	root.addEventListener("input", (ev) => {
		const t = ev.target.closest("[data-f]");
		if (!t) return;
		const f = t.dataset.f;
		if (f === "tags") e.tags = t.value.split(",").map((x) => x.trim()).filter(Boolean);
		else if (f === "date") e.date = t.value || e.date;
		else e[f] = t.value;
		if (t.tagName === "TEXTAREA") grow(t);
		dirty = true;
		later();
	});
	const picsEl = root.querySelector("[data-pics]");
	const drawPics = () => {
		if (!picsEl) return;
		picsEl.innerHTML = pics.map((p, i) => `<span class="pic"><img src="${esc(p.src)}" alt="" /><button type="button" class="pic-x" data-remove="${i}" aria-label="Remove this photo">${ICONS.x}</button></span>`).join("") + `<label class="pic add" aria-label="Add photos">${ICONS.photo}<input type="file" accept="image/*" multiple hidden /></label>`;
	};
	drawPics();
	picsEl?.addEventListener("change", async (ev) => {
		const files = [...ev.target.files || []];
		if (!files.length) return;
		try {
			for (const f of files) pics.push({
				src: await resizePhoto(f),
				caption: ""
			});
			dirty = true;
			await store();
			await setPhotos(e.id, pics);
			drawPics();
		} catch (err) {
			toast(err.message || "That photo wasn't added.");
		}
	});
	picsEl?.addEventListener("click", async (ev) => {
		const b = ev.target.closest("[data-remove]");
		if (!b) return;
		ev.preventDefault();
		if (!await confirmSheet({
			title: "Remove photo",
			message: "Take this photo off the entry?",
			confirmLabel: "Remove",
			danger: true
		})) return;
		pics.splice(Number(b.dataset.remove), 1);
		await setPhotos(e.id, pics);
		drawPics();
	});
	let lastPrompt = "";
	root.addEventListener("click", async (ev) => {
		if (ev.target.closest("[data-back]")) {
			back$1();
			return;
		}
		if (ev.target.closest("[data-prompt]")) {
			const t = root.querySelector("[data-f=\"body\"]");
			const p = pickPrompt(lastPrompt);
			lastPrompt = p;
			const rest = t.value.replace(/^\[[^\]]*\]\s*/, "");
			t.value = `[${p}]\n\n${rest}`;
			e.body = t.value;
			dirty = true;
			grow(t);
			t.focus();
			t.setSelectionRange(t.value.length, t.value.length);
			later();
			return;
		}
		if (ev.target.closest("[data-shoot]")) {
			const options = [{
				key: "",
				label: "None",
				current: !e.shootId
			}, ...shoots.map((s) => ({
				key: s.id,
				label: s.name,
				detail: s.date ? prettyDay(s.date) : "",
				current: s.id === e.shootId
			}))];
			const pick = await choiceSheet({
				title: "About a shoot",
				options
			});
			if (pick === null || pick === undefined) return;
			e.shootId = pick || null;
			const s = shoots.find((x) => x.id === e.shootId);
			e.shootName = s ? s.name : "";
			dirty = true;
			await store();
			ev.target.closest("[data-shoot]").textContent = shootName() || "None";
			const g = ev.target.closest(".group");
			g.querySelector(".small-link")?.remove();
			if (e.shootId && eyeLink(e.shootId)) g.insertAdjacentHTML("beforeend", `<a class="small-link" href="${eyeLink(e.shootId)}">Open it in The Eye</a>`);
			return;
		}
		if (ev.target.closest("[data-delete]")) {
			if (!saved) {
				back$1();
				return;
			}
			if (!await confirmSheet({
				title: "Delete entry",
				message: "This entry and its photos go for good.",
				confirmLabel: "Delete",
				danger: true
			})) return;
			try {
				await deleteEntry(e.id);
			} catch (err) {
				toast(err.message || "That entry wasn't deleted.");
				return;
			}
			saved = false;
			toast("Entry deleted");
			back$1();
		}
	});
	return () => {
		later.cancel();
		store().catch(console.error);
	};
}

// pages/review.js
const back = () => back$2("#/reviews");
async function reviewScreen(view, id) {
	const p = periodOf(id);
	if (!p) {
		location.hash = "#/reviews";
		return () => {};
	}
	const takes = gather(await allEntries(), p);
	const take = (e) => `<a class="take" href="#/entry/${encodeURIComponent(e.id)}">
      <span class="take-name">${esc(entryTitle(e))}<small>${esc(prettyDay(e.date))}</small></span>
      <span class="take-text">${esc(oneLine(e.takeaway))}</span>
    </a>`;
	view.innerHTML = `<div class="screen review-page">
    <div class="folder-head">
      <button type="button" class="icon-btn" data-back aria-label="Back">${ICONS.back}</button>
      <h1>${esc(p.title)}</h1>
      <span class="icon-btn"></span>
    </div>
    <div class="scroll"><div class="form-page">
      ${takes.map(take).join("") || "<p class=\"note\">No takeaways from your entries this month.</p>"}
    </div></div>
  </div>`;
	view.querySelector("[data-back]").addEventListener("click", back);
	return () => {};
}

// pages/intro.js
const D$1 = window.DFData;
const cards = () => [
	["Write it down", "Tap + on Entries to write what’s on your mind. Stuck for a start? Pick a prompt. Add photos if they help."],
	D$1.inSuite() ? ["About a shoot", "An entry can be about one of your shoots in The Eye, with a link to open it there. Give it a takeaway too: the one thing to keep from it."] : ["A takeaway", "Give an entry a takeaway: the one thing to keep from it."],
	["Reviews", "The takeaways from your entries gather in Reviews, month by month, so you can look back on what changed."],
	["Keep a copy", "Your entries are saved inside the app, on this phone. Now and then, save a backup in Options."]
];
function openIntro() {
	const CARDS = cards();
	let at = 0;
	const s = openSheet({
		title: CARDS[0][0],
		className: "sheet-small intro"
	});
	const draw = () => {
		const last = at === CARDS.length - 1;
		s.setTitle(CARDS[at][0]);
		s.body.innerHTML = `
      <p class="sheet-message">${CARDS[at][1]}</p>
      <span class="wz-dots intro-dots" aria-hidden="true">${CARDS.map((_, i) => `<i class="${i === at ? "on" : ""}"></i>`).join("")}</span>
      <div class="sheet-actions${at ? "" : " one"}">
        ${at ? "<button type=\"button\" class=\"btn secondary\" data-back>Back</button>" : ""}
        <button type="button" class="btn primary" data-next>${last ? "Got it" : "Next"}</button>
      </div>`;
	};
	s.body.addEventListener("click", (e) => {
		if (e.target.closest("[data-back]")) {
			at--;
			draw();
		} else if (e.target.closest("[data-next]")) {
			if (at === CARDS.length - 1) s.close();
			else {
				at++;
				draw();
			}
		}
	});
	draw();
	return s;
}

// pages/options.js
const D = window.DFData;
const BOOK_KEY = "overthoughts-book";
const START_KEY = "overthoughts-start";
const COLORS = [
	["leaf", "Leaf"],
	["orange", "Orange"],
	["mango", "Mango"],
	["berry", "Berry"],
	["fern", "Fern"],
	["ocean", "Ocean"],
	["ink", "Black"]
];
const startsOpen = () => {
	try {
		return localStorage.getItem(START_KEY) === "open";
	} catch {
		return false;
	}
};
const startPage = () => startsOpen() ? "#/entries" : "";
function useBook(name) {
	document.documentElement.dataset.book = name;
	try {
		localStorage.setItem(BOOK_KEY, name);
	} catch {}
}
function openOptions() {
	const now = document.documentElement.dataset.book || "leaf";
	const s = openSheet({
		title: "Options",
		body: `
      <span class="field-label">App color</span>
      <div class="opt-colors">
        ${COLORS.map(([key, name]) => `
          <button type="button" class="opt-color" data-color="${key}" aria-pressed="${key === now}">
            <span class="opt-book" style="background-image:url(art/${key}-cover.webp)"></span>
            <span>${name}</span>
          </button>`).join("")}
      </div>
      ${D.inSuite() ? "" : `<span class="field-label opt-gap">Always start</span>
      <div class="seg opt-seg">
        <button type="button" data-start="shut"${startsOpen() ? "" : " class=\"on\""}>In the notebook</button>
        <button type="button" data-start="open"${startsOpen() ? " class=\"on\"" : ""}>On the first page</button>
      </div>`}
      <span class="field-label opt-gap">Backup</span>
      <button type="button" class="btn secondary opt-wide" data-save>Save a backup</button>
      <button type="button" class="btn secondary opt-wide" data-restore>Restore a backup</button>
      <button type="button" class="btn secondary opt-wide opt-gap" data-intro>How it works</button>`
	});
	s.body.addEventListener("click", async (e) => {
		const c = e.target.closest("[data-color]");
		if (c) {
			useBook(c.dataset.color);
			s.body.querySelectorAll("[data-color]").forEach((b) => b.setAttribute("aria-pressed", String(b === c)));
		}
		const st = e.target.closest("[data-start]");
		if (st) {
			try {
				localStorage.setItem(START_KEY, st.dataset.start);
			} catch {}
			s.body.querySelectorAll("[data-start]").forEach((b) => b.classList.toggle("on", b === st));
		}
		if (e.target.closest("[data-intro]")) {
			s.close();
			openIntro();
			return;
		}
		if (e.target.closest("[data-save]")) saveBackup();
		if (e.target.closest("[data-restore]")) restoreBackup(s);
	});
}
function saveBackup() {
	let open = true;
	let made = null;
	const s = openSheet({
		title: "Save a backup",
		className: "sheet-small",
		body: "<p class=\"sheet-message\" data-msg>Putting it together</p>",
		onClose: () => {
			open = false;
			if (made) made.done();
		}
	});
	const msg = s.body.querySelector("[data-msg]");
	D.overthoughts().then(() => D.zipBackup({
		app: "overthoughts",
		databases: ["overthoughts"],
		extra: { book: document.documentElement.dataset.book || "leaf" },
		filename: `overthoughts-backup-${D.todayStr()}.zip`,
		onProgress: (f) => {
			if (open) msg.textContent = `Putting it together, ${Math.floor(f * 100)}%`;
		}
	})).then((m) => {
		made = m;
		if (!open) {
			if (m) m.done();
			return;
		}
		if (!m) {
			msg.textContent = "There is nothing to back up yet.";
			return;
		}
		const steps = D.backupSteps(m);
		msg.textContent = steps.note;
		msg.insertAdjacentHTML("afterend", `<button type="button" class="btn secondary opt-wide" data-save>${steps.label}</button>`);
		const btn = s.body.querySelector("[data-save]");
		btn.addEventListener("click", async () => {
			try {
				if (!await steps.tap()) {
					btn.textContent = steps.label;
					return;
				}
				s.close();
				toast("Backup saved");
			} catch (err) {
				console.error(err);
				toast(err.message || "The backup wasn't saved.");
			}
		});
	}).catch((err) => {
		console.error(err);
		if (open) msg.textContent = err.message || "The backup couldn't be made.";
	});
}
async function restoreBackup(options) {
	const files = await D.pickFiles(".zip,application/zip,.json,application/json");
	if (!files.length) return;
	if (!await confirmSheet({
		title: "Restore backup",
		message: "Everything in Overthoughts now is swapped for what's in the file.",
		confirmLabel: "Restore",
		danger: true
	})) return;
	toast("Restoring the backup", { ms: 6e5 });
	try {
		await D.overthoughts();
		const r = await D.isZipFile(files[0]) ? await D.restoreZip(files, { databases: ["overthoughts"] }) : await D.importDb(files[0], "overthoughts", {
			app: "overthoughts",
			replace: true
		});
		const book = r.extra && r.extra.book || (r.local ? await r.local(BOOK_KEY) : null);
		if (book) useBook(book);
		options.close();
		toast("Backup restored");
		refresh();
	} catch (err) {
		console.error(err);
		toast(err.message || "That backup couldn't be restored.");
	}
}
const refresh = () => {
	if ((location.hash || "#/") !== "#/") window.dispatchEvent(new HashChangeEvent("hashchange"));
};

// pages/cover-spin.js
const book$1 = document.getElementById("book");
const SPIN_AWAY = .75;
const SPIN_TOWARD = .95;
const TILT = .42;
const softSpin = (raw) => raw < 0 ? SPIN_AWAY * Math.tanh(raw / SPIN_AWAY) : SPIN_TOWARD * Math.tanh(raw / SPIN_TOWARD);
const softTilt = (raw) => TILT * Math.tanh(raw / TILT);
const held = {
	spin: 0,
	spinV: 0,
	spinGoal: 0,
	tilt: 0,
	tiltV: 0,
	tiltGoal: 0,
	drag: null,
	raf: 0,
	last: 0,
	ended: 0
};
const showTurn = () => {
	book$1.style.setProperty("--spin", `${held.spin * 180 / Math.PI}deg`);
	book$1.style.setProperty("--tilt", `${held.tilt * 180 / Math.PI}deg`);
};
function stopTurning() {
	cancelAnimationFrame(held.raf);
	Object.assign(held, {
		spin: 0,
		spinV: 0,
		spinGoal: 0,
		tilt: 0,
		tiltV: 0,
		tiltGoal: 0,
		drag: null,
		raf: 0,
		last: 0
	});
	showTurn();
}
function turnStep(now) {
	const dt = Math.min(.033, (now - (held.last || now - 16)) / 1e3);
	held.last = now;
	const on = !!(held.drag && held.drag.moved);
	const goalS = on ? held.spinGoal : 0;
	const goalT = on ? held.tiltGoal : 0;
	held.spinV += (-(on ? 40 : 14) * (held.spin - goalS) - (on ? 12 : 7.5) * held.spinV) * dt;
	held.tiltV += (-(on ? 40 : 30) * (held.tilt - goalT) - (on ? 12 : 10) * held.tiltV) * dt;
	held.spin += held.spinV * dt;
	held.tilt += held.tiltV * dt;
	showTurn();
	if (!held.drag && Math.abs(held.spin) + Math.abs(held.tilt) < .002 && Math.abs(held.spinV) + Math.abs(held.tiltV) < .01) {
		held.spin = held.tilt = held.spinV = held.tiltV = 0;
		held.raf = 0;
		held.last = 0;
		showTurn();
		return;
	}
	held.raf = requestAnimationFrame(turnStep);
}
book$1.addEventListener("pointerdown", (e) => {
	if (e.button || !book$1.classList.contains("closed") || e.target.closest(".nb-sun")) return;
	held.drag = {
		id: e.pointerId,
		x0: e.clientX,
		y0: e.clientY,
		spin0: held.spin,
		tilt0: held.tilt,
		moved: false
	};
});
book$1.addEventListener("pointermove", (e) => {
	const d = held.drag;
	if (!d || d.id !== e.pointerId) return;
	const dx = e.clientX - d.x0;
	const dy = e.clientY - d.y0;
	if (!d.moved && Math.hypot(dx, dy) > 6) {
		d.moved = true;
		try {
			book$1.setPointerCapture(e.pointerId);
		} catch {}
		if (!held.raf) held.raf = requestAnimationFrame(turnStep);
	}
	if (!d.moved) return;
	const k = .0056;
	held.spinGoal = softSpin(d.spin0 + dx * k);
	held.tiltGoal = softTilt(d.tilt0 - dy * k);
});
const letGo = (e) => {
	const d = held.drag;
	if (!d || d.id !== e.pointerId) return;
	held.drag = null;
	if (d.moved) held.ended = performance.now();
};
book$1.addEventListener("pointerup", letGo);
book$1.addEventListener("pointercancel", letGo);
book$1.addEventListener("click", (e) => {
	if (performance.now() - held.ended < 350) {
		e.preventDefault();
		e.stopPropagation();
	}
}, true);

// pages/cover.js
const book = document.getElementById("book");
const frame$3 = document.getElementById("frame");
document.getElementById("bookHit").addEventListener("click", () => {
	location.hash = "#/entries";
});
const sun = document.getElementById("bookSun");
sun.innerHTML = ICONS.sun;
sun.addEventListener("click", openOptions);
const tabHits = document.getElementById("bookTabHits");
tabHits.addEventListener("click", (e) => {
	const b = e.target.closest("[data-go]");
	if (b) location.hash = b.dataset.go;
});
const RATIO = 1e3 / 1360;
const TAB_OUT = .08;
const STACK = 16;
const TURNED = 20 * Math.PI / 180;
const PERSPECTIVE = 1100;
const OPEN_MS = 900;
const ZOOM_MS = 760;
const OVER = 12;
document.getElementById("bookStack").innerHTML = Array.from({ length: STACK }, (_, i) => `<i style="--i:${i + 1}"></i>`).join("") + `<b style="--i:${STACK + 1}"></b>`;
function measure() {
	const vw = window.innerWidth;
	const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--book-h")) || window.innerHeight;
	const W = Math.min(vw * .78, vh * .66 * RATIO, 460);
	const H = W / RATIO;
	const k = Math.min(1, (vw - 14) / (2 * W), vh * .82 / H);
	const cos = Math.cos(TURNED);
	const sin = Math.sin(TURNED);
	const depth = (STACK + 1) * W * .0112;
	const seen = [
		[-W / 2, 0],
		[W / 2, 0],
		[-W / 2, -depth],
		[W / 2 + W * TAB_OUT, -depth * .8]
	].map(([x, d]) => (x * cos - d * sin) * PERSPECTIVE / (PERSPECTIVE - (x * sin + d * cos)));
	const f = frame$3.getBoundingClientRect();
	const set = (n, v) => book.style.setProperty(n, v);
	set("--W", `${W}px`);
	set("--H", `${H}px`);
	set("--k", String(k));
	set("--shut-x", `${-(Math.min(...seen) + Math.max(...seen)) / 2 / cos}px`);
	const pw = (vw + OVER) / .986;
	const ph = (vh + 2 * OVER) / .986;
	const sx = pw / W;
	const sy = ph / H;
	set("--zoom-x", `${frame$3.dataset.side === "left" ? vw / 2 : -vw / 2}px`);
	set("--zoom-y", "0px");
	set("--zoom-sx", String(sx));
	set("--zoom-sy", String(sy));
	set("--title-fs", `${24 / sx}px`);
	set("--title-top", `${(f.top + 12 - (vh - ph) / 2) / sy}px`);
	set("--title-sq", String(sx / sy));
	const c = (f.left + f.right) / 2;
	set("--title-out", `${Math.max(0, frame$3.dataset.side === "left" ? 2 * c - 2 * vw + pw : pw - 2 * c) / sx}px`);
}
function placeTabHits() {
	const before = book.className;
	book.className = "nb no-anim closed";
	const rects = [...document.getElementById("bookSideTabs").children].map((el) => el.getBoundingClientRect());
	[...tabHits.children].forEach((hit, i) => {
		const r = rects[i];
		hit.style.cssText = `left:${r.left - 14}px;right:0;top:${r.top - 3}px;height:${r.height + 6}px`;
	});
	book.className = before;
	void book.offsetWidth;
}
window.addEventListener("ref-layout", () => {
	measure();
	if (!book.hidden && book.classList.contains("closed")) placeTabHits();
});
const zoomed = () => frame$3.dataset.side === "left" ? "opened zoom-l" : "opened zoom-r";
const place = (mode) => {
	book.hidden = false;
	placeTabHits();
	book.className = `nb no-anim ${mode}`;
	void book.offsetWidth;
};
const setMode = (mode) => {
	book.className = `nb ${mode}`;
};
let firstRoute = true;
let isOpen = false;
let bookTimer = 0;
function setBook(open) {
	const first = firstRoute;
	firstRoute = false;
	if (open === isOpen && !first) return;
	isOpen = open;
	clearTimeout(bookTimer);
	stopTurning();
	measure();
	if (first) {
		if (open) book.hidden = true;
		else place("closed");
		return;
	}
	if (open) {
		setMode("opened");
		bookTimer = setTimeout(() => {
			setMode(zoomed());
			bookTimer = setTimeout(() => {
				book.hidden = true;
			}, ZOOM_MS);
		}, OPEN_MS);
	} else {
		place(zoomed());
		setMode("closed");
	}
}

// pages/welcome.js
function welcome(name, openTour) {
	const suite = window.DF_SUITE;
	if (!suite || !suite.firstVisit) return false;
	const w = suite.words(name);
	let step = "back";
	let toured = false;
	const s = openSheet({
		title: w.back[0],
		className: "sheet-small intro",
		onClose: () => {
			suite.welcomed();
			if (toured) setTimeout(openTour, 60);
		}
	});
	const say = (text) => `<p class="sheet-message">${text}</p>`;
	const one = (label, step) => `<div class="sheet-actions one"><button type="button" class="btn primary" data-step="${step}">${label}</button></div>`;
	const draw = () => {
		if (step === "back") {
			s.setTitle(w.back[0]);
			s.body.innerHTML = say(w.back[1]) + one("Next", "next");
		} else if (step === "ask") {
			s.setTitle(w.ask[0]);
			s.body.innerHTML = say(w.ask[1]) + `<div class="sheet-actions">
        <button type="button" class="btn secondary" data-step="no">${w.ask[3]}</button>
        <button type="button" class="btn primary" data-step="yes">${w.ask[2]}</button>
      </div>`;
		} else {
			s.setTitle(w.later[0]);
			s.body.innerHTML = say(w.later[1]) + one(w.later[2], "done");
		}
	};
	s.body.addEventListener("click", (e) => {
		const b = e.target.closest("[data-step]");
		if (!b) return;
		const k = b.dataset.step;
		if (k === "next") {
			step = "ask";
			draw();
		} else if (k === "no") {
			step = "later";
			draw();
		} else {
			toured = k === "yes";
			s.close();
		}
	});
	draw();
	return true;
}

// components/spread.js
const frame$2 = document.getElementById("frame");
const view$1 = document.getElementById("view");
const TURN_MS = 560;
const sideOf = (i) => i >= 1 ? "right" : "left";
let settling = null;
const dragFrame = (x) => {
	settling?.cancel();
	settling = null;
	frame$2.style.transform = x ? `translate3d(${x}px, 0, 0)` : "";
};
function settleFrame(from) {
	frame$2.style.transform = "";
	settling?.cancel();
	settling = from ? frame$2.animate([{ transform: `translate3d(${from}px, 0, 0)` }, { transform: "none" }], {
		duration: 180,
		easing: "ease-out"
	}) : null;
}
let turning = false;
const isTurning = () => turning;
async function turnTo(i, dir, go) {
	if (turning) return;
	const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (still) {
		await go();
		return;
	}
	turning = true;
	const leaf = document.createElement("div");
	leaf.className = "turn-leaf";
	const shade = document.createElement("i");
	if (dir > 0) {
		const old = view$1.firstElementChild;
		if (old) leaf.append(old.cloneNode(true));
		leaf.append(shade);
		frame$2.append(leaf);
		const from = old ? [...old.querySelectorAll(".scroll")] : [];
		leaf.querySelectorAll(".scroll").forEach((el, k) => {
			el.scrollTop = from[k]?.scrollTop || 0;
		});
		leaf.querySelector(".screen")?.classList.add("still");
		await go();
	} else {
		await SECTIONS$1[i](leaf);
		leaf.querySelector(".screen")?.classList.add("still");
		leaf.append(shade);
		leaf.style.transform = "perspective(1500px) rotateY(-180deg)";
		frame$2.append(leaf);
	}
	const flat = "perspective(1500px) rotateY(0deg)";
	const over = "perspective(1500px) rotateY(-180deg)";
	const a = leaf.animate(dir > 0 ? [{ transform: flat }, { transform: over }] : [{ transform: over }, { transform: flat }], {
		duration: TURN_MS,
		easing: "cubic-bezier(.45,.05,.3,1)",
		fill: "forwards"
	});
	shade.animate([
		{ opacity: 0 },
		{ opacity: .25 },
		{ opacity: 0 }
	], { duration: TURN_MS });
	await new Promise((done) => {
		let gone = false;
		const off = () => {
			if (!gone) {
				gone = true;
				done();
			}
		};
		a.onfinish = off;
		setTimeout(off, TURN_MS + 300);
	});
	if (dir < 0) await go();
	view$1.querySelector(".screen")?.classList.add("still");
	leaf.remove();
	turning = false;
}

// components/navbar.js
const SECTIONS = [{
	href: "#/entries",
	name: "Entries",
	icon: ICONS.entries
}, {
	href: "#/reviews",
	name: "Reviews",
	icon: ICONS.reviews
}];
const STEP = 46;
const tri = "<svg viewBox=\"0 0 10 12\" aria-hidden=\"true\"><path d=\"M2.3 1.5Q5.6 3.8 8.7 6.1 5.5 8.3 2.2 10.5 2.5 6 2.3 1.5Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linejoin=\"round\"/></svg>";
const bar = document.getElementById("navbar");
const frame$1 = document.getElementById("frame");
bar.innerHTML = `
  <div class="slider">
    <button type="button" class="slide-arrow is-prev">${tri}</button>
    <a class="slide-now"><span class="slide-strip" aria-hidden="true">${SECTIONS.map((s) => `<span class="slide-icon">${s.icon}</span>`).join("")}</span></a>
    <button type="button" class="slide-arrow is-next">${tri}</button>
  </div>`;
const strip = bar.querySelector(".slide-strip");
const now = bar.querySelector(".slide-now");
const prev = bar.querySelector(".is-prev");
const next = bar.querySelector(".is-next");
let at = 0;
let busy = false;
let swiped = 0;
let onList = false;
let puller = null;
let landed = null;
let docked = null;
const setPuller = (p) => {
	puller = p;
};
const stripTo = (i, moving) => {
	strip.classList.toggle("is-moving", !!moving);
	strip.style.transform = `translateX(${-i * STEP}px)`;
};
function showSection(i, list = false) {
	bar.hidden = i < 0;
	onList = list;
	frame$1.dataset.swipe = list ? "1" : "";
	if (landed) {
		landed();
		landed = null;
	}
	if (i < 0) {
		frame$1.style.transform = "";
		busy = false;
		return;
	}
	at = i;
	const s = SECTIONS[i];
	const p = SECTIONS[i - 1];
	const n = SECTIONS[i + 1];
	now.setAttribute("href", s.href);
	now.setAttribute("aria-label", s.name);
	prev.setAttribute("aria-label", p ? `Previous: ${p.name}` : "Shut the notebook");
	next.classList.toggle("is-off", !n);
	next.disabled = !n;
	next.setAttribute("aria-label", n ? `Next: ${n.name}` : "Nothing after this");
	if (!busy) stripTo(i);
}
const navigate = (href) => new Promise((done) => {
	landed = done;
	location.hash = href;
	setTimeout(() => {
		if (landed === done) {
			landed = null;
			done();
		}
	}, 1500);
});
async function go(dir, from = 0) {
	if (busy || isTurning()) return settle(from);
	if (dir < 0 && at === 0) {
		settle(from);
		location.hash = "#/";
		return;
	}
	const target = at + dir;
	const t = SECTIONS[target];
	if (!t) return settle(from);
	busy = true;
	dragFrame(0);
	stripTo(target, true);
	await turnTo(target, Math.sign(dir), () => navigate(t.href));
	busy = false;
	stripTo(at);
}
function settle(from) {
	settleFrame(from);
	stripTo(at, true);
}
prev.addEventListener("click", () => go(-1));
next.addEventListener("click", () => go(1));
function wire(el, fromPage) {
	let d = null;
	el.addEventListener("pointerdown", (e) => {
		d = null;
		if (busy || isTurning() || e.button || fromPage && !onList) return;
		d = {
			id: e.pointerId,
			x0: e.clientX,
			y0: e.clientY,
			x: 0,
			moved: false,
			kind: ""
		};
	});
	el.addEventListener("pointermove", (e) => {
		if (!d || e.pointerId !== d.id) return;
		if (docked) {
			d = null;
			return;
		}
		const dx = e.clientX - d.x0;
		const dy = e.clientY - d.y0;
		if (!d.moved) {
			if (Math.hypot(dx, dy) < 10) return;
			if (fromPage && Math.abs(dy) > Math.abs(dx)) {
				d = null;
				return;
			}
			d.moved = true;
			try {
				el.setPointerCapture(e.pointerId);
			} catch {}
			const dir = dx < 0 ? 1 : -1;
			d.dir = dir;
			if (SECTIONS[at + dir]) d.kind = "turn";
			else if (dir < 0 && at === 0) d.kind = "shut";
			else d.kind = "stop";
		}
		d.x = dx;
		if (d.kind === "turn") {
			const x = dx * d.dir > 0 ? 0 : Math.max(-frame$1.offsetWidth, Math.min(frame$1.offsetWidth, dx));
			strip.classList.remove("is-moving");
			strip.style.transform = `translateX(${-at * STEP + x / frame$1.offsetWidth * STEP}px)`;
		} else if (d.kind === "shut") {
			d.x = Math.max(0, dx);
			dragFrame(Math.min(d.x * .3, 60));
		}
	});
	const end = (e) => {
		if (!d || e.pointerId !== d.id) return;
		const g = d;
		d = null;
		if (!g.moved) return;
		swiped = performance.now();
		const up = e.type === "pointerup";
		const w = frame$1.offsetWidth;
		if (g.kind === "turn") {
			if (up && g.x * g.dir < 0 && Math.abs(g.x) > Math.min(60, w * .15)) go(g.dir);
			else stripTo(at, true);
		} else if (g.kind === "shut") {
			if (up && g.x > 50) {
				dragFrame(0);
				location.hash = "#/";
			} else settle(Math.min(g.x * .3, 60));
		}
	};
	el.addEventListener("pointerup", end);
	el.addEventListener("pointercancel", end);
	el.addEventListener("click", (e) => {
		if (performance.now() - swiped < 350) {
			e.preventDefault();
			e.stopPropagation();
		}
	}, true);
}
wire(bar, false);
wire(frame$1, true);
const DOCK_SLOT = 46;
const DOCK_PAD = 10;
const dock = document.createElement("div");
dock.className = "nav-dock";
dock.setAttribute("aria-hidden", "true");
dock.innerHTML = SECTIONS.map((s) => `<span class="nav-dock-slot"><span class="nav-dock-icon">${s.icon}</span></span>`).join("") + "<span class=\"nav-dock-label\"></span>";
bar.appendChild(dock);
const dockSlots = [...dock.querySelectorAll(".nav-dock-slot")];
const dockIcons = [...dock.querySelectorAll(".nav-dock-icon")];
const dockLabel = dock.querySelector(".nav-dock-label");
let hold = null;
function dockShow(x) {
	const fx = x === null ? docked.centers[at] : x;
	let near = at;
	if (x !== null) {
		let best = Infinity;
		docked.centers.forEach((c, i) => {
			if (Math.abs(fx - c) < best) {
				best = Math.abs(fx - c);
				near = i;
			}
		});
	}
	docked.at = near;
	dockIcons.forEach((icon, i) => {
		const grow = Math.max(0, 1 - Math.abs(fx - docked.centers[i]) / (DOCK_SLOT * 1.8));
		icon.style.transform = `scale(${(1 + .55 * grow).toFixed(3)})`;
	});
	dockLabel.textContent = SECTIONS[near].name;
	dockLabel.style.left = `${(docked.centers[near] - docked.left).toFixed(1)}px`;
}
function openDock(h) {
	hold = null;
	if (busy || isTurning() || bar.hidden) return;
	const r = bar.getBoundingClientRect();
	const w = SECTIONS.length * DOCK_SLOT + DOCK_PAD * 2;
	const vw = window.innerWidth;
	const left = Math.max(8, Math.min(vw - 8 - w, h.x - DOCK_PAD - (at + .5) * DOCK_SLOT));
	docked = {
		id: h.id,
		x0: h.x,
		y0: h.y,
		moved: false,
		at,
		left,
		centers: SECTIONS.map((s, i) => left + DOCK_PAD + (i + .5) * DOCK_SLOT)
	};
	stripTo(at, true);
	dock.style.left = `${(left - r.left).toFixed(1)}px`;
	dock.style.transformOrigin = `${(h.x - left).toFixed(1)}px 100%`;
	dockSlots.forEach((slot, i) => slot.classList.toggle("is-here", i === at));
	dockShow(null);
	dock.classList.add("is-open");
	bar.classList.add("is-docked");
	try {
		bar.setPointerCapture(h.id);
	} catch {}
}
now.addEventListener("pointerdown", (e) => {
	if (e.button || !e.isPrimary) return;
	if (hold) clearTimeout(hold.timer);
	const h = {
		id: e.pointerId,
		x: e.clientX,
		y: e.clientY
	};
	h.timer = setTimeout(() => {
		if (hold === h) openDock(h);
	}, 380);
	hold = h;
});
now.addEventListener("contextmenu", (e) => e.preventDefault());
bar.addEventListener("pointermove", (e) => {
	if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) >= 8) {
		clearTimeout(hold.timer);
		hold = null;
	}
	if (!docked || e.pointerId !== docked.id) return;
	if (!docked.moved && Math.hypot(e.clientX - docked.x0, e.clientY - docked.y0) < 10) return;
	docked.moved = true;
	dockShow(e.clientX);
});
const dockEnd = (e) => {
	if (hold && e.pointerId === hold.id) {
		clearTimeout(hold.timer);
		hold = null;
	}
	if (!docked || e.pointerId !== docked.id) return;
	const { moved, at: to } = docked;
	docked = null;
	dock.classList.remove("is-open");
	bar.classList.remove("is-docked");
	swiped = performance.now();
	if (e.type === "pointerup" && moved && to !== at) go(to - at);
};
bar.addEventListener("pointerup", dockEnd);
bar.addEventListener("pointercancel", dockEnd);

// components/pull-shut.js
const pull = document.getElementById("pull");
let pulled = 0;
const pullStart = () => {
	pull.classList.remove("back");
	pull.hidden = false;
	pulled = 0;
};
const pullMove = (w) => {
	pulled = Math.min(w, window.innerWidth);
	pull.style.width = `${pulled}px`;
};
function pullEnd() {
	if (pulled > window.innerWidth * .45) {
		pull.hidden = true;
		pull.style.width = "0";
		location.hash = "#/";
	} else {
		pull.classList.add("back");
		pull.style.width = "0";
		setTimeout(() => {
			pull.hidden = true;
		}, 200);
	}
}
setPuller({
	start: pullStart,
	move: pullMove,
	end: pullEnd
});

// app.js
const view = document.getElementById("view");
const frame = document.getElementById("frame");
let destroyCurrent = null;
let token = 0;
const suite = window.DF_SUITE;
document.addEventListener("click", (e) => {
	if (e.target.closest("[data-app-menu]")) openOptions();
});
const HASHES = ["/entries", "/reviews"];
const NAMES = ["Entries", "Reviews"];
const AT = {
	entries: "#/entries",
	reviews: "#/reviews"
};
const titleR = document.getElementById("titleR");
const titleL = document.getElementById("titleL");
let routes = 0;
async function route() {
	const mine = ++token;
	if (routes++) moved();
	if (destroyCurrent) {
		destroyCurrent();
		destroyCurrent = null;
	}
	closeAllSheets();
	const h = (location.hash || "#/").slice(1) || "/";
	if (suite && h === "/") {
		suite.home();
		return;
	}
	const section = HASHES.indexOf(h);
	if (h !== "/") {
		frame.dataset.side = sideOf(section);
		titleL.textContent = section === 0 ? NAMES[0] : "";
		titleR.textContent = section > 0 ? NAMES[section] : "";
	}
	setBook(h !== "/");
	if (h === "/") {
		showSection(-1);
		return;
	}
	try {
		let m;
		if (section >= 0) await SECTIONS$1[section](view);
		else if (h === "/new") destroyCurrent = await entryScreen(view, null);
		else if (m = h.match(/^\/entry\/(.+)$/)) destroyCurrent = await entryScreen(view, decodeURIComponent(m[1]));
		else if (m = h.match(/^\/review\/(.+)$/)) destroyCurrent = await reviewScreen(view, decodeURIComponent(m[1]));
		else {
			location.hash = "#/entries";
			return;
		}
		if (mine !== token) {
			if (destroyCurrent) {
				destroyCurrent();
				destroyCurrent = null;
			}
			return;
		}
		showSection(section, section >= 0);
	} catch (e) {
		console.error(e);
		view.innerHTML = `<div class="screen"><p class="note center">Something went wrong. ${esc(e.message || "Try reloading.")}</p></div>`;
	}
}
document.addEventListener("visibilitychange", () => {
	if (document.hidden && destroyCurrent) {
		const d = destroyCurrent;
		d();
	}
});
window.addEventListener("pagehide", () => {
	if (destroyCurrent) destroyCurrent();
});
window.addEventListener("hashchange", route);
const atEntry = suite && suite.get && suite.get("entry");
if (atEntry) history.replaceState(null, "", `#/entry/${encodeURIComponent(atEntry)}`);
else if (suite && (location.hash || "#/") === "#/") history.replaceState(null, "", AT[suite.at] || "#/entries");
else if (!suite && startPage() && (location.hash || "#/") === "#/") history.replaceState(null, "", startPage());
route();
if (suite && suite.firstVisit) setTimeout(() => {
	if (!document.querySelector(".sheet-overlay")) welcome("Overthoughts", openIntro);
}, 900);
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
const holdUpright = () => {
	try {
		screen.orientation?.lock?.("portrait").catch(() => {});
	} catch {}
};
holdUpright();
document.addEventListener("visibilitychange", () => {
	if (!document.hidden) holdUpright();
});
