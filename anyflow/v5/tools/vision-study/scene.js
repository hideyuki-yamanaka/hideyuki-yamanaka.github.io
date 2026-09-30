// 元のPNGを全案で固定。CSSフィルター・不透明度・線の再描画を適用しない。
const surface=document.createElement('div');surface.className='graphic-surface';surface.setAttribute('aria-hidden','true');
document.querySelector('#vision .pin-stage').prepend(surface);
function setVariant(key,edge="fade"){if(!/^\d{2}$/.test(key)||Number(key)>19)return;if(Number(key)>=17&&edge==="blur")edge="fade";document.documentElement.dataset.variant=key;document.documentElement.dataset.edge=["fade","blur","hard"].includes(edge)?edge:"fade";}
setVariant(new URLSearchParams(location.search).get('v')||'00',new URLSearchParams(location.search).get('edge')||'fade');
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='variant')return;setVariant(e.data.key,e.data.edge)});
