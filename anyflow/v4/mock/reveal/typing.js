// Proposal values: crossing a trigger starts a clock; scroll never scrubs letters.
export function typingState(entry,active,total,preview=false){
 const clamp=x=>Math.max(0,Math.min(1,x));
 const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
 if(preview)return{typed:1,body:1};
 if(active&&entry.startedAt==null)entry.startedAt=performance.now();
 const elapsed=entry.startedAt==null?-1:performance.now()-entry.startedAt;
 return {typed:clamp(elapsed/(total*75)),body:smooth((elapsed-total*75-120)/500)};
}
function prepare(copy){
 const heading=copy.querySelector('h3');
 heading.setAttribute('aria-label',[...heading.querySelectorAll('i')].map(line=>line.textContent).join(''));
 const chars=[];
 heading.querySelectorAll('i').forEach(line=>{
   const text=line.textContent;line.textContent='';line.setAttribute('aria-hidden','true');
   Array.from(text).forEach(letter=>{
     const char=document.createElement('span');char.className='pf-type-char';char.textContent=letter;line.append(char);chars.push(char);
   });
 });
 return {chars,heading,body:copy.querySelector('p')};
}
export function renderTypingConcept({s,c,p,w,h,u,head,art,copy,stats,lerp,ramp,clamp}){
 if(!s.typing)s.typing=s.copy.map(prepare);
 const settle=ramp(p,.12,.20);
 head(h*lerp(.20,.105,settle),lerp(46,36,settle));
 stats(h*lerp(.51,.825,settle),lerp(138,52,settle));
 const scenes=[{start:.17,end:.53,alpha:ramp(p,.16,.20)*(1-ramp(p,.53,.57))},{start:.57,end:.96,alpha:ramp(p,.57,.61)}];
 scenes.forEach(({start,end,alpha},i)=>{
   art(i,w*.28,h*.49,600,alpha);
   copy(i,w*.705,h*.31,Math.min(w*.41,u(555)),48,alpha,16);
   // Anchor the full reserved text block at its top; typing never changes its layout.
   s.copy[i].style.transform='translateX(-50%)';
   const entry=s.typing[i],state=typingState(entry,p>=start,entry.chars.length,s.preview);
   const count=Math.floor(state.typed*entry.chars.length);
   entry.chars.forEach((char,j)=>{
     char.style.opacity=j<count?'1':'0';
     char.classList.toggle('pf-type-cursor',j===count-1&&count<entry.chars.length);
   });
   entry.heading.dataset.typed=String(count);
   entry.heading.dataset.total=String(entry.chars.length);
   entry.body.style.opacity=String(state.body);
   entry.body.style.filter=`blur(${(1-state.body)*10}px)`;
   entry.body.style.transform=`translateY(${(1-state.body)*12}px)`;
 });
 s.cue.textContent=`${c.label} / ${p<.17?'三つの実績':p<.57?'for SaaS — 見出しから本文へ':'for AI — 見出しから本文へ'}`;
}
