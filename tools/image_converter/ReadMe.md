# 🛠️ Universal Image Converter & Pro Editor

A high-performance, client-side web application designed for secure image conversion, batch processing, and professional editing. Built entirely with Vanilla HTML, CSS, and JavaScript, this tool requires **zero backend servers**, ensuring absolute data privacy.

## ✨ Key Features

* **100% Client-Side Processing:** Images never leave your local machine. No servers, no databases, no data harvesting.
* **Privacy-First Architecture:** Automatically strips EXIF data, GPS coordinates, and camera metadata during the conversion process to protect user privacy.
* **HEIC / Apple Format Support:** Integrates polyfill decoding to allow native browser manipulation of proprietary iOS `.heic` and `.heif` photo formats.
* **Batch Processing:** Drag and drop dozens of images at once. The app processes them sequentially and dynamically generates a downloaded `.zip` archive.
* **Spatial Editing:** Integrated `Cropper.js` for precise ratio cropping and 90-degree rotations.
* **Native Canvas Effects:** Hardware-accelerated CSS-to-Canvas filter baking (Brightness, Contrast, Grayscale, Blur) without relying on heavy external image processing libraries.

## 🚀 Live Demo
*(Insert your GitHub Pages link here)*

## 🧠 Technical Architecture

This application utilizes a pipeline architecture to process images efficiently:
1.  **Ingestion:** Files are captured via HTML5 Drag & Drop API. HEIC files are intercepted and transcoded to standard Blobs via `heic2any`.
2.  **Manipulation:** The `Cropper.js` library handles coordinate math for spatial edits, while native CSS filters provide real-time visual feedback for color grading.
3.  **Encoding:** The final image is drawn to an invisible HTML5 `<canvas>`, permanently baking in spatial edits and visual filters. Native `canvas.toBlob()` compresses the raw pixel data into the user's chosen format (WebP, PNG, JPEG).
4.  **Distribution:** For batch operations, `JSZip` is utilized to asynchronously pack the blobs into an archive for a single click download.

## 💻 Tech Stack
* **Frontend:** Vanilla HTML5, CSS3 (CSS Grid UI), JavaScript (ES6+)
* **Decoding:** `heic2any` (Client-side HEIC polyfill)
* **Editing:** `Cropper.js`
* **Compression:** `JSZip` (Batch archiving)

## 🔮 Roadmap (V2)
* **Web Worker AI Background Removal:** Implementing `@img/rmbg` via `Transformers.js` to run Machine Learning segmentation models entirely on the edge, offloading the heavy WASM calculations to a background worker thread to maintain UI performance.
