/**
 * Etapa 5 — Equipe Operacional.
 * Busca funcionários da empresa, vincula ao plano e exibe status de treinamentos.
 * Requer plano já salvo (_solicitacao.id). Se não existir, exibe aviso.
 */

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../../../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const FUNCOES = [
  { value: "RIGGER",            label: "Rigger" },
  { value: "OPERADOR_GUINDASTE",label: "Operador de Guindaste" },
  { value: "SINALEIRO",         label: "Sinaleiro" },
  { value: "AMARRADOR",         label: "Amarrador" },
  { value: "SUPERVISOR",        label: "Supervisor" },
  { value: "TECNICO_SEGURANCA", label: "Técnico de Segurança" },
  { value: "ENGENHEIRO",        label: "Engenheiro" },
  { value: "OBSERVADOR",        label: "Observador" },
  { value: "OUTRO",             label: "Outro" },
];

const COMPETENCY_CFG = {
  APTO:      { color: "#22c55e", bg: "#052e1622" },
  RESTRITO:  { color: "#f97316", bg: "#2d190022" },
  BLOQUEADO: { color: "#ef4444", bg: "#1c0a0a22" },
};

const TRAIN_CFG = {
  VALIDO:   { color: "#22c55e", label: "Válido"   },
  A_VENCER: { color: "#f59e0b", label: "A Vencer" },
  VENCIDO:  { color: "#ef4444", label: "Vencido"  },
  AUSENTE:  { color: "#64748b", label: "Ausente"  },
};

function TrainBadge({ status, date }) {
  const cfg = TRAIN_CFG[status] ?? { color: "#64748b", label: status ?? "—" };
  return (
    <span style={{
      color: cfg.color,
      background: cfg.color + "22",
      borderRadius: 4,
      padding: "1px 6px",
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {cfg.label}{date ? ` (${date})` : ""}
    </span>
  );
}

function MemberRow({ member, onRemove, removing }) {
  const comp = COMPETENCY_CFG[member.competencyStatus] ?? COMPETENCY_CFG.BLOQUEADO;
  return (
    <div style={{
      background: comp.bg,
      border: `1px solid ${comp.color}33`,
      borderRadius: 8,
      padding: "12px 14px",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>
            {member.nome ?? "—"}
            {member.responsavel && <span style={{ color: "#f59e0b", fontSize: 11, marginLeft: 6 }}>(Responsável)</span>}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
            {member.funcaoOperacional} · {member.role}
          </div>
          {member.observacao && (
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>
              {member.observacao}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: comp.color, fontWeight: 700, fontSize: 12 }}>{member.competencyStatus}</span>
          <button
            onClick={() => onRemove(member.id)}
            disabled={removing === member.id}
            style={{
              background: "transparent", border: "1px solid #ef444444",
              color: "#ef4444", borderRadius: 6, padding: "3px 10px",
              cursor: removing === member.id ? "not-allowed" : "pointer", fontSize: 12,
            }}
          >
            {removing === member.id ? "..." : "Remover"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <TrainBadge status={member.statusNr11} date={member.dataVencimentoNr11} />
        <span style={{ color: "#475569", fontSize: 11 }}>NR-11</span>
        <TrainBadge status={member.statusNr35} date={member.dataVencimentoNr35} />
        <span style={{ color: "#475569", fontSize: 11 }}>NR-35</span>
        <TrainBadge status={member.statusAso} date={member.dataVencimentoAso} />
        <span style={{ color: "#475569", fontSize: 11 }}>ASO</span>
      </div>
    </div>
  );
}

export default function StepTeam({ planData }) {
  const solicitacao = planData._solicitacao;
  const planId = solicitacao?.id;

  const [membros, setMembros] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [search, setSearch] = useState("");
  const [funcaoSelecionada, setFuncaoSelecionada] = useState("RIGGER");
  const [responsavel, setResponsavel] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [error, setError] = useState(null);

  const loadTeam = useCallback(async () => {
    if (!planId) return;
    setLoadingTeam(true);
    try {
      const r = await authFetch(`${API}/api/planos/${planId}/equipe`);
      if (r.ok) setMembros(await r.json());
    } catch { /* silencioso */ }
    finally { setLoadingTeam(false); }
  }, [planId]);

  const loadFuncionarios = useCallback(async () => {
    try {
      const r = await authFetch(`${API}/api/funcionarios`);
      if (r.ok) setFuncionarios(await r.json());
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    loadTeam();
    loadFuncionarios();
  }, [loadTeam, loadFuncionarios]);

  const filtrados = funcionarios.filter(f =>
    (f.nome?.toLowerCase().includes(search.toLowerCase()) ||
     f.email?.toLowerCase().includes(search.toLowerCase())) &&
    !membros.some(m => m.funcionarioId === f.id)
  );

  const adicionar = async () => {
    if (!selectedFuncionario || !planId) return;
    setAdding(true);
    setError(null);
    try {
      const r = await authFetch(`${API}/api/planos/${planId}/equipe`, {
        method: "POST",
        body: JSON.stringify({
          funcionarioId: selectedFuncionario.id,
          funcaoOperacional: funcaoSelecionada,
          responsavel,
          observacao: observacao || null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setError(e.message ?? "Erro ao adicionar membro.");
        return;
      }
      await loadTeam();
      setSelectedFuncionario(null);
      setSearch("");
      setObservacao("");
      setResponsavel(false);
    } catch { setError("Não foi possível conectar à API."); }
    finally { setAdding(false); }
  };

  const remover = async (membroId) => {
    setRemoving(membroId);
    try {
      await authFetch(`${API}/api/planos/${planId}/equipe/${membroId}`, { method: "DELETE" });
      await loadTeam();
    } catch { /* silencioso */ }
    finally { setRemoving(null); }
  };

  const S = {
    card: { background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 14, border: "1px solid #334155" },
  };

  if (!planId) {
    return (
      <div>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>
          👥 Equipe Operacional
        </h2>
        <div style={{ ...S.card, borderColor: "#f59e0b44", background: "#2d190044" }}>
          <div style={{ color: "#f59e0b", fontWeight: 700, marginBottom: 6 }}>⚠ Plano não salvo</div>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
            Complete as etapas anteriores e submeta o plano para aprovação antes de vincular a equipe.
            O vínculo de equipe requer um plano persistido na base de dados.
          </p>
        </div>
      </div>
    );
  }

  const bloqueados = membros.filter(m => m.competencyStatus === "BLOQUEADO").length;
  const restritos  = membros.filter(m => m.competencyStatus === "RESTRITO").length;
  const aptos      = membros.filter(m => m.competencyStatus === "APTO").length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>
          👥 Equipe Operacional
        </h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Vincule os membros da equipe ao plano e acompanhe o status de treinamentos NR-11, NR-35 e ASO.
        </p>
      </div>

      {/* Resumo */}
      {membros.length > 0 && (
        <div style={{ ...S.card, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#22c55e", fontSize: 24, fontWeight: 800 }}>{aptos}</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>APTO(S)</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#f97316", fontSize: 24, fontWeight: 800 }}>{restritos}</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>RESTRITO(S)</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#ef4444", fontSize: 24, fontWeight: 800 }}>{bloqueados}</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>BLOQUEADO(S)</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#38bdf8", fontSize: 24, fontWeight: 800 }}>{membros.length}</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>TOTAL</div>
          </div>
        </div>
      )}

      {/* Membros vinculados */}
      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Membros Vinculados
        </div>
        {loadingTeam ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>Carregando equipe...</p>
        ) : membros.length === 0 ? (
          <p style={{ color: "#475569", fontSize: 13, fontStyle: "italic" }}>
            Nenhum membro vinculado ainda. Use o formulário abaixo para adicionar.
          </p>
        ) : (
          membros.map(m => (
            <MemberRow key={m.id} member={m} onRemove={remover} removing={removing} />
          ))
        )}
      </div>

      {/* Adicionar membro */}
      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
          Adicionar Membro
        </div>

        {/* Busca */}
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedFuncionario(null); }}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#0f172a", border: "1px solid #334155",
            color: "#e2e8f0", borderRadius: 8, padding: "9px 12px",
            fontSize: 13, marginBottom: 8,
          }}
        />

        {/* Resultados da busca */}
        {search.length >= 2 && (
          <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #1e293b", borderRadius: 8, marginBottom: 12 }}>
            {filtrados.length === 0 ? (
              <p style={{ color: "#475569", fontSize: 12, padding: "8px 12px", margin: 0 }}>
                Nenhum funcionário encontrado (ou já vinculado).
              </p>
            ) : (
              filtrados.map(f => (
                <div
                  key={f.id}
                  onClick={() => { setSelectedFuncionario(f); setSearch(f.nome); }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #1e293b",
                    background: selectedFuncionario?.id === f.id ? "#1e3a5f" : "transparent",
                  }}
                >
                  <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>{f.nome}</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>{f.email} · {f.role}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Função, responsável, observação */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Função Operacional *</label>
            <select
              value={funcaoSelecionada}
              onChange={e => setFuncaoSelecionada(e.target.value)}
              style={{
                width: "100%", background: "#0f172a", border: "1px solid #334155",
                color: "#e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13,
              }}
            >
              {FUNCOES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#94a3b8", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={responsavel}
                onChange={e => setResponsavel(e.target.checked)}
                style={{ accentColor: "#3b82f6" }}
              />
              Responsável
            </label>
          </div>
        </div>

        <input
          type="text"
          placeholder="Observação (opcional)"
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#0f172a", border: "1px solid #334155",
            color: "#e2e8f0", borderRadius: 8, padding: "8px 12px",
            fontSize: 13, marginBottom: 12,
          }}
        />

        {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <button
          onClick={adicionar}
          disabled={!selectedFuncionario || adding}
          style={{
            background: selectedFuncionario ? "linear-gradient(135deg,#1e3a5f,#3b82f6)" : "#1e293b",
            border: "none",
            color: selectedFuncionario ? "#fff" : "#475569",
            borderRadius: 8, padding: "10px 22px",
            cursor: selectedFuncionario && !adding ? "pointer" : "not-allowed",
            fontWeight: 700, fontSize: 14,
            opacity: adding ? 0.7 : 1,
          }}
          title={!selectedFuncionario ? "Selecione um funcionário da lista" : ""}
        >
          {adding ? "Adicionando..." : "➕ Adicionar à Equipe"}
        </button>
      </div>

      {/* Aviso de impacto no compliance técnico */}
      <div style={{
        background: "#1c0a0a22", border: "1px solid #ef444433",
        borderRadius: 8, padding: "10px 14px", marginTop: 4,
      }}>
        <div style={{ color: "#fca5a5", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
          ⚠ Impacto no Status Técnico do Plano
        </div>
        <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5 }}>
          Inconsistências de equipe podem bloquear a aprovação técnica:<br />
          • <b>ASO vencido ou ausente</b> → BLOQUEADO<br />
          • <b>NR-11 vencida/ausente</b> em Rigger, Op. Guindaste, Sinaleiro ou Amarrador → BLOQUEADO<br />
          • <b>Treinamento a vencer em 30 dias</b> → RESTRITO<br />
          • <b>Nenhum membro vinculado</b> → RESTRITO<br />
          Planos BLOQUEADOS só podem ser aprovados por SUPERADMIN/SAFETY_ADMIN com justificativa.
        </div>
      </div>
    </div>
  );
}
