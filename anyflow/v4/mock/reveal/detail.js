import {concepts} from './catalog.js';
import {createStage,renderStage,setStageInk,clamp} from './stage.js';
import {conceptHistory,timeHTML} from './history.js';

const query=new URLSearchParams(location.search);
const concept=concepts.find(c=>c.id===query.get('concept'))||concepts[0];
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
const stage=createStage(content);
results.classList.add('pf-study');results.style.setProperty('--study-height',`${concept.vh}vh`);
results.querySelector('.pin-vp').append(stage.el);
const hosts=[document.getElementById('valSaas'),document.getElementById('valAi')];
document.body.classList.add('reveal-study');document.body.dataset.group=concept.group;
document.title=`第${record.round}回 ${concept.id} ${record.version} | ${concept.name}`;
let flowing=false,initialized=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function layout(){
  const next=innerWidth<=800||innerHeight<=600||reduced.matches;
  document.body.classList.toggle('pf-flow',next);
  if(!initialized||next!==flowing){hosts.forEach((host,i)=>(next?stage.mobileArt[i]:stage.art[i]).append(host));flowing=next;initialized=true;}
  fit();
}
layout();window.addEventListener('resize',layout);reduced.addEventListener('change',layout);
let lastProgress=-1,lastDark=-1;
window.REVEAL_STUDY={concept:concept.id,content,source:'anyflow/v4/index.html',flow:false,progress:0,
  update({dark}){
    const rect=results.getBoundingClientRect();
    this.flow=flowing;
    const p=clamp(-rect.top/Math.max(1,rect.height-innerHeight));this.progress=p;
    if(dark!==lastDark){setStageInk(stage,dark);lastDark=dark;}
    if(flowing){
      stage.mobile.forEach(el=>{
        const top=el.getBoundingClientRect().top;
        const a=reduced.matches?1:clamp((innerHeight*.94-top)/(innerHeight*.2));
        el.style.opacity=a;
        el.style.transform=`translateY(${(1-a)*20}px)`;
      });
    } else if(p!==lastProgress){renderStage(stage,concept,p,stage.el.clientWidth,stage.el.clientHeight);lastProgress=p;}
  }
};
const observer=new ResizeObserver(()=>{lastProgress=-1;});observer.observe(stage.el);
const next=concepts[(concepts.indexOf(concept)+1)%concepts.length];
const dock=document.createElement('nav');dock.className='study-dock';dock.setAttribute('aria-label','モック比較用ナビゲーション');
dock.innerHTML=`<a href="/mock/reveal/">一覧</a><span class="study-dock-meta" title="${concept.name}。過去の日時はファイル記録から復元。日本時間。"><b>第${record.round}回 · ${concept.id} · ${record.version} <em>${concept.name}</em></b><small><i>作成記録 ${timeHTML(record.createdAt)}</i><i>更新 ${timeHTML(record.updatedAt)} JST</i></small></span><a class="study-shortcut" href="#vision">Visionから</a><a class="study-shortcut" href="#results">実績から</a><a href="/mock/reveal/demo.html?concept=${next.id}#results">次の案 →</a>`;
document.body.append(dock);
function jump(hash){const target=document.querySelector(hash);if(!target)return;if(lenis)lenis.scrollTo(target,{immediate:true});else target.scrollIntoView();}
dock.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();jump(a.getAttribute('href'));}));
// Hash links are explicit entry points from the gallery. Full page is always present.
const initial=()=>requestAnimationFrame(()=>{if(['#results','#vision'].includes(location.hash))jump(location.hash);});
if(document.readyState==='complete')initial();else window.addEventListener('load',initial,{once:true});
window.REVEAL_STUDY.update({dark:0});
