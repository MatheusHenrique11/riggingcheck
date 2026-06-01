/**
 * Tab Checklist de Campo — extraída de App.jsx.
 * Lógica e JSX preservados sem alterações.
 */

import { useState, useEffect } from "react";
import { S } from "../shared/planningStyles";
import { HIGH_VOLTAGE_TABLE, CHECKLIST_CAMPO, CL_KEY } from "../shared/planningConstants";
import { ResultBox, Campo } from "../shared/PlanningComponents";
import { openPrintWindow, formatPetrobrasSection } from "../../../utils/pdf";
import { canPrintPdf } from "../../../utils/calculations";
import { getToken, getUser, authFetch } from "../../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const roleLabel = (role) => {
  const map = {
    SUPER_ADMIN:        "Super Admin",
    SAFETY_ADMIN:       "Safety Admin",
    ADMIN_EMPRESA:      "Admin Empresa",
    GERENTE_OPERACOES:  "Gerente Op.",
    LIDER_EQUIPE:       "Líder Equipe",
    RIGGER:             "Rigger",
    OPERADOR:           "Operador",
    OPERADOR_GUINDASTE: "Op. Guindaste",
  };
  return map[role] || role;
};

export default function TabChecklistCampo({ planData }) {
  const [checked, setChecked]       = useState(() => { try { return JSON.parse(localStorage.getItem(CL_KEY)||"{}"); } catch { return {}; } });
  const [resp, setResp]             = useState("");
  const [pat, setPat]               = useState({ cargaTotal:"", pesoGuindaste:"", areaPatolas:"" });
  const [resPat, setResPat]         = useState(null);
  const [resistSolo, setResistSolo] = useState("1.5");
  const [showRelatorio, setShowRelatorio] = useState(false);

  const user       = getUser();
  const isLoggedIn = !!getToken();

  const [jobId,      setJobId]      = useState("");
  const [solicitacao, setSolicitacao] = useState(null);
  const [polling,    setPolling]    = useState(false);
  const [solLoading, setSolLoading] = useState(false);
  const [solError,   setSolError]   = useState(null);

  useEffect(() => { localStorage.setItem(CL_KEY, JSON.stringify(checked)); }, [checked]);

  useEffect(() => {
    if (!polling || !solicitacao) return;
    if (solicitacao.status !== "ANALISAR") { setPolling(false); return; }
    const timer = setInterval(async () => {
      try {
        const r = await authFetch(`${API}/api/liberacoes/${solicitacao.id}`);
        const d = await r.json();
        setSolicitacao(d);
        if (d.status !== "ANALISAR") setPolling(false);
      } catch { /* ignora erros de rede no polling */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [polling, solicitacao]);

  const solicitarLiberacao = async () => {
    if (!jobId.trim()) { setSolError("Preencha o número da OS."); return; }
    setSolLoading(true); setSolError(null);
    try {
      const ug  = planData?.utilizacaoGuindaste;
      const cb  = planData?.cargaBruta;
      const te  = planData?.tensao;

      const dadosCapacidade = {
        capGuindasteKg:  ug?.capacidade   ?? null,
        capCargaKg:      cb?.inputs?.liq  ?? ug?.cargaTotal ?? null,
        capAparelhoKg:   cb?.inputs
          ? (Number(cb.inputs.esl || 0) + Number(cb.inputs.man || 0) + Number(cb.inputs.disp || 0))
          : null,
        capTotalKg:      ug?.cargaTotal   ?? cb?.total ?? null,
        capUsoPercent:   ug?.pct          ?? null,
        capRisco:        ug?.risk         ?? null,
      };

      const dadosEslinga = {
        eslNumPernas:           te?.inputs?.pernas  ? parseInt(te.inputs.pernas)    : null,
        eslAnguloGraus:         te?.inputs?.angulo  ? parseFloat(te.inputs.angulo)  : null,
        eslTensaoPorPernaKg:    te?.tensao           ?? null,
        eslFatorCarga:          te?.mult             ?? null,
        eslRisco:               te?.status           ?? null,
        eslAnguloAviso:         te?.inputs?.angulo   ? parseFloat(te.inputs.angulo) < 45 : null,
        eslWllKg:               te?.wll              ?? null,
        eslWllUsoPercent:       te?.taxa             ?? null,
        eslTemManilha:          false,
        eslManilhaCapacidadeKg: null,
        eslManilhaUsoPercent:   null,
        eslManilhaCompativel:   null,
      };

      const res = await authFetch(`${API}/api/liberacoes`, {
        method: "POST",
        body: JSON.stringify({
          operacaoOs:  jobId.trim(),
          riggerNome:  user?.userName || "—",
          dadosCapacidade,
          dadosEslinga,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSolError(data.error || data.message || "Erro ao enviar solicitação."); return; }
      setSolicitacao(data);
      setPolling(true);
    } catch { setSolError("Não foi possível conectar à API."); }
    finally   { setSolLoading(false); }
  };

  const imprimirRelatorio = () => {
    const el = document.getElementById("rc-relatorio");
    if (!el) return;
    const result = openPrintWindow(el.outerHTML);
    if (!result.success) alert("Pop-up bloqueado. Permita pop-ups neste site para imprimir.");
  };

  const toggle = (id) => setChecked(p => ({ ...p, [id]: !p[id] }));
  const total  = CHECKLIST_CAMPO.length;
  const done   = Object.values(checked).filter(Boolean).length;
  const pct    = Math.round((done/total)*100);

  const calcPatolamento = () => {
    const ct=parseFloat(pat.cargaTotal), pg=parseFloat(pat.pesoGuindaste), area=parseFloat(pat.areaPatolas);
    if([ct,pg,area].some(isNaN)||area<=0) return;
    const pressao = (ct+pg)/area;
    const resist  = parseFloat(resistSolo);
    const ok      = !isNaN(resist) && pressao <= resist;
    setResPat({ pressao, status: ok?"SEGURO":"REPROVADO",
      msg: ok ? `${pressao.toFixed(3)} t/m² ≤ resistência ${resist} t/m²` : `${pressao.toFixed(3)} t/m² EXCEDE ${resist} t/m² — ampliar pranchas!` });
  };

  const categorias = [...new Set(CHECKLIST_CAMPO.map(i=>i.cat))];
  const fmt = (v, dec=1) => v != null ? Number(v).toLocaleString("pt-BR",{maximumFractionDigits:dec,timeZone:"America/Sao_Paulo"}) : "—";

  const Relatorio = () => {
    const { cargaBruta, volume, swl, cg, tensao, n2869, petrobrasData } = planData || {};
    const emitido = new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
    const temDados = !!(cargaBruta || volume || swl || cg || tensao || n2869 || petrobrasData);
    const Sec = ({title, children}) => (
      <div style={{marginBottom:18}}>
        <div style={{background:"#e8f0fe",color:"#1e3a5f",fontWeight:700,fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",padding:"5px 12px",borderRadius:"6px 6px 0 0",borderLeft:"3px solid #1e3a5f"}}>{title}</div>
        <div style={{border:"1px solid #d1d5db",borderTop:"none",borderRadius:"0 0 6px 6px",padding:"4px 12px"}}>{children}</div>
      </div>
    );
    const Row = ({l,v,bold}) => (
      <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e5e7eb"}}>
        <span style={{color:"#374151",fontSize:12}}>{l}</span>
        <span style={{fontWeight:bold?700:500,color:"#111827",fontSize:12}}>{v}</span>
      </div>
    );
    return (
      <div id="rc-relatorio" style={{background:"#fff",color:"#111",padding:32,maxWidth:740,margin:"0 auto",fontFamily:"Arial,sans-serif"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,borderBottom:"3px solid #1e3a5f",paddingBottom:16}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:"#1e3a5f"}}>RIGGINGCHECK</div>
            <div style={{fontSize:12,color:"#6b7280"}}>Relatório de Planejamento de Içamento</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#6b7280"}}>Emitido em</div>
            <div style={{fontSize:13,fontWeight:700,color:"#111"}}>{emitido}</div>
            {resp && <div style={{fontSize:12,color:"#374151",marginTop:4}}>Supervisor: <strong>{resp}</strong></div>}
          </div>
        </div>

        {cargaBruta && (
          <Sec title="Carga Bruta">
            <Row l="Carga líquida"    v={`${fmt(cargaBruta.inputs?.liq)} kg`} />
            <Row l="Peso das eslingas"  v={`${fmt(cargaBruta.inputs?.esl)} kg`} />
            <Row l="Peso das manilhas"  v={`${fmt(cargaBruta.inputs?.man)} kg`} />
            <Row l="Peso dos dispositivos" v={`${fmt(cargaBruta.inputs?.disp)} kg`} />
            <Row l="CARGA BRUTA TOTAL" v={`${fmt(cargaBruta.total)} kg`} bold />
            <Row l="Classificação N-2869" v={cargaBruta.n2869?"IÇAMENTO CRÍTICO (≥ 20t)":"Içamento Normal (< 20t)"} bold />
          </Sec>
        )}
        {volume && (
          <Sec title="Volume & Peso Estimado">
            <Row l="Forma geométrica"   v={volume.forma} />
            <Row l="Material"           v={`${volume.matNome} — ${fmt(volume.matPe,0)} kg/m³`} />
            <Row l="Volume calculado"   v={`${fmt(volume.vol,4)} m³`} />
            <Row l="Peso estimado"      v={`${fmt(volume.peso,1)} kg`} bold />
          </Sec>
        )}
        {swl && (
          <Sec title="SWL / Fator de Segurança">
            <Row l="CRM" v={`${fmt(swl.crm)} kg`} />
            <Row l="Aplicação"          v={swl.tipoAplicacao} />
            <Row l="Fator de Segurança" v={`${swl.fs}:1`} />
            <Row l="SWL"               v={`${fmt(swl.swlVal,1)} kg`} bold />
            <Row l="Taxa de utilização" v={`${fmt(swl.taxa,1)}%`} bold />
            <Row l="Status"            v={swl.status} bold />
          </Sec>
        )}
        {cg && (
          <Sec title="Centro de Gravidade">
            <Row l="Peso total"         v={`${fmt(cg.pt)} kg`} bold />
            <Row l="d1 (CG → ponto 1)" v={`${fmt(cg.d1,3)} m`} bold />
            <Row l="d2 (CG → ponto 2)" v={`${fmt(cg.d2,3)} m`} bold />
            <Row l="Desequilíbrio"      v={`${fmt(cg.desequil,1)}%`} />
          </Sec>
        )}
        {tensao && !tensao.bloqueado && (
          <Sec title="Tensão nas Eslingas">
            <Row l="Número de pernas"   v={tensao.inputs?.pernas} />
            <Row l="Ângulo (vertical)"  v={`${tensao.inputs?.angulo}°`} />
            <Row l="Tensão por perna"   v={`${fmt(tensao.tensao,1)} kgf`} bold />
            <Row l="Taxa de utilização" v={`${fmt(tensao.taxa,1)}%`} bold />
            <Row l="Status"             v={tensao.status} bold />
          </Sec>
        )}
        {tensao?.bloqueado && (
          <Sec title="Tensão nas Eslingas">
            <div style={{color:"#dc2626",fontWeight:700,padding:"8px 0",fontSize:12}}>{tensao.msg}</div>
          </Sec>
        )}
        {n2869 && (
          <Sec title="Validação N-2869">
            <Row l="Classificação"  v={n2869.critico?"IÇAMENTO CRÍTICO":"Içamento Normal"} bold />
            <Row l="Limite util."   v={`${n2869.limUtil}%`} />
            <Row l="Status geral"   v={n2869.status} bold />
            {n2869.alertas?.map((a,i)=>(
              <div key={i} style={{color:"#dc2626",fontSize:11,padding:"2px 0"}}>⚠ {a}</div>
            ))}
          </Sec>
        )}
        {petrobrasData && (
          <div dangerouslySetInnerHTML={{ __html: formatPetrobrasSection(petrobrasData) }} />
        )}
        {resPat && (
          <Sec title="Patolamento">
            <Row l="Pressão calculada" v={`${resPat.pressao.toFixed(3)} t/m²`} bold />
            <Row l="Status"            v={resPat.status} bold />
          </Sec>
        )}
        {!temDados && (
          <div style={{background:"#fef9c3",border:"1px solid #fde047",borderRadius:6,padding:"10px 14px",marginBottom:18,fontSize:12,color:"#713f12"}}>
            ⚠ Nenhum cálculo registrado. Preencha as abas <strong>Guindaste &amp; Carga</strong> e <strong>Lingada &amp; Carga</strong> para relatório completo.
          </div>
        )}
        <Sec title={`Checklist de Campo — ${done}/${total} itens (${pct}%)`}>
          {CHECKLIST_CAMPO.map(item=>(
            <div key={item.id} style={{display:"flex",gap:8,padding:"3px 0",borderBottom:"1px solid #e5e7eb",alignItems:"flex-start"}}>
              <span style={{color:checked[item.id]?"#16a34a":"#374151",fontWeight:700,fontSize:13,minWidth:16}}>{checked[item.id]?"✓":"○"}</span>
              <span style={{fontSize:11,color:"#374151"}}>{item.item}</span>
            </div>
          ))}
        </Sec>
        <div style={{borderTop:"1px solid #d1d5db",marginTop:20,paddingTop:12,display:"flex",justifyContent:"space-between",fontSize:10,color:"#9ca3af",flexWrap:"wrap",gap:8}}>
          <span>RiggingCheck · NR-11 · ABNT NBR 13541 · Petrobrás N-2869</span>
          <span>Documento gerado automaticamente · Verificar dados antes de operar</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {showRelatorio && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,overflowY:"auto",padding:"24px 16px"}}>
          <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:16}}>
            <button onClick={imprimirRelatorio} style={{background:"#1e3a5f",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:700,fontSize:13,cursor:"pointer"}}>🖨 Imprimir / Salvar PDF</button>
            <button onClick={()=>setShowRelatorio(false)} style={{background:"transparent",color:"#94a3b8",border:"1px solid #374151",borderRadius:8,padding:"10px 24px",fontSize:13,cursor:"pointer"}}>Fechar</button>
          </div>
          <Relatorio />
        </div>
      )}

      {/* Patolamento */}
      <div style={S.card}>
        <div style={S.cardTitle}>🦺 Cálculo de Patolamento (N-2869)</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:14}}>P = (Carga total + Peso do guindaste) ÷ Área de apoio das patolas</div>
        <div style={S.grid()}>
          <Campo label="Carga total (t)"><input style={S.input} type="number" min="0" step="0.1" value={pat.cargaTotal} onChange={e=>setPat(p=>({...p,cargaTotal:e.target.value}))} /></Campo>
          <Campo label="Peso do guindaste (t)"><input style={S.input} type="number" min="0" step="0.1" value={pat.pesoGuindaste} onChange={e=>setPat(p=>({...p,pesoGuindaste:e.target.value}))} /></Campo>
          <Campo label="Área de apoio das patolas (m²)"><input style={S.input} type="number" min="0" step="0.01" value={pat.areaPatolas} onChange={e=>setPat(p=>({...p,areaPatolas:e.target.value}))} /></Campo>
          <Campo label="Resistência do solo (t/m²)"><input style={S.input} type="number" min="0" step="0.1" value={resistSolo} onChange={e=>setResistSolo(e.target.value)} /></Campo>
        </div>
        <button style={{...S.btn(false),marginTop:16}} onClick={calcPatolamento}>Calcular Pressão</button>
        {resPat && <ResultBox status={resPat.status} label="Pressão nas Patolas" valor={resPat.pressao.toFixed(3)} unidade="t/m²" msg={resPat.msg} />}
      </div>

      {/* Checklist */}
      <div style={S.card}>
        <div style={S.cardTitle}>📋 Checklist de Campo — NR-11 + N-2869</div>
        <Campo label="Supervisor Responsável">
          <input style={{...S.input,maxWidth:320}} value={resp} onChange={e=>setResp(e.target.value)} />
        </Campo>
        <div style={{marginTop:16,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:6}}>
            <span>{done}/{total} itens verificados</span>
            <span style={{color:pct===100?"#22c55e":pct>=70?"#f59e0b":"#ef4444",fontWeight:700}}>{pct}%</span>
          </div>
          <div style={S.progressBar}><div style={S.progressFill(pct,pct===100?"#22c55e":pct>=70?"#f59e0b":"#ef4444")} /></div>
        </div>
        {categorias.map(cat => (
          <div key={cat}>
            <div style={{...S.catTitle,marginTop:20}}>▸ {cat}</div>
            {CHECKLIST_CAMPO.filter(i=>i.cat===cat).map(item=>(
              <div key={item.id} style={S.checkRow(checked[item.id])} onClick={()=>toggle(item.id)}>
                <div style={S.checkbox(checked[item.id])}>{checked[item.id]&&<span style={{color:"#0f0f1a",fontSize:13,fontWeight:900}}>✓</span>}</div>
                <span style={{fontSize:13,color:"#cbd5e1",lineHeight:1.5}}>{item.item}</span>
              </div>
            ))}
          </div>
        ))}
        {canPrintPdf(isLoggedIn, user?.role) && !(planData?.cargaBruta || planData?.tensao || planData?.volume || planData?.swl || planData?.cg) && (
          <div style={{...S.normaBox, marginTop:16, fontSize:11, color:"#d97706"}}>
            ⚠ Nenhum cálculo encontrado. Calcule os dados nas abas <strong>Guindaste &amp; Carga</strong> e <strong>Lingada &amp; Carga</strong> antes de gerar o PDF.
          </div>
        )}
        <div style={{display:"flex",gap:10,marginTop:24,flexWrap:"wrap"}}>
          {canPrintPdf(isLoggedIn, user?.role) && (
            <button style={{...S.btn(false),background:"linear-gradient(135deg,#1e3a5f,#1e40af)"}} onClick={()=>setShowRelatorio(true)}>
              Gerar Relatório PDF
            </button>
          )}
          <button style={{...S.btn(false),background:"transparent",border:"1px solid #ef444444",color:"#ef4444"}}
            onClick={()=>{ setChecked({}); localStorage.removeItem(CL_KEY); }}>
            Limpar Checklist
          </button>
        </div>
        {isLoggedIn && !canPrintPdf(isLoggedIn, user?.role) && (
          <div style={{...S.normaBox,marginTop:12,fontSize:11}}>
            Relatório PDF disponível para: <strong>Gerente de Operações</strong>, <strong>Líder de Equipe</strong> e <strong>Admin Empresa</strong>.
          </div>
        )}
        <div style={{...S.normaBox,marginTop:8}}>
          {resp&&<span>Supervisor: {resp} · </span>}{new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}
        </div>
      </div>

      {/* Alta Tensão */}
      <div style={S.card}>
        <div style={S.cardTitle}>⚡ Distâncias Seguras — Redes de Alta Tensão</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#1e1e35"}}>
                <th style={{padding:"8px 12px",textAlign:"left",color:"#94a3b8",fontWeight:600,borderBottom:"1px solid #2d2d4a"}}>Tensão da rede</th>
                <th style={{padding:"8px 12px",textAlign:"center",color:"#94a3b8",fontWeight:600,borderBottom:"1px solid #2d2d4a"}}>Distância mínima</th>
                <th style={{padding:"8px 12px",textAlign:"left",color:"#94a3b8",fontWeight:600,borderBottom:"1px solid #2d2d4a"}}>Norma</th>
              </tr>
            </thead>
            <tbody>
              {HIGH_VOLTAGE_TABLE.map((row,i)=>(
                <tr key={i} style={{background:i%2===0?"#0f0f1a":"#141424",borderBottom:"1px solid #1e1e35"}}>
                  <td style={{padding:"7px 12px",color:"#cbd5e1"}}>{row.faixa}</td>
                  <td style={{padding:"7px 12px",textAlign:"center",fontWeight:700,color:row.minDist===null?"#ef4444":row.minDist>=8?"#f59e0b":"#22c55e"}}>
                    {row.minDist!==null ? `${row.minDist.toFixed(1).replace(".",",")} m` : "⚠ "+row.norma}
                  </td>
                  <td style={{padding:"7px 12px",color:"#64748b",fontSize:11}}>{row.minDist!==null?row.norma:"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OS e Solicitação */}
      {isLoggedIn && (
        <div style={S.card}>
          <div style={S.cardTitle}>📨 Ordem de Serviço & Solicitação de Liberação</div>
          {solicitacao ? (
            <div>
              {solicitacao.status === "ANALISAR" && (
                <div style={{...S.warnBox,textAlign:"center",padding:28}}>
                  <div style={{fontSize:32,marginBottom:12}}>⏳</div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>Aguardando autorização do responsável</div>
                  <div style={{color:"#94a3b8",fontSize:12}}>OS: <strong>{solicitacao.operacaoOs}</strong></div>
                  <div style={{color:"#64748b",fontSize:11,marginTop:8}}>Verificando automaticamente a cada 5 segundos...</div>
                </div>
              )}
              {solicitacao.status === "PROSSEGUIR" && (
                <div style={{background:"#052e16",border:"1px solid #22c55e44",borderRadius:12,padding:28,textAlign:"center"}}>
                  <div style={{fontSize:40,marginBottom:12}}>✅</div>
                  <div style={{fontWeight:800,fontSize:16,color:"#22c55e",marginBottom:8}}>IÇAMENTO AUTORIZADO — PROSSEGUIR</div>
                  <div style={{color:"#94a3b8",fontSize:12}}>OS: <strong style={{color:"#fff"}}>{solicitacao.operacaoOs}</strong></div>
                  <div style={{color:"#22c55e",fontSize:13,marginTop:6}}>Autorizado por: <strong>{solicitacao.aprovadoPorNome}</strong></div>
                  {solicitacao.observacao && <div style={{color:"#94a3b8",fontSize:12,marginTop:8,fontStyle:"italic"}}>"{solicitacao.observacao}"</div>}
                </div>
              )}
              {solicitacao.status === "PARAR" && (
                <div style={{...S.errorBox,textAlign:"center",padding:28}}>
                  <div style={{fontSize:40,marginBottom:12}}>🚫</div>
                  <div style={{fontWeight:800,fontSize:16,marginBottom:8}}>IÇAMENTO NÃO AUTORIZADO — PARAR</div>
                  <div style={{fontSize:12}}>OS: <strong>{solicitacao.operacaoOs}</strong></div>
                  {solicitacao.observacao && <div style={{fontSize:12,marginTop:8,fontStyle:"italic"}}>Motivo: "{solicitacao.observacao}"</div>}
                </div>
              )}
              <button style={{...S.btn(false),background:"#1e1e35",color:"#64748b",marginTop:16}}
                onClick={()=>{ setSolicitacao(null); setJobId(""); setSolError(null); }}>
                Nova Operação
              </button>
            </div>
          ) : (
            <div>
              <div style={{fontSize:11,color:"#64748b",marginBottom:16}}>
                Preencha o número da OS e solicite autorização ao Líder ou Administrador.
              </div>
              <Campo label="Número da OS">
                <input style={S.input} placeholder="ex: OS-2024-089" value={jobId} onChange={e=>setJobId(e.target.value)} />
              </Campo>
              <div style={{marginTop:10,fontSize:11,color:"#64748b",display:"flex",gap:16,flexWrap:"wrap"}}>
                <span>Operador: <strong style={{color:"#94a3b8"}}>{user?.userName||"—"}</strong></span>
                <span>Perfil: <strong style={{color:"#94a3b8"}}>{roleLabel(user?.role)}</strong></span>
              </div>
              {solError && <div style={{...S.errorBox,marginTop:12,fontSize:12}}>{solError}</div>}
              <button style={{...S.btn(false),marginTop:16,opacity:solLoading?0.6:1}}
                onClick={solicitarLiberacao} disabled={solLoading}>
                {solLoading?"Enviando...":"📤 Solicitar Autorização do Içamento"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
