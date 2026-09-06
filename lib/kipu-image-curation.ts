import type { SupabaseClient } from "@supabase/supabase-js";
import { searchImages } from "@/lib/kipu-agent-tools";

const MAX_IMAGE_BYTES = 5_000_000;
const MAX_CANDIDATES = 10;

const choiceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    selected_index: { anyOf: [{ type: "integer" }, { type: "null" }] },
    confidence: { type: "string", enum: ["high", "medium", "low", "none"] },
    reason: { type: "string" },
  },
  required: ["selected_index", "confidence", "reason"],
};

const visualQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["exact_entity", "representative"] },
    people_policy: { type: "string", enum: ["avoid", "allow", "prefer", "required"] },
    queries: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
    preferred_subjects: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
    avoid_subjects: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 },
    visual_goal: { type: "string" },
  },
  required: ["mode", "people_policy", "queries", "preferred_subjects", "avoid_subjects", "visual_goal"],
};

type Candidate = { url: string; sourceUrl?: string; sourceTitle?: string };
type VisualPlan = {
  mode: "exact_entity" | "representative";
  people_policy: "avoid" | "allow" | "prefer" | "required";
  queries: string[];
  preferred_subjects: string[];
  avoid_subjects: string[];
  visual_goal: string;
};

function responseText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  for (const output of payload?.output ?? []) {
    for (const content of output?.content ?? []) {
      if (typeof content?.text === "string" && content.text.trim()) return content.text;
    }
  }
  return null;
}

async function imageAsDataUrl(url: string) {
  if (url.startsWith("data:image/")) return url;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 KipuImageCurator/1.0",
        Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8",
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(type)) return null;
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_IMAGE_BYTES) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function looksAdministrative(candidate: Candidate) {
  const text = `${candidate.sourceTitle ?? ""} ${candidate.sourceUrl ?? ""}`.toLowerCase();
  return /\b(team|staff|mitarbeiter|mitarbeitende|vorstand|kommission|committee|about|ueber-uns|über-uns|kontakt|contact|portrait|portraet|logo|impressum|formular|pdf|organigramm)\b/.test(text);
}

async function createVisualQueries(openAiKey: string, context: Record<string, unknown>) {
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: [{
          role: "user",
          content: [{
            type: "input_text",
            text:
              `Erzeuge die Bildstrategie für das Hero-Bild einer persönlichen Ideen-App.\n\n` +
              `Idee: ${JSON.stringify(context)}\n\n` +
              `Entscheide zuerst: Ist eine konkrete Entität gespeichert (z.B. bestimmtes Buch, Restaurant, Produkt, Hotel, Person)? Dann mode=exact_entity und die Suchanfragen müssen genau diese Entität zeigen. ` +
              `Oder ist es ein Vorhaben, Interesse oder allgemeiner Wunsch? Dann mode=representative und suche nach der emotionalen, attraktiven Essenz der Idee. ` +
              `Bei representative gilt standardmässig: anonyme Personen vermeiden, wenn Menschen nicht selbst Kern der Idee sind. Ein zufälliger Mensch, Freizeitkleidung, Selfie-/Schnappschusscharakter oder unästhetische Actionaufnahme ist fast nie ein gutes Hero-Bild. ` +
              `Bevorzuge klare Hauptmotive, gute Komposition, schöne Natur, charakteristische Objekte, Tiere, Landschaft oder Atmosphäre. ` +
              `Keine Verwaltungsbilder, Teams, Logos, Gebäude ohne Aussage, Screenshots, Formulare oder Kursorganisation. ` +
              `Gib people_policy passend an: avoid wenn Menschen eher stören, allow wenn sie okay aber nicht nötig sind, prefer/required nur wenn menschliche Aktivität wirklich zentral ist. ` +
              `Die Suchanfragen müssen die preferred_subjects gezielt fördern und avoid_subjects vermeiden.`,
          }],
        }],
        text: { format: { type: "json_schema", name: "kipu_visual_queries", strict: true, schema: visualQuerySchema } },
      }),
    });
    if (!response.ok) return null;
    const raw = responseText(await response.json());
    if (!raw) return null;
    return JSON.parse(raw) as VisualPlan;
  } catch {
    return null;
  }
}

export async function curateIdeaHeroImage(
  supabase: SupabaseClient,
  userId: string,
  openAiKey: string,
  ideaId: string,
) {
  const { data: idea, error } = await supabase
    .from("ideas")
    .select("id,title,summary,tags,location_label,enrichment,input_type")
    .eq("id", ideaId)
    .eq("user_id", userId)
    .single();
  if (error || !idea) throw error ?? new Error("idea_not_found_for_image_curation");

  const enrichment = (idea.enrichment ?? {}) as Record<string, any>;
  if (enrichment.input_image_used || idea.input_type === "camera") {
    return { changed: false, reason: "user_image_preferred" };
  }

  const context = {
    title: idea.title,
    summary: idea.summary,
    tags: idea.tags ?? [],
    location: idea.location_label,
    category: enrichment.category ?? null,
    facts: enrichment.facts ?? [],
  };

  const visualPlan = await createVisualQueries(openAiKey, context);
  const candidates: Candidate[] = [];

  // Exact entities may keep the agent's original entity-specific image candidate.
  // Representative ideas deliberately start fresh so a merely factual/administrative image does not anchor the curation.
  if (visualPlan?.mode === "exact_entity" && typeof enrichment.image_url === "string" && enrichment.image_url) {
    candidates.push({ url: enrichment.image_url, sourceTitle: "Bisherige Auswahl" });
  }

  const generatedQueries = visualPlan?.queries ?? [];
  const fallbackQueries = [
    `${idea.title} ${idea.location_label ?? ""} beautiful scenic atmospheric representative photo`,
    `${(idea.tags ?? []).join(" ")} ${idea.location_label ?? ""} attractive memorable photography`,
    `${idea.title} emotional visual essence inspiring photo`,
  ];
  const queries = [...generatedQueries, ...fallbackQueries].filter((query, index, all) => query && all.indexOf(query) === index);

  for (const query of queries) {
    try {
      const result: any = await searchImages(query, { supabase, userId, openAiKey, currentIdeaId: ideaId });
      const found = ((result?.candidates ?? []) as Candidate[]).filter((candidate) => !looksAdministrative(candidate));
      for (const candidate of found) {
        if (!candidates.some((existing) => existing.url === candidate.url)) candidates.push(candidate);
        if (candidates.length >= 24) break;
      }
    } catch {}
    if (candidates.length >= 24) break;
  }

  const usable: Array<Candidate & { dataUrl: string }> = [];
  for (const candidate of candidates) {
    const dataUrl = await imageAsDataUrl(candidate.url);
    if (dataUrl) usable.push({ ...candidate, dataUrl });
    if (usable.length >= MAX_CANDIDATES) break;
  }
  if (!usable.length) return { changed: false, reason: "no_downloadable_candidates", visualPlan };

  const content: any[] = [
    {
      type: "input_text",
      text:
        `Du kuratierst das Hero-Bild für eine persönliche Ideen-App.\n\n` +
        `Idee: ${JSON.stringify(context)}\n` +
        `Bildstrategie: ${JSON.stringify(visualPlan ?? { mode: "unknown", people_policy: "avoid", visual_goal: "passend und erinnerungsstark" })}\n\n` +
        `Wähle das Bild mit dem höchsten Erinnerungswert. Prüfe jedes Bild tatsächlich visuell und beschreibe intern zuerst, was gross und dominant zu sehen ist. ` +
        `Bewerte danach in dieser Reihenfolge: (1) Identität bei konkreten Entitäten, (2) eindeutige Relevanz, (3) ästhetische Qualität und emotionale Essenz. ` +
        `Bei representative-Ideen gilt: Wenn people_policy=avoid, darf kein Bild gewinnen, auf dem eine anonyme Person das dominante Hauptmotiv ist. Wenn people_policy=allow, darf eine Person nur gewinnen, wenn Bildästhetik und Handlung klar hochwertiger sind als Tier/Landschaft/Objekt-Alternativen. ` +
        `Casual-Schnappschüsse, Freizeitkleidung als dominantes Motiv, ungünstige Körperhaltung, Amateur-/Stock-Schnappschusswirkung, Rückenansichten ohne starken Kontext oder technisch korrekte aber hässliche Szenen stark abwerten. ` +
        `Bevorzuge die preferred_subjects: ${(visualPlan?.preferred_subjects ?? []).join(", ") || "charakteristisches Hauptmotiv"}. ` +
        `Vermeide insbesondere: ${(visualPlan?.avoid_subjects ?? []).join(", ") || "Verwaltungsbilder, Teams, Logos, Screenshots"}. ` +
        `Für Vorhaben und Interessen ist das Erlebnisversprechen wichtiger als administrative Realität. Das Bild soll auf einem Handy sofort schön, klar und merkfähig wirken. ` +
        `Wähle null, wenn kein Kandidat diese Qualitätslatte erreicht; ein schlechtes Bild ist schlechter als vorübergehend kein kuratiertes Bild.`,
    },
  ];

  usable.forEach((candidate, index) => {
    content.push({ type: "input_text", text: `Kandidat ${index}: ${candidate.sourceTitle ?? candidate.sourceUrl ?? "Quelle unbekannt"}` });
    content.push({ type: "input_image", image_url: candidate.dataUrl, detail: "high" });
  });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: "kipu_image_curation", strict: true, schema: choiceSchema } },
      }),
    });
    if (!response.ok) return { changed: false, reason: `curation_${response.status}`, visualPlan };
    const raw = responseText(await response.json());
    if (!raw) return { changed: false, reason: "curation_no_output", visualPlan };
    const choice = JSON.parse(raw) as { selected_index: number | null; confidence: string; reason: string };
    const index = choice.selected_index;
    if (index == null || index < 0 || index >= usable.length || choice.confidence === "none" || choice.confidence === "low") {
      return { changed: false, reason: "curation_no_quality_selection", visualPlan, confidence: choice.confidence };
    }

    const selected = usable[index];
    if (selected.url === enrichment.image_url) {
      return { changed: false, reason: `kept_existing: ${choice.reason}`, confidence: choice.confidence, visualPlan };
    }

    const nextEnrichment = {
      ...enrichment,
      image_url: selected.url,
      image_fit: "cover",
      image_reason: `Kuratierte Auswahl (${choice.confidence}): ${choice.reason}`,
      image_curation_version: 3,
      image_visual_mode: visualPlan?.mode ?? null,
      image_people_policy: visualPlan?.people_policy ?? null,
      image_visual_goal: visualPlan?.visual_goal ?? null,
    };
    const { error: updateError } = await supabase
      .from("ideas")
      .update({ enrichment: nextEnrichment })
      .eq("id", ideaId)
      .eq("user_id", userId);
    if (updateError) throw updateError;

    return { changed: true, confidence: choice.confidence, reason: choice.reason, visualPlan };
  } catch (curationError) {
    return {
      changed: false,
      reason: curationError instanceof Error ? curationError.message : "curation_failed",
      visualPlan,
    };
  }
}
