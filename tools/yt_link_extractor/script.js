const API_KEY = 'AIzaSyC9JVi5uZkRBQjgCWPxnvoPC8IOZDmzOuk';

let extractedVideos = []; // Global array to hold rich data

async function extractLinks() {
    const urlInput = document.getElementById('playlistUrl').value;
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    const extractBtn = document.getElementById('extractBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    const copyBtn = document.getElementById('copyBtn');
    
    const detailsToggle = document.getElementById('extractDetailsToggle').checked;
    const pdfToggle = document.getElementById('downloadPdfToggle').checked;
    
    // Reset UI
    output.value = '';
    document.getElementById('tableBody').innerHTML = '';
    status.innerText = '';
    status.style.color = '#2563eb';
    copyBtn.disabled = true;
    extractedVideos = [];

    let playlistId = urlInput.trim();
    if (urlInput.includes('list=')) {
        const urlParams = new URLSearchParams(urlInput.split('?')[1]);
        playlistId = urlParams.get('list');
    }

    if (!playlistId) {
        status.style.color = '#ef4444';
        status.innerText = 'Error: Invalid URL or missing Playlist ID.';
        return;
    }

    // Trigger Loading State
    extractBtn.disabled = true;
    btnText.innerText = 'Extracting...';
    spinner.style.display = 'inline-block';

    try {
        await fetchAllPlaylistItems(playlistId, status);
        
        // If rich details or PDF is requested, we need to fetch video durations
        if (detailsToggle || pdfToggle) {
            btnText.innerText = 'Fetching Lengths...';
            await fetchVideoDurations();
        }

        renderUI(detailsToggle);

        status.innerText = `✅ Successfully extracted ${extractedVideos.length} videos.`;
        copyBtn.disabled = false;
        
        if (pdfToggle) {
            generatePDF();
        }
        
    } catch (error) {
        status.style.color = '#ef4444';
        status.innerText = `Error: ${error.message}`;
    }

    resetExtractBtn();
}

async function fetchAllPlaylistItems(playlistId, statusEl) {
    let nextPageToken = '';
    let baseUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`;

    do {
        const fetchUrl = nextPageToken ? `${baseUrl}&pageToken=${nextPageToken}` : baseUrl;
        const response = await fetch(fetchUrl);
        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        data.items.forEach(item => {
            // Filter out private or deleted videos
            if (item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video') {
                extractedVideos.push({
                    id: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    link: `https://youtu.be/${item.snippet.resourceId.videoId}`,
                    length: "N/A" 
                });
            }
        });

        nextPageToken = data.nextPageToken;
    } while (nextPageToken);
}

async function fetchVideoDurations() {
    // API only accepts 50 IDs per request, chunk the array
    for (let i = 0; i < extractedVideos.length; i += 50) {
        const chunk = extractedVideos.slice(i, i + 50);
        const ids = chunk.map(v => v.id).join(',');
        
        const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        data.items.forEach(videoData => {
            const targetVideo = extractedVideos.find(v => v.id === videoData.id);
            if (targetVideo) {
                targetVideo.length = parseISO8601Duration(videoData.contentDetails.duration);
            }
        });
    }
}

function parseISO8601Duration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    
    let result = '';
    if (hours > 0) result += hours + ':';
    result += (minutes < 10 && hours > 0 ? '0' : '') + minutes + ':';
    result += (seconds < 10 ? '0' : '') + seconds;
    return result;
}

function renderUI(showDetails) {
    const rawOutputWrapper = document.getElementById('rawOutputWrapper');
    const tableContainer = document.getElementById('tableContainer');
    const output = document.getElementById('output');
    const tableBody = document.getElementById('tableBody');

    if (showDetails) {
        rawOutputWrapper.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        
        extractedVideos.forEach((video, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${video.title}</td>
                <td>${video.length}</td>
                <td><a href="${video.link}" target="_blank">Link</a></td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableContainer.classList.add('hidden');
        rawOutputWrapper.classList.remove('hidden');
        
        output.value = extractedVideos.map(v => v.link).join('\n');
        output.style.color = '#0f172a'; 
    }
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("YouTube Playlist Details", 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total Videos: ${extractedVideos.length} | Generated by NotebookLM Extractor`, 14, 22);

    const tableData = extractedVideos.map((video, index) => [
        index + 1, 
        video.title, 
        video.length, 
        video.link
    ]);

    doc.autoTable({
        startY: 28,
        head: [['#', 'Title', 'Length', 'Link']],
        body: tableData,
        headStyles: { fillColor: [37, 99, 235] }, 
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20 },
            3: { cellWidth: 50, textColor: [37, 99, 235] }
        },
    });

    doc.save('Playlist_Extraction.pdf');
}

function copyLinks() {
    const detailsToggle = document.getElementById('extractDetailsToggle').checked;
    let textToCopy = '';
    
    if (detailsToggle) {
        textToCopy = "No.\tTitle\tLength\tLink\n";
        extractedVideos.forEach((v, i) => {
            textToCopy += `${i + 1}\t${v.title}\t${v.length}\t${v.link}\n`;
        });
    } else {
        textToCopy = document.getElementById('output').value;
    }

    if(!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        const originalText = copyBtn.innerText;
        copyBtn.innerText = '✅ Copied!';
        copyBtn.style.background = '#16a34a'; 
        
        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style.background = '#0f172a'; 
        }, 2000);
    });
}

function resetExtractBtn() {
    const extractBtn = document.getElementById('extractBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    
    extractBtn.disabled = false;
    btnText.innerText = 'Extract';
    spinner.style.display = 'none';
}
