// --- DOM Elements ---
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const uploadText = document.getElementById('uploadText');
const uploadIcon = document.getElementById('uploadIcon');
const workspace = document.getElementById('workspace');
const preview = document.getElementById('preview');
const detailsBox = document.getElementById('detailsBox');
const detectedFormat = document.getElementById('detectedFormat');
const fileSize = document.getElementById('fileSize');
const outputFormat = document.getElementById('outputFormat');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const convertBtn = document.getElementById('convertBtn');
const btnText = document.getElementById('btnText');
const spinner = document.getElementById('spinner');

// Cropper Elements
const cropControls = document.getElementById('cropControls');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const applyCropBtn = document.getElementById('applyCropBtn');
const mainControls = document.getElementById('mainControls');
const cropBtn = document.getElementById('cropBtn');

// Effects Elements
const brightSlider = document.getElementById('brightSlider');
const contrastSlider = document.getElementById('contrastSlider');
const graySlider = document.getElementById('graySlider');
const blurSlider = document.getElementById('blurSlider');
const brightVal = document.getElementById('brightVal');
const contrastVal = document.getElementById('contrastVal');
const grayVal = document.getElementById('grayVal');
const blurVal = document.getElementById('blurVal');
const resetEffectsBtn = document.getElementById('resetEffectsBtn');

// --- Global State ---
let currentFile = null;
let cropper = null; 
let originalPreviewSrc = null; 
let isCropping = false;

// --- Drag and Drop Logic ---
dropZone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
});
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-active'), false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-active'), false);
});

dropZone.addEventListener('drop', (e) => { if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', function(e) { if(e.target.files.length) handleFile(e.target.files[0]); });

// --- Ingestion Engine ---
async function handleFile(file) {
    if (isCropping) cancelCrop(); 
    cropper = null; 
    isCropping = false;
    resetEffects();

    let fileToProcess = file;
    const fileName = file.name.toLowerCase();
    workspace.classList.add('hidden');

    // Handle HEIC
    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
        uploadIcon.innerText = "⏳";
        uploadText.innerText = "Decoding HEIC format... please wait.";
        try {
            const jpegBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            const newName = file.name.replace(/\.[^/.]+$/, ".jpg");
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
    uploadIcon.innerText = "✅";
    uploadText.innerText = fileToProcess.name;
    
    updateFileInfoUI(fileToProcess);

    setTimeout(() => {
        workspace.classList.remove('hidden');
        workspace.style.height = 'auto'; 
    }, 150);

    convertBtn.disabled = false;
    cropBtn.disabled = false;
    updateQualityUI();
}

function resetUploadArea() {
    uploadIcon.innerText = "📥";
    uploadText.innerText = "Drag & Drop or Click to Upload";
}

function updateFileInfoUI(file) {
    const formatStr = file.type ? file.type.split('/')[1].toUpperCase() : 'UNKNOWN';
    detectedFormat.innerText = formatStr;
    const sizeKB = (file.size / 1024).toFixed(2);
    fileSize.innerText = `${sizeKB} KB`;
    preview.src = URL.createObjectURL(file);
    originalPreviewSrc = preview.src; 
}

// --- Effects Engine ---
const filters = [brightSlider, contrastSlider, graySlider, blurSlider];

filters.forEach(slider => { slider.addEventListener('input', applyEffects); });

function getFilterString() {
    return `brightness(${brightSlider.value}%) contrast(${contrastSlider.value}%) grayscale(${graySlider.value}%) blur(${blurSlider.value}px)`;
}

function applyEffects() {
    brightVal.innerText = `${brightSlider.value}%`;
    contrastVal.innerText = `${contrastSlider.value}%`;
    grayVal.innerText = `${graySlider.value}%`;
    blurVal.innerText = `${blurSlider.value}px`;
    preview.style.filter = getFilterString(); // Applies visually to preview
}

resetEffectsBtn.addEventListener('click', resetEffects);

function resetEffects() {
    brightSlider.value = 100;
    contrastSlider.value = 100;
    graySlider.value = 0;
    blurSlider.value = 0;
    applyEffects();
}

// --- Cropper Engine ---
cropBtn.addEventListener('click', startCrop);
cancelCropBtn.addEventListener('click', cancelCrop);
applyCropBtn.addEventListener('click', applyCrop);

function startCrop() {
    if (!currentFile || isCropping) return;
    isCropping = true;
    mainControls.classList.add('hidden');
    
    setTimeout(() => {
        cropControls.classList.remove('hidden');
        preview.style.filter = 'none'; // Temporarily remove filters so crop box is accurate
        cropper = new Cropper(preview, {
            viewMode: 1,
            autoCropArea: 0.8,
            responsive: true,
        });
    }, 150);
}

function cancelCrop() {
    if (!isCropping || !cropper) return;
    cropControls.classList.add('hidden');
    
    setTimeout(() => {
        mainControls.classList.remove('hidden');
        cropper.destroy(); 
        cropper = null;
        isCropping = false;
        preview.src = originalPreviewSrc;
        applyEffects(); // Re-apply visual filters
    }, 150);
}

function applyCrop() {
    if (!isCropping || !cropper) return;
    const croppedCanvas = cropper.getCroppedCanvas();
    cropControls.classList.add('hidden');
    
    setTimeout(() => {
        mainControls.classList.remove('hidden');
        cropper.destroy();
        cropper = null;
        isCropping = false;

        preview.src = croppedCanvas.toDataURL(); 
        applyEffects(); // Re-apply visual filters to new cropped image

        croppedCanvas.toBlob(function(blob) {
            const newName = currentFile.name.replace(/\.[^/.]+$/, "-cropped." + currentFile.name.split('.').pop());
            const croppedFile = new File([blob], newName, { type: currentFile.type });
            currentFile = croppedFile; 
            updateFileInfoUI(croppedFile); 
        }, currentFile.type); 
    }, 150);
}

// --- Output & Conversion Engine ---
outputFormat.addEventListener('change', updateQualityUI);
qualitySlider.addEventListener('input', updateQualityUI);

function updateQualityUI() {
    if(outputFormat.value === 'image/png') {
        qualitySlider.disabled = true;
        qualitySlider.style.opacity = '0.5';
        qualityValue.innerText = 'Lossless';
        qualityValue.style.background = '#e2e8f0'; 
        qualityValue.style.color = '#64748b'; 
    } else {
        qualitySlider.disabled = false;
        qualitySlider.style.opacity = '1';
        qualityValue.innerText = Math.round(qualitySlider.value * 100) + '%';
        qualityValue.style.background = '#dbeafe'; 
        qualityValue.style.color = '#1e40af'; 
    }
}

convertBtn.addEventListener('click', function() {
    if (!currentFile || isCropping) return;

    convertBtn.disabled = true;
    cropBtn.disabled = true;
    btnText.innerText = 'Converting...';
    spinner.style.display = 'inline-block';

    setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = preview.naturalWidth;
        canvas.height = preview.naturalHeight;
        
        // Bake the CSS filters into the canvas context before drawing
        ctx.filter = getFilterString(); 
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

            convertBtn.disabled = false;
            cropBtn.disabled = false;
            btnText.innerText = 'Download';
            spinner.style.display = 'none';

        }, mimeType, quality);
    }, 100); 
});
