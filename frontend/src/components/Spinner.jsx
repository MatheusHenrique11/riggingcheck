/**
 * Spinner e bloco de carregamento padrão do sistema — cor de marca (laranja),
 * usados nos estados de loading em vez de texto estático "Carregando...".
 */

export function Spinner({ size = 18, color = "#ea580c", trackColor = "#1e293b" }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2.5px solid ${trackColor}`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "rc-spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

export default function LoadingBlock({ label = "Carregando...", padding = 48, size = 22, inline = false }) {
  if (inline) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 13 }}>
        <Spinner size={14} />
        {label}
      </span>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12, padding, color: "#64748b", fontSize: 13,
        animation: "rc-fade-in 0.25s ease",
      }}
    >
      <Spinner size={size} />
      <span>{label}</span>
    </div>
  );
}
