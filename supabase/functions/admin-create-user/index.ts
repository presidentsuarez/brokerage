// Secure replacement for the previously hardcoded service_role key.
// Service role injected by the platform (SUPABASE_SERVICE_ROLE_KEY) — never shipped to the client.
// No external imports (keeps the edge runtime boot fast & reliable).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, obj: unknown) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // 1) identify caller from their JWT
    const ur = await fetch(`${url}/auth/v1/user`, { headers: { apikey: service, Authorization: authHeader } });
    if (!ur.ok) return json(401, { error: "unauthorized" });
    const u = await ur.json();
    const email = u?.email;
    if (!email) return json(401, { error: "unauthorized" });

    // 2) caller must be an active org owner/admin
    const mr = await fetch(
      `${url}/rest/v1/org_members?select=role&user_email=eq.${encodeURIComponent(email)}&status=eq.active&role=in.(owner,admin)`,
      { headers: { apikey: service, Authorization: `Bearer ${service}` } },
    );
    const mem = await mr.json();
    if (!Array.isArray(mem) || mem.length === 0) return json(403, { error: "forbidden" });

    // 3) create the agent auth user (idempotent)
    const body = await req.json();
    const cr = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: body.email,
        password: body.password || "TempROGA2026!",
        email_confirm: true,
        user_metadata: { full_name: body.full_name },
      }),
    });
    return json(200, { ok: true, existed: !cr.ok });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
