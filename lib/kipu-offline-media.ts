import{ensureAnonymousSession}from"@/lib/supabase-browser";

type OfflinePhoto={localId:string;note:string;createdAt:string;status:'queued'|'syncing'|'failed'};
const KEY='kipu-offline-photos-v1';
const CACHE='kipu-offline-media-v1';

export function getOfflinePhotos():OfflinePhoto[]{if(typeof window==='undefined')return[];try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function save(items:OfflinePhoto[]){localStorage.setItem(KEY,JSON.stringify(items));window.dispatchEvent(new CustomEvent('kipu-offline-change',{detail:{count:items.length}}))}
function mediaRequest(id:string){return new Request(`${location.origin}/__kipu_offline_media/${id}`)}

export async function queueOfflinePhoto(imageDataUrl:string,note:string){
  const localId=`offline-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const cache=await caches.open(CACHE);
  await cache.put(mediaRequest(localId),new Response(imageDataUrl,{headers:{'Content-Type':'text/plain'}}));
  const item:OfflinePhoto={localId,note,createdAt:new Date().toISOString(),status:'queued'};
  save([item,...getOfflinePhotos()]);
  return item;
}

export async function flushOfflinePhotos(){
  if(typeof navigator==='undefined'||!navigator.onLine)return{synced:0,remaining:getOfflinePhotos().length,failed:0};
  let synced=0,failed=0;const cache=await caches.open(CACHE);
  for(const item of [...getOfflinePhotos()].reverse()){
    try{
      save(getOfflinePhotos().map(x=>x.localId===item.localId?{...x,status:'syncing' as const}:x));
      const media=await cache.match(mediaRequest(item.localId));if(!media)throw new Error('offline_photo_missing');
      const imageDataUrl=await media.text();const session=await ensureAnonymousSession();
      const r=await fetch('/api/ideas/capture',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({text:item.note,imageDataUrl,inputType:'camera'})});
      if(!r.ok)throw new Error(`capture_${r.status}`);
      await cache.delete(mediaRequest(item.localId));save(getOfflinePhotos().filter(x=>x.localId!==item.localId));synced++;
    }catch{
      save(getOfflinePhotos().map(x=>x.localId===item.localId?{...x,status:'failed' as const}:x));
      failed++;
      // Keep syncing later photos if just this item failed. Stop only when the device
      // actually went offline again.
      if(!navigator.onLine)break;
    }
  }
  return{synced,remaining:getOfflinePhotos().length,failed};
}

export function retryOfflinePhotos(){save(getOfflinePhotos().map(x=>({...x,status:'queued'})));return flushOfflinePhotos()}
