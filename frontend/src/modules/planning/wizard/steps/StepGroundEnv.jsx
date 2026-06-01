/**
 * Etapas 5+6 — Solo, Patolamento e Ambiente.
 * Coleta dados que alimentam as regras 4, 6, 7 e 8 da Compliance Engine:
 *   - Pressão nas patolas × resistência do solo
 *   - Dois ou mais guindastes
 *   - Área classificada
 *   - Rede elétrica próxima
 */

import { useState, useEffect } from "react";
import TabPetrobras from "../../tabs/TabPetrobras";

const S = {
  card:   { background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid #334155" },
  title:  { fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 },
  label:  { display: "block", fontSize: 11, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  input:  { width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 15, padding: "10px 14px" },
  grid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 16 },
  toggle: (on) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #1e293b", cursor: "pointer", fontSize: 13, color: on ? "#f1f5f9" : "#64748b" }),
  check:  (on) => ({ width: 20, height: 20, borderRadius: 4, border: `2px solid ${on ? "#3b82f6" : "#334155"}`, background: on ? "#3b82f6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }),
};

export default function StepGroundEnv({ planData, onSave }) {
  const [pressao,     setPressao]     = useState(planData.pressaoPatolasKpa     ?? "");
  const [resistencia, setResistencia] = useState(planData.resistenciaSoloKpa    ?? "");
  const [doisGuind,   setDoisGuind]   = useState(planData.doisOuMaisGuindastes  ?? false);
  const [areaClass,   setAreaClass]   = useState(planData.areaClassificada      ?? false);
  const [redeOk,      setRedeOk]      = useState(planData.redeEletricaValidada  ?? null);
  const [petrobras,   setPetrobras]   = useState(planData.petrobrasAtivo        ?? false);

  const pressaoNum = parseFloat(pressao);
  const resistNum  = parseFloat(resistencia);
  const patolamentoBloqueado = !isNaN(pressaoNum) && !isNaN(resistNum) && pressaoNum > resistNum;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onSave("pressaoPatolasKpa",    pressao     === "" ? null : parseFloat(pressao));
    onSave("resistenciaSoloKpa",   resistencia === "" ? null : parseFloat(resistencia));
    onSave("doisOuMaisGuindastes", doisGuind);
    onSave("areaClassificada",     areaClass);
    onSave("redeEletricaValidada", redeOk);
    onSave("petrobrasAtivo",       petrobras);
  }, [pressao, resistencia, doisGuind, areaClass, redeOk, petrobras]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>🦺 Solo, Patolamento e Ambiente</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Dados de solo, rede elétrica e condições especiais da operação.
        </p>
      </div>

      {/* Patolamento */}
      <div style={S.card}>
        <div style={S.title}>🏗 Patolamento (Regra N-2869)</div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 14 }}>
          P = (Carga total + Peso do guindaste) ÷ Área de apoio.
          Se a pressão calculada exceder a resistência do solo, a operação será BLOQUEADA pela Compliance Engine.
        </div>
        <div style={S.grid}>
          <div>
            <label style={S.label}>Pressão nas patolas (kPa)</label>
            <input style={S.input} type="number" min="0" step="0.1" placeholder="Ex: 120.5"
              value={pressao} onChange={e => setPressao(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Resistência do solo (kPa)</label>
            <input style={S.input} type="number" min="0" step="0.1" placeholder="Ex: 150.0"
              value={resistencia} onChange={e => setResistencia(e.target.value)} />
          </div>
        </div>
        {patolamentoBloqueado && (
          <div style={{ background: "#1c0a0a", border: "1px solid #ef444444", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13 }}>
            ⛔ Pressão ({pressaoNum.toFixed(1)} kPa) excede resistência do solo ({resistNum.toFixed(1)} kPa). Esta operação será BLOQUEADA.
          </div>
        )}
        {!isNaN(pressaoNum) && !isNaN(resistNum) && !patolamentoBloqueado && (
          <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 8, padding: "10px 14px", color: "#22c55e", fontSize: 13 }}>
            ✓ Patolamento dentro do limite ({pressaoNum.toFixed(1)} kPa ≤ {resistNum.toFixed(1)} kPa).
          </div>
        )}
      </div>

      {/* Condições especiais */}
      <div style={S.card}>
        <div style={S.title}>⚠ Condições Especiais da Operação</div>

        {[
          { state: doisGuind,  set: setDoisGuind, label: "Operação com dois ou mais guindastes simultâneos", note: "→ RESTRICTED: exige plano conjunto e Rigger Nível 3" },
          { state: areaClass,  set: setAreaClass, label: "Área classificada (risco de explosão / incêndio)",   note: "→ RESTRICTED: equipamentos Ex obrigatórios" },
        ].map(({ state, set, label, note }) => (
          <div key={label} style={S.toggle(state)} onClick={() => set(v => !v)}>
            <div style={S.check(state)}>{state && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}</div>
            <div>
              <div>{label}</div>
              {state && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>{note}</div>}
            </div>
          </div>
        ))}

        {/* Rede elétrica */}
        <div style={{ marginTop: 16 }}>
          <label style={S.label}>Rede elétrica próxima à operação?</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { val: null,  label: "Não verificado", color: "#64748b" },
              { val: true,  label: "Sim — distâncias validadas ✓", color: "#22c55e" },
              { val: false, label: "Sim — SEM validação ⛔", color: "#ef4444" },
            ].map(opt => (
              <button key={String(opt.val)} onClick={() => setRedeOk(opt.val)} style={{
                border: `1px solid ${redeOk === opt.val ? opt.color : "#334155"}`,
                background: redeOk === opt.val ? opt.color + "22" : "transparent",
                color: redeOk === opt.val ? opt.color : "#64748b",
                borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13,
              }}>
                {opt.label}
              </button>
            ))}
          </div>
          {redeOk === false && (
            <div style={{ marginTop: 8, background: "#1c0a0a", border: "1px solid #ef444444", borderRadius: 8, padding: "8px 12px", color: "#fca5a5", fontSize: 12 }}>
              ⛔ Rede elétrica sem validação → BLOCKED pela Compliance Engine. Meça as distâncias (NR-10 Tabela 1) ou solicite desenergização.
            </div>
          )}
        </div>
      </div>

      {/* Módulo Petrobras opcional */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={S.title}>⚙ Módulo Petrobras N-2869</div>
          <button onClick={() => setPetrobras(v => !v)} style={{
            border: `1px solid ${petrobras ? "#a78bfa44" : "#334155"}`,
            background: petrobras ? "#a78bfa22" : "transparent",
            color: petrobras ? "#a78bfa" : "#64748b",
            borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13,
          }}>
            {petrobras ? "⚙ Ativo" : "Ativar"}
          </button>
        </div>
        {petrobras ? (
          <TabPetrobras planData={planData} onSave={onSave} />
        ) : (
          <div style={{ color: "#475569", fontSize: 13 }}>
            Ative para preencher requisitos Petrobras N-2869: classificação, documentação obrigatória e checklist específico.
          </div>
        )}
      </div>
    </div>
  );
}
