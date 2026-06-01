package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Component;

/**
 * Regra 3 — Taxa de utilização do guindaste acima do limite = RESTRICTED (≥90%) ou BLOCKED (≥100%).
 * Norma: ABNT NBR 11900 / NR-11
 */
@Component
public class UtilizacaoGuindasteRule implements ComplianceRule {

    private static final double RESTRICTED_THRESHOLD = 90.0;
    private static final double BLOCKED_THRESHOLD    = 100.0;

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        Double uso = plan.getCapUsoPercent();
        if (uso == null) return null;

        if (uso >= BLOCKED_THRESHOLD) {
            return new ComplianceViolation(
                TechnicalStatus.BLOCKED,
                "UTILIZACAO_GUINDASTE",
                "Taxa de utilização do guindaste de %.1f%% excede 100%% da capacidade nominal.".formatted(uso),
                "ABNT NBR 11900 / NR-11",
                "Reduza a carga ou utilize guindaste de maior capacidade."
            );
        }
        if (uso >= RESTRICTED_THRESHOLD) {
            return new ComplianceViolation(
                TechnicalStatus.RESTRICTED,
                "UTILIZACAO_GUINDASTE",
                "Taxa de utilização de %.1f%% está na faixa crítica (90–100%%).".formatted(uso),
                "ABNT NBR 11900 / NR-11",
                "Operação somente com autorização expressa da supervisão. Monitorar continuamente."
            );
        }
        return null;
    }
}
