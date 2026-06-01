/**
 * Painel do Líder de Equipe — extraído de App.jsx.
 * Preservado sem alterações.
 */

import { useState, useCallback, useEffect } from "react";
import { S, API, authFetch, getUser, statusColor, riskColor, riskLabel, roleLabel } from "../../shared/appShared";
import ModalAlterarSenha from "../../components/ModalAlterarSenha";

function CardTecnicoSol({ sol }) {
  return (
    <div style={{ marginTop:14, background:"#0a0a0f", borderRadius:8, padding:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div>
          <div style={{ fontSize:10, color:"#475569", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Capacidade</div>
          <div style={{ fontSize:12, lineHeight:1.8, color:"#94a3b8" }}>
            <div>Guindaste: <strong style={{ color:"#e2e8f0" }}>{sol.capGuindasteKg?.toLocaleString("pt-BR")} kg</strong></div>
            <div>Carga total: <strong style={{ color:"#e2e8f0" }}>{sol.capTotalKg?.toFixed(0)} kg</strong></div>
            <div>Uso: <strong style={{ color:riskColor(sol.capRisco).color }}>{sol.capUsoPercent?.toFixed(1)}%</strong></div>
            <div>Risco: <strong style={{ color:riskColor(sol.capRisco).color }}>{riskLabel(sol.capRisco)}</strong></div>
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:"#475569", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Eslinga</div>
          <div style={{ fontSize:12, lineHeight:1.8, color:"#94a3b8" }}>
            <div>Pernas: <strong style={{ color:"#e2e8f0" }}>{sol.eslNumPernas}</strong></div>
            <div>Ângulo: <strong style={{ color:sol.eslAnguloAviso?"#f59e0b":"#e2e8f0" }}>{sol.eslAnguloGraus}°{sol.eslAnguloAviso?" ⚠️":""}</strong></div>
            <div>Tensão/perna: <strong style={{ color:"#e2e8f0" }}>{sol.eslTensaoPorPernaKg?.toFixed(0)} kg</strong></div>
            {sol.eslWllKg != null && (
              <div>WLL: <strong style={{ color:"#e2e8f0" }}>{sol.eslWllKg?.toLocaleString("pt-BR")} kg</strong>
                {sol.eslWllUsoPercent != null && <span style={{ color:riskColor(sol.eslRisco).color }}> ({sol.eslWllUsoPercent?.toFixed(1)}%)</span>}
              </div>
            )}
            <div>Risco: <strong style={{ color:riskColor(sol.eslRisco).color }}>{riskLabel(sol.eslRisco)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiderEquipeDashboard({ onVoltar, isMobile }) {
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={onVoltar} style={{ ...S.logoutBtn(isMobile), borderColor:"#22c55e44", color:"#22c55e" }}>← Voltar</button>
            <div>
              <div style={S.logoText(isMobile)}>Painel Líder de Equipe</div>
              <div style={S.logoSub(isMobile)}>{user?.empresaName||"RiggingCheck"}</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            <div style={S.roleBadge(isMobile)}>{roleLabel(user?.role)}</div>
            <div style={S.userBadge(isMobile)}>{user?.userName}</div>
            <button style={{ ...S.logoutBtn(isMobile), borderColor:"#38bdf844", color:"#38bdf8" }} onClick={() => setShowModalSenha(true)}>
              {isMobile?"🔑":"Alterar Senha"}
            </button>
          </div>
        </div>
        <div style={S.tabs(isMobile)}>
          {["ANALISAR","PROSSEGUIR","PARAR","TODOS"].map(s => (
            <button key={s} style={S.tab(statusFiltro===s,isMobile)} onClick={() => setStatusFiltro(s)}>{s}</button>
          ))}
          <button onClick={() => carregar(statusFiltro)} style={{ ...S.tab(false,isMobile), marginLeft:4 }}>↻</button>
        </div>
      </div>
      <div style={{ maxWidth:960, margin:"0 auto", padding:isMobile?"24px 16px":"40px 24px" }}>
        {loadingSol && <div style={{ color:"#64748b", textAlign:"center", padding:40 }}>Carregando...</div>}
        {!loadingSol && lista.length === 0 && (
          <div style={{ ...S.normaBox, textAlign:"center", padding:36 }}>Nenhuma solicitação com status "{statusFiltro}".</div>
        )}
        {!loadingSol && lista.map(sol => (
          <div key={sol.id} style={{ background:"#0f0f1a", border:`1px solid ${statusColor(sol.status)}22`, borderRadius:12, padding:24, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontWeight:700, color:"#e2e8f0", fontSize:15 }}>OS: {sol.operacaoOs}</div>
                <div style={{ color:"#94a3b8", fontSize:13, marginTop:4 }}>Rigger: {sol.riggerNome}</div>
                <div style={{ color:"#475569", fontSize:11, marginTop:4 }}>{new Date(sol.criadoEm).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</div>
                {sol.observacao && <div style={{ color:"#94a3b8", fontSize:12, marginTop:4 }}>Obs: "{sol.observacao}"</div>}
              </div>
              <div style={S.riskBadge(statusColor(sol.status))}>{sol.status}</div>
            </div>
            <CardTecnicoSol sol={sol} />
            {sol.status === "ANALISAR" && (
              <div style={{ marginTop:16 }}>
                <input style={{ ...S.input, fontSize:12, padding:"8px 12px", width:"100%", boxSizing:"border-box" }}
                  placeholder="Observação (opcional)" value={obs[sol.id]||""}
                  onChange={e => setObs(o=>({...o,[sol.id]:e.target.value}))} />
                <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap" }}>
                  <button style={{ ...S.btn(false), background:"linear-gradient(135deg,#22c55e,#16a34a)", color:"#000", padding:"10px 24px" }}
                    onClick={() => resolver(sol.id,"aprovar")}>✅ Autorizar Içamento</button>
                  <button style={{ ...S.btn(false), background:"rgba(239,68,68,0.12)", border:"1px solid #ef444466", color:"#ef4444", padding:"10px 24px" }}
                    onClick={() => resolver(sol.id,"negar")}>🚫 Negar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
