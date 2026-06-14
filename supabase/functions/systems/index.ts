// Prism — systems edge function. Holds integration secrets server-side and reports status.
// Owner/admin only. First system: Brevo (email marketing).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "";

    // ── auth: owner/admin only ──
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await supabase.from("user_profiles").select("role").eq("email", user.email).maybeSingle();
    if (!prof || !["owner", "admin"].includes(prof.role)) return json({ error: "forbidden" }, 403);

    if (action === "brevo_status") {
      const key = Deno.env.get("BREVO_API_KEY");
      const checkedAt = new Date().toISOString();
      if (!key) return json({ system: "brevo", connected: false, reason: "no_key", checkedAt });
      const r = await fetch("https://api.brevo.com/v3/account", {
        headers: { "api-key": key, "accept": "application/json" },
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        const plan = (data.plan ?? []).find((p: any) => String(p.creditsType ?? "").toLowerCase().includes("email"))
          ?? (data.plan ?? [])[0] ?? {};
        return json({
          system: "brevo", connected: true, http: r.status,
          email: data.email, company: data.companyName,
          plan: plan.type ?? null, credits: plan.credits ?? null, creditsType: plan.creditsType ?? null,
          checkedAt,
        });
      }
      return json({
        system: "brevo", connected: false, http: r.status,
        reason: data.code ?? "error", message: data.message ?? "Brevo returned an error", checkedAt,
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
