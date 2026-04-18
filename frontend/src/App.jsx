import { useState, useCallback, useEffect } from "react";
import { openPrintWindow, formatPetrobrasSection } from "./utils/pdf.js";
import {
  canPrintPdf, classificarIcamento, N2869_DOCUMENTOS,
  CABO_ACO_TABLE, CABO_ACO_19AA_TABLE, CABO_ACO_37AF_TABLE,
  CINTA_SINTETICA_TABLE, MANILHA_TABLE,
  CORRENTE_G80_TABLE, CORRENTE_G100_TABLE,
  lookupWllFromMaterial,
} from "./utils/calculations.js";

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
function LoginScreen({ onAuth }) {
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
function CapacityModule({ onApproved }) {
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
function SlingModule({ onCompleted }) {
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
              <div>WLL eslinga: <strong style={{ color: "#e2e8f0" }}>{parseFloat(form.wll).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} kg</strong></div>
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
              <div style={{ color: "#475569", fontSize: 11, marginTop: 8 }}>{new Date(solicitacao.resolvidoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
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
                          Solicitado em: {new Date(sol.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </div>
                        {sol.resolvidoEm && (
                          <div style={{ color: "#475569", fontSize: 11 }}>
                            Resolvido em: {new Date(sol.resolvidoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} por {sol.aprovadoPorNome}
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
                    { label: "Cadastrada em", value: emp.criadoEm ? new Date(emp.criadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—", color: "#64748b" },
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
                    Cadastrada em: {empresaSel.criadoEm ? new Date(empresaSel.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}
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
                            {f.criadoEm && <span style={{ fontSize: 10, color: "#475569" }}>desde {new Date(f.criadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}
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
                  Solicitado em: {new Date(sol.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </div>
                {sol.resolvidoEm && (
                  <div style={{ color: "#475569", fontSize: 11 }}>
                    Resolvido em: {new Date(sol.resolvidoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} por {sol.aprovadoPorNome}
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
function OSDetalhadaModal({ sol, onFechar }) {
  const fmt = (v) => v != null ? Number(v).toLocaleString("pt-BR") : "—";
  const fmtP = (v) => v != null ? `${Number(v).toLocaleString("pt-BR")}%` : "—";
  const fmtDt = (v) => v ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

  const Row = ({ label, value, bold }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5e7eb" }}>
      <span style={{ color: "#374151", fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: "#111827", fontSize: 13 }}>{value}</span>
    </div>
  );

  // Cabeçalhos de seção com texto escuro — visíveis sem "imprimir fundos"
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ background: "#e8f0fe", color: "#1e3a5f", fontWeight: 700, fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase", padding: "6px 12px", borderRadius: "6px 6px 0 0", borderLeft: "3px solid #1e3a5f" }}>
        {title}
      </div>
      <div style={{ border: "1px solid #d1d5db", borderTop: "none", borderRadius: "0 0 6px 6px", padding: "4px 12px" }}>
        {children}
      </div>
    </div>
  );

  const imprimirOS = () => {
    const el = document.getElementById("os-print-area");
    if (!el) return;
    const result = openPrintWindow(el.outerHTML);
    if (!result.success) alert("Pop-up bloqueado. Permita pop-ups neste site para imprimir.");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }}>
      <div id="os-print-area" style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 720, padding: 32, color: "#111" }}>
        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1e3a5f", letterSpacing: 1 }}>RIGGINGCHECK</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Ordem de Serviço de Içamento</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a5f" }}>OS: {sol.operacaoOs}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Emitido em: {fmtDt(new Date().toISOString())}</div>
          </div>
        </div>

        <div style={{ borderTop: "3px solid #1e3a5f", marginBottom: 20 }} />

        <Section title="Identificação">
          <Row label="Empresa" value={sol.empresaNome} />
          <Row label="Rigger / Responsável" value={sol.riggerNome} bold />
          <Row label="Data da Solicitação" value={fmtDt(sol.criadoEm)} />
        </Section>

        <Section title="Capacidade do Equipamento">
          <Row label="Capacidade do Guindaste" value={`${fmt(sol.capGuindasteKg)} kg`} />
          <Row label="Capacidade da Carga" value={`${fmt(sol.capCargaKg)} kg`} />
          <Row label="Capacidade do Aparelho de Içamento" value={`${fmt(sol.capAparelhoKg)} kg`} />
          <Row label="Capacidade Total (carga + aparelho)" value={`${fmt(sol.capTotalKg)} kg`} bold />
          <Row label="Percentual de Uso do Guindaste" value={fmtP(sol.capUsoPercent)} bold />
          <Row label="Classificação de Risco" value={sol.capRisco || "—"} bold />
        </Section>

        <Section title="Dados da Lingada">
          <Row label="Número de Pernas" value={sol.eslNumPernas ?? "—"} />
          <Row label="Ângulo da Lingada" value={sol.eslAnguloGraus != null ? `${sol.eslAnguloGraus}°` : "—"} />
          <Row label="Tensão por Perna" value={`${fmt(sol.eslTensaoPorPernaKg)} kg`} bold />
          <Row label="Fator de Carga (ângulo)" value={sol.eslFatorCarga != null ? Number(sol.eslFatorCarga).toLocaleString("pt-BR", { minimumFractionDigits: 2, timeZone: "America/Sao_Paulo" }) : "—"} />
          <Row label="WLL da Eslinga" value={`${fmt(sol.eslWllKg)} kg`} />
          <Row label="Percentual de Uso da WLL" value={fmtP(sol.eslWllUsoPercent)} bold />
          <Row label="Classificação de Risco da Lingada" value={sol.eslRisco || "—"} bold />
          <Row label="Aviso de Ângulo Crítico" value={sol.eslAnguloAviso ? "SIM — verificar ângulo" : "Não"} />
        </Section>

        {sol.eslTemManilha && (
          <Section title="Manilha">
            <Row label="Capacidade da Manilha" value={`${fmt(sol.eslManilhaCapacidadeKg)} kg`} />
            <Row label="Percentual de Uso da Manilha" value={fmtP(sol.eslManilhaUsoPercent)} bold />
            <Row label="Compatível com a Carga" value={sol.eslManilhaCompativel ? "SIM" : "NÃO — verificar"} bold />
          </Section>
        )}

        <Section title="Autorização">
          <Row label="Status" value="AUTORIZADO — PROSSEGUIR" bold />
          <Row label="Autorizado por" value={sol.aprovadoPorNome || "—"} bold />
          <Row label="Data / Hora da Autorização" value={fmtDt(sol.resolvidoEm)} />
          {sol.observacao && <Row label="Observações" value={sol.observacao} />}
        </Section>

        <div style={{ borderTop: "1px solid #d1d5db", marginTop: 24, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            Documento gerado pelo sistema RiggingCheck · Válido apenas para a OS indicada
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={imprimirOS}
              style={{ background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              🖨 Imprimir / PDF
            </button>
            <button
              onClick={onFechar}
              style={{ background: "transparent", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GerenteDashboard({ onVoltar, isMobile }) {
  const [showModalSenha, setShowModalSenha] = useState(false);
  const [lista, setLista] = useState([]);
  const [totalFuncionarios, setTotalFuncionarios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [painel, setPainel] = useState("analitico");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [osAberta, setOsAberta] = useState(null);
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
  const listaAutorizadas = lista.filter(s => s.status === "PROSSEGUIR");

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
      {osAberta && <OSDetalhadaModal sol={osAberta} onFechar={() => setOsAberta(null)} />}

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
          <button style={S.tab(painel === "analitico", isMobile)} onClick={() => setPainel("analitico")}>
            {isMobile ? "Analytics" : "Painel Analítico"}
          </button>
          <button style={S.tab(painel === "relatorios", isMobile)} onClick={() => setPainel("relatorios")}>
            {isMobile ? "Relatórios" : "Relatórios de OS"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>
        {loading ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: 60 }}>Carregando dados...</div>
        ) : painel === "analitico" ? (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard label="Total de Solicitações" value={total} color="#38bdf8" />
              <StatCard label="Taxa de Aprovação" value={`${taxaAprov}%`} color="#22c55e" sub={`${aprovadas} aprovadas`} />
              <StatCard label="Pendentes" value={pendentes} color="#f59e0b" />
              <StatCard label="Reprovadas" value={reprovadas} color="#ef4444" />
              <StatCard label="Funcionários" value={totalFuncionarios} color="#a78bfa" />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {["TODOS", "ANALISAR", "PROSSEGUIR", "PARAR"].map(s => (
                <button key={s} style={{ ...S.tab(statusFiltro === s, isMobile), borderRadius: 8 }} onClick={() => setStatusFiltro(s)}>{s}</button>
              ))}
            </div>

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
                      Solicitado em: {new Date(sol.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </div>
                    {sol.resolvidoEm && (
                      <div style={{ color: sol.status === "PROSSEGUIR" ? "#22c55e" : "#ef4444", fontSize: 11, marginTop: 2 }}>
                        {sol.status === "PROSSEGUIR" ? "Autorizado" : "Reprovado"} por {sol.aprovadoPorNome}
                        {" "}em {new Date(sol.resolvidoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
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
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>Relatórios de OS Autorizadas</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
                  {listaAutorizadas.length} içamento{listaAutorizadas.length !== 1 ? "s" : ""} autorizado{listaAutorizadas.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {listaAutorizadas.length === 0 && (
              <div style={{ ...S.normaBox, textAlign: "center", padding: 48 }}>
                Nenhum içamento autorizado ainda.
              </div>
            )}

            {listaAutorizadas.map(sol => (
              <div key={sol.id} style={{ background: "#0f0f1a", border: "1px solid #22c55e33", borderRadius: 12, padding: 20, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 15 }}>OS: {sol.operacaoOs}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Rigger: {sol.riggerNome}</div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>
                    Solicitado: {new Date(sol.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </div>
                  <div style={{ color: "#22c55e", fontSize: 11, marginTop: 2 }}>
                    Autorizado por {sol.aprovadoPorNome} em {new Date(sol.resolvidoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </div>
                  {sol.observacao && (
                    <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Obs: "{sol.observacao}"</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ ...S.riskBadge("#22c55e"), fontSize: 11 }}>AUTORIZADO</div>
                  <button
                    onClick={() => setOsAberta(sol)}
                    style={{ background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Ver OS Detalhada
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── PLANEJAMENTO BÁSICO ───────────────────────────────────────────────────────────

const MATERIAIS = [
  { nome: "Aço",                 pe: 7850  },
  { nome: "Alumínio",            pe: 2800  },
  { nome: "Bronze",              pe: 8500  },
  { nome: "Chumbo",              pe: 11400 },
  { nome: "Cobre",               pe: 8900  },
  { nome: "Ferro fundido",       pe: 7250  },
  { nome: "Concreto simples",    pe: 2400  },
  { nome: "Concreto armado",     pe: 2500  },
  { nome: "Granito",             pe: 2800  },
  { nome: "Mármore",             pe: 2800  },
  { nome: "Madeira pinho/cedro", pe: 500   },
  { nome: "Borracha",            pe: 1700  },
  { nome: "Vidro plano",         pe: 2600  },
];

const FATORES_SEG = [
  { tipo: "Cabos e cordoalhas estáticos",       fsMin: 3  },
  { tipo: "Cabos para tração horizontal",        fsMin: 4  },
  { tipo: "Guinchos, guindastes e escavadeiras", fsMin: 5  },
  { tipo: "Pontes rolantes",                     fsMin: 6  },
  { tipo: "Talhas elétricas",                    fsMin: 7  },
  { tipo: "Guindaste estacionário",              fsMin: 6  },
  { tipo: "Laços",                               fsMin: 5  },
  { tipo: "Elevador de obra",                    fsMin: 8  },
  { tipo: "Elevador de passageiros",             fsMin: 12 },
];

// Para ângulos intermediários usa-se sin() diretamente; tabela é referência visual
const multAngulo = (graus) => {
  const r = (graus * Math.PI) / 180;
  return graus > 0 ? 1 / Math.sin(r) : Infinity;
};

const statusCalc = (pct, limites = [80, 100]) =>
  pct <= limites[0] ? "SEGURO" : pct <= limites[1] ? "ATENCAO" : "REPROVADO";

const statusStyle = (s) => ({
  SEGURO:    { color: "#22c55e", bg: "#052e16", border: "#22c55e33" },
  ATENCAO:   { color: "#f59e0b", bg: "#2d1900", border: "#f59e0b33" },
  REPROVADO: { color: "#ef4444", bg: "#2d0000", border: "#ef444433" },
}[s] || { color: "#64748b", bg: "#0f0f1a", border: "#1e1e35" });

// Distâncias mínimas seguras para redes elétricas energizadas (NR-10 Anexo II / ABNT NBR 5422)
const HIGH_VOLTAGE_TABLE = [
  { faixa: "Até 1 kV",        minDist: 3.0,  norma: "NR-10 Anexo II"        },
  { faixa: "1 – 15 kV",       minDist: 3.0,  norma: "NR-10 Anexo II"        },
  { faixa: "15 – 69 kV",      minDist: 4.0,  norma: "NR-10 / ABNT NBR 5422" },
  { faixa: "69 – 138 kV",     minDist: 5.0,  norma: "NR-10 / ABNT NBR 5422" },
  { faixa: "138 – 230 kV",    minDist: 6.0,  norma: "ABNT NBR 5422"         },
  { faixa: "230 – 345 kV",    minDist: 8.0,  norma: "ABNT NBR 5422"         },
  { faixa: "345 – 500 kV",    minDist: 10.0, norma: "ABNT NBR 5422"         },
  { faixa: "Acima de 500 kV", minDist: null, norma: "Consultar especialista" },
];

function ResultBox({ status, label, valor, unidade, msg }) {
  const st = statusStyle(status);
  return (
    <div style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 12, padding: 20, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: st.color, marginTop: 4 }}>
            {valor} <span style={{ fontSize: 14, fontWeight: 400 }}>{unidade}</span>
          </div>
          {msg && <div style={{ fontSize: 12, color: st.color, marginTop: 4 }}>{msg}</div>}
        </div>
        <div style={{ background: st.color, color: "#000", fontWeight: 800, fontSize: 11, letterSpacing: "2px", padding: "6px 14px", borderRadius: 6 }}>
          {status}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

// ── TAB 1: GUINDASTE & CARGA ──────────────────────────────────────────────────────
function TabGuindasteCarga({ planData = {}, onSave }) {
  // Carga Bruta
  const [cb, setCb] = useState(() => planData.cargaBruta?.inputs || { liq: "", esl: "", man: "", disp: "" });
  const [resCb, setResCb] = useState(() => planData.cargaBruta || null);

  // Volume / Peso
  const [forma, setForma] = useState(() => planData.volume?.forma || "PARALELEPIPEDO");
  const [dims, setDims] = useState(() => planData.volume?.dims || { L: "", C: "", H: "", D: "" });
  const [matIdx, setMatIdx] = useState(() => planData.volume?.matIdx || 0);
  const [resVol, setResVol] = useState(() => planData.volume || null);

  // Taxa de Utilização do Guindaste
  const [ug, setUg] = useState(() => planData.utilizacaoGuindaste?.inputs || { capacidade: "", cargaTotal: "" });
  const [resUg, setResUg] = useState(() => planData.utilizacaoGuindaste || null);

  // SWL
  const [swl, setSwl] = useState(() => planData.swl?.inputs || { crm: "", fsIdx: 2, forca: "" });
  const [resSwl, setResSwl] = useState(() => planData.swl || null);

  const calcCargaBruta = () => {
    const v = Object.values(cb).map(Number);
    if (v.some(isNaN)) return;
    const total = v.reduce((a, b) => a + b, 0);
    const n2869 = total >= 20000;
    const r = { total, n2869, inputs: { ...cb } };
    setResCb(r);
    onSave?.("cargaBruta", r);
  };

  const calcUg = () => {
    const cap = parseFloat(ug.capacidade);
    const ct  = parseFloat(ug.cargaTotal);
    if (isNaN(cap) || isNaN(ct) || cap <= 0) return;
    const pct    = (ct / cap) * 100;
    const risk   = pct < 70 ? "SAFE" : pct < 90 ? "WARNING" : "DANGER";
    const status = pct < 70 ? "SEGURO" : pct < 90 ? "ATENCAO" : "REPROVADO";
    const approved = pct < 90;
    const margem = cap - ct;
    const r = { capacidade: cap, cargaTotal: ct, pct, risk, status, approved, margem, inputs: { ...ug } };
    setResUg(r);
    onSave?.("utilizacaoGuindaste", r);
  };

  const calcVolume = () => {
    const { L, C, H, D } = dims;
    const l = parseFloat(L), c = parseFloat(C), h = parseFloat(H), d = parseFloat(D);
    let vol = 0;
    if (forma === "PARALELEPIPEDO") { if ([l,c,h].some(isNaN)) return; vol = l * c * h; }
    if (forma === "CILINDRO")       { if ([d,h].some(isNaN)) return; vol = (d*d*0.7854) * h; }
    if (forma === "PIRAMIDE")       { if ([l,c,h].some(isNaN)) return; vol = l * c * (h / 3); }
    if (forma === "CUBO")           { if (isNaN(l)) return; vol = l * l * l; }
    if (forma === "CUNHA")          { if ([l,c,h].some(isNaN)) return; vol = (l * c / 2) * h; }
    const mat = MATERIAIS[matIdx];
    const peso = vol * mat.pe;
    const r = { vol, peso, forma, matNome: mat.nome, matPe: mat.pe };
    setResVol(r);
    onSave?.("volume", r);
  };

  const calcSwl = () => {
    const crm = parseFloat(swl.crm), forca = parseFloat(swl.forca);
    if (isNaN(crm) || isNaN(forca) || crm <= 0) return;
    const fs = FATORES_SEG[swl.fsIdx].fsMin;
    const swlVal = crm / fs;
    const taxa = (forca / swlVal) * 100;
    const status = statusCalc(taxa, [80, 100]);
    const r = { swlVal, taxa, fs, status, crm, forca, tipoAplicacao: FATORES_SEG[swl.fsIdx].tipo };
    setResSwl(r);
    onSave?.("swl", r);
  };

  const formaFields = {
    PARALELEPIPEDO: [["L","Largura (m)"],["C","Comprimento (m)"],["H","Altura (m)"]],
    CILINDRO:       [["D","Diâmetro (m)"],["H","Altura (m)"]],
    PIRAMIDE:       [["L","Largura (m)"],["C","Comprimento (m)"],["H","Altura (m)"]],
    CUBO:           [["L","Lado (m)"]],
    CUNHA:          [["L","Largura (m)"],["C","Comprimento (m)"],["H","Altura (m)"]],
  };

  return (
    <div>
      {/* Carga Bruta */}
      <div style={S.card}>
        <div style={S.cardTitle}>⚖ 1.1 — Carga Bruta</div>
        <div style={S.grid()}>
          {[["liq","Carga líquida (kg)"],["esl","Peso eslingas (kg)"],["man","Peso manilhas (kg)"],["disp","Peso dispositivos (kg)"]].map(([k,l])=>(
            <Campo key={k} label={l}>
              <input style={S.input} type="number" min="0" value={cb[k]}
                onChange={e=>setCb(p=>({...p,[k]:e.target.value}))} />
            </Campo>
          ))}
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcCargaBruta}>Calcular</button>
        {resCb && (
          <ResultBox
            status={resCb.n2869 ? "ATENCAO" : "SEGURO"}
            label="Carga Bruta Total"
            valor={resCb.total.toLocaleString("pt-BR")}
            unidade="kg"
            msg={resCb.n2869 ? "N-2869: IÇAMENTO CRÍTICO — carga ≥ 20t. Requer Rigger Nível 3 e plano aprovado." : "Içamento Normal (< 20t)"}
          />
        )}
      </div>

      {/* Taxa de Utilização do Guindaste */}
      <div style={S.card}>
        <div style={S.cardTitle}>🏗 2 — Taxa de Utilização do Guindaste</div>
        <div style={S.grid()}>
          <Campo label="Capacidade do guindaste (kg)">
            <input style={S.input} type="number" min="0" step="1" placeholder="Ex.: 50000"
              value={ug.capacidade} onChange={e=>setUg(p=>({...p,capacidade:e.target.value}))} />
          </Campo>
          <Campo label={`Carga total (kg)${resCb ? " — ou use o valor de 1.1 acima" : ""}`}>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{...S.input, flex:1}} type="number" min="0" step="1" placeholder="Ex.: 12500"
                value={ug.cargaTotal} onChange={e=>setUg(p=>({...p,cargaTotal:e.target.value}))} />
              {resCb && (
                <button
                  style={{ ...S.btn(false), padding:"0 12px", fontSize:11, whiteSpace:"nowrap" }}
                  onClick={() => setUg(p=>({...p, cargaTotal: String(resCb.total)}))}>
                  Usar 1.1
                </button>
              )}
            </div>
          </Campo>
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcUg}>Calcular</button>
        {resUg && (
          <>
            <ResultBox
              status={resUg.status}
              label="Taxa de Utilização"
              valor={resUg.pct.toFixed(1)}
              unidade="%"
              msg={
                `Capacidade: ${resUg.capacidade.toLocaleString("pt-BR")} kg | ` +
                `Carga: ${resUg.cargaTotal.toLocaleString("pt-BR")} kg | ` +
                `Margem: ${resUg.margem.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})} kg | ` +
                (resUg.approved ? "✔ Içamento aprovado" : "✖ Içamento NÃO aprovado — sobrecarga")
              }
            />
            <div style={{...S.progressBar, marginTop:12}}>
              <div style={S.progressFill(resUg.pct, statusStyle(resUg.status).color)} />
            </div>
            <div style={{ display:"flex", gap:8, marginTop:8, fontSize:11, color:"#64748b" }}>
              <span style={{ color:"#22c55e" }}>▌ &lt;70% Seguro</span>
              <span style={{ color:"#f59e0b" }}>▌ 70–89% Atenção</span>
              <span style={{ color:"#ef4444" }}>▌ ≥90% Reprovado</span>
            </div>
          </>
        )}
      </div>

      {/* Volume + Peso */}
      <div style={S.card}>
        <div style={S.cardTitle}>📐 1.2 / 1.3 — Volume & Peso por Geometria</div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:16 }}>
          <Campo label="Forma geométrica">
            <select style={S.select} value={forma} onChange={e=>{setForma(e.target.value); setDims({L:"",C:"",H:"",D:""}); setResVol(null);}}>
              {["PARALELEPIPEDO","CILINDRO","PIRAMIDE","CUBO","CUNHA"].map(f=>(
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Material (NBR 6120)">
            <select style={S.select} value={matIdx} onChange={e=>setMatIdx(Number(e.target.value))}>
              {MATERIAIS.map((m,i)=>(
                <option key={m.nome} value={i}>{m.nome} — {m.pe.toLocaleString("pt-BR")} kg/m³</option>
              ))}
            </select>
          </Campo>
        </div>
        <div style={S.grid()}>
          {formaFields[forma].map(([k,l])=>(
            <Campo key={k} label={l}>
              <input style={S.input} type="number" min="0" step="0.01" value={dims[k]}
                onChange={e=>setDims(p=>({...p,[k]:e.target.value}))} />
            </Campo>
          ))}
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcVolume}>Calcular</button>
        {resVol && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:16 }}>
            <ResultBox status="SEGURO" label="Volume" valor={resVol.vol.toLocaleString("pt-BR",{maximumFractionDigits:4,timeZone:"America/Sao_Paulo"})} unidade="m³" />
            <ResultBox status={resVol.peso >= 20000 ? "ATENCAO" : "SEGURO"} label="Peso estimado" valor={resVol.peso.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})} unidade="kg"
              msg={resVol.peso>=20000?"N-2869: Içamento Crítico":undefined}/>
          </div>
        )}
      </div>

      {/* SWL */}
      <div style={S.card}>
        <div style={S.cardTitle}>🔒 4 — SWL / Fator de Segurança</div>
        <div style={S.grid()}>
          <Campo label="CRM — Carga de Ruptura Mínima (kg)">
            <input style={S.input} type="number" min="0" value={swl.crm}
              onChange={e=>setSwl(p=>({...p,crm:e.target.value}))} />
          </Campo>
          <Campo label="Tipo de aplicação">
            <select style={S.select} value={swl.fsIdx} onChange={e=>setSwl(p=>({...p,fsIdx:Number(e.target.value)}))}>
              {FATORES_SEG.map((f,i)=>(
                <option key={i} value={i}>{f.tipo} (FS ≥ {f.fsMin})</option>
              ))}
            </select>
          </Campo>
          <Campo label="Força exercida (kg)">
            <input style={S.input} type="number" min="0" value={swl.forca}
              onChange={e=>setSwl(p=>({...p,forca:e.target.value}))} />
          </Campo>
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcSwl}>Calcular</button>
        {resSwl && (
          <>
            <ResultBox
              status={resSwl.status}
              label="SWL (Carga de Trabalho Segura)"
              valor={resSwl.swlVal.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})}
              unidade="kg"
              msg={`Taxa de utilização: ${resSwl.taxa.toFixed(1)}% | FS aplicado: ${resSwl.fs}:1`}
            />
            <div style={{...S.progressBar, marginTop:12}}>
              <div style={S.progressFill(resSwl.taxa, statusStyle(resSwl.status).color)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── TAB 2: LINGADA & CARGA ────────────────────────────────────────────────────────
function TabLingadaCarga({ planData = {}, onSave }) {
  // Centro de Gravidade
  const [cg, setCg] = useState(() => planData.cg?.inputs || { p1:"", p2:"", dt:"" });
  const [resCg, setResCg] = useState(() => planData.cg || null);

  // Tensão nas Eslingas
  const [te, setTe] = useState(() => planData.tensao?.inputs || { carga:"", pernas:"2", angulo:"60", tipo:"CABO", wll:"" });
  const [resTe, setResTe] = useState(() => planData.tensao || null);

  // Seletor de WLL pela tabela de materiais
  const [matSel, setMatSel] = useState({ tipo: "", id: "", modo: "simples" });

  // Conversão de unidades
  const [conv, setConv] = useState({ pol: "", ft: "", lb: "" });

  // N-2869 extras
  const [n2869, setN2869] = useState(() => planData.n2869?.inputs || {
    vento:"", utilizacao:"", usaDoisGuindastes:false,
    sobreInstalacoes:false, areaClassificada:false,
  });
  const [resN2, setResN2] = useState(() => planData.n2869 || null);

  const calcCG = () => {
    const p1=parseFloat(cg.p1), p2=parseFloat(cg.p2), dt=parseFloat(cg.dt);
    if([p1,p2,dt].some(isNaN)||p1<=0||p2<=0||dt<=0) return;
    const pt = p1+p2;
    const d1 = (p2/pt)*dt;
    const d2 = dt-d1;
    const desequil = Math.abs(p1-p2)/pt*100;
    const r = {pt,d1,d2,desequil,status:desequil>30?"ATENCAO":"SEGURO", inputs:{...cg}};
    setResCg(r);
    onSave?.("cg", r);
  };

  const calcTensao = () => {
    const carga=parseFloat(te.carga), pernas=parseInt(te.pernas), angulo=parseFloat(te.angulo);
    if([carga,pernas,angulo].some(isNaN)||carga<=0) return;
    if(angulo<30) {
      const r = {bloqueado:true, msg:"STOP WORK — N-2869/NR-11: ângulo < 30° é PROIBIDO. Risco de colapso da lingada.", inputs:{...te}};
      setResTe(r); onSave?.("tensao", r); return;
    }
    const mult   = multAngulo(angulo);
    const tensao = (carga / pernas) * mult;
    const fs     = te.tipo === "CINTA" ? 7 : 5;

    // Se o usuário informou o WLL real da eslinga, usa ele para calcular a utilização.
    // Caso contrário, calcula o SWL mínimo necessário a partir do FS como referência.
    const wllVal   = parseFloat(te.wll);
    const temWll   = !isNaN(wllVal) && wllVal > 0;
    const base     = temWll ? wllVal : carga / fs;   // WLL real ou SWL mínimo estimado
    const taxa     = (tensao / base) * 100;
    const statusBase = statusCalc(taxa, [80, 100]);
    const status   = angulo < 45 ? "ATENCAO" : statusBase;

    const r = {
      tensao, mult, taxa, fs,
      wll: temWll ? wllVal : null, temWll,
      swl: temWll ? null : base,   // swl só quando não há WLL informado
      status, bloqueado: false, inputs: {...te},
      msg: angulo < 45
        ? `Atenção: ângulo ${angulo}° abaixo de 45° — zona de risco elevado.`
        : undefined,
    };
    setResTe(r);
    onSave?.("tensao", r);
  };

  const validarN2869 = () => {
    const vento=parseFloat(n2869.vento), util=parseFloat(n2869.utilizacao);
    const critico = (util>=75)||n2869.usaDoisGuindastes||n2869.sobreInstalacoes||n2869.areaClassificada;
    const limUtil = critico ? 75 : 85;
    const alertas = [];
    if(!isNaN(vento)&&vento>=45) alertas.push(`Vento ${vento} km/h ≥ 45 km/h — OPERAÇÃO PROIBIDA.`);
    if(!isNaN(util)&&util>limUtil) alertas.push(`Utilização ${util}% excede limite ${limUtil}% para içamento ${critico?"Crítico":"Normal"}.`);
    if(n2869.usaDoisGuindastes) alertas.push("Dois guindastes → Içamento Crítico: exige Rigger Nível 3.");
    if(n2869.sobreInstalacoes) alertas.push("Içamento sobre instalações vivas → Crítico.");
    if(n2869.areaClassificada) alertas.push("Área classificada (risco explosão) → Crítico.");
    const r = {critico,limUtil,alertas,inputs:{...n2869},
      status: alertas.length===0?"SEGURO":(!isNaN(vento)&&vento>=45)||(!isNaN(util)&&util>100)?"REPROVADO":"ATENCAO"};
    setResN2(r);
    onSave?.("n2869", r);
  };

  return (
    <div>
      {/* Centro de Gravidade */}
      <div style={S.card}>
        <div style={S.cardTitle}>⚖ 2 — Centro de Gravidade (2 pontos)</div>
        <div style={S.grid()}>
          {[["p1","P1 — Peso no ponto 1 (kg)"],["p2","P2 — Peso no ponto 2 (kg)"],["dt","Dt — Distância total entre pontos (m)"]].map(([k,l])=>(
            <Campo key={k} label={l}>
              <input style={S.input} type="number" min="0" step="0.01" value={cg[k]}
                onChange={e=>setCg(p=>({...p,[k]:e.target.value}))} />
            </Campo>
          ))}
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcCG}>Calcular</button>
        {resCg && (
          <>
            <ResultBox status={resCg.status} label="Posição do CG relativa ao Ponto 1"
              valor={resCg.d1.toLocaleString("pt-BR",{maximumFractionDigits:3,timeZone:"America/Sao_Paulo"})} unidade="m"
              msg={`d2: ${resCg.d2.toLocaleString("pt-BR",{maximumFractionDigits:3,timeZone:"America/Sao_Paulo"})} m | Desequilíbrio: ${resCg.desequil.toFixed(1)}%${resCg.desequil>30?" — ATENÇÃO: carga desequilibrada":""}`}
            />
          </>
        )}
      </div>

      {/* Tensão nas Eslingas */}
      <div style={S.card}>
        <div style={S.cardTitle}>📐 3 — Tensão nas Eslingas (N-2869/NBR 13541)</div>
        <div style={S.grid()}>
          <Campo label="Carga total (kg)">
            <input style={S.input} type="number" min="0" value={te.carga}
              onChange={e=>setTe(p=>({...p,carga:e.target.value}))} />
          </Campo>
          <Campo label="Número de pernas">
            <select style={S.select} value={te.pernas} onChange={e=>setTe(p=>({...p,pernas:e.target.value}))}>
              {[1,2,3,4].map(n=><option key={n} value={n}>{n} perna{n>1?"s":""}</option>)}
            </select>
          </Campo>
          <Campo label="Ângulo da eslinga (° com a vertical) — mín. 30°">
            <input style={S.input} type="number" min="1" max="90" value={te.angulo}
              onChange={e=>setTe(p=>({...p,angulo:e.target.value}))} />
          </Campo>
          <Campo label="Tipo de eslinga">
            <select style={S.select} value={te.tipo} onChange={e=>setTe(p=>({...p,tipo:e.target.value}))}>
              <option value="CABO">Cabo de aço (FS 5:1)</option>
              <option value="CINTA">Cinta têxtil (FS 7:1)</option>
            </select>
          </Campo>
          <Campo label="WLL da eslinga (kg) — etiqueta / certificado">
            <input style={S.input} type="number" min="0" step="0.1" placeholder="Ex.: 3200"
              value={te.wll} onChange={e=>setTe(p=>({...p,wll:e.target.value}))} />
          </Campo>
        </div>
        {/* ── Seletor por tabela ── */}
        <div style={{...S.normaBox, marginTop:12, padding:"10px 14px"}}>
          <div style={{color:"#94a3b8", fontSize:11, marginBottom:8, fontWeight:600}}>🔍 Preencher WLL pela tabela de materiais</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:"8px 12px", alignItems:"flex-end"}}>
            {/* Tipo */}
            <div>
              <div style={{fontSize:10, color:"#64748b", marginBottom:3}}>Tipo de material</div>
              <select style={{...S.select, fontSize:11, padding:"4px 8px"}}
                value={matSel.tipo}
                onChange={e => setMatSel({ tipo: e.target.value, id: "", modo: "simples" })}>
                <option value="">— selecionar —</option>
                <optgroup label="Cintas Sintéticas (NBR 13545)">
                  <option value="CINTA">Cinta Têxtil</option>
                </optgroup>
                <optgroup label="Laços de Cabo de Aço (NBR 13541)">
                  <option value="CABO_AF19">6×19 AF (alma de fibra)</option>
                  <option value="CABO_AA19">6×19 AA/IWRC (alma de aço)</option>
                  <option value="CABO_AF37">6×37 AF (alta flexibilidade)</option>
                </optgroup>
                <optgroup label="Correntes (EN 818-4)">
                  <option value="CORRENTE_G80">Corrente Grau 80</option>
                  <option value="CORRENTE_G100">Corrente Grau 100</option>
                </optgroup>
                <optgroup label="Manilhas (ASME B30.26)">
                  <option value="MANILHA_CURVA">Manilha Curva (bow)</option>
                  <option value="MANILHA_RETA">Manilha Reta (dee)</option>
                </optgroup>
              </select>
            </div>
            {/* Tamanho / Cor */}
            {matSel.tipo && (
              <div>
                <div style={{fontSize:10, color:"#64748b", marginBottom:3}}>
                  {matSel.tipo === "CINTA" ? "Cor / Capacidade" : "Diâmetro (mm)"}
                </div>
                <select style={{...S.select, fontSize:11, padding:"4px 8px"}}
                  value={matSel.id}
                  onChange={e => {
                    const v = e.target.value;
                    const isStr = ["CINTA","MANILHA_CURVA","MANILHA_RETA"].includes(matSel.tipo);
                    setMatSel(p => ({ ...p, id: v === "" ? "" : (isStr ? v : parseFloat(v)) }));
                  }}>
                  <option value="">— selecionar —</option>
                  {matSel.tipo === "CINTA" && CINTA_SINTETICA_TABLE.map(r => (
                    <option key={r.cor} value={r.cor}>{r.cor} — {r.vertical}t vertical</option>
                  ))}
                  {(matSel.tipo === "CABO_AF19") && CABO_ACO_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.diametro} ({r.mm} mm) — {r.simples}t simples</option>
                  ))}
                  {(matSel.tipo === "CABO_AA19") && CABO_ACO_19AA_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.diametro} ({r.mm} mm) — {r.simples}t simples</option>
                  ))}
                  {(matSel.tipo === "CABO_AF37") && CABO_ACO_37AF_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.diametro} ({r.mm} mm) — {r.simples}t simples</option>
                  ))}
                  {(matSel.tipo === "CORRENTE_G80") && CORRENTE_G80_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.mm} mm — {r.simples}t simples</option>
                  ))}
                  {(matSel.tipo === "CORRENTE_G100") && CORRENTE_G100_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.mm} mm — {r.simples}t simples</option>
                  ))}
                  {(matSel.tipo === "MANILHA_CURVA" || matSel.tipo === "MANILHA_RETA") && MANILHA_TABLE.map(r => (
                    <option key={r.pol} value={r.pol}>{r.pol} ({r.mm} mm) — SWL {matSel.tipo === "MANILHA_CURVA" ? r.swlCurva : r.swlReta}t</option>
                  ))}
                </select>
              </div>
            )}
            {/* Modo de uso */}
            {matSel.tipo && matSel.id !== "" && !["MANILHA_CURVA","MANILHA_RETA"].includes(matSel.tipo) && (
              <div>
                <div style={{fontSize:10, color:"#64748b", marginBottom:3}}>Modo de uso</div>
                <select style={{...S.select, fontSize:11, padding:"4px 8px"}}
                  value={matSel.modo}
                  onChange={e => setMatSel(p => ({ ...p, modo: e.target.value }))}>
                  {matSel.tipo === "CINTA" && <>
                    <option value="vertical">Vertical (simples)</option>
                    <option value="choker">Choker (abraçado)</option>
                    <option value="cesto">Cesto (2 pernas)</option>
                    <option value="ang45">Cesto 45°</option>
                    <option value="ang30">Cesto 30°</option>
                  </>}
                  {(matSel.tipo === "CABO_AF19" || matSel.tipo === "CABO_AA19" || matSel.tipo === "CABO_AF37") && <>
                    <option value="simples">Simples (vertical)</option>
                    <option value="forca">Choker (abraçado)</option>
                    <option value="cesto">Cesto (2 pernas 0°)</option>
                  </>}
                  {(matSel.tipo === "CORRENTE_G80" || matSel.tipo === "CORRENTE_G100") && <>
                    <option value="simples">1 Perna (simples)</option>
                    <option value="choker">Choker</option>
                    <option value="cesto">Cesto (0°)</option>
                    <option value="pernas2_ang60">2 Pernas 60°</option>
                    <option value="pernas2_ang45">2 Pernas 45°</option>
                    <option value="pernas4_ang60">4 Pernas 60°</option>
                    <option value="pernas4_ang45">4 Pernas 45°</option>
                  </>}
                </select>
              </div>
            )}
            {/* Botão aplicar */}
            {matSel.tipo && matSel.id !== "" && (() => {
              const wll = lookupWllFromMaterial(matSel);
              if (!wll) return null;
              return (
                <div>
                  <div style={{fontSize:10, color:"#22c55e", marginBottom:3}}>WLL encontrado</div>
                  <button
                    style={{...S.btn(false), padding:"4px 12px", fontSize:11, background:"#052e16", borderColor:"#22c55e44", color:"#22c55e"}}
                    onClick={() => setTe(p => ({ ...p, wll: String(wll) }))}>
                    Usar {(wll/1000).toFixed(3)} t ({wll.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} kg)
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
        <div style={{...S.normaBox, marginTop:12, fontSize:11, color:"#64748b"}}>
          💡 Informe o WLL (Carga de Trabalho) da eslinga para calcular a utilização real. Se omitido,
          a utilização será estimada pelo FS mínimo da norma ({te.tipo==="CINTA"?"7:1":"5:1"}).
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcTensao}>Calcular</button>
        {resTe && (
          resTe.bloqueado
          ? <div style={{...S.errorBox, fontSize:13, marginTop:16, fontWeight:700}}>{resTe.msg}</div>
          : <ResultBox status={resTe.status} label="Tensão por perna"
              valor={resTe.tensao.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})} unidade="kgf"
              msg={
                resTe.temWll
                  ? `Mult: ${resTe.mult.toFixed(3)} | WLL eslinga: ${resTe.wll.toLocaleString("pt-BR",{maximumFractionDigits:0,timeZone:"America/Sao_Paulo"})} kg | Utilização WLL: ${resTe.taxa.toFixed(1)}%${resTe.msg?` — ${resTe.msg}`:""}`
                  : `Mult: ${resTe.mult.toFixed(3)} | SWL mín. (FS ${resTe.fs}:1): ${resTe.swl.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})} kg | Util. estimada: ${resTe.taxa.toFixed(1)}%${resTe.msg?` — ${resTe.msg}`:""}`
              }
            />
        )}
        {/* Tabela de referência */}
        <div style={{...S.normaBox, marginTop:16}}>
          <div style={{color:"#f59e0b", marginBottom:8, fontSize:11, letterSpacing:"1px", textTransform:"uppercase"}}>Tabela de Multiplicadores — NR-11 / ABNT NBR 13541 / N-2869</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:"4px 14px", fontSize:11}}>
            {[[90,1.000],[85,1.004],[80,1.015],[75,1.035],[70,1.064],[65,1.103],[60,1.155],[55,1.221],[50,1.305],[45,1.414],[40,1.556],[35,1.743]].map(([g,m])=>(
              <span key={g} style={{color: g<45?"#f59e0b":g<30?"#ef4444":"#64748b"}}>{g}°→{m.toFixed(3)}</span>
            ))}
            <span style={{color:"#ef4444", fontWeight:700}}>{"<"}30°→PROIBIDO</span>
          </div>
        </div>
      </div>

      {/* N-2869 Validações */}
      <div style={S.card}>
        <div style={S.cardTitle}>🛡 N-2869 — Classificação & Validações</div>
        <div style={S.grid()}>
          <Campo label="Velocidade do vento (km/h)">
            <input style={S.input} type="number" min="0" value={n2869.vento}
              onChange={e=>setN2869(p=>({...p,vento:e.target.value}))} />
          </Campo>
          <Campo label="Utilização do guindaste (%)">
            <input style={S.input} type="number" min="0" max="100" value={n2869.utilizacao}
              onChange={e=>setN2869(p=>({...p,utilizacao:e.target.value}))} />
          </Campo>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:10, marginTop:14}}>
          {[
            ["usaDoisGuindastes","Operação com 2 ou mais guindastes simultâneos"],
            ["sobreInstalacoes","Carga passa sobre tubulações/equipamentos críticos"],
            ["areaClassificada","Área classificada (risco de explosão)"],
          ].map(([k,l])=>(
            <label key={k} style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:12, color:"#94a3b8"}}>
              <input type="checkbox" checked={n2869[k]} onChange={e=>setN2869(p=>({...p,[k]:e.target.checked}))}
                style={{width:16, height:16, accentColor:"#f59e0b"}} />
              {l}
            </label>
          ))}
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={validarN2869}>Validar N-2869</button>
        {resN2 && (
          <>
            <div style={{background: resN2.critico?"#2d1900":"#052e16", border:`1px solid ${resN2.critico?"#f59e0b33":"#22c55e33"}`, borderRadius:10, padding:14, marginTop:14}}>
              <div style={{fontWeight:700, color: resN2.critico?"#f59e0b":"#22c55e", fontSize:13}}>
                Classificação: IÇAMENTO {resN2.critico?"CRÍTICO":"NORMAL"}
              </div>
              <div style={{color:"#94a3b8", fontSize:11, marginTop:4}}>Limite de utilização: {resN2.limUtil}%</div>
              {resN2.critico && <div style={{color:"#f59e0b", fontSize:11, marginTop:4}}>Requer assinatura de Rigger Nível 3 e plano aprovado pela supervisão.</div>}
            </div>
            {resN2.alertas.map((a,i)=>(
              <div key={i} style={{...S.errorBox, marginTop:8}}>{a}</div>
            ))}
            {resN2.alertas.length===0 && <div style={{...S.successBox, marginTop:8}}>Todos os parâmetros N-2869 dentro dos limites.</div>}
          </>
        )}
      </div>

      {/* Conversão de Unidades */}
      <div style={S.card}>
        <div style={S.cardTitle}>📐 Conversão de Unidades</div>
        {/* grid: 2 colunas em telas largas, 1 em telas estreitas */}
        <style>{`
          .conv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
          .conv-pair { display: grid; grid-template-columns: 1fr auto 1fr; gap: 6px; align-items: end; }
          .conv-pair input { width: 100%; box-sizing: border-box; min-width: 0; }
          .conv-arrow { color: #475569; font-size: 16px; text-align: center; padding-bottom: 8px; }
          .conv-label { font-size: 10px; color: #64748b; margin-bottom: 3px; }
        `}</style>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          {/* Polegadas ↔ Milímetros */}
          <div>
            <div style={{fontSize:11, color:"#94a3b8", marginBottom:7, fontWeight:600}}>Polegadas ↔ Milímetros</div>
            <div className="conv-grid">
              <div className="conv-pair">
                <div>
                  <div className="conv-label">Polegadas (in)</div>
                  <input style={S.input} type="number" placeholder="ex: 1.5" step="0.001"
                    value={conv.pol} onChange={e=>setConv(p=>({...p,pol:e.target.value}))} />
                </div>
                <div className="conv-arrow">→</div>
                <div>
                  <div className="conv-label">Milímetros (mm)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.pol !== "" && !isNaN(parseFloat(conv.pol)) ? (parseFloat(conv.pol)*25.4).toFixed(3) : ""} />
                </div>
              </div>
              <div className="conv-pair">
                <div>
                  <div className="conv-label">Milímetros (mm)</div>
                  <input style={S.input} type="number" placeholder="ex: 25.4" step="0.01"
                    value={conv.mmPol ?? ""} onChange={e=>setConv(p=>({...p,mmPol:e.target.value}))} />
                </div>
                <div className="conv-arrow">→</div>
                <div>
                  <div className="conv-label">Polegadas (in)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.mmPol !== undefined && conv.mmPol !== "" && !isNaN(parseFloat(conv.mmPol)) ? (parseFloat(conv.mmPol)/25.4).toFixed(5) : ""} />
                </div>
              </div>
            </div>
          </div>
          {/* Pés ↔ Metros */}
          <div>
            <div style={{fontSize:11, color:"#94a3b8", marginBottom:7, fontWeight:600}}>Pés ↔ Metros</div>
            <div className="conv-grid">
              <div className="conv-pair">
                <div>
                  <div className="conv-label">Pés (ft)</div>
                  <input style={S.input} type="number" placeholder="ex: 10" step="0.01"
                    value={conv.ft} onChange={e=>setConv(p=>({...p,ft:e.target.value}))} />
                </div>
                <div className="conv-arrow">→</div>
                <div>
                  <div className="conv-label">Metros (m)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.ft !== "" && !isNaN(parseFloat(conv.ft)) ? (parseFloat(conv.ft)*0.3048).toFixed(4) : ""} />
                </div>
              </div>
              <div className="conv-pair">
                <div>
                  <div className="conv-label">Metros (m)</div>
                  <input style={S.input} type="number" placeholder="ex: 3.048" step="0.001"
                    value={conv.m ?? ""} onChange={e=>setConv(p=>({...p,m:e.target.value}))} />
                </div>
                <div className="conv-arrow">→</div>
                <div>
                  <div className="conv-label">Pés (ft)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.m !== undefined && conv.m !== "" && !isNaN(parseFloat(conv.m)) ? (parseFloat(conv.m)/0.3048).toFixed(4) : ""} />
                </div>
              </div>
            </div>
          </div>
          {/* Libras ↔ Quilogramas */}
          <div>
            <div style={{fontSize:11, color:"#94a3b8", marginBottom:7, fontWeight:600}}>Libras ↔ Quilogramas</div>
            <div className="conv-grid">
              <div className="conv-pair">
                <div>
                  <div className="conv-label">Libras (lb)</div>
                  <input style={S.input} type="number" placeholder="ex: 2000" step="0.1"
                    value={conv.lb} onChange={e=>setConv(p=>({...p,lb:e.target.value}))} />
                </div>
                <div className="conv-arrow">→</div>
                <div>
                  <div className="conv-label">Quilogramas (kg)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.lb !== "" && !isNaN(parseFloat(conv.lb)) ? (parseFloat(conv.lb)*0.4536).toFixed(3) : ""} />
                </div>
              </div>
              <div className="conv-pair">
                <div>
                  <div className="conv-label">Quilogramas (kg)</div>
                  <input style={S.input} type="number" placeholder="ex: 907.18" step="0.1"
                    value={conv.kg ?? ""} onChange={e=>setConv(p=>({...p,kg:e.target.value}))} />
                </div>
                <div className="conv-arrow">→</div>
                <div>
                  <div className="conv-label">Libras (lb)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.kg !== undefined && conv.kg !== "" && !isNaN(parseFloat(conv.kg)) ? (parseFloat(conv.kg)/0.4536).toFixed(3) : ""} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{...S.normaBox, marginTop:12, fontSize:10, color:"#475569"}}>
          1 pol = 25,4 mm · 1 ft = 0,3048 m · 1 lb = 0,4536 kg
        </div>
      </div>
    </div>
  );
}

// ── TAB 3: CHECKLIST DE CAMPO ─────────────────────────────────────────────────────
const CHECKLIST_CAMPO = [
  { id:"c1",  cat:"Guindastes & Solo",          item:"Estabilidade das esteiras/sapatas verificada" },
  { id:"c2",  cat:"Guindastes & Solo",          item:"Laudo de compactação do solo disponível" },
  { id:"c3",  cat:"Guindastes & Solo",          item:"Pressão das patolas calculada e dentro do limite do solo" },
  { id:"c4",  cat:"Guindastes & Solo",          item:"Pranchas de distribuição dimensionadas e posicionadas" },
  { id:"c5",  cat:"Equipamentos",               item:"Condições gerais do guindaste verificadas" },
  { id:"c6",  cat:"Equipamentos",               item:"Condições do moitão e cabos de içamento verificadas" },
  { id:"c7",  cat:"Equipamentos",               item:"Tabela de carga em poder do operador" },
  { id:"c8",  cat:"Equipamentos",               item:"Raio real medido na trena ≤ raio planejado" },
  { id:"c9",  cat:"Acessórios",                 item:"Eslingas/cintas sem fios rompidos ou cortes" },
  { id:"c10", cat:"Acessórios",                 item:"Todos acessórios com TAG e certificado de teste (12 meses)" },
  { id:"c11", cat:"Acessórios",                 item:"Manilhas e ganchos sem pintura (que oculta trincas)" },
  { id:"c12", cat:"Acessórios",                 item:"Relação D/d verificada (dano por curvatura excessiva)" },
  { id:"c13", cat:"Pessoal & Comunicação",      item:"Nível de experiência do operador compatível com o equipamento" },
  { id:"c14", cat:"Pessoal & Comunicação",      item:"Nível de experiência do sinaleiro" },
  { id:"c15", cat:"Pessoal & Comunicação",      item:"Supervisor experiente presente no local" },
  { id:"c16", cat:"Pessoal & Comunicação",      item:"Sistema de comunicação (rádio) testado" },
  { id:"c17", cat:"Ambiente",                   item:"Velocidade do vento < 45 km/h (boletim climático)" },
  { id:"c18", cat:"Ambiente",                   item:"Verificação do subsolo (galerias, fundações, envelopes)" },
  { id:"c19", cat:"Ambiente",                   item:"Redes elétricas na proximidade verificadas" },
  { id:"c20", cat:"Ambiente",                   item:"Linha de fogo (área de giro e queda) isolada e sinalizada" },
  { id:"c21", cat:"N-2869 — Petrobras",         item:"Plano de içamento elaborado e aprovado pela supervisão" },
  { id:"c22", cat:"N-2869 — Petrobras",         item:"APR preenchida e assinada por todos os envolvidos" },
  { id:"c23", cat:"N-2869 — Petrobras",         item:"Zona de exclusão delimitada conforme plano" },
  { id:"c24", cat:"N-2869 — Petrobras",         item:"Para içamento crítico: Rigger Nível 3 designado e presente" },
  { id:"c25", cat:"N-2869 — Petrobras",         item:"Certificados de calibração dos equipamentos de monitoração vigentes" },
  { id:"c26", cat:"N-2869 — Petrobras",         item:"Plano de contingência discutido com toda a equipe" },
];

const CL_KEY = "rc_checklist_campo";

function TabChecklistCampo({ planData }) {
  const [checked, setChecked]       = useState(() => { try { return JSON.parse(localStorage.getItem(CL_KEY)||"{}"); } catch { return {}; } });
  const [resp, setResp]             = useState("");
  const [pat, setPat]               = useState({ cargaTotal:"", pesoGuindaste:"", areaPatolas:"" });
  const [resPat, setResPat]         = useState(null);
  const [resistSolo, setResistSolo] = useState("1.5");
  const [showRelatorio, setShowRelatorio] = useState(false);

  // Auth — verificado no momento da renderização
  const user       = getUser();
  const isLoggedIn = !!getToken();
  const isGerente  = user?.role === "GERENTE_OPERACOES";

  // OS / Solicitação de Liberação (somente usuários logados)
  const [jobId,      setJobId]      = useState("");
  const [solicitacao, setSolicitacao] = useState(null);
  const [polling,    setPolling]    = useState(false);
  const [solLoading, setSolLoading] = useState(false);
  const [solError,   setSolError]   = useState(null);

  useEffect(() => { localStorage.setItem(CL_KEY, JSON.stringify(checked)); }, [checked]);

  // Polling do status da solicitação a cada 5 s
  useEffect(() => {
    if (!polling || !solicitacao) return;
    if (solicitacao.status !== "ANALISAR") { setPolling(false); return; }
    const timer = setInterval(async () => {
      try {
        const r = await authFetch(`${API}/api/liberacoes/${solicitacao.id}`);
        const d = await r.json();
        setSolicitacao(d);
        if (d.status !== "ANALISAR") setPolling(false);
      } catch { /* ignora erros de rede no polling */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [polling, solicitacao]);

  const solicitarLiberacao = async () => {
    if (!jobId.trim()) { setSolError("Preencha o número da OS."); return; }
    setSolLoading(true); setSolError(null);
    try {
      const ug  = planData?.utilizacaoGuindaste;
      const cb  = planData?.cargaBruta;
      const te  = planData?.tensao;

      // Mapeamento correto planData → LiberacaoRequest DTO (campos do backend)
      const dadosCapacidade = {
        capGuindasteKg:  ug?.capacidade   ?? null,
        capCargaKg:      cb?.inputs?.liq  ?? ug?.cargaTotal ?? null,
        capAparelhoKg:   cb?.inputs
          ? (Number(cb.inputs.esl || 0) + Number(cb.inputs.man || 0) + Number(cb.inputs.disp || 0))
          : null,
        capTotalKg:      ug?.cargaTotal   ?? cb?.total ?? null,
        capUsoPercent:   ug?.pct          ?? null,
        capRisco:        ug?.risk         ?? null,
      };

      const dadosEslinga = {
        eslNumPernas:           te?.inputs?.pernas  ? parseInt(te.inputs.pernas)    : null,
        eslAnguloGraus:         te?.inputs?.angulo  ? parseFloat(te.inputs.angulo)  : null,
        eslTensaoPorPernaKg:    te?.tensao           ?? null,
        eslFatorCarga:          te?.mult             ?? null,
        eslRisco:               te?.status           ?? null,
        eslAnguloAviso:         te?.inputs?.angulo   ? parseFloat(te.inputs.angulo) < 45 : null,
        eslWllKg:               te?.wll              ?? null,
        eslWllUsoPercent:       te?.taxa             ?? null,
        eslTemManilha:          false,
        eslManilhaCapacidadeKg: null,
        eslManilhaUsoPercent:   null,
        eslManilhaCompativel:   null,
      };

      const res = await authFetch(`${API}/api/liberacoes`, {
        method: "POST",
        body: JSON.stringify({
          operacaoOs:  jobId.trim(),
          riggerNome:  user?.userName || "—",
          dadosCapacidade,
          dadosEslinga,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSolError(data.error || data.message || "Erro ao enviar solicitação."); return; }
      setSolicitacao(data);
      setPolling(true);
    } catch { setSolError("Não foi possível conectar à API."); }
    finally   { setSolLoading(false); }
  };

  // Impressão via nova janela — usa openPrintWindow (pdf.js) para evitar tela em branco
  const imprimirRelatorio = () => {
    const el = document.getElementById("rc-relatorio");
    if (!el) return;
    const result = openPrintWindow(el.outerHTML);
    if (!result.success) alert("Pop-up bloqueado. Permita pop-ups neste site para imprimir.");
  };

  const toggle = (id) => setChecked(p => ({ ...p, [id]: !p[id] }));
  const total  = CHECKLIST_CAMPO.length;
  const done   = Object.values(checked).filter(Boolean).length;
  const pct    = Math.round((done/total)*100);

  const calcPatolamento = () => {
    const ct=parseFloat(pat.cargaTotal), pg=parseFloat(pat.pesoGuindaste), area=parseFloat(pat.areaPatolas);
    if([ct,pg,area].some(isNaN)||area<=0) return;
    const pressao = (ct+pg)/area;
    const resist  = parseFloat(resistSolo);
    const ok      = !isNaN(resist) && pressao <= resist;
    setResPat({ pressao, status: ok?"SEGURO":"REPROVADO",
      msg: ok ? `${pressao.toFixed(3)} t/m² ≤ resistência ${resist} t/m²` : `${pressao.toFixed(3)} t/m² EXCEDE ${resist} t/m² — ampliar pranchas!` });
  };

  const categorias = [...new Set(CHECKLIST_CAMPO.map(i=>i.cat))];
  const fmt = (v, dec=1) => v != null ? Number(v).toLocaleString("pt-BR",{maximumFractionDigits:dec,timeZone:"America/Sao_Paulo"}) : "—";
  const stColor = s => s==="SEGURO"?"#16a34a":s==="ATENCAO"?"#d97706":"#dc2626";

  const Relatorio = () => {
    const { cargaBruta, volume, swl, cg, tensao, n2869, petrobrasData } = planData || {};
    const emitido = new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
    const temDados = !!(cargaBruta || volume || swl || cg || tensao || n2869 || petrobrasData);
    // Sec usa texto escuro sobre fundo claro para garantir visibilidade ao imprimir
    // (browsers desativam fundos por padrão → texto branco em fundo escuro ficaria invisível)
    const Sec = ({title, children}) => (
      <div style={{marginBottom:18}}>
        <div style={{background:"#e8f0fe",color:"#1e3a5f",fontWeight:700,fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",padding:"5px 12px",borderRadius:"6px 6px 0 0",borderLeft:"3px solid #1e3a5f"}}>{title}</div>
        <div style={{border:"1px solid #d1d5db",borderTop:"none",borderRadius:"0 0 6px 6px",padding:"4px 12px"}}>{children}</div>
      </div>
    );
    const Row = ({l,v,bold}) => (
      <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e5e7eb"}}>
        <span style={{color:"#374151",fontSize:12}}>{l}</span>
        <span style={{fontWeight:bold?700:500,color:"#111827",fontSize:12}}>{v}</span>
      </div>
    );
    return (
      <div id="rc-relatorio" style={{background:"#fff",color:"#111",padding:32,maxWidth:740,margin:"0 auto",fontFamily:"Arial,sans-serif"}}>
        {/* Cabeçalho */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,borderBottom:"3px solid #1e3a5f",paddingBottom:16}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:"#1e3a5f"}}>RIGGINGCHECK</div>
            <div style={{fontSize:12,color:"#6b7280"}}>Relatório de Planejamento de Içamento</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#6b7280"}}>Emitido em</div>
            <div style={{fontSize:13,fontWeight:700,color:"#111"}}>{emitido}</div>
            {resp && <div style={{fontSize:12,color:"#374151",marginTop:4}}>Supervisor: <strong>{resp}</strong></div>}
          </div>
        </div>

        {/* Carga Bruta */}
        {cargaBruta && (
          <Sec title="Carga Bruta">
            <Row l="Carga líquida"    v={`${fmt(cargaBruta.inputs?.liq)} kg`} />
            <Row l="Peso das eslingas"  v={`${fmt(cargaBruta.inputs?.esl)} kg`} />
            <Row l="Peso das manilhas"  v={`${fmt(cargaBruta.inputs?.man)} kg`} />
            <Row l="Peso dos dispositivos" v={`${fmt(cargaBruta.inputs?.disp)} kg`} />
            <Row l="CARGA BRUTA TOTAL" v={`${fmt(cargaBruta.total)} kg`} bold />
            <Row l="Classificação N-2869" v={cargaBruta.n2869?"IÇAMENTO CRÍTICO (≥ 20t)":"Içamento Normal (< 20t)"}
                bold style={{color: cargaBruta.n2869?"#d97706":"#16a34a"}} />
          </Sec>
        )}

        {/* Volume & Peso */}
        {volume && (
          <Sec title="Volume & Peso Estimado">
            <Row l="Forma geométrica"   v={volume.forma} />
            <Row l="Material"           v={`${volume.matNome} — ${fmt(volume.matPe,0)} kg/m³`} />
            <Row l="Volume calculado"   v={`${fmt(volume.vol,4)} m³`} />
            <Row l="Peso estimado"      v={`${fmt(volume.peso,1)} kg`} bold />
          </Sec>
        )}

        {/* SWL */}
        {swl && (
          <Sec title="SWL / Fator de Segurança">
            <Row l="CRM (Carga de Ruptura Mínima)" v={`${fmt(swl.crm)} kg`} />
            <Row l="Aplicação"          v={swl.tipoAplicacao} />
            <Row l="Fator de Segurança" v={`${swl.fs}:1`} />
            <Row l="SWL"               v={`${fmt(swl.swlVal,1)} kg`} bold />
            <Row l="Força exercida"     v={`${fmt(swl.forca)} kg`} />
            <Row l="Taxa de utilização" v={`${fmt(swl.taxa,1)}%`} bold />
            <Row l="Status"            v={swl.status} bold />
          </Sec>
        )}

        {/* Centro de Gravidade */}
        {cg && (
          <Sec title="Centro de Gravidade">
            <Row l="Peso P1"            v={`${fmt(cg.inputs?.p1)} kg`} />
            <Row l="Peso P2"            v={`${fmt(cg.inputs?.p2)} kg`} />
            <Row l="Peso total"         v={`${fmt(cg.pt)} kg`} bold />
            <Row l="Distância total Dt" v={`${fmt(cg.inputs?.dt,3)} m`} />
            <Row l="d1 (CG → ponto 1)" v={`${fmt(cg.d1,3)} m`} bold />
            <Row l="d2 (CG → ponto 2)" v={`${fmt(cg.d2,3)} m`} bold />
            <Row l="Desequilíbrio"      v={`${fmt(cg.desequil,1)}%${cg.desequil>30?" — ATENÇÃO":""}` } />
          </Sec>
        )}

        {/* Tensão nas Eslingas */}
        {tensao && !tensao.bloqueado && (
          <Sec title="Tensão nas Eslingas">
            <Row l="Carga total"        v={`${fmt(tensao.inputs?.carga)} kg`} />
            <Row l="Número de pernas"   v={tensao.inputs?.pernas} />
            <Row l="Ângulo (vertical)"  v={`${tensao.inputs?.angulo}°`} />
            <Row l="Tipo"               v={tensao.inputs?.tipo==="CINTA"?"Cinta têxtil":"Cabo de aço"} />
            <Row l="Multiplicador"      v={fmt(tensao.mult,3)} />
            <Row l="Tensão por perna"   v={`${fmt(tensao.tensao,1)} kgf`} bold />
            <Row l="Fator de Segurança" v={`${tensao.fs}:1`} />
            {tensao.temWll
              ? <Row l="WLL eslinga (cert.)" v={`${fmt(tensao.wll,0)} kg`} />
              : <Row l="SWL mín. estimado"   v={`${fmt(tensao.swl,1)} kg`} />
            }
            <Row l={tensao.temWll?"Utilização WLL":"Util. estimada (FS)"}
                 v={`${fmt(tensao.taxa,1)}%`} bold />
            <Row l="Status"             v={tensao.status} bold />
          </Sec>
        )}
        {tensao?.bloqueado && (
          <Sec title="Tensão nas Eslingas">
            <div style={{color:"#dc2626",fontWeight:700,padding:"8px 0",fontSize:12}}>{tensao.msg}</div>
          </Sec>
        )}

        {/* N-2869 (Lingada tab) */}
        {n2869 && (
          <Sec title="Validação N-2869 (Petrobras)">
            <Row l="Classificação"      v={n2869.critico?"IÇAMENTO CRÍTICO":"Içamento Normal"} bold />
            <Row l="Limite utilização"  v={`${n2869.limUtil}%`} />
            <Row l="Vento informado"    v={n2869.inputs?.vento ? `${n2869.inputs.vento} km/h` : "—"} />
            <Row l="Status geral"       v={n2869.status} bold />
            {n2869.alertas?.length > 0 && (
              <div style={{marginTop:6}}>
                {n2869.alertas.map((a,i)=>(
                  <div key={i} style={{color:"#dc2626",fontSize:11,padding:"2px 0"}}>⚠ {a}</div>
                ))}
              </div>
            )}
          </Sec>
        )}

        {/* N-2869 — Módulo Petrobras (dados do TabPetrobras) */}
        {petrobrasData && (
          <div dangerouslySetInnerHTML={{ __html: formatPetrobrasSection(petrobrasData) }} />
        )}

        {/* Patolamento */}
        {resPat && (
          <Sec title="Patolamento">
            <Row l="Carga total"          v={`${pat.cargaTotal} t`} />
            <Row l="Peso do guindaste"    v={`${pat.pesoGuindaste} t`} />
            <Row l="Área de apoio"        v={`${pat.areaPatolas} m²`} />
            <Row l="Resistência do solo"  v={`${resistSolo} t/m²`} />
            <Row l="Pressão calculada"    v={`${resPat.pressao.toFixed(3)} t/m²`} bold />
            <Row l="Status"               v={resPat.status} bold />
          </Sec>
        )}

        {/* Checklist */}
        {!temDados && (
          <div style={{background:"#fef9c3",border:"1px solid #fde047",borderRadius:6,padding:"10px 14px",marginBottom:18,fontSize:12,color:"#713f12"}}>
            ⚠ Nenhum cálculo de içamento registrado. Para obter o relatório completo, preencha e calcule os dados nas abas <strong>Guindaste &amp; Carga</strong> e <strong>Lingada &amp; Carga</strong>.
          </div>
        )}
        <Sec title={`Checklist de Campo — ${done}/${total} itens (${pct}%)`}>
          {CHECKLIST_CAMPO.map(item=>(
            <div key={item.id} style={{display:"flex",gap:8,padding:"3px 0",borderBottom:"1px solid #e5e7eb",alignItems:"flex-start"}}>
              <span style={{color:checked[item.id]?"#16a34a":"#374151",fontWeight:700,fontSize:13,minWidth:16}}>{checked[item.id]?"✓":"○"}</span>
              <span style={{fontSize:11,color:"#374151"}}>{item.item}</span>
            </div>
          ))}
        </Sec>

        {/* Rodapé */}
        <div style={{borderTop:"1px solid #d1d5db",marginTop:20,paddingTop:12,display:"flex",justifyContent:"space-between",fontSize:10,color:"#9ca3af",flexWrap:"wrap",gap:8}}>
          <span>RiggingCheck · NR-11 · ABNT NBR 13541 · Petrobrás N-2869</span>
          <span>Documento gerado automaticamente · Verificar dados antes de operar</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Modal Relatório */}
      {showRelatorio && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,overflowY:"auto",padding:"24px 16px"}}>
          <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:16}}>
            <button onClick={imprimirRelatorio} style={{background:"#1e3a5f",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:700,fontSize:13,cursor:"pointer"}}>🖨 Imprimir / Salvar PDF</button>
            <button onClick={()=>setShowRelatorio(false)} style={{background:"transparent",color:"#94a3b8",border:"1px solid #374151",borderRadius:8,padding:"10px 24px",fontSize:13,cursor:"pointer"}}>Fechar</button>
          </div>
          <Relatorio />
        </div>
      )}

      {/* Patolamento */}
      <div style={S.card}>
        <div style={S.cardTitle}>🦺 Cálculo de Patolamento (N-2869)</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:14}}>P = (Carga total + Peso do guindaste) ÷ Área de apoio das patolas</div>
        <div style={S.grid()}>
          <Campo label="Carga total (t)"><input style={S.input} type="number" min="0" step="0.1" value={pat.cargaTotal} onChange={e=>setPat(p=>({...p,cargaTotal:e.target.value}))} /></Campo>
          <Campo label="Peso do guindaste (t)"><input style={S.input} type="number" min="0" step="0.1" value={pat.pesoGuindaste} onChange={e=>setPat(p=>({...p,pesoGuindaste:e.target.value}))} /></Campo>
          <Campo label="Área de apoio das patolas (m²)"><input style={S.input} type="number" min="0" step="0.01" value={pat.areaPatolas} onChange={e=>setPat(p=>({...p,areaPatolas:e.target.value}))} /></Campo>
          <Campo label="Resistência do solo (t/m²)"><input style={S.input} type="number" min="0" step="0.1" value={resistSolo} onChange={e=>setResistSolo(e.target.value)} /></Campo>
        </div>
        <button style={{...S.btn(false),marginTop:16}} onClick={calcPatolamento}>Calcular Pressão</button>
        {resPat && <ResultBox status={resPat.status} label="Pressão nas Patolas" valor={resPat.pressao.toFixed(3)} unidade="t/m²" msg={resPat.msg} />}
      </div>

      {/* Checklist */}
      <div style={S.card}>
        <div style={S.cardTitle}>📋 Checklist de Campo — NR-11 + N-2869</div>
        <Campo label="Supervisor Responsável">
          <input style={{...S.input,maxWidth:320}} value={resp} onChange={e=>setResp(e.target.value)} />
        </Campo>

        <div style={{marginTop:16,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:6}}>
            <span>{done}/{total} itens verificados</span>
            <span style={{color:pct===100?"#22c55e":pct>=70?"#f59e0b":"#ef4444",fontWeight:700}}>{pct}%</span>
          </div>
          <div style={S.progressBar}><div style={S.progressFill(pct,pct===100?"#22c55e":pct>=70?"#f59e0b":"#ef4444")} /></div>
        </div>

        {categorias.map(cat => (
          <div key={cat}>
            <div style={{...S.catTitle,marginTop:20}}>▸ {cat}</div>
            {CHECKLIST_CAMPO.filter(i=>i.cat===cat).map(item=>(
              <div key={item.id} style={S.checkRow(checked[item.id])} onClick={()=>toggle(item.id)}>
                <div style={S.checkbox(checked[item.id])}>{checked[item.id]&&<span style={{color:"#0f0f1a",fontSize:13,fontWeight:900}}>✓</span>}</div>
                <span style={{fontSize:13,color:"#cbd5e1",lineHeight:1.5}}>{item.item}</span>
              </div>
            ))}
          </div>
        ))}

        {canPrintPdf(isLoggedIn, user?.role) && !(planData?.cargaBruta || planData?.tensao || planData?.volume || planData?.swl || planData?.cg) && (
          <div style={{...S.normaBox, marginTop:16, fontSize:11, color:"#d97706", borderColor:"#d9770633", background:"#451a0308"}}>
            ⚠ Nenhum cálculo encontrado. Para um relatório completo, calcule os dados nas abas <strong>Guindaste &amp; Carga</strong> e <strong>Lingada &amp; Carga</strong> antes de gerar o PDF.
          </div>
        )}
        <div style={{display:"flex",gap:10,marginTop:24,flexWrap:"wrap"}}>
          {canPrintPdf(isLoggedIn, user?.role) && (
            <button
              style={{...S.btn(false),background:"linear-gradient(135deg,#1e3a5f,#1e40af)"}}
              onClick={()=>setShowRelatorio(true)}
            >
              Gerar Relatório PDF
            </button>
          )}
          <button
            style={{...S.btn(false),background:"transparent",border:"1px solid #ef444444",color:"#ef4444"}}
            onClick={()=>{ setChecked({}); localStorage.removeItem(CL_KEY); }}
          >
            Limpar Checklist
          </button>
        </div>
        {isLoggedIn && !canPrintPdf(isLoggedIn, user?.role) && (
          <div style={{...S.normaBox,marginTop:12,fontSize:11}}>
            Relatório PDF disponível para perfis: <strong>Gerente de Operações</strong>, <strong>Líder de Equipe</strong> e <strong>Admin Empresa</strong>.
          </div>
        )}
        <div style={{...S.normaBox,marginTop:8}}>
          {resp&&<span>Supervisor: {resp} · </span>}{new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}
        </div>
      </div>

      {/* Tabela de Distâncias Seguras — Alta Tensão */}
      <div style={S.card}>
        <div style={S.cardTitle}>⚡ Distâncias Seguras de Redes de Alta Tensão</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:14}}>
          Distâncias mínimas obrigatórias entre o guindaste/lança/carga e redes elétricas energizadas.
          Medição deve ser feita no ponto mais próximo de qualquer parte do equipamento ou da carga.
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#1e1e35"}}>
                <th style={{padding:"8px 12px",textAlign:"left",color:"#94a3b8",fontWeight:600,borderBottom:"1px solid #2d2d4a"}}>Tensão da rede</th>
                <th style={{padding:"8px 12px",textAlign:"center",color:"#94a3b8",fontWeight:600,borderBottom:"1px solid #2d2d4a"}}>Distância mínima</th>
                <th style={{padding:"8px 12px",textAlign:"left",color:"#94a3b8",fontWeight:600,borderBottom:"1px solid #2d2d4a"}}>Norma</th>
              </tr>
            </thead>
            <tbody>
              {HIGH_VOLTAGE_TABLE.map((row,i)=>(
                <tr key={i} style={{background:i%2===0?"#0f0f1a":"#141424",borderBottom:"1px solid #1e1e35"}}>
                  <td style={{padding:"7px 12px",color:"#cbd5e1"}}>{row.faixa}</td>
                  <td style={{padding:"7px 12px",textAlign:"center",fontWeight:700,
                    color: row.minDist===null?"#ef4444":row.minDist>=8?"#f59e0b":"#22c55e"}}>
                    {row.minDist!==null ? `${row.minDist.toFixed(1).replace(".",",")} m` : "⚠ "+row.norma}
                  </td>
                  <td style={{padding:"7px 12px",color:"#64748b",fontSize:11}}>{row.minDist!==null?row.norma:"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{...S.normaBox,marginTop:12,fontSize:10}}>
          ⚠ Em caso de dúvida ou tensões superiores a 500 kV, paralisar imediatamente e consultar a concessionária de energia elétrica.
          Distâncias consideram condições normais de operação (sem vento) — aumentar em condições adversas.
        </div>
      </div>

      {/* OS e Solicitação de Liberação (somente usuários com login) */}
      {isLoggedIn && (
        <div style={S.card}>
          <div style={S.cardTitle}>📨 Ordem de Serviço & Solicitação de Liberação</div>
          {solicitacao ? (
            <div>
              {solicitacao.status === "ANALISAR" && (
                <div style={{...S.warnBox,textAlign:"center",padding:28}}>
                  <div style={{fontSize:32,marginBottom:12}}>⏳</div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>Aguardando autorização do responsável</div>
                  <div style={{color:"#94a3b8",fontSize:12}}>OS: <strong>{solicitacao.operacaoOs}</strong></div>
                  <div style={{color:"#64748b",fontSize:11,marginTop:8}}>Verificando automaticamente a cada 5 segundos...</div>
                </div>
              )}
              {solicitacao.status === "PROSSEGUIR" && (
                <div style={{background:"#052e16",border:"1px solid #22c55e44",borderRadius:12,padding:28,textAlign:"center"}}>
                  <div style={{fontSize:40,marginBottom:12}}>✅</div>
                  <div style={{fontWeight:800,fontSize:16,color:"#22c55e",marginBottom:8}}>IÇAMENTO AUTORIZADO — PROSSEGUIR</div>
                  <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>OS: <strong style={{color:"#fff"}}>{solicitacao.operacaoOs}</strong></div>
                  <div style={{color:"#22c55e",fontSize:13,marginTop:6}}>Autorizado por: <strong>{solicitacao.aprovadoPorNome}</strong></div>
                  {solicitacao.observacao && <div style={{color:"#94a3b8",fontSize:12,marginTop:8,fontStyle:"italic"}}>"{solicitacao.observacao}"</div>}
                  {solicitacao.resolvidoEm && <div style={{color:"#475569",fontSize:11,marginTop:6}}>{new Date(solicitacao.resolvidoEm).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</div>}
                </div>
              )}
              {solicitacao.status === "PARAR" && (
                <div style={{...S.errorBox,textAlign:"center",padding:28}}>
                  <div style={{fontSize:40,marginBottom:12}}>🚫</div>
                  <div style={{fontWeight:800,fontSize:16,marginBottom:8}}>IÇAMENTO NÃO AUTORIZADO — PARAR</div>
                  <div style={{fontSize:12,marginBottom:4}}>OS: <strong>{solicitacao.operacaoOs}</strong></div>
                  <div style={{fontSize:12}}>Negado por: <strong>{solicitacao.aprovadoPorNome}</strong></div>
                  {solicitacao.observacao && <div style={{fontSize:12,marginTop:8,fontStyle:"italic"}}>Motivo: "{solicitacao.observacao}"</div>}
                  {solicitacao.resolvidoEm && <div style={{fontSize:11,marginTop:6,color:"#f87171"}}>{new Date(solicitacao.resolvidoEm).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</div>}
                </div>
              )}
              <button
                style={{...S.btn(false),background:"#1e1e35",color:"#64748b",marginTop:16}}
                onClick={()=>{ setSolicitacao(null); setJobId(""); setSolError(null); }}
              >
                Nova Operação
              </button>
            </div>
          ) : (
            <div>
              <div style={{fontSize:11,color:"#64748b",marginBottom:16}}>
                Preencha o número da Ordem de Serviço e solicite autorização ao Líder ou Administrador para prosseguir com o içamento.
                Os dados de carga e lingada calculados serão enviados junto com a solicitação.
              </div>
              <Campo label="Número da OS (Ordem de Serviço)">
                <input style={S.input} placeholder="ex: OS-2024-089" value={jobId}
                  onChange={e=>setJobId(e.target.value)} />
              </Campo>
              <div style={{marginTop:10,fontSize:11,color:"#64748b",display:"flex",gap:16,flexWrap:"wrap"}}>
                <span>Operador: <strong style={{color:"#94a3b8"}}>{user?.userName||"—"}</strong></span>
                <span>Perfil: <strong style={{color:"#94a3b8"}}>{roleLabel(user?.role)}</strong></span>
              </div>
              {solError && <div style={{...S.errorBox,marginTop:12,fontSize:12}}>{solError}</div>}
              <button
                style={{...S.btn(false),marginTop:16,opacity:solLoading?0.6:1}}
                onClick={solicitarLiberacao}
                disabled={solLoading}
              >
                {solLoading?"Enviando...":"📤 Solicitar Autorização do Içamento"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ABA TABELAS DE CAPACIDADE ─────────────────────────────────────────────────────
function TabEquipamentos() {
  const [secao, setSecao] = useState("cintas");
  const [subCabo, setSubCabo] = useState("af19");

  // ── estilos base ────────────────────────────────────────────────────────────
  const sBase   = { fontFamily: "Arial, sans-serif", fontSize: 14, color: "#cbd5e1" };
  const sCard   = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 18px", marginBottom: 16 };
  const sTh     = { padding: "8px 12px", fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap", textAlign: "left" };
  const sTd     = { padding: "7px 12px", fontSize: 13, borderBottom: "1px solid #0f172a", whiteSpace: "nowrap" };
  const sTdNum  = { ...sTd, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const sTable  = { width: "100%", borderCollapse: "collapse", overflowX: "auto" };

  const wllColor = (t) => t >= 10 ? "#22c55e" : t >= 5 ? "#38bdf8" : t >= 2 ? "#f59e0b" : "#94a3b8";

  const Num = ({ v, unit = "t" }) => (
    <span style={{ color: wllColor(v), fontWeight: 600 }}>
      {v != null ? `${typeof v === "number" ? v.toFixed(2) : v} ${unit}` : "—"}
    </span>
  );

  const SECOES = [
    { id: "cintas",    label: "🎗 Cintas Têxteis"   },
    { id: "cabos",     label: "🔩 Cabos de Aço"     },
    { id: "correntes", label: "⛓ Correntes"         },
    { id: "manilhas",  label: "🔗 Manilhas"          },
  ];

  const CABOS = [
    { id: "af19",  label: "6×19 Alma de Fibra (AF)"   },
    { id: "aa19",  label: "6×19 Alma de Aço (AA/IWRC)" },
    { id: "af37",  label: "6×37 Alma de Fibra (AF)"   },
  ];

  const tabelaCabo = subCabo === "af19" ? CABO_ACO_TABLE
                   : subCabo === "aa19" ? CABO_ACO_19AA_TABLE
                   : CABO_ACO_37AF_TABLE;

  const normaInfo = {
    cintas:    "NBR 13545:2021 — Cintas de Elevação de Poliéster / FS 7:1",
    cabos:     "ABNT NBR 13541-1:2014 — Eslingas de Cabo de Aço / FS 5:1",
    correntes: "EN 818-4 / NBR ISO 3076 — Correntes de Elevação / FS 4:1",
    manilhas:  "NBR 13545 / ASME B30.26 — Manilhas de Elevação",
  };

  return (
    <div style={sBase}>
      {/* Título */}
      <div style={{ ...sCard, background: "#0a0f1a", borderColor: "#0ea5e944", marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>
          📊 Tabelas de Capacidade de Materiais de Içamento
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          WLL — Working Load Limit (Carga Máxima de Trabalho) em toneladas.
          Nunca exceder sem cálculo de içamento aprovado por profissional habilitado.
        </div>
      </div>

      {/* Seletor de seção */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {SECOES.map(s => (
          <button key={s.id} onClick={() => setSecao(s.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: secao === s.id ? "#0ea5e9" : "#1e293b",
            color:      secao === s.id ? "#fff"    : "#94a3b8",
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Norma de referência */}
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 16, letterSpacing: "0.5px" }}>
        📋 {normaInfo[secao]}
      </div>

      {/* ── CINTAS TÊXTEIS ──────────────────────────────────────────────── */}
      {secao === "cintas" && (
        <div style={sCard}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>
            Cintas Sintéticas de Poliéster — Identificação por Cor
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={sTable}>
              <thead>
                <tr style={{ background: "#0a0a0f" }}>
                  <th style={sTh}>Cor</th>
                  <th style={sTh}>WLL Vertical</th>
                  <th style={sTh}>Choker (80°–120°)</th>
                  <th style={sTh}>Cesto 0°–45°</th>
                  <th style={sTh}>Cesto 45° (inclinado)</th>
                  <th style={sTh}>Cesto 30° (inclinado)</th>
                </tr>
              </thead>
              <tbody>
                {CINTA_SINTETICA_TABLE.map((e, i) => {
                  const COR_HEX = {
                    Violeta:"#7c3aed", Verde:"#22c55e", Amarelo:"#f59e0b",
                    Cinza:"#94a3b8", Vermelho:"#ef4444", Branco:"#f1f5f9", Laranja:"#f97316",
                  };
                  return (
                    <tr key={e.cor} style={{ background: i % 2 === 0 ? "#0f172a" : "#0a0a0f" }}>
                      <td style={sTd}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", background: COR_HEX[e.cor] || "#fff", flexShrink: 0 }} />
                          <strong style={{ color: COR_HEX[e.cor] || "#fff" }}>{e.cor}</strong>
                        </div>
                      </td>
                      <td style={sTdNum}><Num v={e.vertical} /></td>
                      <td style={sTdNum}><Num v={e.choker} /></td>
                      <td style={sTdNum}><Num v={e.cesto} /></td>
                      <td style={sTdNum}><Num v={e.ang45} /></td>
                      <td style={sTdNum}><Num v={e.ang30} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 12, lineHeight: 1.7 }}>
            <strong style={{ color: "#64748b" }}>Notas:</strong>
            {" "}Choker = 0,8 × WLL vertical · Cesto 0°–45° = 2,0 × WLL vertical
            · Cesto inclinado = 2 × WLL × sin(ângulo) · FS = 7:1 (NBR 13545:2021).
            Verificar validade do certificado a cada 3 meses.
          </div>
        </div>
      )}

      {/* ── CABOS DE AÇO ────────────────────────────────────────────────── */}
      {secao === "cabos" && (
        <div style={sCard}>
          {/* Sub-seletor de construção */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {CABOS.map(c => (
              <button key={c.id} onClick={() => setSubCabo(c.id)} style={{
                padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
                background: subCabo === c.id ? "#1e40af" : "#1e293b",
                color:      subCabo === c.id ? "#93c5fd" : "#64748b",
              }}>
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            {subCabo === "af19" && "6×19 AF — construção padrão, alma de fibra natural/sintética. Mais flexível; uso geral."}
            {subCabo === "aa19" && "6×19 AA/IWRC — alma de aço independente. ~8-10% maior WLL. Melhor resistência à compressão."}
            {subCabo === "af37" && "6×37 AF — maior número de arames, máxima flexibilidade. WLL ligeiramente inferior para o mesmo Ø."}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={sTable}>
              <thead>
                <tr style={{ background: "#0a0a0f" }}>
                  <th style={sTh}>Diâmetro</th>
                  <th style={sTh}>mm</th>
                  <th style={sTh}>Simples (Vertical)</th>
                  <th style={sTh}>Forca (Choker)</th>
                  <th style={sTh}>Cesto (Basket)</th>
                </tr>
              </thead>
              <tbody>
                {tabelaCabo.map((e, i) => (
                  <tr key={e.diametro} style={{ background: i % 2 === 0 ? "#0f172a" : "#0a0a0f" }}>
                    <td style={{ ...sTd, fontWeight: 700, color: "#e2e8f0" }}>{e.diametro}</td>
                    <td style={sTdNum}>{e.mm}</td>
                    <td style={sTdNum}><Num v={e.simples} /></td>
                    <td style={sTdNum}><Num v={e.forca} /></td>
                    <td style={sTdNum}><Num v={e.cesto} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginTop: 14 }}>
            {[
              { modo: "Simples / Vertical", fator: "1,0 × WLL", cor: "#38bdf8" },
              { modo: "Forca / Choker",     fator: "0,75 × WLL*", cor: "#f59e0b" },
              { modo: "Cesto / Basket",     fator: "2,0 × WLL",   cor: "#22c55e" },
            ].map(m => (
              <div key={m.modo} style={{ background: "#0a0a0f", borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${m.cor}` }}>
                <div style={{ fontWeight: 600, color: m.cor, fontSize: 12 }}>{m.modo}</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{m.fator}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 10 }}>
            * Forca (choker): fator real depende do raio de dobramento.
            FS = 5:1 (NBR 13541-1:2014). Inspeção visual obrigatória antes de cada uso.
          </div>
        </div>
      )}

      {/* ── CORRENTES ───────────────────────────────────────────────────── */}
      {secao === "correntes" && (
        <>
          {[
            { grau: "80",  tabela: CORRENTE_G80_TABLE,  cor: "#f59e0b", badge: "G80" },
            { grau: "100", tabela: CORRENTE_G100_TABLE, cor: "#22c55e", badge: "G100" },
          ].map(({ grau, tabela, cor, badge }) => (
            <div key={grau} style={{ ...sCard, borderColor: cor + "33" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ background: cor, color: "#000", fontWeight: 800, fontSize: 12, borderRadius: 6, padding: "3px 10px" }}>{badge}</div>
                <div style={{ fontWeight: 700, color: "#e2e8f0" }}>Corrente de Içamento Grau {grau}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>EN 818-4 / NBR ISO 3076 · FS 4:1</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={sTable}>
                  <thead>
                    <tr style={{ background: "#0a0a0f" }}>
                      <th style={sTh}>Ø (mm)</th>
                      <th style={sTh}>1 Perna Simples</th>
                      <th style={sTh}>Choker</th>
                      <th style={sTh}>Cesto (basket)</th>
                      <th style={sTh}>2 Pernas 60°</th>
                      <th style={sTh}>2 Pernas 45°</th>
                      <th style={sTh}>4 Pernas 60°</th>
                      <th style={sTh}>4 Pernas 45°</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabela.map((e, i) => (
                      <tr key={e.mm} style={{ background: i % 2 === 0 ? "#0f172a" : "#0a0a0f" }}>
                        <td style={{ ...sTd, fontWeight: 700, color: cor }}>{e.mm}</td>
                        <td style={sTdNum}><Num v={e.simples} /></td>
                        <td style={sTdNum}><Num v={e.choker} /></td>
                        <td style={sTdNum}><Num v={e.cesto} /></td>
                        <td style={sTdNum}><Num v={e.pernas2_ang60} /></td>
                        <td style={sTdNum}><Num v={e.pernas2_ang45} /></td>
                        <td style={sTdNum}><Num v={e.pernas4_ang60} /></td>
                        <td style={sTdNum}><Num v={e.pernas4_ang45} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <div style={{ ...sCard, background: "#0a0f1a", borderColor: "#1e293b" }}>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
              <strong style={{ color: "#94a3b8" }}>Guia rápido:</strong>
              {" "}G80 = cor amarela/laranja · G100 = cor azul/verde ·
              Nunca misturar graus na mesma eslinga ·
              Inspeção a cada 3 meses por profissional qualificado ·
              WLL reduz 50% para ângulo β {'>'} 90° · Proibido soldar ou aquecer elos.
            </div>
          </div>
        </>
      )}

      {/* ── MANILHAS ────────────────────────────────────────────────────── */}
      {secao === "manilhas" && (
        <div style={sCard}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>
            Manilhas de Elevação — Curva (Ω Bow) e Reta (Ancora/Straight)
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { tipo: "🔗 Curva (Bow / Ômega)", desc: "Permite giro lateral; usada em múltiplas pernas. SWL maior para diâmetros acima de 29mm.", cor: "#38bdf8" },
              { tipo: "⚓ Reta (Ancora / Straight)", desc: "Unidirecional; mais indicada para cargas em linha. Não usar com cintas dobradas no pino.", cor: "#a78bfa" },
            ].map(m => (
              <div key={m.tipo} style={{ flex: 1, minWidth: 200, background: "#0a0a0f", borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid ${m.cor}` }}>
                <div style={{ fontWeight: 700, color: m.cor, fontSize: 13, marginBottom: 4 }}>{m.tipo}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{m.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={sTable}>
              <thead>
                <tr style={{ background: "#0a0a0f" }}>
                  <th style={sTh}>Diâmetro do Pino (pol)</th>
                  <th style={sTh}>SWL Curva (Bow)</th>
                  <th style={sTh}>SWL Reta (Straight)</th>
                  <th style={sTh}>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {MANILHA_TABLE.map((e, i) => {
                  const diff = ((e.swlCurva - e.swlReta) / e.swlReta * 100).toFixed(0);
                  return (
                    <tr key={e.pol} style={{ background: i % 2 === 0 ? "#0f172a" : "#0a0a0f" }}>
                      <td style={{ ...sTd, fontWeight: 700, color: "#e2e8f0" }}>{e.pol}<span style={{color:"#475569",fontSize:10,marginLeft:4}}>({e.mm} mm)</span></td>
                      <td style={sTdNum}><Num v={e.swlCurva} /></td>
                      <td style={sTdNum}><Num v={e.swlReta} /></td>
                      <td style={{ ...sTdNum, color: e.swlCurva > e.swlReta ? "#22c55e" : "#94a3b8" }}>
                        {e.swlCurva > e.swlReta ? `+${diff}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 12, lineHeight: 1.7 }}>
            <strong style={{ color: "#64748b" }}>Notas:</strong>
            {" "}SWL conforme NBR 13545 / ASME B30.26 · Verificar marcação WLL gravada no corpo ·
            Nunca usar manilha com pino frouxo ou deformado · Travar pino com arame de segurança ·
            Manilhas pintadas devem ser rejeitadas (pintura oculta defeitos).
          </div>
        </div>
      )}

      {/* Legenda de cores WLL */}
      <div style={{ ...sCard, background: "#0a0a0f", borderColor: "#1e293b" }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>
          Escala de Cores — WLL
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "< 2 t",   cor: "#94a3b8" },
            { label: "2–5 t",   cor: "#f59e0b" },
            { label: "5–10 t",  cor: "#38bdf8" },
            { label: "≥ 10 t",  cor: "#22c55e" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: l.cor }} />
              <span style={{ color: l.cor }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ABA PETROBRAS — N-2869 Rev.B ─────────────────────────────────────────────────
function TabPetrobras({ planData = {}, onSave }) {
  const usoPct = planData.usoPct ?? 0;

  const [classificacao, setClassificacao] = useState(() =>
    classificarIcamento({ usoPct, tandem: false, sobreAreaHabitada: false, cargaEspecial: false })
  );
  const [tandem,            setTandem]            = useState(false);
  const [sobreAreaHabitada, setSobreAreaHabitada] = useState(false);
  const [cargaEspecial,     setCargaEspecial]     = useState(false);
  const [projetista,        setProjetista]        = useState({ nome: "", registro: "" });
  const [supervisor,        setSupervisor]        = useState({ nome: "", registro: "" });
  const [checklist,         setChecklist]         = useState({});

  useEffect(() => {
    setClassificacao(classificarIcamento({ usoPct, tandem, sobreAreaHabitada, cargaEspecial }));
  }, [usoPct, tandem, sobreAreaHabitada, cargaEspecial]);

  // Persiste dados para o relatório sempre que o estado muda
  useEffect(() => {
    const docs = N2869_DOCUMENTOS[classificacao] ?? [];
    const KEYS = ["pt","ast","plano","anemometro","caboGuia","bastao","preUso","comunicacao","equipe","capacidade"];
    const todosMarcados = KEYS.every(k => !!checklist[k]);
    onSave?.("petrobrasData", {
      classificacao,
      tandem,
      sobreAreaHabitada,
      cargaEspecial,
      projetista: { ...projetista },
      supervisor: { ...supervisor },
      checklist:  { ...checklist },
      todosMarcados,
      docs,
    });
  }, [classificacao, tandem, sobreAreaHabitada, cargaEspecial, projetista, supervisor, checklist]);

  const toggleCheck = (key) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }));

  const corClass = {
    ROTINEIRO:     { bg: "#052e16", border: "#22c55e44", color: "#22c55e", label: "ROTINEIRO" },
    NAO_ROTINEIRO: { bg: "#2d1900", border: "#f59e0b44", color: "#f59e0b", label: "NÃO ROTINEIRO" },
    CRITICO:       { bg: "#1c0a0a", border: "#ef444444", color: "#ef4444", label: "IÇAMENTO CRÍTICO" },
  }[classificacao];

  const docs = N2869_DOCUMENTOS[classificacao] ?? [];

  const CHECKLIST_ITEMS = [
    { key: "pt",          label: "Permissão de Trabalho (PT) emitida e assinada" },
    { key: "ast",         label: "AST / Análise de Risco (ART) realizada" },
    { key: "plano",       label: "Plano de Rigging aprovado pelo Projetista (PLH)" },
    { key: "anemometro",  label: "Anemômetro funcional verificado na cabine" },
    { key: "caboGuia",    label: "Cabo guia instalado na carga" },
    { key: "bastao",      label: "Bastão balizador (mãos livres) disponível" },
    { key: "preUso",      label: "Checklist de verificação pré-uso executado (item 9.1.14)" },
    { key: "comunicacao", label: "Plano de comunicação distribuído à equipe" },
    { key: "equipe",      label: "Equipe mínima confirmada: Projetista, Supervisor, Operador, Sinaleiro" },
    { key: "capacidade",  label: `Utilização do guindaste ≤ 90% confirmada (atual: ${usoPct.toFixed(1)}%)` },
  ];

  const sBase = { fontFamily: "Arial, sans-serif", fontSize: 14, color: "#cbd5e1" };
  const sCard = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "18px 20px", marginBottom: 16 };
  const sLabel = { display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 };
  const sInput = { width: "100%", background: "#0a0a0f", border: "1px solid #1e293b", borderRadius: 6, padding: "8px 12px", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box" };
  const sRow = { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 };
  const sToggle = (active) => ({
    padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", border: "none",
    background: active ? "#1e40af" : "#1e293b", color: active ? "#93c5fd" : "#64748b",
  });

  const todosMarcados = CHECKLIST_ITEMS.every(i => checklist[i.key]);

  return (
    <div style={sBase}>
      {/* Banner N-2869 */}
      <div style={{ ...sCard, background: "#0f0a1f", borderColor: "#7c3aed44", marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>
          ⚙️ Módulo Petrobras — N-2869 Rev.B (06/2025)
        </div>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          Requisitos para içamentos em unidades e instalações do sistema Petrobras.
          Preencha os campos abaixo para gerar o relatório de conformidade.
        </div>
      </div>

      {/* Classificação */}
      <div style={sCard}>
        <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>Classificação da Movimentação (Item 7.4)</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8", cursor: "pointer" }}>
            <input type="checkbox" checked={tandem} onChange={e => setTandem(e.target.checked)} />
            Içamento em Tandem (2+ guindastes)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8", cursor: "pointer" }}>
            <input type="checkbox" checked={sobreAreaHabitada} onChange={e => setSobreAreaHabitada(e.target.checked)} />
            Sobre área habitada / área de processo
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8", cursor: "pointer" }}>
            <input type="checkbox" checked={cargaEspecial} onChange={e => setCargaEspecial(e.target.checked)} />
            Carga especial (frágil, perigosa ou de grande porte)
          </label>
        </div>

        <div style={{ padding: "12px 16px", borderRadius: 8, background: corClass.bg, border: `1px solid ${corClass.border}`, display: "inline-flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: corClass.color }} />
          <span style={{ fontWeight: 700, color: corClass.color, fontSize: 15 }}>{corClass.label}</span>
          {usoPct > 75 && <span style={{ fontSize: 12, color: "#f59e0b" }}> · Utilização {usoPct.toFixed(1)}% &gt; 75%</span>}
        </div>
      </div>

      {/* Documentação Obrigatória */}
      <div style={sCard}>
        <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>Documentação Obrigatória — Tabela 2</div>
        {docs.map(d => (
          <div key={d} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #1e293b", fontSize: 13, color: "#cbd5e1" }}>
            <span style={{ color: "#22c55e", fontSize: 16 }}>✓</span> {d}
          </div>
        ))}
        {classificacao === "CRITICO" && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "#1c0a0a", borderRadius: 6, border: "1px solid #ef444433", fontSize: 13, color: "#ef4444" }}>
            ⚠️ Içamento Crítico exige Plano de Rigging Detalhado aprovado pelo Projetista (PLH) antes do início.
          </div>
        )}
      </div>

      {/* Equipe Mínima */}
      <div style={sCard}>
        <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>Equipe Mínima (Item 4.3)</div>
        <div style={sRow}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={sLabel}>Nome do Projetista (PLH)</label>
            <input style={sInput} value={projetista.nome} onChange={e => setProjetista(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={sLabel}>Registro de Classe (CREA/CFT)</label>
            <input style={sInput} value={projetista.registro} onChange={e => setProjetista(p => ({ ...p, registro: e.target.value }))} placeholder="Ex: CREA-RJ 123456/D" />
          </div>
        </div>
        <div style={sRow}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={sLabel}>Nome do Supervisor de Içamento</label>
            <input style={sInput} value={supervisor.nome} onChange={e => setSupervisor(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={sLabel}>Registro de Classe (CREA/CFT)</label>
            <input style={sInput} value={supervisor.registro} onChange={e => setSupervisor(p => ({ ...p, registro: e.target.value }))} placeholder="Ex: CREA-SP 654321/D" />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
          Equipe obrigatória: Projetista · Supervisor · Operador de Guindaste · Sinaleiro/Amarrador
        </div>
      </div>

      {/* Segurança em Equipamentos */}
      <div style={sCard}>
        <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>Segurança em Equipamentos</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {[
            { icon: "🌬️", titulo: "Anemômetro", desc: "Obrigatório e funcional na cabine do guindaste terrestre/offshore. Operar dentro dos limites de vento da tabela do fabricante." },
            { icon: "🧵", titulo: "Cabo Guia",   desc: "Uso obrigatório para estabilização e direcionamento da carga durante o içamento." },
            { icon: "🦯", titulo: "Bastão Balizador", desc: "Uso obrigatório (mãos livres). Proibido segurar a carga diretamente." },
            { icon: "📋", titulo: "Checklist Pré-uso", desc: "Executar a cada início de turno conforme item 9.1.14 da N-2869." },
          ].map(item => (
            <div key={item.titulo} style={{ background: "#0a0a0f", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontWeight: 600, color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>{item.titulo}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist de Conformidade */}
      <div style={sCard}>
        <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>
          Checklist de Conformidade N-2869
          {todosMarcados && <span style={{ marginLeft: 10, color: "#22c55e", fontSize: 13 }}>✓ Todos os itens verificados</span>}
        </div>
        {CHECKLIST_ITEMS.map(item => (
          <label key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #1e293b", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!checklist[item.key]}
              onChange={() => toggleCheck(item.key)}
              style={{ marginTop: 2, accentColor: "#22c55e", width: 16, height: 16 }}
            />
            <span style={{ fontSize: 13, color: checklist[item.key] ? "#22c55e" : "#94a3b8", lineHeight: 1.5 }}>
              {item.label}
            </span>
          </label>
        ))}
      </div>

      {/* Fator de Segurança */}
      <div style={{ ...sCard, background: "#0a0f1a", borderColor: "#0ea5e944" }}>
        <div style={{ fontWeight: 600, color: "#38bdf8", marginBottom: 8 }}>Fatores de Segurança — N-2869</div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>
          <div>• Utilização máxima: <strong style={{ color: "#f59e0b" }}>90% da capacidade nominal</strong> no raio de operação</div>
          <div>• Içamentos acima de 75% são classificados como Críticos por este critério</div>
          <div>• Içamentos em tandem exigem coordenação documentada e Plano de Rigging</div>
          <div>• FS mínimo para cabos de aço: <strong>5:1</strong> (NR-11 / NBR 13541)</div>
          <div>• FS mínimo para cintas sintéticas: <strong>7:1</strong> (NBR 13545)</div>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 8 }}>
        Norma N-2869 Rev.B (06/2025) · Petrobras · Uso exclusivo para planejamento de içamento
      </div>
    </div>
  );
}

// ── WRAPPER: PLANEJAMENTO BÁSICO ──────────────────────────────────────────────────
function PlanejamentoBasico({ onVoltar, isMobile }) {
  const [aba, setAba] = useState("guindaste");
  const [petrobras, setPetrobras] = useState(false);
  const ABAS = [
    { id:"guindaste",    label: isMobile ? "Guindaste" : "Guindaste & Carga" },
    { id:"lingada",      label: isMobile ? "Lingada"   : "Lingada & Carga"   },
    { id:"checklist",    label: isMobile ? "Checklist" : "Checklist de Campo" },
    { id:"equipamentos", label: isMobile ? "📊 Tabelas" : "📊 Tabelas de Capacidade" },
    ...(petrobras ? [{ id:"petrobras", label: isMobile ? "⚙️ N-2869" : "⚙️ Módulo Petrobras" }] : []),
  ];
  return (
    <div style={S.app}>
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={S.logo}>
            <div style={S.logoIcon}>🏗</div>
            <div>
              <div style={S.logoText(isMobile)}>RiggingCheck</div>
              <div style={S.logoSub(isMobile)}>Planejamento Básico de Içamento</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            <button
              onClick={() => { setPetrobras(p => !p); if (petrobras) setAba("guindaste"); }}
              style={{ ...S.logoutBtn(isMobile), borderColor: petrobras ? "#7c3aed44" : "#47556944", color: petrobras ? "#a78bfa" : "#64748b" }}
              title="Habilitar requisitos N-2869 para içamentos em ambiente Petrobras"
            >
              {petrobras ? "⚙️ Petrobras ON" : "⚙️ Petrobras?"}
            </button>
            <button onClick={onVoltar} style={{...S.logoutBtn(isMobile), borderColor:"#f59e0b44", color:"#f59e0b"}}>
              ← Voltar
            </button>
          </div>
        </div>
        <div style={S.tabs(isMobile)}>
          {ABAS.map(a=>(
            <button key={a.id} style={S.tab(aba===a.id, isMobile)} onClick={()=>setAba(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{...S.container, maxWidth:960}}>
        {aba==="guindaste"    && <TabGuindasteCarga />}
        {aba==="lingada"      && <TabLingadaCarga />}
        {aba==="checklist"    && <TabChecklistCampo />}
        {aba==="equipamentos" && <TabEquipamentos />}
        {aba==="petrobras"    && <TabPetrobras />}
        <div style={{...S.normaBox, textAlign:"center", marginTop:32}}>
          RiggingCheck · Planejamento Básico &nbsp;·&nbsp; ABNT NBR 13541 / NR-11 / Petrobrás N-2869
        </div>
      </div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [authenticated, setAuthenticated] = useState(() => !!getToken());
  const [view, setView]   = useState("app"); // "app" | "admin"
  const [aba, setAba]     = useState("guindaste");
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
    return <LoginScreen onAuth={() => setAuthenticated(true)} />;
  }
  if (view === "admin" && isSuperAdmin)   return <SuperAdminDashboard   onVoltar={() => setView("app")} isMobile={isMobile} />;
  if (view === "admin" && isAdminEmpresa) return <AdminDashboard         onVoltar={() => setView("app")} isMobile={isMobile} />;
  if (view === "admin" && isLider)        return <LiderEquipeDashboard   onVoltar={() => setView("app")} isMobile={isMobile} />;
  if (view === "admin" && isGerente)      return <GerenteDashboard       onVoltar={() => setView("app")} isMobile={isMobile} />;

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
    <div style={S.app}>
      {showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={S.logo}>
            <div style={S.logoIcon}>🏗</div>
            <div>
              <div style={S.logoText(isMobile)}>RiggingCheck</div>
              <div style={S.logoSub(isMobile)}>Planejamento de Içamento</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            {user && <div style={S.roleBadge(isMobile)}>{roleLabel(user.role)}</div>}
            {user && <div style={S.userBadge(isMobile)}>{user.userName}</div>}
            {isSuperAdmin   && <button style={{ ...S.logoutBtn(isMobile), borderColor: "#a78bfa44", color: "#a78bfa" }} onClick={() => setView("admin")}>{isMobile ? "⚙️" : "⚙️ Painel SaaS"}</button>}
            {isAdminEmpresa && <button style={{ ...S.logoutBtn(isMobile), borderColor: "#f59e0b44", color: "#f59e0b" }} onClick={() => setView("admin")}>{isMobile ? "🔑" : "🔑 Painel Admin"}</button>}
            {isLider        && <button style={{ ...S.logoutBtn(isMobile), borderColor: "#22c55e44", color: "#22c55e" }} onClick={() => setView("admin")}>{isMobile ? "📋" : "📋 Solicitações"}</button>}
            {isGerente      && <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => setView("admin")}>{isMobile ? "📊" : "📊 Painel Gerente"}</button>}
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
                <button style={S.logoutBtn(isMobile)} onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <button style={{ ...S.logoutBtn(isMobile), borderColor: "#47556944", color: "#94a3b8" }} onClick={() => setView("admin")}>{isMobile ? "🔐" : "Acesso"}</button>
            )}
          </div>
        </div>
        <div style={S.tabs(isMobile)}>
          {ABAS.map(a => (
            <button key={a.id} style={S.tab(aba === a.id, isMobile)} onClick={() => setAba(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ ...S.container, maxWidth: 960 }}>
        {aba === "guindaste" && <TabGuindasteCarga planData={planData} onSave={(k,v) => setPlanData(p=>({...p,[k]:v}))} />}
        {aba === "lingada"   && <TabLingadaCarga   planData={planData} onSave={(k,v) => setPlanData(p=>({...p,[k]:v}))} />}
        {aba === "checklist"    && <TabChecklistCampo planData={planData} />}
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

        <div style={{ ...S.normaBox, textAlign: "center", marginTop: 32 }}>
          v2.1.0 — RiggingCheck &nbsp;·&nbsp; React + Java Spring Boot + PostgreSQL
          <br />
          <span style={{ color: "#475569" }}>NR-11 · ABNT NBR 13541 · ISO 4308-1 · Petrobrás N-2869</span>
        </div>
      </div>
    </div>
  );
}
