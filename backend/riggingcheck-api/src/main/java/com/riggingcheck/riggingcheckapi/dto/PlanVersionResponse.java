package com.riggingcheck.riggingcheckapi.dto;

import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record PlanVersionResponse(
        UUID id,
        UUID planId,
        Integer versionNumber,
        TechnicalStatus technicalStatus,
        String complianceMessages,
        String createdByName,
        LocalDateTime createdAt
) {}
