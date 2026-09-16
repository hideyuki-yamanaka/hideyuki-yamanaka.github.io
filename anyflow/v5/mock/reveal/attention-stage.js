// Scroll reading studies. All geometry/timing is proposed; V4 owns text, SVGs and surrounding sections.
const clamp=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a+(b-a)*t;
const ramp=(p,a,b)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grouped=new Set(['duet','horizontal','number','depth']);
export function createAttentionStage(content,concept){
 const kind=concept.mode.replace('attention-',''),el=document.createElement('div');el.className=`pf-stage attention-stage at-${kind}`;
 const proof=`<section class="at-proof"><h2>${kind==='ledger'?content.head.replace('、','、<br>'):content.head}</h2><div class="at-stats">${content.stats.map((s,i)=>`<div class="at-stat" data-i="${i}"><b>${esc(s.label)}</b><span class="pf-number" data-slot-index="${i}">${esc(s.number)}</span></div>`).join('')}</div></section>`;
 const scenes=content.values.map((v,i)=>`<article class="at-chapter" data-i="${i}"><div class="at-scene"><div class="at-surface"><span class="at-label">${esc(v.tag)}</span><div class="at-art" aria-hidden="true"></div><div class="at-copy"><h3 aria-label="${esc(v.title.join(''))}">${v.title.map(line=>`<span>${kind==='horizontal'?Array.from(line).map(ch=>`<i aria-hidden="true">${esc(ch)}</i>`).join(''):esc(line)}</span>`).join('')}</h3><p>${esc(v.body)}</p></div></div></div></article>`).join('');
 if(grouped.has(kind))el.innerHTML=`${kind==='horizontal'||kind==='depth'?proof:''}<div class="at-story"><div class="at-pin">${kind==='number'?proof:''}<div class="at-values">${scenes}</div><div class="at-track" aria-hidden="true"><span>for SaaS</span><i></i><span>for AI</span></div></div></div>${kind==='duet'?proof:''}`;
 else el.innerHTML=`${kind==='ledger'?'<div class="at-ledger-grid">':''}${proof}<div class="at-values">${scenes}</div>${kind==='ledger'?'</div>':''}`;
 const art=[...el.querySelectorAll('.at-art')],scenesEls=[...el.querySelectorAll('.at-scene')];
 return{el,kind,concept,art,mobileArt:art,mobile:[],scenes:scenesEls,chapters:[...el.querySelectorAll('.at-chapter')],surfaces:[...el.querySelectorAll('.at-surface')],copies:[...el.querySelectorAll('.at-copy')],labels:[...el.querySelectorAll('.at-label')],proof:el.querySelector('.at-proof'),stats:[...el.querySelectorAll('.at-stat')],started:[null,null],preview:false};
}
function drawScene(s,i,q,w,h,now){
 const kind=s.kind,u=Math.min(w/(kind==='ledger'?640:1440),h/850,1.18),px=n=>n*u;
 const scene=s.scenes[i],surface=s.surfaces[i],art=s.art[i],copy=s.copies[i],label=s.labels[i],title=copy.querySelector('h3'),body=copy.querySelector('p');
 const set=(el,x,y,width)=>{Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`});};
 Object.assign(scene.style,{opacity:'1',transform:'none'});Object.assign(surface.style,{opacity:'1',transform:'none'});
 Object.assign(art.style,{opacity:'1',filter:'none',clipPath:'none',transform:'translate(-50%,-50%)'});
 Object.assign(copy.style,{opacity:'1',filter:'none',textAlign:'left',height:'auto',transform:'translate(-50%,-50%)'});
 title.style.fontSize=`${px(52)}px`;title.querySelectorAll('span').forEach(e=>e.style.cssText='');body.style.cssText=`font-size:${Math.max(16,px(19))}px`;
 const artAt=(x,y,size)=>{set(art,w*x,h*y,px(size));art.style.height=`${px(size*.78)}px`;};
 const textAt=(x,y,width=.40,size=52)=>{set(copy,w*x,h*y,w*width);title.style.fontSize=`${px(size)}px`;};
 const tagAt=(x,y,center=false)=>{set(label,w*x,h*y,w*.4);label.style.fontSize=`${Math.max(20,px(24))}px`;label.style.textAlign=center?'center':'left';label.style.transform=center?'translateX(-50%)':'none';};
 artAt(.28,.47,620);textAt(.72,.5);tagAt(.52,.22);
 const enter=ramp(q,.08,.32),read=ramp(q,.30,.50);
 body.style.opacity=String(read);body.style.filter=`blur(${(1-read)*7}px)`;
 if(kind==='duet'){
  const open=ramp(q,.08,.35),x=i?.735:.265,copyOn=ramp(q,i?.48:.32,i?.62:.46);
  artAt(mix(i?.56:.44,x,open),mix(.45,.36,open),mix(680,540,open));textAt(x,.69,.38,42);tagAt(x,.12,true);
  label.style.fontSize=`${px(30)}px`;copy.style.opacity=String(copyOn);body.style.opacity=String(ramp(q,i?.60:.44,i?.73:.57));body.style.filter='none';body.style.fontSize=`${Math.max(16,px(17))}px`;
 }else if(kind==='ledger'){
  const a=ramp(q,.05,.30);artAt(.5,.30,mix(610,510,a));textAt(.5,.68,.88,42);tagAt(.06,.08);
  title.style.opacity=String(a);body.style.opacity=String(read);body.style.fontSize='16px';
 }else if(kind==='linegap'){
  const open=ramp(q,.08,.46);artAt(.5,.45,450);art.style.opacity=String(ramp(q,.20,.45));art.style.clipPath=`inset(${(1-open)*45}% 0)`;
  set(copy,0,0,w);copy.style.transform='none';copy.style.height=`${h}px`;copy.style.textAlign='center';
  title.querySelectorAll('span').forEach((line,j)=>{Object.assign(line.style,{position:'absolute',left:'10%',width:'80%',top:`${h*(j?mix(.46,.72,open):mix(.33,.18,open))}px`,transform:'translateY(-50%)'});});
  tagAt(.5,.06,true);title.style.fontSize=`${px(49)}px`;Object.assign(body.style,{position:'absolute',left:'18%',top:`${h*.80}px`,width:'64%',opacity:String(ramp(q,.44,.64)),filter:'none',fontSize:`${Math.max(16,px(17))}px`});
 }else if(kind==='horizontal'){
  const on=q>=.10;if(on&&s.started[i]==null&&!s.preview)s.started[i]=now;
  const chars=[...title.querySelectorAll('i')],elapsed=s.preview?100000:s.started[i]==null?0:now-s.started[i];
  chars.forEach((ch,n)=>ch.style.opacity=String(elapsed>n*75?1:0));
  const typed=clamp((elapsed-chars.length*75-120)/500);body.style.opacity=String(typed);body.style.filter=`blur(${(1-typed)*8}px)`;
  artAt(.74,.48,580);textAt(.28,.51,.38,52);tagAt(.09,.23);art.style.opacity=String(ramp(q,0,.12));
 }else if(kind==='number'){
  artAt(i?.735:.265,.48,390);textAt(i?.735:.265,.76,.38,32);tagAt(i?.735:.265,.36,true);
  art.style.opacity=String(ramp(q,.35,.53));copy.style.opacity=String(ramp(q,.51,.66));body.style.fontSize=`${Math.max(16,px(16))}px`;body.style.opacity=String(ramp(q,.62,.76));body.style.filter='none';
 }else if(kind==='aperture'){
  const a=ramp(q,.05,.43);artAt(mix(.5,.28,a),.48,mix(820,620,a));art.style.clipPath=`inset(0 ${(1-a)*42}% 0 ${(1-a)*42}%)`;
  tagAt(.08,.12);copy.style.opacity=String(ramp(q,.36,.56));body.style.opacity=String(ramp(q,.49,.65));body.style.filter='none';
 }else if(kind==='tilt'){
  const a=ramp(q,.04,.35);surface.style.transform=`perspective(1300px) translateY(${(1-a)*100}px) rotateX(${(1-a)*32}deg)`;surface.style.transformOrigin='50% 70%';
  surface.style.opacity=String(mix(.2,1,a));body.style.opacity=String(ramp(q,.33,.51));
 }else if(kind==='focus'){
  const a=ramp(q,.13,.50);artAt(mix(.5,.26,a),.47,mix(880,510,a));art.style.filter=`blur(${Math.sin(a*Math.PI)*2}px)`;art.style.opacity=String(mix(1,.64,a));
  copy.style.opacity=String(ramp(q,.24,.51));copy.style.filter=`blur(${(1-a)*12}px)`;body.style.opacity=String(ramp(q,.48,.62));body.style.filter='none';tagAt(.08,.12);
 }else if(kind==='path'){
  const a=ramp(q,0,.30);artAt(i?.27:.73,.43,480);textAt(i?.73:.27,.51,.37,44);tagAt(i?.545:.085,.22);
  surface.style.opacity=String(a);surface.style.transform=`translateY(${(1-a)*30}px)`;body.style.opacity=String(ramp(q,.18,.40));body.style.filter='none';
 }else if(kind==='depth'){
  artAt(.27,.47,580);textAt(.70,.50,.38,50);tagAt(.51,.22);body.style.opacity=String(ramp(q,.06,.23));body.style.filter='none';
 }
 if(kind!=='ledger')title.style.opacity='1';
}
export function renderAttentionStage(s,scroll,w,h,reduced=false){
 const staticMode=!s.preview&&(w<=800||h<=600||reduced);s.el.classList.toggle('at-static',staticMode);
 if(staticMode)return;
 const now=performance.now(),kind=s.kind,isGroup=grouped.has(kind);
 let p=0;
 if(isGroup){
  const story=s.el.querySelector('.at-story'),r=story.getBoundingClientRect();p=s.preview?s.concept.preview:ramp(-r.top/Math.max(1,r.height-h),0,1);
  const move=ramp(p,.39,.62);
  s.el.style.setProperty('--at-progress',String(p));
  s.scenes.forEach((el,i)=>{
   let q=kind==='horizontal'||kind==='depth'?(p-(i?.62:0))/(i?.38:.39):p;
   drawScene(s,i,q,w,h,now);
   if(kind==='horizontal'){el.style.transform=`translateX(${(i-move)*w}px)`;}
   if(kind==='depth'){
    const t=i?1-move:move,side=i?1:-1;
    el.style.transform=`perspective(1300px) translate3d(${side*t*w*1.05}px,${t*h*.07}px,${-t*650}px) rotateY(${side*t*16}deg)`;
    el.style.opacity=i?(move>.001?'1':'0'):'1';el.style.zIndex=i?'2':'1';
    // Once AI has landed, expose V4's original gradient during the handoff to development.
    el.style.backgroundColor=i&&move>.995?'transparent':'#e7e7e7';
   }
  });
  if(kind==='number'){
   const settle=ramp(p,.07,.36),unit=Math.min(w/1440,h/850,1.18),span=Math.min(w*.84,1220*unit);
   const head=s.proof.querySelector('h2');Object.assign(head.style,{position:'absolute',left:'8%',top:`${h*.075}px`,width:'84%',fontSize:`${38*unit}px`,textAlign:'center'});
   s.stats.forEach((el,i)=>{const target=(w-span)/2+span*(i+.5)/3;Object.assign(el.style,{position:'absolute',left:`${i===1?mix(w/2,target,settle):target}px`,top:`${h*(i===1?mix(.5,.24,settle):.24)}px`,width:`${i===1?mix(w*.88,span/3,settle):span/3}px`,opacity:String(i===1?1:ramp(p,.23,.37)),transform:'translate(-50%,-50%)'});el.querySelector('.pf-number').style.fontSize=`${(i===1?mix(285,68,settle):68)*unit}px`;});
  }
 }else{
  s.chapters.forEach((ch,i)=>{const r=ch.getBoundingClientRect();const q=s.preview?s.concept.preview:kind==='path'?(h-r.top)/(h+r.height):-r.top/Math.max(1,r.height-h);drawScene(s,i,q,kind==='ledger'?(s.preview?(Math.min(1240,w*.84)-64)*.62:s.scenes[i].clientWidth):w,h,now);});
  if(kind==='path'){const values=s.el.querySelector('.at-values'),r=values.getBoundingClientRect();s.el.style.setProperty('--at-path',`${clamp((h*.6-r.top)/r.height)*100}%`);}
 }
}
export function attentionThumbnail(content,concept,graphics){
 const s=createAttentionStage(content,concept);s.preview=true;s.el.classList.add('at-thumbnail');
 s.art.forEach((slot,i)=>slot.append(graphics[i].cloneNode(true)));
 // Use exactly the same choreography as the live frame, with a representative local progress.
 renderAttentionStage(s,0,1280,720,false);return s.el;
}
