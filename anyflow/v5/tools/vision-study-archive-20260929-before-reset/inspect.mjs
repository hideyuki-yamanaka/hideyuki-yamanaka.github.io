import {chromium} from '../../../../design-gallery/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1512,height:830},deviceScaleFactor:2});
await page.goto('http://localhost:8778/',{waitUntil:'networkidle'});
await page.evaluate(async()=>{await document.fonts.ready;lenis.stop();window.scrollTo(0,document.getElementById('vision').offsetTop);});
await page.waitForTimeout(2500);
console.log(await page.evaluate(()=>({url:location.href,scrollY,settings:params.sections.vision,root:document.documentElement.outerHTML.slice(0,3000),elements:['vision','visLabel','visL1','vfWrap','vfDome','valP1','valP2'].map(id=>{const e=document.getElementById(id),s=getComputedStyle(e),r=e.getBoundingClientRect();return{id,box:r.toJSON(),style:e.style.cssText,opacity:s.opacity,transform:s.transform}}),styles:[...document.querySelectorAll('style')].map(e=>({id:e.id,size:e.innerHTML.length})),header:document.querySelector('header')?.outerHTML.slice(0,800)})));
await page.screenshot({path:'anyflow/v5/tools/vision-study/source-check.png'});
await browser.close();
