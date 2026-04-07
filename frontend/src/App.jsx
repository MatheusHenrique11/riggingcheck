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
  if (res.status === 401 || res.status === 403) {
    clearAuth();
    window.location.reload();
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

const roleLabel = (role) => {
  const map = {
    SUPER_ADMIN: "Super Admin",
    ADMIN_EMPRESA: "Admin",
    GERENTE_OPERACOES: "Gerente",
    RIGGER: "Rigger",
    OPERADOR: "Operador",
  };
  return map[role] || role;
};

// ── LOGIN SCREEN ─────────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({
    razaoSocial: "", cnpj: "", adminName: "", adminEmail: "", adminPassword: "",
  });

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
      saveAuth(data.token, { userId: data.userId, userName: data.userName, role: data.role, empresaId: data.empresaId, empresaName: data.empresaName });
      onAuth();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Erro ao cadastrar empresa."); return; }
      setSuccess("Empresa cadastrada! Faça login com suas credenciais.");
      setMode("login");
      setLoginForm({ email: regForm.adminEmail, password: "" });
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.loginWrap}>
      <div style={S.loginCard(isMobile)}>
        <div style={S.loginLogo}>
          <div style={S.loginIcon}>🏗</div>
          <div style={S.loginTitle}>RiggingCheck</div>
          <div style={S.loginSub}>Segurança em Içamento</div>
        </div>

        <div style={S.loginTabs}>
          <button style={S.loginTab(mode === "login")} onClick={() => { setMode("login"); setError(null); }}>
            Entrar
          </button>
          <button style={S.loginTab(mode === "register")} onClick={() => { setMode("register"); setError(null); }}>
            Cadastrar Empresa
          </button>
        </div>

        {mode === "login" && (
          <>
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="seu@email.com"
                value={loginForm.email}
                onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div style={{ ...S.field, marginTop: 16 }}>
              <label style={S.label}>Senha</label>
              <input style={S.input} type="password" placeholder="••••••••"
                value={loginForm.password}
                onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            {error && <div style={S.errorBox}>{error}</div>}
            {success && <div style={S.successBox}>{success}</div>}
            <button style={S.btnFull(loading)} onClick={handleLogin} disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </>
        )}

        {mode === "register" && (
          <>
            {[
              { key: "razaoSocial", label: "Razão Social", placeholder: "Nome da empresa", type: "text" },
              { key: "cnpj", label: "CNPJ", placeholder: "00.000.000/0001-00", type: "text" },
              { key: "adminName", label: "Nome do Administrador", placeholder: "Nome completo", type: "text" },
              { key: "adminEmail", label: "Email do Administrador", placeholder: "admin@empresa.com", type: "email" },
              { key: "adminPassword", label: "Senha (mín. 8 caracteres)", placeholder: "••••••••", type: "password" },
            ].map((f, i) => (
              <div key={f.key} style={{ ...S.field, marginTop: i === 0 ? 0 : 14 }}>
                <label style={S.label}>{f.label}</label>
                <input style={S.input} type={f.type} placeholder={f.placeholder}
                  value={regForm[f.key]}
                  onChange={e => setRegForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            {error && <div style={S.errorBox}>{error}</div>}
            <button style={S.btnFull(loading)} onClick={handleRegister} disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar Empresa"}
            </button>
          </>
        )}

        <div style={{ ...S.normaBox, marginTop: 24, textAlign: "center" }}>
          NR-11 · ABNT NBR 11900 · ABNT NBR 13541
        </div>
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
    setLoading(true); setError(null);
    try {
      const res = await authFetch(`${API}/api/capacity/verify`, {
        method: "POST",
        body: JSON.stringify({
          craneCapacity: parseFloat(form.craneCapacity),
          loadWeight: parseFloat(form.loadWeight),
          riggingWeight: parseFloat(form.riggingWeight) || 0,
        }),
      });
      const data = await res.json();
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
          <div style={S.riskBadge(risk.color)}>{result.riskLevel}</div>
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
    setLoading(true); setError(null);
    try {
      const res = await authFetch(`${API}/api/sling/calculate`, {
        method: "POST",
        body: JSON.stringify({
          loadWeight: parseFloat(form.loadWeight),
          numberOfLegs: parseInt(form.numberOfLegs),
          angleFromHorizontal: parseFloat(form.angleFromHorizontal),
          wll: form.wll ? parseFloat(form.wll) : null,
        }),
      });
      const data = await res.json();
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
          <div style={S.riskBadge(risk.color)}>{result.riskLevel}</div>
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
    if (solicitacao.status !== "PENDENTE") { setPolling(false); return; }
    const timer = setInterval(async () => {
      try {
        const res = await authFetch(`${API}/api/liberacoes/${solicitacao.id}`);
        const data = await res.json();
        setSolicitacao(data);
        if (data.status !== "PENDENTE") setPolling(false);
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
          {solicitacao.status === "PENDENTE" && (
            <div style={{ ...S.warnBox, textAlign: "center", padding: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Aguardando autorização do administrador</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>OS: {solicitacao.operacaoOs} · Rigger: {solicitacao.riggerNome}</div>
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>Verificando automaticamente a cada 5 segundos...</div>
            </div>
          )}
          {solicitacao.status === "APROVADO" && (
            <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 12, padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#22c55e", marginBottom: 6 }}>IÇAMENTO AUTORIZADO</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>OS: {solicitacao.operacaoOs} · Rigger: {solicitacao.riggerNome}</div>
              <div style={{ color: "#22c55e", fontSize: 12 }}>Autorizado por: <strong>{solicitacao.aprovadoPorNome}</strong></div>
              {solicitacao.observacao && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>"{solicitacao.observacao}"</div>}
              <div style={{ color: "#475569", fontSize: 11, marginTop: 8 }}>{new Date(solicitacao.resolvidoEm).toLocaleString("pt-BR")}</div>
            </div>
          )}
          {solicitacao.status === "NEGADO" && (
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

const IS_ADMIN = (role) =>
  ["ADMIN_EMPRESA", "GERENTE_OPERACOES", "SUPER_ADMIN"].includes(role);

const IS_SUPER = (role) => role === "SUPER_ADMIN";

const statusColor = (s) => s === "APROVADO" ? "#22c55e" : s === "NEGADO" ? "#ef4444" : "#f59e0b";

// ── ADMIN DASHBOARD (página separada) ────────────────────────────────────────────
function AdminDashboard({ onVoltar, isMobile }) {
  const [statusFiltro, setStatusFiltro] = useState("PENDENTE");
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [obs, setObs] = useState({});
  const user = getUser();
  const isSuperAdmin = IS_SUPER(user?.role);

  const carregar = useCallback(async (s) => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/liberacoes?status=${s}`);
      if (res.ok) setLista(await res.json());
    } catch { /* ignora */ }
    setLoading(false);
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
          <div>Uso: <strong style={{ color: statusColor(sol.capRisco === "SAFE" ? "APROVADO" : sol.capRisco === "WARNING" ? "PENDENTE" : "NEGADO") }}>{sol.capUsoPercent?.toFixed(1)}%</strong></div>
          <div>Risco: <strong style={{ color: statusColor(sol.capRisco === "SAFE" ? "APROVADO" : sol.capRisco === "WARNING" ? "PENDENTE" : "NEGADO") }}>{sol.capRisco}</strong></div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Eslinga</div>
        <div style={{ fontSize: 12, lineHeight: 1.8, color: "#94a3b8" }}>
          <div>Pernas: <strong style={{ color: "#e2e8f0" }}>{sol.eslNumPernas}</strong></div>
          <div>Ângulo: <strong style={{ color: sol.eslAnguloAviso ? "#f59e0b" : "#e2e8f0" }}>{sol.eslAnguloGraus}°{sol.eslAnguloAviso ? " ⚠️" : ""}</strong></div>
          <div>Tensão/perna: <strong style={{ color: "#e2e8f0" }}>{sol.eslTensaoPorPernaKg?.toFixed(0)} kg</strong></div>
          <div>Risco: <strong style={{ color: statusColor(sol.eslRisco === "SAFE" ? "APROVADO" : sol.eslRisco === "WARNING" ? "PENDENTE" : "NEGADO") }}>{sol.eslRisco}</strong></div>
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
              <div style={S.logoSub(isMobile)}>Gerenciamento de Solicitações</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            <div style={S.roleBadge(isMobile)}>{roleLabel(user?.role)}</div>
            <div style={S.userBadge(isMobile)}>{user?.userName}</div>
          </div>
        </div>
        {/* Filtro de status */}
        <div style={S.tabs(isMobile)}>
          {["PENDENTE", "APROVADO", "NEGADO", "TODOS"].map(s => (
            <button key={s} style={S.tab(statusFiltro === s, isMobile)} onClick={() => setStatusFiltro(s)}>{s}</button>
          ))}
          <button onClick={() => carregar(statusFiltro)} style={{ ...S.tab(false, isMobile), marginLeft: 8 }}>↻</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>
        {loading && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Carregando...</div>}

        {!loading && lista.length === 0 && (
          <div style={{ ...S.normaBox, textAlign: "center", padding: 36 }}>
            Nenhuma solicitação com status "{statusFiltro}".
          </div>
        )}

        {!loading && Object.entries(grupos).map(([empresa, solicitacoes]) => (
          <div key={empresa}>
            {isSuperAdmin && (
              <div style={{ fontSize: 11, color: "#f59e0b", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12, marginTop: 24, display: "flex", alignItems: "center", gap: 8 }}>
                🏢 {empresa}
                <span style={{ color: "#475569", fontWeight: 400 }}>({solicitacoes.length} solicitação{solicitacoes.length !== 1 ? "ões" : ""})</span>
              </div>
            )}
            {solicitacoes.map(sol => (
              <div key={sol.id} style={{ background: "#0f0f1a", border: `1px solid ${statusColor(sol.status)}22`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
                {/* Cabeçalho do card */}
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

                {/* Dados técnicos */}
                {cardTecnico(sol)}

                {/* Ações (só para PENDENTE) */}
                {sol.status === "PENDENTE" && (
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

        <div style={{ ...S.normaBox, textAlign: "center", marginTop: 32 }}>
          v2.0.0 — RiggingCheck Fullstack &nbsp;·&nbsp; React + Java Spring Boot + PostgreSQL
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
  const isAdmin = IS_ADMIN(user?.role);

  const handleLogout = useCallback(() => {
    clearAuth();
    setAuthenticated(false);
  }, []);

  if (!authenticated) {
    return <LoginScreen onAuth={() => setAuthenticated(true)} />;
  }

  if (view === "admin") {
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
            {isAdmin && (
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
