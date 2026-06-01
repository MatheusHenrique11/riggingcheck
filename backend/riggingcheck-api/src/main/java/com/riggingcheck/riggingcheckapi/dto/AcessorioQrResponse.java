package com.riggingcheck.riggingcheckapi.dto;

import java.util.UUID;

public record AcessorioQrResponse(
    UUID acessorioId,
    String url,
    String codigoInterno,
    String tipo,
    String status,
    Double capacidadeWllKg
) {}
