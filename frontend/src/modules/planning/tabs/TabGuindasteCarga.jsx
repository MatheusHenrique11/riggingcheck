/**
 * Tab Guindaste & Carga — extraída de App.jsx.
 * Lógica e JSX preservados sem alterações.
 */

import { useState } from "react";
import { S, statusCalc, statusStyle } from "../shared/planningStyles";
import { MATERIAIS, FATORES_SEG } from "../shared/planningConstants";
import { ResultBox, Campo } from "../shared/PlanningComponents";

export default function TabGuindasteCarga({ planData = {}, onSave }) {
  const [cb, setCb] = useState(() => planData.cargaBruta?.inputs || { liq: "", esl: "", man: "", disp: "" });
  const [resCb, setResCb] = useState(() => planData.cargaBruta || null);

  const [forma, setForma] = useState(() => planData.volume?.forma || "PARALELEPIPEDO");
  const [dims, setDims] = useState(() => planData.volume?.dims || { L: "", C: "", H: "", D: "" });
  const [matIdx, setMatIdx] = useState(() => planData.volume?.matIdx || 0);
  const [resVol, setResVol] = useState(() => planData.volume || null);

  const [ug, setUg] = useState(() => planData.utilizacaoGuindaste?.inputs || { capacidade: "", cargaTotal: "" });
  const [resUg, setResUg] = useState(() => planData.utilizacaoGuindaste || null);

  const [swl, setSwl] = useState(() => planData.swl?.inputs || { crm: "", fsIdx: 2, forca: "" });
  const [resSwl, setResSwl] = useState(() => planData.swl || null);

  const [pat, setPat] = useState(() => planData.patolamento?.inputs || { cargaTotal: "", pesoGuindaste: "", areaPatolas: "" });
  const [resPat, setResPat] = useState(() => planData.patolamento || null);
  const [resistSolo, setResistSolo] = useState(() => String(planData.patolamento?.resistSolo ?? "1.5"));

  const calcCargaBruta = () => {
    const v = Object.values(cb).map(Number);
    if (v.some(isNaN)) return;
    const total = v.reduce((a, b) => a + b, 0);
    const n2869 = total >= 20000;
    const r = { total, n2869, inputs: { ...cb } };
    setResCb(r);
    onSave?.("cargaBruta", r);
  };

  const calcUg = () => {
    const cap = parseFloat(ug.capacidade);
    const ct  = parseFloat(ug.cargaTotal);
    if (isNaN(cap) || isNaN(ct) || cap <= 0) return;
    const pct    = (ct / cap) * 100;
    const risk   = pct < 70 ? "SAFE" : pct < 90 ? "WARNING" : "DANGER";
    const status = pct < 70 ? "SEGURO" : pct < 90 ? "ATENCAO" : "REPROVADO";
    const approved = pct < 90;
    const margem = cap - ct;
    const r = { capacidade: cap, cargaTotal: ct, pct, risk, status, approved, margem, inputs: { ...ug } };
    setResUg(r);
    onSave?.("utilizacaoGuindaste", r);
  };

  const calcVolume = () => {
    const { L, C, H, D } = dims;
    const l = parseFloat(L), c = parseFloat(C), h = parseFloat(H), d = parseFloat(D);
    let vol = 0;
    if (forma === "PARALELEPIPEDO") { if ([l,c,h].some(isNaN)) return; vol = l * c * h; }
    if (forma === "CILINDRO")       { if ([d,h].some(isNaN)) return; vol = (d*d*0.7854) * h; }
    if (forma === "PIRAMIDE")       { if ([l,c,h].some(isNaN)) return; vol = l * c * (h / 3); }
    if (forma === "CUBO")           { if (isNaN(l)) return; vol = l * l * l; }
    if (forma === "CUNHA")          { if ([l,c,h].some(isNaN)) return; vol = (l * c / 2) * h; }
    const mat = MATERIAIS[matIdx];
    const peso = vol * mat.pe;
    const r = { vol, peso, forma, matNome: mat.nome, matPe: mat.pe };
    setResVol(r);
    onSave?.("volume", r);
  };

  const calcSwl = () => {
    const crm = parseFloat(swl.crm), forca = parseFloat(swl.forca);
    if (isNaN(crm) || isNaN(forca) || crm <= 0) return;
    const fs = FATORES_SEG[swl.fsIdx].fsMin;
    const swlVal = crm / fs;
    const taxa = (forca / swlVal) * 100;
    const status = statusCalc(taxa, [80, 100]);
    const r = { swlVal, taxa, fs, status, crm, forca, tipoAplicacao: FATORES_SEG[swl.fsIdx].tipo };
    setResSwl(r);
    onSave?.("swl", r);
  };

  const calcPatolamento = () => {
    const ct = parseFloat(pat.cargaTotal), pg = parseFloat(pat.pesoGuindaste), area = parseFloat(pat.areaPatolas);
    if ([ct, pg, area].some(isNaN) || area <= 0) return;
    const pressao = (ct + pg) / area;
    const resist  = parseFloat(resistSolo);
    const ok      = !isNaN(resist) && pressao <= resist;
    const r = {
      pressao,
      status:    ok ? "SEGURO" : "REPROVADO",
      resistSolo: resist,
      inputs:    { ...pat },
      msg:       ok
        ? `${pressao.toFixed(3)} t/m² ≤ resistência ${resist} t/m²`
        : `${pressao.toFixed(3)} t/m² EXCEDE ${resist} t/m² — ampliar pranchas!`,
    };
    setResPat(r);
    onSave?.("patolamento", r);
  };

  const formaFields = {
    PARALELEPIPEDO: [["L","Largura (m)"],["C","Comprimento (m)"],["H","Altura (m)"]],
    CILINDRO:       [["D","Diâmetro (m)"],["H","Altura (m)"]],
    PIRAMIDE:       [["L","Largura (m)"],["C","Comprimento (m)"],["H","Altura (m)"]],
    CUBO:           [["L","Lado (m)"]],
    CUNHA:          [["L","Largura (m)"],["C","Comprimento (m)"],["H","Altura (m)"]],
  };

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>⚖ 1.1 — Carga Bruta</div>
        <div style={S.grid()}>
          {[["liq","Carga líquida (kg)"],["esl","Peso eslingas (kg)"],["man","Peso manilhas (kg)"],["disp","Peso dispositivos (kg)"]].map(([k,l])=>(
            <Campo key={k} label={l}>
              <input style={S.input} type="number" min="0" value={cb[k]}
                onChange={e=>setCb(p=>({...p,[k]:e.target.value}))} />
            </Campo>
          ))}
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcCargaBruta}>Calcular</button>
        {resCb && (
          <ResultBox
            status={resCb.n2869 ? "ATENCAO" : "SEGURO"}
            label="Carga Bruta Total"
            valor={resCb.total.toLocaleString("pt-BR")}
            unidade="kg"
            msg={resCb.n2869 ? "N-2869: IÇAMENTO CRÍTICO — carga ≥ 20t. Requer Rigger Nível 3 e plano aprovado." : "Içamento Normal (< 20t)"}
          />
        )}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>🏗 2 — Taxa de Utilização do Guindaste</div>
        <div style={S.grid()}>
          <Campo label="Capacidade do guindaste (kg)">
            <input style={S.input} type="number" min="0" step="1" placeholder="Ex.: 50000"
              value={ug.capacidade} onChange={e=>setUg(p=>({...p,capacidade:e.target.value}))} />
          </Campo>
          <Campo label={`Carga total (kg)${resCb ? " — ou use o valor de 1.1 acima" : ""}`}>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{...S.input, flex:1}} type="number" min="0" step="1" placeholder="Ex.: 12500"
                value={ug.cargaTotal} onChange={e=>setUg(p=>({...p,cargaTotal:e.target.value}))} />
              {resCb && (
                <button
                  style={{ ...S.btn(false), padding:"0 12px", fontSize:11, whiteSpace:"nowrap" }}
                  onClick={() => setUg(p=>({...p, cargaTotal: String(resCb.total)}))}>
                  Usar 1.1
                </button>
              )}
            </div>
          </Campo>
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcUg}>Calcular</button>
        {resUg && (
          <>
            <ResultBox
              status={resUg.status}
              label="Taxa de Utilização"
              valor={resUg.pct.toFixed(1)}
              unidade="%"
              msg={
                `Capacidade: ${resUg.capacidade.toLocaleString("pt-BR")} kg | ` +
                `Carga: ${resUg.cargaTotal.toLocaleString("pt-BR")} kg | ` +
                `Margem: ${resUg.margem.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})} kg | ` +
                (resUg.approved ? "✔ Içamento aprovado" : "✖ Içamento NÃO aprovado — sobrecarga")
              }
            />
            <div style={{...S.progressBar, marginTop:12}}>
              <div style={S.progressFill(resUg.pct, statusStyle(resUg.status).color)} />
            </div>
            <div style={{ display:"flex", gap:8, marginTop:8, fontSize:11, color:"#64748b" }}>
              <span style={{ color:"#22c55e" }}>▌ &lt;70% Seguro</span>
              <span style={{ color:"#f59e0b" }}>▌ 70–89% Atenção</span>
              <span style={{ color:"#ef4444" }}>▌ ≥90% Reprovado</span>
            </div>
          </>
        )}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>📐 1.2 / 1.3 — Volume & Peso por Geometria</div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:16 }}>
          <Campo label="Forma geométrica">
            <select style={S.select} value={forma} onChange={e=>{setForma(e.target.value); setDims({L:"",C:"",H:"",D:""}); setResVol(null);}}>
              {["PARALELEPIPEDO","CILINDRO","PIRAMIDE","CUBO","CUNHA"].map(f=>(
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Material (NBR 6120)">
            <select style={S.select} value={matIdx} onChange={e=>setMatIdx(Number(e.target.value))}>
              {MATERIAIS.map((m,i)=>(
                <option key={m.nome} value={i}>{m.nome} — {m.pe.toLocaleString("pt-BR")} kg/m³</option>
              ))}
            </select>
          </Campo>
        </div>
        <div style={S.grid()}>
          {formaFields[forma].map(([k,l])=>(
            <Campo key={k} label={l}>
              <input style={S.input} type="number" min="0" step="0.01" value={dims[k]}
                onChange={e=>setDims(p=>({...p,[k]:e.target.value}))} />
            </Campo>
          ))}
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcVolume}>Calcular</button>
        {resVol && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:16 }}>
            <ResultBox status="SEGURO" label="Volume" valor={resVol.vol.toLocaleString("pt-BR",{maximumFractionDigits:4,timeZone:"America/Sao_Paulo"})} unidade="m³" />
            <ResultBox status={resVol.peso >= 20000 ? "ATENCAO" : "SEGURO"} label="Peso estimado" valor={resVol.peso.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})} unidade="kg"
              msg={resVol.peso>=20000?"N-2869: Içamento Crítico":undefined}/>
          </div>
        )}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>🦺 3 — Patolamento (N-2869)</div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 14 }}>
          P = (Carga total + Peso do guindaste) ÷ Área de apoio das patolas. Se pressão &gt; resistência do solo, operação será BLOQUEADA.
        </div>
        <div style={S.grid()}>
          <Campo label="Carga total (t)">
            <input style={S.input} type="number" min="0" step="0.1" value={pat.cargaTotal}
              onChange={e => setPat(p => ({ ...p, cargaTotal: e.target.value }))} />
          </Campo>
          <Campo label="Peso do guindaste (t)">
            <input style={S.input} type="number" min="0" step="0.1" value={pat.pesoGuindaste}
              onChange={e => setPat(p => ({ ...p, pesoGuindaste: e.target.value }))} />
          </Campo>
          <Campo label="Área de apoio das patolas (m²)">
            <input style={S.input} type="number" min="0" step="0.01" value={pat.areaPatolas}
              onChange={e => setPat(p => ({ ...p, areaPatolas: e.target.value }))} />
          </Campo>
          <Campo label="Resistência do solo (t/m²)">
            <input style={S.input} type="number" min="0" step="0.1" value={resistSolo}
              onChange={e => setResistSolo(e.target.value)} />
          </Campo>
        </div>
        <button style={{ ...S.btn(false), marginTop: 16 }} onClick={calcPatolamento}>Calcular Pressão</button>
        {resPat && (
          <ResultBox
            status={resPat.status}
            label="Pressão nas Patolas"
            valor={resPat.pressao.toFixed(3)}
            unidade="t/m²"
            msg={resPat.msg}
          />
        )}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>🔒 4 — SWL / Fator de Segurança</div>
        <div style={S.grid()}>
          <Campo label="CRM — Carga de Ruptura Mínima (kg)">
            <input style={S.input} type="number" min="0" value={swl.crm}
              onChange={e=>setSwl(p=>({...p,crm:e.target.value}))} />
          </Campo>
          <Campo label="Tipo de aplicação">
            <select style={S.select} value={swl.fsIdx} onChange={e=>setSwl(p=>({...p,fsIdx:Number(e.target.value)}))}>
              {FATORES_SEG.map((f,i)=>(
                <option key={i} value={i}>{f.tipo} (FS ≥ {f.fsMin})</option>
              ))}
            </select>
          </Campo>
          <Campo label="Força exercida (kg)">
            <input style={S.input} type="number" min="0" value={swl.forca}
              onChange={e=>setSwl(p=>({...p,forca:e.target.value}))} />
          </Campo>
        </div>
        <button style={{...S.btn(false), marginTop:16}} onClick={calcSwl}>Calcular</button>
        {resSwl && (
          <>
            <ResultBox
              status={resSwl.status}
              label="SWL (Carga de Trabalho Segura)"
              valor={resSwl.swlVal.toLocaleString("pt-BR",{maximumFractionDigits:1,timeZone:"America/Sao_Paulo"})}
              unidade="kg"
              msg={`Taxa de utilização: ${resSwl.taxa.toFixed(1)}% | FS aplicado: ${resSwl.fs}:1`}
            />
            <div style={{...S.progressBar, marginTop:12}}>
              <div style={S.progressFill(resSwl.taxa, statusStyle(resSwl.status).color)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
