import {concepts} from './catalog.js';
import {conceptHistory} from './history.js';
const root=document.getElementById('concepts');
const columns=Math.min(5,Math.max(3,concepts.length));
root.style.setProperty('--comparison-columns',columns);
root.dataset.columns=String(columns);
root.setAttribute('aria-label',`比較する${concepts.length}案`);
const cards=new Map();
const storageKey='anyflow-reveal-selection-v1';
let saved={bookmarks:[],removed:[]};
try{const value=JSON.parse(localStorage.getItem(storageKey)||'null');if(value&&Array.isArray(value.bookmarks)&&Array.isArray(value.removed))saved=value;}catch{}
const bookmarks=new Set(saved.bookmarks),removed=new Set(saved.removed);let view='all';
const toolbar=document.createElement('div');toolbar.className='comparison-tools';toolbar.setAttribute('aria-label','案の絞り込み');
toolbar.innerHTML='<button type="button" data-view="all">すべて</button><button type="button" data-view="bookmarks">★ ブックマーク</button><button type="button" data-view="removed">削除済み</button>';
document.querySelector('.comparison-intro').append(toolbar);
const empty=document.createElement('p');empty.className='comparison-empty';empty.hidden=true;root.after(empty);
const announcement=document.createElement('span');announcement.className='sr-only';announcement.setAttribute('role','status');root.after(announcement);
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({bookmarks:[...bookmarks],removed:[...removed]}));}catch{announcement.textContent='ブラウザーに保存できません。この画面の表示中だけ変更を保持します。';}}
function refresh(){
 let count=0;
 for(const [id,card] of cards){
  const label=concepts.find(c=>c.id===id).label;
  const selected=bookmarks.has(id),deleted=removed.has(id);
  card.hidden=view==='removed'?!deleted:deleted||view==='bookmarks'&&!selected;
  if(!card.hidden)count++;
  const star=card.querySelector('.bookmark-choice');star.textContent=selected?'★':'☆';star.setAttribute('aria-pressed',String(selected));star.setAttribute('aria-label',`${label}のブックマークを${selected?'解除':'登録'}`);
  const trash=card.querySelector('.remove-choice');trash.textContent=deleted?'↶':'×';trash.setAttribute('aria-label',`${label}を${deleted?'復元':'削除'}`);
 }
 toolbar.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
 toolbar.querySelector('[data-view="bookmarks"]').textContent=`★ ブックマーク ${concepts.filter(c=>bookmarks.has(c.id)&&!removed.has(c.id)).length}`;
 toolbar.querySelector('[data-view="removed"]').textContent=`削除済み ${concepts.filter(c=>removed.has(c.id)).length}`;
 const cols=Math.min(5,Math.max(3,count));root.style.setProperty('--comparison-columns',cols);root.dataset.columns=String(cols);
 root.setAttribute('aria-label',`表示中の${count}案`);
 empty.hidden=!!count;empty.textContent=view==='bookmarks'?'カードの☆からブックマークできます。':view==='removed'?'削除した案はありません。':'表示する案はありません。「削除済み」から復元できます。';
}
toolbar.addEventListener('click',event=>{const button=event.target.closest('button');if(button){view=button.dataset.view;refresh();}});
for(const c of concepts){
 const record=conceptHistory(c),card=document.createElement('article');card.className='comparison-card';card.id=`concept-${c.id}`;
 const sceneURL=`./demo.html?concept=${c.id}&at=${c.entry??c.preview}#results`;
 card.innerHTML=`<div class="choice-heading"><div class="choice-number"><h2>${c.label}</h2><span>${record.version}</span></div><h3>${c.name}</h3></div><a class="scene-link" href="${sceneURL}" aria-label="${c.label} ${c.name}を${c.entry===0?'最初':'この場面'}から見る"><div class="preview-window" aria-hidden="true"><span class="preview-loading">実装画面を読み込み中</span></div></a><div class="choice-actions"><button type="button" class="bookmark-choice" title="ブックマーク">☆</button><button type="button" class="remove-choice" title="削除・復元">×</button></div>`;
 root.append(card);cards.set(c.id,card);
 card.querySelector('.bookmark-choice').addEventListener('click',()=>{if(bookmarks.has(c.id))bookmarks.delete(c.id);else bookmarks.add(c.id);persist();refresh();});
 card.querySelector('.remove-choice').addEventListener('click',()=>{const restore=removed.has(c.id);if(restore)removed.delete(c.id);else removed.add(c.id);persist();refresh();announcement.textContent=`${c.label}を${restore?'復元しました。':'削除しました。「削除済み」から復元できます。'}`;});
 const ro=new ResizeObserver(()=>fitPreview(card));ro.observe(card);
}
refresh();
function fitPreview(card){
 const mini=card.querySelector('.preview-window'),el=mini.firstElementChild;if(!el?.classList.contains('pf-stage'))return;
 const scale=mini.clientWidth/1280;el.style.transform=`scale(${scale})`;
 // Retain vector strokes at source width; the outer preview scales the whole page.
 // Applying a second stroke-width scale would make these fine lines disappear.
}
const notice=document.getElementById('removed-notice');
notice.hidden=!new URLSearchParams(location.search).has('removed');
notice.textContent=`この案は削除されました。現在の${concepts.length}案からお選びください。`;
// A single short-lived instance of the real implementation supplies all thumbnails.
// No approximate SVG asset, duplicate animation implementation, or perpetual iframe loop.
const renderer=document.createElement('iframe');renderer.className='thumbnail-renderer';renderer.title='サムネイル生成用';renderer.tabIndex=-1;renderer.setAttribute('aria-hidden','true');
const receive=event=>{
 if(event.origin!==location.origin||event.source!==renderer.contentWindow||event.data?.type!=='reveal-thumbnails')return;
 const snapshots=event.data.snapshots;
 if(!Array.isArray(snapshots)||snapshots.length!==concepts.length)return;
 for(const snapshot of snapshots){
  const card=cards.get(snapshot.id);if(!card||typeof snapshot.html!=='string')return;
  const mini=card.querySelector('.preview-window');mini.innerHTML=snapshot.html;
  fitPreview(card);
  mini.dataset.source='live-implementation';mini.dataset.progress=snapshot.progress;
 }
 window.removeEventListener('message',receive);renderer.remove();
};
window.addEventListener('message',receive);
renderer.src=`./demo.html?concept=${concepts[0].id}&thumbnail=1#results`;document.body.append(renderer);
