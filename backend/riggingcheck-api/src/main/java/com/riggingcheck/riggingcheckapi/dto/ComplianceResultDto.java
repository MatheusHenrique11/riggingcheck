package com.riggingcheck.riggingcheckapi.dto;

import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;

import java.util.List;

public record ComplianceResultDto(
        TechnicalStatus overallStatus,
        boolean blocked,
        List<ViolationDto> violations
) {
    public record ViolationDto(
            TechnicalStatus severity,
            String ruleId,
            String message,
            String norm,
            String recommendedAction
    ) {}
}
