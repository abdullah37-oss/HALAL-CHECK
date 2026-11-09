const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let legacyHistory = [];
try { const saved = JSON.parse(localStorage.getItem('halalcheck-history') || '[]'); if (Array.isArray(saved)) legacyHistory = saved.filter((item) => item && typeof item === 'object'); } catch { /* Ignore corrupted local history. */ }
const migratedLegacyHistory = legacyHistory.filter((item) => item.modelVersion !== 2);
if (migratedLegacyHistory.length) localStorage.setItem('halalcheck-history-legacy-v1', JSON.stringify(migratedLegacyHistory));
const state = { stream: null, facingMode: 'environment', detector: null, detecting: false, language: localStorage.getItem('halalcheck-language') || 'en', history: legacyHistory.filter((item) => item.modelVersion === 2) };
if (migratedLegacyHistory.length) localStorage.setItem('halalcheck-history', JSON.stringify(state.history));
if (!window.halalI18n.supported.includes(state.language)) state.language = 'en';
let installPrompt;
let lookupSequence = 0;
let cameraSequence = 0;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
if (!localStorage.getItem(window.halalAnalytics.consentKey)) $('#privacy-notice').hidden = false;
$('#accept-analytics').addEventListener('click', () => { localStorage.setItem(window.halalAnalytics.consentKey, 'granted'); $('#privacy-notice').hidden = true; window.halalAnalytics.track('page_opened'); });
$('#decline-analytics').addEventListener('click', () => { sessionStorage.removeItem('halalcheck-analytics-session'); localStorage.setItem(window.halalAnalytics.consentKey, 'denied'); $('#privacy-notice').hidden = true; });

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = window.halalI18n.get(message, state.language);
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function saveHistory(item) {
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
  $('#verified-count').textContent = state.history.filter((item) => item.statusClass === 'verified').length;
  $('#review-count').textContent = state.history.filter((item) => item.statusClass !== 'verified').length;
  $('#total-count').textContent = state.history.length;
}

function route(view) {
  if (view !== "result") lookupSequence++;
  stopCamera();
  $$('.view').forEach((section) => section.classList.toggle('active-view', section.dataset.view === view));
  $$('[data-route]').forEach((link) => link.classList.toggle('active', link.dataset.route === view));
  if (view === 'scanner') $('#scanner-view').classList.add('active-view');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'guide') window.halalAnalytics.track('guide_opened');
}

async function showResult(barcode, source = 'camera') {
  const sequence = ++lookupSequence;
  stopCamera();
  if (source === 'camera') window.halalAnalytics.track('barcode_completed');
  const lookup = window.productRepository.getByBarcode(barcode);
  const manualIngredients = $('#ingredients-input')?.value.trim() || '';
  if (lookup.status === 'identity-mismatch') { window.halalAnalytics.track('lookup_failed', { reason: 'identity-mismatch' }); return showIdentityMismatch(barcode); }
  const product = lookup.status === 'verified' ? lookup.product : window.productModel.createProduct({
    scannedBarcode: barcode,
    returnedBarcode: barcode,
    productName: 'Manual ingredient assessment',
    brand: 'User supplied',
    ingredientsRaw: manualIngredients,
    ingredientDataSource: 'user_corrected',
    dataQuality: manualIngredients ? 'user-provided' : 'missing'
  });
  window.halalAnalytics.track(lookup.status === 'verified' ? 'lookup_succeeded' : 'lookup_failed');
  const analysis = window.halalAnalyzer.analyze(product.ingredients, { language: state.language, certified: product.certification === 'verified' });
  window.halalAnalytics.track('analysis_completed');
  const result = {
    name: product.productName,
    brand: `${product.brand} · Scanned ${escapeHtml(product.scannedBarcode)}`,
    status: analysis.label,
    statusClass: analysis.classification === 'likely-halal' ? 'verified' : analysis.classification === 'not-halal' ? 'review' : 'unknown',
    date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date()),
    barcode: product.scannedBarcode, analysis, ingredientDataSource: product.ingredientDataSource
  };
  saveHistory(result);
  const findings = result.analysis.findings.map((finding) => `<li><strong>${escapeHtml(finding.ingredient)}</strong> — ${escapeHtml(finding.record?.name || 'Unknown ingredient')}: ${escapeHtml(finding.record?.explanation || finding.explanation)}<small>Source: ${escapeHtml(finding.source || product.ingredientDataSource)}</small></li>`).join('');
  const certification = product.certification === 'verified' ? window.universalHalalPolicy.label(window.universalHalalPolicy.classifications.CERTIFIED_HALAL, state.language) : 'Certification not verified';
  $('#result-view').innerHTML = `<button class="back-link" type="button" data-action="close-result">← Back to overview</button><div class="result-layout"><div class="result-product-image" aria-label="Product image unavailable">▣</div><div class="result-content"><p class="eyebrow">SCAN RESULT</p><h1>${escapeHtml(result.name)}</h1><p class="brand-line">${escapeHtml(result.brand)}</p><div class="detail-section"><h3>Product identity</h3><p>Scanned barcode: <strong>${escapeHtml(product.scannedBarcode)}</strong> · Returned barcode: <strong>${escapeHtml(product.returnedBarcode)}</strong></p><p>${lookup.status === 'verified' ? 'Catalogue barcode match' : 'Product identity not verified'} · Data source: ${escapeHtml(product.ingredientDataSource)}</p></div><div class="detail-section"><h3>Ingredient assessment</h3><div class="result-status" data-classification="${escapeHtml(analysis.classification)}">○ ${escapeHtml(result.status)}</div><p class="result-explanation">${escapeHtml(result.analysis.explanation)}</p></div><div class="detail-section"><h3>Certification status</h3><div class="result-status neutral">○ ${escapeHtml(certification)}</div><p class="result-explanation">Certification is independent from ingredient assessment and is shown only when verified evidence exists.</p></div><div class="detail-section"><h3>Actual ingredients used</h3>${findings ? `<ul class="finding-list">${findings}</ul>` : '<p>Ingredient information is missing or incomplete.</p>'}</div><div class="detail-section"><h3>Data quality</h3><p>${escapeHtml(product.dataQuality)} · ${escapeHtml(result.date)}</p></div><details class="why-result"><summary>Why this result?</summary><p>${escapeHtml(result.analysis.explanation)}</p><ul class="finding-list">${findings}</ul></details></div></div>`;
  $('#result-view').querySelector('[data-action="close-result"]').addEventListener('click', () => route('home'));
  window.halalI18n.apply(state.language);
  route('result');
}

function showIdentityMismatch(barcode) {
  $('#result-view').innerHTML = `<button class="back-link" type="button" data-action="close-result">← Back to overview</button><div class="card" style="padding:28px"><p class="eyebrow">IDENTITY CHECK</p><h1>Product identity could not be verified</h1><p>The returned product barcode does not match scanned barcode ${escapeHtml(barcode)}. No ingredients were used and no classification was produced.</p></div>`;
  $('#result-view').querySelector('[data-action="close-result"]').addEventListener('click', () => route('home'));
  window.halalI18n.apply(state.language);
  route('result');
}

function renderGuide(query = '') {
  const term = window.halalAnalyzer.normalize(query);
  const records = window.ingredientDatabase.filter((record) => !term || [record.name, record.italian, record.category, ...record.aliases, ...Object.values(record.translations)].some((value) => window.halalAnalyzer.normalize(value).includes(term)));
  $('#guide-results').innerHTML = records.map((record) => `<article class="guide-card card"><span class="assessment ${record.assessmentCode}">${window.universalHalalPolicy.label(record.assessmentCode, state.language)}</span><h3>${window.universalHalalPolicy.translate(record, state.language)}</h3><small>${record.name} · ${record.category} · ID: ${record.id}</small><p>${record.explanation}</p><small>Also known as: ${record.aliases.slice(0, 4).join(', ')}</small></article>`).join('') || `<div class="card" style="padding:28px;text-align:center;color:var(--muted)">${window.halalI18n.get('No ingredient matched your search.', state.language)}</div>`;
  window.halalI18n.apply(state.language);
}

async function startCamera() {
  window.halalAnalytics.track('scan_started');
  if (!navigator.mediaDevices?.getUserMedia) {
    $('#camera-message').textContent = 'Camera access is not supported in this browser. Use manual entry.';
    showToast('Camera is not supported here');
    return;
  }
  try {
    stopCamera();
    const sequence = cameraSequence;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: state.facingMode }, audio: false });
    if (sequence !== cameraSequence) { stream.getTracks().forEach((track) => track.stop()); return; }
    state.stream = stream;
    $('#camera-preview').srcObject = state.stream;
    $('#camera-placeholder').style.display = 'none';
    $('#camera-message').textContent = 'Position a barcode inside the frame.';
    $('#start-camera').textContent = 'Restart camera';
    $('#switch-camera').disabled = false;
    const track = state.stream.getVideoTracks()[0];
    $('#flash-toggle').disabled = !track.getCapabilities?.().torch;
    if ('BarcodeDetector' in window) {
      try {
        state.detector = new window.BarcodeDetector();
        state.detecting = true;
        detectBarcode();
      } catch {
        $('#camera-message').textContent = 'Camera ready. Enter the barcode manually if detection is unavailable.';
      }
    } else {
      $('#camera-message').textContent = 'Camera ready. Automatic barcode detection is not supported; enter the barcode manually.';
    }
  } catch (error) {
    $('#camera-message').textContent = error.name === 'NotAllowedError' ? 'Camera permission was denied. Allow access or enter a barcode manually.' : 'Unable to start the camera. Try manual entry.';
    showToast('Camera permission is required');
  }
}

function stopCamera() {
  cameraSequence++;
  state.detecting = false;
  state.detector = null;
  state.stream?.getTracks().forEach((track) => track.stop());
  state.stream = null;
  const video = $('#camera-preview');
  if (video) video.srcObject = null;
}

async function detectBarcode() {
  if (!state.detecting || !state.detector || !$('#camera-preview').srcObject) return;
  try {
    const detector = state.detector;
    const detected = await detector.detect($('#camera-preview'));
    if (!state.detecting || detector !== state.detector) return;
    if (detected.length && detected[0].rawValue) {
      state.detecting = false;
      if (!window.productModel.isValidBarcode(detected[0].rawValue)) { state.detecting = true; window.requestAnimationFrame(detectBarcode); return; }
      showResult(detected[0].rawValue);
      return;
    }
  } catch {
    state.detecting = false;
    $('#camera-message').textContent = 'Automatic detection failed. Enter the barcode manually.';
    return;
  }
  window.requestAnimationFrame(detectBarcode);
}

$$('[data-route]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  route(link.dataset.route);
}));
$$('[data-action="open-scanner"]').forEach((button) => button.addEventListener('click', () => route('scanner')));
$$('[data-action="manual-entry"]').forEach((button) => button.addEventListener('click', () => { route('scanner'); $('#barcode-input').focus(); }));
$('[data-action="close-scanner"]').addEventListener('click', () => route('home'));
$('#start-camera').addEventListener('click', startCamera);
$('#switch-camera').addEventListener('click', () => { state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment'; startCamera(); });
$('#flash-toggle').addEventListener('click', async () => { const track = state.stream?.getVideoTracks()[0]; if (track) await track.applyConstraints({ advanced: [{ torch: true }] }); });
$('#barcode-form').addEventListener('submit', (event) => { event.preventDefault(); window.halalAnalytics.track('manual_lookup'); const barcode = $('#barcode-input').value.trim(); const ingredients = $('#ingredients-input').value.trim(); if (!window.productModel.isValidBarcode(barcode) && !ingredients) { showToast('Enter a barcode or ingredient list'); return; } showResult(barcode || 'manual-entry', 'manual'); });
$('#clear-history').addEventListener('click', () => { state.history = []; localStorage.removeItem('halalcheck-history'); renderHistory(); showToast('Scan history cleared'); });
function toggleTheme() { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('halalcheck-theme', document.documentElement.dataset.theme); }
$('#theme-toggle').addEventListener('click', toggleTheme);
$('#mobile-theme-toggle').addEventListener('click', toggleTheme);
$('#guide-search-input').addEventListener('input', (event) => renderGuide(event.target.value));
$('#language-select').value = state.language;
$('#language-select').addEventListener('change', (event) => {
  state.language = event.target.value;
  window.halalAnalytics.track('language_changed');
  localStorage.setItem('halalcheck-language', state.language);
  window.halalI18n.apply(state.language);
  renderGuide($('#guide-search-input').value);
  renderHistory();
  $('#result-view [data-classification]').forEach((element) => { element.textContent = window.universalHalalPolicy.label(element.dataset.classification, state.language); });
  showToast('Language changed. The universal halal policy is unchanged.');
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
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
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });

$('#privacy-settings').addEventListener('click', () => { $('#privacy-notice').hidden = false; });
