const SHELL_CACHE='kipu-shell-v3';
const DATA_CACHE='kipu-data-v1';
const ROUTES=['/','/write','/ideas','/camera','/voice','/search','/nearby','/processing'];
const STATIC=['/schriftzug-master.png','/Kipu-master-logo','/manifest.webmanifest'];

async function cachePage(route,cache){
  try{
    const res=await fetch(route,{cache:'no-store'});
    if(!res.ok)return;
    await cache.put(route,res.clone());
    const html=await res.text();
    const urls=new Set();
    for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
      const raw=match[1];
      if(!raw.startsWith('/'))continue;
      if(raw.startsWith('/_next/')||raw.startsWith('/icons/')||raw.endsWith('.css')||raw.endsWith('.js')||raw.endsWith('.woff2')||raw.endsWith('.png'))urls.add(raw);
    }
    await Promise.allSettled([...urls].map(async url=>{
      const asset=await fetch(url);
      if(asset.ok)await cache.put(url,asset.clone());
    }));
  }catch{}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(SHELL_CACHE);
    await Promise.allSettled(STATIC.map(async url=>{try{const r=await fetch(url);if(r.ok)await cache.put(url,r.clone())}catch{}}));
    for(const route of ROUTES)await cachePage(route,cache);
  })());
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>![SHELL_CACHE,DATA_CACHE,'kipu-offline-media-v1'].includes(k)).map(k=>caches.delete(k)))));
  self.clients.claim();
});

function isSupabaseGet(req,url){return req.method==='GET'&&(url.hostname.endsWith('.supabase.co')||url.hostname.includes('supabase'))}
async function networkFirst(req,cacheName){const cache=await caches.open(cacheName);try{const res=await fetch(req);if(res&&(res.ok||res.type==='opaque'))await cache.put(req,res.clone());return res}catch{const cached=await cache.match(req);if(cached)return cached;throw new Error('offline-cache-miss')}}

self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);

  if(req.mode==='navigate'&&url.origin===self.location.origin){
    event.respondWith(networkFirst(req,SHELL_CACHE).catch(async()=>{
      const cache=await caches.open(SHELL_CACHE);
      return await cache.match(req)||await cache.match(url.pathname)||await cache.match('/')||Response.error();
    }));
    return;
  }

  if(isSupabaseGet(req,url)){event.respondWith(networkFirst(req,DATA_CACHE));return}

  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      const cache=await caches.open(SHELL_CACHE),cached=await cache.match(req);
      if(cached)return cached;
      try{const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res}catch{return Response.error()}
    })());
  }
});
