import type { SupabaseClient } from "@supabase/supabase-js";
import { searchImages } from "@/lib/kipu-agent-tools";

const MAX_IMAGE_BYTES = 5_000_000;
const MAX_CANDIDATES = 8;

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

type Candidate = { url: string; sourceUrl?: string; sourceTitle?: string };

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
  return /\b(team|staff|mitarbeiter|mitarbeitende|vorstand|kommission|committee|about|ueber-uns|über-uns|kontakt|contact|portrait|portraet|logo|impressum)\b/.test(text);
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

  const candidates: Candidate[] = [];
  if (typeof enrichment.image_url === "string" && enrichment.image_url) {
    candidates.push({ url: enrichment.image_url, sourceTitle: "Bisherige Auswahl" });
  }

  const queries = [
    `${idea.title} ${idea.location_label ?? ""} beautiful scenic atmospheric representative photo`,
    `${(idea.tags ?? []).join(" ")} ${idea.location_label ?? ""} nature lifestyle beautiful inspiring photo`,
    `${idea.title} emotional visual essence attractive memorable photo`,
  ];

  for (const query of queries) {
    try {
      const result: any = await searchImages(query, { supabase, userId, openAiKey, currentIdeaId: ideaId });
      const found = ((result?.candidates ?? []) as Candidate[]).filter((candidate) => !looksAdministrative(candidate));
      for (const candidate of found) {
        if (!candidates.some((existing) => existing.url === candidate.url)) candidates.push(candidate);
        if (candidates.length >= 14) break;
      }
    } catch {}
    if (candidates.length >= 14) break;
  }

  const usable: Array<Candidate & { dataUrl: string }> = [];
  for (const candidate of candidates) {
    const dataUrl = await imageAsDataUrl(candidate.url);
    if (dataUrl) usable.push({ ...candidate, dataUrl });
    if (usable.length >= MAX_CANDIDATES) break;
  }
  if (!usable.length) return { changed: false, reason: "no_downloadable_candidates" };

  const content: any[] = [
    {
      type: "input_text",
      text:
        `Du kuratierst das Hero-Bild für eine persönliche Ideen-App.\n\n` +
        `Idee: ${JSON.stringify(context)}\n\n` +
        `Wähle nicht einfach das sachlich korrekteste Bild, sondern das Bild mit dem höchsten Erinnerungswert. ` +
        `Bewerte in dieser Reihenfolge: (1) Identität: Bei einer konkreten Entität muss die konkrete Sache korrekt gezeigt werden. ` +
        `(2) Relevanz: Das Motiv muss eindeutig zur Idee passen. ` +
        `(3) Attraktivität und emotionale Essenz: Bevorzuge schöne, charakteristische, atmosphärische Bilder, die zeigen, warum die Idee reizvoll ist. ` +
        `Für Vorhaben und Interessen ist das emotionale Versprechen wichtiger als administrative Realität: Natur statt Parkplatz, Atmosphäre statt Gebäudefassade, Erlebnis statt Kursorganisation. ` +
        `Vermeide langweilige Dokumentationsbilder, Gruppenfotos, Sitzungs-/Kursräume, Logos, Funktionäre, Screenshots, Hinweistafeln und rein technische Infrastruktur, sofern genau diese nicht Kern der Idee sind. ` +
        `Ein Bild darf symbolisch-repräsentativ sein, wenn keine konkrete Entität abgebildet werden muss, darf aber nichts Falsches behaupten. ` +
        `Wähle nur null, wenn wirklich kein Kandidat sowohl passend als auch visuell brauchbar ist.`,
    },
  ];

  usable.forEach((candidate, index) => {
    content.push({ type: "input_text", text: `Kandidat ${index}: ${candidate.sourceTitle ?? candidate.sourceUrl ?? "Quelle unbekannt"}` });
    content.push({ type: "input_image", image_url: candidate.dataUrl, detail: "low" });
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
    if (!response.ok) return { changed: false, reason: `curation_${response.status}` };
    const raw = responseText(await response.json());
    if (!raw) return { changed: false, reason: "curation_no_output" };
    const choice = JSON.parse(raw) as { selected_index: number | null; confidence: string; reason: string };
    const index = choice.selected_index;
    if (index == null || index < 0 || index >= usable.length || choice.confidence === "none") {
      return { changed: false, reason: "curation_no_selection" };
    }

    const selected = usable[index];
    if (selected.url === enrichment.image_url) {
      return { changed: false, reason: `kept_existing: ${choice.reason}` };
    }

    const nextEnrichment = {
      ...enrichment,
      image_url: selected.url,
      image_fit: "cover",
      image_reason: `Kuratierte Auswahl (${choice.confidence}): ${choice.reason}`,
      image_curation_version: 1,
    };
    const { error: updateError } = await supabase
      .from("ideas")
      .update({ enrichment: nextEnrichment })
      .eq("id", ideaId)
      .eq("user_id", userId);
    if (updateError) throw updateError;

    return { changed: true, confidence: choice.confidence, reason: choice.reason };
  } catch (curationError) {
    return {
      changed: false,
      reason: curationError instanceof Error ? curationError.message : "curation_failed",
    };
  }
}
