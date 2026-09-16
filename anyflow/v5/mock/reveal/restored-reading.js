// Initial No.07: preserve its two-column reading composition and one-shot entrance.
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createRestoredReadingStage(content){
 const el=document.createElement('div');el.className='pf-stage restored-reading';
 const heading=`<span>${content.head.replace('<em>','</span><span><em>')}</span>`;
 el.innerHTML=`<section class="rr-container"><aside class="rr-aside"><p class="rr-eyebrow">What we empower</p><h2 class="rr-head">${heading}</h2><div class="rr-stats">${content.stats.map(s=>`<div class="rr-stat"><b>${escape(s.label)}</b><span class="pf-number">${escape(s.number).replace(/\+$/,'<small>+</small>')}</span></div>`).join('')}</div><p class="rr-hint">2つの価値を、順に。</p></aside><div class="rr-values">${content.values.map((v,i)=>`<section class="rr-chapter" data-i="${i}"><span class="rr-index">0${i+1}</span><article class="rr-value rr-reveal"><div class="rr-art" aria-hidden="true"></div><div class="rr-copy"><span class="rr-tag">${escape(v.tag)}</span><h3>${v.title.map(t=>`<span>${escape(t)}</span>`).join('')}</h3><p>${escape(v.body)}</p></div></article></section>`).join('')}</div></section>`;
 const art=[...el.querySelectorAll('.rr-art')];return{el,art,mobileArt:art,mobile:[]};
}
export function observeRestoredReading(stage,reduced){
 const targets=[...stage.el.querySelectorAll('.rr-reveal')];
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('rr-visible');observer.unobserve(entry.target);}}),{threshold:.12});
 const reveal=()=>{if(reduced.matches){targets.forEach(el=>el.classList.add('rr-visible'));observer.disconnect();}};
 if(reduced.matches)reveal();else targets.forEach(el=>observer.observe(el));reduced.addEventListener('change',reveal);
}
export function restoredReadingThumbnail(content,graphics){
 const stage=createRestoredReadingStage(content);stage.el.classList.add('rr-thumbnail');
 stage.art.forEach((slot,i)=>slot.append(graphics[i].cloneNode(true)));
 stage.el.querySelectorAll('.rr-reveal').forEach(el=>el.classList.add('rr-visible'));return stage.el;
}
