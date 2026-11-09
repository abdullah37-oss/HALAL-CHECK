import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const configured = window.HALALCHECK_SUPABASE_URL && window.HALALCHECK_SUPABASE_ANON_KEY;
const client = configured ? createClient(window.HALALCHECK_SUPABASE_URL, window.HALALCHECK_SUPABASE_ANON_KEY) : null;
const $ = (selector) => document.querySelector(selector);

function showSignedOut(message = '') {
  $('#auth-panel').hidden = false;
  $('#dashboard').hidden = true;
  $('#sign-out').hidden = true;
  $('#auth-error').textContent = message;
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

async function loadStats() {
  $('#dashboard-status').textContent = 'Loading statistics...';
  if (!client || !window.HALALCHECK_ADMIN_STATS_ENDPOINT) {
    $('#empty').hidden = false;
    $('#empty').textContent = 'Admin backend is not configured. Set the public Supabase configuration and statistics endpoint before use.';
    return;
  }
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) return showSignedOut();
  const response = await fetch(`${window.HALALCHECK_ADMIN_STATS_ENDPOINT}?days=${encodeURIComponent($('#range').value)}`, {
    headers: { Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(10000), cache: 'no-store'
  });
  if (response.status === 401 || response.status === 403) {
    await client.auth.signOut();
    return showSignedOut('This account is not authorized to view the owner dashboard.');
  }
  if (!response.ok) throw new Error('Admin statistics request failed');
  render(await response.json());
}

$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client) { $('#auth-error').textContent = 'Supabase is not configured yet.'; return; }
  const { error } = await client.auth.signInWithPassword({ email: $('#email').value, password: $('#password').value });
  if (error) { $('#auth-error').textContent = 'Sign-in failed. Check the account details or contact the owner.'; return; }
  $('#auth-error').textContent = '';
  $('#auth-panel').hidden = true;
  $('#dashboard').hidden = false;
  $('#sign-out').hidden = false;
  loadStats().catch(() => { $('#dashboard-status').textContent = 'Statistics could not be loaded. Try another period or sign in again.'; });
});

$('#sign-out').addEventListener('click', () => client?.auth.signOut().then(() => location.reload()));

if (client) {
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) {
      $('#auth-panel').hidden = true;
      $('#dashboard').hidden = false;
      $('#sign-out').hidden = false;
      loadStats().catch(() => { $('#dashboard-status').textContent = 'Statistics could not be loaded. Try another period or sign in again.'; });
    } else showSignedOut();
  });
  client.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) {
      $('#auth-panel').hidden = true;
      $('#dashboard').hidden = false;
      $('#sign-out').hidden = false;
      loadStats().catch(() => { $('#dashboard-status').textContent = 'Statistics could not be loaded. Try another period or sign in again.'; });
    }
  });
}

$('#range').addEventListener('change', () => loadStats().catch(() => { $('#dashboard-status').textContent = 'Statistics could not be loaded. Try another period or sign in again.'; }));
