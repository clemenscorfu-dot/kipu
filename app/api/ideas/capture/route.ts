import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const factSchema = { type:"object", additionalProperties:false, properties:{ label:{type:"string"}, value:{type:"string"} }, required:["label","value"] };
const ideaSchema = { type:"object", additionalProperties:false, properties:{
 title:{type:"string"}, summary:{type:"string"}, tags:{type:"array",items:{type:"string"},maxItems:3}, people:{type:"array",items:{type:"string"},maxItems:8}, explicit_location:{anyOf:[{type:"string"},{type:"null"}]}, location_mentioned:{type:"boolean"}, location_is_subject:{type:"boolean"}, category:{type:"string"}, entity_type:{anyOf:[{type:"string"},{type:"null"}]}, entity_name:{anyOf:[{type:"string"},{type:"null"}]}, research_used:{type:"boolean"}, research_summary:{anyOf:[{type:"string"},{type:"null"}]}, facts:{type:"array",items:factSchema,maxItems:5}, image_url:{anyOf:[{type:"string"},{type:"null"}]}
}, required:["title","summary","tags","people","explicit_location","location_mentioned","location_is_subject","category","entity_type","entity_name","research_used","research_summary","facts","image_url"] };

type CaptureBody={text?:string;latitude?:number|null;longitude?:number|null};
function responseText(p:any){if(typeof p?.output_text==="string")return p.output_text;for(const o of p?.output??[])for(const c of o?.content??[])if(typeof c?.text==="string")return c.text;return null}
function sources(p:any){const out:Array<{title?:string;url:string}>=[];const seen=new Set<string>();for(const o of p?.output??[]){if(o?.type!=="web_search_call")continue;for(const s of o?.action?.sources??[]){if(!s?.url||seen.has(s.url))continue;seen.add(s.url);out.push({title:s.title,url:s.url})}}return out.slice(0,6)}
function isbnFromFacts(facts:Array<{label:string;value:string}>){const f=facts.find(x=>x.label.toLowerCase().includes("isbn"));const isbn=f?.value.replace(/[^0-9Xx]/g,"");return isbn&&isbn.length>=10?isbn:null}
async function resolveImage(category:string,facts:Array<{label:string;value:string}>,aiUrl:string|null){if(category!=="Buch")return aiUrl;const isbn=isbnFromFacts(facts);if(!isbn)return aiUrl;try{const r=await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`,{cache:"no-store"});if(r.ok){const j=await r.json();const img=j?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail||j?.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail;if(img)return String(img).replace(/^http:/,"https:").replace("zoom=1","zoom=2")}}catch{}return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`}

export async function POST(request:Request){try{
 const body=(await request.json()) as CaptureBody;const text=body.text?.trim();if(!text)return NextResponse.json({error:"Text fehlt."},{status:400});
 const token=request.headers.get("authorization")?.replace(/^Bearer /,"");if(!token)return NextResponse.json({error:"Nicht angemeldet."},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,openAiKey=process.env.OPENAI_API_KEY;if(!url||!key||!openAiKey)return NextResponse.json({error:"Server-Konfiguration unvollständig."},{status:500});
 const supabase=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});const {data:userData,error:userError}=await supabase.auth.getUser(token);if(userError||!userData.user)return NextResponse.json({error:"Session ungültig."},{status:401});
 const ai=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openAiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",tools:[{type:"web_search"}],include:["web_search_call.action.sources"],input:[{role:"system",content:[{type:"input_text",text:`Du bist Kipu, ein persönliches Fundstück-Gedächtnis. Aus minimalem Input machst du einen guten Gedächtnisanker.
- Recherchiere öffentlich identifizierbare Dinge wie Bücher, Restaurants, Produkte, Filme, Orte gezielt im Web.
- Maximal 3 wirklich hilfreiche Tags. Bei Büchern ideal: Buch, Kernthema, Autor.
- summary kurz und erinnerungsorientiert.
- research_summary 1-2 saubere Sätze OHNE Markdown-Links, URLs oder Quellenklammern.
- facts nur 2-5 nützliche Fakten. Bei Büchern soll eine belastbare ISBN der konkreten Ausgabe wenn möglich enthalten sein.
- image_url nur als direkte HTTPS-Bild-URL, wenn belastbar; bei Büchern wird serverseitig zusätzlich über ISBN und Buchdatenbanken ein Cover aufgelöst.
- GPS ist nur Aufnahmekontext. explicit_location ausschließlich aus dem Originalinput.
- location_mentioned=true nur wenn im Original ein Ort genannt/beschrieben ist.
- location_is_subject=true nur wenn der Ort tatsächlich zum Fundstück gehört. Bei Buch/Produkt/Idee normalerweise false.
- Erfinde keine persönlichen Fakten oder Orte.`}]},{role:"user",content:[{type:"input_text",text:`Persönlicher Input:\n${text}`}]}],text:{format:{type:"json_schema",name:"kipu_idea",strict:true,schema:ideaSchema}}})});
 if(!ai.ok){console.error("OpenAI",ai.status,await ai.text());return NextResponse.json({error:"KI-Verarbeitung fehlgeschlagen."},{status:502})}
 const payload=await ai.json();const raw=responseText(payload);if(!raw)return NextResponse.json({error:"KI-Antwort war leer."},{status:502});const s=JSON.parse(raw);const hasCoords=Number.isFinite(body.latitude)&&Number.isFinite(body.longitude);const subjectLocation=s.location_mentioned&&s.location_is_subject?s.explicit_location:null;const imageUrl=await resolveImage(s.category,s.facts,s.image_url);
 const {data:idea,error:insertError}=await supabase.from("ideas").insert({user_id:userData.user.id,input_type:"text",original_input:text,title:s.title,summary:s.summary,tags:s.tags,people:s.people,latitude:hasCoords?body.latitude:null,longitude:hasCoords?body.longitude:null,location_label:subjectLocation,location_source:subjectLocation?"extracted":hasCoords?"device":null,enrichment:{category:s.category,entity_type:s.entity_type,entity_name:s.entity_name,research_used:s.research_used,research_summary:s.research_summary,facts:s.facts,sources:sources(payload),image_url:imageUrl,capture_location:hasCoords?{latitude:body.latitude,longitude:body.longitude}:null,model:"gpt-5.6-luna",enriched_at:new Date().toISOString()}}).select("*").single();if(insertError){console.error(insertError);return NextResponse.json({error:"Speichern in Supabase fehlgeschlagen.",detail:insertError.message},{status:500})}return NextResponse.json({idea});
}catch(e){console.error(e);return NextResponse.json({error:"Unerwarteter Fehler."},{status:500})}}
