import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ───────────────────────────────────────────────
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ─── Constants ──────────────────────────────────────────────

const APP_NAME = "Prism";
const ORG_NAME = "Realty One Group Advantage";

// ─── Design tokens (mirrors CSS vars for inline styles) ─────
const C = {
  gold:        "#D4AF37",
  goldLight:   "#E8C84A",
  goldDim:     "rgba(212,175,55,0.15)",
  goldBorder:  "rgba(212,175,55,0.30)",
  bg:          "#0a0a0a",
  surface:     "#111111",
  surface2:    "#1a1a1a",
  surface3:    "#222222",
  border:      "rgba(255,255,255,0.08)",
  border2:     "rgba(255,255,255,0.12)",
  text:        "#f1f5f9",
  text2:       "#94a3b8",
  text3:       "#64748b",
  green:       "#22c55e",
  red:         "#ef4444",
  blue:        "#3b82f6",
  amber:       "#f59e0b",
  purple:      "#a855f7",
};

const FONT = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";
const MONO = "'DM Mono', monospace";

// ─── Deal status config ──────────────────────────────────────
const STATUS_CONFIG = {
  "New":            { color: C.gold,    bg: C.goldDim },
  "Active":         { color: C.blue,    bg: "rgba(59,130,246,0.10)" },
  "Under Contract": { color: C.amber,   bg: "rgba(245,158,11,0.10)" },
  "Closed":         { color: C.green,   bg: "rgba(34,197,94,0.10)" },
  "Dead":           { color: C.red,     bg: "rgba(239,68,68,0.10)" },
  "On Hold":        { color: C.text3,   bg: "rgba(100,116,135,0.10)" },
};

// ─── Nav items ───────────────────────────────────────────────
const NAV = [
  { id: "dashboard",  label: "Dashboard",  icon: "⬡" },
  { id: "deals",      label: "Deals",      icon: "◈" },
  { id: "contacts",   label: "Contacts",   icon: "◎" },
  { id: "tasks",      label: "Tasks",      icon: "◻" },
  { id: "settings",   label: "Settings",   icon: "⚙" },
];

// ════════════════════════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════════════════════════

// ─── Loading Spinner ─────────────────────────────────────────
function LoadingScreen({ message = "Loading…" }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      {/* Prism logo mark */}
      <div style={{ position: "relative", width: 48, height: 48 }}>
        <div style={{
          width: 48, height: 48,
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
          clipPath: "polygon(50% 0%, 100% 75%, 50% 100%, 0% 75%)",
          animation: "prismPulse 1.8s ease-in-out infinite",
        }} />
      </div>
      <p style={{ color: C.text2, fontSize: 13, fontFamily: FONT, margin: 0 }}>{message}</p>
      <style>{`
        @keyframes prismPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", background: C.surface2,
    border: `1.5px solid ${C.border2}`, borderRadius: 8, color: C.text,
    fontSize: 14, fontFamily: FONT, outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
            clipPath: "polygon(50% 0%, 100% 75%, 50% 100%, 0% 75%)",
          }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: SERIF, color: C.text, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{APP_NAME}</h1>
          <p style={{ fontSize: 13, color: C.text2, fontFamily: FONT, margin: 0 }}>{ORG_NAME}</p>
        </div>

        {/* Card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: SERIF, margin: "0 0 24px", letterSpacing: "-0.01em" }}>Sign in</h2>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email</label>
              <input
                style={inputStyle}
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Password</label>
              <input
                style={inputStyle}
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2}
              />
            </div>
            {error && <p style={{ fontSize: 12, color: C.red, fontFamily: FONT, margin: 0 }}>{error}</p>}
            <button
              type="submit" disabled={loading}
              style={{
                padding: "12px", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer",
                background: loading ? C.surface3 : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                color: loading ? C.text3 : "#0a0a0a", fontSize: 14, fontWeight: 700, fontFamily: FONT,
                transition: "opacity 0.15s",
              }}
            >{loading ? "Signing in…" : "Sign in"}</button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: C.text3, fontFamily: FONT, marginTop: 20 }}>
          Prism · Realty One Group Advantage
        </p>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ activeView, onNav, user, onSignOut, collapsed, onToggle }) {
  const isAdmin = user?.role === "admin" || user?.role === "owner";

  return (
    <div style={{
      width: collapsed ? 56 : 220, minWidth: collapsed ? 56 : 220,
      background: C.surface, borderRight: `1px solid ${C.border}`,
      height: "100vh", display: "flex", flexDirection: "column",
      transition: "width 0.2s, min-width 0.2s", overflow: "hidden",
      position: "fixed", top: 0, left: 0, zIndex: 100,
    }}>
      {/* Header */}
      <div style={{ padding: collapsed ? "18px 12px" : "18px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}`, minHeight: 56 }}>
        <div style={{
          width: 28, height: 28, flexShrink: 0,
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
          clipPath: "polygon(50% 0%, 100% 75%, 50% 100%, 0% 75%)",
        }} />
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: SERIF, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{APP_NAME}</div>
            <div style={{ fontSize: 10, color: C.text3, fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>ROG Advantage</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.filter(n => n.id !== "settings" || isAdmin).map(item => {
          const active = activeView === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 8, border: "none", cursor: "pointer", width: "100%",
                background: active ? C.goldDim : "transparent",
                color: active ? C.gold : C.text2,
                fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: FONT,
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.surface2; e.currentTarget.style.color = C.text; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.text2; } }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
              {active && !collapsed && <div style={{ marginLeft: "auto", width: 3, height: 16, borderRadius: 2, background: C.gold }} />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: collapsed ? "12px 8px" : "12px 16px", borderTop: `1px solid ${C.border}` }}>
        {!collapsed && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.full_name || user?.email}</div>
            <div style={{ fontSize: 10, color: C.text3, fontFamily: FONT, textTransform: "capitalize" }}>{user?.role}</div>
          </div>
        )}
        <button onClick={onSignOut}
          style={{
            width: "100%", padding: collapsed ? "8px 0" : "8px 10px",
            background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.text3, fontSize: 11, fontFamily: FONT, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 6,
            transition: "color 0.12s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.red}
          onMouseLeave={e => e.currentTarget.style.color = C.text3}
        >
          <span>⎋</span>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}

// ─── Top bar ─────────────────────────────────────────────────
function TopBar({ title, subtitle, onToggleSidebar, sidebarCollapsed, actions }) {
  return (
    <div style={{
      height: 56, background: C.surface, borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", padding: "0 24px", gap: 16,
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <button onClick={onToggleSidebar}
        style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 16, padding: "4px 6px", borderRadius: 6, lineHeight: 1 }}
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >☰</button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: SERIF, letterSpacing: "-0.01em" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: C.text2, fontFamily: FONT }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

// ─── Gold button ─────────────────────────────────────────────
function GoldButton({ children, onClick, small, outline, disabled }) {
  const [hover, setHover] = useState(false);
  const base = {
    padding: small ? "7px 14px" : "10px 20px",
    borderRadius: 8, border: outline ? `1.5px solid ${C.goldBorder}` : "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: small ? 12 : 13, fontWeight: 600, fontFamily: FONT,
    display: "inline-flex", alignItems: "center", gap: 6, transition: "opacity 0.12s",
    opacity: disabled ? 0.5 : hover ? 0.85 : 1,
  };
  const filled = { ...base, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#0a0a0a" };
  const outlineStyle = { ...base, background: hover ? C.goldDim : "transparent", color: C.gold };
  return (
    <button style={outline ? outlineStyle : filled} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {children}
    </button>
  );
}

// ─── Stat card ───────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "20px 22px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      {icon && <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || C.gold, fontFamily: SERIF, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT }}>{sub}</div>}
    </div>
  );
}

// ─── Status badge ────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: C.text2, bg: C.surface2 };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, fontFamily: FONT, padding: "3px 9px",
      borderRadius: 20, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap",
    }}>{status}</span>
  );
}

// ════════════════════════════════════════════════════════════
// VIEWS
// ════════════════════════════════════════════════════════════

// ─── Dashboard ───────────────────────────────────────────────
function DashboardView({ user, deals, contacts, tasks }) {
  const openDeals    = deals.filter(d => !["Closed","Dead"].includes(d.status));
  const closedDeals  = deals.filter(d => d.status === "Closed");
  const myTasks      = tasks.filter(t => t.assigned_to === user?.email && t.status !== "done");
  const totalVolume  = closedDeals.reduce((s, d) => s + (d.price || 0), 0);

  const fmt = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : `$${n}`;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: SERIF, color: C.text, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Welcome back, {user?.full_name?.split(" ")[0] || "there"}.
        </h2>
        <p style={{ fontSize: 13, color: C.text2, fontFamily: FONT, margin: 0 }}>
          {ORG_NAME} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <StatCard label="Active Deals"   value={openDeals.length}   icon="◈" />
        <StatCard label="Contacts"       value={contacts.length}    icon="◎" />
        <StatCard label="Closed Deals"   value={closedDeals.length} icon="✓" accent={C.green} />
        <StatCard label="Volume Closed"  value={totalVolume > 0 ? fmt(totalVolume) : "—"} icon="$" accent={C.gold} />
        <StatCard label="Open Tasks"     value={myTasks.length}     icon="◻" accent={myTasks.length > 3 ? C.amber : C.text2} />
      </div>

      {/* Recent deals */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase" }}>Recent Deals</span>
        </div>
        {openDeals.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: C.text3, fontSize: 13, fontFamily: FONT }}>No active deals yet</div>
        ) : openDeals.slice(0, 5).map(d => (
          <div key={d.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {d.address || "Untitled"}
              </div>
              <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT }}>{d.city}{d.state ? `, ${d.state}` : ""}</div>
            </div>
            <StatusBadge status={d.status} />
            {d.price && <div style={{ fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: MONO }}>{fmt(d.price)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Deals View ──────────────────────────────────────────────
function DealsView({ user, deals, onRefresh }) {
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ address: "", city: "", state: "FL", zip: "", price: "", status: "New", deal_type: "Listing", property_type: "", bedrooms: "", bathrooms: "", sqft: "", mls_number: "", notes: "" });

  const statuses = ["all", ...Object.keys(STATUS_CONFIG)];
  const fmt = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : `$${n}`;

  const filtered = deals.filter(d => {
    if (filter !== "all" && d.status !== filter) return false;
    if (search && !`${d.address} ${d.city} ${d.mls_number}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = async () => {
    setSaving(true);
    const { error } = await supabase.from("deals").insert({
      ...form,
      price: form.price ? parseFloat(form.price.replace(/[^0-9.]/g, "")) : null,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
      sqft: form.sqft ? parseInt(form.sqft) : null,
      org_id: "8cc1004c-c4da-4aab-b79a-f8b507983303",
      created_by: user?.email,
    });
    setSaving(false);
    if (!error) { setShowAdd(false); setForm({ address: "", city: "", state: "FL", zip: "", price: "", status: "New", deal_type: "Listing", property_type: "", bedrooms: "", bathrooms: "", sqft: "", mls_number: "", notes: "" }); onRefresh(); }
  };

  const inputStyle = { width: "100%", padding: "9px 11px", background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, fontFamily: FONT, outline: "none" };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          style={{ ...inputStyle, maxWidth: 260 }}
          placeholder="Search address, MLS#…"
          value={search} onChange={e => setSearch(e.target.value)}
          onFocus={e => e.target.style.borderColor = C.gold}
          onBlur={e => e.target.style.borderColor = C.border2}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{
                padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${filter === s ? C.goldBorder : C.border}`,
                background: filter === s ? C.goldDim : "transparent",
                color: filter === s ? C.gold : C.text2, fontSize: 12, fontFamily: FONT, cursor: "pointer",
              }}
            >{s === "all" ? "All" : s}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <GoldButton onClick={() => setShowAdd(true)} small>+ Add Deal</GoldButton>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px 20px", borderBottom: `1px solid ${C.border}` }}>
          {["Address", "Type", "Status", "Price", "MLS #"].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.text3, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: C.text3, fontSize: 13, fontFamily: FONT }}>
            {deals.length === 0 ? "No deals yet — add your first one" : "No results match your filter"}
          </div>
        ) : filtered.map(d => (
          <div key={d.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = C.surface2}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT }}>{d.address || "—"}</div>
              <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT }}>{[d.city, d.state].filter(Boolean).join(", ")}</div>
            </div>
            <span style={{ fontSize: 12, color: C.text2, fontFamily: FONT }}>{d.deal_type || "—"}</span>
            <StatusBadge status={d.status} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: MONO }}>{d.price ? fmt(d.price) : "—"}</span>
            <span style={{ fontSize: 12, color: C.text3, fontFamily: MONO }}>{d.mls_number || "—"}</span>
          </div>
        ))}
      </div>

      {/* Add Deal Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: SERIF, margin: 0 }}>New Deal</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: C.text2, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[["address","Address","123 Main St"],["city","City","Tampa"],["zip","ZIP","33601"],["mls_number","MLS #","T1234567"]].map(([k, label, ph]) => (
                <div key={k}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>
                  <input style={inputStyle} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border2} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>State</label>
                  <input style={inputStyle} value={form.state} onChange={e => set("state", e.target.value)} maxLength={2} placeholder="FL"
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border2} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Price</label>
                  <input style={inputStyle} value={form.price} onChange={e => set("price", e.target.value)} placeholder="$450,000"
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border2} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Status</label>
                  <select style={{ ...inputStyle }} value={form.status} onChange={e => set("status", e.target.value)}>
                    {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Type</label>
                  <select style={{ ...inputStyle }} value={form.deal_type} onChange={e => set("deal_type", e.target.value)}>
                    {["Listing","Buyer","Referral","Rental"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any notes…"
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <GoldButton onClick={handleAdd} disabled={saving}>{saving ? "Saving…" : "Add Deal"}</GoldButton>
                <GoldButton onClick={() => setShowAdd(false)} outline>Cancel</GoldButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contacts View ───────────────────────────────────────────
function ContactsView({ user, contacts, onRefresh }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", contact_type: "Client", status: "Active", notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = contacts.filter(c =>
    !search || `${c.full_name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    setSaving(true);
    const { error } = await supabase.from("contacts").insert({
      ...form, org_id: "8cc1004c-c4da-4aab-b79a-f8b507983303", created_by: user?.email,
    });
    setSaving(false);
    if (!error) { setShowAdd(false); setForm({ full_name: "", email: "", phone: "", contact_type: "Client", status: "Active", notes: "" }); onRefresh(); }
  };

  const inputStyle = { width: "100%", padding: "9px 11px", background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, fontFamily: FONT, outline: "none" };
  const TYPES = ["Client", "Agent", "Lender", "Referral", "Vendor"];

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)}
          onFocus={e => e.target.style.borderColor = C.gold}
          onBlur={e => e.target.style.borderColor = C.border2} />
        <div style={{ marginLeft: "auto" }}>
          <GoldButton onClick={() => setShowAdd(true)} small>+ Add Contact</GoldButton>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", padding: "10px 20px", borderBottom: `1px solid ${C.border}` }}>
          {["Name", "Type", "Email", "Phone"].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.text3, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: C.text3, fontSize: 13, fontFamily: FONT }}>
            {contacts.length === 0 ? "No contacts yet" : "No results"}
          </div>
        ) : filtered.map(c => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", padding: "13px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = C.surface2}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT }}>{c.full_name}</div>
              {c.notes && <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{c.notes}</div>}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: FONT, background: C.surface2, borderRadius: 5, padding: "3px 8px", width: "fit-content" }}>{c.contact_type}</span>
            <span style={{ fontSize: 12, color: C.text2, fontFamily: FONT }}>{c.email || "—"}</span>
            <span style={{ fontSize: 12, color: C.text2, fontFamily: MONO }}>{c.phone || "—"}</span>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 460 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: SERIF, margin: 0 }}>New Contact</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: C.text2, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[["full_name","Name","Jane Smith"],["email","Email","jane@example.com"],["phone","Phone","(813) 555-0100"]].map(([k,label,ph]) => (
                <div key={k}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>
                  <input style={inputStyle} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border2} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Type</label>
                <select style={inputStyle} value={form.contact_type} onChange={e => set("contact_type", e.target.value)}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes"
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <GoldButton onClick={handleAdd} disabled={saving}>{saving ? "Saving…" : "Add Contact"}</GoldButton>
                <GoldButton onClick={() => setShowAdd(false)} outline>Cancel</GoldButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tasks View ──────────────────────────────────────────────
function TasksView({ user, tasks, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "", assigned_to: user?.email || "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const open    = tasks.filter(t => t.status !== "done");
  const done    = tasks.filter(t => t.status === "done");

  const handleAdd = async () => {
    setSaving(true);
    await supabase.from("tasks").insert({ ...form, org_id: "8cc1004c-c4da-4aab-b79a-f8b507983303", status: "open", created_by: user?.email });
    setSaving(false);
    setShowAdd(false);
    setForm({ title: "", description: "", priority: "medium", due_date: "", assigned_to: user?.email || "" });
    onRefresh();
  };

  const toggle = async (t) => {
    await supabase.from("tasks").update({ status: t.status === "done" ? "open" : "done" }).eq("id", t.id);
    onRefresh();
  };

  const PRIORITY_COLOR = { high: C.red, medium: C.amber, low: C.text3 };
  const inputStyle = { width: "100%", padding: "9px 11px", background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, fontFamily: FONT, outline: "none" };

  const TaskRow = ({ task }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}
      onMouseEnter={e => e.currentTarget.style.background = C.surface2}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <button onClick={() => toggle(task)} style={{
        width: 18, height: 18, borderRadius: 4, border: `2px solid ${task.status === "done" ? C.gold : C.border2}`,
        background: task.status === "done" ? C.gold : "transparent", flexShrink: 0, cursor: "pointer", padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {task.status === "done" && <span style={{ fontSize: 10, color: "#0a0a0a", fontWeight: 700 }}>✓</span>}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: task.status === "done" ? C.text3 : C.text, fontFamily: FONT, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title}</div>
        {task.description && <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT }}>{task.description}</div>}
      </div>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_COLOR[task.priority] || C.text3, flexShrink: 0 }} title={task.priority} />
      {task.due_date && <span style={{ fontSize: 11, color: C.text3, fontFamily: MONO }}>{task.due_date}</span>}
    </div>
  );

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <GoldButton onClick={() => setShowAdd(true)} small>+ Add Task</GoldButton>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase" }}>Open · {open.length}</span>
        </div>
        {open.length === 0
          ? <div style={{ padding: "32px 20px", textAlign: "center", color: C.text3, fontSize: 13, fontFamily: FONT }}>No open tasks</div>
          : open.map(t => <TaskRow key={t.id} task={t} />)
        }
      </div>

      {done.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text3, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase" }}>Done · {done.length}</span>
          </div>
          {done.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)}
        </div>
      )}

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: SERIF, margin: 0 }}>New Task</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: C.text2, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Title</label>
                <input style={inputStyle} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Schedule showing"
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Priority</label>
                  <select style={inputStyle} value={form.priority} onChange={e => set("priority", e.target.value)}>
                    {["high","medium","low"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Due Date</label>
                  <input style={inputStyle} type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border2} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional details"
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <GoldButton onClick={handleAdd} disabled={saving || !form.title}>{saving ? "Saving…" : "Add Task"}</GoldButton>
                <GoldButton onClick={() => setShowAdd(false)} outline>Cancel</GoldButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings View ───────────────────────────────────────────
function SettingsView({ user }) {
  return (
    <div style={{ padding: "24px 28px", maxWidth: 600 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 16px" }}>Organization</h3>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: SERIF }}>{ORG_NAME}</div>
        <div style={{ fontSize: 12, color: C.text2, fontFamily: FONT, marginTop: 4 }}>Plan: Pro</div>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text2, fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 16px" }}>Your Account</h3>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FONT }}>{user?.full_name}</div>
        <div style={{ fontSize: 12, color: C.text2, fontFamily: FONT, marginTop: 2 }}>{user?.email}</div>
        <div style={{ fontSize: 11, color: C.gold, fontFamily: FONT, marginTop: 4, textTransform: "capitalize" }}>{user?.role}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession]         = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView]               = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [deals, setDeals]     = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks]     = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { setUserProfile(null); setDataLoaded(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load user profile ──
  useEffect(() => {
    if (!session?.user) return;
    supabase.from("user_profiles").select("*").eq("email", session.user.email).single()
      .then(({ data }) => { if (data) setUserProfile(data); });
  }, [session]);

  // ── Load data ──
  const loadData = useCallback(async () => {
    if (!session) return;
    const ORG = "8cc1004c-c4da-4aab-b79a-f8b507983303";
    const [d, c, t] = await Promise.all([
      supabase.from("deals").select("*").eq("org_id", ORG).order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").eq("org_id", ORG).order("full_name"),
      supabase.from("tasks").select("*").eq("org_id", ORG).order("created_at", { ascending: false }),
    ]);
    setDeals(d.data || []);
    setContacts(c.data || []);
    setTasks(t.data || []);
    setDataLoaded(true);
  }, [session]);

  useEffect(() => { if (session) loadData(); }, [session, loadData]);

  const handleSignOut = () => supabase.auth.signOut();

  // ── Render ──
  if (authLoading) return <LoadingScreen message="Starting Prism…" />;
  if (!session)    return <LoginScreen onLogin={() => {}} />;
  if (!dataLoaded) return <LoadingScreen message="Loading your workspace…" />;

  const VIEW_TITLES = {
    dashboard: ["Dashboard", `${ORG_NAME}`],
    deals:     ["Deals", `${deals.length} total`],
    contacts:  ["Contacts", `${contacts.length} total`],
    tasks:     ["Tasks", `${tasks.filter(t=>t.status!=="done").length} open`],
    settings:  ["Settings", "Account & org"],
  };
  const [title, subtitle] = VIEW_TITLES[view] || ["Prism", ""];
  const sidebarW = sidebarCollapsed ? 56 : 220;

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh" }}>
      <Sidebar
        activeView={view} onNav={setView}
        user={userProfile || { email: session.user.email, role: "member" }}
        onSignOut={handleSignOut}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />
      <div style={{ marginLeft: sidebarW, flex: 1, transition: "margin-left 0.2s", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          title={title} subtitle={subtitle}
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main style={{ flex: 1, overflowY: "auto" }}>
          {view === "dashboard" && <DashboardView user={userProfile} deals={deals} contacts={contacts} tasks={tasks} />}
          {view === "deals"     && <DealsView     user={userProfile} deals={deals}    onRefresh={loadData} />}
          {view === "contacts"  && <ContactsView  user={userProfile} contacts={contacts} onRefresh={loadData} />}
          {view === "tasks"     && <TasksView     user={userProfile} tasks={tasks}    onRefresh={loadData} />}
          {view === "settings"  && <SettingsView  user={userProfile} />}
        </main>
      </div>
    </div>
  );
}
