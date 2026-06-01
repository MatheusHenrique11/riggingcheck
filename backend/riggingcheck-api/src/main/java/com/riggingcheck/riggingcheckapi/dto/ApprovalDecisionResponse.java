package com.riggingcheck.riggingcheckapi.dto;

import com.riggingcheck.riggingcheckapi.domain.enums.WorkflowStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record ApprovalDecisionResponse(
        UUID id,
        UUID planId,
        Integer versionNumber,
        WorkflowStatus decision,
        String decidedByName,
        String decidedByRole,
        String justification,
        Boolean isException,
        LocalDateTime decidedAt
) {}
