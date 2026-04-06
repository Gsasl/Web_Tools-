const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const uploadText = document.getElementById('uploadText');
const preview = document.getElementById('preview');
const detailsBox = document.getElementById('detailsBox');
const detectedFormat = document.getElementById('detectedFormat');
const fileSize = document.getElementById('fileSize');
const controlsGroup = document.getElementById('controlsGroup');
const outputFormat = document.getElementById('outputFormat');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const convertBtn = document.getElementById('convertBtn');
const btnText = document.getElementById('btnText');
const spinner = document.getElementById('spinner');

let currentFile = null;

// --- Drag and Drop Logic ---
dropZone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-active'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-active'), false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if(files.length) handleFile(files[0]);
});

fileInput.addEventListener('change', function(e) {
    if(e.target.files.length) handleFile(e.target.files[0]);
});

// --- File Handling & UI Updates ---
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }

    currentFile = file;
    
    uploadText.innerText = `✅ ${file.name}`;
    detailsBox.style.display = 'block';
    controlsGroup.style.display = 'block';
    
    const formatStr = file.type.split('/')[1].toUpperCase();
    detectedFormat.innerText = formatStr;
    
    const sizeKB = (file.size / 1024).toFixed(2);
    fileSize.innerText = `${sizeKB} KB`;

    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';

    convertBtn.disabled = false;
    updateQualityUI();
}

// --- Quality Slider Logic ---
outputFormat.addEventListener('change', updateQualityUI);
qualitySlider.addEventListener('input', updateQualityUI);

function updateQualityUI() {
    if(outputFormat.value === 'image/png') {
        qualitySlider.disabled = true;
        qualityValue.innerText = 'N/A (Lossless)';
    } else {
        qualitySlider.disabled = false;
        qualityValue.innerText = Math.round(qualitySlider.value * 100) + '%';
    }
}

// --- Conversion & Download Logic ---
convertBtn.addEventListener('click', function() {
    if (!currentFile) return;

    // Show loading state
    convertBtn.disabled = true;
    btnText.innerText = 'Converting...';
    spinner.style.display = 'inline-block';

    // A small delay allows the browser to render the spinner before heavy processing
    setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = preview.naturalWidth;
        canvas.height = preview.naturalHeight;
        ctx.drawImage(preview, 0, 0);

        const mimeType = outputFormat.value;
        const newExtension = mimeType.split('/')[1];
        const originalName = currentFile.name.split('.')[0];
        const newFileName = `${originalName}-converted.${newExtension}`;
        
        // Use slider value if not PNG, otherwise ignore
        const quality = mimeType === 'image/png' ? 1 : parseFloat(qualitySlider.value);

        canvas.toBlob(function(blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = newFileName; 
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            // Reset button state
            convertBtn.disabled = false;
            btnText.innerText = 'Download Converted Image';
            spinner.style.display = 'none';

        }, mimeType, quality);
    }, 50); 
});
