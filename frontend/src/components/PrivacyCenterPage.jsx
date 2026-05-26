import { useState } from "react";
import { API, getToken, getUser, clearAuth } from "../utils/api";

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #070710 0%, #0f0f1a 100%)",
    padding: "40px 20px",
    fontFamily: "inherit",
  },
  card: {
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1020 100%)",
    border: "1px solid #2d2d4a",
    borderRadius: 16,
    padding: "32px",
    maxWidth: 640,
    margin: "0 auto",
    marginBottom: 20,
  },
  title: {
    fontSize: 20, fontWeight: 700,
    background: "linear-gradient(90deg, #f59e0b, #fb923c)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    marginBottom: 6,
  },
  subtitle: { fontSize: 12, color: "#475569", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 24 },
  label: { fontSize: 13, color: "#94a3b8", marginBottom: 8 },
  badge: (ok) => ({
    display: "inline-block",
    background: ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
    border: `1px solid ${ok ? "#22c55e44" : "#ef444444"}`,
    color: ok ? "#22c55e" : "#ef4444",
    borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600,
  }),
  divider: { borderColor: "#1e293b", margin: "24px 0" },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 },
  btn: (color) => ({
    padding: "10px 20px", borderRadius: 8, border: `1px solid ${color}44`,
    background: "transparent", color, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
  }),
  btnDanger: {
    padding: "10px 20px", borderRadius: 8, border: "1px solid #ef444444",
    background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 13,
    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  info: { fontSize: 12, color: "#475569", marginTop: 8, lineHeight: 1.5 },
  toast: (type) => ({
    padding: "12px 16px", borderRadius: 8, marginBottom: 16,
    background: type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
    border: `1px solid ${type === "success" ? "#22c55e44" : "#ef444444"}`,
    color: type === "success" ? "#22c55e" : "#ef4444",
    fontSize: 13,
  }),
  modal: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  },
  modalBox: {
    background: "#0f0f1a", border: "1px solid #2d2d4a", borderRadius: 16,
    padding: 32, maxWidth: 420, width: "100%",
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 },
  modalText: { fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 },
  row: { display: "flex", gap: 10 },
};

export default function PrivacyCenterPage({ onVoltar }) {
  const user = getUser();
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const showMsg = (text, type = "success") => setMsg({ text, type });

  const exportarDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/lgpd/exportar`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `riggingcheck-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg("Arquivo JSON baixado com seus dados pessoais.");
    } catch {
      showMsg("Não foi possível exportar os dados. Tente novamente.", "error");
    } finally {
      setLoading(false);
    }
  };

  const excluirConta = async () => {
    setLoading(true);
    setShowConfirm(false);
    try {
      const res = await fetch(`${API}/api/lgpd/excluir-conta`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      clearAuth();
      window.location.reload();
    } catch {
      showMsg("Não foi possível processar a solicitação. Tente novamente.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      {showConfirm && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <div style={S.modalTitle}>Confirmar Exclusão de Conta</div>
            <p style={S.modalText}>
              Seus dados pessoais serão anonimizados de forma irreversível (nome, e-mail,
              certificações). Os registros operacionais de içamento permanecem por exigência
              de auditoria industrial (NR-11). Esta ação não pode ser desfeita.
            </p>
            <div style={S.row}>
              <button style={S.btnDanger} onClick={excluirConta} disabled={loading}>
                {loading ? "Processando..." : "Confirmar exclusão"}
              </button>
              <button style={S.btn("#64748b")} onClick={() => setShowConfirm(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button onClick={onVoltar} style={{ ...S.btn("#64748b"), marginBottom: 24 }}>
          ← Voltar
        </button>

        <div style={S.card}>
          <div style={S.title}>Central de Privacidade</div>
          <div style={S.subtitle}>LGPD — Lei 13.709/2018</div>

          {msg && <div style={S.toast(msg.type)}>{msg.text}</div>}

          <div style={S.sectionTitle}>Status do Consentimento</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            <div style={S.label}>
              Termos de Uso:{" "}
              <span style={S.badge(user?.acceptedTerms)}>
                {user?.acceptedTerms ? "Aceito" : "Pendente"}
              </span>
            </div>
            <div style={S.label}>
              Política de Privacidade:{" "}
              <span style={S.badge(user?.acceptedPrivacyPolicy)}>
                {user?.acceptedPrivacyPolicy ? "Aceita" : "Pendente"}
              </span>
            </div>
          </div>
          <p style={S.info}>
            Você pode revogar seu consentimento a qualquer momento. O tratamento de dados
            estritamente necessários ao funcionamento do serviço continuará com base no
            legítimo interesse (Art. 7, IX da LGPD).
          </p>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>Exportar Meus Dados</div>
          <p style={S.label}>
            Baixe um arquivo JSON com todos os seus dados pessoais armazenados na plataforma
            (Art. 18, V da LGPD — portabilidade de dados).
          </p>
          <button style={S.btn("#38bdf8")} onClick={exportarDados} disabled={loading}>
            {loading ? "Gerando arquivo..." : "Baixar meus dados (JSON)"}
          </button>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>Solicitar Exclusão de Conta</div>
          <p style={S.label}>
            Seus dados pessoais identificáveis serão anonimizados (Art. 18, VI da LGPD).
            Os registros de operações de içamento são mantidos por requisito legal de auditoria
            de segurança do trabalho — eles não contêm seus dados pessoais após a exclusão.
          </p>
          <button style={S.btnDanger} onClick={() => setShowConfirm(true)} disabled={loading}>
            Solicitar exclusão de conta
          </button>
          <p style={S.info}>
            Esta ação é irreversível. Você será desconectado imediatamente.
          </p>
        </div>
      </div>
    </div>
  );
}
