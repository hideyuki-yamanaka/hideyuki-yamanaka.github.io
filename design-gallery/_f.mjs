import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file:///Users/hideyuki/Developer/Claude%20Code/anyflow/brand-movie/index.html?render',{waitUntil:'networkidle'});
await p.evaluate(()=>window.ready);
for (const t of process.argv.slice(3).map(Number)) { await p.evaluate(t=>renderAt(t),t); await p.locator('canvas').screenshot({path:`${process.argv[2]}/t${String(t).padStart(5,'0')}.jpg`,quality:70}); }
await b.close();
