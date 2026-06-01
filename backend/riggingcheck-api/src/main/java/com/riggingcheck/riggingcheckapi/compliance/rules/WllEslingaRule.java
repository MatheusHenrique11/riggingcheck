package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Component;

/**
 * Regra 2 — WLL da eslinga menor que carga por perna = BLOCKED.
 * Norma: ABNT NBR 13541 / ABNT NBR 15637
 */
@Component
public class WllEslingaRule implements ComplianceRule {

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        Double wll = plan.getEslWllKg();
        Double tensaoPorPerna = plan.getEslTensaoPorPernaKg();
        if (wll == null || tensaoPorPerna == null) return null;

        if (wll < tensaoPorPerna) {
            return new ComplianceViolation(
                TechnicalStatus.BLOCKED,
                "WLL_ESLINGA",
                "WLL da eslinga (%.0f kg) é inferior à carga por perna (%.0f kg).".formatted(wll, tensaoPorPerna),
                "ABNT NBR 13541 / ABNT NBR 15637",
                "Substitua a eslinga por equipamento com WLL superior a %.0f kg.".formatted(tensaoPorPerna)
            );
        }
        if (plan.getEslWllUsoPercent() != null && plan.getEslWllUsoPercent() > 80.0) {
            return new ComplianceViolation(
                TechnicalStatus.WARNING,
                "WLL_ESLINGA",
                "Utilização da eslinga em %.1f%% — acima de 80%%.".formatted(plan.getEslWllUsoPercent()),
                "ABNT NBR 13541",
                "Avalie substituição por eslinga de maior capacidade para aumentar margem de segurança."
            );
        }
        return null;
    }
}
