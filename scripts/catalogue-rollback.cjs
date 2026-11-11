// Local catalogue artifact rollback only; never calls a cloud database or deploys.
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const target=path.resolve('data/italy/catalogue.sqlite'),backup=target+'.rollback',pending=target+'.restore';
if(!fs.existsSync(backup))throw Error('No previous local catalogue snapshot available');
const db=new DatabaseSync(backup,{readOnly:true});
if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Rollback snapshot integrity failed');
if(db.prepare("SELECT value FROM metadata WHERE key='schema'").get()?.value!=='1')throw Error('Unsupported rollback schema');
db.close();fs.copyFileSync(backup,pending);fs.renameSync(pending,target);
console.log('Restored previous local catalogue snapshot. Public build/deployment unchanged; rebuild and QA required.');
