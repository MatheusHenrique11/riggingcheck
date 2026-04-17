package com.riggingcheck.riggingcheckapi.dto;

public record TrigCalcResponse(
        String modo,
        Double ce,
        Double distHorizontal,
        Double alturaEfetiva,
        Double angGraus,
        Double fatorCarga,
        String aviso
) {}
