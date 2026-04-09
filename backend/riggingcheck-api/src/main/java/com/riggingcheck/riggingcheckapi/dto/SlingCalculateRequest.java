package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;

public record SlingCalculateRequest(
        @Positive(message = "Peso da carga deve ser maior que zero")
        double loadWeight,
        @Positive(message = "Número de pernas deve ser maior que zero")
        int numberOfLegs,
        @DecimalMin(value = "1.0", message = "Ângulo deve ser no mínimo 1°")
        @DecimalMax(value = "90.0", message = "Ângulo deve ser no máximo 90°")
        double angleFromHorizontal,
        Double wll
) {}
