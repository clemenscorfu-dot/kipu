import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "idea-images";
const MAX_BYTES = 8_000_000;

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

async function downloadImage(value: string) {
  if (value.startsWith("data:image/")) return decodeDataUrl(value);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol)) return null;

  const response = await fetch(value, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 KipuImageMirror/1.0",
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const contentType = (response.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
  if (!contentType.startsWith("image/")) return null;
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return null;
  return { bytes, contentType };
}

export async function persistIdeaHeroImage(
  supabase: SupabaseClient,
  userId: string,
  ideaId: string,
) {
  const { data: idea, error } = await supabase
    .from("ideas")
    .select("enrichment")
    .eq("id", ideaId)
    .eq("user_id", userId)
    .single();
  if (error || !idea) throw error ?? new Error("idea_not_found_for_image_storage");

  const enrichment = (idea.enrichment ?? {}) as Record<string, any>;
  const imageUrl = typeof enrichment.image_url === "string" ? enrichment.image_url : null;
  if (!imageUrl) return { stored: false, reason: "no_image" };
  if (imageUrl.includes(`/storage/v1/object/public/${BUCKET}/`)) {
    return { stored: true, url: imageUrl, reason: "already_stored" };
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
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const stableUrl = publicData.publicUrl;
  const nextEnrichment = {
    ...enrichment,
    image_url: stableUrl,
    image_storage_path: path,
    image_source_url: imageUrl.startsWith("data:image/") ? null : imageUrl,
    image_stored_at: new Date().toISOString(),
  };
  const { error: updateError } = await supabase
    .from("ideas")
    .update({ enrichment: nextEnrichment })
    .eq("id", ideaId)
    .eq("user_id", userId);
  if (updateError) throw updateError;

  return { stored: true, url: stableUrl, path };
}
