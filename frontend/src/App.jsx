import { useState, useCallback, useEffect } from "react";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

// ── AUTH HELPERS ────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("rc_token");
const getUser  = () => { try { return JSON.parse(localStorage.getItem("rc_user")); } catch { return null; } };
const saveAuth = (token, user) => {
  localStorage.setItem("rc_token", token);
  localStorage.setItem("rc_user", JSON.stringify(user));
};
const clearAuth = () => {
  localStorage.removeItem("rc_token");
  localStorage.removeItem("rc_user");
};

const authFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  // 401 = JWT expirado/inválido → desloga sem recarregar a página
  // 403 = acesso negado a recurso, não é falha de sessão
  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event("rc_session_expired"));
  }
  return res;
};

// ── CHECKLIST DATA (NR-11 / ABNT NBR 11900) ─────────────────────────────────────
const CHECKLIST = [
  {
    category: "Guindaste & Equipamento",
    items: [
      "Verificar capacidade de carga para o raio de operação atual",
      "Confirmar horizontalidade do guindaste (prumo)",
      "Inspecionar apoios (outriggers) — solo firme e nivelado",
      "Verificar funcionamento dos limitadores de carga e fim-de-curso",
      "Inspecionar cabos de aço quanto a corrosão, kinks e arames partidos",
    ],
  },
  {
    category: "Acessórios de Içamento",
    items: [
      "Inspecionar eslingas — cortes, desgaste, costuras comprometidas",
      "Verificar ganchos e linguetas de segurança (sem deformação)",
      "Checar grilhões: pino travado com arame de segurança",
      "Confirmar que WLL dos acessórios supera a carga",
      "Verificar ângulo das eslingas (máx. recomendado: 60° da horizontal)",
    ],
  },
  {
    category: "Carga & Amarração",
    items: [
      "Identificar o CG (centro de gravidade) da carga",
      "Confirmar ponto de amarração adequado e resistente",
      "Verificar estabilidade e fixação de partes soltas na carga",
      "Realizar teste de folga (levantar 30 cm antes da manobra final)",
    ],
  },
  {
    category: "Área & Pessoal",
    items: [
      "Sinalizar e isolar área de risco com cone/fita/barreira",
      "Confirmar ausência de pessoal sob a carga suspensa",
      "Verificar condições climáticas (vento < 30 km/h, boa visibilidade)",
      "Confirmar comunicação operador ↔ Rigger (rádio ou sinal de mão)",
      "Confirmar presença do Rigger responsável certificado (NR-11)",
    ],
  },
  {
    category: "Norma Petrobrás N-2869",
    items: [
      "Plano de Içamento elaborado e aprovado pela supervisão responsável",
      "Certificados de calibração e inspeção dos equipamentos vigentes",
      "APR (Análise Preliminar de Risco) preenchida e assinada por todos os envolvidos",
      "Zona de exclusão delimitada conforme plano de içamento aprovado",
      "Plano de comunicação estabelecido e testado (rádios verificados)",
      "Plano de contingência discutido com toda a equipe envolvida",
    ],
  },
];

// ── STYLES ───────────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e2e8f0",
    fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
    paddingBottom: 60,
  },
  // LOGIN
  loginWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)",
    padding: 16,
  },
  loginCard: (mobile) => ({
    background: "#0f0f1a",
    border: "1px solid #1e1e35",
    borderRadius: 16,
    padding: mobile ? "32px 20px" : "48px 40px",
    width: "100%",
    maxWidth: 420,
  }),
  loginLogo: { textAlign: "center", marginBottom: 36 },
  loginIcon: {
    width: 56, height: 56,
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    borderRadius: 12,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 28, marginBottom: 14,
    boxShadow: "0 0 30px rgba(245,158,11,0.3)",
  },
  loginTitle: {
    fontSize: 26, fontWeight: 700, lineHeight: 1.3,
    background: "linear-gradient(90deg, #f59e0b, #fb923c)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    paddingBottom: 4,
    marginBottom: 10,
  },
  loginSub: { fontSize: 11, color: "#475569", letterSpacing: "2px", textTransform: "uppercase" },
  loginTabs: { display: "flex", gap: 4, marginBottom: 28, background: "#070710", borderRadius: 8, padding: 4 },
  loginTab: (active) => ({
    flex: 1, padding: "8px 0", borderRadius: 6, border: "none",
    background: active ? "#1e1e35" : "transparent",
    color: active ? "#f59e0b" : "#475569",
    fontSize: 11, letterSpacing: "1px", textTransform: "uppercase",
    cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 700 : 400,
    transition: "all 0.2s",
  }),
  // HEADER
  header: (mobile) => ({
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1020 100%)",
    borderBottom: "1px solid #2d2d4a",
    padding: mobile ? "14px 16px 12px" : "24px 40px 20px",
    position: "sticky", top: 0, zIndex: 100,
  }),
  headerTop: (mobile) => ({
    display: "flex",
    alignItems: mobile ? "flex-start" : "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: mobile ? 8 : 0,
    marginBottom: 12,
  }),
  logo: { display: "flex", alignItems: "center", gap: 14 },
  logoIcon: {
    width: 42, height: 42,
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    borderRadius: 8, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 22,
    boxShadow: "0 0 20px rgba(245,158,11,0.3)",
    flexShrink: 0,
  },
  logoText: (mobile) => ({
    fontSize: mobile ? 18 : 22, fontWeight: 700, letterSpacing: "-0.5px",
    background: "linear-gradient(90deg, #f59e0b, #fb923c)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  }),
  logoSub: (mobile) => ({
    fontSize: 10, color: "#64748b", letterSpacing: "2px", textTransform: "uppercase",
    display: mobile ? "none" : "block",
  }),
  userInfo: (mobile) => ({
    display: "flex", alignItems: "center",
    gap: mobile ? 6 : 12,
    flexShrink: 0,
  }),
  userBadge: (mobile) => ({
    background: "rgba(245,158,11,0.1)", border: "1px solid #f59e0b44",
    borderRadius: 8, padding: mobile ? "5px 8px" : "6px 14px", fontSize: 11,
    color: "#f59e0b", letterSpacing: "1px",
    maxWidth: mobile ? 110 : "none",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    display: mobile ? "none" : "block",
  }),
  roleBadge: (mobile) => ({
    background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e44",
    borderRadius: 6, padding: mobile ? "4px 8px" : "4px 10px", fontSize: 10,
    color: "#22c55e", letterSpacing: "1px", textTransform: "uppercase",
    whiteSpace: "nowrap",
  }),
  logoutBtn: (mobile) => ({
    background: "rgba(239,68,68,0.1)", border: "1px solid #ef444444",
    borderRadius: 6, padding: mobile ? "6px 10px" : "6px 14px", fontSize: 11,
    color: "#ef4444", letterSpacing: "1px", cursor: "pointer",
    fontFamily: "inherit", textTransform: "uppercase",
    transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
  }),
  tabs: (mobile) => ({
    display: "flex", gap: 4,
    overflowX: "auto", WebkitOverflowScrolling: "touch",
    paddingBottom: mobile ? 4 : 0,
    scrollbarWidth: "none",
  }),
  tab: (active, mobile) => ({
    padding: mobile ? "8px 12px" : "8px 20px", borderRadius: 6, border: "1px solid",
    borderColor: active ? "#f59e0b" : "#2d2d4a",
    background: active ? "rgba(245,158,11,0.12)" : "transparent",
    color: active ? "#f59e0b" : "#64748b",
    fontSize: mobile ? 11 : 12, letterSpacing: "1px", textTransform: "uppercase",
    cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 700 : 400,
    transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
  }),
  // SHARED
  container: { maxWidth: 860, margin: "0 auto", padding: "40px 24px" },
  card: {
    background: "#0f0f1a", border: "1px solid #1e1e35",
    borderRadius: 12, padding: 28, marginBottom: 20,
  },
  cardTitle: {
    fontSize: 12, letterSpacing: "2px", textTransform: "uppercase",
    color: "#f59e0b", marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
  },
  grid: () => ({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }),
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" },
  input: {
    background: "#070710", border: "1px solid #2d2d4a", borderRadius: 8,
    color: "#e2e8f0", fontSize: 16, padding: "10px 14px",
    fontFamily: "inherit", outline: "none",
  },
  select: {
    background: "#070710", border: "1px solid #2d2d4a", borderRadius: 8,
    color: "#e2e8f0", fontSize: 15, padding: "10px 14px", fontFamily: "inherit", outline: "none",
  },
  btn: (disabled) => ({
    background: disabled ? "#1e1e35" : "linear-gradient(135deg, #f59e0b, #ef4444)",
    border: "none", borderRadius: 8,
    color: disabled ? "#64748b" : "#000",
    fontFamily: "inherit", fontWeight: 700, fontSize: 13,
    letterSpacing: "1px", padding: "12px 28px",
    cursor: disabled ? "not-allowed" : "pointer", textTransform: "uppercase",
    transition: "all 0.2s",
  }),
  btnFull: (disabled) => ({
    background: disabled ? "#1e1e35" : "linear-gradient(135deg, #f59e0b, #ef4444)",
    border: "none", borderRadius: 8, width: "100%",
    color: disabled ? "#64748b" : "#000",
    fontFamily: "inherit", fontWeight: 700, fontSize: 13,
    letterSpacing: "1px", padding: "14px",
    cursor: disabled ? "not-allowed" : "pointer", textTransform: "uppercase",
    transition: "all 0.2s", marginTop: 8,
  }),
  result: (color, bg) => ({
    background: bg, border: `1px solid ${color}33`,
    borderRadius: 12, padding: 24,
    display: "flex", alignItems: "center", gap: 24, marginTop: 20,
  }),
  bigNum: (color) => ({ fontSize: 40, fontWeight: 700, color, lineHeight: 1 }),
  smallLabel: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  riskBadge: (color) => ({
    background: color, color: "#000", fontWeight: 800,
    fontSize: 12, letterSpacing: "2px", padding: "6px 14px",
    borderRadius: 6, whiteSpace: "nowrap",
  }),
  progressBar: {
    height: 6, background: "#1e1e35", borderRadius: 99, overflow: "hidden", marginTop: 6,
  },
  progressFill: (pct, color) => ({
    height: "100%", width: `${Math.min(pct, 100)}%`,
    background: color, borderRadius: 99, transition: "width 0.6s",
  }),
  divider: { border: "none", borderTop: "1px solid #1e1e35", margin: "20px 0" },
  errorBox: {
    background: "#2d0000", border: "1px solid #ef444444",
    borderRadius: 8, padding: "12px 16px", fontSize: 12,
    color: "#ef4444", marginTop: 12,
  },
  successBox: {
    background: "#052e16", border: "1px solid #22c55e44",
    borderRadius: 8, padding: "12px 16px", fontSize: 12,
    color: "#22c55e", marginTop: 12,
  },
  normaBox: {
    background: "#070710", border: "1px solid #1e1e35",
    borderRadius: 8, padding: "12px 16px", fontSize: 12,
    color: "#64748b", marginTop: 16, lineHeight: 1.7,
  },
  warnBox: {
    background: "#2d1900", border: "1px solid #f59e0b44",
    borderRadius: 8, padding: "12px 16px", fontSize: 12,
    color: "#f59e0b", marginTop: 12, lineHeight: 1.7,
  },
  checkRow: (checked) => ({
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "12px 0", borderBottom: "1px solid #1e1e35",
    cursor: "pointer", opacity: checked ? 0.55 : 1, transition: "opacity 0.2s",
  }),
  checkbox: (checked) => ({
    width: 20, height: 20, minWidth: 20, borderRadius: 5,
    border: `2px solid ${checked ? "#22c55e" : "#2d2d4a"}`,
    background: checked ? "#22c55e" : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginTop: 1, transition: "all 0.2s",
  }),
  catTitle: {
    fontSize: 11, color: "#f59e0b", letterSpacing: "2px",
    textTransform: "uppercase", marginTop: 28, marginBottom: 8,
    display: "flex", alignItems: "center", gap: 8,
  },
};

const riskColor = (level) => {
  if (level === "SAFE") return { color: "#22c55e", bg: "#052e16" };
  if (level === "WARNING") return { color: "#f59e0b", bg: "#2d1900" };
  return { color: "#ef4444", bg: "#2d0000" };
};

const riskLabel = (level) => {
  if (level === "SAFE") return "Prosseguir";
  if (level === "WARNING") return "Analisar";
  if (level === "DANGER") return "Parar";
  return level;
};

const roleLabel = (role) => {
  const map = {
    SUPER_ADMIN: "Super Admin",
    ADMIN_EMPRESA: "Admin",
    GERENTE_OPERACOES: "Gerente",
    LIDER_EQUIPE: "Líder de Equipe",
    RIGGER: "Rigger",
    OPERADOR: "Operador",
    OPERADOR_GUINDASTE: "Operador de Guindaste",
  };
  return map[role] || role;
};

// ── LOGIN SCREEN ─────────────────────────────────────────────────────────────────
function LoginScreen({ onAuth, onDemo }) {
  const isMobile = useIsMobile();
  // "select" | "usuario" | "admin"
  const [mode, setMode] = useState("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [setupForm, setSetupForm] = useState({ nome: "", email: "", senha: "" });

  const goTo = (m) => { setMode(m); setError(null); setSuccess(null); };

  const handleLogin = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Credenciais inválidas"); return; }
      saveAuth(data.token, { userId: data.userId, userName: data.userName, role: data.role, empresaId: data.empresaId, empresaName: data.empresaName, empresaCnpj: data.empresaCnpj });
      onAuth();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${API}/api/auth/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupForm),
      });
      if (!res.ok) { 
        const data = await res.json().catch(()=>({}));
        setError(data.error || "Erro ao realizar setup. Verifique se já não existe um admin."); 
        return; 
      }
      setSuccess("Super Admin criado sucesso! Você pode realizar o login agora.");
      setSetupForm({ nome: "", email: "", senha: "" });
      setTimeout(() => goTo("superadmin"), 1500);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const accentUsuario = "#38bdf8";
  const accentAdmin   = "#f59e0b";
  const accentSuperAdmin = "#ef4444";
  
  const isAdmin = mode === "admin" || mode === "register";
  const isSuperAdmin = mode === "superadmin" || mode === "setup";
  const accent  = isSuperAdmin ? accentSuperAdmin : (isAdmin ? accentAdmin : accentUsuario);

  // ── TELA DE SELEÇÃO ──
  if (mode === "select") {
    return (
      <div style={S.loginWrap}>
        <div style={{ width: "100%", maxWidth: 480, padding: isMobile ? "0 16px" : 0 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={S.loginIcon}>🏗</div>
            <div style={S.loginTitle}>RiggingCheck</div>
            <div style={S.loginSub}>Segurança em Içamento</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Card Usuário */}
            <button onClick={() => goTo("usuario")} style={{
              background: "#0f0f1a", border: `2px solid ${accentUsuario}44`,
              borderRadius: 16, padding: "28px 24px", cursor: "pointer",
              textAlign: "left", transition: "all 0.2s", width: "100%",
              display: "flex", alignItems: "center", gap: 20,
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accentUsuario}
              onMouseLeave={e => e.currentTarget.style.borderColor = `${accentUsuario}44`}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: `${accentUsuario}18`, border: `1px solid ${accentUsuario}44`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
              }}>👷</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
                  Operador / Rigger
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  Realize verificações de capacidade e eslingas,<br />
                  e solicite autorização para o içamento.
                </div>
              </div>
              <div style={{ marginLeft: "auto", color: accentUsuario, fontSize: 20 }}>→</div>
            </button>

            {/* Card Admin */}
            <button onClick={() => goTo("admin")} style={{
              background: "#0f0f1a", border: `2px solid ${accentAdmin}44`,
              borderRadius: 16, padding: "28px 24px", cursor: "pointer",
              textAlign: "left", transition: "all 0.2s", width: "100%",
              display: "flex", alignItems: "center", gap: 20,
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accentAdmin}
              onMouseLeave={e => e.currentTarget.style.borderColor = `${accentAdmin}44`}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: `${accentAdmin}18`, border: `1px solid ${accentAdmin}44`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
              }}>🔑</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
                  Administrador / Líder de Equipe
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  Gerencie sua equipe, avalie e aprove<br />
                  ou reprove solicitações de içamento.
                </div>
              </div>
              <div style={{ marginLeft: "auto", color: accentAdmin, fontSize: 20 }}>→</div>
            </button>
          </div>

          {onDemo && (
            <div style={{ marginTop: 24 }}>
              <button
                onClick={onDemo}
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                  border: "none",
                  borderRadius: 12, padding: "16px 24px", cursor: "pointer",
                  textAlign: "center", transition: "all 0.2s", width: "100%",
                  color: "#ffffff", fontSize: 14, fontWeight: "bold", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                Teste
              </button>
            </div>
          )}

          <div style={{ ...S.normaBox, marginTop: 16, textAlign: "center" }}>
            NR-11 · ABNT NBR 11900 · ABNT NBR 13541
          </div>

          <button style={{
             background: "none", border: "none", color: "#475569", marginTop: 24,
             cursor: "pointer", fontSize: 11, width: "100%", textTransform: "uppercase", letterSpacing: "1px"
          }} onClick={() => goTo("superadmin")}>
            Acesso Root / Sistema
          </button>
        </div>
      </div>
    );
  }

  // ── TELA DE SETUP (SUPER ADMIN) ──
  if (mode === "setup") {
    return (
      <div style={S.loginWrap}>
        <div style={S.loginCard(isMobile)}>
          <button onClick={() => goTo("superadmin")} style={{
            background: "none", border: "none", color: "#64748b",
            cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6,
          }}>← Voltar</button>

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 13, margin: "0 auto 14px",
              background: `${accentSuperAdmin}18`, border: `1px solid ${accentSuperAdmin}44`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>
              ⚙️
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
              Setup Super Admin
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
              Criar o primeiro administrador root do sistema
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Nome Completo</label>
            <input style={{ ...S.input, borderColor: `${accentSuperAdmin}44` }}
              type="text" placeholder="Seu Nome"
              value={setupForm.nome}
              onChange={e => setSetupForm(p => ({ ...p, nome: e.target.value }))} />
          </div>
          <div style={{ ...S.field, marginTop: 16 }}>
            <label style={S.label}>Email Mestre</label>
            <input style={{ ...S.input, borderColor: `${accentSuperAdmin}44` }}
              type="email" placeholder="root@sistema.com"
              value={setupForm.email}
              onChange={e => setSetupForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div style={{ ...S.field, marginTop: 16 }}>
            <label style={S.label}>Senha Segura (mín 8)</label>
            <input style={{ ...S.input, borderColor: `${accentSuperAdmin}44` }}
              type="password" placeholder="••••••••"
              value={setupForm.senha}
              onChange={e => setSetupForm(p => ({ ...p, senha: e.target.value }))} />
          </div>

          {error && <div style={{ ...S.errorBox, marginTop: 12 }}>{error}</div>}
          {success && <div style={{ ...S.successBox, marginTop: 12 }}>{success}</div>}

          <button style={{ ...S.btnFull(loading), marginTop: 20, background: `linear-gradient(135deg, ${accentSuperAdmin}, #b91c1c)` }}
            onClick={handleSetup} disabled={loading}>
            {loading ? "Criando..." : "Criar Root"}
          </button>
        </div>
      </div>
    );
  }

  // ── TELA DE LOGIN (usuário ou admin) ──
  return (
    <div style={S.loginWrap}>
      <div style={S.loginCard(isMobile)}>
        <button onClick={() => goTo("select")} style={{
          background: "none", border: "none", color: "#64748b",
          cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6,
        }}>← Voltar</button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 13, margin: "0 auto 14px",
            background: `${accent}18`, border: `1px solid ${accent}44`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>
            {isSuperAdmin ? "👑" : (isAdmin ? "🔑" : "👷")}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
            {isSuperAdmin ? "Acesso Root" : (isAdmin ? "Acesso Administrativo" : "Acesso do Operador")}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            {isSuperAdmin ? "Gerenciamento absoluto (Super Admin)" : (isAdmin ? "Gerencie equipe e aprove içamentos" : "Verificações e solicitação de içamento")}
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Email</label>
          <input style={{ ...S.input, borderColor: `${accent}44` }}
            type="email" placeholder="seu@email.com"
            value={loginForm.email}
            onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div style={{ ...S.field, marginTop: 16 }}>
          <label style={S.label}>Senha</label>
          <input style={{ ...S.input, borderColor: `${accent}44` }}
            type="password" placeholder="••••••••"
            value={loginForm.password}
            onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>

        {error && <div style={{ ...S.errorBox, marginTop: 12 }}>{error}</div>}
        {success && <div style={{ ...S.successBox, marginTop: 12 }}>{success}</div>}

        <button style={{ ...S.btnFull(loading), marginTop: 20, background: `linear-gradient(135deg, ${accent}, ${isSuperAdmin ? "#b91c1c" : (isAdmin ? "#fb923c" : "#0ea5e9")})` }}
          onClick={handleLogin} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {isSuperAdmin && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}
              onClick={() => goTo("setup")}>
              Primeiro acesso? Finalize o Setup.
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── MODULE 1: CAPACITY ───────────────────────────────────────────────────────────
function CapacityModule({ onApproved, isDemo }) {
  const [form, setForm] = useState({ craneCapacity: "", loadWeight: "", riggingWeight: "50" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = async () => {
    const craneCapacity = parseFloat(form.craneCapacity);
    const loadWeight = parseFloat(form.loadWeight);
    const riggingWeight = parseFloat(form.riggingWeight) || 0;

    if (!craneCapacity || craneCapacity <= 0) { setError("Informe a capacidade do guindaste (valor positivo)."); return; }
    if (!loadWeight || loadWeight <= 0) { setError("Informe o peso da carga (valor positivo)."); return; }

    setLoading(true); setError(null);
    if (isDemo) {
      const totalLoad = loadWeight + riggingWeight;
      const usagePercent = (totalLoad / craneCapacity) * 100;
      let riskLevel = "SAFE";
      if (usagePercent > 100) riskLevel = "DANGER";
      else if (usagePercent > 85) riskLevel = "WARNING";

      setTimeout(() => {
        setResult({
          approved: riskLevel !== "DANGER",
          totalLoad,
          usagePercent,
          availableMargin: craneCapacity - totalLoad,
          riskLevel
        });
        setLoading(false);
      }, 400); // fake delay
      return;
    }

    try {
      const res = await authFetch(`${API}/api/capacity/verify`, {
        method: "POST",
        body: JSON.stringify({ craneCapacity, loadWeight, riggingWeight }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Erro no cálculo."); setLoading(false); return; }
      setResult(data);
      if (data.approved) onApproved?.({
        capGuindasteKg: parseFloat(form.craneCapacity),
        capCargaKg: parseFloat(form.loadWeight),
        capAparelhoKg: parseFloat(form.riggingWeight) || 0,
        capTotalKg: data.totalLoad,
        capUsoPercent: data.usagePercent,
        capRisco: data.riskLevel,
      });
    } catch {
      setError("Não foi possível conectar à API.");
    }
    setLoading(false);
  };

  const risk = result ? riskColor(result.riskLevel) : null;

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>⚖️ &nbsp;Verificação de Capacidade</div>
      <div style={S.grid()}>
        {[
          { key: "craneCapacity", label: "Capacidade do Guindaste (kg)", placeholder: "ex: 10000" },
          { key: "loadWeight", label: "Peso da Carga (kg)", placeholder: "ex: 6500" },
          { key: "riggingWeight", label: "Peso do Aparelho (kg)", placeholder: "ex: 50" },
        ].map(f => (
          <div key={f.key} style={S.field}>
            <label style={S.label}>{f.label}</label>
            <input style={S.input} type="number" placeholder={f.placeholder}
              value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div style={S.normaBox}>
        📋 <strong style={{ color: "#94a3b8" }}>ABNT NBR 11900 / NR-11:</strong> A carga total
        não deve ultrapassar a curva de carga do guindaste para o raio de operação.
        Margem mínima recomendada: 10%.
      </div>
      <div style={{ marginTop: 20 }}>
        <button style={S.btn(loading)} onClick={calculate} disabled={loading}>
          {loading ? "Verificando..." : "Verificar"}
        </button>
      </div>
      {error && <div style={S.errorBox}>{error}</div>}
      {result && risk && (
        <div style={S.result(risk.color, risk.bg)}>
          <div>
            <div style={S.bigNum(risk.color)}>{result.usagePercent?.toFixed(1)}%</div>
            <div style={S.smallLabel}>da capacidade utilizada</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.progressBar}>
              <div style={S.progressFill(result.usagePercent, risk.color)} />
            </div>
            <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8 }}>
              <div>Carga total: <strong style={{ color: "#e2e8f0" }}>{result.totalLoad?.toFixed(0)} kg</strong></div>
              <div>Margem disponível: <strong style={{ color: "#e2e8f0" }}>{result.availableMargin?.toFixed(0)} kg</strong></div>
            </div>
          </div>
          <div style={S.riskBadge(risk.color)}>{riskLabel(result.riskLevel)}</div>
        </div>
      )}
      {result && !result.approved && (
        <div style={S.warnBox}>⚠️ <strong>OPERAÇÃO NÃO PERMITIDA.</strong> Reduza a carga ou reposicione o guindaste.</div>
      )}
      {result?.approved && (
        <div style={S.successBox}>✅ Capacidade aprovada — prossiga para o cálculo de eslingas.</div>
      )}
    </div>
  );
}

// ── MODULE 2: SLING ──────────────────────────────────────────────────────────────
function SlingModule({ onCompleted, isDemo }) {
  const [form, setForm] = useState({
    loadWeight: "", numberOfLegs: "2", angleFromHorizontal: "45",
    wll: "", temManilha: false, manilhaCapacidadeKg: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = async () => {
    const loadWeight = parseFloat(form.loadWeight);
    const numberOfLegs = parseInt(form.numberOfLegs);
    const angleFromHorizontal = parseFloat(form.angleFromHorizontal);
    const wll = parseFloat(form.wll);
    const temManilha = form.temManilha;
    const manilhaCapacidadeKg = temManilha ? parseFloat(form.manilhaCapacidadeKg) : null;

    if (!loadWeight || loadWeight <= 0) { setError("Informe o peso da carga (valor positivo)."); return; }
    if (!angleFromHorizontal || angleFromHorizontal <= 0 || angleFromHorizontal > 90) { setError("Ângulo deve estar entre 1° e 90°."); return; }
    if (!wll || wll <= 0) { setError("WLL da eslinga é obrigatório e deve ser maior que zero."); return; }
    if (temManilha && (!manilhaCapacidadeKg || manilhaCapacidadeKg <= 0)) { setError("Informe a capacidade da manilha (valor positivo)."); return; }

    setLoading(true); setError(null);
    if (isDemo) {
      const radians = angleFromHorizontal * (Math.PI / 180);
      const tensionPerLeg = loadWeight / (numberOfLegs * Math.sin(radians));
      const wllUsagePercent = (tensionPerLeg / wll) * 100;
      let riskLevel = wllUsagePercent < 70 ? "SAFE" : wllUsagePercent < 90 ? "WARNING" : "DANGER";
      const manilhaUsoPercent = temManilha ? (tensionPerLeg / manilhaCapacidadeKg) * 100 : null;
      const manilhaCompativel = temManilha ? manilhaCapacidadeKg >= tensionPerLeg : null;
      if (temManilha) {
        const rm = manilhaUsoPercent < 70 ? "SAFE" : manilhaUsoPercent < 90 ? "WARNING" : "DANGER";
        const nivel = r => r === "DANGER" ? 2 : r === "WARNING" ? 1 : 0;
        if (nivel(rm) > nivel(riskLevel)) riskLevel = rm;
      }
      setTimeout(() => {
        setResult({
          tensionPerLeg, loadFactor: 1 / Math.sin(radians),
          riskLevel, angleWarning: angleFromHorizontal < 45,
          wllUsagePercent, temManilha, manilhaCapacidadeKg, manilhaUsoPercent, manilhaCompativel,
        });
        setLoading(false);
      }, 400);
      return;
    }

    try {
      const res = await authFetch(`${API}/api/sling/calculate`, {
        method: "POST",
        body: JSON.stringify({ loadWeight, numberOfLegs, angleFromHorizontal, wll, temManilha, manilhaCapacidadeKg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Erro no cálculo."); setLoading(false); return; }
      setResult(data);
      if (data.riskLevel !== "DANGER") onCompleted?.({
        eslNumPernas: numberOfLegs,
        eslAnguloGraus: angleFromHorizontal,
        eslTensaoPorPernaKg: data.tensionPerLeg,
        eslFatorCarga: data.loadFactor,
        eslRisco: data.riskLevel,
        eslAnguloAviso: data.angleWarning ?? false,
        eslWllKg: wll,
        eslWllUsoPercent: data.wllUsagePercent,
        eslTemManilha: temManilha,
        eslManilhaCapacidadeKg: manilhaCapacidadeKg,
        eslManilhaUsoPercent: data.manilhaUsoPercent,
        eslManilhaCompativel: data.manilhaCompativel,
      });
    } catch {
      setError("Não foi possível conectar à API.");
    }
    setLoading(false);
  };

  const risk = result?.riskLevel ? riskColor(result.riskLevel) : { color: "#38bdf8", bg: "#001a2d" };

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>📐 &nbsp;Cálculo de Eslingas & Cabos</div>
      <div style={S.grid()}>
        <div style={S.field}>
          <label style={S.label}>Peso total da carga (kg)</label>
          <input style={S.input} type="number" placeholder="ex: 5000"
            value={form.loadWeight} onChange={e => setForm(p => ({ ...p, loadWeight: e.target.value }))} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Ângulo da eslinga (° da horizontal)</label>
          <input style={S.input} type="number" placeholder="ex: 60"
            value={form.angleFromHorizontal} onChange={e => setForm(p => ({ ...p, angleFromHorizontal: e.target.value }))} />
        </div>
        <div style={S.field}>
          <label style={S.label}>WLL da eslinga (kg) <span style={{ color: "#ef4444" }}>*</span></label>
          <input style={S.input} type="number" placeholder="ex: 3200"
            value={form.wll} onChange={e => setForm(p => ({ ...p, wll: e.target.value }))} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Número de pernas</label>
          <select style={S.select} value={form.numberOfLegs}
            onChange={e => setForm(p => ({ ...p, numberOfLegs: e.target.value }))}>
            {["1","2","3","4"].map(n => <option key={n} value={n}>{n} perna{n > 1 ? "s" : ""}</option>)}
          </select>
        </div>
      </div>

      {/* ── Manilha ── */}
      <div style={{ background: "#0a0a0f", border: "1px solid #1e2a3a", borderRadius: 10, padding: "14px 18px", marginTop: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={form.temManilha}
            onChange={e => setForm(p => ({ ...p, temManilha: e.target.checked, manilhaCapacidadeKg: "" }))}
            style={{ width: 16, height: 16, accentColor: "#38bdf8" }} />
          <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Há manilha na lingada</span>
        </label>
        {form.temManilha && (
          <div style={{ marginTop: 12 }}>
            <div style={S.field}>
              <label style={S.label}>Capacidade da manilha / WLL (kg) <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={S.input} type="number" placeholder="ex: 2500"
                value={form.manilhaCapacidadeKg}
                onChange={e => setForm(p => ({ ...p, manilhaCapacidadeKg: e.target.value }))} />
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
              A capacidade da manilha será comparada à tensão por perna. Se insuficiente, o risco será PERIGO.
            </div>
          </div>
        )}
      </div>

      {parseFloat(form.angleFromHorizontal) < 45 && (
        <div style={{ ...S.warnBox, marginTop: 14 }}>⚠️ Ângulo abaixo de 45° aumenta drasticamente a tensão nas eslingas.</div>
      )}
      <div style={{ ...S.normaBox, marginTop: 14 }}>
        📋 <strong style={{ color: "#94a3b8" }}>ABNT NBR 13541:</strong> Tensão = (Carga / n° pernas) × (1 / sen θ).
        Recomenda-se θ ≥ 45°. Fator de segurança mínimo: 5:1.
      </div>
      <div style={{ marginTop: 20 }}>
        <button style={S.btn(loading)} onClick={calculate} disabled={loading}>
          {loading ? "Calculando..." : "Calcular"}
        </button>
      </div>
      {error && <div style={S.errorBox}>{error}</div>}
      {result && (
        <>
          <div style={S.result(risk.color, risk.bg)}>
            <div>
              <div style={S.bigNum(risk.color)}>{result.tensionPerLeg?.toFixed(0)}<span style={{ fontSize: 18 }}> kg</span></div>
              <div style={S.smallLabel}>tensão por perna</div>
            </div>
            <div style={{ flex: 1, fontSize: 13, lineHeight: 2 }}>
              <div>Fator de carga: <strong style={{ color: "#e2e8f0" }}>{result.loadFactor?.toFixed(3)}×</strong></div>
              <div>WLL eslinga: <strong style={{ color: "#e2e8f0" }}>{parseFloat(form.wll).toLocaleString("pt-BR")} kg</strong></div>
              <div>Uso do WLL: <strong style={{ color: risk.color }}>{result.wllUsagePercent?.toFixed(1)}%</strong></div>
              {result.angleWarning && <div style={{ color: "#f59e0b" }}>⚠️ Ângulo crítico!</div>}
            </div>
            <div style={S.riskBadge(risk.color)}>{riskLabel(result.riskLevel)}</div>
          </div>
          {result.temManilha && (
            <div style={{ background: "#0a0a0f", border: `1px solid ${result.manilhaCompativel ? "#22c55e33" : "#ef444433"}`, borderRadius: 10, padding: "14px 18px", marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>Manilha</div>
              <div style={{ fontSize: 13, lineHeight: 2 }}>
                <div>Capacidade: <strong style={{ color: "#e2e8f0" }}>{result.manilhaCapacidadeKg?.toLocaleString("pt-BR")} kg</strong></div>
                <div>Uso: <strong style={{ color: result.manilhaCompativel ? "#22c55e" : "#ef4444" }}>{result.manilhaUsoPercent?.toFixed(1)}%</strong></div>
                <div>Compatibilidade: <strong style={{ color: result.manilhaCompativel ? "#22c55e" : "#ef4444" }}>
                  {result.manilhaCompativel ? "✅ Compatível" : "🚫 Incompatível — capacidade insuficiente"}
                </strong></div>
              </div>
            </div>
          )}
        </>
      )}
      {result && result.riskLevel !== "DANGER" && (
        <div style={S.successBox}>✅ Cálculo concluído — prossiga para o checklist NR-11.</div>
      )}
    </div>
  );
}

// ── MODULE 3: CHECKLIST ──────────────────────────────────────────────────────────
function ChecklistModule({ capacityData, slingData }) {
  const total = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const [checked, setChecked] = useState({});
  const [operator] = useState(() => getUser()?.userName || "");
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [solicitacao, setSolicitacao] = useState(null); // { id, status, aprovadoPorNome }
  const [polling, setPolling] = useState(false);

  const done = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  const solicitarLiberacao = async () => {
    if (!jobId.trim()) {
      setError("Preencha o número da OS.");
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await authFetch(`${API}/api/liberacoes`, {
        method: "POST",
        body: JSON.stringify({
          operacaoOs: jobId.trim(),
          riggerNome: operator.trim(),
          dadosCapacidade: capacityData,
          dadosEslinga: slingData,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao enviar solicitação."); return; }
      setSolicitacao(data);
      setPolling(true);
    } catch {
      setError("Não foi possível conectar à API.");
    } finally {
      setLoading(false);
    }
  };

  // Polling a cada 5s enquanto PENDENTE
  useEffect(() => {
    if (!polling || !solicitacao) return;
    if (solicitacao.status !== "ANALISAR") { setPolling(false); return; }
    const timer = setInterval(async () => {
      try {
        const res = await authFetch(`${API}/api/liberacoes/${solicitacao.id}`);
        const data = await res.json();
        setSolicitacao(data);
        if (data.status !== "ANALISAR") setPolling(false);
      } catch { /* ignora erros de rede no polling */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [polling, solicitacao]);

  const resetar = () => {
    setChecked({}); setJobId("");
    setSolicitacao(null); setPolling(false); setError(null);
  };

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>📋 &nbsp;Checklist de Içamento — NR-11 / ABNT</div>

      {solicitacao ? (
        // ── STATUS DA SOLICITAÇÃO ──
        <div>
          {solicitacao.status === "ANALISAR" && (
            <div style={{ ...S.warnBox, textAlign: "center", padding: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Aguardando autorização do administrador</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>OS: {solicitacao.operacaoOs} · Rigger: {solicitacao.riggerNome}</div>
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>Verificando automaticamente a cada 5 segundos...</div>
            </div>
          )}
          {solicitacao.status === "PROSSEGUIR" && (
            <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 12, padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#22c55e", marginBottom: 6 }}>IÇAMENTO AUTORIZADO</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>OS: {solicitacao.operacaoOs} · Rigger: {solicitacao.riggerNome}</div>
              <div style={{ color: "#22c55e", fontSize: 12 }}>Autorizado por: <strong>{solicitacao.aprovadoPorNome}</strong></div>
              {solicitacao.observacao && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>"{solicitacao.observacao}"</div>}
              <div style={{ color: "#475569", fontSize: 11, marginTop: 8 }}>{new Date(solicitacao.resolvidoEm).toLocaleString("pt-BR")}</div>
            </div>
          )}
          {solicitacao.status === "PARAR" && (
            <div style={{ ...S.errorBox, textAlign: "center", padding: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚫</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>IÇAMENTO NÃO AUTORIZADO</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>OS: {solicitacao.operacaoOs} · Rigger: {solicitacao.riggerNome}</div>
              <div style={{ fontSize: 12 }}>Negado por: <strong>{solicitacao.aprovadoPorNome}</strong></div>
              {solicitacao.observacao && <div style={{ fontSize: 12, marginTop: 8 }}>Motivo: "{solicitacao.observacao}"</div>}
            </div>
          )}
          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button style={{ ...S.btn(false), background: "#1e1e35", color: "#64748b" }} onClick={resetar}>
              Nova Operação
            </button>
          </div>
        </div>
      ) : (
        // ── CHECKLIST ──
        <>
          <div style={S.grid()}>
            <div style={S.field}>
              <label style={S.label}>Operação / OS nº</label>
              <input style={S.input} placeholder="ex: OS-2024-089" value={jobId} onChange={e => setJobId(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Rigger Responsável</label>
              <input style={{ ...S.input, background: "#0a0a0f", color: "#64748b", cursor: "default" }} value={operator} readOnly title="Preenchido automaticamente com seu nome de usuário" />
            </div>
          </div>
          <hr style={S.divider} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: allDone ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>{done}</span>
              <span style={{ color: "#64748b" }}> / {total} itens verificados</span>
            </div>
            <div style={S.riskBadge(allDone ? "#22c55e" : "#f59e0b")}>{pct}%</div>
          </div>
          <div style={S.progressBar}>
            <div style={S.progressFill(pct, allDone ? "#22c55e" : "#f59e0b")} />
          </div>
          {CHECKLIST.map((cat, ci) => (
            <div key={ci}>
              <div style={S.catTitle}>▸ {cat.category}
                <span style={{ color: "#475569", fontWeight: 400 }}>
                  ({cat.items.filter((_, ii) => checked[`${ci}-${ii}`]).length}/{cat.items.length})
                </span>
              </div>
              {cat.items.map((item, ii) => {
                const key = `${ci}-${ii}`;
                const isChecked = !!checked[key];
                return (
                  <div key={ii} style={S.checkRow(isChecked)} onClick={() => setChecked(p => ({ ...p, [key]: !p[key] }))}>
                    <div style={S.checkbox(isChecked)}>
                      {isChecked && <span style={{ color: "#000", fontSize: 13, fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, lineHeight: 1.5, userSelect: "none" }}>{item}</span>
                  </div>
                );
              })}
            </div>
          ))}
          {error && <div style={S.errorBox}>{error}</div>}
          <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={S.btn(!allDone || loading)} disabled={!allDone || loading} onClick={solicitarLiberacao}>
              {!allDone ? `Aguardando ${total - done} item(s)` : loading ? "Enviando..." : "🔒 Solicitar Liberação"}
            </button>
            <button style={{ ...S.btn(false), background: "#1e1e35", color: "#64748b" }} onClick={resetar}>
              Reiniciar
            </button>
          </div>
          {allDone && !solicitacao && (
            <div style={S.normaBox}>
              ℹ️ Após solicitar, o administrador receberá a notificação e poderá autorizar ou negar o içamento.
            </div>
          )}
        </>
      )}
    </div>
  );
}

const IS_SUPER = (role) => role === "SUPER_ADMIN";

const statusColor = (s) => s === "PROSSEGUIR" ? "#22c55e" : s === "PARAR" ? "#ef4444" : "#f59e0b";

// ── MODAL ALTERAR SENHA ──────────────────────────────────────────────────────────
function ModalAlterarSenha({ onFechar }) {
  const [form, setForm] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    setErro(null);
    if (!form.senhaAtual || !form.novaSenha || !form.confirmar) {
      setErro("Preencha todos os campos."); return;
    }
    if (form.novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres."); return;
    }
    if (form.novaSenha !== form.confirmar) {
      setErro("A nova senha e a confirmação não coincidem."); return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/funcionarios/minha-senha`, {
        method: "PUT",
        body: JSON.stringify({ senhaAtual: form.senhaAtual, novaSenha: form.novaSenha }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error || "Erro ao alterar senha.");
      } else {
        setSucesso(true);
      }
    } catch { setErro("Erro de conexão."); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#0f0f1a", border: "1px solid #1e2a3a", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 24 }}>Alterar Senha</div>
        {sucesso ? (
          <div>
            <div style={{ ...S.successBox, marginBottom: 24 }}>Senha alterada com sucesso!</div>
            <button style={{ ...S.btn(true), width: "100%" }} onClick={onFechar}>Fechar</button>
          </div>
        ) : (
          <>
            <div style={S.field}>
              <label style={S.label}>Senha Atual</label>
              <input style={S.input} type="password" placeholder="••••••" value={form.senhaAtual}
                onChange={e => setForm(p => ({ ...p, senhaAtual: e.target.value }))} />
            </div>
            <div style={{ ...S.field, marginTop: 14 }}>
              <label style={S.label}>Nova Senha (mín. 6 caracteres)</label>
              <input style={S.input} type="password" placeholder="••••••" value={form.novaSenha}
                onChange={e => setForm(p => ({ ...p, novaSenha: e.target.value }))} />
            </div>
            <div style={{ ...S.field, marginTop: 14 }}>
              <label style={S.label}>Confirmar Nova Senha</label>
              <input style={S.input} type="password" placeholder="••••••" value={form.confirmar}
                onChange={e => setForm(p => ({ ...p, confirmar: e.target.value }))} />
            </div>
            {erro && <div style={{ ...S.errorBox, marginTop: 12 }}>{erro}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button style={{ ...S.btn(loading), flex: 1 }} onClick={salvar} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </button>
              <button style={{ ...S.btn(false), flex: 1 }} onClick={onFechar}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD (página separada — SUPER_ADMIN e ADMIN_EMPRESA) ─────────────
function AdminDashboard({ onVoltar, isMobile }) {
  const [painel, setPainel] = useState("solicitacoes"); // "solicitacoes" | "equipe"
  const [showModalSenha, setShowModalSenha] = useState(false);

  // ── Solicitações ──
  const [statusFiltro, setStatusFiltro] = useState("ANALISAR");
  const [lista, setLista] = useState([]);
  const [loadingSol, setLoadingSol] = useState(true);
  const [obs, setObs] = useState({});

  // ── Equipe ──
  const [equipe, setEquipe] = useState([]);
  const [loadingEq, setLoadingEq] = useState(false);
  const [novoForm, setNovoForm] = useState({ nome: "", email: "", senha: "", role: "RIGGER" });
  const [erroEq, setErroEq] = useState(null);
  const [sucEq, setSucEq] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({ nome: "", email: "", role: "RIGGER" });
  const [erroEdit, setErroEdit] = useState(null);

  const user = getUser();
  const isSuperAdmin = IS_SUPER(user?.role);

  // ── Carregar solicitações ──
  const carregar = useCallback(async (s) => {
    setLoadingSol(true);
    try {
      const res = await authFetch(`${API}/api/liberacoes?status=${s}`);
      if (res.ok) setLista(await res.json());
    } catch { /* ignora */ }
    setLoadingSol(false);
  }, []);

  useEffect(() => { carregar(statusFiltro); }, [carregar, statusFiltro]);

  // ── Carregar equipe ──
  const carregarEquipe = useCallback(async () => {
    setLoadingEq(true);
    try {
      const res = await authFetch(`${API}/api/funcionarios`);
      if (res.ok) setEquipe(await res.json());
    } catch { /* ignora */ }
    setLoadingEq(false);
  }, []);

  useEffect(() => { if (painel === "equipe") carregarEquipe(); }, [painel, carregarEquipe]);

  const resolver = async (id, acao) => {
    try {
      const res = await authFetch(`${API}/api/liberacoes/${id}/${acao}`, {
        method: "POST",
        body: JSON.stringify({ observacao: obs[id] || "" }),
      });
      if (res.ok) {
        setLista(p => p.filter(s => s.id !== id));
        setObs(o => { const n = { ...o }; delete n[id]; return n; });
      }
    } catch { /* ignora */ }
  };

  const criarFuncionario = async () => {
    setErroEq(null); setSucEq(null);
    try {
      const res = await authFetch(`${API}/api/funcionarios`, {
        method: "POST",
        body: JSON.stringify(novoForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroEq(data.error || "Erro ao criar usuário."); return; }
      setSucEq(`Usuário ${data.nome} criado com sucesso.`);
      setNovoForm({ nome: "", email: "", senha: "", role: "RIGGER" });
      carregarEquipe();
    } catch { setErroEq("Erro de conexão."); }
  };

  const alternarAtivo = async (id, ativo) => {
    const acao = ativo ? "desativar" : "reativar";
    try {
      const res = await authFetch(`${API}/api/funcionarios/${id}/${acao}`, { method: "POST" });
      if (res.ok) setEquipe(p => p.map(f => f.id === id ? { ...f, ativo: !ativo } : f));
    } catch { /* ignora */ }
  };

  const iniciarEdicao = (f) => {
    setEditandoId(f.id);
    setEditForm({ nome: f.nome, email: f.email, role: f.role });
    setErroEdit(null);
  };

  const salvarEdicao = async () => {
    setErroEdit(null);
    try {
      const res = await authFetch(`${API}/api/funcionarios/${editandoId}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroEdit(data.error || "Erro ao salvar alterações."); return; }
      setEditandoId(null);
      carregarEquipe();
    } catch { setErroEdit("Erro de conexão."); }
  };

  // Agrupa por empresa para SUPER_ADMIN
  const grupos = isSuperAdmin
    ? lista.reduce((acc, sol) => {
        const key = sol.empresaNome || "Sem empresa";
        if (!acc[key]) acc[key] = [];
        acc[key].push(sol);
        return acc;
      }, {})
    : { [user?.empresaName || "Minha Empresa"]: lista };

  const cardTecnico = (sol) => (
    <div style={{ marginTop: 14, background: "#0a0a0f", borderRadius: 8, padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Capacidade</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: "#94a3b8" }}>
            <div>Guindaste: <strong style={{ color: "#e2e8f0" }}>{sol.capGuindasteKg?.toLocaleString("pt-BR")} kg</strong></div>
            <div>Carga total: <strong style={{ color: "#e2e8f0" }}>{sol.capTotalKg?.toFixed(0)} kg</strong></div>
            <div>Uso: <strong style={{ color: riskColor(sol.capRisco).color }}>{sol.capUsoPercent?.toFixed(1)}%</strong></div>
            <div>Risco: <strong style={{ color: riskColor(sol.capRisco).color }}>{riskLabel(sol.capRisco)}</strong></div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Eslinga</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: "#94a3b8" }}>
            <div>Pernas: <strong style={{ color: "#e2e8f0" }}>{sol.eslNumPernas}</strong></div>
            <div>Ângulo: <strong style={{ color: sol.eslAnguloAviso ? "#f59e0b" : "#e2e8f0" }}>{sol.eslAnguloGraus}°{sol.eslAnguloAviso ? " ⚠️" : ""}</strong></div>
            <div>Tensão/perna: <strong style={{ color: "#e2e8f0" }}>{sol.eslTensaoPorPernaKg?.toFixed(0)} kg</strong></div>
            {sol.eslWllKg != null && (
              <div>WLL: <strong style={{ color: "#e2e8f0" }}>{sol.eslWllKg?.toLocaleString("pt-BR")} kg</strong>
                {sol.eslWllUsoPercent != null && <span style={{ color: riskColor(sol.eslRisco).color }}> ({sol.eslWllUsoPercent?.toFixed(1)}%)</span>}
              </div>
            )}
            <div>Risco: <strong style={{ color: riskColor(sol.eslRisco).color }}>{riskLabel(sol.eslRisco)}</strong></div>
          </div>
        </div>
      </div>
      {sol.eslTemManilha && (
        <div style={{ borderTop: "1px solid #1e2a3a", marginTop: 10, paddingTop: 10 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Manilha</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12, color: "#94a3b8" }}>
            <div>Capacidade: <strong style={{ color: "#e2e8f0" }}>{sol.eslManilhaCapacidadeKg?.toLocaleString("pt-BR")} kg</strong></div>
            <div>Uso: <strong style={{ color: sol.eslManilhaCompativel ? "#22c55e" : "#ef4444" }}>{sol.eslManilhaUsoPercent?.toFixed(1)}%</strong></div>
            <div>Compatível: <strong style={{ color: sol.eslManilhaCompativel ? "#22c55e" : "#ef4444" }}>{sol.eslManilhaCompativel ? "Sim" : "Não"}</strong></div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={S.app}>
      {showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
      {/* Header do painel admin */}
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onVoltar} style={{ ...S.logoutBtn(isMobile), borderColor: "#f59e0b44", color: "#f59e0b" }}>← Voltar</button>
            <div>
              <div style={S.logoText(isMobile)}>Painel Administrativo</div>
              <div style={S.logoSub(isMobile)}>{user?.empresaName || "RiggingCheck"}</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            <div style={S.roleBadge(isMobile)}>{roleLabel(user?.role)}</div>
            <div style={S.userBadge(isMobile)}>{user?.userName}</div>
            <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => setShowModalSenha(true)}>
              {isMobile ? "🔑" : "Alterar Senha"}
            </button>
          </div>
        </div>
        {/* Navegação principal do painel */}
        <div style={S.tabs(isMobile)}>
          <button style={S.tab(painel === "solicitacoes", isMobile)} onClick={() => setPainel("solicitacoes")}>📋 Solicitações</button>
          {user?.role === "ADMIN_EMPRESA" && (
            <button style={S.tab(painel === "equipe", isMobile)} onClick={() => setPainel("equipe")}>👥 Equipe</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>

        {/* ── PAINEL SOLICITAÇÕES ── */}
        {painel === "solicitacoes" && (
          <>
            {/* Filtro de status */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {["ANALISAR", "PROSSEGUIR", "PARAR", "TODOS"].map(s => (
                <button key={s} style={S.tab(statusFiltro === s, isMobile)} onClick={() => setStatusFiltro(s)}>{s}</button>
              ))}
              <button onClick={() => carregar(statusFiltro)} style={{ ...S.tab(false, isMobile), marginLeft: 4 }}>↻</button>
            </div>

            {loadingSol && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Carregando...</div>}

            {!loadingSol && lista.length === 0 && (
              <div style={{ ...S.normaBox, textAlign: "center", padding: 36 }}>
                Nenhuma solicitação com status "{statusFiltro}".
              </div>
            )}

            {!loadingSol && Object.entries(grupos).map(([empresa, solicitacoes]) => (
              <div key={empresa}>
                {isSuperAdmin && (
                  <div style={{ fontSize: 11, color: "#f59e0b", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12, marginTop: 24, display: "flex", alignItems: "center", gap: 8 }}>
                    🏢 {empresa}
                    <span style={{ color: "#475569", fontWeight: 400 }}>({solicitacoes.length} solicitação{solicitacoes.length !== 1 ? "ões" : ""})</span>
                  </div>
                )}
                {solicitacoes.map(sol => (
                  <div key={sol.id} style={{ background: "#0f0f1a", border: `1px solid ${statusColor(sol.status)}22`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 15 }}>OS: {sol.operacaoOs}</div>
                        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Rigger: {sol.riggerNome}</div>
                        <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                          Solicitado em: {new Date(sol.criadoEm).toLocaleString("pt-BR")}
                        </div>
                        {sol.resolvidoEm && (
                          <div style={{ color: "#475569", fontSize: 11 }}>
                            Resolvido em: {new Date(sol.resolvidoEm).toLocaleString("pt-BR")} por {sol.aprovadoPorNome}
                          </div>
                        )}
                        {sol.observacao && (
                          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Obs: "{sol.observacao}"</div>
                        )}
                      </div>
                      <div style={S.riskBadge(statusColor(sol.status))}>{sol.status}</div>
                    </div>

                    {cardTecnico(sol)}

                    {sol.status === "ANALISAR" && (
                      <div style={{ marginTop: 16 }}>
                        <input
                          style={{ ...S.input, fontSize: 12, padding: "8px 12px", width: "100%", boxSizing: "border-box" }}
                          placeholder="Observação (opcional)"
                          value={obs[sol.id] || ""}
                          onChange={e => setObs(o => ({ ...o, [sol.id]: e.target.value }))}
                        />
                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          <button
                            style={{ ...S.btn(false), background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#000", padding: "10px 24px" }}
                            onClick={() => resolver(sol.id, "aprovar")}>
                            ✅ Autorizar Içamento
                          </button>
                          <button
                            style={{ ...S.btn(false), background: "rgba(239,68,68,0.12)", border: "1px solid #ef444466", color: "#ef4444", padding: "10px 24px" }}
                            onClick={() => resolver(sol.id, "negar")}>
                            🚫 Negar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* ── PAINEL EQUIPE ── */}
        {painel === "equipe" && (
          <>
            {/* Formulário novo usuário */}
            <div style={{ background: "#0f0f1a", border: "1px solid #1e2a3a", borderRadius: 12, padding: 24, marginBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 16, letterSpacing: "1px", textTransform: "uppercase" }}>
                + Novo Usuário
              </div>
              <div style={S.grid()}>
                <div style={S.field}>
                  <label style={S.label}>Nome completo</label>
                  <input style={S.input} placeholder="João da Silva" value={novoForm.nome}
                    onChange={e => setNovoForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>E-mail</label>
                  <input style={S.input} type="email" placeholder="joao@empresa.com" value={novoForm.email}
                    onChange={e => setNovoForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Senha</label>
                  <input style={S.input} type="password" placeholder="mínimo 6 caracteres" value={novoForm.senha}
                    onChange={e => setNovoForm(f => ({ ...f, senha: e.target.value }))} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Cargo</label>
                  <select style={{ ...S.input, cursor: "pointer" }} value={novoForm.role}
                    onChange={e => setNovoForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="RIGGER">Rigger</option>
                    <option value="OPERADOR_GUINDASTE">Operador de Guindaste</option>
                    <option value="LIDER_EQUIPE">Líder de Equipe</option>
                    <option value="GERENTE_OPERACOES">Gerente de Operações</option>
                    {isSuperAdmin && <option value="ADMIN_EMPRESA">Admin Empresa</option>}
                  </select>
                </div>
              </div>
              {erroEq && <div style={{ ...S.errorBox, marginTop: 12 }}>{erroEq}</div>}
              {sucEq && <div style={{ ...S.successBox, marginTop: 12 }}>{sucEq}</div>}
              <button style={{ ...S.btn(true), marginTop: 16 }} onClick={criarFuncionario}>
                Criar Usuário
              </button>
            </div>

            {/* Lista de usuários */}
            <div style={{ fontSize: 11, color: "#475569", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>
              Membros da equipe
            </div>
            {loadingEq && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Carregando...</div>}
            {!loadingEq && equipe.length === 0 && (
              <div style={{ ...S.normaBox, textAlign: "center", padding: 36 }}>
                Nenhum membro cadastrado ainda.
              </div>
            )}
            {equipe.map(f => (
              <div key={f.id} style={{ background: "#0f0f1a", border: `1px solid ${f.ativo ? "#1e2a3a" : "#2d0000"}`, borderRadius: 12, padding: 18, marginBottom: 12 }}>
                {editandoId === f.id ? (
                  <div>
                    <div style={S.grid()}>
                      <div style={S.field}>
                        <label style={S.label}>Nome</label>
                        <input style={S.input} value={editForm.nome} onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} />
                      </div>
                      <div style={S.field}>
                        <label style={S.label}>E-mail</label>
                        <input style={S.input} type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div style={S.field}>
                        <label style={S.label}>Cargo</label>
                        <select style={{ ...S.input, cursor: "pointer" }} value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                          <option value="RIGGER">Rigger</option>
                          <option value="OPERADOR_GUINDASTE">Operador de Guindaste</option>
                          <option value="LIDER_EQUIPE">Líder de Equipe</option>
                          <option value="GERENTE_OPERACOES">Gerente de Operações</option>
                          {isSuperAdmin && <option value="ADMIN_EMPRESA">Admin Empresa</option>}
                        </select>
                      </div>
                    </div>
                    {erroEdit && <div style={{ ...S.errorBox, marginTop: 8 }}>{erroEdit}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button style={{ ...S.btn(true), padding: "8px 18px", fontSize: 13 }} onClick={salvarEdicao}>Salvar</button>
                      <button style={{ ...S.btn(false), padding: "8px 18px", fontSize: 13 }} onClick={() => setEditandoId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: f.ativo ? "#e2e8f0" : "#475569", fontSize: 14 }}>{f.nome}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{f.email}</div>
                      <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ background: "#1e2a3a", color: "#38bdf8", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
                          {roleLabel(f.role)}
                        </span>
                        {!f.ativo && (
                          <span style={{ background: "#2d0000", color: "#ef4444", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
                            Inativo
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => iniciarEdicao(f)}
                        style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid #1e3a5a", cursor: "pointer", background: "rgba(56,189,248,0.08)", color: "#38bdf8" }}>
                        Editar
                      </button>
                      <button
                        onClick={() => alternarAtivo(f.id, f.ativo)}
                        style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid", cursor: "pointer",
                          background: f.ativo ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                          borderColor: f.ativo ? "#ef444444" : "#22c55e44",
                          color: f.ativo ? "#ef4444" : "#22c55e" }}>
                        {f.ativo ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        <div style={{ ...S.normaBox, textAlign: "center", marginTop: 32 }}>
          v2.0.0 — RiggingCheck Fullstack &nbsp;·&nbsp; React + Java Spring Boot + PostgreSQL
        </div>
      </div>
    </div>
  );
}

// ── SUPER ADMIN DASHBOARD (SaaS — apenas SUPER_ADMIN) ───────────────────────────
function SuperAdminDashboard({ onVoltar, isMobile }) {
  const user = getUser();
  const [painel, setPainel] = useState("visao-geral");
  const [showModalSenha, setShowModalSenha] = useState(false);
  const C = "#a78bfa"; // cor SaaS

  // ── Estado global ──
  const [empresas, setEmpresas]     = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(true);

  // ── Cadastro de empresa ──
  const [novaEmp, setNovaEmp] = useState({ razaoSocial: "", cnpj: "", adminNome: "", adminEmail: "", adminSenha: "" });
  const [erroEmp, setErroEmp] = useState(null);
  const [sucEmp, setSucEmp]   = useState(null);
  const [criando, setCriando] = useState(false);

  // ── Segurança ──
  const [chave, setChave]               = useState("");
  const [loadingChave, setLoadingChave] = useState(false);
  const [chaveGerada, setChaveGerada]   = useState(false);

  // ── Detalhe da empresa selecionada ──
  const [empresaSel, setEmpresaSel]     = useState(null);
  const [detalheTab, setDetalheTab]     = useState("funcionarios");

  // ── Funcionários da empresa selecionada ──
  const [funcionarios, setFuncionarios]   = useState([]);
  const [loadingFuncs, setLoadingFuncs]   = useState(false);
  const [novoFunc, setNovoFunc]           = useState({ nome: "", email: "", senha: "", role: "RIGGER" });
  const [erroFunc, setErroFunc]           = useState(null);
  const [sucFunc, setSucFunc]             = useState(null);
  const [criandoFunc, setCriandoFunc]     = useState(false);
  const [mostrarFormFunc, setMostrarFormFunc] = useState(false);
  const [editandoFuncId, setEditandoFuncId] = useState(null);
  const [editFuncForm, setEditFuncForm]     = useState({ nome: "", email: "", role: "RIGGER" });
  const [erroEditFunc, setErroEditFunc]     = useState(null);

  const carregarEmpresas = useCallback(async () => {
    setLoadingEmp(true);
    try {
      const res = await authFetch(`${API}/api/admin/empresas`);
      if (res.ok) setEmpresas(await res.json());
    } catch { /* ignora */ }
    setLoadingEmp(false);
  }, []);

  const carregarChave = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/api/admin/chave`);
      if (res.ok) { const d = await res.json(); setChave(d.chave || ""); }
    } catch { /* ignora */ }
  }, []);

  const carregarFuncionarios = useCallback(async (empresaId) => {
    setLoadingFuncs(true);
    try {
      const res = await authFetch(`${API}/api/admin/empresas/${empresaId}/funcionarios`);
      if (res.ok) setFuncionarios(await res.json());
    } catch { /* ignora */ }
    setLoadingFuncs(false);
  }, []);

  useEffect(() => { carregarEmpresas(); }, [carregarEmpresas]);
  useEffect(() => { if (painel === "seguranca") carregarChave(); }, [painel, carregarChave]);
  useEffect(() => {
    if (empresaSel) { carregarFuncionarios(empresaSel.id); setDetalheTab("funcionarios"); setMostrarFormFunc(false); setErroFunc(null); setSucFunc(null); }
  }, [empresaSel, carregarFuncionarios]);

  const criarEmpresa = async () => {
    setErroEmp(null); setSucEmp(null); setCriando(true);
    try {
      const res = await authFetch(`${API}/api/admin/empresas`, {
        method: "POST", body: JSON.stringify(novaEmp),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroEmp(data.error || "Erro ao cadastrar empresa."); setCriando(false); return; }
      setSucEmp(`Empresa "${data.razaoSocial}" cadastrada com sucesso!`);
      setNovaEmp({ razaoSocial: "", cnpj: "", adminNome: "", adminEmail: "", adminSenha: "" });
      carregarEmpresas();
      setPainel("empresas");
    } catch { setErroEmp("Erro de conexão."); }
    setCriando(false);
  };

  const alternarEmpresa = async (id, ativo) => {
    try {
      await authFetch(`${API}/api/admin/empresas/${id}/${ativo ? "desativar" : "ativar"}`, { method: "POST" });
      setEmpresas(p => p.map(e => e.id === id ? { ...e, ativo: !ativo } : e));
      if (empresaSel?.id === id) setEmpresaSel(p => ({ ...p, ativo: !ativo }));
    } catch { /* ignora */ }
  };

  const gerarChave = async () => {
    setLoadingChave(true);
    try {
      const res = await authFetch(`${API}/api/admin/chave/gerar`, { method: "POST" });
      if (res.ok) { const d = await res.json(); setChave(d.chave); setChaveGerada(true); }
    } catch { /* ignora */ }
    setLoadingChave(false);
  };

  const criarFuncionario = async () => {
    if (!novoFunc.nome.trim() || !novoFunc.email.trim() || !novoFunc.senha.trim()) {
      setErroFunc("Preencha nome, e-mail e senha."); return;
    }
    setCriandoFunc(true); setErroFunc(null); setSucFunc(null);
    try {
      const res = await authFetch(`${API}/api/admin/empresas/${empresaSel.id}/funcionarios`, {
        method: "POST", body: JSON.stringify(novoFunc),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroFunc(data.error || "Erro ao criar funcionário."); setCriandoFunc(false); return; }
      setSucFunc(`Funcionário "${data.nome}" criado com sucesso!`);
      setNovoFunc({ nome: "", email: "", senha: "", role: "RIGGER" });
      setMostrarFormFunc(false);
      carregarFuncionarios(empresaSel.id);
      // atualiza contagem na lista de empresas
      setEmpresas(p => p.map(e => e.id === empresaSel.id ? { ...e, totalFuncionarios: (e.totalFuncionarios || 0) + 1 } : e));
    } catch { setErroFunc("Erro de conexão."); }
    setCriandoFunc(false);
  };

  const alternarStatusFunc = async (func) => {
    const acao = func.ativo ? "desativar" : "reativar";
    try {
      await authFetch(`${API}/api/admin/empresas/${empresaSel.id}/funcionarios/${func.id}/${acao}`, { method: "POST" });
      setFuncionarios(p => p.map(f => f.id === func.id ? { ...f, ativo: !func.ativo } : f));
    } catch { /* ignora */ }
  };

  const iniciarEdicaoFunc = (f) => {
    setEditandoFuncId(f.id);
    setEditFuncForm({ nome: f.nome, email: f.email, role: f.role });
    setErroEditFunc(null);
  };

  const salvarEdicaoFunc = async () => {
    setErroEditFunc(null);
    try {
      const res = await authFetch(`${API}/api/admin/empresas/${empresaSel.id}/funcionarios/${editandoFuncId}`, {
        method: "PUT",
        body: JSON.stringify(editFuncForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroEditFunc(data.error || "Erro ao salvar alterações."); return; }
      setEditandoFuncId(null);
      carregarFuncionarios(empresaSel.id);
    } catch { setErroEditFunc("Erro de conexão."); }
  };

  // ── métricas gerais ──
  const totalEmpresas   = empresas.length;
  const empAtivas       = empresas.filter(e => e.ativo !== false).length;
  const empInativas     = totalEmpresas - empAtivas;
  const totalFunc       = empresas.reduce((s, e) => s + (e.totalFuncionarios || 0), 0);
  const totalLib        = empresas.reduce((s, e) => s + (e.totalLiberacoes || 0), 0);
  const libPendentes    = empresas.reduce((s, e) => s + (e.liberacoesAnalisar || 0), 0);

  const StatCard = ({ label, value, color, sub }) => (
    <div style={{
      background: "#0f0f1a", border: `1px solid ${color}22`,
      borderRadius: 12, padding: "20px 24px", flex: "1 1 160px",
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const TABS = [
    ["visao-geral", "📊 Visão Geral"],
    ["empresas",    "🏢 Empresas"],
    ["cadastrar",   "➕ Nova Empresa"],
    ["seguranca",   "🔐 Segurança"],
  ];

  return (
    <div style={S.app}>
      {showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
      {/* ── Header ── */}
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onVoltar} style={{ ...S.logoutBtn(isMobile), borderColor: `${C}44`, color: C }}>← Sair</button>
            <div>
              <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 800, color: C, letterSpacing: "0.5px" }}>
                RiggingCheck
                <span style={{ color: "#64748b", fontWeight: 400 }}> / SaaS</span>
              </div>
              <div style={S.logoSub(isMobile)}>Painel de Controle do Sistema</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            <div style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, border: `1px solid ${C}44`, color: C, fontWeight: 700, letterSpacing: "1px" }}>
              SUPER ADMIN
            </div>
            <div style={S.userBadge(isMobile)}>{user?.userName}</div>
            <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => setShowModalSenha(true)}>
              {isMobile ? "🔑" : "Alterar Senha"}
            </button>
          </div>
        </div>
        <div style={S.tabs(isMobile)}>
          {TABS.map(([id, label]) => (
            <button key={id} style={{
              ...S.tab(painel === id, isMobile),
              ...(id === "cadastrar" ? { color: painel === id ? "#fff" : C, borderColor: painel === id ? C : `${C}33` } : {}),
            }} onClick={() => { setPainel(id); setEmpresaSel(null); setSucEmp(null); setErroEmp(null); }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "24px 16px" : "36px 24px" }}>

        {/* ══════════════ VISÃO GERAL ══════════════ */}
        {painel === "visao-geral" && (
          <>
            {/* Stats */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard label="Total de Empresas"    value={totalEmpresas} color={C}          sub={`${empAtivas} ativa${empAtivas!==1?"s":""}`} />
              <StatCard label="Empresas Ativas"      value={empAtivas}     color="#22c55e"     sub="em operação" />
              <StatCard label="Empresas Inativas"    value={empInativas}   color="#ef4444"     sub="suspensas" />
              <StatCard label="Funcionários Ativos"  value={totalFunc}     color="#38bdf8"     sub="em todas as empresas" />
              <StatCard label="Total Solicitações"   value={totalLib}      color="#f59e0b"     sub={`${libPendentes} pendente${libPendentes!==1?"s":""}`} />
            </div>

            {/* Atividade recente */}
            <div style={{ fontSize: 11, color: "#475569", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>
              Últimas empresas cadastradas
            </div>

            {loadingEmp && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Carregando...</div>}

            {!loadingEmp && empresas.length === 0 && (
              <div style={{ ...S.normaBox, textAlign: "center", padding: 40 }}>
                Nenhuma empresa cadastrada ainda.{" "}
                <span style={{ color: C, cursor: "pointer" }} onClick={() => setPainel("cadastrar")}>
                  Cadastrar agora →
                </span>
              </div>
            )}

            {empresas.slice(0, 5).map(emp => (
              <div
                key={emp.id}
                onClick={() => { setEmpresaSel(emp); setPainel("empresas"); }}
                style={{
                  background: "#0f0f1a", border: `1px solid ${emp.ativo !== false ? "#1e2a3a" : "#2d0000"}`,
                  borderRadius: 10, padding: "14px 18px", marginBottom: 10, cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 12, transition: "border-color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${C}55`}
                onMouseLeave={e => e.currentTarget.style.borderColor = emp.ativo !== false ? "#1e2a3a" : "#2d0000"}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: emp.ativo !== false ? "#e2e8f0" : "#475569" }}>
                    {emp.razaoSocial}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>
                    CNPJ {emp.cnpj} · Admin: {emp.adminNome}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    👥 {emp.totalFuncionarios}
                  </span>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
                    background: emp.ativo !== false ? "#052e16" : "#2d0000",
                    color: emp.ativo !== false ? "#22c55e" : "#ef4444",
                  }}>
                    {emp.ativo !== false ? "ATIVA" : "INATIVA"}
                  </span>
                </div>
              </div>
            ))}

            {empresas.length > 5 && (
              <button
                onClick={() => setPainel("empresas")}
                style={{ ...S.btn(false), background: "transparent", border: `1px solid ${C}33`, color: C, width: "100%", marginTop: 4 }}>
                Ver todas as {empresas.length} empresas →
              </button>
            )}

            {/* Ação rápida */}
            <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setPainel("cadastrar")}
                style={{ ...S.btn(false), background: `linear-gradient(135deg, ${C}, #7c3aed)`, color: "#fff", flex: "1 1 200px" }}>
                ➕ Cadastrar Nova Empresa
              </button>
              <button
                onClick={() => setPainel("seguranca")}
                style={{ ...S.btn(false), background: "transparent", border: `1px solid #334155`, color: "#94a3b8", flex: "1 1 200px" }}>
                🔐 Gerenciar Segurança
              </button>
            </div>
          </>
        )}

        {/* ══════════════ LISTA DE EMPRESAS ══════════════ */}
        {painel === "empresas" && !empresaSel && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C, letterSpacing: "1px", textTransform: "uppercase" }}>
                  Todas as Empresas
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {totalEmpresas} empresa{totalEmpresas !== 1 ? "s" : ""} · {empAtivas} ativa{empAtivas !== 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={() => setPainel("cadastrar")}
                style={{ ...S.btn(false), background: `linear-gradient(135deg, ${C}, #7c3aed)`, color: "#fff", padding: "10px 20px" }}>
                ➕ Nova Empresa
              </button>
            </div>

            {loadingEmp && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Carregando...</div>}
            {!loadingEmp && empresas.length === 0 && (
              <div style={{ ...S.normaBox, textAlign: "center", padding: 40 }}>
                Nenhuma empresa cadastrada.
              </div>
            )}

            {empresas.map(emp => (
              <div key={emp.id} style={{
                background: "#0f0f1a",
                border: `1px solid ${emp.ativo !== false ? "#1e2a3a" : "#2d0000"}`,
                borderRadius: 12, padding: 20, marginBottom: 14,
              }}>
                {/* Linha principal */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700, color: emp.ativo !== false ? "#e2e8f0" : "#475569", fontSize: 15 }}>
                        {emp.razaoSocial}
                      </div>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
                        background: emp.ativo !== false ? "#052e16" : "#2d0000",
                        color: emp.ativo !== false ? "#22c55e" : "#ef4444",
                      }}>
                        {emp.ativo !== false ? "ATIVA" : "INATIVA"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>CNPJ: {emp.cnpj}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      Admin: <span style={{ color: "#94a3b8" }}>{emp.adminNome}</span>
                      {" · "}<span style={{ color: "#64748b" }}>{emp.adminEmail}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={() => { setEmpresaSel(emp); }}
                      style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C}33`, cursor: "pointer", background: `${C}0f`, color: C }}>
                      Ver detalhes
                    </button>
                    <button
                      onClick={() => alternarEmpresa(emp.id, emp.ativo !== false)}
                      style={{
                        fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px solid", cursor: "pointer",
                        background: emp.ativo !== false ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                        borderColor: emp.ativo !== false ? "#ef444444" : "#22c55e44",
                        color: emp.ativo !== false ? "#ef4444" : "#22c55e",
                      }}>
                      {emp.ativo !== false ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </div>

                {/* Métricas da empresa */}
                <div style={{
                  marginTop: 14, display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10,
                }}>
                  {[
                    { label: "Funcionários", value: emp.totalFuncionarios, color: "#38bdf8" },
                    { label: "Solicitações", value: emp.totalLiberacoes ?? 0, color: "#f59e0b" },
                    { label: "Aprovadas", value: emp.liberacoesProsseguir ?? 0, color: "#22c55e" },
                    { label: "Negadas", value: emp.liberacoesParar ?? 0, color: "#ef4444" },
                    { label: "Pendentes", value: emp.liberacoesAnalisar ?? 0, color: "#a78bfa" },
                    { label: "Cadastrada em", value: emp.criadoEm ? new Date(emp.criadoEm).toLocaleDateString("pt-BR") : "—", color: "#64748b" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "#0a0a0f", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ══════════════ DETALHE DA EMPRESA ══════════════ */}
        {painel === "empresas" && empresaSel && (
          <>
            <button
              onClick={() => setEmpresaSel(null)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
              ← Voltar para lista
            </button>

            {/* Header da empresa */}
            <div style={{ background: "#0f0f1a", border: `1px solid ${empresaSel.ativo !== false ? C + "33" : "#2d0000"}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>{empresaSel.razaoSocial}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>CNPJ: {empresaSel.cnpj} · Admin: {empresaSel.adminNome} · {empresaSel.adminEmail}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    Cadastrada em: {empresaSel.criadoEm ? new Date(empresaSel.criadoEm).toLocaleString("pt-BR") : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, fontWeight: 700, background: empresaSel.ativo !== false ? "#052e16" : "#2d0000", color: empresaSel.ativo !== false ? "#22c55e" : "#ef4444" }}>
                    {empresaSel.ativo !== false ? "ATIVA" : "INATIVA"}
                  </span>
                  <button
                    onClick={() => alternarEmpresa(empresaSel.id, empresaSel.ativo !== false)}
                    style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid", cursor: "pointer", background: empresaSel.ativo !== false ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", borderColor: empresaSel.ativo !== false ? "#ef444444" : "#22c55e44", color: empresaSel.ativo !== false ? "#ef4444" : "#22c55e" }}>
                    {empresaSel.ativo !== false ? "Desativar empresa" : "Reativar empresa"}
                  </button>
                </div>
              </div>

              {/* Stats da empresa */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                {[
                  { label: "Funcionários", value: empresaSel.totalFuncionarios ?? 0, color: "#38bdf8" },
                  { label: "Solicitações", value: empresaSel.totalLiberacoes ?? 0, color: "#f59e0b" },
                  { label: "Aprovadas", value: empresaSel.liberacoesProsseguir ?? 0, color: "#22c55e" },
                  { label: "Negadas", value: empresaSel.liberacoesParar ?? 0, color: "#ef4444" },
                  { label: "Pendentes", value: empresaSel.liberacoesAnalisar ?? 0, color: C },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#0a0a0f", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button style={S.tab(detalheTab === "funcionarios", isMobile)} onClick={() => setDetalheTab("funcionarios")}>👥 Funcionários</button>
              <button style={S.tab(detalheTab === "liberacoes", isMobile)} onClick={() => setDetalheTab("liberacoes")}>📋 Resumo de Solicitações</button>
            </div>

            {/* ── Funcionários ── */}
            {detalheTab === "funcionarios" && (
              <>
                {sucFunc && <div style={{ ...S.successBox, marginBottom: 12 }}>{sucFunc}</div>}

                {/* Botão adicionar */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <button
                    onClick={() => { setMostrarFormFunc(v => !v); setErroFunc(null); setSucFunc(null); }}
                    style={{ ...S.btn(false), background: `linear-gradient(135deg, ${C}, #7c3aed)`, color: "#fff", padding: "10px 20px" }}>
                    {mostrarFormFunc ? "✕ Cancelar" : "➕ Novo Funcionário"}
                  </button>
                </div>

                {/* Formulário de novo funcionário */}
                {mostrarFormFunc && (
                  <div style={{ background: "#0f0f1a", border: `1px solid ${C}33`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: C, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>Novo Funcionário</div>
                    <div style={S.grid()}>
                      <div style={S.field}>
                        <label style={S.label}>Nome Completo</label>
                        <input style={{ ...S.input, borderColor: `${C}33` }} placeholder="João da Silva"
                          value={novoFunc.nome} onChange={e => setNovoFunc(p => ({ ...p, nome: e.target.value }))} />
                      </div>
                      <div style={S.field}>
                        <label style={S.label}>E-mail</label>
                        <input style={{ ...S.input, borderColor: `${C}33` }} type="email" placeholder="joao@empresa.com"
                          value={novoFunc.email} onChange={e => setNovoFunc(p => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div style={S.field}>
                        <label style={S.label}>Senha Inicial (mín. 6 caracteres)</label>
                        <input style={{ ...S.input, borderColor: `${C}33` }} type="password" placeholder="••••••"
                          value={novoFunc.senha} onChange={e => setNovoFunc(p => ({ ...p, senha: e.target.value }))} />
                      </div>
                      <div style={S.field}>
                        <label style={S.label}>Cargo</label>
                        <select style={{ ...S.select, borderColor: `${C}33` }}
                          value={novoFunc.role} onChange={e => setNovoFunc(p => ({ ...p, role: e.target.value }))}>
                          <option value="RIGGER">Rigger</option>
                          <option value="OPERADOR_GUINDASTE">Operador de Guindaste</option>
                          <option value="LIDER_EQUIPE">Líder de Equipe</option>
                          <option value="GERENTE_OPERACOES">Gerente de Operações</option>
                          <option value="ADMIN_EMPRESA">Admin Empresa</option>
                        </select>
                      </div>
                    </div>
                    {erroFunc && <div style={{ ...S.errorBox, marginTop: 12 }}>{erroFunc}</div>}
                    <button style={{ ...S.btn(criandoFunc), background: `linear-gradient(135deg, ${C}, #7c3aed)`, color: "#fff", marginTop: 16 }}
                      onClick={criarFuncionario} disabled={criandoFunc}>
                      {criandoFunc ? "Criando..." : "Criar Funcionário"}
                    </button>
                  </div>
                )}

                {/* Lista de funcionários */}
                {loadingFuncs && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Carregando funcionários...</div>}
                {!loadingFuncs && funcionarios.length === 0 && (
                  <div style={{ ...S.normaBox, textAlign: "center", padding: 32 }}>Nenhum funcionário cadastrado nesta empresa.</div>
                )}
                {funcionarios.map(f => (
                  <div key={f.id} style={{ background: "#0f0f1a", border: `1px solid ${f.ativo !== false ? "#1e2a3a" : "#2d0000"}`, borderRadius: 10, padding: "14px 18px", marginBottom: 10 }}>
                    {editandoFuncId === f.id ? (
                      <div>
                        <div style={S.grid()}>
                          <div style={S.field}>
                            <label style={S.label}>Nome</label>
                            <input style={{ ...S.input, borderColor: `${C}33` }} value={editFuncForm.nome} onChange={e => setEditFuncForm(p => ({ ...p, nome: e.target.value }))} />
                          </div>
                          <div style={S.field}>
                            <label style={S.label}>E-mail</label>
                            <input style={{ ...S.input, borderColor: `${C}33` }} type="email" value={editFuncForm.email} onChange={e => setEditFuncForm(p => ({ ...p, email: e.target.value }))} />
                          </div>
                          <div style={S.field}>
                            <label style={S.label}>Cargo</label>
                            <select style={{ ...S.select, borderColor: `${C}33` }} value={editFuncForm.role} onChange={e => setEditFuncForm(p => ({ ...p, role: e.target.value }))}>
                              <option value="RIGGER">Rigger</option>
                              <option value="OPERADOR_GUINDASTE">Operador de Guindaste</option>
                              <option value="LIDER_EQUIPE">Líder de Equipe</option>
                              <option value="GERENTE_OPERACOES">Gerente de Operações</option>
                              <option value="ADMIN_EMPRESA">Admin Empresa</option>
                            </select>
                          </div>
                        </div>
                        {erroEditFunc && <div style={{ ...S.errorBox, marginTop: 8 }}>{erroEditFunc}</div>}
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button style={{ ...S.btn(true), background: `linear-gradient(135deg, ${C}, #7c3aed)`, color: "#fff", padding: "8px 18px", fontSize: 13 }} onClick={salvarEdicaoFunc}>Salvar</button>
                          <button style={{ ...S.btn(false), padding: "8px 18px", fontSize: 13 }} onClick={() => setEditandoFuncId(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: f.ativo !== false ? "#e2e8f0" : "#475569", fontSize: 14 }}>{f.nome}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{f.email}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                            <span style={{ background: "#1e2a3a", color: "#38bdf8", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
                              {roleLabel(f.role)}
                            </span>
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700, background: f.ativo !== false ? "#052e16" : "#2d0000", color: f.ativo !== false ? "#22c55e" : "#ef4444" }}>
                              {f.ativo !== false ? "ATIVO" : "INATIVO"}
                            </span>
                            {f.criadoEm && <span style={{ fontSize: 10, color: "#475569" }}>desde {new Date(f.criadoEm).toLocaleDateString("pt-BR")}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => iniciarEdicaoFunc(f)}
                            style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C}44`, cursor: "pointer", background: `${C}11`, color: C }}>
                            Editar
                          </button>
                          <button
                            onClick={() => alternarStatusFunc(f)}
                            style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px solid", cursor: "pointer", background: f.ativo !== false ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", borderColor: f.ativo !== false ? "#ef444444" : "#22c55e44", color: f.ativo !== false ? "#ef4444" : "#22c55e" }}>
                            {f.ativo !== false ? "Desativar" : "Reativar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ── Resumo de Solicitações ── */}
            {detalheTab === "liberacoes" && (
              <div style={{ background: "#0f0f1a", border: "1px solid #1e2a3a", borderRadius: 12, padding: 28 }}>
                <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 20 }}>
                  Histórico de Solicitações — {empresaSel.razaoSocial}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                  {[
                    { label: "Total de Solicitações", value: empresaSel.totalLiberacoes ?? 0, color: "#f59e0b", icon: "📋" },
                    { label: "Içamentos Autorizados", value: empresaSel.liberacoesProsseguir ?? 0, color: "#22c55e", icon: "✅" },
                    { label: "Içamentos Negados", value: empresaSel.liberacoesParar ?? 0, color: "#ef4444", icon: "🚫" },
                    { label: "Aguardando Análise", value: empresaSel.liberacoesAnalisar ?? 0, color: C, icon: "⏳" },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} style={{ background: "#0a0a0f", borderRadius: 12, padding: "20px 18px", textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color, marginBottom: 6 }}>{value}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
                    </div>
                  ))}
                </div>
                {(empresaSel.totalLiberacoes ?? 0) > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>Taxa de aprovação</div>
                    <div style={S.progressBar}>
                      <div style={S.progressFill(
                        ((empresaSel.liberacoesProsseguir ?? 0) / (empresaSel.totalLiberacoes ?? 1)) * 100,
                        "#22c55e"
                      )} />
                    </div>
                    <div style={{ fontSize: 13, color: "#22c55e", marginTop: 6, fontWeight: 700 }}>
                      {(((empresaSel.liberacoesProsseguir ?? 0) / (empresaSel.totalLiberacoes ?? 1)) * 100).toFixed(1)}% aprovados
                    </div>
                  </div>
                )}
                {(empresaSel.totalLiberacoes ?? 0) === 0 && (
                  <div style={{ ...S.normaBox, textAlign: "center", marginTop: 16 }}>
                    Nenhuma solicitação registrada ainda nesta empresa.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══════════════ CADASTRAR EMPRESA ══════════════ */}
        {painel === "cadastrar" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C, letterSpacing: "1px", textTransform: "uppercase" }}>
                Cadastrar Nova Empresa
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                Preencha os dados abaixo. Um administrador será criado automaticamente para a empresa.
              </div>
            </div>

            <div style={{ background: "#0f0f1a", border: `1px solid ${C}22`, borderRadius: 14, padding: isMobile ? 20 : 32 }}>
              <div style={{ fontSize: 11, color: C, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 20 }}>
                Dados da Empresa
              </div>
              <div style={S.grid()}>
                <div style={S.field}>
                  <label style={S.label}>Razão Social</label>
                  <input style={{ ...S.input, borderColor: `${C}33` }} placeholder="Nome da Empresa Ltda"
                    value={novaEmp.razaoSocial} onChange={e => setNovaEmp(p => ({ ...p, razaoSocial: e.target.value }))} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>CNPJ</label>
                  <input style={{ ...S.input, borderColor: `${C}33` }} placeholder="00.000.000/0001-00"
                    value={novaEmp.cnpj} onChange={e => setNovaEmp(p => ({ ...p, cnpj: e.target.value }))} />
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", margin: "24px 0 16px" }}>
                Administrador da Empresa
              </div>
              <div style={S.grid()}>
                <div style={S.field}>
                  <label style={S.label}>Nome Completo</label>
                  <input style={{ ...S.input, borderColor: `${C}33` }} placeholder="Nome do responsável"
                    value={novaEmp.adminNome} onChange={e => setNovaEmp(p => ({ ...p, adminNome: e.target.value }))} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>E-mail</label>
                  <input style={{ ...S.input, borderColor: `${C}33` }} type="email" placeholder="admin@empresa.com"
                    value={novaEmp.adminEmail} onChange={e => setNovaEmp(p => ({ ...p, adminEmail: e.target.value }))} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Senha Inicial (mín. 8 caracteres)</label>
                  <input style={{ ...S.input, borderColor: `${C}33` }} type="password" placeholder="••••••••"
                    value={novaEmp.adminSenha} onChange={e => setNovaEmp(p => ({ ...p, adminSenha: e.target.value }))} />
                </div>
              </div>

              {erroEmp && <div style={{ ...S.errorBox, marginTop: 20 }}>{erroEmp}</div>}
              {sucEmp  && <div style={{ ...S.successBox, marginTop: 20 }}>{sucEmp}</div>}

              <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  style={{ ...S.btn(criando), background: `linear-gradient(135deg, ${C}, #7c3aed)`, color: "#fff", flex: "1 1 160px" }}
                  onClick={criarEmpresa} disabled={criando}>
                  {criando ? "Cadastrando..." : "Cadastrar Empresa"}
                </button>
                <button
                  style={{ ...S.btn(false), background: "transparent", border: "1px solid #1e2a3a", color: "#64748b", flex: "1 1 120px" }}
                  onClick={() => { setNovaEmp({ razaoSocial: "", cnpj: "", adminNome: "", adminEmail: "", adminSenha: "" }); setErroEmp(null); setSucEmp(null); }}>
                  Limpar
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════ SEGURANÇA ══════════════ */}
        {painel === "seguranca" && (
          <>
            {/* Chave de API */}
            <div style={{ background: "#0f0f1a", border: `1px solid ${C}33`, borderRadius: 14, padding: 32, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
                🔐 Chave de Segurança SaaS
              </div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.8, marginBottom: 24 }}>
                Chave única que identifica este painel. Use em integrações, chamados de suporte e auditorias de segurança.
                Guarde em local seguro — nunca compartilhe publicamente.
              </div>

              {chave ? (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Chave Atual</div>
                  <div style={{
                    background: "#060610", border: `1px solid ${C}44`, borderRadius: 8,
                    padding: "16px 20px", fontFamily: "monospace", fontSize: 16, letterSpacing: "3px",
                    color: C, wordBreak: "break-all",
                  }}>
                    {chave}
                  </div>
                  {chaveGerada && (
                    <div style={{ ...S.warnBox, marginTop: 12, fontSize: 12 }}>
                      ⚠️ Copie esta chave agora — ao sair da página ela ficará parcialmente oculta.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...S.normaBox, marginBottom: 20, textAlign: "center" }}>
                  Nenhuma chave gerada. Clique abaixo para gerar.
                </div>
              )}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={gerarChave} disabled={loadingChave}
                  style={{ ...S.btn(loadingChave), background: `linear-gradient(135deg, ${C}, #7c3aed)`, color: "#fff" }}>
                  {loadingChave ? "Gerando..." : chave ? "↻ Regenerar Chave" : "Gerar Chave de Segurança"}
                </button>
              </div>
              {chave && (
                <div style={{ marginTop: 10, fontSize: 11, color: "#475569" }}>
                  ⚠️ Regenerar invalida permanentemente a chave anterior.
                </div>
              )}
            </div>

            {/* Info do sistema */}
            <div style={{ background: "#0f0f1a", border: "1px solid #1e2a3a", borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 20 }}>
                Informações do Sistema
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                {[
                  { label: "Administrador",     value: user?.userName },
                  { label: "Role",              value: "SUPER_ADMIN", color: C },
                  { label: "Empresas cadastradas", value: totalEmpresas },
                  { label: "Versão",            value: "v2.1.0 — RiggingCheck SaaS" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#0a0a0f", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 13, color: color || "#94a3b8", fontWeight: color ? 700 : 400 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ ...S.normaBox, textAlign: "center", marginTop: 32 }}>
          RiggingCheck SaaS &nbsp;·&nbsp; v2.1.0 &nbsp;·&nbsp; Painel Super Admin
        </div>
      </div>
    </div>
  );
}

// ── DEMO PAGE ─────────────────────────────────────────────────────────────────────
const _dNow = Date.now();
const DEMO_REQUESTS_DATA = [
  {
    id: "demo-001",
    operacaoOs: "OS-DEMO-001",
    riggerNome: "Carlos Andrade",
    status: "PROSSEGUIR",
    criadoEm: new Date(_dNow - 25 * 60 * 1000).toISOString(),
    resolvidoEm: new Date(_dNow - 18 * 60 * 1000).toISOString(),
    aprovadoPorNome: "Ana Lima",
    observacao: "Operação dentro dos parâmetros de segurança. Prossiga com atenção.",
    capGuindasteKg: 10000, capCargaKg: 6500, capAparelhoKg: 50,
    capTotalKg: 6550, capUsoPercent: 65.5, capRisco: "SAFE",
    eslNumPernas: 2, eslAnguloGraus: 60, eslTensaoPorPernaKg: 3775,
    eslFatorCarga: 1.155, eslRisco: "SAFE", eslAnguloAviso: false,
  },
  {
    id: "demo-002",
    operacaoOs: "OS-DEMO-002",
    riggerNome: "Roberto Santos",
    status: "PARAR",
    criadoEm: new Date(_dNow - 45 * 60 * 1000).toISOString(),
    resolvidoEm: new Date(_dNow - 38 * 60 * 1000).toISOString(),
    aprovadoPorNome: "Carlos Mendes",
    observacao: "Carga excede 85% da capacidade. Ângulo de eslinga crítico (25°). Operação negada.",
    capGuindasteKg: 5000, capCargaKg: 4800, capAparelhoKg: 80,
    capTotalKg: 4880, capUsoPercent: 97.6, capRisco: "DANGER",
    eslNumPernas: 2, eslAnguloGraus: 25, eslTensaoPorPernaKg: 5680,
    eslFatorCarga: 2.366, eslRisco: "DANGER", eslAnguloAviso: true,
  },
  {
    id: "demo-003",
    operacaoOs: "OS-DEMO-003",
    riggerNome: "Maria Costa",
    status: "ANALISAR",
    criadoEm: new Date(_dNow - 5 * 60 * 1000).toISOString(),
    resolvidoEm: null,
    aprovadoPorNome: null,
    observacao: null,
    capGuindasteKg: 8000, capCargaKg: 5200, capAparelhoKg: 60,
    capTotalKg: 5260, capUsoPercent: 65.75, capRisco: "SAFE",
    eslNumPernas: 2, eslAnguloGraus: 50, eslTensaoPorPernaKg: 3435,
    eslFatorCarga: 1.305, eslRisco: "SAFE", eslAnguloAviso: false,
  },
];

const DEMO_USERS_DATA = [
  { id: "du1", nome: "Carlos Andrade",  email: "carlos@demo.com",   role: "RIGGER",       ativo: true  },
  { id: "du2", nome: "Roberto Santos",  email: "roberto@demo.com",  role: "RIGGER",       ativo: true  },
  { id: "du3", nome: "Maria Costa",     email: "maria@demo.com",    role: "OPERADOR",     ativo: true  },
  { id: "du4", nome: "João Silva",      email: "joao@demo.com",     role: "OPERADOR",     ativo: true  },
  { id: "du5", nome: "Ana Lima",        email: "ana@demo.com",      role: "LIDER_EQUIPE", ativo: true  },
  { id: "du6", nome: "Pedro Rocha",     email: "pedro@demo.com",    role: "OPERADOR",     ativo: false },
];



function SolTechCard({ sol }) {
  return (
    <div style={{ marginTop: 14, background: "#0a0a0f", borderRadius: 8, padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Capacidade</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: "#94a3b8" }}>
            <div>Guindaste: <strong style={{ color: "#e2e8f0" }}>{sol.capGuindasteKg?.toLocaleString("pt-BR")} kg</strong></div>
            <div>Carga total: <strong style={{ color: "#e2e8f0" }}>{sol.capTotalKg?.toFixed(0)} kg</strong></div>
            <div>Uso: <strong style={{ color: riskColor(sol.capRisco).color }}>{sol.capUsoPercent?.toFixed(1)}%</strong></div>
            <div>Risco: <strong style={{ color: riskColor(sol.capRisco).color }}>{riskLabel(sol.capRisco)}</strong></div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Eslinga</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: "#94a3b8" }}>
            <div>Pernas: <strong style={{ color: "#e2e8f0" }}>{sol.eslNumPernas}</strong></div>
            <div>Ângulo: <strong style={{ color: sol.eslAnguloAviso ? "#f59e0b" : "#e2e8f0" }}>{sol.eslAnguloGraus}°{sol.eslAnguloAviso ? " ⚠️" : ""}</strong></div>
            <div>Tensão/perna: <strong style={{ color: "#e2e8f0" }}>{sol.eslTensaoPorPernaKg?.toFixed(0)} kg</strong></div>
            {sol.eslWllKg != null && (
              <div>WLL: <strong style={{ color: "#e2e8f0" }}>{sol.eslWllKg?.toLocaleString("pt-BR")} kg</strong>
                {sol.eslWllUsoPercent != null && <span style={{ color: riskColor(sol.eslRisco).color }}> ({sol.eslWllUsoPercent?.toFixed(1)}%)</span>}
              </div>
            )}
            <div>Risco: <strong style={{ color: riskColor(sol.eslRisco).color }}>{riskLabel(sol.eslRisco)}</strong></div>
          </div>
        </div>
      </div>
      {sol.eslTemManilha && (
        <div style={{ borderTop: "1px solid #1e2a3a", marginTop: 10, paddingTop: 10 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Manilha</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12, color: "#94a3b8" }}>
            <div>Capacidade: <strong style={{ color: "#e2e8f0" }}>{sol.eslManilhaCapacidadeKg?.toLocaleString("pt-BR")} kg</strong></div>
            <div>Uso: <strong style={{ color: sol.eslManilhaCompativel ? "#22c55e" : "#ef4444" }}>{sol.eslManilhaUsoPercent?.toFixed(1)}%</strong></div>
            <div>Compatível: <strong style={{ color: sol.eslManilhaCompativel ? "#22c55e" : "#ef4444" }}>{sol.eslManilhaCompativel ? "Sim" : "Não"}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoPage({ onVoltar }) {
  const isMobile = useIsMobile();
  const [mainTab, setMainTab] = useState("rigger");

  // ── ADMIN STATE ──
  const [adminPainel, setAdminPainel] = useState("solicitacoes");
  const [adminRequests, setAdminRequests] = useState(() => DEMO_REQUESTS_DATA.map(r => ({ ...r })));
  const [adminFiltro, setAdminFiltro] = useState("TODOS");
  const [adminObs, setAdminObs] = useState({});
  const [equipe, setEquipe] = useState(() => DEMO_USERS_DATA.map(u => ({ ...u })));
  const [novoForm, setNovoForm] = useState({ nome: "", email: "", role: "RIGGER" });
  const [novoMsg, setNovoMsg] = useState(null);

  // ── RIGGER DEMO STATE ──
  const [riggerExTab, setRiggerExTab] = useState("cap");
  const [demoClChecked, setDemoClChecked] = useState(() => {
    const pre = {};
    CHECKLIST[0].items.forEach((_, ii) => { pre[`0-${ii}`] = true; });
    pre["1-0"] = true; pre["1-1"] = true;
    return pre;
  });

  // ── ADMIN ACTIONS ──
  const resolverAdmin = (id, acao) => {
    setAdminRequests(prev => prev.map(r => r.id !== id ? r : {
      ...r,
      status: acao === "aprovar" ? "PROSSEGUIR" : "PARAR",
      resolvidoEm: new Date().toISOString(),
      aprovadoPorNome: "Demo Admin",
      observacao: adminObs[id] || "",
    }));
    setAdminObs(o => { const n = { ...o }; delete n[id]; return n; });
  };

  const adicionarUser = () => {
    if (!novoForm.nome.trim()) { setNovoMsg({ tipo: "erro", msg: "Informe o nome." }); return; }
    setEquipe(p => [...p, {
      id: `demo-u${Date.now()}`,
      nome: novoForm.nome,
      email: novoForm.email || `${novoForm.nome.toLowerCase().replace(/\s+/g, ".")}@demo.com`,
      role: novoForm.role,
      ativo: true,
    }]);
    setNovoForm({ nome: "", email: "", role: "RIGGER" });
    setNovoMsg({ tipo: "suc", msg: "Usuário adicionado ao demo." });
    setTimeout(() => setNovoMsg(null), 3000);
  };

  const toggleUserAtivo = (id) => setEquipe(p => p.map(u => u.id !== id ? u : { ...u, ativo: !u.ativo }));

  const adminFiltered = adminFiltro === "TODOS" ? adminRequests : adminRequests.filter(r => r.status === adminFiltro);

  // pré-exemplos de capacidade
  const CAP_EX = [
    { label: "Cenário 1 — Operação Segura", crane: 10000, load: 6500, rigging: 50, total: 6550, pct: 65.5, margin: 3450, risk: "SAFE" },
    { label: "Cenário 2 — Atenção Necessária", crane: 8000, load: 7000, rigging: 80, total: 7080, pct: 88.5, margin: 920, risk: "WARNING" },
    { label: "Cenário 3 — Operação Negada", crane: 5000, load: 5200, rigging: 80, total: 5280, pct: 105.6, margin: -280, risk: "DANGER" },
  ];
  // pré-exemplos de lingada
  const SLING_EX = [
    { label: "Cenário 1 — Seguro", load: 6550, legs: 2, angle: 60, tension: 3783, factor: 1.155, risk: "SAFE", warn: false },
    { label: "Cenário 2 — Atenção (ângulo baixo)", load: 7080, legs: 2, angle: 40, tension: 5508, factor: 1.556, risk: "WARNING", warn: true },
    { label: "Cenário 3 — Perigoso", load: 4800, legs: 2, angle: 25, tension: 5680, factor: 2.366, risk: "DANGER", warn: true },
  ];

  const demoClTotal = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const demoClDone  = Object.values(demoClChecked).filter(Boolean).length;
  const demoClPct   = Math.round((demoClDone / demoClTotal) * 100);

  const DEMO_BADGE = (
    <span style={{ background: "#7c3aed22", border: "1px solid #a78bfa44", color: "#a78bfa", fontSize: 10, fontWeight: 700, letterSpacing: "2px", padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", marginLeft: 8 }}>
      DEMO
    </span>
  );

  return (
    <div style={S.app}>

      {/* ── Header ── */}
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onVoltar} style={S.logoutBtn(isMobile)}>← Voltar</button>
            <div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={S.logoText(isMobile)}>RiggingCheck</span>
                {DEMO_BADGE}
              </div>
              <div style={S.logoSub(isMobile)}>Demonstração de Funcionalidades</div>
            </div>
          </div>
          {!isMobile && (
            <div style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid #f59e0b33", borderRadius: 6, padding: "6px 12px" }}>
              ⚠️ Dados simulados — sem conexão à API
            </div>
          )}
        </div>
        <div style={S.tabs(isMobile)}>
          <button style={S.tab(mainTab === "admin",  isMobile)} onClick={() => setMainTab("admin")}>🔑 Líder de Equipe</button>
          <button style={S.tab(mainTab === "rigger", isMobile)} onClick={() => setMainTab("rigger")}>👷 Rigger</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>

        {/* Banner aviso */}
        <div style={{ ...S.warnBox, marginBottom: 28 }}>
          {mainTab === "admin"
            ? "🎭 Demonstração — Líder de Equipe: veja solicitações com os 3 status possíveis e aprove/negue em tempo real. Nenhum dado é enviado ao servidor."
            : "🎭 Demonstração — Rigger: exemplos pré-calculados de capacidade do guindaste, lingada e checklist NR-11. Os cálculos são os mesmos do sistema real."}
        </div>

        {/* ════════════════ ADMIN TAB ════════════════ */}
        {mainTab === "admin" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <button style={S.tab(adminPainel === "solicitacoes", isMobile)} onClick={() => setAdminPainel("solicitacoes")}>📋 Solicitações</button>
              <button style={S.tab(adminPainel === "equipe",       isMobile)} onClick={() => setAdminPainel("equipe")}>👥 Equipe</button>
            </div>

            {/* ── SOLICITAÇÕES ── */}
            {adminPainel === "solicitacoes" && (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                  {["ANALISAR", "PROSSEGUIR", "PARAR", "TODOS"].map(s => (
                    <button key={s} style={S.tab(adminFiltro === s, isMobile)} onClick={() => setAdminFiltro(s)}>{s}</button>
                  ))}
                </div>

                {adminFiltered.length === 0 && (
                  <div style={{ ...S.normaBox, textAlign: "center", padding: 36 }}>
                    Nenhuma solicitação com status "{adminFiltro}".
                  </div>
                )}

                {adminFiltered.map(sol => (
                  <div key={sol.id} style={{ background: "#0f0f1a", border: `1px solid ${statusColor(sol.status)}22`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 15 }}>OS: {sol.operacaoOs}</div>
                        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Rigger: {sol.riggerNome}</div>
                        <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                          Solicitado em: {new Date(sol.criadoEm).toLocaleString("pt-BR")}
                        </div>
                        {sol.resolvidoEm && (
                          <div style={{ color: "#475569", fontSize: 11 }}>
                            Resolvido em: {new Date(sol.resolvidoEm).toLocaleString("pt-BR")} por {sol.aprovadoPorNome}
                          </div>
                        )}
                        {sol.observacao && (
                          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Obs: "{sol.observacao}"</div>
                        )}
                      </div>
                      <div style={S.riskBadge(statusColor(sol.status))}>{sol.status}</div>
                    </div>

                    <SolTechCard sol={sol} />

                    {sol.status === "ANALISAR" && (
                      <div style={{ marginTop: 16 }}>
                        <input
                          style={{ ...S.input, fontSize: 12, padding: "8px 12px", width: "100%", boxSizing: "border-box" }}
                          placeholder="Observação (opcional)"
                          value={adminObs[sol.id] || ""}
                          onChange={e => setAdminObs(o => ({ ...o, [sol.id]: e.target.value }))}
                        />
                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          <button
                            style={{ ...S.btn(false), background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#000", padding: "10px 24px" }}
                            onClick={() => resolverAdmin(sol.id, "aprovar")}>
                            ✅ Autorizar Içamento
                          </button>
                          <button
                            style={{ ...S.btn(false), background: "rgba(239,68,68,0.12)", border: "1px solid #ef444466", color: "#ef4444", padding: "10px 24px" }}
                            onClick={() => resolverAdmin(sol.id, "negar")}>
                            🚫 Negar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ── EQUIPE ── */}
            {adminPainel === "equipe" && (
              <>
                <div style={{ background: "#0f0f1a", border: "1px solid #1e2a3a", borderRadius: 12, padding: 24, marginBottom: 32 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 16, letterSpacing: "1px", textTransform: "uppercase" }}>
                    + Novo Usuário (Demo)
                  </div>
                  <div style={S.grid()}>
                    <div style={S.field}>
                      <label style={S.label}>Nome completo</label>
                      <input style={S.input} placeholder="João da Silva" value={novoForm.nome}
                        onChange={e => setNovoForm(f => ({ ...f, nome: e.target.value }))} />
                    </div>
                    <div style={S.field}>
                      <label style={S.label}>E-mail (opcional)</label>
                      <input style={S.input} type="email" placeholder="joao@empresa.com" value={novoForm.email}
                        onChange={e => setNovoForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div style={S.field}>
                      <label style={S.label}>Cargo</label>
                      <select style={{ ...S.input, cursor: "pointer" }} value={novoForm.role}
                        onChange={e => setNovoForm(f => ({ ...f, role: e.target.value }))}>
                        <option value="RIGGER">Rigger</option>
                        <option value="OPERADOR">Operador</option>
                        <option value="LIDER_EQUIPE">Líder de Equipe</option>
                        <option value="GERENTE_OPERACOES">Gerente de Operações</option>
                        <option value="ADMIN_EMPRESA">Admin Empresa</option>
                      </select>
                    </div>
                  </div>
                  {novoMsg && (
                    <div style={{ ...(novoMsg.tipo === "erro" ? S.errorBox : S.successBox), marginTop: 12 }}>{novoMsg.msg}</div>
                  )}
                  <button style={{ ...S.btn(false), marginTop: 16 }} onClick={adicionarUser}>
                    Adicionar ao Demo
                  </button>
                </div>

                <div style={{ fontSize: 11, color: "#475569", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>
                  Membros da equipe ({equipe.length})
                </div>
                {equipe.map(f => (
                  <div key={f.id} style={{ background: "#0f0f1a", border: `1px solid ${f.ativo ? "#1e2a3a" : "#2d0000"}`, borderRadius: 12, padding: 18, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: f.ativo ? "#e2e8f0" : "#475569", fontSize: 14 }}>{f.nome}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{f.email}</div>
                      <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ background: "#1e2a3a", color: "#38bdf8", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
                          {roleLabel(f.role)}
                        </span>
                        {!f.ativo && (
                          <span style={{ background: "#2d0000", color: "#ef4444", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>Inativo</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleUserAtivo(f.id)}
                      style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid", cursor: "pointer",
                        background: f.ativo ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                        borderColor: f.ativo ? "#ef444444" : "#22c55e44",
                        color: f.ativo ? "#ef4444" : "#22c55e" }}>
                      {f.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ════════════════ RIGGER TAB ════════════════ */}
        {mainTab === "rigger" && (
          <>
            {/* sub-tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <button style={S.tab(riggerExTab === "cap",   isMobile)} onClick={() => setRiggerExTab("cap")}>⚖️ Capacidade</button>
              <button style={S.tab(riggerExTab === "sling", isMobile)} onClick={() => setRiggerExTab("sling")}>📐 Lingada</button>
              <button style={S.tab(riggerExTab === "check", isMobile)} onClick={() => setRiggerExTab("check")}>📋 Checklist</button>
            </div>

            {/* ── CAPACIDADE ── */}
            {riggerExTab === "cap" && (
              <CapacityModule isDemo={true} />
            )}

            {/* ── LINGADA ── */}
            {riggerExTab === "sling" && (
              <SlingModule isDemo={true} />
            )}

            {/* ── CHECKLIST ── */}
            {riggerExTab === "check" && (
              <div style={S.card}>
                <div style={S.cardTitle}>📋 &nbsp;Checklist de Içamento — NR-11 / ABNT</div>
                <div style={S.normaBox}>
                  📋 <strong style={{ color: "#94a3b8" }}>Como funciona:</strong> Todos os {CHECKLIST.reduce((s,c) => s + c.items.length, 0)} itens devem ser marcados antes
                  de solicitar a liberação ao Líder de Equipe. Clique nos itens abaixo para simular a marcação.
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 20 }}>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: demoClDone === demoClTotal ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>{demoClDone}</span>
                    <span style={{ color: "#64748b" }}> / {demoClTotal} itens verificados</span>
                  </div>
                  <div style={S.riskBadge(demoClDone === demoClTotal ? "#22c55e" : "#f59e0b")}>{demoClPct}%</div>
                </div>
                <div style={S.progressBar}>
                  <div style={S.progressFill(demoClPct, demoClDone === demoClTotal ? "#22c55e" : "#f59e0b")} />
                </div>
                {CHECKLIST.map((cat, ci) => (
                  <div key={ci}>
                    <div style={S.catTitle}>▸ {cat.category}
                      <span style={{ color: "#475569", fontWeight: 400 }}>
                        ({cat.items.filter((_, ii) => demoClChecked[`${ci}-${ii}`]).length}/{cat.items.length})
                      </span>
                    </div>
                    {cat.items.map((item, ii) => {
                      const key = `${ci}-${ii}`;
                      const isChecked = !!demoClChecked[key];
                      return (
                        <div key={ii} style={S.checkRow(isChecked)} onClick={() => setDemoClChecked(p => ({ ...p, [key]: !p[key] }))}>
                          <div style={S.checkbox(isChecked)}>
                            {isChecked && <span style={{ color: "#000", fontSize: 13, fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 13, lineHeight: 1.5, userSelect: "none" }}>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div style={{ marginTop: 28 }}>
                  <button style={S.btn(demoClDone < demoClTotal)} disabled={demoClDone < demoClTotal}>
                    {demoClDone < demoClTotal
                      ? `🔒 Aguardando ${demoClTotal - demoClDone} item(s)`
                      : "✅ Checklist completo — pronto para solicitar liberação"}
                  </button>
                </div>
                {demoClDone === demoClTotal && (
                  <div style={{ ...S.successBox, marginTop: 16 }}>
                    No sistema real, ao clicar em "Solicitar Liberação" o Líder de Equipe recebe a notificação e pode aprovar ou negar.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div style={{ ...S.normaBox, textAlign: "center", marginTop: 32 }}>
          RiggingCheck Demo &nbsp;·&nbsp; Nenhum dado é persistido nesta página
          <br />
          <span style={{ color: "#475569" }}>NR-11 · ABNT NBR 11900 · ABNT NBR 13541 · Petrobrás N-2869</span>
        </div>
      </div>
    </div>
  );
}

// ── CARD TÉCNICO (reutilizado em vários dashboards) ──────────────────────────────
function CardTecnicoSol({ sol }) {
  return (
    <div style={{ marginTop: 14, background: "#0a0a0f", borderRadius: 8, padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Capacidade</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: "#94a3b8" }}>
            <div>Guindaste: <strong style={{ color: "#e2e8f0" }}>{sol.capGuindasteKg?.toLocaleString("pt-BR")} kg</strong></div>
            <div>Carga total: <strong style={{ color: "#e2e8f0" }}>{sol.capTotalKg?.toFixed(0)} kg</strong></div>
            <div>Uso: <strong style={{ color: riskColor(sol.capRisco).color }}>{sol.capUsoPercent?.toFixed(1)}%</strong></div>
            <div>Risco: <strong style={{ color: riskColor(sol.capRisco).color }}>{riskLabel(sol.capRisco)}</strong></div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Eslinga</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: "#94a3b8" }}>
            <div>Pernas: <strong style={{ color: "#e2e8f0" }}>{sol.eslNumPernas}</strong></div>
            <div>Ângulo: <strong style={{ color: sol.eslAnguloAviso ? "#f59e0b" : "#e2e8f0" }}>{sol.eslAnguloGraus}°{sol.eslAnguloAviso ? " ⚠️" : ""}</strong></div>
            <div>Tensão/perna: <strong style={{ color: "#e2e8f0" }}>{sol.eslTensaoPorPernaKg?.toFixed(0)} kg</strong></div>
            {sol.eslWllKg != null && (
              <div>WLL: <strong style={{ color: "#e2e8f0" }}>{sol.eslWllKg?.toLocaleString("pt-BR")} kg</strong>
                {sol.eslWllUsoPercent != null && <span style={{ color: riskColor(sol.eslRisco).color }}> ({sol.eslWllUsoPercent?.toFixed(1)}%)</span>}
              </div>
            )}
            <div>Risco: <strong style={{ color: riskColor(sol.eslRisco).color }}>{riskLabel(sol.eslRisco)}</strong></div>
          </div>
        </div>
      </div>
      {sol.eslTemManilha && (
        <div style={{ borderTop: "1px solid #1e2a3a", marginTop: 10, paddingTop: 10 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Manilha</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12, color: "#94a3b8" }}>
            <div>Capacidade: <strong style={{ color: "#e2e8f0" }}>{sol.eslManilhaCapacidadeKg?.toLocaleString("pt-BR")} kg</strong></div>
            <div>Uso: <strong style={{ color: sol.eslManilhaCompativel ? "#22c55e" : "#ef4444" }}>{sol.eslManilhaUsoPercent?.toFixed(1)}%</strong></div>
            <div>Compatível: <strong style={{ color: sol.eslManilhaCompativel ? "#22c55e" : "#ef4444" }}>{sol.eslManilhaCompativel ? "Sim" : "Não"}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PAINEL LÍDER DE EQUIPE ────────────────────────────────────────────────────────
function LiderEquipeDashboard({ onVoltar, isMobile }) {
  const [showModalSenha, setShowModalSenha] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState("ANALISAR");
  const [lista, setLista] = useState([]);
  const [loadingSol, setLoadingSol] = useState(true);
  const [obs, setObs] = useState({});
  const user = getUser();

  const carregar = useCallback(async (s) => {
    setLoadingSol(true);
    try {
      const res = await authFetch(`${API}/api/liberacoes?status=${s}`);
      if (res.ok) setLista(await res.json());
    } catch { /* ignora */ }
    setLoadingSol(false);
  }, []);

  useEffect(() => { carregar(statusFiltro); }, [carregar, statusFiltro]);

  const resolver = async (id, acao) => {
    try {
      const res = await authFetch(`${API}/api/liberacoes/${id}/${acao}`, {
        method: "POST",
        body: JSON.stringify({ observacao: obs[id] || "" }),
      });
      if (res.ok) {
        setLista(p => p.filter(s => s.id !== id));
        setObs(o => { const n = { ...o }; delete n[id]; return n; });
      }
    } catch { /* ignora */ }
  };

  return (
    <div style={S.app}>
      {showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onVoltar} style={{ ...S.logoutBtn(isMobile), borderColor: "#22c55e44", color: "#22c55e" }}>← Voltar</button>
            <div>
              <div style={S.logoText(isMobile)}>Painel Líder de Equipe</div>
              <div style={S.logoSub(isMobile)}>{user?.empresaName || "RiggingCheck"}</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            <div style={S.roleBadge(isMobile)}>{roleLabel(user?.role)}</div>
            <div style={S.userBadge(isMobile)}>{user?.userName}</div>
            <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => setShowModalSenha(true)}>
              {isMobile ? "🔑" : "Alterar Senha"}
            </button>
          </div>
        </div>
        <div style={S.tabs(isMobile)}>
          {["ANALISAR", "PROSSEGUIR", "PARAR", "TODOS"].map(s => (
            <button key={s} style={S.tab(statusFiltro === s, isMobile)} onClick={() => setStatusFiltro(s)}>{s}</button>
          ))}
          <button onClick={() => carregar(statusFiltro)} style={{ ...S.tab(false, isMobile), marginLeft: 4 }}>↻</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>
        {loadingSol && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Carregando...</div>}
        {!loadingSol && lista.length === 0 && (
          <div style={{ ...S.normaBox, textAlign: "center", padding: 36 }}>
            Nenhuma solicitação com status "{statusFiltro}".
          </div>
        )}
        {!loadingSol && lista.map(sol => (
          <div key={sol.id} style={{ background: "#0f0f1a", border: `1px solid ${statusColor(sol.status)}22`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 15 }}>OS: {sol.operacaoOs}</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Rigger: {sol.riggerNome}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                  Solicitado em: {new Date(sol.criadoEm).toLocaleString("pt-BR")}
                </div>
                {sol.resolvidoEm && (
                  <div style={{ color: "#475569", fontSize: 11 }}>
                    Resolvido em: {new Date(sol.resolvidoEm).toLocaleString("pt-BR")} por {sol.aprovadoPorNome}
                  </div>
                )}
                {sol.observacao && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Obs: "{sol.observacao}"</div>}
              </div>
              <div style={S.riskBadge(statusColor(sol.status))}>{sol.status}</div>
            </div>
            <CardTecnicoSol sol={sol} />
            {sol.status === "ANALISAR" && (
              <div style={{ marginTop: 16 }}>
                <input
                  style={{ ...S.input, fontSize: 12, padding: "8px 12px", width: "100%", boxSizing: "border-box" }}
                  placeholder="Observação (opcional)"
                  value={obs[sol.id] || ""}
                  onChange={e => setObs(o => ({ ...o, [sol.id]: e.target.value }))}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    style={{ ...S.btn(false), background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#000", padding: "10px 24px" }}
                    onClick={() => resolver(sol.id, "aprovar")}>
                    ✅ Autorizar Içamento
                  </button>
                  <button
                    style={{ ...S.btn(false), background: "rgba(239,68,68,0.12)", border: "1px solid #ef444466", color: "#ef4444", padding: "10px 24px" }}
                    onClick={() => resolver(sol.id, "negar")}>
                    🚫 Negar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PAINEL GERENTE DE OPERAÇÕES ───────────────────────────────────────────────────
function GerenteDashboard({ onVoltar, isMobile }) {
  const [showModalSenha, setShowModalSenha] = useState(false);
  const [lista, setLista] = useState([]);
  const [totalFuncionarios, setTotalFuncionarios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const user = getUser();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [rSol, rFunc] = await Promise.all([
          authFetch(`${API}/api/liberacoes?status=TODOS`),
          authFetch(`${API}/api/funcionarios`),
        ]);
        if (rSol.ok) setLista(await rSol.json());
        if (rFunc.ok) {
          const funcs = await rFunc.json();
          setTotalFuncionarios(funcs.length);
        }
      } catch { /* ignora */ }
      setLoading(false);
    };
    init();
  }, []);

  const total      = lista.length;
  const aprovadas  = lista.filter(s => s.status === "PROSSEGUIR").length;
  const reprovadas = lista.filter(s => s.status === "PARAR").length;
  const pendentes  = lista.filter(s => s.status === "ANALISAR").length;
  const taxaAprov  = aprovadas + reprovadas > 0
    ? Math.round((aprovadas / (aprovadas + reprovadas)) * 100) : 0;

  const listaFiltrada = statusFiltro === "TODOS" ? lista : lista.filter(s => s.status === statusFiltro);

  const StatCard = ({ label, value, color, sub }) => (
    <div style={{ background: "#0f0f1a", border: `1px solid ${color}22`, borderRadius: 12, padding: "18px 22px", flex: "1 1 140px" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={S.app}>
      {showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onVoltar} style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }}>← Voltar</button>
            <div>
              <div style={S.logoText(isMobile)}>Painel de Controle</div>
              <div style={S.logoSub(isMobile)}>{user?.empresaName || "RiggingCheck"}</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            <div style={S.roleBadge(isMobile)}>{roleLabel(user?.role)}</div>
            <div style={S.userBadge(isMobile)}>{user?.userName}</div>
            <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => setShowModalSenha(true)}>
              {isMobile ? "🔑" : "Alterar Senha"}
            </button>
          </div>
        </div>
        <div style={S.tabs(isMobile)}>
          {["TODOS", "ANALISAR", "PROSSEGUIR", "PARAR"].map(s => (
            <button key={s} style={S.tab(statusFiltro === s, isMobile)} onClick={() => setStatusFiltro(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>
        {loading ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: 60 }}>Carregando dados...</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard label="Total de Solicitações" value={total} color="#38bdf8" />
              <StatCard label="Taxa de Aprovação" value={`${taxaAprov}%`} color="#22c55e" sub={`${aprovadas} aprovadas`} />
              <StatCard label="Pendentes" value={pendentes} color="#f59e0b" />
              <StatCard label="Reprovadas" value={reprovadas} color="#ef4444" />
              <StatCard label="Funcionários" value={totalFuncionarios} color="#a78bfa" />
            </div>

            {/* Lista de solicitações (somente leitura) */}
            <div style={{ fontSize: 11, color: "#475569", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>
              Histórico de Solicitações
            </div>
            {listaFiltrada.length === 0 && (
              <div style={{ ...S.normaBox, textAlign: "center", padding: 36 }}>
                Nenhuma solicitação com status "{statusFiltro}".
              </div>
            )}
            {listaFiltrada.map(sol => (
              <div key={sol.id} style={{ background: "#0f0f1a", border: `1px solid ${statusColor(sol.status)}22`, borderRadius: 12, padding: 20, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>OS: {sol.operacaoOs}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>Rigger: {sol.riggerNome}</div>
                    <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>
                      Solicitado em: {new Date(sol.criadoEm).toLocaleString("pt-BR")}
                    </div>
                    {sol.resolvidoEm && (
                      <div style={{ color: sol.status === "PROSSEGUIR" ? "#22c55e" : "#ef4444", fontSize: 11, marginTop: 2 }}>
                        {sol.status === "PROSSEGUIR" ? "Autorizado" : "Reprovado"} por {sol.aprovadoPorNome}
                        {" "}em {new Date(sol.resolvidoEm).toLocaleString("pt-BR")}
                      </div>
                    )}
                    {sol.observacao && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Obs: "{sol.observacao}"</div>}
                  </div>
                  <div style={S.riskBadge(statusColor(sol.status))}>{sol.status}</div>
                </div>
                <CardTecnicoSol sol={sol} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [authenticated, setAuthenticated] = useState(() => !!getToken());
  const [view, setView] = useState("app"); // "app" | "admin" | "demo"
  const [tab, setTab] = useState(0);
  const [capacityOk, setCapacityOk] = useState(false);
  const [slingOk, setSlingOk] = useState(false);
  const [capacityData, setCapacityData] = useState(null);
  const [slingData, setSlingData] = useState(null);
  const [showModalSenha, setShowModalSenha] = useState(false);
  const user = getUser();
  const isSuperAdmin   = IS_SUPER(user?.role);
  const isAdminEmpresa = user?.role === "ADMIN_EMPRESA";
  const isLider        = user?.role === "LIDER_EQUIPE";
  const isGerente      = user?.role === "GERENTE_OPERACOES";
  const hasPanel       = isAdminEmpresa || isLider || isGerente;

  const handleLogout = useCallback(() => {
    clearAuth();
    setAuthenticated(false);
  }, []);

  useEffect(() => {
    const handler = () => setAuthenticated(false);
    window.addEventListener("rc_session_expired", handler);
    return () => window.removeEventListener("rc_session_expired", handler);
  }, []);

  if (view === "demo") {
    return <DemoPage onVoltar={() => setView("app")} />;
  }

  if (!authenticated) {
    return <LoginScreen onAuth={() => setAuthenticated(true)} onDemo={() => setView("demo")} />;
  }

  if (view === "admin" && isSuperAdmin) {
    return <SuperAdminDashboard onVoltar={() => setView("app")} isMobile={isMobile} />;
  }
  if (view === "admin" && isAdminEmpresa) {
    return <AdminDashboard onVoltar={() => setView("app")} isMobile={isMobile} />;
  }
  if (view === "admin" && isLider) {
    return <LiderEquipeDashboard onVoltar={() => setView("app")} isMobile={isMobile} />;
  }
  if (view === "admin" && isGerente) {
    return <GerenteDashboard onVoltar={() => setView("app")} isMobile={isMobile} />;
  }

  const tabs = [
    {
      label: "⚖ Capacidade",
      locked: false,
      component: <CapacityModule onApproved={(data) => { setCapacityData(data); setCapacityOk(true); }} />,
    },
    {
      label: "📐 Eslingas",
      locked: !capacityOk,
      lockMsg: "Conclua a verificação de capacidade primeiro",
      component: <SlingModule onCompleted={(data) => { setSlingData(data); setSlingOk(true); }} />,
    },
    {
      label: "📋 Checklist NR-11",
      locked: !slingOk,
      lockMsg: "Conclua o cálculo de eslingas primeiro",
      component: <ChecklistModule capacityData={capacityData} slingData={slingData} />,
    },
  ];

  const handleTabClick = (i) => { if (!tabs[i].locked) setTab(i); };

  return (
    <div style={S.app}>
      {showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={S.logo}>
            <div style={S.logoIcon}>🏗</div>
            <div>
              <div style={S.logoText(isMobile)}>RiggingCheck</div>
              <div style={S.logoSub(isMobile)}>Verificador de Segurança em Içamento</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            {user && (
              <>
                <div style={S.roleBadge(isMobile)}>{roleLabel(user.role)}</div>
                <div style={S.userBadge(isMobile)}>{user.userName}</div>
              </>
            )}
            {isSuperAdmin && (
              <button style={{ ...S.logoutBtn(isMobile), borderColor: "#a78bfa44", color: "#a78bfa" }} onClick={() => setView("admin")}>
                {isMobile ? "⚙️" : "⚙️ Painel SaaS"}
              </button>
            )}
            {isAdminEmpresa && (
              <button style={{ ...S.logoutBtn(isMobile), borderColor: "#f59e0b44", color: "#f59e0b" }} onClick={() => setView("admin")}>
                {isMobile ? "🔑" : "🔑 Painel Admin"}
              </button>
            )}
            {isLider && (
              <button style={{ ...S.logoutBtn(isMobile), borderColor: "#22c55e44", color: "#22c55e" }} onClick={() => setView("admin")}>
                {isMobile ? "📋" : "📋 Solicitações"}
              </button>
            )}
            {isGerente && (
              <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => setView("admin")}>
                {isMobile ? "📊" : "📊 Painel Gerente"}
              </button>
            )}
            <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => setShowModalSenha(true)}>
              {isMobile ? "🔑" : "Alterar Senha"}
            </button>
            <button style={S.logoutBtn(isMobile)} onClick={handleLogout}>Sair</button>
          </div>
        </div>
        <div style={S.tabs(isMobile)}>
          {tabs.map((t, i) => (
            <button
              key={i}
              style={{ ...S.tab(tab === i, isMobile), ...(t.locked ? { opacity: 0.35, cursor: "not-allowed" } : {}) }}
              onClick={() => handleTabClick(i)}
              title={t.locked ? t.lockMsg : ""}
            >
              {t.locked ? "🔒 " : ""}{t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={S.container}>
        {tabs[tab].locked ? (
          <div style={{ ...S.warnBox, textAlign: "center", padding: 36 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{tabs[tab].lockMsg}</div>
          </div>
        ) : tabs[tab].component}
        <div style={{ ...S.normaBox, textAlign: "center", marginTop: 32 }}>
          v2.0.0 — RiggingCheck Fullstack &nbsp;·&nbsp; React + Java Spring Boot + PostgreSQL
          <br />
          <span style={{ color: "#475569" }}>NR-11 · ABNT NBR 11900 · ABNT NBR 13541 · ISO 4308-1 · Petrobrás N-2869</span>
        </div>
      </div>
    </div>
  );
}
