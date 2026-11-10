// Authenticated preview browser smoke; deployment cookies stay only in memory.
// No administrator credentials, emails, Auth mutations or production writes.
const fs=require('node:fs');
const {execFile}=require('node:child_process');
const {chromium,expect}=require('@playwright/test');
const site=process.argv[2];
if(!/^https:\/\/halal-check-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/.test(site||''))throw Error('Immutable preview URL required');
const checks=[];
const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error('Preview check failed');};
(async()=>{
 const raw=await new Promise((resolve,reject)=>execFile('npx.cmd',['--yes','vercel','curl','/','--deployment',site,'--','--silent','--include','--header','"x-vercel-set-bypass-cookie: true"'],{shell:true,encoding:'utf8',maxBuffer:2*1024*1024},(error,stdout)=>error?reject(Error('Preview access failed')):resolve(stdout)));
 const cookies=[...raw.matchAll(/^set-cookie:\s*([^=;]+)=([^;\r\n]*).*$/gim)].map(m=>({name:m[1],value:m[2],url:site}));
 const browser=await chromium.launch();
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 if(cookies.length)await context.addCookies(cookies);
 const page=await context.newPage();const errors=[];page.on('pageerror',()=>errors.push('Browser runtime error'));
 await page.goto(site);await expect(page.locator('#decline-analytics')).toBeVisible();check('preview homepage and consent',true);await page.locator('#decline-analytics').click();
 await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#barcode-input').fill('8024985013758');await page.locator('#barcode-form button[type=submit]').click();
 await expect(page.locator('#result-view h1')).toHaveText('Mela, fragola e mirtillo frullati biologici',{timeout:20000});await expect(page.locator('.assessment-card')).toContainText('NEEDS CHECKING');await expect(page.locator('.assessment-card')).toContainText('Ingredients are unavailable.');check('real preview proxy lookup preserves missing-data result',true);
 await expect(page.locator('.certification')).toHaveText('Halal certification: Not verified');await expect(page.locator('.assessment-card p')).toHaveCount(1);await expect(page.locator('.why-result')).not.toHaveAttribute('open');check('compact result hides technical details',!(await page.locator('#result-view').innerText()).match(/Product identity|Scanned barcode|Returned barcode|Data quality|Download review report|Report a possible error|ODbL/));
 await page.locator('#language-select').selectOption('ar');await expect(page.locator('html')).toHaveAttribute('dir','rtl');await expect(page.locator('#result-view h1')).toHaveText('Mela, fragola e mirtillo frullati biologici');check('Arabic RTL preserves real product name',true);await page.locator('#language-select').selectOption('en');
 await page.locator('[data-action="manual-fallback"]').click();await page.locator('#ingredients-input').fill('milk, pork gelatin');await page.locator('#barcode-form button[type=submit]').click();await expect(page.locator('.assessment-card')).toContainText('HARAM');check('preview manual policy classification',true);
 await page.locator('[data-action="scan-another"]').click();await page.locator('#barcode-image').setInputFiles('tests/fixtures/barcodes/ean13.png');await expect(page.locator('#result-view')).toHaveClass(/active-view/,{timeout:20000});await expect(page.locator('.assessment-card')).toBeVisible();check('real WASM barcode-image upload reaches preview result',true);
 await page.locator('[data-action="scan-another"]').click();const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=350;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='58px Arial';x.fillText('milk, sugar, salt',80,130);return c.toDataURL('image/png').split(',')[1];});await page.locator('#label-image').setInputFiles({name:'synthetic-label.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await expect(page.locator('#ocr-review')).toBeVisible({timeout:100000});await expect(page.locator('#ocr-text')).toHaveValue(/milk/i);await expect(page.locator('#confirm-ocr')).toBeDisabled();check('real local OCR on preview waits for user review',true);
 await page.locator('#ocr-text').fill('milk, sugar, salt');await page.locator('#ocr-complete').check();await page.locator('#confirm-ocr').click();await expect(page.locator('.assessment-card')).toContainText('HALAL');check('reviewed OCR reaches existing policy',true);
 await expect.poll(()=>page.evaluate(async()=>{await navigator.serviceWorker.ready;return caches.keys();})).toContain('halalcheck-v8');check('preview v8 PWA installed',true);check('mobile preview has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check('consent preserved',await page.evaluate(()=>localStorage.getItem('halalcheck-analytics-consent')==='denied'));
 await page.screenshot({path:'reports/off-preview-mobile.png',fullPage:true});
 await page.goto(site+'/admin/');await expect(page.locator('#auth-form')).toBeVisible();await expect(page.locator('#dashboard')).toBeHidden();check('preview administrator gate remains closed',true);
 await page.goto(site+'/admin/reset-password/');await expect(page.locator('#error')).toBeVisible();check('preview recovery without session stays locked',true);
 check('no browser runtime errors',errors.length===0);
 await context.close();
 }finally{await browser.close();}
})().catch(()=>{checks.push({name:'preview smoke completed',passed:false});process.exitCode=1;}).finally(()=>{
 const report={checkedAt:new Date().toISOString(),site,checks,passed:checks.length>0&&checks.every(c=>c.passed),usesSyntheticBarcodeImage:true,usesSyntheticIngredientLabel:true,physicalAndroidTest:false,nativeSpeakerReview:false,realAdministratorLogin:false,productionWrites:0,authMutations:0};fs.writeFileSync('reports/off-preview-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
});
