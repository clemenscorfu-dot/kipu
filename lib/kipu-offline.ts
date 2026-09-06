import{ensureAnonymousSession}from"@/lib/supabase-browser";

export type OfflineIdea={localId:string;text:string;createdAt:string;status:'queued'|'syncing'|'failed'};
const KEY='kipu-offline-ideas-v1';

export function getOfflineIdeas():OfflineIdea[]{
  if(typeof window==='undefined')return[];
  try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}
}

function save(items:OfflineIdea[]){
  localStorage.setItem(KEY,JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('kipu-offline-change',{detail:{count:items.length}}));
}

export function queueOfflineIdea(text:string){
  const item:OfflineIdea={localId:`offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,text,createdAt:new Date().toISOString(),status:'queued'};
  save([item,...getOfflineIdeas()]);
  return item;
}

export function retryOfflineIdeas(){
  save(getOfflineIdeas().map(x=>({...x,status:'queued'})));
  return flushOfflineIdeas();
}

export async function flushOfflineIdeas(){
  if(typeof navigator==='undefined'||!navigator.onLine)return{synced:0,remaining:getOfflineIdeas().length};
  let synced=0;
  const snapshot=[...getOfflineIdeas()].reverse();
  for(const item of snapshot){
    try{
      save(getOfflineIdeas().map(x=>x.localId===item.localId?{...x,status:'syncing' as const}:x));
      const session=await ensureAnonymousSession();
      const r=await fetch('/api/ideas/capture',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({text:item.text,inputType:'offline-text'})});
      if(!r.ok)throw new Error(`capture_${r.status}`);
      save(getOfflineIdeas().filter(x=>x.localId!==item.localId));
      synced++;
    }catch{
      save(getOfflineIdeas().map(x=>x.localId===item.localId?{...x,status:'failed' as const}:x));
      break;
    }
  }
  const remaining=getOfflineIdeas().length;
  window.dispatchEvent(new CustomEvent('kipu-offline-synced',{detail:{synced,remaining}}));
  return{synced,remaining};
}
