import type { EnrichIdeaPayload } from "@/lib/kipu-enrichment";

async function enrichIdeaStep(payload: EnrichIdeaPayload) {
  "use step";
  const { enrichPendingIdea } = await import("@/lib/kipu-enrichment");
  return enrichPendingIdea(payload);
}

async function ensureCategoryStep(payload: EnrichIdeaPayload, ideaId: string) {
  "use step";
  const { createClient } = await import("@supabase/supabase-js");
  const { ensureIdeaCategory } = await import("@/lib/kipu-category-manager");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,openAiKey=process.env.OPENAI_API_KEY;
  if(!url||!key||!openAiKey)throw new Error("missing_category_configuration");
  const supabase=createClient(url,key,{global:{headers:{Authorization:`Bearer ${payload.accessToken}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const{data:idea,error}=await supabase.from("ideas").select("id,title,summary,tags,enrichment").eq("id",ideaId).eq("user_id",payload.userId).single();
  if(error||!idea)throw new Error(error?.message||"category_idea_not_found");
  return ensureIdeaCategory(supabase,payload.userId,openAiKey,idea);
}

export async function enrichIdeaWorkflow(payload: EnrichIdeaPayload) {
  "use workflow";
  const result=await enrichIdeaStep(payload);
  await ensureCategoryStep(payload,result.ideaId);
  return result;
}
