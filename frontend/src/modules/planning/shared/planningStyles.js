/**
 * Estilos e helpers visuais do módulo de planejamento.
 * Movido de App.jsx — preservado sem alterações.
 */

export const S = {
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
    width: 72, height: 72,
    borderRadius: 12,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
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
    borderRadius: 8, display: "flex", alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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

export const multAngulo = (graus) => {
  const r = (graus * Math.PI) / 180;
  return graus > 0 ? 1 / Math.sin(r) : Infinity;
};

export const statusCalc = (pct, limites = [80, 100]) =>
  pct <= limites[0] ? "SEGURO" : pct <= limites[1] ? "ATENCAO" : "REPROVADO";

export const statusStyle = (s) => ({
  SEGURO:    { color: "#22c55e", bg: "#052e16", border: "#22c55e33" },
  ATENCAO:   { color: "#f59e0b", bg: "#2d1900", border: "#f59e0b33" },
  REPROVADO: { color: "#ef4444", bg: "#2d0000", border: "#ef444433" },
}[s] || { color: "#64748b", bg: "#0f0f1a", border: "#1e1e35" });
