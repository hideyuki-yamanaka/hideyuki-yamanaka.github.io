import {platformSvg,DM_CODE} from './source-context.js';

// All copy and vector geometry below come from frozen V4.
// Proposal: normal vertical Vision layout; complete developer copy without hover switching.
export function vision(){
 return '<section class="flow-vision" id="vision"><div class="section-inner">'+
  '<p class="eyebrow">Our Vision</p><h2 class="vision-heading">データをつなぐことが、<br class="mobile-break">強みになる時代へ。</h2>'+
  '<div class="platform-scene"><div class="platform-orbit">'+platformSvg+
  '<div class="platform-center"><span>Platform</span><small>プラットフォーム</small></div>'+
  platformLabels()+'</div></div>'+
  '<div class="vision-points"><article class="reveal"><span class="point-tag"><i></i>Point <em>01</em></span><h3>賢いAIの土台をつくる</h3><p>AIは、つながったデータの分だけ賢くなる。連携が、AIの燃料になる。</p></article>'+
  '<article class="reveal"><span class="point-tag"><i></i>Point <em>02</em></span><h3>業務実行の手足となる</h3><p>賢いAIは現実の業務を実行できる。数百以上のアクションツールをAIに。</p></article></div>'+
  '</div></section>';
}
function platformLabels(){
 const ell=[{cx:363.464,cy:333.499,rx:473.816,ry:158.868,rot:-23.3266},{cx:363.463,cy:333.522,rx:473.816,ry:158.868,rot:-5.36549}];
 const dots=[{ell:0,deg:263.7,color:'#0E4497',text:'コネクタ'},{ell:0,deg:117.8,color:'#0EBBFF',text:'SDK/CLI'},{ell:0,deg:69.8,color:'#000',text:'実行エンジン'},{ell:0,deg:44.5,color:'#FF5D97',text:'ワークフロー'},{ell:0,deg:-30.6,color:'#0EBBFF',text:'認証ウィザード'},{ell:1,deg:205.4,color:'#FF5D97',text:''}];
 return dots.map((d,i)=>{const e=ell[d.ell],a=d.deg*Math.PI/180,r=e.rot*Math.PI/180;
  const x=e.cx+e.rx*Math.cos(a)*Math.cos(r)-e.ry*Math.sin(a)*Math.sin(r);
  const y=e.cy+e.rx*Math.cos(a)*Math.sin(r)+e.ry*Math.sin(a)*Math.cos(r);
  return '<div class="platform-node node-'+i+'" style="left:'+((x+140)/1040*100)+'%;top:'+(y/667*100)+'%;--node:'+d.color+'"><i></i><span>'+d.text+'</span></div>';
 }).join('');
}
const escapeHtml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function code(key){return '<div class="flow-code" aria-label="'+key+'のコード例">'+DM_CODE[key].map((line,i)=>'<div class="code-line"><span class="line-no" aria-hidden="true">'+(i+1)+'</span><span>'+ (line.map(([cls,t])=>'<span class="'+cls+'">'+escapeHtml(t)+'</span>').join('')||'&nbsp;')+'</span></div>').join('')+'</div>';}
function editor(key,chat=false){return '<div class="flow-editor '+(chat?'with-chat':'')+'"><div class="editor-work"><div class="editor-top"><img src="/mock/results-second/assets/mock/logo.svg" alt=""><span>'+(key==='cli'?'anyflow — zsh':key==='api'?'request.http':'workflow.ts')+'</span><span class="editor-status">Anyflow Embed</span></div>'+code(key)+'</div>'+
 (chat?'<aside class="editor-chat"><div class="chat-head"><img src="/mock/results-second/assets/mock/sparkles.svg" alt="">AI Assistant</div><p class="chat-user">kintone にユーザデータを連携したい</p><div class="chat-answer"><img src="/mock/results-second/assets/mock/bot.svg" alt=""><p>Webhook のユーザデータを kintone のレコードに変換して登録するワークフローを作成します。</p></div><div class="chat-placeholder">Ask anything…<img src="/mock/results-second/assets/mock/arrow-up.svg" alt=""></div></aside>':'')+'</div>';}
export function developer(id){
 const items=[
  ['api','API','REST で直接叩けます。フローIDを指定して実行すれば、結果がそのまま返る。既存の仕組みへ最短で組み込めます。'],
  ['cli','CLI','ワークフローのソースコードを手元のローカルに落としてきて、AI コーディングエージェントやCI/CDと連携できます。'],
  ['sdk','SDK','連携画面ごと、自社プロダクトに埋め込めます。数行置くだけで、ユーザーが自分でSaaSをつなげるようになります。']
 ];
 return '<section class="dark-entry entry-'+id+'" data-scroll="handoff"><div class="entry-sticky"><div class="entry-dark"></div><div class="entry-heading"><p>Strength 01</p><h2>自動生成で<br class="mobile-break">開発スピードを加速</h2></div></div></section>'+
 '<section class="flow-developer dark-surface" id="developer"><div class="section-inner"><div class="dev-first reveal">'+editor('editor',true)+'</div>'+
 '<div class="dev-second"><header class="dev-section-heading reveal"><p>Strength 02</p><h2>開発環境に柔軟に適応</h2></header>'+
 items.map(([key,name,body])=>'<article class="dev-environment reveal">'+editor(key)+'<div class="environment-copy"><h3><span>'+name+'</span>の場合</h3><p>'+body+'</p></div></article>').join('')+
 '</div></div></section>';
}
