/**
 * Rodapé do wizard com ações de navegação e salvamento.
 */
export default function WizardFooterActions({ isFirst, isLast, onPrev, onNext, onReset, currentStep, totalSteps, currentIndex }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "20px 0",
      borderTop: "1px solid #1e293b",
      marginTop: 24,
      flexWrap: "wrap",
      gap: 12,
    }}>
      {/* Esquerda: Voltar + Reset */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {!isFirst && (
          <button
            onClick={onPrev}
            style={{
              background: "transparent",
              border: "1px solid #334155",
              color: "#94a3b8",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ← Anterior
          </button>
        )}
        <button
          onClick={onReset}
          style={{
            background: "transparent",
            border: "1px solid #ef444433",
            color: "#ef4444",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          🗑 Limpar
        </button>
      </div>

      {/* Centro: indicador de etapa */}
      <div style={{ color: "#475569", fontSize: 12, textAlign: "center" }}>
        Etapa {currentIndex + 1} de {totalSteps}
        <div style={{ color: "#334155", fontSize: 11, marginTop: 2 }}>{currentStep?.description}</div>
      </div>

      {/* Direita: Próximo ou Finalizar */}
      <div>
        {!isLast ? (
          <button
            onClick={onNext}
            style={{
              background: "#3b82f6",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              padding: "10px 24px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: "0 4px 14px rgba(59,130,246,0.25)",
            }}
          >
            Próximo →
          </button>
        ) : (
          <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 600, padding: "10px 0" }}>
            ✓ Plano concluído
          </div>
        )}
      </div>
    </div>
  );
}
