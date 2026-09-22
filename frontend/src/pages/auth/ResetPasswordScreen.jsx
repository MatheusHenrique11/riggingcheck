/**
 * Tela de redefinição de senha — acessada via link enviado por e-mail
 * (POST /api/auth/esqueci-senha). Lê o token da query string.
 */

import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { S, API } from "../../shared/appShared";

function useIsMobile() {
  return window.innerWidth < 640;
}

export default function ResetPasswordScreen() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const accent = "#fb923c";

  const handleSubmit = async () => {
    setError(null);

    if (!token) {
      setError("Link inválido — token não encontrado. Solicite um novo link de redefinição.");
      return;
    }
    if (novaSenha.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Não foi possível redefinir a senha. O link pode ter expirado.");
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate("/admin"), 2500);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={S.loginWrap}>
        <div style={S.loginCard(isMobile)}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 13, margin: "0 auto 14px", background: "#ef444418", border: "1px solid #ef444444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>Link inválido</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
              Este link de redefinição de senha está incompleto. Solicite um novo pela tela de login.
            </div>
          </div>
          <button style={{ ...S.btnFull(false), marginTop: 20 }} onClick={() => navigate("/admin")}>
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={S.loginWrap}>
        <div style={S.loginCard(isMobile)}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 13, margin: "0 auto 14px", background: "#22c55e18", border: "1px solid #22c55e44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>Senha redefinida!</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
              Você já pode entrar com sua nova senha. Redirecionando...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.loginWrap}>
      <div style={S.loginCard(isMobile)}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, margin: "0 auto 14px", background: `${accent}18`, border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔑</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>Redefinir senha</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Escolha uma nova senha para sua conta</div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Nova senha</label>
          <input style={{ ...S.input, borderColor: `${accent}44` }} type="password" placeholder="••••••••"
            value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
        </div>
        <div style={{ ...S.field, marginTop: 16 }}>
          <label style={S.label}>Confirmar nova senha</label>
          <input style={{ ...S.input, borderColor: `${accent}44` }} type="password" placeholder="••••••••"
            value={confirmarSenha}
            onChange={e => setConfirmarSenha(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>

        {error && <div style={{ ...S.errorBox, marginTop: 12 }}>{error}</div>}

        <button style={{ ...S.btnFull(loading), marginTop: 20, background: `linear-gradient(135deg, ${accent}, #123a5c)` }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? "Redefinindo..." : "Redefinir senha"}
        </button>
      </div>
    </div>
  );
}
