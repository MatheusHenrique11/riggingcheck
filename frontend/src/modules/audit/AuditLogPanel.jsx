/**
 * Painel de consulta do trilho de auditoria.
 * Mostra quem fez o quê e quando — acessórios, certificados, inspeções e
 * decisões do fluxo de aprovação. Restrito a ADMIN_EMPRESA / SUPER_ADMIN
 * (o backend também garante essa restrição em AuditLogService).
 */

import { useState, useEffect, useCallback } from "react";
import { fetchAuditLog } from "./auditApi";
import LoadingBlock from "../../components/Spinner";

const ACTION_LABEL = {
  PLAN_SUBMITTED:             { label: "Plano enviado",              color: "#fb923c" },
  PLAN_RESUBMITTED:           { label: "Plano reenviado",            color: "#fb923c" },
  PLAN_APPROVED:              { label: "Plano aprovado",             color: "#22c55e" },
  PLAN_CHANGES_REQUESTED:     { label: "Ajustes solicitados",        color: "#f59e0b" },
  PLAN_REJECTED:              { label: "Plano rejeitado",            color: "#ef4444" },
  ACESSORIO_CRIADO:           { label: "Acessório criado",           color: "#22c55e" },
  ACESSORIO_ATUALIZADO:       { label: "Acessório atualizado",       color: "#fb923c" },
  ACESSORIO_STATUS_ALTERADO:  { label: "Status do acessório alterado", color: "#f59e0b" },
  CERTIFICADO_ADICIONADO:     { label: "Certificado adicionado",     color: "#22c55e" },
  INSPECAO_REGISTRADA:        { label: "Inspeção registrada",        color: "#fb923c" },
  PLANO_ACESSORIO_VINCULADO:  { label: "Acessório vinculado ao plano", color: "#22c55e" },
  PLANO_ACESSORIO_REMOVIDO:   { label: "Acessório removido do plano", color: "#ef4444" },
};

const ENTITY_TYPE_OPTIONS = [
  { value: "",             label: "Todas as entidades" },
  { value: "ACESSORIO",    label: "Acessórios" },
  { value: "RIGGING_PLAN", label: "Planos de içamento" },
];

function actionCfg(action) {
  return ACTION_LABEL[action] ?? { label: action, color: "#94a3b8" };
}

const inputStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
};

export default function AuditLogPanel() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const [entityType, setEntityType] = useState("");
  const [action, setAction]         = useState("");
  const [from, setFrom]             = useState("");
  const [to, setTo]                 = useState("");
  const [page, setPage]             = useState(0);
  const size = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAuditLog({
        entityType: entityType || undefined,
        action: action || undefined,
        from: from ? `${from}T00:00:00` : undefined,
        to: to ? `${to}T23:59:59` : undefined,
        page,
        size,
      });
      if (!result) {
        setError("Você não tem permissão para consultar a auditoria, ou a sessão expirou.");
        setData(null);
      } else {
        setData(result);
      }
    } catch {
      setError("Erro ao carregar o trilho de auditoria.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityType, action, from, to, page]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  const clearFilters = () => {
    setEntityType(""); setAction(""); setFrom(""); setTo(""); setPage(0);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>
          🕵 Trilho de Auditoria
        </h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Histórico de quem fez o quê: acessórios, certificados, inspeções e aprovações de planos.
        </p>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16,
        alignItems: "flex-end",
      }}>
        <div>
          <label style={{ display: "block", color: "#64748b", fontSize: 11, marginBottom: 4 }}>Entidade</label>
          <select value={entityType} onChange={handleFilterChange(setEntityType)} style={inputStyle}>
            {ENTITY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", color: "#64748b", fontSize: 11, marginBottom: 4 }}>Ação</label>
          <select value={action} onChange={handleFilterChange(setAction)} style={inputStyle}>
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_LABEL).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", color: "#64748b", fontSize: 11, marginBottom: 4 }}>De</label>
          <input type="date" value={from} onChange={handleFilterChange(setFrom)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", color: "#64748b", fontSize: 11, marginBottom: 4 }}>Até</label>
          <input type="date" value={to} onChange={handleFilterChange(setTo)} style={inputStyle} />
        </div>
        {(entityType || action || from || to) && (
          <button
            onClick={clearFilters}
            style={{
              background: "transparent", border: "1px solid #334155", color: "#94a3b8",
              borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13,
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13,
          background: "#1c0a0a22", border: "1px solid #ef444444", color: "#ef4444",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <LoadingBlock label="Carregando..." padding={32} />
      ) : !data || data.content.length === 0 ? (
        !error && (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            border: "1px dashed #334155", borderRadius: 12, color: "#475569",
          }}>
            Nenhum evento de auditoria encontrado com estes filtros.
          </div>
        )
      ) : (
        <>
          <div style={{ border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
            {data.content.map((log, i) => {
              const cfg = actionCfg(log.action);
              return (
                <div
                  key={log.id}
                  style={{
                    padding: "12px 16px",
                    borderTop: i === 0 ? "none" : "1px solid #1e293b",
                    background: i % 2 === 0 ? "transparent" : "#0f172a55",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          color: cfg.color, background: cfg.color + "22",
                          borderRadius: 4, padding: "1px 8px", fontSize: 11, fontWeight: 700,
                        }}>
                          {cfg.label}
                        </span>
                        <span style={{ color: "#475569", fontSize: 11 }}>{log.entityType}</span>
                      </div>
                      <div style={{ color: "#e2e8f0", fontSize: 13 }}>{log.details}</div>
                      <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
                        {log.userEmail}
                      </div>
                    </div>
                    <div style={{ color: "#475569", fontSize: 11, whiteSpace: "nowrap" }}>
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <span style={{ color: "#475569", fontSize: 12 }}>
              {data.totalElements} evento(s) · página {data.page + 1} de {Math.max(data.totalPages, 1)}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(p - 1, 0))}
                disabled={data.page === 0}
                style={{
                  background: "transparent", border: "1px solid #334155",
                  color: data.page === 0 ? "#334155" : "#94a3b8", borderRadius: 6,
                  padding: "5px 12px", cursor: data.page === 0 ? "not-allowed" : "pointer", fontSize: 12,
                }}
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={data.page + 1 >= data.totalPages}
                style={{
                  background: "transparent", border: "1px solid #334155",
                  color: data.page + 1 >= data.totalPages ? "#334155" : "#94a3b8", borderRadius: 6,
                  padding: "5px 12px", cursor: data.page + 1 >= data.totalPages ? "not-allowed" : "pointer", fontSize: 12,
                }}
              >
                Próxima →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
