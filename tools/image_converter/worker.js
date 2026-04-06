// worker.js - Runs on a separate background thread

// Import Transformers.js via CDN
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.16.1';

// Disable local models since we are hosted on GitHub Pages
env.allowLocalModels = false;

let segmenter = null;

self.onmessage = async (event) => {
    const { imageBase64 } = event.data;

    try {
        // 1. Load the Model (Only happens the first time, then the browser caches it)
        if (!segmenter) {
            self.postMessage({ status: 'loading', message: 'Downloading AI Model (~40MB)... This only happens once.' });
            segmenter = await pipeline('image-segmentation', 'briaai/RMBG-1.4');
        }

        self.postMessage({ status: 'processing', message: 'AI is isolating the subject...' });

        // 2. Run the image through the Neural Network
        const result = await segmenter(imageBase64);
        
        // 3. Extract the raw pixel data of the Mask
        const mask = result[0].mask;

        // Send the raw pixel array back to the main UI thread
        self.postMessage({ 
            status: 'done', 
            width: mask.width, 
            height: mask.height, 
            data: mask.data // Uint8ClampedArray of pixels
        });

    } catch (error) {
        self.postMessage({ status: 'error', error: error.message });
    }
};
