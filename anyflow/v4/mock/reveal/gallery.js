import {concepts,groups,fallbackContent} from './catalog.js';
import {createStage,renderStage} from './stage.js';
const thumbs={P1:.84,P2:.36,P3:.37,P4:.34,P5:.91,T1:.35,T2:.35,T3:.85,T4:.35,T5:.9,R1:.53,R2:.14,R3:.44,R4:.45,R5:.43};
const root=document.getElementById('concepts');
const stages=[];
Object.entries(groups).forEach(([key,g])=>{
  const section=document.createElement('section');section.className='gallery-group';section.id=`group-${key}`;
  section.innerHTML=`<div class="group-heading"><h2><small>${key} / 01—05</small>${g.title}</h2><p>${g.lead}</p></div><div class="gallery-grid"></div>`;
  root.append(section);
  concepts.filter(c=>c.group===key).forEach(c=>{
    const card=document.createElement('article');card.className='concept-card';
    card.innerHTML=`<a href="./demo.html?concept=${c.id}#results" aria-label="${c.id} ${c.name}をスクロールで見る"><div class="mini" aria-hidden="true"></div><div class="card-caption"><span>${c.id}</span><h3>${c.name}</h3><b>↗</b></div><p>${c.brief}</p><div class="concept-steps">${c.steps.map(t=>`<span>${t}</span>`).join('')}</div></a>`;
    section.querySelector('.gallery-grid').append(card);
    const s=createStage(fallbackContent);const mini=card.querySelector('.mini');mini.append(s.el);
    s.art.forEach((e,i)=>{const img=document.createElement('img');img.src=`/assets/results-val-${i?'ai':'saas'}.svg`;img.alt='';e.append(img);});
    renderStage(s,c,thumbs[c.id],1280,780);
    const ro=new ResizeObserver(()=>{s.el.style.transform=`scale(${mini.clientWidth/1280})`;});ro.observe(mini);
    stages.push({s,c,card});
  });
});
