// Initial ten proposals, original No.04: retained.js + study.css (2026-09-13).
// Restore its composition and entrance motion; use current V4 text/SVG/reel sources.
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createRestoredPictoStage(content){
 const el=document.createElement('div');el.className='pf-stage restored-picto';
 el.innerHTML=`<section class="rp-container"><h2 class="rp-head rp-reveal">${content.head}</h2><div class="rp-reveal rp-delay-1"><div class="rp-pair">${content.values.map((v,i)=>`<article class="rp-value" data-i="${i}"><div class="rp-art" aria-hidden="true"></div><div class="rp-copy"><span class="rp-tag">${escape(v.tag)}</span><h3>${v.title.map(t=>`<span>${escape(t)}</span>`).join('')}</h3><p>${escape(v.body)}</p></div></article>`).join('')}</div></div><div class="rp-proof rp-reveal rp-delay-2"><div class="rp-stats">${content.stats.map(s=>`<div class="rp-stat"><b>${escape(s.label)}</b><span class="pf-number">${escape(s.number).replace(/\+$/,'<span class="rp-plus">+</span>')}</span></div>`).join('')}</div></div></section>`;
 // Original heading stays on one line on desktop, two semantic lines on mobile.
 el.querySelector('.rp-head').innerHTML=`<span>${content.head.replace('<em>','</span><span><em>')}</span>`;
 const art=[...el.querySelectorAll('.rp-art')];
 return{el,art,mobileArt:art,mobile:[]};
}
export function observeRestoredPicto(stage,reduced){
 const targets=[...stage.el.querySelectorAll('.rp-reveal')];
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('rp-visible');observer.unobserve(entry.target);}
 }),{threshold:.08});
 const reveal=()=>{if(reduced.matches){targets.forEach(el=>el.classList.add('rp-visible'));observer.disconnect();}};
 if(reduced.matches)reveal();else targets.forEach(el=>observer.observe(el));
 reduced.addEventListener('change',reveal);
}
export function restoredPictoThumbnail(content,graphics){
 const stage=createRestoredPictoStage(content);
 stage.el.classList.add('rp-thumbnail');
 stage.art.forEach((slot,i)=>slot.append(graphics[i].cloneNode(true)));
 stage.el.querySelectorAll('.rp-reveal').forEach(el=>el.classList.add('rp-visible'));
 return stage.el;
}
