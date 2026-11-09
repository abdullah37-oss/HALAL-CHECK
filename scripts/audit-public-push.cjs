const fs=require('node:fs');const cp=require('node:child_process');const {containsMachinePath}=require('./privacy.cjs');
const git=args=>cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:20*1024*1024});
const privatePlan=fs.existsSync('.release-private/OWNER_SETUP_PLAN.md')?fs.readFileSync('.release-private/OWNER_SETUP_PLAN.md','utf8'):'';
const privateEmail=privatePlan.match(/^Email: (.+)\.$/m)?.[1];
const privateOutcome=fs.existsSync('.release-private/owner-invitation-outcome.json')?JSON.parse(fs.readFileSync('.release-private/owner-invitation-outcome.json','utf8')):{};
const privateIdentities=[privateEmail,privateOutcome.accountId].filter(Boolean);
const commits=git(['rev-list','HEAD','--not','--remotes=Halal-check']).trim().split(/\r?\n/).filter(Boolean);
const findings=[],syntheticFixtures=[];let filesChecked=0;
for(const commit of commits){
 const identity=git(['show','-s','--format=%an%n%ae%n%cn%n%ce',commit]).trim().split(/\r?\n/);
 if(!identity[1]?.endsWith('@users.noreply.github.com')||!identity[3]?.endsWith('@users.noreply.github.com'))findings.push({commit,kind:'non-noreply author/committer identity'});
 for(const file of git(['ls-tree','-r','--name-only',commit]).trim().split(/\r?\n/)){
  if(/(^|\/)(\.env(?:\.|$)|\.release-private\/|\.vercel\/)/.test(file))findings.push({commit,file,kind:'private file tracked'});
  if(!/\.(?:js|cjs|ts|html|css|md|json|toml|sql|tap|txt|webmanifest|lock)$/.test(file))continue;
  const text=git(['show',commit+':'+file]);filesChecked++;
  if(containsMachinePath(text))findings.push({commit,file,kind:'absolute machine/profile path'});
  if(privateIdentities.some(value=>text.toLowerCase().includes(value.toLowerCase())))findings.push({commit,file,kind:'private owner identifier'});
  let scan=text;if(['tests/qa/admin-config.test.cjs','scripts/audit-public-push.cjs'].includes(file)&&scan.includes('sb_secret_syntheticinvalidkey0000000000')){scan=scan.replaceAll('sb_secret_syntheticinvalidkey0000000000','');syntheticFixtures.push({commit,file,kind:file.startsWith('tests/')?'Explicit invalid test fixture, not a credential':'Scanner reference to the same known invalid test fixture'});}
  if(/sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(scan))findings.push({commit,file,kind:'secret-shaped credential'});
  for(const match of scan.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){try{if(JSON.parse(Buffer.from(match[1],'base64url')).role==='service_role')findings.push({commit,file,kind:'service-role JWT'});}catch{}}
 }
}
const report={checkedAt:new Date().toISOString(),scope:'Only newly outgoing history; already-published history is unchanged',commits,filesChecked,findings,syntheticFixtures,decision:findings.length?'BLOCK':'PASS',privateFilesInOutgoingHistory:findings.some(item=>item.kind==='private file tracked'),productionDeploymentAuthorized:false};
fs.writeFileSync('reports/github-publish-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(findings.length)process.exitCode=1;
