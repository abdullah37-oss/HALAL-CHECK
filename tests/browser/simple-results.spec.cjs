const {test,expect}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');
test.use({serviceWorkers:'block'});
const code='0036000291452';
const product=ingredients=>({product:{code,product_name:'Original product name',brands:'Original brand',lang:'en',ingredients_text:ingredients}});
async function lookup(page,body){
 await page.route('**/api/products/*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)}));
 await page.goto('/');await page.locator('#decline-analytics').click();
 await page.locator('[data-action="manual-entry"]').first().click();
 await page.locator('#barcode-input').fill(code);await page.locator('#barcode-form button[type=submit]').click();
 await expect(page.locator('#result-view')).toHaveClass(/active-view/);
}
for(const [ingredients,key,color] of [['milk, sugar','HALAL','rgb(8, 102, 61)'],['milk, pork gelatin','HARAM','rgb(156, 37, 37)'],['','NEEDS CHECKING','rgb(120, 81, 8)']])test('compact three-status result and translations: '+key,async({page},info)=>{
 await lookup(page,product(ingredients));
 const card=page.locator('.assessment-card');
 await expect(card.locator('strong')).toHaveText(key);await expect(card.locator('strong')).toHaveCSS('color',color);
 await expect(card.locator('p')).toHaveCount(1);await expect(page.locator('.certification')).toHaveText('Halal certification: Not verified');
 expect(await page.locator('#result-view h1').evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(await card.evaluate(el=>el.getBoundingClientRect().top));
 await expect(page.locator('#product-photo')).toHaveCount(0);
 await page.screenshot({path:`reports/${info.project.name}-simple-${key.toLowerCase().replaceAll(' ','-')}.png`,fullPage:true});
 for(const language of ['en','it','ar','ur','hi','bn','fr','de','es','tr','ms','id']){
  await page.locator('#language-select').selectOption(language);
  const text=await page.evaluate(({key,language})=>({status:window.halalI18n.get(key,language),cert:window.halalI18n.get('Halal certification: Not verified',language)}),{key,language});
  await expect(card.locator('strong')).toHaveText(text.status);await expect(page.locator('.certification')).toHaveText(text.cert);
  await expect(page.locator('#result-view h1')).toHaveText('Original product name');await expect(page.locator('.result-brand')).toHaveText('Original brand');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.locator('#language-select').selectOption('en');
 if(!ingredients)await expect(card.locator('p')).toHaveText('Ingredients are unavailable.');
 const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations;
 expect(violations.map(v=>v.id)).toEqual([]);
});
test('Why stays short and excludes ingredients, identities and developer diagnostics',async({page})=>{
 await lookup(page,product('milk, sugar, salt'));
 const result=page.locator('#result-view');
 await expect(result.locator('details')).not.toHaveAttribute('open');await expect(result.locator('.source-credit')).not.toBeVisible();
 expect(await result.innerText()).not.toMatch(/Open Food Facts|ODbL|CC BY-SA|Product identity|Ingredient assessment|Data quality|Scanned barcode|Returned barcode|Download review report|Report a possible error/);
 await result.locator('summary').click();
 await expect(result.locator('.source-credit')).toBeVisible();
 await expect(result.locator('details>p:not(.source-credit)')).toHaveCount(1);
 await expect(result.locator('.finding-list')).toHaveCount(0);
 expect(await result.innerText()).not.toMatch(/milk|sugar|salt|0036000291452|Ingredient label language|Last updated|Data quality/);
});
test('OFF halal marketing claims never become verified certification',async({page})=>{
 const body=product('milk, sugar');Object.assign(body.product,{labels_tags:['en:halal','en:vegan'],nutriscore_grade:'a',certification:'verified'});
 await lookup(page,body);await expect(page.locator('.certification')).toHaveCount(1);await expect(page.locator('.certification')).toHaveText('Halal certification: Not verified');
});
test('existing trusted certification flag renders only the compact verified line',async({page})=>{
 await page.goto('/');await page.locator('#decline-analytics').click();
 // Simulate the existing trusted repository contract, not an OFF label claim.
 await page.evaluate(()=>{window.productRepository.lookup=async()=>({status:'verified',product:{...window.productModel.createProduct({scannedBarcode:'0036000291452',returnedBarcode:'0036000291452',productName:'Trusted certification fixture',brand:'QA',ingredientsRaw:'milk, sugar',ingredientDataSource:'verified_registry_fixture',certification:'verified'}),ingredientEvidence:{state:'complete',kind:'label-text',language:'en'}}});});
 await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#barcode-input').fill(code);await page.locator('#barcode-form button[type=submit]').click();
 await expect(page.locator('.certification')).toHaveText('Halal certification: Verified');await expect(page.locator('.certification')).toHaveCount(1);
});
test('primary scan action is visible above mobile navigation, including narrow screens',async({page})=>{
 await page.setViewportSize({width:320,height:740});await lookup(page,product(''));
 const action=page.locator('[data-action="scan-another"]');await expect(action).toBeInViewport();
 const bottom=await action.evaluate(el=>el.getBoundingClientRect().bottom);
 const nav=await page.locator('.bottom-nav').evaluate(el=>getComputedStyle(el).display==='none'?innerHeight:el.getBoundingClientRect().top);
 expect(bottom).toBeLessThanOrEqual(nav);await action.click();await expect(page.locator('#scanner-view')).toHaveClass(/active-view/);
});
test('dark result keeps one readable card and discreet feedback is outside results',async({page})=>{
 await lookup(page,product('milk, gelatin'));await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
 const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations;expect(violations.map(v=>v.id)).toEqual([]);
 await expect(page.locator('#result-view a[href*="/issues"]')).toHaveCount(0);
 await page.locator('.app-tools [data-route="about"]').click();await expect(page.locator('#about-view a[href="https://github.com/abdullah37-oss/HALAL-CHECK/issues"]')).toHaveText('Share feedback');
});
