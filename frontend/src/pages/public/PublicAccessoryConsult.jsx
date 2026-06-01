import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const TIPO_LABEL = {
  CINTA_TEXTIL: "Cinta Têxtil",
  CABO_ACO:     "Cabo de Aço",
  CORRENTE:     "Corrente",
  MANILHA:      "Manilha",
  GANCHO:       "Gancho",
  TALHA:        "Talha",
  BALANCIM:     "Balancim",
  OUTRO:        "Outro",
};

const MENSAGEM_CFG = {
  LIBERADO_PARA_USO:    { label: "LIBERADO PARA USO",      icon: "✅", bg: "#052e16", border: "#22c55e" },
  USO_COM_RESTRICAO:    { label: "USO COM RESTRIÇÃO",      icon: "⚠",  bg: "#2d1900", border: "#f59e0b" },
  CERTIFICADO_A_VENCER: { label: "CERT. A VENCER",         icon: "⚠",  bg: "#2d1900", border: "#f59e0b" },
  CERTIFICADO_VENCIDO:  { label: "CERTIFICADO VENCIDO",    icon: "⛔", bg: "#1c0a0a", border: "#ef4444" },
  CERTIFICADO_AUSENTE:  { label: "SEM CERTIFICADO",        icon: "⛔", bg: "#1c0a0a", border: "#ef4444" },
  BLOQUEADO:            { label: "BLOQUEADO",              icon: "⛔", bg: "#1c0a0a", border: "#ef4444" },
  REPROVADO:            { label: "REPROVADO",              icon: "🚫", bg: "#1c0a0a", border: "#ef4444" },
  DESCARTADO:           { label: "DESCARTADO",             icon: "🚫", bg: "#0f172a", border: "#64748b" },
};

const STATUS_CERT_LABEL = {
  VALIDO:   { label: "Válido",     color: "#22c55e" },
  A_VENCER: { label: "A Vencer",   color: "#f59e0b" },
  VENCIDO:  { label: "Vencido",    color: "#ef4444" },
  AUSENTE:  { label: "Ausente",    color: "#64748b" },
};

const INSP_LABEL = {
  APROVADO:               { label: "Aprovado",              color: "#22c55e" },
  APROVADO_COM_RESTRICAO: { label: "Aprovado c/ Restrição", color: "#f59e0b" },
  REPROVADO:              { label: "Reprovado",             color: "#ef4444" },
};

function InfoLine({ label, value, color }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ color: "#64748b", fontSize: 14 }}>{label}</span>
      <span style={{ color: color || "#f1f5f9", fontWeight: 600, fontSize: 14, textAlign: "right", maxWidth: "55%" }}>{value}</span>
    </div>
  );
}

export default function PublicAccessoryConsult() {
  const { id } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [ts,      setTs]      = useState(null);

  const doFetch = (active) => {
    fetch(`${API}/api/public/acessorios/${id}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? "Acessório não encontrado." : "Erro ao consultar acessório.");
        return r.json();
      })
      .then(d => { if (active()) { setData(d); setTs(new Date()); } })
      .catch(e => { if (active()) setError(e.message); })
      .finally(() => { if (active()) setLoading(false); });
  };

  useEffect(() => {
    let alive = true;
    doFetch(() => alive);
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    let alive = true;
    doFetch(() => alive);
  };

  const msgCfg = data ? (MENSAGEM_CFG[data.mensagemStatus] ?? MENSAGEM_CFG.BLOQUEADO) : null;
  const certCfg = data ? (STATUS_CERT_LABEL[data.statusCertificado] ?? STATUS_CERT_LABEL.AUSENTE) : null;
  const inspCfg = data?.resultadoUltimaInspecao ? (INSP_LABEL[data.resultadoUltimaInspecao] ?? null) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, background: "#1e293b", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔗</div>
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 16 }}>RiggingCheck</div>
            <div style={{ color: "#475569", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Consulta de Integridade</div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ color: "#64748b", fontSize: 16, padding: 60 }}>Consultando acessório...</div>
      )}

      {error && (
        <div style={{ width: "100%", maxWidth: 480, background: "#1c0a0a", border: "1px solid #ef444444", borderRadius: 12, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠</div>
          <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Não foi possível consultar</div>
          <div style={{ color: "#94a3b8", fontSize: 14 }}>{error}</div>
          <button onClick={handleRefresh} style={{ marginTop: 20, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14 }}>
            Tentar novamente
          </button>
        </div>
      )}

      {data && msgCfg && (
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Status principal */}
          <div style={{ background: msgCfg.bg, border: `2px solid ${msgCfg.border}`, borderRadius: 16, padding: "28px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{msgCfg.icon}</div>
            <div style={{ color: msgCfg.border, fontWeight: 900, fontSize: 22, letterSpacing: 1 }}>
              {msgCfg.label}
            </div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 8, fontFamily: "monospace" }}>
              {data.codigoInterno}
            </div>
          </div>

          {/* Identificação */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
            <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Identificação
            </div>
            <InfoLine label="Tipo"         value={TIPO_LABEL[data.tipo] ?? data.tipo} />
            <InfoLine label="Descrição"    value={data.descricao} />
            <InfoLine label="Fabricante"   value={data.fabricante} />
            <InfoLine label="Modelo"       value={data.modelo} />
            <InfoLine label="WLL"          value={data.capacidadeWllKg != null ? `${data.capacidadeWllKg.toLocaleString("pt-BR")} kg` : null} color="#22c55e" />
          </div>

          {/* Certificado */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
            <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Certificado
            </div>
            {certCfg && (
              <InfoLine
                label="Status do certificado"
                value={certCfg.label}
                color={certCfg.color}
              />
            )}
            <InfoLine label="Validade"     value={data.validadeCertificado} color={certCfg?.color} />
          </div>

          {/* Inspeção */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
            <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Última Inspeção
            </div>
            {data.resultadoUltimaInspecao ? (
              <>
                <InfoLine label="Resultado"       value={inspCfg?.label ?? data.resultadoUltimaInspecao} color={inspCfg?.color} />
                <InfoLine label="Data"            value={data.dataUltimaInspecao} />
                <InfoLine label="Próxima inspeção" value={data.proximaInspecao} />
              </>
            ) : (
              <div style={{ color: "#475569", fontSize: 14 }}>Nenhuma inspeção registrada.</div>
            )}
          </div>

          {/* Aviso + atualizar */}
          <div style={{ textAlign: "center", paddingBottom: 8 }}>
            <button
              onClick={handleRefresh}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14, marginBottom: 16 }}
            >
              Atualizar consulta
            </button>
            {ts && (
              <div style={{ color: "#334155", fontSize: 11 }}>
                Consultado em {ts.toLocaleTimeString("pt-BR")}
              </div>
            )}
            <div style={{ color: "#1e293b", fontSize: 11, marginTop: 8 }}>
              Esta consulta não substitui a inspeção física do equipamento.
              Verifique sempre as condições físicas antes do uso.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
