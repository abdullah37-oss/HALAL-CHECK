// Browser-run integration checks. Load config.js and analytics.js before executing this file.
async function runSupabaseAnalyticsTests() {
  const analytics = window.halalAnalytics;
  const originalFetch = window.fetch;
  const calls = [];
  window.fetch = (...args) => { calls.push(args); return Promise.resolve({ ok: true }); };
  sessionStorage.removeItem('halalcheck-analytics-session');
  localStorage.removeItem(analytics.consentKey);
  await analytics.track('page_opened');
  if (calls.length !== 0) throw new Error('Analytics was sent before consent');
  if (sessionStorage.getItem('halalcheck-analytics-session')) throw new Error('Analytics session was created before consent');
  if (!window.HALALCHECK_ANALYTICS_ENDPOINT) {
    window.fetch = originalFetch;
    return 'Consent gating test passed; post-consent delivery skipped because no endpoint is configured.';
  }
  localStorage.setItem(analytics.consentKey, 'granted');
  await analytics.track('page_opened');
  if (calls.length !== 1) throw new Error('Analytics was not sent after consent');
  window.fetch = originalFetch;
  return 'Consent gating test passed';
}

function runSupabaseConfigurationTests() {
  const configSource = document.querySelector('script[src="config.js"]');
  if (!configSource) throw new Error('Public runtime config is not loaded by index.html');
  const source = configSource.getAttribute('src');
  if (source !== 'config.js') throw new Error('Unexpected runtime config source');
  if (Object.keys(window).some((key) => /SERVICE_ROLE|SECRET|PRIVATE_KEY/i.test(key))) throw new Error('Secret-shaped frontend configuration detected');
  return 'Frontend configuration safety tests passed';
}

function runSupabaseSecuritySourceTests() {
  const source = document.querySelector('script[src="analytics.js"]');
  if (!source) throw new Error('Analytics source is not loaded');
  if (sessionStorage.getItem('halalcheck-analytics-session') && localStorage.getItem('halalcheck-analytics-consent') !== 'granted') throw new Error('Analytics session exists without consent');
  return 'Frontend consent security checks passed';
}
