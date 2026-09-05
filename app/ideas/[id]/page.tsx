"use client";

import {ArrowLeft,Check,ChevronDown,Copy,ExternalLink,Info,LoaderCircle,Map,MapPin,Pencil,Share2,Trash2} from "lucide-react";
import Link from "next/link";
import {useParams,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {ensureAnonymousSession,getSupabaseBrowserClient} from "@/lib/supabase-browser";
import {readIdeaPreview} from "@/lib/kipu-idea-preview";
import {KipuThinking} from "@/components/kipu-thinking";

type Enrichment={
  category?:string;
  facts?:Array<{label:string;value:string}>;
  sources?:Array<{title?:string;url:string}>;
  useful_links?:Array<{label:string;url:string}>;
  subject_coordinates?:{latitude:number;longitude:number}|null;
  image_url?:string|null;
  image_fit?:"cover"|"contain";
  processing_status?:"pending"|"processing"|"ready"|"failed"|"merged";
  merged_into_idea_id?:string;
  duplicate_of_idea_id?:string|null;
  duplicate_confidence?:"none"|"possible"|"high";
  duplicate_reason?:string|null;
  duplicate_review_status?:"kept"|"dismissed";
  duplicate_reviewed_at?:string;
};
type StoredIdea={id:string;original_input:string;title:string;summary:string|null;tags:string[];location_label:string|null;enrichment:Enrichment;created_at:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

function captureLocationExplicit(text:string){const value=text.toLocaleLowerCase("de-CH").replace(/\s+/g," ").trim();return /\b(hier|genau hier|an diesem ort|an dieser stelle|diese stelle|dieser ort|da wo ich bin|dort wo ich bin|mein aktueller standort)\b/i.test(value)||/\b(dies(?:e|er|es)\s+[^.!?]{0,35}\s+hier)\b/i.test(value)}
function inputMentionsLocation(text:string,location:string|null){if(!location)return false;const t=text.toLocaleLowerCase("de-CH");return location.toLocaleLowerCase("de-CH").split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=3).some(w=>t.includes(w))}
function normalizedText(text:string){return text.toLocaleLowerCase("de-CH").normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}

export default function IdeaDetailPage(){
  const{id}=useParams<{id:string}>(),router=useRouter();
  const[stored,setStored]=useState<StoredIdea|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[more,setMore]=useState(false),[imgFailed,setImgFailed]=useState(false),[deleting,setDeleting]=useState(false),[duplicateTitle,setDuplicateTitle]=useState<string|null>(null),[reviewingDuplicate,setReviewingDuplicate]=useState(false);

  useEffect(()=>{
    if(!uuid.test(id)){setError("Idee nicht gefunden.");setLoading(false);return}
    const preview=readIdeaPreview<StoredIdea>(id);if(preview){setStored(preview);setLoading(false)}
    let active=true,timer:ReturnType<typeof setInterval>|null=null;
    async function load(){try{
      await ensureAnonymousSession();
      const{data,error}=await getSupabaseBrowserClient().from("ideas").select("id,original_input,title,summary,tags,location_label,enrichment,created_at").eq("id",id).maybeSingle();
      if(error)throw error;
      if(!data){if(active){setStored(null);setError("Idee nicht gefunden.");setLoading(false)}return}
      const next=data as StoredIdea;
      if(next.enrichment?.processing_status==="merged"&&next.enrichment.merged_into_idea_id){router.replace(`/ideas/${next.enrichment.merged_into_idea_id}`);return}
      if(active){setStored(next);setError(null);const s=next.enrichment?.processing_status;if((s==="pending"||s==="processing")&&!timer)timer=setInterval(()=>void load(),3000);if(s!=="pending"&&s!=="processing"&&timer){clearInterval(timer);timer=null}}
    }catch(e){if(active&&!preview)setError(e instanceof Error?e.message:"Idee konnte nicht geladen werden.")}finally{if(active)setLoading(false)}}
    void load();return()=>{active=false;if(timer)clearInterval(timer)};
  },[id,router]);

  useEffect(()=>{
    const duplicateId=stored?.enrichment?.duplicate_of_idea_id,confidence=stored?.enrichment?.duplicate_confidence,reviewed=stored?.enrichment?.duplicate_review_status;
    if(!duplicateId||duplicateId===id||reviewed||confidence==="none"){setDuplicateTitle(null);return}
    let active=true;void(async()=>{const{data}=await (getSupabaseBrowserClient().from("ideas") as any).select("title").eq("id",duplicateId).maybeSingle();if(active)setDuplicateTitle((data as {title?:string}|null)?.title??null)})();return()=>{active=false};
  },[stored?.enrichment?.duplicate_of_idea_id,stored?.enrichment?.duplicate_confidence,stored?.enrichment?.duplicate_review_status,id]);

  async function keepDuplicate(){if(!stored||reviewingDuplicate)return;setReviewingDuplicate(true);const nextEnrichment={...stored.enrichment,duplicate_review_status:"kept" as const,duplicate_reviewed_at:new Date().toISOString()};const{error}=await (getSupabaseBrowserClient().from("ideas") as any).update({enrichment:nextEnrichment}).eq("id",stored.id);if(error){setReviewingDuplicate(false);return}setStored({...stored,enrichment:nextEnrichment});setReviewingDuplicate(false)}
  async function remove(){if(!uuid.test(id)||!confirm("Diese Idee wirklich löschen?"))return;setDeleting(true);const{error}=await getSupabaseBrowserClient().from("ideas").delete().eq("id",id);if(error){alert("Löschen fehlgeschlagen: "+error.message);setDeleting(false);return}router.replace("/ideas")}
  async function share(title:string,summary:string|null){try{if(navigator.share)await navigator.share({title,text:summary||title,url:location.href});else await navigator.clipboard.writeText(location.href)}catch{}}

  if(loading)return <main className="mx-auto flex min-h-[100dvh] max-w-[430px] items-center justify-center bg-[#fbfaf7]"><LoaderCircle className="animate-spin text-[#79aa36]"/></main>;
  if(error||!stored)return <main className="mx-auto min-h-[100dvh] max-w-[430px] bg-[#fbfaf7] p-4 text-[#111]"><Link href="/ideas" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,.06)]"><ArrowLeft className="h-4 w-4"/></Link><p className="mt-6 text-sm">{error||"Idee nicht gefunden."}</p></main>;

  const title=stored.title||"Idee",summary=stored.summary,original=stored.original_input||"",tags=(stored.tags??[]).slice(0,3),rawLocation=stored.location_label??null,enrichment=stored.enrichment??{},status=enrichment.processing_status,processing=status==="pending"||status==="processing",failed=status==="failed",category=enrichment.category,facts=enrichment.facts??[],sources=enrichment.sources??[],links=enrichment.useful_links??[],image=enrichment.image_url,fit=enrichment.image_fit??"cover",created=stored.created_at?new Date(stored.created_at).toLocaleString("de-CH",{dateStyle:"short",timeStyle:"short"}):"",emoji=category==="Restaurant"?"🍽️":category==="Produkt"?"📦":category==="Buch"?"📚":category==="Idee"?"💡":"📌";
  const locationLabel=(enrichment.subject_coordinates||captureLocationExplicit(original)||inputMentionsLocation(original,rawLocation))?rawLocation:null,primaryLinks=links.filter(l=>!l.url.includes("google.com/maps")).slice(0,2),mapLink=links.find(l=>l.url.includes("google.com/maps")),hiddenSources=sources.filter(s=>!links.some(l=>l.url===s.url)).slice(0,4),hasDetails=Boolean(summary||facts.length||primaryLinks.length||hiddenSources.length),duplicateId=enrichment.duplicate_of_idea_id,duplicateConfidence=enrichment.duplicate_confidence,showDuplicate=Boolean(!processing&&!failed&&!enrichment.duplicate_review_status&&duplicateId&&duplicateId!==id&&(duplicateConfidence==="high"||duplicateConfidence==="possible")),showOriginal=Boolean(original&&normalizedText(original)!==normalizedText(title));

  return <main className="mx-auto min-h-[100dvh] w-full max-w-[430px] bg-[#fbfaf7] text-[#111]">
    <header className="flex items-center justify-between px-4 py-4"><div className="flex items-center gap-3"><Link href="/ideas" aria-label="Zurück" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,.06)]"><ArrowLeft className="h-4 w-4"/></Link><span className="text-[12px] font-medium text-black/45">Idee</span></div><div className="flex items-center gap-2">{!processing&&<Link prefetch={false} href={`/ideas/${id}/edit`} aria-label="Bearbeiten" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,.05)]"><Pencil className="h-4 w-4"/></Link>}<button onClick={()=>void share(title,summary)} aria-label="Teilen" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,.05)]"><Share2 className="h-4 w-4"/></button><button onClick={remove} disabled={deleting} aria-label="Löschen" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#b94b43] shadow-[0_4px_14px_rgba(0,0,0,.05)]">{deleting?<LoaderCircle className="h-4 w-4 animate-spin"/>:<Trash2 className="h-4 w-4"/>}</button></div></header>

    <div className="relative mx-4 flex h-[220px] items-center justify-center overflow-hidden rounded-[24px] bg-[#e5eadf]">{processing?<div className="flex -translate-y-2 flex-col items-center"><KipuThinking label="Kipu macht im Hintergrund weiter"/><p className="-mt-1 max-w-[280px] text-center text-[12px] font-medium leading-4 text-[#6562a7]">Du kannst die App weiter benutzen oder schliessen.</p></div>:image&&!imgFailed?<img src={image} alt={title} onError={()=>setImgFailed(true)} decoding="async" className={`h-full w-full ${fit==="contain"?"object-contain p-4":"object-cover"}`} referrerPolicy="no-referrer"/>:<span className="text-[58px]">{emoji}</span>}{!processing&&!failed&&<Link prefetch={false} href={`/ideas/${id}/edit?focus=image`} aria-label="Bild bearbeiten" className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow"><Pencil className="h-4 w-4"/></Link>}</div>

    <section className="px-4 pb-8 pt-5">
      {failed&&<div className="mb-4 rounded-[14px] bg-[#fff2e8] px-4 py-3 text-[11px] text-[#8a5b31]">Gespeichert · Aufbereitung konnte noch nicht abgeschlossen werden.</div>}
      <h1 className="break-words text-[25px] font-semibold leading-[1.12] tracking-[-.025em]">{title}</h1>
      {!showOriginal&&created&&<p className="mt-2 text-[10px] text-black/35">{created}</p>}
      {locationLabel&&<div className="mt-2 flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-[#79aa36]"/><p className="min-w-0 flex-1 text-[11px] text-black/50">{locationLabel}</p>{mapLink&&<a href={mapLink.url} target="_blank" rel="noreferrer" aria-label="Auf Karte ansehen" title="Auf Karte ansehen" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe8d5] bg-white text-[#79aa36] shadow-[0_3px_10px_rgba(0,0,0,.04)]"><Map className="h-4 w-4"/></a>}</div>}
      <div className="mt-3 flex flex-wrap gap-2">{tags.map(t=><span key={t} className="rounded-full bg-[#f0efeb] px-3 py-1.5 text-[10px] text-black/60">{t}</span>)}</div>

      {showDuplicate&&<div className={`mt-4 rounded-[18px] border p-4 ${duplicateConfidence==="high"?"border-[#e7d9ad] bg-[#fff9e8]":"border-[#e4e1d8] bg-[#f6f4ee]"}`}><div className="flex gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${duplicateConfidence==="high"?"bg-[#f0dfaa] text-[#8a6b1f]":"bg-white text-black/45"}`}><Copy className="h-4 w-4"/></div><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold">{duplicateConfidence==="high"?"Scheint schon gespeichert zu sein":"Ist das vielleicht dasselbe?"}</p><p className="mt-1 text-[10px] leading-4 text-black/48">{duplicateTitle?<>{duplicateConfidence==="high"?"Kipu hat eine ähnliche Idee gefunden: ":"Kipu hat eine möglicherweise passende Idee gefunden: "}<span className="font-medium text-black/65">{duplicateTitle}</span></>:duplicateConfidence==="high"?"Kipu hat eine bestehende Idee gefunden, die dieselbe Sache meinen könnte.":"Kipu hat eine Idee gefunden, die möglicherweise dieselbe Sache meint."}</p></div></div><div className="mt-3 grid grid-cols-2 gap-2"><Link prefetch={false} href={`/ideas/${duplicateId}`} className="flex items-center justify-center rounded-full bg-black px-3 py-2.5 text-[10px] font-semibold text-white">Bestehende öffnen</Link><button onClick={()=>void keepDuplicate()} disabled={reviewingDuplicate} className="flex items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2.5 text-[10px] font-semibold disabled:opacity-50">{reviewingDuplicate?<LoaderCircle className="h-3.5 w-3.5 animate-spin"/>:<Check className="h-3.5 w-3.5"/>}Trotzdem behalten</button></div><p className="mt-2 text-[9px] leading-3.5 text-black/35">Beide Ideen bleiben bestehen, bis du selbst etwas löschst.</p></div>}

      {showOriginal&&<div className="kipu-card mt-4 p-4"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-black/35">Warum gespeichert</p>{!processing&&<Link prefetch={false} href={`/ideas/${id}/edit`} className="text-black/28"><Pencil className="h-3.5 w-3.5"/></Link>}</div><p className="mt-2 break-words text-[13px] leading-5">{original}</p>{created&&<p className="mt-2 text-[9px] text-black/35">{created}</p>}</div>}

      {!processing&&!failed&&hasDetails&&<div className="kipu-card mt-3 p-4"><div className="flex items-center justify-between"><h2 className="text-[13px] font-semibold">Kurz dazu</h2><Link prefetch={false} href={`/ideas/${id}/edit`} aria-label="Details bearbeiten" className="text-black/28"><Pencil className="h-3.5 w-3.5"/></Link></div>{summary&&<p className="mt-2 text-[13px] leading-5 text-black/75">{summary}</p>}{facts.length>0&&<dl className="mt-3 divide-y divide-black/5">{facts.slice(0,5).map((f,i)=><div key={i} className="grid grid-cols-[88px_1fr] gap-3 py-2.5 text-[11px]"><dt className="text-black/40">{f.label}</dt><dd className="font-medium leading-4">{f.value}</dd></div>)}</dl>}{primaryLinks.length>0&&<div className="mt-4 flex flex-wrap gap-2">{primaryLinks.map((l,i)=><a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#eef5e5] px-3 py-2 text-[10px] font-medium text-[#65942c]"><ExternalLink className="h-3.5 w-3.5"/>{l.label}</a>)}</div>}{hiddenSources.length>0&&<><button onClick={()=>setMore(!more)} className="mt-4 flex items-center gap-1.5 text-[10px] text-black/45"><Info className="h-3.5 w-3.5"/>Quellen & Details<ChevronDown className={`h-3.5 w-3.5 transition ${more?"rotate-180":""}`}/></button>{more&&<div className="mt-3 border-t border-black/5 pt-2">{hiddenSources.map((s,i)=><a key={i} href={s.url} target="_blank" rel="noreferrer" className="mt-2 flex gap-2 text-[10px] leading-4 text-black/50"><ExternalLink className="mt-.5 h-3 w-3 shrink-0"/>{s.title||s.url}</a>)}</div>}</>}</div>}
    </section>
  </main>;
}