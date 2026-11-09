const cp=require('node:child_process');const fs=require('node:fs');
const git=args=>cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:10*1024*1024});
const privatePlan=fs.existsSync('.release-private/OWNER_SETUP_PLAN.md')?fs.readFileSync('.release-private/OWNER_SETUP_PLAN.md','utf8'):'';const privateOwnerEmail=privatePlan.match(/^Email: (.+)\.$/m)?.[1]||'';
const commits=git(['rev-list','HEAD','--not','--remotes=Halal-check']).trim().split(/\r?\n/).filter(Boolean);const findings=[];const syntheticFixtures=[];let absolutePaths=false,ownerEmailFound=false,filesChecked=0;
for(const commit of commits)for(const file of git(['ls-tree','-r','--name-only',commit]).trim().split(/\r?\n/)){
 if(/(^|\/)(\.env(?:\.|$)|\.release-private\/|\.vercel\/)/.test(file))findings.push({commit,file,kind:'private file path'});
 if(!/\.(js|cjs|ts|html|css|md|json|toml|sql|tap|txt|webmanifest|lock)$/.test(file))continue;
 const text=git(['show',commit+':'+file]);filesChecked++;
 if(/[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/]/i.test(text))absolutePaths=true;
 if(privateOwnerEmail&&text.toLowerCase().includes(privateOwnerEmail.toLowerCase()))ownerEmailFound=true;
 const scanText=file==='tests/qa/admin-config.test.cjs'?text.replaceAll('sb_secret_syntheticinvalidkey0000000000',''):text;if(scanText!==text)syntheticFixtures.push({commit,file,kind:'Deliberately invalid test-only secret-shaped string; no real credential'});if(/sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(scanText))findings.push({commit,file,kind:'secret-shaped value'});
 for(const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){try{if(JSON.parse(Buffer.from(match[1],'base64url')).role==='service_role')findings.push({commit,file,kind:'service-role JWT'});}catch{}}
}
const report={commits,filesChecked,credentialFindings:findings,syntheticFixtures,actualOwnerEmailInTrackedPayload:ownerEmailFound,localWindowsWorkspacePathsPresent:absolutePaths,publicMetadata:['Git author identity','GitHub repository/owner','Supabase project reference and public publishable key','Function/migration names, grants and deployment test results','Vercel public site/workspace names'],privateSetupAndEnvironmentFilesTracked:false,decision:findings.length||ownerEmailFound?'BLOCK':'No detected credentials or owner email; public metadata disclosure still requires approval review'};
fs.writeFileSync('reports/github-publish-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
