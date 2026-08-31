import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureIdeaCategory } from "@/lib/kipu-category-manager";

export async function POST(request:Request){
  try{
    const token=request.headers.get("authorization")?.replace(/^Bearer /,"");if(!token)return NextResponse.json({error:"Nicht angemeldet."},{status:401});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,openAiKey=process.env.OPENAI_API_KEY;if(!url||!key||!openAiKey)return NextResponse.json({error:"Server-Konfiguration unvollständig."},{status:500});
    const supabase=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
    const{data:userData,error:userError}=await supabase.auth.getUser(token);if(userError||!userData.user)return NextResponse.json({error:"Session ungültig."},{status:401});const userId=userData.user.id;
    const[{data:ideas,error:ideasError},{data:assignments,error:assignError}]=await Promise.all([
      supabase.from("ideas").select("id,title,summary,tags,enrichment,created_at").eq("user_id",userId).order("created_at",{ascending:true}),
      supabase.from("idea_categories").select("idea_id,category_id")
    ]);if(ideasError)throw ideasError;if(assignError)throw assignError;
    const assigned=new Set((assignments??[]).map((a:any)=>a.idea_id));const pending=(ideas??[]).filter((i:any)=>!assigned.has(i.id)&&i.enrichment?.processing_status!=="pending"&&i.enrichment?.processing_status!=="processing"&&i.enrichment?.processing_status!=="merged").slice(0,20);
    let categorized=0;const failures:string[]=[];
    for(const idea of pending){try{await ensureIdeaCategory(supabase,userId,openAiKey,idea);categorized++}catch(e){failures.push(`${idea.id}:${e instanceof Error?e.message:"failed"}`)}}
    return NextResponse.json({ok:true,found:pending.length,categorized,failures});
  }catch(e){console.error("category backfill failed",e);return NextResponse.json({error:e instanceof Error?e.message:"Backfill fehlgeschlagen."},{status:500})}
}
