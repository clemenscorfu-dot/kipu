import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "idea-images";
const MAX_BYTES = 8_000_000;
const INLINE_FALLBACK_MAX_BYTES = 5_000_000;

function extensionForMime(type: string) {
  const mime = type.toLowerCase().split(";")[0].trim();
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function decodeDataUrl(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/i);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_BYTES) return null;
  return { bytes, contentType: match[1].toLowerCase() };
}

async function fetchImageAttempt(value: string, headers: Record<string, string>) {
  try {
    const response = await fetch(value, {
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false as const, status: response.status, reason: `http_${response.status}` };
    const contentType = (response.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    if (!contentType.startsWith("image/")) return { ok: false as const, status: response.status, reason: `not_image:${contentType || "unknown"}` };
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) return { ok: false as const, status: response.status, reason: "too_large_declared" };
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return { ok: false as const, status: response.status, reason: "too_large_or_empty" };
    return { ok: true as const, bytes, contentType };
  } catch (error) {
    return { ok: false as const, status: null, reason: error instanceof Error ? error.message : "fetch_failed" };
  }
}

async function downloadImage(value: string) {
  if (value.startsWith("data:image/")) return decodeDataUrl(value);
  let parsed: URL;
  try { parsed = new URL(value); } catch { return null; }
  if (!/^https?:$/.test(parsed.protocol)) return null;

  const browserHeaders = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "de-CH,de;q=0.9,en;q=0.7",
  };
  const first = await fetchImageAttempt(value, browserHeaders);
  if (first.ok) return { bytes: first.bytes, contentType: first.contentType };

  const second = await fetchImageAttempt(value, {
    ...browserHeaders,
    Referer: `${parsed.protocol}//${parsed.host}/`,
    Origin: `${parsed.protocol}//${parsed.host}`,
  });
  if (second.ok) return { bytes: second.bytes, contentType: second.contentType };

  console.info("Kipu image mirror download failed", { host: parsed.host, first: first.reason, second: second.reason });
  return null;
}

async function writeEnrichment(supabase: SupabaseClient, userId: string, ideaId: string, enrichment: Record<string, any>) {
  const { error } = await supabase.from("ideas").update({ enrichment }).eq("id", ideaId).eq("user_id", userId);
  if (error) throw error;
}

export async function persistIdeaHeroImage(supabase: SupabaseClient, userId: string, ideaId: string) {
  const { data: idea, error } = await supabase.from("ideas").select("enrichment").eq("id", ideaId).eq("user_id", userId).single();
  if (error || !idea) throw error ?? new Error("idea_not_found_for_image_storage");

  const enrichment = (idea.enrichment ?? {}) as Record<string, any>;
  const imageUrl = typeof enrichment.image_url === "string" ? enrichment.image_url : null;
  if (!imageUrl) return { stored: false, reason: "no_image" };
  if (imageUrl.includes(`/storage/v1/object/public/${BUCKET}/`) || imageUrl.startsWith("data:image/")) {
    return { stored: true, url: imageUrl, reason: imageUrl.startsWith("data:image/") ? "inline_fallback" : "already_stored" };
  }

  const downloaded = await downloadImage(imageUrl);
  if (!downloaded) return { stored: false, reason: "download_failed" };

  const ext = extensionForMime(downloaded.contentType);
  const path = `${userId}/${ideaId}/hero.${ext}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, downloaded.bytes, {
    contentType: downloaded.contentType,
    upsert: true,
    cacheControl: "31536000",
  });

  if (uploadError) {
    const message = `${(uploadError as any)?.message ?? ""} ${(uploadError as any)?.code ?? ""}`.toLowerCase();
    const bucketMissing = message.includes("bucket not found") || message.includes("nosuchbucket");
    if (bucketMissing && downloaded.bytes.length <= INLINE_FALLBACK_MAX_BYTES) {
      const inlineUrl = `data:${downloaded.contentType};base64,${downloaded.bytes.toString("base64")}`;
      await writeEnrichment(supabase, userId, ideaId, {
        ...enrichment,
        image_url: inlineUrl,
        image_source_url: imageUrl,
        image_storage_fallback: "inline_data_url",
        image_stored_at: new Date().toISOString(),
      });
      return { stored: true, url: "inline-data-url", reason: "bucket_missing_inline_fallback" };
    }
    throw uploadError;
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const stableUrl = publicData.publicUrl;
  await writeEnrichment(supabase, userId, ideaId, {
    ...enrichment,
    image_url: stableUrl,
    image_storage_path: path,
    image_source_url: imageUrl.startsWith("data:image/") ? null : imageUrl,
    image_stored_at: new Date().toISOString(),
  });

  return { stored: true, url: stableUrl, path };
}
