const {test}=require('node:test'),assert=require('node:assert/strict'),{load}=require('./helpers.cjs');
for(const value of [NaN,Infinity,-Infinity,1.1,-0.1,null,'1'])test('invalid OCR confidence remains uncertain: '+String(value),()=>assert.equal(load().window.halalAnalyzer.analyze('milk',{ocrConfidence:value,ocrConfirmed:true}).classification,'needs-checking'));
test('valid high confidence and confirmed complete label keep normal policy',()=>assert.equal(load().window.halalAnalyzer.analyze('milk',{ocrConfidence:0.95,ocrConfirmed:true}).classification,'likely-halal'));
test('manual text without OCR confidence remains independent of recognition',()=>assert.equal(load().window.halalAnalyzer.analyze('milk').classification,'likely-halal'));
test('out-of-range OCR evidence object cannot bypass uncertainty',()=>assert.equal(load().window.halalAnalyzer.analyze([{originalText:'milk',source:'ocr',confidence:2}]).classification,'needs-checking'));
