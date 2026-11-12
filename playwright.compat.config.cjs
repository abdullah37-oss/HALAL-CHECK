const {defineConfig}=require('@playwright/test');
const base=require('./playwright.config.cjs');
module.exports=defineConfig({...base,
 testMatch:['**/smart-assistant*.spec.cjs','**/app.spec.cjs','**/admin-auth.spec.cjs','**/admin-recovery.spec.cjs','**/open-food-facts.spec.cjs','**/scanner-image.spec.cjs','**/simple-results.spec.cjs'],
 reporter:[['list'],['json',{outputFile:'reports/compat-browser.json'}]],
 projects:[{name:'firefox',use:{browserName:'firefox',viewport:{width:1280,height:900}}},{name:'webkit',use:{browserName:'webkit',viewport:{width:1280,height:900}}}]
});
