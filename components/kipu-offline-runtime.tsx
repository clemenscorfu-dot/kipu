"use client";
import{useEffect,useState}from"react";
import{flushOfflineIdeas,getOfflineIdeas,retryOfflineIdeas}from"@/lib/kipu-offline";
import{flushOfflinePhotos,getOfflinePhotos,retryOfflinePhotos}from"@/lib/kipu-offline-media";

export function KipuOfflineRuntime(){
  const[online,setOnline]=useState(true),[queued,setQueued]=useState(0),[syncing,setSyncing]=useState(false);
  useEffect(()=>{
    if('serviceWorker'in navigator){
      void navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
    }
    const refresh=()=>{setOnline(navigator.onLine);setQueued(getOfflineIdeas().length+getOfflinePhotos().length)};
    const sync=async()=>{refresh();if(!navigator.onLine)return;setSyncing(true);try{await flushOfflineIdeas();await flushOfflinePhotos()}finally{setSyncing(false);refresh()}};
    const changed=()=>refresh();
    window.addEventListener('online',sync);window.addEventListener('offline',refresh);window.addEventListener('kipu-offline-change',changed);
    refresh();if(navigator.onLine)void sync();
    return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',refresh);window.removeEventListener('kipu-offline-change',changed)};
  },[]);

  if(online&&queued===0&&!syncing)return null;
  const label=!online?queued>0?`Offline · ${queued} Idee${queued===1?'':'n'} wartet${queued===1?'':'en'} auf Synchronisation`:'Offline · gespeicherte Inhalte sind verfügbar':syncing?'Kipu synchronisiert…':`${queued} Idee${queued===1?'':'n'} noch nicht synchronisiert`;
  async function retryAll(){setSyncing(true);try{await retryOfflineIdeas();await retryOfflinePhotos()}finally{setSyncing(false);setQueued(getOfflineIdeas().length+getOfflinePhotos().length)}}
  return <div className="pointer-events-none fixed inset-x-0 top-[max(10px,env(safe-area-inset-top))] z-[100] flex justify-center px-3"><div className="pointer-events-auto flex min-h-10 w-full max-w-[404px] items-center gap-2.5 rounded-[14px] border border-black/15 bg-white px-3.5 py-2.5 text-[12.5px] font-semibold leading-4 text-[#222] shadow-[0_6px_24px_rgba(0,0,0,.16)]"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${online?'bg-[#79aa36]':'bg-[#d58b27]'}`}/><span className="min-w-0 flex-1">{label}</span>{online&&queued>0&&!syncing&&<button onClick={()=>void retryAll()} className="shrink-0 rounded-full bg-[#222] px-2.5 py-1 text-[10.5px] font-semibold text-white">Nochmal</button>}</div></div>
}
