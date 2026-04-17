package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Requisição de cálculo trigonométrico para eslinga.
 * Exatamente dois dos três campos (ce, distHorizontal, alturaEfetiva) + angGraus
 * devem ser informados conforme o modo escolhido.
 */
public record TrigCalcRequest(
        @NotBlank(message = "Informe o modo de cálculo: CE_DE_D_HE | D_DE_CE_HE | ANGULO_DE_HE_CE | CE_DE_HE_ANGULO")
        String modo,

        @NotNull @Positive Double ce,
        @NotNull @Positive Double distHorizontal,
        @NotNull @Positive Double alturaEfetiva,
        @NotNull @Positive Double angGraus
) {}
