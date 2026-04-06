// worker.js - Runs the Machine Learning Model on a separate background thread
// FIXED: Upgraded to V3 (@huggingface/transformers) to natively support RMBG-1.4
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

env.allowLocalModels = false;
let segmenter = null;

self.onmessage = async (event) => {
    const { imageBase64 } = event.data;

    try {
        if (!segmenter) {
            self.postMessage({ status: 'loading', message: 'Downloading AI Model (~40MB)... This only happens once.' });
            // Using the official, correct model name
            segmenter = await pipeline('image-segmentation', 'briaai/RMBG-1.4');
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
