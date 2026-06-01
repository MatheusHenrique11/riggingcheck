package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Component;

/**
 * Regra 6 — Operação com dois ou mais guindastes = RESTRICTED.
 * Exige plano especial e coordenação entre operadores.
 * Norma: Petrobras N-2869 item 6.4 / ISO 4308-1
 */
@Component
public class DoisGuindasteRule implements ComplianceRule {

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        if (!Boolean.TRUE.equals(plan.getDoisOuMaisGuindastes())) return null;
        return new ComplianceViolation(
            TechnicalStatus.RESTRICTED,
            "DOIS_GUINDASTES",
            "Operação envolve dois ou mais guindastes simultaneamente.",
            "Petrobras N-2869 item 6.4 / ISO 4308-1",
            "Elabore plano de içamento conjunto com sincronização de movimentos. Exige aprovação de engenheiro responsável."
        );
    }
}
