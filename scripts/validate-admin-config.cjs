const fs=require('node:fs');const vm=require('node:vm');
function validateAdminConfiguration(root='.') {
 const context=vm.createContext({window:{},URL,atob});
 for(const file of ['admin/config.js','admin/runtime-config.js'])vm.runInContext(fs.readFileSync(root+'/'+file,'utf8'),context,{filename:file,timeout:1000});
 if(!context.window.halalAdminConfig?.ready)throw Error('Admin deployment configuration is missing, invalid, inconsistent, or contains a non-public key');
 const html=fs.readFileSync(root+'/admin/index.html','utf8');
 const config=html.indexOf('src="config.js"'),validator=html.indexOf('src="runtime-config.js"'),app=html.indexOf('src="admin.js"');
 if(config<0||validator<=config||app<=validator)throw Error('Admin configuration scripts must load before the login module');
 const publicContext=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(root+'/config.js','utf8'),publicContext,{timeout:1000});
 const endpoint=new URL(publicContext.window.HALALCHECK_ANALYTICS_ENDPOINT);
 if(endpoint.origin!==new URL(context.window.halalAdminConfig.value.url).origin||endpoint.pathname!=='/functions/v1/analytics-event')throw Error('Analytics and admin configuration must target the same Supabase project');
 return true;
}
module.exports={validateAdminConfiguration};
if(require.main===module){validateAdminConfiguration();console.log('Admin/public runtime configuration validated.');}
