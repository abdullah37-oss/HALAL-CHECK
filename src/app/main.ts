type Analysis = ReturnType<typeof window.halalAnalyzer.analyze>;
type AnalysisOptions = NonNullable<Parameters<typeof window.halalAnalyzer.analyze>[1]>;
interface HistoryItem {modelVersion?: number; name: string; barcode: string; date: string; ingredientDataSource: string; statusClass: string; status: string; analysis?: Analysis; brand?: string}
interface Detector { backend?: 'wasm'; detect(video: HTMLVideoElement): Promise<Array<{rawValue: string; format?: string}>> }
interface AppState {stream: MediaStream | null; facingMode: string; detector: Detector | null; detecting: boolean; language: string; history: HistoryItem[]}
interface Controls { '#camera-preview': HTMLVideoElement; '#barcode-input': HTMLInputElement; '#ingredients-input': HTMLTextAreaElement; '#ocr-text': HTMLTextAreaElement; '#ocr-complete': HTMLInputElement; '#ocr-language': HTMLSelectElement; '#language-select': HTMLSelectElement; '#guide-search-input': HTMLInputElement; '#barcode-image': HTMLInputElement; '#label-image': HTMLInputElement; '#start-camera': HTMLButtonElement; '#switch-camera': HTMLButtonElement; '#flash-toggle': HTMLButtonElement; '#confirm-ocr': HTMLButtonElement; '#barcode-form button[type=submit]': HTMLButtonElement }
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[char]);
let legacyHistory: HistoryItem[] = [];
try { const saved = JSON.parse(localStorage.getItem('halalcheck-history') || '[]'); if (Array.isArray(saved)) legacyHistory = saved.filter((item) => item && typeof item === 'object'); } catch { /* Ignore corrupted local history. */ }
const migratedLegacyHistory = legacyHistory.filter((item) => item.modelVersion !== 2);
if (migratedLegacyHistory.length) localStorage.setItem('halalcheck-history-legacy-v1', JSON.stringify(migratedLegacyHistory));
const state: AppState = { stream: null, facingMode: 'environment', detector: null, detecting: false, language: localStorage.getItem('halalcheck-language') || 'en', history: legacyHistory.filter((item) => item.modelVersion === 2) };
if (migratedLegacyHistory.length) localStorage.setItem('halalcheck-history', JSON.stringify(state.history));
if (!window.halalI18n.supported.includes(state.language)) state.language = 'en';
let installPrompt: BeforeInstallPromptEvent | null = null;
let lookupSequence = 0;
let cameraSequence = 0;
let imageSequence = 0;
let ocrController: AbortController | null = null;
let ocrEvidence: { text: string; confidence: number; language: string } | null = null;
let torchEnabled = false;
let lastDetectionAt = 0;
let decoderModule: Promise<typeof import('../features/scanner/decoder')> | null = null;
const loadDecoder = () => decoderModule || (decoderModule = import('/assets/barcode-decoder.js').catch(error => { decoderModule = null; throw error; }));
const translate = (text: string) => window.halalI18n.get(text, state.language);
function cameraMessage(text: string) { $('#camera-message').textContent = translate(text); }
function $<K extends keyof Controls>(selector: K): Controls[K];
function $(selector: string): HTMLElement;
function $(selector: string): HTMLElement {const element = document.querySelector<HTMLElement>(selector); if (!element) throw Error('Required control is missing'); return element;}
const $$ = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];
if (!localStorage.getItem(window.halalAnalytics.consentKey)) $('#privacy-notice').hidden = false;
$('#accept-analytics').addEventListener('click', () => { localStorage.setItem(window.halalAnalytics.consentKey, 'granted'); $('#privacy-notice').hidden = true; window.halalAnalytics.track('page_opened'); });
$('#decline-analytics').addEventListener('click', () => { sessionStorage.removeItem('halalcheck-analytics-session'); localStorage.setItem(window.halalAnalytics.consentKey, 'denied'); $('#privacy-notice').hidden = true; });

function showToast(message: string) {
  const toast = $('#toast');
  toast.textContent = window.halalI18n.get(message, state.language);
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function saveHistory(item: HistoryItem) {
  item.modelVersion = 2;
  state.history = [item, ...state.history.filter((entry) => entry.barcode !== item.barcode)].slice(0, 20);
  localStorage.setItem('halalcheck-history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  const empty = '<div class="empty-state card" style="padding:28px;text-align:center;color:var(--muted)">No scans yet. Start with a barcode above.</div>';
  const markup = state.history.length ? state.history.map((item) => `<article class="scan-item"><div class="scan-item-main"><span class="product-icon">▣</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.barcode)} · ${escapeHtml(item.date)} · ${escapeHtml(item.ingredientDataSource)}</small></div></div><span class="result-badge ${escapeHtml(item.statusClass)}">${escapeHtml(item.analysis?.classification ? window.universalHalalPolicy.label(item.analysis.classification, state.language) : item.status)}</span></article>`).join('') : empty;
  $('#recent-scans').innerHTML = markup;
  $('#history-list').innerHTML = markup;
  if (typeof window.halalI18n?.apply === 'function') window.halalI18n.apply(state.language);
  else console.error('HalalCheck could not initialize translations.');
  $('#verified-count').textContent = String(state.history.filter((item) => item.statusClass === 'verified').length);
  $('#review-count').textContent = String(state.history.filter((item) => item.statusClass !== 'verified').length);
  $('#total-count').textContent = String(state.history.length);
}

function route(view: string) {
  if (view !== "result") lookupSequence++;
  stopCamera();
  imageSequence++;
  ocrController?.abort();
  ocrController = null;
  $$('.view').forEach((section) => section.classList.toggle('active-view', section.dataset.view === view));
  $$('[data-route]').forEach((link) => link.classList.toggle('active', link.dataset.route === view));
  if (view === 'scanner') $('#scanner-view').classList.add('active-view');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'guide') window.halalAnalytics.track('guide_opened');
}

async function showResult(barcode: string, source = 'camera', ingredientOverride: string | null = null, analysisOptions: AnalysisOptions = {}) {
  const sequence = ++lookupSequence;
  stopCamera();
  if (source === 'camera' || source === 'image') window.halalAnalytics.track('barcode_completed');
  const manualIngredients = ingredientOverride ?? (source === 'manual' ? $('#ingredients-input')?.value.trim() || '' : '');
  const lookupButton = $('#barcode-form button[type=submit]');
  lookupButton.disabled = true;
  cameraMessage('Looking up product…');
  let lookup;
  try { lookup = manualIngredients ? { status: 'user-provided' } : await window.productRepository.lookup(barcode); }
  catch { lookup = { status: 'lookup-failed' }; }
  finally { lookupButton.disabled = false; }
  if (sequence !== lookupSequence) return;
  if (['lookup-failed', 'malformed-data'].includes(lookup.status)) showToast('Product lookup failed. You can enter ingredients manually.');
  if (lookup.status === 'identity-mismatch') { window.halalAnalytics.track('lookup_failed', { reason: 'identity-mismatch' }); return showIdentityMismatch(barcode); }
  const product = lookup.status === 'verified' && lookup.product ? lookup.product : window.productModel.createProduct({
    scannedBarcode: barcode,
    returnedBarcode: barcode,
    productName: 'Manual ingredient assessment',
    brand: 'User supplied',
    ingredientsRaw: manualIngredients,
    ingredientDataSource: source === 'ocr' ? 'user_confirmed_ocr' : 'user_corrected',
    dataQuality: manualIngredients ? 'user-provided' : 'missing'
  });
  if (!manualIngredients) window.halalAnalytics.track(lookup.status === 'verified' ? 'lookup_succeeded' : 'lookup_failed');
  const analysis = window.halalAnalyzer.analyze(product.ingredients, { language: state.language, certified: product.certification === 'verified', ...analysisOptions });
  window.halalAnalytics.track('analysis_completed');
  const result = {
    name: product.productName,
    brand: `${product.brand} · Scanned ${escapeHtml(product.scannedBarcode)}`,
    status: analysis.label,
    statusClass: analysis.classification === 'likely-halal' ? 'verified' : analysis.classification === 'not-halal' ? 'review' : 'unknown',
    date: new Intl.DateTimeFormat(state.language, { dateStyle: 'medium' }).format(new Date()),
    barcode: product.scannedBarcode, analysis, ingredientDataSource: product.ingredientDataSource
  };
  saveHistory(result);
  const findings = result.analysis.findings.map((finding) => `<li><strong>${escapeHtml(finding.ingredient)}</strong> — ${escapeHtml(finding.record?.name || 'Unknown ingredient')}: ${escapeHtml(finding.record?.explanation || finding.explanation)}<small>Source: ${escapeHtml(finding.source || product.ingredientDataSource)}</small></li>`).join('');
  const certification = product.certification === 'verified' ? window.universalHalalPolicy.label(window.universalHalalPolicy.classifications.CERTIFIED_HALAL, state.language) : 'Certification not verified';
  $('#result-view').innerHTML = `<button class="back-link" type="button" data-action="close-result">← Back to Home</button><div class="result-layout"><div class="result-product-image" aria-label="Product image unavailable">▣</div><div class="result-content"><p class="eyebrow">SCAN RESULT</p><h1>${escapeHtml(result.name)}</h1><p class="brand-line">${escapeHtml(result.brand)}</p><div class="detail-section"><h3>Product identity</h3><p>Scanned barcode: <strong>${escapeHtml(product.scannedBarcode)}</strong> · Returned barcode: <strong>${escapeHtml(product.returnedBarcode)}</strong></p><p>${lookup.status === 'verified' ? 'Catalogue barcode match' : 'Product identity not verified'} · Data source: ${escapeHtml(product.ingredientDataSource)}</p></div><div class="detail-section"><h3>Ingredient assessment</h3><div class="result-status" data-classification="${escapeHtml(analysis.classification)}">○ ${escapeHtml(result.status)}</div><p class="result-explanation">${escapeHtml(result.analysis.explanation)}</p></div><div class="detail-section"><h3>Certification status</h3><div class="result-status neutral">○ ${escapeHtml(certification)}</div><p class="result-explanation">Certification is independent from ingredient assessment and is shown only when verified evidence exists.</p></div><div class="detail-section"><h3>Actual ingredients used</h3>${findings ? `<ul class="finding-list">${findings}</ul>` : '<p>Ingredient information is missing or incomplete.</p>'}</div><div class="detail-section"><h3>Data quality</h3><p>${escapeHtml(product.dataQuality)} · ${escapeHtml(result.date)}</p></div><details class="why-result"><summary>Why this result?</summary><p>${escapeHtml(result.analysis.explanation)}</p><ul class="finding-list">${findings}</ul></details></div></div>`;
  $('#result-view').querySelector('[data-action="close-result"]')?.addEventListener('click', () => route('home'));
  const reportPanel = document.createElement('section');
  reportPanel.className = 'detail-section';
  reportPanel.innerHTML = '<h3>'+escapeHtml(translate('Report a possible error'))+'</h3><p>'+escapeHtml(translate('This report stays on your device. Share it only with someone you trust.'))+'</p><button class="button button-secondary" type="button">'+escapeHtml(translate('Download review report'))+'</button>';
  reportPanel.querySelector('button')?.addEventListener('click', () => {
    const report = { version: 2, createdAt: new Date().toISOString(), product, analysis, policyVersion: window.universalHalalPolicy.version, purpose: 'Owner review of a potentially incorrect assessment; unverified user report' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'halalcheck-review.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#result-view .result-content').append(reportPanel);
  window.halalI18n.apply(state.language);
  route('result');
}

function showIdentityMismatch(barcode: string) {
  $('#result-view').innerHTML = `<button class="back-link" type="button" data-action="close-result">← Back to Home</button><div class="card" style="padding:28px"><p class="eyebrow">IDENTITY CHECK</p><h1>Product identity could not be verified</h1><p>The returned product barcode does not match scanned barcode ${escapeHtml(barcode)}. No ingredients were used and no classification was produced.</p></div>`;
  $('#result-view').querySelector('[data-action="close-result"]')?.addEventListener('click', () => route('home'));
  window.halalI18n.apply(state.language);
  route('result');
}

function renderGuide(query = '') {
  const term = window.halalAnalyzer.normalize(query);
  const records = window.ingredientDatabase.filter((record) => !term || [record.name, record.italian, record.category, ...record.aliases, ...Object.values(record.translations || {})].some((value) => window.halalAnalyzer.normalize(value).includes(term)));
  $('#guide-results').innerHTML = records.map((record) => `<article class="guide-card card"><span class="assessment ${record.assessmentCode}">${window.universalHalalPolicy.label(record.assessmentCode || 'needs-checking', state.language)}</span><h3>${window.universalHalalPolicy.translate(record, state.language)}</h3><small>${record.name} · ${record.category} · ID: ${record.id}</small><p>${record.explanation}</p><small>Also known as: ${record.aliases.slice(0, 4).join(', ')}</small></article>`).join('') || `<div class="card" style="padding:28px;text-align:center;color:var(--muted)">${window.halalI18n.get('No ingredient matched your search.', state.language)}</div>`;
  window.halalI18n.apply(state.language);
}

async function startCamera() {
  imageSequence++;
  ocrController?.abort();
  ocrController = null;
  window.halalAnalytics.track('scan_started');
  stopCamera();
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraMessage('Camera access is not supported in this browser. Use manual entry.');
    showToast('Camera is not supported here');
    return;
  }
  const sequence = cameraSequence;
  $('#start-camera').disabled = true;
  cameraMessage('Starting camera…');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: state.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (sequence !== cameraSequence) { stream.getTracks().forEach(track => track.stop()); return; }
    state.stream = stream;
    const video = $('#camera-preview');
    video.srcObject = stream;
    await video.play();
    if (sequence !== cameraSequence) return;
    $('#camera-placeholder').style.display = 'none';
    cameraMessage('Position a barcode inside the frame.');
    $('#start-camera').textContent = translate('Restart camera');
    const cameras = await navigator.mediaDevices.enumerateDevices?.().catch(() => []) || [];
    $('#switch-camera').disabled = cameras.filter(device => device.kind === 'videoinput').length < 2;
    const track = stream.getVideoTracks()[0];
    $('#flash-toggle').disabled = !track?.getCapabilities?.().torch;
    if ('BarcodeDetector' in window) {
      try {
        const required = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
        const supported = await window.BarcodeDetector!.getSupportedFormats?.() || required;
        const formats = required.filter(format => supported.includes(format));
        if (formats.length === required.length) state.detector = new window.BarcodeDetector!({ formats });
      } catch { /* Use bundled decoder when native support is incomplete. */ }
    }
    if (!state.detector) {
      cameraMessage('Loading barcode reader…');
      const decoder = await loadDecoder();
      if (sequence !== cameraSequence) return;
      state.detector = decoder.createVideoDecoder();
    }
    if (sequence !== cameraSequence) return;
    cameraMessage('Position a barcode inside the frame.');
    state.detecting = true;
    lastDetectionAt = 0;
    void detectBarcode();
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error(String(caught));
    if (sequence !== cameraSequence) return;
    stopCamera();
    cameraMessage(error.name === 'NotAllowedError' ? 'Camera permission was denied. Allow access or enter a barcode manually.' : 'Unable to start the camera. Try an image or manual entry.');
  } finally { $('#start-camera').disabled = false; }
}

function stopCamera() {
  cameraSequence++;
  state.detecting = false;
  state.detector = null;
  state.stream?.getTracks().forEach(track => track.stop());
  state.stream = null;
  torchEnabled = false;
  const video = $('#camera-preview');
  if (video) video.srcObject = null;
  $('#flash-toggle').disabled = true;
  $('#flash-toggle').setAttribute('aria-pressed', 'false');
  $('#switch-camera').disabled = true;
  $('#camera-placeholder').style.display = '';
}

async function detectBarcode() {
  if (!state.detecting || !state.detector || !$('#camera-preview').srcObject) return;
  const sequence = cameraSequence;
  const detector = state.detector;
  const video = $('#camera-preview');
  try {
    // Decode at most four frames per second after video data is available.
    if (video.readyState >= 2 && performance.now() - lastDetectionAt >= 240) {
      lastDetectionAt = performance.now();
      const detected = await detector.detect(video);
      if (!state.detecting || sequence !== cameraSequence || detector !== state.detector) return;
      const found = detected.find(result => window.productModel.isValidBarcode(result.rawValue));
      const barcode = found?.format === 'upc_e' ? (await loadDecoder()).expandUpce(found.rawValue) : found?.rawValue;
      if (sequence !== cameraSequence) return;
      if (barcode) { state.detecting = false; void showResult(barcode); return; }
    }
  } catch {
    if (detector.backend === 'wasm') {
      if (sequence !== cameraSequence) return;
      stopCamera();
      cameraMessage('Automatic detection failed. Try an image or manual entry.');
      return;
    }
    try {
      const decoder = await loadDecoder();
      if (sequence !== cameraSequence) return;
      state.detector = decoder.createVideoDecoder();
      cameraMessage('Position a barcode inside the frame.');
    } catch {
      if (sequence !== cameraSequence) return;
      stopCamera();
      cameraMessage('Automatic detection failed. Try an image or manual entry.');
      return;
    }
  }
  if (sequence === cameraSequence) window.requestAnimationFrame(() => void detectBarcode());
}

async function readBarcodeImage(event: Event) {
  ocrController?.abort();
  ocrController = null;
  const target = event.currentTarget as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  window.halalAnalytics.track('scan_started');
  stopCamera();
  const sequence = ++imageSequence;
  const status = $('#barcode-image-status');
  status.textContent = translate('Reading barcode image…');
  target.disabled = true;
  try {
    const decoder = await loadDecoder();
    const barcode = await decoder.decodeImage(file);
    if (sequence !== imageSequence) return;
    if (!barcode || !window.productModel.isValidBarcode(barcode)) throw Error('No retail barcode was found. Try a clearer photo or manual entry.');
    status.textContent = translate('Barcode found. Looking up product…');
    await showResult(barcode, 'image');
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error(String(caught));
    if (sequence === imageSequence) status.textContent = translate(error.message || 'This image could not be read. Choose another image.');
  } finally { target.value = ''; target.disabled = false; }
}

async function readIngredientImage(event: Event) {
  const target = event.currentTarget as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  stopCamera();
  ocrController?.abort();
  const controller = new AbortController();
  ocrController = controller;
  const sequence = ++imageSequence;
  ocrEvidence = null;
  $('#ocr-review').hidden = true;
  $('#confirm-ocr').disabled = true;
  $('#ocr-status').textContent = translate('Reading ingredient label locally…');
  target.disabled = true;
  try {
    const { recognizeLabel } = await import('/assets/ingredient-ocr.js');
    const result = await recognizeLabel(file, $('#ocr-language').value, progress => {
      if (sequence === imageSequence) $('#ocr-status').textContent = `${translate('Reading ingredient label locally…')} ${progress}%`;
    }, controller.signal);
    if (sequence !== imageSequence || controller.signal.aborted) return;
    $('#ocr-text').value = result.text;
    $('#ocr-complete').checked = false;
    $('#ocr-review').hidden = false;
    ocrEvidence = result;
    $('#ocr-status').textContent = translate(result.text ? 'Review every ingredient against the original label. Recognition may contain errors.' : 'No readable text was found. Type the complete ingredient list or try another image.');
    $('#ocr-text').focus();
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error(String(caught));
    if (sequence === imageSequence && !controller.signal.aborted) $('#ocr-status').textContent = translate(error.message || 'Label recognition failed. Type the ingredients manually.');
  } finally { target.value = ''; target.disabled = false; }
}

function updateOcrConfirmation() {
  $('#confirm-ocr').disabled = !ocrEvidence || !$('#ocr-complete').checked || $('#ocr-text').value.trim().length < 3;
}
function cancelRecognition() {
  imageSequence++;
  ocrController?.abort();
  ocrController = null;
  ocrEvidence = null;
  $('#ocr-text').value = '';
  $('#ocr-review').hidden = true;
  $('#confirm-ocr').disabled = true;
  $('#ocr-status').textContent = translate('Recognition cancelled. You can choose another image.');
}

$$('[data-route]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  route(link.dataset.route || 'home');
}));
$$('[data-action="open-scanner"]').forEach((button) => button.addEventListener('click', () => route('scanner')));
$$('[data-action="manual-entry"]').forEach((button) => button.addEventListener('click', () => { route('scanner'); $('#barcode-input').focus(); }));
$('[data-action="close-scanner"]').addEventListener('click', () => route('home'));
$('#start-camera').addEventListener('click', startCamera);
$$('[data-action="focus-live"]').forEach(button => button.addEventListener('click', () => void startCamera()));
$('#switch-camera').addEventListener('click', () => { state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment'; startCamera(); });
$('#flash-toggle').addEventListener('click', async () => {
  const track = state.stream?.getVideoTracks()[0];
  if (!track) return;
  try { torchEnabled = !torchEnabled; await track.applyConstraints({ advanced: [{ torch: torchEnabled }] }); $('#flash-toggle').setAttribute('aria-pressed', String(torchEnabled)); }
  catch { torchEnabled = false; $('#flash-toggle').disabled = true; showToast('Flashlight is not available on this camera.'); }
});
$('#barcode-image').addEventListener('change', readBarcodeImage);
$('#label-image').addEventListener('change', readIngredientImage);
$('#ocr-complete').addEventListener('change', updateOcrConfirmation);
$('#ocr-text').addEventListener('input', updateOcrConfirmation);
$('#cancel-ocr').addEventListener('click', cancelRecognition);
$('#confirm-ocr').addEventListener('click', () => {
  if ($('#confirm-ocr').disabled || !ocrEvidence) return;
  const text = $('#ocr-text').value.trim();
  $('#confirm-ocr').disabled = true;
  void showResult('manual-entry', 'ocr', text, { ocrConfidence: ocrEvidence.confidence / 100, ocrConfirmed: true, evidenceComplete: $('#ocr-complete').checked });
});
$('#barcode-form').addEventListener('submit', (event) => { event.preventDefault(); window.halalAnalytics.track('manual_lookup'); const barcode = $('#barcode-input').value.trim(); const ingredients = $('#ingredients-input').value.trim(); if (!window.productModel.isValidBarcode(barcode) && !ingredients) { showToast('Enter a barcode or ingredient list'); return; } showResult(barcode || 'manual-entry', 'manual'); });
$('#clear-history').addEventListener('click', () => { state.history = []; localStorage.removeItem('halalcheck-history'); renderHistory(); showToast('Scan history cleared'); });
function toggleTheme() { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('halalcheck-theme', document.documentElement.dataset.theme); }
$('#theme-toggle').addEventListener('click', toggleTheme);
$('#mobile-theme-toggle').addEventListener('click', toggleTheme);
$('#guide-search-input').addEventListener('input', (event) => renderGuide((event.currentTarget as HTMLInputElement).value));
$('#language-select').value = state.language;
$('#language-select').addEventListener('change', (event) => {
  state.language = (event.currentTarget as HTMLSelectElement).value;
  window.halalAnalytics.track('language_changed');
  localStorage.setItem('halalcheck-language', state.language);
  window.halalI18n.apply(state.language);
  renderGuide($('#guide-search-input').value);
  renderHistory();
  $$('#result-view [data-classification]').forEach((element) => { element.textContent = window.universalHalalPolicy.label(element.dataset.classification || 'needs-checking', state.language); });
  showToast('Language changed. The universal halal policy is unchanged.');
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event as BeforeInstallPromptEvent;
  $('#install-app').hidden = false;
});
$('#install-app').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('#install-app').hidden = true;
});
window.addEventListener('appinstalled', () => { installPrompt = null; $('#install-app').hidden = true; window.halalAnalytics.track('pwa_installed'); showToast('HalalCheck installed'); });
document.documentElement.dataset.theme = localStorage.getItem('halalcheck-theme') || 'light';
window.halalI18n.apply(state.language);
renderHistory();
renderGuide();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((registration) => {
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (worker) worker.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) showToast('A new version is available. Reload to update.'); });
  });
}).catch(() => {}));

window.halalAnalytics.track('page_opened');
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopCamera(); ocrController?.abort(); } });
window.addEventListener('pagehide', () => { stopCamera(); ocrController?.abort(); });

$('#privacy-settings').addEventListener('click', () => { $('#privacy-notice').hidden = false; });

export {};
