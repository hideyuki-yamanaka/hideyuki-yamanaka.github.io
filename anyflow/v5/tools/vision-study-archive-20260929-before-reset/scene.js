const meshKeys=new Set(['11','12','13','14','15','16','17','18','19']);
function setVariant(key){
 if(!/^\d{2}$/.test(key)||Number(key)>19)return;
 document.documentElement.dataset.variant=key;
 document.documentElement.toggleAttribute('data-mesh-study',meshKeys.has(key));
 document.getElementById('vfDome').src=meshKeys.has(key)?`mesh-${key}.svg`:'mesh.png';
}
setVariant(new URLSearchParams(location.search).get('v')||'00');
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='variant')return;setVariant(e.data.key)});
