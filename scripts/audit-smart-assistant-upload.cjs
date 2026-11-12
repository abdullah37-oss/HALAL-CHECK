// Inspect Vercel dry-run metadata supplied privately; never publish source roots.
const fs=require('node:fs'),{containsMachinePath}=require('./privacy.cjs');
const input=process.argv[2];if(!input)throw Error('Dry-run metadata path required');
const dry=JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,''));
const files=dry.files.filter(f=>(f.mode&61440)!==16384),findings=[];
for(const entry of files){const p=entry.path.replaceAll('\\','/');
 if(/(^|\/)(\.git(?:\/|$)|\.env(?:\.|$)|\.vercel\/|\.release-private\/|node_modules\/|test-results\/|reports\/|tests\/)/.test(p))findings.push({path:p,kind:'private or test upload'});
 const text=fs.readFileSync(p).toString('utf8');
 if(/sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(text.replaceAll('sb_secret_syntheticinvalidkey0000000000','')))findings.push({path:p,kind:'secret-shaped text'});
 if(containsMachinePath(text))findings.push({path:p,kind:'absolute machine path'});
}
const report={checkedAt:new Date().toISOString(),files:files.length,bytes:files.reduce((n,f)=>n+f.size,0),ignoredGit:dry.ignored.includes('.git'),findings,passed:findings.length===0&&dry.ignored.includes('.git'),productionDeployment:false};
fs.writeFileSync('reports/smart-assistant-upload-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
