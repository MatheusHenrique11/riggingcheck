/**
 * Tela de login — extraída de App.jsx.
 * Preservado sem alterações.
 */

import { useState } from "react";
import { S, API, saveAuth } from "../../shared/appShared";

function useIsMobile() {
  return window.innerWidth < 640;
}

export default function LoginScreen({ onAuth }) {
  const isMobile = useIsMobile();
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
      saveAuth(data.token, {
        userId: data.userId, userName: data.userName, role: data.role,
        empresaId: data.empresaId, empresaName: data.empresaName,
        empresaCnpj: data.empresaCnpj, subscriptionStatus: data.subscriptionStatus,
        acceptedTerms: data.acceptedTerms, acceptedPrivacyPolicy: data.acceptedPrivacyPolicy,
      });
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
      setSuccess("Super Admin criado com sucesso! Você pode realizar o login agora.");
      setSetupForm({ nome: "", email: "", senha: "" });
      setTimeout(() => goTo("superadmin"), 1500);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const accentUsuario   = "#38bdf8";
  const accentAdmin     = "#f59e0b";
  const accentSuperAdmin = "#ef4444";
  const isAdmin      = mode === "admin" || mode === "register";
  const isSuperAdmin = mode === "superadmin" || mode === "setup";
  const accent       = isSuperAdmin ? accentSuperAdmin : (isAdmin ? accentAdmin : accentUsuario);

  if (mode === "select") {
    return (
      <div style={S.loginWrap}>
        <div style={{ width: "100%", maxWidth: 480, padding: isMobile ? "0 16px" : 0 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={S.loginIcon}><img src="/logo.jpeg" alt="RiggingCheck" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <div style={S.loginTitle}>RiggingCheck</div>
            <div style={S.loginSub}>Segurança em Içamento</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { mode: "usuario", icon: "👷", title: "Operador / Rigger", desc: "Realize verificações de capacidade e eslingas,\ne solicite autorização para o içamento.", accent: accentUsuario },
              { mode: "admin",   icon: "🔑", title: "Administrador / Líder de Equipe", desc: "Gerencie sua equipe, avalie e aprove\nou reprove solicitações de içamento.", accent: accentAdmin },
            ].map(card => (
              <button key={card.mode} onClick={() => goTo(card.mode)} style={{
                background: "#0f0f1a", border: `2px solid ${card.accent}44`,
                borderRadius: 16, padding: "28px 24px", cursor: "pointer",
                textAlign: "left", transition: "all 0.2s", width: "100%",
                display: "flex", alignItems: "center", gap: 20,
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = card.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${card.accent}44`}
              >
                <div style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0, background: `${card.accent}18`, border: `1px solid ${card.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>{card.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{card.desc}</div>
                </div>
                <div style={{ marginLeft: "auto", color: card.accent, fontSize: 20 }}>→</div>
              </button>
            ))}
          </div>
          <div style={{ ...S.normaBox, marginTop: 16, textAlign: "center" }}>
            NR-11 · ABNT NBR 11900 · ABNT NBR 13541
          </div>
          <button style={{ background: "none", border: "none", color: "#475569", marginTop: 24, cursor: "pointer", fontSize: 11, width: "100%", textTransform: "uppercase", letterSpacing: "1px" }}
            onClick={() => goTo("superadmin")}>
            Acesso Root / Sistema
          </button>
        </div>
      </div>
    );
  }

  if (mode === "setup") {
    return (
      <div style={S.loginWrap}>
        <div style={S.loginCard(isMobile)}>
          <button onClick={() => goTo("superadmin")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>← Voltar</button>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 13, margin: "0 auto 14px", background: `${accentSuperAdmin}18`, border: `1px solid ${accentSuperAdmin}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⚙️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>Setup Super Admin</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Criar o primeiro administrador root do sistema</div>
          </div>
          {[["nome","Nome Completo","text","Seu Nome"],["email","Email Mestre","email","root@sistema.com"],["senha","Senha Segura (mín 8)","password","••••••••"]].map(([k,l,t,p])=>(
            <div key={k} style={{ ...S.field, marginTop: 16 }}>
              <label style={S.label}>{l}</label>
              <input style={{ ...S.input, borderColor: `${accentSuperAdmin}44` }} type={t} placeholder={p}
                value={setupForm[k]} onChange={e=>setSetupForm(pr=>({...pr,[k]:e.target.value}))} />
            </div>
          ))}
          {error   && <div style={{ ...S.errorBox,   marginTop: 12 }}>{error}</div>}
          {success && <div style={{ ...S.successBox, marginTop: 12 }}>{success}</div>}
          <button style={{ ...S.btnFull(loading), marginTop: 20, background: `linear-gradient(135deg, ${accentSuperAdmin}, #b91c1c)` }}
            onClick={handleSetup} disabled={loading}>
            {loading ? "Criando..." : "Criar Root"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.loginWrap}>
      <div style={S.loginCard(isMobile)}>
        <button onClick={() => goTo("select")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>← Voltar</button>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, margin: "0 auto 14px", background: `${accent}18`, border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
            {isSuperAdmin ? "👑" : (isAdmin ? "🔑" : "👷")}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
            {isSuperAdmin ? "Acesso Root" : (isAdmin ? "Acesso Administrativo" : "Acesso do Operador")}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            {isSuperAdmin ? "Gerenciamento absoluto (Super Admin)" : (isAdmin ? "Gerencie equipe e aprove içamentos" : "Verificações e solicitação de içamento")}
          </div>
        </div>
        {[["email","Email","email","seu@email.com"],["password","Senha","password","••••••••"]].map(([k,l,t,p])=>(
          <div key={k} style={{ ...S.field, marginTop: k==="password"?16:0 }}>
            <label style={S.label}>{l}</label>
            <input style={{ ...S.input, borderColor: `${accent}44` }} type={t} placeholder={p}
              value={loginForm[k]}
              onChange={e=>setLoginForm(pr=>({...pr,[k]:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          </div>
        ))}
        {error   && <div style={{ ...S.errorBox,   marginTop: 12 }}>{error}</div>}
        {success && <div style={{ ...S.successBox, marginTop: 12 }}>{success}</div>}
        <button style={{ ...S.btnFull(loading), marginTop: 20, background: `linear-gradient(135deg, ${accent}, ${isSuperAdmin?"#b91c1c":(isAdmin?"#fb923c":"#0ea5e9")})` }}
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
