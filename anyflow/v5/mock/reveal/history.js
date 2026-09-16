// Fixed timestamps in JST. Past creation dates were recovered from file records.
export const catalogUpdatedAt='2026-09-15T01:23:33+09:00';
const attentionUpdatedAt='2026-09-15T01:07:30+09:00';
const attentionCreatedAt='2026-09-15T00:54:31+09:00';
const previousUpdate='2026-09-14T22:30:52+09:00';
const records={
 ...Object.fromEntries(['19','20','21','22','23','24','25','26','27','28'].map(id=>[id,{version:'v1.0',createdAt:attentionCreatedAt,updatedAt:attentionUpdatedAt}])),
 '18':{version:'v1.0',createdAt:'2026-09-13T21:49:11+09:00',updatedAt:'2026-09-15T00:44:04+09:00'},
 '02':{version:'v2.2',createdAt:'2026-09-14T16:03:28+09:00',updatedAt:'2026-09-15T01:23:33+09:00'},
 '03':{version:'v2.0',createdAt:'2026-09-14T17:53:25+09:00',updatedAt:previousUpdate},
 ...Object.fromEntries(['04','05'].map(id=>[id,{version:'v1.2',createdAt:'2026-09-14T20:43:45+09:00',updatedAt:previousUpdate}])),
 ...Object.fromEntries(['09','10','11','12','13','14','15'].map(id=>[id,{version:'v1.0',createdAt:previousUpdate,updatedAt:previousUpdate}])),
 '17':{version:'v1.0',createdAt:'2026-09-13T21:49:11+09:00',updatedAt:'2026-09-15T00:29:57+09:00'},
};
export const conceptHistory=concept=>records[concept.id];
export function formatDate(iso){
 const parts=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
 const value=type=>parts.find(p=>p.type===type).value;
 return `${value('year')}/${value('month')}/${value('day')} ${value('hour')}:${value('minute')}`;
}
export const timeHTML=iso=>`<time datetime="${iso}">${formatDate(iso)}</time>`;
