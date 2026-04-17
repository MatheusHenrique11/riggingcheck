package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record MomentRequest(
        @NotNull @Positive Double forcaToneladas,
        @NotNull @Positive Double distanciaMetros,
        @NotNull @Positive Double limiteCapacidade
) {}
