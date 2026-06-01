import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../utils/api";
import AppShell from "../layouts/AppShell";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const ROLE_LABELS = {
  ADMIN_EMPRESA:      { label: "Admin Empresa",     color: "#f59e0b" },
  GERENTE_OPERACOES:  { label: "Gerente Operações", color: "#38bdf8" },
  LIDER_EQUIPE:       { label: "Líder de Equipe",   color: "#22c55e" },
  RIGGER:             { label: "Rigger",            color: "#94a3b8" },
  OPERADOR:           { label: "Operador",          color: "#94a3b8" },
  OPERADOR_GUINDASTE: { label: "Op. Guindaste",     color: "#94a3b8" },
  SAFETY_ADMIN:       { label: "Safety Admin",      color: "#f97316" },
};

function MemberCard({ member, canManage, onToggle }) {
  const roleCfg = ROLE_LABELS[member.role] ?? { label: member.role, color: "#64748b" };

  return (
    <div style={{
      background: "#1e293b",
      border: `1px solid ${member.ativo ? "#334155" : "#1e293b"}`,
      borderRadius: 10,
      padding: "16px 18px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      opacity: member.ativo ? 1 : 0.5,
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>{member.nome}</span>
          {!member.ativo && (
            <span style={{ color: "#ef4444", fontSize: 10, background: "#ef444422", borderRadius: 4, padding: "1px 6px" }}>
              INATIVO
            </span>
          )}
        </div>
        <div style={{ color: "#64748b", fontSize: 13 }}>{member.email}</div>
        <div style={{
          display: "inline-block",
          color: roleCfg.color,
          background: roleCfg.color + "22",
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 600,
          marginTop: 4,
        }}>
          {roleCfg.label}
        </div>
      </div>

      {canManage && (
        <button
          onClick={() => onToggle(member)}
          style={{
            background: "transparent",
            border: `1px solid ${member.ativo ? "#ef444444" : "#22c55e44"}`,
            color: member.ativo ? "#ef4444" : "#22c55e",
            borderRadius: 8,
            padding: "6px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {member.ativo ? "Desativar" : "Reativar"}
        </button>
      )}
    </div>
  );
}

export default function TeamManagement() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", role: "RIGGER" });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(null);
  const [filter, setFilter] = useState("all");

  const canManage = ["ADMIN_EMPRESA", "SUPER_ADMIN"].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API}/api/funcionarios`);
      if (!res.ok) throw new Error("Erro ao carregar equipe");
      setTeam(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (member) => {
    const acao = member.ativo ? "desativar" : "reativar";
    try {
      await authFetch(`${API}/api/funcionarios/${member.id}/${acao}`, { method: "POST" });
      load();
    } catch { /* ignora erro de rede */ }
  };

  const criar = async () => {
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);
    try {
      const res = await authFetch(`${API}/api/funcionarios`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Erro ao criar membro");
      setFormSuccess(`${form.nome} adicionado com sucesso`);
      setForm({ nome: "", email: "", senha: "", role: "RIGGER" });
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = filter === "all"
    ? team
    : filter === "active"
      ? team.filter(m => m.ativo)
      : team.filter(m => !m.ativo);

  const activeCount = team.filter(m => m.ativo).length;

  return (
    <AppShell breadcrumb={[
      { label: "Dashboard", path: "/app/dashboard" },
      { label: "Equipe" },
    ]}>
      <div style={{ color: "#e2e8f0" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, color: "#f1f5f9", fontSize: 22, fontWeight: 800 }}>Gestão de Equipe</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
              {activeCount} membro(s) ativo(s) de {team.length} total
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => { setShowForm(!showForm); setFormError(null); setFormSuccess(null); }}
              style={{
                background: "#3b82f6", border: "none",
                color: "#fff", borderRadius: 10, padding: "10px 20px",
                cursor: "pointer", fontWeight: 700, fontSize: 14,
              }}
            >
              + Novo Membro
            </button>
          )}
        </div>

        {/* Form novo membro */}
        {showForm && canManage && (
          <div style={{
            background: "#1e293b", border: "1px solid #3b82f666",
            borderRadius: 12, padding: 20, marginBottom: 24,
          }}>
            <h3 style={{ color: "#f1f5f9", margin: "0 0 16px", fontSize: 16 }}>Novo Membro da Equipe</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
              {[
                { key: "nome",  label: "Nome",  type: "text",     placeholder: "Nome completo" },
                { key: "email", label: "Email", type: "email",    placeholder: "email@empresa.com" },
                { key: "senha", label: "Senha", type: "password", placeholder: "Senha inicial" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "#0f172a", border: "1px solid #334155",
                      color: "#e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 14,
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 }}>Cargo</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "#0f172a", border: "1px solid #334155",
                    color: "#e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 14,
                  }}
                >
                  {Object.entries(ROLE_LABELS).map(([v, cfg]) => (
                    <option key={v} value={v}>{cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {formError  && <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 8px" }}>{formError}</p>}
            {formSuccess && <p style={{ color: "#22c55e", fontSize: 13, margin: "0 0 8px" }}>{formSuccess}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={criar}
                disabled={formLoading}
                style={{
                  background: "#3b82f6", border: "none",
                  color: "#fff", borderRadius: 8, padding: "9px 22px",
                  cursor: formLoading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14,
                }}
              >
                {formLoading ? "Criando..." : "Criar Membro"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: "transparent", border: "1px solid #334155",
                  color: "#94a3b8", borderRadius: 8, padding: "9px 18px",
                  cursor: "pointer", fontSize: 14,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["all", "Todos"], ["active", "Ativos"], ["inactive", "Inativos"]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                border: `1px solid ${filter === v ? "#3b82f6" : "#334155"}`,
                background: filter === v ? "#1e3a5f" : "transparent",
                color: filter === v ? "#93c5fd" : "#64748b",
                borderRadius: 20, padding: "5px 14px",
                cursor: "pointer", fontSize: 13,
              }}
            >
              {label} ({v === "all" ? team.length : v === "active" ? activeCount : team.length - activeCount})
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#475569", padding: 40 }}>Carregando equipe...</p>
        ) : error ? (
          <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#475569", padding: 40, border: "1px dashed #334155", borderRadius: 12 }}>
            Nenhum membro encontrado.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(m => (
              <MemberCard key={m.id} member={m} canManage={canManage} onToggle={toggle} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
