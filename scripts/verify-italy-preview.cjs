// Existing-project PREVIEW verification only. CLI supplies its authenticated
// deployment-protection access; no credentials/cookies are printed or saved.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const site=process.argv[2],deploymentId=process.argv[3],sourceCommit=process.argv[4];
if(!/^https:\/\/halal-check-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/.test(site||'')||!/^dpl_[A-Za-z0-9]+$/.test(deploymentId||'')||! /^[0-9a-f]{40}$/.test(sourceCommit||''))throw Error('An immutable existing-project preview URL, deployment ID and source SHA are required.');
const manifest=JSON.parse(fs.readFileSync('reports/release-artifact-manifest.json'));
const security=JSON.parse(fs.readFileSync('vercel.json')).headers[0].headers.filter(h=>h.key!=='Cache-Control');
const tasks=manifest.files.map(f=>({route:'/'+f.path,file:f.path,sha256:f.sha256}));
for(const [route,file] of [['/','index.html'],['/admin/','admin/index.html'],['/admin/reset-password/','admin/reset-password/index.html']])tasks.push({route,file,sha256:manifest.files.find(f=>f.path===file).sha256});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[];let next=0;
async function request(route,method='GET'){
 if(!/^\/[a-zA-Z0-9/_.?=%:-]*$/.test(route)||!['GET','POST'].includes(method))throw Error('Unexpected probe');
 const result=await new Promise(resolve=>execFile('npx.cmd',['--yes','vercel','curl',route,'--deployment',site,'--','--silent','--show-error','--include','--request',method],{shell:true,encoding:'buffer',maxBuffer:24*1024*1024},(error,stdout)=>resolve({error,stdout})));
 const split=result.stdout.indexOf(Buffer.from('\r\n\r\n'));
 if(result.error||split<0)throw Error('Preview request failed');
 const headers=result.stdout.subarray(0,split).toString();
 return {status:Number(headers.match(/HTTP\/[\d.]+\s+(\d+)/)?.[1]),headers,body:result.stdout.subarray(split+4)};
}
async function worker(){while(next<tasks.length){const task=tasks[next++];try{const {status,headers,body}=await request(task.route);const exactMatch=hash(body)===task.sha256;const toolbarOnly=!exactMatch&&task.file.endsWith('.html')&&hash(body.toString().replace(/<script\b[^>]*\bsrc=["']https:\/\/vercel\.live\/_next-live\/feedback\/feedback\.js["'][^>]*><\/script>/g,''))===task.sha256;const securityHeaders=security.every(h=>headers.toLowerCase().includes(h.key.toLowerCase()+': '+h.value.toLowerCase()));const cachePolicy=/^\/admin\//.test(task.route)||task.route==='/sw.js'?/cache-control:.*no-store/i.test(headers):/cache-control:.*no-cache/i.test(headers);checks.push({route:task.route,status,exactMatch,toolbarOnly,securityHeaders,cachePolicy,passed:status===200&&(exactMatch||toolbarOnly)&&securityHeaders&&cachePolicy});}catch{checks.push({route:task.route,passed:false,error:'Preview request did not complete'});}}}
(async()=>{
 await Promise.all([worker(),worker(),worker()]);
 // Only one real product lookup. Remaining probes are rejected before upstream.
 for(const [route,method,expected] of [['/api/products/4056489068211?lang=it','GET',200],['/api/products/invalid','GET',400],['/api/products/4056489068211?url=https%3A%2F%2Fevil.test','GET',400],['/api/products/4056489068211','POST',405]]){
  try{const r=await request(route,method);let productValid=true;if(expected===200){const body=JSON.parse(r.body);productValid=body.schema==='halalcheck.off.v1'&&body.product?.returnedBarcode==='4056489068211'&&body.product?.productName==='Tofu smoked'&&body.product?.catalogue?.status==='REVIEW_REQUIRED'&&body.product?.ingredientEvidence?.state==='missing'&&body.product?.ingredients.length===0&&body.product?.certification==='not-verified';}checks.push({route,method,status:r.status,productValid:expected===200?productValid:undefined,passed:r.status===expected&&productValid});}catch{checks.push({route,method,passed:false,error:'API probe did not complete'});}
 }
 checks.sort((a,b)=>a.route.localeCompare(b.route));
 const report={checkedAt:new Date().toISOString(),site,deploymentId,sourceCommit,checks,passed:checks.every(c=>c.passed),verification:'Authenticated preview HTTP and all deployed asset hashes; behavior tested against identical local artifact. Physical-device and native-speaker review remain pending.',authMutations:0,productionWrites:0};
 fs.writeFileSync('reports/italy-preview-verification.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({site,deploymentId,sourceCommit,checks:checks.length,passed:report.passed,failures:checks.filter(c=>!c.passed)},null,2));
 if(!report.passed)process.exitCode=1;
})().catch(()=>{console.error('Preview verification could not finish. No credentials logged.');process.exitCode=1;});
