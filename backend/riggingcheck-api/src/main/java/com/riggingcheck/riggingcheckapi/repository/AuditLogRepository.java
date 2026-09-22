package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByEntityIdOrderByCreatedAtDesc(UUID entityId);
    List<AuditLog> findByEmpresaIdOrderByCreatedAtDesc(UUID empresaId);
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Busca paginada e filtrável restrita a uma empresa — usada por
     * ADMIN_EMPRESA. Cada filtro é opcional (null = ignora a condição).
     */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.empresaId = :empresaId
          AND (:entityType IS NULL OR a.entityType = :entityType)
          AND (:action IS NULL OR a.action = :action)
          AND (:userId IS NULL OR a.userId = :userId)
          AND (:from IS NULL OR a.createdAt >= :from)
          AND (:to IS NULL OR a.createdAt <= :to)
        """)
    Page<AuditLog> search(@Param("empresaId") UUID empresaId,
                           @Param("entityType") String entityType,
                           @Param("action") String action,
                           @Param("userId") UUID userId,
                           @Param("from") LocalDateTime from,
                           @Param("to") LocalDateTime to,
                           Pageable pageable);

    /**
     * Mesma busca, sem restrição de empresa — usada apenas por SUPER_ADMIN.
     */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:entityType IS NULL OR a.entityType = :entityType)
          AND (:action IS NULL OR a.action = :action)
          AND (:userId IS NULL OR a.userId = :userId)
          AND (:from IS NULL OR a.createdAt >= :from)
          AND (:to IS NULL OR a.createdAt <= :to)
        """)
    Page<AuditLog> searchAll(@Param("entityType") String entityType,
                              @Param("action") String action,
                              @Param("userId") UUID userId,
                              @Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to,
                              Pageable pageable);
}
