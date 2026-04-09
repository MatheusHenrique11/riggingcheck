package com.riggingcheck.riggingcheckapi.dto;

public record CapacityVerifyResponse(
        double totalLoad,
        double usagePercent,
        double availableMargin,
        String riskLevel,
        boolean approved
) {}
