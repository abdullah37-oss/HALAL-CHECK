const { test, expect } = require('@playwright/test');
const origin = 'https://anvswymarultvsbszjte.supabase.co';
const stats = { totalEvents: 20, eventCounts: {page_opened:5, scan_started:3, barcode_completed:2, manual_lookup:4, lookup_succeeded:4, lookup_failed:2}, dailyActivity:{'2026-01-30':6,'2026-02-01':7,'2026-02-02':7}, sessions:3, languages:{en:15,ur:5}, devices:{mobile:16,desktop:4} };
async function dashboard(page, response = stats) {
  await page.route('https://esm.sh/@supabase/supabase-js@2.119.0', route => route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.qaClient;'}));
  await page.addInitScript(() => { window.qaClient={auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:{access_token:'synthetic-dashboard-test'}}}),signOut:async()=>({error:null})}}; });
  await page.route(origin+'/**', route => route.fulfill({status:400,body:'{}'}));
  await page.route('**/functions/v1/admin-stats?*', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)}));
  await page.goto('/admin/');
  await expect(page.locator('#dashboard')).toBeVisible();
}
test('analytics charts use authorized API counts and do not invent camera failure rates', async ({page}) => {
  await dashboard(page);
  await expect(page.locator('#cards article').nth(0)).toContainText('5');
  await expect(page.locator('#cards article').nth(1)).toContainText('2');
  await expect(page.locator('#cards article').nth(2)).toContainText('4');
  await expect(page.locator('#cards article').nth(3)).toContainText('4');
  await expect(page.locator('#outcome-chart')).toContainText('Successful');
  await expect(page.locator('#outcome-chart .donut')).toHaveAttribute('aria-label','Successful: 4; Unsuccessful: 2');
  await expect(page.locator('#scanner-performance')).toContainText('Not collected');
  await expect(page.locator('#freshness')).toContainText('Retrieved at');
  await expect(page.locator('#activity-chart svg')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('daily weekly and monthly views aggregate returned UTC buckets without new API calls', async ({page}) => {
  let calls=0;
  page.on('request', request=>{if(request.url().includes('/admin-stats?'))calls++;});
  await dashboard(page);
  await page.locator('.data-details summary').click();
  await expect(page.locator('#activity-table tbody tr')).toHaveCount(3);
  await page.locator('#activity-group').selectOption('weekly');
  await expect(page.locator('#activity-table tbody tr')).toHaveCount(2);
  await expect(page.locator('#activity-table tbody tr').first()).toContainText('2026-01-26');
  await expect(page.locator('#activity-table tbody tr').first()).toContainText('13');
  await page.locator('#activity-group').selectOption('monthly');
  await expect(page.locator('#activity-table tbody tr')).toHaveCount(2);
  await expect(page.locator('#activity-table tbody tr').last()).toContainText('14');
  expect(calls).toBe(1);
});
test('date range fetches the selected range and logout clears private charts', async ({page}) => {
  await dashboard(page);
  const response=page.waitForResponse(r=>r.url().includes('/admin-stats?days=7'));
  await page.locator('#range').selectOption('7');
  await response;
  await expect(page.locator('#analytics-panels')).toBeVisible();
  await page.locator('#sign-out').click();
  await expect(page.locator('#dashboard')).toBeHidden();
  await expect(page.locator('#activity-chart')).toBeEmpty();
  await expect(page.locator('#cards')).toBeEmpty();
});
test('empty authorized analytics shows an honest empty state without charts', async ({page}) => {
  await dashboard(page,{totalEvents:0,eventCounts:{},dailyActivity:{},sessions:0});
  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('#analytics-panels')).toBeHidden();
  await expect(page.locator('#activity-chart svg')).toHaveCount(0);
});
test('untrusted aggregate labels are escaped and invalid daily buckets are ignored', async ({page}) => {
  await dashboard(page,{...stats,languages:{'<img src=x onerror="window.dashboardXss=1">':20},dailyActivity:{'2026-02-30':20,'bad-date':99,'2026-02-01':20}});
  await expect(page.locator('#languages img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.dashboardXss)).toBeUndefined();
  await page.locator('.data-details summary').click();
  await expect(page.locator('#activity-table tbody tr')).toHaveCount(1);
  await expect(page.locator('#activity-table')).toContainText('2026-02-01');
});
test('dashboard visual reference capture with synthetic intercepted data', async ({page}, info) => {
  await dashboard(page);
  await page.screenshot({path:`reports/${info.project.name}-admin-dashboard.png`,fullPage:true});
});

test('admin language selection translates real dashboard labels and persists RTL', async ({page}) => {
  await dashboard(page);
  await page.locator('#admin-language').selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('lang','ar');
  await expect(page.locator('#cards article').first().locator('small')).not.toHaveText('Recorded visits');
  await expect(page.locator('#dashboard h1')).toHaveAttribute('dir','rtl');
  await page.reload();
  await expect(page.locator('#admin-language')).toHaveValue('ar');
  await expect(page.locator('#dashboard')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('malformed aggregate values cannot authorize or populate charts', async ({page}) => {
  await page.route('https://esm.sh/@supabase/supabase-js@2.119.0', route => route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.qaClient;'}));
  await page.addInitScript(() => { window.qaClient={auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:{access_token:'synthetic-dashboard-test'}}}),signOut:async()=>({error:null})}}; });
  await page.route('**/functions/v1/admin-stats?*', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...stats,eventCounts:{page_opened:'5'}})}));
  await page.goto('/admin/');
  await expect(page.locator('#auth-error')).toContainText('Statistics could not be loaded');
  await expect(page.locator('#dashboard')).toBeHidden();
  await expect(page.locator('#cards')).toBeEmpty();
  await expect(page.locator('#activity-chart')).toBeEmpty();
});

test('recovery errors use the same persisted language without any Auth request', async ({page}) => {
  let authRequests=0;
  await page.route(origin+'/**', route=>{authRequests++;return route.abort();});
  await page.goto('/admin/reset-password/#error=access_denied&error_code=otp_expired');
  await page.locator('#recovery-language').selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('lang','ar');
  await expect(page.locator('#error')).not.toHaveText('This recovery link is invalid or has expired. Request a new password setup link.');
  await expect(page.locator('#password-form')).toBeHidden();
  expect(authRequests).toBe(0);
});
