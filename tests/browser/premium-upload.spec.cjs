const fs=require('node:fs');
const {test,expect}=require('@playwright/test');
const {AxeBuilder}=require('@axe-core/playwright');
const {PNG}=require('pngjs');
test.use({serviceWorkers:'block'});
const code='0036000291452';
const photo='https://images.openfoodfacts.org/images/products/003/600/029/1452/front_en.1.400.jpg';
const fallback=photo.replace('.1.','.2.');
const png=new PNG({width:180,height:360});for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){const i=(y*png.width+x)*4;png.data[i]=x<15||x>165?240:20;png.data[i+1]=y<40||y>320?240:110;png.data[i+2]=80;png.data[i+3]=255;}const photoBytes=PNG.sync.write(png);
const body=(extra={})=>({product:{code,product_name:'Matched product',brands:'QA packaging',lang:'en',ingredients_text:'milk, sugar, salt',...extra}});
test.beforeEach(async({page})=>{await page.route('**/api/products/*',route=>route.fulfill({status:404,body:'{}'}));});
async function home(page){await page.goto('/');await page.locator('#decline-analytics').click();}
async function selectedPhoto(page,kind,file='tests/fixtures/barcodes/ean8.png'){
 const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="upload-picture"]').click();await(await chooser).setFiles(file);
 await expect(page.locator('#picture-choice')).toBeVisible();await page.locator(`[data-picture-kind="${kind}"]`).click();
}
async function lookup(page,fields={}){
 await page.route('**/api/products/*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body(fields))}));
 await home(page);await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#barcode-input').fill(code);await page.locator('#barcode-form button[type=submit]').click();await expect(page.locator('#result-view')).toHaveClass(/active-view/);
}
test('homepage actions use the intended desktop order and accessible touch targets',async({page},info)=>{
 await home(page);const actions=page.locator('.home-actions button');await expect(actions).toHaveCount(3);await expect(actions.nth(0)).toContainText('Scan barcode');await expect(actions.nth(1)).toContainText('Enter barcode');await expect(actions.nth(2)).toContainText('Upload Picture');
 const boxes=await actions.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};}));for(const b of boxes)expect(b.height).toBeGreaterThanOrEqual(44);
 if(info.project.name==='desktop'){expect(boxes[2].x).toBeGreaterThanOrEqual(boxes[1].right);expect(boxes[2].y).toBe(boxes[1].y);}else{expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[1].bottom);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`reports/${info.project.name}-premium-home.png`,fullPage:true});
});
test('gallery barcode upload uses the real WASM reader and the matching OFF lookup',async({page})=>{
 await page.route('**/api/products/80771548*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body({code:'80771548',product_name:'Uploaded barcode fixture'}))}));
 await home(page);await selectedPhoto(page,'barcode');await expect(page.locator('#result-view h1')).toHaveText('Uploaded barcode fixture');await expect(page.locator('.assessment-card')).toContainText('HALAL');
});
test('gallery ingredient photo runs local OCR and always waits for edited-text confirmation',async({page})=>{
 test.setTimeout(120000);const requests=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173'))requests.push(r.url());});await home(page);
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=350;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='58px Arial';x.fillText('milk, sugar, salt',80,130);return c.toDataURL('image/png').split(',')[1];});
 await selectedPhoto(page,'ingredients',{name:'private-label.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await expect(page.locator('#ocr-review')).toBeVisible({timeout:100000});await expect(page.locator('#ocr-text')).toHaveValue(/milk/i);await expect(page.locator('#confirm-ocr')).toBeDisabled();await expect(page.locator('#result-view')).not.toHaveClass(/active-view/);
 await page.locator('#ocr-text').fill('milk, pork gelatin');await page.locator('#ocr-complete').check();await page.locator('#confirm-ocr').click();await expect(page.locator('.assessment-card')).toContainText('HARAM');await expect(page.locator('.ingredient-findings')).toContainText('pork gelatin');expect(requests).toEqual([]);
});
test('cancellation, Escape and unsupported/oversized files leave an accessible recoverable workflow',async({page})=>{
 await home(page);await page.locator('#homepage-picture').dispatchEvent('cancel');await expect(page.locator('#home-view')).toHaveClass(/active-view/);
 const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="upload-picture"]').click();await(await chooser).setFiles('tests/fixtures/barcodes/ean8.png');await expect(page.locator('#picture-choice')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#picture-choice')).not.toBeVisible();await expect(page.locator('[data-action="upload-picture"]')).toBeFocused();
 for(const file of [{name:'text.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')},{name:'big.jpg',mimeType:'image/jpeg',buffer:Buffer.alloc(12*1024*1024+1)}]){await page.locator('#homepage-picture').setInputFiles(file);await expect(page.locator('#upload-picture-status')).not.toBeEmpty();await expect(page.locator('#picture-choice')).not.toBeVisible();}
});
test('spoofed and unreadable barcode photos retain the decoder safeguards',async({page})=>{
 await home(page);await selectedPhoto(page,'barcode',{name:'fake.png',mimeType:'image/png',buffer:Buffer.from('<svg onload="alert(1)"/>')});await expect(page.locator('#barcode-image-status')).toContainText('not a supported image');await expect(page.locator('#result-view')).not.toHaveClass(/active-view/);
 await page.locator('[data-action="close-scanner"]').click();await selectedPhoto(page,'barcode',{name:'plain.png',mimeType:'image/png',buffer:photoBytes});await expect(page.locator('#barcode-image-status')).toContainText('No retail barcode was found');
});
test('OCR startup failure gives a short manual-entry fallback without analysis',async({page})=>{
 await page.route('**/assets/ingredient-ocr.js',r=>r.fulfill({status:503,body:''}));await home(page);await selectedPhoto(page,'ingredients');await expect(page.locator('#ocr-status')).toHaveText('Label recognition failed. Type the ingredients manually.');await expect(page.locator('#confirm-ocr')).toBeDisabled();await expect(page.locator('#result-view')).not.toHaveClass(/active-view/);
});
test('photo-type dialog has keyboard focus containment and WCAG contrast',async({page})=>{
 await home(page);await page.locator('#homepage-picture').setInputFiles('tests/fixtures/barcodes/ean8.png');await expect(page.locator('[data-picture-kind="barcode"]')).toBeFocused();
 for(let i=0;i<6;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement.closest('#picture-choice')!==null)).toBe(true);}
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(result.violations.map(v=>v.id)).toEqual([]);await page.locator('#cancel-picture-choice').click();
});
test('large image preserves aspect ratio, alt text and visible photo attribution',async({page},info)=>{
 await page.route('https://images.openfoodfacts.org/**',r=>r.fulfill({contentType:'image/png',body:photoBytes}));await lookup(page,{image_front_url:photo});
 const img=page.locator('#product-photo');await expect(img).toHaveAttribute('data-loaded','true');await expect(img).toHaveAttribute('alt','Product photo: Matched product');await expect(img).toHaveCSS('object-fit','contain');expect(await img.evaluate(i=>i.naturalWidth/i.naturalHeight)).toBe(.5);
 const b=await img.boundingBox();expect(b.height).toBeGreaterThanOrEqual(200);await expect(page.locator('#product-photo-credit')).toContainText('CC BY-SA');await expect(page.locator('#product-photo-placeholder')).not.toBeVisible();await page.screenshot({path:`reports/${info.project.name}-premium-result.png`,fullPage:true});
});
test('slow image does not delay status, and a broken image becomes Photo unavailable',async({page})=>{
 let release;const gate=new Promise(r=>release=r);await page.route('https://images.openfoodfacts.org/**',async r=>{await gate;return r.fulfill({status:404,body:''});});await lookup(page,{image_front_url:photo});await expect(page.locator('.assessment-card')).toContainText('HALAL');release();await expect(page.locator('#product-photo-message')).toHaveText('Photo unavailable');await expect(page.locator('#product-photo')).toHaveCount(0);
});
test('exact curated fallback follows a broken OFF photo; mismatched photo paths stay hidden',async({page})=>{
 await page.route('https://images.openfoodfacts.org/**',r=>r.request().url()===photo?r.fulfill({status:404,body:''}):r.fulfill({contentType:'image/png',body:photoBytes}));
 await page.route('**/api/products/*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body({image_front_url:photo}))}));await home(page);
 await page.evaluate(({code,fallback})=>{window.productCatalog.push({...window.productModel.createProduct({scannedBarcode:code,returnedBarcode:code,productName:'Curated fixture',ingredientsRaw:'milk'}),imageUrl:fallback});},{code,fallback});
 await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#barcode-input').fill(code);await page.locator('#barcode-form button[type=submit]').click();await expect(page.locator('#product-photo')).toHaveAttribute('src',fallback);await expect(page.locator('#product-photo')).toHaveAttribute('data-loaded','true');
 await page.reload();await page.evaluate(()=>localStorage.removeItem('halalcheck-off-products-v1'));await page.route('**/api/products/*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body({image_front_url:photo.replace('003/600/029/1452','301/762/042/2003')}))}));await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#barcode-input').fill(code);await page.locator('#barcode-form button[type=submit]').click();await expect(page.locator('#product-photo')).toHaveCount(0);await expect(page.locator('#product-photo-message')).toHaveText('Photo unavailable');
});
test('all twelve languages translate upload choices, placeholder and ingredient summary',async({page})=>{
 await lookup(page,{ingredients_text:'milk, gelatin'});
 for(const language of ['en','it','ar','ur','hi','bn','fr','de','es','tr','ms','id']){await page.locator('#language-select').selectOption(language);const expected=await page.evaluate(l=>({photo:window.halalI18n.get('Photo unavailable',l),source:window.halalI18n.get('Source needs verification.',l),scan:window.halalI18n.get('Scan Ingredients',l)}),language);await expect(page.locator('#product-photo-message')).toHaveText(expected.photo);await expect(page.locator('.ingredient-findings')).toContainText(expected.source);await expect(page.locator('[data-action="label-fallback"]')).toHaveText(expected.scan);await expect(page.locator('#result-view h1')).toHaveText('Matched product');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
