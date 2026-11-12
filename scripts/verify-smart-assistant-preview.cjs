// Preview-only browser verification; deployment-protection cookies stay in memory.
const fs=require('node:fs'),{execFile}=require('node:child_process'),{chromium,expect}=require('@playwright/test');
const site=process.argv[2],sourceCommit=process.argv[3];
if(!/^https:\/\/halal-check-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/.test(site||'')||! /^[0-9a-f]{40}$/.test(sourceCommit||''))throw Error('Immutable preview and source SHA required');
(async()=>{
 const cli=process.env.HALALCHECK_VERCEL_CLI;
 const raw=await new Promise((resolve,reject)=>execFile(cli?process.execPath:'npx.cmd',[...(cli?[cli]:['--yes','vercel']),'curl','/assistant/','--deployment',site,'--','--silent','--include','--header',cli?'x-vercel-set-bypass-cookie: true':'"x-vercel-set-bypass-cookie: true"'],{shell:!cli,encoding:'utf8',maxBuffer:2*1024*1024},(error,stdout)=>error?reject(Error('Preview access failed')):resolve(stdout)));
 const cookies=[...raw.matchAll(/^set-cookie:\s*([^=;]+)=([^;\r\n]*).*$/gim)].map(m=>({name:m[1],value:m[2],url:site}));
 const browser=await chromium.launch(),checks=[],errors=[];let analyticsAttempts=0,authAttempts=0,paidRequests=0;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,serviceWorkers:'block'});await context.addCookies(cookies);
  await context.route('**/functions/v1/analytics-event',r=>{analyticsAttempts++;return r.abort();});await context.route('**/auth/v1/**',r=>{authAttempts++;return r.abort();});
  context.on('request',r=>{if(/generativelanguage\.googleapis|api\.openai\.com|aiplatform\.googleapis/i.test(r.url()))paidRequests++;});
  const page=await context.newPage();page.on('pageerror',()=>errors.push('Application runtime exception'));
  await page.goto(site+'/assistant/');await expect(page.locator('.assistant-disclosure')).toContainText('Rule-based');await expect(page.locator('#assistant-online')).not.toBeChecked();
  async function ask(text,mode='ask'){await page.locator('#assistant-mode').selectOption(mode);await page.locator('#assistant-input').fill(text);await page.locator('#assistant-send').click();}
  await ask('milk, sugar','ingredients');await expect(page.locator('[data-assistant-result]').last()).toHaveText('HALAL');checks.push({name:'deployed local ingredient assessment',passed:true});
  await ask('milk, gelatin','ingredients');await expect(page.locator('[data-assistant-result]').last()).toHaveText('NEEDS CHECKING');await ask('why');await expect(page.locator('.assistant-message').last()).toContainText('gelatin');checks.push({name:'source uncertainty and contextual follow-up',passed:true});
  await page.locator('#assistant-clear').click();await ask('E471');await expect(page.locator('.assistant-message').last()).toContainText('Mono- and diglycerides');await expect(page.locator('[data-assistant-result]')).toHaveCount(0);checks.push({name:'ingredient explanation is not a product verdict',passed:true});
  await page.locator('#assistant-clear').click();await page.locator('#assistant-online').check();
  const search=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/product-search');await ask('Nutella','name');const response=await search,body=await response.json();
  const available=response.status()===200&&body.remoteStatus==='available'&&body.products?.length>0;
  checks.push({name:'real deployed free product-name source',passed:available,status:response.status(),remoteStatus:body.remoteStatus,candidates:body.products?.length||0,classification:body.classification});
  await expect(page.locator('[data-assistant-result]')).toHaveCount(0);
  if(available){
   const button=page.locator('.assistant-candidate button').first();await expect(button).toBeVisible();
   const lookup=page.waitForResponse(r=>/^\/api\/products\/\d+$/.test(new URL(r.url()).pathname));await button.click();const r=await lookup,p=(await r.json()).product;
   await expect(page.locator('[data-assistant-result]').last()).toBeVisible();
   const match=p?.returnedBarcode===body.products[0].barcode&&p?.certification==='not-verified';
   const classification=await page.evaluate(p=>window.halalAnalyzer.analyze(p.ingredients,{evidenceComplete:p.ingredientEvidence?.state==='complete'}).classification,p);
   await expect(page.locator('[data-assistant-result]').last()).toHaveText(classification==='likely-halal'?'HALAL':classification==='not-halal'?'HARAM':'NEEDS CHECKING');
   checks.push({name:'selected exact identity retrieves real ingredient evidence and policy result',passed:r.status()===200&&match,status:r.status(),barcode:p?.returnedBarcode,evidence:p?.ingredientEvidence?.state,classification,certification:p?.certification});
  }
  await page.locator('#assistant-language').selectOption('ar');await expect(page.locator('html')).toHaveAttribute('dir','rtl');await page.locator('#assistant-language').selectOption('en');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'reports/smart-assistant-preview.png',fullPage:true});checks.push({name:'mobile layout, RTL and runtime',passed:errors.length===0});
  await page.locator('#assistant-clear').click();
  let photoUploads=0;const monitor=r=>{if(r.method()!=='GET'||new URL(r.url()).pathname.startsWith('/api/'))photoUploads++;};page.on('request',monitor);
  const pixels=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=350;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='58px Arial';x.fillText('milk, sugar, salt',80,130);return c.toDataURL('image/png').split(',')[1];});
  await page.locator('summary').click();await page.locator('#assistant-photo').setInputFiles({name:'local-label.png',mimeType:'image/png',buffer:Buffer.from(pixels,'base64')});
  await expect(page.locator('#assistant-review')).toBeVisible({timeout:100000});await expect(page.locator('#assistant-review-text')).toHaveValue(/milk/i);await expect(page.locator('[data-assistant-result]')).toHaveCount(0);await expect(page.locator('#assistant-confirm')).toBeDisabled();
  await page.locator('#assistant-review-text').fill('milk, sugar, salt');await page.locator('#assistant-complete').check();await page.locator('#assistant-confirm').click();await expect(page.locator('[data-assistant-result]').last()).toHaveText('HALAL');page.off('request',monitor);
  checks.push({name:'real deployed on-device OCR, explicit review and no photo/text upload',passed:photoUploads===0,uploadRequests:photoUploads});
  checks.push({name:'no paid inference, analytics or Auth requests',passed:paidRequests===0&&analyticsAttempts===0&&authAttempts===0});
  const report={checkedAt:new Date().toISOString(),site,sourceCommit,checks,passed:checks.every(c=>c.passed),paidRequests,analyticsAttempts,authAttempts,productionWrites:0,liveOwnerLoginVerified:false,photoValidation:'Real deployed local OCR on generated text label; not a claim of natural packaging accuracy'};
  fs.writeFileSync('reports/smart-assistant-preview-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});


