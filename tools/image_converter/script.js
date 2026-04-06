// ==========================================
// 1. DOM ELEMENTS & GLOBAL STATE
// ==========================================
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const uploadText = document.getElementById('uploadText');
const uploadIcon = document.getElementById('uploadIcon');
const workspace = document.getElementById('workspace');
const preview = document.getElementById('preview');

// Sidebar Details
const detailsBox = document.getElementById('detailsBox');
const detectedFormat = document.getElementById('detectedFormat');
const fileCount = document.getElementById('fileCount'); 

// Cropper & Tools
const cropControls = document.getElementById('cropControls');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const applyCropBtn = document.getElementById('applyCropBtn');
const rotateBtn = document.getElementById('rotateBtn');
const mainControls = document.getElementById('mainControls');
const cropBtn = document.getElementById('cropBtn');

// Pro Features & Effects
const stripExif = document.getElementById('stripExif');
const aiBgBtn = document.getElementById('aiBgBtn');
const brightSlider = document.getElementById('brightSlider');
const contrastSlider = document.getElementById('contrastSlider');
const graySlider = document.getElementById('graySlider');
const blurSlider = document.getElementById('blurSlider');
const brightVal = document.getElementById('brightVal');
const contrastVal = document.getElementById('contrastVal');
const grayVal = document.getElementById('grayVal');
const blurVal = document.getElementById('blurVal');
const resetEffectsBtn = document.getElementById('resetEffectsBtn');

// Watermark
const watermarkText = document.getElementById('watermarkText');
const watermarkColor = document.getElementById('watermarkColor');

// Output Controls
const outputFormat = document.getElementById('outputFormat');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const convertBtn = document.getElementById('convertBtn');
const btnText = document.getElementById('btnText');
const spinner = document.getElementById('spinner');

// Global State Variables
let currentFiles = []; 
let cropper = null; 
let originalPreviewSrc = null; 
let isCropping = false;


// ==========================================
// 2. STUB FEATURES
// ==========================================
aiBgBtn.addEventListener('click', () => {
    alert("AI Background Removal requires loading a local WebAssembly ML model. This feature is in development for V2!");
});


// ==========================================
// 3. UPLOAD & INGESTION LOGIC
// ==========================================
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

dropZone.addEventListener('drop', (e) => { 
    if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); 
});
fileInput.addEventListener('change', function(e) { 
    if(e.target.files.length) handleFiles(e.target.files); 
});

async function handleFiles(files) {
    if (isCropping) cancelCrop(); 
    cropper = null; 
    isCropping = false;
    resetEffects();
    currentFiles = []; 

    uploadIcon.innerText = "⏳";
    uploadText.innerText = `Processing ${files.length} file(s)...`;

    for (let i = 0; i < files.length; i++) {
        let fileToProcess = files[i];
        const fileName = fileToProcess.name.toLowerCase();

        if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
            try {
                const jpegBlob = await heic2any({ blob: fileToProcess, toType: "image/jpeg", quality: 0.9 });
                const newName = fileToProcess.name.replace(/\.[^/.]+$/, ".jpg");
                fileToProcess = new File([jpegBlob], newName, { type: "image/jpeg" });
            } catch (error) {
                console.error("Could not decode HEIC:", fileName);
                continue; 
            }
        }
        currentFiles.push(fileToProcess);
    }

    if (currentFiles.length === 0) {
        alert("No valid images processed.");
        uploadIcon.innerText = "📥";
        uploadText.innerText = "Drag & Drop images here (Supports Batch Upload)";
        return;
    }

    // Processing complete - reveal workspace
    dropZone.style.display = 'none';
    workspace.classList.remove('hidden');

    // UI Updates
    fileCount.innerText = currentFiles.length;
    const formatStr = currentFiles[0].type ? currentFiles[0].type.split('/')[1].toUpperCase() : 'UNKNOWN';
    detectedFormat.innerText = currentFiles.length > 1 ? `Batch (${formatStr})` : formatStr;

    // Show preview of the FIRST image in the batch
    preview.src = URL.createObjectURL(currentFiles[0]);
    originalPreviewSrc = preview.src; 
    
    convertBtn.disabled = false;
    
    // Disable crop if batch processing
    cropBtn.disabled = currentFiles.length > 1; 
    cropBtn.innerText = currentFiles.length > 1 ? "Crop (Disabled in Batch)" : "◩ Crop & Rotate";

    updateQualityUI();
}


// ==========================================
// 4. VISUAL EFFECTS ENGINE
// ==========================================
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
    preview.style.filter = getFilterString(); 
}

resetEffectsBtn.addEventListener('click', resetEffects);
function resetEffects() {
    brightSlider.value = 100; contrastSlider.value = 100;
    graySlider.value = 0; blurSlider.value = 0;
    applyEffects();
}


// ==========================================
// 5. CROPPER & ROTATE ENGINE
// ==========================================
cropBtn.addEventListener('click', startCrop);
cancelCropBtn.addEventListener('click', cancelCrop);
applyCropBtn.addEventListener('click', applyCrop);
rotateBtn.addEventListener('click', () => { if (cropper) cropper.rotate(90); });

function startCrop() {
    if (currentFiles.length !== 1 || isCropping) return;
    isCropping = true;
    mainControls.classList.add('hidden'); 
    
    setTimeout(() => {
        cropControls.classList.remove('hidden'); 
        preview.style.filter = 'none'; 
        cropper = new Cropper(preview, {
            viewMode: 1, autoCropArea: 0.8, responsive: true,
        });
    }, 150);
}

function cancelCrop() {
    if (!isCropping || !cropper) return;
    cropControls.classList.add('hidden');
    setTimeout(() => {
        mainControls.classList.remove('hidden');
        cropper.destroy(); 
        cropper = null; isCropping = false;
        preview.src = originalPreviewSrc;
        applyEffects(); 
    }, 150);
}

function applyCrop() {
    if (!isCropping || !cropper) return;
    const croppedCanvas = cropper.getCroppedCanvas();
    cropControls.classList.add('hidden');
    
    setTimeout(() => {
        mainControls.classList.remove('hidden');
        cropper.destroy(); cropper = null; isCropping = false;
        preview.src = croppedCanvas.toDataURL(); 
        applyEffects(); 
        croppedCanvas.toBlob(function(blob) {
            const newName = currentFiles[0].name.replace(/\.[^/.]+$/, "-edited." + currentFiles[0].name.split('.').pop());
            const croppedFile = new File([blob], newName, { type: currentFiles[0].type });
            currentFiles[0] = croppedFile; 
            // Update preview source so effects bake correctly later
            originalPreviewSrc = URL.createObjectURL(croppedFile);
        }, currentFiles[0].type); 
    }, 150);
}


// ==========================================
// 6. OUTPUT & BATCH ZIP ENGINE
// ==========================================
outputFormat.addEventListener('change', updateQualityUI);
qualitySlider.addEventListener('input', updateQualityUI);

function updateQualityUI() {
    if(outputFormat.value === 'image/png') {
        qualitySlider.disabled = true; qualitySlider.style.opacity = '0.5';
        qualityValue.innerText = 'Lossless'; qualityValue.style.background = '#e2e8f0'; 
    } else {
        qualitySlider.disabled = false; qualitySlider.style.opacity = '1';
        qualityValue.innerText = Math.round(qualitySlider.value * 100) + '%';
        qualityValue.style.background = '#dbeafe'; 
    }
}

// Master Processing Function (Canvas Filter & Watermark baking)
function processToBlob(file, mimeType, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            // Apply visual filters
            ctx.filter = getFilterString(); 
            ctx.drawImage(img, 0, 0);

            // Apply Text Watermark if filled out
            if (watermarkText && watermarkText.value.trim() !== '') {
                const text = watermarkText.value;
                const fontSize = Math.max(20, canvas.width * 0.05); 
                
                ctx.filter = 'none'; 
                ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
                ctx.fillStyle = watermarkColor ? watermarkColor.value : '#ffffff';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.fillText(text, canvas.width - (canvas.width * 0.03), canvas.height - (canvas.height * 0.03));
            }
            
            canvas.toBlob((blob) => { resolve(blob); }, mimeType, quality);
        };
        img.src = URL.createObjectURL(file);
    });
}

// Single File Download Helper
async function processAndDownloadSingle(file, mimeType, extension, quality) {
    const blob = await processToBlob(file, mimeType, quality);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${file.name.split('.')[0]}-edited.${extension}`; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Main Download Button Listener
convertBtn.addEventListener('click', async function() {
    if (currentFiles.length === 0 || isCropping) return;

    convertBtn.disabled = true;
    btnText.innerText = currentFiles.length > 1 ? 'Zipping Files...' : 'Processing...';
    spinner.style.display = 'inline-block';

    const mimeType = outputFormat.value;
    let newExtension = mimeType.split('/')[1];
    if (newExtension === 'jpeg') newExtension = 'jpg';
    const quality = mimeType === 'image/png' ? 1 : parseFloat(qualitySlider.value);

    try {
        if (currentFiles.length === 1) {
            await processAndDownloadSingle(currentFiles[0], mimeType, newExtension, quality);
        } else {
            const zip = new JSZip();
            for (let i = 0; i < currentFiles.length; i++) {
                const blob = await processToBlob(currentFiles[i], mimeType, quality);
                const originalName = currentFiles[i].name.split('.')[0];
                zip.file(`${originalName}-edited.${newExtension}`, blob);
            }
            
            const zipContent = await zip.generateAsync({type:"blob"});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipContent);
            link.download = "Batch_Images_Converted.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error("Error during export:", error);
        alert("An error occurred during export. Please check the console.");
    } finally {
        convertBtn.disabled = false;
        btnText.innerText = 'Download Image(s)';
        spinner.style.display = 'none';
    }
});
