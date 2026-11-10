import {safeProductImage} from '../services/openFoodFacts';
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

interface ResultView { product: import('../models/productModel').Product | null; analysis: Analysis | null; status: string; barcode: string; source: string; stale?: boolean; retryAt?: number; }
let lastResult: ResultView | null = null;
async function showResult(barcode: string, source = 'camera', ingredientOverride: string | null = null, analysisOptions: AnalysisOptions = {}) {
  const sequence = ++lookupSequence;
  stopCamera();
  if (source === 'camera' || source === 'image') window.halalAnalytics.track('barcode_completed');
  const manualIngredients = ingredientOverride ?? (source === 'manual' ? $('#ingredients-input').value.trim() : '');
  const button = $('#barcode-form button[type=submit]'); button.disabled = true; cameraMessage('Looking up product…');
  let lookup: import('../services/openFoodFacts').LookupResult | {status:'user-provided'};
  try { lookup = manualIngredients ? {status:'user-provided'} : await window.productRepository.lookup(barcode,{language:state.language}); }
  catch { lookup = {status:'lookup-failed'}; }
  finally { button.disabled = false; }
  if (sequence !== lookupSequence) return;
  let product = lookup.status==='verified' ? lookup.product : null;
  if (manualIngredients) product = window.productModel.createProduct({scannedBarcode:barcode,returnedBarcode:barcode,productName:'Manual ingredient assessment',brand:'',ingredientsRaw:manualIngredients,ingredientDataSource:source==='ocr'?'user_confirmed_ocr':'user_corrected',dataQuality:'user-provided'});
  if (!manualIngredients) window.halalAnalytics.track(lookup.status==='verified'?'lookup_succeeded':'lookup_failed');
  const stale = lookup.status==='verified' && lookup.stale;
  const complete = product?.ingredientEvidence ? product.ingredientEvidence.state==='complete' : !!manualIngredients;
  const analysis = product ? window.halalAnalyzer.analyze(product.ingredients,{language:state.language,certified:product.certification==='verified',...analysisOptions,evidenceComplete:analysisOptions.evidenceComplete!==false && complete && !stale}) : null;
  if (analysis) { window.halalAnalytics.track('analysis_completed'); saveHistory({name:product!.productName||'Product information',status:analysis.label,statusClass:analysis.classification==='likely-halal'?'verified':analysis.classification==='not-halal'?'review':'unknown',date:new Intl.DateTimeFormat(state.language,{dateStyle:'medium'}).format(new Date()),barcode,analysis,ingredientDataSource:product!.ingredientDataSource}); }
  lastResult={product,analysis,status:lookup.status,barcode,source,stale,retryAt:'retryAt' in lookup?lookup.retryAt:undefined};
  renderResult(lastResult);route('result');
}
function renderResult(view:ResultView) {
  const {product,analysis}=view;
  const classification=analysis?.classification||'needs-checking';
  const status=window.universalHalalPolicy.label(classification,state.language);
  let explanation = classification==='not-halal'?'A prohibited ingredient was identified.':classification==='likely-halal'?'Ingredients support a Halal assessment.':'Some ingredients need checking.';
  if(!product)explanation=view.status==='not-found'?'Try an ingredient label or enter ingredients.':view.status==='rate-limited'?'Too many requests. Please wait before trying again.':'Product lookup unavailable. Try again later.';
  else if(!product.ingredients.length)explanation='Ingredients unavailable.';
  else if(product.ingredientEvidence?.state==='conflicting')explanation='Ingredient information conflicts.';
  else if(product.ingredientEvidence?.state==='partial')explanation='The ingredient list may be incomplete.';
  else if(analysis?.recognitionUncertain)explanation='Image recognition is uncertain. Confirm or correct the complete ingredient list before relying on this assessment.';
  if(view.stale)explanation='Saved product data. Check current packaging.';
  const name=product?.productName ? (view.source==='ocr'||product.ingredientDataSource==='user_corrected'?translate(product.productName):product.productName) : translate(view.status==='not-found'?'Product not found.':product?'Product information':'Product lookup unavailable. Try again later.');
  const findings=analysis?.findings.map(f=>'<li><strong data-no-translate>'+escapeHtml(f.ingredient)+'</strong><span>'+escapeHtml(translate(f.record?.explanation||f.explanation||'Unknown ingredient'))+'</span></li>').join('')||'';
  const image=safeProductImage(product?.imageUrl);
  $('#result-view').innerHTML='<div class="simple-result"><div class="result-photo">'+(image?'<img id="product-photo" src="'+escapeHtml(image)+'" alt="'+escapeHtml(name)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="240" height="240">':'')+'<span id="product-photo-fallback" '+(image?'hidden':'')+'>'+escapeHtml(translate('Product image unavailable'))+'</span></div><div class="result-content"><h1 data-no-translate>'+escapeHtml(name)+'</h1>'+(product?.brand?'<p class="result-brand" data-no-translate>'+escapeHtml(product.brand)+'</p>':'')+'<section class="assessment-card" data-classification="'+escapeHtml(classification)+'"><strong>'+escapeHtml(status)+'</strong><p>'+escapeHtml(translate(explanation))+'</p></section>'+(product?.certification==='verified'?'<small class="certification">'+escapeHtml(translate('Certified halal'))+'</small>':product?.sourceLabels?.includes('en:halal')?'<small class="certification">'+escapeHtml(translate('Certification not verified'))+'</small>':'')+'<div class="button-row"><button type="button" class="button button-primary" data-action="scan-another">'+escapeHtml(translate('Scan another product'))+'</button>'+(!product||!product.ingredients.length||classification==='needs-checking'||classification==='not-enough-information'?'<button type="button" class="button button-secondary" data-action="label-fallback">'+escapeHtml(translate('Scan ingredient label'))+'</button><button type="button" class="button button-secondary" data-action="manual-fallback">'+escapeHtml(translate('Enter ingredients'))+'</button>':'')+(!product?'<button type="button" class="button button-secondary" data-action="retry-product">'+escapeHtml(translate('Retry'))+'</button>':'')+'</div>'+((findings||product)?'<details class="why-result"><summary>'+escapeHtml(translate('Why?'))+'</summary><p>'+escapeHtml(translate(analysis?.explanation||'Ingredients unavailable.'))+'</p>'+(product?.ingredientEvidence?.language?'<small>'+escapeHtml(translate('Ingredient label language'))+': '+escapeHtml(product.ingredientEvidence.language)+'</small>':'')+'<ul class="finding-list">'+findings+'</ul><p>'+escapeHtml(translate('Ingredient assessment is not certification. Check current packaging.'))+'</p></details>':'')+(product?.ingredientDataSource==='Open Food Facts'?'<p class="source-credit"><a href="https://world.openfoodfacts.org/product/'+escapeHtml(product.returnedBarcode)+'" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Open Food Facts</a> &middot; <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">ODbL</a>'+(image?' &middot; <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA</a>':'')+'</p>':'')+'</div></div>';
  $('#result-view').querySelector<HTMLImageElement>('#product-photo')?.addEventListener('error',event=>{(event.currentTarget as HTMLImageElement).hidden=true;$('#product-photo-fallback').hidden=false;},{once:true});
  $('#result-view').querySelector('[data-action="scan-another"]')?.addEventListener('click',()=>{ $('#ingredients-input').value='';route('scanner'); });
  $('#result-view').querySelector('[data-action="label-fallback"]')?.addEventListener('click',()=>{route('scanner');$('#label-image').focus();$('#label-image').scrollIntoView({block:'center'});});
  $('#result-view').querySelector('[data-action="manual-fallback"]')?.addEventListener('click',()=>{route('scanner');$('#ingredients-input').value='';$('#ingredients-input').focus();});
  const retry=$('#result-view').querySelector<HTMLButtonElement>('[data-action="retry-product"]');
  if(retry){retry.disabled=!!view.retryAt&&view.retryAt>Date.now();if(retry.disabled)setTimeout(()=>{if(retry.isConnected)retry.disabled=false;},Math.min(2147483647,view.retryAt!-Date.now()));retry.addEventListener('click',()=>{retry.disabled=true;void showResult(view.barcode,view.source);});}
  window.halalI18n.apply(state.language);
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
  if(lastResult)renderResult(lastResult);
  showToast('Language changed. The ingredient policy is unchanged.');
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
