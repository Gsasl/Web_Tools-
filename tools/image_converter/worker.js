// worker.js — AI background removal
// Model: Xenova/modnet (public — no HuggingFace login required)

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache  = true;

let segmenter = null;
let cancelled = false;

self.onmessage = async (event) => {
  const { action, imageBase64 } = event.data;

  if (action === 'cancel') {
    cancelled = true;
    segmenter = null;
    return;
  }

  cancelled = false;

  try {
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

    // mask.data = 1 byte per pixel (0 = background, 255 = foreground).
    // The main thread (applyAIMask) converts this to 4-ch RGBA + feathers edges.
    const raw = new Uint8ClampedArray(mask.data);

    self.postMessage(
      { status: 'done', width: mask.width, height: mask.height, data: raw },
      [raw.buffer]  // Transferable — zero-copy
    );

  } catch (err) {
    if (!cancelled) {
      self.postMessage({ status: 'error', error: err.message });
    }
  }
};
