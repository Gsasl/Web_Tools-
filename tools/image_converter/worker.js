// worker.js — AI background removal  
// Model: Xenova/modnet  (public, no HuggingFace login required)
// Fix: mask.data is 1-ch grayscale — conversion to RGBA happens in main thread (applyAIMask)

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache  = true;   // skip re-download after first load

let segmenter = null;
let cancelled = false;

self.onmessage = async (event) => {
  const { action, imageBase64 } = event.data;

  if (action === 'cancel') {
    cancelled = true;
    segmenter = null;   // reset so next run loads fresh
    return;
  }

  cancelled = false;

  try {
    // Load model once, cache for subsequent calls
    if (!segmenter) {
      segmenter = await pipeline('image-segmentation', 'Xenova/modnet', {
        progress_callback: (p) => {
          if (cancelled) return;
          if (p.status === 'initiate') {
            self.postMessage({ status: 'downloading', progress: 0, file: p.name ?? '' });
          } else if (p.status === 'download' && typeof p.progress === 'number') {
            self.postMessage({ status: 'downloading', progress: Math.round(p.progress), file: p.file ?? '' });
          }
        }
      });
    }

    if (cancelled) return;

    self.postMessage({ status: 'processing' });

    const result = await segmenter(imageBase64);

    if (cancelled) return;

    const mask = result[0].mask;

    // mask.data is Uint8ClampedArray with 1 byte per pixel (0 = background, 255 = foreground).
    // Copy into a new buffer then transfer zero-copy to main thread.
    const raw = new Uint8ClampedArray(mask.data);

    self.postMessage(
      { status: 'done', width: mask.width, height: mask.height, data: raw },
      [raw.buffer]   // Transferable — no serialisation cost
    );

  } catch (err) {
    if (!cancelled) {
      self.postMessage({ status: 'error', error: err.message });
    }
  }
};
