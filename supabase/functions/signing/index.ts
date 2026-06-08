// Prism — signing edge function (server-side trust boundary)
// Phase 1: token resolution + audit logging. Sealing/email/Stripe land in later phases.
// Supabase auto-injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? url.searchParams.get("action") ?? "resolve";
    const token = body.token ?? url.searchParams.get("token");
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const ua = req.headers.get("user-agent") ?? "";

    if (action === "health") {
      return json({ ok: true, service: "signing", phase: 1 });
    }

    if (action === "resolve") {
      if (!token) return json({ error: "missing token" }, 400);
      const { data: rows, error } = await supabase
        .from("signing_requests").select("*").eq("access_token", token).limit(1);
      if (error) return json({ error: error.message }, 500);
      const sr = rows?.[0];
      if (!sr) return json({ error: "invalid token" }, 404);
      if (sr.status === "voided") return json({ error: "voided" }, 410);
      if (sr.token_expires_at && new Date(sr.token_expires_at) < new Date()) {
        await supabase.from("signing_requests").update({ status: "expired" }).eq("id", sr.id);
        return json({ error: "expired" }, 410);
      }

      const { data: docs } = await supabase
        .from("request_documents").select("*").eq("request_id", sr.id).order("sort_order");
      const tmplIds = (docs ?? []).map((d) => d.template_id);
      const { data: fields } = await supabase
        .from("document_fields").select("*")
        .in("template_id", tmplIds.length ? tmplIds : ["00000000-0000-0000-0000-000000000000"])
        .order("sort_order");

      const patch: Record<string, unknown> = { viewed_at: sr.viewed_at ?? new Date().toISOString() };
      if (sr.status === "sent") patch.status = "viewed";
      await supabase.from("signing_requests").update(patch).eq("id", sr.id);
      await supabase.from("signing_events").insert({
        request_id: sr.id, event_type: "opened", actor: sr.recipient_email, ip, user_agent: ua,
      });

      return json({
        request: {
          id: sr.id, recipient_name: sr.recipient_name, recipient_email: sr.recipient_email,
          status: patch.status ?? sr.status, consent_at: sr.consent_at,
          token_expires_at: sr.token_expires_at,
        },
        documents: docs ?? [],
        fields: fields ?? [],
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
