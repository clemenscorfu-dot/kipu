import type { SupabaseClient } from "@supabase/supabase-js";

type IdeaForCategory={id:string;title:string;summary?:string|null;tags?:string[];enrichment?:Record<string,unknown>};
type CategoryRow={id:string;parent_id:string|null;name:string;description:string|null};

async function askCategory(openAiKey:string,idea:IdeaForCategory,categories:CategoryRow[]){
  const schema={type:"object",additionalProperties:false,properties:{existing_category_id:{anyOf:[{type:"string"},{type:"null"}]},create_name:{anyOf:[{type:"string"},{type:"null"}]},create_parent_id:{anyOf:[{type:"string"},{type:"null"}]},create_description:{anyOf:[{type:"string"},{type:"null"}]}},required:["existing_category_id","create_name","create_parent_id","create_description"]};
  const prompt=`Du verwaltest die selbstorganisierende Taxonomie von Kipu. Jede fertige Erinnerung braucht genau eine Kategorie. Kategorien bleiben grob und navigationsrelevant; Tags tragen feine Details. Ziel: ungefähr 5–12 Hauptkategorien, maximal zwei Ebenen. Bevorzuge eine vorhandene Kategorie. Erstelle nur dann eine neue, wenn keine vorhandene sinnvoll passt. Keine Marken-, Personen- oder Einzelobjekt-Kategorien.\n\nBestehende Kategorien:\n${JSON.stringify(categories)}\n\nErinnerung:\n${JSON.stringify({id:idea.id,title:idea.title,summary:idea.summary,tags:idea.tags,enrichment:idea.enrichment})}`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openAiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,text:{format:{type:"json_schema",name:"category_assignment",strict:true,schema}}})});
  if(!r.ok)throw new Error(`category_openai_${r.status}`);const p=await r.json();let text=p.output_text as string|undefined;if(!text){for(const o of p.output??[])for(const c of o.content??[])if(typeof c?.text==="string")text=c.text}if(!text)throw new Error("category_no_output");return JSON.parse(text) as {existing_category_id:string|null;create_name:string|null;create_parent_id:string|null;create_description:string|null};
}

export async function ensureIdeaCategory(supabase:SupabaseClient,userId:string,openAiKey:string,idea:IdeaForCategory){
  const{data:existingAssignment}=await supabase.from("idea_categories").select("category_id").eq("idea_id",idea.id).maybeSingle();if(existingAssignment?.category_id)return existingAssignment.category_id as string;
  const{data:categories,error}=await supabase.from("categories").select("id,parent_id,name,description").eq("user_id",userId).order("created_at");if(error)throw error;const rows=(categories??[]) as CategoryRow[];
  const decision=await askCategory(openAiKey,idea,rows);
  let categoryId:string|null=null;
  if(decision.existing_category_id&&rows.some(c=>c.id===decision.existing_category_id))categoryId=decision.existing_category_id;
  if(!categoryId&&decision.create_name?.trim()){
    const parentId=decision.create_parent_id&&rows.some(c=>c.id===decision.create_parent_id&&!c.parent_id)?decision.create_parent_id:null;
    const{data:created,error:createError}=await supabase.from("categories").insert({user_id:userId,parent_id:parentId,name:decision.create_name.trim(),description:decision.create_description?.trim()||null}).select("id").single();
    if(createError){const{data:refetch}=await supabase.from("categories").select("id").eq("user_id",userId).ilike("name",decision.create_name.trim()).maybeSingle();categoryId=refetch?.id??null}else categoryId=created.id;
  }
  if(!categoryId){const retry=await askCategory(openAiKey,idea,rows);if(retry.existing_category_id&&rows.some(c=>c.id===retry.existing_category_id))categoryId=retry.existing_category_id}
  if(!categoryId)throw new Error("category_assignment_required");
  const{error:assignError}=await supabase.from("idea_categories").upsert({idea_id:idea.id,category_id:categoryId},{onConflict:"idea_id,category_id"});if(assignError)throw assignError;return categoryId;
}
