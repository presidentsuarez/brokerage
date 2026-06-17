import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Supabase/PostgREST caps a single .select() at 1000 rows. fetchAllRows pages
// through in 1000-row windows so org-wide counts and lists include EVERYTHING,
// no matter how far past 1000 a table grows. Pass a function that returns a
// FRESH query builder each call (so .range() chains cleanly per page).
async function fetchAllRows(buildQuery) {
  const PAGE = 1000;
  let from = 0;
  let all = [];
  for (;;) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error) { console.error("fetchAllRows error:", error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

const APP_NAME = "Ari";
const ORG_NAME = "Realty One Group Advantage";
const ORG_ID          = "8cc1004c-c4da-4aab-b79a-f8b507983303";
const PLATFORM_ADMIN  = "javier@thesuarezcapital.com";
const ARI_ID          = "f0ffc5bf-fd8b-454e-b5fc-13bd3aea7b72";

// Returns display label for created_by fields based on role
const creatorLabel = (user) => {
  if (!user) return "Unknown";
  const name = user.full_name || user.email;
  if (user.role === "admin") return `${name} · Manager`;
  return name;
};

const C_DARK = {
  gold:"#D4AF37", goldLight:"#E8C84A", goldDim:"rgba(212,175,55,0.15)",
  goldBorder:"rgba(212,175,55,0.30)", bg:"#0a0a0a", surface:"#111111",
  surface2:"#1a1a1a", surface3:"#222222", border:"rgba(255,255,255,0.08)",
  border2:"rgba(255,255,255,0.12)", text:"#f1f5f9", text2:"#94a3b8",
  text3:"#64748b", green:"#22c55e", red:"#ef4444", blue:"#3b82f6",
  amber:"#f59e0b", purple:"#a855f7",
};
const C_LIGHT = {
  gold:"#B7892B", goldLight:"#D4AF37", goldDim:"rgba(212,175,55,0.16)",
  goldBorder:"rgba(183,137,43,0.45)", bg:"#f4f5f7", surface:"#ffffff",
  surface2:"#eef0f3", surface3:"#e3e6ea", border:"rgba(15,23,42,0.10)",
  border2:"rgba(15,23,42,0.16)", text:"#0f172a", text2:"#475569",
  text3:"#7c8a9a", green:"#16a34a", red:"#dc2626", blue:"#2563eb",
  amber:"#d97706", purple:"#9333ea",
};
const C = { ...C_DARK };
function applyPalette(mode){ Object.assign(C, mode==="light" ? C_LIGHT : C_DARK); }
try { if (typeof localStorage!=="undefined" && localStorage.getItem("ari-theme")==="light") applyPalette("light"); } catch(e){}
const FONT  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";
const MONO  = "'DM Mono', monospace";

// Responsive breakpoints
function useIsMobile() {
  const [v, setV] = useState(typeof window!=="undefined"?window.innerWidth<768:false);
  useEffect(()=>{
    const h=()=>setV(window.innerWidth<768);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);
  return v;
}
function useIsTablet() {
  const [v, setV] = useState(typeof window!=="undefined"?window.innerWidth<1024:false);
  useEffect(()=>{
    const h=()=>setV(window.innerWidth<1024);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);
  return v;
}

const STATUS_CONFIG = {
  "New":            { color:"#D4AF37", bg:"rgba(212,175,55,0.15)" },
  "Active":         { color:"#3b82f6", bg:"rgba(59,130,246,0.10)" },
  "Under Contract": { color:"#f59e0b", bg:"rgba(245,158,11,0.10)" },
  "Closed":         { color:"#22c55e", bg:"rgba(34,197,94,0.10)" },
  "Dead":           { color:"#ef4444", bg:"rgba(239,68,68,0.10)" },
  "On Hold":        { color:"#64748b", bg:"rgba(100,116,135,0.10)" },
};

const NAV = [
  { id:"deals",     label:"Deals",     icon:"🏘️" },
  { id:"contacts",  label:"Contacts",  icon:"👤" },
  { id:"planning",  label:"Planning",  icon:"🧭" },
  { id:"calendar",  label:"Calendar",  icon:"📅" },
  { id:"listings",  label:"Listings",  icon:"📋" },
  { id:"buyers",    label:"Buyers",    icon:"🏠" },
  { id:"leasing",   label:"Leasing",   icon:"🔑" },
  { id:"recruiting", label:"Recruiting",  icon:"🎯", recruitGate:true },
  { id:"applications",label:"Applications",icon:"📥", adminOnly:true },
  { id:"organization",label:"Organization",icon:"🏛️" },
  { id:"financials",  label:"Financials",  icon:"💵", adminOnly:true },
  { id:"performance", label:"Performance", icon:"📈", adminOnly:true },
  { id:"systems",    label:"Systems",   icon:"🛰️", ownerOnly:true },
  { id:"robots",    label:"Robots",    icon:"🤖", platformOnly:true },
  { id:"design",    label:"Design",    icon:"🎨", platformOnly:true },
  { id:"notepad",   label:"Notepad",   icon:"📝", platformOnly:true },
  { id:"settings",  label:"Settings",  icon:"⚙️", platformOnly:true },
];

// Sidebar grouping: collapsible sections. Items keep their own gating from NAV.
const NAV_GROUPS = [
  { group:"realestate", label:"Real Estate", icon:"🏢", items:["deals","listings","buyers","leasing"] },
  { group:"people",     label:"People",      icon:"👥", items:["contacts","recruiting","applications"] },
  { group:"finance",    label:"Finance",     icon:"💰", items:["financials","performance"] },
  { group:"workspace",  label:"Workspace",   icon:"🗂️", items:["planning","calendar"] },
  { group:"admin",      label:"Admin",       icon:"🛠️", items:["organization","systems","robots","design","notepad","settings"] },
];
const NAV_BY_ID = Object.fromEntries(NAV.map(n=>[n.id,n]));

// ── Shared atoms ──────────────────────────────────────────────

function AriMark({ size=32 }) {
  return (
    <img src={`${process.env.PUBLIC_URL}/logo512.png?v=4`} alt="Realty ONE Group Advantage" width={size} height={size}
      style={{ width:size, height:size, flexShrink:0, display:"block", borderRadius:size*0.22, objectFit:"cover" }} />
  );
}

function BrandWordmark({ variant="sidebar" }) {
  const ONE = <span style={{ color:C.gold, fontWeight:800 }}>ONE</span>;
  if(variant==="auth"){
    return (
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:SERIF, fontWeight:700, color:C.text, fontSize:23, letterSpacing:"-0.01em", lineHeight:1.2 }}>
          Realty {ONE} Group Advantage
        </div>
        <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, letterSpacing:"0.10em", textTransform:"uppercase", marginTop:7 }}>
          Powered by Ari
        </div>
      </div>
    );
  }
  return (
    <div style={{ overflow:"hidden", flex:1 }}>
      <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF, letterSpacing:"-0.01em", whiteSpace:"nowrap" }}>
        Realty {ONE} Group
      </div>
      <div style={{ fontSize:8.5, color:C.text3, fontFamily:FONT, whiteSpace:"nowrap", letterSpacing:"0.03em", textTransform:"uppercase" }}>
        Advantage · Powered by Ari
      </div>
    </div>
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
  const isMobile = useIsMobile();
  const pad = small ? "7px 14px" : "10px 20px";
  const base = { padding:pad, borderRadius:8, border:"none",
    cursor:disabled?"not-allowed":"pointer",
    fontSize:small?12:13, fontWeight:600, fontFamily:FONT,
    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
    minHeight:isMobile?(small?40:44):undefined,
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
  const isMobile = useIsMobile();
  return (
    <div>
      {label && <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
        letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>{label}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} required={required} autoFocus={autoFocus}
        style={{ width:"100%", padding:"10px 13px", background:C.surface2,
          border:`1.5px solid ${foc?C.gold:C.border2}`, borderRadius:8,
          color:C.text, fontSize:isMobile?16:13, fontFamily:FONT, outline:"none",
          transition:"border-color 0.15s", boxSizing:"border-box" }}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} />
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  const isMobile = useIsMobile();
  return (
    <div>
      {label && <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
        letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", padding:"10px 13px", background:C.surface2,
          border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text,
          fontSize:isMobile?16:13, fontFamily:FONT, outline:"none", boxSizing:"border-box" }}>
        {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
      </select>
    </div>
  );
}

function Modal({ title, onClose, children, maxWidth=500 }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200,
      display:"flex", alignItems:isMobile?"flex-start":"center", justifyContent:"center",
      padding:isMobile?10:24, overflowY:"auto" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
        padding:isMobile?18:28, width:"100%", maxWidth, maxHeight:isMobile?"none":"90vh",
        marginTop:isMobile?8:0, marginBottom:isMobile?24:0, overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:isMobile?16:22 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:C.text, fontFamily:SERIF, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.text2, fontSize:22, cursor:"pointer", lineHeight:1, padding:4 }}>✕</button>
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


function BottomNavBar({ activeView, onNav, user, onMenu }) {
  const isAdmin = ["admin","owner"].includes(user?.role);
  const permitted = NAV.filter(n=>{
    if(n.platformOnly) return user?.email===PLATFORM_ADMIN;
    if(n.recruitGate)  return isAdmin || !!user?.canRecruit;
    if(n.ownerOnly)    return user?.role==="owner";
    if(n.adminOnly)    return isAdmin;
    return true;
  });
  // 4 quick items + a Menu button that opens the full drawer (everything else)
  const items = permitted.slice(0, 4);
  const inQuick = items.some(i=>i.id===activeView);

  const cell = (active)=>({
    flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    padding:"10px 4px 8px", background:"transparent", border:"none", cursor:"pointer",
    color:active?C.gold:C.text3, minHeight:56, position:"relative", transition:"color 0.12s",
  });
  const labelStyle = (active)=>({ fontSize:9, fontWeight:active?700:400, fontFamily:FONT, letterSpacing:"0.03em", textTransform:"uppercase" });

  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:90,
      background:C.surface, borderTop:`1px solid ${C.border}`,
      display:"flex", paddingBottom:"env(safe-area-inset-bottom,0px)", backdropFilter:"blur(10px)",
    }}>
      {items.map(item=>{
        const active = activeView===item.id;
        return (
          <button key={item.id} onClick={()=>onNav(item.id)} style={cell(active)}>
            <span style={{ fontSize:20, lineHeight:1, marginBottom:3 }}>{item.icon}</span>
            <span style={labelStyle(active)}>{item.label}</span>
            {active && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:24, height:2, background:C.gold, borderRadius:2 }} />}
          </button>
        );
      })}
      {/* Menu: opens the full drawer with all remaining options */}
      <button onClick={onMenu} style={cell(!inQuick)}>
        <span style={{ fontSize:20, lineHeight:1, marginBottom:3 }}>☰</span>
        <span style={labelStyle(!inQuick)}>Menu</span>
        {!inQuick && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:24, height:2, background:C.gold, borderRadius:2 }} />}
      </button>
    </div>
  );
}

function LoadingScreen({ message="Loading\u2026" }) {
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
      <div style={{ animation:"pulse 1.8s ease-in-out infinite" }}>
        <AriMark size={48} />
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
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <AriMark size={52} />
          </div>
          <BrandWordmark variant="auth" />
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
    const creds = { email: email.trim().toLowerCase(), password: pw };
    const isNetworkErr = (m="") => /load failed|failed to fetch|network|timeout|fetch/i.test(m);
    let err = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await supabase.auth.signInWithPassword(creds);
      err = res.error;
      if (!err) { setError(""); return; }            // success → onAuthStateChange takes over
      if (!isNetworkErr(err.message)) break;          // real auth error (bad password) → stop, show it
      await new Promise(r => setTimeout(r, 600 * (attempt + 1))); // transient network → back off & retry
    }
    setError(err && isNetworkErr(err.message)
      ? "Couldn't reach the server. Check your internet connection and try again."
      : (err ? err.message : "Sign-in failed. Please try again."));
    setLoading(false);
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
      redirectTo:`${window.location.origin}${window.location.pathname}`
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

function Sidebar({ activeView, onNav, user, onSignOut, collapsed, mobileOpen, onMobileClose }) {
  const isMobile = useIsMobile();
  const isAdmin = ["admin","owner"].includes(user?.role);

  const sidebarW = isMobile ? 272 : collapsed ? 56 : 220;
  const isHidden = isMobile && !mobileOpen;
  const [profileOpen, setProfileOpen] = useState(false);
  const isPermitted = (n) => {
    if(!n) return false;
    if(n.platformOnly) return user?.email===PLATFORM_ADMIN;
    if(n.recruitGate)  return isAdmin || !!user?.canRecruit;
    if(n.ownerOnly)    return user?.role==="owner";
    if(n.adminOnly)    return isAdmin;
    return true;
  };
  const groupOfView = (v) => (NAV_GROUPS.find(g=>g.items.includes(v))||{}).group;
  const [openGroups, setOpenGroups] = useState(()=>{ const g=groupOfView(activeView)||NAV_GROUPS[0].group; return {[g]:true}; });
  useEffect(()=>{ const g=groupOfView(activeView); if(g) setOpenGroups(o=>o[g]?o:{...o,[g]:true}); },[activeView]);
  const toggleGroup = (g) => setOpenGroups(o=>({...o,[g]:!o[g]}));

  const handleNav = (id) => {
    onNav(id);
    if(isMobile) onMobileClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div onClick={onMobileClose}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
            zIndex:99, backdropFilter:"blur(2px)" }} />
      )}

      <div style={{
        width:sidebarW, minWidth:sidebarW,
        background:C.surface, borderRight:`1px solid ${C.border}`,
        height:"100vh", display:"flex", flexDirection:"column",
        overflow:"hidden", position:"fixed", top:0, left:0,
        zIndex:100,
        transition:"transform 0.25s ease, width 0.2s, min-width 0.2s",
        transform:isHidden?"translateX(-100%)":"translateX(0)",
        boxShadow:isMobile&&mobileOpen?"4px 0 24px rgba(0,0,0,0.4)":"none",
      }}>
        {/* Logo header */}
        <div style={{ padding:collapsed&&!isMobile?"16px 14px":"16px 18px",
          display:"flex", alignItems:"center", gap:10,
          borderBottom:`1px solid ${C.border}`, minHeight:56 }}>
          <div onClick={()=>handleNav("dashboard")} title="Dashboard"
            style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <AriMark size={26} />
            {(!collapsed||isMobile) && <BrandWordmark variant="sidebar" />}
          </div>
          {isMobile && (
            <button onClick={onMobileClose} style={{ background:"none", border:"none",
              color:C.text2, fontSize:20, cursor:"pointer", marginLeft:"auto",
              padding:4, lineHeight:1 }}>✕</button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, padding:"10px 6px", display:"flex", flexDirection:"column", gap:1, overflowY:"auto" }}>
          {(collapsed && !isMobile)
            ? NAV.filter(isPermitted).map(item=>{
                const active = activeView===item.id;
                return (
                  <button key={item.id} onClick={()=>handleNav(item.id)} title={item.label} style={{
                    display:"flex", alignItems:"center", justifyContent:"center", padding:"10px 0", width:"100%",
                    borderRadius:10, border:"none", cursor:"pointer", background:active?C.goldDim:"transparent",
                    color:active?C.gold:C.text2, minHeight:36, transition:"all 0.1s" }}>
                    <span style={{ fontSize:17, lineHeight:1 }}>{item.icon}</span>
                  </button>
                );
              })
            : NAV_GROUPS.map(grp=>{
                const kids = grp.items.map(id=>NAV_BY_ID[id]).filter(isPermitted);
                if(kids.length===0) return null;
                const open = !!openGroups[grp.group];
                const hasActive = kids.some(k=>k.id===activeView);
                return (
                  <div key={grp.group} style={{ marginBottom:2 }}>
                    <button onClick={()=>toggleGroup(grp.group)} style={{
                      display:"flex", alignItems:"center", gap:10, padding:"9px 12px", width:"100%",
                      borderRadius:10, border:"none", cursor:"pointer", background:"transparent",
                      color:(hasActive&&!open)?C.gold:C.text3, fontSize:11, fontWeight:700, fontFamily:FONT,
                      letterSpacing:"0.06em", textTransform:"uppercase" }}
                      onMouseEnter={e=>{e.currentTarget.style.color=C.text2;}}
                      onMouseLeave={e=>{e.currentTarget.style.color=(hasActive&&!open)?C.gold:C.text3;}}>
                      <span style={{ fontSize:14, lineHeight:1 }}>{grp.icon}</span>
                      <span style={{ flex:1, textAlign:"left" }}>{grp.label}</span>
                      <span style={{ fontSize:9, transform:open?"rotate(90deg)":"none", transition:"transform 0.12s" }}>▸</span>
                    </button>
                    {open && kids.map(item=>{
                      const active = activeView===item.id;
                      return (
                        <button key={item.id} onClick={()=>handleNav(item.id)} style={{
                          display:"flex", alignItems:"center", gap:11, padding:"9px 12px 9px 24px", width:"100%",
                          borderRadius:10, border:"none", cursor:"pointer", background:active?C.goldDim:"transparent",
                          color:active?C.gold:C.text2, fontSize:isMobile?14:13, fontWeight:active?600:400,
                          fontFamily:FONT, minHeight:isMobile?44:34, transition:"all 0.1s" }}
                          onMouseEnter={e=>{if(!active){e.currentTarget.style.background=C.surface2;e.currentTarget.style.color=C.text;}}}
                          onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text2;}}}>
                          <span style={{ fontSize:15, lineHeight:1, flexShrink:0 }}>{item.icon}</span>
                          <span style={{ whiteSpace:"nowrap" }}>{item.label}</span>
                          {active&&<div style={{ marginLeft:"auto", width:3, height:16, borderRadius:2, background:C.gold }} />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
        </nav>

        {/* User footer — click your profile to reveal details / settings / sign out */}
        <div style={{ padding:(collapsed&&!isMobile)?"10px 6px":"12px 14px",
          borderTop:`1px solid ${C.border}`, position:"relative" }}>

          {profileOpen && (
            <>
              <div onClick={()=>setProfileOpen(false)}
                style={{ position:"fixed", inset:0, zIndex:120 }} />
              <div style={{ position:"absolute", bottom:"100%", left:8, width:226,
                maxWidth:"calc(100vw - 24px)", marginBottom:8, background:C.surface2,
                border:`1px solid ${C.border}`, borderRadius:12,
                boxShadow:"0 10px 34px rgba(0,0,0,0.55)", zIndex:121, overflow:"hidden", padding:6 }}>
                {/* profile details */}
                <div style={{ padding:"10px 10px 12px", borderBottom:`1px solid ${C.border}`,
                  marginBottom:6, display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar name={user?.full_name} email={user?.email} size={36} />
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {user?.full_name||user?.email}</div>
                    <div style={{ fontSize:11, color:C.text3, fontFamily:FONT,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {user?.email}</div>
                    <div style={{ fontSize:10, color:C.text3, fontFamily:FONT,
                      textTransform:"capitalize", marginTop:1 }}>
                      {user?.brokerage_role||user?.role}</div>
                  </div>
                </div>
                {/* personal settings (platform admin) */}
                {user?.email===PLATFORM_ADMIN && (
                  <button onClick={()=>{ setProfileOpen(false); handleNav("settings"); }}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                      padding:"9px 10px", background:"transparent", border:"none", borderRadius:8,
                      color:C.text2, fontSize:13, fontFamily:FONT, cursor:"pointer", textAlign:"left" }}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.surface;e.currentTarget.style.color=C.text;}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text2;}}>
                    <span style={{ fontSize:15 }}>⚙️</span><span>Settings</span>
                  </button>
                )}
                {/* sign out */}
                <button onClick={onSignOut}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                    padding:"9px 10px", background:"transparent", border:"none", borderRadius:8,
                    color:C.text3, fontSize:13, fontFamily:FONT, cursor:"pointer", textAlign:"left" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,0.10)";e.currentTarget.style.color=C.red;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text3;}}>
                  <span style={{ fontSize:15 }}>⎋</span><span>Sign out</span>
                </button>
              </div>
            </>
          )}

          {/* profile trigger */}
          <button onClick={()=>setProfileOpen(o=>!o)} title="Your profile"
            style={{ width:"100%", display:"flex", alignItems:"center",
              gap:(collapsed&&!isMobile)?0:10,
              justifyContent:(collapsed&&!isMobile)?"center":"flex-start",
              padding:(collapsed&&!isMobile)?"6px 0":"6px 6px",
              background:profileOpen?C.surface2:"transparent",
              border:`1px solid ${profileOpen?C.border:"transparent"}`, borderRadius:10,
              cursor:"pointer", minHeight:isMobile?44:undefined, transition:"background 0.12s" }}
            onMouseEnter={e=>{if(!profileOpen)e.currentTarget.style.background=C.surface2;}}
            onMouseLeave={e=>{if(!profileOpen)e.currentTarget.style.background="transparent";}}>
            <Avatar name={user?.full_name} email={user?.email} size={(collapsed&&!isMobile)?28:32} />
            {(!collapsed||isMobile) && (
              <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {user?.full_name||user?.email}</div>
                <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, textTransform:"capitalize" }}>
                  {user?.brokerage_role||user?.role}</div>
              </div>
            )}
            {(!collapsed||isMobile) && (
              <span style={{ marginLeft:"auto", color:C.text3, fontSize:11,
                transform:profileOpen?"rotate(180deg)":"none", transition:"transform 0.15s" }}>▴</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function TopBar({ title, subtitle, onToggleSidebar, actions, theme, onToggleTheme }) {
  return (
    <div style={{ height:56, background:C.surface, borderBottom:`1px solid ${C.border}`,
      display:"flex", alignItems:"center", padding:"0 16px 0 12px", gap:12,
      position:"sticky", top:0, zIndex:50 }}>
      <button onClick={onToggleSidebar} aria-label="Open menu" title="Menu" style={{
        background:C.surface2, border:`1px solid ${C.border2}`, color:C.text, cursor:"pointer",
        fontSize:18, padding:"7px 12px", borderRadius:8, lineHeight:1, flexShrink:0,
        minWidth:42, minHeight:40, display:"flex", alignItems:"center", justifyContent:"center" }}>☰</button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF,
          letterSpacing:"-0.01em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{title}</div>
        {subtitle && <div style={{ fontSize:11, color:C.text3, fontFamily:FONT,
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{subtitle}</div>}
      </div>
      {onToggleTheme && (
        <button onClick={onToggleTheme} title="Toggle light / dark" style={{
          background:"none", border:`1px solid ${C.border2}`, color:C.text2, cursor:"pointer",
          fontSize:15, padding:"7px", borderRadius:8, lineHeight:1, minWidth:38, minHeight:38,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {theme==="light" ? "\u{1F319}" : "\u2600\uFE0F"}
        </button>
      )}
      {actions && <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>{actions}</div>}
    </div>
  );
}

function TempPasswordBanner({ onAction }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ background:"rgba(212,175,55,0.10)", borderBottom:`1px solid rgba(212,175,55,0.25)`,
      padding:isMobile?"10px 14px":"9px 20px",
      display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
      <span>⚠️</span>
      <span style={{ fontSize:12, color:C.gold, fontFamily:FONT, flex:1, minWidth:160 }}>
        {isMobile ? "Temp password — change it now." : "You're using a temporary password — change it now to secure your account."}
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
  const isAdmin = ["admin","owner"].includes(user?.role);
  const [bk, setBk] = useState(null);
  useEffect(()=>{ if(!isAdmin) return; (async()=>{
    const { data } = await supabase.from("brokerage_performance_yearly").select("*").eq("org_id",ORG_ID);
    if(data && data.length) setBk({
      deals: data.reduce((s,y)=>s+Number(y.deals||0),0),
      vol:   data.reduce((s,y)=>s+Number(y.volume||0),0),
      gci:   data.reduce((s,y)=>s+Number(y.gci||0),0),
    });
  })(); },[isAdmin]);

  return (
    <div style={{ padding:"16px", maxWidth:1100 }}>
      <div style={{ marginBottom:22 }}>
        <h2 style={{ fontSize:20, fontWeight:700, fontFamily:SERIF, color:C.text,
          margin:"0 0 3px", letterSpacing:"-0.02em" }}>
          Welcome back, {(user?.full_name||"").split(" ")[0]||"there"}.
        </h2>
        <p style={{ fontSize:12, color:C.text2, fontFamily:FONT, margin:0 }}>
          {ORG_NAME} · {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
        </p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))", gap:12, marginBottom:26 }}>
        <StatCard label="Active Deals" value={open.length} icon="◈" />
        {isAdmin && bk ? (<>
          <StatCard label="Closed · all-time" value={bk.deals.toLocaleString()} accent={C.green} icon="✓" />
          <StatCard label="Volume · 7yr"      value={fmt(bk.vol)} icon="$" />
          <StatCard label="GCI · 7yr"         value={fmt(bk.gci)} accent={C.gold} icon="◑" />
        </>) : (<>
          <StatCard label="Closed" value={closed.length} accent={C.green} icon="✓" />
          <StatCard label="Volume" value={vol>0?fmt(vol):"—"} icon="$" />
        </>)}
        <StatCard label="Contacts"  value={contacts.length} icon="◎" />
        <StatCard label="My Tasks"  value={mine.length} accent={mine.length>3?C.amber:C.text2} icon="◻" />
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



// ════════════════════════════════════════════════════════════
// DEAL FINANCIALS TAB
// ════════════════════════════════════════════════════════════
function DealFinancialsTab({ deal, dealContacts, user, onRecorded }) {
  const isMobile  = useIsMobile();
  const isAdmin   = ["admin","owner"].includes(user?.role);
  const [confirmedRecs, setConfirmed]       = useState([]);
  const [pkgMap,        setPkgMap]          = useState({});
  const [loading,       setLoading]         = useState(true);
  const [salePrice,     setSalePrice]       = useState(String(deal.price||""));
  const [commRate,      setCommRate]        = useState(String(deal.commission_rate||"3"));
  const [editInputs,    setEditInputs]      = useState(!deal.price);
  const [savingFor,     setSavingFor]       = useState(null);
  const [toast,         setToast]           = useState(null);
  const [showExternal,  setShowExternal]    = useState(false);
  const [extForm,       setExtForm]         = useState({name:"",amount:"",role:"Buyer Agent",notes:""});
  const setExt = (k,v) => setExtForm(f=>({...f,[k]:v}));

  const fmt = n => n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1e3?`$${(n/1e3).toFixed(1)}K`:`$${Math.round(n||0).toLocaleString()}`;

  const loadData = async () => {
    setLoading(true);
    const agentIds = dealContacts.map(dc=>dc.contact_id).filter(Boolean);
    const [fins, pkgs] = await Promise.all([
      supabase.from("deal_financials").select("*").eq("deal_id", deal.id),
      agentIds.length > 0
        ? supabase.from("agent_fee_packages").select("*").in("contact_id", agentIds).eq("is_active", true)
        : Promise.resolve({data:[]}),
    ]);
    setConfirmed(fins.data||[]);
    const map = {};
    for(const p of (pkgs.data||[])) map[p.contact_id] = p;
    setPkgMap(map);
    setLoading(false);
  };

  useEffect(()=>{ loadData(); },[deal.id, dealContacts.length]);

  const price     = parseFloat(String(salePrice).replace(/[^0-9.]/g,""))||0;
  const rate      = parseFloat(commRate)||0;
  const grossComm = price*rate/100;

  const calcFor = (contactId) => {
    const pkg      = pkgMap[contactId];
    const agentPct = pkg?.split_agent_pct||80;
    const agentGross = grossComm*agentPct/100;
    const txFee    = pkg?.flat_transaction_fee||0;
    const eoFee    = pkg?.e_and_o_fee||0;
    const royalty  = pkg?.royalty_fee_pct ? agentGross*pkg.royalty_fee_pct/100 : 0;
    const agentNet = agentGross - txFee - eoFee - royalty;
    const brokerNet= grossComm - agentNet;
    return { pkg, agentPct, agentGross, txFee, eoFee, royalty, agentNet, brokerNet };
  };

  const confirmedFor = (cid) => confirmedRecs.find(r=>r.contact_id===cid);

  const confirm = async (cid) => {
    const dc   = dealContacts.find(d=>d.contact_id===cid);
    const calc = calcFor(cid);
    setSavingFor(cid);
    await supabase.from("deal_financials")
      .delete().eq("deal_id",deal.id).eq("contact_id",cid).eq("status","projected");
    const { error } = await supabase.from("deal_financials").insert({
      org_id:ORG_ID, deal_id:deal.id, contact_id:cid,
      package_id:calc.pkg?.id||null, sale_price:price,
      commission_rate:rate, agent_split_pct:calc.agentPct,
      co_op_split_pct:calc.pkg?.co_op_split_pct||null,
      agent_gross:calc.agentGross, transaction_fee:calc.txFee,
      e_and_o_fee:calc.eoFee, royalty_fee:calc.royalty,
      brokerage_net:calc.brokerNet,
      status:deal.status==="Closed"?"closed":"projected",
      close_date:deal.close_date||null, created_by:user?.email,
    });
    setSavingFor(null);
    if(!error){ await loadData(); setToast({msg:"Financials recorded ✓",type:"success"}); if(onRecorded) onRecorded(); }
    else setToast({msg:"Error saving",type:"error"});
  };

  const rogaAgents   = dealContacts.filter(dc=>dc.contacts);
  const extRecs      = confirmedRecs.filter(r=>!r.contact_id&&r.notes);
  const totalBroker  = rogaAgents.reduce((s,dc)=>{ const c=calcFor(dc.contact_id); return s+c.brokerNet; },0);
  const totalAgent   = rogaAgents.reduce((s,dc)=>{ const c=calcFor(dc.contact_id); return s+c.agentNet;  },0);

  const CONF_LABEL = { "New":"Speculative","Active":"In Pipeline","Under Contract":"High Confidence","Closed":"Confirmed","On Hold":"On Hold","Dead":"Dead" };
  const CONF_COLOR = { "New":C.text3,"Active":C.blue,"Under Contract":C.amber,"Closed":C.green,"On Hold":C.text3,"Dead":C.red };
  const confColor  = CONF_COLOR[deal.status]||C.text3;
  const confLabel  = CONF_LABEL[deal.status]||deal.status;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      {/* ── Deal inputs ── */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Deal Inputs</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:700, color:confColor, fontFamily:FONT }}>
                ● {confLabel}
              </span>
              {deal.close_date && (
                <span style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>
                  📅 Expected close: <strong style={{color:C.text}}>
                    {new Date(deal.close_date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                  </strong>
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <button onClick={()=>setEditInputs(e=>!e)}
              style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:7,
                color:C.text2, fontSize:11, fontFamily:FONT, cursor:"pointer",
                padding:"5px 11px", flexShrink:0 }}>
              {editInputs?"Lock ✓":"Edit"}
            </button>
          )}
        </div>

        {editInputs && isAdmin ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Field label="Sale Price ($)" value={salePrice} onChange={setSalePrice} placeholder="500,000" />
            <Field label="Commission %" value={commRate}   onChange={setCommRate}   placeholder="3.0" />
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:10 }}>
            {[
              {l:"Sale Price",       v:price>0?`$${price.toLocaleString()}`:"Not set", c:C.text},
              {l:"Commission Rate",  v:rate>0?`${rate}%`:"Not set",                    c:C.text},
              {l:"Gross Commission", v:grossComm>0?fmt(grossComm):"—",                 c:C.gold, big:true},
            ].map(item=>(
              <div key={item.l} style={{ background:C.surface2, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.text3, fontFamily:FONT,
                  textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{item.l}</div>
                <div style={{ fontSize:item.big?18:14, fontWeight:700, color:item.c, fontFamily:SERIF }}>
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding:"24px 0", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>Loading…</div>
      ) : (
        <>
          {/* ── ROGA Agents ── */}
          {rogaAgents.length === 0 ? (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
              padding:"24px 16px", textAlign:"center", color:C.text3, fontSize:12, fontFamily:FONT }}>
              No ROGA agents linked yet.<br/>
              <span style={{ fontSize:11, marginTop:3, display:"block" }}>Use the People tab to link agents to this deal.</span>
            </div>
          ) : rogaAgents.map(dc=>{
            const contact   = dc.contacts;
            if(!contact) return null;
            const confirmed = confirmedFor(dc.contact_id);
            const calc      = calcFor(dc.contact_id);
            const isConf    = !!confirmed;
            const isSaving  = savingFor===dc.contact_id;
            const getVal = k => isConf&&confirmed[k]!=null ? confirmed[k] : calc[k];

            return (
              <div key={dc.id} style={{ background:C.surface,
                border:`1px solid ${isConf?C.goldBorder:C.border}`, borderRadius:12, overflow:"hidden" }}>

                {/* Agent header */}
                <div style={{ padding:"11px 16px", borderBottom:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", gap:10, background:C.surface2 }}>
                  <Avatar name={contact.full_name} email={contact.email} size={30} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>{contact.full_name}</div>
                    <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>
                      {dc.role}
                      {calc.pkg ? ` · ${calc.pkg.package_name}` : " · ⚠️ No package (using 80/20 default)"}
                    </div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, flexShrink:0,
                    color:isConf?C.green:C.text3,
                    background:isConf?"rgba(34,197,94,0.10)":C.surface3,
                    borderRadius:20, padding:"3px 9px" }}>
                    {isConf?"Confirmed ✓":"Projected"}
                  </span>
                </div>

                {/* Breakdown grid */}
                {grossComm > 0 ? (
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ display:"grid",
                      gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr", gap:10, marginBottom:12 }}>
                      {[
                        {l:"Gross GCI",      v:fmt(grossComm),                       c:C.text},
                        {l:`Agent (${getVal("agentPct")||calc.agentPct}%)`, v:fmt(getVal("agentGross")||calc.agentGross), c:C.text},
                        {l:"Agent Net",      v:fmt(isConf?confirmed.agent_net:calc.agentNet),    c:C.blue,  big:true},
                        {l:"Brokerage Net",  v:fmt(getVal("brokerNet")||calc.brokerNet), c:C.gold, big:true},
                      ].map(item=>(
                        <div key={item.l} style={{ background:C.surface2, borderRadius:8, padding:"10px 12px" }}>
                          <div style={{ fontSize:9, fontWeight:700, color:C.text3, fontFamily:FONT,
                            textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{item.l}</div>
                          <div style={{ fontSize:item.big?17:14, fontWeight:700, color:item.c,
                            fontFamily:SERIF }}>{item.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Deductions line */}
                    {(calc.txFee>0||calc.eoFee>0||calc.royalty>0) && (
                      <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:12 }}>
                        {calc.txFee>0&&<span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                          Tx fee: <strong style={{color:C.red}}>−{fmt(calc.txFee)}</strong></span>}
                        {calc.eoFee>0&&<span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                          E&O: <strong style={{color:C.red}}>−{fmt(calc.eoFee)}</strong></span>}
                        {calc.royalty>0&&<span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                          Royalty: <strong style={{color:C.red}}>−{fmt(calc.royalty)}</strong></span>}
                      </div>
                    )}

                    {!isConf && isAdmin && (
                      <GoldButton small onClick={()=>confirm(dc.contact_id)} disabled={isSaving}>
                        {isSaving?"Saving…":"Confirm & Record"}
                      </GoldButton>
                    )}
                  </div>
                ) : (
                  <div style={{ padding:"12px 16px", color:C.text3, fontSize:12, fontFamily:FONT }}>
                    Set sale price and commission rate above to see the breakdown.
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Totals summary ── */}
          {rogaAgents.length > 0 && grossComm > 0 && (
            <div style={{ background:C.goldDim, border:`1px solid ${C.goldBorder}`,
              borderRadius:12, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.gold, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Deal Summary</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10 }}>
                {[
                  {l:"Gross GCI",          v:fmt(grossComm)},
                  {l:"Total Agent Payouts",v:fmt(totalAgent)},
                  {l:"Brokerage Total",    v:fmt(totalBroker)},
                ].map(item=>(
                  <div key={item.l}>
                    <div style={{ fontSize:9, fontWeight:700, color:C.gold, fontFamily:FONT,
                      textTransform:"uppercase", letterSpacing:"0.07em" }}>{item.l}</div>
                    <div style={{ fontSize:18, fontWeight:700, color:C.text,
                      fontFamily:SERIF, marginTop:2 }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── External parties ── */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${C.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.08em" }}>External Parties</span>
              {!showExternal && isAdmin && (
                <GoldButton small outline onClick={()=>setShowExternal(true)}>+ Log</GoldButton>
              )}
            </div>
            {showExternal ? (
              <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Field label="Name / Company"      value={extForm.name}   onChange={v=>setExt("name",v)}   placeholder="e.g. RE/MAX Agent" />
                  <Field label="Their Commission ($)" value={extForm.amount} onChange={v=>setExt("amount",v)} placeholder="12750" />
                </div>
                <Sel label="Role" value={extForm.role} onChange={v=>setExt("role",v)}
                  options={["Buyer Agent","Listing Agent","Co-op Agent","Referral","Other"]} />
                <Field label="Notes" value={extForm.notes} onChange={v=>setExt("notes",v)} placeholder="Optional" />
                <div style={{ display:"flex", gap:8 }}>
                  <GoldButton small onClick={async()=>{
                    const amt = parseFloat(extForm.amount)||0;
                    await supabase.from("deal_financials").insert({
                      org_id:ORG_ID, deal_id:deal.id,
                      sale_price:price, commission_rate:rate,
                      agent_gross:amt, brokerage_net:0,
                      status:"projected",
                      notes:`${extForm.role}: ${extForm.name}${extForm.notes?". "+extForm.notes:""}`,
                      created_by:user?.email,
                    });
                    setShowExternal(false); setExtForm({name:"",amount:"",role:"Buyer Agent",notes:""});
                    await loadData(); setToast({msg:"External party logged",type:"success"});
                  }} disabled={!extForm.name}>Save</GoldButton>
                  <GoldButton small outline onClick={()=>setShowExternal(false)}>Cancel</GoldButton>
                </div>
              </div>
            ) : extRecs.length===0 ? (
              <div style={{ padding:"14px 16px", fontSize:12, color:C.text3, fontFamily:FONT }}>
                No external parties logged
              </div>
            ) : extRecs.map(r=>(
              <div key={r.id} style={{ padding:"11px 16px", borderBottom:`1px solid ${C.border}`,
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{r.notes}</span>
                <span style={{ fontSize:12, fontWeight:700, color:C.text, fontFamily:MONO }}>
                  {fmt(r.agent_gross||0)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PIPELINE REVENUE WIDGET (admin dashboard)
// ════════════════════════════════════════════════════════════
function PipelineRevenueWidget({ deals }) {
  const fmt = n => n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${Math.round(n||0)}`;
  const STAGES = [
    {s:"Under Contract",c:C.amber,  conf:"High confidence"},
    {s:"Active",         c:C.blue,   conf:"In pipeline"},
    {s:"New",            c:C.text3,  conf:"Speculative"},
    {s:"Closed",         c:C.green,  conf:"Confirmed"},
  ];
  const byStage = {};
  for(const d of deals.filter(d=>!["Dead","On Hold"].includes(d.status))) {
    const gross  = (d.price||0)*(d.commission_rate||3)/100;
    const broker = gross*0.20;
    if(!byStage[d.status]) byStage[d.status]={count:0,gross:0,broker:0};
    byStage[d.status].count++;
    byStage[d.status].gross  += gross;
    byStage[d.status].broker += broker;
  }
  const totalBroker = Object.values(byStage).reduce((s,v)=>s+v.broker,0);
  const totalGross  = Object.values(byStage).reduce((s,v)=>s+v.gross,0);
  const hasData     = Object.keys(byStage).length > 0;

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
            textTransform:"uppercase", letterSpacing:"0.08em" }}>Pipeline Revenue</span>
          <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginTop:2 }}>Est. brokerage net at 20%</div>
        </div>
        <span style={{ fontSize:18, fontWeight:700, color:C.gold, fontFamily:SERIF }}>
          {fmt(totalBroker)}
        </span>
      </div>
      {!hasData ? (
        <div style={{ padding:"18px", fontSize:12, color:C.text3, fontFamily:FONT }}>No active deals</div>
      ) : STAGES.filter(({s})=>byStage[s]).map(({s,c,conf})=>{
        const data = byStage[s];
        const pct  = totalGross>0 ? data.gross/totalGross : 0;
        return (
          <div key={s} style={{ padding:"10px 18px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }} />
              <span style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:FONT, flex:1 }}>{s}</span>
              <span style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{data.count} deal{data.count!==1?"s":""}</span>
              <span style={{ fontSize:12, fontWeight:700, color:C.gold, fontFamily:MONO }}>{fmt(data.broker)}</span>
            </div>
            <div style={{ height:3, background:C.surface2, borderRadius:2 }}>
              <div style={{ height:"100%", borderRadius:2, background:c, width:`${pct*100}%`, transition:"width 0.5s" }} />
            </div>
          </div>
        );
      })}
      {totalGross>0 && (
        <div style={{ padding:"10px 18px", display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>Total GCI in pipeline</span>
          <span style={{ fontSize:12, fontWeight:600, color:C.text2, fontFamily:MONO }}>{fmt(totalGross)}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PORTAL EARNINGS VIEW (module level — avoids re-render bug)
// ════════════════════════════════════════════════════════════
function PortalEarningsView({ myDeals, agentPackage, agentName }) {
  const isMobile = useIsMobile();
  const fmt = n => n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1e3?`$${(n/1e3).toFixed(1)}K`:`$${Math.round(n||0).toLocaleString()}`;
  const pkg = agentPackage;

  const dealEarnings = myDeals.map(d=>{
    const grossComm  = (d.price||0)*(d.commission_rate||0)/100;
    const agentPct   = pkg?.split_agent_pct||80;
    const agentGross = grossComm*agentPct/100;
    const txFee      = pkg?.flat_transaction_fee||0;
    const eoFee      = pkg?.e_and_o_fee||0;
    const royalty    = pkg?.royalty_fee_pct ? agentGross*pkg.royalty_fee_pct/100 : 0;
    const agentNet   = agentGross - txFee - eoFee - royalty;
    const totalFees  = txFee+eoFee+royalty;
    return {...d, grossComm, agentGross, agentNet, totalFees, agentPct};
  });

  const confirmed = dealEarnings.filter(d=>d.status==="Closed");
  const pipeline  = dealEarnings.filter(d=>!["Closed","Dead"].includes(d.status));
  const uc        = dealEarnings.filter(d=>d.status==="Under Contract");

  const confirmedNet = confirmed.reduce((s,d)=>s+d.agentNet,0);
  const pipelineNet  = pipeline.reduce((s,d)=>s+d.agentNet,0);
  const ucNet        = uc.reduce((s,d)=>s+d.agentNet,0);

  const STAGE_COLOR = {"New":C.text3,"Active":C.blue,"Under Contract":C.amber,"Closed":C.green,"On Hold":C.text3};

  return (
    <div style={{ padding:isMobile?"12px":"20px 24px" }}>
      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:18 }}>
        {[
          {l:"Confirmed Earned",  v:fmt(confirmedNet), c:C.green},
          {l:"Under Contract",   v:fmt(ucNet),         c:C.amber},
          {l:"Full Pipeline",    v:fmt(pipelineNet),   c:C.gold},
          {l:"Total Deals",      v:myDeals.length,     c:C.text2},
        ].map(s=>(
          <div key={s.l} style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"14px 14px" }}>
            <div style={{ fontSize:20, fontWeight:700, color:s.c, fontFamily:SERIF }}>{s.v}</div>
            <div style={{ fontSize:9, fontWeight:700, color:C.text2, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Package badge */}
      {pkg ? (
        <div style={{ marginBottom:12, padding:"9px 14px", background:C.goldDim,
          border:`1px solid ${C.goldBorder}`, borderRadius:9,
          fontSize:12, color:C.text2, fontFamily:FONT }}>
          Your package: <strong style={{color:C.gold}}>{pkg.package_name}</strong>
          {" · "}{pkg.split_agent_pct}% agent / {pkg.split_brokerage_pct}% brokerage
          {pkg.flat_transaction_fee>0?` · $${pkg.flat_transaction_fee} tx fee`:""}
          {pkg.e_and_o_fee>0?` · $${pkg.e_and_o_fee} E&O`:""}
        </div>
      ) : (
        <div style={{ marginBottom:12, padding:"9px 14px", background:"rgba(245,158,11,0.08)",
          border:`1px solid rgba(245,158,11,0.25)`, borderRadius:9,
          fontSize:12, color:C.amber, fontFamily:FONT }}>
          ⚠️ No package assigned yet. Projections use 80/20 default. Contact your broker.
        </div>
      )}

      {/* Deal list */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"11px 16px", borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
            textTransform:"uppercase", letterSpacing:"0.08em" }}>My Commission Pipeline</span>
        </div>
        {dealEarnings.length===0 ? (
          <div style={{ padding:"32px 16px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
            No deals in your pipeline yet
          </div>
        ) : dealEarnings.map(d=>{
          const sc = STAGE_COLOR[d.status]||C.text3;
          const isConf = d.status==="Closed";
          return (
            <div key={d.id} style={{ padding:"13px 16px", borderBottom:`1px solid ${C.border}`,
              borderLeft:`3px solid ${sc}` }}>
              <div style={{ display:"flex", alignItems:"flex-start",
                justifyContent:"space-between", gap:10 }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {d.address||"Untitled"}
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:3, flexWrap:"wrap", alignItems:"center" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:sc, fontFamily:FONT }}>
                      {d.status}
                    </span>
                    {d.agent_role&&<span style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{d.agent_role}</span>}
                    {d.close_date&&<span style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>
                      📅 {new Date(d.close_date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </span>}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:700, fontFamily:SERIF,
                    color:isConf?C.green:d.agentNet>0?C.text:C.text3 }}>
                    {d.agentNet>0?fmt(d.agentNet):"—"}
                  </div>
                  <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>
                    {isConf?"✓ Confirmed":"Projected"}
                  </div>
                </div>
              </div>
              {d.grossComm>0&&(
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:6 }}>
                  {[
                    {l:"GCI",      v:fmt(d.grossComm)},
                    {l:"Your cut", v:fmt(d.agentGross)},
                    d.totalFees>0&&{l:"Fees", v:`−${fmt(d.totalFees)}`},
                    d.price&&{l:"Sale price",v:`$${(d.price||0).toLocaleString()}`},
                  ].filter(Boolean).map(item=>(
                    <span key={item.l} style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>
                      {item.l}: <strong style={{color:C.text}}>{item.v}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function DealFinancialCalculator({ deal, linkedAgents, user, onClose, onSaved }) {
  const [agentIdx, setAgentIdx] = useState(0);
  const [salePrice, setSalePrice] = useState(String(deal.price||""));
  const [commRate,  setCommRate]  = useState(String(deal.commission_rate||"3"));
  const [pkg,       setPkg]       = useState(null);
  const [pkgLoading,setPkgLoading]= useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  const agent = linkedAgents[agentIdx]?.contacts;
  const role  = linkedAgents[agentIdx]?.role;
  const fmt   = n => n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1e3?`$${(n/1e3).toFixed(1)}K`:`$${(n||0).toFixed(0)}`;

  useEffect(()=>{
    if(!agent?.id) return;
    setPkgLoading(true);
    supabase.from("agent_fee_packages").select("*")
      .eq("contact_id", agent.id).eq("is_active", true).maybeSingle()
      .then(({data})=>{ setPkg(data||null); setPkgLoading(false); });
  },[agent?.id]);

  const price      = parseFloat(String(salePrice).replace(/[^0-9.]/g,""))||0;
  const rate       = parseFloat(commRate)||0;
  const grossComm  = price * rate / 100;
  const agentGross = pkg ? grossComm * (pkg.split_agent_pct||80)/100 : grossComm * 0.8;
  const royalty    = pkg?.royalty_fee_pct ? agentGross * pkg.royalty_fee_pct/100 : 0;
  const agentNet   = agentGross
    - (pkg?.flat_transaction_fee||0)
    - (pkg?.e_and_o_fee||0)
    - royalty;
  const brokerNet  = grossComm - agentNet;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("deal_financials").insert({
      org_id:      ORG_ID,
      deal_id:     deal.id,
      contact_id:  agent?.id || null,
      package_id:  pkg?.id   || null,
      sale_price:  price,
      commission_rate: rate,
      agent_split_pct: pkg?.split_agent_pct || 80,
      co_op_split_pct: pkg?.co_op_split_pct || null,
      agent_gross: agentGross,
      transaction_fee: pkg?.flat_transaction_fee||0,
      e_and_o_fee:     pkg?.e_and_o_fee||0,
      royalty_fee:     royalty,
      brokerage_net:   brokerNet,
      status:          "closed",
      close_date:      deal.close_date || new Date().toISOString().slice(0,10),
      created_by:      user?.email,
    });
    setSaving(false);
    if(!error){
      // Move to next agent or finish
      if(agentIdx < linkedAgents.length - 1) {
        setAgentIdx(i=>i+1);
        setToast({msg:"Saved — next agent",type:"success"});
      } else {
        onSaved();
      }
    } else {
      setToast({msg:"Error saving",type:"error"});
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:500,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
      <div style={{ background:C.surface, border:`1px solid ${C.goldBorder}`,
        borderRadius:16, padding:28, width:"100%", maxWidth:480,
        maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:SERIF, margin:0 }}>
              $ Record Financials
            </h2>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>
              {deal.address} · {linkedAgents.length > 1 ? `Agent ${agentIdx+1} of ${linkedAgents.length}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:C.text2, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>

        {/* Agent badge */}
        {agent && (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18,
            padding:"10px 14px", background:C.goldDim, border:`1px solid ${C.goldBorder}`,
            borderRadius:10 }}>
            <Avatar name={agent.full_name} email={agent.email} size={32} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>{agent.full_name}</div>
              <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                {role}
                {pkgLoading ? " · Loading package…" : pkg ? ` · ${pkg.package_name}` : " · ⚠️ No package set"}
              </div>
            </div>
          </div>
        )}

        {/* Inputs */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <Field label="Sale Price ($)" value={salePrice} onChange={setSalePrice} placeholder="500000" />
          <Field label="Commission %" value={commRate}   onChange={setCommRate}  placeholder="3.0" />
        </div>

        {/* Live calculation */}
        {price > 0 && rate > 0 && (
          <div style={{ background:C.surface2, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
              Breakdown
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {[
                {l:"Gross Commission",   v:grossComm,  c:C.text},
                {l:`Agent Gross (${pkg?.split_agent_pct||80}%)`, v:agentGross, c:C.text},
                pkg?.flat_transaction_fee > 0 && {l:"− Transaction Fee", v:-pkg.flat_transaction_fee, c:C.red},
                pkg?.e_and_o_fee > 0         && {l:"− E&O Fee",          v:-pkg.e_and_o_fee,         c:C.red},
                royalty > 0                  && {l:`− Royalty (${pkg?.royalty_fee_pct}%)`, v:-royalty, c:C.red},
              ].filter(Boolean).map((row,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between",
                  padding:"4px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{row.l}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:row.c, fontFamily:MONO }}>
                    {row.v >= 0 ? fmt(row.v) : `−${fmt(Math.abs(row.v))}`}
                  </span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0" }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT }}>Agent Net</span>
                <span style={{ fontSize:14, fontWeight:700, color:C.green, fontFamily:MONO }}>{fmt(agentNet)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
                <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>Brokerage Net</span>
                <span style={{ fontSize:13, fontWeight:700, color:C.gold, fontFamily:MONO }}>{fmt(brokerNet)}</span>
              </div>
            </div>
          </div>
        )}

        {!pkg && !pkgLoading && agent && (
          <div style={{ padding:"10px 14px", background:"rgba(245,158,11,0.08)",
            border:`1px solid rgba(245,158,11,0.25)`, borderRadius:8, marginBottom:14,
            fontSize:12, color:C.amber, fontFamily:FONT }}>
            ⚠️ {agent.full_name} has no package set. Go to Financials → Agent Packages to set one.
            Calculation uses 80/20 default.
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <GoldButton onClick={save} disabled={saving||!price||!rate}>
            {saving ? "Saving…" : agentIdx < linkedAgents.length-1 ? "Save & Next Agent" : "Save Financials"}
          </GoldButton>
          <GoldButton onClick={onClose} outline>Skip</GoldButton>
        </div>
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
  const [showFinancials, setShowFinancials] = useState(false);
  const [financialAgents, setFinancialAgents] = useState([]);
  const [addingContact,setAddingContact] = useState(false);
  const [contactToAdd,setContactToAdd]   = useState("");
  const [contactRole,setContactRole]     = useState("Client");
  const [savingContact,setSavingContact] = useState(false);
  const [addingTask,setAddingTask]       = useState(false);
  const [taskForm,setTaskForm]           = useState({title:"",priority:"normal",due_date:"",assigned_to:user?.email||""});
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
      content:actForm.content, created_by:creatorLabel(user),
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
    const num = (v) => { const n=parseFloat(String(v).replace(/[^0-9.]/g,"")); return isNaN(n)?null:n; };
    const int = (v) => { const n=parseInt(v); return isNaN(n)?null:n; };
    const str = (v) => v===""?null:v;
    const update = {
      address:       str(editForm.address),
      city:          str(editForm.city),
      state:         str(editForm.state),
      zip:           str(editForm.zip),
      status:        str(editForm.status),
      deal_type:     str(editForm.deal_type),
      mls_number:    str(editForm.mls_number),
      notes:         str(editForm.notes),
      close_date:    str(editForm.close_date),
      price:         num(editForm.price),
      commission_rate:num(editForm.commission_rate),
      bedrooms:      int(editForm.bedrooms),
      bathrooms:     num(editForm.bathrooms),
      sqft:          int(editForm.sqft),
      year_built:    int(editForm.year_built),
      updated_at:    new Date().toISOString(),
    };
    const { error } = await supabase.from("deals").update(update).eq("id",deal.id);
    setSavingEdit(false);
    if(!error){ setEditMode(false); onRefresh(); setToast({msg:"Deal updated ✓",type:"success"}); }
    else { console.error("Deal save error:", error); setToast({msg:`Error: ${error.message}`,type:"error"}); }
  };

  const updateStatus = async (newStatus) => {
    await supabase.from("deals").update({status:newStatus,updated_at:new Date().toISOString()}).eq("id",deal.id);
    await supabase.from("deal_activities").insert({
      deal_id:deal.id, activity_type:"status_change",
      content:`Status changed to ${newStatus}`, created_by:creatorLabel(user),
    });
    onRefresh();
    setToast({msg:`Status → ${newStatus}`,type:"success"});
    await reloadDetail();
    // Trigger financial calculator when deal closes
    if(newStatus === "Closed") {
      const { data: linked } = await supabase.from("deal_contacts")
        .select("*, contacts(id,full_name,email)")
        .eq("deal_id", deal.id);
      if(linked && linked.length > 0) {
        setFinancialAgents(linked);
        setShowFinancials(true);
      }
    }
  };

  const ACT_ICON = {note:"📝",call:"📞",email:"📧",showing:"🏠",offer:"📄",status_change:"🔄"};
  const fmtDate = iso => {
    if(!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" · "+d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  };

  const TABS = [
    {id:"overview",   label:"Overview"},
    {id:"financials", label:"Financials"},
    {id:"people",     label:`People${dealContacts.length>0?" ("+dealContacts.length+")":""}`},
    {id:"activity",   label:`Activity${activities.length>0?" ("+activities.length+")":""}`},
    {id:"tasks",      label:`Tasks${dealTasks.length>0?" ("+dealTasks.length+")":""}`},
    {id:"documents",  label:`Documents${documents.length>0?" ("+documents.length+")":""}`},
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:300,
      display:"flex", justifyContent:"flex-end" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      <div style={{ width:"min(580px,100vw)", background:C.bg, height:"100vh",
        display:"flex", flexDirection:"column", borderLeft:`1px solid ${C.border}`,
        animation:"slideIn 0.2s ease", overflowY:"hidden" }}>
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

              {/* Record financials shortcut when closed */}
              {deal.status === "Closed" && (
                <div style={{ marginTop:12 }}>
                  <GoldButton small onClick={async()=>{
                    const { data:linked } = await supabase.from("deal_contacts")
                      .select("*, contacts(id,full_name,email)").eq("deal_id",deal.id);
                    setFinancialAgents(linked||[]);
                    setShowFinancials(true);
                  }}>
                    $ Record Financials
                  </GoldButton>
                </div>
              )}
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
                          role:contactRole, org_id:ORG_ID, added_by:creatorLabel(user),
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
                      await supabase.from("tasks").update(t.status==="done"?{status:"todo",completed_at:null}:{status:"done",progress:100,completed_at:new Date().toISOString()}).eq("id",t.id);
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
                        background:{urgent:C.red,high:C.amber,normal:C.blue,low:C.text3}[t.priority]||C.text3 }} />
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
                        options={[{value:"low",label:"Low"},{value:"normal",label:"Normal"},{value:"high",label:"High"},{value:"urgent",label:"Urgent"}]} />
                      <Field label="Due date" value={taskForm.due_date} onChange={v=>setTF("due_date",v)} type="date" />
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <GoldButton small disabled={!taskForm.title.trim()||savingTask} onClick={async()=>{
                        setSavingTask(true);
                        await supabase.from("tasks").insert({
                          ...taskForm, org_id:ORG_ID, deal_id:deal.id,
                          status:"todo", created_by:creatorLabel(user),
                        });
                        setSavingTask(false);
                        setAddingTask(false);
                        setTaskForm({title:"",priority:"normal",due_date:"",assigned_to:user?.email||""});
                        await reloadDetail();
                        setToast({msg:"Task added",type:"success"});
                      }}>{savingTask?"Adding…":"Add task"}</GoldButton>
                      <GoldButton small outline onClick={()=>setAddingTask(false)}>Cancel</GoldButton>
                    </div>
                  </div>
                </div>
              )}
            </div>

          ) : tab==="financials" ? (
            <DealFinancialsTab
              deal={deal}
              dealContacts={dealContacts}
              user={user}
              onRecorded={onRefresh}
            />
          ) : (
            /* Documents tab */
            <div>
              <div style={{ textAlign:"center", padding:"40px 0", color:C.text3, fontSize:13, fontFamily:FONT }}>
                <div style={{ fontSize:28, marginBottom:10 }}>📁</div>
                Document uploads coming in a future phase.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial calculator modal */}
      {showFinancials && (
        <DealFinancialCalculator
          deal={deal}
          linkedAgents={financialAgents}
          user={user}
          onClose={()=>setShowFinancials(false)}
          onSaved={()=>{
            setShowFinancials(false);
            setToast({msg:"Financials recorded",type:"success"});
            onRefresh();
          }}
        />
      )}

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


function DealsTable({ deals, allDeals, onSelect, fmt }) {
  const isMobile = useIsMobile();
  if(deals.length===0) return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
      padding:"48px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
      {allDeals.length===0?"No deals yet — add your first one":"No results match your filter"}
    </div>
  );
  if(isMobile) return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {deals.map(d=>(
        <div key={d.id} onClick={()=>onSelect(d)}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
            padding:"14px 16px", cursor:"pointer", active:"none" }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT,
                marginBottom:3 }}>{d.address||"Untitled"}</div>
              <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>
                {[d.city,d.state].filter(Boolean).join(", ")}
                {d.mls_number?` · ${d.mls_number}`:""}
              </div>
            </div>
            <StatusBadge status={d.status} />
          </div>
          <div style={{ display:"flex", gap:12, marginTop:10, alignItems:"center" }}>
            <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{d.deal_type||"—"}</span>
            {d.price&&<span style={{ fontSize:13, fontWeight:700, color:C.gold,
              fontFamily:MONO, marginLeft:"auto" }}>{fmt(d.price)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",
        padding:"9px 18px", borderBottom:`1px solid ${C.border}` }}>
        {["Address","Type","Status","Price","MLS #"].map(h=>(
          <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3,
            fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
        ))}
      </div>
      {deals.map(d=>(
        <div key={d.id} onClick={()=>onSelect(d)}
          style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",
            padding:"13px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center", cursor:"pointer" }}
          onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{d.address||"—"}</div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{[d.city,d.state].filter(Boolean).join(", ")}</div>
          </div>
          <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{d.deal_type||"—"}</span>
          <StatusBadge status={d.status} />
          <span style={{ fontSize:12, fontWeight:600, color:C.gold, fontFamily:MONO }}>{d.price?fmt(d.price):"—"}</span>
          <span style={{ fontSize:12, color:C.text3, fontFamily:MONO }}>{d.mls_number||"—"}</span>
        </div>
      ))}
    </div>
  );
}

function DealsView({ user, deals, onRefresh }) {
  const isMobile = useIsMobile();
  const [rows,setRows]     = useState([]);
  const [agents,setAgents] = useState([]);
  const [myCid,setMyCid]   = useState(null);
  const [loading,setLoading] = useState(true);
  const [agentSel,setAgentSel] = useState("all");
  const [typeSel,setTypeSel]   = useState("all");
  const [yearSel,setYearSel]   = useState("all");
  const [search,setSearch]     = useState("");
  const [showAdd,setShowAdd]   = useState(false);
  const [saving,setSaving]     = useState(false);
  const [toast,setToast]       = useState(null);
  const [sel,setSel]           = useState(null);
  const [form,setForm]         = useState({address:"",city:"",state:"FL",zip:"",price:"",
    status:"New",deal_type:"Listing",mls_number:"",notes:""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const fmt = n=>{ n=Number(n||0); return n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${Math.round(n)}`; };

  const load = async () => {
    const { data:ag } = await supabase.from("contacts")
      .select("id,full_name").eq("org_id",ORG_ID).eq("contact_type","Agent").order("full_name");
    setAgents(ag||[]);
    const me = (ag||[]).find(a=>false); // placeholder
    const { data:meRow } = await supabase.from("contacts").select("id").eq("org_id",ORG_ID).ilike("email", user?.email||"").maybeSingle();
    setMyCid(meRow?.id||null);
    // closings (paged past 1000 cap)
    let txns=[], from=0;
    while(true){
      const { data,error } = await supabase.from("transactions")
        .select("id,address,transaction_type,status,close_price,gross_commission,tax_year,agent_contact_id,is_referral,is_fee_only")
        .eq("org_id",ORG_ID).order("tax_year",{ascending:false}).range(from,from+999);
      if(error||!data||data.length===0) break;
      txns=txns.concat(data); from+=1000; if(data.length<1000) break;
    }
    // active pipeline deals
    const { data:dl } = await supabase.from("deals")
      .select("id,address,city,price,status,deal_type,agent_contact_id").eq("org_id",ORG_ID);
    const active = (dl||[]).map(d=>({ key:"d"+d.id, address:[d.address,d.city].filter(Boolean).join(", "),
      agent_contact_id:d.agent_contact_id, type:d.deal_type||"Listing", year:null,
      price:Number(d.price||0), gci:null, status:d.status||"Active", active:true }));
    const closed = txns.map(t=>({ key:"t"+t.id, address:t.address, agent_contact_id:t.agent_contact_id,
      type:t.transaction_type, year:t.tax_year, price:Number(t.close_price||0), gci:Number(t.gross_commission||0),
      status:t.status, active:false, ref:t.is_referral, fee:t.is_fee_only }));
    setRows([...active, ...closed]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const nameOf = {}; agents.forEach(a=>{ nameOf[a.id]=a.full_name; });
  const years = Array.from(new Set(rows.map(r=>r.year).filter(Boolean))).sort((a,b)=>b-a);
  const types = ["Sale","Rental","Lease","Commercial","Referral","Listing"];

  const filtered = rows.filter(r=>{
    if(agentSel!=="all" && r.agent_contact_id!==agentSel) return false;
    if(typeSel!=="all" && (r.type||"")!==typeSel) return false;
    if(yearSel!=="all" && String(r.year)!==yearSel) return false;
    if(search){ const ql=search.toLowerCase();
      if(!`${r.address||""} ${nameOf[r.agent_contact_id]||""}`.toLowerCase().includes(ql)) return false; }
    return true;
  });
  const closings = filtered.filter(r=>!r.active && !r.fee);
  const sumVol = closings.reduce((s,r)=>s+r.price,0);
  const sumGci = closings.reduce((s,r)=>s+r.gci,0);
  const shown = filtered.slice(0,500);

  const handleAdd = async () => {
    if(!form.address.trim()) return; setSaving(true);
    const { error } = await supabase.from("deals").insert({ ...form,
      price:form.price?parseFloat(form.price.replace(/[^0-9.]/g,"")):null,
      org_id:ORG_ID, created_by:creatorLabel(user), agent_contact_id:myCid });
    setSaving(false);
    if(!error){ setShowAdd(false); setForm({address:"",city:"",state:"FL",zip:"",price:"",status:"New",deal_type:"Listing",mls_number:"",notes:""}); onRefresh&&onRefresh(); load(); setToast({msg:"Deal added — assigned to you",type:"success"}); }
    else setToast({msg:"Error saving deal",type:"error"});
  };

  const selStyle = { padding:"7px 10px", background:C.surface2, border:`1px solid ${C.border2}`,
    borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none" };

  return (
    <div style={{ padding:"20px clamp(14px,3vw,24px)" }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search address or agent…"
          style={{ ...selStyle, width:220 }} />
        <select value={agentSel} onChange={e=>setAgentSel(e.target.value)} style={selStyle}>
          <option value="all">All agents ({agents.length})</option>
          {agents.map(a=><option key={a.id} value={a.id}>{a.full_name}</option>)}
        </select>
        <select value={typeSel} onChange={e=>setTypeSel(e.target.value)} style={selStyle}>
          <option value="all">All types</option>{types.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={yearSel} onChange={e=>setYearSel(e.target.value)} style={selStyle}>
          <option value="all">All years</option>{years.map(y=><option key={y} value={String(y)}>{y}</option>)}
        </select>
        <div style={{ marginLeft:"auto" }}><GoldButton onClick={()=>setShowAdd(true)} small>+ Add Deal</GoldButton></div>
      </div>

      <div style={{ display:"flex", gap:18, flexWrap:"wrap", marginBottom:12, fontFamily:FONT }}>
        <span style={{ fontSize:12, color:C.text2 }}><b style={{color:C.text,fontFamily:MONO}}>{filtered.length.toLocaleString()}</b> deals</span>
        <span style={{ fontSize:12, color:C.text2 }}>Volume <b style={{color:C.text,fontFamily:MONO}}>{fmt(sumVol)}</b></span>
        <span style={{ fontSize:12, color:C.text2 }}>GCI <b style={{color:C.gold,fontFamily:MONO}}>{fmt(sumGci)}</b></span>
      </div>

      {isMobile ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {loading
            ? <div style={{ padding:"40px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>Loading deals…</div>
            : shown.length===0
              ? <div style={{ padding:"40px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>No deals match your filter</div>
              : shown.map(r=>(
                <div key={r.key} onClick={()=>setSel(r)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px 15px", cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT, minWidth:0 }}>{r.address||"\u2014"}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.gold, fontFamily:MONO, whiteSpace:"nowrap" }}>{r.price?fmt(r.price):"\u2014"}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:5, flexWrap:"wrap" }}>
                    {r.active && <span style={{ fontSize:9, fontWeight:700, color:C.blue, background:"rgba(59,130,246,0.12)", borderRadius:10, padding:"2px 7px" }}>ACTIVE</span>}
                    {r.ref && <span style={{ fontSize:9, fontWeight:700, color:C.blue, border:`1px solid ${C.border2}`, borderRadius:10, padding:"2px 7px" }}>REFERRAL</span>}
                    {r.fee && <span style={{ fontSize:9, fontWeight:700, color:C.text3, border:`1px solid ${C.border2}`, borderRadius:10, padding:"2px 7px" }}>FEE</span>}
                    <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{nameOf[r.agent_contact_id]||"\u2014"}</span>
                    <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{[r.type, r.year].filter(Boolean).join(" \u00b7 ")}</span>
                    {r.gci ? <span style={{ fontSize:11, color:C.gold, fontFamily:MONO, marginLeft:"auto" }}>GCI {fmt(r.gci)}</span> : null}
                  </div>
                </div>
              ))
          }
          {filtered.length>500 && <div style={{ padding:"10px", color:C.text3, fontSize:12, fontFamily:FONT, textAlign:"center" }}>Showing first 500 of {filtered.length.toLocaleString()} — narrow with a filter.</div>}
        </div>
      ) : (
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1.3fr 0.8fr 0.5fr 1fr 1fr", padding:"9px 18px", borderBottom:`1px solid ${C.border}` }}>
          {["Address","Agent","Type","Year","Price","GCI"].map(h=>(
            <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
          ))}
        </div>
        {loading
          ? <div style={{ padding:"48px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>Loading deals…</div>
          : shown.length===0
            ? <div style={{ padding:"48px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>No deals match your filter</div>
            : shown.map(r=>(
              <div key={r.key} onClick={()=>setSel(r)} style={{ display:"grid", gridTemplateColumns:"2fr 1.3fr 0.8fr 0.5fr 1fr 1fr",
                padding:"12px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center", cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {r.address||"\u2014"}
                  {r.active?<span style={{color:C.blue,fontSize:10,marginLeft:6,fontWeight:700}}>\u25cf ACTIVE</span>:null}
                  {r.ref?<span style={{color:C.blue,fontSize:10,marginLeft:6}}>REF</span>:null}
                  {r.fee?<span style={{color:C.text3,fontSize:10,marginLeft:6}}>FEE</span>:null}
                </div>
                <span style={{ fontSize:12.5, color:C.text2, fontFamily:FONT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{nameOf[r.agent_contact_id]||"\u2014"}</span>
                <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{r.type||"\u2014"}</span>
                <span style={{ fontSize:12, color:C.text3, fontFamily:MONO }}>{r.year||"\u2014"}</span>
                <span style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:MONO }}>{r.price?fmt(r.price):"\u2014"}</span>
                <span style={{ fontSize:12, fontWeight:600, color:C.gold, fontFamily:MONO }}>{r.gci?fmt(r.gci):"\u2014"}</span>
              </div>
            ))
        }
        {filtered.length>500 && <div style={{ padding:"12px 18px", color:C.text3, fontSize:12, fontFamily:FONT, textAlign:"center" }}>Showing first 500 of {filtered.length.toLocaleString()} — narrow with a filter.</div>}
      </div>
      )}

      {sel&&(
        <Modal title={sel.active?"Active Listing":"Deal"} onClose={()=>setSel(null)} maxWidth={500}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:SERIF }}>{sel.address||"\u2014"}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {sel.active&&<span style={{fontSize:10,fontWeight:700,color:C.blue,border:`1px solid ${C.blue}`,borderRadius:6,padding:"2px 7px"}}>● ACTIVE</span>}
              {sel.ref&&<span style={{fontSize:10,color:C.blue,border:`1px solid ${C.border2}`,borderRadius:6,padding:"2px 7px"}}>REFERRAL</span>}
              {sel.fee&&<span style={{fontSize:10,color:C.text3,border:`1px solid ${C.border2}`,borderRadius:6,padding:"2px 7px"}}>FEE</span>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:4 }}>
              {[["Agent",nameOf[sel.agent_contact_id]||"\u2014"],["Type",sel.type||"\u2014"],["Year",sel.year||"\u2014"],["Price",sel.price?fmt(sel.price):"\u2014"],["GCI",sel.gci?fmt(sel.gci):"\u2014"],["Status",sel.active?"Active pipeline":"Closed"]].map(([k,v])=>(
                <div key={k} style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 11px" }}>
                  <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.06em" }}>{k}</div>
                  <div style={{ fontSize:13.5, color:C.text, fontFamily:k==="Agent"||k==="Type"||k==="Status"?FONT:MONO, marginTop:3 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:MONO, marginTop:2 }}>{sel.active?"Pipeline listing":"Source: GOLD ledger"}{sel.gold_txn_id?` \u00b7 ${sel.gold_txn_id}`:""}</div>
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton outline onClick={()=>setSel(null)}>Close</GoldButton>
            </div>
          </div>
        </Modal>
      )}

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
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={handleAdd} disabled={saving||!form.address.trim()}>{saving?"Saving…":"Add Deal"}</GoldButton>
              <GoldButton onClick={()=>setShowAdd(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}



// ════════════════════════════════════════════════════════════
// AGENT PORTAL — Full experience (Phase 1+2)
// ════════════════════════════════════════════════════════════

const PORTAL_NAV = [
  { id:"portal_dashboard", label:"Dashboard",  icon:"🏠" },
  { id:"portal_pipeline",  label:"Pipeline",   icon:"🏘️" },
  { id:"portal_contacts",  label:"Contacts",   icon:"👤" },
  { id:"portal_tasks",     label:"Tasks",      icon:"✅" },
  { id:"portal_team",      label:"Team",       icon:"👥" },
  { id:"portal_calendar",  label:"Calendar",   icon:"📅" },
  { id:"portal_earnings",  label:"My Earnings", icon:"💰" },
  { id:"portal_chat",      label:"Chat · Ari", icon:"✨" },
];

function PortalChatPanel({
  chatMsgs, setChatMsgs, chatInput, setChatInput,
  chatSending, setChSend, chatConvId, setChatConvId,
  chatBottomRef, agentName, agentEmail, agentContact,
  myDeals, myTasks
}) {

    // scroll on new messages
    useEffect(()=>{ chatBottomRef.current?.scrollIntoView({behavior:"smooth"}); },[chatMsgs]);

    const buildAgentContext = () => {
      const dealLines = myDeals.map(d=>
        `${d.address||"Untitled"} (${d.agent_role}, ${d.status}${d.price?`, $${d.price}`:""})`
      ).join("; ");
      const taskLines = myTasks.filter(t=>t.status!=="done").map(t=>t.title).join("; ");
      return `\nAGENT CONTEXT:\nAgent: ${agentName} (${agentEmail})\nPipeline (${myDeals.length} deals): ${dealLines||"none"}\nOpen tasks: ${taskLines||"none"}\nDate: ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}`;
    };

    const sendChat = async () => {
      if(!chatInput.trim()||chatSending) return;
      const userMsg = {role:"user",content:chatInput.trim(),ts:new Date().toISOString()};
      const newMsgs = [...chatMsgs, userMsg];
      setChatMsgs(newMsgs);
      setChatInput("");
      setChSend(true);
      try {
        const apiMsgs = newMsgs.map(m=>({role:m.role==="user"?"user":"assistant",content:m.content}));
        if(apiMsgs.length===1) apiMsgs[0].content += buildAgentContext();

        const { data:{ session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ari-chat`,{
          method:"POST",
          headers:{ "Content-Type":"application/json", "apikey":process.env.REACT_APP_SUPABASE_ANON_KEY, "Authorization":`Bearer ${session?.access_token}` },
          body:JSON.stringify({
            model:"claude-haiku-4-5-20251001",
            max_tokens:1200,
            endpoint:"ari_portal",
            user_email:agentEmail,
            system:`You are Ari, the AI assistant for ${agentName} at Realty One Group Advantage. You are their personal brokerage AI coach and resource. Help with: pipeline questions, drafting emails and offers, real estate advice, showing prep, goal tracking, and client communication. Their broker team: Dara Khoyi (Broker, khoyi1234@gmail.com), Alex Khoi (Broker, alex@brokeralex.com), Josh Maples (Front Desk, roga.lutz@gmail.com), Javier Suarez (Operations, javier@thesuarezcapital.com). Be encouraging, practical, and direct. Keep responses concise. If they need broker support, point them to Dara or Alex. You do not have access to the brokerage's company financials (company revenue, expenses, P&L, payroll, cash, or other agents' numbers); if asked, explain that's handled by the ownership team and that you can only see their own pipeline and earnings.`,
            messages:apiMsgs,
          }),
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || "Something went wrong — try again.";
        const ariMsg = {role:"assistant",content:text,ts:new Date().toISOString()};
        const final = [...newMsgs, ariMsg];
        setChatMsgs(final);

        if(chatConvId){
          await supabase.from("robot_conversations")
            .update({messages:final,updated_at:new Date().toISOString()})
            .eq("id",chatConvId);
        } else {
          const {data:conv} = await supabase.from("robot_conversations").insert({
            robot_id:ARI_ID, org_id:ORG_ID,
            user_email:agentEmail, contact_id:agentContact?.id,
            messages:final,
          }).select().single();
          if(conv) setChatConvId(conv.id);
        }
      } catch(e) {
        setChatMsgs(m=>[...m,{role:"assistant",content:"Connection error — please try again.",ts:new Date().toISOString()}]);
      } finally { setChSend(false); }
    };

    const PROMPTS = [
      "What's in my pipeline right now?",
      "Help me draft a follow-up email to a buyer",
      "What should I focus on this week?",
      "How do I prep for a listing presentation?",
      "Who should I contact for broker support?",
    ];

    const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) : "";

    return (
      <div style={{ display:"flex", height:"calc(100vh - 56px)", overflow:"hidden" }}>
        {/* Ari sidebar */}
        <div style={{ width:220, background:C.surface, borderRight:`1px solid ${C.border}`,
          display:"flex", flexDirection:"column", padding:"20px 16px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
              background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>✦</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF }}>Ari</div>
              <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>Your AI assistant</div>
            </div>
          </div>

          <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, lineHeight:1.65, marginBottom:16 }}>
            Ask me anything — pipeline help, drafting emails, real estate questions, or what to focus on today.
          </div>

          <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
            textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Try asking</div>
          {PROMPTS.map(q=>(
            <button key={q} onClick={()=>setChatInput(q)} style={{
              display:"block", width:"100%", textAlign:"left",
              padding:"7px 0", background:"none", border:"none",
              borderBottom:`1px solid ${C.border}`, color:C.text2,
              fontSize:11, fontFamily:FONT, cursor:"pointer", transition:"color 0.1s",
              lineHeight:1.4 }}
              onMouseEnter={e=>e.currentTarget.style.color=C.gold}
              onMouseLeave={e=>e.currentTarget.style.color=C.text2}>
              {q}
            </button>
          ))}

          <div style={{ marginTop:"auto", paddingTop:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:chatMsgs.length>0?8:0 }}>
              <div style={{ width:7, height:7, borderRadius:"50%",
                background:chatSending?C.amber:C.green,
                animation:chatSending?"ariPulse 1s infinite":"none" }} />
              <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                {chatSending?"Thinking…":"Ready"}
              </span>
            </div>
            {chatMsgs.length>0&&(
              <button onClick={async()=>{
                if(chatConvId) await supabase.from("robot_conversations")
                  .update({messages:[],updated_at:new Date().toISOString()}).eq("id",chatConvId);
                setChatMsgs([]);
              }} style={{ background:"none", border:`1px solid ${C.border}`,
                borderRadius:6, color:C.text3, fontSize:11, fontFamily:FONT,
                cursor:"pointer", padding:"6px 12px", width:"100%", transition:"color 0.1s" }}
                onMouseEnter={e=>e.currentTarget.style.color=C.red}
                onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
                Clear chat
              </button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
          <div style={{ flex:1, overflowY:"auto", padding:"20px 24px",
            display:"flex", flexDirection:"column", gap:14 }}>
            {chatMsgs.length===0&&(
              <div style={{ flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:10, opacity:0.4 }}>
                <div style={{ fontSize:36 }}>✦</div>
                <div style={{ fontSize:13, color:C.text3, fontFamily:FONT }}>
                  Hey {agentName.split(" ")[0]} — what can I help with?
                </div>
              </div>
            )}
            {chatMsgs.map((m,i)=>(
              <div key={i} style={{ display:"flex", gap:10,
                flexDirection:m.role==="user"?"row-reverse":"row", alignItems:"flex-start" }}>
                {m.role==="assistant"
                  ? <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
                      background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✦</div>
                  : <Avatar name={agentName} email={agentEmail} size={30} />
                }
                <div style={{ maxWidth:"74%", minWidth:0 }}>
                  <div style={{
                    padding:"11px 15px", borderRadius:12,
                    background:m.role==="user"?C.goldDim:C.surface,
                    border:`1px solid ${m.role==="user"?C.goldBorder:C.border}`,
                    color:C.text, fontSize:13, fontFamily:FONT,
                    lineHeight:1.65, whiteSpace:"pre-wrap", wordBreak:"break-word",
                  }}>{m.content}</div>
                  <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginTop:3,
                    textAlign:m.role==="user"?"right":"left" }}>{fmtTime(m.ts)}</div>
                </div>
              </div>
            ))}
            {chatSending&&(
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
                  background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✦</div>
                <div style={{ padding:"11px 15px", borderRadius:12,
                  background:C.surface, border:`1px solid ${C.border}`,
                  display:"flex", gap:5, alignItems:"center" }}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{ width:6,height:6,borderRadius:"50%",
                      background:C.gold,opacity:0.7,
                      animation:`ariDot 1s ${i*0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, background:C.surface }}>
            <div style={{ display:"flex", gap:10 }}>
              <textarea value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
                placeholder="Ask Ari anything… (Enter to send)"
                rows={2}
                style={{ flex:1, padding:"10px 13px", background:C.surface2,
                  border:`1.5px solid ${C.border2}`, borderRadius:9,
                  color:C.text, fontSize:13, fontFamily:FONT, outline:"none",
                  resize:"none", lineHeight:1.5, transition:"border-color 0.15s",
                  boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor=C.gold}
                onBlur={e=>e.target.style.borderColor=C.border2} />
              <button onClick={sendChat} disabled={chatSending||!chatInput.trim()} style={{
                padding:"0 18px", borderRadius:9, border:"none", flexShrink:0,
                background:chatSending||!chatInput.trim()?C.surface3:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
                color:chatSending||!chatInput.trim()?C.text3:"#0a0a0a",
                fontSize:13, fontWeight:700, fontFamily:FONT,
                cursor:chatSending||!chatInput.trim()?"not-allowed":"pointer" }}>
                {chatSending?"…":"Send"}
              </button>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes ariPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.5)}}
          @keyframes ariDot{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        `}</style>
      </div>
    );
}

function PortalDealModal({ deal, agentContact, myContacts, onClose, onSaved, onContactsChanged }) {
  const isEdit = !!deal;
  const isMobile = useIsMobile();
  const agentEmail = agentContact?.email || "";
  const [tab,setTab] = useState("overview");
  const [f, setF] = useState({
    address: deal?.address||"", city: deal?.city||"", state: deal?.state||"", zip: deal?.zip||"",
    price: deal?.price!=null?String(deal.price):"", status: deal?.status||"Active",
    deal_type: deal?.deal_type||"Listing", property_type: deal?.property_type||"Single Family",
    bedrooms: deal?.bedrooms!=null?String(deal.bedrooms):"", bathrooms: deal?.bathrooms!=null?String(deal.bathrooms):"",
    sqft: deal?.sqft!=null?String(deal.sqft):"", year_built: deal?.year_built!=null?String(deal.year_built):"",
    mls_number: deal?.mls_number||"", commission_rate: deal?.commission_rate!=null?String(deal.commission_rate):"",
    close_date: deal?.close_date||"", notes: deal?.notes||"",
  });
  const set = (k)=>(v)=>setF(p=>({...p,[k]:v}));
  const [links,setLinks] = useState([]);
  const [cq,setCq] = useState(""); const [pickRole,setPickRole] = useState("Buyer");
  const [showNew,setShowNew] = useState(false); const [nc,setNc] = useState({full_name:"",email:"",phone:""});
  const [saving,setSaving] = useState(false); const [err,setErr] = useState("");
  const c2 = { display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12 };
  const c3 = { display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"2fr 1fr 1fr", gap:12 };
  const c4 = { display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr", gap:12 };

  useEffect(()=>{
    if(!isEdit) return;
    supabase.from("deal_contacts").select("id, role, contact_id, contacts(id,full_name,email,phone)")
      .eq("deal_id", deal.id)
      .then(({data})=>setLinks((data||[]).map(r=>({id:r.id, role:r.role, contact:r.contacts||{id:r.contact_id, full_name:"Contact"}}))));
  }, []); // eslint-disable-line

  const matches = cq.trim()
    ? myContacts.filter(c=>!links.some(l=>l.contact?.id===c.id) && `${c.full_name||""} ${c.email||""} ${c.phone||""}`.toLowerCase().includes(cq.toLowerCase())).slice(0,6)
    : [];

  const addLink = async (contact, role) => {
    if(links.some(l=>l.contact?.id===contact.id)) { setCq(""); return; }
    if(isEdit){
      const { data } = await supabase.from("deal_contacts").insert({deal_id:deal.id, contact_id:contact.id, role, org_id:ORG_ID, added_by:agentEmail}).select().single();
      setLinks(p=>[...p,{id:data?.id, role, contact}]);
    } else {
      setLinks(p=>[...p,{id:null, role, contact}]);
    }
    setCq("");
  };
  const removeLink = async (l) => {
    if(l.id) await supabase.from("deal_contacts").delete().eq("id", l.id);
    setLinks(p=>p.filter(x=>x!==l));
  };
  const createContact = async () => {
    if(!nc.full_name.trim()){ setErr("Contact needs a name"); return; }
    setSaving(true); setErr("");
    const { data, error } = await supabase.from("contacts").insert({
      org_id:ORG_ID, full_name:nc.full_name.trim(), email:nc.email.trim()||null, phone:nc.phone.trim()||null,
      contact_type:"Client", status:"Active", pipeline_stage:"New", created_by:agentEmail, assigned_to:agentEmail, source:"Agent Portal"
    }).select().single();
    setSaving(false);
    if(error){ setErr(error.message); return; }
    setShowNew(false); setNc({full_name:"",email:"",phone:""});
    onContactsChanged && onContactsChanged();
    addLink(data, pickRole);
  };
  const save = async () => {
    if(!f.address.trim()){ setTab("overview"); setErr("Property address is required"); return; }
    setSaving(true); setErr("");
    const payload = {
      address:f.address.trim(), city:f.city.trim()||null, state:f.state.trim()||null, zip:f.zip.trim()||null,
      price:f.price?Number(f.price):null, status:f.status, deal_type:f.deal_type, property_type:f.property_type,
      bedrooms:f.bedrooms?parseInt(f.bedrooms):null, bathrooms:f.bathrooms?Number(f.bathrooms):null,
      sqft:f.sqft?parseInt(f.sqft):null, year_built:f.year_built?parseInt(f.year_built):null,
      mls_number:f.mls_number.trim()||null, commission_rate:f.commission_rate?Number(f.commission_rate):null,
      close_date:f.close_date||null, notes:f.notes.trim()||null, updated_at:new Date().toISOString(),
    };
    let dealId = deal?.id;
    if(isEdit){
      const { error } = await supabase.from("deals").update(payload).eq("id", deal.id);
      if(error){ setSaving(false); setErr(error.message); return; }
    } else {
      const { data, error } = await supabase.from("deals").insert({...payload, org_id:ORG_ID, agent_contact_id:agentContact.id, created_by:agentEmail}).select().single();
      if(error){ setSaving(false); setErr(error.message); return; }
      dealId = data.id;
      const pending = links.filter(l=>!l.id);
      if(pending.length) await supabase.from("deal_contacts").insert(pending.map(l=>({deal_id:dealId, contact_id:l.contact.id, role:l.role, org_id:ORG_ID, added_by:agentEmail})));
    }
    setSaving(false);
    onSaved && onSaved();
  };

  const TabBtn = ({id,label}) => (
    <button onClick={()=>setTab(id)} style={{ flex:isMobile?1:"none", background:tab===id?C.goldDim:"transparent",
      color:tab===id?C.gold:C.text2, border:"none", borderBottom:`2px solid ${tab===id?C.gold:"transparent"}`,
      padding:"9px 16px", fontSize:13, fontWeight:600, fontFamily:FONT, cursor:"pointer" }}>{label}</button>
  );

  return (
    <Modal title={isEdit?(f.address||"Property"):"Add Deal"} onClose={onClose} maxWidth={580}>
      <div style={{ display:"flex", gap:4, borderBottom:`1px solid ${C.border}`, marginBottom:16, marginTop:-6 }}>
        <TabBtn id="overview" label="Overview" />
        <TabBtn id="people" label={`People${links.length?` (${links.length})`:""}`} />
        <TabBtn id="notes" label="Notes" />
      </div>

      {tab==="overview" && (
        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          <Field label="Property Address" value={f.address} onChange={set("address")} placeholder="123 Main St" autoFocus required />
          <div style={c3}>
            <Field label="City" value={f.city} onChange={set("city")} placeholder="Tampa" />
            <Field label="State" value={f.state} onChange={set("state")} placeholder="FL" />
            <Field label="Zip" value={f.zip} onChange={set("zip")} placeholder="33611" />
          </div>
          <div style={c2}>
            <Sel label="Status" value={f.status} onChange={set("status")} options={["New","Active","Under Contract","Pending","Closed","Dead"]} />
            <Sel label="Type" value={f.deal_type} onChange={set("deal_type")} options={["Listing","Buyer","Lease","Referral"]} />
          </div>
          <div style={c2}>
            <Field label="Price" type="number" value={f.price} onChange={set("price")} placeholder="350000" />
            <Field label="Commission %" type="number" value={f.commission_rate} onChange={set("commission_rate")} placeholder="3" />
          </div>
          <div style={c4}>
            <Field label="Beds" type="number" value={f.bedrooms} onChange={set("bedrooms")} />
            <Field label="Baths" type="number" value={f.bathrooms} onChange={set("bathrooms")} />
            <Field label="Sqft" type="number" value={f.sqft} onChange={set("sqft")} />
            <Field label="Built" type="number" value={f.year_built} onChange={set("year_built")} />
          </div>
          <div style={c2}>
            <Sel label="Property Type" value={f.property_type} onChange={set("property_type")} options={["Single Family","Condo","Townhouse","Multi-Family","Land","Commercial"]} />
            <Field label="MLS #" value={f.mls_number} onChange={set("mls_number")} placeholder="T1234567" />
          </div>
          <Field label="Close Date" type="date" value={f.close_date} onChange={set("close_date")} />
        </div>
      )}

      {tab==="people" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {links.length>0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {links.map((l,idx)=>(
                <div key={l.id||idx} style={{ display:"flex", alignItems:"center", gap:10, background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, padding:"8px 12px" }}>
                  <Avatar name={l.contact?.full_name} email={l.contact?.email} size={28} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{l.contact?.full_name}</div>
                    <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{l.contact?.email||l.contact?.phone||""}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, color:C.gold, fontFamily:FONT, background:C.goldDim, borderRadius:5, padding:"3px 9px" }}>{l.role}</span>
                  <button onClick={()=>removeLink(l)} style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
                </div>
              ))}
            </div>
          )}
          {showNew ? (
            <div style={{ display:"flex", flexDirection:"column", gap:9, background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, padding:12 }}>
              <Field label="Name" value={nc.full_name} onChange={v=>setNc(p=>({...p,full_name:v}))} placeholder="Client name" autoFocus />
              <div style={c2}>
                <Field label="Email" value={nc.email} onChange={v=>setNc(p=>({...p,email:v}))} placeholder="name@email.com" />
                <Field label="Phone" value={nc.phone} onChange={v=>setNc(p=>({...p,phone:v}))} placeholder="(813) 555-1234" />
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <select value={pickRole} onChange={e=>setPickRole(e.target.value)} style={{ background:C.surface, border:`1px solid ${C.border2}`, borderRadius:6, color:C.text, fontSize:12, fontFamily:FONT, padding:"7px 9px" }}>
                  {["Buyer","Seller","Tenant","Referral"].map(r=><option key={r} value={r}>{r}</option>)}
                </select>
                <GoldButton small onClick={createContact} disabled={saving}>Save & add</GoldButton>
                <GoldButton small outline onClick={()=>{setShowNew(false);setErr("");}}>Cancel</GoldButton>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", gap:8 }}>
                <input value={cq} onChange={e=>setCq(e.target.value)} placeholder="Search your contacts to add…"
                  style={{ flex:1, padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", boxSizing:"border-box" }} />
                <select value={pickRole} onChange={e=>setPickRole(e.target.value)} style={{ background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:12, fontFamily:FONT, padding:"0 9px" }}>
                  {["Buyer","Seller","Tenant","Referral"].map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {matches.length>0 && (
                <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
                  {matches.map(c=>(
                    <button key={c.id} onClick={()=>addLink(c, pickRole)} style={{ display:"flex", alignItems:"center", gap:9, width:"100%", textAlign:"left", background:C.surface, border:"none", borderBottom:`1px solid ${C.border}`, padding:"8px 12px", cursor:"pointer" }}>
                      <Avatar name={c.full_name} email={c.email} size={26} />
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:FONT }}>{c.full_name}</div>
                        <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{c.email||c.phone||""}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {cq.trim() && matches.length===0 && <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>No match.</div>}
              <button onClick={()=>{setShowNew(true);setErr("");}} style={{ background:"none", border:`1px dashed ${C.border2}`, color:C.gold, cursor:"pointer", fontSize:12, fontFamily:FONT, fontWeight:600, padding:"8px 12px", borderRadius:8, width:"100%" }}>
                + Add a new contact
              </button>
            </div>
          )}
        </div>
      )}

      {tab==="notes" && (
        <textarea value={f.notes} onChange={e=>set("notes")(e.target.value)} rows={7} placeholder="Notes about this deal…"
          style={{ width:"100%", padding:"12px 14px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", boxSizing:"border-box", resize:"vertical" }} />
      )}

      {err && <div style={{ fontSize:12, color:"#ef4444", fontFamily:FONT, marginTop:12 }}>{err}</div>}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
        <GoldButton outline small onClick={onClose}>Close</GoldButton>
        <GoldButton small onClick={save} disabled={saving}>{saving?"Saving…":(isEdit?"Save changes":"Add deal")}</GoldButton>
      </div>
    </Modal>
  );
}

function PortalContactModal({ contact, agentContact, onClose, onSaved }) {
  const isEdit = !!contact;
  const isMobile = useIsMobile();
  const agentEmail = agentContact?.email || "";
  const [f,setF] = useState({
    full_name: contact?.full_name||"", email: contact?.email||"", phone: contact?.phone||"",
    contact_type: contact?.contact_type||"Lead", pipeline_stage: contact?.pipeline_stage||"New",
    address: contact?.address||"", city: contact?.city||"", state: contact?.state||"", notes: contact?.notes||"",
  });
  const set=(k)=>(v)=>setF(p=>({...p,[k]:v}));
  const [saving,setSaving]=useState(false); const [err,setErr]=useState("");
  const c2={ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12 };
  const save = async () => {
    if(!f.full_name.trim()){ setErr("Name is required"); return; }
    setSaving(true); setErr("");
    const payload={ full_name:f.full_name.trim(), email:f.email.trim()||null, phone:f.phone.trim()||null,
      contact_type:f.contact_type, pipeline_stage:f.pipeline_stage, address:f.address.trim()||null, city:f.city.trim()||null,
      state:f.state.trim()||null, notes:f.notes.trim()||null, updated_at:new Date().toISOString() };
    let error;
    if(isEdit){ ({error}=await supabase.from("contacts").update(payload).eq("id",contact.id)); }
    else { ({error}=await supabase.from("contacts").insert({...payload, org_id:ORG_ID, status:"Active", created_by:agentEmail, assigned_to:agentEmail, source:"Agent Portal"})); }
    setSaving(false);
    if(error){ setErr(error.message); return; }
    onSaved && onSaved();
  };
  return (
    <Modal title={isEdit?"Edit Contact":"Add Contact"} onClose={onClose} maxWidth={500}>
      <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
        <Field label="Full Name" value={f.full_name} onChange={set("full_name")} placeholder="Jane Smith" autoFocus required />
        <div style={c2}>
          <Field label="Email" value={f.email} onChange={set("email")} placeholder="jane@email.com" />
          <Field label="Phone" value={f.phone} onChange={set("phone")} placeholder="(813) 555-1234" />
        </div>
        <div style={c2}>
          <Sel label="Type" value={f.contact_type} onChange={set("contact_type")} options={["Lead","Client","Buyer","Seller","Vendor","Other"]} />
          <Sel label="Stage" value={f.pipeline_stage} onChange={set("pipeline_stage")} options={["New","Contacted","Nurturing","Active","Client","Past Client"]} />
        </div>
        <Field label="Address" value={f.address} onChange={set("address")} placeholder="123 Main St" />
        <div style={c2}>
          <Field label="City" value={f.city} onChange={set("city")} placeholder="Tampa" />
          <Field label="State" value={f.state} onChange={set("state")} placeholder="FL" />
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Notes</label>
          <textarea value={f.notes} onChange={e=>set("notes")(e.target.value)} rows={3}
            style={{ width:"100%", padding:"10px 13px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", boxSizing:"border-box", resize:"vertical" }} />
        </div>
        {err && <div style={{ fontSize:12, color:"#ef4444", fontFamily:FONT }}>{err}</div>}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <GoldButton outline small onClick={onClose}>Cancel</GoldButton>
          <GoldButton small onClick={save} disabled={saving}>{saving?"Saving…":(isEdit?"Save changes":"Add contact")}</GoldButton>
        </div>
      </div>
    </Modal>
  );
}

function AgentPortalApp(
{ agentContact, session, onSignOut, isPreview=false, initialView, onViewChange }) {
  const [view, setView]       = useState(initialView||"portal_dashboard");
  useEffect(()=>{ if(onViewChange) onViewChange(view); },[view]); // eslint-disable-line react-hooks/exhaustive-deps
  const [theme,setTheme] = useState(()=>{ try{ return (typeof localStorage!=="undefined" && localStorage.getItem("ari-theme"))||"dark"; }catch(e){ return "dark"; } });
  const toggleTheme = ()=>{ const nx=theme==="dark"?"light":"dark"; applyPalette(nx); try{ localStorage.setItem("ari-theme",nx); }catch(e){} setTheme(nx); };
  const [myDeals, setMyDeals] = useState([]);
  const [myContacts, setMyCon] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [team, setTeam]       = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const navOverlay = isMobile || isTablet; // sidebar overlays (doesn't push content) below 1024px
  const [portalBoard, setPortalBoard] = useState("listing");
  const [sidebarCollapsed, setSC] = useState(false);
  const [mobileMenuOpen, setMobileMenu] = useState(false);
  const [chatMsgs, setChatMsgs]   = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChSend]  = useState(false);
  const [chatConvId, setChatConvId] = useState(null);
  const chatBottomRef = useRef(null);
  const [agentPackage, setAgentPackage] = useState(null);
  const [agentLifetime, setAgentLifetime] = useState(null);
  const [agentYearly, setAgentYearly]     = useState([]);
  const [agentTxns, setAgentTxns]         = useState([]);
  const [dealModal, setDealModal]         = useState({open:false, deal:null});
  const [contactModal, setContactModal]   = useState({open:false, contact:null});

  const agentName  = agentContact?.full_name || "Agent";
  const agentEmail = agentContact?.email || session?.user?.email || "";
  const agentPhone = agentContact?.phone || "";

  useEffect(()=>{
    const load = async () => {
      const [dc, ct, t, tm] = await Promise.all([
        // deals linked to this agent
        supabase.from("deals")
          .select("id,address,city,state,zip,price,status,deal_type,property_type,mls_number,bedrooms,bathrooms,sqft,year_built,close_date,commission_rate,notes,created_at")
          .eq("org_id", ORG_ID)
          .eq("agent_contact_id", agentContact?.id || "00000000-0000-0000-0000-000000000000")
          .order("created_at",{ascending:false}),
        // contacts created by agent
        supabase.from("contacts")
          .select("*").eq("org_id", ORG_ID)
          .eq("created_by", agentEmail).order("full_name"),
        // tasks assigned to agent
        supabase.from("tasks")
          .select("*").eq("org_id", ORG_ID)
          .eq("assigned_to", agentEmail).order("due_date"),
        // team directory
        supabase.from("user_profiles")
          .select("full_name,email,brokerage_role,role,phone")
          .eq("org_id", ORG_ID).order("full_name"),
      ]);
      setMyDeals(dc.data||[]);
      setMyCon(ct.data||[]);
      setMyTasks(t.data||[]);
      setTeam(tm.data||[]);
      setLoading(false);
    };
    load();

    // Load agent's fee package for earnings calculations
    if(agentContact?.id) {
      supabase.from("agent_fee_packages").select("*")
        .eq("contact_id", agentContact.id).eq("is_active", true)
        .maybeSingle().then(({data})=>setAgentPackage(data||null));
    }

    // Load historical production (track record)
    if(agentContact?.id) {
      supabase.from("agent_performance_lifetime").select("*")
        .eq("agent_contact_id", agentContact.id).maybeSingle()
        .then(({data})=>setAgentLifetime(data||null));
      supabase.from("agent_performance_yearly").select("*")
        .eq("agent_contact_id", agentContact.id).order("tax_year",{ascending:false})
        .then(({data})=>setAgentYearly(data||[]));
      supabase.from("transactions").select("*")
        .eq("agent_contact_id", agentContact.id)
        .order("tax_year",{ascending:false}).order("close_date",{ascending:false,nullsFirst:false})
        .then(({data})=>setAgentTxns(data||[]));
    }

    // Load Ari chat for this agent
    if(agentContact?.id) {
      supabase.from("robot_conversations")
        .select("*").eq("robot_id", ARI_ID)
        .eq("contact_id", agentContact.id)
        .order("updated_at",{ascending:false}).limit(1)
        .then(({data})=>{
          if(data&&data[0]){ setChatConvId(data[0].id); setChatMsgs(data[0].messages||[]); }
        });
    }
  },[agentContact?.id, agentEmail]);

  const refreshTasks = async () => {
    const { data } = await supabase.from("tasks").select("*")
      .eq("org_id",ORG_ID).eq("assigned_to",agentEmail).order("due_date");
    setMyTasks(data||[]);
  };

  const fmt = n=>n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n}`;
  const sw  = navOverlay ? 0 : sidebarCollapsed ? 56 : 220;

  // ── Agent Sidebar ──
  const AgentSidebar = () => {
    const sW = navOverlay ? 272 : sidebarCollapsed ? 56 : 220;
    const isHidden = navOverlay && !mobileMenuOpen;
    return (
    <>
      {navOverlay && mobileMenuOpen && (
        <div onClick={()=>setMobileMenu(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:99 }} />
      )}
      <div style={{ width:sW, minWidth:sW, background:C.surface,
      borderRight:`1px solid ${C.border}`, height:isPreview?"calc(100vh - 40px)":"100vh",
      display:"flex", flexDirection:"column",
      transition:"transform 0.25s ease, width 0.2s,min-width 0.2s", overflow:"hidden",
      position:"fixed", top:isPreview?40:0, left:0, zIndex:100,
      transform:isHidden?"translateX(-100%)":"translateX(0)",
      boxShadow:navOverlay&&mobileMenuOpen?"4px 0 24px rgba(0,0,0,0.4)":"none" }}>

      <div style={{ padding:sidebarCollapsed?"16px 14px":"16px 18px",
        display:"flex", alignItems:"center", gap:10,
        borderBottom:`1px solid ${C.border}`, minHeight:56 }}>
        <AriMark size={26} />
        {!sidebarCollapsed && (
          <div style={{ overflow:"hidden" }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text,
              fontFamily:SERIF, whiteSpace:"nowrap" }}>Agent Portal</div>
            <div style={{ fontSize:9, color:C.text3, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>ROG Advantage</div>
          </div>
        )}
      </div>

      <nav style={{ flex:1, padding:"10px 6px", display:"flex", flexDirection:"column", gap:1 }}>
        {PORTAL_NAV.map(item=>{
          const active = view===item.id;
          return (
            <button key={item.id} onClick={()=>{setView(item.id);if(navOverlay)setMobileMenu(false);}} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:sidebarCollapsed?"10px 0":"9px 12px",
              justifyContent:sidebarCollapsed?"center":"flex-start",
              borderRadius:8, border:"none", cursor:"pointer", width:"100%",
              background:active?C.goldDim:"transparent",
              color:active?C.gold:C.text2,
              fontSize:13, fontWeight:active?600:400, fontFamily:FONT,
              transition:"all 0.1s" }}
              onMouseEnter={e=>{if(!active){e.currentTarget.style.background=C.surface2;e.currentTarget.style.color=C.text;}}}
              onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text2;}}}>
              <span style={{ fontSize:15, lineHeight:1, flexShrink:0 }}>{item.icon}</span>
              {!sidebarCollapsed&&<span style={{ whiteSpace:"nowrap" }}>{item.label}</span>}
              {active&&!sidebarCollapsed&&<div style={{ marginLeft:"auto", width:3, height:14, borderRadius:2, background:C.gold }} />}
            </button>
          );
        })}
      </nav>

      <div style={{ padding:sidebarCollapsed?"10px 6px":"10px 12px",
        borderTop:`1px solid ${C.border}` }}>
        {!sidebarCollapsed && (
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8, padding:"2px 4px" }}>
            <Avatar name={agentName} email={agentEmail} size={28} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:FONT,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{agentName}</div>
              <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>Agent</div>
            </div>
          </div>
        )}
        {isPreview ? (
          <div style={{ padding:"6px 10px", background:C.goldDim,
            border:`1px solid ${C.goldBorder}`, borderRadius:6,
            fontSize:10, color:C.gold, fontFamily:FONT, textAlign:"center" }}>
            Preview Mode
          </div>
        ) : (
          <button onClick={onSignOut} style={{
            width:"100%", padding:sidebarCollapsed?"7px 0":"7px 10px",
            background:C.surface2, border:`1px solid ${C.border}`,
            borderRadius:6, color:C.text3, fontSize:11, fontFamily:FONT, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:sidebarCollapsed?"center":"flex-start", gap:6,
            transition:"color 0.12s" }}
            onMouseEnter={e=>e.currentTarget.style.color=C.red}
            onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
            <span style={{ fontSize:13 }}>⎋</span>
            {!sidebarCollapsed&&<span>Sign out</span>}
          </button>
        )}
      </div>
    </div>
    </>
  ); };

  // ── Portal Dashboard ──
  const PortalDashboard = () => {
    const active   = myDeals.filter(d=>!["Closed","Dead"].includes(d.status));
    const underC   = myDeals.filter(d=>d.status==="Under Contract");
    const openT    = myTasks.filter(t=>t.status!=="done");
    const upcoming = myTasks.filter(t=>t.status!=="done"&&t.due_date).sort((a,b)=>a.due_date>b.due_date?1:-1).slice(0,3);

    // Historical track record (from performance tables)
    const ltDeals  = agentLifetime?.total_deals  ?? 0;
    const ltVolume = Number(agentLifetime?.total_volume||0);
    const ltGci    = Number(agentLifetime?.total_gci||0);
    const thisYear = new Date().getFullYear();
    const cy       = agentYearly.find(y=>Number(y.tax_year)===thisYear);
    const cyDeals  = cy?.deals ?? 0;
    const cyVolume = Number(cy?.volume||0);

    return (
      <div style={{ padding:"24px" }}>
        <div style={{ marginBottom:22 }}>
          <h2 style={{ fontSize:20, fontWeight:700, fontFamily:SERIF, color:C.text,
            margin:"0 0 3px", letterSpacing:"-0.02em" }}>
            Hey {agentName.split(" ")[0]} 👋
          </h2>
          <p style={{ fontSize:12, color:C.text2, fontFamily:FONT, margin:0 }}>
            {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} · Realty One Group Advantage
          </p>
        </div>

        {/* Live pipeline */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:14 }}>
          {[
            {label:"Active Listings", val:active.length,  accent:C.blue},
            {label:"Under Contract",  val:underC.length,  accent:C.amber},
            {label:`${thisYear} Closed`, val:cyDeals,     accent:C.green},
            {label:`${thisYear} Volume`, val:cyVolume>0?fmt(cyVolume):"—", accent:C.gold},
            {label:"Open Tasks",      val:openT.length,   accent:openT.length>3?C.amber:C.text2},
          ].map(s=>(
            <div key={s.label} style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:12, padding:"16px 18px" }}>
              <div style={{ fontSize:22, fontWeight:700, color:s.accent||C.gold,
                fontFamily:SERIF, letterSpacing:"-0.02em" }}>{s.val}</div>
              <div style={{ fontSize:10, fontWeight:700, color:C.text2, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Lifetime track record */}
        {agentLifetime && (
          <div style={{ background:`linear-gradient(135deg, ${C.goldDim}, ${C.surface})`,
            border:`1px solid ${C.goldBorder}`, borderRadius:12, padding:"16px 20px", marginBottom:24,
            display:"flex", flexWrap:"wrap", gap:24, alignItems:"center" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Career<br/>Track Record
            </div>
            {[
              {label:"Lifetime Closed", val:ltDeals},
              {label:"Lifetime Volume", val:ltVolume>0?fmt(ltVolume):"—"},
              {label:"Lifetime GCI",    val:ltGci>0?fmt(ltGci):"—"},
              {label:"Years Active",    val:(agentLifetime.active_years||[]).length||"—"},
            ].map(s=>(
              <div key={s.label}>
                <div style={{ fontSize:20, fontWeight:700, color:C.text, fontFamily:SERIF, letterSpacing:"-0.02em" }}>{s.val}</div>
                <div style={{ fontSize:10, fontWeight:700, color:C.text2, fontFamily:FONT,
                  textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
            <button onClick={()=>setView("portal_pipeline")} style={{ marginLeft:"auto",
              background:"none", border:`1px solid ${C.goldBorder}`, color:C.gold, cursor:"pointer",
              fontSize:11, fontFamily:FONT, fontWeight:600, padding:"7px 12px", borderRadius:8 }}>
              View history →
            </button>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
          {/* Recent deals */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.08em" }}>My Pipeline</span>
            </div>
            {myDeals.length===0
              ? <div style={{ padding:"28px 16px", textAlign:"center", color:C.text3, fontSize:12, fontFamily:FONT }}>No deals yet</div>
              : myDeals.slice(0,4).map(d=>(
                <div key={d.id} style={{ padding:"11px 16px", borderBottom:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:FONT,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {d.address||"Untitled"}
                    </div>
                    <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>
                      {d.agent_role} · {[d.city,d.state].filter(Boolean).join(", ")}
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))
            }
          </div>

          {/* Upcoming tasks */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.08em" }}>Upcoming Tasks</span>
            </div>
            {upcoming.length===0
              ? <div style={{ padding:"28px 16px", textAlign:"center", color:C.text3, fontSize:12, fontFamily:FONT }}>All clear</div>
              : upcoming.map(t=>(
                <div key={t.id} style={{ padding:"11px 16px", borderBottom:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                    background:{urgent:C.red,high:C.amber,normal:C.blue,low:C.text3}[t.priority]||C.text3 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:C.text, fontFamily:FONT,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</div>
                  </div>
                  {t.due_date&&<span style={{ fontSize:10, color:C.text3, fontFamily:MONO }}>{t.due_date}</span>}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  };

  // ── Pipeline ──
  const PortalPipeline = () => {
    const fmt2 = n=>{ n=Number(n||0); return n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n}`; };
    const [tab,setTab] = useState("pipeline");
    const [statusF,setStatusF] = useState("all");
    const [yearF,setYearF] = useState("all");
    const [mode,setMode] = useState(isMobile?"cards":"table");
    const statuses = ["all", ...Array.from(new Set(myDeals.map(d=>d.status).filter(Boolean)))];
    const shown = statusF==="all" ? myDeals : myDeals.filter(d=>d.status===statusF);
    const KANBAN = ["New","Active","Under Contract","Pending","Closed"];
    const histYears = ["all", ...Array.from(new Set(agentTxns.map(t=>t.tax_year).filter(Boolean))).sort((a,b)=>b-a)];
    const histTxns = yearF==="all" ? agentTxns : agentTxns.filter(t=>String(t.tax_year)===String(yearF));
    const histSum = histTxns.reduce((a,t)=>({v:a.v+Number(t.close_price||0), g:a.g+Number(t.gross_commission||0)}),{v:0,g:0});
    const openDeal = (d)=>setDealModal({open:true, deal:d||null});
    const Tab = ({id,label}) => (
      <button onClick={()=>setTab(id)} style={{ background: tab===id?C.goldDim:"transparent", color: tab===id?C.gold:C.text2,
        border:`1px solid ${tab===id?C.goldBorder:C.border}`, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, fontFamily:FONT, cursor:"pointer" }}>{label}</button>
    );
    const pill = (active) => ({ background: active?C.text:"transparent", color: active?C.bg:C.text2,
      border:`1px solid ${active?C.text:C.border2}`, borderRadius:20, padding:"5px 13px", fontSize:11, fontWeight:600, fontFamily:FONT, cursor:"pointer" });
    const ModeBtn = ({id,label}) => (
      <button onClick={()=>setMode(id)} style={{ background: mode===id?C.surface2:"transparent", color: mode===id?C.text:C.text3,
        border:`1px solid ${mode===id?C.border2:C.border}`, borderRadius:7, padding:"5px 11px", fontSize:11, fontWeight:600, fontFamily:FONT, cursor:"pointer" }}>{label}</button>
    );
    const card = (d) => (
      <div key={d.id} onClick={()=>openDeal(d)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 15px", cursor:"pointer" }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{d.address||"\u2014"}</div>
          <StatusBadge status={d.status} />
        </div>
        <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:3 }}>{[d.city,d.state].filter(Boolean).join(", ")}{d.mls_number?` \u00b7 MLS ${d.mls_number}`:""}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:9 }}>
          <span style={{ fontSize:11, color:C.text2, fontFamily:FONT }}>{d.deal_type||"\u2014"}</span>
          <span style={{ fontSize:13, fontWeight:700, color:C.gold, fontFamily:MONO }}>{d.price?fmt2(d.price):"\u2014"}</span>
        </div>
      </div>
    );
    return (
      <div style={{ padding:"20px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:14, flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Tab id="pipeline" label="Active Pipeline" />
            <Tab id="history" label={`Track Record${agentTxns.length?` \u00b7 ${agentTxns.length} closed`:""}`} />
          </div>
          {tab==="pipeline" && <GoldButton small onClick={()=>openDeal(null)}>+ Add Deal</GoldButton>}
        </div>

        {tab==="pipeline" && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:14, flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                {statuses.map(st=>(<button key={st} onClick={()=>setStatusF(st)} style={pill(statusF===st)}>{st==="all"?"All":st}</button>))}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <ModeBtn id="table" label="Table" /><ModeBtn id="kanban" label="Kanban" /><ModeBtn id="cards" label="Cards" />
              </div>
            </div>

            {myDeals.length===0 ? (
              <div style={{ background:C.surface, border:`1px dashed ${C.border2}`, borderRadius:12, padding:"48px 18px", textAlign:"center" }}>
                <div style={{ fontSize:14, color:C.text2, fontFamily:FONT, marginBottom:4 }}>No deals yet.</div>
                <div style={{ fontSize:12, color:C.text3, fontFamily:FONT, marginBottom:14 }}>Add your first deal to start tracking your pipeline. Your closed history is under <strong>Track Record</strong>.</div>
                <GoldButton small onClick={()=>openDeal(null)}>+ Add your first deal</GoldButton>
              </div>
            ) : mode==="table" ? (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", padding:"8px 18px", borderBottom:`1px solid ${C.border}` }}>
                  {["Property","Type","Status","Price"].map(h=>(<span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>))}
                </div>
                {shown.length===0
                  ? <div style={{ padding:"40px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>No deals match this filter.</div>
                  : shown.map(d=>(
                    <div key={d.id} onClick={()=>openDeal(d)} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", padding:"12px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center", cursor:"pointer" }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.surface2} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{d.address||"\u2014"}</div>
                        <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{[d.city,d.state].filter(Boolean).join(", ")}{d.mls_number?` \u00b7 MLS ${d.mls_number}`:""}</div>
                      </div>
                      <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{d.deal_type||"\u2014"}</span>
                      <StatusBadge status={d.status} />
                      <span style={{ fontSize:12, fontWeight:700, color:C.gold, fontFamily:MONO }}>{d.price?fmt2(d.price):"\u2014"}</span>
                    </div>
                  ))
                }
              </div>
            ) : mode==="cards" ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
                {shown.length===0 ? <div style={{ color:C.text3, fontSize:13, fontFamily:FONT }}>No deals match this filter.</div> : shown.map(card)}
              </div>
            ) : (
              <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8 }}>
                {KANBAN.map(col=>{
                  const items=myDeals.filter(d=>d.status===col);
                  return (
                    <div key={col} style={{ minWidth:230, width:230, flexShrink:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", marginBottom:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.07em" }}>{col}</span>
                        <span style={{ fontSize:11, color:C.text3, fontFamily:MONO }}>{items.length}</span>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                        {items.length===0 ? <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, padding:"10px", textAlign:"center", border:`1px dashed ${C.border}`, borderRadius:9 }}>{"\u2014"}</div> : items.map(card)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab==="history" && (
          <>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:12 }}>
              {histYears.map(y=>(<button key={y} onClick={()=>setYearF(y)} style={pill(String(yearF)===String(y))}>{y==="all"?"All Years":y}</button>))}
            </div>
            <div style={{ display:"flex", gap:24, flexWrap:"wrap", marginBottom:14, padding:"12px 18px", background:`linear-gradient(135deg, ${C.goldDim}, ${C.surface})`, border:`1px solid ${C.goldBorder}`, borderRadius:12 }}>
              {[{label: yearF==="all"?"Total Closed":`${yearF} Closed`, val:histTxns.length},{label:"Volume", val:histSum.v?fmt2(histSum.v):"\u2014"},{label:"Gross Commission", val:histSum.g?fmt2(histSum.g):"\u2014"}].map(s=>(
                <div key={s.label}><div style={{ fontSize:20, fontWeight:700, color:C.text, fontFamily:SERIF, letterSpacing:"-0.02em" }}>{s.val}</div><div style={{ fontSize:10, fontWeight:700, color:C.text2, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.label}</div></div>
              ))}
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2.4fr 0.7fr 1.1fr 1.1fr 0.9fr", padding:"9px 18px", borderBottom:`1px solid ${C.border}` }}>
                {["Property","Year","Close Price","Commission","Status"].map(h=>(<span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>))}
              </div>
              {histTxns.length===0
                ? <div style={{ padding:"48px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>No transactions on file.</div>
                : histTxns.map(t=>(
                  <div key={t.id} style={{ display:"grid", gridTemplateColumns:"2.4fr 0.7fr 1.1fr 1.1fr 0.9fr", padding:"11px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                    <div style={{ minWidth:0 }}><div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.address||"\u2014"}</div><div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{[t.transaction_type,t.side].filter(Boolean).join(" \u00b7 ")}</div></div>
                    <span style={{ fontSize:12, color:C.text2, fontFamily:MONO }}>{t.tax_year||"\u2014"}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:MONO }}>{Number(t.close_price)?fmt2(Number(t.close_price)):"\u2014"}</span>
                    <span style={{ fontSize:12, color:C.green, fontFamily:MONO }}>{Number(t.gross_commission)?fmt2(Number(t.gross_commission)):"\u2014"}</span>
                    <StatusBadge status={t.status} />
                  </div>
                ))
              }
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Contacts ──
  const PortalContacts = () => {
    const [search,setSearch] = useState("");
    const [mode,setMode] = useState("list");
    const filtered = myContacts.filter(c=>!search||`${c.full_name||""} ${c.email||""} ${c.phone||""}`.toLowerCase().includes(search.toLowerCase()));
    const STAGES = ["New","Contacted","Nurturing","Active","Client","Past Client"];
    const cols = Array.from(new Set([...STAGES, ...myContacts.map(c=>c.pipeline_stage).filter(Boolean)]));
    const openContact = (c)=>setContactModal({open:true, contact:c||null});
    const ModeBtn = ({id,label}) => (
      <button onClick={()=>setMode(id)} style={{ background: mode===id?C.surface2:"transparent", color: mode===id?C.text:C.text3,
        border:`1px solid ${mode===id?C.border2:C.border}`, borderRadius:7, padding:"6px 12px", fontSize:11, fontWeight:600, fontFamily:FONT, cursor:"pointer" }}>{label}</button>
    );
    const ccard = (c) => (
      <div key={c.id} onClick={()=>openContact(c)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", cursor:"pointer" }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <Avatar name={c.full_name} email={c.email} size={30} />
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.full_name}</div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{c.contact_type||""}</div>
          </div>
        </div>
        {(c.email||c.phone) && <div style={{ fontSize:11, color:C.text2, fontFamily:FONT, marginTop:8, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.email||c.phone}</div>}
      </div>
    );
    return (
      <div style={{ padding:"20px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search my contacts…"
            style={{ padding:"8px 12px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", width:240, maxWidth:"45%", boxSizing:"border-box" }} />
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <ModeBtn id="list" label="List" /><ModeBtn id="pipeline" label="Pipeline" />
            <GoldButton small onClick={()=>openContact(null)}>+ Add Contact</GoldButton>
          </div>
        </div>

        {myContacts.length===0 ? (
          <div style={{ background:C.surface, border:`1px dashed ${C.border2}`, borderRadius:12, padding:"48px 18px", textAlign:"center" }}>
            <div style={{ fontSize:14, color:C.text2, fontFamily:FONT, marginBottom:4 }}>No contacts yet.</div>
            <div style={{ fontSize:12, color:C.text3, fontFamily:FONT, marginBottom:14 }}>Add your clients and leads to track them here.</div>
            <GoldButton small onClick={()=>openContact(null)}>+ Add your first contact</GoldButton>
          </div>
        ) : mode==="list" ? (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr":"2fr 1fr 1.5fr 1fr", padding:"8px 18px", borderBottom:`1px solid ${C.border}` }}>
              {(isMobile?["Name","Stage"]:["Name","Stage","Email","Phone"]).map(h=>(<span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>))}
            </div>
            {filtered.length===0
              ? <div style={{ padding:"40px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>No results.</div>
              : filtered.map(c=>(
                <div key={c.id} onClick={()=>openContact(c)} style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr":"2fr 1fr 1.5fr 1fr", padding:"11px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center", cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface2} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0 }}>
                    <Avatar name={c.full_name} email={c.email} size={26} />
                    <span style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.full_name}</span>
                  </div>
                  <span style={{ fontSize:11, color:C.text2, fontFamily:FONT }}>{c.pipeline_stage||"\u2014"}</span>
                  {!isMobile && <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{c.email||"\u2014"}</span>}
                  {!isMobile && <span style={{ fontSize:12, color:C.text2, fontFamily:MONO }}>{c.phone||"\u2014"}</span>}
                </div>
              ))
            }
          </div>
        ) : (
          <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8 }}>
            {cols.map(col=>{
              const items=filtered.filter(c=>(c.pipeline_stage||"New")===col);
              return (
                <div key={col} style={{ minWidth:230, width:230, flexShrink:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", marginBottom:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.07em" }}>{col}</span>
                    <span style={{ fontSize:11, color:C.text3, fontFamily:MONO }}>{items.length}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                    {items.length===0 ? <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, padding:"10px", textAlign:"center", border:`1px dashed ${C.border}`, borderRadius:9 }}>{"\u2014"}</div> : items.map(ccard)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Tasks ──
  const PortalTasks = () => {
    const [showAdd,setShowAdd] = useState(false);
    const [form,setForm]       = useState({title:"",priority:"normal",due_date:""});
    const [saving,setSaving]   = useState(false);
    const open = myTasks.filter(t=>t.status!=="done");
    const done = myTasks.filter(t=>t.status==="done");

    const toggle = async t => {
      await supabase.from("tasks").update(t.status==="done"?{status:"todo",completed_at:null}:{status:"done",progress:100,completed_at:new Date().toISOString()}).eq("id",t.id);
      refreshTasks();
    };
    const addTask = async () => {
      if(!form.title.trim()) return;
      setSaving(true);
      await supabase.from("tasks").insert({
        ...form, org_id:ORG_ID, status:"todo",
        assigned_to:agentEmail, created_by:agentName,
      });
      setSaving(false); setShowAdd(false); setForm({title:"",priority:"normal",due_date:""});
      refreshTasks();
    };
    const PCOL = {urgent:C.red,high:C.amber,normal:C.blue,low:C.text3};

    return (
      <div style={{ padding:"20px 24px" }}>
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
          <GoldButton small onClick={()=>setShowAdd(true)}>+ Add Task</GoldButton>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", marginBottom:14 }}>
          <div style={{ padding:"11px 18px", borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.08em" }}>Open · {open.length}</span>
          </div>
          {open.length===0
            ? <div style={{ padding:"28px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>All clear 🎉</div>
            : open.map(t=>(
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"11px 18px", borderBottom:`1px solid ${C.border}` }}>
                <button onClick={()=>toggle(t)} style={{ width:18, height:18, borderRadius:4,
                  flexShrink:0, cursor:"pointer", padding:0,
                  border:`2px solid ${C.border2}`, background:"transparent",
                  display:"flex", alignItems:"center", justifyContent:"center" }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:C.text, fontFamily:FONT }}>{t.title}</div>
                  {t.description&&<div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{t.description}</div>}
                </div>
                <div style={{ width:7, height:7, borderRadius:"50%", background:PCOL[t.priority]||C.text3 }} />
                {t.due_date&&<span style={{ fontSize:10, color:C.text3, fontFamily:MONO }}>{t.due_date}</span>}
              </div>
            ))
          }
        </div>
        {done.length>0&&(
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"11px 18px", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.08em" }}>Done · {done.length}</span>
            </div>
            {done.slice(0,4).map(t=>(
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"11px 18px", borderBottom:`1px solid ${C.border}` }}>
                <button onClick={()=>toggle(t)} style={{ width:18, height:18, borderRadius:4,
                  flexShrink:0, cursor:"pointer", padding:0,
                  border:`2px solid ${C.gold}`, background:C.gold,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:9, color:"#0a0a0a", fontWeight:900 }}>✓</span>
                </button>
                <div style={{ flex:1, fontSize:13, color:C.text3, fontFamily:FONT,
                  textDecoration:"line-through" }}>{t.title}</div>
              </div>
            ))}
          </div>
        )}
        {showAdd&&(
          <Modal title="New Task" onClose={()=>setShowAdd(false)} maxWidth={400}>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <Field label="Task" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="e.g. Follow up with buyer" autoFocus />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Sel label="Priority" value={form.priority} onChange={v=>setForm(f=>({...f,priority:v}))}
                  options={[{value:"low",label:"Low"},{value:"normal",label:"Normal"},{value:"high",label:"High"},{value:"urgent",label:"Urgent"}]} />
                <Field label="Due Date" value={form.due_date} onChange={v=>setForm(f=>({...f,due_date:v}))} type="date" />
              </div>
              <div style={{ display:"flex", gap:10, paddingTop:4 }}>
                <GoldButton onClick={addTask} disabled={saving||!form.title.trim()}>
                  {saving?"Adding…":"Add task"}
                </GoldButton>
                <GoldButton onClick={()=>setShowAdd(false)} outline>Cancel</GoldButton>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  };

  // ── Team Directory ──
  const PortalTeam = () => {
    const ROLE_ORDER = { "Broker":1, "Operations":2, "Front Desk":3 };
    const sorted = [...team].sort((a,b)=>(ROLE_ORDER[a.brokerage_role]||9)-(ROLE_ORDER[b.brokerage_role]||9));
    const ROLE_COLOR = { "Broker":C.gold, "Operations":C.purple, "Front Desk":C.blue };

    return (
      <div style={{ padding:"16px", maxWidth:640 }}>
        <div style={{ marginBottom:18 }}>
          <h2 style={{ fontSize:16, fontWeight:700, fontFamily:SERIF, color:C.text, margin:"0 0 4px" }}>Your Team</h2>
          <p style={{ fontSize:12, color:C.text2, fontFamily:FONT, margin:0 }}>
            Realty One Group Advantage — reach out anytime
          </p>
        </div>
        {sorted.map(m=>(
          <div key={m.email} style={{ display:"flex", alignItems:"center", gap:14,
            padding:"16px 18px", background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:12, marginBottom:10 }}>
            <Avatar name={m.full_name} email={m.email} size={44} />
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF }}>{m.full_name}</div>
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                  color:ROLE_COLOR[m.brokerage_role]||C.text2,
                  background:m.brokerage_role==="Broker"?C.goldDim:"rgba(59,130,246,0.10)" }}>
                  {m.brokerage_role||m.role}
                </span>
              </div>
              <div style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{m.email}</div>
              {m.phone&&<div style={{ fontSize:12, color:C.text3, fontFamily:MONO, marginTop:2 }}>{m.phone}</div>}
            </div>
            <a href={`mailto:${m.email}`} style={{ padding:"7px 14px", borderRadius:8,
              border:`1.5px solid ${C.goldBorder}`, background:"transparent", color:C.gold,
              fontSize:12, fontWeight:600, fontFamily:FONT, cursor:"pointer",
              textDecoration:"none" }}>Email</a>
          </div>
        ))}
        <div style={{ marginTop:16, padding:"14px 18px", background:C.surface2,
          borderRadius:10, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
            textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Office</div>
          <div style={{ fontSize:13, color:C.text2, fontFamily:FONT }}>Realty One Group Advantage</div>
          <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>Tampa, FL</div>
        </div>
      </div>
    );
  };

  // ── Chat with Ari (Phase 4) ──

    const PORTAL_TITLES = {
    portal_dashboard: ["Dashboard", `Welcome, ${agentName.split(" ")[0]}`],
    portal_pipeline:  ["Pipeline", "Listings / Buyers / Leasing"],
    portal_contacts:  ["My Contacts", `${myContacts.length} contacts`],
    portal_tasks:     ["Tasks", `${myTasks.filter(t=>t.status!=="done").length} open`],
    portal_team:      ["Team Directory", "Realty One Group Advantage"],
    portal_calendar:  ["Calendar", "Realty One Group Advantage"],
    portal_earnings:  ["My Earnings", "Commission Pipeline"],
    portal_chat:      ["Chat · Ari", "Your AI assistant"],
  };
  const [ptitle, psub] = PORTAL_TITLES[view]||["Portal",""];

  return (
    <div style={{ display:"flex", background:C.bg, minHeight:"100vh" }}>
      <AgentSidebar />
      <div style={{ marginLeft:sw, flex:1, transition:"margin-left 0.2s",
        display:"flex", flexDirection:"column", minWidth:0,
        paddingBottom:isMobile?56:0 }}>
        <TopBar title={ptitle} subtitle={psub} theme={theme} onToggleTheme={toggleTheme}
          onToggleSidebar={()=>navOverlay?setMobileMenu(o=>!o):setSC(c=>!c)} />
        {isPreview && (
          <div style={{ background:"rgba(212,175,55,0.08)", borderBottom:`1px solid ${C.goldBorder}`,
            padding:"8px 20px", fontSize:11, color:C.gold, fontFamily:FONT,
            display:"flex", alignItems:"center", gap:8 }}>
            <span>👁</span>
            <span>Previewing portal as <strong>{agentName}</strong> — this is what they see when they log in</span>
          </div>
        )}
        <main style={{ flex:1, overflowY:"auto" }}>
          {loading
            ? <div style={{ padding:40, textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>Loading…</div>
            : <>
              {view==="portal_dashboard" && <PortalDashboard />}
              {view==="portal_pipeline"  && (
                <div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:isMobile?"12px 12px 0":"16px 24px 0" }}>
                    {[["listing","📋 Listings"],["buyer","🏠 Buyers"],["leasing","🔑 Leasing"]].map(([id,lbl])=>(
                      <button key={id} onClick={()=>setPortalBoard(id)} style={{
                        padding:"8px 16px", borderRadius:8,
                        border:`1px solid ${portalBoard===id?C.goldBorder:C.border}`,
                        background:portalBoard===id?C.goldDim:C.surface2,
                        color:portalBoard===id?C.gold:C.text2, fontSize:13, fontWeight:600,
                        fontFamily:FONT, cursor:"pointer", minHeight:isMobile?40:undefined }}>{lbl}</button>
                    ))}
                  </div>
                  <PipelineView pipeline={portalBoard} user={{email:agentEmail, role:"member"}} />
                </div>
              )}
              {view==="portal_contacts"  && <PortalContacts />}
              {view==="portal_tasks"     && <PortalTasks />}
              {view==="portal_team"      && <PortalTeam />}
              {view==="portal_calendar"  && <CalendarView user={{email:agentEmail,role:"member"}} isPortal={true} agentContact={agentContact} />}
              {view==="portal_earnings" && (
              <PortalEarningsView
                myDeals={myDeals}
                agentPackage={agentPackage}
                agentName={agentName}
              />
            )}
            {view==="portal_chat" && (
              <PortalChatPanel
                chatMsgs={chatMsgs} setChatMsgs={setChatMsgs}
                chatInput={chatInput} setChatInput={setChatInput}
                chatSending={chatSending} setChSend={setChSend}
                chatConvId={chatConvId} setChatConvId={setChatConvId}
                chatBottomRef={chatBottomRef}
                agentName={agentName} agentEmail={agentEmail}
                agentContact={agentContact}
                myDeals={myDeals} myTasks={myTasks}
              />
            )}
            </>
          }
        </main>
        {dealModal.open && (
          <PortalDealModal
            deal={dealModal.deal}
            agentContact={agentContact}
            myContacts={myContacts}
            onClose={()=>setDealModal({open:false,deal:null})}
            onSaved={async()=>{
              setDealModal({open:false,deal:null});
              const { data } = await supabase.from("deals")
                .select("id,address,city,state,zip,price,status,deal_type,property_type,mls_number,bedrooms,bathrooms,sqft,year_built,close_date,commission_rate,notes,created_at")
                .eq("org_id",ORG_ID).eq("agent_contact_id",agentContact.id).order("created_at",{ascending:false});
              setMyDeals(data||[]);
            }}
            onContactsChanged={async()=>{
              const { data } = await supabase.from("contacts").select("*")
                .eq("org_id",ORG_ID).eq("created_by",agentEmail).order("full_name");
              setMyCon(data||[]);
            }}
          />
        )}
        {contactModal.open && (
          <PortalContactModal
            contact={contactModal.contact}
            agentContact={agentContact}
            onClose={()=>setContactModal({open:false,contact:null})}
            onSaved={async()=>{
              setContactModal({open:false,contact:null});
              const { data } = await supabase.from("contacts").select("*")
                .eq("org_id",ORG_ID).eq("created_by",agentEmail).order("full_name");
              setMyCon(data||[]);
            }}
          />
        )}
      </div>
    </div>
  );
}


function AgentPortalPreview({ contact, onClose, initialView, onViewChange }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:C.bg,
      transform:"translateZ(0)", willChange:"transform" }}>
      {/* Preview top bar — fixed relative to this container (via transform containment) */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:401,
        background:"rgba(10,10,10,0.95)", backdropFilter:"blur(8px)",
        borderBottom:`1px solid ${C.goldBorder}`,
        padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", gap:5 }}>
            {["#ef4444","#f59e0b","#22c55e"].map(c=>(
              <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }} />
            ))}
          </div>
          <span style={{ fontSize:11, color:C.gold, fontFamily:MONO, letterSpacing:"0.04em" }}>
            PORTAL PREVIEW — {contact.full_name}
          </span>
        </div>
        <button onClick={onClose} style={{ background:C.surface2, border:`1px solid ${C.border}`,
          borderRadius:7, color:C.text2, fontSize:12, fontFamily:FONT,
          cursor:"pointer", padding:"6px 14px", display:"flex", alignItems:"center", gap:6 }}>
          ✕ Exit Preview
        </button>
      </div>
      {/* Full portal shifted down for preview bar */}
      <div style={{ paddingTop:40, height:"100vh", overflowY:"auto" }}>
        <AgentPortalApp
          agentContact={contact}
          session={null}
          onSignOut={onClose}
          isPreview={true}
          initialView={initialView}
          onViewChange={onViewChange}
        />
      </div>
    </div>
  );
}


function AgentPickerModal({ contacts, onPick, onClose }) {
  const [q,setQ] = useState("");
  const list = contacts
    .filter(c=>!q || `${c.full_name||""} ${c.email||""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a,b)=>(a.full_name||"").localeCompare(b.full_name||""));
  return (
    <Modal title="View as agent" onClose={onClose} maxWidth={460}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>
          Open any agent's portal exactly as they see it. Agents without an email on file can't be previewed.
        </div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search agents…" autoFocus
          style={{ padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
            borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none" }} />
        <div style={{ maxHeight:360, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
          {list.length===0 && (
            <div style={{ fontSize:13, color:C.text3, fontFamily:FONT, padding:"12px 4px" }}>No agents found.</div>
          )}
          {list.map(c=>(
            <button key={c.id} onClick={()=>c.email&&onPick(c)} disabled={!c.email}
              title={c.email?"":"No email on file — can't preview portal"}
              style={{ display:"flex", alignItems:"center", gap:10, textAlign:"left",
                background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
                padding:"10px 12px", cursor:c.email?"pointer":"not-allowed",
                opacity:c.email?1:0.5, width:"100%" }}>
              <Avatar name={c.full_name} email={c.email} size={30} />
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.full_name}</div>
                <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{c.email||"no email"}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function ContactsTable({ contacts, allContacts, onSelect, typeDot, onUpdate }) {
  const isMobile = useIsMobile();
  const timeAgo = (ts) => {
    if(!ts) return "Never";
    const diff = Date.now()-new Date(ts).getTime(), day=86400000;
    if(diff<day) return "Today";
    const d=Math.floor(diff/day);
    if(d<7) return d+"d ago";
    if(d<30) return Math.floor(d/7)+"w ago";
    if(d<365) return Math.floor(d/30)+"mo ago";
    return Math.floor(d/365)+"y ago";
  };
  const isActive = c => (c.status||"Active").toLowerCase()!=="inactive";
  const StatusTag = ({ c }) => {
    const active = isActive(c);
    return (
      <button onClick={e=>{ e.stopPropagation(); onUpdate&&onUpdate(c.id,{status:active?"Inactive":"Active"}); }} title="Click to toggle active/inactive"
        style={{ fontSize:10, fontWeight:700, fontFamily:FONT, letterSpacing:"0.03em", textTransform:"uppercase",
          padding:"3px 9px", borderRadius:20, cursor:"pointer", border:"none", whiteSpace:"nowrap",
          color:active?C.green:C.text3, background:active?"rgba(34,197,94,0.12)":C.surface2 }}>
        {active?"\u25cf Active":"Inactive"}
      </button>
    );
  };
  const TagChips = ({ tags }) => {
    const t = Array.isArray(tags)?tags:[];
    if(t.length===0) return <span style={{ fontSize:11, color:C.text3 }}>{"\u2014"}</span>;
    return (
      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
        {t.slice(0,3).map((tag,i)=>(
          <span key={i} style={{ fontSize:9.5, fontWeight:600, fontFamily:FONT, color:C.gold, background:C.goldDim, border:`1px solid ${C.goldBorder}`, borderRadius:6, padding:"2px 6px", whiteSpace:"nowrap" }}>{tag}</span>
        ))}
        {t.length>3 && <span style={{ fontSize:9.5, color:C.text3, alignSelf:"center" }}>+{t.length-3}</span>}
      </div>
    );
  };
  const LastCell = ({ c }) => (
    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
      <span style={{ fontSize:11.5, color:c.last_contacted_at?C.text2:C.text3, fontFamily:FONT, whiteSpace:"nowrap" }}>{timeAgo(c.last_contacted_at)}</span>
      <button onClick={e=>{ e.stopPropagation(); onUpdate&&onUpdate(c.id,{last_contacted_at:new Date().toISOString()}); }} title="Mark contacted today"
        style={{ fontSize:9.5, color:C.text3, background:"none", border:`1px solid ${C.border2}`, borderRadius:6, padding:"2px 7px", cursor:"pointer", whiteSpace:"nowrap" }}>{"\u2713"} Log</button>
    </div>
  );

  if(contacts.length===0) return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
      padding:"48px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
      {allContacts.length===0?"No contacts yet":"No results"}
    </div>
  );
  if(isMobile) return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {contacts.map(c=>(
        <div key={c.id} onClick={()=>onSelect(c)}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", cursor:"pointer" }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Avatar name={c.full_name} email={c.email} size={42} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT }}>{c.full_name}</span>
                <StatusTag c={c} />
              </div>
              <div style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{c.contact_type}{c.phone?` \u00b7 ${c.phone}`:""}</div>
              {c.email&&<div style={{ fontSize:11, color:C.text3, fontFamily:FONT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.email}</div>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginTop:10 }}>
            <TagChips tags={c.tags} />
            <span style={{ fontSize:10.5, color:C.text3, fontFamily:FONT, whiteSpace:"nowrap" }}>Last: {timeAgo(c.last_contacted_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
  const COLS = "1.7fr 0.9fr 1.2fr 1fr 1.5fr 1.1fr";
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:COLS, padding:"9px 18px", borderBottom:`1px solid ${C.border}` }}>
        {["Name","Status","Tags","Phone","Email","Last Contact"].map(h=>(
          <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
        ))}
      </div>
      {contacts.map(c=>(
        <div key={c.id} onClick={()=>onSelect(c)}
          style={{ display:"grid", gridTemplateColumns:COLS, padding:"12px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center", cursor:"pointer" }}
          onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
            <Avatar name={c.full_name} email={c.email} size={28} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:typeDot[c.contact_type]||C.text3, flexShrink:0 }} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.full_name}</span>
                {c.portal_enabled&&<span style={{ fontSize:8, fontWeight:700, color:C.green, background:"rgba(34,197,94,0.10)", borderRadius:8, padding:"1px 5px", flexShrink:0 }}>PORTAL</span>}
              </div>
              <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{c.contact_type}</div>
            </div>
          </div>
          <div><StatusTag c={c} /></div>
          <TagChips tags={c.tags} />
          <span style={{ fontSize:12, color:C.text2, fontFamily:MONO, whiteSpace:"nowrap" }}>{c.phone||"\u2014"}</span>
          <span style={{ fontSize:12, color:C.text2, fontFamily:FONT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.email||"\u2014"}</span>
          <LastCell c={c} />
        </div>
      ))}
    </div>
  );
}

function ContactDetail({ contact, user, onClose, onRefresh }) {
  const [editMode,setEditMode]   = useState(false);
  const [portalMode,setPortalMode] = useState(false);
  const [editForm,setEditForm]   = useState({
    full_name:contact.full_name||"", email:contact.email||"",
    phone:contact.phone||"", contact_type:contact.contact_type||"Agent",
    status:contact.status||"Active", source:contact.source||"", notes:contact.notes||"",
    tags:(Array.isArray(contact.tags)?contact.tags:[]).join(", "),
  });
  const [portalEmail,setPortalEmail] = useState(contact.portal_email||contact.email||"");
  const [saving,setSaving]       = useState(false);
  const [toast,setToast]         = useState(null);
  const [showPreview,setShowPreview] = useState(false);
  const setE = (k,v) => setEditForm(f=>({...f,[k]:v}));

  const fmtDate = iso => {
    if(!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  };

  const markContacted = async () => {
    await supabase.from("contacts").update({ last_contacted_at:new Date().toISOString() }).eq("id", contact.id);
    onRefresh(); setToast({msg:"Marked contacted today",type:"success"});
  };

  const saveEdit = async () => {
    setSaving(true);
    const tags = (editForm.tags||"").split(",").map(t=>t.trim()).filter(Boolean);
    const { tags:_t, ...rest } = editForm;
    const { error } = await supabase.from("contacts")
      .update({...rest, tags, updated_at:new Date().toISOString()})
      .eq("id", contact.id);
    setSaving(false);
    if(!error){ setEditMode(false); onRefresh(); setToast({msg:"Contact updated",type:"success"}); }
    else setToast({msg:"Error saving",type:"error"});
  };

  const enablePortal = async () => {
    if(!portalEmail.trim()) return;
    setSaving(true);
    // Upsert portal access record
    await supabase.from("agent_portal_access").upsert({
      contact_id: contact.id,
      portal_email: portalEmail.trim().toLowerCase(),
      is_active: true,
      granted_by: creatorLabel(user),
      org_id: ORG_ID,
      updated_at: new Date().toISOString(),
    }, { onConflict: "portal_email" });
    // Update contact
    await supabase.from("contacts").update({
      portal_enabled: true,
      portal_email: portalEmail.trim().toLowerCase(),
    }).eq("id", contact.id);
    setSaving(false);
    setPortalMode(false);
    onRefresh();
    setToast({msg:"Portal access enabled",type:"success"});
  };

  const disablePortal = async () => {
    setSaving(true);
    await supabase.from("agent_portal_access")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("contact_id", contact.id);
    await supabase.from("contacts")
      .update({ portal_enabled: false })
      .eq("id", contact.id);
    setSaving(false);
    onRefresh();
    setToast({msg:"Portal access revoked",type:"success"});
  };

  const TYPE_COLOR = {
    Client:C.blue, Agent:C.gold, Lender:C.purple,
    Referral:C.green, Vendor:C.text2,
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:300,
      display:"flex", justifyContent:"flex-end" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      <div style={{ width:"min(520px,100vw)", background:C.bg, height:"100vh",
        display:"flex", flexDirection:"column", borderLeft:`1px solid ${C.border}`,
        animation:"slideIn 0.2s ease", overflowY:"hidden" }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"flex-start", gap:14, background:C.surface }}>
          <Avatar name={contact.full_name} email={contact.email} size={44} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:SERIF, letterSpacing:"-0.01em", marginBottom:3 }}>
              {contact.full_name}
            </div>
            <div style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{contact.email}</div>
            <div style={{ display:"flex", gap:8, marginTop:7, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:11, fontWeight:700,
                color:TYPE_COLOR[contact.contact_type]||C.text2,
                background: contact.contact_type==="Agent"?C.goldDim:"rgba(59,130,246,0.10)",
                borderRadius:6, padding:"3px 9px" }}>{contact.contact_type}</span>
              {contact.portal_enabled && (
                <span style={{ fontSize:10, fontWeight:700, color:C.green,
                  background:"rgba(34,197,94,0.10)", borderRadius:6, padding:"3px 9px",
                  display:"flex", alignItems:"center", gap:4 }}>
                  ⚡ Portal Active
                </span>
              )}
              {contact.phone&&<span style={{ fontSize:11, color:C.text3, fontFamily:MONO }}>{contact.phone}</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <GoldButton small outline onClick={()=>setEditMode(true)}>Edit</GoldButton>
            <button onClick={onClose} style={{ background:"none", border:"none",
              color:C.text2, fontSize:20, cursor:"pointer", lineHeight:1, padding:4 }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>

          {/* Info grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            {[
              {label:"Type",   val:contact.contact_type||"—"},
              {label:"Status", val:contact.status||"—"},
              {label:"Source", val:contact.source||"—"},
              {label:"Last Contacted", val:contact.last_contacted_at?fmtDate(contact.last_contacted_at):"Never"},
              {label:"Added",  val:fmtDate(contact.created_at)},
            ].map(item=>(
              <div key={item.label} style={{ background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:10, padding:"11px 14px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
                  textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3 }}>{item.label}</div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Tags + quick action */}
          <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:16 }}>
            {(Array.isArray(contact.tags)?contact.tags:[]).map((t,i)=>(
              <span key={i} style={{ fontSize:11, fontWeight:600, fontFamily:FONT, color:C.gold, background:C.goldDim, border:`1px solid ${C.goldBorder}`, borderRadius:7, padding:"4px 9px" }}>{t}</span>
            ))}
            {(!Array.isArray(contact.tags) || contact.tags.length===0) && <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>No tags yet</span>}
            <div style={{ marginLeft:"auto" }}>
              <GoldButton small outline onClick={markContacted}>{"\u2713"} Mark contacted today</GoldButton>
            </div>
          </div>

          {/* Notes */}
          {contact.notes&&(
            <div style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"13px 16px", marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Notes</div>
              <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, lineHeight:1.6 }}>{contact.notes}</div>
            </div>
          )}

          {/* ── Agent Portal Preview (admin sees exactly what the agent sees) ── */}
          {contact.contact_type==="Agent" && contact.email && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:12, padding:"16px 18px", display:"flex", alignItems:"center",
              justifyContent:"space-between", gap:12 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>Agent Portal</div>
                <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>
                  See exactly what {(contact.full_name||"this agent").split(" ")[0]} sees when they log in
                </div>
              </div>
              <GoldButton small onClick={()=>setShowPreview(true)}>Preview portal</GoldButton>
            </div>
          )}
        </div>
      </div>

      {showPreview&&(
        <AgentPortalPreview contact={contact} onClose={()=>setShowPreview(false)} />
      )}

      {/* Edit modal */}
      {editMode&&(
        <Modal title="Edit Contact" onClose={()=>setEditMode(false)} maxWidth={460}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Full name" value={editForm.full_name} onChange={v=>setE("full_name",v)} placeholder="Jane Smith" />
            <Field label="Email"     value={editForm.email}     onChange={v=>setE("email",v)}     type="email" />
            <Field label="Phone"     value={editForm.phone}     onChange={v=>setE("phone",v)} />
            <Sel   label="Type"      value={editForm.contact_type} onChange={v=>setE("contact_type",v)}
              options={["Client","Agent","Lender","Referral","Vendor"]} />
            <Sel   label="Status"    value={editForm.status} onChange={v=>setE("status",v)}
              options={["Active","Inactive","Prospect"]} />
            <Field label="Source"    value={editForm.source} onChange={v=>setE("source",v)} placeholder="Referral, ROGA Roster…" />
            <Field label="Tags (comma-separated)" value={editForm.tags} onChange={v=>setE("tags",v)} placeholder="VIP, Past Client, Sphere" />
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Notes</label>
              <textarea value={editForm.notes} onChange={e=>setE("notes",e.target.value)} rows={3}
                style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
                  borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none",
                  resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={saveEdit} disabled={saving}>{saving?"Saving…":"Save changes"}</GoldButton>
              <GoldButton onClick={()=>setEditMode(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ContactsView({ user, contacts, onRefresh }) {
  const [search,setSearch]         = useState("");
  const [typeFilter,setTypeFilter] = useState("all");
  const [statusFilter,setStatusFilter] = useState("all");
  const [showAdd,setShowAdd]       = useState(false);
  const [selected,setSelected]     = useState(null);
  const [saving,setSaving]         = useState(false);
  const [toast,setToast]           = useState(null);
  const [form,setForm]             = useState({full_name:"",email:"",phone:"",contact_type:"Agent",status:"Active",source:"",notes:"",tags:""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // Keep selected in sync after refresh
  useEffect(()=>{
    if(selected){ const updated=contacts.find(c=>c.id===selected.id); if(updated) setSelected(updated); }
  },[contacts]);

  const TYPES = ["all","Agent","Client","Lender","Referral","Vendor"];
  const isActive = c => (c.status||"Active").toLowerCase()!=="inactive";
  const filtered = contacts.filter(c=>{
    if(typeFilter!=="all"&&c.contact_type!==typeFilter) return false;
    if(statusFilter==="active"&&!isActive(c)) return false;
    if(statusFilter==="inactive"&&isActive(c)) return false;
    if(search&&!`${c.full_name} ${c.email} ${c.phone} ${(c.tags||[]).join(" ")}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const updateContact = async (id, updates) => {
    await supabase.from("contacts").update(updates).eq("id", id);
    onRefresh();
  };

  const handleAdd = async () => {
    if(!form.full_name.trim()) return;
    setSaving(true);
    const tags = (form.tags||"").split(",").map(t=>t.trim()).filter(Boolean);
    const { tags:_t, ...rest } = form;
    const { error } = await supabase.from("contacts").insert({...rest,tags,org_id:ORG_ID,created_by:creatorLabel(user)});
    setSaving(false);
    if(!error){ setShowAdd(false); setForm({full_name:"",email:"",phone:"",contact_type:"Agent",status:"Active",source:"",notes:"",tags:""}); onRefresh(); setToast({msg:"Contact added",type:"success"}); }
  };

  const TYPE_DOT = {Agent:C.gold,Client:C.blue,Lender:C.purple,Referral:C.green,Vendor:C.text3};

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      {/* Toolbar */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search contacts…"
            style={{ flex:1, padding:"10px 13px", background:C.surface2, border:`1px solid ${C.border2}`,
              borderRadius:10, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", minWidth:0 }}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border2} />
          <GoldButton onClick={()=>setShowAdd(true)} small>+ Add</GoldButton>
        </div>
        <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2,
          WebkitOverflowScrolling:"touch" }}>
          {TYPES.map(t=>(
            <button key={t} onClick={()=>setTypeFilter(t)} style={{
              padding:"5px 12px", borderRadius:20,
              border:`1.5px solid ${typeFilter===t?"rgba(212,175,55,0.30)":C.border}`,
              background:typeFilter===t?"rgba(212,175,55,0.15)":"transparent",
              color:typeFilter===t?C.gold:C.text2,
              fontSize:11, fontFamily:FONT, cursor:"pointer" }}>
              {t==="all"?"All":t}
            </button>
          ))}
          <span style={{ fontSize:10, color:C.text3, fontFamily:FONT,
            paddingLeft:4, whiteSpace:"nowrap" }}>{filtered.length} total</span>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {[["all","All"],["active","Active"],["inactive","Inactive"]].map(([v,lbl])=>(
            <button key={v} onClick={()=>setStatusFilter(v)} style={{
              padding:"5px 12px", borderRadius:20,
              border:`1.5px solid ${statusFilter===v?(v==="inactive"?C.border2:"rgba(34,197,94,0.35)"):C.border}`,
              background:statusFilter===v?(v==="inactive"?C.surface2:"rgba(34,197,94,0.12)"):"transparent",
              color:statusFilter===v?(v==="inactive"?C.text2:C.green):C.text2,
              fontSize:11, fontFamily:FONT, cursor:"pointer", fontWeight:statusFilter===v?700:400 }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Cards */}
      <ContactsTable contacts={filtered} allContacts={contacts} onSelect={setSelected} typeDot={TYPE_DOT} onUpdate={updateContact} />

      {/* Add modal */}
      {showAdd&&(
        <Modal title="New Contact" onClose={()=>setShowAdd(false)} maxWidth={460}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Full name" value={form.full_name} onChange={v=>set("full_name",v)} placeholder="Jane Smith" />
            <Field label="Email"     value={form.email}     onChange={v=>set("email",v)}     type="email" />
            <Field label="Phone"     value={form.phone}     onChange={v=>set("phone",v)}     placeholder="(813) 555-0100" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel label="Type"   value={form.contact_type} onChange={v=>set("contact_type",v)}
                options={["Agent","Client","Lender","Referral","Vendor"]} />
              <Field label="Source" value={form.source} onChange={v=>set("source",v)} placeholder="Referral, Walk-in…" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel label="Status" value={form.status} onChange={v=>set("status",v)} options={["Active","Inactive"]} />
              <Field label="Tags (comma-separated)" value={form.tags} onChange={v=>set("tags",v)} placeholder="VIP, Past Client" />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Notes</label>
              <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Optional notes…" rows={2}
                style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
                  borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none",
                  resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={handleAdd} disabled={saving||!form.full_name.trim()}>{saving?"Saving…":"Add Contact"}</GoldButton>
              <GoldButton onClick={()=>setShowAdd(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}

      {selected&&(
        <ContactDetail contact={selected} user={user} onClose={()=>setSelected(null)} onRefresh={onRefresh} />
      )}
    </div>
  );
}


function TasksView({ user, tasks, onRefresh }) {
  const [showAdd,setShowAdd] = useState(false);
  const [saving,setSaving]   = useState(false);
  const [form,setForm]       = useState({title:"",description:"",priority:"normal",due_date:"",assigned_to:user?.email||""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const open = tasks.filter(t=>t.status!=="done");
  const done = tasks.filter(t=>t.status==="done");

  const handleAdd = async () => {
    if(!form.title.trim()) return;
    setSaving(true);
    await supabase.from("tasks").insert({...form,org_id:ORG_ID,status:"todo",created_by:creatorLabel(user)});
    setSaving(false); setShowAdd(false);
    setForm({title:"",description:"",priority:"normal",due_date:"",assigned_to:user?.email||""});
    onRefresh();
  };

  const toggle = async t => {
    await supabase.from("tasks").update(t.status==="done"?{status:"todo",completed_at:null}:{status:"done",progress:100,completed_at:new Date().toISOString()}).eq("id",t.id);
    onRefresh();
  };

  const PCOL = {urgent:C.red,high:C.amber,normal:C.blue,low:C.text3};

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
              <Sel   label="Priority" value={form.priority}  onChange={v=>set("priority",v)}  options={[{value:"low",label:"Low"},{value:"normal",label:"Normal"},{value:"high",label:"High"},{value:"urgent",label:"Urgent"}]} />
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



function PlanTaskModal({ task, allTasks, members, onClose, onUpdate, onDelete, onAddSub }) {
  const [form,setForm] = useState({
    title:task.title||"", description:task.description||"", status:task.status||"todo",
    priority:task.priority||"normal", start_date:task.start_date||"", due_date:task.due_date||"",
    assignee_ids:Array.isArray(task.assignee_ids)?task.assignee_ids:[], progress:task.progress||0 });
  const [newSub,setNewSub] = useState("");
  const [newComment,setNewComment] = useState("");
  const [comments,setComments] = useState(task.comments||[]);
  const [pickerOpen,setPickerOpen] = useState(false);
  const subtasks = allTasks.filter(t=>t.parent_task_id===task.id);

  const save = (updates) => { setForm({...form,...updates}); onUpdate(task.id,updates); };
  const onStatus = (next) => {
    const u = next==="done" ? { status:"done", progress:100, completed_at:new Date().toISOString() }
                            : { status:next, completed_at:null };
    save(u);
  };
  const toggleAssignee = (uid) => {
    const cur = Array.isArray(form.assignee_ids)?form.assignee_ids:[];
    const next = cur.includes(uid)?cur.filter(x=>x!==uid):[...cur,uid];
    const names = members.filter(m=>next.includes(m.id)).map(m=>m.full_name||m.email||"\u2014");
    save({ assignee_ids:next, assigned_to:names.join(", ") });
  };
  const selected = members.filter(m=>Array.isArray(form.assignee_ids)&&form.assignee_ids.includes(m.id));
  const addComment = async () => {
    if(!newComment.trim()) return;
    const updated = [...comments,{text:newComment,date:new Date().toISOString()}];
    setComments(updated); setNewComment("");
    onUpdate(task.id,{comments:updated});
  };
  const fmtDate = d => d ? new Date(d).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "";

  const inp = { width:"100%", padding:"8px 12px", fontSize:13, fontFamily:FONT, border:`1px solid ${C.border2}`,
    borderRadius:7, outline:"none", background:C.surface2, color:C.text, boxSizing:"border-box" };
  const lbl = { display:"block", fontSize:10, fontWeight:700, color:C.text2, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:FONT };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:12 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, borderRadius:16, maxWidth:620, width:"100%", maxHeight:"90vh", overflow:"auto", padding:24, border:`1px solid ${C.border}` }}>
        <div style={{ marginBottom:16 }}>
          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} onBlur={()=>save({title:form.title})}
            style={{ width:"100%", border:"none", background:"transparent", fontSize:18, fontWeight:700, color:C.text, fontFamily:SERIF, outline:"none" }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div><label style={lbl}>Status</label>
            <select value={form.status} onChange={e=>onStatus(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="review">Review</option><option value="done">Done</option>
            </select></div>
          <div><label style={lbl}>Priority</label>
            <select value={form.priority} onChange={e=>save({priority:e.target.value})} style={{...inp,cursor:"pointer"}}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select></div>
          <div><label style={lbl}>Start</label><input type="date" value={form.start_date||""} onChange={e=>save({start_date:e.target.value||null})} style={inp} /></div>
          <div><label style={lbl}>Due</label><input type="date" value={form.due_date||""} onChange={e=>save({due_date:e.target.value||null})} style={inp} /></div>
        </div>
        <div style={{ marginBottom:14, position:"relative" }}>
          <label style={lbl}>Assignee{selected.length>1?"s":""}</label>
          <div onClick={()=>setPickerOpen(v=>!v)} style={{...inp, cursor:"pointer", minHeight:36, display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
            {selected.length===0 ? <span style={{ color:C.text3, fontSize:13 }}>Unassigned</span>
              : selected.map(m=>(
                <span key={m.id} style={{ display:"inline-flex", alignItems:"center", gap:5, background:C.goldDim, color:C.gold, border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:700, fontFamily:FONT }}>
                  {m.full_name||m.email}
                  <button onClick={e=>{e.stopPropagation();toggleAssignee(m.id);}} style={{ background:"transparent", border:"none", color:C.gold, fontSize:12, cursor:"pointer", padding:0, lineHeight:1 }}>{"\u00d7"}</button>
                </span>))}
          </div>
          {pickerOpen && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, marginTop:4, background:C.surface, border:`1px solid ${C.border2}`, borderRadius:8, zIndex:5, maxHeight:220, overflow:"auto", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
              {members.map(m=>{ const sel=form.assignee_ids.includes(m.id); return (
                <button key={m.id} onClick={()=>toggleAssignee(m.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px", border:"none", background:sel?C.goldDim:"transparent", cursor:"pointer", textAlign:"left", borderBottom:`1px solid ${C.border}`, fontSize:13, color:sel?C.gold:C.text, fontWeight:sel?700:500, fontFamily:FONT }}>
                  <span style={{ width:16, height:16, borderRadius:4, border:`2px solid ${sel?C.gold:C.border2}`, background:sel?C.gold:"transparent", flexShrink:0 }} />
                  {m.full_name||m.email}
                </button>); })}
            </div>
          )}
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Progress \u00b7 {form.progress}%</label>
          <input type="range" min="0" max="100" step="5" value={form.progress}
            onChange={e=>setForm({...form,progress:Number(e.target.value)})}
            onMouseUp={()=>save({progress:form.progress})} onTouchEnd={()=>save({progress:form.progress})}
            style={{ width:"100%", accentColor:C.gold }} />
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Description</label>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} onBlur={()=>save({description:form.description})}
            rows={3} style={{...inp, resize:"vertical", fontFamily:FONT }} />
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Subtasks ({subtasks.length})</label>
          {subtasks.map(st=>(
            <div key={st.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
              <button onClick={()=>onUpdate(st.id,{status:st.status==="done"?"todo":"done"})} style={{ width:16, height:16, borderRadius:4, border:`2px solid ${st.status==="done"?C.gold:C.border2}`, background:st.status==="done"?C.gold:"transparent", cursor:"pointer", flexShrink:0 }}>
                {st.status==="done"&&<span style={{ color:"#0a0a0a", fontSize:9, fontWeight:900 }}>{"\u2713"}</span>}
              </button>
              <span style={{ flex:1, fontSize:12, color:C.text, fontFamily:FONT, textDecoration:st.status==="done"?"line-through":"none" }}>{st.title}</span>
              <button onClick={()=>onDelete(st.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:C.red }}>{"\u2715"}</button>
            </div>
          ))}
          <div style={{ display:"flex", gap:6, marginTop:8 }}>
            <input value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&newSub.trim()){ onAddSub(newSub.trim()); setNewSub(""); } }} placeholder="Add subtask\u2026" style={{...inp, flex:1 }} />
            <GoldButton small onClick={()=>{ if(newSub.trim()){ onAddSub(newSub.trim()); setNewSub(""); } }} disabled={!newSub.trim()}>+</GoldButton>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Comments ({comments.length})</label>
          {comments.map((c,i)=>(
            <div key={i} style={{ background:C.surface2, borderRadius:8, padding:"8px 12px", marginBottom:6 }}>
              <div style={{ fontSize:12, color:C.text, fontFamily:FONT }}>{c.text}</div>
              <div style={{ fontSize:9, color:C.text3, marginTop:3, fontFamily:MONO }}>{fmtDate(c.date)}</div>
            </div>
          ))}
          <div style={{ display:"flex", gap:6, marginTop:6 }}>
            <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addComment()} placeholder="Add comment\u2026" style={{...inp, flex:1 }} />
            <GoldButton small onClick={addComment} disabled={!newComment.trim()}>+</GoldButton>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
          <GoldButton danger onClick={()=>{ if(window.confirm("Delete task?")){ onDelete(task.id); onClose(); } }}>Delete</GoldButton>
          <GoldButton onClick={onClose}>Done</GoldButton>
        </div>
      </div>
    </div>
  );
}

function PlanningView({ user, onRefresh }) {
  const isMobile = useIsMobile();
  const [loading,setLoading]   = useState(true);
  const [inits,setInits]       = useState([]);
  const [rocks,setRocks]       = useState([]);
  const [projects,setProjects] = useState([]);
  const [tasks,setTasks]       = useState([]);
  const [members,setMembers]   = useState([]);
  const [myId,setMyId]         = useState(null);

  const [tab,setTab]           = useState("initiatives");
  const [selInit,setSelInit]   = useState(null);
  const [selRock,setSelRock]   = useState(null);
  const [selProj,setSelProj]   = useState(null);
  const [openTask,setOpenTask] = useState(null);

  const [modal,setModal]   = useState(null);
  const [editId,setEditId] = useState(null);
  const [saving,setSaving] = useState(false);
  const [form,setForm]     = useState({});
  const set = (k,v)=>setForm(f=>({...f,[k]:v}));
  const [editing,setEditing] = useState(null);
  const memberById = id => members.find(m=>m.id===id);
  const memberByEmail = em => members.find(m=>(m.email||"").toLowerCase()===(em||"").toLowerCase());
  const ownerName = (rec) => {
    if(rec?.owner_user_id){ const m=memberById(rec.owner_user_id); if(m) return m.full_name||m.email; }
    if(rec?.assigned_to){ const m=memberByEmail(rec.assigned_to); return m?(m.full_name||m.email):rec.assigned_to; }
    return null;
  };
  const ownerOptions = [{value:"",label:"\u2014 Default (you) \u2014"}, ...members.map(m=>({value:m.id,label:m.full_name||m.email}))];

  const SUBNAV = [
    { key:"initiatives", icon:"\ud83c\udfaf", label:"Initiatives" },
    { key:"rocks",       icon:"\ud83e\udea8", label:"Rocks" },
    { key:"projects",    icon:"\ud83d\uddc2\ufe0f", label:"Projects" },
    { key:"tasks",       icon:"\u2705", label:"Tasks" },
  ];
  const INIT_STATUS = [{value:"active",label:"Active"},{value:"dormant",label:"Dormant"},{value:"achieved",label:"Achieved"},{value:"killed",label:"Killed"}];
  const ROCK_STATUS = [{value:"on_track",label:"On Track"},{value:"at_risk",label:"At Risk"},{value:"off_track",label:"Off Track"},{value:"done",label:"Done"}];
  const PROJ_STATUS = [{value:"active",label:"Active"},{value:"on_hold",label:"On Hold"},{value:"done",label:"Done"}];
  const SCOLOR = { active:C.green, dormant:C.text3, achieved:C.gold, killed:C.red, on_track:C.green, at_risk:C.amber, off_track:C.red, done:C.blue, on_hold:C.text3 };
  const PCOL = { urgent:C.red, high:C.amber, normal:C.blue, low:C.text3 };

  const load = async () => {
    setLoading(true);
    const [i,r,p,t,m] = await Promise.all([
      supabase.from("initiatives").select("*").eq("org_id",ORG_ID).order("priority",{ascending:false}).order("created_at"),
      supabase.from("rocks").select("*").eq("org_id",ORG_ID).order("created_at"),
      supabase.from("projects").select("*").eq("org_id",ORG_ID).order("created_at"),
      supabase.from("tasks").select("*").eq("org_id",ORG_ID).not("project_id","is",null).order("created_at",{ascending:false}),
      supabase.from("user_profiles").select("id, full_name, email").order("full_name"),
    ]);
    setInits(i.data||[]); setRocks(r.data||[]); setProjects(p.data||[]); setTasks(t.data||[]); setMembers(m.data||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ (async()=>{
    if(!user?.email) return;
    const { data } = await supabase.from("user_profiles").select("id").ilike("email",user.email).maybeSingle();
    if(data) setMyId(data.id);
  })(); },[user]);

  const initiativeById = id => inits.find(x=>x.id===id);
  const rockById       = id => rocks.find(x=>x.id===id);
  const projectById    = id => projects.find(x=>x.id===id);
  const rocksFor    = id => rocks.filter(r=>r.initiative_id===id);
  const projForInit = id => projects.filter(p=>p.initiative_id===id && !p.rock_id);
  const projForRock = id => projects.filter(p=>p.rock_id===id);
  const tasksForProj= id => tasks.filter(t=>t.project_id===id && !t.parent_task_id);

  const goTab = (k) => { setTab(k); setSelInit(null); setSelRock(null); setSelProj(null); };

  const openModal = (type, ctx={}, rec=null) => {
    setEditing(rec ? { type, id:rec.id } : null);
    const defOwner = myId || "";
    if(type==="init") setForm(rec
      ? { name:rec.name||"", description:rec.description||"", horizon_label:rec.horizon_label||"", status:rec.status||"active", mission_link:rec.mission_link||"", priority:rec.priority||0, owner_user_id:rec.owner_user_id||"" }
      : { name:"", description:"", horizon_label:"", status:"active", mission_link:"", priority:0, owner_user_id:defOwner });
    if(type==="rock") setForm(rec
      ? { title:rec.title||"", description:rec.description||"", status:rec.status||"on_track", quarter:rec.quarter||"", due_date:rec.due_date||"", progress:rec.progress||0, priority:rec.priority||0, initiative_id:rec.initiative_id||"", owner_user_id:rec.owner_user_id||"" }
      : { title:"", description:"", status:"on_track", quarter:"", due_date:"", progress:0, priority:0, initiative_id:ctx.initiative_id||(selInit?selInit.id:""), owner_user_id:defOwner });
    if(type==="proj") setForm(rec
      ? { name:rec.name||"", description:rec.description||"", status:rec.status||"active", initiative_id:rec.initiative_id||"", rock_id:rec.rock_id||"", owner_user_id:rec.owner_user_id||"" }
      : { name:"", description:"", status:"active", initiative_id:ctx.initiative_id||(selInit?selInit.id:""), rock_id:ctx.rock_id||(selRock?selRock.id:""), owner_user_id:defOwner });
    if(type==="task") setForm(rec
      ? { title:rec.title||"", description:rec.description||"", priority:rec.priority||"normal", due_date:rec.due_date||"", start_date:rec.start_date||"", project_id:rec.project_id||"", owner_user_id:(Array.isArray(rec.assignee_ids)&&rec.assignee_ids[0])||(memberByEmail(rec.assigned_to)?.id)||"" }
      : { title:"", description:"", priority:"normal", due_date:"", start_date:"", project_id:ctx.project_id||(selProj?selProj.id:""), owner_user_id:defOwner });
    setModal(type);
  };

  const save = async () => {
    setSaving(true);
    const ownerId = form.owner_user_id || myId || null;
    const taskOwner = memberById(form.owner_user_id) || memberById(myId) || null;
    const taskAssignedName = taskOwner ? (taskOwner.full_name||taskOwner.email) : (user?.full_name||user?.email||null);
    const taskAssigneeIds = taskOwner ? [taskOwner.id] : [];
    try {
      if(modal==="init"){
        if(!form.name.trim()){ setSaving(false); return; }
        const payload = { name:form.name.trim(), description:form.description||null, horizon_label:form.horizon_label||null, status:form.status, mission_link:form.mission_link||null, priority:Number(form.priority)||0, owner_user_id:ownerId };
        if(editing) await supabase.from("initiatives").update(payload).eq("id",editing.id);
        else await supabase.from("initiatives").insert({ org_id:ORG_ID, ...payload });
      } else if(modal==="rock"){
        if(!form.title.trim()||!form.initiative_id){ setSaving(false); return; }
        const payload = { initiative_id:form.initiative_id, title:form.title.trim(), description:form.description||null, status:form.status, quarter:form.quarter||null, due_date:form.due_date||null, progress:Number(form.progress)||0, priority:Number(form.priority)||0, owner_user_id:ownerId };
        if(editing) await supabase.from("rocks").update(payload).eq("id",editing.id);
        else await supabase.from("rocks").insert({ org_id:ORG_ID, ...payload });
      } else if(modal==="proj"){
        if(!form.name.trim()){ setSaving(false); return; }
        const rk = form.rock_id ? rocks.find(r=>r.id===form.rock_id) : null;
        const initId = rk ? rk.initiative_id : (form.initiative_id||null);
        const payload = { initiative_id:initId, rock_id:form.rock_id||null, name:form.name.trim(), description:form.description||null, status:form.status, owner_user_id:ownerId };
        if(editing) await supabase.from("projects").update(payload).eq("id",editing.id);
        else await supabase.from("projects").insert({ org_id:ORG_ID, ...payload });
      } else if(modal==="task"){
        if(!form.title.trim()||!form.project_id){ setSaving(false); return; }
        const payload = { project_id:form.project_id, title:form.title.trim(), description:form.description||null, priority:form.priority, due_date:form.due_date||null, start_date:form.start_date||null, assigned_to:taskAssignedName, assignee_ids:taskAssigneeIds };
        if(editing) await supabase.from("tasks").update(payload).eq("id",editing.id);
        else await supabase.from("tasks").insert({ org_id:ORG_ID, ...payload, status:"todo", progress:0, created_by:creatorLabel(user) });
      }
      setModal(null); setEditing(null); await load();
    } catch(e){ alert("Save failed: "+(e.message||e)); }
    setSaving(false);
  };

  const setStatus = async (table,id,status) => { await supabase.from(table).update({status}).eq("id",id); load(); };
  const del = async (table,id) => {
    if(!window.confirm("Delete this? Anything nested under it is unlinked, not deleted.")) return;
    await supabase.from(table).delete().eq("id",id);
    if(table==="initiatives"){ setSelInit(null); setSelRock(null); setSelProj(null); }
    if(table==="rocks"){ setSelRock(null); setSelProj(null); }
    if(table==="projects"){ setSelProj(null); }
    load();
  };
  const taskUpdate = async (id,updates) => { await supabase.from("tasks").update(updates).eq("id",id); load(); };
  const taskDelete = async (id) => { await supabase.from("tasks").delete().eq("id",id); setOpenTask(t=>t&&t.id===id?null:t); load(); };
  const taskAddSub = async (title) => { await supabase.from("tasks").insert({ org_id:ORG_ID, project_id:openTask.project_id, parent_task_id:openTask.id, title, status:"todo", priority:"normal", progress:0, created_by:creatorLabel(user) }); load(); };
  const quickToggle = async (t) => { const u = t.status==="done"?{status:"todo",completed_at:null}:{status:"done",progress:100,completed_at:new Date().toISOString()}; await supabase.from("tasks").update(u).eq("id",t.id); load(); };

  const crumbBtn = (active)=>({ background:"none", border:"none", padding:0, cursor:"pointer", fontFamily:FONT, fontSize:13, color:active?C.gold:C.text2, fontWeight:active?700:500 });
  const Pill = ({status})=>(<span style={{ fontSize:10, fontWeight:700, fontFamily:FONT, letterSpacing:"0.04em", textTransform:"uppercase", padding:"2px 8px", borderRadius:20, color:SCOLOR[status]||C.text3, background:(SCOLOR[status]||C.text3)+"22" }}>{(status||"").replace(/_/g," ")}</span>);
  const hdr = { fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase" };
  const cardWrap = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", marginBottom:16 };

  const Row = ({ onClick, children }) => (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 18px", borderBottom:`1px solid ${C.border}`, cursor:onClick?"pointer":"default" }}
      onMouseEnter={e=>{ if(onClick) e.currentTarget.style.background=C.surface2; }} onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}>{children}</div>
  );
  const SectionCard = ({ title, count, onAdd, addLabel, empty, children }) => (
    <div style={cardWrap}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 18px", borderBottom:`1px solid ${C.border}` }}>
        <span style={hdr}>{title} {typeof count==="number"?`\u00b7 ${count}`:""}</span>
        {onAdd && <GoldButton onClick={onAdd} small>+ {addLabel}</GoldButton>}
      </div>
      {(!children || (Array.isArray(children)&&children.length===0))
        ? <div style={{ padding:"28px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>{empty}</div>
        : children}
    </div>
  );
  const ProjectRow = ({ p, i }) => {
    const parentRock = p.rock_id ? rockById(p.rock_id) : null;
    const parentInit = p.initiative_id ? initiativeById(p.initiative_id) : (parentRock?.initiative_id ? initiativeById(parentRock.initiative_id) : null);
    return (
      <div onClick={()=>{ setSelProj(p); }} style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer" }}
        onMouseEnter={e=>{ e.currentTarget.style.background=C.surface2; }} onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}>
        <div style={{ width:26, height:26, borderRadius:7, background:`linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, fontFamily:SERIF, flexShrink:0 }}>{i+1}</div>
        <div style={{ flex:1, minWidth:0 }}>
          {(parentInit||parentRock) && (
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3, fontSize:9.5, fontWeight:700, letterSpacing:"0.02em", fontFamily:FONT, overflow:"hidden" }}>
              {parentInit && <span style={{ color:C.blue, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{"\ud83c\udfaf"} {parentInit.name}</span>}
              {parentInit && parentRock && <span style={{ color:C.text3 }}>{"\u203a"}</span>}
              {parentRock && <span style={{ color:C.amber, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{"\ud83e\udea8"} {parentRock.title}</span>}
            </div>
          )}
          <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>{p.name}</div>
          {p.description && <div style={{ fontSize:11, color:C.text3, marginTop:2, lineHeight:1.45, fontFamily:FONT }}>{p.description}</div>}
          {!parentInit && !parentRock && <div style={{ fontSize:9, color:C.text3, fontWeight:700, marginTop:3, letterSpacing:"0.04em", textTransform:"uppercase", fontFamily:FONT }}>Standalone</div>}
        </div>
        <span style={{ fontSize:10.5, color:C.text3, fontFamily:FONT, flexShrink:0 }}>{tasksForProj(p.id).length} tasks</span>
        {p.status && <span style={{ fontSize:9, fontWeight:800, color:C.text2, background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:5, padding:"3px 8px", letterSpacing:"0.04em", textTransform:"uppercase", flexShrink:0, fontFamily:FONT }}>{p.status}</span>}
      </div>
    );
  };
  const TaskRow = ({ t, showProject }) => {
    const pj = showProject && t.project_id ? projectById(t.project_id) : null;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 18px", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}
        onClick={()=>setOpenTask(t)} onMouseEnter={e=>{ e.currentTarget.style.background=C.surface2; }} onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}>
        <button onClick={e=>{ e.stopPropagation(); quickToggle(t); }} style={{ width:18, height:18, borderRadius:4, flexShrink:0, cursor:"pointer", padding:0, border:`2px solid ${t.status==="done"?C.gold:C.border2}`, background:t.status==="done"?C.gold:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {t.status==="done"&&<span style={{ fontSize:9, color:"#0a0a0a", fontWeight:900 }}>{"\u2713"}</span>}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          {pj && <div style={{ fontSize:9.5, fontWeight:700, color:C.blue, fontFamily:FONT, marginBottom:2 }}>{"\ud83d\uddc2\ufe0f"} {pj.name}</div>}
          <div style={{ fontSize:13, fontWeight:500, fontFamily:FONT, color:t.status==="done"?C.text3:C.text, textDecoration:t.status==="done"?"line-through":"none" }}>{t.title}</div>
          {t.assigned_to && <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{t.assigned_to}</div>}
        </div>
        {typeof t.progress==="number" && t.progress>0 && t.status!=="done" && <span style={{ fontSize:11, color:C.text3, fontFamily:MONO }}>{t.progress}%</span>}
        <div style={{ width:7, height:7, borderRadius:"50%", background:PCOL[t.priority]||C.text3, flexShrink:0 }} />
        {t.due_date && <span style={{ fontSize:11, color:C.text3, fontFamily:MONO }}>{t.due_date}</span>}
      </div>
    );
  };

  // ── sub-navigation (the side menu) ──
  const SubNav = () => {
    if(isMobile){
      return (
        <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"0 0 14px", marginBottom:4 }}>
          {SUBNAV.map(n=>{ const a=tab===n.key; return (
            <button key={n.key} onClick={()=>goTab(n.key)} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:20, border:`1px solid ${a?C.goldBorder:C.border2}`, background:a?C.goldDim:"transparent", color:a?C.gold:C.text2, fontSize:13, fontWeight:a?700:500, fontFamily:FONT, cursor:"pointer", whiteSpace:"nowrap" }}>
              <span>{n.icon}</span>{n.label}
            </button>); })}
        </div>
      );
    }
    return (
      <div style={{ width:172, flexShrink:0, paddingRight:16 }}>
        <div style={{ fontSize:10, fontWeight:800, color:C.text3, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:FONT, padding:"4px 10px 8px" }}>Planning</div>
        {SUBNAV.map(n=>{ const a=tab===n.key; return (
          <button key={n.key} onClick={()=>goTab(n.key)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px", marginBottom:2, borderRadius:8, border:"none", background:a?C.goldDim:"transparent", color:a?C.gold:C.text2, fontSize:13.5, fontWeight:a?700:500, fontFamily:FONT, cursor:"pointer", textAlign:"left" }}
            onMouseEnter={e=>{ if(!a) e.currentTarget.style.background=C.surface2; }} onMouseLeave={e=>{ if(!a) e.currentTarget.style.background="transparent"; }}>
            <span style={{ fontSize:15 }}>{n.icon}</span>{n.label}
          </button>); })}
      </div>
    );
  };

  if(loading) return <div style={{ padding:"40px 24px", textAlign:"center", color:C.text3, fontFamily:FONT, fontSize:13 }}>Loading planning\u2026</div>;

  const InitiativeDetail = ({ it }) => (
    <>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <button onClick={()=>setSelInit(null)} style={crumbBtn(false)}>{"\u2039"} Initiatives</button>
        <span style={{color:C.text3}}>{"\u203a"}</span><span style={{color:C.gold,fontWeight:700,fontFamily:FONT,fontSize:13}}>{it.name}</span>
      </div>
      <div style={{ ...cardWrap, padding:"16px 18px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:SERIF, fontSize:20, color:C.text, marginBottom:4 }}>{it.name}</div>
            {it.description && <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, marginBottom:6 }}>{it.description}</div>}
            {it.horizon_label && <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>Horizon: {it.horizon_label}</div>}
            {ownerName(it) && <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>Owner: <span style={{ color:C.text2, fontWeight:600 }}>{ownerName(it)}</span></div>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
            <Sel value={it.status} onChange={v=>{ setStatus("initiatives",it.id,v); setSelInit({...it,status:v}); }} options={INIT_STATUS} />
            <GoldButton small outline onClick={()=>openModal("init",{},it)}>{"\u270e"} Edit</GoldButton>
            <button onClick={()=>del("initiatives",it.id)} style={{ background:"none", border:"none", color:C.red, fontSize:11, fontFamily:FONT, cursor:"pointer", padding:0 }}>Delete</button>
          </div>
        </div>
      </div>
      <SectionCard title="Rocks" count={rocksFor(it.id).length} onAdd={()=>openModal("rock",{initiative_id:it.id})} addLabel="Add Rock" empty="No rocks under this initiative yet.">
        {rocksFor(it.id).map(rk=>(
          <Row key={rk.id} onClick={()=>{ setTab("rocks"); setSelRock(rk); }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:C.text, fontFamily:FONT }}>{rk.title}</div>
              <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{rk.quarter||"\u2014"} \u00b7 {projForRock(rk.id).length} projects</div>
            </div>
            {typeof rk.progress==="number" && <span style={{ fontSize:11, color:C.text3, fontFamily:MONO }}>{rk.progress}%</span>}
            <Pill status={rk.status} />
          </Row>
        ))}
      </SectionCard>
      <SectionCard title="Projects (directly under initiative)" count={projForInit(it.id).length} onAdd={()=>openModal("proj",{initiative_id:it.id})} addLabel="Add Project" empty="No standalone projects under this initiative.">
        {projForInit(it.id).map((pj,idx)=><ProjectRow key={pj.id} p={pj} i={idx} />)}
      </SectionCard>
    </>
  );

  const RockDetail = ({ rk }) => (
    <>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <button onClick={()=>setSelRock(null)} style={crumbBtn(false)}>{"\u2039"} Rocks</button>
        <span style={{color:C.text3}}>{"\u203a"}</span><span style={{color:C.gold,fontWeight:700,fontFamily:FONT,fontSize:13}}>{rk.title}</span>
      </div>
      <div style={{ ...cardWrap, padding:"16px 18px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:SERIF, fontSize:18, color:C.text, marginBottom:4 }}>{rk.title}</div>
            {rk.initiative_id && initiativeById(rk.initiative_id) && <div style={{ fontSize:11, color:C.blue, fontFamily:FONT, marginBottom:4 }}>{"\ud83c\udfaf"} {initiativeById(rk.initiative_id).name}</div>}
            {rk.description && <div style={{ fontSize:13, color:C.text2, fontFamily:FONT }}>{rk.description}</div>}
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:6 }}>{rk.quarter||"No quarter"}{rk.due_date?` \u00b7 due ${rk.due_date}`:""} \u00b7 {rk.progress||0}%</div>
            {ownerName(rk) && <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>Owner: <span style={{ color:C.text2, fontWeight:600 }}>{ownerName(rk)}</span></div>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
            <Sel value={rk.status} onChange={v=>{ setStatus("rocks",rk.id,v); setSelRock({...rk,status:v}); }} options={ROCK_STATUS} />
            <GoldButton small outline onClick={()=>openModal("rock",{},rk)}>{"\u270e"} Edit</GoldButton>
            <button onClick={()=>del("rocks",rk.id)} style={{ background:"none", border:"none", color:C.red, fontSize:11, fontFamily:FONT, cursor:"pointer", padding:0 }}>Delete</button>
          </div>
        </div>
      </div>
      <SectionCard title="Projects" count={projForRock(rk.id).length} onAdd={()=>openModal("proj",{initiative_id:rk.initiative_id,rock_id:rk.id})} addLabel="Add Project" empty="No projects under this rock yet.">
        {projForRock(rk.id).map((pj,idx)=><ProjectRow key={pj.id} p={pj} i={idx} />)}
      </SectionCard>
    </>
  );

  const ProjectDetail = ({ pj }) => (
    <>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <button onClick={()=>setSelProj(null)} style={crumbBtn(false)}>{"\u2039"} Projects</button>
        <span style={{color:C.text3}}>{"\u203a"}</span><span style={{color:C.gold,fontWeight:700,fontFamily:FONT,fontSize:13}}>{pj.name}</span>
      </div>
      <div style={{ ...cardWrap, padding:"16px 18px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:SERIF, fontSize:18, color:C.text, marginBottom:4 }}>{pj.name}</div>
            {pj.description && <div style={{ fontSize:13, color:C.text2, fontFamily:FONT }}>{pj.description}</div>}
            {ownerName(pj) && <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:4 }}>Owner: <span style={{ color:C.text2, fontWeight:600 }}>{ownerName(pj)}</span></div>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
            <Sel value={pj.status} onChange={v=>{ setStatus("projects",pj.id,v); setSelProj({...pj,status:v}); }} options={PROJ_STATUS} />
            <GoldButton small outline onClick={()=>openModal("proj",{},pj)}>{"\u270e"} Edit</GoldButton>
            <button onClick={()=>del("projects",pj.id)} style={{ background:"none", border:"none", color:C.red, fontSize:11, fontFamily:FONT, cursor:"pointer", padding:0 }}>Delete</button>
          </div>
        </div>
      </div>
      <SectionCard title="Tasks" count={tasksForProj(pj.id).length} onAdd={()=>openModal("task",{project_id:pj.id})} addLabel="Add Task" empty="No tasks on this project yet.">
        {tasksForProj(pj.id).map(t=><TaskRow key={t.id} t={t} />)}
      </SectionCard>
    </>
  );

  let body;
  if(tab==="initiatives"){
    body = selInit ? <InitiativeDetail it={selInit} /> : (
      <SectionCard title="Initiatives" count={inits.length} onAdd={()=>openModal("init")} addLabel="Add Initiative" empty="No initiatives yet. Add your first strategic initiative.">
        {inits.map(it=>(
          <Row key={it.id} onClick={()=>setSelInit(it)}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:C.text, fontFamily:FONT }}>{it.name}</div>
              {it.horizon_label && <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{it.horizon_label}</div>}
            </div>
            <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{rocksFor(it.id).length} rocks \u00b7 {projForInit(it.id).length} projects</span>
            <Pill status={it.status} />
          </Row>
        ))}
      </SectionCard>
    );
  } else if(tab==="rocks"){
    body = selRock ? <RockDetail rk={selRock} /> : (
      <SectionCard title="Rocks" count={rocks.length} onAdd={()=>openModal("rock")} addLabel="Add Rock" empty="No rocks yet. Rocks are quarterly priorities under an initiative.">
        {rocks.map(rk=>(
          <Row key={rk.id} onClick={()=>setSelRock(rk)}>
            <div style={{ flex:1 }}>
              {rk.initiative_id && initiativeById(rk.initiative_id) && <div style={{ fontSize:9.5, fontWeight:700, color:C.blue, fontFamily:FONT, marginBottom:2 }}>{"\ud83c\udfaf"} {initiativeById(rk.initiative_id).name}</div>}
              <div style={{ fontSize:14, fontWeight:600, color:C.text, fontFamily:FONT }}>{rk.title}</div>
              <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{rk.quarter||"\u2014"} \u00b7 {projForRock(rk.id).length} projects</div>
            </div>
            {typeof rk.progress==="number" && <span style={{ fontSize:11, color:C.text3, fontFamily:MONO }}>{rk.progress}%</span>}
            <Pill status={rk.status} />
          </Row>
        ))}
      </SectionCard>
    );
  } else if(tab==="projects"){
    body = selProj ? <ProjectDetail pj={selProj} /> : (
      <SectionCard title="Projects" count={projects.length} onAdd={()=>openModal("proj")} addLabel="Add Project" empty="No projects yet.">
        {projects.map((pj,idx)=><ProjectRow key={pj.id} p={pj} i={idx} />)}
      </SectionCard>
    );
  } else { // tasks
    const topTasks = tasks.filter(t=>!t.parent_task_id);
    body = (
      <SectionCard title="Tasks" count={topTasks.length} onAdd={()=>openModal("task")} addLabel="Add Task" empty="No tasks yet. Tasks live under a project.">
        {topTasks.map(t=><TaskRow key={t.id} t={t} showProject />)}
      </SectionCard>
    );
  }

  return (
    <div style={{ padding:"20px 24px" }}>
      <div style={{ display:isMobile?"block":"flex", alignItems:"flex-start" }}>
        <SubNav />
        <div style={{ flex:1, minWidth:0 }}>{body}</div>
      </div>

      {openTask && (
        <PlanTaskModal task={tasks.find(t=>t.id===openTask.id)||openTask} allTasks={tasks} members={members}
          onClose={()=>setOpenTask(null)} onUpdate={taskUpdate} onDelete={taskDelete} onAddSub={taskAddSub} />
      )}

      {modal==="init" && (
        <Modal title={editing?"Edit Initiative":"New Initiative"} onClose={()=>setModal(null)} maxWidth={460}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Name" value={form.name} onChange={v=>set("name",v)} placeholder="e.g. Dominate Tampa luxury market" autoFocus />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Horizon" value={form.horizon_label} onChange={v=>set("horizon_label",v)} placeholder="e.g. 3-year" />
              <Sel label="Status" value={form.status} onChange={v=>set("status",v)} options={INIT_STATUS} />
            </div>
            <Sel label="Owner" value={form.owner_user_id} onChange={v=>set("owner_user_id",v)} options={ownerOptions} />
            <Field label="Priority (number)" value={form.priority} onChange={v=>set("priority",v)} placeholder="0" />
            <Field label="Mission link" value={form.mission_link} onChange={v=>set("mission_link",v)} placeholder="Optional" />
            <Field label="Description" value={form.description} onChange={v=>set("description",v)} placeholder="Optional" />
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={save} disabled={saving||!(form.name||"").trim()}>{saving?"Saving\u2026":(editing?"Save changes":"Add Initiative")}</GoldButton>
              <GoldButton onClick={()=>setModal(null)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
      {modal==="rock" && (
        <Modal title={editing?"Edit Rock":"New Rock"} onClose={()=>setModal(null)} maxWidth={460}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Sel label="Initiative" value={form.initiative_id} onChange={v=>set("initiative_id",v)}
              options={[{value:"",label:"\u2014 Select an initiative \u2014"}, ...inits.map(it=>({value:it.id,label:it.name}))]} />
            <Field label="Title" value={form.title} onChange={v=>set("title",v)} placeholder="e.g. Close 10 listings this quarter" autoFocus />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel label="Status" value={form.status} onChange={v=>set("status",v)} options={ROCK_STATUS} />
              <Field label="Quarter" value={form.quarter} onChange={v=>set("quarter",v)} placeholder="e.g. Q3 2026" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Due date" value={form.due_date} onChange={v=>set("due_date",v)} type="date" />
              <Field label="Progress %" value={form.progress} onChange={v=>set("progress",v)} placeholder="0" />
            </div>
            <Sel label="Owner" value={form.owner_user_id} onChange={v=>set("owner_user_id",v)} options={ownerOptions} />
            <Field label="Description" value={form.description} onChange={v=>set("description",v)} placeholder="Optional" />
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={save} disabled={saving||!(form.title||"").trim()||!form.initiative_id}>{saving?"Saving\u2026":(editing?"Save changes":"Add Rock")}</GoldButton>
              <GoldButton onClick={()=>setModal(null)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
      {modal==="proj" && (
        <Modal title={editing?"Edit Project":"New Project"} onClose={()=>setModal(null)} maxWidth={460}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Sel label="Initiative" value={form.initiative_id} onChange={v=>{ set("initiative_id",v); set("rock_id",""); }}
              options={[{value:"",label:"\u2014 Select an initiative \u2014"}, ...inits.map(it=>({value:it.id,label:it.name}))]} />
            <Sel label="Attach to Rock (optional \u2014 inherits its initiative)" value={form.rock_id} onChange={v=>set("rock_id",v)}
              options={[{value:"",label:"\u2014 None (directly under initiative) \u2014"}, ...rocksFor(form.initiative_id).map(r=>({value:r.id,label:r.title}))]} />
            <Field label="Name" value={form.name} onChange={v=>set("name",v)} placeholder="e.g. Launch referral program" autoFocus />
            <Sel label="Status" value={form.status} onChange={v=>set("status",v)} options={PROJ_STATUS} />
            <Sel label="Owner" value={form.owner_user_id} onChange={v=>set("owner_user_id",v)} options={ownerOptions} />
            <Field label="Description" value={form.description} onChange={v=>set("description",v)} placeholder="Optional" />
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={save} disabled={saving||!(form.name||"").trim()}>{saving?"Saving\u2026":(editing?"Save changes":"Add Project")}</GoldButton>
              <GoldButton onClick={()=>setModal(null)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
      {modal==="task" && (
        <Modal title={editing?"Edit Task":"New Task"} onClose={()=>setModal(null)} maxWidth={440}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Sel label="Project" value={form.project_id} onChange={v=>set("project_id",v)}
              options={[{value:"",label:"\u2014 Select a project \u2014"}, ...projects.map(p=>({value:p.id,label:p.name}))]} />
            <Field label="Title" value={form.title} onChange={v=>set("title",v)} placeholder="e.g. Draft program terms" autoFocus />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel label="Priority" value={form.priority} onChange={v=>set("priority",v)} options={[{value:"low",label:"Low"},{value:"normal",label:"Normal"},{value:"high",label:"High"},{value:"urgent",label:"Urgent"}]} />
              <Field label="Due date" value={form.due_date} onChange={v=>set("due_date",v)} type="date" />
            </div>
            <Sel label="Owner" value={form.owner_user_id} onChange={v=>set("owner_user_id",v)} options={ownerOptions} />
            <Field label="Description" value={form.description} onChange={v=>set("description",v)} placeholder="Optional" />
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={save} disabled={saving||!(form.title||"").trim()||!form.project_id}>{saving?"Saving\u2026":(editing?"Save changes":"Add Task")}</GoldButton>
              <GoldButton onClick={()=>setModal(null)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NotesView({ user }) {
  const isMobile = useIsMobile();
  const [notes,setNotes]             = useState([]);
  const [loading,setLoading]         = useState(true);
  const [editingNote,setEditingNote] = useState(null);
  const [saving,setSaving]           = useState(false);
  const [toast,setToast]             = useState(null);
  const [dragId,setDragId]           = useState(null);
  const [overId,setOverId]           = useState(null);

  const PRIO   = ["low","normal","high","urgent"];
  const PCOL   = { urgent:C.red, high:C.amber, normal:C.blue, low:C.text3 };
  const PLABEL = { urgent:"Urgent", high:"High", normal:"Normal", low:"Low" };

  const sortNotes = (arr) => [...arr].sort((a,b)=>
    (b.pinned?1:0)-(a.pinned?1:0)
    || (a.sort_order??9999)-(b.sort_order??9999)
    || new Date(b.updated_at)-new Date(a.updated_at)
  );

  const loadNotes = async () => {
    const { data } = await supabase.from("team_notes")
      .select("*").eq("org_id", ORG_ID)
      .order("pinned", {ascending:false})
      .order("sort_order", {ascending:true, nullsFirst:false})
      .order("updated_at", {ascending:false});
    setNotes(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ loadNotes(); },[]);

  const createNote = async () => {
    const minOrder = notes.reduce((m,n)=>Math.min(m, n.sort_order??0), 0);
    const { data } = await supabase.from("team_notes")
      .insert({ org_id:ORG_ID, title:"New Note", content:"", priority:"normal",
                sort_order:minOrder-1,
                created_by:creatorLabel(user), updated_by:creatorLabel(user) })
      .select().single();
    if(data){ await loadNotes(); setEditingNote(data); }
  };

  const saveNote = async () => {
    if(!editingNote) return;
    setSaving(true);
    await supabase.from("team_notes").update({
      title:    editingNote.title,
      content:  editingNote.content,
      priority: editingNote.priority||"normal",
      updated_by: creatorLabel(user),
      updated_at: new Date().toISOString(),
    }).eq("id", editingNote.id);
    setSaving(false);
    setNotes(n=>sortNotes(n.map(x=>x.id===editingNote.id?{...x,...editingNote,updated_at:new Date().toISOString()}:x)));
    setEditingNote(null);
    setToast({msg:"Note saved",type:"success"});
  };

  const deleteNote = async (id) => {
    await supabase.from("team_notes").delete().eq("id", id);
    setNotes(n=>n.filter(x=>x.id!==id));
    if(editingNote?.id===id) setEditingNote(null);
    setToast({msg:"Note deleted",type:"success"});
  };

  const togglePin = async (note) => {
    await supabase.from("team_notes").update({pinned:!note.pinned}).eq("id",note.id);
    setNotes(n=>sortNotes(n.map(x=>x.id===note.id?{...x,pinned:!x.pinned}:x)));
  };

  const cyclePriority = async (note) => {
    const next = PRIO[(PRIO.indexOf(note.priority||"normal")+1)%PRIO.length];
    setNotes(n=>n.map(x=>x.id===note.id?{...x,priority:next}:x));
    await supabase.from("team_notes").update({priority:next}).eq("id",note.id);
  };

  const persistOrder = async (ordered) => {
    await Promise.all(ordered.map((n,i)=>
      supabase.from("team_notes").update({sort_order:i}).eq("id",n.id)
    ));
  };

  // Reorder one note ahead of another; only within the same pinned-group so
  // pinned notes always stay on top.
  const reorder = async (fromId, toId) => {
    if(!fromId || fromId===toId) return;
    const list = sortNotes(notes);
    const from = list.findIndex(n=>n.id===fromId);
    const to   = list.findIndex(n=>n.id===toId);
    if(from<0||to<0) return;
    if(list[from].pinned !== list[to].pinned) return;
    const next=[...list];
    const [moved]=next.splice(from,1);
    next.splice(to,0,moved);
    const renum = next.map((n,i)=>({...n,sort_order:i}));
    setNotes(renum);
    await persistOrder(renum);
  };

  // Up/down nudge — the touch-friendly path (HTML5 drag doesn't fire on phones).
  const moveBy = async (note, dir) => {
    const list = sortNotes(notes);
    const idx  = list.findIndex(n=>n.id===note.id);
    const tgt  = idx+dir;
    if(tgt<0 || tgt>=list.length) return;
    if(list[tgt].pinned !== note.pinned) return;
    await reorder(note.id, list[tgt].id);
  };

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "";

  const thStyle = { padding:"9px 12px", fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em",
                    color:C.text3, fontWeight:700, textAlign:"center", whiteSpace:"nowrap", fontFamily:FONT };
  const tdStyle = { padding:"10px 12px", verticalAlign:"middle", fontFamily:FONT };

  const ordered = sortNotes(notes);

  const PriorityChip = ({note}) => (
    <button onClick={e=>{e.stopPropagation();cyclePriority(note);}} title="Click to change priority"
      style={{ display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer",
        background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:20,
        padding:"4px 11px", fontFamily:FONT, fontSize:11, fontWeight:600, color:C.text2,
        minHeight:isMobile?32:"auto" }}>
      <span style={{ width:8, height:8, borderRadius:"50%", background:PCOL[note.priority]||C.text3 }} />
      {PLABEL[note.priority]||"Normal"}
    </button>
  );

  return (
    <div style={{ padding:"16px", maxWidth:980 }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, fontFamily:SERIF, color:C.text, margin:"0 0 3px", letterSpacing:"-0.01em" }}>Team Notepad</h2>
          <p style={{ fontSize:12, color:C.text2, fontFamily:FONT, margin:0 }}>Shared notes for {user?.full_name?.split(" ")[0]||"the team"} and admins</p>
        </div>
        <GoldButton onClick={createNote} small>+ New Note</GoldButton>
      </div>

      {loading ? (
        <div style={{ color:C.text3, fontSize:13, fontFamily:FONT, padding:"40px 0", textAlign:"center" }}>Loading…</div>
      ) : editingNote ? (
        /* ── Editor ── */
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"22px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:12, flexWrap:"wrap" }}>
            <input value={editingNote.title}
              onChange={e=>setEditingNote(n=>({...n,title:e.target.value}))}
              placeholder="Note title"
              style={{ flex:1, minWidth:180, fontSize:18, fontWeight:700, color:C.text, fontFamily:SERIF,
                background:"transparent", border:"none", outline:"none",
                borderBottom:`1px solid ${C.border2}`, paddingBottom:8 }} />
            <div style={{ display:"flex", gap:8 }}>
              <GoldButton onClick={saveNote} disabled={saving} small>{saving?"Saving…":"Save"}</GoldButton>
              <GoldButton onClick={()=>setEditingNote(null)} outline small>Cancel</GoldButton>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <span style={{ fontSize:10, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.06em", marginRight:2 }}>Priority</span>
            {PRIO.map(p=>(
              <button key={p} onClick={()=>setEditingNote(nn=>({...nn,priority:p}))}
                style={{ cursor:"pointer", borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:600, fontFamily:FONT,
                  border:`1px solid ${(editingNote.priority||"normal")===p?PCOL[p]:C.border2}`,
                  background:(editingNote.priority||"normal")===p ? PCOL[p]+"22" : "transparent",
                  color:(editingNote.priority||"normal")===p ? C.text : C.text3,
                  display:"inline-flex", alignItems:"center", gap:6, minHeight:isMobile?36:"auto" }}>
                <span style={{ width:8,height:8,borderRadius:"50%",background:PCOL[p] }} />
                {PLABEL[p]}
              </button>
            ))}
          </div>

          <textarea
            value={editingNote.content}
            onChange={e=>setEditingNote(n=>({...n,content:e.target.value}))}
            placeholder="Write your notes here…"
            style={{ width:"100%", minHeight:360, padding:"12px 0", background:"transparent",
              border:"none", outline:"none", color:C.text2, fontSize:13, fontFamily:FONT,
              resize:"vertical", lineHeight:1.75, boxSizing:"border-box" }}
            autoFocus
          />
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, marginTop:4,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
              Last saved: {fmtDate(editingNote.updated_at)} · {editingNote.updated_by||""}
            </span>
            <GoldButton onClick={()=>deleteNote(editingNote.id)} danger small>Delete note</GoldButton>
          </div>
        </div>
      ) : (
        /* ── Note table ── */
        <div style={{ overflowX:"auto", border:`1px solid ${C.border}`, borderRadius:12, background:C.surface }}>
          <table style={{ width:"100%", minWidth:560, borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                <th style={{...thStyle, width:isMobile?54:34}}></th>
                <th style={{...thStyle, width:104}}>Priority</th>
                <th style={{...thStyle, textAlign:"left"}}>Note</th>
                {!isMobile && <th style={{...thStyle, width:150}}>Updated</th>}
                <th style={{...thStyle, width:44}}></th>
              </tr>
            </thead>
            <tbody>
              {ordered.length===0 ? (
                <tr><td colSpan={isMobile?4:5} style={{ textAlign:"center", padding:"48px 0", color:C.text3, fontSize:13, fontFamily:FONT }}>
                  No notes yet — click + New Note to get started.
                </td></tr>
              ) : ordered.map(n=>(
                <tr key={n.id}
                  draggable={!isMobile}
                  onDragStart={()=>setDragId(n.id)}
                  onDragOver={e=>{e.preventDefault(); if(overId!==n.id) setOverId(n.id);}}
                  onDrop={()=>{ reorder(dragId,n.id); setDragId(null); setOverId(null); }}
                  onDragEnd={()=>{ setDragId(null); setOverId(null); }}
                  onClick={()=>setEditingNote(n)}
                  style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer",
                    background: overId===n.id ? C.surface2 : "transparent",
                    opacity: dragId===n.id ? 0.4 : 1, transition:"background 0.1s" }}>

                  {/* drag handle / mobile nudge arrows */}
                  <td style={{...tdStyle, textAlign:"center", color:C.text3}} onClick={e=>e.stopPropagation()}>
                    {isMobile ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"center" }}>
                        <button onClick={()=>moveBy(n,-1)} title="Move up"
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, fontSize:12, lineHeight:1, padding:2 }}>▲</button>
                        <button onClick={()=>moveBy(n,1)} title="Move down"
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, fontSize:12, lineHeight:1, padding:2 }}>▼</button>
                      </div>
                    ) : (
                      <span title="Drag to reorder" style={{ cursor:"grab", fontSize:15, userSelect:"none" }}>⠿</span>
                    )}
                  </td>

                  {/* priority */}
                  <td style={{...tdStyle, textAlign:"center"}}>
                    <PriorityChip note={n} />
                  </td>

                  {/* note title + preview */}
                  <td style={{...tdStyle, textAlign:"left"}}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      {n.pinned && <span style={{ fontSize:11 }}>📌</span>}
                      <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF, letterSpacing:"-0.01em" }}>{n.title||"Untitled"}</span>
                    </div>
                    <div style={{ fontSize:11.5, color:C.text3, fontFamily:FONT, marginTop:2,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:isMobile?180:440 }}>
                      {(n.content||"Empty note").replace(/\n/g," ").slice(0,160)}
                    </div>
                  </td>

                  {/* updated (desktop only) */}
                  {!isMobile && (
                    <td style={{...tdStyle, textAlign:"center", color:C.text3, fontSize:11, whiteSpace:"nowrap"}}>
                      <div>{fmtDate(n.updated_at)}</div>
                      <div style={{ color:C.text3 }}>{n.updated_by||n.created_by||""}</div>
                    </td>
                  )}

                  {/* pin */}
                  <td style={{...tdStyle, textAlign:"center"}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>togglePin(n)} title={n.pinned?"Unpin":"Pin to top"}
                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:14,
                        color:n.pinned?C.gold:C.text3, lineHeight:1, padding:4 }}>
                      {n.pinned?"📌":"📍"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ROBOTS PAGE + ARI CHAT (Phase 3 — Javier only)
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// CALENDAR — Phase 5
// Shared between main app (CalendarView) and agent portal
// ════════════════════════════════════════════════════════════

const EVENT_TYPES = {
  showing:    { label:"Showing",    color:"#3b82f6" },
  open_house: { label:"Open House", color:"#D4AF37" },
  training:   { label:"Training",   color:"#a855f7" },
  meeting:    { label:"Meeting",    color:"#22c55e" },
  deadline:   { label:"Deadline",   color:"#ef4444" },
  event:      { label:"Event",      color:"#94a3b8" },
};

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function CalendarView({ user, isPortal=false, agentContact=null }) {
  const today       = new Date();
  const [cur, setCur]         = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents]   = useState([]);
  const [selectedDay, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [form, setForm]       = useState({
    title:"", event_date:"", start_time:"", end_time:"",
    event_type:"event", visibility:"org", description:"",
  });
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const isAdmin = ["admin","owner"].includes(user?.role);
  const canCreateOrg = isAdmin && !isPortal;

  const loadEvents = async () => {
    const monthStart = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-01`;
    const nextMonth  = new Date(cur.getFullYear(), cur.getMonth()+2, 1);
    const monthEnd   = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth()).padStart(2,"0")}-${String(new Date(nextMonth-1).getDate()).padStart(2,"0")}`;

    let q = supabase.from("org_events").select("*")
      .eq("org_id", ORG_ID)
      .gte("event_date", monthStart)
      .lte("event_date", monthEnd)
      .order("event_date").order("start_time");

    // Agents see org events + their own personal events
    if(isPortal && agentContact) {
      q = supabase.from("org_events").select("*")
        .eq("org_id", ORG_ID)
        .gte("event_date", monthStart)
        .lte("event_date", monthEnd)
        .or(`visibility.eq.org,created_by.eq.${agentContact.email||"__none__"},contact_id.eq.${agentContact.id}`)
        .order("event_date").order("start_time");
    }

    const { data } = await q;
    setEvents(data||[]);
  };

  useEffect(()=>{ loadEvents(); },[cur.getMonth(), cur.getFullYear()]);

  const addEvent = async () => {
    if(!form.title.trim()||!form.event_date) return;
    setSaving(true);
    const payload = {
      ...form,
      org_id: ORG_ID,
      created_by: user?.email || agentContact?.email,
      contact_id: isPortal && form.visibility==="personal" ? agentContact?.id : null,
      visibility: isPortal ? "personal" : form.visibility,
    };
    const { error } = await supabase.from("org_events").insert(payload);
    setSaving(false);
    if(!error){
      setShowAdd(false);
      setForm({title:"",event_date:"",start_time:"",end_time:"",event_type:"event",visibility:"org",description:""});
      loadEvents();
      setToast({msg:"Event added",type:"success"});
    }
  };

  const deleteEvent = async (id) => {
    await supabase.from("org_events").delete().eq("id",id);
    loadEvents();
    setSel(null);
    setToast({msg:"Event removed",type:"success"});
  };

  // Build month grid
  const year  = cur.getFullYear();
  const month = cur.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  const cells = [];
  // prev month tail
  for(let i = firstDay-1; i >= 0; i--)
    cells.push({day: daysInPrev-i, curr:false, date:null});
  // this month
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({day:d, curr:true, date:dateStr});
  }
  // next month pad to complete grid
  const remaining = 42 - cells.length;
  for(let d=1; d<=remaining; d++)
    cells.push({day:d, curr:false, date:null});

  const eventsOn = (dateStr) => events.filter(e=>e.event_date===dateStr);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const selEvents = selectedDay ? eventsOn(selectedDay) : [];

  // Upcoming events (next 14 days from today)
  const upcoming = events.filter(e=>e.event_date>=todayStr).slice(0,8);

  return (
    <div style={{ padding:"16px", maxWidth:1000 }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={()=>setCur(new Date(year,month-1,1))} style={{
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
              color:C.text2, fontSize:16, cursor:"pointer", padding:"5px 10px",
              lineHeight:1, transition:"color 0.1s" }}
              onMouseEnter={e=>e.currentTarget.style.color=C.gold}
              onMouseLeave={e=>e.currentTarget.style.color=C.text2}>‹</button>
            <button onClick={()=>setCur(new Date(year,month+1,1))} style={{
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
              color:C.text2, fontSize:16, cursor:"pointer", padding:"5px 10px",
              lineHeight:1, transition:"color 0.1s" }}
              onMouseEnter={e=>e.currentTarget.style.color=C.gold}
              onMouseLeave={e=>e.currentTarget.style.color=C.text2}>›</button>
          </div>
          <h2 style={{ fontSize:18, fontWeight:700, fontFamily:SERIF, color:C.text,
            margin:0, letterSpacing:"-0.01em" }}>
            {MONTHS[month]} {year}
          </h2>
          <button onClick={()=>setCur(new Date(today.getFullYear(),today.getMonth(),1))}
            style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6,
              color:C.text3, fontSize:11, fontFamily:FONT, cursor:"pointer", padding:"4px 10px" }}>
            Today
          </button>
        </div>
        <GoldButton small onClick={()=>{ setForm(f=>({...f,event_date:selectedDay||todayStr})); setShowAdd(true); }}>
          + Add Event
        </GoldButton>
      </div>

      <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
        {/* Calendar grid */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {DAYS.map(d=>(
              <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700,
                color:C.text3, fontFamily:FONT, textTransform:"uppercase",
                letterSpacing:"0.08em", padding:"4px 0" }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {cells.map((cell,i)=>{
              const dayEvs  = cell.date ? eventsOn(cell.date) : [];
              const isToday = cell.date===todayStr;
              const isSel   = cell.date===selectedDay;
              return (
                <div key={i}
                  onClick={()=>cell.curr&&cell.date&&setSel(cell.date===selectedDay?null:cell.date)}
                  style={{
                    minHeight:72, padding:"6px 7px",
                    background: isSel ? C.goldDim : C.surface,
                    border:`1px solid ${isSel?C.goldBorder:C.border}`,
                    borderRadius:8, cursor:cell.curr?"pointer":"default",
                    opacity:cell.curr?1:0.3, transition:"all 0.1s",
                  }}
                  onMouseEnter={e=>{ if(cell.curr&&!isSel) e.currentTarget.style.background=C.surface2; }}
                  onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background=cell.curr?C.surface:"transparent"; }}>
                  <div style={{ fontSize:12, fontWeight:isToday?700:400,
                    color:isToday?C.gold:cell.curr?C.text:C.text3,
                    fontFamily:FONT, marginBottom:4,
                    ...(isToday?{ background:C.goldDim, borderRadius:20,
                      width:22, height:22, display:"flex", alignItems:"center",
                      justifyContent:"center", margin:"0 auto 4px" }:{})
                  }}>{cell.day}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    {dayEvs.slice(0,2).map(ev=>(
                      <div key={ev.id} style={{
                        fontSize:10, fontWeight:600, fontFamily:FONT,
                        color:"#0a0a0a", padding:"1px 5px", borderRadius:4,
                        background:EVENT_TYPES[ev.event_type]?.color||C.text3,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      }}>{ev.title}</div>
                    ))}
                    {dayEvs.length>2&&(
                      <div style={{ fontSize:9, color:C.text3, fontFamily:FONT, paddingLeft:4 }}>
                        +{dayEvs.length-2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Event type legend */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:14, paddingTop:12,
            borderTop:`1px solid ${C.border}` }}>
            {Object.entries(EVENT_TYPES).map(([k,v])=>(
              <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:3, background:v.color }} />
                <span style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — selected day or upcoming */}
        <div style={{ width:240, flexShrink:0, display:"none" }}
          className="cal-right-panel">
          {selectedDay ? (
            <div style={{ background:C.surface, border:`1px solid ${C.goldBorder}`,
              borderRadius:12, padding:"16px 16px", overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.gold, fontFamily:FONT }}>
                  {new Date(selectedDay+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                </div>
                <button onClick={()=>setSel(null)} style={{ background:"none", border:"none",
                  color:C.text3, fontSize:14, cursor:"pointer", padding:2 }}>✕</button>
              </div>
              {selEvents.length===0 ? (
                <div style={{ fontSize:12, color:C.text3, fontFamily:FONT, padding:"16px 0", textAlign:"center" }}>
                  No events
                  <div style={{ marginTop:8 }}>
                    <GoldButton small outline onClick={()=>{ setForm(f=>({...f,event_date:selectedDay})); setShowAdd(true); }}>
                      + Add one
                    </GoldButton>
                  </div>
                </div>
              ) : selEvents.map(ev=>(
                <div key={ev.id} style={{ marginBottom:10, padding:"10px 12px",
                  background:C.surface2, borderRadius:9,
                  borderLeft:`3px solid ${EVENT_TYPES[ev.event_type]?.color||C.text3}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text, fontFamily:FONT,
                    marginBottom:3 }}>{ev.title}</div>
                  {(ev.start_time||ev.end_time)&&(
                    <div style={{ fontSize:11, color:C.text3, fontFamily:MONO }}>
                      {ev.start_time}{ev.end_time?` – ${ev.end_time}`:""}
                    </div>
                  )}
                  {ev.description&&(
                    <div style={{ fontSize:11, color:C.text3, fontFamily:FONT,
                      marginTop:4, lineHeight:1.5 }}>{ev.description}</div>
                  )}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:6 }}>
                    <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4,
                      background:EVENT_TYPES[ev.event_type]?.color||C.text3,
                      color:"#0a0a0a", fontWeight:700, fontFamily:FONT }}>
                      {EVENT_TYPES[ev.event_type]?.label||ev.event_type}
                    </span>
                    {(canCreateOrg || ev.created_by===user?.email || ev.created_by===agentContact?.email) && (
                      <button onClick={()=>deleteEvent(ev.id)}
                        style={{ background:"none", border:"none", color:C.text3,
                          fontSize:11, cursor:"pointer", fontFamily:FONT, padding:2 }}
                        onMouseEnter={e=>e.currentTarget.style.color=C.red}
                        onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                  textTransform:"uppercase", letterSpacing:"0.08em" }}>Upcoming</span>
              </div>
              {upcoming.length===0 ? (
                <div style={{ padding:"24px 14px", textAlign:"center",
                  color:C.text3, fontSize:12, fontFamily:FONT }}>No upcoming events</div>
              ) : upcoming.map(ev=>(
                <div key={ev.id}
                  onClick={()=>setSel(ev.event_date)}
                  style={{ padding:"11px 14px", borderBottom:`1px solid ${C.border}`,
                    cursor:"pointer", borderLeft:`3px solid ${EVENT_TYPES[ev.event_type]?.color||C.text3}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:FONT,
                    marginBottom:2 }}>{ev.title}</div>
                  <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>
                    {new Date(ev.event_date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                    {ev.start_time ? ` · ${ev.start_time}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add event modal */}
      {showAdd&&(
        <Modal title="New Event" onClose={()=>setShowAdd(false)} maxWidth={480}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Title" value={form.title} onChange={v=>setF("title",v)} placeholder="e.g. Open House" autoFocus />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <Field label="Date"       value={form.event_date}  onChange={v=>setF("event_date",v)}  type="date" />
              <Field label="Start time" value={form.start_time}  onChange={v=>setF("start_time",v)}  placeholder="10:00 AM" />
              <Field label="End time"   value={form.end_time}    onChange={v=>setF("end_time",v)}    placeholder="12:00 PM" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel label="Type" value={form.event_type} onChange={v=>setF("event_type",v)}
                options={Object.entries(EVENT_TYPES).map(([k,v])=>({value:k,label:v.label}))} />
              {canCreateOrg && (
                <Sel label="Visibility" value={form.visibility} onChange={v=>setF("visibility",v)}
                  options={[{value:"org",label:"Org-wide"},{value:"personal",label:"Personal"}]} />
              )}
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Notes</label>
              <textarea value={form.description} onChange={e=>setF("description",e.target.value)}
                placeholder="Optional details…" rows={2}
                style={{ width:"100%", padding:"9px 12px", background:C.surface2,
                  border:`1px solid ${C.border2}`, borderRadius:7, color:C.text,
                  fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical",
                  boxSizing:"border-box" }} />
            </div>
            {!canCreateOrg&&isPortal&&(
              <div style={{ fontSize:11, color:C.text3, fontFamily:FONT,
                background:C.surface2, borderRadius:7, padding:"8px 12px" }}>
                This event will be personal (visible only to you).
              </div>
            )}
            <div style={{ display:"flex", gap:10, paddingTop:4 }}>
              <GoldButton onClick={addEvent} disabled={saving||!form.title.trim()||!form.event_date}>
                {saving?"Saving…":"Add event"}
              </GoldButton>
              <GoldButton onClick={()=>setShowAdd(false)} outline>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===== Robot chat: markdown rendering + document export =====
function mdInline(text){
  if(!text) return null;
  const t=String(text); let out=[],last=0,key=0,m;
  const moneyC=(s)=>{ const c=String(s||"").trim().replace(/\*\*/g,""); if(!/\$/.test(c)) return null; if(/^-\$|^-[\d,]|^\(-/.test(c)) return C.red; if(/^\+\$/.test(c)) return C.green; return null; };
  const re=/(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  while((m=re.exec(t))){
    if(m.index>last) out.push(t.slice(last,m.index));
    if(m[2]!==undefined||m[3]!==undefined){ const inner=m[2]??m[3]; const mc=moneyC(inner); out.push(<strong key={key++} style={{color:mc||C.text,fontWeight:700}}>{inner}</strong>); }
    else if(m[4]!==undefined||m[5]!==undefined) out.push(<em key={key++}>{m[4]??m[5]}</em>);
    else if(m[6]!==undefined) out.push(<code key={key++} style={{fontFamily:MONO,fontSize:"0.9em",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:4,padding:"1px 5px"}}>{m[6]}</code>);
    else if(m[7]!==undefined) out.push(<a key={key++} href={m[8]} target="_blank" rel="noreferrer" style={{color:C.blue,textDecoration:"underline"}}>{m[7]}</a>);
    last=re.lastIndex;
  }
  if(last<t.length) out.push(t.slice(last));
  return out;
}

function parseMarkdown(src){
  const lines=String(src||"").replace(/\r/g,"").split("\n");
  const blocks=[]; let i=0;
  const isSep=(s)=> s!==undefined && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(s);
  const splitRow=(s)=> s.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim());
  const startsBlock=(s,next)=> /^(#{1,6}\s|```|\s*>)/.test(s) || /^\s*([-*+]\s+|\d+\.\s+)/.test(s) || /^\s*(---|\*\*\*|___)\s*$/.test(s) || (s.includes("|")&&isSep(next));
  while(i<lines.length){
    const line=lines[i];
    if(!line.trim()){ i++; continue; }
    if(/^```/.test(line)){ const buf=[]; i++; while(i<lines.length&&!/^```/.test(lines[i])){ buf.push(lines[i]); i++; } i++; blocks.push({type:"code",text:buf.join("\n")}); continue; }
    if(/^\s*(---|\*\*\*|___)\s*$/.test(line)){ blocks.push({type:"hr"}); i++; continue; }
    const h=line.match(/^(#{1,6})\s+(.*)$/);
    if(h){ blocks.push({type:"heading",level:h[1].length,text:h[2].trim()}); i++; continue; }
    if(/^\s*>\s?/.test(line)){ const buf=[]; while(i<lines.length&&/^\s*>\s?/.test(lines[i])){ buf.push(lines[i].replace(/^\s*>\s?/,"")); i++; } blocks.push({type:"quote",text:buf.join("\n")}); continue; }
    if(line.includes("|")&&isSep(lines[i+1])){ const headers=splitRow(line); i+=2; const rows=[]; while(i<lines.length&&lines[i].includes("|")&&lines[i].trim()){ rows.push(splitRow(lines[i])); i++; } blocks.push({type:"table",headers,rows}); continue; }
    if(/^\s*([-*+]\s+|\d+\.\s+)/.test(line)){ const ordered=/^\s*\d+\.\s+/.test(line); const items=[]; while(i<lines.length&&/^\s*([-*+]\s+|\d+\.\s+)/.test(lines[i])){ items.push(lines[i].replace(/^\s*([-*+]\s+|\d+\.\s+)/,"")); i++; } blocks.push({type:"list",ordered,items}); continue; }
    const buf=[line]; i++;
    while(i<lines.length&&lines[i].trim()&&!startsBlock(lines[i],lines[i+1])){ buf.push(lines[i]); i++; }
    blocks.push({type:"paragraph",text:buf.join("\n")});
  }
  return blocks;
}

function MarkdownMessage({ text, accent=C.gold }){
  const blocks = parseMarkdown(text);
  const moneyC=(s)=>{ const c=String(s||"").replace(/\*\*/g,"").trim(); if(!/\$/.test(c)) return null; if(/^-\$|^-[\d,]|^\(-/.test(c)) return C.red; if(/^\+\$/.test(c)) return C.green; return null; };
  const valC=(raw)=>moneyC(raw)||C.text2;
  const isKpi=(b)=> b.type==="table" && b.headers.length===2 && b.rows.length>=1 && b.rows.length<=8;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:13, fontSize:13.5, color:C.text2, fontFamily:FONT, lineHeight:1.65 }}>
      {blocks.map((b,i)=>{
        /* ── Heading ── */
        if(b.type==="heading"){ const big=b.level<=2; const sz=b.level===1?20:b.level===2?16:14; return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:9, marginTop:i?6:0, paddingBottom:big?9:0, borderBottom:big?`1px solid ${accent}2a`:"none" }}>
            <div style={{ width:3, height:sz+6, background:accent, borderRadius:2, flexShrink:0, opacity:big?1:0.6 }}/>
            <span style={{ fontSize:sz, fontWeight:800, color:C.text, fontFamily:SERIF, lineHeight:1.25 }}>{mdInline(b.text)}</span>
          </div>
        ); }
        /* ── Divider ── */
        if(b.type==="hr") return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, margin:"2px 0" }}>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${accent}55,transparent)` }}/>
            <div style={{ width:5, height:5, borderRadius:"50%", background:accent, opacity:0.4 }}/>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg,transparent,${accent}33)` }}/>
          </div>
        );
        /* ── Blockquote ── */
        if(b.type==="quote") return (
          <div key={i} style={{ borderLeft:`3px solid ${accent}`, background:accent+"11", padding:"10px 14px", borderRadius:"0 10px 10px 0", color:C.text2 }}>{mdInline(b.text)}</div>
        );
        /* ── Code ── */
        if(b.type==="code") return (
          <pre key={i} style={{ background:"#0c0c0c", border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", overflowX:"auto", margin:0, fontFamily:MONO, fontSize:12, color:C.text, lineHeight:1.5 }}>{b.text}</pre>
        );
        /* ── List ── */
        if(b.type==="list") return (
          <div key={i} style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {b.items.map((it,j)=>(
              <div key={j} style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
                <div style={{ flexShrink:0, marginTop:b.ordered?2:7,
                  ...(b.ordered
                    ? { width:18, height:18, borderRadius:5, background:accent+"22", border:`1px solid ${accent}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:accent, fontFamily:MONO }
                    : { width:5, height:5, borderRadius:"50%", background:accent }) }}>{b.ordered?j+1:""}</div>
                <div style={{ flex:1, color:C.text2, lineHeight:1.65 }}>{mdInline(it)}</div>
              </div>
            ))}
          </div>
        );
        /* ── KPI tiles: 2-col table ≤8 rows ── */
        if(isKpi(b)) return (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:9 }}>
            {b.rows.map((r,ri)=>{
              const raw=String(r[1]||""); const vc=valC(raw);
              return (
                <div key={ri} style={{ background:C.surface2, border:`1px solid ${vc!==C.text2?vc+"33":C.border}`, borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:10, color:C.text3, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:700, marginBottom:5, fontFamily:FONT }}>{mdInline(r[0])}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:vc, fontFamily:SERIF, lineHeight:1 }}>{mdInline(raw)}</div>
                </div>
              );
            })}
          </div>
        );
        /* ── Table ── */
        if(b.type==="table") return (
          <div key={i} style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${C.border}` }}>
            <table style={{ borderCollapse:"collapse", width:"100%", fontSize:13, fontFamily:FONT }}>
              <thead><tr style={{ background:`${accent}1a` }}>
                {b.headers.map((hd,j)=><th key={j} style={{ textAlign:"left", padding:"10px 14px", color:C.text, fontWeight:700, fontFamily:SERIF, borderBottom:`2px solid ${accent}44`, whiteSpace:"nowrap", fontSize:12 }}>{mdInline(hd)}</th>)}
              </tr></thead>
              <tbody>{b.rows.map((r,ri)=>(
                <tr key={ri} style={{ background:ri%2?C.surface2:"transparent" }}>
                  {r.map((c,ci)=>{ const vc=ci>0?valC(c):null; return <td key={ci} style={{ padding:"9px 14px", color:vc||C.text2, borderTop:`1px solid ${C.border}`, whiteSpace:"nowrap", fontWeight:vc&&vc!==C.text2?700:400 }}>{mdInline(c)}</td>; })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        );
        /* ── Paragraph ── */
        return (
          <div key={i} style={{ lineHeight:1.65, color:C.text2 }}>
            {b.text.split("\n").map((ln,j)=> j===0?<span key={j}>{mdInline(ln)}</span>:[<br key={"br"+j}/>,<span key={"s"+j}>{mdInline(ln)}</span>])}
          </div>
        );
      })}
    </div>
  );
}

function loadScript(src){
  return new Promise((res,rej)=>{
    if(document.querySelector(`script[src="${src}"]`)) return res();
    const s=document.createElement("script"); s.src=src; s.onload=()=>res(); s.onerror=()=>rej(new Error("load "+src)); document.head.appendChild(s);
  });
}
const MD_CDN={
  jspdf:"https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  autotable:"https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
  pptx:"https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.min.js",
  xlsx:"https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
};
const stripInline=(s)=> String(s==null?"":s).replace(/\*\*([^*]+)\*\*/g,"$1").replace(/__([^_]+)__/g,"$1").replace(/\*([^*]+)\*/g,"$1").replace(/`([^`]+)`/g,"$1").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/^#{1,6}\s+/,"").trim();
const docName=(t,ext)=> (String(t||"ari").replace(/[^\w-]+/g,"_").slice(0,60)||"ari")+"."+ext;

async function exportPDF(blocks,title){
  await loadScript(MD_CDN.jspdf); await loadScript(MD_CDN.autotable);
  const { jsPDF }=window.jspdf; const doc=new jsPDF({unit:"pt",format:"letter"});
  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight(), M=48; let y=64;
  const ensure=(h)=>{ if(y+h>H-48){ doc.addPage(); y=64; } };
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(20); doc.text(stripInline(title)||"Ari Document",M,y); y+=10;
  doc.setDrawColor(212,175,55); doc.setLineWidth(2); doc.line(M,y,W-M,y); y+=24; doc.setTextColor(40);
  blocks.forEach(b=>{
    if(b.type==="heading"){ ensure(28); doc.setFont("helvetica","bold"); doc.setFontSize(b.level<=1?15:b.level===2?13:12); doc.splitTextToSize(stripInline(b.text),W-2*M).forEach(ln=>{ ensure(20); doc.text(ln,M,y); y+=19; }); y+=3; }
    else if(b.type==="paragraph"||b.type==="quote"){ doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.splitTextToSize(stripInline(b.text),W-2*M).forEach(ln=>{ ensure(16); doc.text(ln,M,y); y+=15; }); y+=4; }
    else if(b.type==="list"){ doc.setFont("helvetica","normal"); doc.setFontSize(11); b.items.forEach((it,k)=>{ const pre=b.ordered?`${k+1}. `:"\u2022 "; doc.splitTextToSize(pre+stripInline(it),W-2*M-12).forEach((ln,li)=>{ ensure(15); doc.text(ln,M+(li?14:6),y); y+=14; }); }); y+=4; }
    else if(b.type==="code"){ doc.setFont("courier","normal"); doc.setFontSize(9.5); doc.splitTextToSize(b.text,W-2*M).forEach(ln=>{ ensure(13); doc.text(ln,M,y); y+=12; }); y+=4; }
    else if(b.type==="hr"){ ensure(12); doc.setDrawColor(210); doc.setLineWidth(0.5); doc.line(M,y,W-M,y); y+=14; }
    else if(b.type==="table"){ ensure(50); doc.autoTable({ startY:y, head:[b.headers.map(stripInline)], body:b.rows.map(r=>r.map(stripInline)), margin:{left:M,right:M}, styles:{fontSize:9,cellPadding:5,overflow:"linebreak"}, headStyles:{fillColor:[212,175,55],textColor:20,fontStyle:"bold"}, alternateRowStyles:{fillColor:[245,243,235]} }); y=doc.lastAutoTable.finalY+18; }
  });
  doc.save(docName(title,"pdf"));
}

async function exportXLSX(blocks,title){
  await loadScript(MD_CDN.xlsx); const XLSX=window.XLSX; const wb=XLSX.utils.book_new();
  const tables=blocks.filter(b=>b.type==="table");
  const toNum=(c)=>{ const s=stripInline(c); const n=Number(s.replace(/[$,%\s]/g,"")); return (/^[-+]?\$?[\d,]+(\.\d+)?%?$/.test(s)&&!isNaN(n))?n:s; };
  if(tables.length){ tables.forEach((t,i)=>{ const ws=XLSX.utils.aoa_to_sheet([t.headers.map(stripInline),...t.rows.map(r=>r.map(toNum))]); XLSX.utils.book_append_sheet(wb,ws,`Table ${i+1}`.slice(0,31)); }); }
  else { const rows=blocks.map(b=> b.type==="list"?b.items.map(stripInline).join("; "):stripInline(b.text)).filter(Boolean).map(t=>[t]); const ws=XLSX.utils.aoa_to_sheet([[stripInline(title)||"Ari"],[],...rows]); XLSX.utils.book_append_sheet(wb,ws,"Notes"); }
  XLSX.writeFile(wb,docName(title,"xlsx"));
}

async function exportPPTX(blocks,title){
  await loadScript(MD_CDN.pptx); const pptx=new window.PptxGenJS(); pptx.layout="LAYOUT_WIDE"; // 13.33 x 7.5
  const GOLD="D4AF37", DARK="0A0A0A";
  let s=pptx.addSlide(); s.background={color:DARK};
  s.addText(stripInline(title)||"Ari",{x:0.6,y:2.7,w:12.1,h:1.2,fontSize:40,bold:true,color:GOLD,align:"center",fontFace:"Arial"});
  s.addText("Realty ONE Group Advantage  \u00b7  Ari",{x:0.6,y:3.9,w:12.1,h:0.5,fontSize:15,color:"FFFFFF",align:"center"});
  const slides=[]; let cur=null;
  blocks.forEach(b=>{
    if(b.type==="heading"&&b.level<=2){ if(cur) slides.push(cur); cur={title:stripInline(b.text),items:[],tables:[]}; }
    else { if(!cur) cur={title:stripInline(title)||"Overview",items:[],tables:[]};
      if(b.type==="table") cur.tables.push(b);
      else if(b.type==="list") b.items.forEach(it=>cur.items.push(stripInline(it)));
      else if(b.type==="paragraph"||b.type==="quote"||b.type==="heading") cur.items.push(stripInline(b.text)); }
  });
  if(cur) slides.push(cur);
  slides.forEach(sl=>{
    const sld=pptx.addSlide(); sld.background={color:"FFFFFF"};
    sld.addText(sl.title||"",{x:0.5,y:0.35,w:12.3,h:0.8,fontSize:26,bold:true,color:DARK,fontFace:"Arial"});
    sld.addShape(pptx.ShapeType.line,{x:0.5,y:1.2,w:12.3,h:0,line:{color:GOLD,width:2}});
    let yy=1.45;
    if(sl.items.length){ const h=Math.min(4.2,0.32*sl.items.length+0.3); sld.addText(sl.items.map(t=>({text:t,options:{bullet:true,fontSize:15,color:"333333",paraSpaceAfter:6}})),{x:0.6,y:yy,w:12.1,h}); yy+=h+0.2; }
    sl.tables.forEach(t=>{ const rows=[t.headers.map(hd=>({text:stripInline(hd),options:{bold:true,color:"FFFFFF",fill:GOLD}})),...t.rows.map(r=>r.map(c=>({text:stripInline(c),options:{color:"333333"}})))]; sld.addTable(rows,{x:0.6,y:yy,w:12.1,fontSize:11,border:{type:"solid",color:"DDDDDD",pt:0.5},autoPage:false}); yy+=0.35*(t.rows.length+1)+0.3; });
  });
  pptx.writeFile({fileName:docName(title,"pptx")});
}

function MsgDocBar({ text, accent=C.gold, who="Davenport" }){
  const blocks = parseMarkdown(text);
  const hasTable = blocks.some(b=>b.type==="table");
  const [busy,setBusy]=useState("");
  const [copied,setCopied]=useState(false);
  const h=blocks.find(b=>b.type==="heading");
  const title = h?stripInline(h.text):`${who} — Ari`;
  const run=async(kind,fn)=>{ setBusy(kind); try{ await fn(); }catch(e){ alert("Couldn't generate that file — please try again."); } finally{ setBusy(""); } };
  const Btn=({label,kind,onClick})=>(
    <button onClick={onClick} disabled={!!busy} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:8,border:`1px solid ${C.border2}`,background:C.surface2,color:C.text2,fontSize:11,fontWeight:600,fontFamily:FONT,cursor:busy?"default":"pointer",opacity:busy&&busy!==kind?0.5:1,transition:"all 0.12s" }}
      onMouseEnter={e=>{ if(!busy){ e.currentTarget.style.borderColor=accent; e.currentTarget.style.color=C.text; } }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border2; e.currentTarget.style.color=C.text2; }}>
      {busy===kind?"\u2026":label}
    </button>
  );
  return (
    <div style={{ display:"flex",gap:7,marginTop:8,flexWrap:"wrap",alignItems:"center" }}>
      <span style={{ fontSize:9.5,fontWeight:700,color:C.text3,fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.06em",marginRight:2 }}>Export</span>
      <Btn label="📄 PDF" kind="pdf" onClick={()=>run("pdf",()=>exportPDF(blocks,title))} />
      <Btn label="🎞️ Slides" kind="pptx" onClick={()=>run("pptx",()=>exportPPTX(blocks,title))} />
      {hasTable && <Btn label="📊 Excel" kind="xlsx" onClick={()=>run("xlsx",()=>exportXLSX(blocks,title))} />}
      <button onClick={()=>{ try{navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1200);}catch(e){} }}
        style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:8,border:`1px solid ${C.border2}`,background:C.surface2,color:copied?C.green:C.text2,fontSize:11,fontWeight:600,fontFamily:FONT,cursor:"pointer" }}>
        {copied?"\u2713 Copied":"\u29C9 Copy"}
      </button>
    </div>
  );
}


function RobotsView({ user, deals, contacts, tasks }) {
  const isMobile = useIsMobile();
  const [robots, setRobots]       = useState([]);
  const [activeId, setActiveId]   = useState(ARI_ID);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [convId, setConvId]       = useState(null);
  const [status, setStatus]       = useState("idle");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mems, setMems]           = useState(null);
  const [finCtx, setFinCtx]       = useState("");
  const bottomRef = useRef(null);

  const robot = robots.find(r=>r.id===activeId) || null;

  // Load the robot roster
  useEffect(()=>{
    supabase.from("robots")
      .select("id,name,role,description,system_prompt,avatar_color,status,current_focus,source,suarez_name,finance_access")
      .eq("org_id", ORG_ID)
      .then(({data})=>{
        const list = data||[];
        list.sort((a,b)=> a.id===ARI_ID?-1 : b.id===ARI_ID?1 : (a.name||"").localeCompare(b.name||""));
        setRobots(list);
      });
  },[]);

  // Load the active robot's conversation for this user
  useEffect(()=>{
    if(!activeId) return;
    setMessages([]); setConvId(null);
    supabase.from("robot_conversations")
      .select("*").eq("robot_id", activeId)
      .eq("user_email", user?.email).eq("org_id", ORG_ID)
      .order("updated_at",{ascending:false}).limit(1)
      .then(({data})=>{ if(data&&data[0]){ setConvId(data[0].id); setMessages(data[0].messages||[]); } });
  },[activeId, user?.email]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  // Load memories when the profile opens
  useEffect(()=>{
    if(!profileOpen||!activeId) return;
    setMems(null);
    supabase.from("robot_memories").select("memory_type,content,updated_at")
      .eq("robot_id", activeId).order("updated_at",{ascending:false})
      .then(({data})=>setMems(data||[]));
  },[profileOpen, activeId]);

  const buildContext = () => {
    const dealSummary = deals.slice(0,20).map(d=>
      `${d.address||"Untitled"} (${d.status}, ${d.deal_type}${d.price?`, $${d.price}`:""})`
    ).join("; ");
    const agentCount = contacts.filter(c=>c.contact_type==="Agent").length;
    const openTasks  = tasks.filter(t=>t.status!=="done").length;
    return `\nLIVE ORG CONTEXT:\nDeals (${deals.length} total): ${dealSummary||"none"}\nContacts: ${contacts.length} total (${agentCount} agents)\nOpen tasks: ${openTasks}\nDate: ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}`;
  };

  const loadFinanceContext = async () => {
    const fmt = (n) => (Number(n)||0).toLocaleString("en-US",{maximumFractionDigits:0});
    const parts = [];

    // 1. Annual P&L — multi-year snapshot
    try {
      const { data:perf } = await supabase.from("brokerage_performance_yearly")
        .select("tax_year,gci,net_office,deals,volume").eq("org_id",ORG_ID).order("tax_year");
      if(perf?.length) parts.push(
        "ANNUAL BROKERAGE P&L:\n"+
        perf.map(p=>`${p.tax_year}: GCI $${fmt(p.gci)}, net office $${fmt(p.net_office)}, ${p.deals} deals, volume $${fmt(p.volume)}`).join("\n")
      );
    } catch(e){}

    // 2. Full transaction ledger from roga_financials (the master ledger)
    //    Pull the 1500 most recent; build monthly summary + provide line items.
    try {
      const { data:ledger } = await supabase.from("roga_financials")
        .select("txn_date,account,kind,vendor,description,amount,category")
        .eq("org_id",ORG_ID).order("txn_date",{ascending:false}).limit(1500);
      if(ledger?.length){
        // Monthly P&L grouped by YYYY-MM
        const byYM = {};
        ledger.forEach(t => {
          const ym = t.txn_date?.slice(0,7); if(!ym) return;
          if(!byYM[ym]) byYM[ym] = {inc:0,exp:0};
          const a = Number(t.amount)||0;
          if(t.kind==="income")  byYM[ym].inc += a;
          if(t.kind==="expense") byYM[ym].exp += a;
        });
        const monthly = Object.keys(byYM).sort().map(ym => {
          const {inc,exp} = byYM[ym]; const net = inc+exp;
          return `${ym}: income $${fmt(inc)}, expenses $${fmt(exp)}, net ${net>=0?"+":""}$${fmt(net)}`;
        });
        parts.push("MONTHLY P&L (from ledger):\n"+monthly.join("\n"));

        // Individual transactions — last 300 line items
        const lines = ledger.slice(0,300).map(t =>
          `${t.txn_date} [acct ${t.account}] ${(t.kind||"").toUpperCase()} `+
          `${Number(t.amount)>=0?"+":""}$${Math.abs(Number(t.amount)||0).toFixed(2)} — `+
          `${t.vendor||t.description||""} (${t.category||""})`
        );
        parts.push(`TRANSACTION LEDGER — last ${Math.min(ledger.length,300)} entries (${ledger.length} loaded of all time):\n`+lines.join("\n"));
      }
    } catch(e){}

    // 3. Top agents by lifetime GCI
    try {
      const { data:ag } = await supabase.from("agent_performance_lifetime")
        .select("full_name,total_deals,total_gci").eq("org_id",ORG_ID)
        .order("total_gci",{ascending:false}).limit(10);
      if(ag?.length) parts.push(
        "TOP PRODUCERS:\n"+ag.map(a=>`${a.full_name}: $${fmt(a.total_gci)} GCI, ${a.total_deals} deals`).join("\n")
      );
    } catch(e){}

    if(!parts.length) return "";
    return "\n\nFINANCIAL CONTEXT (CONFIDENTIAL — ownership only; never share with agents):\n"+parts.join("\n\n");
  };

  useEffect(()=>{
    if(!robot?.finance_access){ setFinCtx(""); return; }
    let live=true;
    (async()=>{ const c = await loadFinanceContext(); if(live) setFinCtx(c); })();
    return ()=>{ live=false; };
    /* eslint-disable-next-line */
  },[activeId, robot?.finance_access]);

  const robotPrompt = (r) => {
    const base = r?.system_prompt && r.system_prompt.trim()
      ? r.system_prompt.trim()
      : `You are ${r?.name||"an AI assistant"}, ${r?.role||"a Business Unit Leader"} at Realty ONE Group Advantage (ROGA).${r?.description?` ${r.description}`:""}${r?.current_focus?`\nCurrent focus: ${r.current_focus}`:""}`;
    const scope = r?.finance_access
      ? `You have live read access to the brokerage's deals, contacts, agent roster, tasks, AND full financials — P&L by year, monthly cash flow, operating expenses by category, bank accounts, and agent production/payouts — all provided below. You report to the ROGA ownership team: discuss the numbers candidly and analytically, surface risks, trends, and opportunities, and do the math when asked. These financials are confidential to ownership — never share or expose them to agents.`
      : `You have live read access to the brokerage's deals, contacts, agent roster, and tasks when provided below. You do NOT have access to the brokerage's company financials; if asked about company finances (revenue, expenses, P&L, payroll, cash), say that's handled by the ROGA business unit leader and ownership team and that you don't have it.`;
    return `${base}\n\nBe direct, sharp, and practical. Never start with "Certainly!" or "Of course!". Get to the point. Use bullet points for lists. Keep responses focused. ${scope}\n\nFORMATTING: Write in clean Markdown — use ## headings to organize, GFM tables (| Column | Column |) for any numeric or comparative data, bold for key figures, and bullet lists. When the user asks you to build a report, deck, spreadsheet, table, or PDF, produce well-structured Markdown with ## sections and tables — the system will handle the rest.`;
  };

  const sendMessage = async () => {
    if(!input.trim()||sending||!robot) return;
    const userMsg = { role:"user", content:input.trim(), ts:new Date().toISOString() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(""); setSending(true); setStatus("thinking");
    try {
      const apiMessages = newMsgs.map(m=>({ role:m.role==="user"?"user":"assistant", content:m.content }));
      if(robot.finance_access){
        apiMessages[apiMessages.length-1].content += buildContext() + finCtx;
      } else if(apiMessages.length===1){
        apiMessages[0].content += buildContext();
      }
      const { data:{ session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ari-chat`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "apikey":process.env.REACT_APP_SUPABASE_ANON_KEY, "Authorization":`Bearer ${session?.access_token}` },
        body: JSON.stringify({
          model:"claude-haiku-4-5-20251001", max_tokens:2000,
          endpoint:`ari_admin:${robot.name}`, user_email:user?.email,
          system: robotPrompt(robot), messages: apiMessages,
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "Sorry, I ran into an issue. Try again.";
      const botMsg = { role:"assistant", content:text, ts:new Date().toISOString() };
      const finalMsgs = [...newMsgs, botMsg];
      setMessages(finalMsgs);
      let activeConvId = convId;
      if(convId){
        await supabase.from("robot_conversations").update({ messages:finalMsgs, updated_at:new Date().toISOString() }).eq("id",convId);
      } else {
        const {data:conv} = await supabase.from("robot_conversations").insert({
          robot_id:robot.id, org_id:ORG_ID, user_email:user?.email, messages:finalMsgs,
        }).select().single();
        if(conv){ setConvId(conv.id); activeConvId=conv.id; }
      }
      // ── Log + auto-extract memories (async, non-blocking) ──────────────
      const _userMsg = input.trim();
      const _botMsg  = text;
      const _robot   = robot;
      const _convId  = activeConvId;
      const _session = session;
      ;(async()=>{
        try {
          // 1. Log both turns to robot_conversation_log
          for(const [role,content] of [["user",_userMsg],["assistant",_botMsg]]){
            await supabase.from("robot_conversation_log").insert({
              org_id:ORG_ID, robot_id:_robot.id, conversation_id:_convId,
              user_email:user?.email, role, content:content.slice(0,8000)
            });
          }
        } catch(_){}
        try {
          // 2. Auto-extract memories if this is a meaningful response (>200 chars)
          if(_botMsg.length < 200) return;
          const extractSys=`You are a memory extractor for a real estate brokerage AI. Given one exchange, extract any important facts worth saving permanently. Return ONLY a JSON array, no markdown. Each item: {"memory_type":"financial_insight|account_detail|data_quality|reconciliation|action_item|metric|strategic_finding","content":"1-2 concrete sentences with numbers/names/dates"}. Only specific, non-obvious facts. Return [] if nothing significant.`;
          const extractRes=await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ari-chat`,{
            method:"POST",
            headers:{"Content-Type":"application/json","apikey":process.env.REACT_APP_SUPABASE_ANON_KEY,"Authorization":`Bearer ${_session?.access_token}`},
            body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:600,system:extractSys,
              messages:[{role:"user",content:`User: ${_userMsg.slice(0,400)}\n\nAssistant: ${_botMsg.slice(0,1200)}`}]})
          });
          const ed=await extractRes.json();
          const raw=(ed.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim();
          const arr=JSON.parse(raw.includes("[")?raw.slice(raw.indexOf("[")):"[]");
          for(const m of arr){
            if(!m?.memory_type||!m?.content) continue;
            await supabase.from("robot_memories").insert({
              robot_id:_robot.id, org_id:ORG_ID,
              memory_type:m.memory_type, content:m.content,
              auto_extracted:true, source_conversation_id:_convId
            });
          }
        } catch(_){}
      })();
    } catch(e){
      setMessages(m=>[...m,{role:"assistant",content:"Connection error — try again.",ts:new Date().toISOString()}]);
    } finally { setSending(false); setStatus("idle"); }
  };

  const clearChat = async () => {
    if(convId) await supabase.from("robot_conversations").update({messages:[],updated_at:new Date().toISOString()}).eq("id",convId);
    setMessages([]);
  };
  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) : "";

  const RAvatar = ({ r, size }) => (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.28), flexShrink:0,
      background: r?.avatar_color || C.gold, display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:Math.round(size*0.44), fontWeight:800, color:"#fff", fontFamily:SERIF,
      boxShadow:`0 0 0 1px ${C.border}` }}>
      {(r?.name||"?").slice(0,1).toUpperCase()}
    </div>
  );
  const Section = ({ title, children }) => (
    <div>
      <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:7 }}>{title}</div>
      {children}
    </div>
  );
  const srcBadge = (src) => (src==="ari"||src==="prism") ? { t:"Native · Ari", c:C.gold } : { t:"Synced · Suarez OS", c:C.purple };

  return (
    <div style={{ display:"flex", height:"calc(100vh - 56px)", overflow:"hidden", position:"relative" }}>
      {/* Robot roster rail (desktop) */}
      {!isMobile && (
      <div style={{ width:248, background:C.surface, borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column", padding:"16px 12px", flexShrink:0, overflowY:"auto" }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
          textTransform:"uppercase", letterSpacing:"0.08em", padding:"4px 8px 10px" }}>Robots</div>
        {robots.map(r=>{
          const active = r.id===activeId; const b = srcBadge(r.source);
          return (
            <button key={r.id} onClick={()=>setActiveId(r.id)} style={{
              display:"flex", gap:11, alignItems:"center", textAlign:"left",
              padding:"10px", marginBottom:4, borderRadius:10, cursor:"pointer", width:"100%",
              background: active?C.goldDim:"transparent",
              border:`1px solid ${active?C.goldBorder:"transparent"}`, transition:"background 0.12s" }}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=C.surface2; }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
              <RAvatar r={r} size={36} />
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:C.text, fontFamily:SERIF,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.name}</div>
                <div style={{ fontSize:10.5, color:active?b.c:C.text3, fontFamily:FONT,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.role}</div>
              </div>
            </button>
          );
        })}
        <div style={{ marginTop:"auto", padding:"10px 8px 4px", display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:"50%",
            background:status==="thinking"?C.amber:C.green, animation:status==="thinking"?"pulse 1s infinite":"none" }} />
          <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{status==="thinking"?"Thinking…":"Ready"}</span>
        </div>
      </div>
      )}

      {/* Chat column */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Header bar */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px",
          borderBottom:`1px solid ${C.border}`, background:C.surface, flexShrink:0 }}>
          <RAvatar r={robot} size={38} />
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:SERIF,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{robot?.name||"…"}</div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{robot?.role||""}</div>
          </div>
          {messages.length>0 && (
            <button onClick={clearChat} style={{ background:"none", border:`1px solid ${C.border}`,
              borderRadius:8, color:C.text3, fontSize:11, fontFamily:FONT, cursor:"pointer", padding:"7px 12px" }}
              onMouseEnter={e=>e.currentTarget.style.color=C.red}
              onMouseLeave={e=>e.currentTarget.style.color=C.text3}>Clear chat</button>
          )}
          <button onClick={()=>setProfileOpen(true)} disabled={!robot} style={{
            background:C.goldDim, border:`1px solid ${C.goldBorder}`, borderRadius:8,
            color:C.gold, fontSize:11.5, fontWeight:700, fontFamily:FONT,
            cursor:robot?"pointer":"not-allowed", padding:"7px 13px", whiteSpace:"nowrap" }}>
            View Robot Profile
          </button>
        </div>

        {/* Mobile robot selector */}
        {isMobile && (
          <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"10px 14px",
            borderBottom:`1px solid ${C.border}`, background:C.surface }}>
            {robots.map(r=>(
              <button key={r.id} onClick={()=>setActiveId(r.id)} style={{
                display:"flex", gap:7, alignItems:"center", flexShrink:0, padding:"6px 11px", borderRadius:20,
                background:r.id===activeId?C.goldDim:C.surface2,
                border:`1px solid ${r.id===activeId?C.goldBorder:C.border}`, cursor:"pointer" }}>
                <RAvatar r={r} size={20} />
                <span style={{ fontSize:12.5, fontWeight:700, color:C.text, fontFamily:SERIF }}>{r.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          {messages.length===0 && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, opacity:0.75 }}>
              <RAvatar r={robot} size={52} />
              <div style={{ fontSize:14, color:C.text3, fontFamily:FONT, textAlign:"center", maxWidth:360 }}>
                {robot?.description || `Ask ${robot?.name||"this robot"} anything about your brokerage.`}
              </div>
              {robot?.current_focus && (
                <div style={{ fontSize:12, color:C.text3, fontFamily:FONT, textAlign:"center", maxWidth:400,
                  background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px" }}>
                  <b style={{color:C.text2}}>Current focus:</b> {robot.current_focus}
                </div>
              )}
            </div>
          )}
          {messages.map((m,i)=>(
            <div key={i} style={{ display:"flex", gap:12, flexDirection:m.role==="user"?"row-reverse":"row", alignItems:"flex-start" }}>
              {m.role==="assistant" ? <RAvatar r={robot} size={32} /> : <Avatar name={user?.full_name} email={user?.email} size={32} />}
              <div style={{ maxWidth:m.role==="user"?"72%":"88%", minWidth:0 }}>
                <div style={{ padding:"12px 16px", borderRadius:12,
                  background:m.role==="user"?C.goldDim:C.surface,
                  border:m.role==="user"?`1px solid ${C.goldBorder}`:`1px solid ${C.border}`,
                  wordBreak:"break-word",
                  whiteSpace:m.role==="user"?"pre-wrap":"normal",
                  fontSize:m.role==="user"?13:undefined }}>
                  {m.role==="assistant"
                    ? <MarkdownMessage text={m.content} accent={robot?.avatar_color||C.gold} />
                    : m.content}
                </div>
                {m.role==="assistant" && m.content && m.content.trim().length>40 && (
                  <MsgDocBar text={m.content} accent={robot?.avatar_color||C.gold} who={robot?.name||"Ari"} />
                )}
                <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginTop:4, textAlign:m.role==="user"?"right":"left" }}>{fmtTime(m.ts)}</div>
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <RAvatar r={robot} size={32} />
              <div style={{ padding:"12px 16px", borderRadius:12, background:C.surface, border:`1px solid ${C.border}`, display:"flex", gap:5, alignItems:"center" }}>
                {[0,1,2].map(i=>(<div key={i} style={{ width:6, height:6, borderRadius:"50%", background:robot?.avatar_color||C.gold, opacity:0.6, animation:`bounce 1s ${i*0.15}s infinite` }} />))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, background:C.surface }}>
          <div style={{ display:"flex", gap:10 }}>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
              placeholder={`Ask ${robot?.name||"…"}… (Enter to send, Shift+Enter for new line)`} rows={2}
              style={{ flex:1, padding:"11px 14px", background:C.surface2, border:`1.5px solid ${C.border2}`,
                borderRadius:10, color:C.text, fontSize:isMobile?16:13, fontFamily:FONT, outline:"none", resize:"none", lineHeight:1.5, transition:"border-color 0.15s" }}
              onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border2} />
            <button onClick={sendMessage} disabled={sending||!input.trim()} style={{
              padding:"0 20px", borderRadius:10, border:"none",
              background:sending||!input.trim()?C.surface3:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
              color:sending||!input.trim()?C.text3:"#0a0a0a", fontSize:13, fontWeight:700, fontFamily:FONT,
              cursor:sending||!input.trim()?"not-allowed":"pointer", flexShrink:0, minHeight:isMobile?44:"auto" }}>
              {sending?"…":"Send"}
            </button>
          </div>
        </div>
      </div>

      {/* Profile overlay */}
      {profileOpen && robot && (
        <div onClick={()=>setProfileOpen(false)} style={{ position:"fixed", inset:0, zIndex:1000,
          background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-start", justifyContent:"center",
          padding:isMobile?"0":"40px 20px", overflowY:"auto" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, width:"100%", maxWidth:560,
            borderRadius:isMobile?0:16, border:`1px solid ${C.border2}`, boxShadow:"0 20px 60px rgba(0,0,0,0.5)", overflow:"hidden" }}>
            <div style={{ display:"flex", gap:14, alignItems:"center", padding:"20px 22px",
              borderBottom:`1px solid ${C.border}`, background:`linear-gradient(135deg, ${robot.avatar_color}22, transparent)` }}>
              <RAvatar r={robot} size={52} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:19, fontWeight:800, color:C.text, fontFamily:SERIF }}>{robot.name}</div>
                <div style={{ fontSize:12.5, color:C.text2, fontFamily:FONT }}>{robot.role}</div>
                <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:5, fontSize:10, fontWeight:700,
                  color:srcBadge(robot.source).c, background:`${srcBadge(robot.source).c}1a`,
                  borderRadius:20, padding:"2px 9px", fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  {srcBadge(robot.source).t}
                </div>
                {robot.finance_access && (
                  <span style={{ marginTop:6, marginLeft:6, display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700,
                    color:C.gold, background:C.goldDim, border:`1px solid ${C.goldBorder}`,
                    borderRadius:20, padding:"2px 9px", fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    💰 Finance access
                  </span>
                )}
              </div>
              <button onClick={()=>setProfileOpen(false)} style={{ background:"none", border:"none", color:C.text3,
                fontSize:22, cursor:"pointer", lineHeight:1, padding:4 }}>×</button>
            </div>
            <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:18, maxHeight:"62vh", overflowY:"auto" }}>
              {robot.description && (
                <Section title="About">
                  <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, lineHeight:1.6 }}>{robot.description}</div>
                </Section>
              )}
              {robot.current_focus && (
                <Section title="Current focus">
                  <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, lineHeight:1.6 }}>{robot.current_focus}</div>
                </Section>
              )}
              <Section title="Functions & access">
                <ul style={{ margin:0, paddingLeft:18, fontSize:13, color:C.text2, fontFamily:FONT, lineHeight:1.7 }}>
                  <li>Live read access to deals, contacts, agent roster &amp; open tasks</li>
                  <li>Pipeline analysis, agent coaching &amp; brokerage strategy</li>
                  <li>Drafting — emails, follow-ups, summaries &amp; memos</li>
                  <li>Conversational Q&amp;A grounded in your live org data</li>
                </ul>
              </Section>
              <Section title="Memory">
                {mems===null ? (
                  <div style={{ fontSize:12.5, color:C.text3, fontFamily:FONT }}>Loading…</div>
                ) : mems.length===0 ? (
                  <div style={{ fontSize:12.5, color:C.text3, fontFamily:FONT }}>No stored memories yet. {robot.name} picks up context from your live org data each conversation.</div>
                ) : mems.map((m,i)=>(
                  <div key={i} style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                    <div style={{ fontSize:9.5, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{(m.memory_type||"note").replace(/_/g," ")}</div>
                    <div style={{ fontSize:12.5, color:C.text2, fontFamily:FONT, lineHeight:1.55 }}>{m.content}</div>
                  </div>
                ))}
              </Section>
              {robot.system_prompt && (
                <Section title="Instructions (system prompt)">
                  <div style={{ fontSize:11.5, color:C.text3, fontFamily:MONO, lineHeight:1.55, whiteSpace:"pre-wrap",
                    background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 13px", maxHeight:200, overflowY:"auto" }}>
                    {robot.system_prompt}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.5)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FINANCIALS VIEW — Phase 2 (Admin/Owner only)
// ════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════
// PIPELINE ENGINE — Listings / Buyers / Leasing (team-wide)
// One component, three boards. Cards link properties + contacts.
// ════════════════════════════════════════════════════════════

const PIPELINE_CONFIG = {
  listing: {
    emoji:"📋", name:"Listings", noun:"Listing", priceLabel:"List Price", dateLabel:"List Date",
    titleHint:"Property address", roles:["Seller","Co-Seller","Attorney","Other"],
    stages:[
      { id:"Prospect",       label:"Prospect",       emoji:"🌱", color:C.text2 },
      { id:"Listing Appt",   label:"Listing Appt",   emoji:"📅", color:C.blue },
      { id:"Signed",         label:"Signed",         emoji:"✍️", color:C.purple },
      { id:"Active",         label:"Active",         emoji:"🏡", color:C.amber },
      { id:"Under Contract", label:"Under Contract", emoji:"🤝", color:C.gold },
      { id:"Closed",         label:"Closed",         emoji:"🎉", color:C.green },
      { id:"Lost",           label:"Lost",           emoji:"💤", color:C.red },
    ],
  },
  buyer: {
    emoji:"🏠", name:"Buyers", noun:"Buyer", priceLabel:"Budget", dateLabel:"Target Close",
    titleHint:"Buyer name", roles:["Buyer","Co-Buyer","Lender","Attorney","Other"],
    stages:[
      { id:"New Lead",       label:"New Lead",       emoji:"🌱", color:C.text2 },
      { id:"Searching",      label:"Searching",      emoji:"🔎", color:C.blue },
      { id:"Pre-Approved",   label:"Pre-Approved",   emoji:"💰", color:C.purple },
      { id:"Offer Made",     label:"Offer Made",     emoji:"📑", color:C.amber },
      { id:"Under Contract", label:"Under Contract", emoji:"🤝", color:C.gold },
      { id:"Closed",         label:"Closed",         emoji:"🎉", color:C.green },
      { id:"Lost",           label:"Lost",           emoji:"💤", color:C.red },
    ],
  },
  leasing: {
    emoji:"🔑", name:"Leasing", noun:"Lease", priceLabel:"Monthly Rent", dateLabel:"Move-in",
    titleHint:"Tenant name", roles:["Tenant","Co-Tenant","Guarantor","Other"],
    stages:[
      { id:"New Inquiry",    label:"New Inquiry",    emoji:"📨", color:C.text2 },
      { id:"Showing",        label:"Showing",        emoji:"👀", color:C.blue },
      { id:"Application",    label:"Application",    emoji:"📝", color:C.amber },
      { id:"Approved",       label:"Approved",       emoji:"👍", color:C.purple },
      { id:"Signed",         label:"Signed",         emoji:"🎉", color:C.green },
      { id:"Lost",           label:"Lost",           emoji:"💤", color:C.red },
    ],
  },
};
const CARD_EMOJIS = ["🏡","🏠","🏘️","🔑","📋","💎","⭐","🔥","🌊","🌴","🏙️","💰","📈","🤝","🛎️","🏖️"];

function pipe$(n){ return n==null||n===""?"—":"$"+Math.round(Number(n)).toLocaleString(); }
function pipeDate(d){ return d ? new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"; }

function PipelineView({ pipeline, user }) {
  const isMobile = useIsMobile();
  const cfg = PIPELINE_CONFIG[pipeline];
  const [cards, setCards] = useState([]);
  const [linksByCard, setLinks] = useState({});
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoad] = useState(true);
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState("pipeline");
  const [q, setQ] = useState("");
  const [fAssign, setFAssign] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoad(true);
    const [cs, lk, ct, dl] = await Promise.all([
      fetchAllRows(()=>supabase.from("pipeline_cards").select("*").eq("org_id",ORG_ID).eq("pipeline",pipeline).order("updated_at",{ascending:false})),
      fetchAllRows(()=>supabase.from("pipeline_card_contacts").select("*, contacts(id,full_name,email,phone,contact_type)").eq("org_id",ORG_ID)),
      fetchAllRows(()=>supabase.from("contacts").select("id,full_name,email,phone,contact_type").eq("org_id",ORG_ID).order("full_name")),
      fetchAllRows(()=>supabase.from("deals").select("id,address,city,state,zip,price,property_type,bedrooms,bathrooms,sqft").eq("org_id",ORG_ID).order("created_at",{ascending:false})),
    ]);
    const map={}; (lk||[]).forEach(l=>{ (map[l.card_id]=map[l.card_id]||[]).push(l); });
    setCards(cs||[]); setLinks(map); setContacts(ct||[]); setDeals(dl||[]); setLoad(false);
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[pipeline]);

  const assignees = Array.from(new Set(cards.map(c=>c.assigned_to).filter(Boolean)));
  const cardTitle = (c)=> c.title || c.property_address || (linksByCard[c.id]?.[0]?.contacts?.full_name) || "(untitled)";
  const filtered = cards.filter(c=>{
    if(fAssign!=="all" && (c.assigned_to||"")!==fAssign) return false;
    if(q){
      const names=(linksByCard[c.id]||[]).map(l=>l.contacts?.full_name||"").join(" ");
      const hay=`${cardTitle(c)} ${c.property_address} ${c.property_city} ${names}`.toLowerCase();
      if(!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const openStages = cfg.stages.filter(s=>!["Closed","Signed","Lost"].includes(s.id)).map(s=>s.id);
  const wonId = pipeline==="leasing" ? "Signed" : "Closed";
  const stat = {
    total: cards.length,
    active: cards.filter(c=>openStages.includes(c.stage)).length,
    won: cards.filter(c=>c.stage===wonId).length,
    value: cards.filter(c=>openStages.includes(c.stage)).reduce((a,c)=>a+(Number(c.price)||0),0),
  };

  return (
    <div style={{ padding:isMobile?"12px":"20px 24px", maxWidth:1320 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10, marginBottom:16 }}>
        {[
          { l:"Total "+cfg.name,  v:stat.total,  c:C.gold },
          { l:"Active Pipeline",  v:stat.active, c:C.blue },
          { l:pipeline==="leasing"?"Signed":"Closed", v:stat.won, c:C.green },
          { l:"Active "+(pipeline==="leasing"?"Rent/mo":"Value"), v:pipe$(stat.value), c:C.amber, small:true },
        ].map(s=>(
          <div key={s.l} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 14px" }}>
            <div style={{ fontSize:s.small?17:22, fontWeight:700, color:s.c, fontFamily:s.small?MONO:SERIF }}>{s.v}</div>
            <div style={{ fontSize:10, fontWeight:700, color:C.text2, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", gap:4, background:C.surface2, borderRadius:8, padding:3 }}>
          {[["pipeline","Board"],["list","List"]].map(([v,l])=>(
            <button key={v} onClick={()=>setMode(v)} style={{ padding:"6px 14px", borderRadius:6, border:"none",
              background:mode===v?C.gold:"transparent", color:mode===v?"#0a0a0a":C.text2, fontSize:12, fontWeight:600, fontFamily:FONT, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Search ${cfg.name.toLowerCase()}…`}
          style={{ flex:"1 1 200px", minWidth:160, padding:"8px 12px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none" }} />
        {assignees.length>0 && (
          <select value={fAssign} onChange={e=>setFAssign(e.target.value)} style={pipeSelStyle()}>
            <option value="all">All agents</option>{assignees.map(c=><option key={c} value={c}>{c.split("@")[0]}</option>)}
          </select>
        )}
        <GoldButton small onClick={()=>setShowNew(true)}>{cfg.emoji} New {cfg.noun}</GoldButton>
      </div>

      {loading ? (
        <div style={{ padding:"40px 0", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>Loading {cfg.name.toLowerCase()}…</div>
      ) : cards.length===0 ? (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"44px 16px", textAlign:"center" }}>
          <div style={{ fontSize:34, marginBottom:10 }}>{cfg.emoji}</div>
          <div style={{ fontSize:14, color:C.text2, fontFamily:FONT, marginBottom:14 }}>No {cfg.name.toLowerCase()} yet.</div>
          <GoldButton small onClick={()=>setShowNew(true)}>{cfg.emoji} Add the first {cfg.noun.toLowerCase()}</GoldButton>
        </div>
      ) : mode==="pipeline" ? (
        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:12, WebkitOverflowScrolling:"touch" }}>
          {cfg.stages.map(st=>{
            const col = filtered.filter(c=>c.stage===st.id);
            const colVal = col.reduce((a,c)=>a+(Number(c.price)||0),0);
            return (
              <div key={st.id} style={{ flex:"0 0 274px", width:274 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 4px", marginBottom:6, borderBottom:`2px solid ${st.color}` }}>
                  <span style={{ fontSize:12, fontWeight:700, color:st.color, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.04em" }}>{st.emoji} {st.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:C.text3, fontFamily:MONO }}>{col.length}</span>
                </div>
                {colVal>0 && <div style={{ fontSize:10, color:C.text3, fontFamily:MONO, padding:"0 4px 6px" }}>{pipe$(colVal)}</div>}
                <div style={{ display:"flex", flexDirection:"column", gap:8, minHeight:60 }}>
                  {col.map(c=><PipeCard key={c.id} card={c} cfg={cfg} links={linksByCard[c.id]||[]} title={cardTitle(c)} onClick={()=>setSel(c)} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{filtered.length} of {cards.length}</div>
          {filtered.map(c=>{
            const stg=cfg.stages.find(s=>s.id===c.stage)||cfg.stages[0];
            const isList=cfg.noun==="Listing"; const rent=/lease|rent/i.test(c.property_type||"");
            return (
              <div key={c.id} onClick={()=>setSel(c)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <span style={{ fontSize:22 }}>{c.emoji||cfg.emoji}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>{cardTitle(c)}</div>
                  <div style={{ fontSize:11, color:C.text2, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {(linksByCard[c.id]||[]).map(l=>l.contacts?.full_name).filter(Boolean).join(", ")||c.property_address||"—"} · {pipe$(c.price)}{rent?"/mo":""}</div>
                </div>
                {isList && <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:6, whiteSpace:"nowrap", color:rent?C.blue:C.gold, background:rent?"rgba(91,141,239,0.14)":C.goldDim, border:`1px solid ${rent?"rgba(91,141,239,0.45)":C.goldBorder}` }}>{rent?"FOR RENT":"FOR SALE"}</span>}
                <span style={{ fontSize:10, fontWeight:700, color:stg.color, fontFamily:FONT, whiteSpace:"nowrap" }}>{stg.emoji} {stg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {sel && <PipePanel card={sel} cfg={cfg} pipeline={pipeline} user={user} contacts={contacts} deals={deals}
        links={linksByCard[sel.id]||[]} assignees={assignees}
        onClose={()=>setSel(null)} onRefresh={load} onUpdated={u=>setSel(u)} setToast={setToast} />}
      {showNew && <PipeCreateModal cfg={cfg} pipeline={pipeline} user={user} contacts={contacts} deals={deals}
        onClose={()=>setShowNew(false)} onCreated={async()=>{ setShowNew(false); await load(); setToast({msg:`${cfg.noun} added`,type:"success"}); }} setToast={setToast} />}
    </div>
  );
}

function pipeSelStyle(){ return { padding:"8px 10px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:12, fontFamily:FONT, outline:"none", maxWidth:170 }; }

function PipeCard({ card, cfg, links, title, onClick }) {
  const names = links.map(l=>l.contacts?.full_name).filter(Boolean);
  const isListing = cfg.noun==="Listing";
  const isRental = /lease|rent/i.test(card.property_type||"");
  return (
    <div onClick={onClick} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 12px", cursor:"pointer" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
        <span style={{ fontSize:18 }}>{card.emoji||cfg.emoji}</span>
        <span style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</span>
        {isListing && <span style={{ fontSize:9, fontWeight:800, padding:"2px 6px", borderRadius:6, whiteSpace:"nowrap", color:isRental?C.blue:C.gold, background:isRental?"rgba(91,141,239,0.14)":C.goldDim, border:`1px solid ${isRental?"rgba(91,141,239,0.45)":C.goldBorder}` }}>{isRental?"FOR RENT":"FOR SALE"}</span>}
      </div>
      {names.length>0 && <div style={{ fontSize:11, color:C.text2, fontFamily:FONT, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>👤 {names.join(", ")}</div>}
      {card.property_address && title!==card.property_address && <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>📍 {card.property_address}</div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:3 }}>
        <span style={{ fontSize:11, color:C.gold, fontFamily:MONO }}>{pipe$(card.price)}{(cfg.priceLabel==="Monthly Rent"||isRental)?"/mo":""}</span>
        {card.target_date && <span style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>📆 {pipeDate(card.target_date)}</span>}
      </div>
      {card.assigned_to && <div style={{ fontSize:9, color:C.text3, fontFamily:FONT, marginTop:5 }}>🧑‍💼 {card.assigned_to.split("@")[0]}</div>}
    </div>
  );
}

// ── Contact picker (search existing 218 contacts OR create new) ──
function ContactPicker({ onPick, onClose }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [creating, setCreating] = useState(false);
  const [nf, setNf] = useState({ full_name:"", phone:"", email:"" });
  useEffect(()=>{
    let active=true;
    (async()=>{
      if(q.trim().length<2){ setHits([]); return; }
      const { data } = await supabase.from("contacts").select("id,full_name,email,phone,contact_type")
        .eq("org_id",ORG_ID).ilike("full_name",`%${q.trim()}%`).order("full_name").limit(20);
      if(active) setHits(data||[]);
    })();
    return ()=>{active=false;};
  },[q]);
  const createNew = async () => {
    if(!nf.full_name.trim()) return;
    const { data, error } = await supabase.from("contacts").insert({
      org_id:ORG_ID, full_name:nf.full_name.trim(), phone:nf.phone||null, email:nf.email||null,
      contact_type:"Client", source:"Pipeline" }).select().single();
    if(error){ alert(error.message); return; }
    onPick(data);
  };
  return (
    <Modal title="Add Contact" onClose={onClose} maxWidth={440}>
      {!creating ? (
        <div>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search contacts by name…"
            style={{ width:"100%", padding:"10px 12px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:FONT, outline:"none", boxSizing:"border-box" }} />
          <div style={{ marginTop:10, maxHeight:280, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
            {hits.map(c=>(
              <div key={c.id} onClick={()=>onPick(c)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:C.surface2, borderRadius:8, cursor:"pointer" }}>
                <Avatar name={c.full_name} email={c.email} size={30} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{c.full_name}</div>
                  <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{c.contact_type}{c.phone?` · ${c.phone}`:""}</div>
                </div>
              </div>
            ))}
            {q.trim().length>=2 && hits.length===0 && <div style={{ fontSize:12, color:C.text3, fontFamily:FONT, padding:"6px 2px" }}>No matches.</div>}
          </div>
          <div style={{ marginTop:12 }}><GoldButton small outline onClick={()=>setCreating(true)}>＋ Create new contact</GoldButton></div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Field label="Full name" value={nf.full_name} onChange={v=>setNf(s=>({...s,full_name:v}))} autoFocus />
          <Field label="Phone" value={nf.phone} onChange={v=>setNf(s=>({...s,phone:v}))} />
          <Field label="Email" value={nf.email} onChange={v=>setNf(s=>({...s,email:v}))} />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <GoldButton small outline onClick={()=>setCreating(false)}>Back</GoldButton>
            <GoldButton small onClick={createNew} disabled={!nf.full_name.trim()}>Create & add</GoldButton>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Property fields (shared) ──
function PropertyFields({ form, set, deals, isMobile }) {
  const grid2={ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10 };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {deals.length>0 && (
        <Sel label="Link existing property" value={form.property_deal_id||""} onChange={id=>{
          if(!id){ set("property_deal_id",""); return; }
          const d=deals.find(x=>x.id===id); if(!d) return;
          set("property_deal_id",id); set("property_address",d.address||""); set("property_city",d.city||"");
          set("property_zip",d.zip||""); set("bedrooms",d.bedrooms??""); set("bathrooms",d.bathrooms??"");
          set("sqft",d.sqft??""); if(d.price) set("price",d.price);
        }} options={[{value:"",label:"— New / not linked —"}, ...deals.map(d=>({value:d.id,label:`${d.address||"(no address)"}${d.city?`, ${d.city}`:""}`}))]} />
      )}
      <Field label="Property address" value={form.property_address} onChange={v=>set("property_address",v)} />
      <div style={grid2}>
        <Field label="City" value={form.property_city} onChange={v=>set("property_city",v)} />
        <Field label="Beds / Baths" value={form._bb||""} onChange={v=>set("_bb",v)} placeholder="3 / 2" />
      </div>
    </div>
  );
}

const PIPE_BLANK = { title:"", emoji:"", property_deal_id:"", property_address:"", property_city:"", property_zip:"",
  bedrooms:"", bathrooms:"", sqft:"", price:"", target_date:"", source:"", _bb:"" };
function pipePayload(form, cfg, extra){
  const numF=["bedrooms","bathrooms","sqft","price"];
  const out={ ...extra };
  // parse "beds / baths" helper
  let f={...form};
  if(f._bb){ const m=String(f._bb).split("/"); f.bedrooms=m[0]?.trim()||f.bedrooms; f.bathrooms=m[1]?.trim()||f.bathrooms; }
  delete f._bb;
  for(const [k,v] of Object.entries(f)){
    if(numF.includes(k)) out[k]= v===""||v==null?null:Number(v);
    else if(k==="target_date") out[k]= v||null;
    else if(k==="property_deal_id") out[k]= v||null;
    else out[k]= v===""?null:v;
  }
  return out;
}

function PipeCreateModal({ cfg, pipeline, user, contacts, deals, onClose, onCreated, setToast }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({ ...PIPE_BLANK, emoji:cfg.emoji, stage:cfg.stages[0].id });
  const [picked, setPicked] = useState(null); // primary contact
  const [showPick, setShowPick] = useState(false);
  const [saving, setSaving] = useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const save = async () => {
    setSaving(true);
    const payload = pipePayload(form, cfg, { org_id:ORG_ID, pipeline, stage:form.stage, assigned_to:user.email, created_by:user.email });
    const { data, error } = await supabase.from("pipeline_cards").insert(payload).select().single();
    if(error){ setSaving(false); alert(error.message); return; }
    if(picked){
      await supabase.from("pipeline_card_contacts").insert({ card_id:data.id, org_id:ORG_ID, contact_id:picked.id, role:cfg.roles[0] });
    }
    setSaving(false); onCreated();
  };

  return (
    <Modal title={`${cfg.emoji} New ${cfg.noun}`} onClose={onClose} maxWidth={540}>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:C.text2, fontFamily:FONT, marginBottom:4 }}>Emoji</div>
            <select value={form.emoji} onChange={e=>set("emoji",e.target.value)} style={{ fontSize:20, padding:"6px 8px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8, cursor:"pointer" }}>
              {[cfg.emoji,...CARD_EMOJIS.filter(e=>e!==cfg.emoji)].map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}><Field label="Title" value={form.title} onChange={v=>set("title",v)} placeholder={cfg.titleHint} autoFocus /></div>
        </div>

        {/* Primary contact */}
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:C.text2, fontFamily:FONT, marginBottom:4 }}>{cfg.roles[0]}</div>
          {picked ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:C.surface2, borderRadius:8 }}>
              <Avatar name={picked.full_name} email={picked.email} size={28} />
              <span style={{ flex:1, fontSize:13, color:C.text, fontFamily:FONT }}>{picked.full_name}</span>
              <button onClick={()=>setPicked(null)} style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:16 }}>✕</button>
            </div>
          ) : <GoldButton small outline onClick={()=>setShowPick(true)}>＋ Add {cfg.roles[0].toLowerCase()}</GoldButton>}
        </div>

        <PropertyFields form={form} set={set} deals={deals} isMobile={isMobile} />
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10 }}>
          <Field label={cfg.priceLabel} type="number" value={form.price} onChange={v=>set("price",v)} />
          <Field label={cfg.dateLabel} type="date" value={form.target_date} onChange={v=>set("target_date",v)} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10 }}>
          <Sel label="Source" value={form.source||""} onChange={v=>set("source",v)} options={[{value:"",label:"—"},...["Zillow","Website","Referral","Sign Call","Open House","Social","MLS","Past Client","Other"].map(s=>({value:s,label:s}))]} />
          <Sel label="Stage" value={form.stage} onChange={v=>set("stage",v)} options={cfg.stages.map(s=>({value:s.id,label:`${s.emoji} ${s.label}`}))} />
        </div>
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:18 }}>
        <GoldButton outline small onClick={onClose}>Cancel</GoldButton>
        <GoldButton small onClick={save} disabled={saving||(!form.title.trim() && !picked && !form.property_address.trim())}>{saving?"Saving…":`Add ${cfg.noun.toLowerCase()}`}</GoldButton>
      </div>
      {showPick && <ContactPicker onClose={()=>setShowPick(false)} onPick={c=>{ setPicked(c); setShowPick(false); }} />}
    </Modal>
  );
}

function PipePanel({ card, cfg, pipeline, user, contacts, deals, links:initLinks, assignees, onClose, onRefresh, onUpdated, setToast }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("details");
  const [edit, setEdit] = useState(false);
  const [links, setLinks] = useState(initLinks);
  const [acts, setActs] = useState([]);
  const [note, setNote] = useState("");
  const [showPick, setShowPick] = useState(false);
  const [form, setForm] = useState(()=>{ const f={...PIPE_BLANK,emoji:card.emoji||cfg.emoji}; for(const k of Object.keys(f)) if(k!=="_bb") f[k]=card[k]??f[k]; f._bb=[card.bedrooms,card.bathrooms].filter(x=>x!=null&&x!=="").join(" / "); return f; });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const reloadLinks = async () => {
    const { data } = await supabase.from("pipeline_card_contacts").select("*, contacts(id,full_name,email,phone,contact_type)").eq("card_id",card.id);
    setLinks(data||[]);
  };
  const loadActs = async () => {
    const { data } = await supabase.from("pipeline_card_activities").select("*").eq("card_id",card.id).order("created_at",{ascending:false});
    setActs(data||[]);
  };
  useEffect(()=>{ reloadLinks(); loadActs(); /* eslint-disable-next-line */ },[card.id]);

  const patch = async (fields) => {
    await supabase.from("pipeline_cards").update({ ...fields, updated_at:new Date().toISOString() }).eq("id",card.id);
    onUpdated({ ...card, ...fields }); onRefresh();
  };
  const saveEdit = async () => { await patch(pipePayload(form, cfg, {})); setEdit(false); setToast({msg:"Saved",type:"success"}); };
  const addContact = async (c) => {
    setShowPick(false);
    const { error } = await supabase.from("pipeline_card_contacts").insert({ card_id:card.id, org_id:ORG_ID, contact_id:c.id, role:cfg.roles[0] });
    if(error && !error.message.includes("duplicate")){ alert(error.message); return; }
    await reloadLinks(); onRefresh();
  };
  const removeContact = async (linkId) => { await supabase.from("pipeline_card_contacts").delete().eq("id",linkId); await reloadLinks(); onRefresh(); };
  const setRole = async (linkId, role) => { await supabase.from("pipeline_card_contacts").update({role}).eq("id",linkId); await reloadLinks(); };
  const logTouch = async (channel) => {
    await supabase.from("pipeline_card_activities").insert({ card_id:card.id, org_id:ORG_ID, activity_type:channel, channel, content:channel, created_by:user.email });
    await patch({ last_contacted_at:new Date().toISOString(), touch_count:(card.touch_count||0)+1 }); await loadActs();
    setToast({msg:`Logged ${channel}`,type:"success"});
  };
  const addNote = async () => {
    if(!note.trim()) return;
    await supabase.from("pipeline_card_activities").insert({ card_id:card.id, org_id:ORG_ID, activity_type:"note", content:note.trim(), created_by:user.email });
    setNote(""); await loadActs(); setToast({msg:"Note added",type:"success"});
  };

  const primary = links[0]?.contacts;
  const tel  = primary?.phone ? `tel:${primary.phone.replace(/\D/g,"")}` : null;
  const sms  = primary?.phone ? `sms:${primary.phone.replace(/\D/g,"")}` : null;
  const mail = primary?.email ? `mailto:${primary.email}` : null;
  const stg = cfg.stages.find(s=>s.id===card.stage)||cfg.stages[0];
  const title = card.title || card.property_address || primary?.full_name || "(untitled)";

  const Row=({l,v})=>(<div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
    <span style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>{l}</span>
    <span style={{ fontSize:12, color:C.text, fontFamily:FONT, fontWeight:600, textAlign:"right" }}>{v}</span></div>);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)" }} />
      <div style={{ position:"relative", width:isMobile?"100%":510, maxWidth:"100%", height:"100%", background:C.surface, borderLeft:`1px solid ${C.border}`, overflowY:"auto", animation:"slideLeft 0.2s ease" }}>
        <style>{`@keyframes slideLeft{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        <div style={{ padding:"18px 20px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.surface, zIndex:2 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <span style={{ fontSize:34 }}>{card.emoji||cfg.emoji}</span>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:SERIF }}>{title}</div>
                <div style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{cfg.emoji} {cfg.noun} · {pipe$(card.price)}{cfg.priceLabel==="Monthly Rent"?"/mo":""}</div>
                <span style={{ fontSize:10, fontWeight:700, color:stg.color, fontFamily:FONT, marginTop:3, display:"inline-block" }}>{stg.emoji} {stg.label}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:C.text2, fontSize:22, cursor:"pointer" }}>✕</button>
          </div>
          {(tel||sms||mail) && (
            <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
              {tel && <a href={tel} onClick={()=>logTouch("call")} style={pipeQa(C.green)}>📞 Call</a>}
              {sms && <a href={sms} onClick={()=>logTouch("text")} style={pipeQa(C.blue)}>💬 Text</a>}
              {mail && <a href={mail} onClick={()=>logTouch("email")} style={pipeQa(C.gold)}>✉️ Email</a>}
            </div>
          )}
        </div>

        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            <Sel label="Stage" value={card.stage} onChange={v=>patch({stage:v})} options={cfg.stages.map(s=>({value:s.id,label:`${s.emoji} ${s.label}`}))} />
            <Sel label="Assigned to" value={card.assigned_to||""} onChange={v=>patch({assigned_to:v||null})}
              options={[{value:"",label:"Unassigned"},{value:user.email,label:"Me ("+user.email.split("@")[0]+")"},...assignees.filter(a=>a!==user.email).map(a=>({value:a,label:a.split("@")[0]}))]} />
          </div>

          {/* Contacts section */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.gold, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.06em" }}>👥 Contacts</span>
              <GoldButton small outline onClick={()=>setShowPick(true)}>＋ Add</GoldButton>
            </div>
            {links.length===0 ? <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>No contacts linked yet.</div> :
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {links.map(l=>(
                  <div key={l.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px", background:C.surface2, borderRadius:8 }}>
                    <Avatar name={l.contacts?.full_name||"?"} email={l.contacts?.email} size={28} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{l.contacts?.full_name}</div>
                      {l.contacts?.phone && <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{l.contacts.phone}</div>}
                    </div>
                    <select value={l.role||cfg.roles[0]} onChange={e=>setRole(l.id,e.target.value)} style={{ fontSize:10, padding:"3px 5px", background:C.surface, border:`1px solid ${C.border2}`, borderRadius:6, color:C.text2, fontFamily:FONT }}>
                      {cfg.roles.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={()=>removeContact(l.id)} style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:14 }}>✕</button>
                  </div>
                ))}
              </div>}
          </div>

          <div style={{ display:"flex", gap:5, marginBottom:12, borderBottom:`1px solid ${C.border}` }}>
            {[["details","Details"],["activity",`Activity (${acts.length})`],["notes","Notes"]].map(([v,l])=>(
              <button key={v} onClick={()=>setTab(v)} style={{ padding:"8px 12px", border:"none", background:"none", color:tab===v?C.gold:C.text2, borderBottom:tab===v?`2px solid ${C.gold}`:"2px solid transparent", fontSize:12, fontWeight:600, fontFamily:FONT, cursor:"pointer", marginBottom:-1 }}>{l}</button>
            ))}
          </div>

          {tab==="details" && (edit ? (
            <div>
              <div style={{ display:"flex", gap:10, alignItems:"flex-end", marginBottom:10 }}>
                <div><div style={{ fontSize:11, fontWeight:600, color:C.text2, fontFamily:FONT, marginBottom:4 }}>Emoji</div>
                  <select value={form.emoji} onChange={e=>set("emoji",e.target.value)} style={{ fontSize:20, padding:"6px 8px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8 }}>
                    {[cfg.emoji,...CARD_EMOJIS.filter(e=>e!==cfg.emoji)].map(e=><option key={e} value={e}>{e}</option>)}</select></div>
                <div style={{ flex:1 }}><Field label="Title" value={form.title} onChange={v=>set("title",v)} placeholder={cfg.titleHint} /></div>
              </div>
              <PropertyFields form={form} set={set} deals={deals} isMobile={isMobile} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
                <Field label={cfg.priceLabel} type="number" value={form.price} onChange={v=>set("price",v)} />
                <Field label={cfg.dateLabel} type="date" value={form.target_date} onChange={v=>set("target_date",v)} />
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
                <GoldButton outline small onClick={()=>setEdit(false)}>Cancel</GoldButton>
                <GoldButton small onClick={saveEdit}>Save changes</GoldButton>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:6 }}><GoldButton outline small onClick={()=>setEdit(true)}>✎ Edit</GoldButton></div>
              <Row l={cfg.priceLabel} v={pipe$(card.price)+(cfg.priceLabel==="Monthly Rent"?"/mo":"")} />
              <Row l="Property" v={card.property_address||"—"} />
              <Row l="City" v={card.property_city||"—"} />
              <Row l="Beds / Baths" v={`${card.bedrooms??"—"} / ${card.bathrooms??"—"}`} />
              <Row l={cfg.dateLabel} v={pipeDate(card.target_date)} />
              <Row l="Source" v={card.source||"—"} />
              {card.property_deal_id && <Row l="Linked property" v="✓ Deal record" />}
            </div>
          ))}

          {tab==="activity" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {acts.length===0 ? <div style={{ fontSize:12, color:C.text3, fontFamily:FONT, padding:"12px 0" }}>No activity yet — use the call/text/email buttons above.</div> :
                acts.map(a=>(<div key={a.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:14 }}>{a.activity_type==="call"?"📞":a.activity_type==="text"?"💬":a.activity_type==="email"?"✉️":a.activity_type==="note"?"📝":"•"}</span>
                  <div style={{ flex:1 }}><div style={{ fontSize:12, color:C.text, fontFamily:FONT }}>{a.content}</div>
                    <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{a.created_by?.split("@")[0]} · {new Date(a.created_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</div></div>
                </div>))}
            </div>
          )}

          {tab==="notes" && (
            <div>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…"
                style={{ width:"100%", minHeight:90, padding:"10px 12px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", boxSizing:"border-box", resize:"vertical" }} />
              <div style={{ marginTop:8 }}><GoldButton small onClick={addNote} disabled={!note.trim()}>Add note</GoldButton></div>
              {card.notes && <div style={{ marginTop:14, fontSize:12, color:C.text2, fontFamily:FONT, whiteSpace:"pre-wrap" }}>{card.notes}</div>}
            </div>
          )}
        </div>
      </div>
      {showPick && <ContactPicker onClose={()=>setShowPick(false)} onPick={addContact} />}
    </div>
  );
}
function pipeQa(color){ return { flex:1, textAlign:"center", textDecoration:"none", padding:"9px 10px", borderRadius:8, border:`1.5px solid ${color}`, color:color, background:"transparent", fontSize:12, fontWeight:700, fontFamily:FONT, cursor:"pointer", whiteSpace:"nowrap" }; }

// ════════════════════════════════════════════════════════════
// RECRUITING VIEW — Admin/Owner only (agent recruiting pipeline)
// ════════════════════════════════════════════════════════════

const RECRUIT_STAGES = [
  { id:"New Lead",         label:"New Lead",     color:C.text2,  bg:C.surface2 },
  { id:"Attempted",        label:"Attempted",    color:C.amber,  bg:"rgba(245,158,11,0.10)" },
  { id:"Connected",        label:"Connected",    color:C.blue,   bg:"rgba(59,130,246,0.10)" },
  { id:"Appointment Set",  label:"Appt Set",     color:C.gold,   bg:C.goldDim },
  { id:"Joined",           label:"Joined",       color:C.green,  bg:"rgba(34,197,94,0.10)" },
  { id:"Not Interested",   label:"Not Now",      color:C.red,    bg:"rgba(239,68,68,0.10)" },
];
const RECRUIT_TEMPS = {
  Hot:  { color:C.red,   bg:"rgba(239,68,68,0.12)" },
  Warm: { color:C.amber, bg:"rgba(245,158,11,0.12)" },
  Cold: { color:C.blue,  bg:"rgba(59,130,246,0.10)" },
};
// Typical industry economics, used ONLY to estimate what a producer is
// likely giving up today vs ROG Advantage. Clearly labelled as estimates
// in the UI. ROGA = $100/mo + $1,000/transaction + 100% commission.
const BRAND_ECON = {
  "Keller Williams":       { rate:0.87, note:"70/30 to a cap + 6% royalty" },
  "Compass":               { rate:0.80, note:"split typically 70/30–80/20, often no cap" },
  "Century 21":            { rate:0.80, note:"franchise split + royalty fees" },
  "Coldwell Banker Realty":{ rate:0.78, note:"traditional split + franchise fees" },
  "Coldwell Banker":       { rate:0.78, note:"traditional split + franchise fees" },
  "RE/MAX":                { rate:0.90, note:"desk/monthly fee model" },
  "eXp Realty":            { rate:0.90, note:"80/20 to $16K cap + monthly + per-tx" },
  "Real Broker":           { rate:0.91, note:"85/15 to a cap + fees" },
  "Sotheby's":             { rate:0.76, note:"luxury split + brand fees" },
  "Smith & Associates Real Estate":{ rate:0.78, note:"boutique split" },
  "Coastal Properties Group International":{ rate:0.80, note:"boutique split" },
  "Florida Executive Realty":{ rate:0.82, note:"split + fees" },
  "Signature Realty Associates":{ rate:0.85, note:"split + fees" },
  "Mihara & Associates INC.":{ rate:0.82, note:"split + fees" },
  // Already-100% / flat-fee lane — money angle is weak, lead with value
  "LPT Realty":            { rate:0.97, note:"already a 100% / flat-fee model", sameLane:true },
  "Charles Rutenberg Realty":{ rate:0.96, note:"already a 100% / flat-fee model", sameLane:true },
  "Dalton Wade INC":       { rate:0.96, note:"already a 100% / flat-fee model", sameLane:true },
  "Future Home Realty INC":{ rate:0.95, note:"flat-fee model", sameLane:true },
  "Avenue Homes LLC":      { rate:0.95, note:"flat-fee model", sameLane:true },
};
function brandEcon(brand){
  return BRAND_ECON[brand] || { rate:0.82, note:"typical split brokerage" };
}
function rogaNet(gci, units){
  const u = units && units>0 ? Math.round(units) : 12;
  return (gci||0) - 1200 - 1000*u;
}
function moneyMath(lead){
  const gci = lead.approx_gci||0;
  const units = lead.units && lead.units>0 ? Math.round(lead.units) : 12;
  const ec = brandEcon(lead.brand);
  const currentNet = gci * ec.rate;          // est. take-home today
  const roga = rogaNet(gci, units);          // take-home at ROGA
  const diff = roga - currentNet;            // money left on the table
  return { gci, units, ec, currentNet, roga, diff };
}

function RecruitingView({ user }) {
  const isMobile = useIsMobile();
  const [leads, setLeads]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [sel, setSel]       = useState(null);
  const [mode, setMode]     = useState("pipeline"); // pipeline | list
  const [q, setQ]           = useState("");
  const [fStage, setFStage] = useState("all");
  const [fTemp, setFTemp]   = useState("all");
  const [fBrand, setFBrand] = useState("all");
  const [fAssign, setFAssign]= useState("all");
  const [toast, setToast]   = useState(null);
  const [showPlay, setPlay] = useState(false);
  const [staff, setStaff]   = useState([]);

  const loadStaff = async () => {
    const { data } = await supabase.from("user_profiles")
      .select("email,full_name,role").eq("org_id", ORG_ID)
      .in("role",["owner","admin","manager"]).order("full_name");
    setStaff(data||[]);
  };

  const load = async () => {
    setLoad(true);
    const data = await fetchAllRows(()=>supabase.from("recruiting_leads")
      .select("*").eq("org_id", ORG_ID)
      .order("approx_gci", { ascending:false, nullsFirst:false }));
    setLeads(data||[]);
    setLoad(false);
  };
  useEffect(()=>{ load(); loadStaff(); },[]);

  // role dropdown options from team users
  const staffOptions = staff.map(s=>({ value:s.email, label:(s.full_name||s.email.split("@")[0]) }));
  const nameFor = (email)=> { const s=staff.find(x=>x.email===email); return s?(s.full_name||s.email.split("@")[0]):(email?email.split("@")[0]:"—"); };

  const callers = Array.from(new Set(leads.map(l=>l.assigned_to).filter(Boolean)));
  const brands  = Array.from(new Set(leads.map(l=>l.brand).filter(Boolean))).sort();

  const filtered = leads.filter(l=>{
    if(fStage!=="all" && l.stage!==fStage) return false;
    if(fTemp!=="all"  && l.temperature!==fTemp) return false;
    if(fBrand!=="all" && l.brand!==fBrand) return false;
    if(fAssign==="__unassigned"){ if(l.assigned_to) return false; }
    else if(fAssign!=="all" && (l.assigned_to||"")!==fAssign) return false;
    if(q){
      const hay=`${l.full_name} ${l.current_brokerage} ${l.brand} ${l.city} ${l.email}`.toLowerCase();
      if(!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const fmt$ = n => n==null?"—":"$"+Math.round(n).toLocaleString();
  const stat = {
    total: leads.length,
    hot: leads.filter(l=>l.temperature==="Hot").length,
    appts: leads.filter(l=>l.stage==="Appointment Set").length,
    joined: leads.filter(l=>l.stage==="Joined").length,
  };

  return (
    <div style={{ padding:isMobile?"12px":"20px 24px", maxWidth:1280 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:16 }}>
        {[
          { l:"Total Prospects", v:stat.total,  c:C.gold },
          { l:"Hot · Ready",     v:stat.hot,    c:C.red },
          { l:"Appointments Set",v:stat.appts,  c:C.gold },
          { l:"Joined ROGA",     v:stat.joined, c:C.green },
        ].map(s=>(
          <div key={s.l} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 14px" }}>
            <div style={{ fontSize:22, fontWeight:700, color:s.c, fontFamily:SERIF }}>{s.v}</div>
            <div style={{ fontSize:10, fontWeight:700, color:C.text2, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", gap:4, background:C.surface2, borderRadius:8, padding:3 }}>
          {[["pipeline","Pipeline"],["list","List"]].map(([v,l])=>(
            <button key={v} onClick={()=>setMode(v)} style={{ padding:"6px 14px", borderRadius:6, border:"none",
              background:mode===v?C.gold:"transparent", color:mode===v?"#0a0a0a":C.text2,
              fontSize:12, fontWeight:600, fontFamily:FONT, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, brokerage, city…"
          style={{ flex:"1 1 200px", minWidth:160, padding:"8px 12px", background:C.surface2,
            border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none" }} />
        <select value={fTemp} onChange={e=>setFTemp(e.target.value)} style={selStyle()}>
          <option value="all">All temps</option><option>Hot</option><option>Warm</option><option>Cold</option>
        </select>
        <select value={fBrand} onChange={e=>setFBrand(e.target.value)} style={selStyle()}>
          <option value="all">All brands</option>{brands.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        {staff.length>0 && (
          <select value={fAssign} onChange={e=>setFAssign(e.target.value)} style={selStyle()}>
            <option value="all">All assignees</option>
            <option value="__unassigned">Unassigned</option>
            {staff.map(s=><option key={s.email} value={s.email}>{s.full_name||s.email.split("@")[0]}</option>)}
          </select>
        )}
        <GoldButton small outline onClick={()=>setPlay(true)}>📖 Playbook</GoldButton>
      </div>

      {loading ? (
        <div style={{ padding:"40px 0", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>Loading prospects…</div>
      ) : mode==="pipeline" ? (
        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:12, WebkitOverflowScrolling:"touch" }}>
          {RECRUIT_STAGES.map(st=>{
            const col = filtered.filter(l=>l.stage===st.id);
            return (
              <div key={st.id} style={{ flex:"0 0 268px", width:268 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"6px 4px", marginBottom:8, borderBottom:`2px solid ${st.color}` }}>
                  <span style={{ fontSize:12, fontWeight:700, color:st.color, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.05em" }}>{st.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:C.text3, fontFamily:MONO }}>{col.length}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, minHeight:60 }}>
                  {col.slice(0,60).map(l=><RecruitCard key={l.id} lead={l} onClick={()=>setSel(l)} fmt$={fmt$} />)}
                  {col.length>60 && <div style={{ fontSize:11, color:C.text3, textAlign:"center", padding:8 }}>+{col.length-60} more — use List/filters</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginBottom:2 }}>{filtered.length} of {leads.length} prospects</div>
          {filtered.slice(0,400).map(l=>{
            const t=RECRUIT_TEMPS[l.temperature]||RECRUIT_TEMPS.Warm;
            const stg=RECRUIT_STAGES.find(s=>s.id===l.stage)||RECRUIT_STAGES[0];
            return (
              <div key={l.id} onClick={()=>setSel(l)}
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px",
                  cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <Avatar name={l.full_name} email={l.email} size={36} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>{l.full_name}
                    <span style={{ marginLeft:8, fontSize:10, fontWeight:700, color:t.color, background:t.bg, borderRadius:10, padding:"2px 7px" }}>{l.temperature}</span>
                  </div>
                  <div style={{ fontSize:11, color:C.text2, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {l.brand||l.current_brokerage} · {l.city||"—"} · {fmt$(l.approx_gci)} GCI</div>
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:stg.color, background:stg.bg, borderRadius:10, padding:"3px 9px", whiteSpace:"nowrap" }}>{stg.label}</span>
              </div>
            );
          })}
          {filtered.length>400 && <div style={{ fontSize:11, color:C.text3, textAlign:"center", padding:10 }}>Showing first 400 — narrow with filters.</div>}
        </div>
      )}

      {sel && <RecruitPanel lead={sel} user={user} onClose={()=>setSel(null)}
        onRefresh={async()=>{ await load(); }} onUpdated={(u)=>setSel(u)} setToast={setToast} staffOptions={staffOptions} nameFor={nameFor} />}
      {showPlay && <RecruitPlaybook onClose={()=>setPlay(false)} />}
    </div>
  );
}

function selStyle(){
  return { padding:"8px 10px", background:C.surface2, border:`1.5px solid ${C.border2}`,
    borderRadius:8, color:C.text, fontSize:12, fontFamily:FONT, outline:"none", maxWidth:170 };
}

function RecruitCard({ lead, onClick, fmt$ }) {
  const t=RECRUIT_TEMPS[lead.temperature]||RECRUIT_TEMPS.Warm;
  const touched=(lead.touch_count||0)>0;
  return (
    <div onClick={onClick} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
      padding:"11px 12px", cursor:"pointer" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder}
      onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>{lead.full_name}</span>
        <span style={{ fontSize:9, fontWeight:700, color:t.color, background:t.bg, borderRadius:10, padding:"2px 7px" }}>{lead.temperature}</span>
      </div>
      <div style={{ fontSize:11, color:C.text2, fontFamily:FONT, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.brand||lead.current_brokerage}</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, color:C.gold, fontFamily:MONO }}>{fmt$(lead.approx_gci)} GCI</span>
        <span style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>
          {touched ? `${lead.touch_count} touch${lead.touch_count>1?"es":""}` : "new"}
        </span>
      </div>
      {lead.assigned_to && <div style={{ fontSize:9, color:C.text3, fontFamily:FONT, marginTop:4 }}>👤 {lead.assigned_to.split("@")[0]}</div>}
    </div>
  );
}

// ── Merge-filled scripts ──────────────────────────────────────
function fillScripts(lead){
  const fn = lead.first_name || (lead.full_name||"").split(" ")[0] || "there";
  const city = lead.city || "the area";
  const brand = lead.brand || "your brokerage";
  const mm = moneyMath(lead);
  const moneyLine = mm.ec.sameLane
    ? `you're already on a 100% model, so this isn't about a bigger split — it's about what's wrapped around it`
    : `at your volume you're likely leaving somewhere around ${"$"+Math.round(Math.max(mm.diff,0)/1000)*1+"K"} a year on the table versus a true 100% model`;
  return {
    call:
`OPENER (warm, curious — not a pitch):
"Hi ${fn}, this is [your name] with Realty ONE Group Advantage here in ${city}. I know I'm calling out of the blue — do you have 30 seconds? … The reason I'm reaching out specifically is I've been watching production in ${city} and your name kept coming up. I'm not calling to pull you out of ${brand} — I'm calling because I'd genuinely like to learn what's working for you and share what we're building. Would you be open to a quick, no-pressure conversation?"

IF "I'm happy where I am":
"That's great to hear — honestly the best agents usually are. Can I ask, if there were one thing you'd change about your setup, what would it be?" (listen — this is the whole call)

THE ASK (book, don't close):
"I'm not the right person to get into the weeds on a move — but our broker ${"Dara"} (or Javier) sits down with a handful of producers each week, 15 minutes, just to compare notes. No paperwork, no pitch. Worth me grabbing you a spot?"`,
    voicemail:
`VOICEMAIL (under 18 seconds):
"Hi ${fn}, it's [your name] with Realty ONE Group Advantage. Nothing urgent — I've just been impressed with your work in ${city} and wanted to connect agent-to-agent. I'll send you a quick text so you have my number. Talk soon."`,
    text:
`TEXT 1 (after first call/VM):
"Hi ${fn} — [your name] from Realty ONE Group Advantage. Left you a quick voicemail. No pitch, promise — just impressed by your numbers in ${city} and would love to compare notes sometime. Cool if I check back next week?"

TEXT 2 (value, day 4-5):
"${fn}, quick one — ${moneyLine}. Happy to show you the exact math on your business, zero obligation. Want me to send it over?"

TEXT 3 (the invite, day 8-10):
"${fn} — our broker does a casual 15-min sit-down with a few producers each week. Thought of you. This Thurs or next Tues better?"`,
    email:
`SUBJECT: Quick note, ${fn} — agent to agent

Hi ${fn},

I'll keep this short. I'm with Realty ONE Group Advantage here in ${city}, and your production stood out to me — genuinely strong work${lead.ltm_growth_pct?` (that ${lead.ltm_growth_pct} growth especially)`:""}.

I'm not writing to talk you out of ${brand}. I'd just like 15 minutes to compare notes — what's working for you, and what we're building over here. A lot of strong agents are surprised by the math once they see it side by side${mm.ec.sameLane?", even coming from a 100% shop":""}.

If you're open to it, our broker Dara (or Javier) keeps a couple of spots open each week. No paperwork, no pressure — just a conversation.

Worth a quick call?

— [Your name]
Realty ONE Group Advantage`,
  };
}

function OwnRole({ emoji, label, people, note }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
      <span style={{ fontSize:18 }}>{emoji}</span>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:9, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {people && people.length ? people.map(p=>p.full_name||p.user_email.split("@")[0]).join(", ") : "—"}
          {note && <span style={{ fontSize:9, color:C.text3, marginLeft:5 }}>(via owner)</span>}
        </div>
      </div>
    </div>
  );
}

function RecruitTeamModal({ team, canManage, onClose, onRefresh, setToast }) {
  const [staff, setStaff] = useState([]);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("assignee");
  const [busy, setBusy] = useState(false);
  useEffect(()=>{
    supabase.from("user_profiles").select("email,full_name,role").eq("org_id",ORG_ID).in("role",["owner","admin","manager"]).order("full_name")
      .then(({data})=>setStaff(data||[]));
  },[]);
  const inTeam = new Set(team.map(m=>(m.user_email||"").toLowerCase()));
  const available = staff.filter(s=>!inTeam.has((s.email||"").toLowerCase()));
  const ROLES=[["owner","👑 Owner"],["manager","🧭 Manager"],["assignee","📞 Assignee"]];
  const addMember = async () => {
    if(!addEmail) return; setBusy(true);
    const s = staff.find(x=>x.email===addEmail);
    const { error } = await supabase.from("recruiting_members").insert({ org_id:ORG_ID, user_email:addEmail, full_name:s?.full_name||addEmail, pipeline_role:addRole });
    setBusy(false);
    if(error){ setToast({msg:error.message,type:"error"}); return; }
    setAddEmail(""); await onRefresh(); setToast({msg:"Added to recruiting team",type:"success"});
  };
  const setRole = async (id,role) => { await supabase.from("recruiting_members").update({pipeline_role:role,updated_at:new Date().toISOString()}).eq("id",id); await onRefresh(); };
  const remove = async (id) => { await supabase.from("recruiting_members").delete().eq("id",id); await onRefresh(); setToast({msg:"Removed from team",type:"success"}); };
  return (
    <Modal title="🎯 Recruiting Team" onClose={onClose} maxWidth={520}>
      <div style={{ fontSize:12, color:C.text3, fontFamily:FONT, marginBottom:12, lineHeight:1.5 }}>
        Owners & managers oversee the whole pipeline. Assignees work the leads assigned to them. Everyone listed here can open the Recruiting pipeline.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:canManage?16:0 }}>
        {team.map(m=>(
          <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:C.surface2, borderRadius:8 }}>
            <Avatar name={m.full_name||m.user_email} email={m.user_email} size={30} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{m.full_name||m.user_email.split("@")[0]}</div>
              <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.user_email}</div>
            </div>
            {canManage ? (<>
              <select value={m.pipeline_role} onChange={e=>setRole(m.id,e.target.value)} style={{ fontSize:11, padding:"4px 6px", background:C.surface, border:`1px solid ${C.border2}`, borderRadius:6, color:C.text2, fontFamily:FONT }}>
                {ROLES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={()=>remove(m.id)} style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:14 }}>✕</button>
            </>) : <span style={{ fontSize:11, fontWeight:600, color:C.gold, fontFamily:FONT }}>{m.pipeline_role}</span>}
          </div>
        ))}
      </div>
      {canManage && (
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.gold, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Add teammate</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <select value={addEmail} onChange={e=>setAddEmail(e.target.value)} style={{ flex:"1 1 180px", padding:"8px 10px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:12, fontFamily:FONT }}>
              <option value="">Select a team user…</option>
              {available.map(s=><option key={s.email} value={s.email}>{s.full_name||s.email} ({s.role})</option>)}
            </select>
            <select value={addRole} onChange={e=>setAddRole(e.target.value)} style={{ padding:"8px 10px", background:C.surface2, border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:12, fontFamily:FONT }}>
              {ROLES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <GoldButton small onClick={addMember} disabled={busy||!addEmail}>Add</GoldButton>
          </div>
        </div>
      )}
    </Modal>
  );
}

function RecruitPanel({ lead, user, onClose, onRefresh, onUpdated, setToast, staffOptions, nameFor }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("scripts");
  const [acts, setActs] = useState([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const mm = moneyMath(lead);
  const scripts = fillScripts(lead);
  const fmt$ = n => n==null?"—":"$"+Math.round(n).toLocaleString();

  const loadActs = async () => {
    const { data } = await supabase.from("recruiting_activities")
      .select("*").eq("lead_id", lead.id).order("created_at",{ascending:false});
    setActs(data||[]);
  };
  useEffect(()=>{ loadActs(); },[lead.id]);

  const patch = async (fields) => {
    await supabase.from("recruiting_leads").update({ ...fields, updated_at:new Date().toISOString() }).eq("id", lead.id);
    onUpdated({ ...lead, ...fields });
    onRefresh();
  };

  const logTouch = async (channel, disposition) => {
    const counter = channel==="call"?"call_count":channel==="text"?"text_count":channel==="email"?"email_count":null;
    const fields = { last_contacted_at:new Date().toISOString(), touch_count:(lead.touch_count||0)+1 };
    if(counter) fields[counter] = (lead[counter]||0)+1;
    if(disposition) fields.last_disposition = disposition;
    if(lead.stage==="New Lead") fields.stage = channel==="call"&&disposition==="Connected" ? "Connected" : "Attempted";
    if(channel==="call"&&disposition==="Connected") fields.stage="Connected";
    await supabase.from("recruiting_activities").insert({
      lead_id:lead.id, org_id:ORG_ID, activity_type:channel, channel, disposition,
      content:disposition?`${channel} · ${disposition}`:channel, created_by:user.email });
    await patch(fields);
    await loadActs();
    setToast({ msg:`Logged ${channel}${disposition?` · ${disposition}`:""}`, type:"success" });
  };

  const addNote = async () => {
    if(!note.trim()) return;
    setSaving(true);
    await supabase.from("recruiting_activities").insert({
      lead_id:lead.id, org_id:ORG_ID, activity_type:"note", content:note.trim(), created_by:user.email });
    setNote(""); setSaving(false); await loadActs();
    setToast({ msg:"Note added", type:"success" });
  };

  const bookAppt = async (who) => {
    await supabase.from("recruiting_activities").insert({
      lead_id:lead.id, org_id:ORG_ID, activity_type:"appointment",
      content:`Appointment set with ${who}`, created_by:user.email });
    await patch({ stage:"Appointment Set", appointment_with:who, appointment_at:new Date().toISOString() });
    await loadActs();
    setToast({ msg:`🎉 Appointment set with ${who}`, type:"success" });
  };

  const tel  = lead.phone ? `tel:${lead.phone.replace(/\D/g,"")}` : null;
  const sms  = lead.phone ? `sms:${lead.phone.replace(/\D/g,"")}` : null;
  const mail = lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent("Quick note, "+(lead.first_name||"")+" — agent to agent")}` : null;
  const copy = (txt,label)=>{ navigator.clipboard?.writeText(txt); setToast({ msg:(label||"Script")+" copied", type:"success" }); };

  // Actual contact methods — front & center. Supports multiples/categories
  // (extra entries can live in lead.contact_methods as [{type,label,value}]).
  const extra = Array.isArray(lead.contact_methods) ? lead.contact_methods : [];
  const phones = [
    ...(lead.phone ? [{ label:"Phone", value:lead.phone }] : []),
    ...extra.filter(c=>c.type==="phone"&&c.value).map(c=>({ label:c.label||"Phone", value:c.value })),
  ];
  const emails = [
    ...(lead.email ? [{ label:"Email", value:lead.email }] : []),
    ...extra.filter(c=>c.type==="email"&&c.value).map(c=>({ label:c.label||"Email", value:c.value })),
  ];
  const miniBtn = (color)=>({ textDecoration:"none", padding:"5px 11px", borderRadius:7, border:`1.5px solid ${color}`, color, background:"transparent", fontSize:11, fontWeight:700, fontFamily:FONT, whiteSpace:"nowrap" });
  const copyBtn = { background:"none", border:`1px solid ${C.border2}`, borderRadius:7, color:C.text3, cursor:"pointer", fontSize:13, padding:"4px 8px" };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)" }} />
      <div style={{ position:"relative", width:isMobile?"100%":520, maxWidth:"100%", height:"100%",
        background:C.surface, borderLeft:`1px solid ${C.border}`, overflowY:"auto",
        animation:"slideLeft 0.2s ease" }}>
        <style>{`@keyframes slideLeft{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding:"18px 20px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.surface, zIndex:2 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ display:"flex", gap:12 }}>
              <Avatar name={lead.full_name} email={lead.email} size={46} />
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:SERIF }}>{lead.full_name}</div>
                <div style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{lead.current_brokerage}</div>
                <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>{lead.city||"—"}{lead.license_number?` · Lic ${lead.license_number}`:""}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:C.text2, fontSize:22, cursor:"pointer" }}>✕</button>
          </div>

          {/* Quick actions */}
          <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
            {tel && <a href={tel} onClick={()=>logTouch("call")} style={qaStyle(C.green)}>📞 Call</a>}
            {sms && <a href={sms} onClick={()=>{copy(scripts.text,"Text script");logTouch("text");}} style={qaStyle(C.blue)}>💬 Text</a>}
            {mail && <a href={mail} onClick={()=>{copy(scripts.email,"Email");logTouch("email");}} style={qaStyle(C.gold)}>✉️ Email</a>}
          </div>
          {/* Call dispositions */}
          {tel && (
            <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
              {["Connected","Voicemail","No Answer","Callback","Not Interested"].map(d=>(
                <button key={d} onClick={()=>logTouch("call",d)} style={{ fontSize:10, padding:"4px 9px",
                  borderRadius:14, border:`1px solid ${C.border2}`, background:"transparent", color:C.text2,
                  fontFamily:FONT, cursor:"pointer" }}>{d}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding:"16px 20px" }}>
          {/* Contact — front & center: actual numbers and emails */}
          <div style={{ background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Contact</div>
            {phones.length===0 && emails.length===0 && (
              <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>No phone or email on file for this agent.</div>
            )}
            {phones.map((p,i)=>(
              <div key={"p"+i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:(i<phones.length-1||emails.length)?12:0 }}>
                <span style={{ fontSize:18 }}>📱</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:9, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.05em" }}>{p.label}</div>
                  <a href={`tel:${p.value.replace(/\D/g,"")}`} onClick={()=>logTouch("call")} style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:MONO, textDecoration:"none" }}>{p.value}</a>
                </div>
                <a href={`tel:${p.value.replace(/\D/g,"")}`} onClick={()=>logTouch("call")} style={miniBtn(C.green)}>Call</a>
                <a href={`sms:${p.value.replace(/\D/g,"")}`} onClick={()=>logTouch("text")} style={miniBtn(C.blue)}>Text</a>
                <button onClick={()=>copy(p.value,"Number")} style={copyBtn} title="Copy">⧉</button>
              </div>
            ))}
            {emails.map((e,i)=>(
              <div key={"e"+i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:i<emails.length-1?12:0 }}>
                <span style={{ fontSize:18 }}>✉️</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:9, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.05em" }}>{e.label}</div>
                  <a href={`mailto:${e.value}`} onClick={()=>logTouch("email")} style={{ fontSize:14, fontWeight:600, color:C.gold, fontFamily:FONT, textDecoration:"none", wordBreak:"break-all" }}>{e.value}</a>
                </div>
                <a href={`mailto:${e.value}`} onClick={()=>logTouch("email")} style={miniBtn(C.gold)}>Email</a>
                <button onClick={()=>copy(e.value,"Email")} style={copyBtn} title="Copy">⧉</button>
              </div>
            ))}
          </div>

          {/* Money math */}
          <div style={{ background:C.surface2, border:`1px solid ${C.goldBorder}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.gold, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>The Money Math · {fmt$(mm.gci)} GCI · {mm.units} units</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>Est. take-home today</div>
                <div style={{ fontSize:18, fontWeight:700, color:C.text2, fontFamily:MONO }}>{fmt$(mm.currentNet)}</div>
                <div style={{ fontSize:9, color:C.text3, fontFamily:FONT }}>{lead.brand} — {mm.ec.note}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>At ROG Advantage</div>
                <div style={{ fontSize:18, fontWeight:700, color:C.green, fontFamily:MONO }}>{fmt$(mm.roga)}</div>
                <div style={{ fontSize:9, color:C.text3, fontFamily:FONT }}>$100/mo + $1,000/tx, keep 100%</div>
              </div>
            </div>
            <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
              {mm.ec.sameLane ? (
                <div style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>Already on a 100%-style model — <b style={{color:C.gold}}>lead with value, not split</b>: The Edge AI program, Ari tech, local broker access, culture.</div>
              ) : (
                <div style={{ fontSize:13, color:C.text, fontFamily:FONT }}>Estimated left on the table: <b style={{ color:C.green, fontFamily:MONO }}>{fmt$(Math.max(mm.diff,0))}/yr</b></div>
              )}
              <div style={{ fontSize:9, color:C.text3, fontFamily:FONT, marginTop:4 }}>Typical industry estimate — confirm their actual structure in conversation.</div>
            </div>
          </div>

          {/* Production snapshot */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
            {[["LTM Volume",fmt$(lead.ltm_volume)],["Growth",lead.ltm_growth_pct||"—"],["Avg Price",fmt$(lead.avg_sale_price)],
              ["Years Exp.",lead.years_in_industry||"—"],["Yrs @ Office",lead.years_in_office?Number(lead.years_in_office).toFixed(1):"—"],["Move Potential",lead.potential_to_move||"—"]].map(([l,v])=>(
              <div key={l} style={{ background:C.surface2, borderRadius:8, padding:"8px 10px" }}>
                <div style={{ fontSize:9, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:MONO }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Stage + delegation */}
          <div style={{ marginBottom:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <Sel label="Stage" value={lead.stage} onChange={v=>patch({stage:v})} options={RECRUIT_STAGES.map(s=>({value:s.id,label:s.label}))} />
              <Sel label="👑 Owner" value={lead.owner_email||""} onChange={v=>patch({owner_email:v||null})}
                options={[{value:"",label:"—"}, ...staffOptions]} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel label="🧭 Manager" value={lead.manager_email||""} onChange={v=>patch({manager_email:v||null})}
                options={[{value:"",label:"—"}, ...staffOptions]} />
              <Sel label="📞 Assignee" value={lead.assigned_to||""} onChange={v=>patch({assigned_to:v||null})}
                options={[{value:"",label:"Unassigned"}, ...staffOptions]} />
            </div>
            <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginTop:8 }}>
              📍 Source: {lead.source||"—"}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:18 }}>
            <GoldButton small onClick={()=>bookAppt("Javier")}>📅 Book w/ Javier</GoldButton>
            <GoldButton small outline onClick={()=>bookAppt("Dara")}>📅 Book w/ Dara</GoldButton>
            {lead.courted_url && <a href={lead.courted_url} target="_blank" rel="noreferrer" style={{ ...qaStyle(C.text2), fontSize:11 }}>Courted ↗</a>}
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", gap:5, marginBottom:12, borderBottom:`1px solid ${C.border}` }}>
            {[["scripts","Scripts"],["activity",`Activity (${acts.length})`],["notes","Notes"]].map(([v,l])=>(
              <button key={v} onClick={()=>setTab(v)} style={{ padding:"8px 12px", border:"none", background:"none",
                color:tab===v?C.gold:C.text2, borderBottom:tab===v?`2px solid ${C.gold}`:"2px solid transparent",
                fontSize:12, fontWeight:600, fontFamily:FONT, cursor:"pointer", marginBottom:-1 }}>{l}</button>
            ))}
          </div>

          {tab==="scripts" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[["Call opener",scripts.call],["Voicemail",scripts.voicemail],["Text sequence",scripts.text],["Email",scripts.email]].map(([title,body])=>(
                <div key={title} style={{ background:C.surface2, borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:C.gold, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.06em" }}>{title}</span>
                    <button onClick={()=>copy(body,title)} style={{ fontSize:10, padding:"3px 9px", borderRadius:12, border:`1px solid ${C.border2}`, background:"transparent", color:C.text2, cursor:"pointer", fontFamily:FONT }}>Copy</button>
                  </div>
                  <pre style={{ fontSize:12, color:C.text, fontFamily:FONT, whiteSpace:"pre-wrap", margin:0, lineHeight:1.5 }}>{body}</pre>
                </div>
              ))}
            </div>
          )}

          {tab==="activity" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {acts.length===0 ? <div style={{ fontSize:12, color:C.text3, fontFamily:FONT, padding:"12px 0" }}>No activity yet. Use the call/text/email buttons above.</div> :
                acts.map(a=>(
                  <div key={a.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:14 }}>{a.activity_type==="call"?"📞":a.activity_type==="text"?"💬":a.activity_type==="email"?"✉️":a.activity_type==="appointment"?"📅":a.activity_type==="note"?"📝":"•"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:C.text, fontFamily:FONT }}>{a.content}</div>
                      <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{a.created_by?.split("@")[0]} · {new Date(a.created_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {tab==="notes" && (
            <div>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What did you learn? Pain points, timeline, objections…"
                style={{ width:"100%", minHeight:90, padding:"10px 12px", background:C.surface2, border:`1.5px solid ${C.border2}`,
                  borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", boxSizing:"border-box", resize:"vertical" }} />
              <div style={{ marginTop:8 }}><GoldButton small onClick={addNote} disabled={saving||!note.trim()}>Add note</GoldButton></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function qaStyle(color){
  return { flex:1, textAlign:"center", textDecoration:"none", padding:"9px 10px", borderRadius:8,
    border:`1.5px solid ${color}`, color:color, background:"transparent", fontSize:12, fontWeight:700,
    fontFamily:FONT, cursor:"pointer", whiteSpace:"nowrap" };
}

function RecruitPlaybook({ onClose }) {
  return (
    <Modal title="Recruiting Playbook" onClose={onClose} maxWidth={620}>
      <div style={{ fontSize:13, color:C.text, fontFamily:FONT, lineHeight:1.6, display:"flex", flexDirection:"column", gap:14 }}>
        <Section h="The one rule" b="We are not pulling people out of their brokerage. We're starting conversations with strong producers and earning a 15-minute meeting with Dara or Javier. The call's only job is the next step — never the close." />
        <Section h="Daily standard (per caller)" b="20–50 dials/day. Work the Pipeline board left to right: New Lead → Attempted → Connected → Appointment Set. Hot prospects first, then Warm. Log every touch with a disposition so nothing falls through." />
        <Section h="The cadence (≈7 touches / 21 days)" b="Day 1: Call + voicemail, then Text 1. Day 3: Call. Day 5: Text 2 (the money line). Day 8: Call + Text 3 (the invite). Day 12: Email. Day 18: Last call. No answer after that → long-nurture, recycle in 60 days." />
        <Section h="High-EQ posture" b="Lead with genuine respect for their numbers (these are real top producers). Never trash their current shop. Ask what they'd change — then listen. Give before you ask: a market stat, a free CMA demo, an invite to The Edge." />
        <Section h="The angle, by brand" b="Split houses (KW, Compass, Century 21, Coldwell, Sotheby's): lead with the money math — what they keep at 100%. Already-100% shops (LPT, Charles Rutenberg, Dalton Wade): money won't move them — lead with what's wrapped around it: The Edge AI program, Ari, local broker access, culture." />
        <Section h="What ROGA offers" b="$100/month + $1,000/transaction + keep 100% of your commission. Plus The Edge (weekly AI education), the Ari platform, and hands-on brokers in Lutz/Tampa." />
        <Section h="The handoff" b="Once they say yes to a meeting, hit 'Book w/ Javier' or 'Book w/ Dara' — that flips them to Appointment Set and logs it. Our job is done; the brokers take it from there." />
      </div>
    </Modal>
  );
}
function Section({ h, b }){
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:C.gold, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{h}</div>
      <div style={{ fontSize:13, color:C.text2, fontFamily:FONT }}>{b}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// APPLICATIONS VIEW — Admin only
// ════════════════════════════════════════════════════════════
function ApplicationsView({ user }) {
  const isMobile             = useIsMobile();
  const [apps, setApps]      = useState([]);
  const [loading, setLoading]= useState(true);
  const [selected, setSel]   = useState(null);
  const [filter, setFilter]  = useState("pending");
  const [toast, setToast]    = useState(null);

  const loadApps = async () => {
    setLoading(true);
    const { data } = await supabase.from("agent_applications")
      .select("*").eq("org_id", ORG_ID)
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => { loadApps(); }, []);

  const filtered = apps.filter(a =>
    filter === "all" ? true : a.status === filter
  );

  const pendingCount = apps.filter(a => a.status === "pending").length;

  const STATUS_COLOR = {
    pending:  { color: C.amber,  bg: "rgba(245,158,11,0.10)" },
    approved: { color: C.green,  bg: "rgba(34,197,94,0.10)"  },
    declined: { color: C.red,    bg: "rgba(239,68,68,0.10)"  },
    hold:     { color: C.text3,  bg: C.surface2               },
  };

  const fmtDate = iso => iso
    ? new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
    : "";

  return (
    <div style={{ padding: isMobile ? "12px" : "20px 24px", maxWidth: 900 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:20 }}>
        {[
          { l:"Pending Review", v:apps.filter(a=>a.status==="pending").length,  c:C.amber },
          { l:"Approved",       v:apps.filter(a=>a.status==="approved").length, c:C.green },
          { l:"Declined",       v:apps.filter(a=>a.status==="declined").length, c:C.red   },
          { l:"Total",          v:apps.length,                                  c:C.text2 },
        ].map(s => (
          <div key={s.l} style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"13px 14px" }}>
            <div style={{ fontSize:22, fontWeight:700, color:s.c, fontFamily:SERIF }}>{s.v}</div>
            <div style={{ fontSize:10, fontWeight:700, color:C.text2, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:5, marginBottom:16, overflowX:"auto",
        WebkitOverflowScrolling:"touch" }}>
        {[["pending","Pending"],["approved","Approved"],["declined","Declined"],["hold","On Hold"],["all","All"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding:"6px 14px", borderRadius:20, whiteSpace:"nowrap",
            border:`1.5px solid ${filter===v ? C.goldBorder : C.border}`,
            background: filter===v ? C.goldDim : "transparent",
            color: filter===v ? C.gold : C.text2,
            fontSize:11, fontFamily:FONT, cursor:"pointer" }}>
            {l}{v==="pending"&&pendingCount>0?` (${pendingCount})`:""}
          </button>
        ))}
      </div>

      {/* Application list */}
      {loading ? (
        <div style={{ padding:"40px 0", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"40px 16px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
          {filter === "pending" ? (
            <>
              <div style={{ fontSize:28, marginBottom:10 }}>✓</div>
              All caught up — no pending applications
            </>
          ) : `No ${filter} applications`}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(app => {
            const cfg = STATUS_COLOR[app.status] || STATUS_COLOR.pending;
            return (
              <div key={app.id}
                onClick={() => setSel(app)}
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
                  padding:"14px 16px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:14 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.goldBorder}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                <Avatar name={app.full_name} email={app.email} size={40} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text,
                    fontFamily:FONT, marginBottom:3 }}>{app.full_name}</div>
                  <div style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>
                    {app.email}
                    {app.phone ? ` · ${app.phone}` : ""}
                  </div>
                  {app.license_number && (
                    <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>
                      License: {app.license_number}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:cfg.color,
                    background:cfg.bg, borderRadius:20, padding:"3px 10px",
                    textTransform:"capitalize" }}>{app.status}</span>
                  <span style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>
                    {fmtDate(app.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Application detail panel */}
      {selected && (
        <ApplicationPanel
          app={selected}
          user={user}
          onClose={() => setSel(null)}
          onUpdated={() => { setSel(null); loadApps(); }}
          toast={setToast}
        />
      )}
    </div>
  );
}

function ApplicationPanel({ app, user, onClose, onUpdated, toast }) {
  const [notes, setNotes]   = useState(app.admin_notes || "");
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState(null);

  const fmtDate = iso => iso
    ? new Date(iso).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric",
        hour:"numeric", minute:"2-digit" })
    : "";

  const updateStatus = async (newStatus) => {
    setSaving(true);
    setAction(newStatus);
    await supabase.from("agent_applications").update({
      status:      newStatus,
      reviewed_by: user?.email,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes,
    }).eq("id", app.id);
    setSaving(false);
    toast({ msg: `Application ${newStatus}`, type: newStatus === "approved" ? "success" : "success" });
    onUpdated();
  };

  const approve = async () => {
    setSaving(true);
    setAction("approving");

    try {
      // 1. Create or find contact
      let contactId = app.contact_id;
      if (!contactId) {
        const { data: existingContact } = await supabase.from("contacts")
          .select("id").eq("email", app.email).maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const { data: newContact } = await supabase.from("contacts").insert({
            org_id:       ORG_ID,
            full_name:    app.full_name,
            email:        app.email,
            phone:        app.phone,
            contact_type: "Agent",
            status:       "Active",
            source:       "Application",
            notes:        app.biggest_goal || "",
            created_by:   creatorLabel(user),
          }).select().single();
          contactId = newContact?.id;
        }
      }

      // 2. Create default fee package
      if (contactId) {
        // Deactivate any existing active package
        await supabase.from("agent_fee_packages")
          .update({ is_active: false }).eq("contact_id", contactId).eq("is_active", true);

        await supabase.from("agent_fee_packages").insert({
          org_id:               ORG_ID,
          contact_id:           contactId,
          package_name:         "ROG Standard",
          fee_structure:        "flat",
          split_agent_pct:      100,
          split_brokerage_pct:  0,
          flat_transaction_fee: 1000,
          monthly_fee:          100,
          e_and_o_fee:          0,
          is_active:            true,
          effective_date:       new Date().toISOString().slice(0, 10),
          created_by:           user?.email,
        });

        // 3. Enable portal access
        await supabase.from("agent_portal_access").upsert({
          contact_id:   contactId,
          portal_email: app.email.toLowerCase(),
          is_active:    true,
          granted_by:   user?.email,
          org_id:       ORG_ID,
          updated_at:   new Date().toISOString(),
        }, { onConflict: "portal_email" });

        await supabase.from("contacts").update({
          portal_enabled: true,
          portal_email:   app.email.toLowerCase(),
        }).eq("id", contactId);
      }

      // 4. Create auth user via secure edge function (service role lives server-side as a Supabase secret)
      const { data: { session: _sess } } = await supabase.auth.getSession();
      await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.REACT_APP_SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${_sess?.access_token}`,
        },
        body: JSON.stringify({ email: app.email, full_name: app.full_name }),
      });

      // Send password reset / welcome email
      await supabase.auth.resetPasswordForEmail(app.email, {
        redirectTo: "https://app.winwithone.com",
      });

      // 5. Mark application as approved
      await supabase.from("agent_applications").update({
        status:      "approved",
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes,
        contact_id:  contactId,
      }).eq("id", app.id);

      setSaving(false);
      toast({ msg: `${app.full_name} approved — welcome email sent ✓`, type: "success" });
      onUpdated();

    } catch (err) {
      setSaving(false);
      toast({ msg: "Error during approval — check console", type: "error" });
      console.error(err);
    }
  };

  const isApproved = app.status === "approved";
  const isDeclined = app.status === "declined";
  const isPending  = app.status === "pending" || app.status === "hold";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:300,
      display:"flex", justifyContent:"flex-end" }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ width:"min(520px,100vw)", background:C.bg, height:"100vh",
        display:"flex", flexDirection:"column", borderLeft:`1px solid ${C.border}`,
        animation:"slideIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`,
          background:C.surface, display:"flex", alignItems:"center", gap:14 }}>
          <Avatar name={app.full_name} email={app.email} size={44} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:SERIF }}>
              {app.full_name}
            </div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>
              Applied {fmtDate(app.created_at)}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:C.text2, fontSize:20, cursor:"pointer", padding:4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px",
          display:"flex", flexDirection:"column", gap:12 }}>

          {/* Info cards */}
          {[
            { l:"Email",          v: app.email },
            { l:"Phone",          v: app.phone || "—" },
            { l:"License #",      v: app.license_number || "—" },
          ].map(item => (
            <div key={item.l} style={{ display:"flex", justifyContent:"space-between",
              padding:"11px 14px", background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:9, alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.07em" }}>{item.l}</span>
              <span style={{ fontSize:13, color:C.text, fontFamily:FONT }}>{item.v}</span>
            </div>
          ))}

          {/* Biggest goal */}
          {app.biggest_goal && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"14px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                Biggest Goal
              </div>
              <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, lineHeight:1.65 }}>
                "{app.biggest_goal}"
              </div>
            </div>
          )}

          {/* Package that will be assigned */}
          {isPending && (
            <div style={{ background:C.goldDim, border:`1px solid ${C.goldBorder}`,
              borderRadius:10, padding:"13px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.gold, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                Package on Approval
              </div>
              <div style={{ fontSize:13, color:C.text2, fontFamily:FONT }}>
                <strong style={{ color:C.gold }}>ROG Standard</strong>
                {" · "}$100/month · $1,000/transaction · 100% commission kept
              </div>
              <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:4 }}>
                Can be edited in Financials → Agent Packages after approval.
              </div>
            </div>
          )}

          {/* Admin notes */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
              letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
              Admin Notes
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes…" rows={3}
              style={{ width:"100%", padding:"10px 12px", background:C.surface2,
                border:`1px solid ${C.border2}`, borderRadius:8, color:C.text,
                fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical",
                boxSizing:"border-box" }} />
          </div>

          {/* Status if already actioned */}
          {(isApproved || isDeclined) && (
            <div style={{ padding:"11px 14px", background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:9 }}>
              <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                {isApproved ? "✓ Approved" : "✗ Declined"} by {app.reviewed_by} · {fmtDate(app.reviewed_at)}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ padding:"16px 22px", borderTop:`1px solid ${C.border}`,
          background:C.surface, display:"flex", gap:10, flexWrap:"wrap" }}>
          {isPending && (
            <>
              <GoldButton onClick={approve} disabled={saving}>
                {saving && action==="approving" ? "Approving…" : "✓ Approve & Onboard"}
              </GoldButton>
              <GoldButton outline onClick={()=>updateStatus("hold")} disabled={saving}>
                Hold
              </GoldButton>
              <GoldButton danger onClick={()=>updateStatus("declined")} disabled={saving}>
                Decline
              </GoldButton>
            </>
          )}
          {isApproved && (
            <div style={{ fontSize:12, color:C.green, fontFamily:FONT, padding:"8px 0" }}>
              ✓ Approved — agent is active in the system
            </div>
          )}
          {isDeclined && (
            <GoldButton outline onClick={()=>updateStatus("pending")} disabled={saving}>
              Reopen
            </GoldButton>
          )}
          {app.status === "hold" && (
            <>
              <GoldButton onClick={approve} disabled={saving}>
                {saving ? "Approving…" : "✓ Approve & Onboard"}
              </GoldButton>
              <GoldButton danger onClick={()=>updateStatus("declined")} disabled={saving}>
                Decline
              </GoldButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ── P&L Tab (revenue vs expenses → net) ─────────────────────
function PnLTab({ user }) {
  const [yrs,setYrs]=useState([]); const [exp,setExp]=useState([]); const [sel,setSel]=useState("2025"); const [loading,setLoading]=useState(true);
  const money=x=>{x=Number(x||0);const s=x<0?"-":"";x=Math.abs(x);return s+(x>=1e6?"$"+(x/1e6).toFixed(2)+"M":x>=1e3?"$"+Math.round(x/1e3)+"K":"$"+Math.round(x));};
  useEffect(()=>{(async()=>{
    const [b,e]=await Promise.all([
      supabase.from("brokerage_performance_yearly").select("*").eq("org_id",ORG_ID).order("tax_year"),
      supabase.from("expenses").select("txn_date,amount,category_name,status").eq("org_id",ORG_ID).eq("status","posted").limit(2000),
    ]);
    setYrs(b.data||[]); setExp(e.data||[]); setLoading(false);
  })();},[]);
  if(loading) return <div style={{padding:30,color:C.text3,fontFamily:FONT}}>Loading P&L…</div>;
  const years=Array.from(new Set([...yrs.map(y=>String(y.tax_year)),"2025"])).sort();
  const yr=Number(sel); const perf=yrs.find(y=>y.tax_year===yr)||{};
  const expYear=exp.filter(e=>String(e.txn_date||"").slice(0,4)===String(yr));
  const expTotal=expYear.reduce((s,e)=>s+Number(e.amount||0),0);
  const office=Number(perf.net_office||0), gci=Number(perf.gci||0), volume=Number(perf.volume||0), deals=perf.deals||0;
  const net=office-expTotal;
  const byCat={}; expYear.forEach(e=>{const k=e.category_name||"—";byCat[k]=(byCat[k]||0)+Number(e.amount||0);});
  const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]); const maxC=Math.max(1,...cats.map(c=>c[1]));
  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18};
  const lbl={fontSize:11,fontWeight:700,color:C.text3,fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{fontFamily:SERIF,fontSize:20,color:C.text}}>Profit &amp; Loss · {yr}</div>
        <div style={{display:"flex",gap:5,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:4,flexWrap:"wrap"}}>
          {years.map(y=><button key={y} onClick={()=>setSel(y)} style={{padding:"6px 11px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:MONO,fontSize:13,background:sel===y?C.gold:"transparent",color:sel===y?"#0a0a0a":C.text2,fontWeight:sel===y?700:400}}>{y}</button>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:8}}>
        <div style={card}><div style={lbl}>Office Income (revenue)</div><div style={{fontFamily:MONO,fontSize:26,color:C.text,marginTop:6}}>{money(office)}</div></div>
        <div style={card}><div style={lbl}>Operating Expenses</div><div style={{fontFamily:MONO,fontSize:26,color:C.amber,marginTop:6}}>{money(expTotal)}</div></div>
        <div style={{...card,border:`1px solid ${net>=0?C.green:C.red}`}}><div style={lbl}>Net {net>=0?"Profit":"Loss"}</div><div style={{fontFamily:MONO,fontSize:26,color:net>=0?C.green:C.red,marginTop:6}}>{money(net)}</div></div>
        <div style={card}><div style={lbl}>Net Margin</div><div style={{fontFamily:MONO,fontSize:26,color:C.text2,marginTop:6}}>{office?Math.round(net/office*100)+"%":"—"}</div></div>
      </div>
      <div style={{fontSize:11.5,color:C.text3,fontFamily:FONT,margin:"4px 2px 18px"}}>Revenue = office income retained by the brokerage. Agent production (GCI) for {yr}: <b style={{color:C.text2,fontFamily:MONO}}>{money(gci)}</b> across <b style={{color:C.text2,fontFamily:MONO}}>{deals}</b> deals · volume <b style={{color:C.text2,fontFamily:MONO}}>{money(volume)}</b> — mostly paid out to agents, shown for reference.</div>
      <div style={card}>
        <div style={{...lbl,marginBottom:14}}>Expenses by category · {yr}</div>
        {cats.length===0 && <div style={{color:C.text3,fontSize:13}}>No expenses recorded for {yr}.</div>}
        {cats.map(([c,v])=>(
          <div key={c} style={{marginBottom:9}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,marginBottom:3}}><span style={{color:C.text2}}>{c}</span><span style={{fontFamily:MONO,color:C.text}}>{money(v)}</span></div>
            <div style={{height:6,background:C.surface2,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:Math.round(v/maxC*100)+"%",background:`linear-gradient(90deg,${C.gold},${C.goldLight})`}}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Transactions Tab (all expenses, interactive) ────────────
function TransactionsTab({ user }) {
  const [rows,setRows]=useState([]); const [cats,setCats]=useState([]); const [loading,setLoading]=useState(true);
  const [stat,setStat]=useState("all"); const [cat,setCat]=useState("all"); const [mon,setMon]=useState("all"); const [search,setSearch]=useState("");
  const [sel,setSel]=useState(null); const [editCat,setEditCat]=useState(""); const [editStat,setEditStat]=useState(""); const [saving,setSaving]=useState(false); const [toast,setToast]=useState(null);
  const isLeader=["admin","owner"].includes(user?.role);
  const money=x=>{x=Number(x||0);return "$"+Math.round(x).toLocaleString();};
  const load=async()=>{ const [e,c]=await Promise.all([
    supabase.from("expenses").select("*").eq("org_id",ORG_ID).order("txn_date",{ascending:false}).limit(2000),
    supabase.from("expense_categories").select("id,name").eq("org_id",ORG_ID).order("sort")]);
    setRows(e.data||[]); setCats(c.data||[]); setLoading(false); };
  useEffect(()=>{load();},[]);
  if(loading) return <div style={{padding:30,color:C.text3,fontFamily:FONT}}>Loading transactions…</div>;
  const months=Array.from(new Set(rows.map(r=>String(r.txn_date||"").slice(0,7)).filter(Boolean))).sort().reverse();
  const f=rows.filter(r=>{
    if(stat!=="all"&&r.status!==stat) return false;
    if(cat!=="all"&&r.category_name!==cat) return false;
    if(mon!=="all"&&String(r.txn_date||"").slice(0,7)!==mon) return false;
    if(search&&!`${r.vendor||""} ${r.description||""} ${r.category_name||""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const total=f.reduce((s,r)=>s+(r.status==="void"?0:Number(r.amount||0)),0);
  const selStyle={padding:"7px 10px",background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:FONT,outline:"none"};
  const open=r=>{setSel(r);setEditCat(r.category_name||"");setEditStat(r.status||"posted");};
  const save=async()=>{ setSaving(true); const c=cats.find(x=>x.name===editCat);
    await supabase.from("expenses").update({category_id:c?.id,category_name:editCat,status:editStat,created_by:user?.email}).eq("id",sel.id);
    await supabase.from("intelligence_activity_log").insert({org_id:ORG_ID,actor:"user",action:`Edited ${sel.vendor||"txn"} → ${editCat} (${editStat})`,entity_type:"expense",entity_id:String(sel.id),detail:{amount:sel.amount}});
    setSaving(false); setSel(null); setToast({msg:"Updated",type:"success"}); load(); };
  const badge=s=>({posted:C.green,void:C.text3,review:C.amber}[s]||C.text2);
  return (
    <div>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vendor / description…" style={{...selStyle,width:220}} />
        <select value={cat} onChange={e=>setCat(e.target.value)} style={selStyle}><option value="all">All categories</option>{cats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
        <select value={mon} onChange={e=>setMon(e.target.value)} style={selStyle}><option value="all">All months</option>{months.map(m=><option key={m} value={m}>{m}</option>)}</select>
        <select value={stat} onChange={e=>setStat(e.target.value)} style={selStyle}><option value="all">All statuses</option><option value="posted">Posted</option><option value="void">Void (non-P&L)</option><option value="review">Purgatory</option></select>
      </div>
      <div style={{display:"flex",gap:18,marginBottom:12,fontFamily:FONT,fontSize:12,color:C.text2}}>
        <span><b style={{color:C.text,fontFamily:MONO}}>{f.length}</b> transactions</span>
        <span>P&amp;L total <b style={{color:C.text,fontFamily:MONO}}>{money(total)}</b></span>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"0.7fr 1.5fr 1.3fr 0.7fr 0.5fr",minWidth:560,padding:"9px 16px",borderBottom:`1px solid ${C.border}`}}>
          {["Date","Vendor","Category","Amount","Status"].map(h=><span key={h} style={{fontSize:10,fontWeight:700,color:C.text3,fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</span>)}
        </div>
        {f.slice(0,400).map(r=>(
          <div key={r.id} onClick={()=>open(r)} style={{display:"grid",gridTemplateColumns:"0.7fr 1.5fr 1.3fr 0.7fr 0.5fr",minWidth:560,padding:"11px 16px",borderBottom:`1px solid ${C.border}`,alignItems:"center",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background=C.surface2} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{fontSize:12,color:C.text3,fontFamily:MONO}}>{String(r.txn_date||"").slice(5)}</span>
            <span style={{fontSize:12.5,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.vendor||"—"}</span>
            <span style={{fontSize:12,color:C.text2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.category_name||"—"}</span>
            <span style={{fontSize:12,fontFamily:MONO,color:C.text}}>{money(r.amount)}</span>
            <span style={{fontSize:10.5,fontFamily:MONO,color:badge(r.status)}}>{r.status}</span>
          </div>
        ))}
        {f.length>400 && <div style={{padding:"12px",textAlign:"center",color:C.text3,fontSize:12}}>Showing first 400 of {f.length} — narrow with a filter.</div>}
      </div>
      {sel&&(
        <Modal title="Transaction" onClose={()=>setSel(null)} maxWidth={520}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:16,fontWeight:700,color:C.text,fontFamily:SERIF}}>{sel.vendor||"—"}</div>
            <div style={{display:"flex",gap:18,flexWrap:"wrap",fontSize:12.5,color:C.text2,fontFamily:MONO}}>
              <span>{sel.txn_date}</span><span style={{color:C.text}}>{money(sel.amount)}</span>
            </div>
            <div style={{fontSize:12.5,color:C.text3,fontFamily:FONT,lineHeight:1.5,background:C.surface2,padding:"10px 12px",borderRadius:8}}>{sel.description||"No description"}</div>
            {sel.raw && <div style={{fontSize:11,color:C.text3,fontFamily:MONO}}>{Object.entries(sel.raw).filter(([k])=>["acct_type","account","vendor_id","src_tab"].includes(k)).map(([k,v])=>`${k}: ${v}`).join(" · ")}</div>}
            {isLeader ? (<>
              <Sel label="Category" value={editCat} onChange={setEditCat} options={cats.map(c=>c.name)} />
              <Sel label="Status" value={editStat} onChange={setEditStat} options={["posted","void","review"]} />
              <div style={{display:"flex",gap:10,paddingTop:4}}>
                <GoldButton onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</GoldButton>
                <GoldButton outline onClick={()=>setSel(null)}>Close</GoldButton>
              </div>
            </>) : <div style={{fontSize:12,color:C.text3}}>Category: {sel.category_name} · {sel.status}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Banking Tab (accounts / vendors / statements / transfers) ──
function BankingTab({ user }) {
  const [sub,setSub]=useState("accounts");
  const [acc,setAcc]=useState([]); const [ven,setVen]=useState([]); const [stm,setStm]=useState([]); const [trf,setTrf]=useState([]);
  const [loading,setLoading]=useState(true); const [vq,setVq]=useState(""); const [tdir,setTdir]=useState("all");
  const money=x=>{x=Number(x||0);const s=x<0?"-":"";x=Math.abs(x);return s+(x>=1e6?"$"+(x/1e6).toFixed(2)+"M":x>=1e3?"$"+Math.round(x/1e3)+"K":"$"+Math.round(x));};
  useEffect(()=>{(async()=>{
    const [a,v,s,t]=await Promise.all([
      supabase.from("roga_accounts").select("*").eq("org_id",ORG_ID),
      supabase.from("roga_vendors").select("*").eq("org_id",ORG_ID).order("ytd_total"),
      supabase.from("roga_statements").select("*").eq("org_id",ORG_ID).order("period_end"),
      supabase.from("roga_transfers").select("*").eq("org_id",ORG_ID).order("txn_date",{ascending:false}).limit(1000),
    ]);
    setAcc(a.data||[]);setVen(v.data||[]);setStm(s.data||[]);setTrf(t.data||[]);setLoading(false);
  })();},[]);
  if(loading) return <div style={{padding:30,color:C.text3,fontFamily:FONT}}>Loading banking…</div>;
  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:16};
  const lbl={fontSize:10,fontWeight:700,color:C.text3,fontFamily:FONT,letterSpacing:"0.07em",textTransform:"uppercase"};
  const SUB=[["accounts","Accounts"],["vendors","Vendors"],["statements","Statements"],["transfers","Transfers"]];
  const venF=ven.filter(v=>!vq||`${v.vendor_name} ${v.subcategory}`.toLowerCase().includes(vq.toLowerCase()));
  const trfF=trf.filter(t=>tdir==="all"||t.direction===tdir);
  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {SUB.map(([id,l])=><button key={id} onClick={()=>setSub(id)} style={{padding:"7px 13px",borderRadius:8,border:`1px solid ${sub===id?C.goldBorder:C.border}`,background:sub===id?C.goldDim:"transparent",color:sub===id?C.gold:C.text2,fontFamily:FONT,fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
      </div>
      {sub==="accounts" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
          {acc.map(a=><div key={a.account_id} style={card}><div style={lbl}>{a.type}</div><div style={{fontFamily:SERIF,fontSize:17,color:C.text,marginTop:6}}>{a.name}</div><div style={{fontFamily:MONO,fontSize:13,color:C.text2,marginTop:4}}>{a.institution} ····{a.last4}</div>{a.notes&&<div style={{fontSize:11,color:C.text3,marginTop:8}}>{a.notes}</div>}</div>)}
        </div>
      )}
      {sub==="vendors" && (<div>
        <input value={vq} onChange={e=>setVq(e.target.value)} placeholder="Search vendors…" style={{padding:"8px 12px",background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:FONT,outline:"none",width:240,marginBottom:12}} />
        <div style={{...card,padding:"4px 0",overflowX:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1.8fr 1fr 0.5fr 0.8fr",minWidth:480,padding:"8px 16px",borderBottom:`1px solid ${C.border}`}}>{["Vendor","Subcategory","Txns","YTD"].map(h=><span key={h} style={lbl}>{h}</span>)}</div>
          {venF.slice(0,250).map(v=><div key={v.vendor_id} style={{display:"grid",gridTemplateColumns:"1.8fr 1fr 0.5fr 0.8fr",minWidth:480,padding:"9px 16px",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}><span style={{fontSize:12.5,color:C.text,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v.vendor_name}</span><span style={{fontSize:11.5,color:C.text3}}>{v.subcategory}</span><span style={{fontSize:12,fontFamily:MONO,color:C.text3}}>{v.txn_count}</span><span style={{fontSize:12,fontFamily:MONO,color:v.ytd_total<0?C.text:C.green}}>{money(v.ytd_total)}</span></div>)}
          {venF.length>250 && <div style={{padding:10,textAlign:"center",color:C.text3,fontSize:12}}>Showing 250 of {venF.length}</div>}
        </div></div>
      )}
      {sub==="statements" && (
        <div style={{...card,padding:"4px 0",overflowX:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"0.6fr 1fr 1fr 1fr 1fr",minWidth:520,padding:"8px 16px",borderBottom:`1px solid ${C.border}`}}>{["Acct","Period","Begin","End","Net flow"].map(h=><span key={h} style={lbl}>{h}</span>)}</div>
          {stm.map((s,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"0.6fr 1fr 1fr 1fr 1fr",minWidth:520,padding:"9px 16px",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}><span style={{fontSize:12,fontFamily:MONO,color:C.text2}}>····{s.account_last4}</span><span style={{fontSize:11.5,fontFamily:MONO,color:C.text3}}>{s.period_start} → {s.period_end}</span><span style={{fontSize:12,fontFamily:MONO,color:C.text2}}>{money(s.begin_balance)}</span><span style={{fontSize:12,fontFamily:MONO,color:C.text}}>{money(s.end_balance)}</span><span style={{fontSize:12,fontFamily:MONO,color:(s.end_balance-s.begin_balance)>=0?C.green:C.red}}>{money(s.end_balance-s.begin_balance)}</span></div>)}
        </div>
      )}
      {sub==="transfers" && (<div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>{["all","IN","OUT"].map(d=><button key={d} onClick={()=>setTdir(d)} style={{padding:"5px 11px",borderRadius:7,border:`1px solid ${tdir===d?C.goldBorder:C.border}`,background:tdir===d?C.goldDim:"transparent",color:tdir===d?C.gold:C.text2,fontSize:12,cursor:"pointer",fontFamily:FONT}}>{d==="all"?"All":d}</button>)}</div>
        <div style={{...card,padding:"4px 0",overflowX:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"0.7fr 0.5fr 1.4fr 0.8fr 0.6fr",minWidth:540,padding:"8px 16px",borderBottom:`1px solid ${C.border}`}}>{["Date","Acct","Counterparty","Amount","Type"].map(h=><span key={h} style={lbl}>{h}</span>)}</div>
          {trfF.slice(0,250).map(t=><div key={t.id} style={{display:"grid",gridTemplateColumns:"0.7fr 0.5fr 1.4fr 0.8fr 0.6fr",minWidth:540,padding:"9px 16px",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}><span style={{fontSize:11.5,fontFamily:MONO,color:C.text3}}>{t.txn_date}</span><span style={{fontSize:11.5,fontFamily:MONO,color:C.text3}}>····{t.account_last4}</span><span style={{fontSize:12,color:C.text2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.counterparty}</span><span style={{fontSize:12,fontFamily:MONO,color:t.direction==="IN"?C.green:C.text}}>{money(t.amount)}</span><span style={{fontSize:10.5,color:C.text3}}>{t.type}</span></div>)}
          {trfF.length>250 && <div style={{padding:10,textAlign:"center",color:C.text3,fontSize:12}}>Showing 250 of {trfF.length}</div>}
        </div></div>
      )}
    </div>
  );
}

// ── Insights Tab (reconciliation / cashflow / recs / flags / DQ) ──
function InsightsTab({ user }) {
  const [sub,setSub]=useState("recon");
  const [rec,setRec]=useState([]); const [cf,setCf]=useState([]); const [cuts,setCuts]=useState([]); const [flags,setFlags]=useState([]); const [dq,setDq]=useState([]);
  const [loading,setLoading]=useState(true);
  const money=x=>{x=Number(x||0);const s=x<0?"-":"";x=Math.abs(x);return s+(x>=1e6?"$"+(x/1e6).toFixed(2)+"M":x>=1e3?"$"+Math.round(x/1e3)+"K":"$"+Math.round(x));};
  useEffect(()=>{(async()=>{
    const [r,c,k,f,d]=await Promise.all([
      supabase.from("bank_deal_reconciliation").select("*").eq("org_id",ORG_ID),
      supabase.from("monthly_cashflow_trends").select("*").eq("org_id",ORG_ID),
      supabase.from("expense_reduction_recommendations").select("*").eq("org_id",ORG_ID).order("est_savings",{ascending:false}),
      supabase.from("finance_flags").select("*").eq("org_id",ORG_ID),
      supabase.from("data_quality_log").select("*").eq("org_id",ORG_ID),
    ]);
    setRec(r.data||[]);setCf(c.data||[]);setCuts(k.data||[]);setFlags(f.data||[]);setDq(d.data||[]);setLoading(false);
  })();},[]);
  if(loading) return <div style={{padding:30,color:C.text3,fontFamily:FONT}}>Loading insights…</div>;
  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:16};
  const lbl={fontSize:10,fontWeight:700,color:C.text3,fontFamily:FONT,letterSpacing:"0.07em",textTransform:"uppercase"};
  const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const cfo=MON.map(m=>cf.find(x=>x.month===m)).filter(Boolean);
  const maxAbs=Math.max(1,...cfo.map(x=>Math.abs(Number(x.net||0))));
  const sev=s=>({High:C.red,Med:C.amber,Low:C.text3}[s]||C.text2);
  const SUB=[["recon","Reconciliation"],["cashflow","Cashflow"],["cuts","Cost Cuts"],["flags","Red Flags"],["dq","Data Quality"]];
  const savings=cuts.reduce((s,c)=>s+Number(c.est_savings||0),0);
  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {SUB.map(([id,l])=><button key={id} onClick={()=>setSub(id)} style={{padding:"7px 13px",borderRadius:8,border:`1px solid ${sub===id?C.goldBorder:C.border}`,background:sub===id?C.goldDim:"transparent",color:sub===id?C.gold:C.text2,fontFamily:FONT,fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
      </div>
      {sub==="recon" && (<div style={{...card,padding:"4px 0",overflowX:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr 1fr 1fr",minWidth:460,padding:"8px 16px",borderBottom:`1px solid ${C.border}`}}>{["Measure","Deal side","Bank side","Variance"].map(h=><span key={h} style={lbl}>{h}</span>)}</div>
        {rec.map((r,i)=><div key={i} style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`}}><div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr 1fr 1fr",minWidth:460,alignItems:"center"}}><span style={{fontSize:12.5,color:C.text,fontWeight:600}}>{r.measure}</span><span style={{fontSize:12,fontFamily:MONO,color:C.text2}}>{money(r.deal_side)}</span><span style={{fontSize:12,fontFamily:MONO,color:C.text2}}>{money(r.bank_side)}</span><span style={{fontSize:12,fontFamily:MONO,color:C.gold}}>{money(r.variance)}</span></div>{r.note&&<div style={{fontSize:11,color:C.text3,marginTop:4}}>{r.note}</div>}</div>)}
      </div>)}
      {sub==="cashflow" && (<div style={card}>
        <div style={{...lbl,marginBottom:14}}>2025 monthly net</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:160}}>
          {cfo.map(x=>{const n=Number(x.net||0);const h=Math.max(2,Math.round(Math.abs(n)/maxAbs*70));return <div key={x.month} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"}}><div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}><div style={{height:h+"px",background:n>=0?C.green:C.red,borderRadius:"4px 4px 0 0",minWidth:14}}/></div><div style={{fontSize:9.5,fontFamily:MONO,color:C.text3,marginTop:4}}>{x.month}</div></div>;})}
        </div>
        <div style={{marginTop:14,fontSize:12,color:C.text2,fontFamily:FONT}}>Year net: <b style={{fontFamily:MONO,color:cf.reduce((s,x)=>s+Number(x.net||0),0)>=0?C.green:C.red}}>{money(cf.reduce((s,x)=>s+Number(x.net||0),0))}</b> · income <b style={{fontFamily:MONO,color:C.text}}>{money(cf.reduce((s,x)=>s+Number(x.income||0),0))}</b></div>
      </div>)}
      {sub==="cuts" && (<div>
        <div style={{fontSize:12.5,color:C.text2,marginBottom:10}}>Estimated annual savings if actioned: <b style={{color:C.green,fontFamily:MONO}}>{money(savings)}</b></div>
        <div style={{...card,padding:"4px 0",overflowX:"auto"}}>{cuts.map((c,i)=><div key={i} style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><span style={{fontSize:13,color:C.text,fontWeight:600}}>{c.vendor_item}</span><span style={{fontSize:10,fontFamily:MONO,padding:"2px 7px",borderRadius:6,background:sev(c.priority)+"22",color:sev(c.priority)}}>{c.priority}</span></div><div style={{fontSize:11.5,color:C.text3,marginTop:3}}>{c.reason} → <span style={{color:C.text2}}>{c.action}</span></div><div style={{fontSize:11.5,fontFamily:MONO,color:C.text3,marginTop:3}}>spend {money(c.annual_spend)} · save <span style={{color:C.green}}>{money(c.est_savings)}</span></div></div>)}</div>
      </div>)}
      {sub==="flags" && (<div style={{...card,padding:"4px 0",overflowX:"auto"}}>
        {flags.map((f,i)=><div key={i} style={{display:"flex",gap:10,padding:"10px 16px",borderBottom:`1px solid ${C.border}`,alignItems:"flex-start"}}><span style={{width:8,height:8,borderRadius:"50%",background:sev(f.severity),marginTop:5,flexShrink:0}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,color:C.text}}>{f.issue}</div><div style={{fontSize:11,color:C.text3,fontFamily:MONO}}>{f.flag_date} · {f.account} · {money(f.amount)}{f.vendor?` · ${f.vendor}`:""}</div></div><span style={{fontSize:10,color:sev(f.severity),fontFamily:MONO}}>{f.severity}</span></div>)}
      </div>)}
      {sub==="dq" && (<div style={{...card,padding:"4px 0",overflowX:"auto"}}>
        {dq.map((d,i)=><div key={i} style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:12.5,color:C.text,fontWeight:600}}>{d.source} · {d.location}</div><div style={{fontSize:11.5,color:C.text2,marginTop:2}}>{d.issue}{d.detail?` — ${d.detail}`:""}</div><div style={{fontSize:11,color:C.text3,marginTop:2}}>✓ {d.action_taken}</div></div>)}
      </div>)}
    </div>
  );
}

function FinancialsView({ user }) {
  const [tab, setTab]         = useState("pnl");
  const [agents, setAgents]   = useState([]);
  const [packages, setPkgs]   = useState([]);
  const [financials, setFins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const isMobile              = useIsMobile();

  const loadAll = async () => {
    setLoading(true);
    const [a, p, f] = await Promise.all([
      fetchAllRows(()=>supabase.from("contacts").select("id,full_name,email,phone,contact_type")
        .eq("org_id", ORG_ID).eq("contact_type", "Agent").order("full_name")),
      supabase.from("agent_fee_packages").select("*")
        .eq("org_id", ORG_ID).eq("is_active", true),
      fetchAllRows(()=>supabase.from("deal_financials").select("*, deals(address,city,state,status), contacts(full_name)")
        .eq("org_id", ORG_ID).order("created_at", {ascending: false})),
    ]);
    setAgents(a || []);
    setPkgs(p.data || []);
    setFins(f || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const pkgForAgent = (id) => packages.find(p => p.contact_id === id);

  const TABS = [
    { id:"pnl",         label:"P&L",              icon:"◑" },
    { id:"transactions",label:"Transactions",     icon:"≡" },
    { id:"books",       label:"Bookkeeping",      icon:"🧠" },
    { id:"banking",     label:"Banking",          icon:"🏦" },
    { id:"insights",    label:"Insights",         icon:"🔎" },
    { id:"packages",   label:"Agent Packages",   icon:"◈" },
    { id:"deals",      label:"Deal P&L",          icon:"$" },
    { id:"projection", label:"Monthly Projection",icon:"◷" },
  ];

  const fmt = n => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${(n||0).toFixed(0)}`;

  return (
    <div style={{ padding: isMobile?"12px":"20px 24px", maxWidth:1100 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      {/* Tab bar */}
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:`1px solid ${C.border}`,
        overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"10px 18px", border:"none", background:"transparent", cursor:"pointer",
            color: tab===t.id ? C.gold : C.text2, fontFamily:FONT, fontSize:13,
            fontWeight: tab===t.id ? 700 : 400, whiteSpace:"nowrap",
            borderBottom: `2px solid ${tab===t.id ? C.gold : "transparent"}`,
            transition:"color 0.1s",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
          Loading financials…
        </div>
      ) : tab === "pnl" ? (
        <PnLTab user={user} />
      ) : tab === "transactions" ? (
        <TransactionsTab user={user} />
      ) : tab === "books" ? (
        <IntelligenceView user={user} />
      ) : tab === "banking" ? (
        <BankingTab user={user} />
      ) : tab === "insights" ? (
        <InsightsTab user={user} />
      ) : tab === "packages" ? (
        <PackagesTab agents={agents} packages={packages} pkgForAgent={pkgForAgent}
          onRefresh={loadAll} user={user} toast={setToast} fmt={fmt} isMobile={isMobile} />
      ) : tab === "deals" ? (
        <DealsFinancialsTab financials={financials} onRefresh={loadAll}
          agents={agents} packages={packages} pkgForAgent={pkgForAgent}
          user={user} toast={setToast} fmt={fmt} isMobile={isMobile} />
      ) : (
        <ProjectionTab financials={financials} agents={agents}
          pkgForAgent={pkgForAgent} fmt={fmt} isMobile={isMobile} />
      )}
    </div>
  );
}

// ── Packages Tab ─────────────────────────────────────────────
function PackagesTab({ agents, packages, pkgForAgent, onRefresh, user, toast, fmt, isMobile }) {
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all"); // all | has_package | no_package
  const [selected, setSelected] = useState(null);

  const withPkg    = agents.filter(a => pkgForAgent(a.id));
  const withoutPkg = agents.filter(a => !pkgForAgent(a.id));

  const filtered = agents.filter(a => {
    if (filter === "has_package"  && !pkgForAgent(a.id)) return false;
    if (filter === "no_package"   &&  pkgForAgent(a.id)) return false;
    if (search && !a.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",
        gap:10, marginBottom:20 }}>
        {[
          { label:"Total Agents",    val:agents.length,      accent:C.text },
          { label:"Have Package",    val:withPkg.length,     accent:C.green },
          { label:"Need Package",    val:withoutPkg.length,  accent:withoutPkg.length>0?C.amber:C.text3 },
        ].map(s => (
          <div key={s.label} style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:22, fontWeight:700, color:s.accent, fontFamily:SERIF }}>{s.val}</div>
            <div style={{ fontSize:10, fontWeight:700, color:C.text2, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search agents…"
            style={{ flex:1, padding:"10px 13px", background:C.surface2,
              border:`1px solid ${C.border2}`, borderRadius:10, color:C.text,
              fontSize:13, fontFamily:FONT, outline:"none" }}
            onFocus={e=>e.target.style.borderColor=C.gold}
            onBlur={e=>e.target.style.borderColor=C.border2} />
        </div>
        <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
          {[["all","All"],["has_package","Has Package"],["no_package","Needs Package"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding:"5px 13px", borderRadius:20, border:`1.5px solid ${filter===v?C.goldBorder:C.border}`,
              background:filter===v?C.goldDim:"transparent",
              color:filter===v?C.gold:C.text2, fontSize:11, fontFamily:FONT,
              cursor:"pointer", whiteSpace:"nowrap" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(agent => {
          const pkg = pkgForAgent(agent.id);
          return (
            <div key={agent.id}
              onClick={() => setSelected(agent)}
              style={{ background:C.surface, border:`1px solid ${pkg?C.border:C.amber+"44"}`,
                borderRadius:12, padding:"14px 16px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:12 }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder}
              onMouseLeave={e=>e.currentTarget.style.borderColor=pkg?C.border:C.amber+"44"}>
              <Avatar name={agent.full_name} email={agent.email} size={38} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{agent.full_name}</div>
                {pkg ? (
                  <div style={{ fontSize:11, color:C.text2, fontFamily:FONT, marginTop:2 }}>
                    <span style={{ color:C.gold, fontWeight:600 }}>{pkg.package_name}</span>
                    {" · "}{pkg.split_agent_pct}% agent / {pkg.split_brokerage_pct}% brokerage
                    {pkg.flat_transaction_fee > 0 ? ` · $${pkg.flat_transaction_fee} flat fee` : ""}
                    {pkg.e_and_o_fee > 0 ? ` · $${pkg.e_and_o_fee} E&O` : ""}
                  </div>
                ) : (
                  <div style={{ fontSize:11, color:C.amber, fontFamily:FONT, fontWeight:600, marginTop:2 }}>
                    No package assigned
                  </div>
                )}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                {pkg ? (
                  <span style={{ fontSize:10, fontWeight:700, color:C.green,
                    background:"rgba(34,197,94,0.10)", borderRadius:20, padding:"2px 8px" }}>
                    Active
                  </span>
                ) : (
                  <span style={{ fontSize:10, fontWeight:700, color:C.amber,
                    background:"rgba(245,158,11,0.10)", borderRadius:20, padding:"2px 8px" }}>
                    Set up
                  </span>
                )}
                <span style={{ fontSize:16, color:C.text3 }}>›</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding:"40px 0", textAlign:"center", color:C.text3,
            fontSize:13, fontFamily:FONT }}>No agents match your filter</div>
        )}
      </div>

      {/* Package edit panel */}
      {selected && (
        <PackagePanel
          agent={selected}
          existingPkg={pkgForAgent(selected.id)}
          user={user}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); onRefresh(); toast({msg:"Package saved",type:"success"}); }}
          fmt={fmt}
        />
      )}
    </div>
  );
}

// ── Package Panel (slide-in) ──────────────────────────────────
function PackagePanel({ agent, existingPkg, user, onClose, onSaved, fmt }) {
  const [form, setForm] = useState({
    package_name:         existingPkg?.package_name        || "ROG Standard 80/20",
    fee_structure:        existingPkg?.fee_structure        || "split_plus_flat",
    split_agent_pct:      existingPkg?.split_agent_pct      ?? 80,
    split_brokerage_pct:  existingPkg?.split_brokerage_pct  ?? 20,
    monthly_fee:          existingPkg?.monthly_fee           ?? 100,
    flat_transaction_fee: existingPkg?.flat_transaction_fee ?? 1000,
    e_and_o_fee:          existingPkg?.e_and_o_fee           ?? 0,
    royalty_fee_pct:      existingPkg?.royalty_fee_pct       || "",
    co_op_split_pct:      existingPkg?.co_op_split_pct       || "",
    notes:                existingPkg?.notes                 || "",
    effective_date:       existingPkg?.effective_date        || new Date().toISOString().slice(0,10),
  });
  const [saving, setSaving] = useState(false);
  const setF = (k,v) => setForm(f => ({...f, [k]:v}));

  // Live calculation preview — uses $500K @ 3% as example
  const EXAMPLE_PRICE = 500000;
  const EXAMPLE_RATE  = 3;
  const grossComm      = EXAMPLE_PRICE * EXAMPLE_RATE / 100;
  const agentGross     = grossComm * (Number(form.split_agent_pct)||0) / 100;
  const royaltyAmt     = form.royalty_fee_pct ? agentGross * Number(form.royalty_fee_pct) / 100 : 0;
  const agentNet       = agentGross
    - (Number(form.flat_transaction_fee)||0)
    - (Number(form.e_and_o_fee)||0)
    - royaltyAmt;
  const brokerageNet   = grossComm - agentNet;

  const save = async () => {
    setSaving(true);
    // Deactivate existing package if any
    if (existingPkg) {
      await supabase.from("agent_fee_packages")
        .update({ is_active:false, updated_at:new Date().toISOString() })
        .eq("id", existingPkg.id);
    }
    // Create new active package
    const { error } = await supabase.from("agent_fee_packages").insert({
      org_id:      ORG_ID,
      contact_id:  agent.id,
      package_name:         form.package_name,
      fee_structure:        form.fee_structure,
      split_agent_pct:      Number(form.split_agent_pct),
      split_brokerage_pct:  Number(form.split_brokerage_pct),
      monthly_fee:          Number(form.monthly_fee)||0,
      flat_transaction_fee: Number(form.flat_transaction_fee)||0,
      e_and_o_fee:          Number(form.e_and_o_fee)||0,
      royalty_fee_pct:      form.royalty_fee_pct !== "" ? Number(form.royalty_fee_pct) : null,
      co_op_split_pct:      form.co_op_split_pct  !== "" ? Number(form.co_op_split_pct)  : null,
      notes:           form.notes,
      effective_date:  form.effective_date,
      is_active:       true,
      created_by:      user?.email,
    });
    setSaving(false);
    if (!error) onSaved();
  };

  const PCT_SUM_OK = (Number(form.split_agent_pct)||0) + (Number(form.split_brokerage_pct)||0) === 100;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:300,
      display:"flex", justifyContent:"flex-end" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>

      <div style={{ width:"min(540px,100vw)", background:C.bg, height:"100vh",
        display:"flex", flexDirection:"column", borderLeft:`1px solid ${C.border}`,
        animation:"slideIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`,
          background:C.surface, display:"flex", alignItems:"center", gap:14 }}>
          <Avatar name={agent.full_name} email={agent.email} size={40} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:SERIF }}>
              {agent.full_name}
            </div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>
              {existingPkg ? `Editing: ${existingPkg.package_name}` : "No package — setting up now"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:C.text2, fontSize:20, cursor:"pointer", padding:4 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px",
          display:"flex", flexDirection:"column", gap:16 }}>

          {/* Package name + structure */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Package Name" value={form.package_name}
              onChange={v=>setF("package_name",v)} placeholder="e.g. ROG Standard 80/20" />
            <Sel label="Fee Structure" value={form.fee_structure} onChange={v=>setF("fee_structure",v)}
              options={[
                {value:"split",          label:"Split only"},
                {value:"flat",           label:"Flat fee only"},
                {value:"split_plus_flat",label:"Split + Flat fee"},
              ]} />
          </div>

          {/* Split */}
          {form.fee_structure !== "flat" && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
                Commission Split
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:10 }}>
                <div>
                  <Field label="Agent gets %" value={String(form.split_agent_pct)}
                    onChange={v=>{ setF("split_agent_pct",v); setF("split_brokerage_pct", 100 - Number(v)); }}
                    placeholder="80" />
                </div>
                <div>
                  <Field label="Brokerage gets %" value={String(form.split_brokerage_pct)}
                    onChange={v=>{ setF("split_brokerage_pct",v); setF("split_agent_pct", 100 - Number(v)); }}
                    placeholder="20" />
                </div>
              </div>
              {!PCT_SUM_OK && (
                <div style={{ fontSize:11, color:C.amber, fontFamily:FONT }}>
                  ⚠️ Agent % + Brokerage % must equal 100
                </div>
              )}
              {PCT_SUM_OK && (
                <div style={{ fontSize:11, color:C.green, fontFamily:FONT }}>
                  ✓ Split totals 100%
                </div>
              )}
            </div>
          )}

          {/* Per-transaction fees */}
          {form.fee_structure !== "split" && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
                Per-Transaction Fees
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Monthly Fee ($)" value={String(form.monthly_fee||"")}
                  onChange={v=>setF("monthly_fee",v)} placeholder="100" />
                <Field label="Transaction Fee ($)" value={String(form.flat_transaction_fee)}
                  onChange={v=>setF("flat_transaction_fee",v)} placeholder="1000" />
                <Field label="E&O Fee ($)" value={String(form.e_and_o_fee)}
                  onChange={v=>setF("e_and_o_fee",v)} placeholder="0" />
              </div>
            </div>
          )}

          {/* Optional fields */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
              Optional Fields
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Royalty Fee %" value={String(form.royalty_fee_pct)}
                onChange={v=>setF("royalty_fee_pct",v)} placeholder="Leave blank" />
              <Field label="Co-op Split %" value={String(form.co_op_split_pct)}
                onChange={v=>setF("co_op_split_pct",v)} placeholder="Leave blank" />
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Effective Date" value={form.effective_date}
              onChange={v=>setF("effective_date",v)} type="date" />
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
              letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>
              Notes
            </label>
            <textarea value={form.notes} onChange={e=>setF("notes",e.target.value)}
              placeholder="Any special terms or notes…" rows={2}
              style={{ width:"100%", padding:"9px 12px", background:C.surface2,
                border:`1px solid ${C.border2}`, borderRadius:7, color:C.text,
                fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical",
                boxSizing:"border-box" }} />
          </div>

          {/* ── Live Calculation Preview ── */}
          <div style={{ background:C.goldDim, border:`1px solid ${C.goldBorder}`,
            borderRadius:12, padding:"16px 18px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
              Live Preview — $500K sale @ 3% commission
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[
                { label:"Gross Commission",  val:grossComm,    color:C.text },
                { label:"Agent Gross ("+(form.split_agent_pct||0)+"%)", val:agentGross, color:C.text },
                form.flat_transaction_fee > 0 && { label:"− Transaction Fee", val:-Number(form.flat_transaction_fee), color:C.red },
                form.e_and_o_fee > 0 && { label:"− E&O Fee", val:-Number(form.e_and_o_fee), color:C.red },
                form.royalty_fee_pct && { label:`− Royalty (${form.royalty_fee_pct}%)`, val:-royaltyAmt, color:C.red },
              ].filter(Boolean).map((row, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between",
                  padding:"4px 0", borderBottom:`1px solid ${C.goldBorder}` }}>
                  <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{row.label}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:row.color, fontFamily:MONO }}>
                    {row.val >= 0 ? fmt(row.val) : `−${fmt(Math.abs(row.val))}`}
                  </span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0" }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>Agent Net</span>
                <span style={{ fontSize:13, fontWeight:700, color:C.green, fontFamily:MONO }}>{fmt(agentNet)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
                <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>Brokerage keeps</span>
                <span style={{ fontSize:12, fontWeight:700, color:C.gold, fontFamily:MONO }}>{fmt(brokerageNet)}</span>
              </div>
            </div>
          </div>

          <div style={{ display:"flex", gap:10, paddingTop:4, paddingBottom:20 }}>
            <GoldButton onClick={save} disabled={saving || !PCT_SUM_OK}>
              {saving ? "Saving…" : existingPkg ? "Update Package" : "Save Package"}
            </GoldButton>
            <GoldButton onClick={onClose} outline>Cancel</GoldButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Deal Financials Tab ───────────────────────────────────────
function DealsFinancialsTab({ financials, onRefresh, agents, packages, pkgForAgent, user, toast, fmt, isMobile }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd]           = useState(false);

  const filtered = financials.filter(f =>
    statusFilter === "all" || f.status === statusFilter
  );

  const STATUS_COLOR = {
    projected:     { color:C.text2, bg:C.surface2 },
    pending_close: { color:C.amber, bg:"rgba(245,158,11,0.10)" },
    closed:        { color:C.green, bg:"rgba(34,197,94,0.10)" },
    paid:          { color:C.gold,  bg:C.goldDim },
  };

  const totalBrokerageNet = filtered.reduce((s,f) => s+(f.brokerage_net||0), 0);
  const totalAgentNet     = filtered.reduce((s,f) => s+(f.agent_net||0), 0);
  const totalGross        = filtered.reduce((s,f) => s+(f.gross_commission||0), 0);

  return (
    <div>
      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:20 }}>
        {[
          { label:"Gross GCI",        val:fmt(totalGross),        accent:C.text },
          { label:"Total Agent Net",  val:fmt(totalAgentNet),     accent:C.blue },
          { label:"Brokerage Net",    val:fmt(totalBrokerageNet), accent:C.gold },
          { label:"Total Deals",      val:filtered.length,        accent:C.text2 },
        ].map(s => (
          <div key={s.label} style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:20, fontWeight:700, color:s.accent, fontFamily:SERIF }}>{s.val}</div>
            <div style={{ fontSize:10, fontWeight:700, color:C.text2, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + add */}
      <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:5, overflowX:"auto" }}>
          {["all","projected","pending_close","closed","paid"].map(s => (
            <button key={s} onClick={()=>setStatusFilter(s)} style={{
              padding:"5px 12px", borderRadius:20, whiteSpace:"nowrap",
              border:`1.5px solid ${statusFilter===s?C.goldBorder:C.border}`,
              background:statusFilter===s?C.goldDim:"transparent",
              color:statusFilter===s?C.gold:C.text2, fontSize:11, fontFamily:FONT, cursor:"pointer" }}>
              {s==="all"?"All":s.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}
            </button>
          ))}
        </div>
        <div style={{ marginLeft:"auto" }}>
          <GoldButton small onClick={()=>setShowAdd(true)}>+ Add Record</GoldButton>
        </div>
      </div>

      {/* List */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        {!isMobile && (
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 1fr",
            padding:"9px 16px", borderBottom:`1px solid ${C.border}` }}>
            {["Deal","Agent","Gross","Agent Net","Brokerage","Status"].map(h=>(
              <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3,
                fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
            ))}
          </div>
        )}
        {filtered.length === 0 ? (
          <div style={{ padding:"40px 16px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
            No financial records yet. Add one to get started.
          </div>
        ) : filtered.map(f => {
          const cfg = STATUS_COLOR[f.status] || STATUS_COLOR.projected;
          return isMobile ? (
            <div key={f.id} style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>
                    {f.deals?.address || "Untitled deal"}
                  </div>
                  <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                    {f.contacts?.full_name || "—"}
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:cfg.color,
                  background:cfg.bg, borderRadius:20, padding:"3px 9px", height:"fit-content" }}>
                  {f.status?.replace("_"," ")}
                </span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[
                  { l:"Gross", v:f.gross_commission, c:C.text },
                  { l:"Agent", v:f.agent_net,        c:C.blue },
                  { l:"Brokerage", v:f.brokerage_net,c:C.gold },
                ].map(x => (
                  <div key={x.l}>
                    <div style={{ fontSize:9, color:C.text3, fontFamily:FONT,
                      textTransform:"uppercase", letterSpacing:"0.06em" }}>{x.l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:x.c, fontFamily:MONO }}>
                      {x.v ? fmt(x.v) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div key={f.id} style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 1fr",
              padding:"12px 16px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>
                  {f.deals?.address || "Untitled"}
                </div>
                <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                  {f.deals?.city}{f.deals?.state?`, ${f.deals.state}`:""}
                </div>
              </div>
              <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>
                {f.contacts?.full_name || "—"}
              </span>
              <span style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:MONO }}>
                {f.gross_commission ? fmt(f.gross_commission) : "—"}
              </span>
              <span style={{ fontSize:12, fontWeight:600, color:C.blue, fontFamily:MONO }}>
                {f.agent_net ? fmt(f.agent_net) : "—"}
              </span>
              <span style={{ fontSize:12, fontWeight:700, color:C.gold, fontFamily:MONO }}>
                {f.brokerage_net ? fmt(f.brokerage_net) : "—"}
              </span>
              <span style={{ fontSize:11, fontWeight:600, color:cfg.color,
                background:cfg.bg, borderRadius:20, padding:"3px 9px", width:"fit-content" }}>
                {f.status?.replace("_"," ")}
              </span>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <AddDealFinancialModal
          agents={agents} pkgForAgent={pkgForAgent} user={user}
          onClose={()=>setShowAdd(false)}
          onSaved={()=>{ setShowAdd(false); onRefresh(); toast({msg:"Record added",type:"success"}); }}
          fmt={fmt}
        />
      )}
    </div>
  );
}

// ── Add Deal Financial Modal ──────────────────────────────────
function AddDealFinancialModal({ agents, pkgForAgent, user, onClose, onSaved, fmt }) {
  const [agentId,  setAgentId]  = useState("");
  const [dealSearch, setDS]     = useState("");
  const [deals, setDeals]       = useState([]);
  const [dealId, setDealId]     = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [commRate,  setCommRate]  = useState("");
  const [status, setStatus]     = useState("projected");
  const [saving, setSaving]     = useState(false);

  useEffect(()=>{
    supabase.from("deals").select("id,address,city,state,price,commission_rate")
      .eq("org_id",ORG_ID).order("created_at",{ascending:false})
      .then(({data})=>setDeals(data||[]));
  },[]);

  const pkg           = agentId ? pkgForAgent(agentId) : null;
  const price         = parseFloat(salePrice.replace(/[^0-9.]/g,""))||0;
  const rate          = parseFloat(commRate)||0;
  const grossComm     = price * rate / 100;
  const agentGross    = pkg ? grossComm * (pkg.split_agent_pct||80) / 100 : 0;
  const royalty       = pkg?.royalty_fee_pct ? agentGross * pkg.royalty_fee_pct / 100 : 0;
  const agentNet      = agentGross - (pkg?.flat_transaction_fee||0) - (pkg?.e_and_o_fee||0) - royalty;
  const brokerageNet  = grossComm - agentNet;

  const save = async () => {
    if (!agentId || !salePrice || !commRate) return;
    setSaving(true);
    const { error } = await supabase.from("deal_financials").insert({
      org_id:      ORG_ID,
      deal_id:     dealId || null,
      contact_id:  agentId,
      package_id:  pkg?.id || null,
      sale_price:  price,
      commission_rate: rate,
      agent_split_pct: pkg?.split_agent_pct || 80,
      agent_gross: agentGross,
      transaction_fee: pkg?.flat_transaction_fee || 0,
      e_and_o_fee:     pkg?.e_and_o_fee || 0,
      royalty_fee:     royalty,
      brokerage_net:   brokerageNet,
      status,
      created_by: user?.email,
    });
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <Modal title="Add Deal Financial" onClose={onClose} maxWidth={500}>
      <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
            letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Agent</label>
          <select value={agentId} onChange={e=>setAgentId(e.target.value)}
            style={{ width:"100%", padding:"10px 12px", background:C.surface2,
              border:`1px solid ${C.border2}`, borderRadius:7, color:C.text,
              fontSize:13, fontFamily:FONT, outline:"none" }}>
            <option value="">Select agent…</option>
            {agents.map(a=>(
              <option key={a.id} value={a.id}>
                {a.full_name}{pkgForAgent(a.id)?"":" (no package)"}
              </option>
            ))}
          </select>
          {agentId && !pkg && (
            <div style={{ fontSize:11, color:C.amber, fontFamily:FONT, marginTop:4 }}>
              ⚠️ This agent has no package. Set one up first for accurate calculations.
            </div>
          )}
          {pkg && (
            <div style={{ fontSize:11, color:C.green, fontFamily:FONT, marginTop:4 }}>
              ✓ Package: {pkg.package_name} — {pkg.split_agent_pct}% agent / {pkg.split_brokerage_pct}% brokerage
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
            letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>
            Link to Deal (optional)
          </label>
          <select value={dealId} onChange={e=>setDealId(e.target.value)}
            style={{ width:"100%", padding:"10px 12px", background:C.surface2,
              border:`1px solid ${C.border2}`, borderRadius:7, color:C.text,
              fontSize:13, fontFamily:FONT, outline:"none" }}>
            <option value="">No deal linked</option>
            {deals.map(d=>(
              <option key={d.id} value={d.id}>
                {d.address || "Untitled"}{d.city?` · ${d.city}`:""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          <Field label="Sale Price ($)" value={salePrice} onChange={setSalePrice} placeholder="500000" />
          <Field label="Commission %" value={commRate}  onChange={setCommRate}  placeholder="3.0" />
          <Sel   label="Status" value={status} onChange={setStatus}
            options={[
              {value:"projected",     label:"Projected"},
              {value:"pending_close", label:"Pending Close"},
              {value:"closed",        label:"Closed"},
              {value:"paid",          label:"Paid"},
            ]} />
        </div>

        {/* Live preview */}
        {price > 0 && rate > 0 && (
          <div style={{ background:C.goldDim, border:`1px solid ${C.goldBorder}`,
            borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.gold, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Calculation</div>
            {[
              { l:"Gross Commission",  v:grossComm,    c:C.text },
              { l:"Agent Net",        v:agentNet,     c:C.blue },
              { l:"Brokerage Net",    v:brokerageNet, c:C.gold },
            ].map(r=>(
              <div key={r.l} style={{ display:"flex", justifyContent:"space-between",
                padding:"3px 0", borderBottom:`1px solid ${C.goldBorder}` }}>
                <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{r.l}</span>
                <span style={{ fontSize:12, fontWeight:700, color:r.c, fontFamily:MONO }}>
                  {fmt(r.v)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:10, paddingTop:4 }}>
          <GoldButton onClick={save} disabled={saving||!agentId||!salePrice||!commRate}>
            {saving?"Saving…":"Add Record"}
          </GoldButton>
          <GoldButton onClick={onClose} outline>Cancel</GoldButton>
        </div>
      </div>
    </Modal>
  );
}

// ── Monthly Projection Tab ────────────────────────────────────
function ProjectionTab({ financials, agents, pkgForAgent, fmt, isMobile }) {
  const now   = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear,  setSelYear]  = useState(now.getFullYear());

  const monthStr = `${selYear}-${String(selMonth+1).padStart(2,"0")}`;
  const inMonth  = financials.filter(f =>
    f.close_date?.startsWith(monthStr) || f.created_at?.startsWith(monthStr)
  );
  const allRecs  = financials; // all-time

  const brokerageProj = inMonth.reduce((s,f)=>s+(f.brokerage_net||0),0);
  const agentPayout   = inMonth.reduce((s,f)=>s+(f.agent_net||0),0);
  const grossGCI      = inMonth.reduce((s,f)=>s+(f.gross_commission||0),0);
  const closedDeals   = inMonth.filter(f=>f.status==="closed"||f.status==="paid").length;

  // Per-agent breakdown
  const agentMap = {};
  inMonth.forEach(f => {
    if (!agentMap[f.contact_id]) agentMap[f.contact_id] = {
      name: f.contacts?.full_name || "Unknown", net:0, gross:0, deals:0,
    };
    agentMap[f.contact_id].net   += f.agent_net||0;
    agentMap[f.contact_id].gross += f.gross_commission||0;
    agentMap[f.contact_id].deals += 1;
  });
  const agentRows = Object.values(agentMap).sort((a,b)=>b.gross-a.gross);

  // All-time brokerage total
  const allTimeBrokerage = allRecs.reduce((s,f)=>s+(f.brokerage_net||0),0);

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div>
      {/* Month selector */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <button onClick={()=>{
          if(selMonth===0){setSelMonth(11);setSelYear(y=>y-1);}
          else setSelMonth(m=>m-1);
        }} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
          color:C.text2, fontSize:16, cursor:"pointer", padding:"5px 10px" }}>‹</button>
        <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:SERIF, minWidth:140, textAlign:"center" }}>
          {MONTH_NAMES[selMonth]} {selYear}
        </div>
        <button onClick={()=>{
          if(selMonth===11){setSelMonth(0);setSelYear(y=>y+1);}
          else setSelMonth(m=>m+1);
        }} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
          color:C.text2, fontSize:16, cursor:"pointer", padding:"5px 10px" }}>›</button>
        <div style={{ marginLeft:"auto", fontSize:11, color:C.text3, fontFamily:FONT }}>
          All-time brokerage: <span style={{ color:C.gold, fontWeight:700 }}>{fmt(allTimeBrokerage)}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:24 }}>
        {[
          { label:"Gross GCI",        val:fmt(grossGCI),        accent:C.text },
          { label:"Agent Payouts",    val:fmt(agentPayout),     accent:C.blue },
          { label:"Brokerage Net",    val:fmt(brokerageProj),   accent:C.gold },
          { label:"Closed Deals",     val:closedDeals,          accent:C.green },
          { label:"Total Records",    val:inMonth.length,       accent:C.text2 },
        ].map(s=>(
          <div key={s.label} style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:20, fontWeight:700, color:s.accent, fontFamily:SERIF }}>{s.val}</div>
            <div style={{ fontSize:10, fontWeight:700, color:C.text2, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.07em", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-agent breakdown */}
      {agentRows.length > 0 ? (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Agent Production — {MONTH_NAMES[selMonth]} {selYear}
            </span>
          </div>
          {!isMobile && (
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr",
              padding:"8px 16px", borderBottom:`1px solid ${C.border}` }}>
              {["Agent","Deals","Gross GCI","Agent Net"].map(h=>(
                <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3,
                  fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
              ))}
            </div>
          )}
          {agentRows.map((row,i) => (
            <div key={i} style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`,
              display:isMobile?"flex":"grid",
              gridTemplateColumns:isMobile?undefined:"2fr 1fr 1fr 1fr",
              alignItems:"center", gap:isMobile?12:0 }}>
              {isMobile ? (
                <>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{row.name}</div>
                    <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{row.deals} deal{row.deals!==1?"s":""}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.gold, fontFamily:MONO }}>{fmt(row.gross)}</div>
                    <div style={{ fontSize:11, color:C.blue, fontFamily:MONO }}>{fmt(row.net)}</div>
                  </div>
                </>
              ) : (
                <>
                  <span style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{row.name}</span>
                  <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{row.deals}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:C.gold, fontFamily:MONO }}>{fmt(row.gross)}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:C.blue, fontFamily:MONO }}>{fmt(row.net)}</span>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"40px 16px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
          No financial records for {MONTH_NAMES[selMonth]} {selYear}.
          <br /><span style={{ fontSize:11, marginTop:6, display:"block" }}>
            Add deal financial records in the Deal P&L tab to see projections here.
          </span>
        </div>
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

function SystemStatusCard({ sys }) {
  const [st, setSt] = useState({ status:"checking" });
  const check = async () => {
    setSt({ status:"checking" });
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const r = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/systems`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "apikey":process.env.REACT_APP_SUPABASE_ANON_KEY, "Authorization":`Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: sys.action }),
      });
      const j = await r.json();
      setSt({ status: j.connected ? "connected" : "down", data:j });
    } catch(e){ setSt({ status:"down", data:{ message:String(e) } }); }
  };
  useEffect(()=>{ check(); /* eslint-disable-next-line */ }, [sys.key]);

  const j = st.data || {};
  const badge = st.status==="checking"
    ? { t:"Checking…", c:C.text3, bg:C.surface2, dot:C.text3 }
    : st.status==="connected"
    ? { t:"Live · Connected", c:C.green, bg:C.goldDim, dot:C.green }
    : { t:"Not connected", c:C.red, bg:"rgba(220,80,80,0.10)", dot:C.red };
  const rows = st.status==="connected"
    ? sys.fields.map(([label,key])=>[label, j[key]]).filter(([,v])=>v!=null && v!=="")
    : [];

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"22px 24px", maxWidth:640 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:42, height:42, borderRadius:11, background:C.surface2, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{sys.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:SERIF }}>{sys.label}</div>
          <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>{sys.subtitle}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 12px", borderRadius:20, background:badge.bg, border:`1px solid ${badge.c}44` }}>
          <span style={{ width:8, height:8, borderRadius:8, background:badge.dot, flexShrink:0 }} />
          <span style={{ fontSize:12, fontWeight:700, color:badge.c, fontFamily:FONT, whiteSpace:"nowrap" }}>{badge.t}</span>
        </div>
      </div>

      {st.status==="connected" && (
        <div style={{ marginTop:16 }}>
          {rows.map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:14, padding:"9px 0", borderTop:`1px solid ${C.border}`, fontFamily:FONT }}>
              <span style={{ fontSize:12, color:C.text3 }}>{k}</span>
              <span style={{ fontSize:12.5, color:C.text2, fontWeight:600, textAlign:"right", wordBreak:"break-word" }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {st.status==="down" && (
        <div style={{ marginTop:16, padding:"12px 14px", background:"rgba(220,80,80,0.08)", border:"1px solid rgba(220,80,80,0.30)", borderRadius:10 }}>
          <div style={{ fontSize:12.5, fontWeight:700, color:C.red, fontFamily:FONT, marginBottom:4 }}>Couldn't reach {sys.label}{j.http?` (HTTP ${j.http})`:""}</div>
          <div style={{ fontSize:12, color:C.text2, fontFamily:FONT, lineHeight:1.5 }}>{j.message||j.reason||"Unknown error."}</div>
          {String(j.message||"").toLowerCase().includes("ip") && (
            <div style={{ fontSize:11.5, color:C.text3, fontFamily:FONT, marginTop:8, lineHeight:1.5 }}>
              An IP allowlist is blocking server-side calls. Disable the IP restriction in the provider's security settings (serverless egress IPs aren't fixed), then re-check.
            </div>
          )}
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:16 }}>
        <GoldButton small outline onClick={check} disabled={st.status==="checking"}>{st.status==="checking"?"Checking…":"Re-check"}</GoldButton>
        {j.checkedAt && <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>Last checked {new Date(j.checkedAt).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}

const ARI_SYSTEMS = [
  { key:"brevo", icon:"\u{1F4E7}", label:"Brevo", desc:"Email marketing", action:"brevo_status",
    subtitle:"Email marketing · bulk campaigns & contacts",
    fields:[["Account","email"],["Company","company"],["Plan","plan"],["Email credits","credits"]] },
  { key:"github", icon:"\u{1F419}", label:"GitHub", desc:"Source & deploy", action:"github_status",
    subtitle:"Source control · GitHub Pages hosting",
    fields:[["Repository","repo"],["Visibility","visibility"],["Default branch","branch"],["Last push","pushedAt"]] },
  { key:"supabase", icon:"\u{1F5C4}\uFE0F", label:"Supabase", desc:"Backend", action:"supabase_status",
    subtitle:"Postgres · Auth · Storage · Edge functions",
    fields:[["Project ref","ref"],["URL","url"],["Database","db"]] },
    { key:"reap", icon:"🏗️", label:"REAP", desc:"Deal analytics platform", action:"reap_status", custom:true,
    subtitle:"Real Estate Analytics Platform · app.getreap.ai" },
  { key:"quo", icon:"\u{1F4DE}", label:"Quo", desc:"Phone & SMS", action:"quo_status", custom:true,
    subtitle:"OpenPhone · business phone lines, calls & texts" },
  { key:"suarez", icon:"\u{1F310}", label:"Suarez", desc:"Global OS sync", custom:true,
    subtitle:"Suarez Global OS · synced robots & cross-platform link" },
];

function SuarezConnectionCard({ sys }) {
  const [robots, setRobots] = useState(null);
  const [err, setErr] = useState(null);
  const load = async () => {
    setErr(null);
    try {
      const { data, error } = await supabase.from("robots")
        .select("id, name, role, description, avatar_color, status, current_focus, synced_at")
        .eq("source", "suarez").order("name", { ascending:true });
      if (error) throw error;
      setRobots(data || []);
    } catch(e){ setErr(String(e.message||e)); setRobots([]); }
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, []);

  const connected = robots && robots.length > 0;
  const lastSync = connected ? robots.map(r=>r.synced_at).filter(Boolean).sort().slice(-1)[0] : null;
  const badge = robots===null
    ? { t:"Checking…", c:C.text3, bg:C.surface2, dot:C.text3 }
    : connected
    ? { t:"Live · Synced", c:C.green, bg:C.goldDim, dot:C.green }
    : { t:"No synced robots", c:C.red, bg:"rgba(220,80,80,0.10)", dot:C.red };

  return (
    <div style={{ maxWidth:680 }}>
      {/* Connection header */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"22px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:11, background:C.surface2, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{sys.icon}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:SERIF }}>Suarez Global OS</div>
            <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>{sys.subtitle}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 12px", borderRadius:20, background:badge.bg, border:`1px solid ${badge.c}44` }}>
            <span style={{ width:8, height:8, borderRadius:8, background:badge.dot, flexShrink:0 }} />
            <span style={{ fontSize:12, fontWeight:700, color:badge.c, fontFamily:FONT, whiteSpace:"nowrap" }}>{badge.t}</span>
          </div>
        </div>
        {connected && (
          <div style={{ display:"flex", gap:14, marginTop:16, flexWrap:"wrap" }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:14, padding:"9px 0", borderTop:`1px solid ${C.border}`, fontFamily:FONT, flex:"1 1 100%" }}>
              <span style={{ fontSize:12, color:C.text3 }}>Robots synced from Suarez</span>
              <span style={{ fontSize:12.5, color:C.text2, fontWeight:600 }}>{robots.length}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", gap:14, padding:"9px 0", borderTop:`1px solid ${C.border}`, fontFamily:FONT, flex:"1 1 100%" }}>
              <span style={{ fontSize:12, color:C.text3 }}>Last sync</span>
              <span style={{ fontSize:12.5, color:C.text2, fontWeight:600 }}>{lastSync ? new Date(lastSync).toLocaleString() : "—"}</span>
            </div>
          </div>
        )}
        {err && <div style={{ marginTop:14, padding:"12px 14px", background:"rgba(220,80,80,0.08)", border:"1px solid rgba(220,80,80,0.30)", borderRadius:10, fontSize:12.5, color:C.red, fontFamily:FONT }}>{err}</div>}
        <div style={{ marginTop:16 }}>
          <GoldButton small outline onClick={load} disabled={robots===null}>{robots===null?"Checking…":"Re-check"}</GoldButton>
        </div>
      </div>

      {/* Synced robot roster */}
      {connected && (
        <div style={{ marginTop:18 }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.text3, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:FONT, marginBottom:10 }}>Synced Business Unit Leaders</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:12 }}>
            {robots.map(r=>{
              const c = r.avatar_color || C.gold;
              const initial = String(r.name||"?").charAt(0).toUpperCase();
              return (
                <div key={r.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>
                  <div style={{ display:"flex", gap:13, alignItems:"flex-start" }}>
                    <div style={{ width:42, height:42, borderRadius:11, background:c+"22", border:`1px solid ${c}66`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontWeight:800, fontSize:18, color:c, fontFamily:SERIF }}>{initial}</div>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:FONT }}>{r.name}</span>
                        <span style={{ fontSize:9, fontWeight:800, color:C.gold, background:C.goldDim, border:`1px solid ${C.goldBorder}`, borderRadius:999, padding:"2px 8px", letterSpacing:"0.04em", textTransform:"uppercase" }}>synced from Suarez</span>
                      </div>
                      <div style={{ fontSize:11.5, fontWeight:700, color:c, marginTop:2, textTransform:"uppercase", letterSpacing:"0.04em", fontFamily:FONT }}>{r.role}</div>
                    </div>
                  </div>
                  {r.description && <div style={{ fontSize:12.5, color:C.text2, marginTop:10, lineHeight:1.5, fontFamily:FONT }}>{r.description}</div>}
                  {r.current_focus && (
                    <div style={{ marginTop:10, background:c+"14", border:`1px solid ${c}33`, borderRadius:9, padding:"8px 11px" }}>
                      <span style={{ fontSize:9, fontWeight:800, color:c, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:FONT }}>Current focus</span>
                      <div style={{ fontSize:12, color:C.text2, marginTop:2, lineHeight:1.45, fontFamily:FONT }}>{r.current_focus}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:12, lineHeight:1.5 }}>
            These robots are defined in Suarez Global OS and synced into Ari. They're available to deploy here. Editing the canonical definition happens in Suarez; re-running the sync refreshes them.
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDur(s){ s=Math.round(s||0); if(s<60) return `${s}s`; const m=Math.floor(s/60); const r=s%60; return `${m}m${r?" "+r+"s":""}`; }
function EmptyQuo({ label }){ return <div style={{ fontSize:12.5, color:C.text3, fontFamily:FONT, padding:"10px 0", lineHeight:1.5 }}>{label}</div>; }

function QuoBars({ data, color, height=130 }){
  const max = Math.max(1, ...data.map(d=>d.count||0));
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:3, height }}>
      {data.map((d,i)=>(
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5, minWidth:0 }}>
          <div title={`${d.day}: ${d.count}`} style={{ width:"100%", maxWidth:24,
            height:Math.max(d.count?4:0, Math.round((d.count/max)*(height-24))),
            background:`linear-gradient(180deg, ${color}, ${color}66)`, borderRadius:"5px 5px 0 0", transition:"height 0.6s cubic-bezier(.2,.8,.2,1)" }} />
          <span style={{ fontSize:8, color:C.text3, fontFamily:MONO, whiteSpace:"nowrap" }}>{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function QuoHBars({ data, color }){
  const max = Math.max(1, ...data.map(d=>d.value||0));
  if(!data.length) return <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>No data yet.</div>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {data.map((d,i)=>(
        <div key={i}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, fontFamily:FONT, marginBottom:4 }}>
            <span style={{ color:C.text2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"74%" }}>{d.label}</span>
            <span style={{ color:C.text, fontWeight:700 }}>{d.value}</span>
          </div>
          <div style={{ height:8, background:C.surface2, borderRadius:6, overflow:"hidden" }}>
            <div style={{ width:`${Math.round((d.value/max)*100)}%`, height:"100%", background:`linear-gradient(90deg, ${color}, ${color}88)`, borderRadius:6, transition:"width 0.7s cubic-bezier(.2,.8,.2,1)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuoTranscript({ t }){
  const [open,setOpen]=useState(false);
  return (
    <div style={{ borderTop:`1px solid ${C.border}`, padding:"10px 0" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:"flex", width:"100%", alignItems:"center", gap:10, background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
        <span style={{ fontSize:12, color:C.text3 }}>{open?"▾":"▸"}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12.5, color:C.text, fontWeight:600, fontFamily:FONT }}>{t.participant||"Call"} · {t.line||""}</div>
          <div style={{ fontSize:10.5, color:C.text3, fontFamily:FONT }}>{t.at? new Date(t.at).toLocaleString():""} · {fmtDur(t.duration||0)} · {(t.segments||[]).length} segments</div>
        </div>
      </button>
      {open && (
        <div style={{ marginTop:8, marginLeft:22, display:"flex", flexDirection:"column", gap:6, maxHeight:300, overflowY:"auto" }}>
          {(t.segments||[]).map((s,i)=>(
            <div key={i} style={{ fontSize:12, fontFamily:FONT, lineHeight:1.5 }}>
              <span style={{ color:C.gold, fontWeight:700 }}>{s.who||"Speaker"}: </span>
              <span style={{ color:C.text2 }}>{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuoDashboard({ sys, sub="overview" }){
  const QUO = C.blue;
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState(null);
  const actionFor = { overview:"quo_overview", numbers:"quo_overview", calls:"quo_calls", texts:"quo_messages", transcripts:"quo_transcripts" };
  const act = actionFor[sub] || "quo_overview";

  const load = async (action, force) => {
    if (cache[action] && !force) return;
    setLoading(true); setErrMsg(null);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const r = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/systems`, {
        method:"POST", headers:{ "Content-Type":"application/json", "apikey":process.env.REACT_APP_SUPABASE_ANON_KEY, "Authorization":`Bearer ${session?.access_token}` },
        body: JSON.stringify({ action }),
      });
      const j = await r.json();
      setCache(c=>({ ...c, [action]:j }));
      if (j && j.connected===false) setErrMsg(j.message||j.reason||"Not connected");
    } catch(e){ setErrMsg(String(e)); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(act); /* eslint-disable-next-line */ }, [act]);

  const d = cache[act] || {};
  const ov = cache["quo_overview"] || {};
  const titleMap = { overview:"Overview", calls:"Calls", texts:"Texts", transcripts:"Transcripts", numbers:"Phone numbers" };

  const Card = ({ children, style }) => (<div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px", ...(style||{}) }}>{children}</div>);
  const SecTitle = ({ children }) => (<div style={{ fontSize:11, fontWeight:800, color:C.text3, letterSpacing:"0.09em", textTransform:"uppercase", fontFamily:FONT, marginBottom:12 }}>{children}</div>);
  const KPI = ({ label, value, accent }) => (
    <div style={{ flex:"1 1 130px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
      <div style={{ fontSize:26, fontWeight:800, color:accent||C.text, fontFamily:SERIF, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10.5, color:C.text3, fontFamily:FONT, marginTop:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
    </div>
  );

  return (
    <div style={{ maxWidth:840 }}>
      <div style={{ display:"flex", alignItems:"center", gap:13, marginBottom:18 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:QUO+"22", border:`1px solid ${QUO}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>📞</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:C.text, fontFamily:SERIF }}>Quo · {titleMap[sub]}</div>
          <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>OpenPhone · live business phone</div>
        </div>
        <GoldButton small outline onClick={()=>load(act,true)} disabled={loading}>{loading?"Loading…":"Refresh"}</GoldButton>
      </div>

      {loading && !d.connected && <div style={{ fontSize:13, color:C.text3, fontFamily:FONT }}>Pulling live data from OpenPhone…</div>}
      {errMsg && d.connected!==true && (
        <Card style={{ borderColor:"rgba(220,80,80,0.3)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.red, fontFamily:FONT, marginBottom:4 }}>Couldn't reach Quo</div>
          <div style={{ fontSize:12.5, color:C.text2, fontFamily:FONT, lineHeight:1.5 }}>{errMsg}</div>
        </Card>
      )}

      {sub==="overview" && d.connected && (()=>{
        const seats = d.userCount||0; const rate=20; const est = seats*rate;
        const recs=[];
        if((d.activeLast7||0)===0) recs.push("No conversation activity in the last 7 days — worth confirming the lines are in use.");
        (d.byLine||[]).filter(l=>l.users===0).forEach(l=>recs.push(`Line "${l.name}" has no assigned users.`));
        const top=(d.byLine||[]).slice().sort((a,b)=>b.count-a.count)[0];
        if(top && top.count>0) recs.push(`Most activity is on "${top.name}" (${top.count} conversations).`);
        if(seats<=2) recs.push(`Only ${seats} seat${seats===1?"":"s"} on Quo — add agents as the team grows.`);
        if((d.topParticipants||[])[0]) recs.push(`Most-contacted number: ${d.topParticipants[0].num} (${d.topParticipants[0].count}x).`);
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <KPI label="Phone lines" value={d.lineCount||0} accent={QUO} />
              <KPI label="Conversations" value={d.conversationCount||0} />
              <KPI label="Active · 7 days" value={d.activeLast7||0} accent={C.green} />
              <KPI label="Team seats" value={seats} />
            </div>
            <Card><SecTitle>Conversation activity · last 14 days</SecTitle><QuoBars data={d.activityByDay||[]} color={QUO} /></Card>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <Card style={{ flex:"1 1 320px" }}><SecTitle>Conversations by line</SecTitle><QuoHBars data={(d.byLine||[]).map(l=>({label:l.name, value:l.count}))} color={QUO} /></Card>
              <Card style={{ flex:"1 1 320px" }}><SecTitle>Top contacts</SecTitle><QuoHBars data={(d.topParticipants||[]).map(p=>({label:p.num, value:p.count}))} color={C.gold} /></Card>
            </div>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <Card style={{ flex:"1 1 300px" }}>
                <SecTitle>Plan & billing</SecTitle>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", fontFamily:FONT, fontSize:13 }}><span style={{color:C.text3}}>Seats</span><span style={{color:C.text2,fontWeight:700}}>{seats}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderTop:`1px solid ${C.border}`, fontFamily:FONT, fontSize:13 }}><span style={{color:C.text3}}>Phone lines</span><span style={{color:C.text2,fontWeight:700}}>{d.lineCount||0}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderTop:`1px solid ${C.border}`, fontFamily:FONT, fontSize:13 }}><span style={{color:C.text3}}>Est. monthly</span><span style={{color:C.gold,fontWeight:800}}>~${est}/mo</span></div>
                <div style={{ fontSize:10.5, color:C.text3, fontFamily:FONT, marginTop:8, lineHeight:1.5 }}>Estimate assumes ~${rate}/seat. OpenPhone's API doesn't expose billing — actual invoices live in OpenPhone.</div>
              </Card>
              <Card style={{ flex:"1 1 300px" }}>
                <SecTitle>Recommendations</SecTitle>
                {recs.length===0 ? <div style={{fontSize:12.5,color:C.text3,fontFamily:FONT}}>All good — nothing flagged.</div> :
                  <ul style={{ margin:0, paddingLeft:18, fontSize:12.5, color:C.text2, fontFamily:FONT, lineHeight:1.7 }}>{recs.slice(0,5).map((r,i)=><li key={i}>{r}</li>)}</ul>}
              </Card>
            </div>
            <Card><SecTitle>Recent activity</SecTitle>
              {(d.recent||[]).length===0 ? <EmptyQuo label="No recent conversations." /> :
                (d.recent||[]).map((c,i)=>(
                  <div key={c.id||i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderTop:i?`1px solid ${C.border}`:"none", fontFamily:FONT }}>
                    <div style={{ width:30, height:30, borderRadius:8, background:QUO+"1e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>💬</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12.5, color:C.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{(c.participants||[]).join(", ")||"—"}</div>
                      <div style={{ fontSize:10.5, color:C.text3 }}>{c.line}</div>
                    </div>
                    <div style={{ fontSize:10.5, color:C.text3, whiteSpace:"nowrap" }}>{c.lastActivityAt? new Date(c.lastActivityAt).toLocaleString():""}</div>
                  </div>
                ))}
            </Card>
          </div>
        );
      })()}

      {sub==="calls" && d.connected && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <KPI label="Calls (recent)" value={d.total||0} accent={QUO} />
            <KPI label="Inbound" value={d.inbound||0} accent={C.green} />
            <KPI label="Outbound" value={d.outbound||0} accent={C.amber} />
            <KPI label="Talk time" value={fmtDur(d.totalDuration||0)} />
          </div>
          <Card><SecTitle>Calls · last 14 days</SecTitle><QuoBars data={d.byDay||[]} color={QUO} /></Card>
          <Card><SecTitle>Recent calls</SecTitle>
            {(d.calls||[]).length===0 ? <EmptyQuo label="No calls in recent conversations yet — they'll appear here as calls come through." /> :
              (d.calls||[]).map((c,i)=>(
                <div key={c.id||i} style={{ display:"flex", alignItems:"center", gap:11, padding:"9px 0", borderTop:i?`1px solid ${C.border}`:"none", fontFamily:FONT }}>
                  <span style={{ fontSize:14 }}>{/in/i.test(c.direction||"")?"📥":"📤"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, color:C.text, fontWeight:600 }}>{c.participant||"—"}</div>
                    <div style={{ fontSize:10.5, color:C.text3 }}>{c.line} · {c.status||""}</div>
                  </div>
                  <div style={{ fontSize:11, color:C.text2 }}>{fmtDur(c.duration||0)}</div>
                  <div style={{ fontSize:10.5, color:C.text3, whiteSpace:"nowrap", minWidth:88, textAlign:"right" }}>{c.at? new Date(c.at).toLocaleString():""}</div>
                </div>
              ))}
          </Card>
        </div>
      )}

      {sub==="texts" && d.connected && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <KPI label="Messages (recent)" value={d.total||0} accent={QUO} />
            <KPI label="Inbound" value={d.inbound||0} accent={C.green} />
            <KPI label="Outbound" value={d.outbound||0} accent={C.amber} />
          </div>
          <Card><SecTitle>Texts · last 14 days</SecTitle><QuoBars data={d.byDay||[]} color={C.gold} /></Card>
          <Card><SecTitle>Recent messages</SecTitle>
            {(d.messages||[]).length===0 ? <EmptyQuo label="No texts in recent conversations yet." /> :
              (d.messages||[]).map((m,i)=>(
                <div key={m.id||i} style={{ display:"flex", gap:10, padding:"9px 0", borderTop:i?`1px solid ${C.border}`:"none", fontFamily:FONT, alignItems:"flex-start" }}>
                  <span style={{ fontSize:13, marginTop:2 }}>{/in/i.test(m.direction||"")?"📥":"📤"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, color:C.text2, lineHeight:1.5 }}>{m.text||"—"}</div>
                    <div style={{ fontSize:10.5, color:C.text3, marginTop:2 }}>{m.participant} · {m.line}</div>
                  </div>
                  <div style={{ fontSize:10.5, color:C.text3, whiteSpace:"nowrap" }}>{m.at? new Date(m.at).toLocaleDateString():""}</div>
                </div>
              ))}
          </Card>
        </div>
      )}

      {sub==="transcripts" && d.connected && (
        <Card><SecTitle>Call transcripts</SecTitle>
          <div style={{ fontSize:11.5, color:C.text3, fontFamily:FONT, marginBottom:6 }}>Scanned {d.scanned||0} recent calls · {d.total||0} with transcripts.</div>
          {(d.transcripts||[]).length===0 ? <EmptyQuo label="No transcripts available yet. They show up here once OpenPhone records and transcribes calls (enable call recording + transcription in OpenPhone)." /> :
            (d.transcripts||[]).map((t,i)=>(<QuoTranscript key={t.callId||i} t={t} />))}
        </Card>
      )}

      {sub==="numbers" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <KPI label="Phone lines" value={ov.lineCount||0} accent={QUO} />
            <KPI label="Team seats" value={ov.userCount||0} />
          </div>
          {(ov.byLine||[]).length===0 ? <EmptyQuo label={loading?"Loading lines…":"No phone lines found."} /> : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
              {(ov.byLine||[]).map((l,i)=>(
                <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
                    <div style={{ width:30, height:30, borderRadius:8, background:QUO+"1e", border:`1px solid ${QUO}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📱</div>
                    <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, fontWeight:600 }}>{l.users?`${l.users} user${l.users>1?"s":""}`:"Shared"}</div>
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:C.text, fontFamily:MONO }}>{l.number}</div>
                  <div style={{ fontSize:12, color:C.text2, fontFamily:FONT, marginTop:3 }}>{l.name||"Unnamed line"}</div>
                  <div style={{ marginTop:10, fontSize:11.5, color:C.text3, fontFamily:FONT }}>{l.count} conversation{l.count===1?"":"s"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReapDashboard({ sys }) {
  const REAP_GREEN = "#1C7C4A";
  const [ov, setOv]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async (force) => {
    if (ov && !force) return;
    setLoading(true); setErr(null);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const r = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/systems`, {
        method:"POST",
        headers:{ "Content-Type":"application/json","apikey":process.env.REACT_APP_SUPABASE_ANON_KEY,"Authorization":`Bearer ${session?.access_token}` },
        body: JSON.stringify({ action:"reap_overview" }),
      });
      const j = await r.json();
      if(j.connected===false) setErr(j.message||j.reason||"Not connected");
      else setOv(j);
    } catch(e){ setErr(String(e)); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[]);

  const fmt = (n) => (Number(n)||0).toLocaleString("en-US",{maximumFractionDigits:0});
  const PIPELINE_COLORS = { New:C.blue, Review:C.amber, Underwriting:C.gold, Offer:"#a855f7",
    "Under Contract":C.green, Owned:"#06b6d4", Sold:C.green };

  return (
    <div style={{ maxWidth:840 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${REAP_GREEN}1a,${C.surface} 60%)`, border:`1px solid ${C.border}`, borderRadius:16, padding:"22px 24px", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:13, background:REAP_GREEN+"22", border:`1px solid ${REAP_GREEN}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🏗️</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:19, fontWeight:800, color:C.text, fontFamily:SERIF }}>REAP</div>
            <div style={{ fontSize:12, color:C.text3, fontFamily:FONT }}>Real Estate Analytics Platform · Tampa Development Group LLC</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20,
              background:ov?`${REAP_GREEN}22`:"rgba(180,80,80,0.12)", border:`1px solid ${ov?REAP_GREEN+"66":"rgba(180,80,80,0.35)"}` }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:ov?REAP_GREEN:C.red }} />
              <span style={{ fontSize:11.5, fontWeight:700, fontFamily:FONT, color:ov?REAP_GREEN:C.red }}>
                {loading?"Checking…":ov?"Live · Connected":err?"Not connected":"—"}
              </span>
            </div>
            <a href="https://app.getreap.ai" target="_blank" rel="noreferrer"
               style={{ fontSize:11, color:C.blue, fontFamily:FONT, textDecoration:"none" }}>
              Open REAP ↗
            </a>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap" }}>
          {[["Total Deals",(ov?.totalDeals||0)+(ov?.totalDeals===1000?" (1,000+)":""),REAP_GREEN],
            ["Active Pipeline",ov?.activeDeals||0,C.amber],
            ["Avg REAP Score",ov?.avgReapScore?`${ov.avgReapScore}/100`:"—",C.gold],
            ["Users",ov?.userCount||26,C.blue]].map(([label,val,accent])=>(
            <div key={label} style={{ flex:"1 1 130px", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:11, padding:"12px 14px" }}>
              <div style={{ fontSize:20, fontWeight:800, color:accent, fontFamily:SERIF, lineHeight:1 }}>{String(val)}</div>
              <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginTop:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          <GoldButton small outline onClick={()=>load(true)} disabled={loading}>{loading?"Refreshing…":"Refresh"}</GoldButton>
          {ov?.checkedAt && <span style={{ fontSize:11, color:C.text3, fontFamily:FONT, alignSelf:"center" }}>Updated {new Date(ov.checkedAt).toLocaleTimeString()}</span>}
        </div>
      </div>

      {err && <div style={{ background:"rgba(220,80,80,0.08)", border:"1px solid rgba(220,80,80,0.3)", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.red, fontFamily:FONT }}>{err}</div>
      </div>}

      {ov && (<>
        {/* Deal Pipeline */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px", marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.text3, letterSpacing:"0.09em", textTransform:"uppercase", fontFamily:FONT, marginBottom:14 }}>Deal Pipeline</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(ov.pipeline||[]).filter(p=>p.count>0).map(p=>{
              const total = (ov.pipeline||[]).reduce((s,x)=>s+x.count,0)||1;
              const pct = Math.round((p.count/total)*100);
              const accent = PIPELINE_COLORS[p.status]||C.text3;
              return (
                <div key={p.status}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, fontFamily:FONT, marginBottom:4 }}>
                    <span style={{ color:C.text2, fontWeight:600 }}>{p.status}</span>
                    <span style={{ color:accent, fontWeight:700 }}>{p.count} <span style={{ color:C.text3, fontWeight:400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height:7, background:C.surface2, borderRadius:5, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${accent},${accent}88)`, borderRadius:5, transition:"width 0.7s cubic-bezier(.2,.8,.2,1)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deal types + top stats */}
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:16 }}>
          <div style={{ flex:"1 1 280px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.text3, letterSpacing:"0.09em", textTransform:"uppercase", fontFamily:FONT, marginBottom:12 }}>By Asset Type</div>
            {(ov.topTypes||[]).map((t,i)=>{
              const max = (ov.topTypes||[])[0]?.count||1;
              return (
                <div key={t.type} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, fontFamily:FONT, marginBottom:3 }}>
                    <span style={{ color:C.text2 }}>{t.type}</span>
                    <span style={{ color:C.text, fontWeight:700 }}>{t.count}</span>
                  </div>
                  <div style={{ height:6, background:C.surface2, borderRadius:4, overflow:"hidden" }}>
                    <div style={{ width:`${Math.round((t.count/max)*100)}%`, height:"100%", background:`linear-gradient(90deg,${REAP_GREEN},${REAP_GREEN}88)`, borderRadius:4, transition:"width 0.7s cubic-bezier(.2,.8,.2,1)" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ flex:"1 1 280px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.text3, letterSpacing:"0.09em", textTransform:"uppercase", fontFamily:FONT, marginBottom:12 }}>Portfolio Value</div>
            {[["Total ARV",`$${fmt(ov.totalArv)}`],["Total Asking",`$${fmt(ov.totalAsking)}`],
              ["ARV Premium",ov.totalAsking?`${Math.round(((ov.totalArv-ov.totalAsking)/ov.totalAsking)*100)}%`:"—"],
              ["Avg REAP Score",ov.avgReapScore?`${ov.avgReapScore}/100`:"—"],
            ].map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontFamily:FONT }}>
                <span style={{ fontSize:12.5, color:C.text3 }}>{k}</span>
                <span style={{ fontSize:12.5, color:C.text, fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users */}
        {(ov.users||[]).length>0 && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.text3, letterSpacing:"0.09em", textTransform:"uppercase", fontFamily:FONT, marginBottom:12 }}>REAP Team</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8 }}>
              {(ov.users||[]).map((u,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 10px", background:C.surface2, borderRadius:9, border:`1px solid ${C.border}` }}>
                  <Avatar name={u.name} email={u.email} size={28} />
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:C.text, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name||u.email}</div>
                    {u.role && <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{u.role}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}

function SystemsView({ user }) {
  const isMobile = useIsMobile();
  const [sysKey, setSysKey] = useState("brevo");
  const [quoOpen, setQuoOpen] = useState(false);
  const [quoSub, setQuoSub] = useState("overview");
  const active = ARI_SYSTEMS.find(s=>s.key===sysKey) || ARI_SYSTEMS[0];
  const QUO = C.blue;
  const QUO_SUBS = [
    { k:"overview", label:"Overview", icon:"📊" },
    { k:"calls", label:"Calls", icon:"📞" },
    { k:"texts", label:"Texts", icon:"💬" },
    { k:"transcripts", label:"Transcripts", icon:"📝" },
    { k:"numbers", label:"Phone numbers", icon:"#️⃣" },
  ];

  const railItem = (s) => {
    const a = sysKey===s.key;
    if (s.key==="quo") {
      return (
        <div key="quo" style={{ marginBottom:3 }}>
          <button onClick={()=>{ setQuoOpen(o=> sysKey==="quo" ? !o : true); setSysKey("quo"); }}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, cursor:"pointer", textAlign:"left",
              background: a? `linear-gradient(135deg, ${QUO}2e, ${QUO}12)` : C.surface2,
              border:`1px solid ${a?QUO+"77":C.border}` }}>
            <span style={{ fontSize:15 }}>{s.icon}</span>
            <span style={{ display:"flex", flexDirection:"column", lineHeight:1.25, flex:1, minWidth:0 }}>
              <span style={{ color:a?QUO:C.text, fontWeight:700, fontSize:13.5 }}>{s.label}</span>
              <span style={{ fontSize:10, color:C.text3, fontWeight:400 }}>{s.desc}</span>
            </span>
            <span style={{ color:a?QUO:C.text3, fontSize:11, transform:quoOpen?"rotate(90deg)":"none", transition:"transform 0.15s" }}>▸</span>
          </button>
          {quoOpen && (
            <div style={{ marginTop:4, marginLeft:11, paddingLeft:9, borderLeft:`2px solid ${QUO}55`, display:"flex", flexDirection:"column", gap:2 }}>
              {QUO_SUBS.map(sub=>{ const sa = sysKey==="quo" && quoSub===sub.k; return (
                <button key={sub.k} onClick={()=>{ setSysKey("quo"); setQuoSub(sub.k); }}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, cursor:"pointer", textAlign:"left", border:"none",
                    background: sa? QUO+"22":"transparent", color: sa?QUO:C.text2, fontSize:12.5, fontWeight:sa?700:500, fontFamily:FONT }}
                  onMouseEnter={e=>{ if(!sa) e.currentTarget.style.background=C.surface2; }}
                  onMouseLeave={e=>{ if(!sa) e.currentTarget.style.background="transparent"; }}>
                  <span style={{ fontSize:12 }}>{sub.icon}</span>{sub.label}
                </button>
              ); })}
            </div>
          )}
        </div>
      );
    }
    return (
      <button key={s.key} onClick={()=>setSysKey(s.key)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px", marginBottom:2, borderRadius:8, border:"none", background:a?C.goldDim:"transparent", color:a?C.gold:C.text2, fontSize:13.5, fontWeight:a?700:500, fontFamily:FONT, cursor:"pointer", textAlign:"left" }}
        onMouseEnter={e=>{ if(!a) e.currentTarget.style.background=C.surface2; }} onMouseLeave={e=>{ if(!a) e.currentTarget.style.background="transparent"; }}>
        <span style={{ fontSize:15 }}>{s.icon}</span>
        <span style={{ display:"flex", flexDirection:"column", lineHeight:1.25 }}><span>{s.label}</span><span style={{ fontSize:10, color:C.text3, fontWeight:400 }}>{s.desc}</span></span>
      </button>
    );
  };

  return (
    <div style={{ display:isMobile?"block":"flex", gap:20, padding:isMobile?"12px":"20px 24px", maxWidth:1240 }}>
      {isMobile ? (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8 }}>
            {ARI_SYSTEMS.map(s=>{ const a=sysKey===s.key; const isQuo=s.key==="quo"; return (
              <button key={s.key} onClick={()=>{ setSysKey(s.key); if(isQuo) setQuoOpen(true); }} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:20, border:`1px solid ${a?(isQuo?QUO+"77":C.goldBorder):C.border2}`, background:a?(isQuo?QUO+"22":C.goldDim):"transparent", color:a?(isQuo?QUO:C.gold):C.text2, fontSize:13, fontWeight:a?700:500, fontFamily:FONT, cursor:"pointer", whiteSpace:"nowrap" }}>
                <span>{s.icon}</span>{s.label}
              </button>); })}
          </div>
          {sysKey==="quo" && (
            <div style={{ display:"flex", gap:8, overflowX:"auto" }}>
              {QUO_SUBS.map(sub=>{ const sa=quoSub===sub.k; return (
                <button key={sub.k} onClick={()=>setQuoSub(sub.k)} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:16, border:`1px solid ${sa?QUO+"77":C.border}`, background:sa?QUO+"22":"transparent", color:sa?QUO:C.text2, fontSize:12, fontWeight:sa?700:500, fontFamily:FONT, cursor:"pointer", whiteSpace:"nowrap" }}>
                  <span>{sub.icon}</span>{sub.label}
                </button>); })}
            </div>
          )}
        </div>
      ) : (
        <div style={{ width:206, flexShrink:0, background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"12px 10px", alignSelf:"flex-start" }}>
          <div style={{ fontSize:10, fontWeight:800, color:C.text3, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:FONT, padding:"4px 10px 10px" }}>Systems</div>
          {ARI_SYSTEMS.map(s=>railItem(s))}
          <div style={{ fontSize:10.5, color:C.text3, fontFamily:FONT, padding:"12px 10px 4px", lineHeight:1.5 }}>More systems coming soon…</div>
        </div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        {active.key==="reap"   ? <ReapDashboard sys={active} />
          : active.key==="suarez" ? <SuarezConnectionCard sys={active} />
          : active.key==="quo" ? <QuoDashboard sys={active} sub={quoSub} />
          : <SystemStatusCard sys={active} />}
      </div>
    </div>
  );
}

function DesignChatHistory({ user }) {
  const isMobile = useIsMobile();
  const [convs, setConvs]       = useState([]);
  const [robots, setRobots]     = useState([]);
  const [selConv, setSelConv]   = useState(null);
  const [msgs, setMsgs]         = useState([]);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [loading, setLoading]   = useState(true);
  const [loadingMsgs, setLM]    = useState(false);

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      supabase.from("robots").select("id,name,avatar_color").eq("org_id",ORG_ID),
      supabase.from("robot_conversations")
        .select("id,robot_id,user_email,messages,created_at,updated_at")
        .eq("org_id",ORG_ID).order("updated_at",{ascending:false})
    ]).then(([{data:rb},{data:cv}])=>{
      setRobots(rb||[]);
      setConvs((cv||[]).filter(c=>c.messages?.length>0));
      setLoading(false);
    });
  },[]);

  const openConv = async (conv) => {
    setSelConv(conv); setLM(true);
    const {data} = await supabase.from("robot_conversation_log")
      .select("*").eq("conversation_id",conv.id).order("created_at",{ascending:true});
    if(data?.length) { setMsgs(data); }
    else {
      // Fallback: use messages array from conversation
      setMsgs((conv.messages||[]).map((m,i)=>({
        id:i, role:m.role, content:m.content, created_at:m.ts||conv.created_at
      })));
    }
    setLM(false);
  };

  const rMap = Object.fromEntries((robots||[]).map(r=>[r.id,r]));
  const filtered = convs.filter(c=>{
    const rname = rMap[c.robot_id]?.name||"";
    if(filter!=="all" && c.robot_id!==filter) return false;
    if(search){
      const s=search.toLowerCase();
      const preview=(c.messages||[]).map(m=>String(m.content||"")).join(" ").toLowerCase();
      if(!rname.toLowerCase().includes(s)&&!preview.includes(s)&&!String(c.user_email||"").includes(s)) return false;
    }
    return true;
  });

  const GOLD=C.gold;

  return (
    <div style={{ maxWidth:980 }}>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, fontFamily:SERIF, marginBottom:4 }}>💬 Chat History</div>
      <div style={{ fontSize:13, color:C.text3, fontFamily:FONT, marginBottom:18 }}>Every robot conversation logged and searchable.</div>

      {selConv ? (
        <div>
          <button onClick={()=>{ setSelConv(null); setMsgs([]); }} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:`1px solid ${C.border2}`, color:C.text2, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontFamily:FONT, fontSize:13, marginBottom:16 }}>← Back to all conversations</button>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:(rMap[selConv.robot_id]?.avatar_color||GOLD)+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:rMap[selConv.robot_id]?.avatar_color||GOLD, fontFamily:SERIF }}>{(rMap[selConv.robot_id]?.name||"?").charAt(0)}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT }}>{rMap[selConv.robot_id]?.name||"Robot"}</div>
                <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{selConv.user_email} · {new Date(selConv.updated_at).toLocaleString()} · {(selConv.messages||[]).length} messages</div>
              </div>
            </div>
          </div>
          {loadingMsgs ? <div style={{ color:C.text3, fontFamily:FONT }}>Loading messages…</div> :
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {msgs.map((m,i)=>{
                const isUser=m.role==="user";
                let content=String(m.content||"");
                if(content.includes("FINANCIAL CONTEXT")) content=content.slice(0,content.indexOf("FINANCIAL CONTEXT")).trim();
                return (
                  <div key={m.id||i} style={{ display:"flex", flexDirection:"column", alignItems:isUser?"flex-end":"flex-start" }}>
                    <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginBottom:3 }}>{isUser?"You":rMap[selConv.robot_id]?.name||"Robot"} · {m.created_at?new Date(m.created_at).toLocaleTimeString():""}</div>
                    <div style={{ maxWidth:"84%", padding:"11px 14px", borderRadius:12, fontFamily:FONT, fontSize:13, lineHeight:1.6,
                      background:isUser?C.goldDim:C.surface, border:`1px solid ${isUser?C.goldBorder:C.border}`,
                      color:C.text, whiteSpace:isUser?"pre-wrap":"normal", wordBreak:"break-word" }}>
                      {isUser ? content : <MarkdownMessage text={content} accent={rMap[selConv.robot_id]?.avatar_color||GOLD} />}
                    </div>
                  </div>
                );
              })}
            </div>}
        </div>
      ) : (
        <div>
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
            <Field value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations…" style={{ flex:"1 1 220px", minWidth:0 }} />
            <div style={{ display:"flex", gap:6 }}>
              {[{k:"all",l:"All robots"},...(robots||[]).map(r=>({k:r.id,l:r.name}))].map(opt=>{
                const a=filter===opt.k;
                return <button key={opt.k} onClick={()=>setFilter(opt.k)} style={{ padding:"7px 13px", borderRadius:20, border:`1px solid ${a?C.goldBorder:C.border2}`, background:a?C.goldDim:"transparent", color:a?C.gold:C.text2, fontSize:12, fontWeight:a?700:500, fontFamily:FONT, cursor:"pointer", whiteSpace:"nowrap" }}>{opt.l}</button>;
              })}
            </div>
          </div>
          {loading ? <div style={{ color:C.text3, fontFamily:FONT }}>Loading…</div> :
            filtered.length===0 ? <div style={{ color:C.text3, fontFamily:FONT }}>No conversations yet.</div> :
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
              {filtered.map((c,i)=>{
                const r=rMap[c.robot_id]; const rc=r?.avatar_color||GOLD;
                const lastUser=(c.messages||[]).filter(m=>m.role==="user").slice(-1)[0];
                const lastBot=(c.messages||[]).filter(m=>m.role==="assistant").slice(-1)[0];
                let preview=String(lastUser?.content||lastBot?.content||"").slice(0,120);
                if(preview.includes("FINANCIAL CONTEXT")) preview=preview.slice(0,preview.indexOf("FINANCIAL CONTEXT")).trim();
                return (
                  <button key={c.id} onClick={()=>openConv(c)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"13px 16px", borderTop:i?`1px solid ${C.border}`:"none", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <div style={{ width:36, height:36, borderRadius:9, background:rc+"22", border:`1px solid ${rc}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:rc, fontFamily:SERIF, flexShrink:0 }}>{(r?.name||"?").charAt(0)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT }}>{r?.name||"Robot"}</span>
                        <span style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{c.user_email}</span>
                      </div>
                      <div style={{ fontSize:12, color:C.text2, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{preview||"—"}</div>
                    </div>
                    <div style={{ flexShrink:0, textAlign:"right" }}>
                      <div style={{ fontSize:10, color:C.text3, fontFamily:FONT }}>{new Date(c.updated_at).toLocaleDateString()}</div>
                      <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginTop:2 }}>{(c.messages||[]).length} msgs</div>
                    </div>
                  </button>
                );
              })}
            </div>}
        </div>
      )}
    </div>
  );
}

function DesignView({ user }) {
  const isMobile = useIsMobile();
  const [sub, setSub] = useState("memory");
  const SUBS = [
    { k:"memory",     label:"Memory",      icon:"🧠", desc:"What the robots know" },
    { k:"soul",       label:"Soul",        icon:"✨", desc:"Org identity & principles" },
    { k:"styleguide", label:"Style Guide", icon:"🎨", desc:"Brand voice & guidelines" },
    { k:"skills",     label:"Skills",      icon:"⚡", desc:"What each robot can do" },
    { k:"history",    label:"Chat History",icon:"💬", desc:"Every conversation logged" },
  ];
  const GOLD = C.gold;

  return (
    <div style={{ display:isMobile?"block":"flex", gap:0, minHeight:"100%", padding:0 }}>
      {/* ── Side rail ── */}
      {isMobile ? (
        <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"12px 14px 0" }}>
          {SUBS.map(s=>{ const a=sub===s.k; return (
            <button key={s.k} onClick={()=>setSub(s.k)} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:20, cursor:"pointer", fontFamily:FONT, fontSize:13, fontWeight:a?700:500, border:`1px solid ${a?GOLD+"88":C.border2}`, background:a?C.goldDim:"transparent", color:a?GOLD:C.text2, whiteSpace:"nowrap" }}>
              {s.icon} {s.label}
            </button>); })}
        </div>
      ) : (
        <div style={{ width:210, flexShrink:0, borderRight:`1px solid ${C.border}`, padding:"20px 12px", minHeight:"100%" }}>
          <div style={{ fontSize:10, fontWeight:800, color:C.text3, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:FONT, padding:"0 8px 12px" }}>Design</div>
          {SUBS.map(s=>{ const a=sub===s.k; return (
            <button key={s.k} onClick={()=>setSub(s.k)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:3, borderRadius:10, cursor:"pointer", textAlign:"left", fontFamily:FONT,
              background:a?`linear-gradient(135deg,${GOLD}22,${GOLD}0a)`:C.surface2,
              border:`1px solid ${a?GOLD+"66":C.border}`,
              color:a?GOLD:C.text2, fontWeight:a?700:500, fontSize:13.5 }}
              onMouseEnter={e=>{ if(!a){ e.currentTarget.style.background=C.surface2; e.currentTarget.style.borderColor=C.border2; } }}
              onMouseLeave={e=>{ if(!a){ e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor=C.border; } }}>
              <span style={{ fontSize:16 }}>{s.icon}</span>
              <span style={{ display:"flex", flexDirection:"column", lineHeight:1.25 }}>
                <span>{s.label}</span>
                <span style={{ fontSize:10, color:a?GOLD+"99":C.text3, fontWeight:400 }}>{s.desc}</span>
              </span>
            </button>); })}
        </div>
      )}

      {/* ── Right panel ── */}
      <div style={{ flex:1, minWidth:0, padding:isMobile?"14px":"24px 28px", overflowY:"auto" }}>
        {sub==="memory"     && <DesignMemoryPanel user={user} />}
        {sub==="soul"       && <DesignSoulPanel   user={user} />}
        {sub==="styleguide" && <DesignDocPanel    user={user} docType="style_guide" label="Style Guide" icon="🎨" />}
        {sub==="skills"     && <DesignDocPanel    user={user} docType="skills"      label="Skills"      icon="⚡" />}
        {sub==="history"    && <DesignChatHistory user={user} />}
      </div>
    </div>
  );
}

function DesignMemoryPanel({ user }) {
  const [robots, setRobots]   = useState([]);
  const [rmems, setRmems]     = useState([]);
  const [bkmems, setBkmems]   = useState([]);
  const [tab, setTab]         = useState("robots");
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const [{ data:rb }, { data:rm }, { data:bk }] = await Promise.all([
        supabase.from("robots").select("id,name,avatar_color,role").eq("org_id",ORG_ID).order("name"),
        supabase.from("robot_memories").select("*").eq("org_id",ORG_ID).order("updated_at",{ascending:false}),
        supabase.from("bookkeeping_memories").select("*").eq("org_id",ORG_ID).eq("active",true).order("times_applied",{ascending:false}).limit(60),
      ]);
      setRobots(rb||[]); setRmems(rm||[]); setBkmems(bk||[]); setLoading(false);
    })();
  },[]);
  const TABS=[{k:"robots",label:"Robot memories"},{k:"bookkeeping",label:"Bookkeeping patterns"}];
  return (
    <div style={{ maxWidth:820 }}>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, fontFamily:SERIF, marginBottom:4 }}>🧠 Memory</div>
      <div style={{ fontSize:13, color:C.text3, fontFamily:FONT, marginBottom:18 }}>What the system has learned and remembers about your org.</div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {TABS.map(t=>{ const a=tab===t.k; return (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{ padding:"7px 16px", borderRadius:20, border:`1px solid ${a?C.goldBorder:C.border2}`, background:a?C.goldDim:"transparent", color:a?C.gold:C.text2, fontSize:12.5, fontWeight:a?700:500, fontFamily:FONT, cursor:"pointer" }}>{t.label}</button>
        );})}
      </div>
      {loading ? <div style={{ color:C.text3, fontFamily:FONT, fontSize:13 }}>Loading…</div> : tab==="robots" ? (
        robots.length===0 ? <div style={{ color:C.text3, fontFamily:FONT }}>No robots found.</div> :
        robots.map(r=>{
          const mems = rmems.filter(m=>m.robot_id===r.id);
          const c = r.avatar_color||C.gold;
          return (
            <div key={r.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:c+"22", border:`1px solid ${c}55`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, color:c, fontFamily:SERIF }}>{r.name.charAt(0)}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT }}>{r.name}</div>
                  <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{r.role}</div>
                </div>
                <span style={{ marginLeft:"auto", fontSize:11, color:C.text3, fontFamily:FONT }}>{mems.length} memor{mems.length===1?"y":"ies"}</span>
              </div>
              {mems.length===0 ? <div style={{ fontSize:12.5, color:C.text3, fontFamily:FONT }}>No stored memories yet — {r.name} learns from conversation context each session.</div> :
                mems.map((m,i)=>(
                  <div key={m.id||i} style={{ padding:"10px 12px", background:C.surface2, borderRadius:9, marginBottom:6, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{m.memory_type||"memory"}</div>
                    <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, lineHeight:1.55, whiteSpace:"pre-wrap" }}>{m.content}</div>
                    <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginTop:6 }}>{m.updated_at?new Date(m.updated_at).toLocaleString():""}</div>
                  </div>
                ))}
            </div>
          );
        })
      ) : (
        <div>
          <div style={{ fontSize:13, color:C.text3, fontFamily:FONT, marginBottom:12 }}>{bkmems.length} active categorization rules learned from your transactions.</div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            {bkmems.slice(0,40).map((m,i)=>(
              <div key={m.id||i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderTop:i?`1px solid ${C.border}`:"none" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, color:C.text, fontFamily:FONT, fontWeight:600 }}>{m.pattern}</div>
                  {m.note && <div style={{ fontSize:11.5, color:C.text3, fontFamily:FONT, marginTop:1 }}>{m.note}</div>}
                </div>
                <div style={{ flexShrink:0, fontSize:11.5, color:C.text2, fontFamily:FONT, textAlign:"right" }}>
                  <div style={{ fontWeight:600 }}>{m.category_name||"—"}</div>
                  <div style={{ fontSize:10, color:C.text3 }}>{m.times_applied||0}× applied</div>
                </div>
                <div style={{ width:8, height:8, borderRadius:8, background:m.confidence>=0.9?C.green:m.confidence>=0.7?C.amber:C.red, flexShrink:0 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DesignSoulPanel({ user }) {
  const [soul, setSoul]   = useState(null);
  const [robots, setRobots] = useState([]);
  const [selRobot, setSelRobot] = useState(null);
  const [editSoul, setEditSoul] = useState(false);
  const [soulForm, setSoulForm] = useState({});
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");
  useEffect(()=>{
    supabase.from("org_soul").select("*").eq("org_id",ORG_ID).maybeSingle().then(({data})=>{ setSoul(data||{}); setSoulForm(data||{}); });
    supabase.from("robots").select("id,name,avatar_color,role,system_prompt,source").eq("org_id",ORG_ID).order("name").then(({data})=>{ setRobots(data||[]); if(data&&data[0]) setSelRobot(data[0].id); });
  },[]);
  const saveSoul = async () => {
    setSaving(true);
    await supabase.from("org_soul").upsert({...soulForm, org_id:ORG_ID, updated_by:user?.email, updated_at:new Date().toISOString()});
    setSoul(soulForm); setEditSoul(false); setSaving(false); setMsg("Saved ✓");
    setTimeout(()=>setMsg(""),2000);
  };
  const robot = robots.find(r=>r.id===selRobot);
  const GOLD = C.gold;
  return (
    <div style={{ maxWidth:820 }}>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, fontFamily:SERIF, marginBottom:4 }}>✨ Soul</div>
      <div style={{ fontSize:13, color:C.text3, fontFamily:FONT, marginBottom:24 }}>The core identity, principles, and personality of ROGA and its robots.</div>

      {/* Org soul */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.text, fontFamily:SERIF }}>🏛️ Organization Soul</div>
          {!editSoul ? <GoldButton small outline onClick={()=>setEditSoul(true)}>Edit</GoldButton>
            : <div style={{ display:"flex", gap:8 }}><GoldButton small onClick={saveSoul} disabled={saving}>{saving?"Saving…":"Save"}</GoldButton><GoldButton small outline onClick={()=>{ setEditSoul(false); setSoulForm(soul||{}); }}>Cancel</GoldButton></div>}
        </div>
        {msg && <div style={{ fontSize:12, color:C.green, fontFamily:FONT, marginBottom:8 }}>{msg}</div>}
        {["persona","principles","categorization_guidelines"].map(field=>(
          <div key={field} style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.text3, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:FONT, marginBottom:5 }}>{field.replace(/_/g," ")}</div>
            {editSoul
              ? <textarea value={soulForm[field]||""} onChange={e=>setSoulForm(f=>({...f,[field]:e.target.value}))} rows={4}
                  style={{ width:"100%", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontFamily:FONT, fontSize:13, lineHeight:1.6, resize:"vertical" }} />
              : <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, lineHeight:1.65, whiteSpace:"pre-wrap", padding:"8px 0" }}>{soul?.[field]||<span style={{color:C.text3,fontStyle:"italic"}}>Not set</span>}</div>}
          </div>
        ))}
      </div>

      {/* Robot soul / system prompts */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
        <div style={{ fontSize:15, fontWeight:800, color:C.text, fontFamily:SERIF, marginBottom:14 }}>🤖 Robot Instructions</div>
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {robots.map(r=>{ const a=selRobot===r.id; const c=r.avatar_color||GOLD; return (
            <button key={r.id} onClick={()=>setSelRobot(r.id)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${a?c+"88":C.border2}`, background:a?c+"22":"transparent", color:a?c:C.text2, fontSize:12.5, fontWeight:a?700:500, fontFamily:FONT, cursor:"pointer" }}>{r.name}</button>
          );})}
        </div>
        {robot && (
          <div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginBottom:6 }}>{robot.role} · <span style={{ textTransform:"uppercase", letterSpacing:"0.05em" }}>{robot.source}</span></div>
            <pre style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", fontFamily:MONO, fontSize:11.5, color:C.text2, lineHeight:1.6, overflowX:"auto", whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:360, overflowY:"auto" }}>{robot.system_prompt||"(no system prompt stored — using default role description)"}</pre>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:8 }}>To edit a robot's soul, go to Robots → select robot → View Profile → Instructions. Changes go live immediately on next message.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DesignDocPanel({ user, docType, label, icon }) {
  const [content, setContent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");
  useEffect(()=>{
    supabase.from("org_design_docs").select("content,updated_by,updated_at").eq("org_id",ORG_ID).eq("doc_type",docType).maybeSingle()
      .then(({data})=>{ setContent(data?.content||""); });
  },[docType]);
  const save = async () => {
    setSaving(true);
    await supabase.from("org_design_docs").upsert({ org_id:ORG_ID, doc_type:docType, content:draft, updated_by:user?.email, updated_at:new Date().toISOString() });
    setContent(draft); setEditing(false); setSaving(false); setMsg("Saved ✓");
    setTimeout(()=>setMsg(""),2000);
  };
  return (
    <div style={{ maxWidth:820 }}>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, fontFamily:SERIF, marginBottom:4 }}>{icon} {label}</div>
      <div style={{ fontSize:13, color:C.text3, fontFamily:FONT, marginBottom:20 }}>
        {docType==="style_guide"?"Brand voice, communication guidelines, and design standards for ROGA.":"What each robot can access and do — capabilities and boundaries."}
      </div>
      {content===null ? <div style={{ color:C.text3, fontFamily:FONT }}>Loading…</div> : editing ? (
        <div>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={28}
            style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px", color:C.text, fontFamily:MONO, fontSize:12.5, lineHeight:1.7, resize:"vertical" }} />
          {msg && <div style={{ color:C.green, fontFamily:FONT, fontSize:12, marginTop:6 }}>{msg}</div>}
          <div style={{ display:"flex", gap:10, marginTop:12 }}>
            <GoldButton onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</GoldButton>
            <GoldButton outline onClick={()=>{ setEditing(false); setDraft(content); }}>Cancel</GoldButton>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px", marginBottom:14 }}>
            <MarkdownMessage text={content||`*No ${label.toLowerCase()} set yet.*`} accent={C.gold} />
          </div>
          <GoldButton small outline onClick={()=>{ setEditing(true); setDraft(content||""); }}>✏️ Edit</GoldButton>
        </div>
      )}
    </div>
  );
}


function OrganizationView({ user }) {
  const isMobile = useIsMobile();
  const [staff, setStaff] = useState(null);
  const [org, setOrg] = useState(null);
  const [robots, setRobots] = useState(null);
  useEffect(()=>{
    supabase.from("user_profiles").select("full_name,email,role,brokerage_role,avatar_url").then(({data})=>setStaff(data||[]));
    supabase.from("organizations").select("name,broker_name").eq("id",ORG_ID).maybeSingle().then(({data})=>setOrg(data||null));
    supabase.from("robots").select("id,name,role,description,avatar_color,status,current_focus,source").order("name",{ascending:true}).then(({data})=>setRobots(data||[]));
  },[]);
  const TIERS=[
    { key:"owner",   label:"Ownership",      icon:"👑", note:"Owners & principals" },
    { key:"admin",   label:"Administration", icon:"🔑", note:"Brokers & front office" },
    { key:"manager", label:"Management",     icon:"🛠️", note:"Operations & team leads" },
  ];
  return (
    <div style={{ padding:isMobile?"16px":"24px 28px", maxWidth:980 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"22px 24px", marginBottom:22 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:FONT, marginBottom:6 }}>Organization</div>
        <div style={{ fontSize:22, fontWeight:700, color:C.text, fontFamily:SERIF }}>{org?.name||"Realty One Group Advantage"}</div>
        {org?.broker_name && <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, marginTop:5 }}>Broker of Record · <span style={{ color:C.gold, fontWeight:600 }}>{org.broker_name}</span></div>}
      </div>
      {staff===null ? (
        <div style={{ color:C.text3, fontFamily:FONT, fontSize:13 }}>Loading…</div>
      ) : TIERS.map(tier=>{
        const people = staff.filter(p=>p.role===tier.key);
        if(people.length===0) return null;
        return (
          <div key={tier.key} style={{ marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:15 }}>{tier.icon}</span>
              <span style={{ fontSize:14, fontWeight:700, color:C.gold, fontFamily:FONT, letterSpacing:"0.04em", textTransform:"uppercase" }}>{tier.label}</span>
              <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>· {tier.note}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
              {people.map(p=>(
                <div key={p.email} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:13 }}>
                  <Avatar name={p.full_name} email={p.email} size={44} />
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.full_name||p.email}</div>
                    <div style={{ fontSize:12, color:C.gold, fontFamily:FONT, fontWeight:600 }}>{p.brokerage_role||tier.label}</div>
                    <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.email}</div>
                  </div>
                  <span style={{ fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:6, color:C.gold, background:C.goldDim, border:`1px solid ${C.goldBorder}`, textTransform:"uppercase", whiteSpace:"nowrap" }}>{p.role}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* AI Team — robots */}
      {robots && robots.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:10 }}>
            <span style={{ fontSize:15 }}>🤖</span>
            <span style={{ fontSize:14, fontWeight:700, color:C.gold, fontFamily:FONT, letterSpacing:"0.04em", textTransform:"uppercase" }}>AI Team</span>
            <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>· Business Unit Leaders & in-app assistant</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
            {robots.map(r=>{
              const c = r.avatar_color || C.gold;
              const initial = String(r.name||"?").charAt(0).toUpperCase();
              const origin = r.source === "suarez" ? "Synced from Suarez" : "In-App";
              return (
                <div key={r.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:13 }}>
                    <div style={{ width:44, height:44, borderRadius:11, background:c+"22", border:`1px solid ${c}66`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontWeight:800, fontSize:18, color:c, fontFamily:SERIF }}>{initial}</div>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                        <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT }}>{r.name}</span>
                        <span style={{ fontSize:8.5, fontWeight:800, padding:"2px 7px", borderRadius:6, color:C.gold, background:C.goldDim, border:`1px solid ${C.goldBorder}`, textTransform:"uppercase", whiteSpace:"nowrap" }}>{r.status}</span>
                        <span style={{ fontSize:8.5, fontWeight:700, padding:"2px 7px", borderRadius:6, color:C.text3, background:C.surface2, border:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{origin}</span>
                      </div>
                      <div style={{ fontSize:11.5, color:c, fontFamily:FONT, fontWeight:600, marginTop:2 }}>{r.role}</div>
                    </div>
                  </div>
                  {r.description && <div style={{ fontSize:12, color:C.text2, fontFamily:FONT, marginTop:10, lineHeight:1.5 }}>{r.description}</div>}
                  {r.current_focus && (
                    <div style={{ marginTop:10, background:c+"14", border:`1px solid ${c}33`, borderRadius:9, padding:"8px 11px" }}>
                      <span style={{ fontSize:8.5, fontWeight:800, color:c, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:FONT }}>Current focus</span>
                      <div style={{ fontSize:11.5, color:C.text2, fontFamily:FONT, marginTop:2, lineHeight:1.45 }}>{r.current_focus}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ user, onProfileSaved, theme, onToggleTheme }) {
  const [showEdit,setShowEdit] = useState(false);
  const [showPw,setShowPw]     = useState(false);
  const [editForm,setEditForm] = useState({full_name:user?.full_name||"",phone:user?.phone||"",title:user?.title||""});
  const [pwForm,setPwForm]     = useState({next:"",confirm:""});
  const [saving,setSaving]     = useState(false);
  const [toast,setToast]       = useState(null);
  const setE = (k,v) => setEditForm(f=>({...f,[k]:v}));
  const setP = (k,v) => setPwForm(f=>({...f,[k]:v}));
  const [org,setOrg] = useState(null);
  useEffect(()=>{ supabase.from("organizations").select("*").eq("id",ORG_ID).maybeSingle().then(({data})=>{ if(data) setOrg(data); }); },[]);

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
    <div style={{ padding:"16px" , maxWidth:600 }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px", marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>Organization</div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:C.goldDim, border:`1px solid ${C.goldBorder}`,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <AriMark size={20} />
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF }}>{ORG_NAME}</div>
            <div style={{ fontSize:11, color:C.text2, fontFamily:FONT }}>Pro plan · {APP_NAME}</div>
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

      {org && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px", marginTop:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Office Information</div>
          {[
            ["Broker of Record", org.broker_name],
            ["Head Office ID", org.office_id],
            ["Address", [org.address, org.city, org.state, org.zip].filter(Boolean).join(", ")],
            ["Phone", org.phone],
            ["Fax", org.fax],
            ["Email", org.email],
            ["Website", org.website],
          ].filter(([,v])=>v).map(([k,v],i)=>(
            <div key={k} style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:16, padding:"9px 0", borderTop:i===0?"none":`1px solid ${C.border}`, fontFamily:FONT }}>
              <span style={{ fontSize:12, color:C.text3, whiteSpace:"nowrap" }}>{k}</span>
              {k==="Email"
                ? <a href={`mailto:${v}`} style={{ fontSize:12.5, color:C.gold, textAlign:"right", wordBreak:"break-word", textDecoration:"none" }}>{v}</a>
                : k==="Website"
                ? <a href={v} target="_blank" rel="noreferrer" style={{ fontSize:12.5, color:C.gold, textAlign:"right", wordBreak:"break-word", textDecoration:"none" }}>{v}</a>
                : <span style={{ fontSize:12.5, color:C.text2, textAlign:"right", fontWeight:600, wordBreak:"break-word" }}>{v}</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px", marginTop:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>Appearance</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>Theme</div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>Switch between dark and light</div>
          </div>
          <div style={{ display:"flex", gap:6, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:4 }}>
            {["dark","light"].map(m=>(
              <button key={m} onClick={()=>{ if(theme!==m && onToggleTheme) onToggleTheme(); }} style={{
                padding:"7px 14px", borderRadius:7, border:"none", cursor:"pointer", fontFamily:FONT, fontSize:13, fontWeight:600,
                background: theme===m ? C.gold : "transparent", color: theme===m ? "#0a0a0a" : C.text2 }}>
                {m==="dark"?"\u{1F319} Dark":"\u2600\uFE0F Light"}
              </button>
            ))}
          </div>
        </div>
      </div>

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

// ============ Brokerage Performance (leadership) ============
function PerformanceView({ user }) {
  const [yrs, setYrs]   = useState([]);
  const [life, setLife] = useState([]);
  const [board, setBoard] = useState([]);
  const [extra, setExtra] = useState({ ref: 0, fee: 0, agents: 0 });
  const [sel, setSel]   = useState("all");
  const [loading, setLoading] = useState(true);

  const f = n => { n = Number(n||0); return n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${Math.round(n/1e3)}K`:`$${Math.round(n)}`; };
  const num = n => Number(n||0).toLocaleString("en-US");

  useEffect(()=>{ (async()=>{
    const [b,l,ref,fee,ag] = await Promise.all([
      supabase.from("brokerage_performance_yearly").select("*").eq("org_id",ORG_ID).order("tax_year"),
      supabase.from("agent_performance_lifetime").select("*").eq("org_id",ORG_ID).order("total_gci",{ascending:false}),
      supabase.from("transactions").select("id",{count:"exact",head:true}).eq("org_id",ORG_ID).eq("is_referral",true),
      supabase.from("transactions").select("id",{count:"exact",head:true}).eq("org_id",ORG_ID).eq("is_fee_only",true),
      supabase.from("agent_performance_lifetime").select("agent_contact_id",{count:"exact",head:true}).eq("org_id",ORG_ID),
    ]);
    setYrs(b.data||[]); setLife(l.data||[]);
    setExtra({ ref: ref.count||0, fee: fee.count||0, agents: ag.count||0 });
    setLoading(false);
  })(); },[]);

  useEffect(()=>{ (async()=>{
    if(sel==="all"){ setBoard([]); return; }
    const { data } = await supabase.from("agent_performance_yearly").select("*")
      .eq("org_id",ORG_ID).eq("tax_year",Number(sel)).order("gci",{ascending:false}).limit(12);
    setBoard(data||[]);
  })(); },[sel]);

  if(loading) return <div style={{padding:40,color:C.text2,fontFamily:FONT}}>Loading brokerage performance…</div>;

  const scope = sel==="all" ? null : yrs.find(y=>String(y.tax_year)===sel);
  const tot = {
    gci:   sel==="all" ? yrs.reduce((s,y)=>s+Number(y.gci||0),0)        : Number(scope?.gci||0),
    vol:   sel==="all" ? yrs.reduce((s,y)=>s+Number(y.volume||0),0)     : Number(scope?.volume||0),
    deals: sel==="all" ? yrs.reduce((s,y)=>s+Number(y.deals||0),0)      : Number(scope?.deals||0),
    net:   sel==="all" ? yrs.reduce((s,y)=>s+Number(y.net_office||0),0) : Number(scope?.net_office||0),
  };
  const maxG = Math.max(1, ...yrs.map(y=>Number(y.gci||0)));
  const rows = sel==="all"
    ? life.slice(0,12).map(r=>({name:r.full_name, gci:Number(r.total_gci||0), deals:r.total_deals, trend:r.trend_flag}))
    : board.map(r=>({name:r.full_name, gci:Number(r.gci||0), deals:r.deals, trend:null}));

  const card  = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18 };
  const kpiV  = { fontFamily:MONO, fontSize:26, color:C.text, fontWeight:500, marginTop:6 };
  const kpiL  = { fontFamily:FONT, fontSize:11, color:C.text3, textTransform:"uppercase", letterSpacing:1 };
  const trendColor = t => t==="growing"?C.green : t==="declining"?C.red : t==="dormant"?C.text3 : C.gold;

  return (
    <div style={{ padding:"22px clamp(14px,3vw,30px)", maxWidth:1180, margin:"0 auto", fontFamily:FONT }}>
      {/* header + year selector */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div>
          <div style={{ fontFamily:SERIF, fontSize:"clamp(22px,4vw,30px)", color:C.text }}>Brokerage Performance</div>
          <div style={{ fontFamily:FONT, fontSize:13, color:C.text2, marginTop:2 }}>
            {ORG_NAME} · 7-year history · {num(extra.agents)} agents
          </div>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:12, padding:5 }}>
          {["all",...yrs.map(y=>String(y.tax_year))].map(y=>(
            <button key={y} onClick={()=>setSel(y)} style={{
              fontFamily:MONO, fontSize:13, padding:"7px 11px", borderRadius:8, cursor:"pointer", border:"none",
              background: sel===y ? C.gold : "transparent", color: sel===y ? "#0a0a0a" : C.text2, fontWeight: sel===y?700:400 }}>
              {y==="all" ? "All Years" : "’"+y.slice(2)}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:14 }}>
        <div style={card}><div style={kpiL}>Gross Commission</div><div style={kpiV}>{f(tot.gci)}</div></div>
        <div style={card}><div style={kpiL}>Volume</div><div style={kpiV}>{f(tot.vol)}</div></div>
        <div style={card}><div style={kpiL}>Closed Deals</div><div style={kpiV}>{num(tot.deals)}</div></div>
        <div style={card}><div style={kpiL}>Net Office</div><div style={{...kpiV,color:C.gold}}>{f(tot.net)}</div></div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))", gap:14 }}>
        {/* GCI chart */}
        <div style={card}>
          <div style={{ fontFamily:FONT, fontWeight:700, fontSize:14, color:C.text, marginBottom:16 }}>Gross commission by year</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:170 }}>
            {yrs.map(y=>{
              const h = Math.max(3, Math.round(Number(y.gci||0)/maxG*100));
              const on = String(y.tax_year)===sel;
              return (
                <div key={y.tax_year} onClick={()=>setSel(String(y.tax_year))}
                  style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:7, height:"100%", justifyContent:"flex-end", cursor:"pointer" }}>
                  <div style={{ width:"100%", height:h+"%", borderRadius:"6px 6px 2px 2px",
                    background: on ? C.goldLight : `linear-gradient(180deg, ${C.gold}, rgba(212,175,55,0.45))` }} />
                  <div style={{ fontFamily:MONO, fontSize:11, color: on?C.gold:C.text3 }}>’{String(y.tax_year).slice(2)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* leaderboard */}
        <div style={card}>
          <div style={{ fontFamily:FONT, fontWeight:700, fontSize:14, color:C.text, marginBottom:10 }}>
            {sel==="all" ? "Top producers · lifetime" : `Top producers · ${sel}`}
          </div>
          {rows.length===0 && <div style={{color:C.text3,fontSize:13,padding:"10px 0"}}>No data for this year.</div>}
          {rows.map((r,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:11, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:22,height:22,borderRadius:6,background:C.goldDim,color:C.gold,fontFamily:MONO,fontSize:12,
                display:"flex",alignItems:"center",justifyContent:"center",flex:"none" }}>{i+1}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name||"—"}</div>
                <div style={{ fontSize:11, color:C.text3 }}>{num(r.deals)} deals{r.trend?` · ${r.trend}`:""}</div>
              </div>
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
                {r.trend && <span style={{ width:7,height:7,borderRadius:"50%",background:trendColor(r.trend) }} />}
                <span style={{ fontFamily:MONO, fontSize:13, color:C.text }}>{f(r.gci)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* referrals + fee-only callouts */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12, marginTop:14 }}>
        <div style={{...card, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div><div style={kpiL}>Referrals</div><div style={{fontFamily:FONT,fontSize:12,color:C.text3,marginTop:4}}>counted as deal + income</div></div>
          <div style={{fontFamily:MONO,fontSize:24,color:C.text}}>{num(extra.ref)}</div>
        </div>
        <div style={{...card, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div><div style={kpiL}>Fee-only items</div><div style={{fontFamily:FONT,fontSize:12,color:C.text3,marginTop:4}}>separate ledger page</div></div>
          <div style={{fontFamily:MONO,fontSize:24,color:C.text}}>{num(extra.fee)}</div>
        </div>
      </div>
      <div style={{ fontFamily:FONT, fontSize:11.5, color:C.text3, marginTop:16 }}>
        Org-wide view · visible to owners &amp; admins · reconciled to the GOLD 7-year history.
      </div>
    </div>
  );
}


// ================= Intelligence (AI bookkeeping) =================
function IntelligenceView({ user }) {
  const isLeader = ["admin","owner"].includes(user?.role);
  const [tab,setTab]       = useState("soul");
  const [soul,setSoul]     = useState(null);
  const [mems,setMems]     = useState([]);
  const [cats,setCats]     = useState([]);
  const [acts,setActs]     = useState([]);
  const [counts,setCounts] = useState({posted:0,review:0});
  const [allExp,setAllExp] = useState([]);
  const [pickCat,setPickCat] = useState({});
  const [loading,setLoading] = useState(true);
  const [mq,setMq]         = useState("");
  const [editSoul,setEditSoul] = useState(false);
  const [soulForm,setSoulForm] = useState({});
  const [addMem,setAddMem] = useState(false);
  const [memForm,setMemForm] = useState({kind:"vendor",pattern:"",category:"",confidence:"0.9"});
  const [toast,setToast]   = useState(null);
  const [saving,setSaving] = useState(false);

  const load = async () => {
    const [s,m,c,a,posted,review,ex] = await Promise.all([
      supabase.from("org_soul").select("*").eq("org_id",ORG_ID).maybeSingle(),
      supabase.from("bookkeeping_memories").select("*").eq("org_id",ORG_ID).order("times_applied",{ascending:false}).order("created_at",{ascending:false}),
      supabase.from("expense_categories").select("*").eq("org_id",ORG_ID).order("sort"),
      supabase.from("intelligence_activity_log").select("*").eq("org_id",ORG_ID).order("created_at",{ascending:false}).limit(80),
      supabase.from("expenses").select("id",{count:"exact",head:true}).eq("org_id",ORG_ID).eq("status","posted"),
      supabase.from("expenses").select("id",{count:"exact",head:true}).eq("org_id",ORG_ID).eq("status","review"),
      supabase.from("expenses").select("id,txn_date,vendor,description,amount,category_name,confidence,status").eq("org_id",ORG_ID).order("amount",{ascending:false}).limit(1000),
    ]);
    setSoul(s.data||null); setMems(m.data||[]); setCats(c.data||[]); setActs(a.data||[]);
    setAllExp(ex.data||[]);
    setCounts({posted:posted.count||0, review:review.count||0}); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const fmtTime = t => { try{ return new Date(t).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}); }catch(e){ return ""; } };
  const card = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:18 };
  const lbl  = { fontSize:11, fontWeight:700, color:C.text3, fontFamily:FONT, letterSpacing:"0.08em", textTransform:"uppercase" };
  const money = x => "$"+Math.round(Number(x||0)).toLocaleString();

  const saveSoul = async () => {
    setSaving(true);
    const { error } = await supabase.from("org_soul").update({
      persona:soulForm.persona, principles:soulForm.principles,
      categorization_guidelines:soulForm.categorization_guidelines,
      confidence_threshold:Number(soulForm.confidence_threshold)||0.8,
      updated_by:user?.email, updated_at:new Date().toISOString() }).eq("org_id",ORG_ID);
    if(!error){ await supabase.from("intelligence_activity_log").insert({org_id:ORG_ID,actor:"user",action:"Updated the soul",entity_type:"soul",detail:{by:user?.email}}); }
    setSaving(false); setEditSoul(false); if(!error){ setToast({msg:"Soul updated",type:"success"}); load(); } else setToast({msg:"Error",type:"error"});
  };
  const saveMem = async () => {
    if(!memForm.pattern.trim()||!memForm.category) return; setSaving(true);
    const cat = cats.find(c=>c.name===memForm.category);
    const { error } = await supabase.from("bookkeeping_memories").insert({
      org_id:ORG_ID, kind:memForm.kind, pattern:memForm.pattern.trim().toLowerCase(),
      category_id:cat?.id, category_name:memForm.category, confidence:Number(memForm.confidence)||0.9,
      source:"learned", created_by:user?.email });
    if(!error){ await supabase.from("intelligence_activity_log").insert({org_id:ORG_ID,actor:"user",action:`Added memory: "${memForm.pattern}" → ${memForm.category}`,entity_type:"memory",detail:{by:user?.email}}); }
    setSaving(false); setAddMem(false); setMemForm({kind:"vendor",pattern:"",category:"",confidence:"0.9"});
    if(!error){ setToast({msg:"Memory saved — it'll auto-apply next time",type:"success"}); load(); } else setToast({msg:"Error",type:"error"});
  };
  const toggleMem = async (m) => {
    await supabase.from("bookkeeping_memories").update({active:!m.active}).eq("id",m.id); load();
  };

  const postExpense = async (row) => {
    const catName = pickCat[row.id] || row.category_name;
    if(!catName){ setToast({msg:"Pick a category first",type:"error"}); return; }
    const cat = cats.find(c=>c.name===catName);
    await supabase.from("expenses").update({ category_id:cat?.id, category_name:catName, status:"posted", confidence:1.0, created_by:user?.email }).eq("id",row.id);
    const v=(row.vendor||"").trim();
    const junk = !v || v.length>40 || /^name:|check payment|cc payment|payment out/i.test(v);
    if(!junk && !mems.find(m=>m.pattern && v.toLowerCase().includes(m.pattern))){
      await supabase.from("bookkeeping_memories").insert({ org_id:ORG_ID, kind:"vendor", pattern:v.toLowerCase(), category_id:cat?.id, category_name:catName, confidence:0.92, source:"correction", created_by:user?.email });
    }
    await supabase.from("intelligence_activity_log").insert({ org_id:ORG_ID, actor:"user", action:`Posted ${v||"expense"} \u2192 ${catName}`, entity_type:"expense", entity_id:String(row.id), detail:{ amount:row.amount } });
    setToast({msg:`Posted \u2192 ${catName}${junk?"":" \u00b7 learned"}`,type:"success"}); load();
  };

  if(loading) return <div style={{padding:40,color:C.text2,fontFamily:FONT}}>Loading intelligence…</div>;

  const memsF = mems.filter(m=>!mq || `${m.pattern} ${m.category_name} ${m.kind}`.toLowerCase().includes(mq.toLowerCase()));
  const TABS = [["soul","🫀 Soul"],["memories","🧠 Memories"],["expenses","💵 Expenses"],["activity","📜 Activity Log"]];

  return (
    <div style={{ padding:"20px clamp(14px,3vw,26px)", maxWidth:1080, margin:"0 auto", fontFamily:FONT }}>
      {toast&&<Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      {/* summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginBottom:16 }}>
        <div style={card}><div style={lbl}>Categories</div><div style={{fontFamily:MONO,fontSize:24,color:C.text,marginTop:6}}>{cats.length}</div></div>
        <div style={card}><div style={lbl}>Memories</div><div style={{fontFamily:MONO,fontSize:24,color:C.text,marginTop:6}}>{mems.length}</div></div>
        <div style={card}><div style={lbl}>Posted</div><div style={{fontFamily:MONO,fontSize:24,color:C.green,marginTop:6}}>{counts.posted}</div></div>
        <div style={card}><div style={lbl}>Purgatory</div><div style={{fontFamily:MONO,fontSize:24,color:counts.review>0?C.amber:C.text,marginTop:6}}>{counts.review}</div></div>
      </div>

      {/* sub-nav */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 14px", borderRadius:9, border:`1px solid ${tab===id?C.goldBorder:C.border}`,
            background:tab===id?C.goldDim:"transparent", color:tab===id?C.gold:C.text2,
            fontFamily:FONT, fontSize:13, fontWeight:600, cursor:"pointer" }}>{label}</button>
        ))}
      </div>

      {/* SOUL */}
      {tab==="soul" && (
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={lbl}>The Soul · how this org keeps its books</div>
            {isLeader && <GoldButton small outline onClick={()=>{ setSoulForm(soul||{}); setEditSoul(true); }}>Edit</GoldButton>}
          </div>
          <div style={{ fontSize:14, color:C.text, fontStyle:"italic", marginBottom:16, lineHeight:1.6 }}>“{soul?.persona||"—"}”</div>
          <div style={{ ...lbl, marginBottom:8 }}>Principles</div>
          <div style={{ fontSize:13.5, color:C.text2, whiteSpace:"pre-wrap", marginBottom:16, lineHeight:1.7 }}>{soul?.principles||"—"}</div>
          <div style={{ ...lbl, marginBottom:8 }}>Categorization guidelines</div>
          <div style={{ fontSize:13.5, color:C.text2, whiteSpace:"pre-wrap", marginBottom:16, lineHeight:1.7 }}>{soul?.categorization_guidelines||"—"}</div>
          <div style={{ display:"flex", gap:22, flexWrap:"wrap", fontSize:12.5, color:C.text3 }}>
            <span>Fiscal year start: <b style={{color:C.text2,fontFamily:MONO}}>{soul?.fiscal_year_start||"01-01"}</b></span>
            <span>Currency: <b style={{color:C.text2,fontFamily:MONO}}>{soul?.default_currency||"USD"}</b></span>
            <span>Auto-post threshold: <b style={{color:C.gold,fontFamily:MONO}}>{Math.round((soul?.confidence_threshold||0.8)*100)}%</b></span>
          </div>
        </div>
      )}

      {/* MEMORIES */}
      {tab==="memories" && (
        <div>
          <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
            <input value={mq} onChange={e=>setMq(e.target.value)} placeholder="Search memories…"
              style={{ padding:"8px 12px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", width:240 }} />
            <span style={{ fontSize:12, color:C.text3 }}>{memsF.length} of {mems.length}</span>
            {isLeader && <div style={{ marginLeft:"auto" }}><GoldButton small onClick={()=>setAddMem(true)}>+ Add memory</GoldButton></div>}
          </div>
          <div style={{ ...card, padding:"4px 0", overflowX:"auto" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1.4fr 0.7fr 0.7fr 0.6fr 0.5fr",minWidth:600, padding:"9px 18px", borderBottom:`1px solid ${C.border}` }}>
              {["Pattern","Category","Kind","Confidence","Used","On"].map(h=><span key={h} style={{fontSize:10,fontWeight:700,color:C.text3,fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</span>)}
            </div>
            {memsF.slice(0,300).map(m=>(
              <div key={m.id} style={{ display:"grid", gridTemplateColumns:"1.4fr 1.4fr 0.7fr 0.7fr 0.6fr 0.5fr",minWidth:600, padding:"10px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center", opacity:m.active?1:0.45 }}>
                <span style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:MONO }}>{m.pattern}</span>
                <span style={{ fontSize:12.5, color:C.text2 }}>{m.category_name}</span>
                <span style={{ fontSize:11, color:C.text3 }}>{m.kind}</span>
                <span style={{ fontSize:12, color:m.confidence>=0.8?C.green:C.amber, fontFamily:MONO }}>{Math.round(m.confidence*100)}%</span>
                <span style={{ fontSize:12, color:C.text3, fontFamily:MONO }}>{m.times_applied}</span>
                <span style={{ fontSize:10, color:m.source==="seed"?C.text3:C.blue, fontFamily:MONO, cursor:isLeader?"pointer":"default" }}
                  onClick={()=>isLeader&&toggleMem(m)} title={isLeader?"Toggle active":""}>{m.active?m.source:"off"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVITY */}
      {tab==="activity" && (
        <div style={{ ...card, padding:"4px 0", overflowX:"auto" }}>
          {acts.length===0 && <div style={{padding:"30px",textAlign:"center",color:C.text3,fontSize:13}}>No activity yet.</div>}
          {acts.map(a=>(
            <div key={a.id} style={{ display:"flex", gap:12, padding:"11px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"flex-start" }}>
              <span style={{ fontSize:14, flexShrink:0, width:22, textAlign:"center" }}>{a.actor==="ai"?"✦":a.actor==="user"?"👤":"⚙️"}</span>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontSize:13, color:C.text, fontFamily:FONT }}>{a.action}</div>
                {a.detail && Object.keys(a.detail||{}).length>0 && <div style={{ fontSize:11, color:C.text3, fontFamily:MONO, marginTop:2 }}>{Object.entries(a.detail).map(([k,v])=>`${k}: ${v}`).join(" · ")}</div>}
              </div>
              <span style={{ fontSize:11, color:C.text3, fontFamily:MONO, flexShrink:0 }}>{fmtTime(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {tab==="expenses" && (() => {
        const review = allExp.filter(e=>e.status==="review");
        const posted = allExp.filter(e=>e.status==="posted");
        const byCat = {}; posted.forEach(e=>{ const k=e.category_name||"—"; byCat[k]=byCat[k]||{n:0,sum:0}; byCat[k].n++; byCat[k].sum+=Number(e.amount||0); });
        const ledger = Object.entries(byCat).sort((a,b)=>b[1].sum-a[1].sum);
        const postedTotal = posted.reduce((s2,e)=>s2+Number(e.amount||0),0);
        const reviewTotal = review.reduce((s2,e)=>s2+Number(e.amount||0),0);
        return (
          <div>
            <div style={{...card, marginBottom:14}}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={lbl}>Posted ledger · {posted.length} txns</div>
                <div style={{ fontFamily:MONO, fontSize:18, color:C.text }}>{money(postedTotal)}</div>
              </div>
              {ledger.map(([cat,v])=>(
                <div key={cat} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:13, color:C.text2 }}>{cat}</span>
                  <span style={{ fontSize:12.5, color:C.text3 }}><span style={{fontFamily:MONO}}>{v.n}</span> · <span style={{fontFamily:MONO,color:C.text}}>{money(v.sum)}</span></span>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding:"4px 0", overflowX:"auto" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 18px" }}>
                <div style={{...lbl, color:review.length?C.amber:C.text3}}>🕯️ Purgatory · {review.length} need your call · {money(reviewTotal)}</div>
              </div>
              {review.length===0 && <div style={{padding:"24px 18px",color:C.text3,fontSize:13,textAlign:"center"}}>Purgatory is empty — every expense is filed.</div>}
              {review.slice(0,250).map(r=>(
                <div key={r.id} style={{ display:"grid", gridTemplateColumns:"1.6fr 0.6fr 1.3fr 0.6fr",minWidth:460, gap:10, padding:"10px 18px", borderTop:`1px solid ${C.border}`, alignItems:"center" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.vendor||"—"}</div>
                    <div style={{ fontSize:10.5, color:C.text3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{(r.description||"").slice(0,52)}</div>
                  </div>
                  <span style={{ fontSize:12.5, fontFamily:MONO, color:C.text }}>{money(r.amount)}</span>
                  <select value={pickCat[r.id] ?? (r.category_name||"")} onChange={e=>setPickCat(p=>({...p,[r.id]:e.target.value}))}
                    style={{ padding:"6px 8px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:7, color:C.text, fontSize:12, fontFamily:FONT, outline:"none" }}>
                    <option value="">— pick category —</option>
                    {cats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  {isLeader
                    ? <button onClick={()=>postExpense(r)} style={{ padding:"7px 10px", borderRadius:7, border:"none", cursor:"pointer", background:C.gold, color:"#0a0a0a", fontFamily:FONT, fontSize:12, fontWeight:700 }}>Post</button>
                    : <span/>}
                </div>
              ))}
              {review.length>250 && <div style={{padding:"12px 18px",color:C.text3,fontSize:12,textAlign:"center"}}>Showing first 250 of {review.length}.</div>}
            </div>
          </div>
        );
      })()}

      {editSoul && (
        <Modal title="Edit the Soul" onClose={()=>setEditSoul(false)} maxWidth={560}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Persona" value={soulForm.persona||""} onChange={v=>setSoulForm(f=>({...f,persona:v}))} />
            <div><label style={{...lbl,display:"block",marginBottom:5}}>Principles</label>
              <textarea rows={5} value={soulForm.principles||""} onChange={e=>setSoulForm(f=>({...f,principles:e.target.value}))}
                style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical", boxSizing:"border-box" }} /></div>
            <div><label style={{...lbl,display:"block",marginBottom:5}}>Categorization guidelines</label>
              <textarea rows={4} value={soulForm.categorization_guidelines||""} onChange={e=>setSoulForm(f=>({...f,categorization_guidelines:e.target.value}))}
                style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:7, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical", boxSizing:"border-box" }} /></div>
            <Field label="Auto-post threshold (0–1)" value={String(soulForm.confidence_threshold??0.8)} onChange={v=>setSoulForm(f=>({...f,confidence_threshold:v}))} />
            <div style={{ display:"flex", gap:10 }}>
              <GoldButton onClick={saveSoul} disabled={saving}>{saving?"Saving…":"Save"}</GoldButton>
              <GoldButton outline onClick={()=>setEditSoul(false)}>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}

      {addMem && (
        <Modal title="New memory" onClose={()=>setAddMem(false)} maxWidth={440}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Pattern (vendor or keyword)" value={memForm.pattern} onChange={v=>setMemForm(f=>({...f,pattern:v}))} placeholder="e.g. adobe" />
            <Sel label="Category" value={memForm.category} onChange={v=>setMemForm(f=>({...f,category:v}))} options={cats.map(c=>c.name)} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Sel label="Kind" value={memForm.kind} onChange={v=>setMemForm(f=>({...f,kind:v}))} options={["vendor","keyword","rule"]} />
              <Field label="Confidence (0–1)" value={memForm.confidence} onChange={v=>setMemForm(f=>({...f,confidence:v}))} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <GoldButton onClick={saveMem} disabled={saving||!memForm.pattern.trim()||!memForm.category}>{saving?"Saving…":"Save memory"}</GoldButton>
              <GoldButton outline onClick={()=>setAddMem(false)}>Cancel</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


// Lightweight URL query-param helpers (no router) — used to persist the
// admin "view as agent" preview across refreshes.
const getQ = (k) => { try { return new URLSearchParams(window.location.search).get(k); } catch(e){ return null; } };
const setQ = (obj) => {
  try {
    const u = new URL(window.location.href);
    Object.entries(obj).forEach(([k,v])=> (v==null||v==="") ? u.searchParams.delete(k) : u.searchParams.set(k,v));
    window.history.replaceState({}, "", u);
  } catch(e){}
};

function TVBoard() {
  const [data,setData] = useState(null);
  const [idx,setIdx]   = useState(0);
  const [now,setNow]   = useState(new Date());
  const slides = ["glance","recruiting","deals","leaderboard"];
  const TITLES = { glance:"Brokerage at a Glance", recruiting:"Recruiting Pipeline", deals:"Recent Activity", leaderboard:"Top Producers" };

  useEffect(()=>{
    let alive=true;
    const pull=async()=>{ try{ const { data:d } = await supabase.rpc("tv_board"); if(alive&&d) setData(d); }catch(e){} };
    pull(); const di=setInterval(pull,60000); return ()=>{ alive=false; clearInterval(di); };
  },[]);
  useEffect(()=>{
    const si=setInterval(()=>setIdx(i=>(i+1)%slides.length),12000);
    const ci=setInterval(()=>setNow(new Date()),30000);
    return ()=>{ clearInterval(si); clearInterval(ci); };
  },[]);

  const fmtMoney = n => { n=Number(n)||0; return n>=1e9?`$${(n/1e9).toFixed(2)}B`:n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n}`; };
  const fmtNum   = n => (Number(n)||0).toLocaleString();
  const wrap = { position:"fixed", inset:0, background:"#0a0a0a", color:C.text, fontFamily:FONT, overflow:"hidden", display:"flex", flexDirection:"column" };
  if(!data) return <div style={{...wrap, alignItems:"center", justifyContent:"center"}}><div style={{color:C.text3, fontSize:"1.5vw"}}>Loading broadcast…</div></div>;
  const cur = slides[idx];
  const g=data.glance||{}, r=data.recruiting||{}, deals=data.recent_deals||[], board=data.leaderboard||[];
  const tile = (l,v,c)=>(
    <div key={l} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"1vw", padding:"4vh 2vw", textAlign:"center" }}>
      <div style={{ fontSize:"3.4vw", fontWeight:800, fontFamily:SERIF, color:c, lineHeight:1 }}>{v}</div>
      <div style={{ fontSize:"1vw", color:C.text3, textTransform:"uppercase", letterSpacing:"0.12em", marginTop:"1.6vh" }}>{l}</div>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"3.5vh 4vw 0" }}>
        <div style={{ fontFamily:SERIF, fontWeight:700, fontSize:"2.3vw" }}>Realty <span style={{color:C.gold}}>ONE</span> Group <span style={{fontWeight:600}}>Advantage</span></div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"1.7vw", fontFamily:MONO }}>{now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</div>
          <div style={{ fontSize:"0.9vw", color:C.text3 }}>{now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        </div>
      </div>
      <div style={{ padding:"1.4vh 4vw 0", fontSize:"1.15vw", color:C.gold, textTransform:"uppercase", letterSpacing:"0.22em", fontWeight:700 }}>{TITLES[cur]}</div>

      <div key={cur} style={{ flex:1, padding:"2vh 4vw", display:"flex", flexDirection:"column", justifyContent:"center", animation:"tvfade .8s ease" }}>
        {cur==="glance" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"1.8vw" }}>
            {tile("Active Deals",fmtNum(g.active_deals),C.text)}
            {tile("Closed · All-Time",fmtNum(g.closed_all_time),C.green)}
            {tile("Volume · 7yr",fmtMoney(g.volume_7yr),C.gold)}
            {tile("GCI · 7yr",fmtMoney(g.gci_7yr),C.gold)}
            {tile("Contacts",fmtNum(g.contacts),C.text)}
          </div>
        )}
        {cur==="recruiting" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1.8vw", marginBottom:"5vh" }}>
              {tile("Total Leads",fmtNum(r.total),C.text)}
              {tile("🔥 Hot",fmtNum(r.hot),C.red)}
              {tile("Warm",fmtNum(r.warm),C.amber)}
              {tile("Cold",fmtNum(r.cold),C.blue)}
            </div>
            {(r.stages||[]).map(s=>{ const pct=r.total?Math.max(s.count/r.total*100,1.5):0; return (
              <div key={s.stage} style={{ marginBottom:"2.6vh" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"1.4vw", marginBottom:"0.8vh" }}>
                  <span>{s.stage}</span><span style={{fontFamily:MONO,color:C.gold}}>{fmtNum(s.count)}</span>
                </div>
                <div style={{ height:"1.8vh", background:C.surface2, borderRadius:"1vh", overflow:"hidden" }}>
                  <div style={{ width:pct+"%", height:"100%", background:`linear-gradient(90deg,${C.goldDim},${C.gold})` }} />
                </div>
              </div>
            );})}
          </div>
        )}
        {cur==="deals" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.6vh" }}>
            {deals.length===0 && <div style={{color:C.text3, fontSize:"1.4vw"}}>No recent deals.</div>}
            {deals.map((d,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:C.surface, border:`1px solid ${C.border}`, borderRadius:"0.8vw", padding:"2.6vh 2.2vw" }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:"2vw", fontWeight:700 }}>{d.address||"—"}</div>
                  <div style={{ fontSize:"1vw", color:C.text3 }}>{[d.city,d.state].filter(Boolean).join(", ")}{d.type?" · "+d.type:""}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:"2vw", fontFamily:MONO, color:C.gold }}>{d.price?fmtMoney(d.price):"—"}</div>
                  <div style={{ fontSize:"1vw", color:(d.status==="Closed")?C.green:C.blue, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{d.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {cur==="leaderboard" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.2vh" }}>
            {board.map((a,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:"2vw", background:C.surface, border:`1px solid ${i<3?C.goldBorder:C.border}`, borderRadius:"0.8vw", padding:"1.9vh 2.2vw" }}>
                <div style={{ fontSize:"2.1vw", fontWeight:800, fontFamily:SERIF, color:i===0?C.gold:C.text3, width:"3vw", textAlign:"center" }}>{i+1}</div>
                <div style={{ flex:1, fontSize:"1.8vw", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name||"—"}</div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:"1.7vw", fontFamily:MONO, color:C.gold }}>{fmtMoney(a.volume)}</div>
                  <div style={{ fontSize:"0.9vw", color:C.text3 }}>{fmtNum(a.deals)} deals · {fmtMoney(a.gci)} GCI</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:"flex", gap:"1vw", justifyContent:"center", padding:"3vh 0 3.5vh" }}>
        {slides.map((s,i)=>(<div key={s} style={{ width:i===idx?"3vw":"1vw", height:"0.6vh", borderRadius:"1vh", background:i===idx?C.gold:C.border2, transition:"all .4s" }} />))}
      </div>
      <style>{`@keyframes tvfade{from{opacity:0;transform:translateY(1.2vh)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

export default function App() {
  const tv = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tv") === "1";
  return tv ? <TVBoard /> : <MainApp />;
}

function MainApp() {
  const [session,setSession]             = useState(null);
  const [authLoading,setAuthLoading]     = useState(true);
  const [authScreen,setAuthScreen]       = useState("login");
  const [userProfile,setUserProfile]     = useState(null);
  const [view,setView]                   = useState("dashboard");
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [sidebarCollapsed,setSC]         = useState(false);
  const [mobileMenuOpen,setMobileMenu]   = useState(false);
  const [showTempBanner,setTempBanner]   = useState(false);
  const [deals,setDeals]                 = useState([]);
  const [contacts,setContacts]           = useState([]);
  const [tasks,setTasks]                 = useState([]);
  const [dataLoaded,setDataLoaded]       = useState(false);

  const [agentPortalContact, setAgentPortalContact] = useState(null);
  const [viewAsContact, setViewAsContact]     = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setSession(session); setAuthLoading(false); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,session)=>{
      setSession(session);
      if(event==="PASSWORD_RECOVERY") setAuthScreen("setpassword");
      if(!session){ setUserProfile(null); setDataLoaded(false); setAuthScreen("login"); setAgentPortalContact(null); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session?.user) return;
    const email = session.user.email;
    // Check if team user first
    supabase.from("user_profiles").select("*").ilike("email",email).maybeSingle()
      .then(async ({data})=>{
        const STAFF = ["owner","admin","manager"];
        if(data && STAFF.includes(data.role)){
          // Staff (owner / admin / manager) — main app
          let canRecruit = ["owner","admin"].includes(data.role);
          let recruitRole = canRecruit ? "owner" : null;
          try {
            const { data:rm } = await supabase.from("recruiting_members")
              .select("pipeline_role").eq("org_id",ORG_ID).ilike("user_email",email).maybeSingle();
            if(rm){ canRecruit = true; recruitRole = rm.pipeline_role; }
          } catch(e){ /* ignore */ }
          setUserProfile({ ...data, canRecruit, recruitRole });
          const hrs = (Date.now()-new Date(data.created_at))/3600000;
          if(hrs<72) setTempBanner(true);
        } else {
          // Everyone else (agent / non-gold user / no profile) → portal,
          // scoped by RLS to their own Agent contact.
          const { data:agentRows } = await supabase.from("contacts")
            .select("*").eq("org_id",ORG_ID).eq("contact_type","Agent")
            .ilike("email",email).limit(1);
          if(agentRows && agentRows[0]) {
            setAgentPortalContact(agentRows[0]);
          }
        }
      });
  },[session]);

  // Restore an in-progress "View as agent" preview after a page refresh.
  useEffect(()=>{
    const asId = getQ("as");
    if(!asId) return;
    if(!userProfile || !["owner","admin","manager"].includes(userProfile.role)) return;
    supabase.from("contacts").select("*").eq("id",asId).maybeSingle()
      .then(({data})=>{ if(data) setViewAsContact(data); });
  },[userProfile]);

  const loadData = useCallback(async()=>{
    if(!session) return;
    const [d,c,t] = await Promise.all([
      fetchAllRows(()=>supabase.from("deals").select("*").eq("org_id",ORG_ID).order("created_at",{ascending:false})),
      fetchAllRows(()=>supabase.from("contacts").select("*").eq("org_id",ORG_ID).order("contact_type").order("full_name")),
      fetchAllRows(()=>supabase.from("tasks").select("*").eq("org_id",ORG_ID).order("created_at",{ascending:false})),
    ]);
    setDeals(d||[]); setContacts(c||[]); setTasks(t||[]);
    setDataLoaded(true);
  },[session]);

  useEffect(()=>{ if(session) loadData(); },[session,loadData]);

  const [theme,setTheme] = useState(()=>{ try{ return (typeof localStorage!=="undefined" && localStorage.getItem("ari-theme"))||"dark"; }catch(e){ return "dark"; } });
  const toggleTheme = ()=>{ const nx=theme==="dark"?"light":"dark"; applyPalette(nx); try{ localStorage.setItem("ari-theme",nx); }catch(e){} setTheme(nx); };
  const signOut = ()=>supabase.auth.signOut();
  const onProfileSaved = updates => setUserProfile(p=>({...p,...updates}));

  if(authLoading) return <LoadingScreen message="Starting Ari…" />;

  if(!session){
    if(authScreen==="forgot") return <ForgotScreen onBack={()=>setAuthScreen("login")} />;
    return <LoginScreen onForgot={()=>setAuthScreen("forgot")} />;
  }

  if(authScreen==="setpassword")
    return <SetPasswordScreen onDone={()=>{ setAuthScreen("login"); setTempBanner(false); }} />;

  // Real agent login → dedicated portal (full experience, RLS-scoped to them).
  if(agentPortalContact && !userProfile){
    return (
      <AgentPortalApp
        agentContact={agentPortalContact}
        session={session}
        onSignOut={signOut}
        isPreview={false}
        initialView={getQ("v")||undefined}
        onViewChange={(v)=>setQ({v})}
      />
    );
  }

  if(!dataLoaded) return <LoadingScreen message="Loading your workspace\u2026" />;

  const TITLES = {
    dashboard:["Dashboard",ORG_NAME],
    deals:[`Deals`,`${deals.length} total`],
    contacts:[`Contacts`,`${contacts.length} total`],
    tasks:[`Tasks`,`${tasks.filter(t=>t.status!=="done").length} open`],
    settings:["Settings","Account & org"],
    systems:["Systems","Integrations & status"],
    organization:["Organization","Leadership & structure"],
    robots:  ["Robots", "Your AI team"],
    design:   ["Design", "Brand, memory & robot configuration"],
    calendar:   ["Calendar",   "Realty One Group Advantage"],
    listings:   ["Listings Pipeline", "Seller-side opportunities"],
    buyers:     ["Buyers Pipeline", "Buyer-side opportunities"],
    leasing:    ["Leasing Pipeline", "Tenant & rental opportunities"],
    applications:["Applications", "Agent Onboarding Queue"],
    recruiting:["Recruiting Pipeline", "Producing-agent prospects · Admin only"],
    financials:  ["Financials",   "Agent Packages & Deal P&L"],
    performance:["Brokerage Performance", ORG_NAME],
  };
  const [title,subtitle] = TITLES[view]||["Ari",""];
  const cu = userProfile||{email:session.user.email,role:"member"};
  const sw = isMobile ? 0 : sidebarCollapsed ? 56 : 220;

  return (
    <div style={{ display:"flex", background:C.bg, minHeight:"100vh" }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, textarea, select { font-size: 16px !important; }
        .cal-right-panel { display: block !important; }
        @media (max-width: 767px) {
          .cal-right-panel { display: none !important; }
        }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 4px; }
        button { touch-action: manipulation; }
      `}</style>
      <Sidebar
        activeView={view} onNav={setView} user={cu} onSignOut={signOut}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={()=>setMobileMenu(false)}
      />
      <div style={{ marginLeft:sw, flex:1, transition:"margin-left 0.2s",
        display:"flex", flexDirection:"column", minWidth:0,
        paddingBottom:isMobile?60:0 }}>
        <TopBar title={title} subtitle={subtitle} theme={theme} onToggleTheme={toggleTheme}
          onToggleSidebar={()=>isMobile ? setMobileMenu(o=>!o) : setSC(c=>!c)}
          actions={["admin","owner"].includes(cu.role) ? (
            <button onClick={()=>setShowAgentPicker(true)} title="View any agent's portal as they see it"
              style={{ background:"none", border:`1px solid ${C.border2}`, color:C.text2,
                cursor:"pointer", fontSize:12, fontFamily:FONT, padding:"7px 12px", borderRadius:8,
                minHeight:38, display:"flex", alignItems:"center", gap:6, flexShrink:0, whiteSpace:"nowrap" }}>
              {"\u{1F441}"} {isMobile ? "" : "View as agent"}
            </button>
          ) : null} />
        {showTempBanner&&<TempPasswordBanner onAction={()=>{ setTempBanner(false); setAuthScreen("setpassword"); }} />}
        <main style={{ flex:1, overflowY:"auto", paddingBottom:isMobile?"calc(56px + env(safe-area-inset-bottom,0px))":0 }}>
          {view==="dashboard"&&<DashboardView user={cu} deals={deals} contacts={contacts} tasks={tasks} />}
          {view==="deals"    &&<DealsView     user={cu} deals={deals}    onRefresh={loadData} />}
          {view==="contacts" &&<ContactsView  user={cu} contacts={contacts} onRefresh={loadData} />}
          {view==="tasks"    &&<TasksView     user={cu} tasks={tasks}    onRefresh={loadData} />}
          {view==="planning" &&<PlanningView  user={cu} onRefresh={loadData} />}
          {view==="systems" && <SystemsView user={cu} />}
          {view==="organization" && <OrganizationView user={cu} />}
          {view==="settings" &&<SettingsView  user={cu} onProfileSaved={onProfileSaved} theme={theme} onToggleTheme={toggleTheme} />}
          {view==="notepad"  &&<NotesView     user={cu} />}
          {view==="robots"   &&<RobotsView    user={cu} deals={deals} contacts={contacts} tasks={tasks} />}
          {view==="design"   &&<DesignView    user={cu} />}
          {view==="calendar"   &&<CalendarView    user={cu} />}
          {view==="listings"   &&<PipelineView pipeline="listing" user={cu} />}
          {view==="buyers"     &&<PipelineView pipeline="buyer"   user={cu} />}
          {view==="leasing"    &&<PipelineView pipeline="leasing" user={cu} />}
          {view==="applications"&&<ApplicationsView user={cu} />}
          {view==="recruiting"  &&<RecruitingView   user={cu} />}
          {view==="financials"  &&<FinancialsView   user={cu} />}
          {view==="performance" &&<PerformanceView  user={cu} />}
        </main>
      </div>
      {showAgentPicker && (
        <AgentPickerModal
          contacts={contacts.filter(c=>c.contact_type==="Agent")}
          onPick={c=>{ setShowAgentPicker(false); setViewAsContact(c); setQ({as:c.id, v:"portal_dashboard"}); }}
          onClose={()=>setShowAgentPicker(false)} />
      )}
      {viewAsContact && (
        <AgentPortalPreview
          contact={viewAsContact}
          initialView={getQ("v")||undefined}
          onViewChange={(v)=>setQ({v})}
          onClose={()=>{ setViewAsContact(null); setQ({as:null, v:null}); }} />
      )}
      {isMobile && <BottomNavBar activeView={view} onNav={setView} user={cu} onMenu={()=>setMobileMenu(true)} />}
    </div>
  );
}