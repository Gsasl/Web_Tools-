const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const uploadText = document.getElementById('uploadText');
const uploadIcon = document.getElementById('uploadIcon');
const workspace = document.getElementById('workspace');
const preview = document.getElementById('preview');
const detectedFormat = document.getElementById('detectedFormat');
const fileSize = document.getElementById('fileSize');
const outputFormat = document.getElementById('outputFormat');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const convertBtn = document.getElementById('convertBtn');
const btnText = document.getElementById('btnText');
const spinner = document.getElementById('spinner');

let currentFile = null;

// --- Drag and Drop Events ---
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
    if(dt.files.length) handleFile(dt.files[0]);
});

fileInput.addEventListener('change', function(e) {
    if(e.target.files.length) handleFile(e.target.files[0]);
});

// --- Main File Handler (Includes HEIC Decoder) ---
async function handleFile(file) {
    let fileToProcess = file;
    const fileName = file.name.toLowerCase();

    // Reset workspace to hidden if uploading a second file
    workspace.classList.add('hidden');

    // HEIC Intercept
    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
        uploadIcon.innerText = "⏳";
        uploadText.innerText = "Decoding HEIC format... please wait.";
        
        try {
            const jpegBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            const newName = file.name.replace(/\.[^/.]+$/, ".jpg");
            // Cast the decoded blob back into a standard File object
            fileToProcess = new File([jpegBlob], newName, { type: "image/jpeg" });
        } catch (error) {
            alert("Could not decode this HEIC file.");
            resetUploadArea();
            return;
        }
    } else if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file.');
        resetUploadArea();
        return;
    }

    currentFile = fileToProcess;
    
    // Update UI Elements
    uploadIcon.innerText = "✅";
    uploadText.innerText = fileToProcess.name;
    
    const formatStr = fileToProcess.type ? fileToProcess.type.split('/')[1].toUpperCase() : 'UNKNOWN';
    detectedFormat.innerText = formatStr;
    
    const sizeKB = (fileToProcess.size / 1024).toFixed(2);
    fileSize.innerText = `${sizeKB} KB`;

    preview.src = URL.createObjectURL(fileToProcess);
    
    // Smooth fade in
    setTimeout(() => {
        workspace.classList.remove('hidden');
        workspace.style.height = 'auto'; 
    }, 150);

    updateQualityUI();
}

function resetUploadArea() {
    uploadIcon.innerText = "📥";
    uploadText.innerText = "Drag & Drop or Click to Upload";
}

// --- Quality Slider Logic ---
outputFormat.addEventListener('change', updateQualityUI);
qualitySlider.addEventListener('input', updateQualityUI);

function updateQualityUI() {
    if(outputFormat.value === 'image/png') {
        qualitySlider.disabled = true;
        qualitySlider.style.opacity = '0.5';
        qualityValue.innerText = 'Lossless';
        qualityValue.style.background = '#e2e8f0';
    } else {
        qualitySlider.disabled = false;
        qualitySlider.style.opacity = '1';
        qualityValue.innerText = Math.round(qualitySlider.value * 100) + '%';
        qualityValue.style.background = '#dbeafe';
        qualityValue.style.color = '#1e40af';
    }
}

// --- Conversion Engine ---
convertBtn.addEventListener('click', function() {
    if (!currentFile) return;

    // Trigger Loading State
    convertBtn.disabled = true;
    btnText.innerText = 'Converting...';
    spinner.style.display = 'inline-block';

    // Allow UI to breathe before locking up the main thread
    setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = preview.naturalWidth;
        canvas.height = preview.naturalHeight;
        ctx.drawImage(preview, 0, 0);

        const mimeType = outputFormat.value;
        let newExtension = mimeType.split('/')[1];
        if (newExtension === 'jpeg') newExtension = 'jpg';
        
        const originalName = currentFile.name.split('.')[0];
        const newFileName = `${originalName}-converted.${newExtension}`;
        
        const quality = mimeType === 'image/png' ? 1 : parseFloat(qualitySlider.value);

        canvas.toBlob(function(blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = newFileName; 
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            // Revert Loading State
            convertBtn.disabled = false;
            btnText.innerText = 'Download Converted Image';
            spinner.style.display = 'none';

        }, mimeType, quality);
    }, 100); 
});
