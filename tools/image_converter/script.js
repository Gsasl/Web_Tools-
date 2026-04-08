'use strict';

// ============================================================
// OUTPUT SIZE PRESETS
// ============================================================
const SIZE_PRESETS = {
  original:    null,
  passport_eu: { w:413,  h:531,  label:'EU Passport — 413×531 px (35×45 mm @ 300 dpi)' },
  passport_us: { w:600,  h:600,  label:'US Visa — 600×600 px (2×2 in @ 300 dpi)' },
  passport_in: { w:350,  h:450,  label:'India Passport — 350×450 px (35×45 mm @ 254 dpi)' },
  passport_uk: { w:413,  h:531,  label:'UK Passport — 413×531 px (35×45 mm @ 300 dpi)' },
  profile_sq:  { w:1000, h:1000, label:'Profile square — 1000×1000 px' },
  cover_tw:    { w:1500, h:500,  label:'Twitter/X cover — 1500×500 px' },
  post_ig:     { w:1080, h:1080, label:'Instagram post — 1080×1080 px' },
  custom:      'custom',
};

// ============================================================
// 1. DOM REFS
// ============================================================
const $ = id => document.getElementById(id);

const nav             = $('nav');
const uploadState     = $('uploadState');
const dropZone        = $('dropZone');
const fileInput       = $('fileInput');
const workspace       = $('workspace');
const previewWrap     = $('previewWrap');
const preview         = $('preview');

const detectedFormat  = $('detectedFormat');
const dimTag          = $('dimTag');
const dimPopup        = $('dimPopup');
const popW            = $('popW');
const popH            = $('popH');
const popSize         = $('popSize');
const popFmt          = $('popFmt');
const fileCount       = $('fileCount');
const resetBtn        = $('resetBtn');

const cropBtn         = $('cropBtn');
const mainRotateBtn   = $('mainRotateBtn');
const aiBgBtn         = $('aiBgBtn');

const cropBar         = $('cropBar');
const cancelCropBtn   = $('cancelCropBtn');
const rotateInCropBtn = $('rotateInCropBtn');
const applyCropBtn    = $('applyCropBtn');

const brightSlider    = $('brightSlider');
const contrastSlider  = $('contrastSlider');
const graySlider      = $('graySlider');
const blurSlider      = $('blurSlider');
const brightVal       = $('brightVal');
const contrastVal     = $('contrastVal');
const grayVal         = $('grayVal');
const blurVal         = $('blurVal');
const resetEffectsBtn = $('resetEffectsBtn');

const watermarkText    = $('watermarkText');
const watermarkColor   = $('watermarkColor');
const watermarkOpacity = $('watermarkOpacity');
const opacityVal       = $('opacityVal');
const watermarkPos     = $('watermarkPos');

const outputFormat    = $('outputFormat');
const qualitySlider   = $('qualitySlider');
const qualityValue    = $('qualityValue');
const qualityRow      = $('qualityRow');
const sizePreset      = $('sizePreset');
const customDims      = $('customDims');
const customW         = $('customW');
const customH         = $('customH');
const presetInfo      = $('presetInfo');
const presetInfoText  = $('presetInfoText');

const convertBtn      = $('convertBtn');
const btnText         = $('btnText');
const dlIcon          = $('dlIcon');
const spinner         = $('spinner');

const aiOverlay       = $('aiOverlay');
const aiStatusText    = $('aiStatusText');
const aiProgressBar   = $('aiProgressBar');
const aiProgressPct   = $('aiProgressPct');
const cancelAiBtn     = $('cancelAiBtn');

const swatches        = document.querySelectorAll('.swatch');
const bgColorPick     = $('bgColorPick');
const applyCustomBg   = $('applyCustomBg');
const bgCurSwatch     = $('bgCurSwatch');
const bgCurLabel      = $('bgCurLabel');

// ============================================================
// 2. STATE
// ============================================================
let currentFiles       = [];
let cropper            = null;
let isCropping         = false;
let originalPreviewSrc = null;
let aiWorker           = null;
let aiRunning          = false;
let effectsRaf         = null;
let currentBgColor     = 'transparent';

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
  btn.addEventListener('click', () => btn.closest('.panel').classList.toggle('open'));
});

// ============================================================
// 5. DIMENSION POPUP
// ============================================================
dimTag.addEventListener('click', e => {
  e.stopPropagation();
  dimPopup.classList.toggle('hidden');
});
document.addEventListener('click', () => dimPopup.classList.add('hidden'));

function updateDimPopup(file) {
  popW.textContent   = preview.naturalWidth  ? `${preview.naturalWidth} px`  : '–';
  popH.textContent   = preview.naturalHeight ? `${preview.naturalHeight} px` : '–';
  popFmt.textContent = file ? (file.type.split('/')[1]?.toUpperCase() ?? '?') : '–';
  popSize.textContent = file ? formatBytes(file.size) : '–';
}

function formatBytes(bytes) {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================
// 6. UPLOAD
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
dropZone.addEventListener('drop',   e => { if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', e => { if (e.target.files.length) handleFiles(e.target.files); fileInput.value = ''; });
resetBtn.addEventListener('click', resetToUpload);

function resetToUpload() {
  if (aiRunning) return;
  if (isCropping) cancelCrop();
  currentFiles = [];
  originalPreviewSrc = null;
  currentBgColor = 'transparent';
  updateBgUI('transparent');
  swatches.forEach(s => s.classList.remove('active'));
  $('swNone').classList.add('active');
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
  currentBgColor = 'transparent';
  updateBgUI('transparent');
  swatches.forEach(s => s.classList.remove('active'));
  $('swNone').classList.add('active');

  const valid = [];
  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.heic') || name.endsWith('.heif')) {
      if (typeof heic2any === 'undefined') { console.warn('heic2any not loaded'); continue; }
      try {
        const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        const blobs = Array.isArray(out) ? out : [out];
        blobs.forEach(b => valid.push(new File([b], name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' })));
      } catch (e) { console.warn('HEIC decode failed', name, e); }
    } else if (file.type && file.type.startsWith('image/')) {
      valid.push(file);
    }
  }

  if (!valid.length) {
    alert('No valid images found.\nSupported: JPEG, PNG, WebP, HEIC.');
    return;
  }
  currentFiles = valid;

  uploadState.style.display = 'none';
  workspace.classList.remove('hidden');
  workspace.classList.add('visible');

  const fmt = currentFiles[0].type.split('/')[1]?.toUpperCase().replace('JPEG','JPG') ?? '?';
  detectedFormat.textContent = currentFiles.length > 1 ? `Batch (${fmt})` : fmt;
  fileCount.textContent = currentFiles.length === 1 ? '1 file' : `${currentFiles.length} files`;
  dimTag.textContent = '…';

  const url = URL.createObjectURL(currentFiles[0]);
  preview.src = url;
  originalPreviewSrc = url;
  previewWrap.classList.remove('transparent');

  preview.onload = () => {
    dimTag.textContent = `${preview.naturalWidth}×${preview.naturalHeight}`;
    updateDimPopup(currentFiles[0]);
  };

  const batch = currentFiles.length > 1;
  cropBtn.disabled       = batch;
  mainRotateBtn.disabled = batch;
  aiBgBtn.disabled       = batch;
  aiBgBtn.innerHTML = batch
    ? 'AI BG Removal (single file only)'
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> AI Background Removal`;

  convertBtn.disabled = false;
  updateQualityUI();
}

// ============================================================
// 7. EFFECTS ENGINE
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
  brightVal.textContent   = `${brightSlider.value}%`;
  contrastVal.textContent = `${contrastSlider.value}%`;
  grayVal.textContent     = `${graySlider.value}%`;
  blurVal.textContent     = `${blurSlider.value}px`;
  if (effectsRaf) cancelAnimationFrame(effectsRaf);
  effectsRaf = requestAnimationFrame(() => { preview.style.filter = getFilter(); });
}

[brightSlider, contrastSlider, graySlider, blurSlider]
  .forEach(s => s.addEventListener('input', applyEffects));

resetEffectsBtn.addEventListener('click', resetEffects);
function resetEffects() {
  brightSlider.value = 100; contrastSlider.value = 100;
  graySlider.value = 0;     blurSlider.value = 0;
  applyEffects();
}

watermarkOpacity.addEventListener('input', () => {
  opacityVal.textContent = `${watermarkOpacity.value}%`;
});

// ============================================================
// 8. BACKGROUND FILL
// ============================================================
swatches.forEach(sw => {
  sw.addEventListener('click', () => {
    swatches.forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    currentBgColor = sw.dataset.color;
    updateBgUI(currentBgColor);
  });
});

applyCustomBg.addEventListener('click', () => {
  const color = bgColorPick.value;
  // Don't apply pure black as default — guard against accidental picker default
  currentBgColor = color;
  swatches.forEach(s => s.classList.remove('active'));
  updateBgUI(color);
});

// Prevent the color picker from auto-applying on open — only on explicit "Use this color"
bgColorPick.addEventListener('change', () => { /* no-op: user must click button */ });

function updateBgUI(color) {
  if (!color || color === 'transparent') {
    bgCurSwatch.style.cssText = `
      background-color:#d0d8e8;
      background-image:
        linear-gradient(45deg,#bac3d4 25%,transparent 25%),
        linear-gradient(-45deg,#bac3d4 25%,transparent 25%),
        linear-gradient(45deg,transparent 75%,#bac3d4 75%),
        linear-gradient(-45deg,transparent 75%,#bac3d4 75%);
      background-size:8px 8px;
      background-position:0 0,0 4px,4px -4px,-4px 0;
    `;
    bgCurLabel.textContent = 'None (transparent)';
  } else {
    bgCurSwatch.style.cssText = `background-image:none;background-color:${color}`;
    bgCurLabel.textContent = color;
  }
}

// ============================================================
// 9. ROTATE
// ============================================================
mainRotateBtn.addEventListener('click', () => {
  if (!currentFiles.length || isCropping || aiRunning) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalHeight; c.height = img.naturalWidth;
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
        dimTag.textContent = `${preview.naturalWidth}×${preview.naturalHeight}`;
        updateDimPopup(f);
        applyEffects();
      };
    }, currentFiles[0].type);
  };
  img.src = URL.createObjectURL(currentFiles[0]);
});

// ============================================================
// 10. CROP
// ============================================================
cropBtn.addEventListener('click', startCrop);
cancelCropBtn.addEventListener('click', cancelCrop);
applyCropBtn.addEventListener('click', applyCrop);
rotateInCropBtn.addEventListener('click', () => { if (cropper) cropper.rotate(90); });

function sidebarLock(lock) {
  $('mainControls').style.opacity       = lock ? '0.38' : '';
  $('mainControls').style.pointerEvents = lock ? 'none'  : '';
}

function startCrop() {
  if (!currentFiles.length || isCropping || aiRunning) return;
  isCropping = true;
  cropBar.classList.remove('hidden');
  sidebarLock(true);
  preview.style.filter = 'none';
  cropper = new Cropper(preview, { viewMode:1, autoCropArea:0.8, responsive:true, checkCrossOrigin:false });
}

function cancelCrop() {
  if (!isCropping) return;
  cropBar.classList.add('hidden');
  sidebarLock(false);
  if (cropper) { cropper.destroy(); cropper = null; }
  isCropping = false;
  if (originalPreviewSrc) preview.src = originalPreviewSrc;
  applyEffects();
}

function applyCrop() {
  if (!isCropping || !cropper) return;
  const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality:'high' });
  cropBar.classList.add('hidden');
  sidebarLock(false);
  cropper.destroy(); cropper = null; isCropping = false;
  canvas.toBlob(blob => {
    const ext  = currentFiles[0].name.split('.').pop();
    const name = currentFiles[0].name.replace(/\.[^/.]+$/, `-crop.${ext}`);
    const f = new File([blob], name, { type: currentFiles[0].type });
    currentFiles[0] = f;
    const url = URL.createObjectURL(f);
    originalPreviewSrc = url;
    preview.src = url;
    preview.onload = () => {
      dimTag.textContent = `${preview.naturalWidth}×${preview.naturalHeight}`;
      updateDimPopup(f);
      applyEffects();
    };
  }, currentFiles[0].type, 0.95);
}

// ============================================================
// 11. OUTPUT SIZE PRESET
// ============================================================
sizePreset.addEventListener('change', () => {
  const key = sizePreset.value;
  const preset = SIZE_PRESETS[key];
  customDims.classList.toggle('hidden', key !== 'custom');
  if (!preset || key === 'original' || key === 'custom') {
    presetInfo.classList.add('hidden'); return;
  }
  presetInfo.classList.remove('hidden');
  presetInfoText.textContent = preset.label + ' — image scaled to fit, centered on fill color.';
});

function getOutputDimensions() {
  const key = sizePreset.value;
  if (key === 'original') return null;
  if (key === 'custom') {
    const w = parseInt(customW.value, 10);
    const h = parseInt(customH.value, 10);
    return (w > 0 && h > 0) ? { w, h } : null;
  }
  return SIZE_PRESETS[key] ?? null;
}

// ============================================================
// 12. AI BACKGROUND REMOVAL
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
  if (aiWorker) { aiWorker.postMessage({ action:'cancel' }); aiWorker.onmessage = null; aiWorker = null; }
  unlockUI();
  if (originalPreviewSrc) { preview.src = originalPreviewSrc; applyEffects(); }
});

// Downsample before sending — faster inference, model doesn't benefit from >1024px
function prepareForAI(file, maxPx = 1024) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
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

  if (!aiWorker) aiWorker = new Worker('worker.js', { type:'module' });

  aiWorker.onmessage = e => {
    const r = e.data;
    if (r.status === 'downloading') {
      setProgress(
        r.progress < 5
          ? 'Downloading AI model… (~170 MB, cached after first run)'
          : `Downloading model: ${r.progress}%`,
        r.progress
      );
    } else if (r.status === 'processing') {
      setProgress('Running segmentation…', 100);
    } else if (r.status === 'done') {
      applyAIMask(r);
    } else if (r.status === 'error') {
      alert('AI Error: ' + r.error);
      unlockUI();
    }
  };

  const base64 = await prepareForAI(currentFiles[0]);
  aiWorker.postMessage({ action:'run', imageBase64: base64 });
});

// ============================================================
// MASK PIPELINE — fixed for clean edges without over-feathering
// ============================================================
/**
 * Process the raw 1-channel (grayscale) mask from isnet-general-use:
 *
 * Step 1 — Hard threshold: pixels >= 128 are foreground (255), else background (0).
 *           This gives a clean, definite classification.
 *
 * Step 2 — Boundary feather: find pixels within `featherPx` of the threshold boundary
 *           and blend them smoothly. This softens only the edge transition, not the
 *           entire mask, so hair/fine detail stays sharp while hard edges don't clip.
 *
 * Step 3 — Convert to RGBA: mask value becomes the alpha channel (255=opaque, 0=transparent).
 */
function processMask(grey, width, height, featherPx = 3) {
  const n = width * height;

  // Step 1: threshold
  const thresholded = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) {
    thresholded[i] = grey[i] >= 128 ? 255 : 0;
  }

  // Step 2: small box-blur ONLY applied at boundary pixels
  // Detect boundary = any pixel whose 8-neighbours differ from itself
  const isBoundary = new Uint8Array(n);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const val = thresholded[idx];
      let boundary = false;
      for (let dy = -1; dy <= 1 && !boundary; dy++) {
        for (let dx = -1; dx <= 1 && !boundary; dx++) {
          if (thresholded[(y+dy)*width+(x+dx)] !== val) boundary = true;
        }
      }
      isBoundary[idx] = boundary ? 1 : 0;
    }
  }

  // Expand boundary region by featherPx
  const inFeather = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!isBoundary[idx]) continue;
      for (let dy = -featherPx; dy <= featherPx; dy++) {
        for (let dx = -featherPx; dx <= featherPx; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            inFeather[ny * width + nx] = 1;
          }
        }
      }
    }
  }

  // Box-blur original (not thresholded) mask only in feather zone
  const out = new Uint8ClampedArray(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!inFeather[idx]) {
        // Outside feather zone: use hard threshold value
        out[idx] = thresholded[idx];
      } else {
        // Inside feather zone: average original mask values for smooth blend
        let sum = 0, count = 0;
        for (let dy = -featherPx; dy <= featherPx; dy++) {
          for (let dx = -featherPx; dx <= featherPx; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += grey[ny * width + nx];
              count++;
            }
          }
        }
        out[idx] = Math.round(sum / count);
      }
    }
  }

  // Step 3: convert 1-ch processed mask → 4-ch RGBA (mask → alpha)
  const rgba = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    rgba[i*4]   = 255;
    rgba[i*4+1] = 255;
    rgba[i*4+2] = 255;
    rgba[i*4+3] = out[i];
  }
  return rgba;
}

function applyAIMask(aiData) {
  const orig = new Image();
  orig.src = URL.createObjectURL(currentFiles[0]);
  orig.onload = () => {
    const mW = aiData.width, mH = aiData.height;
    const grey = new Uint8ClampedArray(aiData.data);

    // Process mask with proper threshold + selective feathering
    const rgba = processMask(grey, mW, mH, 3);

    // Build mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = mW; maskCanvas.height = mH;
    maskCanvas.getContext('2d').putImageData(new ImageData(rgba, mW, mH), 0, 0);

    // Composite: original image clipped by mask
    const out = document.createElement('canvas');
    out.width = orig.naturalWidth; out.height = orig.naturalHeight;
    const ctx = out.getContext('2d');
    ctx.drawImage(orig, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    // Scale mask (was downsampled for inference) back to full resolution
    ctx.drawImage(maskCanvas, 0, 0, out.width, out.height);

    out.toBlob(blob => {
      const name = currentFiles[0].name.replace(/\.[^/.]+$/, '-nobg.png');
      const f    = new File([blob], name, { type:'image/png' });
      currentFiles[0] = f;

      const url = URL.createObjectURL(f);
      originalPreviewSrc = url;
      preview.src = url;
      outputFormat.value = 'image/png';
      previewWrap.classList.add('transparent');
      updateQualityUI();
      unlockUI();
      updateDimPopup(f);
      dimTag.textContent = `${orig.naturalWidth}×${orig.naturalHeight}`;

      const origHTML = aiBgBtn.innerHTML;
      aiBgBtn.innerHTML = '✓ Background removed!';
      setTimeout(() => { aiBgBtn.innerHTML = origHTML; }, 3000);
    }, 'image/png');
  };
}

// ============================================================
// 13. EXPORT
// ============================================================
outputFormat.addEventListener('change', updateQualityUI);
qualitySlider.addEventListener('input', () => {
  qualityValue.textContent = `${Math.round(qualitySlider.value * 100)}%`;
});

function updateQualityUI() {
  const isPng = outputFormat.value === 'image/png';
  qualityRow.style.opacity = isPng ? '0.4' : '1';
  qualitySlider.disabled   = isPng;
  qualityValue.textContent = isPng ? 'Lossless' : `${Math.round(qualitySlider.value * 100)}%`;
}

function processToBlob(file, mime, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const dims = getOutputDimensions();
      let cW = img.naturalWidth, cH = img.naturalHeight;
      if (dims) { cW = dims.w; cH = dims.h; }

      const canvas = document.createElement('canvas');
      canvas.width = cW; canvas.height = cH;
      const ctx = canvas.getContext('2d');

      // Background fill
      if (currentBgColor && currentBgColor !== 'transparent') {
        ctx.fillStyle = currentBgColor;
        ctx.fillRect(0, 0, cW, cH);
      } else if (mime !== 'image/png') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cW, cH);
      }

      // Scale-to-fit when a preset is active
      let drawW = cW, drawH = cH, drawX = 0, drawY = 0;
      if (dims) {
        const scale = Math.min(cW / img.naturalWidth, cH / img.naturalHeight);
        drawW = img.naturalWidth  * scale;
        drawH = img.naturalHeight * scale;
        drawX = (cW - drawW) / 2;
        drawY = (cH - drawH) / 2;
      }

      ctx.filter = getFilter();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.filter = 'none';

      // Watermark
      const wText = watermarkText.value.trim();
      if (wText) {
        const fontSize = Math.max(14, Math.round(cW * 0.042));
        ctx.font        = `bold ${fontSize}px 'Sora',system-ui,sans-serif`;
        ctx.fillStyle   = watermarkColor.value;
        ctx.globalAlpha = parseInt(watermarkOpacity.value, 10) / 100;
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur  = 10;
        const pad = fontSize * 0.9;
        const pos = watermarkPos.value;
        if (pos === 'c') {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(wText, cW / 2, cH / 2);
        } else {
          const isR = pos === 'br' || pos === 'tr';
          const isB = pos === 'br' || pos === 'bl';
          ctx.textAlign    = isR ? 'right' : 'left';
          ctx.textBaseline = isB ? 'bottom' : 'top';
          ctx.fillText(wText, isR ? cW - pad : pad, isB ? cH - pad : pad);
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }

      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), mime, quality);
    };
    img.onerror = () => reject(new Error(`Failed to load: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

function triggerDownload(blob, name) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function stem(n) { return n.replace(/\.[^/.]+$/, ''); }

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
      const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
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
// 14. INIT
// ============================================================
updateQualityUI();
updateBgUI('transparent');
