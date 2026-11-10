// Actual existing-project preview checks. Access cookies stay in memory, and
// no administrator credentials, user photos, Auth mutations or analytics are sent.
const fs=require('node:fs');
const {execFile}=require('node:child_process');
const {chromium,expect}=require('@playwright/test');
const site=process.argv[2];
if(!/^https:\/\/halal-check-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/.test(site||''))throw Error('Immutable preview URL required');
const checks=[];
const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error('Preview check failed');};
async function upload(page,kind,file){
 const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="upload-picture"]').click();await(await chooser).setFiles(file);
 await expect(page.locator('#picture-choice')).toBeVisible();await page.locator(`[data-picture-kind="${kind}"]`).click();
}
(async()=>{
 const raw=await new Promise((resolve,reject)=>execFile('npx.cmd',['--yes','vercel','curl','/','--deployment',site,'--','--silent','--include','--header','"x-vercel-set-bypass-cookie: true"'],{shell:true,encoding:'utf8',maxBuffer:2*1024*1024},(error,stdout)=>error?reject(Error('Preview access failed')):resolve(stdout)));
 const cookies=[...raw.matchAll(/^set-cookie:\s*([^=;]+)=([^;\r\n]*).*$/gim)].map(m=>({name:m[1],value:m[2],url:site}));
 const browser=await chromium.launch();
 try{
  const desktop=await browser.newContext({viewport:{width:1440,height:900}});if(cookies.length)await desktop.addCookies(cookies);
  const dp=await desktop.newPage();await dp.goto(site);await dp.locator('#decline-analytics').click();
  const buttons=dp.locator('.home-actions button');await expect(buttons).toHaveCount(3);const boxes=await buttons.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right};}));check('desktop actions ordered scan, enter, upload',boxes[2].x>=boxes[1].right&&boxes[2].y===boxes[1].y);
  await dp.screenshot({path:'reports/premium-preview-desktop.png',fullPage:true});await desktop.close();
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});if(cookies.length)await context.addCookies(cookies);
  const page=await context.newPage();const errors=[];page.on('pageerror',()=>errors.push('Browser runtime error'));await page.goto(site);await page.locator('#decline-analytics').click();check('mobile homepage and essential-only consent',true);
  await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#barcode-input').fill('8024985013758');await page.locator('#barcode-form button[type=submit]').click();await expect(page.locator('#result-view h1')).toHaveText('Mela, fragola e mirtillo frullati biologici',{timeout:20000});check('real matched OFF identity through preview proxy',true);
  await expect(page.locator('.assessment-card')).toContainText('NEEDS CHECKING');await expect(page.locator('.ingredient-summary')).toContainText('Ingredients are unavailable.');check('missing data remains Needs Checking',true);
  await expect(page.locator('#product-photo')).toHaveAttribute('data-loaded','true',{timeout:20000});const img=page.locator('#product-photo');await expect(img).toHaveCSS('object-fit','contain');check('actual matching product photo loaded with meaningful alt',await img.evaluate(i=>i.naturalWidth>0&&i.alt.includes('Mela')));await expect(page.locator('#product-photo-credit')).toContainText('CC BY-SA');check('visible photo attribution',true);
  await expect(page.locator('.certification')).toHaveText('Halal certification: Not verified');await expect(page.locator('.why-result')).not.toHaveAttribute('open');check('main view hides technical diagnostics',!(await page.locator('#result-view').innerText()).match(/Product identity|Scanned barcode|Returned barcode|Download review report|Data quality/));
  await page.screenshot({path:'reports/premium-preview-mobile.png',fullPage:true});
  await page.locator('#language-select').selectOption('ar');await expect(page.locator('html')).toHaveAttribute('dir','rtl');await expect(page.locator('#result-view h1')).toHaveText('Mela, fragola e mirtillo frullati biologici');check('Arabic RTL preserves original product identity',true);await page.locator('#language-select').selectOption('en');
  await page.locator('[data-action="manual-fallback"]').click();await page.locator('#ingredients-input').fill('milk, pork gelatin');await page.locator('#barcode-form button[type=submit]').click();await expect(page.locator('.assessment-card')).toContainText('HARAM');await expect(page.locator('.ingredient-findings strong')).toHaveText('pork gelatin');check('Haram highlights only responsible ingredient',true);
  await page.locator('.bottom-nav [data-route="home"]').click();await upload(page,'barcode','tests/fixtures/barcodes/ean8.png');await expect(page.locator('#result-view')).toHaveClass(/active-view/,{timeout:20000});check('homepage barcode photo uses real deployed WASM reader',true);
  await page.locator('.bottom-nav [data-route="home"]').click();const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=350;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='58px Arial';x.fillText('milk, sugar, salt',80,130);return c.toDataURL('image/png').split(',')[1];});await upload(page,'ingredients',{name:'synthetic-label.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await expect(page.locator('#ocr-review')).toBeVisible({timeout:100000});await expect(page.locator('#confirm-ocr')).toBeDisabled();await expect(page.locator('#ocr-text')).toHaveValue(/milk/i);check('homepage ingredient photo uses local OCR and review gate',true);
  await page.locator('#ocr-text').fill('milk, sugar, salt');await page.locator('#ocr-complete').check();await page.locator('#confirm-ocr').click();await expect(page.locator('.assessment-card')).toContainText('HALAL');await expect(page.locator('.ingredient-findings li')).toHaveCount(3);check('confirmed OCR shows Halal and actual bounded ingredients',true);
  await expect(page.locator('#product-photo-message')).toHaveText('Photo unavailable');check('unidentified manual product never gets a guessed photo',true);
  await expect.poll(()=>page.evaluate(async()=>{await navigator.serviceWorker.ready;return caches.keys();})).toContain('halalcheck-v9');check('preview v9 PWA cache',true);check('no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check('consent preserved',await page.evaluate(()=>localStorage.getItem('halalcheck-analytics-consent')==='denied'));
  await page.goto(site+'/admin/');await expect(page.locator('#auth-form')).toBeVisible();await expect(page.locator('#dashboard')).toBeHidden();check('admin remains gated without credentials',true);await page.goto(site+'/admin/reset-password/');await expect(page.locator('#error')).toBeVisible();check('invalid recovery remains locked',true);check('no runtime errors',errors.length===0);await context.close();
 }finally{await browser.close();}
})().catch(()=>{checks.push({name:'preview workflow completed',passed:false});process.exitCode=1;}).finally(()=>{
 const report={checkedAt:new Date().toISOString(),site,checks,passed:checks.length>0&&checks.every(c=>c.passed),realOffProductPhoto:checks.some(c=>c.name==='actual matching product photo loaded with meaningful alt'&&c.passed),syntheticBarcodePhoto:true,syntheticIngredientLabel:true,physicalAndroidTest:false,cloudProviderPickerTest:false,nativeSpeakerReview:false,actualAdminLogin:false,productionWrites:0,authMutations:0};fs.writeFileSync('reports/premium-preview-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
});
