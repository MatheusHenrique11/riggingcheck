package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Component;

/**
 * Regra 8 — Rede elétrica próxima sem distância validada = BLOCKED.
 * null ou false no campo redeEletricaValidada dispara BLOCKED.
 * Norma: NR-10 Tabela 1 / Petrobras N-2869
 */
@Component
public class RedeEletricaRule implements ComplianceRule {

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        Boolean validada = plan.getRedeEletricaValidada();
        if (validada == null) {
            return new ComplianceViolation(
                TechnicalStatus.WARNING,
                "REDE_ELETRICA",
                "Proximidade com rede elétrica não foi informada.",
                "NR-10 Tabela 1 / Petrobras N-2869",
                "Verifique e informe se há rede elétrica na área de operação e valide as distâncias mínimas de segurança."
            );
        }
        if (!validada) {
            return new ComplianceViolation(
                TechnicalStatus.BLOCKED,
                "REDE_ELETRICA",
                "Rede elétrica próxima detectada sem validação de distância de segurança.",
                "NR-10 Tabela 1 / Petrobras N-2869",
                "Meça e registre as distâncias de segurança conforme NR-10 Tabela 1, ou solicite desenergização do circuito."
            );
        }
        return null;
    }
}
