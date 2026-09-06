"use client";
import{useEffect,useState}from"react";
import{flushOfflineIdeas,getOfflineIdeas,retryOfflineIdeas}from"@/lib/kipu-offline";

export function KipuOfflineRuntime(){
  const[online,setOnline]=useState(true),[queued,setQueued]=useState(0),[syncing,setSyncing]=useState(false);
  useEffect(()=>{
    if('serviceWorker'in navigator)void navigator.serviceWorker.register('/sw.js');
    const refresh=()=>{setOnline(navigator.onLine);setQueued(getOfflineIdeas().length)};
    const sync=async()=>{refresh();if(!navigator.onLine)return;setSyncing(true);try{await flushOfflineIdeas()}finally{setSyncing(false);refresh()}};
    const changed=()=>refresh();
    window.addEventListener('online',sync);window.addEventListener('offline',refresh);window.addEventListener('kipu-offline-change',changed);
    refresh();if(navigator.onLine)void sync();
    return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',refresh);window.removeEventListener('kipu-offline-change',changed)};
  },[]);

  if(online&&queued===0&&!syncing)return null;
  const label=!online?queued>0?`Offline · ${queued} Idee${queued===1?'':'n'} wartet${queued===1?'':'en'} auf Sync`:'Offline · zuletzt geladene Inhalte verfügbar':syncing?'Kipu synchronisiert…':`${queued} Idee${queued===1?'':'n'} noch nicht synchronisiert`;
  return <div className="pointer-events-none fixed inset-x-0 top-[max(8px,env(safe-area-inset-top))] z-[100] flex justify-center px-4"><div className="pointer-events-auto flex max-w-[390px] items-center gap-2 rounded-full border border-black/8 bg-[#252525]/92 px-3 py-2 text-[10.5px] font-medium text-white shadow-[0_5px_18px_rgba(0,0,0,.15)] backdrop-blur"><span className={`h-2 w-2 rounded-full ${online?'bg-[#93c95c]':'bg-[#e7b05b]'}`}/><span>{label}</span>{online&&queued>0&&!syncing&&<button onClick={()=>{setSyncing(true);void retryOfflineIdeas().finally(()=>setSyncing(false))}} className="ml-1 underline decoration-white/40 underline-offset-2">Nochmal</button>}</div></div>
}
