// ... (Keep all your existing DOM element variable declarations at the top) ...
const fileCount = document.getElementById('fileCount');
const stripExif = document.getElementById('stripExif');
const aiBgBtn = document.getElementById('aiBgBtn');

let currentFiles = []; // Array to handle batch processing
let cropper = null; 
let originalPreviewSrc = null; 
let isCropping = false;

// --- AI Stub ---
aiBgBtn.addEventListener('click', () => {
    alert("AI Background Removal requires loading a local WebAssembly ML model. This feature is in development for V2!");
});

// --- Upload Logic ---
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
    currentFiles = []; // Reset batch

    dropZone.style.display = 'none';
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
                continue; // Skip failed HEIC and move to next
            }
        }
        currentFiles.push(fileToProcess);
    }

    if (currentFiles.length === 0) {
        alert("No valid images processed.");
        dropZone.style.display = 'block';
        return;
    }

    // UI Updates
    fileCount.innerText = currentFiles.length;
    // Show preview of the FIRST image in the batch
    preview.src = URL.createObjectURL(currentFiles[0]);
    originalPreviewSrc = preview.src; 
    
    workspace.classList.remove('hidden');
    convertBtn.disabled = false;
    
    // Disable crop if batch processing to prevent UI confusion
    cropBtn.disabled = currentFiles.length > 1; 
    if(currentFiles.length > 1) cropBtn.innerText = "Crop (Disabled in Batch)";

    updateQualityUI();
}

// ... (Keep your existing Effects and Cropping logic here exactly as it was) ...

// --- Output & Conversion Engine (Updated for Batch/ZIP) ---
convertBtn.addEventListener('click', async function() {
    if (currentFiles.length === 0 || isCropping) return;

    convertBtn.disabled = true;
    btnText.innerText = currentFiles.length > 1 ? 'Zipping Files...' : 'Processing...';
    spinner.style.display = 'inline-block';

    const mimeType = outputFormat.value;
    let newExtension = mimeType.split('/')[1];
    if (newExtension === 'jpeg') newExtension = 'jpg';
    const quality = mimeType === 'image/png' ? 1 : parseFloat(qualitySlider.value);

    // If single file, export normally
    if (currentFiles.length === 1) {
        await processAndDownloadSingle(currentFiles[0], mimeType, newExtension, quality);
    } 
    // If multiple files, use JSZip
    else {
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

    convertBtn.disabled = false;
    btnText.innerText = 'Download Image(s)';
    spinner.style.display = 'none';
});

// Helper function to process an image through the canvas to apply filters and strip EXIF
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

            // Note: Drawing to canvas inherently strips EXIF metadata! 
            // The checkbox is largely for user trust/UI, but guarantees the strip.
            
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
