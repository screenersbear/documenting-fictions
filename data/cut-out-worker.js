// Cut out (round 5): cuts a sticker out of its photo on the phone itself, so
// no photo leaves it. U-2-Net's small model (u2netp, Apache-2.0, the one
// rembg uses) run by transformers.js, the way Ref reads its photos
// (ref/data/tagger-worker.js), sharing Ref's copy of it. The sums are in
// components/cut-out.js. A worker, so the screen never waits on it; it says
// how far along it is ({ progress }) and answers each photo with the
// sticker's two editions (White border and Black outline: a JPEG and its
// shape, a PNG), or null when nothing clear stands out.
import { env, AutoModel, Tensor } from '../ref/ml/transformers.min.js';
import { SIDE, toInput, cutOut, paint } from '../components/cut-out.js';

const ml = new URL('../ref/ml/', import.meta.url).href;
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = true; // downloaded once, then kept
env.localModelPath = new URL('../ml/models/', import.meta.url).href;
env.backends.onnx.wasm.wasmPaths = ml;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;

let model = null, said = -1;
// (Only when the number changes: the download alone would say it hundreds of times.)
const say = (progress) => { const p = Math.round(progress); if (p !== said) self.postMessage({ progress: (said = p) }); };

// The runtime (about 21 MB, Ref's too) fetched here rather than by the
// runtime itself, so its download counts towards the progress.
async function counted(url, from, to) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const size = Number(res.headers.get('content-length')) || 0;
  if (!size || !res.body) return res.arrayBuffer();
  const parts = [], reader = res.body.getReader();
  let got = 0;
  for (let r = await reader.read(); !r.done; r = await reader.read()) {
    parts.push(r.value);
    got += r.value.length;
    say(from + ((to - from) * Math.min(got, size)) / size);
  }
  return new Blob(parts).arrayBuffer();
}

// Getting ready takes most of the first cut (0 to 85%); after that it's quick.
async function load() {
  if (model) return;
  env.backends.onnx.wasm.wasmBinary = await counted(`${ml}ort-wasm-simd-threaded.jsep.wasm`, 0, 70);
  const progress_callback = (p) => { if (p.status === 'progress' && p.total) say(70 + (15 * p.loaded) / p.total); };
  model = await AutoModel.from_pretrained('u2netp', { dtype: 'fp32', device: 'wasm', progress_callback });
}

const canvas = (w, h) => new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
async function edition(photo, w, cut, edge) {
  const { colour, shape } = paint(photo, w, cut, edge);
  const g = canvas(cut.w, cut.h);
  g.putImageData(new ImageData(colour, cut.w, cut.h), 0, 0);
  const bytes = await (await g.canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })).arrayBuffer();
  g.putImageData(new ImageData(shape, cut.w, cut.h), 0, 0);
  const mask = await (await g.canvas.convertToBlob({ type: 'image/png' })).arrayBuffer();
  return { bytes, mask };
}

async function cutPhoto(bytes) {
  said = -1;
  await load();
  say(88);
  const pic = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
  const { width: w, height: h } = pic;
  // What the model sees: the photo squeezed to SIDE by SIDE.
  const small = canvas(SIDE, SIDE);
  small.imageSmoothingQuality = 'high';
  small.drawImage(pic, 0, 0, SIDE, SIDE);
  const input = toInput(small.getImageData(0, 0, SIDE, SIDE).data, SIDE * SIDE);
  const big = canvas(w, h);
  big.drawImage(pic, 0, 0);
  pic.close();
  const photo = big.getImageData(0, 0, w, h).data;
  const out = await model({ 'input.1': new Tensor('float32', input, [1, 3, SIDE, SIDE]) });
  say(94);
  // Its first answer is the one it puts together from all the others.
  const answer = out[model.sessions.model.outputNames[0]].data;
  const cut = cutOut(answer, w, h);
  if (!cut) return null;
  say(97);
  return { ratio: cut.w / cut.h, white: await edition(photo, w, cut, 'white'), outline: await edition(photo, w, cut, 'outline') };
}

self.onmessage = async ({ data: { id, bytes } }) => {
  try {
    const cut = await cutPhoto(bytes);
    const keep = cut ? [cut.white.bytes, cut.white.mask, cut.outline.bytes, cut.outline.mask] : [];
    self.postMessage({ id, ok: true, cut }, keep);
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e?.message || e) });
  }
};
