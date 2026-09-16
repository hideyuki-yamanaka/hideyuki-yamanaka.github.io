import {headline,stat,stats,pair} from './ui.js';
export const retained={
3:()=>`<section class="section-inner standard v3" id="study-results">${headline('reveal')}<div class="number-composition reveal delay-1"><div class="major-number">${stat('連携実績','20,000')}<span class="number-caption">事業をつなぐ、連携の積み重ね。</span></div><div class="minor-numbers">${stat('導入企業','100')}${stat('連携アプリ数','200')}</div></div><div class="rule"></div><div class="reveal delay-2">${pair()}</div></section>`,
4:()=>`<section class="section-inner standard v4" id="study-results">${headline('reveal')}<div class="reveal delay-1">${pair('picto-led')}</div><div class="proof-strip reveal delay-2">${stats()}</div></section>`
};
