package com.riggingcheck.riggingcheckapi.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AuditLogResponse(
    UUID id,
    UUID empresaId,
    UUID userId,
    String userEmail,
    String action,
    String entityType,
    UUID entityId,
    String details,
    String ipAddress,
    LocalDateTime createdAt
) {}
