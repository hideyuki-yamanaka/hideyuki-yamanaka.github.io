// Proposal geometry, not production design tokens. Each chapter occupies real document
// space: scrolling moves the entire chapter, without a sticky scene replacement.
const clamp=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=(p,a=0,b=1)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const schedules={staged:[['service',0,1.9],['gap',0,1],['service',1,1.9],['proof',0,1.2]],proof:[['proof',0,1.65],['service',0,1.4],['service',1,1.4]],center:[['service',0,1.8],['service',1,1.8],['proof',0,1.2]],title:[['service',0,1.6],['gap',0,.6],['service',1,1.6],['proof',0,1.2]]};
export function createDocumentStage(content,concept){
 const el=document.createElement('div');el.className='pf-stage document-stage';el.dataset.layout=concept.layout;
 const art=[],copy=[],labels=[],chapters=[];
 function service(i){
  const v=content.values[i],node=document.createElement('article');node.className='ds-service';node.dataset.i=i;
  node.innerHTML=`<div class="ds-art" aria-hidden="true"><span class="ds-art-label">${escape(v.tag)}</span><div class="ds-graphic"></div></div><div class="ds-copy"><span class="ds-tag">${escape(v.tag)}</span><h3 aria-label="${escape(v.title.join(''))}">${v.title.map(t=>`<span>${escape(t)}</span>`).join('')}</h3><p>${escape(v.body)}</p></div>`;
  art[i]=node.querySelector('.ds-graphic');copy[i]=node.querySelector('.ds-copy');labels[i]=node.querySelector('.ds-art-label');return node;
 }
 for(const [type,i,height] of schedules[concept.layout]){
  const chapter=document.createElement('section');chapter.className=`ds-chapter ds-chapter-${type}`;
  if(type==='proof')chapter.innerHTML=`<h2 class="ds-proof-head">${content.head}</h2>${content.stats.map(s=>`<div class="ds-stat"><b>${escape(s.label)}</b><span>${escape(s.number)}</span></div>`).join('')}<div class="ds-rule"></div>`;
  else if(type==='service')chapter.append(service(i));
  el.append(chapter);chapters.push({el:chapter,type,index:i,height});
 }
 return{el,art,copy,labels,chapters,concept,mobileArt:art,mobile:[]};
}
const box=(el,x,y,w,h)=>{Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,...(h==null?{}:{height:`${h}px`})});};
function show(el,a,y=0,blur=0){el.style.opacity=String(a);el.style.transform=y?`translateY(${y}px)`:'none';el.style.filter=blur?`blur(${blur}px)`:'none';}
export function documentHeight(stage,h){return stage.chapters.reduce((sum,c)=>sum+c.height*h,0);}
export function renderDocumentStage(s,offset,w,h,staticMode=false){
 const renderKey=`${offset}:${w}:${h}:${staticMode}:${document.fonts.status}`;
 if(s.renderKey===renderKey)return;s.renderKey=renderKey;
 const compact=w<=800||h<=600;
 s.el.classList.toggle('ds-compact',compact);s.el.classList.toggle('ds-static',staticMode);
 const size=clamp(w/1440)*1.0, title=Math.max(38,Math.min(52,w*.036)),font=Math.max(16,Math.min(18,w*.0125));
 const container=Math.min(w*.84,1240),left=(w-container)/2,gap=Math.min(w*.08,112),col=(container-gap)/2;
 const anchor=[left+col/2,left+col+gap+col/2];
 let start=0;
 for(const chapter of s.chapters){
  if(compact){
   chapter.el.style.height='';chapter.el.style.top='';
   chapter.el.querySelectorAll('[style]').forEach(node=>node.removeAttribute('style'));
   chapter.el.querySelectorAll('.ds-copy h3 i').forEach(node=>node.style.opacity='1');
   continue;
  }
  const height=chapter.height*h;chapter.el.style.height=`${height}px`;
  const local=offset-start,q=staticMode?1:ease(local/h,s.concept.layout==='staged'?.32:0,s.concept.layout==='staged'?.80:.55);
  chapter.el.classList.toggle('ds-entered',staticMode||local>=-.2*h);
  chapter.el.dataset.progress=q.toFixed(3);
  if(chapter.type==='proof'){
   const headline=chapter.el.querySelector('h2'),stats=[...chapter.el.querySelectorAll('.ds-stat')];
   box(headline,left,h*.11,container);headline.style.fontSize=`${Math.min(44,w*.034)}px`;
   const dramatic=s.concept.layout==='proof',settle=dramatic?q:ease(local/h,-.3,.35);
   const width=container/3;
   stats.forEach((stat,i)=>{
    const isHero=dramatic&&i===1;
    const n=stat.querySelector('span'),large=Math.min(w*.20,290),small=Math.min(w*.078,116);
    box(stat,isHero?mix(left,left+width*i,settle):left+width*i,mix(h*.41,h*.72,settle),isHero?mix(container,width,settle):width);
    n.style.fontSize=`${isHero?mix(large,small,settle):small}px`;
    show(stat,isHero?1:dramatic?ease(q,.45,.9):1);
   });
   const rule=chapter.el.querySelector('.ds-rule');box(rule,left,h*1.07,container,1);rule.style.transform=`scaleX(${ease(q,.1,.8)})`;
  }else if(chapter.type==='service'){
   const ids=[chapter.index];
   for(const i of ids){
    const cp=s.copy[i],art=s.art[i].parentElement,tag=cp.querySelector('.ds-tag'),heading=cp.querySelector('h3'),body=cp.querySelector('p');
    let ax=mix(w/2,anchor[0],q),ay=mix(h*.46,h*.88,q),aw=mix(Math.min(w*.67,800),Math.min(w*.43,570),q);
    let cx=anchor[1]-col/2,cy=h*.65,cw=col,fs=title,text=ease(q,.50,.95),bodyAlpha=ease(q,.72,1),center=false;
    if(s.concept.layout==='staged'){
     const reveal=staticMode?1:ease(local/h,.05,.20);
     ax=mix(w/2,anchor[0],q);ay=mix(h*.84,h*1.26,q);aw=mix(Math.min(w*.60,760),Math.min(w*.43,570),q);
     cx=mix(w/2-col/2,anchor[1]-col/2,q);cy=mix(h*.34,h*1.00,q);fs=mix(38,title,q);text=reveal;bodyAlpha=staticMode?1:ease(local/h,.72,.90);
     art.style.opacity=String(reveal);
     [tag,...heading.children].forEach(line=>{line.style.width='max-content';line.style.transform=`translateX(calc(${col*.5*(1-q)}px - ${50*(1-q)}%))`;});
    }else if(s.concept.layout==='center'){
     ax=w/2;ay=mix(h*.47,h*.72,q);aw=mix(Math.min(w*.72,870),Math.min(w*.37,460),q);
     cx=left;cy=h*.99;cw=container;fs=Math.min(56,w*.043);center=true;text=ease(q,.35,.85);bodyAlpha=ease(q,.65,1);
    }else if(s.concept.layout==='title'){
     ax=anchor[0];ay=h*.96;aw=Math.min(w*.43,570);art.style.opacity=String(ease(q,.35,.85));
     cx=mix(left,anchor[1]-col/2,q);cy=mix(h*.24,h*.72,q);cw=mix(container,col,q);text=ease(q,.60,.95);bodyAlpha=ease(q,.78,1);
     tag.style.fontSize=`${mix(Math.min(w*.145,210),22,q)}px`;tag.style.whiteSpace='nowrap';
     tag.style.width='max-content';tag.style.transform=`translateX(calc(${cw*.5*(1-q)}px - ${50*(1-q)}%))`;
    }
    box(art,ax-aw/2,ay-aw*.39,aw,aw*.78);
    box(cp,cx,cy,cw);cp.style.textAlign=center?'center':'left';heading.style.fontSize=`${fs}px`;
    body.style.fontSize=`${font}px`;
    body.style.width=center?`${Math.min(680,cw)}px`:'';
    show(heading,text,18*(1-text));tag.style.opacity=s.concept.layout==='title'?'1':String(text);
    show(body,staticMode?1:bodyAlpha,12*(1-bodyAlpha));
    s.labels[i].style.opacity=['staged','title'].includes(s.concept.layout)?'0':String(1-text);
    s.labels[i].style.fontSize=`${Math.max(20,24*size)}px`;
   }
  }
  start+=height;
 }
 if(!compact)s.el.style.height=`${start}px`;else s.el.style.height='auto';
}
export function documentThumbnail(content,concept,graphics){
 const stage=createDocumentStage(content,concept),crop=document.createElement('div');
 crop.className='pf-stage document-thumbnail';crop.style.cssText='width:1280px;height:720px;overflow:hidden;position:relative';
 stage.art.forEach((slot,i)=>slot.append(graphics[i].cloneNode(true)));
 const offset=(documentHeight(stage,720)-720)*concept.preview;
 renderDocumentStage(stage,offset,1280,720);
 stage.el.style.transform=`translateY(${-offset}px)`;crop.append(stage.el);return crop;
}
