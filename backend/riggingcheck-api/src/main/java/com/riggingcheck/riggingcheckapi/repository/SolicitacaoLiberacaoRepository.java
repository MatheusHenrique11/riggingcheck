package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
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
}
