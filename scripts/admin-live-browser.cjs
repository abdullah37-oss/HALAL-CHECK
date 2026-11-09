// No real credentials, Auth writes or analytics are allowed during this diagnosis.
const fs=require('node:fs');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch();const page=await browser.newPage();const errors=[],failures=[],authAttempts=[];try {
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push({url:r.url().split('?')[0],reason:r.failure()?.errorText}));
 await page.route('**/auth/v1/**',route=>{authAttempts.push({method:route.request().method(),path:new URL(route.request().url()).pathname});return route.abort();});
 await page.route('**/functions/v1/analytics-event',route=>route.abort());
 await page.goto('https://halal-check-sigma.vercel.app/admin/',{waitUntil:'networkidle',timeout:30000});
 await page.locator('#auth-form').waitFor();
 const config=await page.evaluate(()=>({urlPresent:!!window.HALALCHECK_SUPABASE_URL,keyPresent:!!window.HALALCHECK_SUPABASE_ANON_KEY,endpointPresent:!!window.HALALCHECK_ADMIN_STATS_ENDPOINT}));
 if(!config.urlPresent||!config.keyPresent){await page.locator('#email').fill('diagnostic@example.invalid');await page.locator('#password').fill('synthetic-not-a-real-password');const submit=page.locator('#auth-form button[type=submit]');if(await submit.isEnabled())await submit.click();await page.locator('#email').fill('');await page.locator('#password').fill('');}
 const report={checkedAt:new Date().toISOString(),configuration:config,errorMessage:await page.locator('#auth-error').innerText(),submitEnabled:await page.locator('#auth-form button[type=submit]').isEnabled(),pageErrors:errors,requestFailures:failures,interceptedAuthAttempts:authAttempts,ownerAuthentication:'NOT TESTED: no owner account or password was supplied',analyticsWrites:0};
 const phase=process.argv.includes('--after')?'after':'before';await page.screenshot({path:`reports/admin-live-${phase}.png`,fullPage:true});fs.writeFileSync(`reports/admin-live-browser-${phase}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}})();
