const SHELL_CACHE='kipu-shell-v2';
const DATA_CACHE='kipu-data-v1';
const SHELL=['/','/write','/ideas','/camera','/schriftzug-master.png','/Kipu-master-logo','/manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>![SHELL_CACHE,DATA_CACHE].includes(k)).map(k=>caches.delete(k)))));
  self.clients.claim();
});

function isSupabaseGet(req,url){
  return req.method==='GET' && (url.hostname.endsWith('.supabase.co') || url.hostname.includes('supabase'));
}

async function networkFirst(req,cacheName){
  const cache=await caches.open(cacheName);
  try{
    const res=await fetch(req);
    if(res && (res.ok || res.type==='opaque')) await cache.put(req,res.clone());
    return res;
  }catch{
    const cached=await cache.match(req);
    if(cached)return cached;
    throw new Error('offline-cache-miss');
  }
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  if(req.mode==='navigate' && url.origin===self.location.origin){
    event.respondWith(networkFirst(req,SHELL_CACHE).catch(async()=>await caches.match(req)||await caches.match('/')||Response.error()));
    return;
  }

  if(isSupabaseGet(req,url)){
    event.respondWith(networkFirst(req,DATA_CACHE));
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(async res=>{
      if(res.ok){const cache=await caches.open(SHELL_CACHE);await cache.put(req,res.clone())}
      return res;
    })));
  }
});
