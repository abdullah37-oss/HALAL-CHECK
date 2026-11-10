const $ = (selector) => document.querySelector(selector);
let client = null;
let activeToken = null;
let revision = 0;
let controller = null;
let inFlightKey = null;
let authorized = false;
let passwordSetup = ['invite', 'recovery'].includes(new URLSearchParams(location.hash.slice(1)).get('type'));
const config = window.halalAdminConfig;
const emptyMessage = $('#empty').textContent;

function clearReports() {
  $('#cards').replaceChildren();
  $('#data').textContent = '';
  $('#data').hidden = true;
  $('#empty').hidden = true;
  $('#empty').textContent = emptyMessage;
}
function showSignedOut(message = '') {
  revision++;
  controller?.abort();
  activeToken = null;
  inFlightKey = null;
  authorized = false;
  clearReports();
  $('#auth-panel').hidden = false;
  $('#password-panel').hidden = true;
  $('#dashboard').hidden = true;
  $('#sign-out').hidden = true;
  $('#auth-error').textContent = message;
  $('#auth-status').textContent = '';
  $('#password').value = '';
  $('#new-password').value = '';
  $('#confirm-password').value = '';
  $('#password-error').textContent = '';
  $('#auth-submit').disabled = !client;
}
function render(stats) {
  const counts = stats.eventCounts || {};
  $('#cards').innerHTML = [
    ['Recorded events', stats.totalEvents || 0],
    ['Browser sessions', stats.sessions || 0],
    ['Page opens', counts.page_opened || 0],
    ['Barcode completions', counts.barcode_completed || 0],
    ['Manual searches', counts.manual_lookup || 0],
    ['Analyses', counts.analysis_completed || 0],
    ['Failed lookups', counts.lookup_failed || 0],
    ['Guide opens', counts.guide_opened || 0]
  ].map(([label, value]) => `<article><small>${label}</small><strong>${Number.isFinite(Number(value)) ? Number(value) : 0}</strong></article>`).join('');
  $('#empty').hidden = stats.totalEvents > 0;
  $('#data').hidden = stats.totalEvents === 0;
  $('#data').textContent = stats.totalEvents
    ? `Daily activity\n${Object.entries(stats.dailyActivity || {}).map(([day, count]) => `${day} ${'▇'.repeat(Math.min(count, 40))} ${count}`).join('\n')}`
    : '';
  if (stats.totalEvents) $('#data').textContent += '\n\nEvent breakdown\n' + JSON.stringify(counts, null, 2) + '\n\nLanguages\n' + JSON.stringify(stats.languages || {}, null, 2) + '\n\nDevices\n' + JSON.stringify(stats.devices || {}, null, 2);
  $('#dashboard-status').textContent = stats.totalEvents ? 'Statistics loaded.' : 'No recorded events in this period.';
}

async function loadStats(session, force = false) {
  const token = session?.access_token;
  if (!token) return showSignedOut($('#auth-error').textContent);
  if (passwordSetup) {
    activeToken = token;
    $('#auth-panel').hidden = true;
    $('#dashboard').hidden = true;
    $('#password-panel').hidden = false;
    $('#sign-out').hidden = false;
    return;
  }
  const key = `${token}:${$('#range').value}`;
  if (!force && (inFlightKey === key || (activeToken === token && authorized))) return;
  controller?.abort();
  controller = new AbortController();
  const requestController = controller;
  const version = ++revision;
  const sameOwner = authorized && activeToken === token;
  activeToken = token;
  inFlightKey = key;
  clearReports();
  $('#auth-submit').disabled = true;
  $('#auth-error').textContent = '';
  $('#auth-status').textContent = 'Checking dashboard access...';
  $('#dashboard-status').textContent = 'Loading statistics...';
  $('#sign-out').hidden = false;
  if (!sameOwner) { $('#auth-panel').hidden = false; $('#dashboard').hidden = true; }
  const timeout = setTimeout(() => requestController.abort(), 10000);
  try {
    const response = await fetch(`${config.value.statsEndpoint}?days=${encodeURIComponent($('#range').value)}`, { headers: { Authorization: `Bearer ${token}` }, signal: requestController.signal, cache: 'no-store' });
    if (version !== revision) return;
    if (response.status === 401 || response.status === 403) {
      showSignedOut(response.status === 401 ? 'Your session has expired. Sign in again.' : 'This account is not authorized to view the owner dashboard.');
      try { await client.auth.signOut({ scope: 'local' }); } catch { /* Private UI is already cleared. */ }
      return;
    }
    if (!response.ok) throw new Error('Reporting unavailable');
    const stats = await response.json();
    if (version !== revision) return;
    if (!stats || !Number.isFinite(stats.totalEvents) || stats.totalEvents < 0 || typeof stats.eventCounts !== 'object' || stats.eventCounts === null || Array.isArray(stats.eventCounts)) throw new Error('Invalid statistics');
    render(stats);
    authorized = true;
    $('#auth-panel').hidden = true;
    $('#password-panel').hidden = true;
    $('#dashboard').hidden = false;
  } catch {
    if (version !== revision) return;
    const message = 'Statistics could not be loaded. Check your connection and try again.';
    if (sameOwner) $('#dashboard-status').textContent = message;
    else { $('#auth-error').textContent = message; $('#auth-status').textContent = ''; }
  } finally {
    clearTimeout(timeout);
    if (version === revision) { inFlightKey = null; $('#auth-submit').disabled = false; }
  }
}

$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || $('#auth-submit').disabled) return;
  $('#auth-submit').disabled = true;
  $('#auth-error').textContent = '';
  $('#auth-status').textContent = 'Signing in...';
  try {
    const { data, error } = await client.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value });
    $('#password').value = '';
    if (error || !data?.session?.access_token) {
      const message = error?.message?.toLowerCase().includes('invalid login credentials')
        ? 'Sign-in failed. If you have not set a password from your invitation, use the password setup link below.'
        : 'Sign-in failed. Check your email and password and try again.';
      showSignedOut(message);
      return;
    }
    await loadStats(data.session);
  } catch { showSignedOut('Unable to sign in. Check your connection and try again.'); }
  finally { if (!inFlightKey) $('#auth-submit').disabled = !client; }
});

$('#reset-password').addEventListener('click', async () => {
  if (!client || $('#reset-password').disabled) return;
  const email = $('#email').value.trim();
  if (!email) {
    $('#auth-error').textContent = 'Enter your administrator email first.';
    return;
  }
  $('#reset-password').disabled = true;
  $('#auth-error').textContent = '';
  $('#auth-status').textContent = 'Sending password setup instructions...';
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/reset-password/` });
    $('#auth-status').textContent = error
      ? 'Password setup instructions could not be sent. Check the email address and try again.'
      : 'If an account exists for this email, password setup instructions have been sent.';
  } catch {
    $('#auth-status').textContent = 'Password setup instructions could not be sent. Check your connection and try again.';
  } finally {
    $('#reset-password').disabled = false;
  }
});

$('#sign-out').addEventListener('click', async () => {
  const authClient = client;
  passwordSetup = false;
  showSignedOut();
  try {
    const { error } = await authClient.auth.signOut({ scope: 'local' });
    if (error) $('#auth-error').textContent = 'Signed out on this device. Server session revocation could not be confirmed.';
  } catch { $('#auth-error').textContent = 'Signed out on this device. Server session revocation could not be confirmed.'; }
});

$('#password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = $('#new-password').value;
  if (password.length < 12 || password !== $('#confirm-password').value) { $('#password-error').textContent = 'Use at least 12 characters and enter the same password twice.'; return; }
  const button = $('#password-form button');
  button.disabled = true;
  try {
    const { error } = await client.auth.updateUser({ password });
    if (error) { $('#password-error').textContent = 'Unable to save your password. Use a fresh secure link or try again.'; return; }
    $('#new-password').value = '';
    $('#confirm-password').value = '';
    passwordSetup = false;
    const { data: { session } } = await client.auth.getSession();
    await loadStats(session, true);
  } catch { $('#password-error').textContent = 'Unable to save your password. Check your connection and try again.'; }
  finally { button.disabled = false; }
});

$('#range').addEventListener('change', async () => {
  if (!client || !activeToken) return;
  try { const { data: { session } } = await client.auth.getSession(); await loadStats(session, true); }
  catch { showSignedOut('Your session could not be restored. Sign in again.'); }
});

async function initialize() {
  if (!config?.ready) { showSignedOut('Admin sign-in is unavailable because this deployment is not configured.'); return; }
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    client = createClient(config.value.url, config.value.key, { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
    $('#auth-submit').disabled = false;
    $('#reset-password').disabled = false;
    $('#auth-status').textContent = '';
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') passwordSetup = true;
      // Run outside the SDK's Auth lock; never await SDK calls inside its callback.
      setTimeout(() => loadStats(session).catch(() => showSignedOut('Your session could not be restored. Sign in again.')), 0);
    });
    const { data: { session }, error } = await client.auth.getSession();
    if (error) return showSignedOut('Your session could not be restored. Sign in again.');
    await loadStats(session);
  } catch { client = null; showSignedOut('Unable to load secure sign-in. Check your connection and reload.'); }
}
initialize();
