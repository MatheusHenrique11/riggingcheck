package com.riggingcheck.riggingcheckapi.domain.enums;

/**
 * Status técnico calculado automaticamente pela Compliance Engine.
 * Independente da decisão gerencial (WorkflowStatus).
 */
public enum TechnicalStatus {
    COMPLIANT,
    WARNING,
    RESTRICTED,
    BLOCKED
}
