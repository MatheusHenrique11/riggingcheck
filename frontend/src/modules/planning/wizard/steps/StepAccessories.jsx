/**
 * Etapa 5 — Acessórios do Içamento.
 * Busca acessórios cadastrados no inventário, vincula ao plano e valida:
 * status, certificado, inspeção e WLL vs. carga exigida.
 */

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../../../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const STATUS_CFG = {
  ATIVO:        { label: "Ativo",        color: "#22c55e", ok: true  },
  EM_INSPECAO:  { label: "Em Inspeção",  color: "#f59e0b", ok: false },
  REPROVADO:    { label: "Reprovado",    color: "#ef4444", ok: false },
  DESCARTADO:   { label: "Descartado",   color: "#64748b", ok: false },
  VENCIDO:      { label: "Vencido",      color: "#f97316", ok: false },
};

const CERT_CFG = {
  VALIDO:   { label: "Válido",   color: "#22c55e", ok: true  },
  A_VENCER: { label: "A Vencer", color: "#f59e0b", ok: true  },
  VENCIDO:  { label: "Vencido",  color: "#ef4444", ok: false },
  AUSENTE:  { label: "Ausente",  color: "#64748b", ok: false },
};

const INSP_CFG = {
  APROVADO:               { label: "Aprovado",              color: "#22c55e", ok: true  },
  APROVADO_COM_RESTRICAO: { label: "c/ Restrição",         color: "#f59e0b", ok: true  },
  REPROVADO:              { label: "Reprovado",             color: "#ef4444", ok: false },
};

const TIPO_LABEL = {
  CINTA_TEXTIL: "Cinta Têxtil", CABO_ACO: "Cabo de Aço", CORRENTE: "Corrente",
  MANILHA: "Manilha", GANCHO: "Gancho", TALHA: "Talha", BALANCIM: "Balancim", OUTRO: "Outro",
};

function alertasAcessorio(a, cargaExigidaKg) {
  const alertas = [];
  const stCfg = STATUS_CFG[a.status];
  if (!stCfg?.ok) alertas.push({ severity: "BLOCKED", msg: `Status: ${stCfg?.label ?? a.status}` });

  const certStatus = a.ultimoCertificado?.status ?? "AUSENTE";
  const cCfg = CERT_CFG[certStatus];
  if (!cCfg?.ok) alertas.push({ severity: "BLOCKED", msg: `Certificado: ${cCfg?.label ?? certStatus}` });
  else if (certStatus === "A_VENCER") alertas.push({ severity: "WARNING", msg: "Certificado a vencer" });

  const inspRes = a.ultimaInspecao?.resultado;
  if (inspRes) {
    const iCfg = INSP_CFG[inspRes];
    if (!iCfg?.ok) alertas.push({ severity: "BLOCKED", msg: `Inspeção: ${iCfg?.label ?? inspRes}` });
    else if (inspRes === "APROVADO_COM_RESTRICAO") alertas.push({ severity: "RESTRICTED", msg: "Aprovado com restrição" });
  }

  if (cargaExigidaKg && a.capacidadeWllKg && a.capacidadeWllKg < cargaExigidaKg) {
    alertas.push({ severity: "BLOCKED", msg: `WLL ${a.capacidadeWllKg} kg < carga ${cargaExigidaKg} kg` });
  }

  return alertas;
}

function AlertBadge({ severity, msg }) {
  const cfg = { BLOCKED: { bg: "#ef444422", color: "#ef4444" }, RESTRICTED: { bg: "#f9731622", color: "#f97316" }, WARNING: { bg: "#f59e0b22", color: "#f59e0b" } }[severity] ?? {};
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }}>
      {msg}
    </span>
  );
}

function AcessorioCard({ acessorio, onAdd, selected, cargaExigidaKg }) {
  const alertas = alertasAcessorio(acessorio, cargaExigidaKg);
  const bloqueado = alertas.some(a => a.severity === "BLOCKED");
  const stCfg = STATUS_CFG[acessorio.status] ?? { label: acessorio.status, color: "#64748b" };

  return (
    <div style={{ background: "#0f172a", border: `1px solid ${bloqueado ? "#ef444433" : selected ? "#3b82f644" : "#1e293b"}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 13, fontFamily: "monospace" }}>{acessorio.codigoInterno}</div>
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 2 }}>{acessorio.descricao}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 1 }}>{TIPO_LABEL[acessorio.tipo] ?? acessorio.tipo} · WLL: <strong style={{ color: "#22c55e" }}>{acessorio.capacidadeWllKg?.toLocaleString("pt-BR")} kg</strong></div>
          <div style={{ marginTop: 6 }}>
            <span style={{ background: stCfg.color + "22", color: stCfg.color, border: `1px solid ${stCfg.color}44`, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }}>
              {stCfg.label}
            </span>
            {alertas.map((al, i) => <AlertBadge key={i} severity={al.severity} msg={al.msg} />)}
          </div>
        </div>
        <button
          onClick={() => onAdd(acessorio)}
          disabled={selected}
          style={{ background: selected ? "#052e16" : "#1e3a5f", border: `1px solid ${selected ? "#22c55e44" : "#3b82f644"}`, color: selected ? "#22c55e" : "#93c5fd", borderRadius: 8, padding: "7px 14px", cursor: selected ? "default" : "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}
        >
          {selected ? "✓ Vinculado" : "+ Vincular"}
        </button>
      </div>
    </div>
  );
}

export default function StepAccessories({ planData, onSave }) {
  const [q,           setQ]           = useState("");
  const [resultados,  setResultados]  = useState([]);
  const [buscando,    setBuscando]    = useState(false);
  const [vinculados,  setVinculados]  = useState(planData.acessoriosSelecionados ?? []);

  const cargaBruta = planData.cargaBruta?.total;

  const buscar = useCallback(async (termo) => {
    setBuscando(true);
    try {
      const r = await authFetch(`${API}/api/acessorios/search?q=${encodeURIComponent(termo)}`);
      if (r.ok) setResultados(await r.json());
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    buscar("");
  }, [buscar]);

  useEffect(() => {
    const delay = setTimeout(() => buscar(q), 350);
    return () => clearTimeout(delay);
  }, [q, buscar]);

  const vincular = (a) => {
    if (vinculados.some(v => v.id === a.id)) return;
    const novos = [...vinculados, a];
    setVinculados(novos);
    onSave("acessoriosSelecionados", novos);
  };

  const desvincular = (id) => {
    const novos = vinculados.filter(v => v.id !== id);
    setVinculados(novos);
    onSave("acessoriosSelecionados", novos);
  };

  const selectedIds = new Set(vinculados.map(v => v.id));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>🔗 Acessórios do Içamento</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Vincule eslingas, manilhas e outros acessórios cadastrados no inventário. Status, certificado e WLL são validados automaticamente.
        </p>
      </div>

      {/* Acessórios vinculados */}
      {vinculados.length > 0 && (
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            Vinculados ao plano ({vinculados.length})
          </div>
          {vinculados.map(a => {
            const alertas = alertasAcessorio(a, cargaBruta);
            const bloqueado = alertas.some(al => al.severity === "BLOCKED");
            return (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                <div>
                  <span style={{ color: "#38bdf8", fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>{a.codigoInterno}</span>
                  <span style={{ color: "#64748b", fontSize: 12, marginLeft: 10 }}>{a.descricao}</span>
                  {alertas.map((al, i) => <AlertBadge key={i} severity={al.severity} msg={al.msg} />)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {bloqueado && <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>BLOCKED</span>}
                  <button onClick={() => desvincular(a.id)} style={{ background: "transparent", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Busca */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
        <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Buscar no Inventário
        </div>
        <input
          style={{ width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "10px 14px", marginBottom: 16 }}
          placeholder="Buscar por código, tipo, descrição ou fabricante..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />

        {buscando && <div style={{ color: "#475569", fontSize: 13, marginBottom: 12 }}>Buscando...</div>}

        {!buscando && resultados.length === 0 && (
          <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            Nenhum acessório encontrado. Cadastre no <strong style={{ color: "#38bdf8" }}>Inventário</strong>.
          </div>
        )}

        {resultados.map(a => (
          <AcessorioCard
            key={a.id}
            acessorio={a}
            onAdd={vincular}
            selected={selectedIds.has(a.id)}
            cargaExigidaKg={cargaBruta}
          />
        ))}
      </div>

      {cargaBruta && (
        <div style={{ marginTop: 12, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#475569" }}>
          Carga bruta do plano: <strong style={{ color: "#22c55e" }}>{cargaBruta.toLocaleString("pt-BR")} kg</strong> — acessórios com WLL inferior serão marcados como BLOCKED na Compliance.
        </div>
      )}

      {vinculados.length === 0 && (
        <div style={{ marginTop: 12, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#475569" }}>
          Etapa opcional. Se não houver acessórios cadastrados, a Compliance Engine não gerará alertas desta categoria.
        </div>
      )}
    </div>
  );
}
