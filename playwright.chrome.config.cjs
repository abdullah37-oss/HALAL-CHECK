const {defineConfig}=require('@playwright/test');
const base=require('./playwright.config.cjs');
module.exports=defineConfig({...base,
 testMatch:['**/smart-assistant*.spec.cjs','**/app.spec.cjs','**/scanner-image.spec.cjs'],
 reporter:[['list'],['json',{outputFile:'reports/chrome-browser.json'}]],
 projects:[
  {name:'chrome-desktop',use:{browserName:'chromium',channel:'chrome',viewport:{width:1440,height:900}}},
  {name:'chrome-mobile',use:{browserName:'chromium',channel:'chrome',viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
 ]
});
