// suarez-webhook-outbound
// Lives in REAP's Supabase project. Called by postgres triggers via pg_net.
// Builds an event payload, HMAC-signs it, POSTs to Suarez's reap-webhook endpoint.
// Public (no JWT) — security is via the HMAC signature on the outbound side
// AND the trigger only being callable from inside REAP's postgres.

const SUAREZ_URL = Deno.env.get("SUAREZ_WEBHOOK_URL")!;
const SECRET = Deno.env.get("SUAREZ_WEBHOOK_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { event_type, idempotency_key, source_record_id, payload } = body;

    if (!event_type || !idempotency_key) {
      return new Response(JSON.stringify({ error: "event_type and idempotency_key required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const outgoingBody = JSON.stringify({
      event_type,
      idempotency_key,
      source_record_id,
      payload: payload || {},
      sent_at: new Date().toISOString(),
    });
    const signature = await hmacHex(outgoingBody, SECRET);

    const resp = await fetch(SUAREZ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-reap-signature": signature,
      },
      body: outgoingBody,
    });
    const responseBody = await resp.text();

    return new Response(JSON.stringify({
      ok: resp.ok,
      status: resp.status,
      event_type,
      idempotency_key,
      response: responseBody.slice(0, 500),
    }), {
      status: resp.ok ? 200 : resp.status,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
