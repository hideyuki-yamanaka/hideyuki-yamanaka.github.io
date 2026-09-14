// 10 new proposal compositions. Values here are study choices, not Figma measurements.
export function renderNewConcept(ctx) {
  const {s,c,p,w,h,u,contentW,mid,put,head,art,copy,stat,stats,duet,lerp,ramp,clamp}=ctx;
  const frame=(i,x,y,width,height,a=1)=>{put(s.frames[i],x,y,width,a);s.frames[i].style.height=`${height}px`;};
  const line=(path,t=1)=>{s.connect.style.opacity='1';s.connect.setAttribute('viewBox',`0 0 ${w} ${h}`);const el=s.connect.querySelector('path');el.setAttribute('d',path);el.style.strokeDasharray='1';el.style.strokeDashoffset=1-clamp(t);};
  const guide=(x,y,height,color='var(--pf-blue)')=>{Object.assign(s.guide.style,{left:`${x}px`,top:`${y}px`,height:`${height}px`,background:color,opacity:'1'});};
  const ring=(x,y,rx,ry,a=1)=>{put(s.orbit,x,y,rx*2,a);s.orbit.style.height=`${ry*2}px`;};
  const face=(i,a=1,dy=0)=>{art(i,w*.27,h*.48+dy,590,a);copy(i,w*.705,h*.50+dy,Math.min(w*.41,u(555)),48,a);};
  const k=c.mode;
  if(k==='connection'){
    const shrink=ramp(p,.12,.30),flow=ramp(p,.30,.46),ai=ramp(p,.65,.73);
    head(h*lerp(.19,.10,shrink),lerp(48,38,shrink));stats(h*lerp(.49,.255,shrink),lerp(138,76,shrink));
    line(`M ${w*.12} ${h*.37} H ${w*.88} M ${w*.28} ${h*.37} V ${h*.61} H ${w*.49}`,flow);
    [0,1].forEach(i=>{const a=flow*(i?ai:1-ai);art(i,w*.28,h*.62,420,a);copy(i,w*.705,h*.625,Math.min(w*.40,u(530)),42,a);});
  } else if(k==='aperture'){
    const open=ramp(p,.12,.45),words=ramp(p,.38,.59);
    head(h*.085,38,ramp(p,.56,.70));
    [0,1].forEach(i=>{
      const x=w*(i?.735:.265);
      frame(i,x,h*.46,w*lerp(.235,.415,open),h*lerp(.39,.64,open));
      art(i,x,h*lerp(.46,.31,open),lerp(450,320,open));
      copy(i,x,h*.60,Math.min(w*.355,u(475)),36,words);
      s.copy[i].style.top=`${h*.435}px`;s.copy[i].style.transform='translateX(-50%)';
      s.copy[i].style.clipPath=`inset(0 ${(1-words)*50}% 0 ${(1-words)*50}%)`;
    });stats(h*.85,48,ramp(p,.70,.85));
  } else if(k==='reading-guide'){
    head(h*.10,38);duet(1,.32,.59,38,335);stats(h*.825,58);
    if(p<.15){guide(w*.13,h*.10-u(30),u(60));}
    else if(p<.48){guide(w*.085,h*.445,h*.30*ramp(p,.15,.33),'var(--pf-pink)');}
    else if(p<.80){guide(w*.555,h*.445,h*.30*ramp(p,.48,.66),'var(--pf-blue)');}
    else {line(`M ${w*.10} ${h*.90} H ${w*.90}`,ramp(p,.80,.96));}
  } else if(k==='depth'){
    const back=ramp(p,.12,.29),ai=ramp(p,.64,.73),finish=ramp(p,.86,.97);
    head(h*.095,42);
    stat(1,mid,h*lerp(.50,.39,back),u(1000),lerp(264,340,back),lerp(1,.10,back));
    const number=s.stat[1].querySelector('.pf-number');number.style.color='transparent';number.style.webkitTextStroke='1px var(--pf-ink)';s.stat[1].style.zIndex='0';
    s.stat[1].querySelector('.pf-label').style.opacity=1-back;
    [0,1].forEach(i=>{const a=ramp(p,.30,.44)*(i?ai:1-ai);face(i,a);});
    if(finish>0){stats(h*.825,56,finish);s.stat[1].querySelector('.pf-label').style.opacity='1';number.style.webkitTextStroke='0';number.style.color='inherit';}
  } else if(k==='film'){
    const travel=ramp(p,.21,.35)+ramp(p,.58,.72);
    head(h*.20-travel*h,52);stats(h*.50-travel*h,142);
    [0,1].forEach(i=>{const dy=(i+1-travel)*h;face(i,1,dy);});
    guide(w*.965,h*.20+h*.25*travel,h*.14);
    line(`M ${w*.965} ${h*.20} V ${h*.84}`,1);
  } else if(k==='diagonal'){
    const open=ramp(p,.12,.32);head(h*lerp(.19,.085,open),lerp(48,38,open));stats(h*lerp(.49,.86,open),lerp(138,52,open));
    art(0,w*.22,h*.30,430,ramp(p,.31,.45));copy(0,w*.66,h*.30,Math.min(w*.43,u(560)),34,ramp(p,.40,.54),15);
    art(1,w*.78,h*.635,420,ramp(p,.53,.67));copy(1,w*.335,h*.635,Math.min(w*.43,u(560)),34,ramp(p,.64,.78),15);
    line(`M ${w*.48} ${h*.44} L ${w*.53} ${h*.50}`,ramp(p,.50,.65));
  } else if(k==='proof-ribbon'){
    head(h*.08,36);
    const travel=ramp(p,.23,.32)+ramp(p,.62,.71);
    s.stat.forEach((e,i)=>stat(i,mid+(i-travel)*w,h*.24,u(i===1?520:350),132));
    line(`M ${w*.09} ${h*.375} H ${w*.91}`,1);
    const ai=ramp(p,.49,.59);
    [0,1].forEach(i=>{const a=i?ai:1-ai;art(i,w*.28,h*.62,500,a);copy(i,w*.70,h*.64,Math.min(w*.41,u(550)),42,a);});
  } else if(k==='orbit'){
    const open=ramp(p,.23,.43),turn=ramp(p,.03,.20),ai=ramp(p,.67,.76);
    head(h*.09,40);
    ring(w*lerp(.5,.265,open),h*lerp(.48,.50,open),w*lerp(.31,.165,open),h*lerp(.28,.30,open),lerp(.75,.55,open));
    const xs=[.125,.505,.88],ws=[.25,.43,.24];
    s.stat.forEach((e,i)=>{
      const a=(-150+i*120+turn*22)*Math.PI/180;
      const x=mid+Math.cos(a)*w*.27,y=h*.48+Math.sin(a)*h*.26;
      stat(i,lerp(x,mid-contentW/2+contentW*xs[i],open),lerp(y,h*.86,open),lerp(u(i===1?450:270),contentW*ws[i],open),lerp(105,52,open));
    });
    [0,1].forEach(i=>{const a=ramp(p,.40,.54)*(i?ai:1-ai);art(i,w*.265,h*.50,470,a);copy(i,w*.70,h*.50,Math.min(w*.41,u(550)),46,a);});
  } else if(k==='partition'){
    const middle=ramp(p,.39,.46)*(1-ramp(p,.57,.64));
    const phase=p<.5?0:1,local=phase===0?clamp(p/.40):clamp((p-.61)/.39),open=ramp(local,.12,.50);
    const a=phase===0?1-ramp(p,.37,.44):ramp(p,.59,.66);
    const edge=w*(phase===0?lerp(.79,.44,open):lerp(.21,.56,open));
    Object.assign(s.plane.style,{left:phase===0?'0':`${edge}px`,top:'0',width:`${phase===0?edge:w-edge}px`,height:'100%',opacity:String(.65*a)});
    guide(edge,h*.12,h*.72,phase===0?'var(--pf-pink)':'var(--pf-blue)');s.guide.style.opacity=a;
    const xArt=w*(phase===0?lerp(.40,.235,open):lerp(.60,.765,open));
    art(phase,xArt,h*.48,lerp(810,580,open),a);
    copy(phase,w*(phase===0?.715:.285),h*.49,Math.min(w*.40,u(530)),50,a*ramp(local,.30,.55));
    s.copy[phase].style.clipPath=`inset(0 ${phase?0:(1-open)*100}% 0 ${phase?(1-open)*100:0}%)`;
    head(h*.15,48,middle);stats(h*.49,142,middle);
  } else if(k==='editorial'){
    head(h*.22,46,1,w*.265,w*.35);s.head.style.textAlign='left';
    s.stat.forEach((e,i)=>stat(i,w*.235,h*(.47+i*.17),w*.29,74,ramp(p,.03+i*.045,.13+i*.045)));
    line(`M ${w*.47} ${h*.12} V ${h*.88}`,1);
    const ai=ramp(p,.50,.60);
    [0,1].forEach(i=>{const a=ramp(p,.15,.28)*(i?ai:1-ai);art(i,w*.74,h*.32,400,a);copy(i,w*.73,h*.65,Math.min(w*.40,u(525)),40,a);});
  }
}
