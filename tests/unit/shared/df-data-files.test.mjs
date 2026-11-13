// shared/df-data.js: handing a file over (saveFile: share sheet or download)
// and asking for files (pickFile, pickFiles).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData, NodeFile } from './_env.mjs';

let D;
let clicks;
beforeEach(async () => {
  D = await loadDFData();
  clicks = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { clicks.push({ href: this.href, download: this.download, inPage: document.body.contains(this) }); });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:made');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete navigator.canShare;
  delete navigator.share;
  document.body.innerHTML = '';
});

const file = new NodeFile(['x'], 'backup.zip', { type: 'application/zip' });
function phone({ can = true, share = () => Promise.resolve() } = {}) {
  navigator.canShare = vi.fn(() => can);
  navigator.share = vi.fn(share);
}

describe('saveFile', () => {
  it('downloads the file where there is no share sheet, and lets the URL go after 4 seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    expect(await D.saveFile(file)).toBe('downloaded');
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(clicks).toEqual([{ href: 'blob:made', download: 'backup.zip', inPage: true }]);
    expect(document.querySelector('a')).toBeNull();
    vi.advanceTimersByTime(3999);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:made');
  });
  it('hands it to the share sheet when it can take the file', async () => {
    phone();
    expect(await D.saveFile(file)).toBe('shared');
    expect(navigator.canShare).toHaveBeenCalledWith({ files: [file] });
    expect(navigator.share).toHaveBeenCalledWith({ files: [file], title: 'backup.zip' });
    expect(clicks).toEqual([]);
  });
  it('says it was cancelled when the share sheet is closed', async () => {
    phone({ share: () => Promise.reject(Object.assign(new Error('closed'), { name: 'AbortError' })) });
    expect(await D.saveFile(file)).toBe('cancelled');
    expect(clicks).toEqual([]);
  });
  it('downloads it when the share sheet fails some other way', async () => {
    phone({ share: () => Promise.reject(new TypeError('no')) });
    expect(await D.saveFile(file)).toBe('downloaded');
    phone({ share: () => Promise.reject(undefined) });
    expect(await D.saveFile(file)).toBe('downloaded');
    expect(clicks.length).toBe(2);
  });
  it("downloads it when the share sheet can't take the file, or sharing isn't wanted", async () => {
    phone({ can: false });
    expect(await D.saveFile(file)).toBe('downloaded');
    phone();
    expect(await D.saveFile(file, { share: false })).toBe('downloaded');
    expect(navigator.share).not.toHaveBeenCalled();
    expect(clicks.length).toBe(2);
  });
});

function picked(files) {
  const input = document.querySelector('input[type=file]');
  if (files !== undefined) Object.defineProperty(input, 'files', { value: files });
  input.dispatchEvent(new Event('change'));
  return input;
}

describe('pickFiles', () => {
  it('asks for several files of JSON by default, out of sight, and resolves with them', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const p = D.pickFiles();
    const input = document.querySelector('input');
    expect([input.type, input.accept, input.multiple, input.style.display]).toEqual(['file', 'application/json,.json', true, 'none']);
    expect(click).toHaveBeenCalledTimes(1);
    const a = new NodeFile(['1'], 'a.zip');
    const b = new NodeFile(['2'], 'b.zip');
    picked([a, b]);
    expect(await p).toEqual([a, b]);
    expect(document.querySelector('input')).toBeNull();
  });
  it('takes what to accept', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const p = D.pickFiles('.zip');
    expect(document.querySelector('input').accept).toBe('.zip');
    picked([]);
    expect(await p).toEqual([]);
  });
  it('resolves with none when the browser gives no file list', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const p = D.pickFiles();
    picked(null);
    expect(await p).toEqual([]);
  });
});

describe('pickFile', () => {
  it('asks for one JSON file by default and resolves with it', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const p = D.pickFile();
    const input = document.querySelector('input');
    expect([input.type, input.accept, input.multiple, input.style.display]).toEqual(['file', 'application/json,.json', false, 'none']);
    expect(click).toHaveBeenCalledTimes(1);
    const a = new NodeFile(['1'], 'a.json');
    picked([a, new NodeFile(['2'], 'b.json')]);
    expect(await p).toBe(a);
    expect(document.querySelector('input')).toBeNull();
  });
  it('resolves with null when nothing was picked', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const p = D.pickFile('image/*');
    expect(document.querySelector('input').accept).toBe('image/*');
    picked([]);
    expect(await p).toBeNull();
  });
  it('resolves with null when the browser gives no file list', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const p = D.pickFile();
    picked(null);
    expect(await p).toBeNull();
  });
});
