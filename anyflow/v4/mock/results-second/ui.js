import {content} from './catalog.js';
export const picto=(kind,extra='')=>`<div class="picto ${extra}" data-picto="${kind}" role="img" aria-label="${kind==='saas'?'複数のデータが重なり、同期する動き':'データを取得し、業務の実行へつなぐ動き'}"></div>`;
export const headline=(cls='')=>`<h1 class="headline ${cls}"><span>事業の推進力を、</span><span><em>Anyflow</em>が支えます。</span></h1>`;
export const stat=(label,n,cls='')=>`<div class="stat ${cls}"><span class="stat-label">${label}</span><div class="stat-value"><span>${n}</span><small>+</small></div></div>`;
export const stats=(cls='')=>`<div class="stats ${cls}">${stat('導入企業','100')}${stat('連携実績','20,000')}${stat('連携アプリ数','200')}</div>`;
export const value=(kind,cls='',visual=true)=>`<article class="value ${kind} ${cls}">${visual?picto(kind):''}<div class="value-copy"><span class="tag ${kind}">${content[kind].tag}</span><h2>${content[kind].title}</h2><p>${content[kind].body}</p></div></article>`;
export const pair=(cls='')=>`<div class="value-pair ${cls}">${value('saas')}${value('ai')}</div>`;
export const eyebrow=()=>'<p class="eyebrow">What we empower</p>';
