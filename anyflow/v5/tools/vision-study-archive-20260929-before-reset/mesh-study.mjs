import {chromium} from '../../../../design-gallery/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('./',import.meta.url);const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1512,height:830}});
await page.goto('http://localhost:8778/',{waitUntil:'networkidle'});
await page.evaluate(()=>{lenis.stop();scrollTo(0,document.getElementById('vision').offsetTop-75)});await page.waitForTimeout(1800);
const data=await page.evaluate(()=>{
 const c=vfCfg();vfDraw(0);
 const project=mesh=>{const tl=c.tilt*Math.PI/180,rl=(c.roll||0)*Math.PI/180,a=(c.yaw||0)*Math.PI/180,R=c.r*c.scale*(1+(c.mz||0)/100),cx=VF_CX+150+(c.mx||0),cy=VF_CY+150+(c.my||0);return {...mesh,points:mesh.verts.map(v=>{let [x,y,z]=v;if(c.mpinch){let k=1-c.mpinch*Math.abs(y);x*=k;z*=k}x*=c.msx||1;y*=c.msy||1;z*=c.msz||1;const x1=x*Math.cos(a)+z*Math.sin(a),z1=-x*Math.sin(a)+z*Math.cos(a),y2=y*Math.cos(tl)-z1*Math.sin(tl),z2=y*Math.sin(tl)+z1*Math.cos(tl);return[cx+(x1*Math.cos(rl)-y2*Math.sin(rl))*R,cy-(x1*Math.sin(rl)+y2*Math.cos(rl))*R,(z2+1)/2]})}};
 const rect=document.getElementById('vfDome').getBoundingClientRect();const anchors=[1,2,3,4,5].map(n=>{const r=document.getElementById('vfLab'+n).getBoundingClientRect();return[(r.x+r.width/2-rect.x)*900/rect.width,(r.bottom-rect.y)*900/rect.height+8]});
 return {full:project(vfMesh),sparse:project(vfBuild(2)),anchors,config:c};
});await browser.close();await fs.writeFile(new URL('mesh-geometry.json',out),JSON.stringify(data));
const n=x=>x.toFixed(2),path=(a,b)=>`M${n(a[0])},${n(a[1])}L${n(b[0])},${n(b[1])}`;
for(const key of ['11','12','13','14','15','16','17','18','19']){
 const m=key==='12'?data.sparse:data.full,P=m.points,parts=[];
 if(key==='17')parts.push('<circle cx="441" cy="465" r="352" fill="#dce3ed" opacity=".72"/>');
 if(key==='18')parts.push('<rect x="88" y="142" width="706" height="620" rx="40" fill="#e0dbe8" opacity=".52"/>');
 if(key==='19')parts.push('<path d="M441 108L693 211L798 465L693 716L441 820L189 716L84 465L189 211Z" fill="#d7e3e5" opacity=".55"/>');
 if(key==='13')for(const face of m.faces){const vs=face.map(i=>P[i]);const z=vs.reduce((a,p)=>a+p[2],0)/3;if(z<.5)continue;parts.push(`<polygon points="${vs.map(p=>n(p[0])+','+n(p[1])).join(' ')}" fill="${face[0]%4===0?'#dd87b6':'#5080ae'}" opacity="${n(.025+.08*(z-.5))}"/>`)}
 for(const [i,j] of m.edges){const A=P[i],B=P[j],k=(A[2]+B[2])/2;let color='#667d96',alpha=.06+.23*k*k,w=.8,dash='';
 if(key==='11'){alpha=.035+.22*k*k;w=.8}
 if(key==='12'){alpha=.07+.29*k*k;w=1.1}
 if(key==='13'){color='#73859a';alpha=.025+.2*k*k;w=.7}
 if(key==='14'){color='#fbfcfe';alpha=.08+.75*k*k;w=1.5}
 if(key==='15'){color='#6f7c8a';alpha=.04+.16*k*k;w=.8;dash='stroke-dasharray="2 5"'}
 if(key==='16'){color='#74899f';alpha=.025+.17*k*k;w=.8}
 parts.push(`<path d="${path(A,B)}" stroke="${color}" stroke-width="${w}" opacity="${n(alpha)}" fill="none" ${dash}/>`);
 }
 if(!['11','17','18','19'].includes(key))for(let i=0;i<P.length;i++){const [x,y,k]=P[i];if(k<.55)continue;const radius=key==='15'?2.3:key==='12'?2.5:1.5;parts.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${radius}" fill="${key==='14'?'#8c9caf':'#6c87a4'}" opacity="${n(.2+.4*k)}"/>`)}
 if(key==='16'){
 const colors=['#5d7eaa','#5d7eaa','#946d96','#5d7eaa','#5d7eaa'];
 for(let a=0;a<data.anchors.length;a++){const anchor=data.anchors[a];let j=0,best=Infinity;P.forEach((p,i)=>{if(p[2]<.5)return;let d=(p[0]-anchor[0])**2+(p[1]-anchor[1])**2;if(d<best){j=i;best=d}});const p=P[j],color=colors[a];parts.push(`<path d="${path(anchor,p)}" stroke="${color}" stroke-width="1" opacity=".6" fill="none"/>`);for(const [i,k]of m.edges){if(i!==j&&k!==j)continue;parts.push(`<path d="${path(P[i],P[k])}" stroke="${color}" stroke-width="1.5" opacity=".45" fill="none"/>`)}parts.push(`<circle cx="${n(p[0])}" cy="${n(p[1])}" r="6" fill="#e7e7e7" stroke="${color}" stroke-width="1.5"/><circle cx="${n(p[0])}" cy="${n(p[1])}" r="2" fill="${color}"/>`)}
 }
 await fs.writeFile(new URL(`mesh-${key}.svg`,out),`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><g stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</g></svg>`);
}
console.log('Created 9 vector mesh treatments from original geometry.');
