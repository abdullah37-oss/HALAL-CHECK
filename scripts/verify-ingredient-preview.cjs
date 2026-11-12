// Preview-only verification. Protection cookies remain in memory; no Auth,
// analytics, passwords or production writes are performed.
const fs=require('node:fs'),{execFile}=require('node:child_process'),{chromium,expect}=require('@playwright/test');
const site=process.argv[2],sha=process.argv[3];
if(!/^https:\/\/halal-check-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/.test(site||'')||! /^[0-9a-f]{40}$/.test(sha||''))throw Error('Immutable preview URL and source SHA required');
const expected=JSON.parse(fs.readFileSync('reports/ingredient-after.json'));
const products=fs.readdirSync('data/italy/sources').flatMap(file=>JSON.parse(fs.readFileSync('data/italy/sources/'+file)).body.products);
const sample=expected.products.map(p=>{const raw=products.find(r=>r.code===p.barcode);return{barcode:p.barcode,text:raw.ingredients_text_it||raw.ingredients_text||raw.ingredients_text_en||'',expected:p.classification};});
(async()=>{
 const raw=await new Promise((resolve,reject)=>execFile('npx.cmd',['--yes','vercel','curl','/','--deployment',site,'--','--silent','--include','--header','"x-vercel-set-bypass-cookie: true"'],{shell:true,encoding:'utf8',maxBuffer:2*1024*1024},(error,stdout)=>error?reject(Error('Preview access failed')):resolve(stdout)));
 const cookies=[...raw.matchAll(/^set-cookie:\s*([^=;]+)=([^;\r\n]*).*$/gim)].map(m=>({name:m[1],value:m[2],url:site}));
 const browser=await chromium.launch(),checks=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,serviceWorkers:'block'});if(cookies.length)await context.addCookies(cookies);
  let analyticsAttempts=0,authAttempts=0;await context.route('**/functions/v1/analytics-event',route=>{analyticsAttempts++;return route.abort();});await context.route('**/auth/v1/**',route=>{authAttempts++;return route.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',()=>errors.push('Application runtime error'));await page.goto(site);await page.locator('#decline-analytics').click();
  const results=await page.evaluate(rows=>rows.map(row=>({barcode:row.barcode,classification:window.halalAnalyzer.analyze(row.text).classification,expected:row.expected})),sample);
  expect(results.filter(r=>r.classification!==r.expected)).toEqual([]);checks.push({name:'deployed analyzer reproduces all real sample labels',passed:true,sampleSize:results.length});
  async function manual(text){const again=page.locator('#result-view [data-action="scan-another"]');if(await again.isVisible())await again.click();else await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#ingredients-input').fill(text);await page.locator('#barcode-form button[type=submit]').click();}
  await manual('latte scremato pastorizzato, fermenti lattici vivi');await expect(page.locator('.assessment-card strong')).toHaveText('HALAL');checks.push({name:'real sampled yogurt label resolves through UI',passed:true});await page.screenshot({path:'reports/ingredient-preview-halal.png',fullPage:true});
  await manual('milk, gelatin');await expect(page.locator('.assessment-card strong')).toHaveText('NEEDS CHECKING');await expect(page.locator('.ingredient-findings strong')).toHaveText('gelatin');await expect(page.locator('.ingredient-summary p')).toHaveText('Ask the manufacturer to confirm the source.');checks.push({name:'specific gelatin uncertainty and useful action',passed:true});await page.screenshot({path:'reports/ingredient-preview-uncertain.png',fullPage:true});
  await page.locator('#language-select').selectOption('it');await expect(page.locator('.ingredient-summary p')).toHaveText('Chiedi al produttore di confermare l’origine.');await page.locator('#language-select').selectOption('en');checks.push({name:'Italian guidance renders without changing ingredient identity',passed:true});
  await manual('aceto di vino e vino');await expect(page.locator('.assessment-card strong')).toHaveText('HARAM');checks.push({name:'vinegar cannot conceal separate wine',passed:true});
  // One genuine barcode lookup on the deployed preview, using the existing
  // protected same-origin API. No fabricated analytics or Auth interactions.
  await page.locator('#result-view [data-action="scan-another"]').click();await page.locator('#barcode-input').fill('4056489099246');
  const liveResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/products/4056489099246');
  await page.locator('#barcode-form button[type=submit]').click();const live=await liveResponse;expect(live.status()).toBe(200);const liveProduct=(await live.json()).product;
  expect(liveProduct.returnedBarcode).toBe('4056489099246');expect(liveProduct.certification).toBe('not-verified');
  const liveClassification=await page.evaluate(p=>window.halalAnalyzer.analyze(p.ingredients,{evidenceComplete:p.ingredientEvidence.state==='complete'}).classification,liveProduct);
  await expect(page.locator('.assessment-card strong')).toHaveText(liveClassification==='likely-halal'?'HALAL':liveClassification==='not-halal'?'HARAM':'NEEDS CHECKING');
  const freshObserved=!liveProduct.catalogue&&liveProduct.ingredientDataSource==='Open Food Facts';
  checks.push({name:'genuine deployed barcode retrieves fresh validated OFF evidence',passed:freshObserved,barcode:liveProduct.returnedBarcode,evidenceState:liveProduct.ingredientEvidence.state,classification:liveClassification,certification:liveProduct.certification});
  await page.screenshot({path:'reports/ingredient-preview-live-off.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);expect(analyticsAttempts).toBe(0);expect(authAttempts).toBe(0);
  checks.push({name:'mobile layout and runtime',passed:true},{name:'zero analytics and Auth requests',passed:true});
  const report={checkedAt:new Date().toISOString(),site,sourceCommit:sha,checks,passed:checks.every(c=>c.passed),analyticsAttempts,authAttempts,ownerLoginVerified:false,productionMutationPerformed:false};fs.writeFileSync('reports/ingredient-preview-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
