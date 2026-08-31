import type { EnrichIdeaPayload } from "@/lib/kipu-enrichment";

async function enrichIdeaStep(payload: EnrichIdeaPayload) {
  "use step";
  const { enrichPendingIdea } = await import("@/lib/kipu-enrichment");
  return enrichPendingIdea(payload);
}

export async function enrichIdeaWorkflow(payload: EnrichIdeaPayload) {
  "use workflow";
  return enrichIdeaStep(payload);
}
