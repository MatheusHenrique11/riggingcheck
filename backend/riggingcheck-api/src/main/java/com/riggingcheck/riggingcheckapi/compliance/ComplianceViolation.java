package com.riggingcheck.riggingcheckapi.compliance;

import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;

/**
 * Representa uma violação encontrada por uma regra de compliance.
 * Severidade determina o pior TechnicalStatus resultante.
 */
public record ComplianceViolation(
        TechnicalStatus severity,
        String ruleId,
        String message,
        String norm,
        String recommendedAction
) {}
