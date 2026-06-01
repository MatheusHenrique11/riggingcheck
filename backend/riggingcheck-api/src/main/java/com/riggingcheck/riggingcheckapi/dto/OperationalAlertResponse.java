package com.riggingcheck.riggingcheckapi.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record OperationalAlertResponse(
    UUID id,
    UUID empresaId,
    String tipo,
    String severidade,
    String titulo,
    String mensagem,
    String entidadeTipo,
    UUID entidadeId,
    String status,
    LocalDateTime createdAt,
    LocalDateTime acknowledgedAt,
    UUID acknowledgedById
) {}
