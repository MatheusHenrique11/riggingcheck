/**
 * Painel do Gerente de Operações + Modal OS Detalhada — extraídos de App.jsx.
 * Preservado sem alterações.
 */

import { useState, useEffect } from "react";
import { S, API, authFetch, getUser, statusColor, riskColor, riskLabel, roleLabel } from "../../shared/appShared";
import { openPrintWindow } from "../../utils/pdf";
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

function OsRow({label, value, bold}) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #e5e7eb" }}>
      <span style={{ color:"#374151", fontSize:13 }}>{label}</span>
      <span style={{ fontWeight:bold?700:500, color:"#111827", fontSize:13 }}>{value}</span>
    </div>
  );
}

function OsSection({title, children}) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ background:"#e8f0fe", color:"#1e3a5f", fontWeight:700, fontSize:12, letterSpacing:"1.5px", textTransform:"uppercase", padding:"6px 12px", borderRadius:"6px 6px 0 0", borderLeft:"3px solid #1e3a5f" }}>{title}</div>
      <div style={{ border:"1px solid #d1d5db", borderTop:"none", borderRadius:"0 0 6px 6px", padding:"4px 12px" }}>{children}</div>
    </div>
  );
}

function OSDetalhadaModal({ sol, onFechar }) {
  const fmt   = (v) => v != null ? Number(v).toLocaleString("pt-BR") : "—";
  const fmtP  = (v) => v != null ? `${Number(v).toLocaleString("pt-BR")}%` : "—";
  const fmtDt = (v) => v ? new Date(v).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}) : "—";

  const imprimir = () => {
    const el = document.getElementById("os-print-area");
    if (!el) return;
    const result = openPrintWindow(el.outerHTML);
    if (!result.success) alert("Pop-up bloqueado. Permita pop-ups neste site para imprimir.");
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"flex-start", justifyContent:"center", overflowY:"auto", padding:"24px 16px" }}>
      <div style={{ width:"100%", maxWidth:720 }}>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginBottom:12 }}>
          <button onClick={imprimir} style={{ background:"#1e3a5f", color:"#fff", border:"none", borderRadius:8, padding:"9px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>🖨 Imprimir / PDF</button>
          <button onClick={onFechar} style={{ background:"rgba(255,255,255,0.12)", color:"#e2e8f0", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"9px 20px", fontWeight:600, fontSize:13, cursor:"pointer" }}>✕ Fechar</button>
        </div>
        <div id="os-print-area" style={{ background:"#fff", borderRadius:12, width:"100%", padding:32, color:"#111" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#1e3a5f", letterSpacing:1 }}>RIGGINGCHECK</div>
              <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Ordem de Serviço de Içamento</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#1e3a5f" }}>OS: {sol.operacaoOs}</div>
              <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>Emitido em: {fmtDt(new Date().toISOString())}</div>
            </div>
          </div>
          <div style={{ borderTop:"3px solid #1e3a5f", marginBottom:20 }} />
          <OsSection title="Identificação">
            <OsRow label="Empresa" value={sol.empresaNome} />
            <OsRow label="Rigger / Responsável" value={sol.riggerNome} bold />
            <OsRow label="Data da Solicitação" value={fmtDt(sol.criadoEm)} />
          </OsSection>
          <OsSection title="Capacidade do Equipamento">
            <OsRow label="Capacidade do Guindaste" value={`${fmt(sol.capGuindasteKg)} kg`} />
            <OsRow label="Carga total"             value={`${fmt(sol.capTotalKg)} kg`} bold />
            <OsRow label="Percentual de Uso"        value={fmtP(sol.capUsoPercent)} bold />
            <OsRow label="Classificação de Risco"  value={sol.capRisco||"—"} bold />
          </OsSection>
          <OsSection title="Dados da Lingada">
            <OsRow label="Número de Pernas"  value={sol.eslNumPernas??"—"} />
            <OsRow label="Ângulo da Lingada" value={sol.eslAnguloGraus!=null?`${sol.eslAnguloGraus}°`:"—"} />
            <OsRow label="Tensão por Perna"  value={`${fmt(sol.eslTensaoPorPernaKg)} kg`} bold />
            <OsRow label="WLL da Eslinga"    value={`${fmt(sol.eslWllKg)} kg`} />
            <OsRow label="Uso da WLL"        value={fmtP(sol.eslWllUsoPercent)} bold />
            <OsRow label="Risco da Lingada"  value={sol.eslRisco||"—"} bold />
          </OsSection>
          {sol.eslTemManilha && (
            <OsSection title="Manilha">
              <OsRow label="Capacidade"   value={`${fmt(sol.eslManilhaCapacidadeKg)} kg`} />
              <OsRow label="Uso"          value={fmtP(sol.eslManilhaUsoPercent)} bold />
              <OsRow label="Compatível"   value={sol.eslManilhaCompativel?"SIM":"NÃO — verificar"} bold />
            </OsSection>
          )}
          <OsSection title="Autorização">
            <OsRow label="Status"        value="AUTORIZADO — PROSSEGUIR" bold />
            <OsRow label="Autorizado por" value={sol.aprovadoPorNome||"—"} bold />
            <OsRow label="Data/Hora"     value={fmtDt(sol.resolvidoEm)} />
            {sol.observacao && <OsRow label="Observações" value={sol.observacao} />}
          </OsSection>
          <div style={{ borderTop:"1px solid #d1d5db", marginTop:24, paddingTop:14 }}>
            <div style={{ fontSize:11, color:"#9ca3af", textAlign:"center" }}>
              Documento gerado pelo sistema RiggingCheck · Válido apenas para a OS indicada
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({label, value, color, sub}) {
  return (
    <div style={{ background:"#0f0f1a", border:`1px solid ${color}22`, borderRadius:12, padding:"18px 22px", flex:"1 1 140px" }}>
      <div style={{ fontSize:26, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

export default function GerenteDashboard({ onVoltar, isMobile }) {
  const [showModalSenha, setShowModalSenha] = useState(false);
  const [lista, setLista] = useState([]);
  const [totalFuncionarios, setTotalFuncionarios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [painel, setPainel] = useState("analitico");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [osAberta, setOsAberta] = useState(null);
  const user = getUser();

  useEffect(() => { window.scrollTo({ top:0, behavior:"smooth" }); }, [painel]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [rSol, rFunc] = await Promise.all([
          authFetch(`${API}/api/liberacoes?status=TODOS`),
          authFetch(`${API}/api/funcionarios`),
        ]);
        if (rSol.ok)  setLista(await rSol.json());
        if (rFunc.ok) { const funcs = await rFunc.json(); setTotalFuncionarios(funcs.length); }
      } catch { /* ignora */ }
      setLoading(false);
    };
    init();
  }, []);

  const total      = lista.length;
  const aprovadas  = lista.filter(s => s.status === "PROSSEGUIR").length;
  const reprovadas = lista.filter(s => s.status === "PARAR").length;
  const pendentes  = lista.filter(s => s.status === "ANALISAR").length;
  const taxaAprov  = aprovadas + reprovadas > 0 ? Math.round((aprovadas/(aprovadas+reprovadas))*100) : 0;
  const listaFiltrada   = statusFiltro === "TODOS" ? lista : lista.filter(s => s.status === statusFiltro);
  const listaAutorizadas = lista.filter(s => s.status === "PROSSEGUIR");

  return (
    <div style={S.app}>
      {showModalSenha && <ModalAlterarSenha onFechar={() => setShowModalSenha(false)} />}
      {osAberta && <OSDetalhadaModal sol={osAberta} onFechar={() => setOsAberta(null)} />}
      <div style={S.header(isMobile)}>
        <div style={S.headerTop(isMobile)}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={onVoltar} style={{ ...S.logoutBtn(isMobile), borderColor:"#38bdf844", color:"#38bdf8" }}>← Voltar</button>
            <div>
              <div style={S.logoText(isMobile)}>Painel de Controle</div>
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
          <button style={S.tab(painel==="analitico",isMobile)} onClick={() => setPainel("analitico")}>{isMobile?"Analytics":"Painel Analítico"}</button>
          <button style={S.tab(painel==="relatorios",isMobile)} onClick={() => setPainel("relatorios")}>{isMobile?"Relatórios":"Relatórios de OS"}</button>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:isMobile?"24px 16px":"40px 24px" }}>
        {loading ? (
          <div style={{ color:"#64748b", textAlign:"center", padding:60 }}>Carregando dados...</div>
        ) : painel === "analitico" ? (
          <>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:32 }}>
              <StatCard label="Total Solicitações" value={total}          color="#38bdf8" />
              <StatCard label="Taxa de Aprovação"  value={`${taxaAprov}%`} color="#22c55e" sub={`${aprovadas} aprovadas`} />
              <StatCard label="Pendentes"           value={pendentes}     color="#f59e0b" />
              <StatCard label="Reprovadas"          value={reprovadas}    color="#ef4444" />
              <StatCard label="Funcionários"        value={totalFuncionarios} color="#a78bfa" />
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              {["TODOS","ANALISAR","PROSSEGUIR","PARAR"].map(s=>(
                <button key={s} style={{ ...S.tab(statusFiltro===s,isMobile), borderRadius:8 }} onClick={() => setStatusFiltro(s)}>{s}</button>
              ))}
            </div>
            {listaFiltrada.map(sol=>(
              <div key={sol.id} style={{ background:"#0f0f1a", border:`1px solid ${statusColor(sol.status)}22`, borderRadius:12, padding:20, marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                  <div>
                    <div style={{ fontWeight:700, color:"#e2e8f0", fontSize:14 }}>OS: {sol.operacaoOs}</div>
                    <div style={{ color:"#94a3b8", fontSize:12, marginTop:3 }}>Rigger: {sol.riggerNome}</div>
                    <div style={{ color:"#475569", fontSize:11, marginTop:3 }}>{new Date(sol.criadoEm).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</div>
                    {sol.resolvidoEm && (
                      <div style={{ color:sol.status==="PROSSEGUIR"?"#22c55e":"#ef4444", fontSize:11, marginTop:2 }}>
                        {sol.status==="PROSSEGUIR"?"Autorizado":"Reprovado"} por {sol.aprovadoPorNome}
                      </div>
                    )}
                    {sol.observacao && <div style={{ color:"#64748b", fontSize:11, marginTop:2 }}>Obs: "{sol.observacao}"</div>}
                  </div>
                  <div style={S.riskBadge(statusColor(sol.status))}>{sol.status}</div>
                </div>
                <CardTecnicoSol sol={sol} />
              </div>
            ))}
          </>
        ) : (
          <>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0" }}>Relatórios de OS Autorizadas</div>
              <div style={{ fontSize:12, color:"#475569", marginTop:3 }}>{listaAutorizadas.length} içamento(s) autorizado(s)</div>
            </div>
            {listaAutorizadas.length === 0 && (
              <div style={{ ...S.normaBox, textAlign:"center", padding:48 }}>Nenhum içamento autorizado ainda.</div>
            )}
            {listaAutorizadas.map(sol=>(
              <div key={sol.id} style={{ background:"#0f0f1a", border:"1px solid #22c55e33", borderRadius:12, padding:20, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontWeight:700, color:"#e2e8f0", fontSize:15 }}>OS: {sol.operacaoOs}</div>
                  <div style={{ color:"#94a3b8", fontSize:12, marginTop:4 }}>Rigger: {sol.riggerNome}</div>
                  <div style={{ color:"#22c55e", fontSize:11, marginTop:2 }}>
                    Autorizado por {sol.aprovadoPorNome} em {new Date(sol.resolvidoEm).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}
                  </div>
                  {sol.observacao && <div style={{ color:"#64748b", fontSize:11, marginTop:2 }}>Obs: "{sol.observacao}"</div>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
                  <div style={{ ...S.riskBadge("#22c55e"), fontSize:11 }}>AUTORIZADO</div>
                  <button onClick={() => setOsAberta(sol)} style={{ background:"#1e3a5f", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                    Ver OS Detalhada
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
