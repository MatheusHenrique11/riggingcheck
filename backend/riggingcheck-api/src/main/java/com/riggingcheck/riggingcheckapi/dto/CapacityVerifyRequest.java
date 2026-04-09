package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record CapacityVerifyRequest(
        @Positive(message = "Capacidade do guindaste deve ser maior que zero")
        double craneCapacity,
        @PositiveOrZero(message = "Peso da carga não pode ser negativo")
        double loadWeight,
        @PositiveOrZero(message = "Peso do aparelho não pode ser negativo")
        double riggingWeight
) {}
