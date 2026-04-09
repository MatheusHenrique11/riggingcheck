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

  const accentUsuario = "#38bdf8";
  const accentAdmin   = "#f59e0b";
  const isAdmin = mode === "admin" || mode === "register";
  const accent  = isAdmin ? accentAdmin : accentUsuario;

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

          <div style={{ ...S.normaBox, marginTop: 28, textAlign: "center" }}>
            NR-11 · ABNT NBR 11900 · ABNT NBR 13541
          </div>
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
            {isAdmin ? "🔑" : "👷"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
            {isAdmin ? "Acesso Administrativo" : "Acesso do Operador"}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            {isAdmin ? "Gerencie equipe e aprove içamentos" : "Verificações e solicitação de içamento"}
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

        <button style={{ ...S.btnFull(loading), marginTop: 20, background: `linear-gradient(135deg, ${accent}, ${isAdmin ? "#fb923c" : "#0ea5e9"})` }}
          onClick={handleLogin} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

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
  const [form, setForm] = useState({ loadWeight: "", numberOfLegs: "2", angleFromHorizontal: "45", wll: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = async () => {
    const loadWeight = parseFloat(form.loadWeight);
    const numberOfLegs = parseInt(form.numberOfLegs);
    const angleFromHorizontal = parseFloat(form.angleFromHorizontal);
    const wll = form.wll ? parseFloat(form.wll) : null;

    if (!loadWeight || loadWeight <= 0) { setError("Informe o peso da carga (valor positivo)."); return; }
    if (!angleFromHorizontal || angleFromHorizontal <= 0 || angleFromHorizontal > 90) { setError("Ângulo deve estar entre 1° e 90°."); return; }
    if (wll !== null && wll <= 0) { setError("WLL deve ser maior que zero."); return; }

    setLoading(true); setError(null);
    try {
      const res = await authFetch(`${API}/api/sling/calculate`, {
        method: "POST",
        body: JSON.stringify({ loadWeight, numberOfLegs, angleFromHorizontal, wll }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Erro no cálculo."); setLoading(false); return; }
      setResult(data);
      if (data.riskLevel !== "DANGER") onCompleted?.({
        eslNumPernas: parseInt(form.numberOfLegs),
        eslAnguloGraus: parseFloat(form.angleFromHorizontal),
        eslTensaoPorPernaKg: data.tensionPerLeg,
        eslFatorCarga: data.loadFactor,
        eslRisco: data.riskLevel,
        eslAnguloAviso: data.angleWarning ?? false,
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
        {[
          { key: "loadWeight", label: "Peso total da carga (kg)", placeholder: "ex: 5000" },
          { key: "angleFromHorizontal", label: "Ângulo da eslinga (° da horizontal)", placeholder: "ex: 60" },
          { key: "wll", label: "WLL da eslinga (kg) — opcional", placeholder: "ex: 3200" },
        ].map(f => (
          <div key={f.key} style={S.field}>
            <label style={S.label}>{f.label}</label>
            <input style={S.input} type="number" placeholder={f.placeholder}
              value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}
        <div style={S.field}>
          <label style={S.label}>Número de pernas</label>
          <select style={S.select} value={form.numberOfLegs}
            onChange={e => setForm(p => ({ ...p, numberOfLegs: e.target.value }))}>
            {["1","2","3","4"].map(n => <option key={n} value={n}>{n} perna{n > 1 ? "s" : ""}</option>)}
          </select>
        </div>
      </div>
      {parseFloat(form.angleFromHorizontal) < 45 && (
        <div style={S.warnBox}>⚠️ Ângulo abaixo de 45° aumenta drasticamente a tensão nas eslingas.</div>
      )}
      <div style={S.normaBox}>
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
        <div style={S.result(risk.color, risk.bg)}>
          <div>
            <div style={S.bigNum(risk.color)}>{result.tensionPerLeg?.toFixed(0)}<span style={{ fontSize: 18 }}> kg</span></div>
            <div style={S.smallLabel}>tensão por perna</div>
          </div>
          <div style={{ flex: 1, fontSize: 13, lineHeight: 2 }}>
            <div>Fator de carga: <strong style={{ color: "#e2e8f0" }}>{result.loadFactor?.toFixed(3)}×</strong></div>
            {result.wllUsagePercent && (
              <div>Uso do WLL: <strong style={{ color: risk.color }}>{result.wllUsagePercent?.toFixed(1)}%</strong></div>
            )}
            {result.angleWarning && <div style={{ color: "#f59e0b" }}>⚠️ Ângulo crítico!</div>}
          </div>
          <div style={S.riskBadge(risk.color)}>{riskLabel(result.riskLevel)}</div>
        </div>
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
  const [operator, setOperator] = useState("");
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [solicitacao, setSolicitacao] = useState(null); // { id, status, aprovadoPorNome }
  const [polling, setPolling] = useState(false);

  const done = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  const solicitarLiberacao = async () => {
    if (!jobId.trim() || !operator.trim()) {
      setError("Preencha o número da OS e o nome do Rigger.");
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
    setChecked({}); setOperator(""); setJobId("");
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
              <input style={S.input} placeholder="Nome completo" value={operator} onChange={e => setOperator(e.target.value)} />
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

// ── ADMIN DASHBOARD (página separada — SUPER_ADMIN e ADMIN_EMPRESA) ─────────────
function AdminDashboard({ onVoltar, isMobile }) {
  const [painel, setPainel] = useState("solicitacoes"); // "solicitacoes" | "equipe"

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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14, background: "#0a0a0f", borderRadius: 8, padding: 14 }}>
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
          <div>Risco: <strong style={{ color: riskColor(sol.eslRisco).color }}>{riskLabel(sol.eslRisco)}</strong></div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
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
          </div>
        </div>
        {/* Navegação principal do painel */}
        <div style={S.tabs(isMobile)}>
          <button style={S.tab(painel === "solicitacoes", isMobile)} onClick={() => setPainel("solicitacoes")}>📋 Solicitações</button>
          <button style={S.tab(painel === "equipe", isMobile)} onClick={() => setPainel("equipe")}>👥 Equipe</button>
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
              <div key={f.id} style={{ background: "#0f0f1a", border: `1px solid ${f.ativo ? "#1e2a3a" : "#2d0000"}`, borderRadius: 12, padding: 18, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
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
                <button
                  onClick={() => alternarAtivo(f.id, f.ativo)}
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
  const C = "#a78bfa"; // cor SaaS

  // ── Estado global ──
  const [empresas, setEmpresas]     = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(true);

  // ── Cadastro ──
  const [novaEmp, setNovaEmp] = useState({ razaoSocial: "", cnpj: "", adminNome: "", adminEmail: "", adminSenha: "" });
  const [erroEmp, setErroEmp] = useState(null);
  const [sucEmp, setSucEmp]   = useState(null);
  const [criando, setCriando] = useState(false);

  // ── Segurança ──
  const [chave, setChave]             = useState("");
  const [loadingChave, setLoadingChave] = useState(false);
  const [chaveGerada, setChaveGerada]   = useState(false);

  // ── Detalhe da empresa selecionada ──
  const [empresaSel, setEmpresaSel] = useState(null);

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

  useEffect(() => { carregarEmpresas(); }, [carregarEmpresas]);
  useEffect(() => { if (painel === "seguranca") carregarChave(); }, [painel, carregarChave]);

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

  // ── métricas gerais ──
  const totalEmpresas   = empresas.length;
  const empAtivas       = empresas.filter(e => e.ativo !== false).length;
  const empInativas     = totalEmpresas - empAtivas;
  const totalFunc       = empresas.reduce((s, e) => s + (e.totalFuncionarios || 0), 0);

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
              <StatCard label="Total de Empresas"   value={totalEmpresas} color={C}         sub={`${empAtivas} ativa${empAtivas!==1?"s":""}`} />
              <StatCard label="Empresas Ativas"     value={empAtivas}     color="#22c55e"    sub="em operação" />
              <StatCard label="Empresas Inativas"   value={empInativas}   color="#ef4444"    sub="suspensas" />
              <StatCard label="Funcionários Ativos" value={totalFunc}     color="#38bdf8"    sub="em todas as empresas" />
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
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10,
                }}>
                  {[
                    { label: "Funcionários", value: emp.totalFuncionarios, color: "#38bdf8" },
                    { label: "Cadastrada em", value: emp.criadoEm ? new Date(emp.criadoEm).toLocaleDateString("pt-BR") : "—", color: "#64748b" },
                    { label: "Status", value: emp.ativo !== false ? "Operacional" : "Suspensa", color: emp.ativo !== false ? "#22c55e" : "#ef4444" },
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

            <div style={{ background: "#0f0f1a", border: `1px solid ${empresaSel.ativo !== false ? C + "33" : "#2d0000"}`, borderRadius: 14, padding: 28, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 }}>{empresaSel.razaoSocial}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>CNPJ: {empresaSel.cnpj}</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 11, padding: "4px 12px", borderRadius: 6, fontWeight: 700,
                    background: empresaSel.ativo !== false ? "#052e16" : "#2d0000",
                    color: empresaSel.ativo !== false ? "#22c55e" : "#ef4444",
                  }}>
                    {empresaSel.ativo !== false ? "EMPRESA ATIVA" : "EMPRESA INATIVA"}
                  </span>
                  <button
                    onClick={() => alternarEmpresa(empresaSel.id, empresaSel.ativo !== false)}
                    style={{
                      fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid", cursor: "pointer",
                      background: empresaSel.ativo !== false ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                      borderColor: empresaSel.ativo !== false ? "#ef444444" : "#22c55e44",
                      color: empresaSel.ativo !== false ? "#ef4444" : "#22c55e",
                    }}>
                    {empresaSel.ativo !== false ? "Desativar empresa" : "Reativar empresa"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                {[
                  { label: "Administrador", value: empresaSel.adminNome },
                  { label: "E-mail do Admin", value: empresaSel.adminEmail },
                  { label: "Funcionários Ativos", value: empresaSel.totalFuncionarios },
                  { label: "Data de Cadastro", value: empresaSel.criadoEm ? new Date(empresaSel.criadoEm).toLocaleString("pt-BR") : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#0a0a0f", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...S.normaBox, fontSize: 12, textAlign: "center" }}>
              ℹ️ Para gerenciar funcionários desta empresa, o administrador deve acessar o Painel Admin com suas credenciais.
            </div>
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

// ── ROOT ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [authenticated, setAuthenticated] = useState(() => !!getToken());
  const [view, setView] = useState("app"); // "app" | "admin"
  const [tab, setTab] = useState(0);
  const [capacityOk, setCapacityOk] = useState(false);
  const [slingOk, setSlingOk] = useState(false);
  const [capacityData, setCapacityData] = useState(null);
  const [slingData, setSlingData] = useState(null);
  const user = getUser();
  const isSuperAdmin = IS_SUPER(user?.role);
  const isEmpresaAdmin = user?.role === "ADMIN_EMPRESA" || user?.role === "GERENTE_OPERACOES";

  const handleLogout = useCallback(() => {
    clearAuth();
    setAuthenticated(false);
  }, []);

  useEffect(() => {
    const handler = () => setAuthenticated(false);
    window.addEventListener("rc_session_expired", handler);
    return () => window.removeEventListener("rc_session_expired", handler);
  }, []);

  if (!authenticated) {
    return <LoginScreen onAuth={() => setAuthenticated(true)} />;
  }

  if (view === "admin" && isSuperAdmin) {
    return <SuperAdminDashboard onVoltar={() => setView("app")} isMobile={isMobile} />;
  }

  if (view === "admin" && isEmpresaAdmin) {
    return <AdminDashboard onVoltar={() => setView("app")} isMobile={isMobile} />;
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
            {isEmpresaAdmin && (
              <button style={{ ...S.logoutBtn(isMobile), borderColor: "#f59e0b44", color: "#f59e0b" }} onClick={() => setView("admin")}>
                {isMobile ? "🔑" : "🔑 Painel Admin"}
              </button>
            )}
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
          <span style={{ color: "#475569" }}>NR-11 · ABNT NBR 11900 · ABNT NBR 13541 · ISO 4308-1</span>
        </div>
      </div>
    </div>
  );
}
