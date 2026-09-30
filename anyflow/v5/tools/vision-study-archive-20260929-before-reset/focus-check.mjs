import {chromium} from '../../../../design-gallery/node_modules/playwright/index.mjs';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1512,height:1000},deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:8778/tools/vision-study/?ready=3#17',{waitUntil:'networkidle'});const frame=p.frameLocator('#scene');await frame.locator('body').evaluate(()=>document.fonts.ready);
const states=[];for(let i=0;i<3;i++){if(i)await p.locator('#baseline').click();await p.waitForTimeout(150);states.push(await frame.locator('#vfDome').getAttribute('src'))}
const counts=await p.evaluate(()=>({buttons:document.querySelectorAll('#variants button').length,cards:document.querySelectorAll('#cards .card').length}));
await p.screenshot({path:fileURLToPath(new URL('gallery.png',import.meta.url))});
const result={states,counts,errors};await fs.writeFile(new URL('focus-check.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);await b.close();
