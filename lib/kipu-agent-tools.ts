export type AgentToolResult = Record<string, unknown>;

function absoluteUrl(value: string, base: string) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function getMeta(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].replace(/&amp;/g, "&").trim();
  }
  return null;
}

export async function inspectWebPage(url: string): Promise<AgentToolResult> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 KipuBot/1.0" },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return { ok: false, url, status: response.status };
    }

    const finalUrl = response.url || url;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return { ok: false, url: finalUrl, reason: "not_html", contentType };
    }

    const html = (await response.text()).slice(0, 750_000);
    const title = getMeta(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);
    const description = getMeta(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    ]);

    const imagePatterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
    ];

    const images: string[] = [];
    const seen = new Set<string>();
    for (const pattern of imagePatterns) {
      for (const match of html.matchAll(pattern)) {
        const absolute = match[1] ? absoluteUrl(match[1].replace(/&amp;/g, "&"), finalUrl) : null;
        if (absolute?.startsWith("http") && !seen.has(absolute)) {
          seen.add(absolute);
          images.push(absolute);
          if (images.length >= 8) break;
        }
      }
      if (images.length >= 8) break;
    }

    const jsonLd = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
      .slice(0, 3)
      .map((match) => match[1].replace(/\s+/g, " ").trim().slice(0, 6000));

    return {
      ok: true,
      url: finalUrl,
      title,
      description,
      images,
      structuredData: jsonLd,
    };
  } catch (error) {
    return { ok: false, url, error: error instanceof Error ? error.message : "fetch_failed" };
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<AgentToolResult> {
  try {
    const endpoint = new URL("https://nominatim.openstreetmap.org/reverse");
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("lat", String(latitude));
    endpoint.searchParams.set("lon", String(longitude));
    endpoint.searchParams.set("zoom", "18");
    endpoint.searchParams.set("addressdetails", "1");

    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "Kipu/0.1 (personal memory app)",
        "Accept-Language": "de,en;q=0.8",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const data = await response.json();
    return {
      ok: true,
      displayName: data.display_name ?? null,
      address: data.address ?? null,
      latitude,
      longitude,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "reverse_geocode_failed" };
  }
}

export const kipuFunctionTools = [
  {
    type: "function",
    name: "inspect_web_page",
    description: "Inspect a specific public webpage that is relevant to the remembered subject. Returns title, description, structured data and representative image candidates from the page. Use this after web search when a concrete page may provide better factual or visual evidence.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    type: "function",
    name: "reverse_geocode",
    description: "Resolve capture GPS coordinates into a human-readable place. Use only when knowing where the user captured the memory is useful. Capture location is not automatically the subject location.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        latitude: { type: "number" },
        longitude: { type: "number" },
      },
      required: ["latitude", "longitude"],
    },
  },
] as const;

export async function runKipuFunctionTool(name: string, args: Record<string, unknown>) {
  if (name === "inspect_web_page") {
    return inspectWebPage(String(args.url ?? ""));
  }
  if (name === "reverse_geocode") {
    return reverseGeocode(Number(args.latitude), Number(args.longitude));
  }
  return { ok: false, error: `unknown_tool:${name}` };
}
