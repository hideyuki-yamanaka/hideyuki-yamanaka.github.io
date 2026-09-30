import {chromium} from '../../../../design-gallery/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1512,height:1000},deviceScaleFactor:2});
const out=new URL('./',import.meta.url), remote=[];
for(const file of ['css/style.css','js/app.js']){try{const r=await page.request.get(`https://anyflow-embed-v5.vercel.app/${file}`,{timeout:20000});const local=await fs.readFile(new URL(`../../${file}`,out));const body=await r.body();remote.push({file,status:r.status(),sameAsLocal:createHash('sha256').update(local).digest('hex')===createHash('sha256').update(body).digest('hex')});}catch(e){remote.push({file,error:e.message})}}
await page.goto('http://localhost:8778/tools/vision-study/?ready=1#00',{waitUntil:'networkidle'});await page.frameLocator('#scene').locator('body').waitFor();await page.frameLocator('#scene').locator('body').evaluate(()=>document.fonts.ready);
const ui=await page.evaluate(()=>({buttons:document.querySelectorAll('#variants button').length,cards:document.querySelectorAll('#cards .card').length,missing:[...document.querySelectorAll('#cards img')].filter(e=>e.complete&&!e.naturalWidth).length}));
await page.screenshot({path:fileURLToPath(new URL('gallery.png',out))});
const colors=['#60646c','#505966','#606771','#4b6079','#536477','#685567','#6a626b','#606773','#606771'];
const lum=hex=>{const c=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
const contrast=colors.map(color=>({color,background:'#e7e7e7',ratio:+((lum('#e7e7e7')+.05)/(lum(color)+.05)).toFixed(2)}));
console.log(JSON.stringify({remote,ui,contrast},null,2));await fs.writeFile(new URL('final-check.json',out),JSON.stringify({remote,ui,contrast},null,2));await browser.close();
