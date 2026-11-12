// Optional research tool. Install the official @duckdb/node-api in ignored
// .release-private/catalogue-research; it is never an application dependency.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
async function run(){
 const {DuckDBInstance}=require(path.resolve('.release-private/catalogue-research/node_modules/@duckdb/node-api'));
 fs.mkdirSync('.release-private/catalogue-research/extensions',{recursive:true});
 const instance=await DuckDBInstance.create(':memory:',{max_memory:'256MB',threads:'2',extension_directory:path.resolve('.release-private/catalogue-research/extensions')}),con=await instance.connect();
 const deadline=setTimeout(()=>{con.interrupt();console.error('Bulk research deadline reached; no records imported');process.exit(2);},120000);
 try{
  await con.run('INSTALL httpfs; LOAD httpfs; SET http_timeout=20; SET http_retries=0;');
  const metadata=await fetch('https://huggingface.co/api/datasets/openfoodfacts/product-database',{signal:AbortSignal.timeout(20000)}).then(r=>{if(!r.ok)throw Error('Bulk metadata unavailable');return r.json()});
  if(!/^[a-f0-9]{40}$/.test(metadata.sha))throw Error('Unpinned bulk revision');
  const url=`https://huggingface.co/datasets/openfoodfacts/product-database/resolve/${metadata.sha}/food.parquet`;
  const query=`SELECT code,product_name,brands,categories_tags,countries_tags,stores_tags,quantity,lang,ingredients_text,data_quality_errors_tags,data_quality_warnings_tags,last_modified_t,rev,obsolete,images FROM read_parquet('${url}') WHERE list_contains(countries_tags,'en:italy') AND list_has_any(stores_tags,['lidl','conad','eurospin','md','todis','ins']) LIMIT 1200`;
  const reader=await con.runAndReadAll(query),rows=reader.getRowObjectsJson();
  fs.mkdirSync('.release-private/catalogue',{recursive:true});
  fs.writeFileSync('.release-private/catalogue/parquet-records.json',JSON.stringify({url,revision:metadata.sha,retrievedAt:new Date().toISOString(),rows},null,2));
  console.log(JSON.stringify({records:rows.length,revision:metadata.sha,saved:'Ignored research output; normalization and quality gates still required'}));
 }finally{clearTimeout(deadline);con.closeSync();instance.closeSync();}
}
run().catch(e=>{console.error(String(e.message).slice(0,1000));process.exitCode=1});
