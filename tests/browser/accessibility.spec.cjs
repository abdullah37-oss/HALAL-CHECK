const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');

async function audit(page, name, info) {
  const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const findings = result.violations.map(({id,impact,description,nodes})=>({id,impact,description,nodes:nodes.map(({target,failureSummary})=>({target,failureSummary}))}));
  const report = {page:name,viewport:info.project.name,rulesPassed:result.passes.length,incompleteChecks:result.incomplete.map(({id})=>id),violations:findings};
  fs.mkdirSync('reports',{recursive:true});
  fs.writeFileSync(`reports/${info.project.name}-accessibility-${name}.json`,JSON.stringify(report,null,2));
  await page.screenshot({path:`reports/${info.project.name}-accessibility-${name}.png`,fullPage:true});
  expect(findings,JSON.stringify(findings,null,2)).toEqual([]);
}

test.beforeEach(async({page})=>{
  await page.route('**/api/products/*',route=>route.fulfill({status:404,body:'{}'}));
  await page.route('https://*.supabase.co/**',route=>route.fulfill({status:400,body:'{}'}));
});

test('WCAG A and AA: public Home including essential/optional consent choices',async({page},info)=>{
  await page.goto('/');
  await expect(page.locator('#privacy-notice')).toBeVisible();
  await audit(page,'home',info);
});

test('WCAG A and AA: scanner camera, barcode image and ingredient image methods',async({page},info)=>{
  await page.goto('/');
  await page.locator('#decline-analytics').click();
  await page.locator('[data-action="manual-entry"]').first().click();
  await expect(page.locator('#barcode-image')).toBeVisible();
  await expect(page.locator('#label-image')).toBeVisible();
  await audit(page,'scanner',info);
});

test('WCAG A and AA: private administrator sign-in',async({page},info)=>{
  await page.route('https://esm.sh/@supabase/supabase-js@2.119.0',route=>route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.qaClient;'}));
  await page.addInitScript(()=>{window.qaClient={auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:null},error:null})}};});
  await page.goto('/admin/');
  await expect(page.locator('#auth-submit')).toBeEnabled();
  await audit(page,'admin-login',info);
});

test('WCAG A and AA: authorized administrator charts with synthetic intercepted data',async({page},info)=>{
  await page.route('https://esm.sh/@supabase/supabase-js@2.119.0',route=>route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.qaClient;'}));
  await page.addInitScript(()=>{window.qaClient={auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:{access_token:'synthetic-accessibility-only'}},error:null}),signOut:async()=>({error:null})}};});
  await page.route('**/functions/v1/admin-stats?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({totalEvents:20,eventCounts:{page_opened:5,scan_started:3,barcode_completed:2,manual_lookup:4,lookup_succeeded:4,lookup_failed:2},dailyActivity:{'2026-01-30':6,'2026-02-01':7,'2026-02-02':7},sessions:3,languages:{en:15,ur:5},devices:{mobile:16,desktop:4}})}));
  await page.goto('/admin/');
  await expect(page.locator('#dashboard')).toBeVisible();
  await audit(page,'admin-dashboard',info);
});

test('WCAG A and AA: dark-theme public Home',async({page},info)=>{
  await page.goto('/');
  await page.locator('#decline-analytics').click();
  await page.locator(info.project.name==='mobile'?'#mobile-theme-toggle':'#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await audit(page,'dark-home',info);
});

test('WCAG A and AA: dark-theme scanner and local image methods',async({page},info)=>{
  await page.goto('/');
  await page.locator('#decline-analytics').click();
  await page.locator(info.project.name==='mobile'?'#mobile-theme-toggle':'#theme-toggle').click();
  await page.locator('[data-action="manual-entry"]').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('#barcode-image')).toBeVisible();
  await audit(page,'dark-scanner',info);
});
