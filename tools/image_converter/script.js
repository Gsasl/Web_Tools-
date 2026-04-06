// ==========================================
// 1. DOM ELEMENTS & GLOBAL STATE
// ==========================================
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const uploadText = document.getElementById('uploadText');
const uploadIcon = document.getElementById('uploadIcon');
const workspace = document.getElementById('workspace');
const preview = document.getElementById('preview');

const detectedFormat = document.getElementById('detectedFormat');
const fileCount = document.getElementById('fileCount'); 

const cropControls = document.getElementById('cropControls');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const applyCropBtn = document.getElementById('applyCropBtn');
const rotateBtn = document.getElementById('rotateBtn');
const mainControls = document.getElementById('mainControls');
const cropBtn = document.getElementById('cropBtn');

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

const watermarkText = document.getElementById('watermarkText');
const watermarkColor = document.getElementById('watermarkColor');

const outputFormat = document.getElementById('outputFormat');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const convertBtn = document.getElementById('convertBtn');
const btnText = document.getElementById('btnText');
const spinner = document.getElementById('spinner');

let currentFiles = []; 
let cropper = null; 
let originalPreviewSrc = null; 
let isCropping = false;

// ==========================================
// 2. STUB FEATURES
// ==========================================
if(aiBgBtn) {
    aiBgBtn.addEventListener('click', () => {
        alert("AI Background Removal requires loading a local WebAssembly ML model. This feature is in development for V2!");
    });
}

// ==========================================
// 3. UPLOAD LOGIC
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
    try {
        if (isCropping) cancelCrop(); 
        cropper = null; 
        isCropping = false;
        resetEffects();
        currentFiles = []; 

        if(uploadIcon) uploadIcon.innerText = "⏳";
        if(uploadText) uploadText.innerText = `Processing ${files.length} file(s)...`;

        for (let i = 0; i < files.length; i++) {
            let fileToProcess = files[i];
            const fileName = fileToProcess.name.toLowerCase();

            // 1. Check for HEIC
            if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
                try {
                    const jpegBlob = await heic2any({ blob: fileToProcess, toType: "image/jpeg", quality: 0.9 });
                    const newName = fileToProcess.name.replace(/\.[^/.]+$/, ".jpg");
                    fileToProcess = new File([jpegBlob], newName, { type: "image/jpeg" });
                    currentFiles.push(fileToProcess);
                } catch (error) {
                    console.error("Could not decode HEIC:", fileName);
                }
            } 
            // 2. ONLY accept standard images, skip everything else
            else if (fileToProcess.type && fileToProcess.type.startsWith('image/')) {
                currentFiles.push(fileToProcess);
            } else {
                console.warn("Skipped invalid or unreadable file:", fileName);
            }
        }

        if (currentFiles.length === 0) {
            alert("No valid images were found in your upload.");
            if(uploadIcon) uploadIcon.innerText = "📥";
            if(uploadText) uploadText.innerText = "Drag & Drop images here (Supports Batch Upload)";
            return;
        }

        // Processing complete - reveal workspace
        if(dropZone) dropZone.style.display = 'none';
        if(workspace) workspace.classList.remove('hidden');

        // Safely update UI
        if(fileCount) fileCount.innerText = currentFiles.length;
        
        // BULLETPROOF Format Text generator
        if(detectedFormat) {
            let formatStr = 'UNKNOWN';
            // Only attempt to split if it actually has a format string with a slash
            if (currentFiles[0].type && currentFiles[0].type.includes('/')) {
                formatStr = currentFiles[0].type.split('/')[1].toUpperCase();
            }
            detectedFormat.innerText = currentFiles.length > 1 ? `Batch (${formatStr})` : formatStr;
        }

        if(preview) {
            preview.src = URL.createObjectURL(currentFiles[0]);
            originalPreviewSrc = preview.src; 
        }
        
        if(convertBtn) convertBtn.disabled = false;
        
        if(cropBtn) {
            cropBtn.disabled = currentFiles.length > 1; 
            cropBtn.innerText = currentFiles.length > 1 ? "Crop (Disabled in Batch)" : "◩ Crop & Rotate";
        }

        updateQualityUI();
    } catch (err) {
        console.error("Upload Error:", err);
        alert("An error occurred during upload. Check console for details.");
    }
}
// ==========================================
// 4. EFFECTS ENGINE
// ==========================================
const filters = [brightSlider, contrastSlider, graySlider, blurSlider];
filters.forEach(slider => { 
    if(slider) slider.addEventListener('input', applyEffects); 
});

function getFilterString() {
    // Bulletproof fallbacks in case HTML is ever missing the sliders
    const b = brightSlider ? brightSlider.value : 100;
    const c = contrastSlider ? contrastSlider.value : 100;
    const g = graySlider ? graySlider.value : 0;
    const bl = blurSlider ? blurSlider.value : 0;
    return `brightness(${b}%) contrast(${c}%) grayscale(${g}%) blur(${bl}px)`;
}

function applyEffects() {
    if(brightVal) brightVal.innerText = `${brightSlider.value}%`;
    if(contrastVal) contrastVal.innerText = `${contrastSlider.value}%`;
    if(grayVal) grayVal.innerText = `${graySlider.value}%`;
    if(blurVal) blurVal.innerText = `${blurSlider.value}px`;
    preview.style.filter = getFilterString(); 
}

if(resetEffectsBtn) {
    resetEffectsBtn.addEventListener('click', resetEffects);
}
function resetEffects() {
    if(brightSlider) brightSlider.value = 100; 
    if(contrastSlider) contrastSlider.value = 100;
    if(graySlider) graySlider.value = 0; 
    if(blurSlider) blurSlider.value = 0;
    applyEffects();
}

// ==========================================
// 5. CROP & ROTATE
// ==========================================
if(cropBtn) cropBtn.addEventListener('click', startCrop);
if(cancelCropBtn) cancelCropBtn.addEventListener('click', cancelCrop);
if(applyCropBtn) applyCropBtn.addEventListener('click', applyCrop);
if(rotateBtn) rotateBtn.addEventListener('click', () => { if (cropper) cropper.rotate(90); });

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
            originalPreviewSrc = URL.createObjectURL(croppedFile);
        }, currentFiles[0].type); 
    }, 150);
}

// ==========================================
// 6. OUTPUT & ZIP ENGINE
// ==========================================
if(outputFormat) outputFormat.addEventListener('change', updateQualityUI);
if(qualitySlider) qualitySlider.addEventListener('input', updateQualityUI);

function updateQualityUI() {
    if(!outputFormat || !qualitySlider) return;
    if(outputFormat.value === 'image/png') {
        qualitySlider.disabled = true; qualitySlider.style.opacity = '0.5';
        qualityValue.innerText = 'Lossless'; qualityValue.style.background = '#e2e8f0'; 
    } else {
        qualitySlider.disabled = false; qualitySlider.style.opacity = '1';
        qualityValue.innerText = Math.round(qualitySlider.value * 100) + '%';
        qualityValue.style.background = '#dbeafe'; 
    }
}

function processToBlob(file, mimeType, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            ctx.filter = getFilterString(); 
            ctx.drawImage(img, 0, 0);

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

async function processAndDownloadSingle(file, mimeType, extension, quality) {
    const blob = await processToBlob(file, mimeType, quality);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${file.name.split('.')[0]}-edited.${extension}`; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

if(convertBtn) {
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
}
