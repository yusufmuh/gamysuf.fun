'use strict';

/* Ketiga game ditulis untuk berjalan di akar domain (/api, /assets, ...).
   Gateway memasangnya di /g/<slug>/, jadi URL absolut di HTML, CSS, JS, dan
   JSON diberi awalan saat keluar, lalu awalan itu dilepas lagi dari body
   JSON yang masuk. Keduanya simetris sehingga nilai seperti path foto hadiah
   tetap konsisten di sisi game maupun browser. */
const ROOTS='api|assets|css|js|uploads|admin\\.html|index\\.html|maskot\\.png|logo\\.png|rancangan maskot\\.png';
const OUTGOING=new RegExp(`(["'\`(=,\\s])\\/(${ROOTS})(?=[\\/"'\`?#)\\s,;]|$)`,'g');
const ROOT_LINK=/(href=|location\.href=|location\.assign\(|location\.replace\()(["'])\/\2/g;

function rewriteOutgoing(text,prefix){
 return text.replace(OUTGOING,`$1${prefix}/$2`).replace(ROOT_LINK,`$1$2${prefix}/$2`);
}

function rewriteIncoming(text,prefix){
 return text.split(`${prefix}/`).join('/');
}

function rewriteCookie(cookie,prefix,secure){
 let next=cookie.replace(/;\s*Path=([^;]*)/i,(_match,value)=>`; Path=${prefix}${value.trim().startsWith('/')?value.trim():'/'+value.trim()}`);
 if(!/;\s*Path=/i.test(next))next+=`; Path=${prefix}/`;
 if(secure&&!/;\s*Secure/i.test(next))next+='; Secure';
 return next;
}

function rewriteLocation(location,prefix){
 return typeof location==='string'&&location.startsWith('/')&&!location.startsWith('//')?prefix+location:location;
}

module.exports={rewriteOutgoing,rewriteIncoming,rewriteCookie,rewriteLocation};
