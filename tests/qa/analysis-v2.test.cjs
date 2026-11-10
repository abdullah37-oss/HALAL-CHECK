const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers.cjs');
const cases=[
 ['Arabic diacritics and Arabic comma','حَلِيب، سُكَّر','likely-halal'],
 ['Arabic prohibited ingredient','حليب؛ لحم الخنزير','not-halal'],
 ['Italian compound with prohibited fat','farina, acqua, strutto','not-halal'],
 ['spaced E number','E 471','needs-checking'],
 ['hyphenated E number','E-471','needs-checking'],
 ['clearly stated plant source','E 471 (plant-derived)','likely-halal'],
 ['positive source cannot mask unknown compound','E471 plant-derived mystery additive','needs-checking'],
 ['possibly plant source','E471 possibly plant-derived','needs-checking'],
 ['animal gelatin unspecified','milk, gelatin','needs-checking'],
 ['fish gelatin still requires process evidence','fish gelatin','needs-checking'],
 ['rennet source-dependent','animal rennet','needs-checking'],
 ['enzyme source-dependent','milk, enzymes','needs-checking'],
 ['emulsifier source-dependent','E472e','needs-checking'],
 ['flavourings uncertain','milk, flavouring','needs-checking'],
 ['sugar alcohol false-positive protection','sorbitol, xylitol, mannitol, cetyl alcohol','likely-halal'],
 ['ethanol explicitly flagged','milk, ethanol','not-halal'],
 ['wine explicitly flagged','wine','not-halal'],
 ['vinegar is not beverage','vinegar','likely-halal'],
 ['unrecognized ingredient','unrecognized additive xyz','needs-checking'],
 ['unknown mixed compound','milk and mystery compound','needs-checking'],
 ['negative label not prohibited evidence','without pork','needs-checking'],
 ['marketing label not ingredient evidence','pork free','needs-checking'],
 ['empty label','','not-enough-information'],
 ['only punctuation',' , ؛ , ','not-enough-information'],
 ['reference yogurt ambiguous flavouring','Pasteurised skimmed milk, pectin, flavouring (aroma)','needs-checking']
];
for(const [name,input,expected] of cases)test('2.0 classification corpus: '+name,()=>assert.equal(load().window.halalAnalyzer.analyze(input).classification,expected));
for(const options of [{ocrConfirmed:false},{ocrConfidence:0.2},{evidenceComplete:false}])test('recognition evidence gate '+JSON.stringify(options),()=>assert.equal(load().window.halalAnalyzer.analyze('milk, sugar',options).classification,'needs-checking'));
test('unreviewed low-confidence OCR remains uncertain independently of source classification',()=>{const {window:w}=load();const result=w.halalAnalyzer.analyze([{originalText:'milk',source:'ocr',confidence:0.4}]);assert.equal(result.classification,'needs-checking');assert.equal(result.recognitionUncertain,true);});
test('complete user-confirmed readable ingredients share the manual policy',()=>{const {window:w}=load();assert.equal(w.halalAnalyzer.analyze('milk, sugar',{ocrConfirmed:true,evidenceComplete:true}).classification,w.halalAnalyzer.analyze('milk, sugar').classification);});
test('product parser supports multilingual ingredient separators',()=>{const {window:w}=load();const p=w.productModel.createProduct({ingredientsRaw:'حليب، سكر؛ gelatin',ingredientDataSource:'user_corrected'});assert.equal(p.ingredients.length,3);assert.equal(w.halalAnalyzer.analyze(p.ingredients).classification,'needs-checking');});
test('malformed local product cache is ignored rather than trusted',()=>{const context=load();context.localStorage.setItem('halalcheck-off-products-v1',JSON.stringify({version:1,products:{'96385074':{returnedBarcode:'96385074',lastUpdated:new Date().toISOString(),ingredients:[{originalText:'milk'}]}}}));assert.equal(context.window.productRepository.getByBarcode('96385074').status,'not-found');});
test('corrupt API top-level data is rejected safely',async()=>{const {window:w}=load();for(const response of [null,[],42,'not an object'])assert.equal((await w.productRepository.lookup('96385074',{fetcher:async()=>({ok:true,json:async()=>response})})).status,'malformed-data');});
for(const lang of ['en','it','ar','ur','hi','bn','fr','de','es','tr','ms','id'])test('language never changes rule evaluation: '+lang,()=>{const {window:w}=load();assert.equal(w.halalAnalyzer.analyze('milk, pork gelatin',{language:lang}).classification,'not-halal');assert.equal(w.halalAnalyzer.analyze('milk, mystery',{language:lang}).classification,'needs-checking');});
