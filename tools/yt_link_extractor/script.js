const API_KEY = 'AIzaSyC9JVi5uZkRBQjgCWPxnvoPC8IOZDmzOuk';

async function extractLinks() {
    const urlInput = document.getElementById('playlistUrl').value;
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    const extractBtn = document.getElementById('extractBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    const copyBtn = document.getElementById('copyBtn');
    
    // Reset UI
    output.value = '';
    status.innerText = '';
    status.style.color = '#2563eb';
    copyBtn.disabled = true;

    let playlistId = urlInput.trim();
    if (urlInput.includes('list=')) {
        const urlParams = new URLSearchParams(urlInput.split('?')[1]);
        playlistId = urlParams.get('list');
    }

    if (!playlistId) {
        status.style.color = '#ef4444'; // Red error text
        status.innerText = 'Error: Invalid URL or missing Playlist ID.';
        return;
    }

    // Trigger Loading State
    extractBtn.disabled = true;
    btnText.innerText = 'Extracting...';
    spinner.style.display = 'inline-block';

    let links = [];
    let nextPageToken = '';
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`;

    try {
        do {
            const fetchUrl = nextPageToken ? `${url}&pageToken=${nextPageToken}` : url;
            const response = await fetch(fetchUrl);
            const data = await response.json();

            if (data.error) {
                status.style.color = '#ef4444';
                status.innerText = `API Error: ${data.error.message}`;
                resetExtractBtn();
                return;
            }

            data.items.forEach(item => {
                const videoId = item.snippet.resourceId.videoId;
                links.push(`https://www.youtube.com/watch?v=${videoId}`);
            });

            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        output.value = links.join('\n');
        output.style.color = '#0f172a'; // Darken text so it looks active
        status.innerText = `✅ Successfully extracted ${links.length} links.`;
        copyBtn.disabled = false; // Enable the copy button
        
    } catch (error) {
        status.style.color = '#ef4444';
        status.innerText = `Error: ${error.message}`;
    }

    resetExtractBtn();
}

function resetExtractBtn() {
    const extractBtn = document.getElementById('extractBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    
    extractBtn.disabled = false;
    btnText.innerText = 'Extract';
    spinner.style.display = 'none';
}

function copyLinks() {
    const output = document.getElementById('output');
    if(!output.value) return;
    
    output.select();
    document.execCommand('copy');
    
    const copyBtn = document.getElementById('copyBtn');
    const originalText = copyBtn.innerText;
    
    copyBtn.innerText = '✅ Copied!';
    copyBtn.style.background = '#16a34a'; // Green success color
    
    setTimeout(() => {
        copyBtn.innerText = originalText;
        copyBtn.style.background = '#0f172a'; // Revert to dark
    }, 2000);
}
