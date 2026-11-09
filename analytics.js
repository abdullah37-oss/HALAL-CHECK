window.halalAnalytics = (() => {
  const endpoint = window.HALALCHECK_ANALYTICS_ENDPOINT || '';
  const consentKey = 'halalcheck-analytics-consent';
  const sessionKey = 'halalcheck-analytics-session';
  const allowedEvents = new Set(['page_opened', 'scan_started', 'barcode_completed', 'manual_lookup', 'lookup_succeeded', 'lookup_failed', 'guide_opened', 'language_changed', 'pwa_installed', 'analysis_completed']);
  const deviceCategory = matchMedia('(max-width: 600px)').matches ? 'mobile' : matchMedia('(max-width: 1024px)').matches ? 'tablet' : 'desktop';
  const recentEvents = new Map();
  function hasConsent() { return localStorage.getItem(consentKey) === 'granted'; }
  function getSessionHash() {
    if (!hasConsent()) return null;
    const existing = sessionStorage.getItem(sessionKey);
    if (existing) return existing;
    const sessionHash = (crypto.randomUUID?.().replace(/-/g, '') || `${Date.now()}${Math.random().toString(36).slice(2)}`).padEnd(32, '0');
    sessionStorage.setItem(sessionKey, sessionHash);
    return sessionHash;
  }
  async function track(eventName, metadata = {}) {
    if (!endpoint || !hasConsent() || !allowedEvents.has(eventName) || typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return;
    const sessionHash = getSessionHash();
    if (!sessionHash) return;
    const now = Date.now();
    if (now - (recentEvents.get(eventName) || 0) < 1000) return;
    recentEvents.set(eventName, now);
    const payload = { eventName, sessionHash, pagePath: location.pathname.startsWith('/admin') ? '/admin/' : '/', language: localStorage.getItem('halalcheck-language') || 'en', deviceCategory, referrerHost: document.referrer ? new URL(document.referrer).hostname : null, metadata: {} };
    if (JSON.stringify(payload).length > 8192) return;
    try { await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }); } catch { /* Analytics must never affect the application. */ }
  }
  return { track, hasConsent, consentKey, allowedEvents };
})();
