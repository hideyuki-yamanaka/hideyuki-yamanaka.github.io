// High type contrast proposals; all sizes/ranges are intentionally proposed.
const measure=document.createElement('canvas').getContext('2d');
export function renderTitleConcept({s,c,p,w,h,u,head,art,copy,stats,lerp,ramp}){
 if(!s.lead)s.lead=s.copy.map(cp=>{
  const node=document.createElement('span');node.className='pf-title-lead';node.textContent=cp.querySelector('.pf-tag').textContent;node.setAttribute('aria-hidden','true');s.el.append(node);return node;
 });
 const horizontal=c.mode==='title-horizontal',move=ramp(p,.46,.59),stack=c.mode==='title-stack',editorial=c.mode==='title-editorial';
 s.el.dataset.transfer=horizontal?move.toFixed(3):'0';
 head(h*.18,44,ramp(p,.91,.98));stats(h*.52,125,ramp(p,.91,.98));
 [0,1].forEach(i=>{
  const local=(p-i*.5)/.5,q=ramp(local,.17,.52);
  const alpha=(horizontal?1:(i?ramp(p,.50,.54):1-ramp(p,.46,.50)))*(1-ramp(p,.87,.94));
  const dx=horizontal?(i-move)*w:0;
  const artX=stack?.5:editorial?.72:.28,artY=stack?.37:.49;
  art(i,w*artX+dx,h*artY,stack?470:580,alpha*ramp(q,.64,.92));
  const cpWidth=stack?Math.min(w*.7,u(800)):Math.min(w*.41,u(555));
  const cpX=w*(stack?.5:editorial?.285:.705)+dx;
  copy(i,cpX,h*(stack?.72:.51),cpWidth,stack?40:48,alpha*ramp(q,.88,1),17);
  s.copy[i].querySelector('.pf-tag').style.opacity='0';
  s.copy[i].querySelector('p').style.opacity=ramp(local,.55,.70);
  s.copy[i].style.textAlign=stack?'center':'left';
  const size=lerp(u(editorial?230:210),u(stack?30:22),q);
  const family=getComputedStyle(s.el).getPropertyValue('--font-en')||'-apple-system,sans-serif';
  measure.font=`400 ${size}px ${family}`;
  const textW=measure.measureText(s.lead[i].textContent).width;
  const finalX=stack?w/2:cpX-dx-cpWidth/2+textW/2;
  const finalY=stack?h*.14:h*.37;
  const lead=s.lead[i];lead.dataset.i=i;
  Object.assign(lead.style,{left:`${lerp(w/2,finalX,q)+dx}px`,top:`${lerp(h*.44,finalY,q)}px`,fontSize:`${size}px`,opacity:alpha,transform:'translate(-50%,-50%)'});
  s.artLabels[i].style.opacity='0';
 });
 s.cue.textContent=`${c.label} / ${p<.5?'for SaaS':'for AI'} — 用途名から、図と説明へ`;
}
