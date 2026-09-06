import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { persistIdeaHeroImage } from "@/lib/kipu-image-storage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const token = auth.slice(7);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ error: "missing_config" }, { status: 500 });

    const supabase = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("ideas")
      .select("id,image_url:enrichment->>image_url")
      .eq("user_id", user.id)
      .like("enrichment->>image_url", "data:image/%")
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) throw error;

    let migrated = 0;
    for (const row of data ?? []) {
      try {
        const result = await persistIdeaHeroImage(supabase, user.id, row.id);
        if (result.stored && result.url !== "inline-data-url") migrated++;
      } catch (e) {
        console.error("legacy image backfill item failed", row.id, e);
      }
    }

    return NextResponse.json({ migrated, checked: data?.length ?? 0 });
  } catch (e) {
    console.error("legacy image backfill failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "backfill_failed" }, { status: 500 });
  }
}
