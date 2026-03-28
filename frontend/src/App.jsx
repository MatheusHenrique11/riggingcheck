import { useState, useEffect } from "react";

// ── PHYSICS ENGINE ─────────────────────────────────────────────────────────────
const calcSlingTension = (load, legs, angleDeg) => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const lf = 1 / Math.sin(angleRad); // load factor per leg
  const tension = (load / legs) * lf;
  return { tension: tension.toFixed(2), loadFactor: lf.toFixed(3) };
};

const calcCapacityUsage = (load, capacity) =>
  capacity > 0 ? ((load / capacity) * 100).toFixed(1) : 0;

const riskLevel = (pct) => {
  if (pct < 70) return { label: "SEGURO", color: "#22c55e", bg: "#052e16" };
  if (pct < 90) return { label: "ATENÇÃO", color: "#f59e0b", bg: "#2d1900" };
  return { label: "PERIGO", color: "#ef4444", bg: "#2d0000" };
};

// ── CHECKLIST DATA (NR-11 / ABNT NBR 11900) ────────────────────────────────────
const CHECKLIST = [
  {
    category: "Guindaste & Equipamento",
    items: [
      "Verificar capacidade de carga para o raio de operação atual",
      "Confirmar horizontalidade do guindaste (prumo)",
      "Inspecionar apoios (outriggers) — solo firme e nivelado",
      "Verificar funcionamento dos limitadores de carga e fim-de-curso",
      "Inspecionar cabos de aço quanto a corrosão, kinks e arames partidos",
    ],
  },
  {
    category: "Acessórios de Içamento",
    items: [
      "Inspecionar eslingas — cortes, desgaste, costuras comprometidas",
      "Verificar ganchos e linguetas de segurança (sem deformação)",
      "Checar grilhões: pino travado com arame de segurança",
      "Confirmar que WLL (Working Load Limit) dos acessórios supera a carga",
      "Verificar ângulo das eslingas (máx. recomendado: 60° da horizontal)",
    ],
  },
  {
    category: "Carga & Amarração",
    items: [
      "Identificar o CG (centro de gravidade) da carga",
      "Confirmar ponto de amarração adequado e resistente",
      "Verificar estabilidade e fixação de partes soltas na carga",
      "Realizar teste de folga (levantar 30 cm antes da manobra final)",
    ],
  },
  {
    category: "Área & Pessoal",
    items: [
      "Sinalizar e isolar área de risco com cone/fita/barreira",
      "Confirmar ausência de pessoal sob a carga suspensa",
      "Verificar condições climáticas (vento < 30 km/h, boa visibilidade)",
      "Confirmar comunicação operador ↔ Rigger (rádio ou sinal de mão)",
      "Confirmar presença do Rigger responsável certificado (NR-11)",
    ],
  },
];

// ── STYLES ─────────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e2e8f0",
    fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
    padding: "0 0 60px 0",
  },
  header: {
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1020 100%)",
    borderBottom: "1px solid #2d2d4a",
    padding: "32px 40px 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(12px)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  logoIcon: {
    width: 42,
    height: 42,
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    boxShadow: "0 0 20px rgba(245,158,11,0.3)",
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    background: "linear-gradient(90deg, #f59e0b, #fb923c)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  logoSub: {
    fontSize: 11,
    color: "#64748b",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
  tabs: {
    display: "flex",
    gap: 4,
  },
  tab: (active) => ({
    padding: "8px 20px",
    borderRadius: 6,
    border: "1px solid",
    borderColor: active ? "#f59e0b" : "#2d2d4a",
    background: active ? "rgba(245,158,11,0.12)" : "transparent",
    color: active ? "#f59e0b" : "#64748b",
    fontSize: 12,
    letterSpacing: "1px",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: active ? 700 : 400,
    transition: "all 0.2s",
  }),
  container: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "40px 24px",
  },
  card: {
    background: "#0f0f1a",
    border: "1px solid #1e1e35",
    borderRadius: 12,
    padding: 28,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 12,
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "#f59e0b",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  grid: (cols) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: 16,
  }),
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" },
  input: {
    background: "#070710",
    border: "1px solid #2d2d4a",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 16,
    padding: "10px 14px",
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.2s",
  },
  select: {
    background: "#070710",
    border: "1px solid #2d2d4a",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 15,
    padding: "10px 14px",
    fontFamily: "inherit",
    outline: "none",
  },
  result: (risk) => ({
    background: risk.bg,
    border: `1px solid ${risk.color}33`,
    borderRadius: 12,
    padding: 24,
    display: "flex",
    alignItems: "center",
    gap: 24,
    marginTop: 20,
  }),
  riskBadge: (risk) => ({
    background: risk.color,
    color: "#000",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: "2px",
    padding: "6px 14px",
    borderRadius: 6,
    whiteSpace: "nowrap",
  }),
  bigNum: (color) => ({
    fontSize: 40,
    fontWeight: 700,
    color: color,
    lineHeight: 1,
  }),
  smallLabel: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  divider: { border: "none", borderTop: "1px solid #1e1e35", margin: "20px 0" },
  btn: {
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    border: "none",
    borderRadius: 8,
    color: "#000",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "1px",
    padding: "12px 28px",
    cursor: "pointer",
    textTransform: "uppercase",
  },
  checkRow: (checked) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #1e1e35",
    cursor: "pointer",
    opacity: checked ? 0.55 : 1,
    transition: "opacity 0.2s",
  }),
  checkbox: (checked) => ({
    width: 20,
    height: 20,
    minWidth: 20,
    borderRadius: 5,
    border: `2px solid ${checked ? "#22c55e" : "#2d2d4a"}`,
    background: checked ? "#22c55e" : "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    transition: "all 0.2s",
  }),
  catTitle: {
    fontSize: 11,
    color: "#f59e0b",
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginTop: 28,
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  progressBar: (pct, color) => ({
    height: 6,
    background: "#1e1e35",
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 6,
    position: "relative",
  }),
  progressFill: (pct, color) => ({
    height: "100%",
    width: `${Math.min(pct, 100)}%`,
    background: color,
    borderRadius: 99,
    transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
  }),
  tag: (color) => ({
    display: "inline-block",
    fontSize: 10,
    letterSpacing: "1px",
    padding: "2px 8px",
    borderRadius: 4,
    border: `1px solid ${color}55`,
    color: color,
    textTransform: "uppercase",
  }),
  normaBox: {
    background: "#070710",
    border: "1px solid #1e1e35",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 12,
    color: "#64748b",
    marginTop: 16,
    lineHeight: 1.7,
  },
  warnBox: {
    background: "#2d1900",
    border: "1px solid #f59e0b44",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 12,
    color: "#f59e0b",
    marginTop: 12,
    lineHeight: 1.7,
  },
};

// ── MODULE 1: CAPACITY ──────────────────────────────────────────────────────────
function CapacityModule() {
  const [craneCapacity, setCraneCapacity] = useState("");
  const [loadWeight, setLoadWeight] = useState("");
  const [riggingWeight, setRiggingWeight] = useState("50");
  const [result, setResult] = useState(null);

  const calculate = () => {
    const cap = parseFloat(craneCapacity);
    const load = parseFloat(loadWeight);
    const rig = parseFloat(riggingWeight) || 0;
    if (!cap || !load) return;
    const totalLoad = load + rig;
    const pct = parseFloat(calcCapacityUsage(totalLoad, cap));
    const risk = riskLevel(pct);
    setResult({ pct, risk, totalLoad, cap, load, rig });
  };

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>⚖️ &nbsp;Verificação de Capacidade</div>
        <div style={S.grid(2)}>
          <div style={S.field}>
            <label style={S.label}>Capacidade do Guindaste (kg)</label>
            <input style={S.input} type="number" placeholder="ex: 10000"
              value={craneCapacity} onChange={e => setCraneCapacity(e.target.value)} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Peso da Carga (kg)</label>
            <input style={S.input} type="number" placeholder="ex: 6500"
              value={loadWeight} onChange={e => setLoadWeight(e.target.value)} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Peso do Aparelho (eslingas + gancho) (kg)</label>
            <input style={S.input} type="number" placeholder="ex: 50"
              value={riggingWeight} onChange={e => setRiggingWeight(e.target.value)} />
          </div>
        </div>

        <div style={{ ...S.normaBox }}>
          📋 <strong style={{ color: "#94a3b8" }}>ABNT NBR 11900 / NR-11:</strong> A carga total
          (incluindo aparelho de içamento) não deve ultrapassar a curva de carga do guindaste
          para o raio de operação. Recomenda-se margem mínima de 10% de segurança.
        </div>

        <div style={{ marginTop: 20 }}>
          <button style={S.btn} onClick={calculate}>Calcular</button>
        </div>

        {result && (
          <div style={S.result(result.risk)}>
            <div>
              <div style={S.bigNum(result.risk.color)}>{result.pct}%</div>
              <div style={S.smallLabel}>da capacidade utilizada</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={S.progressBar(result.pct)}>
                <div style={S.progressFill(result.pct, result.risk.color)} />
              </div>
              <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8 }}>
                <div>Carga total: <strong style={{ color: "#e2e8f0" }}>{result.totalLoad.toFixed(0)} kg</strong></div>
                <div>Capacidade: <strong style={{ color: "#e2e8f0" }}>{result.cap.toFixed(0)} kg</strong></div>
                <div>Margem disponível: <strong style={{ color: "#e2e8f0" }}>{(result.cap - result.totalLoad).toFixed(0)} kg</strong></div>
              </div>
            </div>
            <div style={S.riskBadge(result.risk)}>{result.risk.label}</div>
          </div>
        )}
        {result && result.pct >= 90 && (
          <div style={S.warnBox}>
            ⚠️ <strong>OPERAÇÃO NÃO PERMITIDA.</strong> Reduza a carga ou reposicione o guindaste
            para um raio menor que aumente a capacidade disponível.
          </div>
        )}
      </div>
    </div>
  );
}

// ── MODULE 2: SLING CALC ────────────────────────────────────────────────────────
function SlingModule() {
  const [load, setLoad] = useState("");
  const [legs, setLegs] = useState("2");
  const [angle, setAngle] = useState("45");
  const [wll, setWll] = useState("");
  const [result, setResult] = useState(null);

  const calculate = () => {
    const W = parseFloat(load);
    const L = parseInt(legs);
    const A = parseFloat(angle);
    if (!W || !L || !A) return;
    const { tension, loadFactor } = calcSlingTension(W, L, A);
    const T = parseFloat(tension);
    const wllNum = parseFloat(wll);
    const wllPct = wll ? ((T / wllNum) * 100).toFixed(1) : null;
    const wllRisk = wllPct ? riskLevel(parseFloat(wllPct)) : null;
    setResult({ tension: T, loadFactor, wllPct, wllRisk, angle: A });
  };

  const angleWarning = parseFloat(angle) < 45;

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>📐 &nbsp;Cálculo de Eslingas & Cabos</div>
        <div style={S.grid(2)}>
          <div style={S.field}>
            <label style={S.label}>Peso total da carga (kg)</label>
            <input style={S.input} type="number" placeholder="ex: 5000"
              value={load} onChange={e => setLoad(e.target.value)} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Número de pernas (legs)</label>
            <select style={S.select} value={legs} onChange={e => setLegs(e.target.value)}>
              <option value="1">1 perna</option>
              <option value="2">2 pernas</option>
              <option value="3">3 pernas</option>
              <option value="4">4 pernas</option>
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label}>Ângulo da eslinga (° da horizontal)</label>
            <input style={S.input} type="number" placeholder="ex: 60"
              min="10" max="90"
              value={angle} onChange={e => setAngle(e.target.value)} />
          </div>
          <div style={S.field}>
            <label style={S.label}>WLL da eslinga (kg) — opcional</label>
            <input style={S.input} type="number" placeholder="ex: 3200"
              value={wll} onChange={e => setWll(e.target.value)} />
          </div>
        </div>

        {angleWarning && (
          <div style={S.warnBox}>
            ⚠️ Ângulo abaixo de 45° da horizontal aumenta drasticamente a tensão nas eslingas.
            O fator de carga ultrapassa 1.41× — revise a configuração de amarração.
          </div>
        )}

        <div style={S.normaBox}>
          📋 <strong style={{ color: "#94a3b8" }}>ABNT NBR 13541 / ISO 4308:</strong> A tensão em
          cada perna da eslinga = (Carga / n° pernas) × (1 / sen θ), onde θ é o ângulo da horizontal.
          Recomenda-se θ ≥ 45°. Fator de segurança mínimo: 5:1 para cabos de aço.
        </div>

        <div style={{ marginTop: 20 }}>
          <button style={S.btn} onClick={calculate}>Calcular</button>
        </div>

        {result && (
          <div style={{ marginTop: 20 }}>
            <div style={S.result({ color: "#38bdf8", bg: "#001a2d" })}>
              <div>
                <div style={S.bigNum("#38bdf8")}>{result.tension.toFixed(0)}<span style={{ fontSize: 18 }}> kg</span></div>
                <div style={S.smallLabel}>tensão por perna</div>
              </div>
              <div style={{ flex: 1, fontSize: 13, lineHeight: 2 }}>
                <div>Fator de carga: <strong style={{ color: "#e2e8f0" }}>{result.loadFactor}×</strong></div>
                <div>Ângulo: <strong style={{ color: "#e2e8f0" }}>{result.angle}° da horizontal</strong></div>
                {result.wllPct && (
                  <div>Uso do WLL: <strong style={{ color: result.wllRisk.color }}>{result.wllPct}% </strong>
                    <span style={S.tag(result.wllRisk.color)}>{result.wllRisk.label}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...S.card, marginTop: 16, marginBottom: 0 }}>
              <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 14 }}>
                📊 Comparativo por ângulo
              </div>
              {[30, 45, 60, 75, 90].map(a => {
                const t = calcSlingTension(parseFloat(load) || 1000, parseInt(legs), a);
                const highlighted = a === Math.round(parseFloat(angle));
                return (
                  <div key={a} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 36, fontSize: 12, color: highlighted ? "#f59e0b" : "#64748b" }}>{a}°</div>
                    <div style={{ flex: 1, background: "#070710", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min((parseFloat(t.loadFactor) / 3) * 100, 100)}%`, background: a < 45 ? "#ef4444" : a < 60 ? "#f59e0b" : "#22c55e", borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 60, fontSize: 12, textAlign: "right", color: highlighted ? "#f59e0b" : "#94a3b8" }}>
                      {(parseFloat(load) || 1000) > 0 ? `${parseFloat(calcSlingTension(parseFloat(load) || 1000, parseInt(legs), a).tension).toFixed(0)} kg` : `LF ${t.loadFactor}×`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MODULE 3: CHECKLIST ─────────────────────────────────────────────────────────
function ChecklistModule() {
  const total = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const [checked, setChecked] = useState({});
  const [operator, setOperator] = useState("");
  const [jobId, setJobId] = useState("");

  const done = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  const toggle = (catIdx, itemIdx) => {
    const key = `${catIdx}-${itemIdx}`;
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const reset = () => setChecked({});

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>📋 &nbsp;Checklist de Içamento — NR-11 / ABNT</div>

        <div style={S.grid(2)}>
          <div style={S.field}>
            <label style={S.label}>Operação / OS nº</label>
            <input style={S.input} placeholder="ex: OS-2024-089"
              value={jobId} onChange={e => setJobId(e.target.value)} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Rigger Responsável</label>
            <input style={S.input} placeholder="Nome completo"
              value={operator} onChange={e => setOperator(e.target.value)} />
          </div>
        </div>

        <hr style={S.divider} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: allDone ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>{done}</span>
            <span style={{ color: "#64748b" }}> / {total} itens verificados</span>
          </div>
          <div style={S.riskBadge(allDone ? { color: "#22c55e" } : { color: "#f59e0b" })}>
            {pct}%
          </div>
        </div>
        <div style={S.progressBar(pct)}>
          <div style={S.progressFill(pct, allDone ? "#22c55e" : "#f59e0b")} />
        </div>

        {CHECKLIST.map((cat, ci) => (
          <div key={ci}>
            <div style={S.catTitle}>
              <span>▸</span>{cat.category}
              <span style={{ color: "#475569", fontWeight: 400 }}>
                ({cat.items.filter((_, ii) => checked[`${ci}-${ii}`]).length}/{cat.items.length})
              </span>
            </div>
            {cat.items.map((item, ii) => {
              const key = `${ci}-${ii}`;
              const isChecked = !!checked[key];
              return (
                <div key={ii} style={S.checkRow(isChecked)} onClick={() => toggle(ci, ii)}>
                  <div style={S.checkbox(isChecked)}>
                    {isChecked && <span style={{ color: "#000", fontSize: 13, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, lineHeight: 1.5, userSelect: "none" }}>{item}</span>
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={S.btn} disabled={!allDone}
            onClick={() => alert(`✅ Içamento liberado!\nOS: ${jobId || "—"}\nRigger: ${operator || "—"}\nData: ${new Date().toLocaleString("pt-BR")}`)}>
            {allDone ? "✅ Emitir Liberação" : `Aguardando ${total - done} item(s)`}
          </button>
          <button style={{ ...S.btn, background: "#1e1e35", color: "#64748b" }} onClick={reset}>
            Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ROOT APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: "⚖ Capacidade", component: <CapacityModule /> },
    { label: "📐 Eslingas", component: <SlingModule /> },
    { label: "📋 Checklist NR-11", component: <ChecklistModule /> },
  ];

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.logo}>
          <div style={S.logoIcon}>🏗</div>
          <div>
            <div style={S.logoText}>RiggingCheck</div>
            <div style={S.logoSub}>Verificador de Segurança em Içamento</div>
          </div>
        </div>
        <div style={S.tabs}>
          {tabs.map((t, i) => (
            <button key={i} style={S.tab(tab === i)} onClick={() => setTab(i)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={S.container}>
        {tabs[tab].component}
        <div style={{ ...S.normaBox, textAlign: "center", marginTop: 32 }}>
          v1.0.0 — RiggingCheck &nbsp;·&nbsp; Referências: NR-11, ABNT NBR 11900, ABNT NBR 13541, ISO 4308-1
          <br />
          <span style={{ color: "#475569" }}>Este software é um auxiliar técnico. Não substitui engenheiro responsável pelo PPRA/PCMAT.</span>
        </div>
      </div>
    </div>
  );
}
