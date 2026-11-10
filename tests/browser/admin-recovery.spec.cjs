const { test, expect } = require('@playwright/test');

const session = { access_token: 'synthetic-recovery-token', refresh_token: 'synthetic-recovery-refresh' };

async function mockSdk(page, overrides = {}) {
  await page.route('https://esm.sh/@supabase/supabase-js@2.119.0', route => route.fulfill({
    contentType: 'text/javascript',
    body: 'export const createClient=()=>window.qaClient;'
  }));
  await page.addInitScript((options) => {
    window.qaClient = {
      auth: {
        exchangeCodeForSession: async () => options.exchangeError ? { error: { message: 'invalid or expired' } } : { data: { session: options.session } },
        getSession: async () => options.noSession ? { data: { session: null }, error: null } : { data: { session: options.session }, error: null },
        updateUser: async () => options.updateError ? { error: { message: 'rejected' } } : { data: { user: {} }, error: null }
      }
    };
  }, { ...overrides, session });
}

test('recovery code validates and updates password', async ({ page }) => {
  await mockSdk(page);
  await page.goto('/admin/reset-password/?code=synthetic-code');
  await expect(page.locator('#password-form')).toBeVisible();
  await page.locator('#new-password').fill('synthetic-password-123');
  await page.locator('#confirm-password').fill('synthetic-password-123');
  await page.locator('#password-form button').click();
  await expect(page.locator('#status')).toContainText('Password saved');
});

test('expired recovery code is rejected without showing the form', async ({ page }) => {
  await mockSdk(page, { exchangeError: true });
  await page.goto('/admin/reset-password/?code=expired-code');
  await expect(page.locator('#error')).toContainText('invalid or has expired');
  await expect(page.locator('#password-form')).toBeHidden();
});

test('missing recovery session is rejected safely', async ({ page }) => {
  await mockSdk(page, { noSession: true });
  await page.goto('/admin/reset-password/');
  await expect(page.locator('#error')).toContainText('invalid or has expired');
  await expect(page.locator('#password-form')).toBeHidden();
});
