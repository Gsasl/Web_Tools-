# 🛠️ Client-Side Web Tools Collection

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Privacy-First](https://img.shields.io/badge/Privacy_First-100%25_Local-success?style=for-the-badge)

A suite of high-performance, purely client-side web utilities designed for daily productivity. Built with Vanilla JavaScript, these tools execute entirely within the user's browser, requiring **zero backend servers** and ensuring absolute data privacy.

### 🟢 [Try the Live Application Here](https://gsasl.github.io/Web_Tools-/)

---

## 🌟 Featured Tools

### 1. Universal Image Converter & Pro Editor
A desktop-grade image processing application built directly into the browser. 
* **Privacy-First Architecture:** Images never leave the local machine. Drawing to the HTML5 Canvas automatically sanitizes metadata, GPS coordinates, and camera EXIF data during conversion.
* **Batch Processing Engine:** Drag and drop dozens of images at once. The app processes them sequentially and dynamically generates a downloaded `.zip` archive using `JSZip`.
* **Apple HEIC Support:** Integrates polyfill decoding (`heic2any`) to allow native browser manipulation of proprietary iOS `.heic` and `.heif` photo formats.
* **Spatial Editing:** Integrated `Cropper.js` for precise ratio cropping and 90-degree rotations.
* **Native Canvas Effects:** Hardware-accelerated CSS-to-Canvas filter baking (Brightness, Contrast, Grayscale, Blur) and text watermarking without relying on heavy external image processing libraries.

### 2. NotebookLM YouTube Playlist Extractor
A fast, lightweight utility for AI researchers and students.
* **Instant Extraction:** Connects securely to the YouTube Data API V3 to pull every video link from a public playlist in seconds.
* **Clean Formatting:** Outputs plain-text URLs formatted specifically for bulk-pasting into Google's NotebookLM or other AI summarization tools.

---

## 🧠 Technical Architecture & Highlights

This project was built to demonstrate advanced frontend DOM manipulation, asynchronous JavaScript, and memory management without relying on heavy frontend frameworks (like React or Vue). 

Key engineering decisions include:
* **The Canvas Pipeline:** Using the native `canvas.getContext('2d')` API to permanently bake CSS filters and watermark text into raw pixel data before compression.
* **Blob & Object URLs:** Utilizing `canvas.toBlob()` and `URL.createObjectURL()` to handle file generation and downloads strictly in the browser's RAM, bypassing the need for a backend server or database.
* **Responsive UI/UX:** Implemented a modern 75/25 CSS Grid layout (similar to professional software like Lightroom) with smooth opacity transitions and disabled-state handling during heavy asynchronous processing loops.

---

## 🚀 Local Setup

Because this project is strictly client-side, there are no dependencies to install or servers to configure.

1. Clone the repository:
   ```bash
   git clone [https://github.com/Gsasl/Web_Tools-.git](https://github.com/Gsasl/Web_Tools-.git)
