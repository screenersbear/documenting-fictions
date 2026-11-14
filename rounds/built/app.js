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

// components/icons.js
const line = (d, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const BOOKS = line("<rect x=\"3\" y=\"5\" width=\"4.5\" height=\"14\" rx=\"1\"/><rect x=\"9.5\" y=\"3\" width=\"4.5\" height=\"16\" rx=\"1\"/><path d=\"M16 6.2l3.6-1 3 12.6-3.6 1z\"/>", 19);
const MENU = line("<line x1=\"4\" y1=\"7\" x2=\"20\" y2=\"7\"/><line x1=\"4\" y1=\"12\" x2=\"20\" y2=\"12\"/><line x1=\"4\" y1=\"17\" x2=\"20\" y2=\"17\"/>");
const BACK = line("<polyline points=\"15 5 8 12 15 19\"/>");
const MORE = "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" aria-hidden=\"true\"><circle cx=\"5\" cy=\"12\" r=\"1.6\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\"/><circle cx=\"19\" cy=\"12\" r=\"1.6\" fill=\"currentColor\"/></svg>";
const PLUS = line("<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>", 16);
const ARROW = line("<path d=\"M4 12h14\"/><polyline points=\"13 6 19 12 13 18\"/>", 16);
const CHEV = line("<polyline points=\"9 5 16 12 9 19\"/>", 16).replace("<svg", "<svg class=\"chev\"");
const CHEV_SMALL = "<svg viewBox=\"0 0 24 24\" width=\"12\" height=\"12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><polyline points=\"9 5 16 12 9 19\"/></svg>";

// components/band.js
const ring = (label, attr, svg) => `<button type="button" class="ring-btn" ${attr} aria-label="${label}"><span>${svg}</span></button>`;
const MARK = "<svg class=\"band-mark\" viewBox=\"0 0 80 40\" aria-hidden=\"true\"><path d=\"M8 40 A32 32 0 0 1 72 40\" fill=\"none\" stroke=\"#FFD100\" stroke-width=\"6\"/><circle cx=\"12.3\" cy=\"24\" r=\"7\" fill=\"#14BFA0\"/><circle cx=\"40\" cy=\"8\" r=\"5.5\" fill=\"#FFFFFF\"/><circle cx=\"67.7\" cy=\"24\" r=\"4\" fill=\"#14BFA0\"/></svg>";
const bandDate = (d = new Date()) => d.toLocaleDateString("en-GB", {
	weekday: "short",
	day: "numeric",
	month: "short"
}).replace(",", "");
function bandHtml({ title, place }) {
	return `
    <header class="band">
      <h1 class="band-title">${esc(title)}</h1>
      <div class="band-btns">${ring("Back to your notebooks", "data-books", BOOKS)}${ring("Options", "data-app-menu", MENU)}</div>
      ${MARK}
      <p class="band-line"><b>${esc(place)}</b><span class="band-rule"></span><span class="band-date">${bandDate()}</span></p>
    </header>`;
}
function shortBandHtml({ place, back, more }) {
	return `
    <header class="band band-short">
      <a class="ring-btn" href="${back}" aria-label="Back"><span>${BACK}</span></a>
      <p class="band-line"><b>${esc(place)}</b><span class="band-rule"></span></p>
      ${ring(more, "data-band-more", MORE)}
    </header>`;
}

// data/db.js
const DB_NAME = "rounds";
const KEYS = {
	people: "id",
	moves: "id",
	photos: "id",
	messages: "kind",
	settings: "key"
};
let dbPromise = null;
function openDb() {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			for (const [s, keyPath] of Object.entries(KEYS)) req.result.createObjectStore(s, { keyPath });
		};
		req.onsuccess = () => {
			req.result.onversionchange = () => {
				req.result.close();
				dbPromise = null;
			};
			resolve(req.result);
		};
		req.onerror = () => {
			dbPromise = null;
			reject(req.error);
		};
	});
	return dbPromise;
}
async function tx(store, mode, fn) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const t = db.transaction([store], mode);
		let out;
		t.oncomplete = () => resolve(out);
		t.onabort = () => reject(t.error || new Error("That wasn't saved. Your phone may be out of space."));
		fn(t.objectStore(store), (v) => {
			out = v;
		});
	});
}
const all = (store) => tx(store, "readonly", (s, set) => {
	s.getAll().onsuccess = (e) => set(e.target.result);
});
const one = (store, key) => tx(store, "readonly", (s, set) => {
	s.get(key).onsuccess = (e) => set(e.target.result);
});
const put = (store, value) => tx(store, "readwrite", (s) => {
	s.put(value);
});
const drop = (store, key) => tx(store, "readwrite", (s) => {
	s.delete(key);
});
const listPeople = () => all("people");
const getPerson = (id) => one("people", id);
const savePeople = (list) => tx("people", "readwrite", (s) => {
	list.forEach((p) => s.put(p));
});
const savePerson = (p) => put("people", p);
const logMove = (m) => put("moves", m);
const listMoves = () => all("moves");
const dropMove = (id) => drop("moves", id);
async function getPhoto(id) {
	const r = await one("photos", id);
	return r ? new Blob([r.bytes], { type: r.type }) : null;
}
const savePhoto = (id, bytes, type) => put("photos", {
	id,
	bytes,
	type
});
const dropPhoto = (id) => drop("photos", id);
async function getMessages() {
	return Object.fromEntries((await all("messages")).map((r) => [r.kind, r.text]));
}
const saveMessage = (kind, text) => put("messages", {
	kind,
	text
});
const resetMessage = (kind) => drop("messages", kind);
async function getSetting(key, fallback) {
	const r = await one("settings", key);
	return r === undefined ? fallback : r.value;
}
const setSetting = (key, value) => put("settings", {
	key,
	value
});

// data/dates.js
const pad = (n) => String(n).padStart(2, "0");
const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];
const WEEKDAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday"
];
const dayOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function dateOf(day) {
	const [y, m, d] = String(day).split("-").map(Number);
	return new Date(y, m - 1, d, 12);
}
const isDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && dayOf(dateOf(s)) === s;
function addDays(day, n) {
	const d = dateOf(day);
	d.setDate(d.getDate() + n);
	return dayOf(d);
}
const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 864e5);
const later = (a, b) => a > b ? a : b;
const short = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
function whenWords(day, today) {
	const n = daysBetween(day, today);
	if (n === 0) return "today";
	if (n === 1) return "yesterday";
	const d = dateOf(day);
	return n > 1 && n < 7 ? WEEKDAYS[d.getDay()] : short(d);
}
function dueWords(day, today) {
	const n = daysBetween(today, day);
	if (n <= 0) return "Today";
	if (n === 1) return "Tomorrow";
	const d = dateOf(day);
	return n < 7 ? WEEKDAYS[d.getDay()] : short(d);
}
function sinceWords(day, today) {
	const n = daysBetween(day, today);
	if (n < 14) return "";
	return n < 60 ? `${Math.round(n / 7)} weeks` : `${Math.round(n / 30.44)} months`;
}

// data/plan.js
const GROUPS = {
	regular: "Regular",
	new: "New",
	client: "Client",
	prospect: "Prospect",
	guest: "Event guest"
};
const GROUP_KEYS = Object.keys(GROUPS);
const GAP = {
	checkin: 42,
	client: 90,
	followup: [7, 14],
	fresh: 14
};
const REGULAR_AFTER = 3;
const OWN = {
	regular: ["checkin"],
	new: [
		"thanks",
		"hello",
		"checkin"
	],
	client: [
		"thanks",
		"intros",
		"refresh"
	],
	prospect: [
		"pitch",
		"followup",
		"hello",
		"thanks"
	],
	guest: ["hello", "thanks"]
};
function groupFromName(text) {
	const t = String(text ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/s$/, "");
	return GROUP_KEYS.find((k) => k === t || GROUPS[k].toLowerCase() === t) || null;
}
const move = (kind, due, step = 0) => ({
	kind,
	due,
	step
});
function firstMove(group, today) {
	if (group === "regular") return move("checkin", today);
	if (group === "prospect") return move("pitch", today);
	if (group === "client") return move("intros", today);
	return move("hello", today);
}
function afterShoot(person, shotOn, today) {
	const checkin = move("checkin", later(today, addDays(shotOn, GAP.checkin)));
	if (person.group === "regular") return checkin;
	if (daysBetween(shotOn, today) <= GAP.fresh) return move("thanks", today);
	return person.next || checkin;
}
function afterDone(person, today) {
	const done = person.next;
	if (!done || person.group === "guest") return null;
	if (person.group === "client") return move(done.kind === "intros" ? "refresh" : "intros", addDays(today, GAP.client));
	if (person.group === "prospect") {
		if (done.kind !== "followup") return move("followup", addDays(today, GAP.followup[0]), 1);
		return done.step < 2 ? move("followup", addDays(today, GAP.followup[1]), 2) : null;
	}
	return move("checkin", addDays(today, GAP.checkin));
}
function regroup(person, group, today) {
	if (person.next && OWN[group].includes(person.next.kind)) return person.next;
	return firstMove(group, today);
}
const becomesRegular = (p) => p.group === "new" && !p.groupPicked && p.shoots.length >= 3;

// data/match.js
const nameKey = (name) => `name:${String(name ?? "").trim().toLowerCase().replace(/\s+/g, " ")}`;
const handleKey = (handle) => `ig:${String(handle).toLowerCase()}`;
const matchKey = (p) => p.instagram ? handleKey(p.instagram) : nameKey(p.name);
const keysOf = (p) => p.instagram ? [handleKey(p.instagram), nameKey(p.name)] : [nameKey(p.name)];
function findMatch(people, p) {
	const k = matchKey(p);
	const named = () => people.find((q) => !q.instagram && nameKey(q.name) === nameKey(p.name));
	return people.find((q) => keysOf(q).includes(k)) || p.instagram && named() || null;
}

// data/contact.js
function cleanHandle(text) {
	let t = String(text ?? "").trim();
	const m = t.match(/(?:instagram\.com|tiktok\.com)\/@?([^/?#\s]+)/i);
	if (m) t = m[1];
	return t.replace(/^@+/, "").replace(/\s+/g, "");
}
function cleanSite(text) {
	const t = String(text ?? "").trim();
	if (!t) return "";
	return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
const siteName = (url) => url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
function contactFor(person, text = "") {
	if (person.instagram) return {
		how: "Instagram",
		url: `https://www.instagram.com/${encodeURIComponent(person.instagram)}/`
	};
	if (person.tiktok) return {
		how: "TikTok",
		url: `https://www.tiktok.com/@${encodeURIComponent(person.tiktok)}`
	};
	if (person.email) return {
		how: "email",
		url: `mailto:${person.email}?body=${encodeURIComponent(text)}`
	};
	if (person.website) return {
		how: "website",
		url: person.website
	};
	return null;
}
const profileUrl = (person) => contactFor({
	...person,
	email: ""
})?.url || "";
function handleText(person) {
	if (person.instagram) return `@${person.instagram}`;
	if (person.tiktok) return `@${person.tiktok}`;
	return person.website ? siteName(person.website) : "";
}

// data/kinds.js
const MARKS$1 = {
	sun: "<circle cx=\"12\" cy=\"12\" r=\"12\"/>",
	rise: "<path d=\"M0 24 A12 12 0 0 1 24 24 Z\"/>",
	ring: "<path fill-rule=\"evenodd\" d=\"M12 0a12 12 0 1 0 0 24a12 12 0 1 0 0-24zm0 6a6 6 0 1 1 0 12a6 6 0 1 1 0-12z\"/>",
	dots: "<circle cx=\"6\" cy=\"6\" r=\"6\"/><circle cx=\"18\" cy=\"18\" r=\"6\"/><circle cx=\"18\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/>",
	tag: "<path d=\"M0 4h16l8 8-8 8H0z\"/>"
};
const kind = (name, bg, fg, mark, starter) => ({
	name,
	bg,
	fg,
	mark,
	starter
});
const KINDS = {
	thanks: kind("Say thanks", "#FFD100", "#313D45", "sun", "Thank you for today, [name]! It was so good working with you."),
	hello: kind("Say hello", "#13803F", "#FFD100", "rise", "Great meeting you at [where]! I'd love to work together sometime."),
	checkin: kind("Check in", "#0A4FD6", "#FFAFAB", "ring", "Hey [name], it's been a minute. Want to plan the next one?"),
	intros: kind("Ask for intros", "#CC2E8A", "#E2E600", "dots", "Hi [name]! Hope you've been well since the session. I'm adding more people to my portfolio who do work like yours. Is there anyone you'd be happy to put me in touch with? No pressure at all."),
	refresh: kind("Refresh offer", "#CC2E8A", "#E2E600", "dots", "It's been a while since your session. I'm offering past clients [offer]."),
	followup: kind("Follow up", "#FF8A3D", "#313D45", "tag", "Just following up on my note from [when]. Happy to send ideas."),
	pitch: kind("Pitch", "#FF8A3D", "#313D45", "tag", "Hi [name], I'm a portrait photographer in [city]. I'd love to make some pictures with you. Could I send a few ideas?")
};
const KIND_KEYS = Object.keys(KINDS);
const MESSAGE_ORDER = [
	"thanks",
	"hello",
	"checkin",
	"refresh",
	"intros",
	"pitch",
	"followup"
];
const isKind = (key) => KIND_KEYS.includes(key);
function kindFromName(text) {
	const t = String(text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
	return KIND_KEYS.find((k) => KINDS[k].name.toLowerCase() === t || k === t.replace(/ /g, "")) || null;
}
function markSvg(key, size) {
	const k = KINDS[key];
	return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${k.fg}" aria-hidden="true">${MARKS$1[k.mark]}</svg>`;
}

// data/person.js
const text = (v) => String(v ?? "").trim();
function newPerson(f, today) {
	const group = f.group || "new";
	return {
		id: f.id,
		name: text(f.name),
		group,
		groupPicked: false,
		instagram: cleanHandle(f.instagram),
		tiktok: cleanHandle(f.tiktok),
		website: cleanSite(f.website),
		email: text(f.email),
		where: text(f.where),
		note: text(f.note),
		lists: {
			email: false,
			mail: false
		},
		address: "",
		shoots: [],
		lastShot: "",
		lastMove: "",
		photoKey: f.photoKey || "",
		source: f.source || "added",
		letGo: false,
		added: today,
		next: f.next === undefined ? firstMove(group, today) : f.next
	};
}
function fromImport(rows, today, perDay, makeId) {
	return rows.map((r, i) => {
		const due = addDays(today, Math.floor(i / perDay));
		const next = isKind(r.firstMove) ? move(r.firstMove, due) : firstMove(r.group, due);
		return newPerson({
			...r,
			id: makeId(),
			source: "import",
			next
		}, today);
	});
}
function markDone(person, today) {
	const log = {
		personId: person.id,
		kind: person.next.kind,
		day: today
	};
	return {
		person: {
			...person,
			lastMove: today,
			next: afterDone(person, today)
		},
		log
	};
}
const markLater = (person, today) => ({
	...person,
	next: {
		...person.next,
		due: addDays(today, 1)
	}
});
function applyEdit(person, f, today) {
	const p = { ...person };
	if ("name" in f && text(f.name)) p.name = text(f.name);
	for (const k of ["instagram", "tiktok"]) if (k in f) p[k] = cleanHandle(f[k]);
	if ("website" in f) p.website = cleanSite(f.website);
	for (const k of [
		"email",
		"where",
		"note",
		"address"
	]) if (k in f) p[k] = text(f[k]);
	if ("lists" in f) p.lists = {
		email: !!f.lists.email,
		mail: !!f.lists.mail
	};
	if ("group" in f && f.group !== person.group) {
		p.group = f.group;
		p.groupPicked = true;
		p.next = regroup(person, f.group, today);
	}
	return p;
}
const letGo = (person) => ({
	...person,
	letGo: true
});
const bringBack = (person, today) => ({
	...person,
	letGo: false,
	next: person.next || firstMove(person.group, today)
});

// data/eye-people.js
const AFTER_SHOOT = [
	"captured",
	"waiting_for_selects",
	"editing",
	"delivered"
];
const named = (x) => !!x && typeof x.name === "string" && x.name.trim() !== "";
const handleOn = (list, platform) => cleanHandle((list || []).find((h) => h && h.platform === platform)?.handle);
function shootPeople(shoot) {
	const talent = (shoot.talents || []).filter(named).map((t) => ({
		name: t.name.trim(),
		role: "Talent",
		instagram: handleOn(t.socialHandles, "instagram"),
		tiktok: handleOn(t.socialHandles, "tiktok"),
		photoKey: t.id ? `${shoot.id}__talent_${t.id}` : ""
	}));
	const team = (shoot.teamMembers || []).filter(named).map((m) => {
		const on = m.socialPlatform || "instagram";
		return {
			name: m.name.trim(),
			role: m.role || "Team",
			instagram: on === "instagram" ? cleanHandle(m.socialHandle) : "",
			tiktok: on === "tiktok" ? cleanHandle(m.socialHandle) : "",
			photoKey: ""
		};
	});
	return [...talent, ...team];
}
function bringIn(people, shoots, seen, today, makeId) {
	const all = [...people];
	const changed = new Map();
	const done = new Set(seen);
	const fresh = (shoots || []).filter((s) => s && s.id && !done.has(s.id) && AFTER_SHOOT.includes(s.status) && isDay(s.date)).sort((a, b) => a.date.localeCompare(b.date));
	for (const s of fresh) {
		for (const sp of shootPeople(s)) {
			let p = findMatch(all, sp);
			if (!p) {
				p = newPerson({
					...sp,
					id: makeId(),
					where: `${sp.role} on ${s.title || "a shoot"}`,
					source: "eye",
					next: null
				}, today);
				all.push(p);
			}
			if (p.shoots.includes(s.id)) continue;
			const q = {
				...p,
				shoots: [...p.shoots, s.id],
				lastShot: later(p.lastShot, s.date),
				photoKey: p.photoKey || sp.photoKey,
				instagram: p.instagram || sp.instagram
			};
			if (becomesRegular(q)) q.group = "regular";
			if (!q.letGo) q.next = afterShoot(q, s.date, today);
			all[all.indexOf(p)] = q;
			changed.set(q.id, q);
		}
		done.add(s.id);
	}
	return {
		changed: [...changed.values()],
		seen: [...done]
	};
}

// data/eye.js
const EYE_STATE = "dailies_state_v1";
const EYE_PHOTOS = "starky-moodboards";
function eyeShoots() {
	try {
		const state = JSON.parse(localStorage.getItem(EYE_STATE) || "null");
		return state && Array.isArray(state.shoots) ? state.shoots : [];
	} catch {
		return [];
	}
}
async function bringInFromEye() {
	const shoots = eyeShoots();
	if (!shoots.length) return 0;
	const [people, seen] = await Promise.all([listPeople(), getSetting("eyeSeen", [])]);
	const { changed, seen: now } = bringIn(people, shoots, seen, dayOf(), uuid);
	if (changed.length) await savePeople(changed);
	if (now.length !== seen.length) await setSetting("eyeSeen", now);
	return changed.length;
}
function eyePhoto(key) {
	return new Promise((done) => {
		let req;
		try {
			req = indexedDB.open(EYE_PHOTOS, 1);
		} catch {
			done("");
			return;
		}
		req.onupgradeneeded = () => req.result.createObjectStore("images");
		req.onerror = () => done("");
		req.onblocked = () => done("");
		req.onsuccess = () => {
			const db = req.result;
			try {
				const get = db.transaction("images").objectStore("images").get(key);
				get.onsuccess = () => {
					const v = get.result;
					db.close();
					done(Array.isArray(v) && v[0] && v[0].src || "");
				};
				get.onerror = () => {
					db.close();
					done("");
				};
			} catch {
				db.close();
				done("");
			}
		};
	});
}

// components/photo.js
const srcs = new Map();
const initials = (name) => String(name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("");
const photoHtml = (person, cls = "") => `<span class="ph ${cls}" data-ph="${esc(person.id)}" aria-hidden="true"><span class="ph-initials">${esc(initials(person.name))}</span></span>`;
async function srcFor(person) {
	if (!srcs.has(person.id)) {
		srcs.set(person.id, (async () => {
			const own = await getPhoto(person.id);
			if (own) return URL.createObjectURL(own);
			return person.photoKey ? eyePhoto(person.photoKey) : "";
		})());
	}
	return srcs.get(person.id);
}
function fillPhotos(root, people) {
	const byId = new Map(people.map((p) => [p.id, p]));
	root.querySelectorAll("[data-ph]").forEach(async (el) => {
		const p = byId.get(el.dataset.ph);
		const src = p && await srcFor(p).catch(() => "");
		if (!src || !el.isConnected) return;
		const img = new Image();
		img.alt = "";
		img.decoding = "async";
		img.src = src;
		el.append(img);
	});
}
async function keepPhoto(person, file) {
	const url = URL.createObjectURL(file);
	try {
		const img = await loadImage(url);
		const k = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
		const c = document.createElement("canvas");
		c.width = Math.round(img.naturalWidth * k);
		c.height = Math.round(img.naturalHeight * k);
		c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
		const blob = await canvasToBlob(c, "image/jpeg", .86);
		await savePhoto(person.id, await blob.arrayBuffer(), "image/jpeg");
	} finally {
		URL.revokeObjectURL(url);
	}
	forget(person.id);
}
async function removePhoto(person) {
	await dropPhoto(person.id);
	forget(person.id);
}
function forget(id) {
	const old = srcs.get(id);
	srcs.delete(id);
	old?.then((src) => {
		if (src.startsWith("blob:")) URL.revokeObjectURL(src);
	});
}
const hasOwnPhoto = async (person) => !!await getPhoto(person.id);

// data/today.js
const PER_DAY = 3;
const MOST = 5;
const rank = (k) => KIND_KEYS.indexOf(k);
const perDayOf = (n) => Math.min(5, Math.max(1, Math.floor(Number(n)) || 3));
const isDue = (p, today) => !!p.next && !p.letGo && p.next.due <= today;
function dueOn(people, today) {
	return people.filter((p) => isDue(p, today)).sort((a, b) => rank(a.next.kind) - rank(b.next.kind) || a.next.due.localeCompare(b.next.due) || a.added.localeCompare(b.added) || a.name.localeCompare(b.name));
}
function pickFor(people, saved, today, perDay = 3) {
	const same = !!saved && saved.date === today;
	const marks = same ? { ...saved.marks } : {};
	const byId = new Map(people.map((p) => [p.id, p]));
	const keep = same ? saved.ids.filter((id) => byId.has(id) && (marks[id] || isDue(byId.get(id), today))) : [];
	const room = Math.max(0, perDayOf(perDay) - keep.length);
	const more = dueOn(people, today).map((p) => p.id).filter((id) => !keep.includes(id)).slice(0, room);
	return {
		date: today,
		ids: [...keep, ...more],
		marks
	};
}
const waiting$1 = /* @__PURE__ */ __name((pick) => pick.ids.filter((id) => !pick.marks[id]), "waiting");
const markPick = (pick, id, how) => ({
	...pick,
	marks: {
		...pick.marks,
		[id]: how
	}
});
function unmarkPick(pick, id) {
	const marks = { ...pick.marks };
	delete marks[id];
	return {
		...pick,
		marks
	};
}
function stops(n) {
	return Array.from({ length: n }, (_, i) => {
		const a = (n === 1 ? 90 : 135 - 90 * i / (n - 1)) * Math.PI / 180;
		return {
			x: Math.round((40 + 34 * Math.cos(a)) * 10) / 10,
			y: Math.round((40 - 34 * Math.sin(a)) * 10) / 10
		};
	});
}

// data/moves.js
async function loadToday() {
	const [people, saved, perDay] = await Promise.all([
		listPeople(),
		getSetting("pick", null),
		getSetting("perDay", 3)
	]);
	const pick = pickFor(people, saved, dayOf(), perDay);
	if (JSON.stringify(pick) !== JSON.stringify(saved)) await setSetting("pick", pick);
	return {
		people,
		pick
	};
}
async function markInPick(id, how) {
	const pick = await getSetting("pick", null);
	if (!pick || pick.date !== dayOf() || !pick.ids.includes(id)) return;
	await setSetting("pick", how ? markPick(pick, id, how) : unmarkPick(pick, id));
}
async function doMove(person) {
	const { person: after, log } = markDone(person, dayOf());
	const line = {
		id: uuid(),
		...log
	};
	await savePerson(after);
	await logMove(line);
	await markInPick(person.id, "done");
	return {
		before: person,
		after,
		line
	};
}
async function undoMove({ before, line }) {
	await savePerson(before);
	await dropMove(line.id);
	await markInPick(before.id, null);
}
async function laterMove(person) {
	const after = markLater(person, dayOf());
	await savePerson(after);
	await markInPick(person.id, "later");
	return after;
}
async function getMe() {
	const [offer, city] = await Promise.all([getSetting("offer", ""), getSetting("city", "")]);
	return {
		offer,
		city
	};
}

// data/fill.js
const FILLS = [
	"name",
	"where",
	"offer",
	"brand",
	"when",
	"city"
];
const firstName = (name) => String(name ?? "").trim().split(/\s+/)[0];
function fillValues(person, me, today) {
	const whole = String(person.name ?? "").trim();
	return {
		name: person.group === "prospect" ? whole : firstName(whole),
		where: person.where || "",
		offer: me.offer || "",
		brand: whole,
		when: person.lastMove ? whenWords(person.lastMove, today) : "",
		city: me.city || ""
	};
}
function fill(text, values) {
	return String(text ?? "").replace(/\[(\w+)\]/g, (all, key) => {
		const k = key.toLowerCase();
		return FILLS.includes(k) && values[k] ? values[k] : all;
	});
}

// data/reasons.js
const on = (w) => w === "today" || w === "yesterday" ? w : `on ${w}`;
function reasonFor(person, today) {
	const n = person.next;
	if (!n) return "";
	const since = sinceWords(later(person.lastShot || "", person.lastMove || "") || today, today);
	switch (n.kind) {
		case "thanks": return person.lastShot ? `You shot together ${on(whenWords(person.lastShot, today))}. A quick thank you while it's fresh.` : "A quick thank you while it's fresh.";
		case "hello":
			if (person.group === "guest") return "One friendly note: send them their photos.";
			return person.note || "You just met. A quick hello while it's fresh.";
		case "checkin": return since ? `It's been ${since}. Time to plan the next one?` : "Time to plan the next one?";
		case "refresh": return since ? `It's been ${since}. Time for a refresh offer?` : "Time for a refresh offer?";
		case "intros": return `Happy clients know people like them. Ask who ${firstName(person.name)} knows.`;
		case "pitch": return person.note || "Someone new to pitch.";
		default: return n.step > 1 ? "One last follow up, then Rounds lets it rest." : "No answer yet. One friendly follow up.";
	}
}
function phrase(kind, name) {
	if (kind === "intros") return `Ask who ${firstName(name)} knows`;
	if (kind === "refresh") return "Offer a refresh";
	return KINDS[kind].name;
}

// components/marks.js
function tagHtml(kind) {
	const k = KINDS[kind];
	return `<span class="tag" style="background:${k.bg};color:${k.fg}">${esc(k.name)}</span>`;
}
const flairHtml = (kind) => `<span class="flair" style="background:${KINDS[kind].bg}" aria-hidden="true">${markSvg(kind, 132)}</span>`;
const miniHtml = (kind) => kind ? `<span class="mini" style="background:${KINDS[kind].bg}" aria-hidden="true">${markSvg(kind, 10)}</span>` : "";

// pages/today-card.js
function cardHtml$1(p, today) {
	const kind = p.next.kind;
	const handle = handleText(p);
	return `
    <div class="card top" role="button" tabindex="0" data-open aria-label="${esc(`${KINDS[kind].name}, ${p.name}. Open the move`)}">
      ${flairHtml(kind)}${photoHtml(p)}
      <div class="card-words">
        ${tagHtml(kind)}
        <p class="card-name">${esc(p.name)}</p>
        ${handle ? `<p class="card-handle">${esc(handle)}</p>` : ""}
        <p class="card-why">${esc(reasonFor(p, today))}</p>
      </div>
    </div>`;
}
__name(cardHtml$1, "cardHtml");
const behindHtml = (p, n) => `<div class="card behind-${n}" aria-hidden="true">${flairHtml(p.next.kind)}</div>`;
const writeLabel = (p) => p.group === "prospect" ? "Write to them" : `Write to ${firstName(p.name)}`;
function arcHtml(pick, current, label) {
	const pts = stops(pick.ids.length);
	const dots = pick.ids.map((id, i) => {
		const { x, y } = pts[i];
		if (id === current) return `<circle cx="${x}" cy="${y}" r="7" fill="#14BFA0" stroke="#313D45" stroke-width="2"/>`;
		if (pick.marks[id] === "done") return `<circle cx="${x}" cy="${y}" r="5" fill="#313D45"/>`;
		return `<circle cx="${x}" cy="${y}" r="5" fill="#FAFAF7" stroke="#9AA3A8" stroke-width="1.5"/>`;
	}).join("");
	return `<svg class="today-arc" role="img" aria-label="${esc(label)}" viewBox="0 0 80 44" width="80" height="44"><path d="M6 40 A34 34 0 0 1 74 40" fill="none" stroke="#D6DADD" stroke-width="2"/>${dots}</svg>`;
}

// pages/card-swipe.js
const MS = 240;
const FADE_MS$1 = 150;
const EASE$1 = "cubic-bezier(.4, 0, .2, 1)";
const still$1 = /* @__PURE__ */ __name(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, "still");
const held = (dx) => `translate3d(${dx}px, 0px, 0px) rotate(${(dx / 24).toFixed(2)}deg)`;
function wireCard(card, { onOpen, onSwipe }) {
	let d = null;
	let swiped = 0;
	card.addEventListener("pointerdown", (e) => {
		if (e.button) return;
		e.stopPropagation();
		d = {
			id: e.pointerId,
			x0: e.clientX,
			y0: e.clientY,
			dx: 0,
			moved: false,
			vx: 0,
			lastX: e.clientX,
			lastT: performance.now()
		};
	});
	card.addEventListener("pointermove", (e) => {
		if (!d || e.pointerId !== d.id) return;
		const dx = e.clientX - d.x0;
		const dy = e.clientY - d.y0;
		if (!d.moved) {
			if (Math.hypot(dx, dy) < 10) return;
			if (Math.abs(dy) > Math.abs(dx)) {
				d = null;
				return;
			}
			d.moved = true;
			try {
				card.setPointerCapture(e.pointerId);
			} catch {}
		}
		const now = performance.now();
		d.vx = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
		d.lastX = e.clientX;
		d.lastT = now;
		d.dx = dx;
		card.style.transform = held(dx);
	});
	const end = (e) => {
		if (!d || e.pointerId !== d.id) return;
		const g = d;
		d = null;
		if (!g.moved) return;
		swiped = performance.now();
		const flick = Math.abs(g.vx) > .6 && Math.sign(g.vx) === Math.sign(g.dx);
		if (e.type === "pointerup" && (Math.abs(g.dx) > card.offsetWidth * .3 || flick)) onSwipe(Math.sign(g.dx), g.dx);
		else settleBack(card, g.dx);
	};
	card.addEventListener("pointerup", end);
	card.addEventListener("pointercancel", end);
	card.addEventListener("click", () => {
		if (performance.now() - swiped > 350) onOpen();
	});
	card.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onOpen();
		}
	});
}
function settleBack(card, dx) {
	card.style.transform = "";
	if (!still$1()) card.animate([{ transform: held(dx) }, { transform: held(0) }], {
		duration: MS,
		easing: EASE$1
	});
}
function cardAway(card, dir, dx = 0) {
	const to = dir ? `translate3d(${dir * (card.offsetWidth + 80)}px, 0px, 0px) rotate(${dir * 12}deg)` : "translate3d(0px, 32px, 0px)";
	const frames = still$1() ? [{ opacity: 1 }, { opacity: 0 }] : [{
		transform: held(dx),
		opacity: 1
	}, {
		transform: to,
		opacity: dir ? 1 : 0
	}];
	const a = card.animate(frames, {
		duration: still$1() ? FADE_MS$1 : MS,
		easing: EASE$1,
		fill: "forwards"
	});
	return new Promise((done) => {
		a.onfinish = done;
		setTimeout(done, MS + 200);
	});
}

// pages/move.js
async function copy(text) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const t = document.createElement("textarea");
		t.value = text;
		t.setAttribute("readonly", "");
		t.style.cssText = "position: fixed; opacity: 0;";
		document.body.append(t);
		t.select();
		const ok = document.execCommand?.("copy");
		t.remove();
		return !!ok;
	}
}
async function openMove(person, { onDone, onLater }) {
	const kind = person.next.kind;
	const [messages, me] = await Promise.all([getMessages(), getMe()]);
	const text = fill(messages[kind] ?? KINDS[kind].starter, fillValues(person, me, dayOf()));
	const where = contactFor(person);
	const handle = handleText(person);
	let away = false;
	const s = openSheet({
		title: KINDS[kind].name,
		className: "move-sheet",
		onClose: () => document.removeEventListener("visibilitychange", back),
		body: `
      <div class="move-who">${photoHtml(person, "small")}<span class="move-who-words"><span class="move-name">${esc(person.name)}</span>${handle ? `<span class="move-handle">${esc(handle)}</span>` : ""}</span></div>
      <label class="label" for="moveText">Your message</label>
      <textarea class="move-text" id="moveText" rows="6">${esc(text)}</textarea>
      <div class="move-actions"></div>`
	});
	s.el.querySelector(".sheet-header h2").innerHTML = tagHtml(kind);
	fillPhotos(s.el, [person]);
	const actions = s.body.querySelector(".move-actions");
	const buttons = () => {
		actions.innerHTML = `
      <button type="button" class="btn primary move-go" data-go ${where ? "data-test-skip" : ""}>${where ? `Copy and open ${esc(where.how)}` : "Copy the message"} ${ARROW}</button>
      <div class="move-more"><button type="button" class="text-btn" data-done>Done</button><button type="button" class="text-btn" data-later>Later</button></div>`;
	};
	buttons();
	function back() {
		if (document.hidden || !away) return;
		away = false;
		actions.innerHTML = `<p class="move-ask">Done?</p>
      <div class="move-ask-btns"><button type="button" class="btn secondary" data-not-yet>Not yet</button><button type="button" class="btn primary" data-done>Done</button></div>`;
	}
	document.addEventListener("visibilitychange", back);
	actions.addEventListener("click", async (e) => {
		const b = e.target.closest("button");
		if (!b) return;
		if (b.matches("[data-done]")) {
			s.close();
			onDone();
		} else if (b.matches("[data-later]")) {
			s.close();
			onLater();
		} else if (b.matches("[data-not-yet]")) buttons();
		else if (b.matches("[data-go]")) {
			const words = s.body.querySelector(".move-text").value;
			const copied = await copy(words);
			const to = contactFor(person, words);
			if (!to) {
				toast(copied ? "Copied." : "Select the message and copy it.");
				return;
			}
			away = true;
			window.open(to.url, "_blank", "noopener");
			if (!copied) toast("Select the message and copy it.");
		}
	});
	return s;
}

// pages/add-person.js
function openAddPerson(onAdded) {
	const s = openSheet({
		title: "Add someone",
		body: `
      <form class="form" data-form>
        <label class="field"><span class="field-label">Name</span><input type="text" name="name" autocomplete="off" required /></label>
        <label class="field"><span class="field-label">Instagram</span><input type="text" name="instagram" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@handle" /></label>
        <label class="field"><span class="field-label">Where you met</span><input type="text" name="where" autocomplete="off" placeholder="The Brooklyn portrait meetup" /></label>
        <div class="sheet-actions">
          <button type="button" class="btn secondary" data-close>Cancel</button>
          <button type="submit" class="btn primary">Add</button>
        </div>
      </form>`
	});
	const form = s.body.querySelector("form");
	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const f = Object.fromEntries(new FormData(form));
		if (!f.name.trim()) {
			form.name.focus();
			return;
		}
		const p = newPerson({
			...f,
			id: uuid()
		}, dayOf());
		await savePerson(p);
		s.close();
		toast(`${p.name} is in Rounds.`);
		onAdded(p);
	});
	return s;
}

// pages/today.js
const head = (count, arc) => `<div class="today-head"><span class="today-count">${count}</span>${arc}</div>`;
function stackHtml(pick, left, today) {
	const n = pick.ids.length;
	const at = n - left.length + 1;
	const [top, next, after] = left;
	return `
    ${head(`${at} of ${n} today`, arcHtml(pick, top.id, `Move ${at} of ${n}`))}
    <div class="stack">${after ? behindHtml(after, 2) : ""}${next ? behindHtml(next, 1) : ""}${cardHtml$1(top, today)}</div>
    <div class="today-btns">
      <button type="button" class="btn secondary" data-later>Later</button>
      <button type="button" class="btn primary" data-write><span>${esc(writeLabel(top))}</span></button>
    </div>`;
}
function calmHtml(people, pick, today) {
	const n = pick.ids.length;
	if (n) return `${head(`${n} of ${n} today`, arcHtml(pick, "", `All ${n} done`))}<div class="today-calm"><h2>That's today.</h2><p>Rounds picks the next ones tomorrow.</p></div>`;
	const here = people.filter((p) => !p.letGo);
	if (!here.length) {
		const eye = window.DF_SUITE ? " People from your shoots in The Eye come in on their own." : "";
		return `<div class="today-calm"><h2>No one here yet.</h2><p>Add the people you work with, and Rounds picks a few to write to each day.${eye}</p>
      <button type="button" class="btn primary" data-add>${PLUS}Add someone</button></div>`;
	}
	const next = here.filter((p) => p.next).map((p) => p.next.due).sort()[0];
	const when = next ? `The next move is due ${dueWords(next, today).replace("Tomorrow", "tomorrow")}.` : "Nothing is planned.";
	return `<div class="today-calm"><h2>Nothing today.</h2><p>${when}</p></div>`;
}
async function todayScreen(view, { beside = false } = {}) {
	const today = dayOf();
	const { people, pick } = await loadToday();
	const byId = new Map(people.map((p) => [p.id, p]));
	const left = waiting$1(pick).map((id) => byId.get(id));
	view.innerHTML = `<div class="screen"><div class="scroll">${bandHtml({
		title: "Rounds",
		place: "Today"
	})}${left.length ? stackHtml(pick, left, today) : calmHtml(people, pick, today)}</div></div>`;
	fillPhotos(view, people);
	if (beside) return;
	view.querySelector("[data-add]")?.addEventListener("click", () => openAddPerson(() => todayScreen(view)));
	if (!left.length) return;
	const top = left[0];
	const card = view.querySelector(".card.top");
	const redraw = () => todayScreen(view).then(() => view.querySelector(".screen")?.classList.add("still"));
	const done = async (dir = 1, dx = 0) => {
		const [undo] = await Promise.all([doMove(top), cardAway(card, dir, dx)]);
		await redraw();
		toast("Done.", { action: {
			label: "Undo",
			run: () => undoMove(undo).then(redraw)
		} });
	};
	const later = async () => {
		await Promise.all([laterMove(top), cardAway(card, 0)]);
		await redraw();
	};
	const open = () => openMove(top, {
		onDone: () => done(1),
		onLater: later
	});
	wireCard(card, {
		onOpen: open,
		onSwipe: done
	});
	view.querySelector("[data-write]").addEventListener("click", open);
	view.querySelector("[data-later]").addEventListener("click", later);
}

// pages/people.js
const order = (a, b) => (a.next ? a.next.due : "~").localeCompare(b.next ? b.next.due : "~") || a.name.localeCompare(b.name);
const cardHtml = (p) => `
  <a class="person-card" href="#/person/${encodeURIComponent(p.id)}">${photoHtml(p)}
    <span class="person-card-name">${p.letGo ? "" : miniHtml(p.next?.kind)}<span>${esc(p.name)}</span></span></a>`;
async function peopleScreen(view, { beside = false } = {}) {
	const people = await listPeople();
	const here = people.filter((p) => !p.letGo).sort(order);
	const gone = people.filter((p) => p.letGo).sort((a, b) => a.name.localeCompare(b.name));
	const eye = window.DF_SUITE ? " People from your shoots in The Eye come in on their own." : "";
	view.innerHTML = `<div class="screen"><div class="scroll">
    ${bandHtml({
		title: "People",
		place: "Rounds"
	})}
    <div class="list-head"><h2>People <span>${here.length}</span></h2><button type="button" class="list-act" data-add>${PLUS}Add someone</button></div>
    ${here.length ? `<div class="people-grid">${here.map(cardHtml).join("")}</div>` : `<p class="note">No one yet. Add the people you work with.${eye}</p>`}
    ${gone.length ? `<div class="people-gone"><div class="list-head"><h2>Let go <span>${gone.length}</span></h2></div><div class="people-grid">${gone.map(cardHtml).join("")}</div></div>` : ""}
  </div></div>`;
	fillPhotos(view, people);
	if (beside) return;
	view.querySelector("[data-add]").addEventListener("click", () => openAddPerson((p) => {
		location.hash = `#/person/${encodeURIComponent(p.id)}`;
	}));
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

// pages/message-edit.js
function openMessage(kind, mine, onSaved) {
	const s = openSheet({
		title: KINDS[kind].name,
		body: `
      <form class="form" data-form>
        <label class="field"><span class="field-label">Your message</span><textarea name="text" rows="6">${esc(mine ?? KINDS[kind].starter)}</textarea></label>
        <span class="field-label">Fill in</span>
        <div class="fill-chips">${FILLS.map((f) => `<button type="button" class="fill-chip" data-fill="${f}">[${f}]</button>`).join("")}</div>
        ${mine === undefined ? "" : "<button type=\"button\" class=\"text-btn\" data-reset>Back to the example</button>"}
        <div class="sheet-actions">
          <button type="button" class="btn secondary" data-close>Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>`
	});
	s.el.querySelector(".sheet-header h2").innerHTML = tagHtml(kind);
	const text = s.body.querySelector("textarea");
	s.body.querySelector(".fill-chips").addEventListener("click", (e) => {
		const b = e.target.closest("[data-fill]");
		if (!b) return;
		const at = text.selectionStart ?? text.value.length;
		const put = `[${b.dataset.fill}]`;
		text.setRangeText(put, at, text.selectionEnd ?? at, "end");
		text.focus();
	});
	s.body.querySelector("[data-reset]")?.addEventListener("click", async () => {
		await resetMessage(kind);
		s.close();
		onSaved();
	});
	s.body.querySelector("form").addEventListener("submit", async (e) => {
		e.preventDefault();
		const words = text.value.trim();
		if (!words || words === KINDS[kind].starter) await resetMessage(kind);
		else await saveMessage(kind, words);
		s.close();
		onSaved();
	});
	return s;
}

// pages/messages.js
const MINE = [{
	key: "offer",
	name: "Your offer",
	fill: "[offer]",
	ask: "What do you offer past clients?",
	hint: "a free mini session"
}, {
	key: "city",
	name: "Your city",
	fill: "[city]",
	ask: "Where are you based?",
	hint: "Hoboken"
}];
const row$1 = /* @__PURE__ */ __name((attr, mark, name, text) => `<button type="button" class="msg-row" ${attr}>${mark}<span class="msg-words"><span class="msg-kind">${esc(name)}</span><span class="msg-text">${esc(text)}</span></span>${CHEV}</button>`, "row");
async function messagesScreen(view, { beside = false } = {}) {
	const [messages, me] = await Promise.all([getMessages(), getMe()]);
	view.innerHTML = `<div class="screen"><div class="scroll">
    ${bandHtml({
		title: "Messages",
		place: "Rounds"
	})}
    <p class="note">Write each one once, in your words. [name] and the others fill in for each person.</p>
    <div class="msg-list">${MESSAGE_ORDER.map((k) => row$1(`data-kind="${k}"`, miniHtml(k), KINDS[k].name, messages[k] ?? KINDS[k].starter)).join("")}</div>
    <div class="msg-fills">
      <div class="list-head"><h2>Your fill-ins</h2></div>
      <div class="msg-list">${MINE.map((m) => row$1(`data-mine="${m.key}"`, "", `${m.name} ${m.fill}`, me[m.key] || "Not set yet")).join("")}</div>
    </div>
  </div></div>`;
	if (beside) return;
	const redraw = () => messagesScreen(view).then(() => view.querySelector(".screen")?.classList.add("still"));
	view.querySelector(".scroll").addEventListener("click", async (e) => {
		const b = e.target.closest(".msg-row");
		if (!b) return;
		if (b.dataset.kind) {
			openMessage(b.dataset.kind, messages[b.dataset.kind], redraw);
			return;
		}
		const m = MINE.find((x) => x.key === b.dataset.mine);
		const value = await promptSheet({
			title: m.name,
			label: m.ask,
			value: me[m.key],
			placeholder: m.hint,
			allowEmpty: true
		});
		if (value === null) return;
		await setSetting(m.key, value);
		redraw();
	});
}

// pages/sections.js
const SCREENS = [
	todayScreen,
	peopleScreen,
	messagesScreen
];
const drawSection = (i, el, opts) => SCREENS[i](el, opts);

// components/spread.js
const frame$1 = document.getElementById("frame");
const view$1 = document.getElementById("view");
const SLIDE_MS = 240;
const FADE_MS = 150;
const EASE = "cubic-bezier(.4, 0, .2, 1)";
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const at$1 = /* @__PURE__ */ __name((x) => `translate3d(${x}px, 0px, 0px)`, "at");
const slideOffset = (x, dir, width) => dir > 0 ? Math.max(-width, Math.min(0, x)) : Math.min(width, Math.max(0, x));
let beside = null;
function drawBeside(i, dir) {
	if (beside && beside.i === i && beside.dir === dir) return beside.ready;
	dropBeside();
	const leaf = document.createElement("div");
	leaf.className = "slide-leaf";
	leaf.setAttribute("aria-hidden", "true");
	leaf.inert = true;
	leaf.style.transform = `translate3d(${dir * 100}%, 0px, 0px)`;
	leaf.innerHTML = "<div class=\"paper\"></div>";
	frame$1.append(leaf);
	const page = leaf.firstChild;
	const ready = drawSection(i, page, { beside: true }).then(() => page.querySelector(".screen")?.classList.add("still")).catch(() => {});
	beside = {
		leaf,
		i,
		dir,
		ready
	};
	return ready;
}
function dropBeside() {
	beside?.leaf.remove();
	beside = null;
}
let settling = null;
const dragFrame = (x) => {
	settling?.cancel();
	settling = null;
	frame$1.style.transform = x ? at$1(x) : "";
};
function settleFrame(from) {
	frame$1.style.transform = "";
	settling?.cancel();
	settling = null;
	if (!from) {
		dropBeside();
		return;
	}
	settling = frame$1.animate([{ transform: at$1(from) }, { transform: at$1(0) }], {
		duration: SLIDE_MS,
		easing: EASE
	});
	const done = settling;
	done.onfinish = () => {
		if (settling === done) {
			settling = null;
			dropBeside();
		}
	};
}
let turning = false;
const isTurning = () => turning;
const ended = (a, ms) => new Promise((done) => {
	let gone = false;
	const off = () => {
		if (!gone) {
			gone = true;
			done();
		}
	};
	a.onfinish = off;
	setTimeout(off, ms + 300);
});
async function turnTo(i, dir, go, from = 0) {
	if (turning) return;
	turning = true;
	settling?.cancel();
	settling = null;
	if (still()) await crossfade(go);
	else {
		await drawBeside(i, dir);
		const a = frame$1.animate([{ transform: at$1(from) }, { transform: at$1(-dir * frame$1.offsetWidth) }], {
			duration: SLIDE_MS,
			easing: EASE,
			fill: "forwards"
		});
		await ended(a, SLIDE_MS);
		await go();
		a.cancel();
		frame$1.style.transform = "";
		dropBeside();
	}
	view$1.querySelector(".screen")?.classList.add("still");
	turning = false;
}
async function crossfade(go) {
	dropBeside();
	frame$1.style.transform = "";
	const leaf = document.createElement("div");
	leaf.className = "slide-leaf slide-fade";
	leaf.setAttribute("aria-hidden", "true");
	leaf.innerHTML = "<div class=\"paper\"></div>";
	const old = view$1.firstElementChild;
	if (old) leaf.firstChild.append(old.cloneNode(true));
	frame$1.append(leaf);
	const from = old ? [...old.querySelectorAll(".scroll")] : [];
	leaf.querySelectorAll(".scroll").forEach((el, k) => {
		el.scrollTop = from[k]?.scrollTop || 0;
	});
	await go();
	await ended(leaf.animate([{ opacity: 1 }, { opacity: 0 }], {
		duration: FADE_MS,
		easing: "linear",
		fill: "forwards"
	}), FADE_MS);
	leaf.remove();
}

// components/navbar.js
const MARKS = {
	today: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle class=\"mk-ring\" cx=\"12\" cy=\"12\" r=\"10\"/><circle class=\"mk-2\" cx=\"12\" cy=\"12\" r=\"4\"/></svg>",
	people: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle class=\"mk-1\" cx=\"8.5\" cy=\"12\" r=\"7.5\"/><circle class=\"mk-2\" cx=\"15.5\" cy=\"12\" r=\"7.5\" opacity=\".85\"/></svg>",
	messages: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path class=\"mk-1\" d=\"M2 4h20v12H9l-5 5v-5H2z\"/><rect class=\"mk-2\" x=\"6\" y=\"8\" width=\"12\" height=\"2.5\"/></svg>"
};
const SECTIONS = [
	{
		href: "#/today",
		name: "Today",
		key: "today",
		icon: MARKS.today
	},
	{
		href: "#/people",
		name: "People",
		key: "people",
		icon: MARKS.people
	},
	{
		href: "#/messages",
		name: "Messages",
		key: "messages",
		icon: MARKS.messages
	}
];
const bar = document.getElementById("navbar");
const frame = document.getElementById("frame");
const suite$1 = !!window.DF_SUITE;
bar.innerHTML = `<div class="sec-row">${SECTIONS.map((s, i) => `<a class="sec sec-${s.key}" href="${s.href}" data-sec="${i}">${s.icon}<span>${s.name}</span></a>`).join("")}</div>`;
const links = [...bar.querySelectorAll(".sec")];
let at = 0;
let busy = false;
let swiped = -Infinity;
let onList = false;
let landed = null;
let docked = null;
function showSection(i, list = false) {
	bar.hidden = i < 0;
	onList = list;
	frame.dataset.swipe = list ? "1" : "";
	if (landed) {
		landed();
		landed = null;
	}
	if (i < 0) {
		frame.style.transform = "";
		busy = false;
		return;
	}
	at = i;
	links.forEach((a, k) => {
		if (k === i) a.setAttribute("aria-current", "page");
		else a.removeAttribute("aria-current");
	});
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
	if (dir < 0 && at === 0 && suite$1) {
		settle(from);
		location.hash = "#/";
		return;
	}
	const target = at + dir;
	const t = SECTIONS[target];
	if (!t) return settle(from);
	busy = true;
	await turnTo(target, Math.sign(dir), () => navigate(t.href), from);
	busy = false;
}
const settle = (from) => settleFrame(from);
links.forEach((a, k) => a.addEventListener("click", (e) => {
	e.preventDefault();
	if (k !== at) go(k - at);
	else frame.querySelector(".scroll")?.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}));
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
			if (SECTIONS[at + dir]) {
				d.kind = "turn";
				drawBeside(at + dir, dir);
			} else if (dir < 0 && at === 0 && suite$1) d.kind = "shut";
			else d.kind = "stop";
		}
		d.x = dx;
		if (d.kind === "turn") {
			d.x = slideOffset(dx, d.dir, frame.offsetWidth);
			dragFrame(d.x);
		}
		if (d.kind === "shut") {
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
		const w = frame.offsetWidth;
		if (g.kind === "turn") {
			if (up && g.x * g.dir < 0 && Math.abs(g.x) > Math.min(60, w * .15)) go(g.dir, g.x);
			else settle(g.x);
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
wire(frame, true);
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
bar.addEventListener("pointerdown", (e) => {
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
bar.addEventListener("contextmenu", (e) => e.preventDefault());
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

// components/files.js
async function saveFile(file) {
	if (navigator.canShare && navigator.canShare({ files: [file] })) {
		try {
			await navigator.share({
				files: [file],
				title: file.name
			});
			return "shared";
		} catch (e) {
			if (e && e.name === "AbortError") return "cancelled";
		}
	}
	const url = URL.createObjectURL(file);
	const a = document.createElement("a");
	a.href = url;
	a.download = file.name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 4e3);
	return "downloaded";
}
function pickFile(accept) {
	return new Promise((ok) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = accept;
		input.style.display = "none";
		input.addEventListener("change", () => {
			ok(input.files && input.files[0] ? input.files[0] : null);
			input.remove();
		});
		document.body.appendChild(input);
		input.click();
	});
}

// pages/person-edit.js
const field = (label, name, value, more = "") => `<label class="field"><span class="field-label">${label}</span><input type="text" name="${name}" value="${esc(value)}" autocomplete="off" ${more} /></label>`;
const HANDLE = "autocapitalize=\"off\" spellcheck=\"false\" placeholder=\"@handle\"";
const GROUP_WORDS = {
	regular: "Repeat collaborators. A check-in every six weeks.",
	new: "Just met, or shot once. Thanks or hello, then a check-in.",
	client: "People who hired you. A refresh offer or ask for intros, every few months.",
	prospect: "Brands and agencies. A pitch and two follow ups.",
	guest: "People from an event. One friendly note, then the newsletter."
};
function openEdit(p, onSaved) {
	let group = p.group;
	const s = openSheet({
		title: "Edit",
		body: `
      <form class="form" data-form>
        ${field("Name", "name", p.name, "required")}
        <button type="button" class="field-row" data-group><span class="choice-text"><span class="field-label">Group</span><span class="field-value" data-group-name>${esc(GROUPS[group])}</span></span>${CHEV}</button>
        ${field("Instagram", "instagram", p.instagram, HANDLE)}
        ${field("TikTok", "tiktok", p.tiktok, HANDLE)}
        ${field("Website", "website", p.website, "autocapitalize=\"off\" spellcheck=\"false\" inputmode=\"url\"")}
        ${field("Where you met", "where", p.where)}
        <label class="field"><span class="field-label">Note</span><textarea name="note" rows="2">${esc(p.note)}</textarea></label>
        <label class="switch-row"><span>On my email newsletter</span><input type="checkbox" class="switch" name="emailList" ${p.lists.email ? "checked" : ""} /></label>
        <div data-email ${p.lists.email || p.email ? "" : "hidden"}>${field("Email", "email", p.email, "autocapitalize=\"off\" spellcheck=\"false\" inputmode=\"email\"")}</div>
        <label class="switch-row"><span>On my mail newsletter</span><input type="checkbox" class="switch" name="mailList" ${p.lists.mail ? "checked" : ""} /></label>
        <div data-address ${p.lists.mail ? "" : "hidden"}><label class="field"><span class="field-label">Address</span><textarea name="address" rows="3">${esc(p.address)}</textarea></label></div>
        <div class="sheet-actions">
          <button type="button" class="btn secondary" data-close>Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>`
	});
	const form = s.body.querySelector("form");
	form.emailList.addEventListener("change", () => {
		s.body.querySelector("[data-email]").hidden = !form.emailList.checked && !form.email.value.trim();
	});
	form.mailList.addEventListener("change", () => {
		s.body.querySelector("[data-address]").hidden = !form.mailList.checked;
	});
	s.body.querySelector("[data-group]").addEventListener("click", async () => {
		const pick = await choiceSheet({
			title: "Group",
			options: GROUP_KEYS.map((k) => ({
				key: k,
				label: GROUPS[k],
				detail: GROUP_WORDS[k],
				current: k === group
			}))
		});
		if (pick) {
			group = pick;
			s.body.querySelector("[data-group-name]").textContent = GROUPS[group];
		}
	});
	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const f = Object.fromEntries(new FormData(form));
		const edited = applyEdit(p, {
			...f,
			group,
			lists: {
				email: form.emailList.checked,
				mail: form.mailList.checked
			}
		}, dayOf());
		await savePerson(edited);
		s.close();
		onSaved(edited);
	});
	return s;
}

// pages/person-menu.js
async function openPersonMenu(p, redraw) {
	const own = await hasOwnPhoto(p);
	const pick = await choiceSheet({
		title: p.name,
		options: [
			{
				key: "edit",
				label: "Edit"
			},
			{
				key: "photo",
				label: own ? "Change the photo" : "Choose a photo"
			},
			...own ? [{
				key: "unphoto",
				label: "Remove the photo"
			}] : [],
			p.letGo ? {
				key: "back",
				label: "Bring back"
			} : {
				key: "go",
				label: "Let go"
			}
		]
	});
	if (pick === "edit") openEdit(p, redraw);
	else if (pick === "photo") {
		const file = await pickFile("image/*");
		if (!file) return;
		try {
			await keepPhoto(p, file);
		} catch {
			toast("That photo couldn't be opened.");
			return;
		}
		redraw();
	} else if (pick === "unphoto") {
		await removePhoto(p);
		redraw();
	} else if (pick === "back") {
		await savePerson(bringBack(p, dayOf()));
		redraw();
	} else if (pick === "go") {
		const yes = await confirmSheet({
			title: `Let ${p.name} go?`,
			message: "They leave Today and your list of people. Everything about them is kept, and you can bring them back.",
			confirmLabel: "Let go"
		});
		if (yes) {
			await savePerson(letGo(p));
			redraw();
		}
	}
}

// pages/person.js
function restHtml(p) {
	if (p.letGo) return "Let go. Everything about them is kept, and the menu can bring them back.";
	if (p.group === "guest") return "That was the one move. Event guests can go on your newsletter instead: Edit has the lists.";
	return "Nothing planned. Rounds let this one rest.";
}
async function personScreen(view, id) {
	const p = await getPerson(id);
	if (!p) {
		location.replace("#/people");
		return;
	}
	const handle = handleText(p);
	const url = profileUrl(p);
	const line = [GROUPS[p.group], p.note || p.where].filter(Boolean).join(". ");
	const next = p.next && !p.letGo;
	view.innerHTML = `<div class="screen"><div class="scroll">
    ${shortBandHtml({
		place: "People",
		back: "#/people",
		more: "More"
	})}
    <div class="person-top">
      ${photoHtml(p)}
      <h1 class="person-name">${esc(p.name)}</h1>
      ${handle ? url ? `<a class="person-handle" href="${esc(url)}" target="_blank" rel="noopener" data-test-skip>${esc(handle)} ${CHEV_SMALL}</a>` : `<span class="person-handle">${esc(handle)}</span>` : ""}
      <!-- The handle opens their profile on Instagram (or TikTok, or their website): the button clicker leaves it alone. -->
      <p class="person-line">${esc(line.endsWith(".") ? line : `${line}.`)}</p>
    </div>
    ${next ? `<button type="button" class="person-next" data-move>${miniHtml(p.next.kind)}<span class="person-next-what">${esc(phrase(p.next.kind, p.name))}</span><span class="person-next-when">${esc(dueWords(p.next.due, dayOf()))} ${CHEV_SMALL}</span></button>` : `<p class="person-rest note">${esc(restHtml(p))}</p>`}
  </div></div>`;
	fillPhotos(view, [p]);
	const redraw = () => personScreen(view, id).then(() => view.querySelector(".screen")?.classList.add("still"));
	view.querySelector("[data-band-more]").addEventListener("click", () => openPersonMenu(p, redraw));
	view.querySelector("[data-move]")?.addEventListener("click", () => openMove(p, {
		onDone: async () => {
			const undo = await doMove(p);
			await redraw();
			toast("Done.", { action: {
				label: "Undo",
				run: () => undoMove(undo).then(redraw)
			} });
		},
		onLater: () => laterMove(p).then(redraw)
	}));
}

// data/lists.js
function listRows(people, which) {
	const on = people.filter((p) => !p.letGo && p.lists[which]);
	if (which === "email") return [["name", "email"], ...on.filter((p) => p.email).map((p) => [p.name, p.email])];
	return [["name", "address"], ...on.filter((p) => p.address).map((p) => [p.name, p.address])];
}

// data/csv.js
function parseCsv(text) {
	const s = String(text ?? "").replace(/^﻿/, "");
	const rows = [];
	let row = [];
	let field = "";
	let quoted = false;
	const endRow = () => {
		row.push(field);
		rows.push(row);
		row = [];
		field = "";
	};
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (quoted) {
			if (c !== "\"") field += c;
			else if (s[i + 1] === "\"") {
				field += "\"";
				i++;
			} else quoted = false;
		} else if (c === "\"" && field === "") quoted = true;
		else if (c === ",") {
			row.push(field);
			field = "";
		} else if (c === "\n") endRow();
		else if (c === "\r") {
			if (s[i + 1] === "\n") i++;
			endRow();
		} else field += c;
	}
	if (field !== "" || row.length) endRow();
	return rows.filter((r) => r.some((f) => f.trim() !== ""));
}
const cell = (v) => {
	const t = String(v ?? "");
	return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, "\"\"")}"` : t;
};
const toCsv = (rows) => rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
function readPeople(text) {
	const [head = [], ...body] = parseCsv(text);
	const col = new Map(head.map((h, i) => [h.trim().toLowerCase().replace(/[\s-]+/g, "_"), i]));
	if (!col.has("name")) throw new Error("This file has no name column. Its first row should name the columns: name, group, instagram and the rest.");
	const get = (r, k) => col.has(k) ? String(r[col.get(k)] ?? "").trim() : "";
	const rows = [];
	let bad = 0;
	for (const r of body) {
		const name = get(r, "name");
		if (!name) {
			bad++;
			continue;
		}
		rows.push({
			name,
			group: groupFromName(get(r, "group")) || "prospect",
			instagram: cleanHandle(get(r, "instagram")),
			website: cleanSite(get(r, "website")),
			email: get(r, "email"),
			where: get(r, "where_met"),
			note: get(r, "note"),
			firstMove: kindFromName(get(r, "first_move"))
		});
	}
	return {
		rows,
		bad
	};
}
function newOnes(rows, people) {
	const known = [...people];
	const fresh = [];
	let skipped = 0;
	for (const r of rows) {
		if (findMatch(known, r)) {
			skipped++;
			continue;
		}
		known.push(r);
		fresh.push(r);
	}
	return {
		fresh,
		skipped
	};
}

// pages/import.js
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
async function openImport(onAdded) {
	const file = await pickFile(".csv,text/csv,text/comma-separated-values");
	if (!file) return null;
	let found;
	try {
		found = readPeople(await file.text());
	} catch (e) {
		toast(e.message, { ms: 6e3 });
		return null;
	}
	const { fresh, skipped } = newOnes(found.rows, await listPeople());
	const notes = [skipped && `${plural(skipped, "person is", "people are")} in Rounds already and won't be added again.`, found.bad && `${plural(found.bad, "row has", "rows have")} no name and ${found.bad === 1 ? "is" : "are"} left out.`].filter(Boolean).join(" ");
	if (!fresh.length) {
		toast(`No one new to add. ${notes}`.trim(), { ms: 6e3 });
		return null;
	}
	const s = openSheet({
		title: "Import people",
		body: `
      ${notes ? `<p class="import-sum">${esc(notes)}</p>` : ""}
      <div class="import-list">${fresh.map((r, i) => `
        <label class="import-row"><input type="checkbox" checked data-i="${i}" />
          <span class="import-who"><span class="import-name">${esc(r.name)}</span><span class="import-meta">${esc([
			GROUPS[r.group],
			r.instagram && `@${r.instagram}`,
			r.note || r.where
		].filter(Boolean).join(" · "))}</span></span></label>`).join("")}</div>
      <div class="sheet-actions one"><button type="button" class="btn primary" data-add></button></div>`
	});
	const ticks = [...s.body.querySelectorAll("[data-i]")];
	const add = s.body.querySelector("[data-add]");
	const label = () => {
		const n = ticks.filter((t) => t.checked).length;
		add.textContent = n === 1 ? "Add 1 person" : `Add ${n} people`;
		add.disabled = !n;
	};
	label();
	s.body.addEventListener("change", label);
	add.addEventListener("click", async () => {
		const rows = fresh.filter((_, i) => ticks[i].checked);
		const perDay = perDayOf(await getSetting("perDay", 3));
		await savePeople(fromImport(rows, dayOf(), perDay, uuid));
		s.close();
		toast(`${plural(rows.length, "person", "people")} added. Their first moves join Today a few at a time.`, { ms: 5e3 });
		onAdded();
	});
	return s;
}

// pages/intro.js
const SEEN = "rounds-intro-seen";
const CARDS = [
	["A few people a day", "Today picks three people to write to: a thank you, a hello, a check-in. Write, tap Done, and that is it. No streaks, and nothing overdue."],
	["Groups set the pace", "Regulars, New people, Clients, Prospects and Event guests each get their own moves, at their own pace. A person's group is in their Edit."],
	["Your words", "Messages has one starter for each kind of move, in your words. Their name and the rest fill in for each person, and you can change it before sending."]
];
const introSeen = () => {
	try {
		return localStorage.getItem(SEEN) === "1";
	} catch {
		return true;
	}
};
function openIntro() {
	let at = 0;
	const s = openSheet({
		title: CARDS[0][0],
		className: "sheet-small intro",
		onClose: () => {
			try {
				localStorage.setItem(SEEN, "1");
			} catch {}
		}
	});
	const draw = () => {
		const last = at === CARDS.length - 1;
		s.setTitle(CARDS[at][0]);
		s.body.innerHTML = `
      <p class="sheet-message">${CARDS[at][1]}</p>
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
const row = (attr, label, detail = "") => `<button type="button" class="choice" ${attr}><span class="choice-text"><span class="choice-label">${label}</span>${detail ? `<span class="choice-detail">${detail}</span>` : ""}</span>${CHEV}</button>`;
const LISTS = {
	email: ["Email newsletter list", "rounds-email-list"],
	mail: ["Mail newsletter list", "rounds-mail-list"]
};
async function openOptions(onChange) {
	const [perDay, people] = await Promise.all([getSetting("perDay", 3), listPeople()]);
	let n = perDayOf(perDay);
	const count = (which) => listRows(people, which).length - 1;
	const people1 = (k) => k === 1 ? "1 person" : `${k} people`;
	const s = openSheet({
		title: "Options",
		body: `
      <div class="switch-row"><span>Moves a day</span>
        <span class="stepper"><button type="button" data-step="-1" aria-label="Fewer"><span>−</span></button><output data-n>${n}</output><button type="button" data-step="1" aria-label="More"><span>+</span></button></span></div>
      <div class="choice-list">
        ${row("data-import", "Import people", "From a CSV file")}
        ${row("data-list=\"email\"", "Export the email list", `${people1(count("email"))}, for your newsletter tool`)}
        ${row("data-list=\"mail\"", "Export the mail list", `${people1(count("mail"))}, names and addresses`)}
        ${row("data-intro", "How it works")}
      </div>`
	});
	const out = s.body.querySelector("[data-n]");
	s.body.addEventListener("click", async (e) => {
		const b = e.target.closest("button");
		if (!b) return;
		if (b.dataset.step) {
			const to = Math.min(5, Math.max(1, n + Number(b.dataset.step)));
			if (to === n) return;
			n = to;
			out.textContent = String(n);
			await setSetting("perDay", n);
			onChange();
		} else if (b.matches("[data-import]")) {
			s.close();
			openImport(onChange);
		} else if (b.matches("[data-intro]")) {
			s.close();
			openIntro();
		} else if (b.dataset.list) {
			const which = b.dataset.list;
			if (!count(which)) {
				toast(`No one is on the ${which} list yet. Edit a person to add them.`);
				return;
			}
			const [, name] = LISTS[which];
			await saveFile(new File([toCsv(listRows(people, which))], `${name}-${dayOf()}.csv`, { type: "text/csv" }));
		}
	});
	return s;
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

// app.js
const view = document.getElementById("view");
const suite = window.DF_SUITE;
const SECTION = {
	"/today": 0,
	"/people": 1,
	"/messages": 2
};
let token = 0;
async function route() {
	const mine = ++token;
	closeAllSheets();
	hideToast();
	const h = (location.hash || "#/").slice(1) || "/";
	if (h === "/") {
		if (suite) suite.home();
		else location.replace("#/today");
		return;
	}
	let m;
	try {
		if (h in SECTION) {
			await drawSection(SECTION[h], view);
			if (mine === token) showSection(SECTION[h], true);
		} else if (m = h.match(/^\/person\/(.+)$/)) {
			await personScreen(view, decodeURIComponent(m[1]));
			if (mine === token) showSection(1);
		} else location.replace("#/today");
	} catch (e) {
		console.error(e);
		view.innerHTML = `<div class="screen"><div class="scroll"><p class="note">Something went wrong. ${esc(e.message || "Try reloading.")}</p></div></div>`;
	}
}
document.addEventListener("click", (e) => {
	if (e.target.closest("[data-books]")) location.hash = "#/";
	else if (e.target.closest("[data-app-menu]")) openOptions(redrawSoon);
});
let waiting = null;
function redrawSoon() {
	if (waiting) return;
	waiting = setInterval(() => {
		if (document.querySelector(".sheet-overlay")) return;
		clearInterval(waiting);
		waiting = null;
		route();
	}, 200);
}
window.addEventListener("hashchange", route);
if ((location.hash || "#/") === "#/") history.replaceState(null, "", suite && suite.at ? `#/${suite.at}` : "#/today");
bringInFromEye().catch(console.error).finally(route);
document.addEventListener("visibilitychange", () => {
	if (document.hidden || document.querySelector(".sheet-overlay")) return;
	bringInFromEye().then((n) => {
		if (n && !document.querySelector(".sheet-overlay")) route();
	}).catch(console.error);
});
if (suite) {
	if (suite.firstVisit) setTimeout(() => {
		if (!document.querySelector(".sheet-overlay")) welcome("Rounds", openIntro);
	}, 900);
} else if (!introSeen()) setTimeout(() => {
	if (!document.querySelector(".sheet-overlay")) openIntro();
}, 1200);
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
