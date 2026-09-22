package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.AuditLog;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.AuditLogPageResponse;
import com.riggingcheck.riggingcheckapi.dto.AuditLogResponse;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.AuditLogRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.shared.AuthorizationHelper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuditLogService {

    private static final int PAGE_SIZE_MAX = 100;

    private final AuditLogRepository auditLogRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final AuthorizationHelper authHelper;

    public AuditLogService(AuditLogRepository auditLogRepository,
                            FuncionarioRepository funcionarioRepository,
                            AuthorizationHelper authHelper) {
        this.auditLogRepository = auditLogRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.authHelper = authHelper;
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

    /**
     * Lista o trilho de auditoria com filtros opcionais e paginação.
     * Restrito a ADMIN_EMPRESA/SUPER_ADMIN — é uma ferramenta de conformidade,
     * não um painel operacional do dia a dia.
     * SUPER_ADMIN vê todas as empresas; ADMIN_EMPRESA só a própria (reforçado
     * aqui além do filtro automático de tenant do Hibernate).
     */
    @Transactional(readOnly = true)
    public AuditLogPageResponse listar(String email, String entityType, String action, UUID userId,
                                        LocalDateTime from, LocalDateTime to, int page, int size) {
        Funcionario actor = getActor(email);
        authHelper.requireGestorFuncionarios(actor);

        int safeSize = Math.min(Math.max(size, 1), PAGE_SIZE_MAX);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<AuditLog> resultado = actor.getRole() == RoleEnum.SUPER_ADMIN
            ? auditLogRepository.searchAll(entityType, action, userId, from, to, pageable)
            : auditLogRepository.search(actor.getEmpresaId(), entityType, action, userId, from, to, pageable);

        return new AuditLogPageResponse(
            resultado.getContent().stream().map(this::toResponse).toList(),
            resultado.getNumber(),
            resultado.getSize(),
            resultado.getTotalElements(),
            resultado.getTotalPages()
        );
    }

    private Funcionario getActor(String email) {
        return funcionarioRepository.findByEmail(email)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private AuditLogResponse toResponse(AuditLog a) {
        return new AuditLogResponse(
            a.getId(),
            a.getEmpresaId(),
            a.getUserId(),
            a.getUserEmail(),
            a.getAction(),
            a.getEntityType(),
            a.getEntityId(),
            a.getDetails(),
            a.getIpAddress(),
            a.getCreatedAt()
        );
    }
}
