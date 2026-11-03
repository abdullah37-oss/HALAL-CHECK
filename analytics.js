window.halalAnalytics = (() => {
  const endpoint = window.HALALCHECK_ANALYTICS_ENDPOINT || '';
  const consentKey = 'halalcheck-analytics-consent';
  const sessionKey = 'halalcheck-analytics-session';
  const sessionHash = sessionStorage.getItem(sessionKey) || (crypto.randomUUID?.().replace(/-/g, '') || `${Date.now()}${Math.random()}`).padEnd(32, '0');
  sessionStorage.setItem(sessionKey, sessionHash);
  const deviceCategory = matchMedia('(max-width: 600px)').matches ? 'mobile' : matchMedia('(max-width: 1024px)').matches ? 'tablet' : 'desktop';
  function hasConsent() { return localStorage.getItem(consentKey) === 'granted'; }
  async function track(eventName, metadata = {}) {
    if (!endpoint || !hasConsent()) return;
    try { await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventName, sessionHash, pagePath: location.pathname, language: localStorage.getItem('halalcheck-language') || 'en', deviceCategory, referrerHost: document.referrer ? new URL(document.referrer).hostname : null, metadata }) }); } catch { /* Analytics must never affect the application. */ }
  }
  return { track, hasConsent, consentKey };
})();
