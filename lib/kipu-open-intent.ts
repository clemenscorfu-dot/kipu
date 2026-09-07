import type { SupabaseClient } from "@supabase/supabase-js";

export type KipuOpenIntent = "read" | "visit" | "buy";

export function inferOpenIntent(input: string): KipuOpenIntent | null {
  const value = input.toLocaleLowerCase("de-CH").replace(/\s+/g, " ").trim();
  if (!value) return null;

  // Keep this intentionally conservative: only explicit, still-open user actions.
  if (/\b(lesen|durchlesen|noch lesen|mal lesen|read|to read)\b/i.test(value)) return "read";
  if (/\b(kaufen|anschaffen|besorgen|bestellen|buy|purchase|order)\b/i.test(value)) return "buy";
  if (
    /\b(mal|einmal|irgendwann|im (?:frühling|sommer|herbst|winter)|nächst(?:es|en|e|er)\b[^.!?]{0,30})\b[^.!?]{0,50}\b(hinfahren|fahren|hinfahren|hingehen|gehen|besuchen|visit|go)\b/i.test(value) ||
    /\b(hinfahren|hingehen|besuchen|visit)\b/i.test(value)
  ) return "visit";

  return null;
}

export async function ensureOpenIntent(
  supabase: SupabaseClient,
  userId: string,
  ideaId: string,
) {
  const { data, error } = await supabase
    .from("ideas")
    .select("original_input,enrichment")
    .eq("id", ideaId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { intent: null, changed: false };

  const intent = inferOpenIntent(String(data.original_input ?? ""));
  if (!intent) return { intent: null, changed: false };

  const enrichment = (data.enrichment ?? {}) as Record<string, any>;
  const memory = (enrichment.memory ?? {}) as Record<string, any>;
  if (memory.intent === intent) return { intent, changed: false };

  const { error: updateError } = await supabase
    .from("ideas")
    .update({ enrichment: { ...enrichment, memory: { ...memory, intent } } })
    .eq("id", ideaId)
    .eq("user_id", userId);
  if (updateError) throw updateError;
  return { intent, changed: true };
}
