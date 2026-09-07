"use client";

import Link from "next/link";
import {ArrowLeft,CheckCircle2,FlaskConical,LoaderCircle,Play,RefreshCw,XCircle} from "lucide-react";
import {useCallback,useEffect,useMemo,useState} from "react";
import goldenCases from "@/evals/golden-cases.json";
import {ensureAnonymousSession} from "@/lib/supabase-browser";

type EvalCase={id:string;area:string;eval_type:string;input:string;priority:"P0"|"P1"|"P2"};
type Assertion={name:string;pass:boolean;actual?:unknown;expected?:unknown};
type EvalResult={id:string;area:string;status:"pass"|"fail"|"error";duration_ms:number;assertions:Assertion[];error?:string};
type EvalRun={status:"queued"|"running"|"completed"|"failed";created_at:string;started_at?:string;finished_at?:string;total:number;completed:number;passed:number;failed:number;pass_rate:number;current?:string;results:EvalResult[];error?:string};

export default function EvalPage(){
  const [runId,setRunId]=useState(""),[run,setRun]=useState<EvalRun|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState("");
  const runnable=useMemo(()=>(goldenCases as EvalCase[]).filter(c=>c.eval_type==="capture"&&c.priority==="P0"),[]);
  const active=run?.status==="queued"||run?.status==="running";

  const request=useCallback(async(method:"GET"|"POST",id?:string)=>{const session=await ensureAnonymousSession(),url=id?`/api/eval/run?id=${encodeURIComponent(id)}`:"/api/eval/run",r=await fetch(url,{method,headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"}}),d=await r.json();if(!r.ok)throw new Error(d.error??`Eval ${r.status}`);return d},[]);
  const refresh=useCallback(async(id?:string)=>{try{setError("");const d=await request("GET",id||runId||undefined);if(d.run_id)setRunId(String(d.run_id));setRun(d.run??null)}catch(e){setError(e instanceof Error?e.message:"Status konnte nicht geladen werden")}finally{setBusy(false)}},[request,runId]);

  useEffect(()=>{void refresh()},[refresh]);
  useEffect(()=>{if(!active)return;const t=setInterval(()=>void refresh(runId),3000);return()=>clearInterval(t)},[active,refresh,runId]);

  async function start(){if(active)return;setBusy(true);setError("");try{const d=await request("POST");setRunId(String(d.run_id));setRun(d.run)}catch(e){setError(e instanceof Error?e.message:"Eval konnte nicht gestartet werden")}finally{setBusy(false)}}

  const results=run?.results??[],passed=run?.passed??0,failed=run?.failed??0,rate=run?.pass_rate??0;
  return <main className="mx-auto min-h-screen w-full max-w-[680px] bg-[#fbfaf7] px-4 pb-12 pt-4 text-[#111]">
    <div className="flex items-center gap-3"><Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,.06)]" aria-label="Zurück"><ArrowLeft className="h-4 w-4"/></Link><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#74a18f]">Intern</p><h1 className="text-[22px] font-semibold tracking-[-.025em]">Kipu MVP Eval</h1></div></div>

    <section className="mt-5 rounded-[22px] border border-[#e7e6e1] bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,.04)]"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#e8f2ed] text-[#74a18f]"><FlaskConical className="h-5 w-5"/></span><div><h2 className="text-[15px] font-semibold">Serverseitiger Live-Eval</h2><p className="mt-1 text-[11px] leading-4 text-black/50">Nach dem Start läuft der Test auf dem Server weiter. Du kannst Kipu schliessen oder das Handy sperren und später hierher zurückkehren.</p></div></div>
      <div className="mt-4 flex gap-2"><button disabled={busy||active} onClick={()=>void start()} className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#74a18f] px-4 py-3 text-[12px] font-semibold text-white disabled:opacity-50">{busy||active?<LoaderCircle className="h-4 w-4 animate-spin"/>:<Play className="h-4 w-4"/>}{active?`Läuft ${run?.completed??0}/${run?.total??runnable.length}`:`P0 Live-Eval starten (${runnable.length})`}</button><button onClick={()=>void refresh(runId)} disabled={busy} aria-label="Status aktualisieren" className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#e7e6e1] bg-white text-black/45 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${busy?"animate-spin":""}`}/></button></div>
      {runId&&<p className="mt-2 break-all text-[9px] text-black/30">Run {runId}</p>}{error&&<p className="mt-2 text-[10px] text-[#b94b43]">{error}</p>}
    </section>

    {run&&<section className="mt-4 rounded-[22px] border border-[#e7e6e1] bg-white p-4"><div className="flex items-end justify-between"><div><p className="text-[11px] text-black/45">Gesamtergebnis</p><p className="mt-0.5 text-[28px] font-semibold tracking-[-.04em]">{run.completed?`${rate}%`:"…"}</p></div><p className="text-right text-[11px] font-medium text-black/50">{passed} bestanden · {failed} nicht bestanden<br/>{run.completed}/{run.total}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ecebe7]"><div className="h-full bg-[#74a18f] transition-all" style={{width:`${run.total?Math.round(run.completed/run.total*100):0}%`}}/></div><div className="mt-2 flex items-center justify-between text-[10px] text-black/40"><span>{run.status==="completed"?"Abgeschlossen":run.status==="failed"?"Abgebrochen":run.status==="running"?"Läuft auf dem Server":"In Warteschlange"}</span>{run.current&&<span className="max-w-[55%] truncate">{run.current}</span>}</div>{run.error&&<p className="mt-2 text-[10px] text-[#b94b43]">{run.error}</p>}</section>}

    <section className="mt-4 space-y-2">{results.map(r=><details key={r.id} className="rounded-[17px] border border-[#e8e7e2] bg-white px-3.5 py-3"><summary className="flex cursor-pointer list-none items-center gap-2"><span className={r.status==="pass"?"text-[#74a18f]":"text-[#b94b43]"}>{r.status==="pass"?<CheckCircle2 className="h-4 w-4"/>:<XCircle className="h-4 w-4"/>}</span><span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{r.id}</span><span className="text-[10px] text-black/35">{(r.duration_ms/1000).toFixed(1)}s</span></summary><div className="mt-2 border-t border-[#efeee9] pt-2">{r.error?<p className="text-[10px] text-[#b94b43]">{r.error}</p>:r.assertions.map((a,i)=><div key={i} className="flex items-start gap-2 py-1 text-[10px]"><span>{a.pass?"✅":"❌"}</span><div><p>{a.name}</p>{!a.pass&&<p className="mt-0.5 break-all text-black/40">Ist: {JSON.stringify(a.actual)} · Soll: {JSON.stringify(a.expected)}</p>}</div></div>)}</div></details>)}</section>

    {!run&&!busy&&<p className="mt-6 text-center text-[10px] leading-4 text-black/35">Noch kein persistierter Eval-Run vorhanden.</p>}
  </main>
}
