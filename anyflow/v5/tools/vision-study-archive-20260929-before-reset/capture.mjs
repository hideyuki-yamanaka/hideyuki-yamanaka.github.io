import {chromium} from '../../../../design-gallery/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('./',import.meta.url);
const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1512,height:830},deviceScaleFactor:2});
await page.goto('http://localhost:8778/',{waitUntil:'networkidle'});
await page.evaluate(async()=>{await document.fonts.ready;lenis.stop();scrollTo(0,document.getElementById('vision').offsetTop-75);});
await page.waitForTimeout(2400);
const data=await page.evaluate(()=>{
  vfDraw(0);
  const mesh=document.getElementById('vfDome').toDataURL();
  const sec=document.getElementById('vision');
  // Freeze the original animated gradient at the same moment for every comparison.
  for(const el of sec.querySelectorAll('*')) { const s=getComputedStyle(el); if(s.animationName!=='none') {el.style.backgroundImage=s.backgroundImage;el.style.backgroundPosition=s.backgroundPosition;el.style.animation='none';} }
  const rects=Object.fromEntries(['visLabel','visL1','vfWrap','vfLogo','vfLab1','vfLab2','vfLab3','vfLab4','vfLab5','valP1','valP2'].map(id=>[id,document.getElementById(id).getBoundingClientRect().toJSON()]));
  return {mesh,rootStyle:document.documentElement.style.cssText,rootClass:document.documentElement.className,bodyClass:document.body.className,header:document.querySelector('header').outerHTML,section:sec.outerHTML,styles:[...document.querySelectorAll('style')].map(e=>e.outerHTML).join('\n'),rects,settings:params.sections.vision,tag:[...sec.querySelectorAll('.vl-in *')].map(e=>[e.tagName,e.className]).slice(0,12)};
});
await fs.writeFile(new URL('mesh.png',out),Buffer.from(data.mesh.split(',')[1],'base64'));
await fs.copyFile(new URL('../../css/style.css',out),new URL('source.css',out));
await fs.copyFile(new URL('../../assets/header-logo.svg',out),new URL('logo.svg',out));
await fs.copyFile(new URL('../../assets/header-logo-textwhite.svg',out),new URL('logo-white.svg',out));
let section=data.section.replace(/<canvas\b[^>]*id="vfDome"[^>]*><\/canvas>/,'<img class="vf-dome" id="vfDome" src="mesh.png" alt="" aria-hidden="true">');
const fixAssets=s=>s.replaceAll('assets/header-logo.svg','logo.svg').replaceAll('assets/header-logo-textwhite.svg?v=1','logo-white.svg');
const html=`<!doctype html><html lang="ja" data-ds="high" class="${data.rootClass}" style="${data.rootStyle}"><head><meta charset="utf-8"><meta name="viewport" content="width=1512"><meta name="robots" content="noindex,nofollow"><title>Anyflow Vision — 比較用再現</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800&display=swap"><link rel="stylesheet" href="source.css">${data.styles}<style>html,body{width:1512px!important;height:830px!important;min-height:0!important;overflow:hidden!important}#vision{position:absolute!important;top:75px!important;left:0!important;width:1512px!important;margin:0!important}*,*::before,*::after{animation-play-state:paused!important;transition:none!important}.header{pointer-events:none}a{pointer-events:none}</style><link rel="stylesheet" href="variants.css"></head><body class="${data.bodyClass}">${fixAssets(data.header)}${fixAssets(section)}<script src="scene.js"></script></body></html>`;
await fs.writeFile(new URL('scene.html',out),html);
await fs.writeFile(new URL('source-measurements.json',out),JSON.stringify({viewport:{width:1512,height:830},source:'anyflow/v5 — baked settings, 2026-09-29',rects:data.rects,settings:data.settings},null,2));
await page.screenshot({path:fileURLToPath(new URL('source.png',out))});
console.log(JSON.stringify({tag:data.tag,rects:data.rects},null,2));
await browser.close();
