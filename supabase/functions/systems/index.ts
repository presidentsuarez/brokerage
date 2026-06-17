// Ari — systems edge function. Holds integration secrets server-side and reports status.
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

const QKEY = Deno.env.get("OPENPHONE_API_KEY") || "";
const QOP = "https://api.openphone.com/v1";
const QH = { "Authorization": QKEY };
async function qget(path: string) {
  try { const r = await fetch(QOP + path, { headers: QH }); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, j }; }
  catch (e) { return { ok: false, status: 0, j: { message: String(e) } }; }
}
const qDayKey = (iso: string) => { const d = new Date(iso); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const qLastDays = (n: number) => { const out: string[] = []; const t = new Date(); for (let i = n - 1; i >= 0; i--) { const d = new Date(t); d.setUTCDate(t.getUTCDate() - i); out.push(`${d.getUTCMonth() + 1}/${d.getUTCDate()}`); } return out; };
async function qLines() { const pn = await qget("/phone-numbers"); return { ok: pn.ok, status: pn.status, j: pn.j, lines: (pn.j.data || []).map((n: any) => ({ id: n.id, name: n.name ?? null, number: n.formattedNumber ?? n.number, e164: n.number, users: Array.isArray(n.users) ? n.users.length : 0 })) }; }
async function qRecentConvs(cap: number) {
  const { lines } = await qLines(); let convs: any[] = [];
  for (const ln of lines) { const c = await qget(`/conversations?phoneNumberId=${ln.id}&maxResults=50`); if (c.ok) (c.j.data || []).forEach((cv: any) => convs.push({ ...cv, _line: ln.name || ln.number })); }
  convs.sort((a, b) => new Date(b.lastActivityAt || b.createdAt).getTime() - new Date(a.lastActivityAt || a.createdAt).getTime());
  return convs.slice(0, cap);
}


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
        headers: { "Authorization": `Bearer ${pat}`, "Accept": "application/vnd.github+json", "User-Agent": "AriApp" },
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

    if (action === "quo_overview") {
      if (!QKEY) return json({ system: "quo", connected: false, reason: "no_key", checkedAt });
      const L = await qLines();
      if (!L.ok) return json({ system: "quo", connected: false, http: L.status, message: L.j.message ?? "OpenPhone error", checkedAt });
      const lines = L.lines;
      let convs: any[] = [];
      for (const ln of lines) { const c = await qget(`/conversations?phoneNumberId=${ln.id}&maxResults=100`); if (c.ok) (c.j.data || []).forEach((cv: any) => convs.push({ ...cv, _line: ln.name || ln.number })); }
      const d7 = Date.now() - 7 * 864e5;
      const activeLast7 = convs.filter((c) => new Date(c.lastActivityAt || c.updatedAt || c.createdAt).getTime() >= d7).length;
      const byLineMap: Record<string, number> = {};
      convs.forEach((c) => { const k = c._line || "-"; byLineMap[k] = (byLineMap[k] || 0) + 1; });
      const byLine = lines.map((ln: any) => ({ name: ln.name || ln.number, number: ln.number, count: byLineMap[ln.name || ln.number] || 0, users: ln.users }));
      const days = qLastDays(14); const dayMap: Record<string, number> = {}; days.forEach((d) => dayMap[d] = 0);
      convs.forEach((c) => { const k = qDayKey(c.lastActivityAt || c.updatedAt || c.createdAt); if (k in dayMap) dayMap[k]++; });
      const activityByDay = days.map((d) => ({ day: d, count: dayMap[d] }));
      const pMap: Record<string, number> = {};
      convs.forEach((c) => (c.participants || []).forEach((p: string) => { pMap[p] = (pMap[p] || 0) + 1; }));
      const topParticipants = Object.entries(pMap).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 6).map(([num, count]) => ({ num, count }));
      const recent = [...convs].sort((a, b) => new Date(b.lastActivityAt || b.createdAt).getTime() - new Date(a.lastActivityAt || a.createdAt).getTime())
        .slice(0, 12).map((c) => ({ id: c.id, line: c._line, participants: c.participants, lastActivityAt: c.lastActivityAt, assignedTo: c.assignedTo }));
      let users: any[] = []; const u = await qget("/users");
      if (u.ok) users = (u.j.data || []).map((x: any) => ({ name: [x.firstName, x.lastName].filter(Boolean).join(" ") || x.email, email: x.email, role: x.role ?? null }));
      return json({ system: "quo", connected: true, lineCount: lines.length, lines, conversationCount: convs.length, activeLast7, byLine, activityByDay, topParticipants, recent, userCount: users.length, users, checkedAt });
    }

    if (action === "quo_calls") {
      if (!QKEY) return json({ connected: false, reason: "no_key", checkedAt });
      const convs = await qRecentConvs(20); let calls: any[] = [];
      for (const c of convs) {
        const parts = (c.participants || []).map((p: string) => `participants[]=${encodeURIComponent(p)}`).join("&");
        if (!parts) continue;
        const r = await qget(`/calls?phoneNumberId=${c.phoneNumberId}&${parts}&maxResults=20`);
        if (r.ok) (r.j.data || []).forEach((cl: any) => calls.push({ id: cl.id, direction: cl.direction, status: cl.status, duration: cl.duration ?? 0, at: cl.completedAt || cl.createdAt || cl.answeredAt, participant: (c.participants || [])[0], line: c._line }));
      }
      const seen: any = {}; calls = calls.filter((c) => c.id && !seen[c.id] && (seen[c.id] = 1));
      calls.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      const days = qLastDays(14); const dm: any = {}; days.forEach((d) => dm[d] = 0); calls.forEach((c) => { const k = qDayKey(c.at); if (k in dm) dm[k]++; });
      const inbound = calls.filter((c) => /in/i.test(c.direction || "")).length;
      const totalDuration = calls.reduce((s2, c) => s2 + (c.duration || 0), 0);
      return json({ connected: true, total: calls.length, calls: calls.slice(0, 80), byDay: days.map((d) => ({ day: d, count: dm[d] })), inbound, outbound: calls.length - inbound, totalDuration, checkedAt });
    }

    if (action === "quo_messages") {
      if (!QKEY) return json({ connected: false, reason: "no_key", checkedAt });
      const convs = await qRecentConvs(20); let msgs: any[] = [];
      for (const c of convs) {
        const parts = (c.participants || []).map((p: string) => `participants[]=${encodeURIComponent(p)}`).join("&");
        if (!parts) continue;
        const r = await qget(`/messages?phoneNumberId=${c.phoneNumberId}&${parts}&maxResults=20`);
        if (r.ok) (r.j.data || []).forEach((m: any) => msgs.push({ id: m.id, direction: m.direction, text: String(m.text || m.body || "").slice(0, 160), at: m.createdAt, participant: (c.participants || [])[0], line: c._line }));
      }
      const seen: any = {}; msgs = msgs.filter((m) => m.id && !seen[m.id] && (seen[m.id] = 1));
      msgs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      const days = qLastDays(14); const dm: any = {}; days.forEach((d) => dm[d] = 0); msgs.forEach((m) => { const k = qDayKey(m.at); if (k in dm) dm[k]++; });
      const inbound = msgs.filter((m) => /in/i.test(m.direction || "")).length;
      return json({ connected: true, total: msgs.length, messages: msgs.slice(0, 100), byDay: days.map((d) => ({ day: d, count: dm[d] })), inbound, outbound: msgs.length - inbound, checkedAt });
    }

    if (action === "quo_transcripts") {
      if (!QKEY) return json({ connected: false, reason: "no_key", checkedAt });
      const convs = await qRecentConvs(20); let calls: any[] = [];
      for (const c of convs) {
        const parts = (c.participants || []).map((p: string) => `participants[]=${encodeURIComponent(p)}`).join("&");
        if (!parts) continue;
        const r = await qget(`/calls?phoneNumberId=${c.phoneNumberId}&${parts}&maxResults=20`);
        if (r.ok) (r.j.data || []).forEach((cl: any) => calls.push({ id: cl.id, at: cl.completedAt || cl.createdAt, participant: (c.participants || [])[0], line: c._line, duration: cl.duration ?? 0 }));
      }
      calls.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      let transcripts: any[] = [];
      for (const cl of calls.slice(0, 15)) {
        const t = await qget(`/call-transcripts/${cl.id}`);
        const body: any = t.ok ? (t.j.data || t.j) : null;
        const dialogue = body ? (body.dialogue || body.segments || []) : [];
        if (body && Array.isArray(dialogue) && dialogue.length) {
          transcripts.push({ callId: cl.id, at: cl.at, participant: cl.participant, line: cl.line, duration: cl.duration, segments: dialogue.slice(0, 60).map((dd: any) => ({ who: dd.identifier || dd.userId || dd.speaker || "", text: dd.content || dd.text || "", start: dd.start ?? null })) });
        }
      }
      return json({ connected: true, total: transcripts.length, scanned: calls.length, transcripts, checkedAt });
    }

    if (action === "reap_status" || action === "reap_overview") {
      const reapUrl = Deno.env.get("REAP_SUPABASE_URL");
      const reapKey = Deno.env.get("REAP_ANON_KEY");
      if (!reapUrl || !reapKey) return json({ system:"reap", connected:false, reason:"no_credentials", checkedAt });
      const reapSvc = Deno.env.get("REAP_SERVICE_KEY") || reapKey;
      const rh = { "apikey": reapSvc, "Authorization": `Bearer ${reapSvc}` };

      // Health check
      const hc = await fetch(`${reapUrl}/auth/v1/health`, { headers: rh }).catch(()=>null);
      if (!hc?.ok) return json({ system:"reap", connected:false, http:hc?.status, message:"REAP unreachable", checkedAt });

      // Deal pipeline counts
      const ds = await fetch(`${reapUrl}/rest/v1/deals?select=deal_status,type,reap_score,arv_value,asking_price&limit=2000`, { headers: rh }).then(r=>r.json()).catch(()=>[]);
      const dealArr: any[] = Array.isArray(ds) ? ds : [];

      const byStatus: Record<string,number> = {};
      let totalArv = 0, totalAsking = 0, reapScoreSum = 0, scoredCount = 0;
      dealArr.forEach((d: any) => {
        const st = d.deal_status || "Unknown";
        byStatus[st] = (byStatus[st]||0) + 1;
        if(d.arv_value) totalArv += Number(d.arv_value)||0;
        if(d.asking_price) totalAsking += Number(d.asking_price)||0;
        if(d.reap_score){ reapScoreSum += Number(d.reap_score)||0; scoredCount++; }
      });
      const pipeline = ["New","Review","Underwriting","Offer","Under Contract","Owned","Sold"]
        .map(st => ({ status:st, count:byStatus[st]||0 }));
      const active = ["New","Review","Underwriting","Offer","Under Contract","Owned"]
        .reduce((n,st)=>n+(byStatus[st]||0), 0);

      // Users
      const up = await fetch(`${reapUrl}/rest/v1/user_profiles?select=id,email,role,full_name&limit=100`, { headers: rh }).then(r=>r.json()).catch(()=>[]);
      const users = (Array.isArray(up)?up:[]).map((u:any)=>({ name:u.full_name||u.email, email:u.email, role:u.role }));

      if (action === "reap_status") {
        return json({ system:"reap", connected:true, totalDeals:dealArr.length, activeDeals:active,
          userCount:users.length, avgReapScore:scoredCount?Math.round(reapScoreSum/scoredCount):null,
          pipeline, users, checkedAt });
      }
      // reap_overview — full breakdown
      const byType: Record<string,number> = {};
      dealArr.forEach((d:any) => { const t=d.type||"Unknown"; byType[t]=(byType[t]||0)+1; });
      const topTypes = Object.entries(byType).sort((a,b)=>(b[1] as number)-(a[1] as number)).slice(0,6).map(([type,count])=>({type,count}));
      return json({ system:"reap", connected:true, totalDeals:dealArr.length, activeDeals:active,
        totalArv:Math.round(totalArv), totalAsking:Math.round(totalAsking),
        avgReapScore:scoredCount?Math.round(reapScoreSum/scoredCount):null,
        byStatus:Object.entries(byStatus).sort((a,b)=>(b[1] as number)-(a[1] as number)).map(([status,count])=>({status,count})),
        pipeline, topTypes, userCount:users.length, users,
        liveUrl:"https://app.getreap.ai", checkedAt });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
