// Verified against deployed V4 on 2026-09-14. Source functions and paths are reused.
// These volatile choices belong to the mock, never to saved production preferences.
export function applyV4MotionSettings(){
 Object.assign(params.patterns,{valSaas:'S18',valAi:'A21'});
 Object.assign(params.sections.results,{pictoW:1.5,pictoSpeed:1,slotAt:.3,slotDur:1.4,slotStagger:.12,slotCycles:3,slotEnterAt:.85,slotEase:5});
}
export function polishPictograms(root){
 root.querySelectorAll('.r2v-graphic svg').forEach(svg=>{
  const style=getComputedStyle(svg),scale=Math.min(parseFloat(style.width),parseFloat(style.height))/220;if(!scale)return;
  // Dash lengths describe SVG coordinates. Non-scaling-stroke also freezes dashes,
  // so enlarged trim paths used to repeat. Scale dashes normally, compensate only
  // the stroke width, preserving the original 1.5 CSS px at every artwork size.
  svg.querySelectorAll('*').forEach(shape=>{
   shape.style.vectorEffect='none';
   shape.style.strokeWidth=`${Number(shape.getAttribute('stroke-width')||1.5)/scale}px`;
   const dash=shape.getAttribute('stroke-dasharray');
   shape.style.strokeDasharray=dash&&!shape.hasAttribute('stroke-dashoffset')?dash.split(/[ ,]+/).map(n=>Number(n)/scale).join(' '):'';
  });
  // User-requested exception to V4: omit only S18's horizontal ground line.
  const line=svg.querySelector('line[x1="36.0"][x2="184.0"][y1="166.0"][y2="166.0"]');
  if(line)line.style.display='none';
 });
}
export function createV4Slots(root,reduced){
 buildSlots();
 const groups=[...root.querySelectorAll('.pf-number,.ds-stat>span,.pf-mobile-stats>div>span')].map((host,i)=>{
  const original=slots[i%3];
  host.dataset.finalNumber=host.textContent;host.setAttribute('aria-label',host.textContent);
  const wrap=original.host.firstElementChild.cloneNode(true);wrap.setAttribute('aria-hidden','true');host.replaceChildren(wrap);
  return {host,reels:[...wrap.querySelectorAll('.rl')].map(rl=>({rl,stp:rl.firstElementChild,len:rl.firstElementChild.children.length})),startedAt:null};
 });
 return()=>{
  const now=performance.now(),original=slots;
  try{for(const group of groups){
   const rect=group.host.getBoundingClientRect();
   const reveal=group.host.closest('.rp-reveal');
   const visible=group.host.offsetWidth>0&&rect.top<innerHeight*.85&&rect.bottom>0&&Number(getComputedStyle(group.host.parentElement).opacity)>.15&&(!reveal||Number(getComputedStyle(reveal).opacity)>.15);
   if(visible&&group.startedAt==null)group.startedAt=now;
   // Run the actual V4 reel renderer: same sequence, stagger, duration and easing.
   slots=[group];renderSlots(reduced.matches?99:group.startedAt==null?-1:(now-group.startedAt)/1000);
   group.host.dataset.slotState=reduced.matches||group.startedAt!=null&&now-group.startedAt>2200?'complete':group.startedAt==null?'waiting':'playing';
  }}finally{slots=original;}
 };
}
