import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { persistIdeaHeroImage } from "@/lib/kipu-image-storage";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const token = auth.slice(7);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey) return NextResponse.json({ error: "missing_config" }, { status: 500 });

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } } = await authClient.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Migration is a trusted server-side maintenance step. Once the caller is authenticated,
    // use the service role for DB + Storage so legacy images cannot get stuck behind RLS.
    const supabase = serviceRoleKey
      ? createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : authClient;

    const { data, error } = await supabase
      .from("ideas")
      .select("id,image_url:enrichment->>image_url")
      .eq("user_id", user.id)
      .like("enrichment->>image_url", "data:image/%")
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) throw error;

    let migrated = 0;
    const results: Array<{ id: string; stored: boolean; reason?: string }> = [];
    for (const row of data ?? []) {
      try {
        const result = await persistIdeaHeroImage(supabase, user.id, row.id);
        const stored = Boolean(result.stored && result.url !== "inline-data-url");
        if (stored) migrated++;
        results.push({ id: row.id, stored, reason: result.reason });
      } catch (e) {
        const reason = e instanceof Error ? e.message : "migration_failed";
        results.push({ id: row.id, stored: false, reason });
        console.error("legacy image backfill item failed", row.id, reason);
      }
    }

    const { count } = await supabase
      .from("ideas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .like("enrichment->>image_url", "data:image/%");

    console.info("legacy image backfill result", { userId: user.id, checked: data?.length ?? 0, migrated, remaining: count ?? 0, serviceRole: Boolean(serviceRoleKey) });
    return NextResponse.json({ migrated, checked: data?.length ?? 0, remaining: count ?? 0, results });
  } catch (e) {
    console.error("legacy image backfill failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "backfill_failed" }, { status: 500 });
  }
}
