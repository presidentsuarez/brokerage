// Prism — systems edge function. Holds integration secrets server-side and reports status.
// Owner/admin only. Systems: Brevo (email), GitHub (source/deploy), Supabase (backend).
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

    const checkedAt = new Date().toISOString();

    if (action === "brevo_status") {
      const key = Deno.env.get("BREVO_API_KEY");
      if (!key) return json({ system: "brevo", connected: false, reason: "no_key", checkedAt });
      const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key, "accept": "application/json" } });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        const plan = (data.plan ?? []).find((p: any) => String(p.creditsType ?? "").toLowerCase().includes("email"))
          ?? (data.plan ?? [])[0] ?? {};
        return json({ system: "brevo", connected: true, http: r.status, email: data.email, company: data.companyName, plan: plan.type ?? null, credits: plan.credits ?? null, checkedAt });
      }
      return json({ system: "brevo", connected: false, http: r.status, reason: data.code ?? "error", message: data.message ?? "Brevo error", checkedAt });
    }

    if (action === "github_status") {
      const pat = Deno.env.get("GITHUB_PAT");
      if (!pat) return json({ system: "github", connected: false, reason: "no_token", checkedAt });
      const r = await fetch("https://api.github.com/repos/presidentsuarez/brokerage", {
        headers: { "Authorization": `Bearer ${pat}`, "Accept": "application/vnd.github+json", "User-Agent": "PrismApp" },
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) return json({ system: "github", connected: true, http: r.status, repo: d.full_name, visibility: d.private ? "private" : "public", branch: d.default_branch, pushedAt: d.pushed_at ? String(d.pushed_at).replace("T", " ").replace("Z", " UTC") : null, checkedAt });
      return json({ system: "github", connected: false, http: r.status, message: d.message ?? "GitHub error", checkedAt });
    }

    if (action === "supabase_status") {
      const { error } = await supabase.from("organizations").select("id", { head: true, count: "exact" });
      if (!error) return json({ system: "supabase", connected: true, ref: "rtgfnwktybkorqvlirtd", url: Deno.env.get("SUPABASE_URL"), db: "reachable", checkedAt });
      return json({ system: "supabase", connected: false, message: error.message, checkedAt });
    }

    if (action === "quo_status") {
      const key = Deno.env.get("OPENPHONE_API_KEY");
      if (!key) return json({ system: "quo", connected: false, reason: "no_key", checkedAt });
      const r = await fetch("https://api.openphone.com/v1/phone-numbers", { headers: { "Authorization": key } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return json({ system: "quo", connected: false, http: r.status, message: d.message ?? d.error ?? "OpenPhone error", checkedAt });
      const arr = Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
      const lines = arr.map((n: any) => ({
        id: n.id,
        name: n.name ?? null,
        number: n.formattedNumber ?? n.number ?? n.phoneNumber ?? null,
        users: Array.isArray(n.users) ? n.users.length : (n.userId ? 1 : 0),
      }));
      // best-effort team roster (don't fail the status if this errors)
      let users: any[] = [];
      try {
        const ru = await fetch("https://api.openphone.com/v1/users", { headers: { "Authorization": key } });
        if (ru.ok) {
          const du = await ru.json();
          const ua = Array.isArray(du.data) ? du.data : [];
          users = ua.map((u: any) => ({ name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email, email: u.email, role: u.role ?? null }));
        }
      } catch (_) { /* ignore */ }
      return json({ system: "quo", connected: true, http: r.status, lineCount: lines.length, lines, userCount: users.length, users, checkedAt });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
