"use client";

import Link from "next/link";
import {ArrowLeft,CheckCircle2,LoaderCircle,Play,RefreshCw,XCircle} from "lucide-react";
import {useCallback,useEffect,useRef,useState} from "react";
import {ensureAnonymousSession,refreshAnonymousSession} from "@/lib/supabase-browser";

type Assertion={name:string;pass:boolean;actual?:unknown;expected?:unknown};
type EvalResult={id:string;status:"pass"|"fail"|"error";duration_ms:number;assertions:Assertion[];error?:string};
type EvalRun={status:"queued"|"running"|"completed"|"failed";total:number;completed:number;passed:number;failed:number;pass_rate:number;current?:string;results:EvalResult[];error?:string};

export default function IntentEvalPage(){
  const [runId,setRunId]=useState(""),[run,setRun]=useState<EvalRun|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const runIdRef=useRef("");
  const active=run?.status==="queued"||run?.status==="running";

  const request=useCallback(async(method:"GET"|"POST",id?:string)=>{const session=method==="POST"?await refreshAnonymousSession():await ensureAnonymousSession();const base=id?`/api/eval/run?id=${encodeURIComponent(id)}`:"/api/eval/run";const r=await fetch(`${base}${base.includes("?")?"&":"?"}_ts=${Date.now()}`,{method,cache:"no-store",headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json","Cache-Control":"no-cache, no-store"},body:method==="POST"?JSON.stringify({mode:"intents"}):undefined});const d=await r.json();if(!r.ok)throw new Error(d.error??`Eval ${r.status}`);return d},[]);
  const refresh=useCallback(async(id?:string)=>{if(!id)return;try{const d=await request("GET",id);setRun(d.run??null)}catch(e){setError(e instanceof Error?e.message:"Status konnte nicht geladen werden")}},[request]);

  useEffect(()=>{if(!runId)return;runIdRef.current=runId;let stop=false,t:number|undefined;const poll=async()=>{if(stop)return;await refresh(runIdRef.current);if(!stop)t=window.setTimeout(poll,2000)};t=window.setTimeout(poll,1000);return()=>{stop=true;if(t)window.clearTimeout(t)}},[runId,refresh]);

  async function start(){if(active)return;setBusy(true);setError("");try{const d=await request("POST");const id=String(d.run_id);runIdRef.current=id;setRunId(id);setRun(d.run);await refresh(id)}catch(e){setError(e instanceof Error?e.message:"Intent-Eval konnte nicht gestartet werden")}finally{setBusy(false)}}

  return <main className="mx-auto min-h-screen w-full max-w-[680px] bg-[#fbfaf7] px-4 pb-12 pt-4 text-[#111]">
    <div className="flex items-center gap-3"><Link href="/eval" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,.06)]"><ArrowLeft className="h-4 w-4"/></Link><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#74a18f]">Regression</p><h1 className="text-[22px] font-semibold">Intent-Eval</h1></div></div>
    <section className="mt-5 rounded-[22px] border border-[#e7e6e1] bg-white p-4"><p className="text-[12px] leading-5 text-black/55">Testet nur die drei zuvor fehlerhaften Fälle: <b>read</b>, <b>visit</b> und <b>buy</b>.</p><div className="mt-4 flex gap-2"><button disabled={busy||active} onClick={()=>void start()} className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#74a18f] px-4 py-3 text-[12px] font-semibold text-white disabled:opacity-50">{busy||active?<LoaderCircle className="h-4 w-4 animate-spin"/>:<Play className="h-4 w-4"/>}{active?`Läuft ${run?.completed??0}/3`:"Intent-Test starten (3)"}</button><button onClick={()=>void refresh(runIdRef.current)} disabled={!runId||busy} className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#e7e6e1]"><RefreshCw className="h-4 w-4"/></button></div>{error&&<p className="mt-2 text-[10px] text-[#b94b43]">{error}</p>}</section>
    {run&&<section className="mt-4 rounded-[22px] border border-[#e7e6e1] bg-white p-4"><div className="flex justify-between"><div><p className="text-[11px] text-black/45">Ergebnis</p><p className="text-[28px] font-semibold">{run.completed?`${run.pass_rate}%`:"…"}</p></div><p className="text-right text-[11px] text-black/50">{run.passed} bestanden · {run.failed} fehlgeschlagen<br/>{run.completed}/{run.total}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ecebe7]"><div className="h-full bg-[#74a18f]" style={{width:`${run.total?run.completed/run.total*100:0}%`}}/></div></section>}
    <section className="mt-4 space-y-2">{(run?.results??[]).map(r=><details key={r.id} open={r.status!=="pass"} className="rounded-[17px] border border-[#e8e7e2] bg-white px-3.5 py-3"><summary className="flex list-none items-center gap-2"><span className={r.status==="pass"?"text-[#74a18f]":"text-[#b94b43]"}>{r.status==="pass"?<CheckCircle2 className="h-4 w-4"/>:<XCircle className="h-4 w-4"/>}</span><span className="flex-1 text-[12px] font-semibold">{r.id}</span><span className="text-[10px] text-black/35">{(r.duration_ms/1000).toFixed(1)}s</span></summary><div className="mt-2 border-t border-[#efeee9] pt-2">{r.error?<p className="text-[10px] text-[#b94b43]">{r.error}</p>:r.assertions.map((a,i)=><p key={i} className="py-1 text-[10px]">{a.pass?"✅":"❌"} {a.name}{!a.pass?` — Ist: ${JSON.stringify(a.actual)} · Soll: ${JSON.stringify(a.expected)}`:""}</p>)}</div></details>)}</section>
  </main>
}
