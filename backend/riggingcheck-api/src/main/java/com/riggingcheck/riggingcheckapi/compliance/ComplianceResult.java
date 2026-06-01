package com.riggingcheck.riggingcheckapi.compliance;

import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;

import java.util.List;

/**
 * Resultado agregado da avaliação de todas as regras de compliance.
 */
public record ComplianceResult(
        TechnicalStatus overallStatus,
        List<ComplianceViolation> violations
) {
    public boolean isBlocked() {
        return overallStatus == TechnicalStatus.BLOCKED;
    }

    public boolean isCompliant() {
        return overallStatus == TechnicalStatus.COMPLIANT;
    }
}
