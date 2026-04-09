package com.riggingcheck.riggingcheckapi.dto;

public record SlingCalculateResponse(
        double tensionPerLeg,
        double loadFactor,
        Double wllUsagePercent,
        String riskLevel,
        boolean angleWarning
) {}
