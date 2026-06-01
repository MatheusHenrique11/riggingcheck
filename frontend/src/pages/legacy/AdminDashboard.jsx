/**
 * Dashboard Administrativo (ADMIN_EMPRESA / legado) — extraído de App.jsx.
 * Preservado sem alterações.
 */

import { useState, useCallback, useEffect } from "react";
import { S, API, authFetch, getUser, IS_SUPER, statusColor, riskColor, riskLabel, roleLabel } from "../../shared/appShared";
import ModalAlterarSenha from "../../components/ModalAlterarSenha";

export default function AdminDashboard({ onVoltar, isMobile }) {
  const [painel, setPainel] = useState("solicitacoes");
  const [showModalSenha, setShowModalSenha] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [painel]);

  const [statusFiltro, setStatusFiltro] = useState("ANALISAR");
  const [lista, setLista] = useState([]);
  const [loadingSol, setLoadingSol] = useState(true);
  const [obs, setObs] = useState({});

  const [equipe, setEquipe] = useState([]);
  const [loadingEq, setLoadingEq] = useState(false);
  const [novoForm, setNovoForm] = useState({ nome: "", email: "", senha: "", role: "RIGGER" });
  const [erroEq, setErroEq] = useState(null);
  const [sucEq, setSucEq] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({ nome: "", email: "", role: "RIGGER" });
  const [erroEdit, setErroEdit] = useState(null);

  const user = getUser();
  const isSuperAdmin = IS_SUPER(user?.role);

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

  const carregarEquipe = useCallback(async () => {
    setLoadingEq(true);
    try {
      const res = await authFetch(`${API}/api/funcionarios`);
      if (res.ok) setEquipe(await res.json());
    } catch { /* ignora */ }
    setLoadingEq(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const iniciarEdicao = (f) => { setEditandoId(f.id); setEditForm({ nome: f.nome, email: f.email, role: f.role }); setErroEdit(null); };

  const salvarEdicao = async () => {
    setErroEdit(null);
    try {
      const res = await authFetch(`${API}/api/funcionarios/${editandoId}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroEdit(data.error || "Erro ao salvar alterações."); return; }
      setEditandoId(null);
      carregarEquipe();
    } catch { setErroEdit("Erro de conexão."); }
  };

  const grupos = isSuperAdmin
    ? lista.reduce((acc, sol) => {
        const key = sol.empresaNome || "Sem empresa";
        if (!acc[key]) acc[key] = [];
        acc[key].push(sol);
        return acc;
      }, {})
    : { [user?.empresaName || "Minha Empresa"]: lista };

  const renderCardTecnico = (sol) => (
    <div style={{ marginTop: 14, background: "#0a0a0f", borderRadius: 8, padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
            {sol.eslWllKg != null && (
              <div>WLL: <strong style={{ color: "#e2e8f0" }}>{sol.eslWllKg?.toLocaleString("pt-BR")} kg</strong>
                {sol.eslWllUsoPercent != null && <span style={{ color: riskColor(sol.eslRisco).color }}> ({sol.eslWllUsoPercent?.toFixed(1)}%)</span>}
              </div>
            )}
            <div>Risco: <strong style={{ color: riskColor(sol.eslRisco).color }}>{riskLabel(sol.eslRisco)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      {showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
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
            <button style={{ ...S.logoutBtn(isMobile), borderColor: "#38bdf844", color: "#38bdf8" }} onClick={() => setShowModalSenha(true)}>
              {isMobile ? "🔑" : "Alterar Senha"}
            </button>
          </div>
        </div>
        <div style={S.tabs(isMobile)}>
          <button style={S.tab(painel === "solicitacoes", isMobile)} onClick={() => setPainel("solicitacoes")}>📋 Solicitações</button>
          {user?.role === "ADMIN_EMPRESA" && (
            <button style={S.tab(painel === "equipe", isMobile)} onClick={() => setPainel("equipe")}>👥 Equipe</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>
        {painel === "solicitacoes" && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {["ANALISAR","PROSSEGUIR","PARAR","TODOS"].map(s => (
                <button key={s} style={S.tab(statusFiltro === s, isMobile)} onClick={() => setStatusFiltro(s)}>{s}</button>
              ))}
              <button onClick={() => carregar(statusFiltro)} style={{ ...S.tab(false, isMobile), marginLeft: 4 }}>↻</button>
            </div>
            {loadingSol && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Carregando...</div>}
            {!loadingSol && lista.length === 0 && (
              <div style={{ ...S.normaBox, textAlign: "center", padding: 36 }}>Nenhuma solicitação com status "{statusFiltro}".</div>
            )}
            {!loadingSol && Object.entries(grupos).map(([empresa, solicitacoes]) => (
              <div key={empresa}>
                {isSuperAdmin && (
                  <div style={{ fontSize: 11, color: "#f59e0b", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12, marginTop: 24 }}>
                    🏢 {empresa} <span style={{ color: "#475569", fontWeight: 400 }}>({solicitacoes.length})</span>
                  </div>
                )}
                {solicitacoes.map(sol => (
                  <div key={sol.id} style={{ background: "#0f0f1a", border: `1px solid ${statusColor(sol.status)}22`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 15 }}>OS: {sol.operacaoOs}</div>
                        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Rigger: {sol.riggerNome}</div>
                        <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{new Date(sol.criadoEm).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</div>
                        {sol.observacao && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Obs: "{sol.observacao}"</div>}
                      </div>
                      <div style={S.riskBadge(statusColor(sol.status))}>{sol.status}</div>
                    </div>
                    {renderCardTecnico(sol)}
                    {sol.status === "ANALISAR" && (
                      <div style={{ marginTop: 16 }}>
                        <input style={{ ...S.input, fontSize: 12, padding: "8px 12px", width: "100%", boxSizing: "border-box" }}
                          placeholder="Observação (opcional)" value={obs[sol.id] || ""}
                          onChange={e => setObs(o => ({ ...o, [sol.id]: e.target.value }))} />
                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          <button style={{ ...S.btn(false), background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#000", padding: "10px 24px" }}
                            onClick={() => resolver(sol.id, "aprovar")}>✅ Autorizar</button>
                          <button style={{ ...S.btn(false), background: "rgba(239,68,68,0.12)", border: "1px solid #ef444466", color: "#ef4444", padding: "10px 24px" }}
                            onClick={() => resolver(sol.id, "negar")}>🚫 Negar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {painel === "equipe" && (
          <>
            <div style={{ background: "#0f0f1a", border: "1px solid #1e2a3a", borderRadius: 12, padding: 24, marginBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 16, letterSpacing: "1px", textTransform: "uppercase" }}>+ Novo Usuário</div>
              <div style={S.grid()}>
                {[["nome","Nome completo","text","João da Silva"],["email","E-mail","email","joao@empresa.com"],["senha","Senha","password","mínimo 6 caracteres"]].map(([k,l,t,p])=>(
                  <div key={k} style={S.field}>
                    <label style={S.label}>{l}</label>
                    <input style={S.input} type={t} placeholder={p} value={novoForm[k]}
                      onChange={e => setNovoForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
                <div style={S.field}>
                  <label style={S.label}>Cargo</label>
                  <select style={{ ...S.input, cursor: "pointer" }} value={novoForm.role}
                    onChange={e => setNovoForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="RIGGER">Rigger</option>
                    <option value="OPERADOR_GUINDASTE">Operador de Guindaste</option>
                    <option value="LIDER_EQUIPE">Líder de Equipe</option>
                    <option value="GERENTE_OPERACOES">Gerente de Operações</option>
                    {isSuperAdmin && <option value="ADMIN_EMPRESA">Admin Empresa</option>}
                  </select>
                </div>
              </div>
              {erroEq && <div style={{ ...S.errorBox, marginTop: 12 }}>{erroEq}</div>}
              {sucEq  && <div style={{ ...S.successBox, marginTop: 12 }}>{sucEq}</div>}
              <button style={{ ...S.btn(true), marginTop: 16 }} onClick={criarFuncionario}>Criar Usuário</button>
            </div>
            {loadingEq && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Carregando...</div>}
            {equipe.map(f => (
              <div key={f.id} style={{ background: "#0f0f1a", border: `1px solid ${f.ativo?"#1e2a3a":"#2d0000"}`, borderRadius: 12, padding: 18, marginBottom: 12 }}>
                {editandoId === f.id ? (
                  <div>
                    <div style={S.grid()}>
                      {[["nome","Nome"],["email","E-mail"]].map(([k,l])=>(
                        <div key={k} style={S.field}>
                          <label style={S.label}>{l}</label>
                          <input style={S.input} value={editForm[k]} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))} />
                        </div>
                      ))}
                      <div style={S.field}>
                        <label style={S.label}>Cargo</label>
                        <select style={{ ...S.input, cursor:"pointer" }} value={editForm.role} onChange={e=>setEditForm(p=>({...p,role:e.target.value}))}>
                          <option value="RIGGER">Rigger</option>
                          <option value="OPERADOR_GUINDASTE">Operador de Guindaste</option>
                          <option value="LIDER_EQUIPE">Líder de Equipe</option>
                          <option value="GERENTE_OPERACOES">Gerente de Operações</option>
                          {isSuperAdmin && <option value="ADMIN_EMPRESA">Admin Empresa</option>}
                        </select>
                      </div>
                    </div>
                    {erroEdit && <div style={{ ...S.errorBox, marginTop: 8 }}>{erroEdit}</div>}
                    <div style={{ display:"flex", gap:8, marginTop:12 }}>
                      <button style={{ ...S.btn(true), padding:"8px 18px", fontSize:13 }} onClick={salvarEdicao}>Salvar</button>
                      <button style={{ ...S.btn(false), padding:"8px 18px", fontSize:13 }} onClick={()=>setEditandoId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                    <div>
                      <div style={{ fontWeight:700, color:f.ativo?"#e2e8f0":"#475569", fontSize:14 }}>{f.nome}</div>
                      <div style={{ color:"#64748b", fontSize:12, marginTop:2 }}>{f.email}</div>
                      <div style={{ marginTop:6, display:"flex", gap:8 }}>
                        <span style={{ background:"#1e2a3a", color:"#38bdf8", fontSize:11, padding:"2px 8px", borderRadius:4 }}>{roleLabel(f.role)}</span>
                        {!f.ativo && <span style={{ background:"#2d0000", color:"#ef4444", fontSize:11, padding:"2px 8px", borderRadius:4 }}>Inativo</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>iniciarEdicao(f)} style={{ fontSize:12, padding:"8px 16px", borderRadius:8, border:"1px solid #1e3a5a", cursor:"pointer", background:"rgba(56,189,248,0.08)", color:"#38bdf8" }}>Editar</button>
                      <button onClick={()=>alternarAtivo(f.id,f.ativo)} style={{ fontSize:12, padding:"8px 16px", borderRadius:8, border:"1px solid", cursor:"pointer", background:f.ativo?"rgba(239,68,68,0.08)":"rgba(34,197,94,0.08)", borderColor:f.ativo?"#ef444444":"#22c55e44", color:f.ativo?"#ef4444":"#22c55e" }}>
                        {f.ativo?"Desativar":"Reativar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
        <div style={{ ...S.normaBox, textAlign:"center", marginTop:32 }}>
          RiggingCheck · React + Java Spring Boot + PostgreSQL
        </div>
      </div>
    </div>
  );
}
