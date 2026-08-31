"use client";

import { LoaderCircle, Mic, Square, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAnonymousSession } from "@/lib/supabase-browser";

const bars = [22,36,48,30,58,42,66,32,52,40,62,28,46,34,56,38,24];

function getLocation(): Promise<{latitude:number|null;longitude:number|null}> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ latitude:null, longitude:null });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude:p.coords.latitude, longitude:p.coords.longitude }),
      () => resolve({ latitude:null, longitude:null }),
      { enableHighAccuracy:true, timeout:6000, maximumAge:60000 },
    );
  });
}

export default function VoicePage() {
  const router = useRouter();
  const recorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const [seconds,setSeconds] = useState(0);
  const [recording,setRecording] = useState(false);
  const [working,setWorking] = useState(false);
  const [transcript,setTranscript] = useState("");
  const [error,setError] = useState<string|null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); recorderRef.current?.stream.getTracks().forEach(t=>t.stop()); }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const preferred = ["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(t => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
      const recorder = preferred ? new MediaRecorder(stream,{mimeType:preferred}) : new MediaRecorder(stream);
      chunksRef.current=[];
      recorder.ondataavailable=(e)=>{if(e.data.size)chunksRef.current.push(e.data)};
      recorder.onstop=()=>void processRecording(recorder.mimeType || preferred || "audio/webm");
      recorder.start(250);
      recorderRef.current=recorder;
      setSeconds(0);setRecording(true);
      timerRef.current=setInterval(()=>setSeconds(s=>s+1),1000);
    } catch { setError("Mikrofon konnte nicht gestartet werden."); }
  }

  function stop() {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
    recorderRef.current.stream.getTracks().forEach(t=>t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);setWorking(true);
  }

  async function processRecording(mimeType:string) {
    try {
      const ext = mimeType.includes("mp4") ? "m4a" : "webm";
      const blob = new Blob(chunksRef.current,{type:mimeType});
      const form = new FormData();form.append("audio",new File([blob],`kipu.${ext}`,{type:mimeType}));
      const transcribe = await fetch("/api/transcribe",{method:"POST",body:form});
      const transcribed = await transcribe.json();
      if(!transcribe.ok) throw new Error(transcribed.error||"Transkription fehlgeschlagen.");
      setTranscript(transcribed.text);
      const session = await ensureAnonymousSession();
      const location = await getLocation();
      const capture = await fetch("/api/ideas/capture",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({text:transcribed.text,inputType:"voice",...location})});
      const result=await capture.json();if(!capture.ok)throw new Error(result.error||"Speichern fehlgeschlagen.");
      router.push(`/ideas/${result.idea.id}`);
    } catch(e) { setError(e instanceof Error?e.message:"Verarbeitung fehlgeschlagen.");setWorking(false); }
  }

  const mm=String(Math.floor(seconds/60)).padStart(2,"0"),ss=String(seconds%60).padStart(2,"0");
  return <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fbfaf8] px-6 pb-9 pt-5 text-[#111]">
    <header className="grid grid-cols-3 items-center"><Link href="/" className="flex h-9 w-9 items-center justify-center"><X className="h-5 w-5"/></Link><h1 className="text-center text-[15px] font-semibold">Sprechen</h1><div/></header>
    <section className="flex flex-1 flex-col items-center pt-16 text-center">
      <div className={`relative flex h-[188px] w-[188px] items-center justify-center rounded-full ${recording?"bg-[#eceaff]":"bg-[#f0efff]"}`}><div className="absolute inset-[17px] rounded-full bg-[#e9e7ff]"/><div className="relative flex h-[112px] w-[112px] items-center justify-center rounded-full bg-[#f5f4ff]">{!recording&&!working?<Mic className="h-12 w-12 text-[#7d83f6]"/>:<div className="flex h-[76px] items-center gap-[4px] text-[#7d83f6]">{bars.map((h,i)=><span key={i} className={`w-[3px] rounded-full bg-current ${recording?"animate-pulse":""}`} style={{height:h}}/>)}</div>}</div></div>
      <div className="mt-8 text-[31px] font-medium">{mm}:{ss}</div>
      <p className="mt-5 min-h-[52px] max-w-[300px] text-[15px] leading-6 text-[#242424]">{working?(transcript||"Ich transkribiere und kümmere mich darum…"):recording?"Sprich einfach frei. Kipu kümmert sich danach um den Rest.":"Tippe auf das Mikrofon und erzähl, was du dir merken möchtest."}</p>
      {error&&<p className="mt-3 text-[12px] text-[#b94b43]">{error}</p>}
      {working?<div className="mt-12 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white"><LoaderCircle className="h-6 w-6 animate-spin"/></div>:recording?<button onClick={stop} className="mt-12 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white"><Square className="h-5 w-5 fill-white"/></button>:<button onClick={start} className="mt-12 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white"><Mic className="h-6 w-6"/></button>}
    </section>
  </main>;
}
