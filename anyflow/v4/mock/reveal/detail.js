import {concepts,resolveConcept} from './catalog.js';
import {createStage,renderStage,setStageInk,clamp} from './stage.js';
import {conceptHistory,timeHTML} from './history.js';
import {createDocumentStage,renderDocumentStage,documentThumbnail} from './document-stage.js';
import {applyV4MotionSettings,polishPictograms,createV4Slots} from './v4-motion.js';
import {createRestoredPictoStage,observeRestoredPicto,restoredPictoThumbnail} from './restored-picto.js';
import {createRestoredReadingStage,observeRestoredReading,restoredReadingThumbnail} from './restored-reading.js';
import {createRestoredNumberStage,observeRestoredNumber,restoredNumberThumbnail} from './restored-number.js';
import {createAttentionStage,renderAttentionStage,attentionThumbnail} from './attention-stage.js';

const query=new URLSearchParams(location.search);
const concept=resolveConcept(query.get('concept')||concepts[0].id);
if(!concept){
 location.replace('/mock/reveal/?removed=1');
}else{
const thumbnailMode=query.get('thumbnail')==='1'&&window.parent!==window;
const requestedProgress=Number(query.get('at'));
const entryProgress=query.has('at')&&Number.isFinite(requestedProgress)?clamp(requestedProgress):0;
const record=conceptHistory(concept);
const results=document.getElementById('results');
// Read static source text, not a live counter while it happens to be animating.
const source=await fetch('/mock/reveal/reference.html').then(r=>{if(!r.ok)throw new Error('V4 source unavailable');return r.text();});
const base=new DOMParser().parseFromString(source,'text/html');
const src=base.querySelector('#results');
const content={
  head:`${src.querySelector('#resHl1').textContent}<em>${src.querySelector('#resGhost').textContent}</em>${src.querySelector('#resSuffix').textContent}`,
  values:[...src.querySelectorAll('.r2v')].map(v=>({tag:v.querySelector('.r2v-tag').textContent,title:[...v.querySelectorAll('.r2v-hli')].map(e=>e.textContent),body:v.querySelector('.r2v-p').textContent})),
  stats:[...src.querySelectorAll('.r2s')].map(v=>({label:v.querySelector('b').textContent,number:v.querySelector('span').textContent}))
};
if(content.values.length!==2||content.stats.length!==3)throw new Error('V4 content changed; update the study adapter.');
// The source's default animation still owns Vision, gradients, dark mode and the SVG drawing.
// Override only its experimental results layout; never persist this choice to source storage.
params.patterns.resFx='default';
applyResFx();
applyV4MotionSettings();
const readingMode=concept.mode==='restored-reading';
const numberMode=concept.mode==='restored-number';
const attentionMode=concept.mode.startsWith('attention-');
const restoredMode=concept.mode==='restored-picto'||readingMode||numberMode;
const documentMode=concept.mode==='document'||restoredMode||attentionMode;
const stage=attentionMode?createAttentionStage(content,concept):numberMode?createRestoredNumberStage(content):readingMode?createRestoredReadingStage(content):restoredMode?createRestoredPictoStage(content):documentMode?createDocumentStage(content,concept):createStage(content);
results.classList.add('pf-study');if(!documentMode)results.style.setProperty('--study-height',`${concept.vh}vh`);
results.querySelector('.pin-vp').append(stage.el);
const hosts=[document.getElementById('valSaas'),document.getElementById('valAi')];
document.body.classList.add('reveal-study');
document.body.classList.toggle('pf-document',documentMode);
document.title=`${concept.label} ${record.version} | ${concept.name}`;
let flowing=false,initialized=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(numberMode)observeRestoredNumber(stage,reduced);else if(readingMode)observeRestoredReading(stage,reduced);else if(restoredMode)observeRestoredPicto(stage,reduced);
const tickSlots=createV4Slots(stage.el,reduced);
function layout(){
  const next=!documentMode&&(innerWidth<=800||innerHeight<=600||reduced.matches);
  document.body.classList.toggle('pf-flow',next);
  if(!initialized||next!==flowing){hosts.forEach((host,i)=>(next?stage.mobileArt[i]:stage.art[i]).append(host));flowing=next;initialized=true;}
  if(attentionMode)renderAttentionStage(stage,-results.getBoundingClientRect().top,innerWidth,innerHeight,reduced.matches);
  else if(documentMode&&!restoredMode)renderDocumentStage(stage,-results.getBoundingClientRect().top,innerWidth,innerHeight,reduced.matches);
  fit();
}
layout();window.addEventListener('resize',layout);reduced.addEventListener('change',layout);
let lastProgress=-1,lastDark=-1,thumbnailsSent=false;
let iconSeconds=0,lastIconFrame=performance.now();
function advancePictograms(){
  const now=performance.now(),dt=Math.min(.1,Math.max(0,(now-lastIconFrame)/1000));lastIconFrame=now;
  const speed=Number(params.sections?.results?.pictoSpeed);
  // Use a live clock scoped to the mock. Old saved params.running=false must not
  // freeze the pictograms; preserve that source setting and all other sections.
  if(!reduced.matches)iconSeconds+=dt*(Number.isFinite(speed)&&speed>0?speed:1);
  ['saas','ai'].forEach((key,i)=>{
    const period=rfxValPeriod(i?VAL_AI:VAL_SAAS,i?params.patterns.valAi:params.patterns.valSaas);
    valTOv[key]={fixed:(reduced.matches?0:iconSeconds)+period*(i?.74:.23)};
  });
}
window.REVEAL_STUDY={concept:concept.id,content,source:'anyflow/v4/index.html',flow:false,progress:0,
  update({dark}){
    // Render thumbnail snapshots from this same V4 page, including its actual SVGs.
    // The gallery destroys this one temporary renderer after receiving all proposals.
    if(thumbnailMode&&!thumbnailsSent&&document.fonts.status==='loaded'&&hosts.every(host=>host.querySelector('svg'))){
      // Use a readable frame of each original pictogram cycle, not its nearly empty first frame.
      const previousClock={...valTOv};
      valTOv.saas={fixed:rfxValPeriod(VAL_SAAS,params.patterns.valSaas)*.23};
      valTOv.ai={fixed:rfxValPeriod(VAL_AI,params.patterns.valAi)*.74};
      drawValueIcons();
      const graphics=hosts.map(host=>{const g=host.cloneNode(true);g.removeAttribute('id');g.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));return g;});
      const snapshots=concepts.map(item=>{
        let element;
        if(item.mode==='restored-picto')element=restoredPictoThumbnail(content,graphics);
        else if(item.mode==='restored-reading')element=restoredReadingThumbnail(content,graphics);
        else if(item.mode==='restored-number')element=restoredNumberThumbnail(content,graphics);
        else if(item.mode.startsWith('attention-'))element=attentionThumbnail(content,item,graphics);
        else if(item.mode==='document')element=documentThumbnail(content,item,graphics);
        else{
          const preview=createStage(content);preview.preview=true;
          preview.art.forEach((slot,i)=>slot.append(graphics[i].cloneNode(true)));
          renderStage(preview,item,item.preview,1280,720);setStageInk(preview,0);element=preview.el;
        }
        const mount=document.createElement('div');mount.style.cssText='position:fixed;left:-2000px;top:0;width:1280px;height:720px';mount.append(element);document.body.append(mount);
        polishPictograms(element);const html=element.outerHTML;mount.remove();
        return{id:item.id,html,progress:item.preview};
      });
      Object.assign(valTOv,previousClock);
      thumbnailsSent=true;window.parent.postMessage({type:'reveal-thumbnails',snapshots},location.origin);
    }
    const rect=results.getBoundingClientRect();
    this.flow=documentMode||flowing;
    const p=clamp(-rect.top/Math.max(1,rect.height-innerHeight));this.progress=p;
    if(dark!==lastDark){setStageInk(stage,dark);lastDark=dark;}
    if(attentionMode){
      renderAttentionStage(stage,-rect.top,stage.el.clientWidth,innerHeight,reduced.matches);
    }else if(restoredMode){
      // The original composition scrolls as a document; IntersectionObserver owns entrances.
    }else if(documentMode){
      renderDocumentStage(stage,-rect.top,stage.el.clientWidth,innerHeight,reduced.matches);
    }else if(flowing){
      stage.mobile.forEach(el=>{
        const top=el.getBoundingClientRect().top;
        const a=reduced.matches?1:clamp((innerHeight*.94-top)/(innerHeight*.2));
        el.style.opacity=a;
        el.style.transform=`translateY(${(1-a)*20}px)`;
      });
    } else if(p!==lastProgress||concept.mode==='trigger-typing'){renderStage(stage,concept,p,stage.el.clientWidth,stage.el.clientHeight);lastProgress=p;}
    advancePictograms();
    drawValueIcons();polishPictograms(stage.el);tickSlots();
  }
};
const observer=new ResizeObserver(()=>{lastProgress=-1;});observer.observe(stage.el);
const next=concepts[(concepts.indexOf(concept)+1)%concepts.length];
const dock=document.createElement('nav');dock.className='study-dock';dock.setAttribute('aria-label','モック比較用ナビゲーション');
dock.innerHTML=`<a href="/mock/reveal/">一覧</a><span class="study-dock-meta" title="${concept.name}。過去の日時はファイル記録から復元。日本時間。"><b>${concept.label} · ${record.version} <em>${concept.name}</em></b><small><i>作成記録 ${timeHTML(record.createdAt)}</i><i>更新 ${timeHTML(record.updatedAt)} JST</i></small></span><a class="study-shortcut" href="#vision">Visionから</a><a class="study-shortcut" href="#results">実績から</a><a href="/mock/reveal/demo.html?concept=${next.id}#results">次の案 →</a>`;
document.body.append(dock);
function jump(hash){const target=document.querySelector(hash);if(!target)return;if(lenis)lenis.scrollTo(target,{immediate:true});else target.scrollIntoView();}
dock.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();jump(a.getAttribute('href'));}));
// Hash links are explicit entry points from the gallery. Full page is always present.
const initial=()=>requestAnimationFrame(()=>{
  if(lenis)lenis.resize();
  const compactEntry=flowing||innerWidth<=800||innerHeight<=600||reduced.matches;
  if(location.hash==='#results'&&entryProgress&&!compactEntry){
    const y=results.getBoundingClientRect().top+scrollY+(results.offsetHeight-innerHeight)*entryProgress;
    if(lenis)lenis.scrollTo(y,{immediate:true});else window.scrollTo(0,y);
  }else if(['#results','#vision'].includes(location.hash))jump(location.hash);
});
if(document.readyState==='complete')initial();else window.addEventListener('load',initial,{once:true});
window.REVEAL_STUDY.update({dark:0});
}
