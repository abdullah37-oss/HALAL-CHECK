const fs=require('node:fs');const vm=require('node:vm');const {stripTypeScriptTypes}=require('node:module');
function loadEdge(file,client,origin='https://halal-check-sigma.vercel.app') {
 let handler;
 const source=stripTypeScriptTypes(fs.readFileSync(file,'utf8')).replace(/^import .*;\r?$/gm,'');
 vm.runInNewContext(source,{Request,Response,URL,createClient:()=>client,Deno:{env:{get:key=>key.endsWith('_ORIGIN')?origin:'synthetic-server-only-test-value'},serve:fn=>{handler=fn;}}},{filename:file});
 return handler;
}
module.exports={loadEdge};
