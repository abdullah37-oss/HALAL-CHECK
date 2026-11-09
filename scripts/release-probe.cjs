// Read-only baseline; never sends valid analytics, credentials, or Auth mutations.
const fs=require('node:fs');const vm=require('node:vm');const crypto=require('node:crypto');
const c={window:{}};vm.runInNewContext(fs.readFileSync('admin/config.js','utf8'),c);
const site='https://halal-check-sigma.vercel.app';const supabase=c.window.HALALCHECK_SUPABASE_URL;const key=c.window.HALALCHECK_SUPABASE_ANON_KEY;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
(async()=>{
const checks=await Promise.all([
 ...['/','/app.js','/sw.js','/config.js','/admin/','/manifest.webmanifest'].map(path=>({url:site+path,path,headers:{},method:'GET'})),
 ...['analytics-event','admin-stats'].flatMap(name=>['GET','OPTIONS'].map(method=>({url:supabase+'/functions/v1/'+name,headers:{Origin:site},method}))),
 {url:supabase+'/auth/v1/settings',headers:{apikey:key},method:'GET',authConfiguration:true}
].map(async check=>{try{const r=await fetch(check.url,{headers:check.headers,method:check.method,signal:AbortSignal.timeout(15000)});const source=await r.text();const result={url:check.url,method:check.method,status:r.status,headers:Object.fromEntries(['cache-control','content-security-policy','access-control-allow-origin'].map(k=>[k,r.headers.get(k)]))};if(check.path&&fs.existsSync(check.path.slice(1))&&fs.statSync(check.path.slice(1)).isFile()){result.liveSha256=hash(source);result.localSha256=hash(fs.readFileSync(check.path.slice(1)));result.matchesLocal=result.liveSha256===result.localSha256;}if(check.authConfiguration&&r.ok){const settings=JSON.parse(source);result.signupDisabled=settings.disable_signup ?? null;}if(check.path==='/sw.js')result.liveCacheVersion=source.match(/halalcheck-v\d+/)?.[0];return result;}catch(e){return {url:check.url,error:e.message};}}));
const report={checkedAt:new Date().toISOString(),productionWrites:0,checks};fs.writeFileSync('reports/release-live-baseline.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})();
