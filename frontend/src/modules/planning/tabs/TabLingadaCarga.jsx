/**
 * Tab Lingada & Carga — extraída de App.jsx.
 * Lógica e JSX preservados sem alterações.
 */

import { useState } from "react";
import { S, multAngulo, statusCalc } from "../shared/planningStyles";
import { ResultBox, Campo } from "../shared/PlanningComponents";
import {
  CABO_ACO_TABLE, CABO_ACO_19AA_TABLE, CABO_ACO_37AF_TABLE,
  CINTA_SINTETICA_TABLE, MANILHA_TABLE,
  CORRENTE_G80_TABLE, CORRENTE_G100_TABLE,
  lookupWllFromMaterial,
} from "../../../utils/calculations";

export default function TabLingadaCarga({ planData = {}, onSave }) {
  const [cg, setCg] = useState(() => planData.cg?.inputs || { p1:"", p2:"", dt:"" });
  const [resCg, setResCg] = useState(() => planData.cg || null);

  const [te, setTe] = useState(() => planData.tensao?.inputs || { carga:"", pernas:"2", angulo:"60", tipo:"CABO", wll:"" });
  const [resTe, setResTe] = useState(() => planData.tensao || null);

  const [matSel, setMatSel] = useState({ tipo: "", id: "", modo: "simples" });
  const [conv, setConv] = useState({ pol: "", ft: "", lb: "" });

  const [n2869, setN2869] = useState(() => planData.n2869?.inputs || {
    vento:"", utilizacao:"", usaDoisGuindastes:false,
    sobreInstalacoes:false, areaClassificada:false,
  });
  const [resN2, setResN2] = useState(() => planData.n2869 || null);

  const calcCG = () => {
    const p1=parseFloat(cg.p1), p2=parseFloat(cg.p2), dt=parseFloat(cg.dt);
    if([p1,p2,dt].some(isNaN)||p1<=0||p2<=0||dt<=0) return;
    const pt = p1+p2;
    const d1 = (p2/pt)*dt;
    const d2 = dt-d1;
    const desequil = Math.abs(p1-p2)/pt*100;
    const r = {pt,d1,d2,desequil,status:desequil>30?"ATENCAO":"SEGURO", inputs:{...cg}};
    setResCg(r);
    onSave?.("cg", r);
  };

  const calcTensao = () => {
    const carga=parseFloat(te.carga), pernas=parseInt(te.pernas), angulo=parseFloat(te.angulo);
    if([carga,pernas,angulo].some(isNaN)||carga<=0) return;
    if(angulo<30) {
      const r = {bloqueado:true, msg:"STOP WORK — N-2869/NR-11: ângulo < 30° é PROIBIDO. Risco de colapso da lingada.", inputs:{...te}};
      setResTe(r); onSave?.("tensao", r); return;
    }
    const mult   = multAngulo(angulo);
    const tensao = (carga / pernas) * mult;
    const fs     = te.tipo === "CINTA" ? 7 : 5;
    const wllVal   = parseFloat(te.wll);
    const temWll   = !isNaN(wllVal) && wllVal > 0;
    const base     = temWll ? wllVal : carga / fs;
    const taxa     = (tensao / base) * 100;
    const statusBase = statusCalc(taxa, [80, 100]);
    const status   = angulo < 45 ? "ATENCAO" : statusBase;
    const r = {
      tensao, mult, taxa, fs,
      wll: temWll ? wllVal : null, temWll,
      swl: temWll ? null : base,
      status, bloqueado: false, inputs: {...te},
      msg: angulo < 45
        ? `Atenção: ângulo ${angulo}° abaixo de 45° — zona de risco elevado.`
        : undefined,
    };
    setResTe(r);
    onSave?.("tensao", r);
  };

  const validarN2869 = () => {
    const vento=parseFloat(n2869.vento), util=parseFloat(n2869.utilizacao);
    const critico = (util>=75)||n2869.usaDoisGuindastes||n2869.sobreInstalacoes||n2869.areaClassificada;
    const limUtil = critico ? 75 : 85;
    const alertas = [];
    if(!isNaN(vento)&&vento>=45) alertas.push(`Vento ${vento} km/h ≥ 45 km/h — OPERAÇÃO PROIBIDA.`);
    if(!isNaN(util)&&util>limUtil) alertas.push(`Utilização ${util}% excede limite ${limUtil}% para içamento ${critico?"Crítico":"Normal"}.`);
    if(n2869.usaDoisGuindastes) alertas.push("Dois guindastes → Içamento Crítico: exige Rigger Nível 3.");
    if(n2869.sobreInstalacoes) alertas.push("Içamento sobre instalações vivas → Crítico.");
    if(n2869.areaClassificada) alertas.push("Área classificada (risco explosão) → Crítico.");
    const r = {critico,limUtil,alertas,inputs:{...n2869},
      status: alertas.length===0?"SEGURO":(!isNaN(vento)&&vento>=45)||(!isNaN(util)&&util>100)?"REPROVADO":"ATENCAO"};
    setResN2(r);
    onSave?.("n2869", r);
  };

  return (
    <div>
      {/* Centro de Gravidade */}
      <div style={S.card}>
        <div style={S.cardTitle}>⚖ 2 — Centro de Gravidade (2 pontos)</div>
        <div style={S.grid()}>
          {[["p1","P1 — Peso no ponto 1 (kg)"],["p2","P2 — Peso no ponto 2 (kg)"],["dt","Dt — Distância total entre pontos (m)"]].map(([k,l])=>(
            <Campo key={k} label={l}>
              <input style={S.input} type="number" min="0" step="0.01" value={cg[k]}
                onChange={e=>setCg(p=>({...p,[k]:e.target.value}))} />
            </Campo>
          ))}
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcCG}>Calcular</button>
        {resCg && (
          <ResultBox status={resCg.status} label="Posição do CG relativa ao Ponto 1"
            valor={resCg.d1.toLocaleString("pt-BR",{maximumFractionDigits:3,timeZone:"America/Sao_Paulo"})} unidade="m"
            msg={`d2: ${resCg.d2.toLocaleString("pt-BR",{maximumFractionDigits:3,timeZone:"America/Sao_Paulo"})} m | Desequilíbrio: ${resCg.desequil.toFixed(1)}%${resCg.desequil>30?" — ATENÇÃO: carga desequilibrada":""}`}
          />
        )}
      </div>

      {/* Tensão nas Eslingas */}
      <div style={S.card}>
        <div style={S.cardTitle}>📐 3 — Tensão nas Eslingas (N-2869/NBR 13541)</div>
        <div style={S.grid()}>
          <Campo label="Carga total (kg)">
            <input style={S.input} type="number" min="0" value={te.carga}
              onChange={e=>setTe(p=>({...p,carga:e.target.value}))} />
          </Campo>
          <Campo label="Número de pernas">
            <select style={S.select} value={te.pernas} onChange={e=>setTe(p=>({...p,pernas:e.target.value}))}>
              {[1,2,3,4].map(n=><option key={n} value={n}>{n} perna{n>1?"s":""}</option>)}
            </select>
          </Campo>
          <Campo label="Ângulo da eslinga (° com a vertical) — mín. 30°">
            <input style={S.input} type="number" min="1" max="90" value={te.angulo}
              onChange={e=>setTe(p=>({...p,angulo:e.target.value}))} />
          </Campo>
          <Campo label="Tipo de eslinga">
            <select style={S.select} value={te.tipo} onChange={e=>setTe(p=>({...p,tipo:e.target.value}))}>
              <option value="CABO">Cabo de aço (FS 5:1)</option>
              <option value="CINTA">Cinta têxtil (FS 7:1)</option>
            </select>
          </Campo>
          <Campo label="WLL da eslinga (kg) — etiqueta / certificado">
            <input style={S.input} type="number" min="0" step="0.1" placeholder="Ex.: 3200"
              value={te.wll} onChange={e=>setTe(p=>({...p,wll:e.target.value}))} />
          </Campo>
        </div>

        {/* Seletor por tabela */}
        <div style={{...S.normaBox, marginTop:12, padding:"10px 14px"}}>
          <div style={{color:"#94a3b8", fontSize:11, marginBottom:8, fontWeight:600}}>🔍 Preencher WLL pela tabela de materiais</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:"8px 12px", alignItems:"flex-end"}}>
            <div>
              <div style={{fontSize:10, color:"#64748b", marginBottom:3}}>Tipo de material</div>
              <select style={{...S.select, fontSize:11, padding:"4px 8px"}}
                value={matSel.tipo}
                onChange={e => setMatSel({ tipo: e.target.value, id: "", modo: "simples" })}>
                <option value="">— selecionar —</option>
                <optgroup label="Cintas Sintéticas (NBR 13545)">
                  <option value="CINTA">Cinta Têxtil</option>
                </optgroup>
                <optgroup label="Laços de Cabo de Aço (NBR 13541)">
                  <option value="CABO_AF19">6×19 AF (alma de fibra)</option>
                  <option value="CABO_AA19">6×19 AA/IWRC (alma de aço)</option>
                  <option value="CABO_AF37">6×37 AF (alta flexibilidade)</option>
                </optgroup>
                <optgroup label="Correntes (EN 818-4)">
                  <option value="CORRENTE_G80">Corrente Grau 80</option>
                  <option value="CORRENTE_G100">Corrente Grau 100</option>
                </optgroup>
                <optgroup label="Manilhas (ASME B30.26)">
                  <option value="MANILHA_CURVA">Manilha Curva (bow)</option>
                  <option value="MANILHA_RETA">Manilha Reta (dee)</option>
                </optgroup>
              </select>
            </div>
            {matSel.tipo && (
              <div>
                <div style={{fontSize:10, color:"#64748b", marginBottom:3}}>
                  {matSel.tipo === "CINTA" ? "Cor / Capacidade" : "Diâmetro (mm)"}
                </div>
                <select style={{...S.select, fontSize:11, padding:"4px 8px"}}
                  value={matSel.id}
                  onChange={e => {
                    const v = e.target.value;
                    const isStr = ["CINTA","MANILHA_CURVA","MANILHA_RETA"].includes(matSel.tipo);
                    setMatSel(p => ({ ...p, id: v === "" ? "" : (isStr ? v : parseFloat(v)) }));
                  }}>
                  <option value="">— selecionar —</option>
                  {matSel.tipo === "CINTA" && CINTA_SINTETICA_TABLE.map(r => (
                    <option key={r.cor} value={r.cor}>{r.cor} — {r.vertical}t vertical</option>
                  ))}
                  {matSel.tipo === "CABO_AF19" && CABO_ACO_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.diametro} ({r.mm} mm) — {r.simples}t simples</option>
                  ))}
                  {matSel.tipo === "CABO_AA19" && CABO_ACO_19AA_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.diametro} ({r.mm} mm) — {r.simples}t simples</option>
                  ))}
                  {matSel.tipo === "CABO_AF37" && CABO_ACO_37AF_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.diametro} ({r.mm} mm) — {r.simples}t simples</option>
                  ))}
                  {matSel.tipo === "CORRENTE_G80" && CORRENTE_G80_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.mm} mm — {r.simples}t simples</option>
                  ))}
                  {matSel.tipo === "CORRENTE_G100" && CORRENTE_G100_TABLE.map(r => (
                    <option key={r.mm} value={r.mm}>Ø{r.mm} mm — {r.simples}t simples</option>
                  ))}
                  {(matSel.tipo === "MANILHA_CURVA" || matSel.tipo === "MANILHA_RETA") && MANILHA_TABLE.map(r => (
                    <option key={r.pol} value={r.pol}>{r.pol} ({r.mm} mm) — SWL {matSel.tipo === "MANILHA_CURVA" ? r.swlCurva : r.swlReta}t</option>
                  ))}
                </select>
              </div>
            )}
            {matSel.tipo && matSel.id !== "" && !["MANILHA_CURVA","MANILHA_RETA"].includes(matSel.tipo) && (
              <div>
                <div style={{fontSize:10, color:"#64748b", marginBottom:3}}>Modo de uso</div>
                <select style={{...S.select, fontSize:11, padding:"4px 8px"}}
                  value={matSel.modo}
                  onChange={e => setMatSel(p => ({ ...p, modo: e.target.value }))}>
                  {matSel.tipo === "CINTA" && <>
                    <option value="vertical">Vertical (simples)</option>
                    <option value="choker">Choker (abraçado)</option>
                    <option value="cesto">Cesto (2 pernas)</option>
                    <option value="ang45">Cesto 45°</option>
                    <option value="ang30">Cesto 30°</option>
                  </>}
                  {["CABO_AF19","CABO_AA19","CABO_AF37"].includes(matSel.tipo) && <>
                    <option value="simples">Simples (vertical)</option>
                    <option value="forca">Choker (abraçado)</option>
                    <option value="cesto">Cesto (2 pernas 0°)</option>
                  </>}
                  {["CORRENTE_G80","CORRENTE_G100"].includes(matSel.tipo) && <>
                    <option value="simples">1 Perna (simples)</option>
                    <option value="choker">Choker</option>
                    <option value="cesto">Cesto (0°)</option>
                    <option value="pernas2_ang60">2 Pernas 60°</option>
                    <option value="pernas2_ang45">2 Pernas 45°</option>
                    <option value="pernas4_ang60">4 Pernas 60°</option>
                    <option value="pernas4_ang45">4 Pernas 45°</option>
                  </>}
                </select>
              </div>
            )}
            {matSel.tipo && matSel.id !== "" && (() => {
              const wll = lookupWllFromMaterial(matSel);
              if (!wll) return null;
              return (
                <div>
                  <div style={{fontSize:10, color:"#22c55e", marginBottom:3}}>WLL encontrado</div>
                  <button
                    style={{...S.btn(false), padding:"4px 12px", fontSize:11, background:"#052e16", borderColor:"#22c55e44", color:"#22c55e"}}
                    onClick={() => setTe(p => ({ ...p, wll: String(wll) }))}>
                    Usar {(wll/1000).toFixed(3)} t ({wll.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} kg)
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

        <div style={{...S.normaBox, marginTop:12, fontSize:11, color:"#64748b"}}>
          💡 Informe o WLL (Carga de Trabalho) da eslinga para calcular a utilização real. Se omitido,
          a utilização será estimada pelo FS mínimo da norma ({te.tipo==="CINTA"?"7:1":"5:1"}).
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcTensao}>Calcular</button>
        {resTe && (
          resTe.bloqueado
          ? <div style={{...S.errorBox, fontSize:13, marginTop:16, fontWeight:700}}>{resTe.msg}</div>
          : <ResultBox status={resTe.status} label="Tensão por perna"
              valor={resTe.tensao.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})} unidade="kgf"
              msg={
                resTe.temWll
                  ? `Mult: ${resTe.mult.toFixed(3)} | WLL eslinga: ${resTe.wll.toLocaleString("pt-BR",{maximumFractionDigits:0,timeZone:"America/Sao_Paulo"})} kg | Utilização WLL: ${resTe.taxa.toFixed(1)}%${resTe.msg?` — ${resTe.msg}`:""}`
                  : `Mult: ${resTe.mult.toFixed(3)} | SWL mín. (FS ${resTe.fs}:1): ${resTe.swl.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})} kg | Util. estimada: ${resTe.taxa.toFixed(1)}%${resTe.msg?` — ${resTe.msg}`:""}`
              }
            />
        )}
        <div style={{...S.normaBox, marginTop:16}}>
          <div style={{color:"#f59e0b", marginBottom:8, fontSize:11, letterSpacing:"1px", textTransform:"uppercase"}}>Tabela de Multiplicadores — NR-11 / ABNT NBR 13541 / N-2869</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:"4px 14px", fontSize:11}}>
            {[[90,1.000],[85,1.004],[80,1.015],[75,1.035],[70,1.064],[65,1.103],[60,1.155],[55,1.221],[50,1.305],[45,1.414],[40,1.556],[35,1.743]].map(([g,m])=>(
              <span key={g} style={{color: g<45?"#f59e0b":g<30?"#ef4444":"#64748b"}}>{g}°→{m.toFixed(3)}</span>
            ))}
            <span style={{color:"#ef4444", fontWeight:700}}>{"<"}30°→PROIBIDO</span>
          </div>
        </div>
      </div>

      {/* N-2869 */}
      <div style={S.card}>
        <div style={S.cardTitle}>🛡 N-2869 — Classificação & Validações</div>
        <div style={S.grid()}>
          <Campo label="Velocidade do vento (km/h)">
            <input style={S.input} type="number" min="0" value={n2869.vento}
              onChange={e=>setN2869(p=>({...p,vento:e.target.value}))} />
          </Campo>
          <Campo label="Utilização do guindaste (%)">
            <input style={S.input} type="number" min="0" max="100" value={n2869.utilizacao}
              onChange={e=>setN2869(p=>({...p,utilizacao:e.target.value}))} />
          </Campo>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:10, marginTop:14}}>
          {[
            ["usaDoisGuindastes","Operação com 2 ou mais guindastes simultâneos"],
            ["sobreInstalacoes","Carga passa sobre tubulações/equipamentos críticos"],
            ["areaClassificada","Área classificada (risco de explosão)"],
          ].map(([k,l])=>(
            <label key={k} style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:12, color:"#94a3b8"}}>
              <input type="checkbox" checked={n2869[k]} onChange={e=>setN2869(p=>({...p,[k]:e.target.checked}))}
                style={{width:16, height:16, accentColor:"#f59e0b"}} />
              {l}
            </label>
          ))}
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={validarN2869}>Validar N-2869</button>
        {resN2 && (
          <>
            <div style={{background: resN2.critico?"#2d1900":"#052e16", border:`1px solid ${resN2.critico?"#f59e0b33":"#22c55e33"}`, borderRadius:10, padding:14, marginTop:14}}>
              <div style={{fontWeight:700, color: resN2.critico?"#f59e0b":"#22c55e", fontSize:13}}>
                Classificação: IÇAMENTO {resN2.critico?"CRÍTICO":"NORMAL"}
              </div>
              <div style={{color:"#94a3b8", fontSize:11, marginTop:4}}>Limite de utilização: {resN2.limUtil}%</div>
              {resN2.critico && <div style={{color:"#f59e0b", fontSize:11, marginTop:4}}>Requer assinatura de Rigger Nível 3 e plano aprovado pela supervisão.</div>}
            </div>
            {resN2.alertas.map((a,i)=>(
              <div key={i} style={{...S.errorBox, marginTop:8}}>{a}</div>
            ))}
            {resN2.alertas.length===0 && <div style={{...S.successBox, marginTop:8}}>Todos os parâmetros N-2869 dentro dos limites.</div>}
          </>
        )}
      </div>

      {/* Conversão de Unidades */}
      <div style={S.card}>
        <div style={S.cardTitle}>📐 Conversão de Unidades</div>
        <style>{`
          .conv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
          .conv-pair { display: grid; grid-template-columns: 1fr auto 1fr; gap: 6px; align-items: end; }
          .conv-pair input { width: 100%; box-sizing: border-box; min-width: 0; }
          .conv-arrow { color: #475569; font-size: 16px; text-align: center; padding-bottom: 8px; }
          .conv-label { font-size: 10px; color: #64748b; margin-bottom: 3px; }
        `}</style>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div>
            <div style={{fontSize:11, color:"#94a3b8", marginBottom:7, fontWeight:600}}>Polegadas ↔ Milímetros</div>
            <div className="conv-grid">
              <div className="conv-pair">
                <div><div className="conv-label">Polegadas (in)</div>
                  <input style={S.input} type="number" placeholder="ex: 1.5" step="0.001"
                    value={conv.pol} onChange={e=>setConv(p=>({...p,pol:e.target.value}))} /></div>
                <div className="conv-arrow">→</div>
                <div><div className="conv-label">Milímetros (mm)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.pol !== "" && !isNaN(parseFloat(conv.pol)) ? (parseFloat(conv.pol)*25.4).toFixed(3) : ""} /></div>
              </div>
              <div className="conv-pair">
                <div><div className="conv-label">Milímetros (mm)</div>
                  <input style={S.input} type="number" placeholder="ex: 25.4" step="0.01"
                    value={conv.mmPol ?? ""} onChange={e=>setConv(p=>({...p,mmPol:e.target.value}))} /></div>
                <div className="conv-arrow">→</div>
                <div><div className="conv-label">Polegadas (in)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.mmPol !== undefined && conv.mmPol !== "" && !isNaN(parseFloat(conv.mmPol)) ? (parseFloat(conv.mmPol)/25.4).toFixed(5) : ""} /></div>
              </div>
            </div>
          </div>
          <div>
            <div style={{fontSize:11, color:"#94a3b8", marginBottom:7, fontWeight:600}}>Pés ↔ Metros</div>
            <div className="conv-grid">
              <div className="conv-pair">
                <div><div className="conv-label">Pés (ft)</div>
                  <input style={S.input} type="number" placeholder="ex: 10" step="0.01"
                    value={conv.ft} onChange={e=>setConv(p=>({...p,ft:e.target.value}))} /></div>
                <div className="conv-arrow">→</div>
                <div><div className="conv-label">Metros (m)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.ft !== "" && !isNaN(parseFloat(conv.ft)) ? (parseFloat(conv.ft)*0.3048).toFixed(4) : ""} /></div>
              </div>
              <div className="conv-pair">
                <div><div className="conv-label">Metros (m)</div>
                  <input style={S.input} type="number" placeholder="ex: 3.048" step="0.001"
                    value={conv.m ?? ""} onChange={e=>setConv(p=>({...p,m:e.target.value}))} /></div>
                <div className="conv-arrow">→</div>
                <div><div className="conv-label">Pés (ft)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.m !== undefined && conv.m !== "" && !isNaN(parseFloat(conv.m)) ? (parseFloat(conv.m)/0.3048).toFixed(4) : ""} /></div>
              </div>
            </div>
          </div>
          <div>
            <div style={{fontSize:11, color:"#94a3b8", marginBottom:7, fontWeight:600}}>Libras ↔ Quilogramas</div>
            <div className="conv-grid">
              <div className="conv-pair">
                <div><div className="conv-label">Libras (lb)</div>
                  <input style={S.input} type="number" placeholder="ex: 2000" step="0.1"
                    value={conv.lb} onChange={e=>setConv(p=>({...p,lb:e.target.value}))} /></div>
                <div className="conv-arrow">→</div>
                <div><div className="conv-label">Quilogramas (kg)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.lb !== "" && !isNaN(parseFloat(conv.lb)) ? (parseFloat(conv.lb)*0.4536).toFixed(3) : ""} /></div>
              </div>
              <div className="conv-pair">
                <div><div className="conv-label">Quilogramas (kg)</div>
                  <input style={S.input} type="number" placeholder="ex: 907.18" step="0.1"
                    value={conv.kg ?? ""} onChange={e=>setConv(p=>({...p,kg:e.target.value}))} /></div>
                <div className="conv-arrow">→</div>
                <div><div className="conv-label">Libras (lb)</div>
                  <input style={{...S.input, color:"#22c55e"}} readOnly
                    value={conv.kg !== undefined && conv.kg !== "" && !isNaN(parseFloat(conv.kg)) ? (parseFloat(conv.kg)/0.4536).toFixed(3) : ""} /></div>
              </div>
            </div>
          </div>
        </div>
        <div style={{...S.normaBox, marginTop:12, fontSize:10, color:"#475569"}}>
          1 pol = 25,4 mm · 1 ft = 0,3048 m · 1 lb = 0,4536 kg
        </div>
      </div>
    </div>
  );
}
