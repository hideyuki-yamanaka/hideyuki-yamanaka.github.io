// Proposed choreography only. Copy, fonts, artwork and the next section come from V4.
import {renderNewConcept} from './new-concepts.js';
import {renderTypingConcept} from './typing.js';
export const clamp = x => Math.max(0, Math.min(1, x));
const lerp = (a,b,t) => a+(b-a)*t;
const ramp = (p,a,b) => {const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copyMarkup = v => `<span class="pf-tag">${esc(v.tag)}</span><h3>${v.title.map(t=>`<span><i>${esc(t)}</i></span>`).join('')}</h3><p>${esc(v.body)}</p>`;
export function createStage(content) {
  const el=document.createElement('div');el.className='pf-stage';
  el.innerHTML=`<h2 class="pf-head">${content.head}</h2>${content.values.map((v,i)=>`<div class="pf-art" data-i="${i}"></div><div class="pf-copy" data-i="${i}">${copyMarkup(v)}</div>`).join('')}${content.stats.map((s,i)=>`<div class="pf-stat" data-i="${i}"><span class="pf-label">${esc(s.label)}</span><span class="pf-number">${esc(s.number)}</span></div>`).join('')}<div class="pf-rule"></div><div class="pf-cue" aria-hidden="true"><b></b><span>Scroll ↓</span><i></i></div><div class="pf-mobile-content"><h2>${content.head}</h2>${content.values.map((v,i)=>`<article class="pf-mobile-value" data-i="${i}"><div class="pf-mobile-art"></div><div class="pf-mobile-copy">${copyMarkup(v)}</div></article>`).join('')}<div class="pf-mobile-stats">${content.stats.map(s=>`<div><b>${esc(s.label)}</b><span>${esc(s.number)}</span></div>`).join('')}</div></div>`;
  el.insertAdjacentHTML('afterbegin','<div class="pf-plane" aria-hidden="true"></div><div class="pf-frame" aria-hidden="true"></div><div class="pf-frame" aria-hidden="true"></div><div class="pf-orbit" aria-hidden="true"></div><svg class="pf-connect" aria-hidden="true"><path fill="none" pathLength="1"/></svg><div class="pf-guide" aria-hidden="true"></div>');
  const art=[...el.querySelectorAll('.pf-art')];
  const artLabels=art.map((a,i)=>{const label=document.createElement('span');label.className='pf-art-label';label.textContent=content.values[i].tag;a.append(label);return label;});
  el.querySelectorAll('.pf-mobile-art').forEach((a,i)=>{const label=document.createElement('span');label.className='pf-art-label';label.textContent=content.values[i].tag;a.append(label);});
  return {el,head:el.querySelector('.pf-head'),copy:[...el.querySelectorAll('.pf-copy')],art,artLabels,stat:[...el.querySelectorAll('.pf-stat')],rule:el.querySelector('.pf-rule'),cue:el.querySelector('.pf-cue b'),mobileArt:[...el.querySelectorAll('.pf-mobile-art')],mobile:[...el.querySelectorAll('.pf-mobile-content>h2,.pf-mobile-art,.pf-mobile-copy,.pf-mobile-stats')],frames:[...el.querySelectorAll('.pf-frame')],orbit:el.querySelector('.pf-orbit'),connect:el.querySelector('.pf-connect'),guide:el.querySelector('.pf-guide'),plane:el.querySelector('.pf-plane')};
}
export function renderStage(s, c, p, w, h) {
  p=clamp(p); const unit=Math.min(w/1440,h/850,1.18), u=n=>n*unit;
  const contentW=Math.min(w*.84,1220*unit), mid=w/2;
  const put=(el,x,y,width,alpha=1)=>{Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`,opacity:String(clamp(alpha))});};
  const head=(y,size=40,a=1,x=mid,width=contentW)=>{put(s.head,x,y,width,a);s.head.style.fontSize=`${u(size)}px`;};
  const art=(i,x,y,width,a=1)=>{put(s.art[i],x,y,u(width),a);s.art[i].style.height=`${u(width*.78)}px`;};
  const copy=(i,x,y,width,size=44,a=1,bodySize=16)=>{
    put(s.copy[i],x,y,width,a);s.copy[i].querySelector('h3').style.fontSize=`${u(size)}px`;
    s.copy[i].querySelector('p').style.fontSize=`${u(bodySize)}px`;
    s.copy[i].querySelector('.pf-tag').style.fontSize=`${u(22)}px`;
    s.copy[i].querySelectorAll('h3 i').forEach(e=>e.style.transform='none');
    s.copy[i].querySelector('p').style.opacity='1';
  };
  const stat=(i,x,y,width,size=130,a=1)=>{put(s.stat[i],x,y,width,a);s.stat[i].querySelector('.pf-number').style.fontSize=`${u(size)}px`;s.stat[i].querySelector('.pf-label').style.fontSize=`${u(size>95?16:13)}px`;};
  const stats=(y,size=130,a=1)=>{
    const widths=[.25,.43,.24],xs=[.125,.505,.88];
    s.stat.forEach((e,i)=>stat(i,mid-contentW/2+contentW*xs[i],y,contentW*widths[i],size,typeof a==='function'?a(i):a));
  };
  const duet=(a=1,ay=.32,cy=.60,size=38,aw=340)=>{[0,1].forEach(i=>{const x=w*(i?.735:.265);art(i,x,h*ay,aw,a);copy(i,x,h*cy,Math.min(w*.38,u(490)),size,a);});};
  [s.head,...s.copy,...s.art,...s.stat,s.rule].forEach(e=>e.style.opacity='0');
  [s.plane,...s.frames,s.orbit,s.connect,s.guide].forEach(e=>e.style.opacity='0');
  s.copy.forEach(e=>{e.style.clipPath='none';e.style.filter='none';});
  s.stat.forEach(e=>{e.style.zIndex='3';const n=e.querySelector('.pf-number');n.style.color='inherit';n.style.webkitTextStroke='0px';});
  s.el.dataset.mode=c.mode;
  s.rule.style.transform='none';
  s.el.style.setProperty('--pf-progress',p.toFixed(4));
  s.cue.textContent=`${c.id} / ${c.steps[Math.min(2,Math.floor(p*3))]}`;
  const k=c.mode;
  if(c.group==='TY') {
    renderTypingConcept({s,c,p,w,h,u,unit,contentW,mid,put,head,art,copy,stat,stats,duet,lerp,ramp,clamp});
  } else if(c.group==='N') {
    renderNewConcept({s,c,p,w,h,u,unit,contentW,mid,put,head,art,copy,stat,stats,duet,lerp,ramp,clamp});
  } else if(k==='split') {
    const spread=ramp(p,.10,.36),words=ramp(p,.32,.52);
    [0,1].forEach(i=>{const x=w*lerp(i?.61:.39,i?.735:.265,spread);art(i,x,h*lerp(.48,.32,spread),lerp(540,340,spread));copy(i,w*(i?.735:.265),h*lerp(.67,.60,words),Math.min(w*.38,u(490)),38,words);});
    head(h*.105,38,ramp(p,.54,.66));stats(h*.825,52,ramp(p,.69,.83));
  } else if(k==='surround') {
    const open=ramp(p,.10,.35);[0,1].forEach(i=>art(i,w*lerp(i?.60:.4,i?.84:.16,open),h*lerp(.48,.36,open),lerp(540,325,open)));
    head(h*.12,42,ramp(p,.28,.42));
    stat(1,mid,h*.39,u(500),150,ramp(p,.31,.48));
    stat(0,w*.40,h*.57,u(220),66,ramp(p,.43,.57));stat(2,w*.63,h*.57,u(220),66,ramp(p,.49,.63));
    [0,1].forEach(i=>copy(i,w*(i?.74:.26),h*.755,Math.min(w*.39,u(500)),30,ramp(p,.61,.78),14));
  } else if(k==='pair') {
    const up=ramp(p,.12,.38);[0,1].forEach(i=>{copy(i,w*(i?.735:.265),h*lerp(.47,.30,up),Math.min(w*.38,u(490)),38);art(i,w*(i?.735:.265),h*.60,340,ramp(p,i?.48:.29,i?.67:.48));});
    head(h*.09,36,ramp(p,.7,.79));stats(h*.825,48,ramp(p,.78,.88));
  } else if(k==='overview') {
    const shrink=ramp(p,.10,.29);head(h*lerp(.44,.105,shrink),lerp(76,38,shrink));
    [0,1].forEach(i=>{copy(i,w*(i?.735:.265),h*.60,Math.min(w*.38,u(490)),38,ramp(p,.24,.43));art(i,w*(i?.735:.265),h*.33,340,ramp(p,.48,.67));});stats(h*.825,52,ramp(p,.72,.85));
  } else if(['lift','lines','panorama','explain','rise','text-panorama'].includes(k)) {
    const sideways=k.includes('panorama'),transfer=ramp(p,.43,.55);
    head(h*.095,36,ramp(p,.78,.89));
    [0,1].forEach(i=>{
      const local=clamp((p-i*.5)/.5),open=ramp(local,.12,.39);
      const alpha=sideways?1:(i?ramp(p,.47,.55):1-ramp(p,.43,.49));
      const dx=sideways?w*(i-transfer):0;
      if(k==='lift') {
        art(i,mid,h*lerp(.47,.28,open),lerp(720,430,open),alpha);
        copy(i,mid,h*lerp(.72,.60,open),Math.min(w*.62,u(720)),44,alpha*ramp(local,.33,.53));
      } else if(k==='rise') {
        copy(i,mid,h*lerp(.46,.29,open),Math.min(w*.65,u(750)),46,alpha);
        art(i,mid,h*lerp(1.13,.62,open),470,alpha*ramp(local,.22,.42));
      } else if(k==='explain'||k==='text-panorama') {
        copy(i,w*lerp(.5,.30,open)+dx,h*.50,Math.min(w*.43,u(570)),lerp(58,48,open),alpha);
        art(i,w*lerp(.92,.76,open)+dx,h*.51,560,alpha*ramp(local,.30,.49));
      } else {
        art(i,w*lerp(.50,.28,open)+dx,h*.48,lerp(740,580,open),alpha);
        copy(i,w*.705+dx,h*.51,Math.min(w*.41,u(550)),48,alpha*ramp(local,.22,.36));
        if(k==='lines') {
          s.copy[i].querySelectorAll('h3 i').forEach((e,j)=>e.style.transform=`translateY(${(1-ramp(local,.22+j*.13,.37+j*.13))*108}%)`);
          s.copy[i].querySelector('p').style.opacity=ramp(local,.50,.64);
        }
      }
    });
    stats(h*.825,48,ramp(p,.89,.96));
  } else if(k==='proof-sequence') {
    const enter=ramp(p,.06,.21),end=ramp(p,.67,.83);
    head(h*lerp(lerp(.45,.19,enter),.105,end),lerp(lerp(74,46,enter),38,end));
    stats(h*lerp(.51,.825,end),lerp(138,52,end),i=>ramp(p,.21+i*.065,.36+i*.065));
    duet(ramp(p,.73,.88));
  } else if(k==='proof-chapters') {
    const gather=ramp(p,.62,.73),end=ramp(p,.79,.90);
    head(h*lerp(.16,.105,end),lerp(44,38,end));
    const xs=[.125,.505,.88],ws=[.25,.43,.24];
    s.stat.forEach((el,i)=>{
      const alpha=(i===0?1:ramp(p,i*.21-.025,i*.21+.025))*(i===2?1:1-ramp(p,(i+1)*.21-.025,(i+1)*.21+.025));
      const x=lerp(mid,mid-contentW/2+contentW*xs[i],gather);
      const y=h*lerp(.52,.825,end);
      stat(i,x,y,lerp(u(i===1?990:640),contentW*ws[i],gather),lerp(lerp(230,138,gather),52,end),lerp(alpha,1,gather));
    });duet(ramp(p,.82,.93));
  } else if(k==='proof-anchor'||k==='proof-aside') {
    const shrink=ramp(p,.14,.32),aside=k==='proof-aside';
    head(h*lerp(.22,.105,shrink),lerp(48,36,shrink));
    if(aside){const xs=[.125,.505,.88],ws=[.25,.43,.24];s.stat.forEach((e,i)=>stat(i,lerp(mid-contentW/2+contentW*xs[i],w*.18,shrink),h*lerp(.53,.29+i*.215,shrink),lerp(contentW*ws[i],w*.25,shrink),lerp(138,63,shrink)));}
    else stats(h*lerp(.53,.245,shrink),lerp(138,70,shrink));
    const ai=ramp(p,.63,.72);[0,1].forEach(i=>{
      const a=ramp(p,.33,.45)*(i?ai:1-ai);
      if(aside){art(i,w*.69,h*.36,370,a);copy(i,w*.69,h*.705,Math.min(w*.45,u(575)),38,a);}
      else {art(i,w*.29,h*.66,460,a);copy(i,w*.70,h*.65,Math.min(w*.42,u(555)),42,a);}
    });
  } else if(k==='proof-open') {
    const spread=ramp(p,.12,.32),open=ramp(p,.44,.64);
    head(h*lerp(.17,.09,open),lerp(44,36,open));
    stat(1,mid,h*lerp(.49,.255,open),u(lerp(lerp(920,560,spread),400,open)),lerp(lerp(220,145,spread),76,open));
    [0,2].forEach((i,j)=>stat(i,w*(j?.83:.17),h*lerp(.49,.255,open),u(245),lerp(100,76,open),ramp(p,.15+j*.07,.31+j*.07)));
    [0,1].forEach(i=>{art(i,w*(i?.735:.265),h*.49,300,ramp(p,.57,.73));copy(i,w*(i?.735:.265),h*.74,Math.min(w*.39,u(500)),32,ramp(p,.66,.81),14);});
  }
  // The subject is named from its first visible frame. The label is handed to the copy,
  // so it does not appear twice once the full explanation is readable.
  s.artLabels.forEach((label,i)=>{label.style.opacity=String(1-clamp(+s.copy[i].style.opacity||0));label.style.fontSize=`${Math.max(18,u(24))}px`;});
}

export function setStageInk(s,dark) {
  const t=clamp(dark), mix=(a,b)=>`rgb(${a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')})`;
  s.el.style.setProperty('--pf-ink',mix([8,8,8],[248,248,248]));
  s.el.style.setProperty('--pf-body',mix([65,73,87],[225,229,236]));
  s.el.style.setProperty('--pf-pink',mix([179,49,96],[255,163,195]));
  s.el.style.setProperty('--pf-blue',mix([14,68,151],[157,199,255]));
  s.el.style.setProperty('--pf-line',mix([165,170,176],[133,146,164]));
}
