import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  findSimilarIdeas,
  kipuFunctionTools,
  runKipuFunctionTool,
  searchImages,
} from "@/lib/kipu-agent-tools";

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
        "Kurze nutzerorientierte Zusammenfassung. Bei inhaltstragenden Werken oder Medien erklärt sie primär, worum es inhaltlich geht; technische Metadaten gehören in facts.",
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

const imageChoiceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    selected_index: { anyOf: [{ type: "integer" }, { type: "null" }] },
    confidence: { type: "string", enum: ["high", "medium", "low", "none"] },
    reason: { type: "string" },
  },
  required: ["selected_index", "confidence", "reason"],
};

type Source = { title?: string; url: string };
type AgentResponse = {
  id?: string;
  output_text?: string;
  output?: Array<Record<string, any>>;
};
type ImageCandidate = { url: string; sourceUrl?: string; sourceTitle?: string };
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
  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.text()).slice(0, 600);
    } catch {}
    throw new Error(`openai_${response.status}${detail ? `:${detail}` : ""}`);
  }
  return (await response.json()) as AgentResponse;
}

async function validateImage(url: string | null) {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol)) return null;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(type)) return null;
    return response.url || url;
  } catch {
    return null;
  }
}

function identifiersFromFacts(facts: any[] = []) {
  const out: Array<{ type: string; value: string }> = [];
  for (const fact of facts) {
    const label = String(fact?.label ?? "").toLowerCase();
    const value = String(fact?.value ?? "").trim();
    if (!value) continue;
    if (label.includes("isbn")) out.push({ type: "isbn", value });
    else if (/ean|gtin|barcode/.test(label)) out.push({ type: "gtin", value });
    else if (/(^|\s)id$|produkt.?id|product.?id|entity.?id|imdb|tmdb|spotify.?id|osm.?id|place.?id/.test(label)) {
      out.push({ type: label || "external_id", value });
    }
  }
  return out;
}

function urlsFrom(text: string) {
  return text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
}

function candidateLooksAdministrative(candidate: ImageCandidate) {
  const haystack = `${candidate.sourceTitle ?? ""} ${candidate.sourceUrl ?? ""}`.toLocaleLowerCase("de-CH");
  return /\b(team|staff|mitarbeiter|mitarbeitende|vorstand|kommission|committee|about|ueber-uns|über-uns|kontakt|contact|portrait|portraet|logo)\b/.test(haystack);
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
Quellen: Vom Nutzer gelieferte URLs, Bilder und Dokumente sind Wahrnehmungskanäle. Relevante URLs untersuchen; aus unverstandenen Quellen nichts erfinden.
Kontext-Isolation: Bestehende Ideen nur für Doubletten, Disambiguierung und echte Beziehungen nutzen; keine fremden Sachinhalte übernehmen.
Doubletten: Rufe bei JEDEM Capture find_similar_ideas auf. Kernfrage: "Meint diese neue Idee dieselbe konkrete Sache wie eine bestehende Idee – unabhängig von Formulierung, persönlichem Kontext oder Eingabekanal?" Trenne Entity Identity (WAS ist gespeichert?) von persönlicher Absicht (WARUM wird es gespeichert?). "Mit Lydia dort essen", "später kaufen", "für die Kinder" oder "mal anschauen" verändern die Identität der Sache nicht. Nutze harte IDs, URLs, kanonischen Namen, Fakten, Orte und erkannte Bild-Entität. currentIdeaId=${currentIdeaId} muss ausgeschlossen bleiben. high nur bei sehr sicher derselben konkreten Entität; gleiche Kategorie, Autor, Marke oder ähnliche Variante reicht nicht. Zwei Filialen einer Kette sind nicht automatisch dieselbe Entität. Doubletten nur markieren, niemals löschen oder zusammenführen.
Kategorien: get_categories aufrufen, bestehende Kategorien bevorzugen, max. 2 Ebenen; manage_categories hier nur create.
Bilder: JEDE Idee braucht ein passendes repräsentatives Bild. Wenn ein Input-Foto die Sache gut zeigt, nutze es. Sonst search_images verwenden. Entscheidend ist visuelle Repräsentativität: Der Nutzer soll anhand des Bildes intuitiv erkennen, worum es in der Idee geht. Bei konkreten Entitäten die konkrete Sache zeigen. Bei Vorhaben oder abstrakteren Ideen ein klar thematisches, nicht irreführendes Motiv wählen. Gruppenfotos, Portraits, Logos, Funktionäre, Screenshots und generische Organisationsbilder vermeiden, ausser genau diese sind Gegenstand der Idee.
Summary: Bei Büchern, Hörbüchern, Podcasts, Filmen, Artikeln, Videos und vergleichbaren Werken in 1–3 kurzen Sätzen sagen, worum es inhaltlich geht; technische Angaben in facts.
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
      try {
        args = JSON.parse(call.arguments ?? "{}");
      } catch {}
      const result = await runKipuFunctionTool(call.name, args, {
        supabase,
        userId,
        openAiKey: key,
        currentIdeaId,
      });
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
    try {
      return Boolean(link.label) && new URL(link.url).protocol.startsWith("http");
    } catch {
      return false;
    }
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

async function resolveDuplicate(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  idea: any,
  memory: any,
  sources: Source[],
) {
  const urls = [
    ...urlsFrom(String(idea.original_input ?? "")),
    ...(memory.useful_links ?? []).map((item: any) => item.url),
    ...sources.map((item) => item.url),
  ].filter(Boolean);
  const result: any = await findSimilarIdeas(
    {
      text: String(idea.original_input ?? memory.title ?? ""),
      current_idea_id: idea.id,
      canonical_name: memory.title,
      summary: memory.summary,
      tags: memory.tags ?? [],
      people: memory.people ?? [],
      location_label: memory.subject_location,
      urls,
      identifiers: identifiersFromFacts(memory.facts),
      latitude: memory.subject_latitude,
      longitude: memory.subject_longitude,
    },
    { supabase, userId, openAiKey: key, currentIdeaId: idea.id },
  );
  const best = result?.best;
  if (best?.idea_id && best.idea_id !== idea.id && (best.confidence === "high" || best.confidence === "possible")) {
    return {
      ideaId: best.idea_id,
      confidence: best.confidence,
      reason: best.reason ?? null,
      matchers: best.matchers ?? [],
      source: best.decision_source ?? "identity_pipeline",
    };
  }
  if (memory.duplicate_of_idea_id && memory.duplicate_of_idea_id !== idea.id && memory.duplicate_confidence !== "none") {
    return {
      ideaId: memory.duplicate_of_idea_id,
      confidence: memory.duplicate_confidence,
      reason: "agent identity assessment",
      matchers: ["agent_identity"],
      source: "agent",
    };
  }
  return { ideaId: null, confidence: "none", reason: null, matchers: [], source: "identity_pipeline" };
}

async function chooseRepresentativeImage(key: string, memory: any, candidates: ImageCandidate[]) {
  const usable: ImageCandidate[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate?.url || seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    const valid = await validateImage(candidate.url);
    if (valid) usable.push({ ...candidate, url: valid });
    if (usable.length >= 6) break;
  }
  if (!usable.length) return null;

  try {
    const ideaContext = JSON.stringify({
      title: memory.title,
      summary: memory.summary,
      category: memory.category,
      tags: memory.tags,
      location: memory.subject_location,
      facts: memory.facts,
    });
    const content: any[] = [
      {
        type: "input_text",
        text:
          `Wähle das Bild, das diese gespeicherte Idee visuell am besten repräsentiert. ` +
          `Der Nutzer soll beim Ansehen intuitiv erkennen, worum es in der Idee geht.\n\n` +
          `Idee: ${ideaContext}\n\n` +
          `Bei konkreten Entitäten muss möglichst genau diese Entität gezeigt werden. ` +
          `Bei Vorhaben oder abstrakteren Ideen wähle ein klar thematisches, nicht irreführendes Motiv. ` +
          `Lehne Gruppenfotos, Portraits, Logos, Funktionäre, Screenshots und generische Organisationsbilder ab, ` +
          `wenn diese nicht selbst Gegenstand der Idee sind. Wähle null nur dann, wenn wirklich alle Kandidaten thematisch unbrauchbar sind.`,
      },
    ];
    usable.forEach((candidate, index) => {
      content.push({
        type: "input_text",
        text: `Kandidat ${index}. Quelle: ${candidate.sourceTitle ?? candidate.sourceUrl ?? "unbekannt"}`,
      });
      content.push({ type: "input_image", image_url: candidate.url, detail: "low" });
    });

    const response = await callOpenAI(key, {
      model: "gpt-5.6-luna",
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "kipu_image_choice",
          strict: true,
          schema: imageChoiceSchema,
        },
      },
    });
    const raw = extractResponseText(response);
    if (!raw) return null;
    const choice = JSON.parse(raw) as { selected_index: number | null; confidence: string; reason: string };
    const index = choice.selected_index;
    if (
      index == null ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= usable.length ||
      choice.confidence === "none"
    ) {
      return null;
    }
    return {
      url: usable[index].url,
      fit: "cover" as const,
      reason: `Visuelle Auswahl (${choice.confidence}): ${choice.reason}`,
    };
  } catch (error) {
    console.warn("Kipu image relevance selection failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function firstReliableFallback(candidates: ImageCandidate[]) {
  const preferred = candidates.filter((candidate) => !candidateLooksAdministrative(candidate));
  const ordered = preferred.length ? preferred : candidates;
  const seen = new Set<string>();
  for (const candidate of ordered) {
    if (!candidate?.url || seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    const valid = await validateImage(candidate.url);
    if (valid) return valid;
  }
  return null;
}

async function representativeImage(
  key: string,
  supabase: SupabaseClient,
  userId: string,
  currentIdeaId: string,
  memory: any,
  duplicate: any,
) {
  if (duplicate?.confidence === "high" && duplicate?.ideaId) {
    try {
      const { data } = await supabase
        .from("ideas")
        .select("enrichment")
        .eq("id", duplicate.ideaId)
        .eq("user_id", userId)
        .maybeSingle();
      const reused = await validateImage((data as any)?.enrichment?.image_url ?? null);
      if (reused) {
        return {
          url: reused,
          fit: (data as any)?.enrichment?.image_fit ?? "cover",
          reason: "Bild aus sicher erkannter gleicher Idee übernommen",
        };
      }
    } catch {}
  }

  const allCandidates: ImageCandidate[] = [];
  if (memory.representative_image_url) {
    allCandidates.push({ url: memory.representative_image_url, sourceTitle: "Agent-Auswahl" });
  }

  const queries = [
    [memory.title, memory.subject_location, memory.category].filter(Boolean).join(" "),
    [memory.tags?.join(" "), memory.category, memory.subject_location].filter(Boolean).join(" "),
    [memory.title, String(memory.summary ?? "").slice(0, 180)].filter(Boolean).join(" "),
  ].filter(Boolean);

  for (const query of queries) {
    try {
      const result: any = await searchImages(query, { supabase, userId, openAiKey: key, currentIdeaId });
      for (const candidate of result?.candidates ?? []) {
        allCandidates.push(candidate);
        if (allCandidates.length >= 14) break;
      }
    } catch {}
    if (allCandidates.length >= 14) break;
  }

  const selected = await chooseRepresentativeImage(key, memory, allCandidates);
  if (selected) return selected;

  const thematicQuery = [
    memory.tags?.join(" "),
    memory.category,
    memory.subject_location,
    "Praxis Aktivität Szene Landschaft repräsentatives Foto ohne Teamfoto ohne Logo",
  ].filter(Boolean).join(" ");
  const thematicCandidates: ImageCandidate[] = [];
  if (thematicQuery) {
    try {
      const result: any = await searchImages(thematicQuery, { supabase, userId, openAiKey: key, currentIdeaId });
      thematicCandidates.push(...((result?.candidates ?? []) as ImageCandidate[]).slice(0, 16));
    } catch {}
  }

  const thematicSelected = await chooseRepresentativeImage(key, memory, thematicCandidates);
  if (thematicSelected) {
    return {
      ...thematicSelected,
      reason: `Thematische Zweitsuche: ${thematicSelected.reason}`,
    };
  }

  const reliableThematic = await firstReliableFallback(thematicCandidates);
  if (reliableThematic) {
    return {
      url: reliableThematic,
      fit: "cover" as const,
      reason: "Thematischer Bild-Fallback nach Relevanzprüfung",
    };
  }

  const reliableOriginal = await firstReliableFallback(allCandidates);
  if (reliableOriginal) {
    return {
      url: reliableOriginal,
      fit: "cover" as const,
      reason: "Technisch zuverlässiger Bild-Fallback nach Relevanzprüfung",
    };
  }

  console.info("Kipu image relevance", {
    ideaId: currentIdeaId,
    candidates: allCandidates.length,
    thematicCandidates: thematicCandidates.length,
    selected: false,
  });
  return null;
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
      .update({
        enrichment: {
          ...existing,
          processing_status: "processing",
          processing_started_at: new Date().toISOString(),
        },
      })
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
    const duplicate = await resolveDuplicate(supabase, payload.userId, openAiKey, idea, memory, sources);

    let hero: string | null = null;
    let heroFit: "cover" | "contain" = memory.representative_image_fit ?? "cover";
    let imageReason = memory.image_reason;

    if (memory.use_input_image && inputImage) {
      hero = inputImage;
      imageReason = memory.image_reason || "Eingabefoto repräsentiert die Idee";
    } else {
      const selected = await representativeImage(
        openAiKey,
        supabase,
        payload.userId,
        idea.id,
        memory,
        duplicate,
      );
      if (selected) {
        hero = selected.url;
        heroFit = selected.fit;
        imageReason = selected.reason;
      }
    }

    const now = new Date().toISOString();
    console.info("Kipu duplicate final", {
      ideaId: idea.id,
      duplicateOf: duplicate.ideaId,
      confidence: duplicate.confidence,
      matchers: duplicate.matchers,
      source: duplicate.source,
    });
    console.info("Kipu image final", {
      ideaId: idea.id,
      hasImage: Boolean(hero),
      imageSource: memory.use_input_image && inputImage ? "input" : hero ? "ranked_or_fallback" : "none",
      imageReason,
    });

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
      image_fit: heroFit,
      image_reason: imageReason,
      input_image: inputImage,
      input_image_used: Boolean(memory.use_input_image && inputImage),
      related_idea_ids: memory.related_idea_ids,
      duplicate_of_idea_id: duplicate.ideaId,
      duplicate_confidence: duplicate.confidence,
      duplicate_reason: duplicate.reason,
      duplicate_matchers: duplicate.matchers,
      duplicate_decision_source: duplicate.source,
      possible_duplicate_of: duplicate.confidence === "possible" ? duplicate.ideaId : null,
      agentic: true,
      toolbox_version: 17,
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
          ? memory.subject_location_is_from_user
            ? "extracted"
            : "researched"
          : idea.latitude != null
            ? "device"
            : null,
        enrichment,
      })
      .eq("id", idea.id)
      .eq("user_id", payload.userId);
    if (update.error) throw update.error;

    if (memory.assigned_category_id) {
      try {
        await supabase.from("idea_categories").delete().eq("idea_id", idea.id);
        await supabase.from("idea_categories").insert({
          idea_id: idea.id,
          category_id: memory.assigned_category_id,
        });
      } catch (categoryError) {
        console.error("Idea category assignment failed", categoryError);
      }
    }

    return {
      ideaId: idea.id,
      status: "ready",
      duplicateOf: duplicate.ideaId,
      duplicateConfidence: duplicate.confidence,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "enrichment_failed";
    await supabase
      .from("ideas")
      .update({
        enrichment: {
          ...existing,
          processing_status: "failed",
          processing_error: message,
          processing_failed_at: new Date().toISOString(),
        },
      })
      .eq("id", idea.id)
      .eq("user_id", payload.userId);
    throw error;
  }
}
