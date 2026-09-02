import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { kipuFunctionTools, runKipuFunctionTool } from "@/lib/kipu-agent-tools";

const factSchema = {
  type: "object",
  additionalProperties: false,
  properties: { label: { type: "string" }, value: { type: "string" } },
  required: ["label", "value"],
};

const linkSchema = {
  type: "object",
  additionalProperties: false,
  properties: { label: { type: "string" }, url: { type: "string" } },
  required: ["label", "url"],
};

const memorySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: {
      type: "string",
      description:
        "Kurze nutzerorientierte Zusammenfassung. Bei inhaltstragenden Werken oder Medien erklärt sie primär, worum es inhaltlich geht und welche zentrale Idee oder Thematik wichtig ist; technische Metadaten gehören in facts.",
    },
    tags: { type: "array", items: { type: "string" }, maxItems: 3 },
    people: { type: "array", items: { type: "string" }, maxItems: 8 },
    category: { type: "string" },
    assigned_category_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    duplicate_of_idea_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    duplicate_confidence: { type: "string", enum: ["none", "possible", "high"] },
    subject_location: { anyOf: [{ type: "string" }, { type: "null" }] },
    subject_latitude: { anyOf: [{ type: "number" }, { type: "null" }] },
    subject_longitude: { anyOf: [{ type: "number" }, { type: "null" }] },
    subject_location_is_from_user: { type: "boolean" },
    facts: { type: "array", items: factSchema, maxItems: 5 },
    useful_links: { type: "array", items: linkSchema, maxItems: 3 },
    representative_image_url: { anyOf: [{ type: "string" }, { type: "null" }] },
    use_input_image: { type: "boolean" },
    representative_image_fit: { type: "string", enum: ["cover", "contain"] },
    image_reason: { type: "string" },
    related_idea_ids: { type: "array", items: { type: "string" }, maxItems: 5 },
  },
  required: [
    "title",
    "summary",
    "tags",
    "people",
    "category",
    "assigned_category_id",
    "duplicate_of_idea_id",
    "duplicate_confidence",
    "subject_location",
    "subject_latitude",
    "subject_longitude",
    "subject_location_is_from_user",
    "facts",
    "useful_links",
    "representative_image_url",
    "use_input_image",
    "representative_image_fit",
    "image_reason",
    "related_idea_ids",
  ],
};

type Source = { title?: string; url: string };
type AgentResponse = { id?: string; output_text?: string; output?: Array<Record<string, any>> };
export type EnrichIdeaPayload = { ideaId: string; userId: string; accessToken: string };

function extractResponseText(payload: AgentResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  for (const output of payload.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content?.text === "string" && content.text.trim()) return content.text;
    }
  }
  return null;
}

function extractSources(payload: AgentResponse) {
  const sources: Source[] = [];
  for (const output of payload.output ?? []) {
    if (output.type !== "web_search_call") continue;
    for (const source of output.action?.sources ?? []) {
      if (source?.url) sources.push({ title: source.title, url: source.url });
    }
  }
  return sources;
}

function cleanGeneratedText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/\((?:https?:\/\/[^)]+)\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function userLinksCaptureToSubject(text: string) {
  const value = text.toLocaleLowerCase("de-CH").replace(/\s+/g, " ").trim();
  return Boolean(value) && (
    /\b(hier|genau hier|an diesem ort|an dieser stelle|diese stelle|dieser ort|da wo ich bin|dort wo ich bin|mein aktueller standort)\b/i.test(value) ||
    /\b(dies(?:e|er|es)\s+[^.!?]{0,35}\s+hier)\b/i.test(value)
  );
}

async function callOpenAI(key: string, body: Record<string, unknown>) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`openai_${response.status}`);
  return (await response.json()) as AgentResponse;
}

async function validateImage(url: string | null) {
  if (!url) return null;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(parsed.protocol)) return null;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(6000),
    });
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (response.ok && type.startsWith("image/")) return response.url || url;
    if (response.ok && type && !type.includes("text/html") && !type.includes("application/json")) return response.url || url;
    if ([401, 403, 429].includes(response.status)) return url;
    return null;
  } catch {
    return url;
  }
}

async function runAgent(
  key: string,
  supabase: SupabaseClient,
  userId: string,
  currentIdeaId: string,
  text: string,
  imageDataUrl: string | null,
  latitude?: number | null,
  longitude?: number | null,
) {
  const tools = [{ type: "web_search" }, ...kipuFunctionTools];
  const allSources: Source[] = [];
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  const hasImage = Boolean(imageDataUrl?.startsWith("data:image/"));

  const system = `Du bist Kipu, ein persönlicher Memory-Agent. Nutze Tools selbstständig; keine Kategorie-Regelbäume.
Quellen: Vom Nutzer gelieferte URLs, Bilder und Dokumente sind Wahrnehmungskanäle. Wenn eine URL für das Verständnis relevant ist, untersuche die konkrete Quelle mit inspect_web_page und/oder Websuche, bevor du ihren Inhalt interpretierst. Das gilt allgemein für jede Plattform. Erfinde niemals Inhalt aus einer URL, die du nicht verstanden hast.
Kontext-Isolation: Bestehende Erinnerungen dürfen nur für Doubletten, Disambiguierung und echte Beziehungen dienen. Übernimm niemals Sachinhalte einer früheren Erinnerung in die neue Erinnerung, wenn die aktuelle Eingabe oder ihre Quellen diese nicht stützen.
Doubletten: Rufe bei JEDEM Capture find_similar_ideas auf. Prüfe semantisch dieselbe konkrete Entität. currentIdeaId=${currentIdeaId} darf nie duplicate_of_idea_id sein. high nur bei sicher derselben Entität; ähnliche Themen oder Varianten sind nicht high.
Kategorien: Rufe get_categories auf, bestehende Kategorien bevorzugen, max. 2 Ebenen; manage_categories hier nur create.
Bilder sind ein Standardziel: Für jede öffentlich identifizierbare Entität, bei der ein Bild die Wiedererkennung verbessert, MUSST du search_images verwenden. Beispiele sind Bücher, Produkte, Restaurants, Hotels, Orte, Filme, Spiele und bekannte Gegenstände; dies sind Beispiele, keine Sonderregeln. Wähle representative_image_url ausschließlich aus tatsächlich von Tools gelieferten Bildkandidaten. Bevorzuge das Bild, das die konkrete Entität am eindeutigsten repräsentiert. Wenn der Nutzer selbst ein Foto geliefert hat und dieses die Erinnerung besser repräsentiert, setze use_input_image=true. Setze representative_image_url nur null, wenn trotz Bildsuche kein brauchbarer Kandidat gefunden wurde.
Summary: Wenn das gespeicherte Objekt selbst einen Inhalt vermittelt – zum Beispiel ein Buch, Hörbuch, Podcast, Film, Artikel, Video oder vergleichbares Werk – soll summary in 1–3 kurzen Sätzen primär beantworten, worum es inhaltlich geht und welche zentrale Idee oder Thematik wichtig ist. Wiederhole dort nicht bloß Medium, Plattform, Format, Autor, Sprache oder andere technische Metadaten; solche Angaben gehören in facts. Bei anderen Erinnerungen beschreibt summary kurz den für den Nutzer nützlichsten Kern.
Qualität: Vision direkt nutzen, öffentliche Entitäten proaktiv recherchieren, max. 3 Links, 5 Fakten, 3 Tags, nichts erfinden. Capture Location != Subject Location. Finale Antwort nur im Schema.`;

  const userText = text.trim() || "Der Nutzer möchte sich dieses Foto merken.";
  const context = hasCoords
    ? `Nutzereingabe:\n${userText}\n\nAufnahmekontext GPS ${latitude}, ${longitude}; nicht automatisch Subject Location.`
    : `Nutzereingabe:\n${userText}\n\nKein GPS-Aufnahmekontext.`;
  const content: any[] = [{ type: "input_text", text: context }];
  if (hasImage) content.push({ type: "input_image", image_url: imageDataUrl, detail: "high" });

  let response = await callOpenAI(key, {
    model: "gpt-5.6-luna",
    tools,
    include: ["web_search_call.action.sources"],
    input: [
      { role: "system", content: [{ type: "input_text", text: system }] },
      { role: "user", content },
    ],
    text: { format: { type: "json_schema", name: "kipu_memory", strict: true, schema: memorySchema } },
  });

  for (let step = 0; step < 12; step++) {
    allSources.push(...extractSources(response));
    const calls = (response.output ?? []).filter((item) => item.type === "function_call");
    if (!calls.length) break;
    const outputs = [];
    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.arguments ?? "{}"); } catch {}
      const result = await runKipuFunctionTool(call.name, args, { supabase, userId, openAiKey: key });
      outputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }
    response = await callOpenAI(key, {
      model: "gpt-5.6-luna",
      previous_response_id: response.id,
      tools,
      include: ["web_search_call.action.sources"],
      input: outputs,
      text: { format: { type: "json_schema", name: "kipu_memory", strict: true, schema: memorySchema } },
    });
  }

  allSources.push(...extractSources(response));
  const raw = extractResponseText(response);
  if (!raw) throw new Error("agent_no_final_output");
  const memory = JSON.parse(raw) as any;
  memory.summary = cleanGeneratedText(memory.summary);
  memory.facts = (memory.facts ?? []).map((fact: any) => ({
    label: cleanGeneratedText(fact.label),
    value: cleanGeneratedText(fact.value),
  }));
  memory.useful_links = (memory.useful_links ?? []).filter((link: any) => {
    try { return Boolean(link.label) && new URL(link.url).protocol.startsWith("http"); } catch { return false; }
  });

  const explicitLocation = hasCoords && userLinksCaptureToSubject(text);
  memory.subject_location_is_from_user = Boolean(explicitLocation);
  const subjectCoords = Number.isFinite(memory.subject_latitude) && Number.isFinite(memory.subject_longitude);
  if (memory.subject_location && !explicitLocation && !subjectCoords) {
    memory.subject_location = null;
    memory.subject_latitude = null;
    memory.subject_longitude = null;
    memory.useful_links = memory.useful_links.filter((link: any) => !String(link.url).includes("google.com/maps"));
  }

  memory.representative_image_url = await validateImage(memory.representative_image_url ?? null);
  if (!hasImage) memory.use_input_image = false;
  if (memory.assigned_category_id) {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .eq("id", memory.assigned_category_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) memory.assigned_category_id = null;
  }
  if (memory.duplicate_of_idea_id === currentIdeaId) {
    memory.duplicate_of_idea_id = null;
    memory.duplicate_confidence = "none";
  }

  const unique: Source[] = [];
  const seen = new Set<string>();
  for (const source of allSources) {
    if (source.url && !seen.has(source.url)) {
      seen.add(source.url);
      unique.push(source);
    }
  }
  return { memory, sources: unique.slice(0, 8) };
}

function mergeLinks(a: any[] = [], b: any[] = []) {
  const output: any[] = [];
  const seen = new Set<string>();
  for (const item of [...a, ...b]) {
    if (item?.url && !seen.has(item.url)) {
      seen.add(item.url);
      output.push(item);
    }
  }
  return output.slice(0, 3);
}

function mergeFacts(a: any[] = [], b: any[] = []) {
  const output: any[] = [];
  const seen = new Set<string>();
  for (const item of [...a, ...b]) {
    const key = String(item?.label ?? "").toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
  }
  return output.slice(0, 5);
}

export async function enrichPendingIdea(payload: EnrichIdeaPayload) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!url || !key || !openAiKey) throw new Error("missing_server_configuration");

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${payload.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: idea, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", payload.ideaId)
    .eq("user_id", payload.userId)
    .single();
  if (error || !idea) throw new Error(error?.message || "idea_not_found");

  const existing = (idea.enrichment ?? {}) as Record<string, any>;
  const inputImage = typeof existing.input_image === "string" ? existing.input_image : null;

  try {
    await supabase
      .from("ideas")
      .update({ enrichment: { ...existing, processing_status: "processing", processing_started_at: new Date().toISOString() } })
      .eq("id", idea.id)
      .eq("user_id", payload.userId);

    const { memory, sources } = await runAgent(
      openAiKey,
      supabase,
      payload.userId,
      idea.id,
      idea.original_input ?? "",
      inputImage,
      idea.latitude,
      idea.longitude,
    );

    const hero = memory.use_input_image && inputImage ? inputImage : memory.representative_image_url;
    const now = new Date().toISOString();
    let duplicate: any = null;
    if (memory.duplicate_confidence === "high" && memory.duplicate_of_idea_id) {
      const result = await supabase
        .from("ideas")
        .select("*")
        .eq("id", memory.duplicate_of_idea_id)
        .eq("user_id", payload.userId)
        .maybeSingle();
      duplicate = result.data;
    }

    if (duplicate) {
      const old = (duplicate.enrichment ?? {}) as Record<string, any>;
      const merged = {
        ...old,
        category: memory.category || old.category,
        facts: mergeFacts(memory.facts, old.facts),
        sources: [...sources, ...(old.sources ?? [])].slice(0, 8),
        useful_links: mergeLinks(memory.useful_links, old.useful_links),
        subject_coordinates:
          memory.subject_latitude != null && memory.subject_longitude != null
            ? { latitude: memory.subject_latitude, longitude: memory.subject_longitude }
            : old.subject_coordinates ?? null,
        image_url: hero || old.image_url || null,
        image_fit: hero ? memory.representative_image_fit : old.image_fit ?? "cover",
        image_reason: memory.image_reason || old.image_reason,
        agentic: true,
        toolbox_version: 13,
        model: "gpt-5.6-luna",
        processing_status: "ready",
        enriched_at: now,
        mention_count: Number(old.mention_count ?? 1) + 1,
        last_mentioned_at: now,
        last_duplicate_input: idea.original_input,
      };
      const update = await supabase
        .from("ideas")
        .update({
          title: memory.title || duplicate.title,
          summary: memory.summary || duplicate.summary,
          tags: Array.from(new Set([...(memory.tags ?? []), ...(duplicate.tags ?? [])])).slice(0, 3),
          people: Array.from(new Set([...(memory.people ?? []), ...(duplicate.people ?? [])])).slice(0, 8),
          location_label: memory.subject_location || duplicate.location_label,
          location_source: memory.subject_location
            ? memory.subject_location_is_from_user ? "extracted" : "researched"
            : duplicate.location_source,
          enrichment: merged,
        })
        .eq("id", duplicate.id)
        .eq("user_id", payload.userId);
      if (update.error) throw update.error;

      if (memory.assigned_category_id) {
        try {
          await supabase.from("idea_categories").delete().eq("idea_id", duplicate.id);
          await supabase.from("idea_categories").insert({ idea_id: duplicate.id, category_id: memory.assigned_category_id });
        } catch (categoryError) {
          console.error("Idea category assignment failed", categoryError);
        }
      }

      const marker = { ...existing, processing_status: "merged", merged_into_idea_id: duplicate.id, merged_at: now };
      const marked = await supabase
        .from("ideas")
        .update({ enrichment: marker })
        .eq("id", idea.id)
        .eq("user_id", payload.userId);
      if (marked.error) throw marked.error;
      return { ideaId: duplicate.id, mergedFromIdeaId: idea.id, status: "merged" };
    }

    const enrichment = {
      ...existing,
      category: memory.category,
      facts: memory.facts,
      sources,
      useful_links: memory.useful_links,
      subject_coordinates:
        memory.subject_latitude != null && memory.subject_longitude != null
          ? { latitude: memory.subject_latitude, longitude: memory.subject_longitude }
          : null,
      image_url: hero,
      image_fit: memory.representative_image_fit,
      image_reason: memory.image_reason,
      input_image: inputImage,
      input_image_used: Boolean(memory.use_input_image && inputImage),
      related_idea_ids:
        memory.duplicate_confidence === "possible" && memory.duplicate_of_idea_id
          ? Array.from(new Set([...(memory.related_idea_ids ?? []), memory.duplicate_of_idea_id]))
          : memory.related_idea_ids,
      possible_duplicate_of: memory.duplicate_confidence === "possible" ? memory.duplicate_of_idea_id : null,
      agentic: true,
      toolbox_version: 13,
      model: "gpt-5.6-luna",
      processing_status: "ready",
      enriched_at: now,
    };

    const update = await supabase
      .from("ideas")
      .update({
        title: memory.title,
        summary: memory.summary,
        tags: memory.tags,
        people: memory.people,
        location_label: memory.subject_location,
        location_source: memory.subject_location
          ? memory.subject_location_is_from_user ? "extracted" : "researched"
          : idea.latitude != null ? "device" : null,
        enrichment,
      })
      .eq("id", idea.id)
      .eq("user_id", payload.userId);
    if (update.error) throw update.error;

    if (memory.assigned_category_id) {
      try {
        await supabase.from("idea_categories").delete().eq("idea_id", idea.id);
        await supabase.from("idea_categories").insert({ idea_id: idea.id, category_id: memory.assigned_category_id });
      } catch (categoryError) {
        console.error("Idea category assignment failed", categoryError);
      }
    }
    return { ideaId: idea.id, status: "ready" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "enrichment_failed";
    await supabase
      .from("ideas")
      .update({ enrichment: { ...existing, processing_status: "failed", processing_error: message, processing_failed_at: new Date().toISOString() } })
      .eq("id", idea.id)
      .eq("user_id", payload.userId);
    throw error;
  }
}
