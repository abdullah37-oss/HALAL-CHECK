const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
test('deployed API entry compiles and loads in the actual CommonJS package boundary',async()=>{
 const output=path.resolve('.release-private/off-runtime-regression');
 fs.mkdirSync(output,{recursive:true});
 // Reproduce Vercel's package boundary, rather than testing only esbuild's bundle.
 fs.writeFileSync(path.join(output,'package.json'),JSON.stringify({type:'commonjs'}));
 const compiled=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','-p','api/tsconfig.json','--noEmit','false','--outDir',output,'--rootDir',process.cwd()],{encoding:'utf8'});
 assert.equal(compiled.status,0,compiled.stdout+compiled.stderr);
 const entry=path.join(output,'api/products/[barcode].js');
 assert.doesNotMatch(fs.readFileSync(entry,'utf8'),/^import /m);
 const {GET}=require(entry);
 assert.equal(typeof GET,'function');
 assert.equal((await GET(new Request('https://preview.test/api/products/invalid'))).status,400);
});
