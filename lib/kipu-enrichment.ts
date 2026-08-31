import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { kipuFunctionTools, runKipuFunctionTool } from "@/lib/kipu-agent-tools";

const factSchema={type:"object",additionalProperties:false,properties:{label:{type:"string"},value:{type:"string"}},required:["label","value"]};
const linkSchema={type:"object",additionalProperties:false,properties:{label:{type:"string"},url:{type:"string"}},required:["label","url"]};
const memorySchema={type:"object",additionalProperties:false,properties:{title:{type:"string"},summary:{type:"string"},tags:{type:"array",items:{type:"string"},maxItems:3},people:{type:"array",items:{type:"string"},maxItems:8},category:{type:"string"},assigned_category_id:{anyOf:[{type:"string"},{type:"null"}]},subject_location:{anyOf:[{type:"string"},{type:"null"}]},subject_latitude:{anyOf:[{type:"number"},{type:"null"}]},subject_longitude:{anyOf:[{type:"number"},{type:"null"}]},subject_location_is_from_user:{type:"boolean"},facts:{type:"array",items:factSchema,maxItems:5},useful_links:{type:"array",items:linkSchema,maxItems:3},representative_image_url:{anyOf:[{type:"string"},{type:"null"}]},use_input_image:{type:"boolean"},representative_image_fit:{type:"string",enum:["cover","contain"]},image_reason:{type:"string"},related_idea_ids:{type:"array",items:{type:"string"},maxItems:5}},required:["title","summary","tags","people","category","assigned_category_id","subject_location","subject_latitude","subject_longitude","subject_location_is_from_user","facts","useful_links","representative_image_url","use_input_image","representative_image_fit","image_reason","related_idea_ids"]};

type Source={title?:string;url:string};
type AgentResponse={id?:string;output_text?:string;output?:Array<Record<string,any>>};
export type EnrichIdeaPayload={ideaId:string;userId:string;accessToken:string};

function extractResponseText(payload:AgentResponse){if(typeof payload.output_text==="string"&&payload.output_text.trim())return payload.output_text;for(const output of payload.output??[])for(const content of output.content??[])if(typeof content?.text==="string"&&content.text.trim())return content.text;return null}
function extractSources(payload:AgentResponse){const sources:Source[]=[];for(const output of payload.output??[]){if(output.type!=="web_search_call")continue;for(const source of output.action?.sources??[])if(source?.url)sources.push({title:source.title,url:source.url})}return sources}
function cleanGeneratedText(value:string){return value.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,"$1").replace(/\((?:https?:\/\/[^)]+)\)/g,"").replace(/https?:\/\/\S+/g,"").replace(/\s{2,}/g," ").trim()}
function userLinksCaptureToSubject(text:string){const value=text.toLocaleLowerCase("de-CH").replace(/\s+/g," ").trim();if(!value)return false;return /\b(hier|genau hier|an diesem ort|an dieser stelle|diese stelle|dieser ort|da wo ich bin|dort wo ich bin|mein aktueller standort)\b/i.test(value)||/\b(dies(?:e|er|es)\s+[^.!?]{0,35}\s+hier)\b/i.test(value)}
async function callOpenAI(openAiKey:string,body:Record<string,unknown>){const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openAiKey}`,"Content-Type":"application/json"},body:JSON.stringify(body)});if(!response.ok){const detail=await response.text();console.error("Kipu agent OpenAI error",response.status,detail);throw new Error(`openai_${response.status}`)}return(await response.json()) as AgentResponse}
async function validateImage(url:string|null){if(!url)return null;try{const response=await fetch(url,{method:"GET",redirect:"follow",headers:{"User-Agent":"Mozilla/5.0 KipuBot/0.6","Accept":"image/*"},signal:AbortSignal.timeout(5000)});const type=response.headers.get("content-type")||"";if(!response.ok||!type.startsWith("image/"))return null;return response.url||url}catch{return null}}

async function runAgent(openAiKey:string,supabase:SupabaseClient,userId:string,text:string,imageDataUrl:string|null,latitude?:number|null,longitude?:number|null){
 const tools=[{type:"web_search"},...kipuFunctionTools];const allSources:Source[]=[];const hasCoords=Number.isFinite(latitude)&&Number.isFinite(longitude);const hasImage=Boolean(imageDataUrl?.startsWith("data:image/"));
 const system=`Du bist Kipu, ein persönlicher Memory-Agent. Aus knappem Text, Sprache oder einem Foto machst du eine später wirklich nützliche Erinnerung. Entscheide eigenständig, welche Tools du brauchst; keine Kategorie-Regelbäume.

Toolbox: Web Search, search_images, inspect_web_page, search_places, reverse_geocode, search_my_ideas, find_similar_ideas, get_categories, manage_categories.

Selbstorganisierende Kategorien:
- Rufe bei JEDEM Capture get_categories auf, bevor du assigned_category_id festlegst.
- Kategorien sind grobe stabile Navigation, Tags feine Details. Marken, einzelne Produkte, Personen oder Spezialthemen gehören normalerweise in Tags.
- Zielbild: ungefähr 5–12 Hauptkategorien, maximal 2 Ebenen. Bevorzuge bestehende passende Kategorien.
- Neue Hauptkategorie nur, wenn keine bestehende sinnvoll passt und der Bereich wiederverwendbar ist.
- Unterkategorien zurückhaltend, typischerweise erst bei mehreren passenden Erinnerungen im Elternbereich.
- Beim normalen Capture manage_categories nur mit action=create. Reorganisation übernimmt später der Curator.
- assigned_category_id muss real existieren; sonst null.

Qualitätsziel:
- Verstehe Bildinhalt direkt mit Vision. Nutzerfoto ist Originalevidenz und darf Hauptbild sein.
- Recherchiere öffentlich identifizierbare Entitäten proaktiv, aber kompakt.
- Nützliche Aktionslinks und verifizierte Preis-/Verfügbarkeits-/Öffnungs-/Bewertungsinfos sind wertvoll, nie erfinden.
- useful_links höchstens 3, bevorzuge offizielle oder direkt handlungsrelevante Seiten.
- Für verifizierte Subject-Koordinaten darfst du Google Maps verlinken.
- facts höchstens 5, keine URLs in summary/facts, maximal 3 Tags.
- Capture Location != Subject Location. Aufnahmeort ist nur Kontext; die App prüft eine behauptete Verbindung selbst.
- Ein recherchierter subject_location braucht echte Subject-Evidenz, idealerweise eigene Subject-Koordinaten aus search_places.
- Finale Antwort ausschließlich im Schema.`;
 const userText=text.trim()||"Der Nutzer möchte sich dieses Foto merken.";const contextText=hasCoords?`Nutzereingabe:\n${userText}\n\nAufnahmekontext GPS ${latitude}, ${longitude}; nicht automatisch Subject Location.`:`Nutzereingabe:\n${userText}\n\nKein GPS-Aufnahmekontext.`;const content:any[]=[{type:"input_text",text:contextText}];if(hasImage)content.push({type:"input_image",image_url:imageDataUrl,detail:"high"});
 let response=await callOpenAI(openAiKey,{model:"gpt-5.6-luna",tools,include:["web_search_call.action.sources"],input:[{role:"system",content:[{type:"input_text",text:system}]},{role:"user",content}],text:{format:{type:"json_schema",name:"kipu_memory",strict:true,schema:memorySchema}}});
 for(let step=0;step<12;step++){allSources.push(...extractSources(response));const calls=(response.output??[]).filter((item)=>item.type==="function_call");if(!calls.length)break;const outputs=[];for(const call of calls){let args:Record<string,unknown>={};try{args=JSON.parse(call.arguments??"{}")}catch{}const result=await runKipuFunctionTool(call.name,args,{supabase,userId,openAiKey});outputs.push({type:"function_call_output",call_id:call.call_id,output:JSON.stringify(result)})}response=await callOpenAI(openAiKey,{model:"gpt-5.6-luna",previous_response_id:response.id,tools,include:["web_search_call.action.sources"],input:outputs,text:{format:{type:"json_schema",name:"kipu_memory",strict:true,schema:memorySchema}}});}
 allSources.push(...extractSources(response));const raw=extractResponseText(response);if(!raw)throw new Error("agent_no_final_output");const memory=JSON.parse(raw) as any;memory.summary=cleanGeneratedText(memory.summary);memory.facts=(memory.facts??[]).map((f:any)=>({label:cleanGeneratedText(f.label),value:cleanGeneratedText(f.value)}));memory.useful_links=(memory.useful_links??[]).filter((l:any)=>{try{return Boolean(l.label)&&new URL(l.url).protocol.startsWith("http")}catch{return false}});
 const explicitCaptureSubject=hasCoords&&userLinksCaptureToSubject(text);memory.subject_location_is_from_user=Boolean(explicitCaptureSubject);const hasSubjectCoords=Number.isFinite(memory.subject_latitude)&&Number.isFinite(memory.subject_longitude);if(memory.subject_location&&!explicitCaptureSubject&&!hasSubjectCoords){memory.subject_location=null;memory.subject_latitude=null;memory.subject_longitude=null;memory.useful_links=memory.useful_links.filter((l:any)=>!String(l.url).includes("google.com/maps"));}
 memory.representative_image_url=await validateImage(memory.representative_image_url??null);if(!hasImage)memory.use_input_image=false;
 if(memory.assigned_category_id){const{data}=await supabase.from("categories").select("id").eq("id",memory.assigned_category_id).eq("user_id",userId).maybeSingle();if(!data)memory.assigned_category_id=null;}
 const uniqueSources:Source[]=[];const seen=new Set<string>();for(const source of allSources){if(!source.url||seen.has(source.url))continue;seen.add(source.url);uniqueSources.push(source)}return{memory,sources:uniqueSources.slice(0,8)};
}

export async function enrichPendingIdea(payload:EnrichIdeaPayload){
 const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,openAiKey=process.env.OPENAI_API_KEY;
 if(!supabaseUrl||!supabaseKey||!openAiKey)throw new Error("missing_server_configuration");
 const supabase=createClient(supabaseUrl,supabaseKey,{global:{headers:{Authorization:`Bearer ${payload.accessToken}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const{data:idea,error:readError}=await supabase.from("ideas").select("*").eq("id",payload.ideaId).eq("user_id",payload.userId).single();
 if(readError||!idea)throw new Error(readError?.message||"idea_not_found");
 const existing=(idea.enrichment??{}) as Record<string,any>;const imageDataUrl=typeof existing.input_image==="string"?existing.input_image:null;
 try{
   await supabase.from("ideas").update({enrichment:{...existing,processing_status:"processing",processing_started_at:new Date().toISOString()}}).eq("id",idea.id).eq("user_id",payload.userId);
   const{memory,sources}=await runAgent(openAiKey,supabase,payload.userId,idea.original_input??"",imageDataUrl,idea.latitude,idea.longitude);
   const heroImage=memory.use_input_image&&imageDataUrl?imageDataUrl:memory.representative_image_url;
   const enrichment={...existing,category:memory.category,facts:memory.facts,sources,useful_links:memory.useful_links,subject_coordinates:memory.subject_latitude!=null&&memory.subject_longitude!=null?{latitude:memory.subject_latitude,longitude:memory.subject_longitude}:null,image_url:heroImage,image_fit:memory.representative_image_fit,image_reason:memory.image_reason,input_image:imageDataUrl,input_image_used:Boolean(memory.use_input_image&&imageDataUrl),related_idea_ids:memory.related_idea_ids,agentic:true,toolbox_version:8,model:"gpt-5.6-luna",processing_status:"ready",enriched_at:new Date().toISOString()};
   const{error:updateError}=await supabase.from("ideas").update({title:memory.title,summary:memory.summary,tags:memory.tags,people:memory.people,location_label:memory.subject_location,location_source:memory.subject_location?(memory.subject_location_is_from_user?"extracted":"researched"):idea.latitude!=null?"device":null,enrichment}).eq("id",idea.id).eq("user_id",payload.userId);
   if(updateError)throw updateError;
   if(memory.assigned_category_id){await supabase.from("idea_categories").delete().eq("idea_id",idea.id);const{error:categoryError}=await supabase.from("idea_categories").insert({idea_id:idea.id,category_id:memory.assigned_category_id});if(categoryError)console.error("Category assignment failed",categoryError)}
   return{ideaId:idea.id,status:"ready"};
 }catch(error){
   const message=error instanceof Error?error.message:"enrichment_failed";
   await supabase.from("ideas").update({enrichment:{...existing,processing_status:"failed",processing_error:message,processing_failed_at:new Date().toISOString()}}).eq("id",idea.id).eq("user_id",payload.userId);
   throw error;
 }
}
