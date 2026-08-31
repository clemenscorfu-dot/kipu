import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { enrichIdeaWorkflow } from "@/workflows/enrich-idea";

type CaptureBody={
  text?:string;
  latitude?:number|null;
  longitude?:number|null;
  inputType?:"text"|"voice"|"camera";
  imageDataUrl?:string|null;
};

function rawTitle(text:string,inputType:string){
  const trimmed=text.trim();
  if(trimmed)return trimmed.length>72?`${trimmed.slice(0,69)}…`:trimmed;
  if(inputType==="camera")return "Fotoaufnahme";
  if(inputType==="voice")return "Spracheingabe";
  return "Neue Idee";
}

export async function POST(request:Request){
  try{
    const body=(await request.json()) as CaptureBody;
    const text=body.text?.trim()??"";
    const imageDataUrl=body.imageDataUrl?.trim()||null;
    const inputType=body.inputType??(imageDataUrl?"camera":"text");
    if(!text&&!imageDataUrl)return NextResponse.json({error:"Eingabe fehlt."},{status:400});
    if(text.length>5000)return NextResponse.json({error:"Text ist zu lang."},{status:400});
    if(imageDataUrl&&imageDataUrl.length>3_000_000)return NextResponse.json({error:"Foto ist zu gross."},{status:400});

    const token=request.headers.get("authorization")?.replace(/^Bearer /,"");
    if(!token)return NextResponse.json({error:"Nicht angemeldet."},{status:401});
    const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!supabaseUrl||!supabaseKey)return NextResponse.json({error:"Server-Konfiguration unvollständig."},{status:500});

    const supabase=createClient(supabaseUrl,supabaseKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
    const{data:userData,error:userError}=await supabase.auth.getUser(token);
    if(userError||!userData.user)return NextResponse.json({error:"Session ungültig."},{status:401});

    const hasCoords=Number.isFinite(body.latitude)&&Number.isFinite(body.longitude);
    const originalInput=text||(inputType==="camera"?"Fotoaufnahme":"Spracheingabe");
    const queuedAt=new Date().toISOString();
    const pendingEnrichment={
      processing_status:"pending",
      queued_at:queuedAt,
      input_image:imageDataUrl,
      image_url:imageDataUrl,
      image_fit:"cover",
      capture_location:hasCoords?{latitude:body.latitude,longitude:body.longitude}:null,
      agentic:true,
      toolbox_version:8,
    };

    const{data:idea,error:insertError}=await supabase.from("ideas").insert({
      user_id:userData.user.id,
      input_type:inputType,
      original_input:originalInput,
      title:rawTitle(text,inputType),
      summary:null,
      tags:[],
      people:[],
      latitude:hasCoords?body.latitude:null,
      longitude:hasCoords?body.longitude:null,
      location_label:null,
      location_source:hasCoords?"device":null,
      enrichment:pendingEnrichment,
    }).select("*").single();

    if(insertError){
      console.error("Supabase raw insert failed",insertError);
      return NextResponse.json({error:"Speichern in Supabase fehlgeschlagen.",detail:insertError.message},{status:500});
    }

    try{
      const run=await start(enrichIdeaWorkflow,[{ideaId:idea.id,userId:userData.user.id,accessToken:token}]);
      const enrichment={...pendingEnrichment,workflow_run_id:run.runId};
      await supabase.from("ideas").update({enrichment}).eq("id",idea.id).eq("user_id",userData.user.id);
      return NextResponse.json({idea:{...idea,enrichment},processing_status:"pending",run_id:run.runId},{status:202});
    }catch(workflowError){
      console.error("Failed to start enrichment workflow",workflowError);
      const enrichment={...pendingEnrichment,processing_status:"failed",processing_error:"workflow_start_failed"};
      await supabase.from("ideas").update({enrichment}).eq("id",idea.id).eq("user_id",userData.user.id);
      return NextResponse.json({idea:{...idea,enrichment},processing_status:"failed",warning:"Idee gespeichert, Aufbereitung konnte aber nicht gestartet werden."},{status:202});
    }
  }catch(error){
    console.error("Kipu capture error",error);
    return NextResponse.json({error:"Speichern fehlgeschlagen."},{status:500});
  }
}
