package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Component;

/**
 * Regra 7 — Área classificada marcada = RESTRICTED.
 * Exige equipamentos Ex e procedimentos específicos de segurança.
 * Norma: ABNT NBR IEC 60079-14 / NR-10
 */
@Component
public class AreaClassificadaRule implements ComplianceRule {

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        if (!Boolean.TRUE.equals(plan.getAreaClassificada())) return null;
        return new ComplianceViolation(
            TechnicalStatus.RESTRICTED,
            "AREA_CLASSIFICADA",
            "Operação em área classificada (risco de explosão/incêndio).",
            "ABNT NBR IEC 60079-14 / NR-10",
            "Utilize somente equipamentos certificados Ex. Obtenha permissão de trabalho específica para área classificada."
        );
    }
}
