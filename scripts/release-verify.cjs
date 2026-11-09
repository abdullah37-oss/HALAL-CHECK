// Post-deployment verification. No valid analytics request or Auth mutation is sent.
const fs=require('node:fs');const vm=require('node:vm');const crypto=require('node:crypto');const c={window:{}};
vm.runInNewContext(fs.readFileSync('admin/config.js','utf8'),c);
const site='https://halal-check-sigma.vercel.app', backend=c.window.HALALCHECK_SUPABASE_URL, key=c.window.HALALCHECK_SUPABASE_ANON_KEY;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
(async()=>{
 const checks=[];
 const check=async(name,url,options,accept)=>{try{const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});const body=await response.text();const result={name,status:response.status,passed:accept(response,body)};checks.push(result);}catch(e){checks.push({name,passed:false,error:e.message});}};
 for(const file of ['app.js','sw.js','config.js','admin/admin.js','admin/config.js','manifest.webmanifest'])await check('deployed bytes match '+file,site+'/'+file,{},(r,b)=>r.status===200&&hash(b)===hash(fs.readFileSync('dist/'+file)));
 for(const fn of ['analytics-event','admin-stats'])await check(fn+' CORS preflight',backend+'/functions/v1/'+fn,{method:'OPTIONS',headers:{Origin:site,'Access-Control-Request-Method':fn==='analytics-event'?'POST':'GET','Access-Control-Request-Headers':fn==='analytics-event'?'content-type':'authorization'}},r=>r.status===200&&r.headers.get('access-control-allow-origin')===site);
 await check('admin requires authentication',backend+'/functions/v1/admin-stats',{headers:{Origin:site}},r=>r.status===401);
 await check('admin rejects invalid token',backend+'/functions/v1/admin-stats',{headers:{Origin:site,Authorization:'Bearer invalid-release-verification-token'}},r=>r.status===401);
 await check('anonymous reporting RPC denied',backend+'/rest/v1/rpc/get_admin_analytics',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_days:1})},r=>[401,403].includes(r.status));
 await check('analytics rejects foreign origin',backend+'/functions/v1/analytics-event',{method:'OPTIONS',headers:{Origin:'https://release-check.invalid'}},r=>r.status===403);
 await check('worker cache header',site+'/sw.js',{},r=>r.headers.get('cache-control')?.includes('no-store'));
 await check('frontend CSP',site+'/',{},r=>r.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
 const result={checkedAt:new Date().toISOString(),checks,automatedReadOnlyChecksPassed:checks.every(c=>c.passed),productionWrites:0,ownerLogin:'UNVERIFIED: requires owner secure sign-in',realConsentedIngestion:'UNVERIFIED: requires a genuine consented visit; do not generate fake events',decision:'NO-GO until owner login, real pipeline and retention are independently verified'};
 fs.writeFileSync('reports/release-postdeployment.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.automatedReadOnlyChecksPassed)process.exitCode=1;
})();
