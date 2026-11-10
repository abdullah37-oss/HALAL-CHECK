// Synthetic regression product, not a claim about the real product at this code.
const yogurt={product:{code:'80771548',product_name:'VitaWell test yogurt',brands:'QA fixture',ingredients_text:'milk, gelatin'}};
exports.productRoute=route=>new URL(route.request().url()).pathname.endsWith('/80771548')?route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(yogurt)}):route.fulfill({status:404,contentType:'application/json',body:'{}'});
