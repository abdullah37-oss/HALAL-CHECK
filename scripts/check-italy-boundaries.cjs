// Read-only production boundary checks. Public config keys stay in memory.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),cp=require('node:child_process');
const preview=process.argv[2];if(preview&&!/^https:\/\/halal-check-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/.test(preview))throw Error('Immutable preview required');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const production='https://halal-check-sigma.vercel.app';
 const baseline=JSON.parse(cp.execFileSync('git',['show','5108d9e89d826a6a77d7749c0365d345d5c5dd1a:reports/release-artifact-manifest.json'],{encoding:'utf8'}));
 const context=vm.createContext({window:{}});vm.runInContext(fs.readFileSync('admin/config.js','utf8'),context);
 const config=context.window,endpoint=new URL(config.HALALCHECK_ADMIN_STATS_ENDPOINT);
 if(endpoint.origin!==config.HALALCHECK_SUPABASE_URL||endpoint.pathname!=='/functions/v1/admin-stats')throw Error('Unexpected public endpoint configuration');
 const results={productionWrites:0,supabaseMutations:0,authMutations:0};
 for(const file of ['app.js','sw.js']){const r=await fetch(production+'/'+file,{signal:AbortSignal.timeout(20000)});results[file]={status:r.status,matchesPinnedProduction:r.ok&&hash(Buffer.from(await r.arrayBuffer()))===baseline.files.find(f=>f.path===file).sha256};}
 const home=await fetch(production,{signal:AbortSignal.timeout(20000)});results.homepageStatus=home.status;
 const stats=await fetch(endpoint,{headers:{apikey:config.HALALCHECK_SUPABASE_ANON_KEY,Authorization:'Bearer '+config.HALALCHECK_SUPABASE_ANON_KEY,Origin:production},signal:AbortSignal.timeout(20000)});results.anonymousAnalyticsStatus=stats.status;results.anonymousAnalyticsProtected=[401,403].includes(stats.status);
 for(const [name,origin]of [['productionPreflight',production],...(preview?[['previewPreflight',preview]]:[])]){const r=await fetch(endpoint,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization,apikey'},signal:AbortSignal.timeout(20000)});results[name]={status:r.status,originAllowed:r.headers.get('access-control-allow-origin')===origin};}
 results.productionGuardedSourceChanges=cp.execFileSync('git',['diff','e8561e7a86fad465e2707c29a1b7f3a85d2f33a0','--name-only','--','admin','supabase','config.js','manifest.webmanifest'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 results.passed=results['app.js'].matchesPinnedProduction&&results['sw.js'].matchesPinnedProduction&&results.homepageStatus===200&&results.anonymousAnalyticsProtected&&results.productionPreflight.originAllowed&&(!preview||!results.previewPreflight.originAllowed)&&results.productionGuardedSourceChanges.length===0;
 fs.writeFileSync('reports/italy-production-boundaries.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));if(!results.passed)process.exitCode=1;
})().catch(()=>{console.error('Read-only boundary verification failed; no credentials logged.');process.exitCode=1});
