package com.riggingcheck.riggingcheckapi.compliance;

import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;

/**
 * Contrato para todas as regras de compliance do plano de içamento.
 * Cada implementação avalia uma condição técnica e retorna uma violação se aplicável.
 */
public interface ComplianceRule {

    /**
     * Avalia a regra contra o plano fornecido.
     * @return violação encontrada, ou null se estiver em conformidade.
     */
    ComplianceViolation evaluate(SolicitacaoLiberacao plan);
}
