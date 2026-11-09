module.exports=async()=>{try {await fetch('http://127.0.0.1:4173/__qa_shutdown',{method:'POST',headers:{'X-QA-Stop':'yes'}});} catch {}};
