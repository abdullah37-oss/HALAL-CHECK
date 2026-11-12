const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('@playwright/test');
const baseline=path.resolve('../ai-baseline/dist'),candidate=path.resolve('dist');
const coreFiles=['app.js','analytics.js','src/i18n/index.js','src/data/ingredientDatabase.js','src/data/universalHalalPolicy.js','src/utils/halalAnalyzer.js','src/models/productModel.js','src/data/productCatalog.js','src/utils/productRepository.js'];
function server(root,port){return new Promise(resolve=>{const s=http.createServer((req,res)=>{let p;try{p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local.test').pathname));}catch{return res.writeHead(400).end();}if(p!==root&&!p.startsWith(root+path.sep))return res.writeHead(403).end();if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!fs.existsSync(p)||!fs.statSync(p).isFile())return res.writeHead(404).end();res.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(p).pipe(res);});s.listen(port,'127.0.0.1',()=>resolve(s));});}
const p95=values=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*.95))];
(async()=>{
 if(!fs.existsSync(path.join(baseline,'app.js')))throw Error('Build the untouched baseline first');
 const servers=await Promise.all([server(baseline,4180),server(candidate,4181)]),browser=await chromium.launch(),samples={baseline:[],candidate:[],assistant:[]};
 try{
  for(let run=0;run<5;run++)for(const name of ['baseline','candidate','assistant']){
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),cdp=await context.newCDPSession(page);
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
   await context.route('**/functions/v1/**',r=>r.abort());
   await page.addInitScript(()=>{window.__labLcp=0;new PerformanceObserver(list=>{for(const e of list.getEntries())window.__labLcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
   await page.goto('http://127.0.0.1:'+(name==='baseline'?4180:4181)+(name==='assistant'?'/assistant/':'/'));await page.waitForTimeout(180);
   const initial=await page.evaluate(()=>({domContentLoadedMs:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,lcpMs:window.__labLcp,resources:performance.getEntriesByType('resource').map(r=>r.name)}));
   if(name!=='assistant'){
    await page.locator('#decline-analytics').click();await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#ingredients-input').fill('milk, sugar, salt');
    await page.evaluate(()=>window.__labInteraction=performance.now());await page.locator('#barcode-form button[type=submit]').click();await page.locator('.assessment-card strong').waitFor();
   }else{
    await page.locator('#assistant-mode').selectOption('ingredients');await page.locator('#assistant-input').fill('milk, sugar, salt');await page.evaluate(()=>window.__labInteraction=performance.now());await page.locator('#assistant-send').click();await page.locator('[data-assistant-result]').waitFor();
   }
   const interactionMs=await page.evaluate(()=>performance.now()-window.__labInteraction),metrics=(await cdp.send('Performance.getMetrics')).metrics;
   samples[name].push({...initial,interactionMs,jsHeapUsedBytes:metrics.find(m=>m.name==='JSHeapUsedSize')?.value||null});await context.close();
  }
 }finally{await browser.close();await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));}
 const summary=Object.fromEntries(Object.entries(samples).map(([name,rows])=>[name,{samples:rows.length,domContentLoadedP95Ms:p95(rows.map(r=>r.domContentLoadedMs)),lcpP95Ms:p95(rows.map(r=>r.lcpMs)),interactionP95Ms:p95(rows.map(r=>r.interactionMs)),jsHeapUsedP95Bytes:p95(rows.map(r=>r.jsHeapUsedBytes||0))}]));
 const startupDeltaBytes=coreFiles.reduce((sum,f)=>sum+fs.statSync(path.join(candidate,f)).size-fs.statSync(path.join(baseline,f)).size,0),assistantBytes=fs.statSync(path.join(candidate,'assets/smart-assistant.js')).size;
 const unexpectedHomeDependency=samples.candidate.some(r=>r.resources.some(url=>/smart-assistant\.js|ingredient-ocr\.js|barcode-decoder\.js/.test(url)));
 const report={environment:'Local HTTP Chromium, 390x844, 4x CPU throttle, five cold contexts per scenario; laboratory metrics, not field Core Web Vitals or physical Android',baselineCommit:'06a5898e15d35d24e123ec29d1a768a3b4c5de1d',summary,startupDeltaBytes,assistantPageOnlyBundleBytes:assistantBytes,unexpectedHomeDependency,paidInferenceCalls:0,physicalAndroidTest:false,passed:startupDeltaBytes<15000&&!unexpectedHomeDependency&&summary.candidate.domContentLoadedP95Ms<Math.max(2000,summary.baseline.domContentLoadedP95Ms*1.5)&&summary.candidate.interactionP95Ms<1000&&summary.assistant.interactionP95Ms<1000};
 fs.writeFileSync('reports/smart-assistant-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
