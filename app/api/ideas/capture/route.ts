import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const factSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    value: { type: "string" },
  },
  required: ["label", "value"],
};

const ideaSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    tags: { type: "array", items: { type: "string" }, maxItems: 8 },
    people: { type: "array", items: { type: "string" }, maxItems: 8 },
    explicit_location: { anyOf: [{ type: "string" }, { type: "null" }] },
    location_mentioned: { type: "boolean" },
    category: { type: "string" },
    entity_type: { anyOf: [{ type: "string" }, { type: "null" }] },
    entity_name: { anyOf: [{ type: "string" }, { type: "null" }] },
    research_used: { type: "boolean" },
    research_summary: { anyOf: [{ type: "string" }, { type: "null" }] },
    facts: { type: "array", items: factSchema, maxItems: 6 },
  },
  required: [
    "title",
    "summary",
    "tags",
    "people",
    "explicit_location",
    "location_mentioned",
    "category",
    "entity_type",
    "entity_name",
    "research_used",
    "research_summary",
    "facts",
  ],
};

type CaptureBody = {
  text?: string;
  latitude?: number | null;
  longitude?: number | null;
};

function extractResponseText(payload: any): string | null {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const output of payload?.output ?? []) {
    for (const content of output?.content ?? []) {
      if (typeof content?.text === "string") return content.text;
    }
  }
  return null;
}

function extractWebSources(payload: any) {
  const sources: Array<{ title?: string; url: string }> = [];
  const seen = new Set<string>();

  for (const output of payload?.output ?? []) {
    if (output?.type !== "web_search_call") continue;
    for (const source of output?.action?.sources ?? []) {
      if (!source?.url || seen.has(source.url)) continue;
      seen.add(source.url);
      sources.push({ title: source.title, url: source.url });
    }
  }

  return sources.slice(0, 8);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CaptureBody;
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: "Text fehlt." }, { status: 400 });
    if (text.length > 5000) return NextResponse.json({ error: "Text ist zu lang." }, { status: 400 });

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !openAiKey) {
      return NextResponse.json({ error: "Server-Konfiguration unvollständig." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) return NextResponse.json({ error: "Session ungültig." }, { status: 401 });

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        tools: [{ type: "web_search" }],
        include: ["web_search_call.action.sources"],
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: `Du bist die Intelligenz hinter Kipu, einem persönlichen Fundstück-Gedächtnis.

Dein Job ist NICHT nur zu kategorisieren. Verstehe, was die Person später wiederfinden möchte, und ergänze nützlichen Kontext.

REGELN:
- Das Original ist die Wahrheit. Erfinde keine persönlichen Fakten, Orte oder Beziehungen.
- Wenn der Input ein öffentlich identifizierbares Ding nennt oder sehr wahrscheinlich meint (z.B. Buch, Restaurant, Produkt, Film, Wanderung, Firma, Veranstaltung, Sehenswürdigkeit), nutze Web Search, wenn Recherche die Erinnerung deutlich nützlicher macht.
- Recherchiere nur grob und zielgerichtet: 2-6 wirklich hilfreiche Fakten, keine Wikipedia-Abhandlung.
- Bei einem Buch sind z.B. Autor, vollständiger Titel/Originaltitel, Thema und ggf. Erscheinung/Verlag sinnvoll.
- Bei Restaurant/Ort sind z.B. offizieller Name, Adresse, Art/Küche und ein relevantes Detail sinnvoll.
- Bei Produkten sind Hersteller, genaue Modellbezeichnung und Produktart sinnvoll.
- Bei rein persönlichen Ideen oder unbekannten Orten ohne identifizierbaren Namen NICHT im Web nach irgendeinem ähnlichen Ding suchen.
- location_mentioned ist nur true, wenn im ORIGINALTEXT tatsächlich ein Ort genannt oder sprachlich eindeutig beschrieben wurde. GPS-Koordinaten gehören NICHT zum Originaltext und dürfen explicit_location niemals beeinflussen.
- explicit_location nur aus dem Originaltext ableiten. Wenn dort kein Ort genannt ist: null.
- title soll so konkret sein, dass die Erinnerung später sofort erkennbar ist.
- summary ist eine kurze, natürliche Einordnung, nicht bloß eine Wiederholung des Inputs.
- research_summary fasst recherchierte Zusatzinfos in 1-2 Sätzen zusammen. Wenn keine Recherche sinnvoll war: null.
- facts enthält nur recherchierte oder sehr sichere öffentliche Fakten; bei keiner Recherche leeres Array.
- Tags kurz, deutsch und hilfreich für spätere Suche.
- category kurz und nutzerfreundlich, z.B. Buch, Restaurant, Ort, Produkt, Aktivität, Idee, Film, Rezept oder Sonstiges.`,
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Persönlicher Input:\n${text}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "kipu_idea",
            strict: true,
            schema: ideaSchema,
          },
        },
      }),
    });

    if (!aiResponse.ok) {
      const detail = await aiResponse.text();
      console.error("OpenAI capture failed", aiResponse.status, detail);
      return NextResponse.json({ error: "KI-Verarbeitung fehlgeschlagen." }, { status: 502 });
    }

    const aiPayload = await aiResponse.json();
    const raw = extractResponseText(aiPayload);
    if (!raw) return NextResponse.json({ error: "KI-Antwort war leer." }, { status: 502 });

    const structured = JSON.parse(raw) as {
      title: string;
      summary: string;
      tags: string[];
      people: string[];
      explicit_location: string | null;
      location_mentioned: boolean;
      category: string;
      entity_type: string | null;
      entity_name: string | null;
      research_used: boolean;
      research_summary: string | null;
      facts: Array<{ label: string; value: string }>;
    };

    const sources = extractWebSources(aiPayload);
    const hasCoords = Number.isFinite(body.latitude) && Number.isFinite(body.longitude);
    const locationLabel = structured.location_mentioned ? structured.explicit_location : null;

    const { data: idea, error: insertError } = await supabase
      .from("ideas")
      .insert({
        user_id: userData.user.id,
        input_type: "text",
        original_input: text,
        title: structured.title,
        summary: structured.summary,
        tags: structured.tags,
        people: structured.people,
        latitude: hasCoords ? body.latitude : null,
        longitude: hasCoords ? body.longitude : null,
        location_label: locationLabel,
        location_source: locationLabel ? "extracted" : hasCoords ? "device" : null,
        enrichment: {
          category: structured.category,
          entity_type: structured.entity_type,
          entity_name: structured.entity_name,
          research_used: structured.research_used,
          research_summary: structured.research_summary,
          facts: structured.facts,
          sources,
          model: "gpt-5.6-luna",
          enriched_at: new Date().toISOString(),
        },
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Supabase insert failed", insertError);
      return NextResponse.json({ error: "Speichern in Supabase fehlgeschlagen.", detail: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ idea });
  } catch (error) {
    console.error("Capture route error", error);
    return NextResponse.json({ error: "Unerwarteter Fehler." }, { status: 500 });
  }
}
