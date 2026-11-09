const fs=require('fs');const path=require('path');const vm=require('vm');
require('./validate-admin-config.cjs').validateAdminConfiguration();
const assets=['index.html','app.js','analytics.js','config.js','styles.css','sw.js','manifest.webmanifest','offline.html','src','icons','admin'];
const output=path.resolve('dist');if(path.dirname(output)!==process.cwd())throw Error('Unsafe build output');fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});for(const asset of assets)fs.cpSync(asset,path.join('dist',asset),{recursive:true});
for(const file of ['app.js','analytics.js','config.js','sw.js'])new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
const html=fs.readFileSync('index.html','utf8');for(const [,asset] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(!asset.startsWith('http')&&!fs.existsSync(asset))throw Error('Missing asset '+asset);}
JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));console.log('Static production assets validated and copied to dist/');

for(const file of ['supabase/functions/admin-stats/index.ts','supabase/functions/analytics-event/index.ts','supabase/functions/_shared/analytics-handler.ts']) { const source=require('node:module').stripTypeScriptTypes(fs.readFileSync(file,'utf8'));new vm.Script(source.replace(/^import .*;$/gm,'').replace(/^export /gm,''),{filename:file}); }
