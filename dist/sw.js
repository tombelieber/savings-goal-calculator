'use strict';
const VERSION='bcc3fb9507b9',CACHE='saving-plan-'+VERSION;
const FILES=['./','./offline.zip','./manifest.webmanifest','./icon.svg'];
const paths=new Set(FILES.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('saving-plan-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!paths.has(url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  // Never cache a URL containing query data. All navigations resolve to the static shell.
  const key=event.request.mode==='navigate'?new URL('./',self.registration.scope).href:url.origin+url.pathname;
  const saved=await cache.match(key);return saved||fetch(key,{credentials:'omit',referrerPolicy:'no-referrer'});
 }));
});
