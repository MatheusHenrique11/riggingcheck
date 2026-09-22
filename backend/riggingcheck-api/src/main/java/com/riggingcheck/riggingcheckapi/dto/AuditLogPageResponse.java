package com.riggingcheck.riggingcheckapi.dto;

import java.util.List;

public record AuditLogPageResponse(
    List<AuditLogResponse> content,
    int page,
    int size,
    long totalElements,
    int totalPages
) {}
