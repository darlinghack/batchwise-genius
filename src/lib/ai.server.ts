// Server-only helper for Lovable AI Gateway.
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function chatJSON(opts: {
  system: string;
  user: string;
  model?: string;
}): Promise<unknown> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured (missing key).");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI returned an unexpected format.");
  }
}