import {concepts,content} from './catalog.js';
import {mountPictograms} from './pictograms.js';

// 比較用の提案値: 新しい配置・サイズ・演出は本番の確定仕様ではない。
// 元サイトの localStorage / SHIPPED 設定は参照しない。案はURLのみで選ぶ。
const id=Number(document.body.dataset.variant)||1;
const concept=concepts.find(c=>c.id===id);
const query=new URLSearchParams(location.search);
const preview=query.has('preview');
const media=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=media.matches;
let context=query.get('context')==='1';
let cleanupIcons=()=>{};
const assets='/mock/results-initial/assets/';
const picto=(kind,extra='')=>`<div class="picto ${extra}" data-picto="${kind}" role="img" aria-label="${kind==='saas'?'複数のデータが重なり、同期する動き':'データを取得し、業務の実行へつなぐ動き'}"></div>`;
const headline=(cls='')=>`<h1 class="headline ${cls}"><span>事業の推進力を、</span><span><em>Anyflow</em>が支えます。</span></h1>`;
const stat=(label,n,cls='')=>`<div class="stat ${cls}"><span class="stat-label">${label}</span><div class="stat-value"><span>${n}</span><small>+</small></div></div>`;
const stats=(cls='')=>`<div class="stats ${cls}">${stat('導入企業','100')}${stat('連携実績','20,000')}${stat('連携アプリ数','200')}</div>`;
const value=(kind,cls='',visual=true)=>`<article class="value ${kind} ${cls}">${visual?picto(kind):''}<div class="value-copy"><span class="tag ${kind}">${content[kind].tag}</span><h2>${content[kind].title}</h2><p>${content[kind].body}</p></div></article>`;
const pair=(cls='')=>`<div class="value-pair ${cls}">${value('saas')}${value('ai')}</div>`;
const eyebrow=()=>'<p class="eyebrow">What we empower</p>';
const intro=()=>`<section class="context-before" id="vision-context"><div class="section-inner"><p class="eyebrow">Our Vision</p><h2>データをつなぐことが、<br>強みになる時代へ。</h2><div class="context-points"><div><span class="tag">Point 01</span><h3>賢いAIの土台をつくる</h3><p>AIは、つながったデータの分だけ賢くなる。<br>連携が、AIの燃料になる。</p></div><div><span class="tag">Point 02</span><h3>業務実行の手足となる</h3><p>賢いAIは現実の業務を実行できる。<br>数百以上のアクションツールをAIに。</p></div></div><a class="context-next" href="#study-results">実績へ進む <span aria-hidden="true">↓</span></a></div></section>`;
const outro=()=>`<section class="context-after dark-surface"><div class="section-inner"><p class="eyebrow">Strength 01</p><h2>自動生成で<br>開発スピードを加速</h2><img src="${assets}dev-mock.png" alt="Anyflowの開発環境" loading="lazy"></div></section>`;
const stepPanel=(kind)=>`<article class="step-panel ${kind}" data-step-panel="${kind}"><span class="tag ${kind}">${content[kind].tag}</span><div class="step-visual">${picto(kind)}</div><h2>${content[kind].title}</h2><div class="step-buttons" role="group" aria-label="${content[kind].tag}の流れ">${(kind==='saas'?['外部データ','同期','自社データ']:['コンテキスト取得','AIへ接続','業務を実行']).map((s,i)=>`<button type="button" data-step="${i}" aria-pressed="${i===0}"><small>0${i+1}</small>${s}</button>`).join('')}</div><p class="step-description" aria-live="polite">${kind==='saas'?'外部サービスのデータを取り込む。':'業務に必要なコンテキストを取得する。'}</p><p class="body-copy">${content[kind].body}</p></article>`;
const layouts={
 1:()=>`<section class="section-inner standard v1" id="study-results">${eyebrow()}${headline('reveal')}<div class="reveal delay-1">${stats()}</div><div class="rule reveal delay-2"></div><div class="reveal delay-3">${pair()}</div></section>`,
 2:()=>`<section class="section-inner standard v2" id="study-results"><div class="split-head"><div class="reveal">${eyebrow()}${headline()}</div><div class="reveal delay-1">${stats()}</div></div><div class="rule reveal delay-2"></div><div class="reveal delay-3">${pair()}</div></section>`,
 3:()=>`<section class="section-inner standard v3" id="study-results">${headline('reveal')}<div class="number-composition reveal delay-1"><div class="major-number">${stat('連携実績','20,000')}<span class="number-caption">事業をつなぐ、連携の積み重ね。</span></div><div class="minor-numbers">${stat('導入企業','100')}${stat('連携アプリ数','200')}</div></div><div class="rule"></div><div class="reveal delay-2">${pair()}</div></section>`,
 4:()=>`<section class="section-inner standard v4" id="study-results">${headline('reveal')}<div class="reveal delay-1">${pair('picto-led')}</div><div class="proof-strip reveal delay-2">${stats()}</div></section>`,
 5:()=>`<section class="section-inner standard v5" id="study-results">${headline('reveal')}<div class="step-grid reveal delay-1">${stepPanel('saas')}${stepPanel('ai')}</div><div class="proof-strip">${stats()}</div></section>`,
 6:()=>`<section class="chapter-track" id="study-results"><div class="chapter-sticky section-inner"><aside class="chapter-aside">${eyebrow()}${headline()}<nav class="chapter-nav" aria-label="実績セクションの章"><button data-chapter="0" aria-current="step"><span>01</span>実績</button><button data-chapter="1"><span>02</span>for SaaS</button><button data-chapter="2"><span>03</span>for AI</button></nav><div class="reading-progress" aria-hidden="true"><i></i></div><p class="quiet-hint">スクロールして読み進める</p></aside><div class="chapter-content"><article class="chapter-pane active" data-pane="0"><span class="chapter-kicker">01 / Proven in numbers</span>${stats()}<p class="chapter-summary">連携の実績を、<br>あなたの事業の推進力に。</p></article><article class="chapter-pane" data-pane="1" aria-hidden="true"><span class="chapter-kicker">02 / for SaaS</span>${value('saas')}</article><article class="chapter-pane" data-pane="2" aria-hidden="true"><span class="chapter-kicker">03 / for AI</span>${value('ai')}</article></div></div></section>`,
 7:()=>`<section class="section-inner v7" id="study-results"><aside class="reading-aside">${eyebrow()}${headline()}${stats('compact')}<p class="quiet-hint">2つの価値を、順に。</p></aside><div class="reading-values"><div class="reading-value"><span class="reading-index">01</span>${value('saas','reveal')}</div><div class="reading-value"><span class="reading-index">02</span>${value('ai','reveal')}</div></div></section>`,
 8:()=>`<section class="section-inner standard v8" id="study-results">${headline('reveal')}<div class="interest-tabs" role="tablist" aria-label="関心のある価値"><button role="tab" id="tab-saas" aria-controls="panel-saas" aria-selected="true" data-interest="saas"><span class="tag saas">for SaaS</span><span>リアルタイムにデータ同期</span><i aria-hidden="true">↗</i></button><button role="tab" id="tab-ai" aria-controls="panel-ai" aria-selected="false" tabindex="-1" data-interest="ai"><span class="tag ai">for AI</span><span>コンテキスト取得から実行まで</span><i aria-hidden="true">↗</i></button></div><div class="interest-panels">${['saas','ai'].map(k=>`<div class="interest-panel ${k}" id="panel-${k}" role="tabpanel" aria-labelledby="tab-${k}" ${k==='ai'?'hidden':''}>${value(k)}<div class="interest-footnote">${k==='saas'?'自社データ × 外部データ':'コンテキスト取得 → 業務実行'}</div></div>`).join('')}</div><div class="proof-strip">${stats()}</div></section>`,
 9:()=>`<section class="vision-bridge" id="study-results"><div class="section-inner bridge-opening"><p class="eyebrow">Our Vision</p><h2 class="bridge-title"><span>データをつなぐことが、</span><span class="bridge-emphasis">強みになる時代へ。</span></h2><div class="bridge-points"><div><span>Point 01</span><p>賢いAIの土台をつくる</p></div><div><span>Point 02</span><p>業務実行の手足となる</p></div></div><a class="context-next" href="#bridge-proof">その強みを、実績から。 <span aria-hidden="true">↓</span></a></div><div class="bridge-proof dark-surface" id="bridge-proof"><div class="section-inner"><p class="eyebrow reveal">From vision to value</p>${headline('reveal')}${stats('reveal')}<div class="rule"></div>${pair('reveal')}</div></div></section>`,
 10:()=>`<section class="section-inner standard v10" id="study-results"><div class="carousel-heading">${headline()}<div class="carousel-controls"><span class="slide-status" aria-live="polite">01 / 03</span><button type="button" data-slide-dir="-1" aria-label="前のスライド" disabled>←</button><button type="button" data-slide-dir="1" aria-label="次のスライド">→</button></div></div><div class="value-carousel" tabindex="0" role="region" aria-roledescription="カルーセル" aria-label="実績と2つの価値"><article class="carousel-slide proof-slide" aria-label="1 / 3 実績"><span class="chapter-kicker">01 / Proven in numbers</span>${stats()}<div class="slide-teasers"><span><b class="tag saas">for SaaS</b> リアルタイムにデータ同期</span><span><b class="tag ai">for AI</b> コンテキスト取得から実行まで</span></div><p class="quiet-hint">次のスライドで、2つの価値を詳しく。</p></article><article class="carousel-slide" aria-label="2 / 3 for SaaS"><span class="chapter-kicker">02 / for SaaS</span>${value('saas')}</article><article class="carousel-slide" aria-label="3 / 3 for AI"><span class="chapter-kicker">03 / for AI</span>${value('ai')}</article></div><div class="carousel-bottom"><p>スワイプ、または矢印で読み進める</p><nav class="slide-dots" aria-label="スライドを選ぶ">${['実績','for SaaS','for AI'].map((s,i)=>`<button data-slide-to="${i}" aria-label="${s}を表示" aria-current="${i===0?'true':'false'}"><span>0${i+1}</span>${s}</button>`).join('')}</nav></div></section>`
};

function toolbar(){return `<header class="study-bar"><a class="all-link" href="/mock/results-initial/">← <span>10案の一覧</span></a><div class="study-identity"><span class="variant-no">No.${String(id).padStart(2,'0')}</span><strong>${concept.name}</strong></div><nav class="study-controls" aria-label="比較用コントロール"><button type="button" id="context-toggle" aria-pressed="${context}">前後の流れ</button><button type="button" id="motion-toggle" aria-pressed="${reduced}">${reduced?'動き：オフ':'動き：オン'}</button><button type="button" id="replay">再生</button><a href="/mock/results-initial/${String(id===1?10:id-1).padStart(2,'0')}/${context?'?context=1':''}" aria-label="前の案">←</a><a href="/mock/results-initial/${String(id===10?1:id+1).padStart(2,'0')}/${context?'?context=1':''}" aria-label="次の案">→</a></nav></header><details class="study-note"><summary><span>${concept.group} / ${concept.focus}</span><span>案の狙いと操作方法</span></summary><div><p>${concept.desc}</p><p><b>操作：</b>${concept.action}</p><p class="note-small">サイズ・配置・演出は比較用の提案。実績数値と説明本文はV4を継承。「前後の流れ」は接続確認用の抜粋です。</p></div></details>`;}

function init(){
 cleanupIcons();
 document.body.className=`study-page variant-${id} ${preview?'is-preview':''} ${reduced?'reduced-motion':''} ${context?'with-context':''}`;
 document.title=`初回復元 No.${String(id).padStart(2,'0')} ${concept.name} | Anyflow 実績セクション`;
 document.body.innerHTML=`${preview?'':toolbar()}<main>${id!==9?intro():''}${layouts[id]()}${outro()}</main>${preview?'':`<footer class="study-footer"><span>Anyflow Embed / 初回10案・復元版（2026/09/13）</span><a href="/mock/results-initial/">10案を比較する →</a></footer>`}`;
 initReveal();
 cleanupIcons=mountPictograms({staticMode:preview,reduced});
 if(preview)return;
 document.querySelector('#context-toggle').onclick=()=>{context=!context;query.set('context',context?'1':'0');history.replaceState(null,'',location.pathname+'?'+query);init();window.scrollTo({top:0,behavior:'instant'});};
 document.querySelector('#motion-toggle').onclick=()=>{reduced=!reduced;init();};
 document.querySelector('#replay').onclick=()=>{init();document.querySelector('#study-results').scrollIntoView({behavior:'instant',block:'start'});};
 initSteps();initChapters();initTabs();initCarousel();
}

let revealObserver;
function initReveal(){
 revealObserver?.disconnect();
 if(preview||reduced){document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-visible'));return;}
 revealObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');revealObserver.unobserve(e.target);}});},{threshold:0.12});
 document.querySelectorAll('.reveal').forEach(e=>revealObserver.observe(e));
}

function initSteps(){
 const messages={saas:['外部サービスのデータを取り込む。','自社データと外部データを自動で同期する。','連携したデータを、自社SaaSの強みへ。'],ai:['業務に必要なコンテキストを取得する。','1つのツールから、AIがデータを利用する。','アクションツールで、業務を実行する。']};
 document.querySelectorAll('[data-step-panel]').forEach(panel=>{panel.querySelectorAll('[data-step]').forEach(button=>{button.onclick=()=>{const step=Number(button.dataset.step);panel.dataset.currentStep=step;panel.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));panel.querySelector('.step-description').textContent=messages[panel.dataset.stepPanel][step];const host=panel.querySelector('.picto');host.dataset.pictoMode=panel.dataset.stepPanel==='saas'?['S18','S2','S18'][step]:['A21','A1','A21'][step];cleanupIcons();cleanupIcons=mountPictograms({reduced});};});});
}

let chapterListener,chapterResize;
function initChapters(){
 if(chapterListener)window.removeEventListener('scroll',chapterListener);
 if(chapterResize)window.removeEventListener('resize',chapterResize);
 const track=document.querySelector('.chapter-track');if(!track)return;
 const sticky=track.querySelector('.chapter-sticky');let active=-1;
 const maxTravel=()=>Math.max(1,track.offsetHeight-sticky.offsetHeight);
 const barHeight=()=>document.querySelector('.study-bar').getBoundingClientRect().height;
 const update=()=>{const p=Math.max(0,Math.min(1,(window.scrollY-track.offsetTop+barHeight())/maxTravel()));const n=Math.min(2,Math.floor(p*3));track.style.setProperty('--reading-progress',p);if(n===active)return;active=n;track.dataset.active=n;track.querySelectorAll('[data-pane]').forEach(el=>{const on=Number(el.dataset.pane)===n;el.classList.toggle('active',on);el.setAttribute('aria-hidden',String(!on));});track.querySelectorAll('[data-chapter]').forEach(b=>{if(Number(b.dataset.chapter)===n)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});};
 chapterListener=()=>requestAnimationFrame(update);chapterResize=update;
 window.addEventListener('scroll',chapterListener,{passive:true});window.addEventListener('resize',chapterResize);
 track.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>window.scrollTo({top:track.offsetTop-barHeight()+maxTravel()*(Number(b.dataset.chapter)/3+0.08),behavior:reduced?'instant':'smooth'}));update();
}

function initTabs(){
 const tabs=[...document.querySelectorAll('[data-interest]')];
 const activate=tab=>{tabs.forEach(b=>{const selected=b===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;document.querySelector('#panel-'+b.dataset.interest).hidden=!selected;});cleanupIcons();cleanupIcons=mountPictograms({reduced});};
 tabs.forEach((t,i)=>{t.onclick=()=>activate(t);t.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;activate(tabs[next]);tabs[next].focus();};});
}

function initCarousel(){
 const rail=document.querySelector('.value-carousel');if(!rail)return;let active=0;
 const go=n=>{const i=Math.max(0,Math.min(2,n));rail.scrollTo({left:rail.clientWidth*i,behavior:reduced?'instant':'smooth'});};
 document.querySelectorAll('[data-slide-dir]').forEach(b=>b.onclick=()=>go(active+Number(b.dataset.slideDir)));
 document.querySelectorAll('[data-slide-to]').forEach(b=>b.onclick=()=>go(Number(b.dataset.slideTo)));
 rail.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(active+(e.key==='ArrowRight'?1:-1));}};
 rail.addEventListener('scroll',()=>{active=Math.max(0,Math.min(2,Math.round(rail.scrollLeft/rail.clientWidth)));document.querySelector('.slide-status').textContent=`0${active+1} / 03`;document.querySelector('[data-slide-dir="-1"]').disabled=active===0;document.querySelector('[data-slide-dir="1"]').disabled=active===2;document.querySelectorAll('[data-slide-to]').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.slideTo)===active)));},{passive:true});
}
media.addEventListener('change',e=>{reduced=e.matches;init();});
init();
