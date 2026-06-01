import { useState, useEffect, useCallback } from "react";
import { buscarAcessorio, listarCertificados, listarInspecoes, atualizarStatus } from "./accessoriesApi";
import CertificatePanel from "./CertificatePanel";
import InspectionPanel from "./InspectionPanel";
import QrCodePanel from "./QrCodePanel";

const TABS = [
  { id: "info",     label: "Informações" },
  { id: "certs",    label: "Certificados" },
  { id: "insp",     label: "Inspeções" },
  { id: "qr",       label: "QR Code" },
];

const STATUS_OPCOES = ["ATIVO", "EM_INSPECAO", "REPROVADO", "DESCARTADO", "VENCIDO"];
const STATUS_CFG = {
  ATIVO:        { label: "Ativo",        color: "#22c55e" },
  EM_INSPECAO:  { label: "Em Inspeção",  color: "#f59e0b" },
  REPROVADO:    { label: "Reprovado",    color: "#ef4444" },
  DESCARTADO:   { label: "Descartado",   color: "#64748b" },
  VENCIDO:      { label: "Vencido",      color: "#f97316" },
};

function InfoRow({ label, value, color }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b", fontSize: 13 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: color || "#e2e8f0", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function AccessoryDetails({ acessorioId, onBack, onEdit, canManage }) {
  const [tab,          setTab]          = useState("info");
  const [acessorio,    setAcessorio]    = useState(null);
  const [certificados, setCertificados] = useState([]);
  const [inspecoes,    setInspecoes]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusEdit,   setStatusEdit]   = useState(false);
  const [novoStatus,   setNovoStatus]   = useState("");
  const [motivo,       setMotivo]       = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  const S = {
    card: { background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 14, border: "1px solid #334155" },
    tab:  (active) => ({ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 400, background: active ? "#1e3a5f" : "transparent", color: active ? "#93c5fd" : "#64748b" }),
    inp:  { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "8px 12px" },
  };

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c, i] = await Promise.all([
        buscarAcessorio(acessorioId),
        listarCertificados(acessorioId),
        listarInspecoes(acessorioId),
      ]);
      setAcessorio(a);
      setCertificados(c);
      setInspecoes(i);
      setNovoStatus(a.status);
    } finally {
      setLoading(false);
    }
  }, [acessorioId]);

  useEffect(() => { reload(); }, [reload]);

  const handleStatusSave = async () => {
    setStatusLoading(true);
    try {
      await atualizarStatus(acessorioId, novoStatus, motivo);
      setStatusEdit(false);
      setMotivo("");
      reload();
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>Carregando...</div>;
  if (!acessorio) return null;

  const cfg = STATUS_CFG[acessorio.status] ?? { label: acessorio.status, color: "#64748b" };

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 8 }}>
            ← Voltar ao inventário
          </button>
          <h2 style={{ color: "#f1f5f9", margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>
            {acessorio.codigoInterno}
          </h2>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{acessorio.descricao}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ background: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700 }}>
            {cfg.label}
          </span>
          {canManage && (
            <>
              <button onClick={() => onEdit(acessorio)} style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>Editar</button>
              <button onClick={() => setStatusEdit(v => !v)} style={{ background: "transparent", border: "1px solid #f59e0b44", color: "#f59e0b", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>Alterar Status</button>
            </>
          )}
        </div>
      </div>

      {/* Alteração de status */}
      {statusEdit && canManage && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 16, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>NOVO STATUS</div>
            <select style={S.inp} value={novoStatus} onChange={e => setNovoStatus(e.target.value)}>
              {STATUS_OPCOES.map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>MOTIVO</div>
            <input style={{ ...S.inp, width: "100%", boxSizing: "border-box" }} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo da alteração..." />
          </div>
          <button onClick={handleStatusSave} disabled={statusLoading} style={{ background: "#3b82f6", border: "none", color: "#fff", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            {statusLoading ? "..." : "Confirmar"}
          </button>
          <button onClick={() => setStatusEdit(false)} style={{ background: "transparent", border: "1px solid #334155", color: "#64748b", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Conteúdo */}
      {tab === "info" && (
        <div style={S.card}>
          <InfoRow label="Código Interno"   value={acessorio.codigoInterno} color="#38bdf8" />
          <InfoRow label="Tipo"             value={acessorio.tipo} />
          <InfoRow label="Fabricante"       value={acessorio.fabricante} />
          <InfoRow label="Modelo"           value={acessorio.modelo} />
          <InfoRow label="Número de Série"  value={acessorio.numeroSerie} />
          <InfoRow label="WLL (kg)"         value={acessorio.capacidadeWllKg != null ? `${acessorio.capacidadeWllKg.toLocaleString("pt-BR")} kg` : null} color="#22c55e" />
          <InfoRow label="Data Fabricação"  value={acessorio.dataFabricacao} />
          <InfoRow label="Localização"      value={acessorio.localizacao} />
          <InfoRow label="Cadastrado por"   value={acessorio.cadastradoPorNome} />
          <InfoRow label="Data Cadastro"    value={acessorio.dataCadastro?.slice(0, 10)} />
          {acessorio.observacoes && (
            <div style={{ marginTop: 12, padding: "10px 0", borderTop: "1px solid #1e293b" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>OBSERVAÇÕES</div>
              <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>{acessorio.observacoes}</div>
            </div>
          )}
        </div>
      )}

      {tab === "certs" && (
        <CertificatePanel
          acessorioId={acessorioId}
          certificados={certificados}
          onAdded={() => listarCertificados(acessorioId).then(setCertificados)}
        />
      )}

      {tab === "insp" && (
        <InspectionPanel
          acessorioId={acessorioId}
          inspecoes={inspecoes}
          onAdded={reload}
        />
      )}

      {tab === "qr" && (
        <div style={S.card}>
          <QrCodePanel acessorioId={acessorioId} />
        </div>
      )}
    </div>
  );
}
