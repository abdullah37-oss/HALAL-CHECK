// Stream a legally obtained official JSONL(.gz) export, never a global in-memory array.
const fs=require('node:fs'),readline=require('node:readline'),zlib=require('node:zlib'),crypto=require('node:crypto');
async function ingest(file,retrievedAt){
 if(!file||!Number.isFinite(Date.parse(retrievedAt)))throw Error('Usage: node scripts/catalogue-ingest-bulk.cjs LOCAL_JSONL_OR_GZ RETRIEVED_AT_ISO');
 const groups=new Map(['conad','lidl','eurospin','md','todis','ins'].map(x=>[x,[]]));
 const stream=fs.createReadStream(file), input=file.endsWith('.gz')?stream.pipe(zlib.createGunzip()):stream;
 let scanned=0,invalid=0;
 for await(const line of readline.createInterface({input,crlfDelay:Infinity})){
  scanned++;if(Buffer.byteLength(line)>1024*1024){invalid++;continue;}
  let p;try{p=JSON.parse(line)}catch{invalid++;continue;}
  if(!Array.isArray(p.countries_tags)||!p.countries_tags.includes('en:italy'))continue;
  for(const [retailer,products]of groups)if(products.length<1000&&Array.isArray(p.stores_tags)&&p.stores_tags.some(s=>String(s).toLowerCase()===retailer))products.push(p);
 }
 fs.mkdirSync('data/italy/sources',{recursive:true});
 for(const [retailer,products]of groups){const body={products};const batch={retailer,url:'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz',retrievedAt,licence:'ODbL-1.0 / DbCL-1.0; images CC-BY-SA-3.0',sha256:crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),body};fs.writeFileSync(`data/italy/sources/bulk-${retailer}.json`,JSON.stringify(batch,null,2)+'\n');}
 console.log(JSON.stringify({scanned,invalid,candidates:Object.fromEntries([...groups].map(([k,v])=>[k,v.length])),perRetailerBound:1000}));
}
if(require.main===module)ingest(process.argv[2],process.argv[3]).catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={ingest};
