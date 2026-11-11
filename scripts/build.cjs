const fs=require('fs');const path=require('path');const esbuild=require('esbuild');
const output=path.resolve('dist');if(path.dirname(output)!==process.cwd())throw Error('Unsafe build output');fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
const copy=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});};
for(const file of ['index.html','styles.css','config.js','manifest.webmanifest','offline.html','icons','admin/index.html','admin/admin.css','admin/config.js','admin/reset-password/index.html'])if(fs.existsSync(file))copy(file,path.join(output,file));
const entries={
 'app.js':['src/app/main.ts','app.js'], 'analytics.js':['src/services/analytics.ts','analytics.js'], 'sw.js':['src/app/service-worker.ts','sw.js'],
 'admin/admin.js':['admin/admin.ts','admin/admin.js'], 'admin/runtime-config.js':['admin/runtime-config.ts','admin/runtime-config.js'], 'admin/reset-password/reset-password.js':['admin/reset-password/reset-password.ts','admin/reset-password/reset-password.js']
};
for(const name of ['data/ingredientDatabase','data/universalHalalPolicy','data/productCatalog','utils/halalAnalyzer','utils/productRepository','models/productModel','i18n/index'])entries['src/'+name+'.js']=['src/'+name+'.ts','src/'+name+'.js'];
for(const [dest,candidates] of Object.entries(entries)){const entry=candidates.find(file=>fs.existsSync(file));if(!entry)throw Error('Missing source for '+dest);esbuild.buildSync({entryPoints:[entry],outfile:path.join(output,dest),bundle:true,format:'iife',target:'es2022',external:['https://*','/assets/*'],legalComments:'none',logLevel:'silent'});}
for(const [entry,name] of [['scanner/decoder','barcode-decoder'],['image-recognition/ocr','ingredient-ocr']]){const base='src/features/'+entry;const file=fs.existsSync(base+'.ts')?base+'.ts':base+'.js';if(fs.existsSync(file))esbuild.buildSync({entryPoints:[file],outfile:path.join(output,'assets',name+'.js'),bundle:true,format:'esm',target:'es2022',minify:true,legalComments:'none',logLevel:'silent'});}
copy('node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',path.join(output,'assets/zxing_reader.wasm'));
copy('node_modules/tesseract.js/dist/worker.min.js',path.join(output,'assets/ocr/worker.min.js'));
for(const file of fs.readdirSync('node_modules/tesseract.js-core').filter(file=>/lstm\.(wasm\.js|wasm|js)$/.test(file)))copy('node_modules/tesseract.js-core/'+file,path.join(output,'assets/ocr/core',file));
for(const lang of ['eng','ita','ara','urd'])copy('node_modules/@tesseract.js-data/'+lang+'/4.0.0_best_int/'+lang+'.traineddata.gz',path.join(output,'assets/ocr/lang',lang+'.traineddata.gz'));
fs.mkdirSync(path.join(output,'assets/licenses'),{recursive:true});for(const pkg of ['zxing-wasm','tesseract.js','tesseract.js-core']){const file=['LICENSE','LICENSE.md','LICENSE.txt'].find(file=>fs.existsSync('node_modules/'+pkg+'/'+file));if(file)copy('node_modules/'+pkg+'/'+file,path.join(output,'assets/licenses/'+pkg+'.txt'));}
require('./validate-admin-config.cjs').validateAdminConfiguration('dist');
const html=fs.readFileSync('dist/index.html','utf8');for(const [,asset] of html.matchAll(/(?:src|href)="([^"#]+)"/g))if(!asset.startsWith('http')&&!fs.existsSync(path.join(output,asset)))throw Error('Missing built asset '+asset);
JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));console.log('Compiled browser sources, local barcode/OCR assets and static PWA validated in dist/.');

esbuild.buildSync({entryPoints:['src/server/productHandler.ts'],outfile:'dist-server/product-handler.cjs',bundle:true,platform:'node',format:'cjs',target:'node24',logLevel:'silent'});

esbuild.buildSync({entryPoints:['src/services/openFoodFacts.ts'],outfile:'dist-server/off-client.cjs',bundle:true,platform:'node',format:'cjs',target:'node24',logLevel:'silent'});

esbuild.buildSync({entryPoints:['src/utils/productPresentation.ts'],outfile:'dist-server/presentation.cjs',bundle:true,platform:'node',format:'cjs',target:'node24',logLevel:'silent'});
esbuild.buildSync({entryPoints:['src/server/catalogue.ts'],outfile:'dist-server/catalogue.cjs',bundle:true,platform:'node',format:'cjs',target:'node24',logLevel:'silent'});
require('./catalogue-build.cjs').build();
