const path=require('node:path');const os=require('node:os');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const aliases=(value)=>[value,value.replaceAll('\\','/'),JSON.stringify(value).slice(1,-1),JSON.stringify(JSON.stringify(value).slice(1,-1)).slice(1,-1),encodeURI(value.replaceAll('\\','/'))];
function sanitizeString(value,{generic=true}={}) {
 let text=String(value);
 for(const [root,label] of [[path.resolve('.'),'<workspace>'],[os.homedir(),'<user-home>']])for(const alias of [...new Set(aliases(root))].sort((a,b)=>b.length-a.length))if(alias.length>3)text=text.replace(new RegExp(escape(alias),'gi'),label);
 if(generic)text=text.replace(/\b[A-Za-z]:[\\/][^\r\n"'<>)]*/g,'<absolute-path>').replace(/\/(?:home|Users)\/[^\/\s"'<>]+/g,'<user-home>');
 return text;
}
function sanitizeValue(value){if(typeof value==='string')return sanitizeString(value);if(Array.isArray(value))return value.map(sanitizeValue);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[sanitizeString(k),sanitizeValue(v)]));return value;}
function sanitizeFile(file,buffer){
 if(!/\.(?:js|cjs|ts|html|css|md|json|toml|sql|tap|txt|webmanifest|lock)$/.test(file))return buffer;
 const original=buffer.toString('utf8');let text=original;
 if(file==='scripts/audit-public-push.cjs')text=text.replace(/^ if\(\/C:.*absolutePaths=true;$/m,' if(/[A-Za-z]:[\\\\/](?:Users|Documents and Settings)[\\\\/]/i.test(text))absolutePaths=true;');
 if(/\.json$/.test(file)){try{const value=JSON.parse(text.replace(/^\uFEFF/,''));const clean=sanitizeValue(value);if(JSON.stringify(clean)!==JSON.stringify(value))text=JSON.stringify(clean,null,2)+'\n';}catch{text=sanitizeString(text);}}
 else if(file==='reports/release-deno-check.txt')text=text.split(/\r?\n/).map(line=>line.replace(/^node\.exe\s*:\s*/, '')).filter(line=>/^(deno |v8 |typescript |Check |exitCode:)/.test(line)).join('\n')+'\n';
 else text=sanitizeString(text,{generic:! /\.(?:js|cjs|ts|css)$/.test(file)});
 return text===original?buffer:Buffer.from(text);
}
function containsMachinePath(text){return /\b[A-Za-z]:[\\/](?:[\\/]*Users|[\\/]*Program Files|[\\/]*Windows)[\\/ ]|file:\/\/\/[A-Za-z]:|\/(?:home|Users)\/[A-Za-z0-9_-]+/i.test(text);}
module.exports={sanitizeString,sanitizeValue,sanitizeFile,containsMachinePath};
