/**
 * Painel Super Admin (SaaS) — extraído de App.jsx.
 * Preservado sem alterações.
 */

import { useState, useCallback, useEffect } from "react";
import { S, API, authFetch, getUser, roleLabel } from "../../shared/appShared";
import ModalAlterarSenha from "../../components/ModalAlterarSenha";

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: "#0f0f1a", border: `1px solid ${color}22`, borderRadius: 12, padding: "20px 24px", flex: "1 1 160px" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function SuperAdminDashboard({ onVoltar, isMobile }) {
  const user = getUser();
  const [painel, setPainel] = useState("visao-geral");
  const [showModalSenha, setShowModalSenha] = useState(false);
  const C = "#a78bfa";

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [painel]);

  const [empresas, setEmpresas]     = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(true);

  const [novaEmp, setNovaEmp] = useState({ razaoSocial: "", cnpj: "", adminNome: "", adminEmail: "", adminSenha: "" });
  const [erroEmp, setErroEmp] = useState(null);
  const [sucEmp, setSucEmp]   = useState(null);
  const [criando, setCriando] = useState(false);

  const [chave, setChave]               = useState("");
  const [loadingChave, setLoadingChave] = useState(false);
  const [chaveGerada, setChaveGerada]   = useState(false);

  const [empresaSel, setEmpresaSel]     = useState(null);
  const [detalheTab, setDetalheTab]     = useState("funcionarios");

  const [funcionarios, setFuncionarios]   = useState([]);
  const [loadingFuncs, setLoadingFuncs]   = useState(false);
  const [novoFunc, setNovoFunc]           = useState({ nome: "", email: "", senha: "", role: "RIGGER" });
  const [erroFunc, setErroFunc]           = useState(null);
  const [sucFunc, setSucFunc]             = useState(null);
  const [criandoFunc, setCriandoFunc]     = useState(false);
  const [mostrarFormFunc, setMostrarFormFunc] = useState(false);
  const [editandoFuncId, setEditandoFuncId] = useState(null);
  const [editFuncForm, setEditFuncForm]     = useState({ nome: "", email: "", role: "RIGGER" });
  const [erroEditFunc, setErroEditFunc]     = useState(null);

  const carregarEmpresas = useCallback(async () => {
    setLoadingEmp(true);
    try {
      const res = await authFetch(`${API}/api/admin/empresas`);
      if (res.ok) setEmpresas(await res.json());
    } catch { /* ignora */ }
    setLoadingEmp(false);
  }, []);

  const carregarChave = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/api/admin/chave`);
      if (res.ok) { const d = await res.json(); setChave(d.chave || ""); }
    } catch { /* ignora */ }
  }, []);

  const carregarFuncionarios = useCallback(async (empresaId) => {
    setLoadingFuncs(true);
    try {
      const res = await authFetch(`${API}/api/admin/empresas/${empresaId}/funcionarios`);
      if (res.ok) setFuncionarios(await res.json());
    } catch { /* ignora */ }
    setLoadingFuncs(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarEmpresas(); }, [carregarEmpresas]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (painel === "seguranca") carregarChave(); }, [painel, carregarChave]);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (empresaSel) { carregarFuncionarios(empresaSel.id); setDetalheTab("funcionarios"); setMostrarFormFunc(false); setErroFunc(null); setSucFunc(null); }
  }, [empresaSel, carregarFuncionarios]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const criarEmpresa = async () => {
    setErroEmp(null); setSucEmp(null); setCriando(true);
    try {
      const res = await authFetch(`${API}/api/admin/empresas`, { method: "POST", body: JSON.stringify(novaEmp) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroEmp(data.error || "Erro ao cadastrar empresa."); setCriando(false); return; }
      setSucEmp(`Empresa "${data.razaoSocial}" cadastrada com sucesso!`);
      setNovaEmp({ razaoSocial: "", cnpj: "", adminNome: "", adminEmail: "", adminSenha: "" });
      carregarEmpresas();
      setPainel("empresas");
    } catch { setErroEmp("Erro de conexão."); }
    setCriando(false);
  };

  const alternarEmpresa = async (id, ativo) => {
    try {
      await authFetch(`${API}/api/admin/empresas/${id}/${ativo ? "desativar" : "ativar"}`, { method: "POST" });
      setEmpresas(p => p.map(e => e.id === id ? { ...e, ativo: !ativo } : e));
      if (empresaSel?.id === id) setEmpresaSel(p => ({ ...p, ativo: !ativo }));
    } catch { /* ignora */ }
  };

  const gerarChave = async () => {
    setLoadingChave(true);
    try {
      const res = await authFetch(`${API}/api/admin/chave/gerar`, { method: "POST" });
      if (res.ok) { const d = await res.json(); setChave(d.chave); setChaveGerada(true); }
    } catch { /* ignora */ }
    setLoadingChave(false);
  };

  const criarFuncionario = async () => {
    if (!novoFunc.nome.trim() || !novoFunc.email.trim() || !novoFunc.senha.trim()) {
      setErroFunc("Preencha nome, e-mail e senha."); return;
    }
    setCriandoFunc(true); setErroFunc(null); setSucFunc(null);
    try {
      const res = await authFetch(`${API}/api/admin/empresas/${empresaSel.id}/funcionarios`, {
        method: "POST", body: JSON.stringify(novoFunc),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroFunc(data.error || "Erro ao criar funcionário."); setCriandoFunc(false); return; }
      setSucFunc(`Funcionário "${data.nome}" criado com sucesso!`);
      setNovoFunc({ nome: "", email: "", senha: "", role: "RIGGER" });
      setMostrarFormFunc(false);
      carregarFuncionarios(empresaSel.id);
      setEmpresas(p => p.map(e => e.id === empresaSel.id ? { ...e, totalFuncionarios: (e.totalFuncionarios || 0) + 1 } : e));
    } catch { setErroFunc("Erro de conexão."); }
    setCriandoFunc(false);
  };

  const alternarStatusFunc = async (func) => {
    const acao = func.ativo ? "desativar" : "reativar";
    try {
      await authFetch(`${API}/api/admin/empresas/${empresaSel.id}/funcionarios/${func.id}/${acao}`, { method: "POST" });
      setFuncionarios(p => p.map(f => f.id === func.id ? { ...f, ativo: !func.ativo } : f));
    } catch { /* ignora */ }
  };

  const iniciarEdicaoFunc = (f) => { setEditandoFuncId(f.id); setEditFuncForm({ nome: f.nome, email: f.email, role: f.role }); setErroEditFunc(null); };

  const salvarEdicaoFunc = async () => {
    setErroEditFunc(null);
    try {
      const res = await authFetch(`${API}/api/admin/empresas/${empresaSel.id}/funcionarios/${editandoFuncId}`, {
        method: "PUT", body: JSON.stringify(editFuncForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroEditFunc(data.error || "Erro ao salvar alterações."); return; }
      setEditandoFuncId(null);
      carregarFuncionarios(empresaSel.id);
    } catch { setErroEditFunc("Erro de conexão."); }
  };

  const totalEmpresas = empresas.length;
  const empAtivas     = empresas.filter(e => e.ativo !== false).length;
  const empInativas   = totalEmpresas - empAtivas;
  const totalFunc     = empresas.reduce((s, e) => s + (e.totalFuncionarios || 0), 0);
  const totalLib      = empresas.reduce((s, e) => s + (e.totalLiberacoes || 0), 0);
  const libPendentes  = empresas.reduce((s, e) => s + (e.liberacoesAnalisar || 0), 0);

  const TABS = [
    ["visao-geral", "📊 Visão Geral"],
    ["empresas",    "🏢 Empresas"],
    ["cadastrar",   "➕ Nova Empresa"],
    ["seguranca",   "🔐 Segurança"],
  ];

  const roleOpts = [
    { v:"RIGGER", l:"Rigger" },
    { v:"OPERADOR_GUINDASTE", l:"Operador de Guindaste" },
    { v:"LIDER_EQUIPE", l:"Líder de Equipe" },
    { v:"GERENTE_OPERACOES", l:"Gerente de Operações" },
    { v:"ADMIN_EMPRESA", l:"Admin Empresa" },
  ];

  return (
    <div style={S.app}>
      {showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={onVoltar} style={{ ...S.logoutBtn(isMobile), borderColor:`${C}44`, color:C }}>← Sair</button>
            <div>
              <div style={{ fontSize:isMobile?14:18, fontWeight:800, color:C }}>
                RiggingCheck<span style={{ color:"#64748b", fontWeight:400 }}> / SaaS</span>
              </div>
              <div style={S.logoSub(isMobile)}>Painel de Controle do Sistema</div>
            </div>
          </div>
          <div style={S.userInfo(isMobile)}>
            <div style={{ fontSize:10, padding:"3px 10px", borderRadius:6, border:`1px solid ${C}44`, color:C, fontWeight:700, letterSpacing:"1px" }}>SUPER ADMIN</div>
            <div style={S.userBadge(isMobile)}>{user?.userName}</div>
            <button style={{ ...S.logoutBtn(isMobile), borderColor:"#38bdf844", color:"#38bdf8" }} onClick={() => setShowModalSenha(true)}>
              {isMobile?"🔑":"Alterar Senha"}
            </button>
          </div>
        </div>
        <div style={S.tabs(isMobile)}>
          {TABS.map(([id, label]) => (
            <button key={id} style={{ ...S.tab(painel===id, isMobile), ...(id==="cadastrar"?{color:painel===id?"#fff":C, borderColor:painel===id?C:`${C}33`}:{}) }}
              onClick={() => { setPainel(id); setEmpresaSel(null); setSucEmp(null); setErroEmp(null); }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:isMobile?"24px 16px":"36px 24px" }}>

        {/* VISÃO GERAL */}
        {painel === "visao-geral" && (
          <>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:32 }}>
              <StatCard label="Total de Empresas"   value={totalEmpresas} color={C}         sub={`${empAtivas} ativa${empAtivas!==1?"s":""}`} />
              <StatCard label="Empresas Ativas"     value={empAtivas}     color="#22c55e"    sub="em operação" />
              <StatCard label="Empresas Inativas"   value={empInativas}   color="#ef4444"    sub="suspensas" />
              <StatCard label="Funcionários Ativos" value={totalFunc}     color="#38bdf8"    sub="em todas as empresas" />
              <StatCard label="Total Solicitações"  value={totalLib}      color="#f59e0b"    sub={`${libPendentes} pendente${libPendentes!==1?"s":""}`} />
            </div>
            <div style={{ fontSize:11, color:"#475569", letterSpacing:"2px", textTransform:"uppercase", marginBottom:16 }}>Últimas empresas cadastradas</div>
            {loadingEmp && <div style={{ color:"#64748b", textAlign:"center", padding:40 }}>Carregando...</div>}
            {!loadingEmp && empresas.length === 0 && (
              <div style={{ ...S.normaBox, textAlign:"center", padding:40 }}>
                Nenhuma empresa cadastrada ainda.{" "}
                <span style={{ color:C, cursor:"pointer" }} onClick={() => setPainel("cadastrar")}>Cadastrar agora →</span>
              </div>
            )}
            {empresas.slice(0,5).map(emp => (
              <div key={emp.id} onClick={() => { setEmpresaSel(emp); setPainel("empresas"); }}
                style={{ background:"#0f0f1a", border:`1px solid ${emp.ativo!==false?"#1e2a3a":"#2d0000"}`, borderRadius:10, padding:"14px 18px", marginBottom:10, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, transition:"border-color 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=`${C}55`}
                onMouseLeave={e=>e.currentTarget.style.borderColor=emp.ativo!==false?"#1e2a3a":"#2d0000"}
              >
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:emp.ativo!==false?"#e2e8f0":"#475569" }}>{emp.razaoSocial}</div>
                  <div style={{ fontSize:11, color:"#475569", marginTop:3 }}>CNPJ {emp.cnpj} · Admin: {emp.adminNome}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:11, color:"#64748b" }}>👥 {emp.totalFuncionarios}</span>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700, background:emp.ativo!==false?"#052e16":"#2d0000", color:emp.ativo!==false?"#22c55e":"#ef4444" }}>
                    {emp.ativo!==false?"ATIVA":"INATIVA"}
                  </span>
                </div>
              </div>
            ))}
            {empresas.length > 5 && (
              <button onClick={() => setPainel("empresas")} style={{ ...S.btn(false), background:"transparent", border:`1px solid ${C}33`, color:C, width:"100%", marginTop:4 }}>
                Ver todas as {empresas.length} empresas →
              </button>
            )}
            <div style={{ marginTop:32, display:"flex", gap:12, flexWrap:"wrap" }}>
              <button onClick={() => setPainel("cadastrar")} style={{ ...S.btn(false), background:`linear-gradient(135deg, ${C}, #7c3aed)`, color:"#fff", flex:"1 1 200px" }}>
                ➕ Cadastrar Nova Empresa
              </button>
              <button onClick={() => setPainel("seguranca")} style={{ ...S.btn(false), background:"transparent", border:"1px solid #334155", color:"#94a3b8", flex:"1 1 200px" }}>
                🔐 Gerenciar Segurança
              </button>
            </div>
          </>
        )}

        {/* LISTA EMPRESAS */}
        {painel === "empresas" && !empresaSel && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C, letterSpacing:"1px", textTransform:"uppercase" }}>Todas as Empresas</div>
                <div style={{ fontSize:12, color:"#475569", marginTop:4 }}>{totalEmpresas} empresa{totalEmpresas!==1?"s":""} · {empAtivas} ativa{empAtivas!==1?"s":""}</div>
              </div>
              <button onClick={() => setPainel("cadastrar")} style={{ ...S.btn(false), background:`linear-gradient(135deg, ${C}, #7c3aed)`, color:"#fff", padding:"10px 20px" }}>
                ➕ Nova Empresa
              </button>
            </div>
            {loadingEmp && <div style={{ color:"#64748b", textAlign:"center", padding:40 }}>Carregando...</div>}
            {empresas.map(emp => (
              <div key={emp.id} style={{ background:"#0f0f1a", border:`1px solid ${emp.ativo!==false?"#1e2a3a":"#2d0000"}`, borderRadius:12, padding:20, marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                      <div style={{ fontWeight:700, color:emp.ativo!==false?"#e2e8f0":"#475569", fontSize:15 }}>{emp.razaoSocial}</div>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700, background:emp.ativo!==false?"#052e16":"#2d0000", color:emp.ativo!==false?"#22c55e":"#ef4444" }}>
                        {emp.ativo!==false?"ATIVA":"INATIVA"}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:"#64748b", marginBottom:2 }}>CNPJ: {emp.cnpj}</div>
                    <div style={{ fontSize:12, color:"#475569" }}>Admin: <span style={{ color:"#94a3b8" }}>{emp.adminNome}</span> · <span style={{ color:"#64748b" }}>{emp.adminEmail}</span></div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    <button onClick={() => setEmpresaSel(emp)} style={{ fontSize:12, padding:"8px 14px", borderRadius:8, border:`1px solid ${C}33`, cursor:"pointer", background:`${C}0f`, color:C }}>Ver detalhes</button>
                    <button onClick={() => alternarEmpresa(emp.id, emp.ativo!==false)} style={{ fontSize:12, padding:"8px 14px", borderRadius:8, border:"1px solid", cursor:"pointer", background:emp.ativo!==false?"rgba(239,68,68,0.08)":"rgba(34,197,94,0.08)", borderColor:emp.ativo!==false?"#ef444444":"#22c55e44", color:emp.ativo!==false?"#ef4444":"#22c55e" }}>
                      {emp.ativo!==false?"Desativar":"Reativar"}
                    </button>
                  </div>
                </div>
                <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10 }}>
                  {[
                    {label:"Funcionários",value:emp.totalFuncionarios,color:"#38bdf8"},
                    {label:"Solicitações",value:emp.totalLiberacoes??0,color:"#f59e0b"},
                    {label:"Aprovadas",value:emp.liberacoesProsseguir??0,color:"#22c55e"},
                    {label:"Negadas",value:emp.liberacoesParar??0,color:"#ef4444"},
                    {label:"Pendentes",value:emp.liberacoesAnalisar??0,color:"#a78bfa"},
                    {label:"Cadastrada em",value:emp.criadoEm?new Date(emp.criadoEm).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"}):"—",color:"#64748b"},
                  ].map(({label,value,color})=>(
                    <div key={label} style={{ background:"#0a0a0f", borderRadius:8, padding:"10px 12px" }}>
                      <div style={{ fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:"1px", marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:13, fontWeight:700, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* DETALHE EMPRESA */}
        {painel === "empresas" && empresaSel && (
          <>
            <button onClick={() => setEmpresaSel(null)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:13, marginBottom:20, padding:0, display:"flex", alignItems:"center", gap:6 }}>← Voltar para lista</button>
            <div style={{ background:"#0f0f1a", border:`1px solid ${empresaSel.ativo!==false?C+"33":"#2d0000"}`, borderRadius:14, padding:24, marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:20, fontWeight:800, color:"#e2e8f0", marginBottom:4 }}>{empresaSel.razaoSocial}</div>
                  <div style={{ fontSize:12, color:"#64748b" }}>CNPJ: {empresaSel.cnpj} · Admin: {empresaSel.adminNome} · {empresaSel.adminEmail}</div>
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, padding:"4px 12px", borderRadius:6, fontWeight:700, background:empresaSel.ativo!==false?"#052e16":"#2d0000", color:empresaSel.ativo!==false?"#22c55e":"#ef4444" }}>
                    {empresaSel.ativo!==false?"ATIVA":"INATIVA"}
                  </span>
                  <button onClick={() => alternarEmpresa(empresaSel.id, empresaSel.ativo!==false)} style={{ fontSize:12, padding:"8px 16px", borderRadius:8, border:"1px solid", cursor:"pointer", background:empresaSel.ativo!==false?"rgba(239,68,68,0.08)":"rgba(34,197,94,0.08)", borderColor:empresaSel.ativo!==false?"#ef444444":"#22c55e44", color:empresaSel.ativo!==false?"#ef4444":"#22c55e" }}>
                    {empresaSel.ativo!==false?"Desativar empresa":"Reativar empresa"}
                  </button>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10 }}>
                {[
                  {label:"Funcionários",value:empresaSel.totalFuncionarios??0,color:"#38bdf8"},
                  {label:"Solicitações",value:empresaSel.totalLiberacoes??0,color:"#f59e0b"},
                  {label:"Aprovadas",value:empresaSel.liberacoesProsseguir??0,color:"#22c55e"},
                  {label:"Negadas",value:empresaSel.liberacoesParar??0,color:"#ef4444"},
                  {label:"Pendentes",value:empresaSel.liberacoesAnalisar??0,color:C},
                ].map(({label,value,color})=>(
                  <div key={label} style={{ background:"#0a0a0f", borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:"1px", marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:22, fontWeight:800, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              <button style={S.tab(detalheTab==="funcionarios",isMobile)} onClick={() => setDetalheTab("funcionarios")}>👥 Funcionários</button>
              <button style={S.tab(detalheTab==="liberacoes",isMobile)} onClick={() => setDetalheTab("liberacoes")}>📋 Resumo de Solicitações</button>
            </div>

            {detalheTab === "funcionarios" && (
              <>
                {sucFunc && <div style={{ ...S.successBox, marginBottom:12 }}>{sucFunc}</div>}
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
                  <button onClick={() => { setMostrarFormFunc(v=>!v); setErroFunc(null); setSucFunc(null); }}
                    style={{ ...S.btn(false), background:`linear-gradient(135deg,${C},#7c3aed)`, color:"#fff", padding:"10px 20px" }}>
                    {mostrarFormFunc?"✕ Cancelar":"➕ Novo Funcionário"}
                  </button>
                </div>
                {mostrarFormFunc && (
                  <div style={{ background:"#0f0f1a", border:`1px solid ${C}33`, borderRadius:12, padding:24, marginBottom:20 }}>
                    <div style={{ fontSize:11, color:C, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", marginBottom:16 }}>Novo Funcionário</div>
                    <div style={S.grid()}>
                      {[["nome","Nome Completo","text","João da Silva"],["email","E-mail","email","joao@empresa.com"],["senha","Senha Inicial","password","••••••"]].map(([k,l,t,p])=>(
                        <div key={k} style={S.field}>
                          <label style={S.label}>{l}</label>
                          <input style={{ ...S.input, borderColor:`${C}33` }} type={t} placeholder={p}
                            value={novoFunc[k]} onChange={e=>setNovoFunc(pv=>({...pv,[k]:e.target.value}))} />
                        </div>
                      ))}
                      <div style={S.field}>
                        <label style={S.label}>Cargo</label>
                        <select style={{ ...S.select, borderColor:`${C}33` }} value={novoFunc.role} onChange={e=>setNovoFunc(pv=>({...pv,role:e.target.value}))}>
                          {roleOpts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      </div>
                    </div>
                    {erroFunc && <div style={{ ...S.errorBox, marginTop:12 }}>{erroFunc}</div>}
                    <button style={{ ...S.btn(criandoFunc), background:`linear-gradient(135deg,${C},#7c3aed)`, color:"#fff", marginTop:16 }}
                      onClick={criarFuncionario} disabled={criandoFunc}>
                      {criandoFunc?"Criando...":"Criar Funcionário"}
                    </button>
                  </div>
                )}
                {loadingFuncs && <div style={{ color:"#64748b", textAlign:"center", padding:40 }}>Carregando funcionários...</div>}
                {funcionarios.map(f => (
                  <div key={f.id} style={{ background:"#0f0f1a", border:`1px solid ${f.ativo!==false?"#1e2a3a":"#2d0000"}`, borderRadius:10, padding:"14px 18px", marginBottom:10 }}>
                    {editandoFuncId === f.id ? (
                      <div>
                        <div style={S.grid()}>
                          {[["nome","Nome"],["email","E-mail"]].map(([k,l])=>(
                            <div key={k} style={S.field}>
                              <label style={S.label}>{l}</label>
                              <input style={{ ...S.input, borderColor:`${C}33` }} value={editFuncForm[k]} onChange={e=>setEditFuncForm(pv=>({...pv,[k]:e.target.value}))} />
                            </div>
                          ))}
                          <div style={S.field}>
                            <label style={S.label}>Cargo</label>
                            <select style={{ ...S.select, borderColor:`${C}33` }} value={editFuncForm.role} onChange={e=>setEditFuncForm(pv=>({...pv,role:e.target.value}))}>
                              {roleOpts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                          </div>
                        </div>
                        {erroEditFunc && <div style={{ ...S.errorBox, marginTop:8 }}>{erroEditFunc}</div>}
                        <div style={{ display:"flex", gap:8, marginTop:12 }}>
                          <button style={{ ...S.btn(true), background:`linear-gradient(135deg,${C},#7c3aed)`, color:"#fff", padding:"8px 18px", fontSize:13 }} onClick={salvarEdicaoFunc}>Salvar</button>
                          <button style={{ ...S.btn(false), padding:"8px 18px", fontSize:13 }} onClick={() => setEditandoFuncId(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                        <div>
                          <div style={{ fontWeight:700, color:f.ativo!==false?"#e2e8f0":"#475569", fontSize:14 }}>{f.nome}</div>
                          <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{f.email}</div>
                          <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:6 }}>
                            <span style={{ background:"#1e2a3a", color:"#38bdf8", fontSize:11, padding:"2px 8px", borderRadius:4 }}>{roleLabel(f.role)}</span>
                            <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700, background:f.ativo!==false?"#052e16":"#2d0000", color:f.ativo!==false?"#22c55e":"#ef4444" }}>
                              {f.ativo!==false?"ATIVO":"INATIVO"}
                            </span>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => iniciarEdicaoFunc(f)} style={{ fontSize:12, padding:"8px 14px", borderRadius:8, border:`1px solid ${C}44`, cursor:"pointer", background:`${C}11`, color:C }}>Editar</button>
                          <button onClick={() => alternarStatusFunc(f)} style={{ fontSize:12, padding:"8px 14px", borderRadius:8, border:"1px solid", cursor:"pointer", background:f.ativo!==false?"rgba(239,68,68,0.08)":"rgba(34,197,94,0.08)", borderColor:f.ativo!==false?"#ef444444":"#22c55e44", color:f.ativo!==false?"#ef4444":"#22c55e" }}>
                            {f.ativo!==false?"Desativar":"Reativar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {detalheTab === "liberacoes" && (
              <div style={{ background:"#0f0f1a", border:"1px solid #1e2a3a", borderRadius:12, padding:28 }}>
                <div style={{ fontSize:11, color:"#475569", fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", marginBottom:20 }}>
                  Histórico de Solicitações — {empresaSel.razaoSocial}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16 }}>
                  {[
                    {label:"Total",value:empresaSel.totalLiberacoes??0,color:"#f59e0b",icon:"📋"},
                    {label:"Içamentos Autorizados",value:empresaSel.liberacoesProsseguir??0,color:"#22c55e",icon:"✅"},
                    {label:"Içamentos Negados",value:empresaSel.liberacoesParar??0,color:"#ef4444",icon:"🚫"},
                    {label:"Aguardando Análise",value:empresaSel.liberacoesAnalisar??0,color:C,icon:"⏳"},
                  ].map(({label,value,color,icon})=>(
                    <div key={label} style={{ background:"#0a0a0f", borderRadius:12, padding:"20px 18px", textAlign:"center" }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
                      <div style={{ fontSize:32, fontWeight:800, color, marginBottom:6 }}>{value}</div>
                      <div style={{ fontSize:11, color:"#64748b" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* CADASTRAR EMPRESA */}
        {painel === "cadastrar" && (
          <>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C, letterSpacing:"1px", textTransform:"uppercase" }}>Cadastrar Nova Empresa</div>
              <div style={{ fontSize:12, color:"#475569", marginTop:6 }}>Um administrador será criado automaticamente para a empresa.</div>
            </div>
            <div style={{ background:"#0f0f1a", border:`1px solid ${C}22`, borderRadius:14, padding:isMobile?20:32 }}>
              <div style={{ fontSize:11, color:C, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", marginBottom:20 }}>Dados da Empresa</div>
              <div style={S.grid()}>
                {[["razaoSocial","Razão Social","Nome da Empresa Ltda"],["cnpj","CNPJ","00.000.000/0001-00"]].map(([k,l,p])=>(
                  <div key={k} style={S.field}>
                    <label style={S.label}>{l}</label>
                    <input style={{ ...S.input, borderColor:`${C}33` }} placeholder={p} value={novaEmp[k]} onChange={e=>setNovaEmp(pv=>({...pv,[k]:e.target.value}))} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:"#475569", fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", margin:"24px 0 16px" }}>Administrador da Empresa</div>
              <div style={S.grid()}>
                {[["adminNome","Nome Completo","Nome do responsável"],["adminEmail","E-mail","admin@empresa.com"]].map(([k,l,p])=>(
                  <div key={k} style={S.field}>
                    <label style={S.label}>{l}</label>
                    <input style={{ ...S.input, borderColor:`${C}33` }} placeholder={p} value={novaEmp[k]} onChange={e=>setNovaEmp(pv=>({...pv,[k]:e.target.value}))} />
                  </div>
                ))}
                <div style={S.field}>
                  <label style={S.label}>Senha Inicial (mín. 8 caracteres)</label>
                  <input style={{ ...S.input, borderColor:`${C}33` }} type="password" placeholder="••••••••" value={novaEmp.adminSenha} onChange={e=>setNovaEmp(pv=>({...pv,adminSenha:e.target.value}))} />
                </div>
              </div>
              {erroEmp && <div style={{ ...S.errorBox, marginTop:20 }}>{erroEmp}</div>}
              {sucEmp  && <div style={{ ...S.successBox, marginTop:20 }}>{sucEmp}</div>}
              <div style={{ marginTop:24, display:"flex", gap:12, flexWrap:"wrap" }}>
                <button style={{ ...S.btn(criando), background:`linear-gradient(135deg,${C},#7c3aed)`, color:"#fff", flex:"1 1 160px" }} onClick={criarEmpresa} disabled={criando}>
                  {criando?"Cadastrando...":"Cadastrar Empresa"}
                </button>
                <button style={{ ...S.btn(false), background:"transparent", border:"1px solid #1e2a3a", color:"#64748b", flex:"1 1 120px" }}
                  onClick={() => { setNovaEmp({razaoSocial:"",cnpj:"",adminNome:"",adminEmail:"",adminSenha:""}); setErroEmp(null); setSucEmp(null); }}>
                  Limpar
                </button>
              </div>
            </div>
          </>
        )}

        {/* SEGURANÇA */}
        {painel === "seguranca" && (
          <>
            <div style={{ background:"#0f0f1a", border:`1px solid ${C}33`, borderRadius:14, padding:32, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C, letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>🔐 Chave de Segurança SaaS</div>
              <div style={{ fontSize:12, color:"#475569", lineHeight:1.8, marginBottom:24 }}>
                Chave única que identifica este painel. Guarde em local seguro — nunca compartilhe publicamente.
              </div>
              {chave ? (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Chave Atual</div>
                  <div style={{ background:"#060610", border:`1px solid ${C}44`, borderRadius:8, padding:"16px 20px", fontFamily:"monospace", fontSize:16, letterSpacing:"3px", color:C, wordBreak:"break-all" }}>
                    {chave}
                  </div>
                  {chaveGerada && <div style={{ ...S.warnBox, marginTop:12, fontSize:12 }}>⚠️ Copie esta chave agora — ao sair da página ela ficará parcialmente oculta.</div>}
                </div>
              ) : (
                <div style={{ ...S.normaBox, marginBottom:20, textAlign:"center" }}>Nenhuma chave gerada. Clique abaixo para gerar.</div>
              )}
              <button onClick={gerarChave} disabled={loadingChave} style={{ ...S.btn(loadingChave), background:`linear-gradient(135deg,${C},#7c3aed)`, color:"#fff" }}>
                {loadingChave?"Gerando...":chave?"↻ Regenerar Chave":"Gerar Chave de Segurança"}
              </button>
            </div>
            <div style={{ background:"#0f0f1a", border:"1px solid #1e2a3a", borderRadius:14, padding:28 }}>
              <div style={{ fontSize:11, color:"#475569", fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", marginBottom:20 }}>Informações do Sistema</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14 }}>
                {[
                  {label:"Administrador",value:user?.userName},
                  {label:"Role",value:"SUPER_ADMIN",color:C},
                  {label:"Empresas cadastradas",value:totalEmpresas},
                  {label:"Versão",value:"v2.1.0 — RiggingCheck SaaS"},
                ].map(({label,value,color})=>(
                  <div key={label} style={{ background:"#0a0a0f", borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>{label}</div>
                    <div style={{ fontSize:13, color:color||"#94a3b8", fontWeight:color?700:400 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ ...S.normaBox, textAlign:"center", marginTop:32 }}>
          RiggingCheck SaaS &nbsp;·&nbsp; v2.1.0 &nbsp;·&nbsp; Painel Super Admin
        </div>
      </div>
    </div>
  );
}
