// Proposal timing. Native vertical scrolling only; no wheel/touch interception, timers,
// content buttons, forced snap, localStorage defaults or migration dependencies.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=t=>t*t*(3-2*t);
const range=(p,a,b)=>ease(clamp((p-a)/(b-a)));
const set=(el,k,v)=>el.style.setProperty(k,String(v));
function heldHorizontal(p,count){
 const x=p*(count-.3),page=Math.floor(x),f=x-page;
 return Math.min(count-1,page+range(f,.42,.98));
}
export function mountMotion({preview=false,reduced=false,id=1}={}){
 const tracks=[...document.querySelectorAll('[data-scroll]')];
 const stacked=[...document.querySelectorAll('.stack-card')];
 const animated=!preview&&!reduced;
 let raf=0;
 function update(){
  raf=0;
  const bar=document.querySelector('.study-bar')?.getBoundingClientRect().height||0;
  const view=innerHeight-bar;
  for(const track of tracks){
   const type=track.dataset.scroll,r=track.getBoundingClientRect();
   let p=clamp((bar-r.top)/Math.max(1,track.offsetHeight-view));
   if(preview)p=type==='horizontal'?id===1?0:id===2?.42:.08:.7;
   if(reduced)p=1;
   set(track,'--progress',p);
   if(type==='horizontal'){
    const rail=track.querySelector('.horizontal-rail'),panels=[...track.querySelectorAll('.horizontal-panel')];
    const w=panels[0].getBoundingClientRect().width;
    const pos=heldHorizontal(p,panels.length);
    const offset=id===2?(track.querySelector('.horizontal-window').clientWidth-w)/2:0;
    if(!reduced)rail.style.transform='translate3d('+(offset-pos*w)+'px,0,0)';
    panels.forEach((panel,i)=>{
     const d=clamp(Math.abs(pos-i)),on=Math.abs(pos-i)<.52;
     if(id===2&&!reduced){set(panel,'--panel-scale',1-d*.09);set(panel,'--panel-ink',1-d*.55);}
     if(id===5&&!reduced)set(panel,'--parallax',(pos-i)*65+'px');
     // All content remains in the accessibility tree, including offscreen chapters.
     panel.dataset.current=String(on);
    });
    track.dataset.chapter=String(Math.round(pos));
   }
   if(type==='giant'){
    const k=reduced?1:range(p,.08,.5);
    set(track,'--draw',k);set(track,'--picto-scale',1.4-.4*k);set(track,'--picto-shift',(1-k)*30+'%');
   }
   if(type==='words'){
    const letters=[...track.querySelectorAll('.read-char')];
    letters.forEach((ch,i)=>ch.classList.toggle('is-read',reduced||i/letters.length<p/.78));
   }
   if(type==='underline'){
    const k=reduced?1:range(clamp((innerHeight-r.top)/(innerHeight+r.height)),.12,.62);set(track,'--read',k);
   }
   if(type==='number'){
    const k=reduced?1:range(p,.07,.47);set(track,'--open',k);set(track,'--value-open',reduced?1:range(p,.43,.69));
   }
   if(type==='wings'){
    const k=reduced?1:range(p,.05,.5);set(track,'--open',k);set(track,'--body-open',reduced?1:range(p,.35,.58));
   }
   if(type==='handoff'){
    const k=range(p,0,.73);
    set(track,'--black',reduced?1:k);set(track,'--title',reduced?1:range(p,.72,.95));
   }
  }
  stacked.forEach((card,i)=>{
   // A tall card must scroll far enough for its final paragraph before it pins.
   const gutter=innerWidth<=800?8:16;
   if(!reduced&&!preview&&innerHeight>600)card.style.top=(bar+gutter-Math.max(0,card.offsetHeight-(view-gutter)))+'px';
   else card.style.removeProperty('top');
   const next=stacked[i+1],p=next?clamp((innerHeight-next.getBoundingClientRect().top)/(innerHeight-bar)):0;
   set(card,'--stack-shrink',reduced||preview?1:1-p*.045);
  });
 }
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(update);};
 if(animated){addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);}
 update();
 return ()=>{removeEventListener('scroll',schedule);removeEventListener('resize',schedule);cancelAnimationFrame(raf);};
}
