# 📚 NotebookLM YouTube Playlist Extractor

A robust, 100% client-side web utility designed for AI researchers, students, and content curators. This tool connects directly to the YouTube Data API to instantly extract raw URLs, video metadata, and lengths from any public YouTube playlist.

## ✨ Features

* **Instant Raw Extraction:** Pulls hundreds of video URLs in seconds, formatting them perfectly for bulk-pasting into Google's NotebookLM or other AI summarization tools.
* **Rich Details Mode:** Toggles a clean, tabular view showing the Video Number, Full Title, Length (HH:MM:SS), and URL.
* **PDF Export:** Uses `jsPDF` and `jspdf-autotable` to dynamically generate and download a beautifully formatted PDF document of the playlist table.
* **Smart Copy:** The "Copy All Links" button intelligently adapts; copying a raw URL list by default, or tab-separated values (ideal for Excel/Google Sheets) if the Rich Details table is active.
* **100% Client-Side:** No backend servers. All API calls, ISO8601 duration parsing, and PDF rendering happen directly within your browser memory.

## 🧠 Technical Highlights

* **Pagination Handling:** Automatically loops through `nextPageToken` flags to handle massive playlists extending beyond YouTube's 50-item API limit.
* **Batch Endpoint Polling:** Standard YouTube `playlistItems` endpoints do not return video duration. This script handles chunking the extracted IDs into arrays of 50 and pinging the secondary `videos` endpoint to cross-reference and append video lengths.
* **Data Sanitization:** Automatically filters out "Deleted" and "Private" videos from the final output array to prevent null references.

## 🚀 How to Use

1. Paste any valid YouTube Playlist URL into the input field.
2. Select your desired toggles (`Extract Rich Details` / `Download PDF`).
3. Click **Extract**. 
4. The tool will poll the API, render the UI, and automatically trigger a PDF download if requested.

---
*Built with Vanilla JS, HTML5, CSS3, jsPDF, and the YouTube Data API v3.*
