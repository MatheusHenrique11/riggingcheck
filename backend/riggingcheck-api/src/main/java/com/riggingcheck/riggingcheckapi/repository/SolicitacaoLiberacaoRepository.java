package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import com.riggingcheck.riggingcheckapi.domain.enums.WorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SolicitacaoLiberacaoRepository extends JpaRepository<SolicitacaoLiberacao, UUID> {

    List<SolicitacaoLiberacao> findByEmpresaIdAndStatusOrderByCriadoEmDesc(UUID empresaId, StatusLiberacao status);

    List<SolicitacaoLiberacao> findByEmpresaIdOrderByCriadoEmDesc(UUID empresaId);

    // SUPER_ADMIN: todas as empresas filtradas por status
    List<SolicitacaoLiberacao> findByStatusOrderByCriadoEmDesc(StatusLiberacao status);

    // SUPER_ADMIN: todas as empresas, todos os status
    List<SolicitacaoLiberacao> findAllByOrderByCriadoEmDesc();

    // contagens para stats
    long countByEmpresaId(UUID empresaId);
    long countByEmpresaIdAndStatus(UUID empresaId, StatusLiberacao status);

    // LGPD: exportação de dados pessoais por operador
    List<SolicitacaoLiberacao> findBySolicitadoPorIdOrderByCriadoEmDesc(UUID solicitadoPorId);

    // Validação pública
    java.util.Optional<SolicitacaoLiberacao> findByPublicValidationToken(String token);

    // Alertas: planos bloqueados por empresa
    List<SolicitacaoLiberacao> findByEmpresaIdAndTechnicalStatus(UUID empresaId, TechnicalStatus technicalStatus);

    // Alertas: planos aguardando aprovação por empresa
    List<SolicitacaoLiberacao> findByEmpresaIdAndWorkflowStatusIn(UUID empresaId, List<WorkflowStatus> statuses);

    // Alertas: SUPER_ADMIN — bloqueados globais
    List<SolicitacaoLiberacao> findByTechnicalStatus(TechnicalStatus technicalStatus);

    // Alertas: SUPER_ADMIN — aguardando globais
    List<SolicitacaoLiberacao> findByWorkflowStatusIn(List<WorkflowStatus> statuses);
}
