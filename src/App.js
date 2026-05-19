import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const APP_NAME = "Prism";
const ORG_NAME = "Realty One Group Advantage";
const ORG_ID   = "8cc1004c-c4da-4aab-b79a-f8b507983303";

const C = {
  gold:"#D4AF37", goldLight:"#E8C84A", goldDim:"rgba(212,175,55,0.15)",
  goldBorder:"rgba(212,175,55,0.30)", bg:"#0a0a0a", surface:"#111111",
  surface2:"#1a1a1a", surface3:"#222222", border:"rgba(255,255,255,0.08)",
  border2:"rgba(255,255,255,0.12)", text:"#f1f5f9", text2:"#94a3b8",
  text3:"#64748b", green:"#22c55e", red:"#ef4444", blue:"#3b82f6",
  amber:"#f59e0b", purple:"#a855f7",
};
const FONT  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";
const MONO  = "'DM Mono', monospace";

const STATUS_CONFIG = {
  "New":            { color:"#D4AF37", bg:"rgba(212,175,55,0.15)" },
  "Active":         { color:"#3b82f6", bg:"rgba(59,130,246,0.10)" },
  "Under Contract": { color:"#f59e0b", bg:"rgba(245,158,11,0.10)" },
  "Closed":         { color:"#22c55e", bg:"rgba(34,197,94,0.10)" },
  "Dead":           { color:"#ef4444", bg:"rgba(239,68,68,0.10)" },
  "On Hold":        { color:"#64748b", bg:"rgba(100,116,135,0.10)" },
};

const NAV = [
  { id:"dashboard", label:"Dashboard", icon:"⬡" },
  { id:"deals",     label:"Deals",     icon:"◈" },
  { id:"contacts",  label:"Contacts",  icon:"◎" },
  { id:"tasks",     label:"Tasks",     icon:"◻" },
  { id:"settings",  label:"Settings",  icon:"⚙" },
];

// ── Shared atoms ──────────────────────────────────────────────

function PrismMark({ size=32 }) {
  return (
    <div style={{ width:size, height:size, flexShrink:0,
      background:"linear-gradient(135deg,#D4AF37,#E8C84A)",
      clipPath:"polygon(50% 0%,100% 75%,50% 100%,0% 75%)" }} />
  );
}

function Avatar({ name, email, size=32 }) {
  const initials = name
    ? name.split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase()
    : (email||"?")[0].toUpperCase();
  const palette = ["#7c3aed","#0891b2","#d97706","#16a34a","#dc2626","#db2777"];
  const idx = ((name||email||"").charCodeAt(0)||0) % palette.length;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:palette[idx], display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size*0.38, fontWeight:700,
      color:"#fff", fontFamily:FONT, userSelect:"none" }}>
      {initials}
    </div>
  );
}

function GoldButton({ children, onClick, small, outline, disabled, danger }) {
  const [hov, setHov] = useState(false);
  const pad = small ? "7px 14px" : "10px 20px";
  const base = { padding:pad, borderRadius:8, border:"none",
    cursor:disabled?"not-allowed":"pointer",
    fontSize:small?12:13, fontWeight:600, fontFamily:FONT,
    display:"inline-flex", alignItems:"center", gap:6,
    transition:"opacity 0.12s", opacity:disabled?0.45:hov?0.82:1 };
  let s;
  if (danger)       s={...base,border:"1.5px solid rgba(239,68,68,0.4)",background:hov?"rgba(239,68,68,0.12)":"transparent",color:"#ef4444"};
  else if (outline) s={...base,border:"1.5px solid rgba(212,175,55,0.30)",background:hov?"rgba(212,175,55,0.15)":"transparent",color:"#D4AF37"};
  else              s={...base,background:"linear-gradient(135deg,#D4AF37,#E8C84A)",color:"#0a0a0a"};
  return (
    <button style={s} onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, type="text", placeholder, required, autoFocus }) {
  const [foc, setFoc] = useState(false);
  return (
    <div>
      {label && <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
        letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>{label}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} required={required} autoFocus={autoFocus}
        style={{ width:"100%", padding:"10px 13px", background:C.surface2,
          border:`1.5px solid ${foc?C.gold:C.border2}`, borderRadius:8,
          color:C.text, fontSize:13, fontFamily:FONT, outline:"none",
          transition:"border-color 0.15s", boxSizing:"border-box" }}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} />
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div>
      {label && <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
        letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", padding:"10px 13px", background:C.surface2,
          border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text,
          fontSize:13, fontFamily:FONT, outline:"none", boxSizing:"border-box" }}>
        {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
      </select>
    </div>
  );
}

function Modal({ title, onClose, children, maxWidth=500 }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
        padding:28, width:"100%", maxWidth, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:C.text, fontFamily:SERIF, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.text2, fontSize:20, cursor:"pointer", lineHeight:1, padding:4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ message, type="success", onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,3200); return()=>clearTimeout(t); },[onDone]);
  const bg = type==="error"?C.red:type==="warn"?C.amber:C.green;
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:500, background:bg,
      color:"#fff", padding:"11px 18px", borderRadius:10, fontSize:13,
      fontWeight:600, fontFamily:FONT, boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
      animation:"slideUp 0.2s ease" }}>
      {message}
      <style>{`@keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status]||{ color:C.text2, bg:C.surface2 };
  return (
    <span style={{ fontSize:11, fontWeight:600, fontFamily:FONT,
      padding:"3px 9px", borderRadius:20, background:cfg.bg, color:cfg.color, whiteSpace:"nowrap" }}>
      {status}
    </span>
  );
}

// ── Auth screens ──────────────────────────────────────────────

function LoadingScreen({ message="Loading\u2026" }) {
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
      <div style={{ animation:"pulse 1.8s ease-in-out infinite" }}>
        <PrismMark size={48} />
      </div>
      <p style={{ color:C.text2, fontSize:13, fontFamily:FONT, margin:0 }}>{message}</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.55;transform:scale(0.88)}}`}</style>
    </div>
  );
}

function AuthCard({ children }) {
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:34 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
            <PrismMark size={48} />
          </div>
          <h1 style={{ fontSize:26, fontWeight:700, fontFamily:SERIF, color:C.text,
            margin:"0 0 4px", letterSpacing:"-0.02em" }}>{APP_NAME}</h1>
          <p style={{ fontSize:12, color:C.text3, fontFamily:FONT, margin:0 }}>{ORG_NAME}</p>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:28 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onForgot }) {
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const submit = async e => {
    e.preventDefault(); setLoading(true); setError("");
    const { error:err } = await supabase.auth.signInWithPassword({ email, password:pw });
    if (err) { setError(err.message); setLoading(false); }
  };

  return (
    <AuthCard>
      <h2 style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:SERIF, margin:"0 0 20px" }}>Sign in</h2>
      <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <Field label="Email"    value={email} onChange={setEmail} type="email"    placeholder="you@example.com" required />
        <Field label="Password" value={pw}    onChange={setPw}    type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"       required />
        {error && <p style={{ fontSize:12, color:C.red, fontFamily:FONT, margin:0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{
          padding:"11px", borderRadius:8, border:"none",
          background:loading?C.surface3:"linear-gradient(135deg,#D4AF37,#E8C84A)",
          color:loading?C.text3:"#0a0a0a", fontSize:14, fontWeight:700,
          fontFamily:FONT, cursor:loading?"not-allowed":"pointer" }}>
          {loading?"Signing in\u2026":"Sign in"}
        </button>
      </form>
      <div style={{ marginTop:14, textAlign:"center" }}>
        <button onClick={onForgot} style={{ background:"none", border:"none",
          color:C.text3, fontSize:12, fontFamily:FONT, cursor:"pointer", textDecoration:"underline" }}>
          Forgot password?
        </button>
      </div>
    </AuthCard>
  );
}

function ForgotScreen({ onBack }) {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const submit = async e => {
    e.preventDefault(); setLoading(true); setError("");
    const { error:err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:`${window.location.origin}/brokerage`
    });
    if (err) { setError(err.message); setLoading(false); }
    else setSent(true);
  };

  return (
    <AuthCard>
      {sent ? (
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:34, marginBottom:10 }}>📬</div>
          <h2 style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:SERIF, margin:"0 0 8px" }}>Check your email</h2>
          <p style={{ fontSize:13, color:C.text2, fontFamily:FONT, margin:"0 0 20px" }}>
            Reset link sent to <strong style={{ color:C.text }}>{email}</strong>
          </p>
          <GoldButton outline small onClick={onBack}>Back to sign in</GoldButton>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:SERIF, margin:"0 0 8px" }}>Reset password</h2>
          <p style={{ fontSize:13, color:C.text2, fontFamily:FONT, margin:"0 0 18px" }}>
            We'll send a reset link to your email.
          </p>
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" required autoFocus />
            {error && <p style={{ fontSize:12, color:C.red, fontFamily:FONT, margin:0 }}>{error}</p>}
            <button type="submit" disabled={loading} style={{
              padding:"11px", borderRadius:8, border:"none",
              background:"linear-gradient(135deg,#D4AF37,#E8C84A)",
              color:"#0a0a0a", fontSize:14, fontWeight:700, fontFamily:FONT, cursor:"pointer" }}>
              {loading?"Sending\u2026":"Send reset link"}
            </button>
          </form>
          <div style={{ marginTop:14, textAlign:"center" }}>
            <button onClick={onBack} style={{ background:"none", border:"none",
              color:C.text3, fontSize:12, fontFamily:FONT, cursor:"pointer", textDecoration:"underline" }}>
              Back to sign in
            </button>
          </div>
        </>
      )}
    </AuthCard>
  );
}

function SetPasswordScreen({ onDone }) {
  const [pw, setPw]           = useState("");
  const [pw2, setPw2]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const submit = async e => {
    e.preventDefault();
    if (pw!==pw2) { setError("Passwords don't match"); return; }
    if (pw.length<8) { setError("At least 8 characters required"); return; }
    setLoading(true); setError("");
    const { error:err } = await supabase.auth.updateUser({ password:pw });
    if (err) { setError(err.message); setLoading(false); }
    else onDone();
  };

  return (
    <AuthCard>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:30, marginBottom:8 }}>🔐</div>
        <h2 style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:SERIF, margin:"0 0 6px" }}>Set your password</h2>
        <p style={{ fontSize:13, color:C.text2, fontFamily:FONT, margin:0 }}>
          You're using a temporary password — set a permanent one to continue.
        </p>
      </div>
      <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <Field label="New password"     value={pw}  onChange={setPw}  type="password" placeholder="Min. 8 characters" required autoFocus />
        <Field label="Confirm password" value={pw2} onChange={setPw2} type="password" placeholder="Same again"         required />
        {error && <p style={{ fontSize:12, color:C.red, fontFamily:FONT, margin:0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{
          padding:"11px", borderRadius:8, border:"none",
          background:"linear-gradient(135deg,#D4AF37,#E8C84A)",
          color:"#0a0a0a", fontSize:14, fontWeight:700, fontFamily:FONT, cursor:"pointer" }}>
          {loading?"Saving\u2026":"Set password & continue"}
        </button>
      </form>
    </AuthCard>
  );
}

// ── Layout ────────────────────────────────────────────────────

function Sidebar({ activeView, onNav, user, onSignOut, collapsed }) {
  const isAdmin = ["admin","owner"].includes(user?.role);
  return (
    <div style={{ width:collapsed?56:220, minWidth:collapsed?56:220,
      background:C.surface, borderRight:`1px solid ${C.border}`, height:"100vh",
      display:"flex", flexDirection:"column", transition:"width 0.2s,min-width 0.2s",
      overflow:"hidden", position:"fixed", top:0, left:0, zIndex:100 }}>

      <div style={{ padding:collapsed?"16px 14px":"16px 18px", display:"flex",
        alignItems:"center", gap:10, borderBottom:`1px solid ${C.border}`, minHeight:56 }}>
        <PrismMark size={26} />
        {!collapsed && (
          <div style={{ overflow:"hidden" }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:SERIF,
              letterSpacing:"-0.01em", whiteSpace:"nowrap" }}>{APP_NAME}</div>
            <div style={{ fontSize:9, color:C.text3, fontFamily:FONT, whiteSpace:"nowrap",
              letterSpacing:"0.04em", textTransform:"uppercase" }}>ROG Advantage</div>
          </div>
        )}
      </div>

      <nav style={{ flex:1, padding:"10px 6px", display:"flex", flexDirection:"column", gap:1 }}>
        {NAV.filter(n=>n.id!=="settings"||isAdmin).map(item=>{
          const active = activeView===item.id;
          return (
            <button key={item.id} onClick={()=>onNav(item.id)} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:collapsed?"10px 0":"9px 12px",
              justifyContent:collapsed?"center":"flex-start",
              borderRadius:8, border:"none", cursor:"pointer", width:"100%",
              background:active?C.goldDim:"transparent",
              color:active?C.gold:C.text2,
              fontSize:13, fontWeight:active?600:400, fontFamily:FONT, transition:"all 0.1s" }}
              onMouseEnter={e=>{ if(!active){e.currentTarget.style.background=C.surface2;e.currentTarget.style.color=C.text;}}}
              onMouseLeave={e=>{ if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text2;}}}>
              <span style={{ fontSize:15, lineHeight:1, flexShrink:0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace:"nowrap" }}>{item.label}</span>}
              {active&&!collapsed && <div style={{ marginLeft:"auto", width:3, height:14, borderRadius:2, background:C.gold }} />}
            </button>
          );
        })}
      </nav>

      <div style={{ padding:collapsed?"10px 6px":"10px 12px", borderTop:`1px solid ${C.border}` }}>
        {!collapsed && (
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8, padding:"2px 4px" }}>
            <Avatar name={user?.full_name} email={user?.email} size={28} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:FONT,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {user?.full_name||user?.email}
              </div>
              <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, textTransform:"capitalize" }}>
                {user?.role}
              </div>
            </div>
          </div>
        )}
        {collapsed && <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}><Avatar name={user?.full_name} email={user?.email} size={28} /></div>}
        <button onClick={onSignOut} style={{
          width:"100%", padding:collapsed?"7px 0":"7px 10px",
          background:C.surface2, border:`1px solid ${C.border}`, borderRadius:6,
          color:C.text3, fontSize:11, fontFamily:FONT, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:collapsed?"center":"flex-start", gap:6,
          transition:"color 0.12s" }}
          onMouseEnter={e=>e.currentTarget.style.color=C.red}
          onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
          <span style={{ fontSize:13 }}>\u238b</span>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}

function TopBar({ title, subtitle, onToggleSidebar, actions }) {
  return (
    <div style={{ height:56, background:C.surface, borderBottom:`1px solid ${C.border}`,
      display:"flex", alignItems:"center", padding:"0 20px 0 16px", gap:14,
      position:"sticky", top:0, zIndex:50 }}>
      <button onClick={onToggleSidebar} style={{ background:"none", border:"none",
        color:C.text2, cursor:"pointer", fontSize:16, padding:"4px 6px", borderRadius:6, lineHeight:1 }}>☰</button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF, letterSpacing:"-0.01em" }}>{title}</div>
        {subtitle && <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display:"flex", gap:8, alignItems:"center" }}>{actions}</div>}
    </div>
  );
}

function TempPasswordBanner({ onAction }) {
  return (
    <div style={{ background:"rgba(212,175,55,0.10)", borderBottom:`1px solid rgba(212,175,55,0.25)`,
      padding:"9px 20px", display:"flex", alignItems:"center", gap:12 }}>
      <span>⚠️</span>
      <span style={{ fontSize:12, color:C.gold, fontFamily:FONT, flex:1 }}>
        You're using a temporary password — change it now to secure your account.
      </span>
      <GoldButton small onClick={onAction}>Change password</GoldButton>
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
      padding:"18px 20px", display:"flex", flexDirection:"column", gap:3 }}>
      {icon && <div style={{ fontSize:17, marginBottom:2 }}>{icon}</div>}
      <div style={{ fontSize:24, fontWeight:700, color:accent||C.gold, fontFamily:SERIF, letterSpacing:"-0.02em" }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:600, color:C.text2, fontFamily:FONT,
        textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</div>
    </div>
  );
}

function DashboardView({ user, deals, contacts, tasks }) {
  const open   = deals.filter(d=>!["Closed","Dead"].includes(d.status));
  const closed = deals.filter(d=>d.status==="Closed");
  const mine   = tasks.filter(t=>t.assigned_to===user?.email&&t.status!=="done");
  const vol    = closed.reduce((s,d)=>s+(d.price||0),0);
  const fmt    = n=>n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n}`;

  return (
    <div style={{ padding:"24px", maxWidth:1100 }}>
      <div style={{ marginBottom:22 }}>
        <h2 style={{ fontSize:20, fontWeight:700, fontFamily:SERIF, color:C.text,
          margin:"0 0 3px", letterSpacing:"-0.02em" }}>
          Welcome back, {(user?.full_name||"").split(" ")[0]||"there"}.
        </h2>
        <p style={{ fontSize:12, color:C.text2, fontFamily:FONT, margin:0 }}>
          {ORG_NAME} \u00b7 {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
        </p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))", gap:12, marginBottom:26 }}>
        <StatCard label="Active Deals" value={open.length}                        icon="◈" />
        <StatCard label="Contacts"     value={contacts.length}                    icon="◎" />
        <StatCard label="Closed"       value={closed.length}  accent={C.green}    icon="✓" />
        <StatCard label="Volume"       value={vol>0?fmt(vol):"—"}                 icon="$" />
        <StatCard label="My Tasks"     value={mine.length}    accent={mine.length>3?C.amber:C.text2} icon="◻" />
      </div>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
            letterSpacing:"0.08em", textTransform:"uppercase" }}>Recent Deals</span>
        </div>
        {open.length===0
          ? <div style={{ padding:"40px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>No active deals yet</div>
          : open.slice(0,6).map(d=>(
            <div key={d.id} style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`,
              display:"flex", alignItems:"center", gap:12 }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {d.address||"Untitled"}
                </div>
                <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                  {[d.city,d.state].filter(Boolean).join(", ")}
                </div>
              </div>
              <StatusBadge status={d.status} />
              {d.price&&<div style={{ fontSize:12, fontWeight:600, color:C.gold, fontFamily:MONO }}>{fmt(d.price)}</div>}
            </div>
          ))
        }
      </div>
    </div>
  );
}


function DealDetail({ deal, user, onClose, onRefresh }) {
  const [tab,setTab]           = useState("overview");
  const [activities,setActs]   = useState([]);
  const [documents,setDocs]    = useState([]);
  const [dealContacts,setDealContacts] = useState([]);
  const [allContacts,setAllContacts]   = useState([]);
  const [dealTasks,setDealTasks]       = useState([]);
  const [loading,setLoading]   = useState(true);
  const [addingContact,setAddingContact] = useState(false);
  const [contactToAdd,setContactToAdd]   = useState("");
  const [contactRole,setContactRole]     = useState("Client");
  const [savingContact,setSavingContact] = useState(false);
  const [addingTask,setAddingTask]       = useState(false);
  const [taskForm,setTaskForm]           = useState({title:"",priority:"medium",due_date:"",assigned_to:user?.email||""});
  const setTF = (k,v) => setTaskForm(f=>({...f,[k]:v}));
  const [savingTask,setSavingTask]       = useState(false);
  const [actForm,setActForm]   = useState({activity_type:"note",content:""});
  const [savingAct,setSavingAct] = useState(false);
  const [editMode,setEditMode] = useState(false);
  const [editForm,setEditForm] = useState({
    address:deal.address||"", city:deal.city||"", state:deal.state||"FL",
    zip:deal.zip||"", price:deal.price||"", status:deal.status||"New",
    deal_type:deal.deal_type||"Listing", mls_number:deal.mls_number||"",
    bedrooms:deal.bedrooms||"", bathrooms:deal.bathrooms||"",
    sqft:deal.sqft||"", year_built:deal.year_built||"",
    commission_rate:deal.commission_rate||"", close_date:deal.close_date||"",
    notes:deal.notes||"",
  });
  const [savingEdit,setSavingEdit] = useState(false);
  const [toast,setToast]       = useState(null);
  const setE = (k,v) => setEditForm(f=>({...f,[k]:v}));

  const fmt = n=>n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n}`;

  const ACT_TYPES = [
    {value:"note",    label:"Note",    icon:"📝"},
    {value:"call",    label:"Call",    icon:"📞"},
    {value:"email",   label:"Email",   icon:"📧"},
    {value:"showing", label:"Showing", icon:"🏠"},
    {value:"offer",   label:"Offer",   icon:"📄"},
  ];

  const reloadDetail = async () => {
    const [a,d,dc,ac,t] = await Promise.all([
      supabase.from("deal_activities").select("*").eq("deal_id",deal.id).order("created_at",{ascending:false}),
      supabase.from("deal_documents").select("*").eq("deal_id",deal.id).order("created_at",{ascending:false}),
      supabase.from("deal_contacts").select("*,contacts(id,full_name,email,phone,contact_type)").eq("deal_id",deal.id),
      supabase.from("contacts").select("id,full_name,email,contact_type").eq("org_id",ORG_ID).order("full_name"),
      supabase.from("tasks").select("*").eq("deal_id",deal.id).order("created_at",{ascending:false}),
    ]);
    setActs(a.data||[]);
    setDocs(d.data||[]);
    setDealContacts(dc.data||[]);
    setAllContacts(ac.data||[]);
    setDealTasks(t.data||[]);
  };

  useEffect(()=>{
    setLoading(true);
    reloadDetail().then(()=>setLoading(false));
  },[deal.id]);

  const addActivity = async () => {
    if(!actForm.content.trim()) return;
    setSavingAct(true);
    const { error } = await supabase.from("deal_activities").insert({
      deal_id:deal.id, activity_type:actForm.activity_type,
      content:actForm.content, created_by:user?.email,
    });
    setSavingAct(false);
    if(!error){
      setActForm({activity_type:"note",content:""});
      await reloadDetail();
      setToast({msg:"Activity logged",type:"success"});
    }
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    const update = {
      ...editForm,
      price:editForm.price?parseFloat(String(editForm.price).replace(/[^0-9.]/g,"")):null,
      bedrooms:editForm.bedrooms?parseInt(editForm.bedrooms):null,
      bathrooms:editForm.bathrooms?parseFloat(editForm.bathrooms):null,
      sqft:editForm.sqft?parseInt(editForm.sqft):null,
      commission_rate:editForm.commission_rate?parseFloat(editForm.commission_rate):null,
      updated_at:new Date().toISOString(),
    };
    const { error } = await supabase.from("deals").update(update).eq("id",deal.id);
    setSavingEdit(false);
    if(!error){ setEditMode(false); onRefresh(); setToast({msg:"Deal updated",type:"success"}); }
    else setToast({msg:"Error saving",type:"error"});
  };

  const updateStatus = async (newStatus) => {
    await supabase.from("deals").update({status:newStatus,updated_at:new Date().toISOString()}).eq("id",deal.id);
    await supabase.from("deal_activities").insert({
      deal_id:deal.id, activity_type:"status_change",
      content:`Status changed to ${newStatus}`, created_by:user?.email,
    });
    onRefresh();
    setToast({msg:`Status → ${newStatus}`,type:"success"});
    await reloadDetail();
  };

  const ACT_ICON = {note:"📝",call:"📞",email:"📧",showing:"🏠",offer:"📄",status_change:"🔄"};
  const fmtDate = iso => {
    if(!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" · "+d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  };

  const TABS = [
    {id:"overview",label:"Overview"},
    {id:"people",  label:`People${dealContacts.length>0?" ("+dealContacts.length+")":""}`},
    {id:"activity",label:`Activity${activities.length>0?" ("+activities.length+")":""}`},
    {id:"tasks",   label:`Tasks${dealTasks.length>0?" ("+dealTasks.length+")":""}`},
    {id:"documents",label:`Documents${documents.length>0?" ("+documents.length+")":""}`},
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:300,
      display:"flex", justifyContent:"flex-end" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      <div style={{ width:"min(580px,100vw)", background:C.bg, height:"100vh",
        display:"flex", flexDirection:"column", borderLeft:`1px solid ${C.border}`,
        animation:"slideIn 0.2s ease" }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"flex-start", gap:14, background:C.surface }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:SERIF,
              letterSpacing:"-0.01em", marginBottom:4 }}>
              {deal.address||"Untitled deal"}
            </div>
            <div style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>
              {[deal.city,deal.state,deal.zip].filter(Boolean).join(", ")}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap", alignItems:"center" }}>
              <StatusBadge status={deal.status} />
              {deal.price&&<span style={{ fontSize:12, fontWeight:700, color:C.gold, fontFamily:FONT }}>{fmt(deal.price)}</span>}
              {deal.deal_type&&<span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{deal.deal_type}</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <GoldButton small outline onClick={()=>setEditMode(true)}>Edit</GoldButton>
            <button onClick={onClose} style={{ background:"none", border:"none",
              color:C.text2, fontSize:20, cursor:"pointer", lineHeight:1, padding:4 }}>✕</button>
          </div>
        </div>

        {/* Status pipeline strip */}
        <div style={{ padding:"10px 22px", borderBottom:`1px solid ${C.border}`,
          display:"flex", gap:4, overflowX:"auto", background:C.surface }}>
          {Object.keys(STATUS_CONFIG).map(s=>{
            const active = deal.status===s;
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={()=>updateStatus(s)} style={{
                padding:"4px 11px", borderRadius:20, border:`1.5px solid ${active?cfg.color:"transparent"}`,
                background:active?cfg.bg:"transparent", color:active?cfg.color:C.text3,
                fontSize:11, fontWeight:active?700:400, fontFamily:FONT, cursor:"pointer",
                whiteSpace:"nowrap", transition:"all 0.12s",
              }}
                onMouseEnter={e=>{ if(!active){e.currentTarget.style.background=C.surface2;e.currentTarget.style.color=C.text2;}}}
                onMouseLeave={e=>{ if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text3;}}}>
                {s}
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`, background:C.surface }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"10px 18px", border:"none", background:"transparent",
              color:tab===t.id?C.gold:C.text2, fontSize:12, fontWeight:tab===t.id?700:400,
              fontFamily:FONT, cursor:"pointer", borderBottom:`2px solid ${tab===t.id?C.gold:"transparent"}`,
              transition:"color 0.1s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:C.text3, fontSize:13, fontFamily:FONT }}>Loading…</div>
          ) : tab==="overview" ? (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {/* Key metrics */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                {[
                  {label:"Price",   val:deal.price?fmt(deal.price):"—"},
                  {label:"Beds",    val:deal.bedrooms||"—"},
                  {label:"Baths",   val:deal.bathrooms||"—"},
                  {label:"Sq Ft",   val:deal.sqft?deal.sqft.toLocaleString():"—"},
                  {label:"Year",    val:deal.year_built||"—"},
                  {label:"MLS #",   val:deal.mls_number||"—"},
                ].map(item=>(
                  <div key={item.label} style={{ background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
                      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{item.label}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:SERIF }}>{item.val}</div>
                  </div>
                ))}
              </div>

              {/* Commission + close date */}
              {(deal.commission_rate||deal.close_date) && (
                <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
                    textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Transaction</div>
                  <div style={{ display:"flex", gap:20 }}>
                    {deal.commission_rate&&<div>
                      <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>Commission</div>
                      <div style={{ fontSize:14, fontWeight:600, color:C.gold, fontFamily:FONT }}>{deal.commission_rate}%</div>
                    </div>}
                    {deal.close_date&&<div>
                      <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>Close Date</div>
                      <div style={{ fontSize:14, fontWeight:600, color:C.text, fontFamily:FONT }}>
                        {new Date(deal.close_date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                      </div>
                    </div>}
                  </div>
                </div>
              )}

              {/* Notes */}
              {deal.notes && (
                <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
                    textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Notes</div>
                  <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, lineHeight:1.6 }}>{deal.notes}</div>
                </div>
              )}

              {/* Added by */}
              <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:4 }}>
                Added by {deal.created_by||"unknown"} · {fmtDate(deal.created_at)}
              </div>
            </div>

          ) : tab==="activity" ? (
            <div>
              {/* Add activity */}
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
                padding:"14px 16px", marginBottom:16 }}>
                <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
                  {ACT_TYPES.map(t=>(
                    <button key={t.value} onClick={()=>setActForm(f=>({...f,activity_type:t.value}))} style={{
                      padding:"5px 11px", borderRadius:20, border:"none",
                      background:actForm.activity_type===t.value?C.goldDim:C.surface2,
                      color:actForm.activity_type===t.value?C.gold:C.text2,
                      fontSize:11, fontFamily:FONT, cursor:"pointer",
                    }}>{t.icon} {t.label}</button>
                  ))}
                </div>
                <textarea value={actForm.content} onChange={e=>setActForm(f=>({...f,content:e.target.value}))}
                  placeholder="Add a note, log a call, record a showing…" rows={3}
                  style={{ width:"100%", padding:"9px 12px", background:C.surface2,
                    border:`1px solid ${C.border2}`, borderRadius:7, color:C.text,
                    fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical",
                    boxSizing:"border-box", marginBottom:10 }} />
                <GoldButton onClick={addActivity} disabled={savingAct||!actForm.content.trim()} small>
                  {savingAct?"Logging…":"Log activity"}
                </GoldButton>
              </div>

              {/* Activity feed */}
              {activities.length===0
                ? <div style={{ textAlign:"center", padding:"32px 0", color:C.text3, fontSize:13, fontFamily:FONT }}>
                    No activity yet
                  </div>
                : activities.map(a=>(
                  <div key={a.id} style={{ display:"flex", gap:12, marginBottom:14 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:C.surface,
                      border:`1px solid ${C.border}`, display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:14, flexShrink:0 }}>
                      {ACT_ICON[a.activity_type]||"📝"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:C.text, fontFamily:FONT, lineHeight:1.5,
                        background:C.surface, border:`1px solid ${C.border}`, borderRadius:9,
                        padding:"10px 13px" }}>
                        {a.content}
                      </div>
                      <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginTop:5 }}>
                        {a.created_by} · {fmtDate(a.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>

          ) : tab==="people" ? (
            <div>
              {/* Linked contacts */}
              <div style={{ marginBottom:16 }}>
                {dealContacts.length===0
                  ? <div style={{ textAlign:"center", padding:"28px 0", color:C.text3, fontSize:13, fontFamily:FONT }}>
                      No people linked yet
                    </div>
                  : dealContacts.map(dc=>{
                      const c = dc.contacts;
                      if(!c) return null;
                      return (
                        <div key={dc.id} style={{ display:"flex", alignItems:"center", gap:12,
                          padding:"12px 14px", background:C.surface, border:`1px solid ${C.border}`,
                          borderRadius:10, marginBottom:8 }}>
                          <Avatar name={c.full_name} email={c.email} size={36} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{c.full_name}</div>
                            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{c.email||""}{c.phone?` · ${c.phone}`:""}</div>
                          </div>
                          <span style={{ fontSize:11, fontWeight:600, color:C.gold, fontFamily:FONT,
                            background:C.goldDim, borderRadius:6, padding:"3px 9px" }}>{dc.role}</span>
                          <button onClick={async()=>{
                            await supabase.from("deal_contacts").delete().eq("id",dc.id);
                            await reloadDetail();
                            setToast({msg:"Removed",type:"success"});
                          }} style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:14, padding:4 }}
                            onMouseEnter={e=>e.currentTarget.style.color=C.red}
                            onMouseLeave={e=>e.currentTarget.style.color=C.text3}>✕</button>
                        </div>
                      );
                    })
                }
              </div>

              {/* Add contact */}
              {!addingContact ? (
                <GoldButton small outline onClick={()=>setAddingContact(true)}>+ Link contact</GoldButton>
              ) : (
                <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                        letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Contact</label>
                      <select value={contactToAdd} onChange={e=>setContactToAdd(e.target.value)}
                        style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
                          borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none" }}>
                        <option value="">Select a contact…</option>
                        {allContacts
                          .filter(c=>!dealContacts.find(dc=>dc.contact_id===c.id))
                          .map(c=><option key={c.id} value={c.id}>{c.full_name} ({c.contact_type})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                        letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Role on this deal</label>
                      <select value={contactRole} onChange={e=>setContactRole(e.target.value)}
                        style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
                          borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none" }}>
                        {["Buyer","Seller","Buyer Agent","Listing Agent","Lender","Attorney","Inspector","Other"].map(r=>(
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <GoldButton small disabled={!contactToAdd||savingContact} onClick={async()=>{
                        setSavingContact(true);
                        await supabase.from("deal_contacts").insert({
                          deal_id:deal.id, contact_id:contactToAdd,
                          role:contactRole, org_id:ORG_ID, added_by:user?.email,
                        });
                        setSavingContact(false);
                        setAddingContact(false); setContactToAdd(""); setContactRole("Client");
                        await reloadDetail();
                        setToast({msg:"Contact linked",type:"success"});
                      }}>{savingContact?"Linking…":"Link"}</GoldButton>
                      <GoldButton small outline onClick={()=>{setAddingContact(false);setContactToAdd("");}}>Cancel</GoldButton>
                    </div>
                  </div>
                </div>
              )}
            </div>

          ) : tab==="tasks" ? (
            <div>
              {dealTasks.length===0
                ? <div style={{ textAlign:"center", padding:"28px 0", color:C.text3, fontSize:13, fontFamily:FONT }}>
                    No tasks linked to this deal
                  </div>
                : dealTasks.map(t=>(
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12,
                    padding:"12px 14px", background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:10, marginBottom:8 }}>
                    <button onClick={async()=>{
                      await supabase.from("tasks").update({status:t.status==="done"?"open":"done"}).eq("id",t.id);
                      await reloadDetail();
                    }} style={{
                      width:18, height:18, borderRadius:4, flexShrink:0, cursor:"pointer", padding:0,
                      border:`2px solid ${t.status==="done"?C.gold:C.border2}`,
                      background:t.status==="done"?C.gold:"transparent",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {t.status==="done"&&<span style={{ fontSize:9, color:"#0a0a0a", fontWeight:900 }}>✓</span>}
                    </button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:t.status==="done"?C.text3:C.text,
                        fontFamily:FONT, textDecoration:t.status==="done"?"line-through":"none" }}>{t.title}</div>
                      {t.description&&<div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{t.description}</div>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%",
                        background:{high:C.red,medium:C.amber,low:C.text3}[t.priority]||C.text3 }} />
                      {t.due_date&&<span style={{ fontSize:10, color:C.text3, fontFamily:MONO }}>{t.due_date}</span>}
                    </div>
                  </div>
                ))
              }

              {/* Add task linked to this deal */}
              {!addingTask ? (
                <div style={{ marginTop:8 }}>
                  <GoldButton small outline onClick={()=>setAddingTask(true)}>+ Add task</GoldButton>
                </div>
              ) : (
                <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", marginTop:8 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <Field label="Task title" value={taskForm.title} onChange={v=>setTF("title",v)} placeholder="e.g. Order inspection" autoFocus />
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <Sel label="Priority" value={taskForm.priority} onChange={v=>setTF("priority",v)}
                        options={[{value:"high",label:"High"},{value:"medium",label:"Medium"},{value:"low",label:"Low"}]} />
                      <Field label="Due date" value={taskForm.due_date} onChange={v=>setTF("due_date",v)} type="date" />
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <GoldButton small disabled={!taskForm.title.trim()||savingTask} onClick={async()=>{
                        setSavingTask(true);
                        await supabase.from("tasks").insert({
                          ...taskForm, org_id:ORG_ID, deal_id:deal.id,
                          status:"open", created_by:user?.email,
                        });
                        setSavingTask(false);
                        setAddingTask(false);
                        setTaskForm({title:"",priority:"medium",due_date:"",assigned_to:user?.email||""});
                        await reloadDetail();
                        setToast({msg:"Task added",type:"success"});
                      }}>{savingTask?"Adding…":"Add task"}</GoldButton>
                      <GoldButton small outline onClick={()=>setAddingTask(false)}>Cancel</GoldButton>
                    </div>
                  </div>
                </div>
              )}
            </div>

          ) : (
            /* Documents tab */
            <div>
              <div style={{ textAlign:"center", padding:"40px 0", color:C.text3, fontSize:13, fontFamily:FONT }}>
                <div style={{ fontSize:28, marginBottom:10 }}>📁</div>
                Document uploads coming in Phase 5.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editMode&&(
        <Modal title="Edit Deal" onClose={()=>setEditMode(false)} maxWidth={520}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Address" value={editForm.address} onChange={v=>setE("address",v)} placeholder="123 Main St" />
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10 }}>
              <Field label="City"  value={editForm.city}  onChange={v=>setE("city",v)}  placeholder="Tampa" />
              <Field label="State" value={editForm.state} onChange={v=>setE("state",v)} placeholder="FL" />
              <Field label="ZIP"   value={editForm.zip}   onChange={v=>setE("zip",v)}   placeholder="33601" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Price" value={editForm.price}      onChange={v=>setE("price",v)}      placeholder="$450,000" />
              <Field label="MLS #" value={editForm.mls_number} onChange={v=>setE("mls_number",v)} placeholder="T1234567" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel label="Status" value={editForm.status}    onChange={v=>setE("status",v)}    options={Object.keys(STATUS_CONFIG)} />
              <Sel label="Type"   value={editForm.deal_type} onChange={v=>setE("deal_type",v)} options={["Listing","Buyer","Referral","Rental"]} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
              <Field label="Beds"     value={editForm.bedrooms}      onChange={v=>setE("bedrooms",v)}      placeholder="3" />
              <Field label="Baths"    value={editForm.bathrooms}     onChange={v=>setE("bathrooms",v)}     placeholder="2" />
              <Field label="Sq Ft"    value={editForm.sqft}          onChange={v=>setE("sqft",v)}          placeholder="1800" />
              <Field label="Year"     value={editForm.year_built}    onChange={v=>setE("year_built",v)}    placeholder="2005" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Commission %" value={editForm.commission_rate} onChange={v=>setE("commission_rate",v)} placeholder="3.0" />
              <Field label="Close Date"   value={editForm.close_date}     onChange={v=>setE("close_date",v)}     type="date" />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Notes</label>
              <textarea value={editForm.notes} onChange={e=>setE("notes",e.target.value)} rows={3}
                style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
                  borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none",
                  resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={saveEdit} disabled={savingEdit}>{savingEdit?"Saving…":"Save changes"}</GoldButton>
              <GoldButton onClick={()=>setEditMode(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DealsView({ user, deals, onRefresh }) {
  const [filter,setFilter]     = useState("all");
  const [search,setSearch]     = useState("");
  const [showAdd,setShowAdd]   = useState(false);
  const [selectedDeal,setSelectedDeal] = useState(null);
  const [saving,setSaving]     = useState(false);
  const [toast,setToast]       = useState(null);
  const [form,setForm]         = useState({address:"",city:"",state:"FL",zip:"",price:"",
    status:"New",deal_type:"Listing",mls_number:"",notes:""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const fmt = n=>n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n}`;

  // Keep selected deal in sync after refresh
  useEffect(()=>{
    if(selectedDeal) {
      const updated = deals.find(d=>d.id===selectedDeal.id);
      if(updated) setSelectedDeal(updated);
    }
  },[deals]);

  const filtered = deals.filter(d=>{
    if(filter!=="all"&&d.status!==filter) return false;
    if(search&&!`${d.address} ${d.city} ${d.mls_number}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = async () => {
    if(!form.address.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("deals").insert({
      ...form,
      price:form.price?parseFloat(form.price.replace(/[^0-9.]/g,"")):null,
      org_id:ORG_ID, created_by:user?.email,
    });
    setSaving(false);
    if(!error){ setShowAdd(false); setForm({address:"",city:"",state:"FL",zip:"",price:"",status:"New",deal_type:"Listing",mls_number:"",notes:""}); onRefresh(); setToast({msg:"Deal added",type:"success"}); }
    else setToast({msg:"Error saving deal",type:"error"});
  };

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search address, MLS#\u2026"
          style={{ padding:"8px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
            borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", width:240 }}
          onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border2} />
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {["all",...Object.keys(STATUS_CONFIG)].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{
              padding:"5px 12px", borderRadius:20,
              border:`1.5px solid ${filter===s?"rgba(212,175,55,0.30)":C.border}`,
              background:filter===s?"rgba(212,175,55,0.15)":"transparent",
              color:filter===s?C.gold:C.text2, fontSize:11, fontFamily:FONT, cursor:"pointer" }}>
              {s==="all"?"All":s}
            </button>
          ))}
        </div>
        <div style={{ marginLeft:"auto" }}><GoldButton onClick={()=>setShowAdd(true)} small>+ Add Deal</GoldButton></div>
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", padding:"9px 18px", borderBottom:`1px solid ${C.border}` }}>
          {["Address","Type","Status","Price","MLS #"].map(h=>(
            <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
          ))}
        </div>
        {filtered.length===0
          ? <div style={{ padding:"48px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
              {deals.length===0?"No deals yet \u2014 add your first one":"No results match your filter"}
            </div>
          : filtered.map(d=>(
            <div key={d.id}
              onClick={()=>setSelectedDeal(d)}
              style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",
                padding:"13px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center",
                cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{d.address||"\u2014"}</div>
                <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{[d.city,d.state].filter(Boolean).join(", ")}</div>
              </div>
              <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{d.deal_type||"\u2014"}</span>
              <StatusBadge status={d.status} />
              <span style={{ fontSize:12, fontWeight:600, color:C.gold, fontFamily:MONO }}>{d.price?fmt(d.price):"\u2014"}</span>
              <span style={{ fontSize:12, color:C.text3, fontFamily:MONO }}>{d.mls_number||"\u2014"}</span>
            </div>
          ))
        }
      </div>

      {showAdd&&(
        <Modal title="New Deal" onClose={()=>setShowAdd(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Address" value={form.address} onChange={v=>set("address",v)} placeholder="123 Main St" />
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10 }}>
              <Field label="City"  value={form.city}  onChange={v=>set("city",v)}  placeholder="Tampa" />
              <Field label="State" value={form.state} onChange={v=>set("state",v)} placeholder="FL" />
              <Field label="ZIP"   value={form.zip}   onChange={v=>set("zip",v)}   placeholder="33601" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Price" value={form.price}      onChange={v=>set("price",v)}      placeholder="$450,000" />
              <Field label="MLS #" value={form.mls_number} onChange={v=>set("mls_number",v)} placeholder="T1234567" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel label="Status" value={form.status}    onChange={v=>set("status",v)}    options={Object.keys(STATUS_CONFIG)} />
              <Sel label="Type"   value={form.deal_type} onChange={v=>set("deal_type",v)} options={["Listing","Buyer","Referral","Rental"]} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Notes</label>
              <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any notes\u2026" rows={3}
                style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
                  borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={handleAdd} disabled={saving||!form.address.trim()}>{saving?"Saving\u2026":"Add Deal"}</GoldButton>
              <GoldButton onClick={()=>setShowAdd(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}

      {selectedDeal&&(
        <DealDetail
          deal={selectedDeal}
          user={user}
          onClose={()=>setSelectedDeal(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

function ContactsView({ user, contacts, onRefresh }) {
  const [search,setSearch]   = useState("");
  const [showAdd,setShowAdd] = useState(false);
  const [saving,setSaving]   = useState(false);
  const [toast,setToast]     = useState(null);
  const [form,setForm]       = useState({full_name:"",email:"",phone:"",contact_type:"Client",notes:""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const filtered = contacts.filter(c=>
    !search||`${c.full_name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if(!form.full_name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("contacts").insert({...form,org_id:ORG_ID,created_by:user?.email});
    setSaving(false);
    if(!error){ setShowAdd(false); setForm({full_name:"",email:"",phone:"",contact_type:"Client",notes:""}); onRefresh(); setToast({msg:"Contact added",type:"success"}); }
  };

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search contacts\u2026"
          style={{ padding:"8px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
            borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", width:260 }}
          onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border2} />
        <div style={{ marginLeft:"auto" }}><GoldButton onClick={()=>setShowAdd(true)} small>+ Add Contact</GoldButton></div>
      </div>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr", padding:"9px 18px", borderBottom:`1px solid ${C.border}` }}>
          {["Name","Type","Email","Phone"].map(h=>(
            <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
          ))}
        </div>
        {filtered.length===0
          ? <div style={{ padding:"48px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
              {contacts.length===0?"No contacts yet":"No results"}
            </div>
          : filtered.map(c=>(
            <div key={c.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr",
              padding:"12px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Avatar name={c.full_name} email={c.email} size={28} />
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{c.full_name}</div>
                  {c.notes&&<div style={{ fontSize:11, color:C.text3, fontFamily:FONT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:150 }}>{c.notes}</div>}
                </div>
              </div>
              <span style={{ fontSize:11, fontWeight:600, color:C.text2, fontFamily:FONT,
                background:C.surface2, borderRadius:5, padding:"3px 8px", width:"fit-content" }}>
                {c.contact_type}
              </span>
              <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{c.email||"\u2014"}</span>
              <span style={{ fontSize:12, color:C.text2, fontFamily:MONO }}>{c.phone||"\u2014"}</span>
            </div>
          ))
        }
      </div>
      {showAdd&&(
        <Modal title="New Contact" onClose={()=>setShowAdd(false)} maxWidth={440}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Full name" value={form.full_name} onChange={v=>set("full_name",v)} placeholder="Jane Smith" />
            <Field label="Email"     value={form.email}     onChange={v=>set("email",v)}     type="email" placeholder="jane@example.com" />
            <Field label="Phone"     value={form.phone}     onChange={v=>set("phone",v)}     placeholder="(813) 555-0100" />
            <Sel   label="Type"      value={form.contact_type} onChange={v=>set("contact_type",v)} options={["Client","Agent","Lender","Referral","Vendor"]} />
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Notes</label>
              <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Optional notes\u2026" rows={2}
                style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
                  borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={handleAdd} disabled={saving||!form.full_name.trim()}>{saving?"Saving\u2026":"Add Contact"}</GoldButton>
              <GoldButton onClick={()=>setShowAdd(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TasksView({ user, tasks, onRefresh }) {
  const [showAdd,setShowAdd] = useState(false);
  const [saving,setSaving]   = useState(false);
  const [form,setForm]       = useState({title:"",description:"",priority:"medium",due_date:"",assigned_to:user?.email||""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const open = tasks.filter(t=>t.status!=="done");
  const done = tasks.filter(t=>t.status==="done");

  const handleAdd = async () => {
    if(!form.title.trim()) return;
    setSaving(true);
    await supabase.from("tasks").insert({...form,org_id:ORG_ID,status:"open",created_by:user?.email});
    setSaving(false); setShowAdd(false);
    setForm({title:"",description:"",priority:"medium",due_date:"",assigned_to:user?.email||""});
    onRefresh();
  };

  const toggle = async t => {
    await supabase.from("tasks").update({status:t.status==="done"?"open":"done"}).eq("id",t.id);
    onRefresh();
  };

  const PCOL = {high:C.red,medium:C.amber,low:C.text3};

  const TaskRow = ({task}) => (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 18px", borderBottom:`1px solid ${C.border}` }}
      onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <button onClick={()=>toggle(task)} style={{
        width:18, height:18, borderRadius:4, flexShrink:0, cursor:"pointer", padding:0,
        border:`2px solid ${task.status==="done"?C.gold:C.border2}`,
        background:task.status==="done"?C.gold:"transparent",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        {task.status==="done"&&<span style={{ fontSize:9, color:"#0a0a0a", fontWeight:900 }}>✓</span>}
      </button>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500, fontFamily:FONT,
          color:task.status==="done"?C.text3:C.text,
          textDecoration:task.status==="done"?"line-through":"none" }}>{task.title}</div>
        {task.description&&<div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{task.description}</div>}
      </div>
      <div style={{ width:7, height:7, borderRadius:"50%", background:PCOL[task.priority]||C.text3, flexShrink:0 }} />
      {task.due_date&&<span style={{ fontSize:11, color:C.text3, fontFamily:MONO }}>{task.due_date}</span>}
    </div>
  );

  return (
    <div style={{ padding:"20px 24px" }}>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <GoldButton onClick={()=>setShowAdd(true)} small>+ Add Task</GoldButton>
      </div>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", marginBottom:14 }}>
        <div style={{ padding:"11px 18px", borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase" }}>Open \u00b7 {open.length}</span>
        </div>
        {open.length===0
          ? <div style={{ padding:"32px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>All clear</div>
          : open.map(t=><TaskRow key={t.id} task={t} />)
        }
      </div>
      {done.length>0&&(
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"11px 18px", borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase" }}>Completed \u00b7 {done.length}</span>
          </div>
          {done.slice(0,5).map(t=><TaskRow key={t.id} task={t} />)}
        </div>
      )}
      {showAdd&&(
        <Modal title="New Task" onClose={()=>setShowAdd(false)} maxWidth={440}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Title" value={form.title} onChange={v=>set("title",v)} placeholder="e.g. Schedule showing" autoFocus />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel   label="Priority" value={form.priority}  onChange={v=>set("priority",v)}  options={[{value:"high",label:"High"},{value:"medium",label:"Medium"},{value:"low",label:"Low"}]} />
              <Field label="Due Date" value={form.due_date}  onChange={v=>set("due_date",v)}  type="date" />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Notes</label>
              <textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Optional details" rows={2}
                style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
                  borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={handleAdd} disabled={saving||!form.title.trim()}>{saving?"Saving\u2026":"Add Task"}</GoldButton>
              <GoldButton onClick={()=>setShowAdd(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


function OrgMembersCard() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    supabase.from("user_profiles").select("*").eq("org_id", ORG_ID).order("role")
      .then(({ data }) => { setMembers(data||[]); setLoading(false); });
  },[]);

  const ROLE_COLOR = { owner:C.gold, admin:C.purple, member:C.text2 };
  const ROLE_ICON  = { owner:"👑", admin:"🔑", member:"👤" };

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px" }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT,
        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>Team Members</div>
      {loading
        ? <div style={{ color:C.text3, fontSize:13, fontFamily:FONT }}>Loading…</div>
        : members.map(m=>(
          <div key={m.id} style={{ display:"flex", alignItems:"center", gap:12,
            padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
            <Avatar name={m.full_name} email={m.email} size={34} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{m.full_name||"—"}</div>
              <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, whiteSpace:"nowrap",
                overflow:"hidden", textOverflow:"ellipsis" }}>{m.email}</div>
              {m.title&&<div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{m.title}</div>}
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:ROLE_COLOR[m.role]||C.text2,
              fontFamily:FONT, display:"flex", alignItems:"center", gap:4 }}>
              {ROLE_ICON[m.role]} {m.role}
            </span>
          </div>
        ))
      }
      <div style={{ marginTop:14, padding:"10px 14px", background:C.surface2,
        borderRadius:8, fontSize:12, color:C.text3, fontFamily:FONT }}>
        To invite new members, contact your admin or reach out to support.
      </div>
    </div>
  );
}

function SettingsView({ user, onProfileSaved }) {
  const [showEdit,setShowEdit] = useState(false);
  const [showPw,setShowPw]     = useState(false);
  const [editForm,setEditForm] = useState({full_name:user?.full_name||"",phone:user?.phone||"",title:user?.title||""});
  const [pwForm,setPwForm]     = useState({next:"",confirm:""});
  const [saving,setSaving]     = useState(false);
  const [toast,setToast]       = useState(null);
  const setE = (k,v) => setEditForm(f=>({...f,[k]:v}));
  const setP = (k,v) => setPwForm(f=>({...f,[k]:v}));

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from("user_profiles")
      .update({full_name:editForm.full_name,phone:editForm.phone,title:editForm.title,updated_at:new Date().toISOString()})
      .eq("email",user.email);
    setSaving(false);
    if(!error){ setShowEdit(false); onProfileSaved(editForm); setToast({msg:"Profile updated",type:"success"}); }
    else setToast({msg:"Error saving profile",type:"error"});
  };

  const savePassword = async () => {
    if(pwForm.next!==pwForm.confirm){ setToast({msg:"Passwords don\u2019t match",type:"error"}); return; }
    if(pwForm.next.length<8){ setToast({msg:"Min. 8 characters",type:"error"}); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({password:pwForm.next});
    setSaving(false);
    if(!error){ setShowPw(false); setPwForm({next:"",confirm:""}); setToast({msg:"Password changed",type:"success"}); }
    else setToast({msg:error.message,type:"error"});
  };

  return (
    <div style={{ padding:"20px 24px", maxWidth:600 }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px", marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>Organization</div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:C.goldDim, border:`1px solid ${C.goldBorder}`,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <PrismMark size={20} />
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF }}>{ORG_NAME}</div>
            <div style={{ fontSize:11, color:C.text2, fontFamily:FONT }}>Pro plan \u00b7 {APP_NAME}</div>
          </div>
        </div>
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase" }}>Your Profile</div>
          <GoldButton small outline onClick={()=>{ setEditForm({full_name:user?.full_name||"",phone:user?.phone||"",title:user?.title||""}); setShowEdit(true); }}>Edit</GoldButton>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <Avatar name={user?.full_name} email={user?.email} size={46} />
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:SERIF }}>{user?.full_name||"\u2014"}</div>
            <div style={{ fontSize:12, color:C.text2, fontFamily:FONT, marginTop:2 }}>{user?.email}</div>
            {user?.title&&<div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:1 }}>{user.title}</div>}
            <div style={{ fontSize:11, color:C.gold, fontFamily:FONT, marginTop:3, textTransform:"capitalize", fontWeight:600 }}>{user?.role}</div>
          </div>
        </div>
        {user?.phone&&<div style={{ marginTop:12, padding:"9px 13px", background:C.surface2, borderRadius:8, fontSize:12, color:C.text2, fontFamily:MONO }}>{user.phone}</div>}
      </div>

      <OrgMembersCard />

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px", marginTop:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>Security</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>Password</div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>Change your login password</div>
          </div>
          <GoldButton small outline onClick={()=>setShowPw(true)}>Change</GoldButton>
        </div>
      </div>

      {showEdit&&(
        <Modal title="Edit Profile" onClose={()=>setShowEdit(false)} maxWidth={440}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Full name" value={editForm.full_name} onChange={v=>setE("full_name",v)} placeholder="Jane Smith" />
            <Field label="Title"     value={editForm.title}     onChange={v=>setE("title",v)}     placeholder="Realtor \u00b7 ROG Advantage" />
            <Field label="Phone"     value={editForm.phone}     onChange={v=>setE("phone",v)}     placeholder="(813) 555-0100" />
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={saveProfile} disabled={saving}>{saving?"Saving\u2026":"Save changes"}</GoldButton>
              <GoldButton onClick={()=>setShowEdit(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}

      {showPw&&(
        <Modal title="Change Password" onClose={()=>setShowPw(false)} maxWidth={420}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="New password"     value={pwForm.next}    onChange={v=>setP("next",v)}    type="password" placeholder="Min. 8 characters" autoFocus />
            <Field label="Confirm password" value={pwForm.confirm} onChange={v=>setP("confirm",v)} type="password" placeholder="Same again" />
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={savePassword} disabled={saving||!pwForm.next}>{saving?"Saving\u2026":"Change password"}</GoldButton>
              <GoldButton onClick={()=>setShowPw(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────

export default function App() {
  const [session,setSession]             = useState(null);
  const [authLoading,setAuthLoading]     = useState(true);
  const [authScreen,setAuthScreen]       = useState("login");
  const [userProfile,setUserProfile]     = useState(null);
  const [view,setView]                   = useState("dashboard");
  const [sidebarCollapsed,setSC]         = useState(false);
  const [showTempBanner,setTempBanner]   = useState(false);
  const [deals,setDeals]                 = useState([]);
  const [contacts,setContacts]           = useState([]);
  const [tasks,setTasks]                 = useState([]);
  const [dataLoaded,setDataLoaded]       = useState(false);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setSession(session); setAuthLoading(false); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,session)=>{
      setSession(session);
      if(event==="PASSWORD_RECOVERY") setAuthScreen("setpassword");
      if(!session){ setUserProfile(null); setDataLoaded(false); setAuthScreen("login"); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session?.user) return;
    supabase.from("user_profiles").select("*").eq("email",session.user.email).single()
      .then(({data})=>{
        if(data){
          setUserProfile(data);
          const hrs = (Date.now()-new Date(data.created_at))/3600000;
          if(hrs<72) setTempBanner(true);
        }
      });
  },[session]);

  const loadData = useCallback(async()=>{
    if(!session) return;
    const [d,c,t] = await Promise.all([
      supabase.from("deals").select("*").eq("org_id",ORG_ID).order("created_at",{ascending:false}),
      supabase.from("contacts").select("*").eq("org_id",ORG_ID).order("full_name"),
      supabase.from("tasks").select("*").eq("org_id",ORG_ID).order("created_at",{ascending:false}),
    ]);
    setDeals(d.data||[]); setContacts(c.data||[]); setTasks(t.data||[]);
    setDataLoaded(true);
  },[session]);

  useEffect(()=>{ if(session) loadData(); },[session,loadData]);

  const signOut = ()=>supabase.auth.signOut();
  const onProfileSaved = updates => setUserProfile(p=>({...p,...updates}));

  if(authLoading) return <LoadingScreen message="Starting Prism\u2026" />;

  if(!session){
    if(authScreen==="forgot") return <ForgotScreen onBack={()=>setAuthScreen("login")} />;
    return <LoginScreen onForgot={()=>setAuthScreen("forgot")} />;
  }

  if(authScreen==="setpassword")
    return <SetPasswordScreen onDone={()=>{ setAuthScreen("login"); setTempBanner(false); }} />;

  if(!dataLoaded) return <LoadingScreen message="Loading your workspace\u2026" />;

  const TITLES = {
    dashboard:["Dashboard",ORG_NAME],
    deals:[`Deals`,`${deals.length} total`],
    contacts:[`Contacts`,`${contacts.length} total`],
    tasks:[`Tasks`,`${tasks.filter(t=>t.status!=="done").length} open`],
    settings:["Settings","Account & org"],
  };
  const [title,subtitle] = TITLES[view]||["Prism",""];
  const cu = userProfile||{email:session.user.email,role:"member"};
  const sw = sidebarCollapsed?56:220;

  return (
    <div style={{ display:"flex", background:C.bg, minHeight:"100vh" }}>
      <Sidebar activeView={view} onNav={setView} user={cu} onSignOut={signOut} collapsed={sidebarCollapsed} />
      <div style={{ marginLeft:sw, flex:1, transition:"margin-left 0.2s", display:"flex", flexDirection:"column", minWidth:0 }}>
        <TopBar title={title} subtitle={subtitle} onToggleSidebar={()=>setSC(c=>!c)} />
        {showTempBanner&&<TempPasswordBanner onAction={()=>{ setTempBanner(false); setAuthScreen("setpassword"); }} />}
        <main style={{ flex:1, overflowY:"auto" }}>
          {view==="dashboard"&&<DashboardView user={cu} deals={deals} contacts={contacts} tasks={tasks} />}
          {view==="deals"    &&<DealsView     user={cu} deals={deals}    onRefresh={loadData} />}
          {view==="contacts" &&<ContactsView  user={cu} contacts={contacts} onRefresh={loadData} />}
          {view==="tasks"    &&<TasksView     user={cu} tasks={tasks}    onRefresh={loadData} />}
          {view==="settings" &&<SettingsView  user={cu} onProfileSaved={onProfileSaved} />}
        </main>
      </div>
    </div>
  );
}