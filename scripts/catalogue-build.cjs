const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const {DatabaseSync}=require('node:sqlite');
const {importCatalogue}=require('../dist-server/catalogue.cjs');
function analyzer(){
 const context=vm.createContext({window:{}});
 for(const f of ['data/ingredientDatabase','data/universalHalalPolicy','utils/halalAnalyzer'])vm.runInContext(fs.readFileSync('dist/src/'+f+'.js','utf8'),context);
 return {policy:context.window.universalHalalPolicy.version,analyze:(text,complete)=>context.window.halalAnalyzer.analyze(text,{language:'it',evidenceComplete:complete})};
}
function build({incremental=false}={}){
 const target=path.resolve('data/italy/catalogue.sqlite'),temp=target+'.pending';
 if(fs.existsSync(temp))fs.unlinkSync(temp);
 if(incremental&&fs.existsSync(target))fs.copyFileSync(target,temp);
 const db=new DatabaseSync(temp),engine=analyzer();
 try{
  const batches=fs.readdirSync('data/italy/sources').filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(fs.readFileSync('data/italy/sources/'+f,'utf8')));
  const reviews=JSON.parse(fs.readFileSync('data/italy/reviews.json','utf8'));
  const now=Date.now(),recordedAt=Math.max(...batches.map(b=>Date.parse(b.retrievedAt)),...reviews.map(r=>Date.parse(r.reviewedAt)).filter(t=>Number.isFinite(t)&&t<=now));
  const counts=importCatalogue(db,batches,reviews,engine.policy,engine.analyze,now,recordedAt);
  const products=db.prepare('SELECT p.*,a.policy_version,a.classification,a.ingredient_findings FROM products p JOIN product_assessments a USING(identity) ORDER BY p.identity').all();
  const sources=db.prepare('SELECT * FROM product_sources ORDER BY source_id').all();
  const retailers=db.prepare('SELECT * FROM product_retailers ORDER BY identity,retailer_id').all();
  const runs=db.prepare('SELECT * FROM import_runs ORDER BY run_id').all();
  db.close();
  if(incremental&&fs.existsSync(target))fs.copyFileSync(target,target+'.rollback');
  fs.renameSync(temp,target);
  fs.mkdirSync('dist/catalogue',{recursive:true});
  const download={schema:1,licence:'ODbL-1.0',contentsLicence:'DbCL-1.0',imagesLicence:'CC-BY-SA-3.0',attribution:'Open Food Facts contributors',policy:engine.policy,products,sources,retailers,runs};
  fs.writeFileSync('dist/catalogue/italy.json.gz',zlib.gzipSync(JSON.stringify(download)));
  fs.copyFileSync('data/italy/LICENCE.md','dist/catalogue/LICENCE.txt');
  fs.mkdirSync('reports',{recursive:true});
  const quality={identifiableNameAndBrand:products.filter(p=>p.product_name&&p.brand).length,retainedOriginalIngredientTexts:products.filter(p=>p.ingredients_original).length,invalidOrOutOfScopeRecords:batches.flatMap(b=>b.body.products.filter(p=>!products.some(v=>v.barcode===p.code)).map(p=>({barcode:String(p.code),reason:'Invalid retail barcode or out of scope'}))),categories:Object.fromEntries([...new Set(products.map(p=>p.category))].map(c=>[c,products.filter(p=>p.category===c).length]))};
  fs.writeFileSync('reports/italy-catalogue.json',JSON.stringify({policy:engine.policy,...counts,uniqueValidatedBarcodes:counts.imported,...quality,target:1000,shortfall:1000-counts.verified,independentlyVerifiedImages:0},null,2)+'\n');
  console.log('Italian catalogue:',JSON.stringify(counts));
  return counts;
 }catch(e){try{db.close()}catch{}if(fs.existsSync(temp))fs.unlinkSync(temp);throw e;}
}
if(require.main===module)build({incremental:process.argv.includes('--incremental')});
module.exports={build,analyzer};
