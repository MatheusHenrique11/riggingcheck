package com.riggingcheck.riggingcheckapi.domain.enums;

/**
 * Status do ciclo de vida de aprovação gerencial do plano de içamento.
 * Separado do TechnicalStatus (que é calculado automaticamente).
 */
public enum WorkflowStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    CHANGES_REQUESTED,
    RESUBMITTED,
    APPROVED,
    APPROVED_WITH_RESTRICTIONS,
    REJECTED,
    CANCELLED,
    EXECUTED,
    ARCHIVED
}
