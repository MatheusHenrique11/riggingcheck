package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.AuditLog;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.repository.AuditLogRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Registra um evento de auditoria de forma assíncrona para não bloquear o fluxo principal.
     * Usa REQUIRES_NEW para garantir que falhas no log não revertam a transação do chamador.
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Funcionario actor, String action, String entityType, UUID entityId, String details) {
        AuditLog entry = AuditLog.builder()
                .empresaId(actor.getEmpresaId())
                .userId(actor.getId())
                .userEmail(actor.getEmail())
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .build();
        auditLogRepository.save(entry);
    }
}
