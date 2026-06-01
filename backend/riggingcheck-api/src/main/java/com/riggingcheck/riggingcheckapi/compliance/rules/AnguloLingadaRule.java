package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Component;

/**
 * Regra 1 — Ângulo da lingada menor que 30° = BLOCKED.
 * Norma: ABNT NBR 13541 / NR-11 item 11.3.3
 */
@Component
public class AnguloLingadaRule implements ComplianceRule {

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        Double angulo = plan.getEslAnguloGraus();
        if (angulo == null) return null;
        if (angulo < 30.0) {
            return new ComplianceViolation(
                TechnicalStatus.BLOCKED,
                "ANGULO_LINGADA",
                "Ângulo da lingada de %.1f° é inferior ao mínimo permitido de 30°.".formatted(angulo),
                "ABNT NBR 13541 / NR-11 item 11.3.3",
                "Aumente o comprimento das pernas da eslinga ou reduza o número de pernas para elevar o ângulo acima de 30°."
            );
        }
        if (angulo < 45.0) {
            return new ComplianceViolation(
                TechnicalStatus.WARNING,
                "ANGULO_LINGADA",
                "Ângulo da lingada de %.1f° está abaixo de 45°. Monitorar esforços nas pernas.".formatted(angulo),
                "ABNT NBR 13541",
                "Considere reconfigurar a lingada para ângulo acima de 45° para maior margem de segurança."
            );
        }
        return null;
    }
}
