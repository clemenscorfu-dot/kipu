import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { kipuFunctionTools, runKipuFunctionTool } from "@/lib/kipu-agent-tools";

const factSchema = {
  type: "object",
  additionalProperties: false,
  properties: { label: { type: "string" }, value: { type: "string" } },
  required: ["label", "value"],
};

const memorySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    tags: { type: "array", items: { type: "string" }, maxItems: 3 },
    people: { type: "array", items: { type: "string" }, maxItems: 8 },
    category: { type: "string" },
    subject_location: { anyOf: [{ type: "string" }, { type: "null" }] },
    subject_location_is_from_user: { type: "boolean" },
    facts: { type: "array", items: factSchema, maxItems: 5 },
    representative_image_url: { anyOf: [{ type: "string" }, { type: "null" }] },
    representative_image_fit: { type: "string", enum: ["cover", "contain"] },
    image_reason: { type: "string" },
  },
  required: [
    "title",
    "summary",
    "tags",
    "people",
    "category",
    "subject_location",
    "subject_location_is_from_user",
    "facts",
    "representative_image_url",
    "representative_image_fit",
    "image_reason",
  ],
};

type CaptureBody = { text?: string; latitude?: number | null; longitude?: number | null };
type Source = { title?: string; url: string };

type AgentResponse = {
  id?: string;
  output_text?: string;
  output?: Array<Record<string, any>>;
};

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

async function callOpenAI(openAiKey: string, body: Record<string, unknown>) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Kipu agent OpenAI error", response.status, detail);
    throw new Error(`openai_${response.status}`);
  }
  return (await response.json()) as AgentResponse;
}

async function runAgent(openAiKey: string, text: string, latitude?: number | null, longitude?: number | null) {
  const tools = [{ type: "web_search" }, ...kipuFunctionTools];
  const allSources: Source[] = [];
  const inspectedSources: Source[] = [];
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  const system = `Du bist Kipu, ein persönlicher Memory-Agent. Dein Ziel ist nicht, ein Formular auszufüllen, sondern aus einem oft sehr knappen persönlichen Input die bestmögliche spätere Erinnerung zu machen.

Du hast Tools. Entscheide selbst, ob und in welcher Reihenfolge du sie brauchst. Nutze Web Search für öffentlich identifizierbare Dinge, inspect_web_page für relevante konkrete Seiten und deren Bildkandidaten, reverse_geocode nur wenn der Aufnahmekontext hilfreich ist. Es gibt KEINE Kategorie-Sonderregeln.

Grundsätze:
- Originalinput ist unveränderliche Wahrheit. Erfinde keine persönlichen Fakten.
- Recherchiere nur, wenn es die Erinnerung wirklich besser macht.
- Eine Recherche ist kein Bericht: summary 1-2 kurze, natürliche Sätze; facts höchstens 5 wirklich nützliche Punkte.
- Keine URLs, Markdown-Links, Quellenklammern oder Tool-Metadaten in summary oder facts.
- Quellen werden von der Anwendung separat gespeichert.
- Wähle genau ein representative_image_url, wenn du anhand der Recherche ein belastbares Bild findest, das die konkrete Entität gut repräsentiert. Das kann je nach Inhalt natürlich Cover, Produktfoto, Restaurantansicht, Landschaft, Poster usw. sein. Nutze nur Bild-URLs, die ein Tool tatsächlich geliefert hat; erfinde niemals eine Bild-URL. Wenn kein belastbares Bild existiert: null.
- representative_image_fit: cover für bildfüllende Szenen/Fotos, contain wenn das Motiv vollständig sichtbar bleiben sollte.
- Maximal 3 hilfreiche Tags.
- Capture Location und Subject Location sind getrennt. GPS ist nur Aufnahmekontext. subject_location ist nur der Ort des erinnerten Gegenstands, nicht automatisch der Aufnahmeort.
- Wenn der Nutzer sprachlich 'hier', 'diese Stelle' o.ä. meint und GPS vorliegt, darfst du reverse_geocode nutzen und entscheiden, ob der Aufnahmeort zugleich Subject Location ist.
- Antworte am Ende ausschließlich im vorgegebenen strukturierten Schema.`;

  const userContext = hasCoords
    ? `Persönlicher Input:\n${text}\n\nAufnahmekontext: GPS ${latitude}, ${longitude}. Dieser Ort ist NICHT automatisch der Ort des Fundstücks.`
    : `Persönlicher Input:\n${text}\n\nKein GPS-Aufnahmekontext verfügbar.`;

  let response = await callOpenAI(openAiKey, {
    model: "gpt-5.6-luna",
    tools,
    include: ["web_search_call.action.sources"],
    input: [
      { role: "system", content: [{ type: "input_text", text: system }] },
      { role: "user", content: [{ type: "input_text", text: userContext }] },
    ],
    text: { format: { type: "json_schema", name: "kipu_memory", strict: true, schema: memorySchema } },
  });

  for (let step = 0; step < 6; step++) {
    allSources.push(...extractSources(response));
    const calls = (response.output ?? []).filter((item) => item.type === "function_call");
    if (!calls.length) break;

    const outputs = [];
    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.arguments ?? "{}"); } catch {}
      const result = await runKipuFunctionTool(call.name, args);
      if (call.name === "inspect_web_page" && typeof args.url === "string") {
        inspectedSources.push({ url: args.url, title: typeof result.title === "string" ? result.title : undefined });
      }
      outputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }

    response = await callOpenAI(openAiKey, {
      model: "gpt-5.6-luna",
      previous_response_id: response.id,
      tools,
      include: ["web_search_call.action.sources"],
      input: outputs,
      text: { format: { type: "json_schema", name: "kipu_memory", strict: true, schema: memorySchema } },
    });
  }

  allSources.push(...extractSources(response), ...inspectedSources);
  const raw = extractResponseText(response);
  if (!raw) throw new Error("agent_no_final_output");
  const memory = JSON.parse(raw) as {
    title: string; summary: string; tags: string[]; people: string[]; category: string;
    subject_location: string | null; subject_location_is_from_user: boolean;
    facts: Array<{ label: string; value: string }>;
    representative_image_url: string | null; representative_image_fit: "cover" | "contain"; image_reason: string;
  };

  memory.summary = cleanGeneratedText(memory.summary);
  memory.facts = memory.facts.map((fact) => ({ label: cleanGeneratedText(fact.label), value: cleanGeneratedText(fact.value) }));

  const uniqueSources: Source[] = [];
  const seen = new Set<string>();
  for (const source of allSources) {
    if (!source.url || seen.has(source.url)) continue;
    seen.add(source.url);
    uniqueSources.push(source);
  }

  return { memory, sources: uniqueSources.slice(0, 8) };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CaptureBody;
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: "Text fehlt." }, { status: 400 });
    if (text.length > 5000) return NextResponse.json({ error: "Text ist zu lang." }, { status: 400 });

    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!supabaseUrl || !supabaseKey || !openAiKey) return NextResponse.json({ error: "Server-Konfiguration unvollständig." }, { status: 500 });

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "Session ungültig." }, { status: 401 });

    const { memory, sources } = await runAgent(openAiKey, text, body.latitude, body.longitude);
    const hasCoords = Number.isFinite(body.latitude) && Number.isFinite(body.longitude);

    const { data: idea, error: insertError } = await supabase.from("ideas").insert({
      user_id: userData.user.id,
      input_type: "text",
      original_input: text,
      title: memory.title,
      summary: memory.summary,
      tags: memory.tags,
      people: memory.people,
      latitude: hasCoords ? body.latitude : null,
      longitude: hasCoords ? body.longitude : null,
      location_label: memory.subject_location,
      location_source: memory.subject_location ? (memory.subject_location_is_from_user ? "extracted" : "researched") : hasCoords ? "device" : null,
      enrichment: {
        category: memory.category,
        facts: memory.facts,
        sources,
        image_url: memory.representative_image_url,
        image_fit: memory.representative_image_fit,
        image_reason: memory.image_reason,
        capture_location: hasCoords ? { latitude: body.latitude, longitude: body.longitude } : null,
        agentic: true,
        model: "gpt-5.6-luna",
        enriched_at: new Date().toISOString(),
      },
    }).select("*").single();

    if (insertError) {
      console.error("Supabase insert failed", insertError);
      return NextResponse.json({ error: "Speichern in Supabase fehlgeschlagen.", detail: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ idea });
  } catch (error) {
    console.error("Kipu capture agent error", error);
    return NextResponse.json({ error: "KI-Verarbeitung fehlgeschlagen." }, { status: 502 });
  }
}
