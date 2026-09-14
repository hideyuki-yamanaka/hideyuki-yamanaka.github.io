// Fixed records, never the visitor's current time. All timestamps are JST.
// Rounds 1–4 were reconstructed from the old Round 02 index and filesystem/Git records.
export const historyRegisteredAt='2026-09-14T17:53:25+09:00';
export const rounds=[
 {round:1,title:'初回の10案',ids:'旧01〜10',at:'2026-09-13T21:49:11+09:00',basis:'初回作成の記録',anchor:null},
 {round:2,title:'03・04を残し、8案を入れ替え',ids:'旧01〜10',at:'2026-09-13T22:27:54+09:00',basis:'第2回の保存記録',anchor:null},
 {round:3,title:'V4のページ全体で、15案',ids:'P1〜P5 / T1〜T5 / R1〜R5',at:'2026-09-14T16:03:28+09:00',basis:'15案の初回作成記録',anchor:'group-P'},
 {round:4,title:'新しい構図と視線誘導、10案',ids:'N1〜N10',at:'2026-09-14T17:04:05+09:00',basis:'10案を追加した保存記録',anchor:'group-N'},
 {round:5,title:'タイピング × スクロール、1案',ids:'TY1',at:historyRegisteredAt,basis:'今回の案の登録日時',anchor:'group-TY'}
];
export function conceptHistory(concept){
 const round=concept.group==='TY'?5:concept.group==='N'?4:3;
 const record=rounds.find(r=>r.round===round);
 const revised=round===3||['N2','N3'].includes(concept.id);
 const updatedAt=round===5?'2026-09-14T17:57:23+09:00':
   ['N2','N3'].includes(concept.id)?'2026-09-14T17:12:22+09:00':'2026-09-14T17:06:10+09:00';
 return {...record,version:revised?'v1.1':'v1.0',createdAt:record.at,updatedAt};
}
export function formatDate(iso){
 const parts=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
 const value=type=>parts.find(p=>p.type===type).value;
 return `${value('year')}/${value('month')}/${value('day')} ${value('hour')}:${value('minute')}`;
}
export const timeHTML=iso=>`<time datetime="${iso}">${formatDate(iso)}</time>`;
