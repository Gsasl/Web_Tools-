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

// Tools & Overlays
const cropControls = document.getElementById('cropControls');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const applyCropBtn = document.getElementById('applyCropBtn');
const rotateBtn = document.getElementById('rotateBtn'); // New Rotate
const mainControls = document.getElementById('mainControls');
const cropBtn = document.getElementById('cropBtn');
const watermarkText = document.getElementById('watermarkText'); // New Text
const watermarkColor = document.getElementById('watermarkColor'); // New Color

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

let currentFile = null;
let cropper = null; 
let originalPreviewSrc = null; 
let isCropping = false;

// --- Upload Logic ---
dropZone.addEventListener('click', () => fileInput.click());
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }));
['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.add('drag-active')));
['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.remove('drag-active')));
dropZone.addEventListener('drop', (e) => { if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', function(e) { if(e.target.files.length) handleFile(e.target.files[0]); });

async function handleFile(file) {
    if (isCropping) cancelCrop(); 
    cropper = null; 
    isCropping = false;
    resetEffects();

    let fileToProcess = file;
    const fileName = file.name.toLowerCase();
    
    // Hide upload area, show workspace
    dropZone.style.display = 'none';

    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
        try {
            const jpegBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            const newName = file.name.replace(/\.[^/.]+$/, ".jpg");
            fileToProcess = new File([jpegBlob], newName, { type: "image/jpeg" });
        } catch (error) {
            alert("Could not decode HEIC.");
            dropZone.style.display = 'block';
            return;
        }
    }

    currentFile = fileToProcess;
    updateFileInfoUI(fileToProcess);
    workspace.classList.remove('hidden');
    
    convertBtn.disabled = false;
    cropBtn.disabled = false;
    updateQualityUI();
}

function updateFileInfoUI(file) {
    const formatStr = file.type ? file.type.split('/')[1].toUpperCase() : 'UNKNOWN';
    detectedFormat.innerText = formatStr;
    fileSize.innerText = `${(file.size / 1024).toFixed(2)} KB`;
    preview.src = URL.createObjectURL(file);
    originalPreviewSrc = preview.src; 
}

// --- Effects Logic ---
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

// --- Cropper & Rotate Logic ---
cropBtn.addEventListener('click', startCrop);
cancelCropBtn.addEventListener('click', cancelCrop);
applyCropBtn.addEventListener('click', applyCrop);

// NEW: Rotate functionality
rotateBtn.addEventListener('click', () => {
    if (cropper) cropper.rotate(90);
});

function startCrop() {
    if (!currentFile || isCropping) return;
    isCropping = true;
    mainControls.classList.add('hidden'); // Hide sidebar
    
    setTimeout(() => {
        cropControls.classList.remove('hidden'); // Show crop tools
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
            const newName = currentFile.name.replace(/\.[^/.]+$/, "-edited." + currentFile.name.split('.').pop());
            const croppedFile = new File([blob], newName, { type: currentFile.type });
            currentFile = croppedFile; 
            updateFileInfoUI(croppedFile); 
        }, currentFile.type); 
    }, 150);
}

// --- Final Export & Watermark Engine ---
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

convertBtn.addEventListener('click', function() {
    if (!currentFile || isCropping) return;

    convertBtn.disabled = true;
    btnText.innerText = 'Processing...';
    spinner.style.display = 'inline-block';

    setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = preview.naturalWidth;
        canvas.height = preview.naturalHeight;
        
        ctx.filter = getFilterString(); 
        ctx.drawImage(preview, 0, 0);

        // NEW: Draw Text Watermark if user typed something
        if (watermarkText.value.trim() !== '') {
            const text = watermarkText.value;
            // Make font size 5% of the image width so it scales automatically
            const fontSize = Math.max(20, canvas.width * 0.05); 
            
            ctx.filter = 'none'; // Ensure text isn't affected by blur/filters
            ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
            ctx.fillStyle = watermarkColor.value;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            
            // Add a soft drop-shadow so white text is visible on white backgrounds
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Draw text in bottom right corner with padding
            ctx.fillText(text, canvas.width - (canvas.width * 0.03), canvas.height - (canvas.height * 0.03));
        }

        const mimeType = outputFormat.value;
        let newExtension = mimeType.split('/')[1];
        if (newExtension === 'jpeg') newExtension = 'jpg';
        const newFileName = `${currentFile.name.split('.')[0]}-converted.${newExtension}`;
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
            btnText.innerText = 'Download Final Image';
            spinner.style.display = 'none';
        }, mimeType, quality);
    }, 100); 
});
