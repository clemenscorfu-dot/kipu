import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

    const incoming = await request.formData();
    const audio = incoming.get("audio");
    if (!(audio instanceof File)) return NextResponse.json({ error: "Audio fehlt." }, { status: 400 });
    if (audio.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Audio ist zu gross." }, { status: 400 });

    const form = new FormData();
    form.append("file", audio, audio.name || "recording.webm");
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", "de");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Transcription failed", response.status, detail);
      return NextResponse.json({ error: "Transkription fehlgeschlagen." }, { status: 502 });
    }

    const payload = await response.json();
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Keine Sprache erkannt." }, { status: 422 });
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Transcription error", error);
    return NextResponse.json({ error: "Transkription fehlgeschlagen." }, { status: 500 });
  }
}
