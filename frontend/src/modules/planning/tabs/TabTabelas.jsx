/**
 * Tab Tabelas de Capacidade — extraída de App.jsx.
 * Lógica e JSX preservados sem alterações.
 */

import { useState } from "react";
import {
  CABO_ACO_TABLE, CABO_ACO_19AA_TABLE, CABO_ACO_37AF_TABLE,
  CINTA_SINTETICA_TABLE, MANILHA_TABLE,
  CORRENTE_G80_TABLE, CORRENTE_G100_TABLE,
} from "../../../utils/calculations";

export default function TabEquipamentos() {
  const [secao, setSecao] = useState("cintas");
  const [subCabo, setSubCabo] = useState("af19");

  const sBase   = { fontFamily: "Arial, sans-serif", fontSize: 14, color: "#cbd5e1" };
  const sCard   = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 18px", marginBottom: 16 };
  const sTh     = { padding: "8px 12px", fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap", textAlign: "left" };
  const sTd     = { padding: "7px 12px", fontSize: 13, borderBottom: "1px solid #0f172a", whiteSpace: "nowrap" };
  const sTdNum  = { ...sTd, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const sTable  = { width: "100%", borderCollapse: "collapse", overflowX: "auto" };

  const wllColor = (t) => t >= 10 ? "#22c55e" : t >= 5 ? "#38bdf8" : t >= 2 ? "#f59e0b" : "#94a3b8";
  const Num = ({ v, unit = "t" }) => (
    <span style={{ color: wllColor(v), fontWeight: 600 }}>
      {v != null ? `${typeof v === "number" ? v.toFixed(2) : v} ${unit}` : "—"}
    </span>
  );

  const SECOES = [
    { id: "cintas",    label: "🎗 Cintas Têxteis"   },
    { id: "cabos",     label: "🔩 Cabos de Aço"     },
    { id: "correntes", label: "⛓ Correntes"         },
    { id: "manilhas",  label: "🔗 Manilhas"          },
  ];
  const CABOS = [
    { id: "af19",  label: "6×19 Alma de Fibra (AF)"   },
    { id: "aa19",  label: "6×19 Alma de Aço (AA/IWRC)" },
    { id: "af37",  label: "6×37 Alma de Fibra (AF)"   },
  ];
  const tabelaCabo = subCabo === "af19" ? CABO_ACO_TABLE
                   : subCabo === "aa19" ? CABO_ACO_19AA_TABLE
                   : CABO_ACO_37AF_TABLE;
  const normaInfo = {
    cintas:    "NBR 13545:2021 — Cintas de Elevação de Poliéster / FS 7:1",
    cabos:     "ABNT NBR 13541-1:2014 — Eslingas de Cabo de Aço / FS 5:1",
    correntes: "EN 818-4 / NBR ISO 3076 — Correntes de Elevação / FS 4:1",
    manilhas:  "NBR 13545 / ASME B30.26 — Manilhas de Elevação",
  };

  return (
    <div style={sBase}>
      <div style={{ ...sCard, background: "#0a0f1a", borderColor: "#0ea5e944", marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>
          📊 Tabelas de Capacidade de Materiais de Içamento
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          WLL — Working Load Limit (Carga Máxima de Trabalho) em toneladas. Nunca exceder sem cálculo de içamento aprovado.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {SECOES.map(s => (
          <button key={s.id} onClick={() => setSecao(s.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: secao === s.id ? "#0ea5e9" : "#1e293b",
            color:      secao === s.id ? "#fff"    : "#94a3b8",
          }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#475569", marginBottom: 16 }}>📋 {normaInfo[secao]}</div>

      {/* CINTAS */}
      {secao === "cintas" && (
        <div style={sCard}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>
            Cintas Sintéticas de Poliéster — Identificação por Cor
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={sTable}>
              <thead>
                <tr style={{ background: "#0a0a0f" }}>
                  {["Cor","WLL Vertical","Choker","Cesto 0°–45°","Cesto 45°","Cesto 30°"].map(h=>(
                    <th key={h} style={sTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CINTA_SINTETICA_TABLE.map((e, i) => {
                  const COR_HEX = { Violeta:"#7c3aed", Verde:"#22c55e", Amarelo:"#f59e0b", Cinza:"#94a3b8", Vermelho:"#ef4444", Branco:"#f1f5f9", Laranja:"#f97316", Marrom:"#92400e", Azul:"#3b82f6" };
                  return (
                    <tr key={e.cor} style={{ background: i%2===0?"#0f172a":"#0a0a0f" }}>
                      <td style={sTd}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:14, height:14, borderRadius:"50%", background:COR_HEX[e.cor]||"#fff", flexShrink:0 }} />
                          <strong style={{ color:COR_HEX[e.cor]||"#fff" }}>{e.cor}</strong>
                        </div>
                      </td>
                      <td style={sTdNum}><Num v={e.vertical} /></td>
                      <td style={sTdNum}><Num v={e.choker} /></td>
                      <td style={sTdNum}><Num v={e.cesto} /></td>
                      <td style={sTdNum}><Num v={e.ang45} /></td>
                      <td style={sTdNum}><Num v={e.ang30} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize:11, color:"#475569", marginTop:12, lineHeight:1.7 }}>
            Choker = 0,8 × WLL · Cesto 0°–45° = 2,0 × WLL · FS = 7:1 (NBR 13545:2021). Verificar validade a cada 3 meses.
          </div>
        </div>
      )}

      {/* CABOS */}
      {secao === "cabos" && (
        <div style={sCard}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
            {CABOS.map(c => (
              <button key={c.id} onClick={()=>setSubCabo(c.id)} style={{
                padding:"6px 14px", borderRadius:6, border:"none", cursor:"pointer", fontSize:12,
                background: subCabo===c.id?"#1e40af":"#1e293b",
                color:      subCabo===c.id?"#93c5fd":"#64748b",
              }}>{c.label}</button>
            ))}
          </div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:12 }}>
            {subCabo==="af19"&&"6×19 AF — construção padrão, alma de fibra natural/sintética. Mais flexível; uso geral."}
            {subCabo==="aa19"&&"6×19 AA/IWRC — alma de aço independente. ~8-10% maior WLL. Melhor resistência à compressão."}
            {subCabo==="af37"&&"6×37 AF — maior número de arames, máxima flexibilidade."}
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={sTable}>
              <thead>
                <tr style={{ background:"#0a0a0f" }}>
                  {["Diâmetro","mm","Simples (Vertical)","Forca (Choker)","Cesto (Basket)"].map(h=>(<th key={h} style={sTh}>{h}</th>))}
                </tr>
              </thead>
              <tbody>
                {tabelaCabo.map((e,i)=>(
                  <tr key={e.diametro} style={{ background:i%2===0?"#0f172a":"#0a0a0f" }}>
                    <td style={{...sTd,fontWeight:700,color:"#e2e8f0"}}>{e.diametro}</td>
                    <td style={sTdNum}>{e.mm}</td>
                    <td style={sTdNum}><Num v={e.simples} /></td>
                    <td style={sTdNum}><Num v={e.forca} /></td>
                    <td style={sTdNum}><Num v={e.cesto} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize:11, color:"#475569", marginTop:10 }}>
            FS = 5:1 (NBR 13541-1:2014). Forca: fator real depende do raio de dobramento. Inspeção visual antes de cada uso.
          </div>
        </div>
      )}

      {/* CORRENTES */}
      {secao === "correntes" && (
        <>
          {[
            { grau:"80",  tabela:CORRENTE_G80_TABLE,  cor:"#f59e0b", badge:"G80"  },
            { grau:"100", tabela:CORRENTE_G100_TABLE, cor:"#22c55e", badge:"G100" },
          ].map(({grau,tabela,cor,badge})=>(
            <div key={grau} style={{...sCard,borderColor:cor+"33"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{background:cor,color:"#000",fontWeight:800,fontSize:12,borderRadius:6,padding:"3px 10px"}}>{badge}</div>
                <div style={{fontWeight:700,color:"#e2e8f0"}}>Corrente Grau {grau}</div>
                <div style={{fontSize:11,color:"#64748b"}}>EN 818-4 / NBR ISO 3076 · FS 4:1</div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={sTable}>
                  <thead>
                    <tr style={{background:"#0a0a0f"}}>
                      {["Ø (mm)","1 Perna","Choker","Cesto","2P 60°","2P 45°","4P 60°","4P 45°"].map(h=><th key={h} style={sTh}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tabela.map((e,i)=>(
                      <tr key={e.mm} style={{background:i%2===0?"#0f172a":"#0a0a0f"}}>
                        <td style={{...sTd,fontWeight:700,color:cor}}>{e.mm}</td>
                        <td style={sTdNum}><Num v={e.simples} /></td>
                        <td style={sTdNum}><Num v={e.choker} /></td>
                        <td style={sTdNum}><Num v={e.cesto} /></td>
                        <td style={sTdNum}><Num v={e.pernas2_ang60} /></td>
                        <td style={sTdNum}><Num v={e.pernas2_ang45} /></td>
                        <td style={sTdNum}><Num v={e.pernas4_ang60} /></td>
                        <td style={sTdNum}><Num v={e.pernas4_ang45} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <div style={{...sCard,background:"#0a0f1a"}}>
            <div style={{fontSize:12,color:"#64748b",lineHeight:1.8}}>
              G80 = amarela/laranja · G100 = azul/verde · Nunca misturar graus · Inspeção a cada 3 meses · Proibido soldar ou aquecer elos.
            </div>
          </div>
        </>
      )}

      {/* MANILHAS */}
      {secao === "manilhas" && (
        <div style={sCard}>
          <div style={{fontSize:14,fontWeight:700,color:"#94a3b8",marginBottom:12}}>
            Manilhas de Elevação — Curva (Ω Bow) e Reta (Ancora)
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={sTable}>
              <thead>
                <tr style={{background:"#0a0a0f"}}>
                  {["Diâmetro do Pino","SWL Curva (Bow)","SWL Reta","Diferença"].map(h=><th key={h} style={sTh}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {MANILHA_TABLE.map((e,i)=>{
                  const diff = ((e.swlCurva-e.swlReta)/e.swlReta*100).toFixed(0);
                  return (
                    <tr key={e.pol} style={{background:i%2===0?"#0f172a":"#0a0a0f"}}>
                      <td style={{...sTd,fontWeight:700,color:"#e2e8f0"}}>{e.pol}<span style={{color:"#475569",fontSize:10,marginLeft:4}}>({e.mm} mm)</span></td>
                      <td style={sTdNum}><Num v={e.swlCurva} /></td>
                      <td style={sTdNum}><Num v={e.swlReta} /></td>
                      <td style={{...sTdNum,color:e.swlCurva>e.swlReta?"#22c55e":"#94a3b8"}}>
                        {e.swlCurva>e.swlReta?`+${diff}%`:"—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:11,color:"#475569",marginTop:12,lineHeight:1.7}}>
            SWL conforme NBR 13545 / ASME B30.26 · Travar pino com arame de segurança · Manilhas pintadas: rejeitar.
          </div>
        </div>
      )}

      {/* Legenda WLL */}
      <div style={{...sCard,background:"#0a0a0f"}}>
        <div style={{fontSize:11,color:"#475569",marginBottom:6,fontWeight:600,letterSpacing:"1px",textTransform:"uppercase"}}>Escala de Cores — WLL</div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {[{label:"< 2 t",cor:"#94a3b8"},{label:"2–5 t",cor:"#f59e0b"},{label:"5–10 t",cor:"#38bdf8"},{label:"≥ 10 t",cor:"#22c55e"}].map(l=>(
            <div key={l.label} style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
              <div style={{width:12,height:12,borderRadius:3,background:l.cor}} />
              <span style={{color:l.cor}}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
