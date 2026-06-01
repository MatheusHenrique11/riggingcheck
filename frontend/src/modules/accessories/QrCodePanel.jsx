import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { obterQr } from "./accessoriesApi";

const STATUS_CFG = {
  ATIVO:       { label: "Ativo",       color: "#22c55e" },
  EM_INSPECAO: { label: "Em Inspeção", color: "#f59e0b" },
  REPROVADO:   { label: "Reprovado",   color: "#ef4444" },
  DESCARTADO:  { label: "Descartado",  color: "#64748b" },
  VENCIDO:     { label: "Vencido",     color: "#f97316" },
};

export default function QrCodePanel({ acessorioId }) {
  const [qrData, setQrData]     = useState(null);
  const [qrImg, setQrImg]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  useEffect(() => {
    let active = true;
    obterQr(acessorioId)
      .then(async data => {
        if (!active) return;
        setQrData(data);
        const dataUrl = await QRCode.toDataURL(data.url, {
          width: 240,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setQrImg(dataUrl);
      })
      .catch(err => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [acessorioId]);

  const baixarQr = () => {
    if (!qrImg) return;
    const a = document.createElement("a");
    a.href = qrImg;
    a.download = `qr-${qrData?.codigoInterno ?? acessorioId}.png`;
    a.click();
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Gerando QR Code...</div>;
  if (error)   return <div style={{ color: "#ef4444", padding: 16 }}>{error}</div>;

  const cfg = STATUS_CFG[qrData?.status] ?? { label: qrData?.status, color: "#64748b" };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      {/* QR Code */}
      {qrImg && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, display: "inline-block" }}>
          <img src={qrImg} alt="QR Code do Acessório" width={200} height={200} />
        </div>
      )}

      {/* Informações */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", fontFamily: "monospace", marginBottom: 6 }}>
          {qrData?.codigoInterno}
        </div>
        <div style={{ display: "inline-block", background: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 20, padding: "3px 14px", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
          {cfg.label}
        </div>
        {qrData?.capacidadeWllKg != null && (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            WLL: <strong style={{ color: "#f1f5f9" }}>{qrData.capacidadeWllKg.toLocaleString("pt-BR")} kg</strong>
          </div>
        )}
      </div>

      {/* URL */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", width: "100%", maxWidth: 400 }}>
        <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>URL de Consulta</div>
        <div style={{ fontSize: 12, color: "#38bdf8", wordBreak: "break-all" }}>{qrData?.url}</div>
      </div>

      {/* Ações */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={baixarQr}
          style={{ background: "#1e3a5f", border: "1px solid #3b82f644", color: "#93c5fd", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          ⬇ Baixar QR Code
        </button>
        <button
          onClick={() => navigator.clipboard?.writeText(qrData?.url)}
          style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13 }}
        >
          📋 Copiar URL
        </button>
      </div>

      <div style={{ fontSize: 11, color: "#334155", textAlign: "center", maxWidth: 300 }}>
        Afixe este QR Code no acessório para consulta rápida de status e certificação em campo.
      </div>
    </div>
  );
}
