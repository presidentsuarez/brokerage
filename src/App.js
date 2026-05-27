import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const APP_NAME = "Prism";
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
  { id:"dashboard", label:"Dashboard", icon:"⬡" },
  { id:"deals",     label:"Deals",     icon:"◈" },
  { id:"contacts",  label:"Contacts",  icon:"◎" },
  { id:"tasks",     label:"Tasks",     icon:"◻" },
  { id:"calendar",  label:"Calendar",  icon:"◷" },
  { id:"applications",label:"Applications",icon:"✦", adminOnly:true },
  { id:"financials",  label:"Financials",  icon:"◑", adminOnly:true },
  { id:"robots",    label:"Ari",       icon:"✦", platformOnly:true },
  { id:"notepad",   label:"Notepad",   icon:"✎", platformOnly:true },
  { id:"settings",  label:"Settings",  icon:"⚙", platformOnly:true },
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


function BottomNavBar({ activeView, onNav, user }) {
  const isAdmin = ["admin","owner"].includes(user?.role);
  // Show top 5 most important items on bottom nav
  const items = NAV.filter(n=>{
    if(n.platformOnly) return user?.email===PLATFORM_ADMIN;
    if(n.adminOnly)    return isAdmin;
    return true;
  }).slice(0, 5);

  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:90,
      background:C.surface, borderTop:`1px solid ${C.border}`,
      display:"flex", paddingBottom:"env(safe-area-inset-bottom,0px)",
      backdropFilter:"blur(10px)",
    }}>
      {items.map(item=>{
        const active = activeView===item.id;
        return (
          <button key={item.id} onClick={()=>onNav(item.id)} style={{
            flex:1, display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", padding:"10px 4px 8px",
            background:"transparent", border:"none", cursor:"pointer",
            color:active?C.gold:C.text3, minHeight:56,
            transition:"color 0.12s",
          }}>
            <span style={{ fontSize:20, lineHeight:1, marginBottom:3 }}>{item.icon}</span>
            <span style={{ fontSize:9, fontWeight:active?700:400, fontFamily:FONT,
              letterSpacing:"0.03em", textTransform:"uppercase" }}>{item.label}</span>
            {active && <div style={{ position:"absolute", top:0, left:"50%",
              transform:"translateX(-50%)", width:24, height:2,
              background:C.gold, borderRadius:2 }} />}
          </button>
        );
      })}
    </div>
  );
}

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

function Sidebar({ activeView, onNav, user, onSignOut, collapsed, mobileOpen, onMobileClose }) {
  const isMobile = useIsMobile();
  const isAdmin = ["admin","owner"].includes(user?.role);

  const sidebarW = isMobile ? 272 : collapsed ? 56 : 220;
  const isHidden = isMobile && !mobileOpen;

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
          <PrismMark size={26} />
          {(!collapsed||isMobile) && (
            <div style={{ overflow:"hidden", flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:SERIF,
                letterSpacing:"-0.01em", whiteSpace:"nowrap" }}>Prism</div>
              <div style={{ fontSize:9, color:C.text3, fontFamily:FONT, whiteSpace:"nowrap",
                letterSpacing:"0.04em", textTransform:"uppercase" }}>ROG Advantage</div>
            </div>
          )}
          {isMobile && (
            <button onClick={onMobileClose} style={{ background:"none", border:"none",
              color:C.text2, fontSize:20, cursor:"pointer", marginLeft:"auto",
              padding:4, lineHeight:1 }}>✕</button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, padding:"10px 6px", display:"flex", flexDirection:"column", gap:1,
          overflowY:"auto" }}>
          {NAV.filter(n=>{
            if(n.platformOnly) return user?.email===PLATFORM_ADMIN;
            if(n.adminOnly)    return isAdmin;
            return true;
          }).map(item=>{
            const active = activeView===item.id;
            return (
              <button key={item.id} onClick={()=>handleNav(item.id)} style={{
                display:"flex", alignItems:"center", gap:12,
                padding:(collapsed&&!isMobile)?"10px 0":"10px 14px",
                justifyContent:(collapsed&&!isMobile)?"center":"flex-start",
                borderRadius:10, border:"none", cursor:"pointer", width:"100%",
                background:active?C.goldDim:"transparent",
                color:active?C.gold:C.text2,
                fontSize:isMobile?14:13, fontWeight:active?600:400, fontFamily:FONT,
                minHeight:isMobile?48:36, transition:"all 0.1s" }}
                onMouseEnter={e=>{if(!active){e.currentTarget.style.background=C.surface2;e.currentTarget.style.color=C.text;}}}
                onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.text2;}}}>
                <span style={{ fontSize:17, lineHeight:1, flexShrink:0 }}>{item.icon}</span>
                {(!collapsed||isMobile)&&<span style={{ whiteSpace:"nowrap" }}>{item.label}</span>}
                {active&&(!collapsed||isMobile)&&<div style={{ marginLeft:"auto", width:3,
                  height:16, borderRadius:2, background:C.gold }} />}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding:(collapsed&&!isMobile)?"10px 6px":"12px 14px",
          borderTop:`1px solid ${C.border}` }}>
          {(!collapsed||isMobile) && (
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10,
              padding:"4px 6px" }}>
              <Avatar name={user?.full_name} email={user?.email} size={32} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {user?.full_name||user?.email}
                </div>
                <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, textTransform:"capitalize" }}>
                  {user?.brokerage_role||user?.role}
                </div>
              </div>
            </div>
          )}
          {(collapsed&&!isMobile) && (
            <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
              <Avatar name={user?.full_name} email={user?.email} size={28} />
            </div>
          )}
          <button onClick={onSignOut} style={{
            width:"100%", padding:(collapsed&&!isMobile)?"8px 0":"9px 12px",
            background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8,
            color:C.text3, fontSize:12, fontFamily:FONT, cursor:"pointer",
            display:"flex", alignItems:"center",
            justifyContent:(collapsed&&!isMobile)?"center":"flex-start", gap:8,
            minHeight:isMobile?44:32, transition:"color 0.12s" }}
            onMouseEnter={e=>e.currentTarget.style.color=C.red}
            onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
            <span style={{ fontSize:14 }}>⎋</span>
            {(!collapsed||isMobile)&&<span>Sign out</span>}
          </button>
        </div>
      </div>
    </>
  );
}

function TopBar({ title, subtitle, onToggleSidebar, actions }) {
  return (
    <div style={{ height:56, background:C.surface, borderBottom:`1px solid ${C.border}`,
      display:"flex", alignItems:"center", padding:"0 16px 0 12px", gap:12,
      position:"sticky", top:0, zIndex:50 }}>
      <button onClick={onToggleSidebar} style={{
        background:"none", border:"none", color:C.text2, cursor:"pointer",
        fontSize:18, padding:"8px", borderRadius:8, lineHeight:1,
        minWidth:40, minHeight:40, display:"flex", alignItems:"center", justifyContent:"center" }}>☰</button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF,
          letterSpacing:"-0.01em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{title}</div>
        {subtitle && <div style={{ fontSize:11, color:C.text3, fontFamily:FONT,
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{subtitle}</div>}
      </div>
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
                          status:"open", created_by:creatorLabel(user),
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
      org_id:ORG_ID, created_by:creatorLabel(user),
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



// ════════════════════════════════════════════════════════════
// AGENT PORTAL — Full experience (Phase 1+2)
// ════════════════════════════════════════════════════════════

const PORTAL_NAV = [
  { id:"portal_dashboard", label:"Dashboard",  icon:"⬡" },
  { id:"portal_pipeline",  label:"Pipeline",   icon:"◈" },
  { id:"portal_contacts",  label:"Contacts",   icon:"◎" },
  { id:"portal_tasks",     label:"Tasks",      icon:"◻" },
  { id:"portal_team",      label:"Team",       icon:"◑" },
  { id:"portal_calendar",  label:"Calendar",   icon:"◷" },
  { id:"portal_earnings",  label:"My Earnings", icon:"$" },
  { id:"portal_chat",      label:"Chat · Ari", icon:"✦" },
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

        const res = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            model:"claude-sonnet-4-20250514",
            max_tokens:1000,
            system:`You are Ari, the AI assistant for ${agentName} at Realty One Group Advantage. You are their personal brokerage AI coach and resource. Help with: pipeline questions, drafting emails and offers, real estate advice, showing prep, goal tracking, and client communication. Their broker team: Dara Khoyi (Broker, khoyi1234@gmail.com), Alex Khoi (Broker, alex@brokeralex.com), Josh Maples (Front Desk, roga.lutz@gmail.com), Javier Suarez (Operations, javier@thesuarezcapital.com). Be encouraging, practical, and direct. Keep responses concise. If they need broker support, point them to Dara or Alex.`,
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

function AgentPortalApp(
{ agentContact, session, onSignOut, isPreview=false }) {
  const [view, setView]       = useState("portal_dashboard");
  const [myDeals, setMyDeals] = useState([]);
  const [myContacts, setMyCon] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [team, setTeam]       = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSC] = useState(false);
  const [mobileMenuOpen, setMobileMenu] = useState(false);
  const [chatMsgs, setChatMsgs]   = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChSend]  = useState(false);
  const [chatConvId, setChatConvId] = useState(null);
  const chatBottomRef = useRef(null);
  const [agentPackage, setAgentPackage] = useState(null);

  const agentName  = agentContact?.full_name || "Agent";
  const agentEmail = agentContact?.email || session?.user?.email || "";
  const agentPhone = agentContact?.phone || "";

  useEffect(()=>{
    const load = async () => {
      const [dc, ct, t, tm] = await Promise.all([
        // deals linked to this agent
        supabase.from("deal_contacts")
          .select("role, deals(id,address,city,state,price,status,deal_type,mls_number,bedrooms,bathrooms,sqft,close_date,commission_rate,notes,created_at)")
          .eq("contact_id", agentContact?.id || "00000000-0000-0000-0000-000000000000"),
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
      setMyDeals((dc.data||[]).map(r=>({...r.deals, agent_role:r.role})).filter(d=>d?.id));
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
  const sw  = isMobile ? 0 : sidebarCollapsed ? 56 : 220;

  // ── Agent Sidebar ──
  const AgentSidebar = () => {
    const sW = sidebarCollapsed&&!isMobile ? 56 : 272;
    const isHidden = isMobile && !mobileMenuOpen;
    return (
    <>
      {isMobile && mobileMenuOpen && (
        <div onClick={()=>setMobileMenu(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:99 }} />
      )}
      <div style={{ width:sW, minWidth:sW, background:C.surface,
      borderRight:`1px solid ${C.border}`, height:"100vh",
      display:"flex", flexDirection:"column",
      transition:"transform 0.25s ease, width 0.2s,min-width 0.2s", overflow:"hidden",
      position:"fixed", top:0, left:0, zIndex:100,
      transform:isHidden?"translateX(-100%)":"translateX(0)",
      boxShadow:isMobile&&mobileMenuOpen?"4px 0 24px rgba(0,0,0,0.4)":"none" }}>

      <div style={{ padding:sidebarCollapsed?"16px 14px":"16px 18px",
        display:"flex", alignItems:"center", gap:10,
        borderBottom:`1px solid ${C.border}`, minHeight:56 }}>
        <PrismMark size={26} />
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
            <button key={item.id} onClick={()=>{setView(item.id);if(isMobile)setMobileMenu(false);}} style={{
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
    const closed   = myDeals.filter(d=>d.status==="Closed");
    const underC   = myDeals.filter(d=>d.status==="Under Contract");
    const openT    = myTasks.filter(t=>t.status!=="done");
    const gci      = closed.reduce((s,d)=>s+((d.price||0)*((d.commission_rate||3)/100)),0);
    const upcoming = myTasks.filter(t=>t.status!=="done"&&t.due_date).sort((a,b)=>a.due_date>b.due_date?1:-1).slice(0,3);

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

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:24 }}>
          {[
            {label:"Active",        val:active.length,  accent:C.blue},
            {label:"Under Contract",val:underC.length,  accent:C.amber},
            {label:"Closed",        val:closed.length,  accent:C.green},
            {label:"Est. GCI",      val:gci>0?fmt(gci):"—", accent:C.gold},
            {label:"Open Tasks",    val:openT.length,   accent:openT.length>3?C.amber:C.text2},
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
                    background:{high:C.red,medium:C.amber,low:C.text3}[t.priority]||C.text3 }} />
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
    const fmt2 = n=>n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n}`;
    return (
      <div style={{ padding:"20px 24px" }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"13px 18px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.text2, fontFamily:FONT,
              textTransform:"uppercase", letterSpacing:"0.08em" }}>My Listing Pipeline</span>
            <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>{myDeals.length} deals</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", padding:"8px 18px", borderBottom:`1px solid ${C.border}` }}>
            {["Property","My Role","Status","Price"].map(h=>(
              <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3,
                fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
            ))}
          </div>
          {myDeals.length===0
            ? <div style={{ padding:"48px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
                No deals linked to you yet.<br/>
                <span style={{ fontSize:11, marginTop:6, display:"block" }}>Contact your broker to get linked to your listings.</span>
              </div>
            : myDeals.map(d=>(
              <div key={d.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr",
                padding:"12px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}
                onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{d.address||"—"}</div>
                  <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                    {[d.city,d.state].filter(Boolean).join(", ")}
                    {d.mls_number?` · MLS ${d.mls_number}`:""}
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:C.gold, fontFamily:FONT,
                  background:C.goldDim, borderRadius:5, padding:"2px 8px", width:"fit-content" }}>
                  {d.agent_role||"Agent"}
                </span>
                <StatusBadge status={d.status} />
                <span style={{ fontSize:12, fontWeight:700, color:C.gold, fontFamily:MONO }}>
                  {d.price?fmt2(d.price):"—"}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    );
  };

  // ── Contacts ──
  const PortalContacts = () => {
    const [search,setSearch] = useState("");
    const filtered = myContacts.filter(c=>
      !search||`${c.full_name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <div style={{ padding:"20px 24px" }}>
        <div style={{ display:"flex", gap:10, marginBottom:16 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search my contacts…"
            style={{ padding:"8px 12px", background:C.surface2, border:`1px solid ${C.border2}`,
              borderRadius:8, color:C.text, fontSize:13, fontFamily:FONT, outline:"none", width:260 }}
            onFocus={e=>e.target.style.borderColor=C.gold}
            onBlur={e=>e.target.style.borderColor=C.border2} />
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr",
            padding:"8px 18px", borderBottom:`1px solid ${C.border}` }}>
            {["Name","Type","Email","Phone"].map(h=>(
              <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3,
                fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
            ))}
          </div>
          {filtered.length===0
            ? <div style={{ padding:"40px 18px", textAlign:"center", color:C.text3, fontSize:13, fontFamily:FONT }}>
                {myContacts.length===0?"You haven't added any contacts yet":"No results"}
              </div>
            : filtered.map(c=>(
              <div key={c.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr",
                padding:"11px 18px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <Avatar name={c.full_name} email={c.email} size={26} />
                  <span style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{c.full_name}</span>
                </div>
                <span style={{ fontSize:11, color:C.text2, fontFamily:FONT }}>{c.contact_type}</span>
                <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{c.email||"—"}</span>
                <span style={{ fontSize:12, color:C.text2, fontFamily:MONO }}>{c.phone||"—"}</span>
              </div>
            ))
          }
        </div>
      </div>
    );
  };

  // ── Tasks ──
  const PortalTasks = () => {
    const [showAdd,setShowAdd] = useState(false);
    const [form,setForm]       = useState({title:"",priority:"medium",due_date:""});
    const [saving,setSaving]   = useState(false);
    const open = myTasks.filter(t=>t.status!=="done");
    const done = myTasks.filter(t=>t.status==="done");

    const toggle = async t => {
      await supabase.from("tasks").update({status:t.status==="done"?"open":"done"}).eq("id",t.id);
      refreshTasks();
    };
    const addTask = async () => {
      if(!form.title.trim()) return;
      setSaving(true);
      await supabase.from("tasks").insert({
        ...form, org_id:ORG_ID, status:"open",
        assigned_to:agentEmail, created_by:agentName,
      });
      setSaving(false); setShowAdd(false); setForm({title:"",priority:"medium",due_date:""});
      refreshTasks();
    };
    const PCOL = {high:C.red,medium:C.amber,low:C.text3};

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
                  options={[{value:"high",label:"High"},{value:"medium",label:"Medium"},{value:"low",label:"Low"}]} />
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
    portal_pipeline:  ["My Pipeline", `${myDeals.length} deals`],
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
        <TopBar title={ptitle} subtitle={psub}
          onToggleSidebar={()=>isMobile?setMobileMenu(o=>!o):setSC(c=>!c)} />
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
              {view==="portal_pipeline"  && <PortalPipeline />}
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
      </div>
    </div>
  );
}


function AgentPortalPreview({ contact, onClose }) {
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
        />
      </div>
    </div>
  );
}


function ContactsTable({ contacts, allContacts, onSelect, typeDot }) {
  const isMobile = useIsMobile();
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
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
            padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <Avatar name={c.full_name} email={c.email} size={42} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:FONT }}>{c.full_name}</span>
              {c.portal_enabled&&<span style={{ fontSize:9, fontWeight:700, color:C.green,
                background:"rgba(34,197,94,0.12)", borderRadius:10, padding:"2px 6px" }}>Portal ON</span>}
            </div>
            <div style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>
              {c.contact_type}
              {c.phone?` · ${c.phone}`:""}
            </div>
            {c.email&&<div style={{ fontSize:11, color:C.text3, fontFamily:FONT,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.email}</div>}
          </div>
          <span style={{ fontSize:16, color:C.text3 }}>›</span>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr 80px",
        padding:"9px 18px", borderBottom:`1px solid ${C.border}` }}>
        {["Name","Type","Email","Phone","Portal"].map(h=>(
          <span key={h} style={{ fontSize:10, fontWeight:700, color:C.text3,
            fontFamily:FONT, textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
        ))}
      </div>
      {contacts.map(c=>(
        <div key={c.id} onClick={()=>onSelect(c)}
          style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr 80px",
            padding:"12px 18px", borderBottom:`1px solid ${C.border}`,
            alignItems:"center", cursor:"pointer" }}
          onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Avatar name={c.full_name} email={c.email} size={28} />
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:FONT }}>{c.full_name}</div>
              {c.notes&&<div style={{ fontSize:10, color:C.text3, fontFamily:FONT,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:150 }}>{c.notes}</div>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:typeDot[c.contact_type]||C.text3 }} />
            <span style={{ fontSize:12, color:C.text2, fontFamily:FONT }}>{c.contact_type}</span>
          </div>
          <span style={{ fontSize:12, color:C.text2, fontFamily:FONT,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.email||"—"}</span>
          <span style={{ fontSize:12, color:C.text2, fontFamily:MONO }}>{c.phone||"—"}</span>
          <div style={{ display:"flex", justifyContent:"center" }}>
            {c.portal_enabled
              ? <span style={{ fontSize:10, fontWeight:700, color:C.green,
                  background:"rgba(34,197,94,0.10)", borderRadius:20, padding:"3px 8px" }}>ON</span>
              : <span style={{ fontSize:10, color:C.text3 }}>—</span>
            }
          </div>
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

  const saveEdit = async () => {
    setSaving(true);
    const { error } = await supabase.from("contacts")
      .update({...editForm, updated_at:new Date().toISOString()})
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
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              {label:"Type",   val:contact.contact_type||"—"},
              {label:"Status", val:contact.status||"—"},
              {label:"Source", val:contact.source||"—"},
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

          {/* Notes */}
          {contact.notes&&(
            <div style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"13px 16px", marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
                textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Notes</div>
              <div style={{ fontSize:13, color:C.text2, fontFamily:FONT, lineHeight:1.6 }}>{contact.notes}</div>
            </div>
          )}

          {/* ── Agent Portal Toggle ── */}
          <div style={{ background:C.surface, border:`1px solid ${contact.portal_enabled?C.goldBorder:C.border}`,
            borderRadius:12, padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: contact.portal_enabled||portalMode?12:0 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT,
                  display:"flex", alignItems:"center", gap:8 }}>
                  Agent Portal
                  {contact.portal_enabled&&<span style={{ fontSize:10, fontWeight:700,
                    color:C.green, background:"rgba(34,197,94,0.10)",
                    borderRadius:20, padding:"2px 8px" }}>Active</span>}
                </div>
                <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, marginTop:2 }}>
                  {contact.portal_enabled
                    ? `Access: ${contact.portal_email}`
                    : "Give this agent a personal portal login"}
                </div>
              </div>
              <div>
                {contact.portal_enabled ? (
                  <div style={{ display:"flex", gap:8 }}>
                    <GoldButton small onClick={()=>setShowPreview(true)}>Preview portal</GoldButton>
                    <GoldButton small danger onClick={disablePortal} disabled={saving}>
                      {saving?"Revoking…":"Revoke"}
                    </GoldButton>
                  </div>
                ) : (
                  <GoldButton small outline onClick={()=>setPortalMode(p=>!p)}>
                    {portalMode?"Cancel":"Enable portal"}
                  </GoldButton>
                )}
              </div>
            </div>

            {/* Enable portal form */}
            {!contact.portal_enabled && portalMode && (
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12,
                display:"flex", flexDirection:"column", gap:10 }}>
                <Field label="Portal login email" value={portalEmail}
                  onChange={setPortalEmail} type="email"
                  placeholder={contact.email||"agent@example.com"} autoFocus />
                <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
                  The agent will use this email to log into their portal.
                  Make sure it matches their auth email if they already have an account.
                </div>
                <GoldButton onClick={enablePortal} disabled={saving||!portalEmail.trim()} small>
                  {saving?"Enabling…":"Enable & save"}
                </GoldButton>
              </div>
            )}
          </div>
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
  const [showAdd,setShowAdd]       = useState(false);
  const [selected,setSelected]     = useState(null);
  const [saving,setSaving]         = useState(false);
  const [toast,setToast]           = useState(null);
  const [form,setForm]             = useState({full_name:"",email:"",phone:"",contact_type:"Agent",status:"Active",source:"",notes:""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // Keep selected in sync after refresh
  useEffect(()=>{
    if(selected){ const updated=contacts.find(c=>c.id===selected.id); if(updated) setSelected(updated); }
  },[contacts]);

  const TYPES = ["all","Agent","Client","Lender","Referral","Vendor"];
  const filtered = contacts.filter(c=>{
    if(typeFilter!=="all"&&c.contact_type!==typeFilter) return false;
    if(search&&!`${c.full_name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = async () => {
    if(!form.full_name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("contacts").insert({...form,org_id:ORG_ID,created_by:creatorLabel(user)});
    setSaving(false);
    if(!error){ setShowAdd(false); setForm({full_name:"",email:"",phone:"",contact_type:"Agent",status:"Active",source:"",notes:""}); onRefresh(); setToast({msg:"Contact added",type:"success"}); }
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
      </div>

      {/* Table / Cards */}
      <ContactsTable contacts={filtered} allContacts={contacts} onSelect={setSelected} typeDot={TYPE_DOT} />

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
  const [form,setForm]       = useState({title:"",description:"",priority:"medium",due_date:"",assigned_to:user?.email||""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const open = tasks.filter(t=>t.status!=="done");
  const done = tasks.filter(t=>t.status==="done");

  const handleAdd = async () => {
    if(!form.title.trim()) return;
    setSaving(true);
    await supabase.from("tasks").insert({...form,org_id:ORG_ID,status:"open",created_by:creatorLabel(user)});
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



function NotesView({ user }) {
  const [notes,setNotes]           = useState([]);
  const [loading,setLoading]       = useState(true);
  const [editingNote,setEditingNote] = useState(null);
  const [saving,setSaving]         = useState(false);
  const [toast,setToast]           = useState(null);
  const [newTitle,setNewTitle]     = useState("");

  const loadNotes = async () => {
    const { data } = await supabase.from("team_notes")
      .select("*").eq("org_id", ORG_ID)
      .order("pinned", {ascending:false})
      .order("updated_at", {ascending:false});
    setNotes(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ loadNotes(); },[]);

  const createNote = async () => {
    const { data } = await supabase.from("team_notes")
      .insert({ org_id:ORG_ID, title:"New Note", content:"", created_by:creatorLabel(user), updated_by:creatorLabel(user) })
      .select().single();
    if(data){ await loadNotes(); setEditingNote(data); }
  };

  const saveNote = async () => {
    if(!editingNote) return;
    setSaving(true);
    await supabase.from("team_notes").update({
      title:   editingNote.title,
      content: editingNote.content,
      updated_by: creatorLabel(user),
      updated_at: new Date().toISOString(),
    }).eq("id", editingNote.id);
    setSaving(false);
    setNotes(n=>n.map(x=>x.id===editingNote.id?{...x,...editingNote,updated_at:new Date().toISOString()}:x));
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
    setNotes(n=>n.map(x=>x.id===note.id?{...x,pinned:!x.pinned}:x).sort((a,b)=>b.pinned-a.pinned));
  };

  const fmtDate = iso => {
    if(!iso) return "";
    return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  };

  return (
    <div style={{ padding:"16px", maxWidth:900 }}>
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
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <input value={editingNote.title}
              onChange={e=>setEditingNote(n=>({...n,title:e.target.value}))}
              placeholder="Note title"
              style={{ flex:1, fontSize:18, fontWeight:700, color:C.text, fontFamily:SERIF,
                background:"transparent", border:"none", outline:"none",
                borderBottom:`1px solid ${C.border2}`, paddingBottom:8, marginRight:16 }} />
            <div style={{ display:"flex", gap:8 }}>
              <GoldButton onClick={saveNote} disabled={saving} small>{saving?"Saving…":"Save"}</GoldButton>
              <GoldButton onClick={()=>setEditingNote(null)} outline small>Cancel</GoldButton>
            </div>
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
        /* ── Note list ── */
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
          {notes.length===0 ? (
            <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"48px 0",
              color:C.text3, fontSize:13, fontFamily:FONT }}>
              No notes yet — click + New Note to get started.
            </div>
          ) : notes.map(n=>(
            <div key={n.id}
              onClick={()=>setEditingNote(n)}
              style={{ background:C.surface, border:`1px solid ${n.pinned?C.goldBorder:C.border}`,
                borderRadius:12, padding:"16px 18px", cursor:"pointer",
                transition:"border-color 0.12s, background 0.12s",
                display:"flex", flexDirection:"column", gap:6 }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
              onMouseLeave={e=>e.currentTarget.style.background=C.surface}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:SERIF,
                  letterSpacing:"-0.01em", lineHeight:1.3 }}>{n.title||"Untitled"}</div>
                <button onClick={e=>{e.stopPropagation();togglePin(n);}}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:0,
                    fontSize:13, color:n.pinned?C.gold:C.text3, flexShrink:0,
                    lineHeight:1, marginTop:1 }}
                  title={n.pinned?"Unpin":"Pin to top"}>
                  {n.pinned?"📌":"📍"}
                </button>
              </div>
              <div style={{ fontSize:12, color:C.text3, fontFamily:FONT, lineHeight:1.5,
                overflow:"hidden", display:"-webkit-box", WebkitLineClamp:3,
                WebkitBoxOrient:"vertical" }}>
                {n.content||"Empty note"}
              </div>
              <div style={{ fontSize:10, color:C.text3, fontFamily:FONT, marginTop:4 }}>
                {fmtDate(n.updated_at)} · {n.updated_by||n.created_by||""}
              </div>
            </div>
          ))}
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

function RobotsView({ user, deals, contacts, tasks }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [convId, setConvId]       = useState(null);
  const [ariStatus, setAriStatus] = useState("idle");
  const bottomRef = useRef(null);

  // Load or create Ari's conversation for this user
  useEffect(()=>{
    supabase.from("robot_conversations")
      .select("*").eq("robot_id", ARI_ID)
      .eq("user_email", user?.email).eq("org_id", ORG_ID)
      .order("updated_at", {ascending:false}).limit(1)
      .then(({data})=>{
        if(data&&data[0]) {
          setConvId(data[0].id);
          setMessages(data[0].messages||[]);
        }
      });
  },[user?.email]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[messages]);

  const buildContext = () => {
    const dealSummary = deals.slice(0,20).map(d=>
      `${d.address||"Untitled"} (${d.status}, ${d.deal_type}${d.price?`, $${d.price}`:""})`
    ).join("; ");
    const agentCount = contacts.filter(c=>c.contact_type==="Agent").length;
    const openTasks  = tasks.filter(t=>t.status!=="done").length;
    return `\nLIVE ORG CONTEXT:\nDeals (${deals.length} total): ${dealSummary||"none"}\nContacts: ${contacts.length} total (${agentCount} agents)\nOpen tasks: ${openTasks}\nDate: ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}`;
  };

  const sendMessage = async () => {
    if(!input.trim()||sending) return;
    const userMsg = { role:"user", content:input.trim(), ts: new Date().toISOString() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setSending(true);
    setAriStatus("thinking");

    try {
      // Build messages for Claude API
      const apiMessages = newMsgs.map(m=>({
        role: m.role==="user"?"user":"assistant",
        content: m.content,
      }));

      // Add org context to first user message
      if(apiMessages.length===1) {
        apiMessages[0].content = apiMessages[0].content + buildContext();
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are Ari, the AI Business Unit Leader for Realty One Group Advantage (ROGA). You support Javier Suarez (Operations) with brokerage intelligence — deal pipeline analysis, agent performance, operational guidance, market context, and strategic recommendations. You have live access to org data when provided. Be direct, sharp, and practical. Never start with "Certainly!" or "Of course!". Get to the point. Use bullet points for lists. Keep responses focused.`,
          messages: apiMessages,
        }),
      });
      const data = await res.json();
      const ariText = data.content?.[0]?.text || "Sorry, I ran into an issue. Try again.";
      const ariMsg  = { role:"assistant", content:ariText, ts: new Date().toISOString() };
      const finalMsgs = [...newMsgs, ariMsg];
      setMessages(finalMsgs);

      // Save/update conversation
      if(convId) {
        await supabase.from("robot_conversations").update({
          messages:finalMsgs, updated_at:new Date().toISOString()
        }).eq("id", convId);
      } else {
        const {data:conv} = await supabase.from("robot_conversations").insert({
          robot_id: ARI_ID, org_id: ORG_ID,
          user_email: user?.email, messages: finalMsgs,
        }).select().single();
        if(conv) setConvId(conv.id);
      }
    } catch(e) {
      const errMsg = { role:"assistant", content:"Connection error — check your API key or try again.", ts:new Date().toISOString() };
      setMessages(m=>[...m, errMsg]);
    } finally {
      setSending(false);
      setAriStatus("idle");
    }
  };

  const clearChat = async () => {
    if(convId) await supabase.from("robot_conversations").update({messages:[],updated_at:new Date().toISOString()}).eq("id",convId);
    setMessages([]);
  };

  const fmtTime = iso => {
    if(!iso) return "";
    return new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  };

  return (
    <div style={{ display:"flex", height:"calc(100vh - 56px)", overflow:"hidden" }}>
      {/* Ari sidebar */}
      <div style={{ width:240, background:C.surface, borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column", padding:"20px 16px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
            background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18 }}>✦</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:SERIF }}>Ari</div>
            <div style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>Business Unit Leader</div>
          </div>
        </div>

        <div style={{ fontSize:11, color:C.text3, fontFamily:FONT, lineHeight:1.6, marginBottom:20 }}>
          Ari has live access to your deals, contacts, tasks, and agent roster. Ask anything about your brokerage.
        </div>

        <div style={{ background:C.surface2, borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.text3, fontFamily:FONT,
            textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Try asking</div>
          {[
            "What's my pipeline look like?",
            "Which deals need attention?",
            "Summarize this week's activity",
            "How many agents are active?",
            "Draft a follow-up email for a buyer",
          ].map(q=>(
            <button key={q} onClick={()=>setInput(q)} style={{
              display:"block", width:"100%", textAlign:"left", padding:"6px 0",
              background:"none", border:"none", borderBottom:`1px solid ${C.border}`,
              color:C.text2, fontSize:11, fontFamily:FONT, cursor:"pointer",
              transition:"color 0.1s" }}
              onMouseEnter={e=>e.currentTarget.style.color=C.gold}
              onMouseLeave={e=>e.currentTarget.style.color=C.text2}>
              {q}
            </button>
          ))}
        </div>

        <div style={{ marginTop:"auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <div style={{ width:7, height:7, borderRadius:"50%",
              background:ariStatus==="thinking"?C.amber:C.green,
              animation:ariStatus==="thinking"?"pulse 1s infinite":"none" }} />
            <span style={{ fontSize:11, color:C.text3, fontFamily:FONT }}>
              {ariStatus==="thinking"?"Thinking…":"Ready"}
            </span>
          </div>
          {messages.length>0&&(
            <button onClick={clearChat} style={{ background:"none", border:`1px solid ${C.border}`,
              borderRadius:6, color:C.text3, fontSize:11, fontFamily:FONT, cursor:"pointer",
              padding:"6px 12px", width:"100%", transition:"color 0.1s" }}
              onMouseEnter={e=>e.currentTarget.style.color=C.red}
              onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
              Clear chat
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px",
          display:"flex", flexDirection:"column", gap:16 }}>
          {messages.length===0 && (
            <div style={{ flex:1, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:12, opacity:0.5 }}>
              <div style={{ fontSize:40 }}>✦</div>
              <div style={{ fontSize:14, color:C.text3, fontFamily:FONT, textAlign:"center" }}>
                Ask Ari anything about your brokerage
              </div>
            </div>
          )}
          {messages.map((m,i)=>(
            <div key={i} style={{ display:"flex", gap:12,
              flexDirection:m.role==="user"?"row-reverse":"row",
              alignItems:"flex-start" }}>
              {m.role==="assistant" ? (
                <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                  background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14 }}>✦</div>
              ) : (
                <Avatar name={user?.full_name} email={user?.email} size={32} />
              )}
              <div style={{ maxWidth:"72%", minWidth:0 }}>
                <div style={{
                  padding:"12px 16px", borderRadius:12,
                  background: m.role==="user" ? C.goldDim : C.surface,
                  border: m.role==="user" ? `1px solid ${C.goldBorder}` : `1px solid ${C.border}`,
                  color: C.text, fontSize:13, fontFamily:FONT, lineHeight:1.65,
                  whiteSpace:"pre-wrap", wordBreak:"break-word",
                }}>
                  {m.content}
                </div>
                <div style={{ fontSize:10, color:C.text3, fontFamily:FONT,
                  marginTop:4, textAlign:m.role==="user"?"right":"left" }}>
                  {fmtTime(m.ts)}
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14 }}>✦</div>
              <div style={{ padding:"12px 16px", borderRadius:12,
                background:C.surface, border:`1px solid ${C.border}`,
                display:"flex", gap:5, alignItems:"center" }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:6, height:6, borderRadius:"50%",
                    background:C.gold, opacity:0.6,
                    animation:`bounce 1s ${i*0.15}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`,
          background:C.surface }}>
          <div style={{ display:"flex", gap:10 }}>
            <textarea value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
              placeholder="Ask Ari… (Enter to send, Shift+Enter for new line)"
              rows={2}
              style={{ flex:1, padding:"11px 14px", background:C.surface2,
                border:`1.5px solid ${C.border2}`, borderRadius:10, color:C.text,
                fontSize:13, fontFamily:FONT, outline:"none", resize:"none",
                lineHeight:1.5, transition:"border-color 0.15s" }}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.border2} />
            <button onClick={sendMessage} disabled={sending||!input.trim()} style={{
              padding:"0 20px", borderRadius:10, border:"none",
              background:sending||!input.trim()
                ? C.surface3
                :`linear-gradient(135deg,${C.gold},${C.goldLight})`,
              color:sending||!input.trim()?C.text3:"#0a0a0a",
              fontSize:13, fontWeight:700, fontFamily:FONT,
              cursor:sending||!input.trim()?"not-allowed":"pointer",
              flexShrink:0 }}>
              {sending?"…":"Send"}
            </button>
          </div>
        </div>
      </div>

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

      // 4. Create auth user + send welcome/reset email
      const SUPA_URL   = "https://rtgfnwktybkorqvlirtd.supabase.co";
      const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Z2Zud2t0eWJrb3JxdmxpcnRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQyMDU0NiwiZXhwIjoyMDkzOTk2NTQ2fQ.bmCIfRj1Ga3qndR7Va2ZuBPrOTy9BOCiRRfmESK9-EE";

      // Try create auth user, ignore if already exists
      await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email:         app.email,
          password:      "TempROGA2026!",
          email_confirm: true,
          user_metadata: { full_name: app.full_name },
        }),
      });

      // Send password reset / welcome email
      await supabase.auth.resetPasswordForEmail(app.email, {
        redirectTo: "https://presidentsuarez.github.io/brokerage",
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


function FinancialsView({ user }) {
  const [tab, setTab]         = useState("packages");
  const [agents, setAgents]   = useState([]);
  const [packages, setPkgs]   = useState([]);
  const [financials, setFins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const isMobile              = useIsMobile();

  const loadAll = async () => {
    setLoading(true);
    const [a, p, f] = await Promise.all([
      supabase.from("contacts").select("id,full_name,email,phone,contact_type")
        .eq("org_id", ORG_ID).eq("contact_type", "Agent").order("full_name"),
      supabase.from("agent_fee_packages").select("*")
        .eq("org_id", ORG_ID).eq("is_active", true),
      supabase.from("deal_financials").select("*, deals(address,city,state,status), contacts(full_name)")
        .eq("org_id", ORG_ID).order("created_at", {ascending: false}),
    ]);
    setAgents(a.data || []);
    setPkgs(p.data || []);
    setFins(f.data || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const pkgForAgent = (id) => packages.find(p => p.contact_id === id);

  const TABS = [
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
    <div style={{ padding:"16px" , maxWidth:600 }}>
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
    supabase.from("user_profiles").select("*").eq("email",email).maybeSingle()
      .then(async ({data})=>{
        if(data){
          // Team user — main app
          setUserProfile(data);
          const hrs = (Date.now()-new Date(data.created_at))/3600000;
          if(hrs<72) setTempBanner(true);
        } else {
          // Check agent portal access
          const { data:portal } = await supabase.from("agent_portal_access")
            .select("*, contacts(*)")
            .eq("portal_email",email).eq("is_active",true).maybeSingle();
          if(portal?.contacts) {
            setAgentPortalContact(portal.contacts);
          }
        }
      });
  },[session]);

  const loadData = useCallback(async()=>{
    if(!session) return;
    const [d,c,t] = await Promise.all([
      supabase.from("deals").select("*").eq("org_id",ORG_ID).order("created_at",{ascending:false}),
      supabase.from("contacts").select("*").eq("org_id",ORG_ID).order("contact_type").order("full_name"),
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
    robots:  ["Ari", "Business Unit Leader · ROGA"],
    calendar:   ["Calendar",   "Realty One Group Advantage"],
    applications:["Applications", "Agent Onboarding Queue"],
    financials:  ["Financials",   "Agent Packages & Deal P&L"],
  };
  const [title,subtitle] = TITLES[view]||["Prism",""];
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
        <TopBar title={title} subtitle={subtitle}
          onToggleSidebar={()=>isMobile ? setMobileMenu(o=>!o) : setSC(c=>!c)} />
        {showTempBanner&&<TempPasswordBanner onAction={()=>{ setTempBanner(false); setAuthScreen("setpassword"); }} />}
        <main style={{ flex:1, overflowY:"auto" }}>
          {view==="dashboard"&&<DashboardView user={cu} deals={deals} contacts={contacts} tasks={tasks} />}
          {view==="deals"    &&<DealsView     user={cu} deals={deals}    onRefresh={loadData} />}
          {view==="contacts" &&<ContactsView  user={cu} contacts={contacts} onRefresh={loadData} />}
          {view==="tasks"    &&<TasksView     user={cu} tasks={tasks}    onRefresh={loadData} />}
          {view==="settings" &&<SettingsView  user={cu} onProfileSaved={onProfileSaved} />}
          {view==="notepad"  &&<NotesView     user={cu} />}
          {view==="robots"   &&<RobotsView    user={cu} deals={deals} contacts={contacts} tasks={tasks} />}
          {view==="calendar"   &&<CalendarView    user={cu} />}
          {view==="applications"&&<ApplicationsView user={cu} />}
          {view==="financials"  &&<FinancialsView   user={cu} />}
        </main>
      </div>
      {isMobile && <BottomNavBar activeView={view} onNav={setView} user={cu} />}
    </div>
  );
}