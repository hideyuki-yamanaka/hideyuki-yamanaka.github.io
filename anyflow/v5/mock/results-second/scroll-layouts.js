import {headline,stat,stats,value,pair,picto} from './ui.js';
import {content} from './catalog.js';

const miniProof=()=>stats('persistent-proof');
const sectionHead=()=>'<div class="new-heading">'+headline()+'</div>';
const cue=label=>'<div class="scroll-cue" aria-hidden="true"><span>'+label+'</span><span>Scroll ↓</span><div class="cue-line"><i></i></div></div>';
const proofPanel=()=>'<div class="proof-panel"><p class="scene-kicker">01 / Proven in numbers</p>'+headline()+'<div class="wide-proof">'+stat('連携実績','20,000')+'<div>'+stat('導入企業','100')+stat('連携アプリ数','200')+'</div></div></div>';
const valuePanel=(kind,n)=>'<div class="benefit-panel"><p class="scene-kicker">0'+n+' / '+content[kind].tag+'</p>'+value(kind)+'</div>';
function horizontal(id){
 const two=id===5;
 const panels=two?[valuePanel('saas',1),valuePanel('ai',2)]:[proofPanel(),valuePanel('saas',2),valuePanel('ai',3)];
 return '<section class="horizontal-track horizontal-'+id+'" id="study-results" data-scroll="horizontal" data-count="'+panels.length+'"><div class="horizontal-sticky">'+
 (id!==1?sectionHead():'')+'<div class="horizontal-window"><div class="horizontal-rail">'+panels.map((html,i)=>'<article class="horizontal-panel" data-panel="'+i+'">'+html+'</article>').join('')+'</div></div>'+
 (two?miniProof():'')+cue(two?'for SaaS — for AI':'実績 — for SaaS — for AI')+'</div></section>';
}
function giantPictos(){
 return '<section class="giant-study" id="study-results"><div class="section-inner giant-intro">'+sectionHead()+stats()+'</div>'+
 ['saas','ai'].map((k,i)=>'<section class="giant-track" data-scroll="giant"><div class="giant-sticky section-inner"><div class="giant-visual"><span class="giant-word">'+content[k].tag+'</span>'+picto(k)+'</div><div class="giant-copy"><p class="scene-kicker">0'+(i+1)+' / '+content[k].tag+'</p><h2>'+content[k].title+'</h2><p>'+content[k].body+'</p></div>'+cue('絵から、意味へ')+'</div></section>').join('')+'</section>';
}
function guidedWords(){
 const word=(text)=>Array.from(text).map((t,i)=>'<span class="read-char" data-char="'+i+'">'+t+'</span>').join('');
 return '<section class="word-study" id="study-results"><div class="word-opening" data-scroll="words"><div class="word-sticky section-inner"><p class="scene-kicker">What we empower</p><h1 class="word-head">'+word('事業の推進力を、')+'<br>'+word('Anyflowが支えます。')+'</h1><p class="word-sub">連携の実績を、あなたの事業の推進力に。</p>'+cue('言葉を、たどる')+'</div></div><div class="section-inner word-proof">'+stats()+'</div>'+
 ['saas','ai'].map((k,i)=>'<article class="word-value section-inner" data-scroll="underline"><div class="word-value-label"><span class="scene-kicker">0'+(i+1)+'</span><span class="tag '+k+'">'+content[k].tag+'</span></div><div class="word-value-body"><h2><span>'+content[k].title+'</span></h2><p>'+content[k].body+'</p></div>'+picto(k)+'</article>').join('')+'</section>';
}
function stack(){
 return '<section class="stack-study" id="study-results"><div class="section-inner stack-intro">'+sectionHead()+'</div><div class="stack-deck">'+
 [proofPanel(),valuePanel('saas',2),valuePanel('ai',3)].map((x,i)=>'<article class="stack-card stack-card-'+i+'" data-stack="'+i+'"><div class="stack-paper section-inner">'+x+'</div></article>').join('')+'</div></section>';
}
function zoomNumber(){
 return '<section class="zoom-number-track" id="study-results" data-scroll="number"><div class="zoom-number-sticky section-inner"><div class="zoom-heading">'+headline()+'</div><div class="zoom-proof">'+stat('連携実績','20,000')+'<div class="zoom-minor">'+stat('導入企業','100')+stat('連携アプリ数','200')+'</div></div><div class="zoom-values">'+pair()+'</div>'+cue('数字の奥に、2つの価値')+'</div></section>';
}
function openingWings(){
 return '<section class="wings-track" id="study-results" data-scroll="wings"><div class="wings-sticky section-inner">'+sectionHead()+'<div class="wings">'+
 ['saas','ai'].map(k=>'<article class="wing wing-'+k+'"><span class="tag '+k+'">'+content[k].tag+'</span>'+picto(k)+'<h2>'+content[k].title+'</h2><p>'+content[k].body+'</p></article>').join('')+
 '</div><div class="wings-proof">'+stats()+'</div>'+cue('2つの価値が、ひらく')+'</div></section>';
}
export const newLayouts={1:()=>horizontal(1),2:()=>horizontal(2),5:()=>horizontal(5),6:giantPictos,7:guidedWords,8:stack,9:zoomNumber,10:openingWings};
