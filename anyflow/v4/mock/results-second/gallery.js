import {concepts} from './catalog.js';
const grid=document.querySelector('.archive-grid'),empty=document.querySelector('.archive-empty'),status=document.querySelector('.archive-status');
// Isolated from the current comparison's choices, even where proposal numbers overlap.
const storageKey='anyflow-second-results-selection-v1';
const number=id=>String(id).padStart(2,'0');
let saved={bookmarks:[],removed:[]},view='all';
try{const value=JSON.parse(localStorage.getItem(storageKey));if(value&&Array.isArray(value.bookmarks)&&Array.isArray(value.removed))saved=value;}catch{}
const bookmarks=new Set(saved.bookmarks),removed=new Set(saved.removed),cards=new Map();
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({bookmarks:[...bookmarks],removed:[...removed]}));}catch{status.textContent='このブラウザーでは保存できません。表示中だけ変更を保持します。';}}
function refresh(){
 let count=0;
 for(const [id,card] of cards){
  const chosen=bookmarks.has(id),deleted=removed.has(id);
  card.hidden=deleted||view==='bookmarks'&&!chosen;if(!card.hidden)count++;
  const star=card.querySelector('.archive-bookmark');star.textContent=chosen?'★':'☆';star.setAttribute('aria-pressed',String(chosen));star.setAttribute('aria-label',`No.${id}のブックマークを${chosen?'解除':'登録'}`);
  const trash=card.querySelector('.archive-remove');trash.textContent='×';trash.setAttribute('aria-label',`No.${id}を削除`);
 }
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 document.querySelector('[data-view="bookmarks"]').textContent=`★ ブックマーク ${concepts.filter(c=>bookmarks.has(number(c.id))&&!removed.has(number(c.id))).length}`;
 grid.style.setProperty('--columns',Math.min(5,Math.max(3,count)));grid.setAttribute('aria-label',`2回目の案・表示中${count}案`);
 empty.hidden=!!count;empty.textContent=view==='bookmarks'?'☆から気になる案を残せます。':'表示する案はありません。';
}
const resize=new ResizeObserver(entries=>entries.forEach(({target,contentRect})=>target.style.setProperty('--preview-scale',contentRect.width/1280)));
for(const c of concepts){
 if(removed.has(number(c.id)))continue;
 const id=number(c.id),card=document.createElement('article');card.className='archive-card';card.dataset.id=id;
 card.innerHTML=`<header><h2>No.${id}</h2><h3>${c.name}</h3></header><a href="./${id}/" class="archive-preview" aria-label="2回目No.${id} ${c.name}を開く" title="${c.desc}"><iframe src="./${id}/?preview=1" title="No.${id}の実装プレビュー" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></a><div class="archive-actions"><button class="archive-bookmark" type="button">☆</button><button class="archive-remove" type="button">×</button></div>`;
 grid.append(card);cards.set(id,card);resize.observe(card.querySelector('.archive-preview'));
 card.querySelector('.archive-bookmark').onclick=()=>{bookmarks.has(id)?bookmarks.delete(id):bookmarks.add(id);persist();refresh();};
 card.querySelector('.archive-remove').onclick=()=>{removed.add(id);bookmarks.delete(id);persist();card.remove();cards.delete(id);refresh();status.textContent=`No.${id}を削除しました。`;};
}
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;refresh();});
refresh();
