const {test}=require('node:test'),assert=require('node:assert/strict');
const {mapOpenFoodFacts}=require('../../dist-server/off-client.cjs'),{load}=require('./helpers.cjs');
const code='0036000291452';
function assess(text){const result=mapOpenFoodFacts({product:{code,ingredients_text:text}},code);assert.equal(result.status,'verified');const p=result.product;return {p,a:load().window.halalAnalyzer.analyze(p.ingredients,{evidenceComplete:p.ingredientEvidence.state==='complete'})};}
test('OFF decimal percentages use the same parser as manual and OCR input',()=>{const {p,a}=assess('latte 99,5%, zucchero 0,5%');assert.equal(p.ingredients.length,2);assert.equal(a.classification,'likely-halal');});
test('OFF cap cannot silently discard ingredient 201 and declare halal',()=>{const {p,a}=assess([...Array(200).fill('milk'),'pork'].join(', '));assert.equal(p.ingredients.length,200);assert.equal(p.ingredientEvidence.state,'partial');assert.equal(a.classification,'needs-checking');});
test('OFF missing label is separate from unknown ingredient origin',()=>{const {p,a}=assess('');assert.equal(p.ingredientEvidence.state,'missing');assert.equal(a.classification,'not-enough-information');assert.equal(assess('gelatin').a.classification,'needs-checking');});
test('OFF ingredient text remains evidence, never verified certification',()=>{const {p}=assess('milk');assert.equal(p.certification,'not-verified');});
