package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Component;

/**
 * Regra 4 — Pressão nas patolas maior que resistência do solo = BLOCKED.
 * Norma: Petrobras N-2869 / ABNT NBR ISO 4308-1
 */
@Component
public class PressaoPatolasRule implements ComplianceRule {

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        Double pressao = plan.getPressaoPatolasKpa();
        Double resistencia = plan.getResistenciaSoloKpa();
        if (pressao == null || resistencia == null) return null;

        if (pressao > resistencia) {
            return new ComplianceViolation(
                TechnicalStatus.BLOCKED,
                "PRESSAO_PATOLAS",
                "Pressão nas patolas (%.1f kPa) excede a resistência do solo (%.1f kPa).".formatted(pressao, resistencia),
                "Petrobras N-2869 / ABNT NBR ISO 4308-1",
                "Instale placas de distribuição de carga ou selecione local com solo de maior resistência."
            );
        }
        if (pressao > resistencia * 0.85) {
            return new ComplianceViolation(
                TechnicalStatus.WARNING,
                "PRESSAO_PATOLAS",
                "Pressão nas patolas (%.1f kPa) está acima de 85%% da resistência do solo (%.1f kPa).".formatted(pressao, resistencia),
                "Petrobras N-2869",
                "Monitore recalque do terreno durante a operação."
            );
        }
        return null;
    }
}
