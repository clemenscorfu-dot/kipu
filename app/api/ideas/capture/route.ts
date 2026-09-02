import { createClient } from "@supabase/supabase-js";
import { after, NextResponse } from "next/server";
import { enrichPendingIdea, type EnrichIdeaPayload } from "@/lib/kipu-enrichment";
import { ensureIdeaCategory } from "@/lib/kipu-category-manager";
import { indexIdeaMemory } from "@/lib/kipu-memory-index";
import { buildMemoryRelations } from "@/lib/kipu-memory-graph";

export const maxDuration=300;

type CaptureBody={text?:string;latitude?:number|null;longitude?:number|null;inputType?:"text"|"voice"|"camera";imageDataUrl?:string|null};
function rawTitle(text:string,inputType:string){const trimmed=text.trim();if(trimmed)return trimmed.length>72?`${trimmed.slice(0,69)}…`:trimmed;if(inputType==="camera")return"Fotoaufnahme";if(inputType==="voice")return"Spracheingabe";return"Neue Idee"}

async function backgroundEnrich(payload:EnrichIdeaPayload){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,openAiKey=process.env.OPENAI_API_KEY;
  if(!url||!key||!openAiKey)throw new Error("missing_server_configuration");
  const s=createClient(url,key,{global:{headers:{Authorization:`Bearer ${payload.accessToken}`}},auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const result=await enrichPendingIdea(payload);
    const ideaId=result.ideaId;
    // Core enrichment must not be invalidated by optional organisation/memory steps.
    try{
      const{data:idea,error}=await s.from("ideas").select("id,title,summary,tags,enrichment").eq("id",ideaId).eq("user_id",payload.userId).single();
      if(error||!idea)throw error??new Error("category_idea_not_found");
      await ensureIdeaCategory(s,payload.userId,openAiKey,idea);
    }catch(e){console.error("Post-enrichment category step failed",e)}
    try{await indexIdeaMemory(s,payload.userId,openAiKey,ideaId)}catch(e){console.error("Post-enrichment memory index failed",e)}
    try{await buildMemoryRelations(s,payload.userId,openAiKey,ideaId)}catch(e){console.error("Post-enrichment memory graph failed",e)}
  }catch(e){
    console.error("Background idea enrichment failed",e);
    try{
      const{data}=await s.from("ideas").select("enrichment").eq("id",payload.ideaId).eq("user_id",payload.userId).maybeSingle();
      const current=(data?.enrichment??{}) as Record<string,unknown>;
      await s.from("ideas").update({enrichment:{...current,processing_status:"failed",processing_error:e instanceof Error?e.message:"enrichment_failed",processing_failed_at:new Date().toISOString()}}).eq("id",payload.ideaId).eq("user_id",payload.userId);
    }catch(markError){console.error("Could not mark enrichment failed",markError)}
  }
}

export async function POST(request:Request){
  try{
    const body=(await request.json()) as CaptureBody,text=body.text?.trim()??"",imageDataUrl=body.imageDataUrl?.trim()||null,inputType=body.inputType??(imageDataUrl?"camera":"text");
    if(!text&&!imageDataUrl)return NextResponse.json({error:"Eingabe fehlt."},{status:400});
    if(text.length>5000)return NextResponse.json({error:"Text ist zu lang."},{status:400});
    if(imageDataUrl&&imageDataUrl.length>3_000_000)return NextResponse.json({error:"Foto ist zu gross."},{status:400});
    const token=request.headers.get("authorization")?.replace(/^Bearer /,"");if(!token)return NextResponse.json({error:"Nicht angemeldet."},{status:401});
    const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!supabaseUrl||!supabaseKey)return NextResponse.json({error:"Server-Konfiguration unvollständig."},{status:500});
    const supabase=createClient(supabaseUrl,supabaseKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}}),{data:userData,error:userError}=await supabase.auth.getUser(token);if(userError||!userData.user)return NextResponse.json({error:"Session ungültig."},{status:401});
    const hasCoords=Number.isFinite(body.latitude)&&Number.isFinite(body.longitude),originalInput=text||(inputType==="camera"?"Fotoaufnahme":"Spracheingabe"),queuedAt=new Date().toISOString(),pendingEnrichment={processing_status:"pending",queued_at:queuedAt,input_image:imageDataUrl,image_url:imageDataUrl,image_fit:"cover",capture_location:hasCoords?{latitude:body.latitude,longitude:body.longitude}:null,agentic:true,toolbox_version:12};
    const{data:idea,error:insertError}=await supabase.from("ideas").insert({user_id:userData.user.id,input_type:inputType,original_input:originalInput,title:rawTitle(text,inputType),summary:null,tags:[],people:[],latitude:hasCoords?body.latitude:null,longitude:hasCoords?body.longitude:null,location_label:null,location_source:hasCoords?"device":null,enrichment:pendingEnrichment}).select("*").single();
    if(insertError){console.error("Supabase raw insert failed",insertError);return NextResponse.json({error:"Speichern in Supabase fehlgeschlagen.",detail:insertError.message},{status:500})}
    const payload={ideaId:idea.id,userId:userData.user.id,accessToken:token};
    after(()=>backgroundEnrich(payload));
    return NextResponse.json({idea,processing_status:"pending"},{status:202});
  }catch(error){console.error("Kipu capture error",error);return NextResponse.json({error:"Speichern fehlgeschlagen."},{status:500})}
}
