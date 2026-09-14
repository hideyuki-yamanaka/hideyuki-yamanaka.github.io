import {concepts} from './catalog.js';
import {mountPictograms} from './pictograms.js';
import {retained} from './retained.js';
import {newLayouts} from './scroll-layouts.js';
import {vision,developer} from './full-context.js';
import {mountMotion} from './scroll-motion.js';
const id=Number(document.body.dataset.variant)||1;
const concept=concepts.find(c=>c.id===id);
const preview=new URLSearchParams(location.search).has('preview');
const media=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=media.matches;
let stopMotion=()=>{},stopPictos=()=>{},observer;
function toolbar(){
 return '<header class="study-bar"><a class="all-link" href="/mock/results-second/">← <span>復元10案の一覧</span></a><div class="study-identity"><span class="variant-no">No.'+String(id).padStart(2,'0')+'</span><strong>'+concept.name+'</strong></div><nav class="study-controls" aria-label="比較用コントロール"><a href="#vision">最初から</a><a href="#study-results">実績へ</a><button id="motion-toggle" aria-pressed="'+reduced+'">'+(reduced?'動き：オフ':'動き：オン')+'</button><a href="/mock/results-second/'+String(id===1?10:id-1).padStart(2,'0')+'/" aria-label="前の案">←</a><a href="/mock/results-second/'+String(id===10?1:id+1).padStart(2,'0')+'/" aria-label="次の案">→</a></nav></header>'+
 '<details class="study-note"><summary><span>'+concept.group+' / '+concept.focus+'</span><span>案の狙いと見どころ</span></summary><div><p>'+concept.desc+'</p><p><b>見どころ：</b>'+concept.action+'</p><p class="note-small">全案共通：Our Visionの図と2つの価値 → 実績 → 開発者体験のStrength 01・02（API／CLI／SDK）。サイズ・配置・スクロール距離は比較用の提案値です。</p></div></details>';
}
function init(){
 stopMotion();stopPictos();observer?.disconnect();
 document.body.className='study-page full-flow variant-'+id+(preview?' is-preview':'')+(reduced?' reduced-motion':'');
 document.title='No.'+String(id).padStart(2,'0')+' '+concept.name+' | Anyflow 2回目の復元';
 document.body.innerHTML=(preview?'':toolbar())+'<main>'+(preview?'':vision())+(retained[id]||newLayouts[id])()+(preview?'':developer(id))+'</main>'+
 (preview?'':'<footer class="study-footer"><span>Anyflow Embed / 2026/09/13 22:50版・復元サンプル</span><a href="/mock/results-second/">復元10案の一覧へ →</a></footer>');
 observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.08});
 document.querySelectorAll('.reveal').forEach(el=>preview||reduced?el.classList.add('is-visible'):observer.observe(el));
 stopMotion=mountMotion({preview,reduced,id});
 stopPictos=mountPictograms({staticMode:preview,reduced});
 if(preview)return;
 document.querySelector('#motion-toggle').onclick=()=>{const y=scrollY;reduced=!reduced;init();window.scrollTo({top:Math.min(y,document.body.scrollHeight-innerHeight),behavior:'instant'});};
 // URL hashes are supported for review navigation, never required to consume content.
 if(location.hash){requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'instant'}));}
}
media.addEventListener('change',e=>{reduced=e.matches;init();});
init();
