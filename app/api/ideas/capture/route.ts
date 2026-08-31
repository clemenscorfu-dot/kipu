import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ideaSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    tags: { type: "array", items: { type: "string" }, maxItems: 8 },
    people: { type: "array", items: { type: "string" }, maxItems: 8 },
    explicit_location: { anyOf: [{ type: "string" }, { type: "null" }] },
    category: { type: "string" },
  },
  required: ["title", "summary", "tags", "people", "explicit_location", "category"],
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
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: "Du strukturierst persönliche Fundstücke für Kipu. Bewahre die Bedeutung des Originals. Erfinde keine Orte, Personen oder Fakten. Titel kurz und konkret. Summary 1 Satz. Tags auf Deutsch, knapp. explicit_location nur setzen, wenn der Ort im Text wirklich genannt wird; sonst null. category ist eine kurze Kategorie wie Ort, Essen, Produkt, Aktivität, Idee oder Sonstiges.",
            }],
          },
          { role: "user", content: [{ type: "input_text", text }] },
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
      category: string;
    };

    const hasCoords = Number.isFinite(body.latitude) && Number.isFinite(body.longitude);
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
        location_label: structured.explicit_location,
        location_source: hasCoords ? "device" : structured.explicit_location ? "extracted" : null,
        enrichment: {
          category: structured.category,
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
