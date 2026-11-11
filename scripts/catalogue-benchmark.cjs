const fs=require('node:fs'),{performance}=require('node:perf_hooks'),{DatabaseSync}=require('node:sqlite');
const {createCatalogueLookup}=require('../dist-server/catalogue.cjs'),{createProductHandler}=require('../dist-server/product-handler.cjs');
const {load}=require('../tests/qa/helpers.cjs');
const {execFileSync}=require('node:child_process');
const db=new DatabaseSync('data/italy/catalogue.sqlite',{readOnly:true}),rows=db.prepare('SELECT barcode FROM products').all();db.close();
const percentile=(values,p)=>values.sort((a,b)=>a-b)[Math.floor(values.length*p)];
(async()=>{
 const lookup=createCatalogueLookup(),coldStart=performance.now();lookup(rows[0].barcode);const cold=performance.now()-coldStart;
 const indexed=[];for(let n=0;n<10000;n++){const start=performance.now();lookup(rows[n%rows.length].barcode);indexed.push(performance.now()-start);}
 const context=load(),repository=context.window.productRepository;for(const row of rows)repository.save(lookup(row.barcode));
 const cached=[];for(let n=0;n<2000;n++){const start=performance.now();repository.getByBarcode(rows[n%rows.length].barcode);cached.push(performance.now()-start);}
 const endpoint=[];let maxBytes=0;
 // 25 independent warm instances, 40 simultaneous local requests each, no upstream traffic.
 for(let instance=0;instance<25;instance++){
  const handler=createProductHandler({fetcher:async()=>{throw Error('No upstream in benchmark')}});
  await Promise.all(rows.slice(0,40).map(async row=>{const start=performance.now();const r=await handler(new Request('https://benchmark.test/api/products/'+row.barcode));if(r.status!==200)throw Error('Benchmark request failed');maxBytes=Math.max(maxBytes,Buffer.byteLength(await r.text()));endpoint.push(performance.now()-start);}));
 }
 const baseline=JSON.parse(execFileSync('git',['show','e8561e7a86fad465e2707c29a1b7f3a85d2f33a0:reports/release-artifact-manifest.json'],{encoding:'utf8'}));
 const startupFiles=['app.js','src/i18n/index.js','src/utils/productRepository.js','src/models/productModel.js'];
 const startupDeltaBytes=startupFiles.reduce((sum,file)=>sum+fs.statSync('dist/'+file).size-baseline.files.find(f=>f.path===file).bytes,0);
 const report={environment:'Local Windows Node '+process.version+'; 98 real candidate rows; synthetic concurrent instances, not production latency or Android CWV',rows:rows.length,coldOpenMs:cold,indexed:{samples:10000,p95Ms:percentile(indexed,.95),budgetMs:250},browserCache:{samples:2000,p95Ms:percentile(cached,.95),budgetMs:150},endpoint:{samples:endpoint.length,concurrencyPerInstance:40,p95Ms:percentile(endpoint,.95),maximumResponseBytes:maxBytes},startupDeltaBytes,initialCatalogueDownloads:0,physicalAndroidTest:false,coreWebVitalsMeasured:false};
 report.passed=report.indexed.p95Ms<250&&report.browserCache.p95Ms<150&&startupDeltaBytes<15000;
 fs.writeFileSync('reports/italy-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
