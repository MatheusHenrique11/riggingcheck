/**
 * Modal para alterar senha do usuário logado — extraído de App.jsx.
 * Preservado sem alterações.
 */

import { useState } from "react";
import { S, API, authFetch } from "../shared/appShared";

export default function ModalAlterarSenha({ onFechar }) {
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
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#0f0f1a", border:"1px solid #1e2a3a", borderRadius:16, padding:32, width:"100%", maxWidth:400 }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", marginBottom:24 }}>Alterar Senha</div>
        {sucesso ? (
          <div>
            <div style={{ ...S.successBox, marginBottom:24 }}>Senha alterada com sucesso!</div>
            <button style={{ ...S.btn(true), width:"100%" }} onClick={onFechar}>Fechar</button>
          </div>
        ) : (
          <>
            {[["senhaAtual","Senha Atual"],["novaSenha","Nova Senha (mín. 6 caracteres)"],["confirmar","Confirmar Nova Senha"]].map(([k,l],i)=>(
              <div key={k} style={{ ...S.field, marginTop: i>0?14:0 }}>
                <label style={S.label}>{l}</label>
                <input style={S.input} type="password" placeholder="••••••" value={form[k]}
                  onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} />
              </div>
            ))}
            {erro && <div style={{ ...S.errorBox, marginTop:12 }}>{erro}</div>}
            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              <button style={{ ...S.btn(loading), flex:1 }} onClick={salvar} disabled={loading}>
                {loading?"Salvando...":"Salvar"}
              </button>
              <button style={{ ...S.btn(false), flex:1 }} onClick={onFechar}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
