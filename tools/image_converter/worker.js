// worker.js - Runs the Machine Learning Model on a separate background thread
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
let segmenter = null;

self.onmessage = async (event) => {
    const { imageBase64 } = event.data;

    try {
        if (!segmenter) {
            self.postMessage({ status: 'loading', message: 'Downloading AI Model (~40MB)... This only happens once.' });
            // FIXED: Using the Web-Optimized ONNX port instead of the Python model
            segmenter = await pipeline('image-segmentation', 'Xenova/bria-rmbg-1.4');
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
