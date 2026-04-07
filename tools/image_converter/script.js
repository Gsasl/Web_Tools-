'use strict';

// ============================================================
// 1. DOM REFS  (fail loudly if an ID is missing)
// ============================================================
const $  = id => document.getElementById(id);

const nav            = $('nav');
const uploadState    = $('uploadState');
const dropZone       = $('dropZone');
const fileInput      = $('fileInput');
const workspace      = $('workspace');
const previewWrap    = $('previewWrap');
const preview        = $('preview');

const detectedFormat = $('detectedFormat');
const fileDimensions = $('fileDimensions');
const fileCount      = $('fileCount');
const resetBtn       = $('resetBtn');

const cropBtn        = $('cropBtn');
const mainRotateBtn  = $('mainRotateBtn');
const aiBgBtn        = $('aiBgBtn');

const cropBar        = $('cropBar');
const cancelCropBtn  = $('cancelCropBtn');
const rotateInCropBtn= $('rotateInCropBtn');
const applyCropBtn   = $('applyCropBtn');

const brightSlider   = $('brightSlider');
const contrastSlider = $('contrastSlider');
const graySlider     = $('graySlider');
const blurSlider     = $('blurSlider');
const brightVal      = $('brightVal');
const contrastVal    = $('contrastVal');
const grayVal        = $('grayVal');
const blurVal        = $('blurVal');
const resetEffectsBtn= $('resetEffectsBtn');

const watermarkText    = $('watermarkText');
const watermarkColor   = $('watermarkColor');
const watermarkOpacity = $('watermarkOpacity');
const opacityVal       = $('opacityVal');
const watermarkPos     = $('watermarkPos');

const stripExif      = $('stripExif');
const outputFormat   = $('outputFormat');
const qualitySlider  = $('qualitySlider');
const qualityValue   = $('qualityValue');
const qualityRow     = $('qualityRow');
const convertBtn     = $('convertBtn');
const btnText        = $('btnText');
const dlIcon         = $('dlIcon');
const spinner        = $('spinner');

const aiOverlay      = $('aiOverlay');
const aiStatusText   = $('aiStatusText');
const aiProgressBar  = $('aiProgressBar');
const aiProgressPct  = $('aiProgressPct');
const cancelAiBtn    = $('cancelAiBtn');

// ============================================================
// 2. STATE
// ============================================================
let currentFiles      = [];
let cropper           = null;
let isCropping        = false;
let originalPreviewSrc= null;
let aiWorker          = null;
let aiRunning         = false;
let effectsRaf        = null;

// ============================================================
// 3. NAV SCROLL SHADOW
// ============================================================
window.addEventListener('scroll', () => {
  nav.classList.toggle('shadow', window.scrollY > 8);
}, { passive: true });

// ============================================================
// 4. PANEL ACCORDION
// ============================================================
document.querySelectorAll('.panel-head').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.panel').classList.toggle('open');
  });
});

// ============================================================
// 5. UPLOAD HANDLING
// ============================================================
dropZone.addEventListener('click', () => fileInput.click());

['dragenter','dragover','dragleave','drop'].forEach(ev =>
  dropZone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
);
['dragenter','dragover'].forEach(ev =>
  dropZone.addEventListener(ev, () => dropZone.classList.add('drag-active'))
);
['dragleave','drop'].forEach(ev =>
  dropZone.addEventListener(ev, () => dropZone.classList.remove('drag-active'))
);
dropZone.addEventListener('drop', e => {
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => {
  if (e.target.files.length) handleFiles(e.target.files);
  fileInput.value = ''; // allow re-picking the same file
});
resetBtn.addEventListener('click', resetToUpload);

function resetToUpload() {
  if (aiRunning) return;
  if (isCropping) cancelCrop();
  currentFiles = [];
  originalPreviewSrc = null;
  workspace.classList.remove('visible');
  workspace.classList.add('hidden');
  uploadState.style.display = '';
  previewWrap.classList.remove('transparent');
  resetEffects();
  convertBtn.disabled = true;
}

async function handleFiles(files) {
  if (aiRunning) return;
  if (isCropping) cancelCrop();
  resetEffects();
  currentFiles = [];

  const valid = [];
  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.heic') || name.endsWith('.heif')) {
      if (typeof heic2any === 'undefined') {
        console.warn('heic2any not loaded — skipping', name);
        continue;
      }
      try {
        const out  = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        const blobs = Array.isArray(out) ? out : [out];
        blobs.forEach(b => valid.push(
          new File([b], name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' })
        ));
      } catch (e) {
        console.warn('HEIC decode failed:', name, e);
      }
    } else if (file.type && file.type.startsWith('image/')) {
      valid.push(file);
    }
  }

  if (!valid.length) {
    alert('No valid images found.\nSupported formats: JPEG, PNG, WebP, HEIC.');
    return;
  }

  currentFiles = valid;

  // Switch to workspace
  uploadState.style.display = 'none';
  workspace.classList.remove('hidden');
  workspace.classList.add('visible');

  // Update info chips
  const fmt = currentFiles[0].type.split('/')[1]?.toUpperCase().replace('JPEG','JPG') ?? '?';
  detectedFormat.textContent = currentFiles.length > 1 ? `Batch (${fmt})` : fmt;
  fileCount.textContent = currentFiles.length === 1 ? '1 file' : `${currentFiles.length} files`;
  fileDimensions.textContent = '–';

  // Set preview
  const url = URL.createObjectURL(currentFiles[0]);
  preview.src = url;
  originalPreviewSrc = url;
  previewWrap.classList.remove('transparent');

  preview.onload = () => {
    if (preview.naturalWidth) {
      fileDimensions.textContent = `${preview.naturalWidth}×${preview.naturalHeight}`;
    }
  };

  // Batch mode: disable single-image tools
  const batch = currentFiles.length > 1;
  cropBtn.disabled        = batch;
  mainRotateBtn.disabled  = batch;
  aiBgBtn.disabled        = batch;
  if (batch) {
    aiBgBtn.textContent = 'AI BG Removal (single file only)';
  } else {
    aiBgBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> AI Background Removal`;
  }

  convertBtn.disabled = false;
  updateQualityUI();
}

// ============================================================
// 6. EFFECTS ENGINE  (rAF-debounced for smooth sliders)
// ============================================================
function getFilter() {
  return [
    `brightness(${brightSlider.value}%)`,
    `contrast(${contrastSlider.value}%)`,
    `grayscale(${graySlider.value}%)`,
    `blur(${blurSlider.value}px)`
  ].join(' ');
}

function applyEffects() {
  // Update labels synchronously (cheap)
  brightVal.textContent   = `${brightSlider.value}%`;
  contrastVal.textContent = `${contrastSlider.value}%`;
  grayVal.textContent     = `${graySlider.value}%`;
  blurVal.textContent     = `${blurSlider.value}px`;
  // Defer style mutation to next paint
  if (effectsRaf) cancelAnimationFrame(effectsRaf);
  effectsRaf = requestAnimationFrame(() => {
    preview.style.filter = getFilter();
  });
}

[brightSlider, contrastSlider, graySlider, blurSlider]
  .forEach(s => s.addEventListener('input', applyEffects));

resetEffectsBtn.addEventListener('click', resetEffects);
function resetEffects() {
  brightSlider.value = 100;
  contrastSlider.value = 100;
  graySlider.value = 0;
  blurSlider.value = 0;
  applyEffects();
}

// ============================================================
// 7. WATERMARK OPACITY LABEL
// ============================================================
watermarkOpacity.addEventListener('input', () => {
  opacityVal.textContent = `${watermarkOpacity.value}%`;
});

// ============================================================
// 8. ROTATE (standalone, without cropper)
// ============================================================
mainRotateBtn.addEventListener('click', () => {
  if (!currentFiles.length || isCropping || aiRunning) return;

  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width  = img.naturalHeight;
    c.height = img.naturalWidth;
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    c.toBlob(blob => {
      const f = new File([blob], currentFiles[0].name, { type: currentFiles[0].type });
      currentFiles[0] = f;
      const url = URL.createObjectURL(f);
      originalPreviewSrc = url;
      preview.src = url;
      preview.onload = () => {
        fileDimensions.textContent = `${preview.naturalWidth}×${preview.naturalHeight}`;
        applyEffects();
      };
    }, currentFiles[0].type);
  };
  img.src = URL.createObjectURL(currentFiles[0]);
});

// ============================================================
// 9. CROP
// ============================================================
cropBtn.addEventListener('click', startCrop);
cancelCropBtn.addEventListener('click', cancelCrop);
applyCropBtn.addEventListener('click', applyCrop);
rotateInCropBtn.addEventListener('click', () => { if (cropper) cropper.rotate(90); });

function sidebarLockForCrop(lock) {
  const sidebar = $('mainControls');
  sidebar.style.opacity       = lock ? '0.38' : '';
  sidebar.style.pointerEvents = lock ? 'none'  : '';
}

function startCrop() {
  if (!currentFiles.length || isCropping || aiRunning) return;
  isCropping = true;
  cropBar.classList.remove('hidden');
  sidebarLockForCrop(true);
  preview.style.filter = 'none';   // don't apply effects during crop

  // Cropper.js needs the image visible and sized
  cropper = new Cropper(preview, {
    viewMode: 1,
    autoCropArea: 0.8,
    responsive: true,
    checkCrossOrigin: false,
  });
}

function cancelCrop() {
  if (!isCropping) return;
  cropBar.classList.add('hidden');
  sidebarLockForCrop(false);
  if (cropper) { cropper.destroy(); cropper = null; }
  isCropping = false;
  if (originalPreviewSrc) preview.src = originalPreviewSrc;
  applyEffects();
}

function applyCrop() {
  if (!isCropping || !cropper) return;
  const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: 'high' });
  cropBar.classList.add('hidden');
  sidebarLockForCrop(false);
  cropper.destroy(); cropper = null; isCropping = false;

  canvas.toBlob(blob => {
    const ext = currentFiles[0].name.split('.').pop();
    const name = currentFiles[0].name.replace(/\.[^/.]+$/, `-crop.${ext}`);
    const f = new File([blob], name, { type: currentFiles[0].type });
    currentFiles[0] = f;
    const url = URL.createObjectURL(f);
    originalPreviewSrc = url;
    preview.src = url;
    preview.onload = () => {
      fileDimensions.textContent = `${preview.naturalWidth}×${preview.naturalHeight}`;
      applyEffects();
    };
  }, currentFiles[0].type, 0.95);
}

// ============================================================
// 10. AI BACKGROUND REMOVAL
// ============================================================
function lockUI(msg = 'Working…') {
  aiRunning = true;
  aiStatusText.textContent = msg;
  aiProgressBar.style.width = '0%';
  aiProgressPct.textContent = '0%';
  aiOverlay.classList.remove('hidden');
  $('mainControls').classList.add('locked');
  convertBtn.disabled = true;
}

function unlockUI() {
  aiRunning = false;
  aiOverlay.classList.add('hidden');
  $('mainControls').classList.remove('locked');
  convertBtn.disabled = false;
}

function setProgress(msg, pct) {
  if (msg) aiStatusText.textContent = msg;
  aiProgressBar.style.width = `${pct}%`;
  aiProgressPct.textContent = `${Math.round(pct)}%`;
}

cancelAiBtn.addEventListener('click', () => {
  if (aiWorker) {
    aiWorker.postMessage({ action: 'cancel' });
    aiWorker.onmessage = null;
    aiWorker = null;
  }
  unlockUI();
  if (originalPreviewSrc) { preview.src = originalPreviewSrc; applyEffects(); }
});

// Downsample to ≤1024px before sending to worker — faster inference, same quality mask
function prepareForAI(file, maxPx = 1024) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth  * scale);
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.92));
    };
    img.src = URL.createObjectURL(file);
  });
}

aiBgBtn.addEventListener('click', async () => {
  if (!currentFiles.length || isCropping || aiRunning) return;

  lockUI('Preparing image…');
  setProgress('Preparing image…', 2);

  if (!aiWorker) {
    aiWorker = new Worker('worker.js', { type: 'module' });
  }

  aiWorker.onmessage = e => {
    const r = e.data;
    if (r.status === 'downloading') {
      setProgress(
        r.progress < 5
          ? 'Downloading AI model… (first run only, ~25 MB)'
          : `Downloading model: ${r.progress}%`,
        r.progress
      );
    } else if (r.status === 'processing') {
      setProgress('Removing background…', 100);
    } else if (r.status === 'done') {
      applyAIMask(r);
    } else if (r.status === 'error') {
      alert('AI Error: ' + r.error);
      unlockUI();
    }
  };

  const base64 = await prepareForAI(currentFiles[0]);
  aiWorker.postMessage({ action: 'run', imageBase64: base64 });
});

// BUG FIX: mask.data is 1-channel (grayscale, 0=bg, 255=fg).
// Must convert to 4-channel RGBA with the mask values as the alpha channel
// before passing to ImageData or destination-in compositing.
function applyAIMask(aiData) {
  const orig = new Image();
  orig.src = URL.createObjectURL(currentFiles[0]);
  orig.onload = () => {
    // 1. 1-ch grey → 4-ch RGBA  (white RGB, mask = alpha)
    const grey = new Uint8ClampedArray(aiData.data); // already transferred (zero-copy)
    const rgba = new Uint8ClampedArray(aiData.width * aiData.height * 4);
    for (let i = 0; i < grey.length; i++) {
      rgba[i*4]   = 255;
      rgba[i*4+1] = 255;
      rgba[i*4+2] = 255;
      rgba[i*4+3] = grey[i];   // alpha = mask value
    }

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width  = aiData.width;
    maskCanvas.height = aiData.height;
    maskCanvas.getContext('2d').putImageData(
      new ImageData(rgba, aiData.width, aiData.height), 0, 0
    );

    // 2. Composite: draw original, clip with mask
    const out = document.createElement('canvas');
    out.width  = orig.naturalWidth;
    out.height = orig.naturalHeight;
    const ctx  = out.getContext('2d');
    ctx.drawImage(orig, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    // Scale the (possibly downsampled) mask to full image size
    ctx.drawImage(maskCanvas, 0, 0, out.width, out.height);

    // 3. Export as PNG (must be PNG for transparency)
    out.toBlob(blob => {
      const name = currentFiles[0].name.replace(/\.[^/.]+$/, '-nobg.png');
      const f    = new File([blob], name, { type: 'image/png' });
      currentFiles[0] = f;

      const url = URL.createObjectURL(f);
      originalPreviewSrc = url;
      preview.src = url;
      outputFormat.value = 'image/png';
      previewWrap.classList.add('transparent');
      fileDimensions.textContent = `${orig.naturalWidth}×${orig.naturalHeight}`;
      updateQualityUI();
      unlockUI();

      // Briefly confirm
      const origHTML = aiBgBtn.innerHTML;
      aiBgBtn.innerHTML = '✓ Background removed!';
      setTimeout(() => { aiBgBtn.innerHTML = origHTML; }, 3000);
    }, 'image/png');
  };
}

// ============================================================
// 11. EXPORT
// ============================================================
outputFormat.addEventListener('change', updateQualityUI);
qualitySlider.addEventListener('input', () => {
  qualityValue.textContent = `${Math.round(qualitySlider.value * 100)}%`;
});

function updateQualityUI() {
  const isPng = outputFormat.value === 'image/png';
  qualityRow.style.opacity       = isPng ? '0.4'  : '1';
  qualitySlider.disabled         = isPng;
  qualityValue.textContent       = isPng ? 'Lossless' : `${Math.round(qualitySlider.value * 100)}%`;
}

// Draw one file to a blob: applies CSS filters permanently + optional watermark
function processToBlob(file, mime, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      // For lossy formats, fill white so transparent areas aren't black
      if (mime !== 'image/png') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Bake in CSS visual effects
      ctx.filter = getFilter();
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none';

      // Watermark
      const wText = watermarkText.value.trim();
      if (wText) {
        const fontSize = Math.max(14, Math.round(canvas.width * 0.042));
        ctx.font         = `bold ${fontSize}px 'Sora',system-ui,sans-serif`;
        ctx.fillStyle    = watermarkColor.value;
        ctx.globalAlpha  = parseInt(watermarkOpacity.value, 10) / 100;
        ctx.shadowColor  = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur   = 10;
        const pad = fontSize * 0.9;
        const pos = watermarkPos.value;
        const isRight  = pos === 'br' || pos === 'tr';
        const isBottom = pos === 'br' || pos === 'bl';
        if (pos === 'c') {
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(wText, canvas.width / 2, canvas.height / 2);
        } else {
          ctx.textAlign    = isRight  ? 'right' : 'left';
          ctx.textBaseline = isBottom ? 'bottom' : 'top';
          ctx.fillText(wText,
            isRight  ? canvas.width  - pad : pad,
            isBottom ? canvas.height - pad : pad
          );
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
      }

      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), mime, quality);
    };
    img.onerror = () => reject(new Error(`Failed to load: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

function triggerDownload(blob, name) {
  const a   = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function stem(filename) { return filename.replace(/\.[^/.]+$/, ''); }

convertBtn.addEventListener('click', async () => {
  if (!currentFiles.length || isCropping || aiRunning) return;

  convertBtn.disabled = true;
  dlIcon.style.display = 'none';
  spinner.classList.remove('hidden');
  btnText.textContent = currentFiles.length > 1 ? 'Zipping…' : 'Exporting…';

  const mime    = outputFormat.value;
  let   ext     = mime.split('/')[1] ?? 'jpg';
  if (ext === 'jpeg') ext = 'jpg';
  const quality = mime === 'image/png' ? 1 : parseFloat(qualitySlider.value);

  try {
    if (currentFiles.length === 1) {
      const blob = await processToBlob(currentFiles[0], mime, quality);
      triggerDownload(blob, `${stem(currentFiles[0].name)}-edited.${ext}`);
    } else {
      if (typeof JSZip === 'undefined') throw new Error('JSZip not loaded — please refresh.');
      const zip = new JSZip();
      for (const f of currentFiles) {
        const blob = await processToBlob(f, mime, quality);
        zip.file(`${stem(f.name)}-edited.${ext}`, blob);
      }
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      triggerDownload(zipBlob, 'PixelKit_Batch.zip');
    }
  } catch (err) {
    console.error('Export error:', err);
    alert('Export failed: ' + err.message);
  } finally {
    convertBtn.disabled = false;
    spinner.classList.add('hidden');
    dlIcon.style.display = '';
    btnText.textContent = 'Download';
  }
});

// ============================================================
// 12. QUALITY INIT
// ============================================================
updateQualityUI();
