// No.01 proposal: reveal and dock each pictogram, then hand the reading area
// horizontally to the next service. Only this bounded story uses sticky layout.
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ramp=(v,a,b)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createDockedHorizontal(content){
 const el=document.createElement('div');el.className='pf-stage docked-horizontal';
 el.innerHTML=`<section class="dh-story"><div class="dh-pin"><div class="dh-track">${content.values.map((v,i)=>`<article class="dh-panel" data-i="${i}"><div class="dh-art" aria-hidden="true"></div><div class="dh-copy"><span class="dh-tag">${escape(v.tag)}</span><h3>${v.title.map(t=>`<span>${escape(t)}</span>`).join('')}</h3><p>${escape(v.body)}</p></div></article>`).join('')}</div><div class="dh-cue" aria-hidden="true"><span>for SaaS</span><i></i><span>for AI</span></div></div></section><section class="dh-proof"><h2>${content.head}</h2><div class="dh-stats">${content.stats.map((s,i)=>`<div class="dh-stat"><b>${escape(s.label)}</b><span class="pf-number" data-slot-index="${i}">${escape(s.number)}</span></div>`).join('')}</div></section>`;
 const art=[...el.querySelectorAll('.dh-art')];
 return{el,art,mobileArt:art,mobile:[],story:el.querySelector('.dh-story'),track:el.querySelector('.dh-track'),panels:[...el.querySelectorAll('.dh-panel')],copies:[...el.querySelectorAll('.dh-copy')],preview:false};
}

export function renderDockedHorizontal(s,w,h,reduced=false){
 const compact=!s.preview&&(w<=800||h<=600||reduced);
 s.el.classList.toggle('dh-compact',compact);
 if(compact)return;
 const r=s.story.getBoundingClientRect();
 const p=s.preview?.32:clamp(-r.top/Math.max(1,r.height-h));
 // Proposed scroll intervals: dock, read, travel, dock, read, native exit.
 const travel=ramp(p,.40,.56);
 const c=Math.min(w*.84,1240),left=(w-c)/2,gap=Math.min(w*.08,112),col=(c-gap)/2;
 s.track.style.transform=`translateX(${-travel*w}px)`;
 s.el.style.setProperty('--dh-progress',p);
 s.story.dataset.progress=p.toFixed(3);
 s.panels.forEach((panel,i)=>{
  const appear=ramp(p,i?.45:.015,i?.53:.075);
  const dock=ramp(p,i?.60:.10,i?.75:.24);
  const read=ramp(p,i?.72:.21,i?.81:.29);
  const art=s.art[i],copy=s.copies[i],tag=copy.querySelector('.dh-tag'),title=copy.querySelector('h3'),body=copy.querySelector('p');
  panel.style.left=`${i*w}px`;
  const artWidth=mix(Math.min(w*.60,760),Math.min(w*.43,570),dock);
  Object.assign(art.style,{left:`${mix(w/2,left+col/2,dock)-artWidth/2}px`,top:`${mix(h*.60,h*.48,dock)-artWidth*.39}px`,width:`${artWidth}px`,height:`${artWidth*.78}px`,opacity:String(appear)});
  Object.assign(copy.style,{left:`${mix((w-col)/2,left+col+gap,dock)}px`,top:`${mix(h*.16,h*.23,dock)}px`,width:`${col}px`});
  const titleSize=mix(Math.min(38,col/10),Math.min(46,w*.034,col/9.5),dock);
  title.style.fontSize=`${titleSize}px`;
  [tag,title].forEach(node=>{node.style.opacity=String(appear);node.style.textAlign=dock<.001?'center':'left';});
  // Move the visible text along the same center line without changing line breaks.
  [tag,...title.children].forEach(node=>{node.style.width='max-content';node.style.transform=`translateX(calc(${col*.5*(1-dock)}px - ${50*(1-dock)}%))`;});
  tag.style.textAlign='left';title.style.textAlign='left';
  Object.assign(body.style,{opacity:String(read),transform:`translateY(${(1-read)*12}px)`,fontSize:`${Math.max(16,Math.min(18,w*.0125))}px`});
 });
}

export function dockedHorizontalThumbnail(content,graphics){
 const s=createDockedHorizontal(content);s.preview=true;s.el.classList.add('dh-thumbnail');
 s.art.forEach((host,i)=>host.append(graphics[i].cloneNode(true)));
 renderDockedHorizontal(s,1280,720);return s.el;
}
