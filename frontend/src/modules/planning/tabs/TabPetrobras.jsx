/**
 * Tab Petrobras N-2869 — extraída de App.jsx.
 * Lógica e JSX preservados sem alterações.
 */

import { useState, useEffect, useMemo } from "react";
import { classificarIcamento, N2869_DOCUMENTOS } from "../../../utils/calculations";

export default function TabPetrobras({ planData = {}, onSave }) {
  const usoPct = planData.usoPct ?? 0;

  const [tandem,            setTandem]            = useState(false);
  const [sobreAreaHabitada, setSobreAreaHabitada] = useState(false);
  const [cargaEspecial,     setCargaEspecial]     = useState(false);
  const [projetista,        setProjetista]        = useState({ nome: "", registro: "" });
  const [supervisor,        setSupervisor]        = useState({ nome: "", registro: "" });
  const [checklist,         setChecklist]         = useState({});

  const classificacao = useMemo(
    () => classificarIcamento({ usoPct, tandem, sobreAreaHabitada, cargaEspecial }),
    [usoPct, tandem, sobreAreaHabitada, cargaEspecial]
  );

  useEffect(() => {
    const docs = N2869_DOCUMENTOS[classificacao] ?? [];
    const KEYS = ["pt","ast","plano","anemometro","caboGuia","bastao","preUso","comunicacao","equipe","capacidade"];
    const todosMarcados = KEYS.every(k => !!checklist[k]);
    onSave?.("petrobrasData", {
      classificacao, tandem, sobreAreaHabitada, cargaEspecial,
      projetista: { ...projetista }, supervisor: { ...supervisor },
      checklist: { ...checklist }, todosMarcados, docs,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classificacao, tandem, sobreAreaHabitada, cargaEspecial, projetista, supervisor, checklist]);

  const toggleCheck = (key) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }));

  const corClass = {
    ROTINEIRO:     { bg: "#052e16", border: "#22c55e44", color: "#22c55e", label: "ROTINEIRO" },
    NAO_ROTINEIRO: { bg: "#2d1900", border: "#f59e0b44", color: "#f59e0b", label: "NÃO ROTINEIRO" },
    CRITICO:       { bg: "#1c0a0a", border: "#ef444444", color: "#ef4444", label: "IÇAMENTO CRÍTICO" },
  }[classificacao];

  const docs = N2869_DOCUMENTOS[classificacao] ?? [];

  const CHECKLIST_ITEMS = [
    { key: "pt",          label: "Permissão de Trabalho (PT) emitida e assinada" },
    { key: "ast",         label: "AST / Análise de Risco (ART) realizada" },
    { key: "plano",       label: "Plano de Rigging aprovado pelo Projetista (PLH)" },
    { key: "anemometro",  label: "Anemômetro funcional verificado na cabine" },
    { key: "caboGuia",    label: "Cabo guia instalado na carga" },
    { key: "bastao",      label: "Bastão balizador (mãos livres) disponível" },
    { key: "preUso",      label: "Checklist de verificação pré-uso executado (item 9.1.14)" },
    { key: "comunicacao", label: "Plano de comunicação distribuído à equipe" },
    { key: "equipe",      label: "Equipe mínima confirmada: Projetista, Supervisor, Operador, Sinaleiro" },
    { key: "capacidade",  label: `Utilização do guindaste ≤ 90% confirmada (atual: ${usoPct.toFixed(1)}%)` },
  ];

  const sBase  = { fontFamily: "Arial, sans-serif", fontSize: 14, color: "#cbd5e1" };
  const sCard  = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "18px 20px", marginBottom: 16 };
  const sLabel = { display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 };
  const sInput = { width: "100%", background: "#0a0a0f", border: "1px solid #1e293b", borderRadius: 6, padding: "8px 12px", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box" };
  const sRow   = { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 };

  const todosMarcados = CHECKLIST_ITEMS.every(i => checklist[i.key]);

  return (
    <div style={sBase}>
      <div style={{ ...sCard, background: "#0f0a1f", borderColor: "#7c3aed44", marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>
          ⚙️ Módulo Petrobras — N-2869 Rev.B (06/2025)
        </div>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          Requisitos para içamentos em unidades e instalações do sistema Petrobras.
        </div>
      </div>

      {/* Classificação */}
      <div style={sCard}>
        <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>Classificação da Movimentação (Item 7.4)</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            [tandem, setTandem, "Içamento em Tandem (2+ guindastes)"],
            [sobreAreaHabitada, setSobreAreaHabitada, "Sobre área habitada / área de processo"],
            [cargaEspecial, setCargaEspecial, "Carga especial (frágil, perigosa ou de grande porte)"],
          ].map(([val, setter, label]) => (
            <label key={label} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#94a3b8", cursor:"pointer" }}>
              <input type="checkbox" checked={val} onChange={e=>setter(e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
        <div style={{ padding:"12px 16px", borderRadius:8, background:corClass.bg, border:`1px solid ${corClass.border}`, display:"inline-flex", alignItems:"center", gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:corClass.color }} />
          <span style={{ fontWeight:700, color:corClass.color, fontSize:15 }}>{corClass.label}</span>
          {usoPct > 75 && <span style={{ fontSize:12, color:"#f59e0b" }}> · Utilização {usoPct.toFixed(1)}% &gt; 75%</span>}
        </div>
      </div>

      {/* Documentação */}
      <div style={sCard}>
        <div style={{ fontWeight:600, color:"#94a3b8", marginBottom:10 }}>Documentação Obrigatória — Tabela 2</div>
        {docs.map(d => (
          <div key={d} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid #1e293b", fontSize:13, color:"#cbd5e1" }}>
            <span style={{ color:"#22c55e", fontSize:16 }}>✓</span> {d}
          </div>
        ))}
        {classificacao === "CRITICO" && (
          <div style={{ marginTop:10, padding:"10px 14px", background:"#1c0a0a", borderRadius:6, border:"1px solid #ef444433", fontSize:13, color:"#ef4444" }}>
            ⚠️ Içamento Crítico exige Plano de Rigging Detalhado aprovado pelo Projetista (PLH) antes do início.
          </div>
        )}
      </div>

      {/* Equipe */}
      <div style={sCard}>
        <div style={{ fontWeight:600, color:"#94a3b8", marginBottom:12 }}>Equipe Mínima (Item 4.3)</div>
        <div style={sRow}>
          <div style={{ flex:1, minWidth:220 }}>
            <label style={sLabel}>Nome do Projetista (PLH)</label>
            <input style={sInput} value={projetista.nome} onChange={e=>setProjetista(p=>({...p,nome:e.target.value}))} placeholder="Nome completo" />
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <label style={sLabel}>Registro de Classe (CREA/CFT)</label>
            <input style={sInput} value={projetista.registro} onChange={e=>setProjetista(p=>({...p,registro:e.target.value}))} placeholder="Ex: CREA-RJ 123456/D" />
          </div>
        </div>
        <div style={sRow}>
          <div style={{ flex:1, minWidth:220 }}>
            <label style={sLabel}>Nome do Supervisor de Içamento</label>
            <input style={sInput} value={supervisor.nome} onChange={e=>setSupervisor(p=>({...p,nome:e.target.value}))} placeholder="Nome completo" />
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <label style={sLabel}>Registro de Classe</label>
            <input style={sInput} value={supervisor.registro} onChange={e=>setSupervisor(p=>({...p,registro:e.target.value}))} placeholder="Ex: CREA-SP 654321/D" />
          </div>
        </div>
      </div>

      {/* Equipamentos */}
      <div style={sCard}>
        <div style={{ fontWeight:600, color:"#94a3b8", marginBottom:12 }}>Segurança em Equipamentos</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:10 }}>
          {[
            { icon:"🌬️", titulo:"Anemômetro",        desc:"Obrigatório e funcional na cabine. Operar dentro dos limites de vento do fabricante." },
            { icon:"🧵", titulo:"Cabo Guia",          desc:"Uso obrigatório para estabilização e direcionamento da carga." },
            { icon:"🦯", titulo:"Bastão Balizador",   desc:"Uso obrigatório (mãos livres). Proibido segurar a carga diretamente." },
            { icon:"📋", titulo:"Checklist Pré-uso",  desc:"Executar a cada início de turno conforme item 9.1.14 da N-2869." },
          ].map(item=>(
            <div key={item.titulo} style={{ background:"#0a0a0f", border:"1px solid #1e293b", borderRadius:8, padding:"12px 14px" }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{item.icon}</div>
              <div style={{ fontWeight:600, color:"#94a3b8", fontSize:13, marginBottom:4 }}>{item.titulo}</div>
              <div style={{ fontSize:12, color:"#64748b", lineHeight:1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div style={sCard}>
        <div style={{ fontWeight:600, color:"#94a3b8", marginBottom:12 }}>
          Checklist de Conformidade N-2869
          {todosMarcados && <span style={{ marginLeft:10, color:"#22c55e", fontSize:13 }}>✓ Todos os itens verificados</span>}
        </div>
        {CHECKLIST_ITEMS.map(item=>(
          <label key={item.key} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom:"1px solid #1e293b", cursor:"pointer" }}>
            <input type="checkbox" checked={!!checklist[item.key]} onChange={()=>toggleCheck(item.key)}
              style={{ marginTop:2, accentColor:"#22c55e", width:16, height:16 }} />
            <span style={{ fontSize:13, color:checklist[item.key]?"#22c55e":"#94a3b8", lineHeight:1.5 }}>{item.label}</span>
          </label>
        ))}
      </div>

      {/* FS */}
      <div style={{ ...sCard, background:"#0a0f1a", borderColor:"#0ea5e944" }}>
        <div style={{ fontWeight:600, color:"#38bdf8", marginBottom:8 }}>Fatores de Segurança — N-2869</div>
        <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.8 }}>
          <div>• Utilização máxima: <strong style={{color:"#f59e0b"}}>90% da capacidade nominal</strong> no raio de operação</div>
          <div>• Içamentos acima de 75% são classificados como Críticos</div>
          <div>• Içamentos em tandem exigem coordenação documentada</div>
          <div>• FS mínimo cabos de aço: <strong>5:1</strong> · FS mínimo cintas: <strong>7:1</strong></div>
        </div>
      </div>

      <div style={{ textAlign:"center", fontSize:12, color:"#334155", marginTop:8 }}>
        Norma N-2869 Rev.B (06/2025) · Petrobras · Uso exclusivo para planejamento de içamento
      </div>
    </div>
  );
}
