import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  SUPER_ADMIN:        { label: "Super Admin",       color: "#a78bfa", icon: "⚡" },
  SAFETY_ADMIN:       { label: "Safety Admin",      color: "#f97316", icon: "🛡" },
  ADMIN_EMPRESA:      { label: "Admin Empresa",     color: "#f59e0b", icon: "🏢" },
  GERENTE_OPERACOES:  { label: "Gerente Operações", color: "#38bdf8", icon: "📊" },
  LIDER_EQUIPE:       { label: "Líder de Equipe",   color: "#22c55e", icon: "👷" },
  RIGGER:             { label: "Rigger",            color: "#94a3b8", icon: "🪝" },
  OPERADOR:           { label: "Operador",          color: "#94a3b8", icon: "🔧" },
  OPERADOR_GUINDASTE: { label: "Op. Guindaste",     color: "#94a3b8", icon: "🏗" },
};

function navItems(role) {
  const all = [];

  const isSuper  = role === "SUPER_ADMIN";
  const isAdmin  = ["ADMIN_EMPRESA"].includes(role);
  const isLeader = ["LIDER_EQUIPE", "GERENTE_OPERACOES", "SAFETY_ADMIN"].includes(role);
  const isOp     = ["RIGGER", "OPERADOR", "OPERADOR_GUINDASTE"].includes(role);
  const isManagement = isAdmin || isLeader;

  if (isSuper) {
    all.push({ group: "SaaS", items: [
      { path: "/app/dashboard",    icon: "⚡", label: "Painel SaaS" },
      { path: "/admin",            icon: "🏢", label: "Empresas" },
    ]});
  }

  if (isManagement || isSuper) {
    all.push({ group: "Gestão", items: [
      { path: "/app/dashboard",         icon: "📊", label: "Dashboard" },
      { path: "/app/central-aprovacao", icon: "✅", label: "Aprovações" },
      { path: "/app/alertas",           icon: "🔔", label: "Alertas" },
      ...(isAdmin || isSuper ? [{ path: "/app/equipes", icon: "👥", label: "Equipe" }] : []),
    ]});
  }

  all.push({ group: "Operacional", items: [
    { path: "/app/operacoes",  icon: "📋", label: "Planejamento" },
    { path: "/app/acessorios", icon: "🔗", label: "Inventário" },
    ...(isOp ? [{ path: "/app/central-aprovacao", icon: "🔔", label: "Minhas Solicitações" }] : []),
  ]});

  all.push({ group: "Ferramentas", items: [
    { path: "/",            icon: "🧮", label: "Calculadoras" },
    { path: "/app/tabelas", icon: "📑", label: "Tabelas Técnicas" },
  ]});

  return all;
}

function NavItem({ item, active, onClick }) {
  return (
    <button
      onClick={() => onClick(item.path)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 16px",
        background: active ? "#1e3a5f" : "transparent",
        border: active ? "1px solid #2563eb44" : "1px solid transparent",
        borderRadius: 8,
        color: active ? "#93c5fd" : "#94a3b8",
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = "#1e293b";
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role;
  const roleCfg = ROLE_LABELS[role] ?? { label: role ?? "Usuário", color: "#64748b", icon: "👤" };
  const groups = navItems(role);

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const sidebarContent = (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      padding: "0 8px 16px",
    }}>
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "20px 8px 16px",
        borderBottom: "1px solid #1e293b",
        marginBottom: 8,
      }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: 8,
          overflow: "hidden",
          background: "#1e293b",
          flexShrink: 0,
        }}>
          <img src="/logo.jpeg" alt="RiggingCheck" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div>
          <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>RiggingCheck</div>
          <div style={{ color: "#475569", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Industrial SaaS</div>
        </div>
      </div>

      {/* Nav groups */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {groups.map(group => (
          <div key={group.group} style={{ marginBottom: 4 }}>
            <div style={{
              color: "#334155",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              padding: "10px 16px 4px",
            }}>
              {group.group}
            </div>
            {group.items.map(item => (
              <NavItem
                key={item.path + item.label}
                item={item}
                active={location.pathname === item.path ||
                        (item.path !== "/" && location.pathname.startsWith(item.path))}
                onClick={go}
              />
            ))}
          </div>
        ))}
      </div>

      {/* User section */}
      <div style={{
        borderTop: "1px solid #1e293b",
        paddingTop: 12,
        marginTop: 8,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          background: "#0f172a",
          borderRadius: 8,
          marginBottom: 8,
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: "50%",
            background: roleCfg.color + "22",
            border: `1px solid ${roleCfg.color}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}>
            {roleCfg.icon}
          </div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.userName ?? "Usuário"}
            </div>
            <div style={{ color: roleCfg.color, fontSize: 11, fontWeight: 600 }}>
              {roleCfg.label}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            onClick={() => go("/privacidade")}
            style={{
              background: "transparent", border: "1px solid transparent",
              color: "#475569", borderRadius: 6, padding: "6px 12px",
              cursor: "pointer", fontSize: 12, textAlign: "left",
            }}
          >
            🔒 Privacidade
          </button>
          <button
            onClick={logout}
            style={{
              background: "transparent", border: "1px solid #ef444433",
              color: "#ef4444", borderRadius: 6, padding: "7px 12px",
              cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left",
            }}
          >
            ← Sair
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{
        position: "fixed",
        top: 0, left: 0,
        width: 220,
        height: "100vh",
        background: "#0a0f1e",
        borderRight: "1px solid #1e293b",
        zIndex: 100,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
        className="rc-sidebar-desktop"
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "#000a" }}
            onClick={onClose}
          />
          <aside style={{
            position: "absolute",
            top: 0, left: 0,
            width: 260,
            height: "100%",
            background: "#0a0f1e",
            borderRight: "1px solid #1e293b",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar spacer CSS */}
      <style>{`
        .rc-sidebar-desktop { display: flex !important; }
        .rc-main-with-sidebar { margin-left: 220px; }
        @media (max-width: 768px) {
          .rc-sidebar-desktop { display: none !important; }
          .rc-main-with-sidebar { margin-left: 0 !important; }
        }
      `}</style>
    </>
  );
}
