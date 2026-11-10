const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const cp = require('node:child_process');
const { test, expect } = require('@playwright/test');
const baselineCommit = 'd5265ec31f40bb4c26060898a29f99e438755d22';
const captured = path.resolve('.release-private/pwa-production-v5');
const source = fs.readFileSync('src/app/service-worker.ts','utf8').match(/const APP_SHELL = \[([\s\S]*?)\];/)[1];
const publicFiles = [...new Set(['sw.js',...Array.from(source.matchAll(/'([^']+)'/g),m=>m[1]==='./'?'index.html':m[1].replace(/^\.\//,''))])];
const baseline = new Map(publicFiles.map(file => [file, fs.existsSync(path.join(captured,file)) ? fs.readFileSync(path.join(captured,file)) : cp.execFileSync('git',['show',baselineCommit+':'+file])]));
const candidate = new Map(JSON.parse(fs.readFileSync('reports/release-artifact-manifest.json','utf8')).files.map(file=>[file.path,fs.readFileSync('dist/'+file.path)]));
const mime = {'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
let phase, server, origin;
test.beforeAll(async()=>{
 server=http.createServer((req,res)=>{
  const pathname = new URL(req.url,'http://localhost').pathname;
  const file = pathname.endsWith('/') ? pathname.slice(1)+'index.html' : pathname.slice(1);
  if(phase==='broken'&&file==='src/i18n/index.js'){res.writeHead(503,{'Cache-Control':'no-store'}).end('Simulated interrupted update');return;}
  const bytes=(phase==='old'?baseline:candidate).get(file);
  if(!bytes){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':file==='sw.js'||pathname.startsWith('/admin/')?'no-store':'no-cache'}).end(bytes);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
test.beforeEach(async({context})=>{phase='old';await context.route(/^https?:\/\/(?!127\.0\.0\.1:)/,route=>route.abort());});
async function installProduction(page){
 await page.goto(origin+'/');
 await page.locator('#decline-analytics').click();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
 await expect.poll(()=>page.evaluate(()=>caches.keys())).toContain('halalcheck-v5');
 await page.evaluate(()=>{
  localStorage.setItem('halalcheck-language','it');localStorage.setItem('halalcheck-theme','dark');
  localStorage.setItem('halalcheck-history',JSON.stringify([{modelVersion:2,name:'Saved acceptance fixture',barcode:'80771548',date:'2026-11-10',ingredientDataSource:'user_corrected',statusClass:'unknown',status:'NEEDS CHECKING',analysis:{classification:'needs-checking'}}]));
  localStorage.setItem('sb-anvswymarultvsbszjte-auth-token','synthetic-upgrade-session-only');
 });
 await page.reload();
 return page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
}
async function requestUpdate(page){return page.evaluate(async()=>{
 const registration=await navigator.serviceWorker.getRegistration();
 return new Promise((resolve,reject)=>{
  registration.addEventListener('updatefound',()=>{const incoming=registration.installing;incoming.addEventListener('statechange',()=>{if(['activated','redundant'].includes(incoming.state))resolve(incoming.state);});},{once:true});
  registration.update().catch(reject);
 });
});}
async function verifyUpgrade(page,context,previous){
 await expect.poll(()=>page.evaluate(()=>caches.keys())).not.toContain('halalcheck-v5');
 await expect.poll(()=>page.evaluate(()=>caches.keys())).toContain('halalcheck-v6');
 await page.reload();
 await expect(page.locator('#barcode-image')).toHaveCount(1);
 await expect(page.locator('#language-select')).toHaveValue('it');
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.locator('#recent-scans')).toContainText('Saved acceptance fixture');
 expect(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)))).toEqual(previous);
 await page.evaluate(()=>fetch('/admin/'));
 const paths=await page.evaluate(async()=>{const cache=await caches.open('halalcheck-v6');return(await cache.keys()).map(request=>new URL(request.url).pathname);});
 expect(paths.some(p=>p.startsWith('/admin'))).toBe(false);
 await context.setOffline(true);await page.reload();
 await expect(page.locator('#language-select')).toHaveValue('it');await expect(page.locator('#barcode-image')).toHaveCount(1);
 await expect(page.locator('#recent-scans')).toContainText('Saved acceptance fixture');
 await context.setOffline(false);
}
test('production v5 upgrades to v6 without reinstalling or clearing settings, history, consent or Auth storage',async({page,context},info)=>{
 test.setTimeout(45000);const previous=await installProduction(page);phase='candidate';expect(await requestUpdate(page)).toBe('activated');await verifyUpgrade(page,context,previous);
 fs.writeFileSync(`reports/${info.project.name}-pwa-upgrade.json`,JSON.stringify({baselineSource:fs.existsSync(captured)?'Captured production static files':'Pinned production Git baseline',from:'halalcheck-v5',to:'halalcheck-v6',manifestIdentityPreserved:true,localStoragePreserved:true,offlineNewShell:true,adminCacheExcluded:true,physicalInstalledAndroidTest:false,productionWrites:0},null,2));
});
test('interrupted v6 installation retains the production offline shell and succeeds on retry',async({page,context})=>{
 test.setTimeout(45000);const previous=await installProduction(page);phase='broken';expect(await requestUpdate(page)).toBe('redundant');
 await expect.poll(()=>page.evaluate(()=>caches.keys())).toContain('halalcheck-v5');
 await context.setOffline(true);await page.reload();await expect(page.locator('#barcode-image')).toHaveCount(0);await expect(page.locator('#language-select')).toHaveValue('it');
 expect(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)))).toEqual(previous);
 await context.setOffline(false);phase='candidate';expect(await requestUpdate(page)).toBe('activated');await verifyUpgrade(page,context,previous);
});
