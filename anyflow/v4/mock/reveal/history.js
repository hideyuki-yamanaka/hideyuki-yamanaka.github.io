// Fixed timestamps in JST. Past creation dates were recovered from file records.
export const catalogUpdatedAt='2026-09-14T23:18:28+09:00';
const previousUpdate='2026-09-14T22:30:52+09:00';
const records={
 '02':{version:'v2.1',createdAt:'2026-09-14T16:03:28+09:00',updatedAt:catalogUpdatedAt},
 '03':{version:'v2.0',createdAt:'2026-09-14T17:53:25+09:00',updatedAt:previousUpdate},
 ...Object.fromEntries(['04','05'].map(id=>[id,{version:'v1.2',createdAt:'2026-09-14T20:43:45+09:00',updatedAt:previousUpdate}])),
 ...Object.fromEntries(['09','10','11','12','13','14','15'].map(id=>[id,{version:'v1.0',createdAt:previousUpdate,updatedAt:previousUpdate}])),
 '16':{version:'v1.0',createdAt:'2026-09-13T21:49:11+09:00',updatedAt:catalogUpdatedAt}
};
export const conceptHistory=concept=>records[concept.id];
export function formatDate(iso){
 const parts=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
 const value=type=>parts.find(p=>p.type===type).value;
 return `${value('year')}/${value('month')}/${value('day')} ${value('hour')}:${value('minute')}`;
}
export const timeHTML=iso=>`<time datetime="${iso}">${formatDate(iso)}</time>`;
