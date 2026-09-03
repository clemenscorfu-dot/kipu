"use client";

import {Camera,ChevronRight,Images,MapPin,Mic,Paperclip,Pencil,Plus,Settings,Sparkles,X} from "lucide-react";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {ensureAnonymousSession,getSupabaseBrowserClient} from "@/lib/supabase-browser";
import {KipuLogo} from "@/components/kipu-logo";

const actions=[
  {label:"Text",hint:"Gedanke oder Idee notieren",icon:Pencil,href:"/write",tone:"bg-[#fff7e8] text-[#d99a39]"},
  {label:"Sprache",hint:"Einfach erzählen",icon:Mic,href:"/voice",tone:"bg-[#eeecff] text-[#6f78f6]"},
  {label:"Foto",hint:"Etwas fotografieren",icon:Camera,href:"/camera",tone:"bg-[#e8f3ee] text-[#5d9b84]"},
  {label:"Datei",hint:"Dokument oder Bild hinzufügen",icon:Paperclip,href:"/processing",tone:"bg-[#f2ecfa] text-[#936bd1]"},
];

type Rediscover={id:string;title:string;summary:string|null;location_label:string|null;reason:string;enrichment?:{image_url?:string|null;image_fit?:"cover"|"contain"}};

export default function Home(){
  const router=useRouter(),cameraRef=useRef<HTMLInputElement|null>(null);
  const [item,setItem]=useState<Rediscover|null>(null),[captureOpen,setCaptureOpen]=useState(false);

  useEffect(()=>{
    let active=true;
    try{const cached=localStorage.getItem("kipu-rediscover");if(cached)setItem(JSON.parse(cached))}catch{}
    async function load(){
      try{
        await ensureAnonymousSession();
        const session=(await getSupabaseBrowserClient().auth.getSession()).data.session;
        if(!session)return;
        void(async()=>{
          for(let i=0;i<5;i++){try{const r=await fetch("/api/memory/backfill",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});if(!r.ok)break;const d=await r.json();if(!d.remaining)break}catch{break}}
          for(let i=0;i<6;i++){try{const r=await fetch("/api/memory/graph-backfill",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});if(!r.ok)break;const d=await r.json();if(!d.remaining)break}catch{break}}
          for(let i=0;i<6;i++){try{const r=await fetch("/api/place/backfill",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});if(!r.ok)break;const d=await r.json();if(!d.remaining)break}catch{break}}
        })();
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
        const r=await fetch("/api/rediscover",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`},signal:controller.signal});
        clearTimeout(timer);
        if(!r.ok)return;
        const d=await r.json();
        if(active&&d.item){setItem(d.item);try{localStorage.setItem("kipu-rediscover",JSON.stringify(d.item))}catch{}}
      }catch{}
    }
    void load();
    return()=>{active=false};
  },[]);

  useEffect(()=>{document.body.style.overflow=captureOpen?"hidden":"";return()=>{document.body.style.overflow=""}},[captureOpen]);

  function photoChosen(file?:File){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{try{sessionStorage.setItem("kipu-camera-capture",String(reader.result??""))}catch{}router.push("/camera?captured=1")};
    reader.readAsDataURL(file);
  }

  return <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-x-hidden bg-[#fbfaf7] text-[#111]">
    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>photoChosen(e.target.files?.[0])}/>
    <div className="flex flex-1 flex-col px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-4">
      <div className="flex items-start justify-between">
        <KipuLogo compact/>
        <button aria-label="Einstellungen" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ebe9e4] bg-white/90 shadow-[0_3px_12px_rgba(0,0,0,.04)]">
          <Settings className="h-4 w-4"/>
        </button>
      </div>

      <header className="mt-4">
        <h1 className="max-w-[310px] text-[25px] font-semibold leading-[1.05] tracking-[-0.035em]">Was möchtest du heute festhalten?</h1>
        <div className="mt-4 flex flex-col items-center">
          <button onClick={()=>setCaptureOpen(true)} aria-label="Neue Erinnerung festhalten" className="relative flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[#74a18f] text-white shadow-[0_12px_28px_rgba(116,161,143,.24)] active:scale-95">
            <span className="absolute inset-[-6px] rounded-full border border-[#74a18f]/15"/>
            <Plus className="h-10 w-10" strokeWidth={1.7}/>
          </button>
          <button onClick={()=>setCaptureOpen(true)} className="mt-2 text-center text-[11px] font-medium text-black/42">Text, Sprache, Foto oder Datei</button>
        </div>
      </header>

      {item&&<section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold">Kipu erinnert dich</p>
          <Sparkles className="h-4 w-4 text-[#74a18f]"/>
        </div>
        <Link href={`/ideas/${item.id}`} className="kipu-card flex gap-3 p-3">
          <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#edf3ef]">
            {item.enrichment?.image_url?<img src={item.enrichment.image_url} alt="" className={`h-full w-full ${item.enrichment.image_fit==="contain"?"object-contain p-1":"object-cover"}`}/>:<Sparkles className="h-5 w-5 text-[#74a18f]"/>}
          </div>
          <div className="min-w-0 flex-1 self-center">
            <h2 className="line-clamp-1 text-[12px] font-semibold">{item.title}</h2>
            <p className="mt-1 line-clamp-2 text-[9.5px] leading-3.5 text-black/46">{item.reason}</p>
          </div>
          <ChevronRight className="self-center h-4 w-4 shrink-0 text-black/25"/>
        </Link>
      </section>}

      <section className="mt-4">
        <p className="mb-2 text-[13px] font-semibold">Schnellzugriff</p>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/nearby" className="rounded-[18px] border border-[#e9e8e3] bg-white p-3 shadow-[0_4px_16px_rgba(0,0,0,.03)] active:scale-[.985]">
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#e8f2ed] text-[#74a18f]"><MapPin className="h-4 w-4"/></span>
              <ChevronRight className="mt-1 h-3.5 w-3.5 text-black/22"/>
            </div>
            <p className="mt-2.5 text-[11px] font-semibold">In deiner Nähe</p>
            <p className="mt-1 text-[8.5px] leading-3.5 text-black/38">Gespeicherte Orte entdecken</p>
          </Link>
          <Link href="/ideas" className="rounded-[18px] border border-[#e9e8e3] bg-white p-3 shadow-[0_4px_16px_rgba(0,0,0,.03)] active:scale-[.985]">
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#e7edf2] text-[#657f92]"><Images className="h-4 w-4"/></span>
              <ChevronRight className="mt-1 h-3.5 w-3.5 text-black/22"/>
            </div>
            <p className="mt-2.5 text-[11px] font-semibold">Sammlung</p>
            <p className="mt-1 text-[8.5px] leading-3.5 text-black/38">Alle Erinnerungen durchsuchen</p>
          </Link>
        </div>
      </section>
    </div>

    {captureOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-5 backdrop-blur-[3px]" onClick={()=>setCaptureOpen(false)}>
      <section className="w-full max-w-[390px] rounded-[28px] bg-[#fbfaf7] p-5 shadow-[0_24px_70px_rgba(0,0,0,.22)]" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#74a18f]">Neue Erinnerung</p>
            <h2 className="mt-1.5 text-[21px] font-semibold leading-[1.08] tracking-[-.025em]">Wie möchtest du sie festhalten?</h2>
          </div>
          <button onClick={()=>setCaptureOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#efeee9]"><X className="h-4 w-4"/></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {actions.map(({label,hint,icon:Icon,href,tone})=>label==="Foto"?
            <button type="button" key={label} onClick={()=>{setCaptureOpen(false);setTimeout(()=>cameraRef.current?.click(),0)}} className="min-h-[128px] text-left rounded-[20px] border border-[#ecebe7] bg-white p-4 shadow-[0_6px_18px_rgba(0,0,0,.04)] active:scale-[.985]">
              <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${tone}`}><Icon className="h-5 w-5"/></span>
              <p className="mt-3 text-[14px] font-semibold">{label}</p>
              <p className="mt-1 text-[10px] leading-4 text-black/42">{hint}</p>
            </button>:
            <Link href={href} key={label} onClick={()=>setCaptureOpen(false)} className="min-h-[128px] rounded-[20px] border border-[#ecebe7] bg-white p-4 shadow-[0_6px_18px_rgba(0,0,0,.04)] active:scale-[.985]">
              <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${tone}`}><Icon className="h-5 w-5"/></span>
              <p className="mt-3 text-[14px] font-semibold">{label}</p>
              <p className="mt-1 text-[10px] leading-4 text-black/42">{hint}</p>
            </Link>)}
        </div>
      </section>
    </div>}
  </main>;
}
