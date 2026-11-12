const {test}=require('node:test');
const assert=require('node:assert/strict');
const {productImages,ingredientSummary}=require('../../dist-server/presentation.cjs');
const {mapOpenFoodFacts}=require('../../dist-server/off-client.cjs');
const {load}=require('./helpers.cjs');
const code='0036000291452',other='3017620422003';
const main='https://images.openfoodfacts.org/images/products/003/600/029/1452/front_en.1.400.jpg';
const alternate=main.replace('.1.','.2.');
const product=(extra={})=>mapOpenFoodFacts({product:{code,product_name:'Fixture',ingredients_text:'milk, sugar',...extra}},code).product;
test('OFF main image has priority over thumbnail and curated fallback',()=>{const p=product({image_front_url:main,image_front_small_url:alternate});assert.equal(p.imageUrl,main);assert.deepEqual(productImages(p,code,[{...p,imageUrl:alternate}]),[main,alternate]);});
test('missing OFF image uses only an exact-identity curated image',()=>{const p=product();assert.deepEqual(productImages(p,code,[{...p,imageUrl:main}]),[main]);assert.deepEqual(productImages(p,code,[{...p,scannedBarcode:other,returnedBarcode:other,imageUrl:main}]),[]);});
test('identity mismatch and unknown product never supply a photo',()=>{const p={...product(),imageUrl:main};assert.deepEqual(productImages(p,other,[p]),[]);assert.deepEqual(productImages(null,code,[p]),[]);});
test('a matching record cannot smuggle another product photo',()=>{const wrong=main.replace('003/600/029/1452','301/762/042/2003');const p={...product(),imageUrl:wrong};assert.deepEqual(productImages(p,code,[]),[]);assert.deepEqual(productImages(p,code,[{...p,imageUrl:main}]),[main]);});
test('unsafe images and duplicates are rejected without a network request',()=>{const p=product();assert.deepEqual(productImages({...p,imageUrl:'https://untrusted.test/guess.jpg'},code,[]),[]);assert.deepEqual(productImages({...p,imageUrl:main},code,[{...p,imageUrl:main}]),[main]);});
for(const [ingredients,expected,heading] of [
 ['milk, pork gelatin, sugar',['pork gelatin'],'Contains'],
 ['milk, gelatin, sugar',['gelatin'],'Needs verification'],
 ['milk, mystery compound',['mystery compound'],'Needs verification'],
 ['milk, sugar, salt',['milk','sugar','salt'],'Assessed ingredients']
])test('only actual relevant findings: '+ingredients,()=>{const {window:w}=load();const a=w.halalAnalyzer.analyze(ingredients);const s=ingredientSummary(a);assert.equal(s.heading,heading);assert.deepEqual(Array.from(s.findings,f=>f.ingredient),expected);});
test('unknown gelatin source is not invented',()=>{const {window:w}=load();const s=ingredientSummary(w.halalAnalyzer.analyze('gelatin'));assert.equal(s.findings[0].reason,'Source needs verification.');assert.ok(!JSON.stringify(s).includes('pork'));});
test('long ingredient lists show at most three unique findings',()=>{const {window:w}=load();const s=ingredientSummary(w.halalAnalyzer.analyze('milk, sugar, salt, water, pectin, milk'));assert.equal(s.findings.length,3);assert.equal(new Set(s.findings.map(f=>f.ingredient)).size,3);});
test('missing and incomplete information remains explicit',()=>{const {window:w}=load();assert.equal(ingredientSummary(null).message,'Ingredients are unavailable.');assert.equal(ingredientSummary(w.halalAnalyzer.analyze([])).findings.length,0);assert.equal(ingredientSummary(w.halalAnalyzer.analyze('milk',{evidenceComplete:false})).message,'More ingredient information is needed.');});
test('low-confidence OCR cannot label its uncertain findings as prohibited',()=>{const {window:w}=load();const a=w.halalAnalyzer.analyze('pork',{ocrConfidence:.1,ocrConfirmed:true});assert.equal(a.classification,'needs-checking');assert.equal(ingredientSummary(a).findings.length,0);});
