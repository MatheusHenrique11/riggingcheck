import { useState, useEffect } from "react";
import { API, getToken, getUser, saveAuth } from "../utils/api";

const CONSENT_KEY = "rc_consent";

const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    padding: "0 0 24px",
  },
  box: {
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1020 100%)",
    border: "1px solid #2d2d4a",
    borderRadius: 16,
    padding: "28px 32px",
    maxWidth: 620,
    width: "calc(100% - 32px)",
    boxShadow: "0 -4px 40px rgba(0,0,0,0.6)",
  },
  title: {
    fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 10,
  },
  text: {
    fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 20,
  },
  link: { color: "#f59e0b", textDecoration: "underline", cursor: "pointer" },
  row: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnAccept: {
    flex: 1, minWidth: 140,
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    border: "none", borderRadius: 8, padding: "10px 20px",
    color: "#fff", fontWeight: 700, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit",
  },
  btnReject: {
    flex: 1, minWidth: 140,
    background: "transparent",
    border: "1px solid #334155", borderRadius: 8, padding: "10px 20px",
    color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
};

export default function CookieConsentModal({ onConsentGiven }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  if (!visible) return null;

  const persistConsent = async (accepted) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted, date: new Date().toISOString() }));
    setVisible(false);

    const token = getToken();
    if (!token || !accepted) return;

    try {
      await fetch(`${API}/api/lgpd/consentimento`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ acceptedTerms: true, acceptedPrivacyPolicy: true }),
      });

      // Atualiza o objeto de usuário em localStorage para refletir o consentimento
      const user = getUser();
      if (user) {
        saveAuth(token, { ...user, acceptedTerms: true, acceptedPrivacyPolicy: true });
      }
    } catch {
      // Silencioso: consentimento local já foi salvo
    }

    onConsentGiven?.();
  };

  return (
    <div style={S.overlay}>
      <div style={S.box}>
        <div style={S.title}>Privacidade e Cookies</div>
        <p style={S.text}>
          Utilizamos dados estritamente necessários para o funcionamento da plataforma.
          Ao continuar, você concorda com nossos{" "}
          <span style={S.link}>Termos de Uso</span> e{" "}
          <span style={S.link}>Política de Privacidade</span>, em conformidade com a{" "}
          <strong style={{ color: "#cbd5e1" }}>LGPD (Lei 13.709/2018)</strong>.
          Você pode solicitar a exclusão dos seus dados a qualquer momento na{" "}
          <strong style={{ color: "#cbd5e1" }}>Central de Privacidade</strong>.
        </p>
        <div style={S.row}>
          <button style={S.btnAccept} onClick={() => persistConsent(true)}>
            Aceitar e continuar
          </button>
          <button style={S.btnReject} onClick={() => persistConsent(false)}>
            Apenas essenciais
          </button>
        </div>
      </div>
    </div>
  );
}
