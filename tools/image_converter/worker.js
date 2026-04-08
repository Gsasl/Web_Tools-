// worker.js — AI background removal
// Model: Xenova/isnet-general-use
//   - Trained on DIS (Dichotomous Image Segmentation) dataset
//   - Much better than MODNet on dark, complex, or indoor backgrounds
//   - Fully public — no HuggingFace login required
//   - ~170 MB (cached after first download)

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache  = true;

let segmenter = null;
let cancelled  = false;

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
      segmenter = await pipeline('image-segmentation', 'Xenova/isnet-general-use', {
        progress_callback: (p) => {
          if (cancelled) return;
          if (p.status === 'initiate') {
            self.postMessage({ status: 'downloading', progress: 0, file: p.name ?? '' });
          } else if (p.status === 'download' && typeof p.progress === 'number') {
            self.postMessage({
              status: 'downloading',
              progress: Math.round(p.progress),
              file: p.file ?? ''
            });
          }
        }
      });
    }

    if (cancelled) return;

    self.postMessage({ status: 'processing' });

    const result = await segmenter(imageBase64);

    if (cancelled) return;

    const mask = result[0].mask;

    // mask.data = Uint8ClampedArray, 1 byte per pixel:
    //   0   = definitely background
    //   255 = definitely foreground
    // Values in between = uncertain (edges, semi-transparent areas)
    const raw = new Uint8ClampedArray(mask.data);

    self.postMessage(
      { status: 'done', width: mask.width, height: mask.height, data: raw },
      [raw.buffer]
    );

  } catch (err) {
    if (!cancelled) {
      self.postMessage({ status: 'error', error: err.message });
    }
  }
};
