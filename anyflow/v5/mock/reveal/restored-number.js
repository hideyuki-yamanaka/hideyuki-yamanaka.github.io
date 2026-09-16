// Second delivery No.03: source composition from results-second/retained.js.
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createRestoredNumberStage(content){
 const el=document.createElement('div');el.className='pf-stage restored-number';
 const stat=i=>`<div class="rn-stat"><b>${escape(content.stats[i].label)}</b><span class="pf-number" data-slot-index="${i}">${escape(content.stats[i].number).replace(/\+$/,'<small>+</small>')}</span></div>`;
 const head=`<span>${content.head.replace('<em>','</span><span><em>')}</span>`;
 el.innerHTML=`<section class="rn-container"><h2 class="rn-head rn-reveal">${head}</h2><div class="rn-numbers rn-reveal rn-delay-1"><div class="rn-major">${stat(1)}<span class="rn-caption">事業をつなぐ、連携の積み重ね。</span></div><div class="rn-minors">${stat(0)}${stat(2)}</div></div><div class="rn-rule"></div><div class="rn-reveal rn-delay-2"><div class="rn-pair">${content.values.map((v,i)=>`<article class="rn-value" data-i="${i}"><div class="rn-art" aria-hidden="true"></div><div class="rn-copy"><span class="rn-tag">${escape(v.tag)}</span><h3>${v.title.map(t=>`<span>${escape(t)}</span>`).join('')}</h3><p>${escape(v.body)}</p></div></article>`).join('')}</div></div></section>`;
 const art=[...el.querySelectorAll('.rn-art')];return{el,art,mobileArt:art,mobile:[]};
}
export function observeRestoredNumber(stage,reduced){
 const targets=[...stage.el.querySelectorAll('.rn-reveal')];
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('rn-visible');observer.unobserve(entry.target);}}),{threshold:.08});
 const reveal=()=>{if(reduced.matches){targets.forEach(el=>el.classList.add('rn-visible'));observer.disconnect();}};
 if(reduced.matches)reveal();else targets.forEach(el=>observer.observe(el));reduced.addEventListener('change',reveal);
}
export function restoredNumberThumbnail(content,graphics){
 const stage=createRestoredNumberStage(content);stage.el.classList.add('rn-thumbnail');
 stage.art.forEach((slot,i)=>slot.append(graphics[i].cloneNode(true)));
 stage.el.querySelectorAll('.rn-reveal').forEach(el=>el.classList.add('rn-visible'));return stage.el;
}
