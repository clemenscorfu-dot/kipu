"use client";

import { Camera, ImagePlus, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAnonymousSession } from "@/lib/supabase-browser";

function getLocation():Promise<{latitude:number|null;longitude:number|null}>{return new Promise(resolve=>{if(!navigator.geolocation)return resolve({latitude:null,longitude:null});navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>resolve({latitude:null,longitude:null}),{enableHighAccuracy:true,timeout:6000,maximumAge:60000})})}

async function compressImage(file:File):Promise<string>{
  const bitmap=await createImageBitmap(file);const max=1280;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const width=Math.round(bitmap.width*scale),height=Math.round(bitmap.height*scale);const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Bild konnte nicht verarbeitet werden.");ctx.drawImage(bitmap,0,0,width,height);bitmap.close();return canvas.toDataURL("image/jpeg",0.78);
}

export default function CameraPage(){
 const router=useRouter();const inputRef=useRef<HTMLInputElement|null>(null);const[image,setImage]=useState<string|null>(null);const[note,setNote]=useState("");const[working,setWorking]=useState(false);const[error,setError]=useState<string|null>(null);
 async function choose(file?:File){if(!file)return;setError(null);try{setImage(await compressImage(file))}catch(e){setError(e instanceof Error?e.message:"Foto konnte nicht verarbeitet werden.")}}
 async function save(){if(!image||working)return;setWorking(true);setError(null);try{const session=await ensureAnonymousSession();const location=await getLocation();const response=await fetch("/api/ideas/capture",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({text:note.trim(),imageDataUrl:image,inputType:"camera",...location})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Speichern fehlgeschlagen.");router.push(`/ideas/${result.idea.id}`)}catch(e){setError(e instanceof Error?e.message:"Verarbeitung fehlgeschlagen.");setWorking(false)}}
 return <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf8] text-[#111]">
   <header className="grid grid-cols-3 items-center px-5 py-5"><Link href="/" className="flex h-9 w-9 items-center justify-center"><X className="h-5 w-5"/></Link><h1 className="text-center text-[15px] font-semibold">Kamera</h1><div/></header>
   <section className="px-5">
     <button onClick={()=>inputRef.current?.click()} className="relative flex h-[360px] w-full items-center justify-center overflow-hidden rounded-[24px] bg-[#e7ebe3]">{image?<img src={image} alt="Vorschau" className="h-full w-full object-cover"/>:<div className="flex flex-col items-center text-black/55"><Camera className="h-12 w-12"/><span className="mt-3 text-[14px]">Foto aufnehmen oder auswählen</span></div>}</button>
     <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>void choose(e.target.files?.[0])}/>
     <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional: Was möchtest du dazu merken?" className="mt-4 min-h-[96px] w-full resize-none rounded-[18px] border border-black/5 bg-white p-4 text-[14px] outline-none shadow-sm"/>
     {error&&<p className="mt-3 text-[12px] text-[#b94b43]">{error}</p>}
     <div className="mt-5 flex gap-3"><button onClick={()=>inputRef.current?.click()} className="flex h-12 w-14 items-center justify-center rounded-full bg-white shadow"><ImagePlus className="h-5 w-5"/></button><button onClick={save} disabled={!image||working} className="flex h-12 flex-1 items-center justify-center rounded-full bg-black font-semibold text-white disabled:opacity-40">{working?<><LoaderCircle className="mr-2 h-5 w-5 animate-spin"/>Kipu kümmert sich…</>:"Merken"}</button></div>
   </section>
   <p className="mt-auto px-8 pb-8 pt-8 text-center text-[11px] leading-5 text-black/40">Kipu versteht das Foto mit Vision und entscheidet selbst, ob dein Foto oder ein recherchiertes Bild die Erinnerung besser repräsentiert.</p>
 </main>
}
