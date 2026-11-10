const {test}=require('node:test'); const assert=require('node:assert/strict'); const {load}=require('./helpers.cjs');
const {window:w}=load();
for (const record of w.ingredientDatabase) {
 test(`ingredient: ${record.id}`,()=>assert.equal(w.halalAnalyzer.analyze([record.name]).classification,record.assessmentCode));
 for (const alias of record.aliases) test(`alias: ${record.id}: ${alias}`,()=>assert.equal(w.halalAnalyzer.analyze([alias]).classification,record.assessmentCode));
}
for(const lang of w.universalHalalPolicy.languages) for(const id of ['PORK','GELATIN','PECTIN','MILK']) test(`translated evidence ${lang}/${id}`,()=>{
 const record=w.ingredientDatabase.find(r=>r.id===id); assert.equal(w.halalAnalyzer.analyze([record.translations[lang]],{language:lang}).classification,record.assessmentCode);
});
for(const [input,expected] of [
 [['milk with pork gelatin'],'not-halal'],[['sugar and lard'],'not-halal'],[['milk with gelatin'],'needs-checking'],[['not plant-derived gelatin'],'needs-checking'],[['E471 (plant-derived)'],'likely-halal'],[['E471 (possibly plant-derived)'],'needs-checking'],[['vegetable oil with animal fat'],'needs-checking'],[['unknown compound'],'needs-checking'],[[],'not-enough-information'],[['',null,{},'  '],'not-enough-information'],[['sorbitol','cetyl alcohol'],'likely-halal'],[['milk','strawberries','sugar','cultures'],'likely-halal'],[['milk','gelatin'],'needs-checking'],[['milk','pork gelatin'],'not-halal'],[['milk','pectin'],'likely-halal']
]) test(`regression ${JSON.stringify(input)}`,()=>assert.equal(w.halalAnalyzer.analyze(input).classification,expected));
test('yogurt evidence remains isolated from subsequent pork analysis',()=>{const p=w.productCatalog.find(p=>p.returnedBarcode==='80771548'); w.halalAnalyzer.analyze(['pork']); assert.equal(w.halalAnalyzer.analyze(p.ingredients).classification,'needs-checking');});
test('unknown barcode never fabricates a product',()=>assert.equal(w.productRepository.getByBarcode('96385074').status,'not-found'));
test('mismatched product is rejected',()=>assert.equal(w.productRepository.validateReturnedProduct('96385074',{returnedBarcode:'5901234123457'}).status,'identity-mismatch'));
test('source conflicts remain explicit',()=>assert.equal(w.productModel.compareSources(['milk'],['gelatin']).conflict,true));
for(const language of w.halalI18n.supported) test(`translation fallback keys ${language}`,()=>{for(const key of Object.keys(w.halalI18n.dictionaries.en)) assert.ok(w.halalI18n.get(key,language));});
test('unknown content within a known ingredient phrase remains uncertain',()=>assert.equal(w.halalAnalyzer.analyze(['milk with mystery additive']).classification,'needs-checking'));
test('unspecified flavouring is uncertain without inventing pork',()=>assert.equal(w.halalAnalyzer.analyze(['milk','fruit','flavouring']).classification,'needs-checking'));
