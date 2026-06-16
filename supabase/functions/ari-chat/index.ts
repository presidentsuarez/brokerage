import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AK = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SU = Deno.env.get("SUPABASE_URL") || "";
const SK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CH = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Thin server-side proxy for Anthropic. Keeps the API key off the browser.
// The caller supplies model / system / messages (and optionally tools); we
// inject the key, forward to Anthropic, log token cost, and return the raw
// Anthropic response so existing client parsing (data.content[0].text) works.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CH });
  try {
    if (!AK) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set on this project" }),
        { status: 500, headers: { ...CH, "Content-Type": "application/json" } });
    }
    const body = await req.json();
    const payload: Record<string, unknown> = {
      model: body.model || "claude-sonnet-4-6",
      max_tokens: body.max_tokens || 1024,
      messages: body.messages || [],
    };
    if (body.system) payload.system = body.system;
    if (body.tools) payload.tools = body.tools;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": AK, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();

    // best-effort usage logging (never blocks the response)
    try {
      const ti = data?.usage?.input_tokens || 0;
      const to = data?.usage?.output_tokens || 0;
      const cost = (ti / 1e6 * 3) + (to / 1e6 * 15);
      const sb = createClient(SU, SK);
      await sb.from("api_usage_log").insert({
        service: "Anthropic",
        endpoint: body.endpoint || "ari_chat",
        user_email: body.user_email || null,
        cost_estimate: cost,
      });
    } catch (_) { /* ignore logging errors */ }

    return new Response(JSON.stringify(data), {
      status: r.status,
      headers: { ...CH, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...CH, "Content-Type": "application/json" } });
  }
});
