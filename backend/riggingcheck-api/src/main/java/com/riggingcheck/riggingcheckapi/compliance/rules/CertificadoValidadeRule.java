package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Component;

/**
 * Regra 9 — Certificado ausente ou vencido = BLOCKED quando inventário vinculado.
 * null no campo = WARNING (não informado). false = BLOCKED.
 * Norma: NR-11 item 11.3.7 / Petrobras N-2869
 */
@Component
public class CertificadoValidadeRule implements ComplianceRule {

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        Boolean validados = plan.getCertificadosValidados();
        if (validados == null) {
            return new ComplianceViolation(
                TechnicalStatus.WARNING,
                "CERTIFICADO_VALIDADE",
                "Validação de certificados dos equipamentos não foi informada.",
                "NR-11 item 11.3.7 / Petrobras N-2869",
                "Confirme a validade dos certificados de todos os acessórios de içamento utilizados."
            );
        }
        if (!validados) {
            return new ComplianceViolation(
                TechnicalStatus.BLOCKED,
                "CERTIFICADO_VALIDADE",
                "Certificado ausente ou vencido em equipamento vinculado ao inventário.",
                "NR-11 item 11.3.7 / Petrobras N-2869",
                "Substitua o equipamento por outro com certificado válido ou providencie nova inspeção antes da operação."
            );
        }
        return null;
    }
}
