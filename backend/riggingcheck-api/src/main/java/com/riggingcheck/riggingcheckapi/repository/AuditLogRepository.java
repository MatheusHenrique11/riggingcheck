package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByEntityIdOrderByCreatedAtDesc(UUID entityId);
    List<AuditLog> findByEmpresaIdOrderByCreatedAtDesc(UUID empresaId);
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
