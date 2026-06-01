import { useState, useCallback, useEffect } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import CookieConsentModal from "./components/CookieConsentModal.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// ── Módulo de Planejamento — tabs extraídas ──────────────────────────────────────
import TabGuindasteCarga from "./modules/planning/tabs/TabGuindasteCarga.jsx";
import TabLingadaCarga   from "./modules/planning/tabs/TabLingadaCarga.jsx";
import TabChecklistCampo from "./modules/planning/tabs/TabChecklist.jsx";
import TabEquipamentos   from "./modules/planning/tabs/TabTabelas.jsx";
import TabPetrobras      from "./modules/planning/tabs/TabPetrobras.jsx";

// ── Telas extraídas ──────────────────────────────────────────────────────────────
import LoginScreen          from "./pages/auth/LoginScreen.jsx";
import ModalAlterarSenha    from "./components/ModalAlterarSenha.jsx";
import AdminDashboard       from "./pages/legacy/AdminDashboard.jsx";
import SuperAdminDashboard  from "./pages/legacy/SuperAdminDashboard.jsx";
import LiderEquipeDashboard from "./pages/legacy/LiderEquipeDashboard.jsx";
import GerenteDashboard     from "./pages/legacy/GerenteDashboard.jsx";

// ── Helpers compartilhados ───────────────────────────────────────────────────────
import { S, getToken, getUser, clearAuth, IS_SUPER, roleLabel } from "./shared/appShared.js";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

export default function App({ adminMode = false, tabInicial = "guindaste", embedded = false }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [authenticated, setAuthenticated] = useState(() => !!getToken());
  const view = adminMode ? "admin" : "app";
  const [aba, setAba]     = useState(tabInicial);
  const [planData, setPlanData] = useState(() => {
    try {
      const saved = localStorage.getItem("rc_plan_data");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("rc_plan_data", JSON.stringify(planData));
  }, [planData]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [aba]);

  const limparNovoPlano = () => {
    if (!window.confirm("Tem certeza que deseja apagar todos os dados e iniciar um novo plano?")) return;
    setPlanData({});
    localStorage.removeItem("rc_plan_data");
    setAba("guindaste");
  };
  const [showModalSenha, setShowModalSenha] = useState(false);
  const [petrobras, setPetrobras] = useState(false);
  const user          = getUser();
  const isSuperAdmin  = IS_SUPER(user?.role);
  const isAdminEmpresa = user?.role === "ADMIN_EMPRESA";
  const isLider       = user?.role === "LIDER_EQUIPE";
  const isGerente     = user?.role === "GERENTE_OPERACOES";

  const handleLogout = useCallback(() => { clearAuth(); setAuthenticated(false); }, []);

  useEffect(() => {
    const handler = () => setAuthenticated(false);
    window.addEventListener("rc_session_expired", handler);
    return () => window.removeEventListener("rc_session_expired", handler);
  }, []);

  // Painel admin — login exigido apenas aqui
  if (view === "admin" && !authenticated) {
    return (
      <LoginScreen
        onAuth={() => {
          const tok = getToken();
          const usr = getUser();
          setAuthenticated(true);
          if (tok && usr) authLogin(tok, usr);
          navigate("/app/dashboard", { replace: true });
        }}
      />
    );
  }
  if (view === "admin" && isSuperAdmin)   return <SuperAdminDashboard   onVoltar={() => navigate("/")} isMobile={isMobile} />;
  if (view === "admin" && isAdminEmpresa) return <AdminDashboard         onVoltar={() => navigate("/")} isMobile={isMobile} />;
  if (view === "admin" && isLider)        return <LiderEquipeDashboard   onVoltar={() => navigate("/")} isMobile={isMobile} />;
  if (view === "admin" && isGerente)      return <GerenteDashboard       onVoltar={() => navigate("/")} isMobile={isMobile} />;

  const ABAS = [
    { id: "guindaste",    label: isMobile ? "Guindaste"  : "Guindaste & Carga"  },
    { id: "lingada",      label: isMobile ? "Lingada"    : "Lingada & Carga"    },
    { id: "checklist",    label: isMobile ? "Checklist"  : "Checklist de Campo" },
    { id: "equipamentos", label: isMobile ? "📊 Tabelas" : "📊 Tabelas de Capacidade" },
    ...(petrobras ? [{ id: "petrobras", label: isMobile ? "⚙️ N-2869" : "⚙️ Módulo Petrobras" }] : []),
  ];

  const currentIndex = ABAS.findIndex(a => a.id === aba);
  const prevAba = currentIndex > 0 ? ABAS[currentIndex - 1] : null;
  const nextAba = currentIndex !== -1 && currentIndex < ABAS.length - 1 ? ABAS[currentIndex + 1] : null;

  return (
    <div style={embedded ? { color: "#e2e8f0", fontFamily: S.app.fontFamily } : S.app}>
      {!embedded && <CookieConsentModal />}
      {!embedded && showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
      <div style={embedded
        ? { padding: "0 0 8px", marginBottom: 12, borderBottom: "1px solid #1e293b" }
        : S.header(isMobile)
      }>
        {!embedded && <div style={S.headerTop(isMobile)}>
          <div style={S.logo}>
            <div style={S.logoIcon}><img src="/logo.jpeg" alt="RiggingCheck" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <div>
              <div style={S.logoText(isMobile)}>RiggingCheck</div>
              <div style={S.logoSub(isMobile)}>Planejamento de Içamento</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            {user && <div style={S.roleBadge(isMobile)}>{roleLabel(user.role)}</div>}
            {user && <div style={S.userBadge(isMobile)}>{user.userName}</div>}
            {isSuperAdmin   && <button style={{ ...S.logoutBtn(isMobile), borderColor: "#a78bfa44", color: "#a78bfa" }} onClick={() => navigate("/admin")}>{isMobile ? "⚙️" : "⚙️ Painel SaaS"}</button>}
            {isAdminEmpresa && <button style={{ ...S.logoutBtn(isMobile), borderColor: "#f59e0b44", color: "#f59e0b" }} onClick={() => navigate("/admin")}>{isMobile ? "🔑" : "🔑 Painel Admin"}</button>}
            {isLider        && <button style={{ ...S.logoutBtn(isMobile), borderColor: "#22c55e44", color: "#22c55e" }} onClick={() => navigate("/admin")}>{isMobile ? "📋" : "📋 Solicitações"}</button>}
            {isGerente      && <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => navigate("/admin")}>{isMobile ? "📊" : "📊 Painel Gerente"}</button>}
            <button
              onClick={() => { setPetrobras(p => !p); if (petrobras) setAba("guindaste"); }}
              style={{ ...S.logoutBtn(isMobile), borderColor: petrobras ? "#7c3aed44" : "#47556944", color: petrobras ? "#a78bfa" : "#64748b" }}
              title="Habilitar requisitos N-2869 para içamentos em ambiente Petrobras"
            >
              {petrobras ? "⚙️ Petrobras ON" : "⚙️ Petrobras?"}
            </button>
            {authenticated ? (
              <>
                <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => setShowModalSenha(true)}>{isMobile ? "🔑" : "Alterar Senha"}</button>
                <button style={{ ...S.logoutBtn(isMobile), borderColor: "#47556944", color: "#64748b" }} onClick={() => navigate("/privacidade")} title="Central de Privacidade LGPD">{isMobile ? "🔒" : "Privacidade"}</button>
                {(user?.subscriptionStatus === "PAST_DUE" || user?.subscriptionStatus === "CANCELED") && (
                  <button style={{ ...S.logoutBtn(isMobile), borderColor: "#ef444444", color: "#ef4444" }} onClick={() => navigate("/pricing")}>Renovar Assinatura</button>
                )}
                <button style={S.logoutBtn(isMobile)} onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <button style={{ ...S.logoutBtn(isMobile), borderColor: "#47556944", color: "#94a3b8" }} onClick={() => navigate("/admin")}>{isMobile ? "🔐" : "Acesso"}</button>
            )}
          </div>
        </div>}
        <div style={S.tabs(isMobile)}>
          {ABAS.map(a => (
            <button key={a.id} style={S.tab(aba === a.id, isMobile)} onClick={() => setAba(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ ...S.container, maxWidth: 960, paddingTop: embedded ? 0 : undefined }}>
        {aba === "guindaste" && <TabGuindasteCarga planData={planData} onSave={(k,v) => setPlanData(p=>({...p,[k]:v}))} />}
        {aba === "lingada"   && <TabLingadaCarga   planData={planData} onSave={(k,v) => setPlanData(p=>({...p,[k]:v}))} />}
        {aba === "checklist" && (
          <ProtectedRoute subscriptionStatus={user?.subscriptionStatus} onGoToPricing={() => navigate("/pricing")}>
            <TabChecklistCampo planData={planData} />
          </ProtectedRoute>
        )}
        {aba === "equipamentos" && <TabEquipamentos />}
        {aba === "petrobras"    && <TabPetrobras planData={planData} onSave={(k,v) => setPlanData(p=>({...p,[k]:v}))} />}

        {/* --- Wizard Navigation --- */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, padding: "24px 0", borderTop: "1px solid #334155", flexWrap: "wrap", gap: 16 }}>
          <div>
            {prevAba && (
              <button 
                onClick={() => setAba(prevAba.id)}
                style={{ background: "transparent", color: "#94a3b8", border: "1px solid #475569", borderRadius: 8, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                ← Anterior ({prevAba.label})
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button 
              onClick={limparNovoPlano}
              style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef444455", borderRadius: 8, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              🗑 Limpar Novo Plano
            </button>
            {nextAba && (
              <button 
                onClick={() => setAba(nextAba.id)}
                style={{ background: "#38bdf8", color: "#0f172a", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(56,189,248,0.2)" }}
              >
                Próximo ({nextAba.label}) →
              </button>
            )}
          </div>
        </div>

        {!embedded && (
          <div style={{ ...S.normaBox, textAlign: "center", marginTop: 32 }}>
            v2.1.0 — RiggingCheck &nbsp;·&nbsp; React + Java Spring Boot + PostgreSQL
            <br />
            <span style={{ color: "#475569" }}>NR-11 · ABNT NBR 13541 · ISO 4308-1 · Petrobrás N-2869</span>
          </div>
        )}
      </div>
    </div>
  );
}
