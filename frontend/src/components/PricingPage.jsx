import { useState } from "react";
import { API, getToken } from "../utils/api";

const PLANS = [
  {
    id: "basic",
    name: "Básico",
    price: "R$ 197/mês",
    highlight: false,
    features: [
      "Até 5 equipamentos cadastrados",
      "Checklists NR-11 ilimitados",
      "Cálculo de capacidade e lingadas",
      "Controle de certificações",
      "Relatório de içamento",
      "Suporte por e-mail",
    ],
    unavailable: [
      "Módulo Petrobras N-2869",
      "API de integração",
    ],
  },
  {
    id: "unlimited",
    name: "Ilimitado",
    price: "R$ 497/mês",
    highlight: true,
    badge: "Mais popular",
    features: [
      "Equipamentos ilimitados",
      "Checklists NR-11 ilimitados",
      "Cálculo de capacidade e lingadas",
      "Controle de certificações",
      "Relatório de içamento",
      "Módulo Petrobras N-2869",
      "API de integração",
      "Suporte prioritário",
    ],
    unavailable: [],
  },
];

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #070710 0%, #0f0f1a 100%)",
    padding: "40px 20px",
    fontFamily: "inherit",
  },
  header: { textAlign: "center", marginBottom: 48 },
  title: {
    fontSize: 28, fontWeight: 800,
    background: "linear-gradient(90deg, #f59e0b, #fb923c)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    marginBottom: 10,
  },
  sub: { fontSize: 14, color: "#64748b" },
  grid: {
    display: "flex", gap: 20, flexWrap: "wrap",
    justifyContent: "center", maxWidth: 860, margin: "0 auto",
  },
  card: (highlight) => ({
    background: highlight
      ? "linear-gradient(135deg, #1a1020 0%, #1e1035 100%)"
      : "linear-gradient(135deg, #0f0f1a 0%, #1a1020 100%)",
    border: `1px solid ${highlight ? "#f59e0b44" : "#2d2d4a"}`,
    borderRadius: 20,
    padding: "32px 28px",
    width: 360,
    flex: "1 1 320px",
    position: "relative",
    boxShadow: highlight ? "0 0 40px rgba(245,158,11,0.15)" : "none",
  }),
  badge: {
    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "1px",
    padding: "4px 14px", borderRadius: 20, textTransform: "uppercase",
  },
  planName: { fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 },
  planPrice: {
    fontSize: 28, fontWeight: 800,
    background: "linear-gradient(90deg, #f59e0b, #fb923c)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    marginBottom: 24,
  },
  featureList: { listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 },
  feature: (available) => ({
    fontSize: 13, color: available ? "#94a3b8" : "#334155",
    display: "flex", alignItems: "center", gap: 8,
  }),
  featureIcon: (available) => ({
    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
    background: available ? "rgba(34,197,94,0.15)" : "rgba(51,65,85,0.5)",
    color: available ? "#22c55e" : "#334155",
  }),
  btn: (highlight) => ({
    width: "100%", padding: "14px 0",
    background: highlight ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "transparent",
    border: highlight ? "none" : "1px solid #2d2d4a",
    borderRadius: 10, color: highlight ? "#fff" : "#64748b",
    fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    transition: "opacity 0.2s",
  }),
  error: {
    textAlign: "center", color: "#ef4444", fontSize: 13, marginTop: 16,
  },
  back: {
    display: "block", margin: "0 auto 32px",
    background: "transparent", border: "1px solid #2d2d4a",
    borderRadius: 8, padding: "8px 20px",
    color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
  statusBanner: {
    maxWidth: 860, margin: "0 auto 32px",
    background: "rgba(239,68,68,0.1)", border: "1px solid #ef444444",
    borderRadius: 10, padding: "14px 20px",
    color: "#ef4444", fontSize: 13, textAlign: "center",
  },
};

export default function PricingPage({ onVoltar, subscriptionStatus }) {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  const assinar = async (planId) => {
    setLoadingPlan(planId);
    setError(null);
    try {
      const res = await fetch(`${API}/api/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao iniciar checkout");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e.message);
      setLoadingPlan(null);
    }
  };

  const isPastDue  = subscriptionStatus === "PAST_DUE";
  const isCanceled = subscriptionStatus === "CANCELED";

  return (
    <div style={S.page}>
      <button style={S.back} onClick={onVoltar}>← Voltar</button>

      {(isPastDue || isCanceled) && (
        <div style={S.statusBanner}>
          {isPastDue
            ? "Sua assinatura está com pagamento em atraso. Renove para continuar acessando todas as funcionalidades."
            : "Sua assinatura foi cancelada. Escolha um plano para reativar o acesso."}
        </div>
      )}

      <div style={S.header}>
        <div style={S.title}>Planos RiggingCheck</div>
        <div style={S.sub}>Gerencie içamentos com segurança e conformidade NR-11</div>
      </div>

      <div style={S.grid}>
        {PLANS.map((plan) => (
          <div key={plan.id} style={S.card(plan.highlight)}>
            {plan.badge && <div style={S.badge}>{plan.badge}</div>}
            <div style={S.planName}>{plan.name}</div>
            <div style={S.planPrice}>{plan.price}</div>

            <ul style={S.featureList}>
              {plan.features.map((f) => (
                <li key={f} style={S.feature(true)}>
                  <span style={S.featureIcon(true)}>✓</span> {f}
                </li>
              ))}
              {plan.unavailable.map((f) => (
                <li key={f} style={S.feature(false)}>
                  <span style={S.featureIcon(false)}>✕</span> {f}
                </li>
              ))}
            </ul>

            <button
              style={S.btn(plan.highlight)}
              onClick={() => assinar(plan.id)}
              disabled={!!loadingPlan}
            >
              {loadingPlan === plan.id ? "Redirecionando..." : "Assinar agora"}
            </button>
          </div>
        ))}
      </div>

      {error && <div style={S.error}>{error}</div>}
    </div>
  );
}
