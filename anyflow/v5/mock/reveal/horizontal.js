// Study choreography. Only the handoff between SaaS and AI travels horizontally.
export function renderHorizontalConcept({s,c,p,w,h,u,contentW,head,art,copy,stat,stats,lerp,ramp}){
 const overview=c.mode==='overview-horizontal';
 const proof=ramp(p,.02,.14),enter=ramp(p,.16,.21),move=ramp(p,.46,.64);
 head(h*lerp(.18,.10,proof),lerp(48,34,proof));
 stats(h*lerp(.50,.83,proof),lerp(132,48,proof));
 if(overview&&p<.14){
  const col=contentW/3,left=(w-contentW)/2;
  stat(1,w/2,h*lerp(.50,.83,proof),lerp(contentW,col,proof),lerp(230,48,proof));
  [0,2].forEach(i=>stat(i,left+col*(i+.5),h*.83,col,48,ramp(p,.08,.14)));
 }
 const scale=overview?1-.44*Math.sin(move*Math.PI):1;
 [0,1].forEach(i=>{
  const settle=ramp(p,i?.66:.20,i?.82:.36);
  const zoom=overview?1:settle;
  const dx=(i-move)*w*scale*(overview?1-.12*Math.sin(move*Math.PI):1);
  const point=(x,y)=>[w/2+(x-w/2)*scale+dx,h*.49+(y-h*.49)*scale];
  const a=point(w*lerp(.5,.28,zoom),h*.49);
  art(i,a[0],a[1],lerp(850,560,zoom)*scale,enter);
  const t=point(w*.705,h*.49);
  copy(i,t[0],t[1],Math.min(w*.40,u(545))*scale,48*scale,enter*(overview?1:ramp(settle,.40,.94)),17*scale);
  s.artLabels[i].style.fontSize=`${u(lerp(30,22,zoom))*scale}px`;
 });
 s.el.dataset.transfer=move.toFixed(3);
 s.cue.textContent=`${c.label} / ${p<.16?'実績':p<.46?'for SaaS':p<.64?'for SaaS → for AI':'for AI'} — Scroll ↓`;
}
