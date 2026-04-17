package com.riggingcheck.riggingcheckapi.dto;

public record MomentResponse(
        double momento,
        double usoPct,
        String risco,
        boolean aprovado
) {}
