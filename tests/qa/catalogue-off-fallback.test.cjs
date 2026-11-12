const {test}=require('node:test'),assert=require('node:assert/strict');
const {createProductHandler}=require('../../dist-server/product-handler.cjs'),{mapOpenFoodFacts}=require('../../dist-server/off-client.cjs'),{load}=require('./helpers.cjs');
const code='0036000291452',other='3017620422003',url='https://qa.test/api/products/'+code;
const raw=(text='milk, sugar',extra={})=>({product:{code,lang:'en',product_name:'SYNTHETIC QA',ingredients_text:text,...extra}});
const fresh=(text,extra)=>mapOpenFoodFacts(raw(text,extra),code).product;
const local=(status='REVIEW_REQUIRED',stale=false)=>({...fresh(''),catalogue:{status,stale,ingredientHash:'a'.repeat(64),policyVersion:'2026.11.12'}});
const response=body=>new Response(JSON.stringify(body),{status:200});
const analyze=p=>load().window.halalAnalyzer.analyze(p.ingredients,{evidenceComplete:p.ingredientEvidence.state==='complete'}).classification;
for(const status of ['REVIEW_REQUIRED','INCOMPLETE','VERIFIED'])test('fresh validated OFF replaces '+status+' research/stale evidence without verification promotion',async()=>{
 const held=local(status,status==='VERIFIED');let calls=0;const h=createProductHandler({catalogueLookup:()=>held,fetcher:async()=>{calls++;return response(raw());}});
 const r=await h(new Request(url)),p=(await r.json()).product;assert.equal(r.status,200);assert.equal(calls,1);assert.equal(p.catalogue,undefined);assert.equal(p.certification,'not-verified');assert.equal(analyze(p),'likely-halal');assert.equal(held.ingredients.length,0);
});
for(const [text,extra,expected]of [['gelatin',{},'needs-checking'],['pork',{},'not-halal'],['',{},'not-enough-information'],['milk...',{},'needs-checking'],['milk',{data_quality_errors_tags:['en:ingredients-incomplete']},'needs-checking']])test('fallback retains ingredient policy: '+JSON.stringify([text,extra]),async()=>{
 const h=createProductHandler({catalogueLookup:()=>local(),fetcher:async()=>response(raw(text,extra))});const p=(await(await h(new Request(url))).json()).product;assert.equal(analyze(p),expected);assert.equal(p.certification,'not-verified');
});
for(const state of ['VERIFIED','REJECTED'])test('current verified packaging/quarantine stays authoritative: '+state,async()=>{let calls=0;const held=local(state);const h=createProductHandler({catalogueLookup:()=>held,fetcher:async()=>{calls++;return response(raw('milk'));}});const p=(await(await h(new Request(url))).json()).product;assert.equal(calls,0);assert.equal(p.catalogue.status,state);});
for(const [name,fetcher]of [
 ['offline',async()=>{throw Error('offline');}],
 ['not found',async()=>new Response('{}',{status:404})],
 ['rate limited',async()=>new Response('{}',{status:429,headers:{'Retry-After':'60'}})],
 ['unavailable',async()=>new Response('{}',{status:503,headers:{'Retry-After':'60'}})],
])test('availability failure returns only withheld catalogue evidence: '+name,async()=>{const h=createProductHandler({catalogueLookup:()=>local(),fetcher,sleep:async()=>{}});const r=await h(new Request(url)),p=(await r.json()).product;assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(p.ingredientsRaw,'');assert.equal(p.catalogue.status,'REVIEW_REQUIRED');assert.equal(analyze(p),'not-enough-information');});
for(const [name,body]of [['wrong identity',{product:{code:other,ingredients_text:'milk'}}],['malformed',{product:{code,ingredients_text:42}}]])test('integrity failure cannot be concealed by local research: '+name,async()=>{const r=await createProductHandler({catalogueLookup:()=>local(),fetcher:async()=>response(body)})(new Request(url));assert.equal(r.status,502);assert.equal((await r.json()).product,undefined);});
test('rate limit cooldown survives catalogue fallback without more OFF traffic',async()=>{let calls=0;const h=createProductHandler({catalogueLookup:()=>local(),fetcher:async()=>{calls++;return new Response('{}',{status:429,headers:{'Retry-After':'60'}});}});await h(new Request(url));await h(new Request(url));assert.equal(calls,1);});
test('concurrent lookups deduplicate and successful fresh result is cached',async()=>{let calls=0;const h=createProductHandler({catalogueLookup:()=>local(),fetcher:async()=>{calls++;return response(raw());}});await Promise.all([h(new Request(url)),h(new Request(url))]);await h(new Request(url));assert.equal(calls,1);});
test('withheld catalogue response cannot prevent browser retry for an hour',()=>{const w=load().window;w.productRepository.save(local());assert.equal(w.productRepository.getByBarcode(code).status,'not-found');w.productRepository.save(fresh('milk'));assert.equal(w.productRepository.getByBarcode(code).status,'verified');});
test('previous catalogue cache generation cannot shadow fresh lookup',()=>{const c=load();const p=fresh('milk');c.localStorage.setItem('halalcheck-off-products-v1',JSON.stringify({version:1,catalogueGeneration:'italy-v1',products:{['36000291452:en']:p}}));assert.equal(c.window.productRepository.getByBarcode(code).status,'not-found');});
