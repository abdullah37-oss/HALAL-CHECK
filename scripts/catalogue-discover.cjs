// Bounded batch discovery; never performs one request per barcode.
const fs=require('node:fs'), crypto=require('node:crypto');
const retailers=['conad','lidl','eurospin','md','todis','ins'];
async function discover(){
 fs.mkdirSync('data/italy/sources',{recursive:true});
 const log=[];
 for(const retailer of retailers){
  const file=`data/italy/sources/${retailer}.json`;
  if(fs.existsSync(file)){console.log(retailer,'already recorded');continue;}
  const url=new URL('https://world.openfoodfacts.org/api/v2/search');
  const fields='code,product_name,product_name_it,brands,categories_tags,countries_tags,stores_tags,stores,quantity,lang,ingredients_text,ingredients_text_it,ingredients_text_en,ingredients,ingredients_tags,data_quality_errors_tags,data_quality_warnings_tags,image_front_url,image_ingredients_url,last_modified_t,rev,obsolete,owner,states_tags';
  for(const [k,v] of Object.entries({countries_tags:'en:italy',stores_tags:retailer,page_size:'100',page:'1',fields}))url.searchParams.set(k,v);
  try{
   const r=await fetch(url,{headers:{'User-Agent':'HalalCheck/2.0 (https://github.com/abdullah37-oss/HALAL-CHECK)'},signal:AbortSignal.timeout(45000),redirect:'error'});
   const event={retailer,url:url.href,status:r.status,retrievedAt:new Date().toISOString(),retryAfter:r.headers.get('retry-after')};
   if(!r.ok){log.push(event);console.log(retailer,r.status);if(r.status===429||r.status===503||r.headers.has('retry-after'))break;continue;}
   const text=await r.text();if(Buffer.byteLength(text)>8*1024*1024)throw Error('Batch exceeds 8 MiB');
   const body=JSON.parse(text);if(!Array.isArray(body.products))throw Error('Unexpected batch schema');
   fs.writeFileSync(file,JSON.stringify({...event,licence:'ODbL-1.0 / DbCL-1.0; images CC-BY-SA-3.0',responseSha256:crypto.createHash('sha256').update(text).digest('hex'),sha256:crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),body},null,2)+'\n');
   log.push({...event,records:body.products.length,totalMatching:body.count});console.log(retailer,body.products.length,body.count);
  }catch(e){log.push({retailer,error:e.message});console.log(retailer,e.message);}
  await new Promise(r=>setTimeout(r,6500));
 }
 fs.writeFileSync('data/italy/discovery.json',JSON.stringify({recordedAt:new Date().toISOString(),method:'Six bounded retailer search batches, up to 100 records each; no per-product reads.',events:log},null,2)+'\n');
}
discover().catch(e=>{console.error(e.message);process.exitCode=1});
