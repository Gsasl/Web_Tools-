// worker.js
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';
env.allowLocalModels = false;

let segmenter = null;

self.onmessage = async (event) => {
    const { imageBase64 } = event.data;
    try {
        if (!segmenter) {
            self.postMessage({ status: 'loading', message: 'Downloading AI Model (~40MB)... This only happens once.' });
            
            // ✅ Public model — no HuggingFace login required
            segmenter = await pipeline('image-segmentation', 'Xenova/modnet', {
                device: 'webgpu',   // falls back to wasm automatically
            });
        }

        self.postMessage({ status: 'processing', message: 'AI is isolating the subject...' });

        const result = await segmenter(imageBase64);
        const mask = result[0].mask;

        self.postMessage({ 
            status: 'done', 
            width: mask.width, 
            height: mask.height, 
            data: mask.data 
        });
    } catch (error) {
        self.postMessage({ status: 'error', error: error.message });
    }
};
