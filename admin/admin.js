import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const configured = window.HALALCHECK_SUPABASE_URL && window.HALALCHECK_SUPABASE_ANON_KEY;
const client = configured ? createClient(window.HALALCHECK_SUPABASE_URL, window.HALALCHECK_SUPABASE_ANON_KEY) : null;
const $ = (selector) => document.querySelector(selector);
function render(events) {
  const counts = events.reduce((result, event) => { result[event.event_name] = (result[event.event_name] || 0) + 1; return result; }, {});
  $('#cards').innerHTML = [['Page opens', counts.page_opened || 0], ['Product scans', (counts.barcode_completed || 0) + (counts.manual_lookup || 0)], ['Failed lookups', counts.lookup_failed || 0], ['Guide opens', counts.guide_opened || 0]].map(([label, value]) => `<article><small>${label}</small><strong>${value}</strong></article>`).join('');
  $('#empty').hidden = events.length > 0;
  $('#data').hidden = !events.length;
  const daily = events.reduce((result, event) => { const day = event.occurred_at.slice(0, 10); result[day] = (result[day] || 0) + 1; return result; }, {});
  $('#data').textContent = events.length ? `Daily activity\n${Object.entries(daily).map(([day, count]) => `${day} ${'▇'.repeat(Math.min(count, 40))} ${count}`).join('\n')}\n\nRaw event rows\n${JSON.stringify(events, null, 2)}` : '';
}
async function loadStats() {
  if (!client || !window.HALALCHECK_ADMIN_STATS_ENDPOINT) { $('#empty').hidden = false; $('#empty').textContent = 'Admin backend is not configured. Set Supabase and Vercel environment values before collecting or viewing data.'; return; }
  const { data: { session } } = await client.auth.getSession();
  if (!session) return;
  const response = await fetch(`${window.HALALCHECK_ADMIN_STATS_ENDPOINT}?days=${encodeURIComponent($('#range').value)}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) throw new Error('Admin statistics request failed');
  render((await response.json()).events || []);
}
$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client) { $('#auth-error').textContent = 'Supabase is not configured yet.'; return; }
  const { error } = await client.auth.signInWithPassword({ email: $('#email').value, password: $('#password').value });
  if (error) { $('#auth-error').textContent = 'Sign-in failed.'; return; }
  $('#auth-panel').hidden = true; $('#dashboard').hidden = false; $('#sign-out').hidden = false; loadStats().catch(() => { $('#auth-error').textContent = 'Statistics could not be loaded.'; });
});
$('#sign-out').addEventListener('click', () => client?.auth.signOut().then(() => location.reload()));
if (client) client.auth.getSession().then(({ data: { session } }) => { if (session) { $('#auth-panel').hidden = true; $('#dashboard').hidden = false; $('#sign-out').hidden = false; loadStats(); } });
$('#range').addEventListener('change', () => loadStats().catch(() => {}));
