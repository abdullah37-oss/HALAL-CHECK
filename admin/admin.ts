import type { SupabaseClient, Session } from '@supabase/supabase-js';
export {};
import type { AnalyticsSummary as AdminStats } from '../src/types/domain';
function $(selector: '#range' | '#admin-language' | '#activity-group'): HTMLSelectElement;
function $(selector: '#email' | '#password' | '#new-password' | '#confirm-password'): HTMLInputElement;
function $(selector: '#auth-submit' | '#reset-password' | '#sign-out' | '#password-form button'): HTMLButtonElement;
function $(selector: string): HTMLElement;
function $(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error('Missing administrator interface element');
  return element;
}
let client: SupabaseClient | null = null;
let activeToken: string | null = null;
let rejectedToken: string | null = null;
let rejectedMessage = '';
let revision = 0;
let controller: AbortController | null = null;
let inFlightKey: string | null = null;
let authorized = false;
let passwordSetup = ['invite', 'recovery'].includes(new URLSearchParams(location.hash.slice(1)).get('type') || '');
const config = window.halalAdminConfig;
const emptyMessage = $('#empty').textContent;
let latestStats: AdminStats | null = null;
let fetchedAt: Date | null = null;
let language = localStorage.getItem('halalcheck-language') || 'en';
if (!window.halalI18n?.supported.includes(language)) language = 'en';
const t = (key: string) => window.halalI18n?.get(key, language) || key;
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
const number = (value: number) => new Intl.NumberFormat(language).format(value);
const count = (value: unknown): number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
function setText(selector: string, key: string) { const element = $(selector); element.dataset.i18n = key; element.textContent = t(key); }
function applyLanguage() { window.halalI18n?.apply(language); }
$('#admin-language').value = language;
$('#admin-language').addEventListener('change', event => {
  language = (event.currentTarget as HTMLSelectElement).value;
  localStorage.setItem('halalcheck-language', language);
  applyLanguage();
  if (latestStats && authorized) render(latestStats);
});
applyLanguage();

function clearReports() {
  latestStats = null;
  fetchedAt = null;
  $('#cards').replaceChildren();
  $('#analytics-panels').hidden = true;
  for (const id of ['activity-chart', 'activity-table', 'outcome-chart', 'scanner-performance', 'event-breakdown', 'languages', 'devices']) $('#'+id).replaceChildren();
  setText('#freshness', '');
  setText('#data', '');
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
  setText('#auth-error', message);
  setText('#auth-status', '');
  $('#password').value = '';
  $('#new-password').value = '';
  $('#confirm-password').value = '';
  setText('#password-error', '');
  $('#auth-submit').disabled = !client;
}
﻿
function parseStats(value: unknown): AdminStats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid statistics');
  const raw = value as Record<string, unknown>;
  const validCount = (candidate: unknown): candidate is number => typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate >= 0;
  const parseCounts = (candidate: unknown, optional = false): Record<string, number> => {
    if (candidate === undefined && optional) return {};
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('Invalid aggregate map');
    const entries = Object.entries(candidate);
    if (entries.length > 1000 || entries.some(([key, amount]) => key.length > 160 || !validCount(amount))) throw new Error('Invalid aggregate values');
    return Object.fromEntries(entries) as Record<string, number>;
  };
  if (!validCount(raw.totalEvents) || !validCount(raw.sessions)) throw new Error('Invalid statistics count');
  return { totalEvents: raw.totalEvents, sessions: raw.sessions, eventCounts: parseCounts(raw.eventCounts), dailyActivity: parseCounts(raw.dailyActivity, true), languages: parseCounts(raw.languages, true), devices: parseCounts(raw.devices, true) };
}

function recordEntries(value: unknown): Array<[string, number]> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isSafeInteger(entry[1]) && entry[1] >= 0)
    : [];
}
function groupedActivity(stats: AdminStats): Array<[string, number]> {
  const grouping = $('#activity-group').value;
  const grouped = new Map<string, number>();
  for (const [day, amount] of recordEntries(stats.dailyActivity)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const date = new Date(day+'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== day) continue;
    if (grouping === 'weekly') date.setUTCDate(date.getUTCDate() - ((date.getUTCDay()+6)%7));
    if (grouping === 'monthly') date.setUTCDate(1);
    const bucket = date.toISOString().slice(0,10);
    grouped.set(bucket, (grouped.get(bucket) || 0) + amount);
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}
function renderActivity(stats: AdminStats) {
  const activity = groupedActivity(stats);
  if (!activity.length) {
    $('#activity-chart').innerHTML = `<p class="no-chart-data">${escapeHtml(t('No data'))}</p>`;
    $('#activity-table').replaceChildren();
    return;
  }
  const max = Math.max(4, ...activity.map(([, value]) => value));
  const width = 720, height = 245, left = 46, top = 15, chartWidth = 650, chartHeight = 185;
  const firstTime = Date.parse(activity[0][0]+'T00:00:00Z');
  const duration = Date.parse(activity[activity.length-1][0]+'T00:00:00Z')-firstTime;
  const points = activity.map(([day, value]) => [left + (duration === 0 ? chartWidth/2 : (Date.parse(day+'T00:00:00Z')-firstTime)/duration*chartWidth), top+chartHeight-value/max*chartHeight]);
  const line = points.map(([x,y],i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} L${points[points.length-1][0]},${top+chartHeight} L${points[0][0]},${top+chartHeight} Z`;
  const grid = [0,.25,.5,.75,1].map(fraction => `<line class="chart-grid" x1="${left}" x2="${width-20}" y1="${top+chartHeight-fraction*chartHeight}" y2="${top+chartHeight-fraction*chartHeight}"/><text class="chart-label" x="${left-10}" y="${top+chartHeight-fraction*chartHeight+4}" text-anchor="end">${escapeHtml(number(Math.round(fraction*max)))}</text>`).join('');
  const labels = activity.map(([day], index) => {
    if (activity.length > 7 && index % Math.ceil(activity.length/6) !== 0 && index !== activity.length-1) return '';
    const date = new Intl.DateTimeFormat(language, {month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(day+'T00:00:00Z'));
    return `<text class="chart-label" x="${points[index][0]}" y="${height-20}" text-anchor="middle">${escapeHtml(date)}</text>`;
  }).join('');
  const dots = points.map(([x,y], index) => `<circle class="chart-dot" cx="${x}" cy="${y}" r="3"><title>${activity[index][0]}: ${number(activity[index][1])}</title></circle>`).join('');
  $('#activity-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(t('Activity over time'))}"><defs><linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#16dfdf" stop-opacity=".24"/><stop offset="100%" stop-color="#16dfdf" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#activity-fill)"/><path d="${line}" class="chart-line"/>${dots}${labels}</svg>`;
  $('#activity-table').innerHTML = `<table><thead><tr><th>${escapeHtml(t('UTC activity buckets'))}</th><th>${escapeHtml(t('Events'))}</th></tr></thead><tbody>${activity.map(([day,value])=>`<tr><td>${day}</td><td>${number(value)}</td></tr>`).join('')}</tbody></table>`;
}
function renderBars(selector: string, values: unknown, labels: Record<string, string> = {}) {
  const entries = recordEntries(values).sort(([,a],[,b]) => b-a);
  const max = Math.max(1, ...entries.map(([,value])=>value));
  $(selector).innerHTML = entries.length ? entries.map(([label,value]) => `<div class="comparison-row"><span class="comparison-label">${escapeHtml(t(labels[label] || label))}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${Math.min(100,value/max*100)}%"></div></div><strong class="comparison-value">${number(value)}</strong></div>`).join('') : `<p class="no-chart-data">${escapeHtml(t('No data'))}</p>`;
}
function render(stats: AdminStats) {
  latestStats = stats;
  const counts = stats.eventCounts || {};
  const metrics: Array<[string, number, string]> = [
    ['Recorded visits', count(counts.page_opened), `${number(stats.totalEvents)} ${t('Recorded events')}`],
    ['Barcode scans', count(counts.barcode_completed), t('Barcode completions')],
    ['Manual searches', count(counts.manual_lookup), t('Recorded events')],
    ['Successful lookups', count(counts.lookup_succeeded), `${number(count(stats.sessions))} ${t('Browser sessions')}`]
  ];
  $('#cards').innerHTML = metrics.map(([label,value,detail]) => `<article><small>${escapeHtml(t(label))}</small><strong>${number(value)}</strong><span class="metric-detail">${escapeHtml(detail)}</span></article>`).join('');
  $('#empty').hidden = stats.totalEvents > 0;
  $('#analytics-panels').hidden = stats.totalEvents === 0;
  $('#data').hidden = true;
  setText('#dashboard-status', stats.totalEvents ? 'Statistics loaded.' : 'No recorded events in this period.');
  $('#freshness').textContent = fetchedAt ? `${t('Retrieved at')} ${new Intl.DateTimeFormat(language, {timeStyle:'short'}).format(fetchedAt)}` : '';
  if (!stats.totalEvents) return;
  renderActivity(stats);
  const success = count(counts.lookup_succeeded), failed = count(counts.lookup_failed), total = success+failed;
  $('#outcome-chart').innerHTML = total ? `<div class="donut" style="--success-share:${success/total*100}%" role="img" aria-label="${escapeHtml(t('Successful'))}: ${number(success)}; ${escapeHtml(t('Unsuccessful'))}: ${number(failed)}"><div class="donut-center"><strong>${number(total)}</strong><small>${escapeHtml(t('Recorded events'))}</small></div></div><ul class="chart-legend"><li><i class="legend-swatch"></i><span>${escapeHtml(t('Successful'))}<strong>${number(success)}</strong></span></li><li><i class="legend-swatch purple"></i><span>${escapeHtml(t('Unsuccessful'))}<strong>${number(failed)}</strong></span></li></ul>` : `<p class="no-chart-data">${escapeHtml(t('No data'))}</p>`;
  $('#scanner-performance').innerHTML = [
    ['Scan starts',number(count(counts.scan_started))],
    ['Barcode completions',number(count(counts.barcode_completed))],
    ['Camera failure rate',t('Not collected')]
  ].map(([label,value])=>`<div class="performance-metric"><small>${escapeHtml(t(label))}</small><strong>${escapeHtml(value)}</strong></div>`).join('');
  renderBars('#event-breakdown', counts, {page_opened:'Recorded visits',barcode_completed:'Barcode scans',scan_started:'Scan starts',manual_lookup:'Manual searches',lookup_succeeded:'Successful lookups',lookup_failed:'Unsuccessful',analysis_completed:'Analyses',guide_opened:'Guide opens',language_changed:'Language changes',pwa_installed:'App installations'});
  renderBars('#languages', stats.languages);
  renderBars('#devices', stats.devices, {desktop:'Desktop',mobile:'Mobile',tablet:'Tablet'});
}
$('#activity-group').addEventListener('change', () => { if (latestStats && authorized) renderActivity(latestStats); });


async function loadStats(session: Session | null, force = false) {
  const token = session?.access_token;
  if (!token) return showSignedOut($('#auth-error').textContent);
  // A queued SDK SIGNED_IN callback or the pending form response can arrive
  // after reporting rejected this same token. Keep it signed out and do not
  // clear the error or repeat reporting. A deliberate new sign-in resets it.
  if (token === rejectedToken) return showSignedOut(rejectedMessage);
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
  setText('#auth-error', '');
  setText('#auth-status', 'Checking dashboard access...');
  setText('#dashboard-status', 'Loading statistics...');
  $('#sign-out').hidden = false;
  if (!sameOwner) { $('#auth-panel').hidden = false; $('#dashboard').hidden = true; }
  const timeout = setTimeout(() => requestController.abort(), 10000);
  try {
    const response = await fetch(`${config?.ready ? config.value.statsEndpoint : ''}?days=${encodeURIComponent($('#range').value)}`, { headers: { Authorization: `Bearer ${token}` }, signal: requestController.signal, cache: 'no-store' });
    if (version !== revision) return;
    if (response.status === 401 || response.status === 403) {
      rejectedToken = token;
      rejectedMessage = response.status === 401 ? 'Your session has expired. Sign in again.' : 'This account is not authorized to view the owner dashboard.';
      showSignedOut(rejectedMessage);
      try { await client?.auth.signOut({ scope: 'local' }); } catch { /* Private UI is already cleared. */ }
      return;
    }
    if (!response.ok) throw new Error('Reporting unavailable');
    const stats = parseStats(await response.json() as unknown);
    if (version !== revision) return;
    fetchedAt = new Date();
    render(stats);
    authorized = true;
    $('#auth-panel').hidden = true;
    $('#password-panel').hidden = true;
    $('#dashboard').hidden = false;
  } catch {
    if (version !== revision) return;
    const message = 'Statistics could not be loaded. Check your connection and try again.';
    if (sameOwner) setText('#dashboard-status', message);
    else { setText('#auth-error', message); setText('#auth-status', ''); }
  } finally {
    clearTimeout(timeout);
    if (version === revision) { inFlightKey = null; $('#auth-submit').disabled = false; }
  }
}

$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || $('#auth-submit').disabled) return;
  rejectedToken = null;
  rejectedMessage = '';
  $('#auth-submit').disabled = true;
  setText('#auth-error', '');
  setText('#auth-status', 'Signing in...');
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
    setText('#auth-error', 'Enter your administrator email first.');
    return;
  }
  $('#reset-password').disabled = true;
  setText('#auth-error', '');
  setText('#auth-status', 'Sending password setup instructions...');
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/reset-password/` });
    setText('#auth-status', error ? ('Password setup instructions could not be sent. Check the email address and try again.') : 'If an account exists for this email, password setup instructions have been sent.');
  } catch {
    setText('#auth-status', 'Password setup instructions could not be sent. Check your connection and try again.');
  } finally {
    $('#reset-password').disabled = false;
  }
});

$('#sign-out').addEventListener('click', async () => {
  const authClient = client;
  passwordSetup = false;
  showSignedOut();
  try {
    const result = await authClient?.auth.signOut({ scope: 'local' });
    if (result?.error) setText('#auth-error', 'Signed out on this device. Server session revocation could not be confirmed.');
  } catch { setText('#auth-error', 'Signed out on this device. Server session revocation could not be confirmed.'); }
});

$('#password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client) return;
  const password = $('#new-password').value;
  if (password.length < 12 || password !== $('#confirm-password').value) { setText('#password-error', 'Use at least 12 characters and enter the same password twice.'); return; }
  const button = $('#password-form button');
  button.disabled = true;
  try {
    const { error } = await client.auth.updateUser({ password });
    if (error) { setText('#password-error', 'Unable to save your password. Use a fresh secure link or try again.'); return; }
    $('#new-password').value = '';
    $('#confirm-password').value = '';
    passwordSetup = false;
    const { data: { session } } = await client.auth.getSession();
    await loadStats(session, true);
  } catch { setText('#password-error', 'Unable to save your password. Check your connection and try again.'); }
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
    setText('#auth-status', '');
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
