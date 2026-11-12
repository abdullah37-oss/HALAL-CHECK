const {test,expect}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');
const {DatabaseSync}=require('node:sqlite');
const {createCatalogueLookup}=require('../../dist-server/catalogue.cjs');
const {load}=require('../qa/helpers.cjs');
test.use({serviceWorkers:'block'});
const db=new DatabaseSync('data/italy/catalogue.sqlite',{readOnly:true});
const rows=db.prepare('SELECT * FROM products ORDER BY identity').all();db.close();
const lookup=createCatalogueLookup();
async function enter(page,code){if(!await page.locator('#scanner-view').evaluate(n=>n.classList.contains('active-view')))await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#barcode-input').fill(code);await page.locator('#barcode-form button[type=submit]').click();}
test('all real catalogue identities render exact names and conservative evidence cards',async({page},info)=>{
 test.setTimeout(150000);
 await page.route('https://images.openfoodfacts.org/**',r=>r.abort());
 await page.route('**/api/products/*',r=>{const code=new URL(r.request().url()).pathname.split('/').pop();const product=lookup(code);return r.fulfill({status:product?200:404,contentType:'application/json',body:JSON.stringify({schema:'halalcheck.off.v1',product})});});
 await page.goto('/');await page.locator('#decline-analytics').click();
 for(const row of rows){
  await enter(page,row.barcode);await expect(page.locator('#result-view h1')).toHaveText(row.product_name||'Product information');if(row.brand)await expect(page.locator('.result-brand')).toHaveText(row.brand);else await expect(page.locator('.result-brand')).toHaveCount(0);
  const status=row.verification_status==='VERIFIED'?dbStatus(row):'needs-checking';
  await expect(page.locator('.simple-result')).toHaveAttribute('data-result',status);
  await expect(page.locator('.certification')).toHaveText('Halal certification: Not verified');
  await expect(page.locator('.why-result')).not.toHaveAttribute('open');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('[data-action="scan-another"]').click();
 }
 await enter(page,rows.find(r=>r.verification_status==='REVIEW_REQUIRED').barcode);
 await expect(page.locator('.assessment-card')).toContainText('Ingredients await packaging verification.');
 await expect(page.locator('[data-action="label-fallback"]')).toBeVisible();
 const accessibility=await new AxeBuilder({page}).include('#result-view').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(accessibility.violations).toEqual([]);
 await page.screenshot({path:`reports/${info.project.name}-italy-catalogue.png`,fullPage:true});
});
function dbStatus(row){const engine=load().window.halalAnalyzer.analyze(row.ingredients_original,{evidenceComplete:true});return engine.classification==='likely-halal'?'halal':engine.classification==='not-halal'?'haram':'needs-checking';}
test('real indexed server endpoint serves known identity, review status and licensed download',async({page,request})=>{
 const row=rows.find(r=>r.verification_status==='REVIEW_REQUIRED');
 const response=await request.get('/api/products/'+row.barcode);expect(response.status()).toBe(200);const body=await response.json();expect(body.product.productName).toBe(row.product_name);expect(body.product.ingredients).toEqual([]);expect(body.product.catalogue.status).toBe('REVIEW_REQUIRED');
 await page.route('https://images.openfoodfacts.org/**',r=>r.abort());await page.goto('/');await page.locator('#decline-analytics').click();await enter(page,row.barcode);await expect(page.locator('.assessment-card')).toContainText('NEEDS CHECKING');await page.locator('.why-result summary').click();await expect(page.locator('a[href="/catalogue/italy.json.gz"]')).toHaveText('Catalogue data');
 const download=await request.get('/catalogue/italy.json.gz');expect(download.status()).toBe(200);
 const data=JSON.parse(require('node:zlib').gunzipSync(await download.body()));expect(data.products.length).toBe(rows.length);expect(data.licence).toBe('ODbL-1.0');
});
test('new catalogue text translates in all twelve languages and keeps source identity unchanged',async({page})=>{
 const row=rows.find(r=>r.verification_status==='REVIEW_REQUIRED');await page.route('https://images.openfoodfacts.org/**',r=>r.abort());await page.goto('/');await page.locator('#decline-analytics').click();await enter(page,row.barcode);
 for(const language of ['en','it','ar','ur','hi','bn','fr','de','es','tr','ms','id']){
  await page.locator('#language-select').selectOption(language);
  await expect(page.locator('#result-view h1')).toHaveText(row.product_name);
  await expect(page.locator('.assessment-card')).toContainText(load().window.halalI18n.get('Ingredients await packaging verification.',language));
  await expect(page.locator('html')).toHaveAttribute('dir',['ar','ur'].includes(language)?'rtl':'ltr');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
test('an older browser OFF cache cannot mask new catalogue review state',async({page})=>{
 const row=rows.find(r=>r.verification_status==='REVIEW_REQUIRED');
 const p=JSON.parse(row.product_json);p.ingredientsRaw='milk';p.ingredients=[{id:'old',originalText:'milk',normalizedName:'milk',source:'Open Food Facts',confidence:1}];p.lastUpdated=new Date().toISOString();
 await page.addInitScript(({identity,p})=>localStorage.setItem('halalcheck-off-products-v1',JSON.stringify({version:1,products:{[identity+':en']:p}})),{identity:row.identity,p});
 await page.route('https://images.openfoodfacts.org/**',r=>r.abort());await page.goto('/');await page.locator('#decline-analytics').click();await enter(page,row.barcode);await expect(page.locator('.assessment-card')).toContainText('Ingredients await packaging verification.');await expect(page.locator('.simple-result')).toHaveAttribute('data-result','needs-checking');
});
