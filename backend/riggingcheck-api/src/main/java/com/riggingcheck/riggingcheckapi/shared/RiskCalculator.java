package com.riggingcheck.riggingcheckapi.shared;

/**
 * Centraliza o cálculo de nível de risco baseado em percentual de uso.
 *
 * Thresholds conforme ABNT NBR 11900 e NR-11:
 *   < 70%  → SAFE    (margem de segurança adequada)
 *   70-90% → WARNING (atenção — aproximando do limite)
 *   ≥ 90%  → DANGER  (risco crítico — operação não autorizada)
 */
public final class RiskCalculator {

    public static final double SAFE_THRESHOLD    = 70.0;
    public static final double WARNING_THRESHOLD = 90.0;

    private RiskCalculator() {}

    public static String fromUsagePercent(double usagePercent) {
        if (usagePercent < SAFE_THRESHOLD)    return "SAFE";
        if (usagePercent < WARNING_THRESHOLD) return "WARNING";
        return "DANGER";
    }

    /** Retorna o pior nível de risco entre dois. */
    public static String worst(String a, String b) {
        return nivel(a) >= nivel(b) ? a : b;
    }

    private static int nivel(String risk) {
        return switch (risk) {
            case "DANGER"  -> 2;
            case "WARNING" -> 1;
            default        -> 0;
        };
    }
}
