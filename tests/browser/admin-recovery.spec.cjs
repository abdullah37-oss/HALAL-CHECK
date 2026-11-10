const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const origin = 'https://anvswymarultvsbszjte.supabase.co';
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'owner@example.invalid', app_metadata: {}, user_metadata: {} };
const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'synthetic-signature'].join('.');
const callback = '#'+new URLSearchParams({ access_token: token, refresh_token: 'synthetic-refresh', expires_in: '3600', token_type: 'bearer', type: 'recovery' });
const stored = { access_token: token, refresh_token: 'synthetic-refresh', expires_at: Math.floor(Date.now()/1000)+3600, user };

async function realSdk(page, { invalid = false } = {}) {
  await page.addInitScript({ content: fs.readFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'utf8')+'\nwindow.supabase = supabase;' });
  await page.route('https://esm.sh/@supabase/supabase-js@2.119.0', route => route.fulfill({ contentType: 'text/javascript', body: 'export const createClient=(...args)=>window.supabase.createClient(...args);' }));
  // Every Supabase request is intercepted: no real emails or account updates.
  await page.route(origin+'/**', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'unexpected_test_request', msg: 'Unexpected test request' }) }));
  await page.route('**/auth/v1/user', route => route.fulfill({ status: invalid ? 401 : 200, contentType: 'application/json', body: JSON.stringify(invalid ? { code: 'bad_jwt', msg: 'Invalid or expired token' } : user) }));
  await page.route('**/auth/v1/logout*', route => route.fulfill({ status: 204 }));
}

test('regression: real SDK reproduces the original PKCE mismatch', async ({ page }) => {
  await realSdk(page);
  await page.goto('/admin/reset-password/');
  const result = await page.evaluate(async hash => {
    history.replaceState(null, '', location.pathname+hash);
    const client = window.supabase.createClient('https://example.supabase.co', 'synthetic-key', { auth: { flowType: 'pkce', persistSession: false, autoRefreshToken: false } });
    const { error } = await client.auth.initialize();
    return { name: error?.name, message: error?.message };
  }, callback);
  expect(result).toEqual({ name: 'AuthPKCEGrantCodeExchangeError', message: 'Not a valid PKCE flow url.' });
});

test('real SDK accepts recovery and saves once through authenticated updateUser', async ({ page }) => {
  await realSdk(page);
  let updates = 0, exchanges = 0, recoveries = 0;
  await page.route('**/auth/v1/token*', route => { exchanges++; return route.abort(); });
  await page.route('**/auth/v1/recover*', route => { recoveries++; return route.abort(); });
  await page.route('**/auth/v1/user', route => {
    if (route.request().method() === 'PUT') {
      updates++;
      expect(route.request().headers().authorization).toBe('Bearer '+token);
      expect(route.request().postDataJSON().password).toBe('synthetic-password-123');
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
  });
  await page.goto('/admin/reset-password/'+callback);
  await expect(page.locator('#password-form')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/reset-password\/$/);
  await page.locator('#new-password').fill('synthetic-password-123');
  await page.locator('#confirm-password').fill('synthetic-password-123');
  await page.locator('#password-form button').click();
  await expect(page.locator('#status')).toContainText('Password saved');
  expect(updates).toBe(1);
  expect(exchanges).toBe(0);
  expect(recoveries).toBe(0);
  await expect(page.locator('#password-form')).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sb-anvswymarultvsbszjte-auth-token'))).toBeNull();
});

for (const [name, suffix] of [
  ['missing callback', ''],
  ['incompatible PKCE code', '?code=synthetic-used-code'],
  ['expired or previously used link', '#error=access_denied&error_code=otp_expired&error_description=Expired'],
  ['incomplete callback', '#type=recovery&access_token=synthetic'],
  ['non-recovery callback', callback.replace('type=recovery', 'type=signup')]
]) test(name+' cannot unlock a stored signed-in session', async ({ page }) => {
  await realSdk(page);
  await page.addInitScript(s => localStorage.setItem('sb-anvswymarultvsbszjte-auth-token', JSON.stringify(s)), stored);
  await page.goto('/admin/reset-password/'+suffix);
  await expect(page.locator('#error')).toContainText('invalid or has expired');
  await expect(page.locator('#password-form')).toBeHidden();
  await expect(page).toHaveURL(/\/admin\/reset-password\/$/);
});

test('invalid token cannot fall back to an older valid session', async ({ page }) => {
  await realSdk(page, { invalid: true });
  await page.addInitScript(s => localStorage.setItem('sb-anvswymarultvsbszjte-auth-token', JSON.stringify(s)), stored);
  await page.goto('/admin/reset-password/'+callback);
  await expect(page.locator('#error')).toContainText('invalid or has expired');
  await expect(page.locator('#password-form')).toBeHidden();
  await expect(page).toHaveURL(/\/admin\/reset-password\/$/);
});

test('password mismatch never sends an update', async ({ page }) => {
  await realSdk(page);
  let updates = 0;
  page.on('request', request => { if (request.method() === 'PUT') updates++; });
  await page.goto('/admin/reset-password/'+callback);
  await page.locator('#new-password').fill('synthetic-password-123');
  await page.locator('#confirm-password').fill('synthetic-password-456');
  await page.locator('#password-form button').click();
  await expect(page.locator('#error')).toContainText('same password twice');
  expect(updates).toBe(0);
});

test('session rejected during update hides the form safely', async ({ page }) => {
  await realSdk(page);
  await page.goto('/admin/reset-password/'+callback);
  await expect(page.locator('#password-form')).toBeVisible();
  await page.route('**/auth/v1/user', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'bad_jwt', msg: 'Session expired' }) }));
  await page.locator('#new-password').fill('synthetic-password-123');
  await page.locator('#confirm-password').fill('synthetic-password-123');
  await page.locator('#password-form button').click();
  await expect(page.locator('#error')).toContainText('invalid or has expired');
  await expect(page.locator('#password-form')).toBeHidden();
});

test('admin requests matching implicit recovery with the exact reset redirect', async ({ page }) => {
  await realSdk(page);
  let requests = 0;
  await page.route('**/auth/v1/recover*', route => {
    requests++;
    expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe(new URL('/admin/reset-password/', page.url()).href);
    expect(route.request().postDataJSON().code_challenge).toBeNull();
    return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' }) });
  });
  await page.goto('/admin/');
  await page.locator('#email').fill('owner@example.invalid');
  await expect(page.locator('#reset-password')).toBeEnabled();
  await page.locator('#reset-password').click();
  await expect(page.locator('#auth-status')).toContainText('could not be sent');
  expect(requests).toBe(1);
});

test('expired session and rejected refresh cannot unlock the form', async ({ page }) => {
  await realSdk(page);
  await page.goto('/admin/reset-password/'+callback+'&expires_at=1');
  await expect(page.locator('#error')).toContainText('invalid or has expired');
  await expect(page.locator('#password-form')).toBeHidden();
});

test('form waits for server verification and a consumed callback cannot be replayed by reload', async ({ page }) => {
  await realSdk(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/auth/v1/user', async route => {
    await gate;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
  });
  await page.goto('/admin/reset-password/'+callback);
  await expect(page.locator('#password-form')).toBeHidden();
  release();
  await expect(page.locator('#password-form')).toBeVisible();
  await page.reload();
  await expect(page.locator('#error')).toContainText('invalid or has expired');
  await expect(page.locator('#password-form')).toBeHidden();
});
