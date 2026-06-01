package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Component;

/**
 * Regra 5 — Checklist incompleto.
 * Checklist não preenchido = WARNING. Explicitamente marcado incompleto = RESTRICTED.
 * Norma: NR-11 / Petrobras N-2869
 */
@Component
public class ChecklistCompletoRule implements ComplianceRule {

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        Boolean completo = plan.getChecklistCompleto();
        if (completo == null) {
            return new ComplianceViolation(
                TechnicalStatus.WARNING,
                "CHECKLIST_COMPLETO",
                "Checklist operacional não foi informado.",
                "NR-11 / Petrobras N-2869",
                "Preencha o checklist operacional antes de submeter o plano para aprovação."
            );
        }
        if (!completo) {
            return new ComplianceViolation(
                TechnicalStatus.RESTRICTED,
                "CHECKLIST_COMPLETO",
                "Checklist operacional está incompleto.",
                "NR-11 / Petrobras N-2869",
                "Complete todos os itens do checklist antes de submeter o plano."
            );
        }
        return null;
    }
}
