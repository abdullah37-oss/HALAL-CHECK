// Controlled offline research only. This command never promotes a product.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createWorker}=require('tesseract.js');
const {isRetailBarcode,sameBarcode}=require('../dist-server/catalogue.cjs');
async function run(manifest){
 const jobs=JSON.parse(fs.readFileSync(manifest,'utf8'));
 if(!Array.isArray(jobs)||jobs.length>100)throw Error('Expected at most 100 licensed local image jobs');
 const root=path.resolve('.release-private/catalogue-images');
 const results=[];let worker;
 try{for(const job of jobs){
  const file=path.resolve(root,job.file);
  if(!file.startsWith(root+path.sep)||!isRetailBarcode(job.barcode)||!/^https:\/\/images\.openfoodfacts\.org\/images\/products\/[\d/]+\/[a-z0-9_.-]+$/i.test(job.sourceUrl)||!sameBarcode(new URL(job.sourceUrl).pathname.match(/\/images\/products\/([\d/]+)\//)?.[1]?.replaceAll('/','')||'',job.barcode)||job.licence!=='CC-BY-SA-3.0')throw Error('Invalid licensed image job');
  const bytes=fs.readFileSync(file);if(bytes.length>12*1024*1024||crypto.createHash('sha256').update(bytes).digest('hex')!==job.sha256)throw Error('Image hash/size mismatch');
  worker ||= await createWorker('ita',1,{workerPath:require.resolve('tesseract.js/src/worker-script/node/index.js'),langPath:path.resolve('dist/assets/ocr/lang'),gzip:true,cacheMethod:'none'});
  const {data}=await worker.recognize(bytes);
  const normalize=s=>String(s).normalize('NFKC').toLocaleLowerCase('it').replace(/[^\p{L}\p{N}]/gu,'');
  const expected=normalize(job.expectedOriginal),actual=normalize(data.text);
  const matches=expected.length>=20&&actual.includes(expected);
  results.push({barcode:job.barcode,synthetic:job.synthetic===true,sourceUrl:job.sourceUrl,imageSha256:job.sha256,confidence:data.confidence,extractedOriginal:data.text,completeTextMatch:matches,qualityGate:data.confidence>=90&&matches?'CORROBORATION_CANDIDATE':'REVIEW_REQUIRED',verificationStatus:'REVIEW_REQUIRED',note:'OCR cannot establish exact packaging identity or full-label coverage by itself.'});
 }}finally{await worker?.terminate();}
 fs.writeFileSync('reports/italy-ocr.json',JSON.stringify({offline:true,productsPromoted:0,results},null,2)+'\n');console.log(JSON.stringify({jobs:results.length,productsPromoted:0}));
}
run(process.argv[2]||'data/italy/ocr-jobs.json').catch(e=>{console.error(e.message);process.exitCode=1});
