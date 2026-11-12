const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
async function lookup(page,ingredients){
 await page.route('**/api/products/*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({product:{code:'0036000291452',product_name:'Synthetic ingredient regression',brands:'QA only',lang:'it',ingredients_text:ingredients}})}));
 await page.goto('/');await page.locator('#decline-analytics').click();await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#barcode-input').fill('0036000291452');await page.locator('#barcode-form button[type=submit]').click();
}
for(const [label,expected] of [
 ['latte 99,5%, zucchero 0,5%','HALAL'],
 ['latte pastorizzato, fermenti lattici vivi','HALAL'],
 ['aceto di vino, acqua','HALAL'],
 ['lievito di birra, farina, acqua','HALAL'],
 ['aceto di vino e vino','HARAM'],
 ['latte (gelatina), zucchero','NEEDS CHECKING'],
 ['latte, mystery additive','NEEDS CHECKING'],
 ['','NEEDS CHECKING']
])test('real product path preserves ingredient policy: '+label,async({page})=>{await lookup(page,label);await expect(page.locator('.assessment-card strong')).toHaveText(expected);await expect(page.locator('.certification')).toHaveText('Halal certification: Not verified');});
test('source uncertainty names the ingredient and offers a translated action',async({page})=>{
 await lookup(page,'milk, gelatin, sugar');
 await expect(page.locator('.ingredient-findings strong')).toHaveText('gelatin');
 await expect(page.locator('.assessment-card p')).toHaveText('Cannot confirm the ingredient source.');
 await expect(page.locator('.ingredient-summary p')).toHaveText('Ask the manufacturer to confirm the source.');
 await page.locator('#language-select').selectOption('it');
 await expect(page.locator('.assessment-card p')).toHaveText('Origine del componente non confermata.');
 await expect(page.locator('.ingredient-summary p')).toHaveText('Chiedi al produttore di confermare l’origine.');
});
