const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
// Keep decoder network-fault injection independent of service-worker interception.
// Offline caching and service-worker lifecycle are covered in app.spec.cjs.
test.use({ serviceWorkers: 'block' });
const fixtures = [ ['ean13','5901234123457'], ['ean8','80771548'], ['upca','0036000291452'], ['upce','0012345000065'] ];

test.beforeEach(async ({page}) => {
  await page.route('https://world.openfoodfacts.org/**', route => route.fulfill({status:404,body:'{}'}));
  await page.route('**/functions/v1/analytics-event', route => route.fulfill({status:200,body:'{}'}));
});

for (const [format, expected] of fixtures) test('actual WASM decodes '+format+' image without native API', async ({page}) => {
  await page.addInitScript(() => { delete window.BarcodeDetector; });
  await page.goto('/');
  const decoded = await page.evaluate(async ({bytes}) => {
    const module = await import('/assets/barcode-decoder.js');
    return module.decodeImage(new File([new Uint8Array(bytes)], 'barcode.png', {type:'image/png'}));
  }, {bytes:[...fs.readFileSync('tests/fixtures/barcodes/'+format+'.png')]});
  expect(decoded).toBe(expected);
});

test('uploaded barcode uses the real reader and opens matching catalog product', async ({page}) => {
  await page.goto('/');
  await page.locator('[data-action="manual-entry"]').first().click();
  await page.locator('#barcode-image').setInputFiles('tests/fixtures/barcodes/ean8.png');
  await expect(page.locator('#result-view')).toContainText('VitaWell');
});

test('barcode upload rejects MIME spoofing and oversized input safely', async ({page}) => {
  await page.goto('/');
  await page.locator('[data-action="manual-entry"]').first().click();
  await page.locator('#barcode-image').setInputFiles({name:'fake.png',mimeType:'image/png',buffer:Buffer.from('<svg onload="alert(1)"></svg>')});
  await expect(page.locator('#barcode-image-status')).toContainText('not a supported image');
  await page.locator('#barcode-image').setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(12*1024*1024+1)});
  await expect(page.locator('#barcode-image-status')).toContainText('smaller than 12 MB');
  await expect(page.locator('#result-view')).not.toHaveClass(/active-view/);
});

test('live native decoder submits one lookup and releases video tracks', async ({page}) => {
  let lookups = 0;
  await page.route('https://world.openfoodfacts.org/**', route => { lookups++; return route.fulfill({status:404,body:'{}'}); });
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = async function () {};
    Object.defineProperty(HTMLMediaElement.prototype,'readyState',{get:()=>4});
    Object.defineProperty(navigator,'mediaDevices',{value:{
      getUserMedia:async()=>({getTracks:()=>[{stop:()=>{window.stopped=true;}}],getVideoTracks:()=>[{getCapabilities:()=>({})}]}),
      enumerateDevices:async()=>[]
    }});
    Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{get(){return this._stream},set(value){this._stream=value}});
    window.BarcodeDetector=class { async detect(){return [{rawValue:'5901234123457'},{rawValue:'5901234123457'}]} };
  });
  await page.goto('/');
  await page.locator('[data-action="manual-entry"]').first().click();
  await page.locator('#start-camera').click();
  await expect(page.locator('#result-view')).toHaveClass(/active-view/);
  expect(lookups).toBe(1);
  expect(await page.evaluate(()=>window.stopped)).toBe(true);
});

test('leaving during remote product lookup cannot reopen stale result', async ({page}) => {
  let release;
  const gate = new Promise(resolve => { release=resolve; });
  await page.route('https://world.openfoodfacts.org/**', async route => { await gate; return route.fulfill({status:404,body:'{}'}); });
  await page.goto('/');
  await page.locator('[data-action="manual-entry"]').first().click();
  await page.locator('#barcode-input').fill('5901234123457');
  await page.locator('#barcode-form button[type=submit]').click();
  await page.locator('[data-action="close-scanner"]').click();
  release();
  await expect(page.locator('#home-view')).toHaveClass(/active-view/);
  await expect(page.locator('#result-view')).not.toHaveClass(/active-view/);
});

test('actual local OCR requires full-label confirmation before analysis', async ({page}) => {
  test.setTimeout(120000);
  const unexpected = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().includes('analytics-event')) unexpected.push(request.url()); });
  await page.goto('/');
  await page.locator('#decline-analytics').click();
  const image = await page.evaluate(() => {
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=350;
    const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,1600,350);context.fillStyle='black';context.font='58px Arial';
    context.fillText('milk, sugar, salt',80,130);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('[data-action="manual-entry"]').first().click();
  await page.locator('#label-image').setInputFiles({name:'ingredients.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
  await expect(page.locator('#ocr-review')).toBeVisible({timeout:100000});
  await expect(page.locator('#ocr-text')).toHaveValue(/milk/i);
  await expect(page.locator('#confirm-ocr')).toBeDisabled();
  await expect(page.locator('#result-view')).not.toHaveClass(/active-view/);
  await page.locator('#ocr-text').fill('milk, sugar, salt');
  await page.locator('#ocr-complete').check();
  await page.locator('#confirm-ocr').click();
  await expect(page.locator('#result-view')).toHaveClass(/active-view/);
  expect(unexpected).toEqual([]);
});

test('live WASM fallback decodes actual barcode pixels from a simulated video stream', async ({page}) => {
  await page.addInitScript(bytes => {
    delete window.BarcodeDetector;
    Object.defineProperty(navigator,'mediaDevices',{value:{
      getUserMedia:async()=>{
        const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));
        const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
        const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);
        const stream=canvas.captureStream(10);
        const interval=setInterval(()=>context.drawImage(bitmap,0,0),100);
        stream.getVideoTracks()[0].addEventListener('ended',()=>{clearInterval(interval);bitmap.close();});
        return stream;
      },enumerateDevices:async()=>[]
    }});
  }, [...fs.readFileSync('tests/fixtures/barcodes/ean8.png')]);
  await page.goto('/');
  await page.locator('#decline-analytics').click();
  await page.locator('[data-action="manual-entry"]').first().click();
  await page.locator('#start-camera').click();
  await expect(page.locator('#result-view')).toContainText('VitaWell');
  expect(await page.evaluate(()=>document.querySelector('#camera-preview').srcObject)).toBeNull();
});

test('native UPC-E is expanded before the single product lookup', async ({page}) => {
  let code;
  await page.route('https://world.openfoodfacts.org/**', route => { code=new URL(route.request().url()).pathname.split('/').pop(); return route.fulfill({status:404,body:'{}'}); });
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play=async function(){};
    Object.defineProperty(HTMLMediaElement.prototype,'readyState',{get:()=>4});
    Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{get(){return this._stream},set(value){this._stream=value}});
    Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}],getVideoTracks:()=>[{getCapabilities:()=>({})}]}),enumerateDevices:async()=>[]}});
    window.BarcodeDetector=class{async detect(){return [{rawValue:'01234565',format:'upc_e'}]}};
  });
  await page.goto('/');
  await page.locator('#decline-analytics').click();
  await page.locator('[data-action="manual-entry"]').first().click();
  await page.locator('#start-camera').click();
  await expect(page.locator('#result-view')).toHaveClass(/active-view/);
  expect(code).toBe('012345000065');
});

test('failed WASM reader stops the camera rather than retrying frames indefinitely', async ({page}) => {
  let wasmRequests=0;
  await page.route('**/assets/zxing_reader.wasm',route=>{wasmRequests++;return route.fulfill({status:404,body:'not available'});});
  await page.addInitScript(bytes=>{
    delete window.BarcodeDetector;
    Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{
      const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));
      const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);
      const stream=canvas.captureStream(10);const track=stream.getVideoTracks()[0];const stop=track.stop.bind(track);
      track.stop=()=>{window.failedReaderStopped=true;stop();};
      const interval=setInterval(()=>context.drawImage(bitmap,0,0),100);
      window.addEventListener('pagehide',()=>{clearInterval(interval);bitmap.close();},{once:true});
      return stream;
    },enumerateDevices:async()=>[]}});
  },[...fs.readFileSync('tests/fixtures/barcodes/ean8.png')]);
  await page.goto('/');await page.locator('#decline-analytics').click();
  await page.locator('[data-action="manual-entry"]').first().click();await page.locator('#start-camera').click();
  await expect(page.locator('#camera-message')).toContainText('Automatic detection failed');
  expect(await page.evaluate(()=>window.failedReaderStopped)).toBe(true);
  const completedRequests=wasmRequests;
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  expect(wasmRequests).toBe(completedRequests);
  await expect(page.locator('#start-camera')).toBeEnabled();
});

test('cancelling during delayed OCR worker startup terminates the eventual worker', async ({page}) => {
  await page.goto('/');
  const result=await page.evaluate(async bytes=>{
    const {recognizeLabel}=await import('/assets/ingredient-ocr.js');
    const controller=new AbortController();
    let resolveSetup, notifyStarted;
    const setup=new Promise(resolve=>{resolveSetup=resolve;});
    const started=new Promise(resolve=>{notifyStarted=resolve;});
    let terminations=0, recognitions=0;
    const pending=recognizeLabel(new File([new Uint8Array(bytes)],'test.png',{type:'image/png'}),'eng',()=>{},controller.signal,async()=>{notifyStarted();return setup;});
    await started;
    controller.abort();
    resolveSetup({terminate:async()=>{terminations++;},recognize:async()=>{recognitions++;return {data:{text:'milk',confidence:99}};}});
    const errorName=await pending.then(()=>null,error=>error.name);
    return {errorName,terminations,recognitions};
  },[...fs.readFileSync('tests/fixtures/barcodes/ean8.png')]);
  expect(result).toEqual({errorName:'AbortError',terminations:1,recognitions:0});
});

test('cancelling active OCR settles even when the engine recognition promise never resolves', async ({page}) => {
  await page.goto('/');
  const result=await page.evaluate(async bytes=>{
    const {recognizeLabel}=await import('/assets/ingredient-ocr.js');
    const controller=new AbortController();
    let notifyRecognition;
    const started=new Promise(resolve=>{notifyRecognition=resolve;});
    let terminations=0;
    const pending=recognizeLabel(new File([new Uint8Array(bytes)],'test.png',{type:'image/png'}),'eng',()=>{},controller.signal,async()=>({
      terminate:async()=>{terminations++;},
      recognize:()=>{notifyRecognition();return new Promise(()=>{});}
    }));
    await started;
    controller.abort();
    const errorName=await pending.then(()=>null,error=>error.name);
    return {errorName,terminations};
  },[...fs.readFileSync('tests/fixtures/barcodes/ean8.png')]);
  expect(result).toEqual({errorName:'AbortError',terminations:1});
});
