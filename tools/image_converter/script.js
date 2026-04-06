const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const uploadText = document.getElementById('uploadText');
const uploadIcon = document.getElementById('uploadIcon');
const workspace = document.getElementById('workspace');
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

// --- SEPARATE CROPPER ELEMENTS Section ---
const cropControls = document.getElementById('cropControls');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const applyCropBtn = document.getElementById('applyCropBtn');
const mainControls = document.getElementById('mainControls');
const cropBtn = document.getElementById('cropBtn');

// --- End Cropper Elements Section ---

let currentFile = null;

// --- Separate Cropper State Section ---
let cropper = null; // To hold the Cropper.js instance
let originalPreviewSrc = null; // Store the un-cropped image to revert if canceled
let isCropping = false; // Flag to know if we are in crop mode
// --- End Cropper State Section ---

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
    // SEPARATE CROPPER INTEGRATION: Reset any existing cropping state when uploading new file
    if (isCropping) cancelCrop(); 
    cropper = null; 
    isCropping = false;
    // End Cropper Integration

    let fileToProcess = file;
    const fileName = file.name.toLowerCase();

    // Reset workspace animation wrapper to hidden if uploading a second file
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
    
    updateFileInfoUI(fileToProcess); // Dedicated function for file details UI

    // Create a smooth fade in
    setTimeout(() => {
        workspace.classList.remove('hidden');
        workspace.style.height = 'auto'; // Re-enable auto height
    }, 150);

    // Enable buttons and initialize quality slider UI
    convertBtn.disabled = false;
    cropBtn.disabled = false; // SEPARATE CROPPER INTEGRATION: Enable Crop button after valid upload
    updateQualityUI();
}

function resetUploadArea() {
    uploadIcon.innerText = "📥";
    uploadText.innerText = "Drag & Drop or Click to Upload";
}

// Dedicated function to update file info UI (recognizable as core logic)
function updateFileInfoUI(file) {
    const formatStr = file.type ? file.type.split('/')[1].toUpperCase() : 'UNKNOWN';
    detectedFormat.innerText = formatStr;
    const sizeKB = (file.size / 1024).toFixed(2);
    fileSize.innerText = `${sizeKB} KB`;
    preview.src = URL.createObjectURL(file); // Update the visual preview
    originalPreviewSrc = preview.src; // SEPARATE CROPPER INTEGRATION: Remember this source for canceling
}

// --- Separate Cropper Logic & Listeners Section (recognizable block) ---

// Start Crop mode: hide main controls, show crop controls, initialize cropper
cropBtn.addEventListener('click', startCrop);
cancelCropBtn.addEventListener('click', cancelCrop);
applyCropBtn.addEventListener('click', applyCrop);

function startCrop() {
    if (!currentFile || isCropping) return;

    isCropping = true;

    // Smooth UI transitions
    mainControls.classList.add('hidden');
    
    // Set a slight delay for better visual flow
    setTimeout(() => {
        cropControls.classList.remove('hidden');
        
        // Initialize Cropper.js on the preview image element
        cropper = new Cropper(preview, {
            viewMode: 1, // Constrain crop box to canvas
            autoCropArea: 0.8, // Initial crop box size
            responsive: true,
            // You can add more options like aspect ratio if needed
        });
    }, 150);
}

// Cancel Crop mode: destroy cropper, revert UI, reset state
function cancelCrop() {
    if (!isCropping || !cropper) return;

    // Smooth UI transitions
    cropControls.classList.add('hidden');
    
    // Set a slight delay for better visual flow
    setTimeout(() => {
        mainControls.classList.remove('hidden');
        
        cropper.destroy(); // Remove cropper UI and reset the img element
        cropper = null;
        isCropping = false;
        
        // Ensure preview img src reverts to original pre-crop state
        preview.src = originalPreviewSrc;
    }, 150);
}

// Apply Crop mode: get cropped canvas, update preview, update currentFile/size/format, revert UI, reset state
function applyCrop() {
    if (!isCropping || !cropper) return;

    // Get the cropped version as a standard canvas element
    const croppedCanvas = cropper.getCroppedCanvas();

    // Use a short delay for smooth feel
    cropControls.classList.add('hidden');
    
    setTimeout(() => {
        mainControls.classList.remove('hidden');
        
        cropper.destroy();
        cropper = null;
        isCropping = false;

        // Convert canvas to a standard Data URL to update visual preview
        preview.src = croppedCanvas.toDataURL(); // Update the preview visual

        // Convert canvas to a binary Large Object (Blob) and create a new File object
        // NOTE: We convert to the *currentFile's* mimeType initially. The conversion later will handle changing formats if selected.
        croppedCanvas.toBlob(function(blob) {
            const newName = currentFile.name.replace(/\.[^/.]+$/, "-cropped." + currentFile.name.split('.').pop()); // Add '-cropped' to name
            const croppedFile = new File([blob], newName, { type: currentFile.type });
            
            currentFile = croppedFile; // Update the global currentFile variable
            updateFileInfoUI(croppedFile); // Re-run UI update with new file details/format/size/URL source
        }, currentFile.type); // Keep initial type, conversion later can change it
    }, 150);
}
// --- End Cropper Logic & Listeners Section ---

// --- Quality Slider Logic ---
outputFormat.addEventListener('change', updateQualityUI);
qualitySlider.addEventListener('input', updateQualityUI);

function updateQualityUI() {
    if(outputFormat.value === 'image/png') {
        qualitySlider.disabled = true;
        qualitySlider.style.opacity = '0.5';
        qualityValue.innerText = 'Lossless';
        qualityValue.style.background = '#e2e8f0'; // Gray badge
        qualityValue.style.color = '#64748b'; // Muted text
    } else {
        qualitySlider.disabled = false;
        qualitySlider.style.opacity = '1';
        qualityValue.innerText = Math.round(qualitySlider.value * 100) + '%';
        qualityValue.style.background = '#dbeafe'; // Blue success badge
        qualityValue.style.color = '#1e40af'; // Trusted text
    }
}

// --- Conversion & Download Engine (Core Logic Section) ---
convertBtn.addEventListener('click', function() {
    if (!currentFile || isCropping) return; // Do not convert while cropping

    // Trigger Loading State
    convertBtn.disabled = true;
    cropBtn.disabled = true; // SEPARATE CROPPER INTEGRATION: Also disable Crop button while converting
    btnText.innerText = 'Converting...';
    spinner.style.display = 'inline-block';

    // A small delay allows the browser to render the spinner before heavy processing
    setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions to match the (potentially cropped) image source
        canvas.width = preview.naturalWidth;
        canvas.height = preview.naturalHeight;
        
        // Draw the visual preview (which may be a cropped Data URL) onto the canvas
        ctx.drawImage(preview, 0, 0);

        const mimeType = outputFormat.value;
        let newExtension = mimeType.split('/')[1];
        if (newExtension === 'jpeg') newExtension = 'jpg';
        
        const originalName = currentFile.name.split('.')[0];
        const newFileName = `${originalName}-converted.${newExtension}`;
        
        // Lossless PNG conversion ignores quality, JPEG/WebP uses slider value
        const quality = mimeType === 'image/png' ? 1 : parseFloat(qualitySlider.value);

        // Convert the final canvas to binary and trigger download
        canvas.toBlob(function(blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = newFileName; 
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            // Reset UI/Button states
            convertBtn.disabled = false;
            cropBtn.disabled = false; // SEPARATE CROPPER INTEGRATION: Re-enable Crop button
            btnText.innerText = 'Download';
            spinner.style.display = 'none';

        }, mimeType, quality);
    }, 100); 
});
