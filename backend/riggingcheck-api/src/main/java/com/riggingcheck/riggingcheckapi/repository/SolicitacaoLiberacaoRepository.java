package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SolicitacaoLiberacaoRepository extends JpaRepository<SolicitacaoLiberacao, UUID> {

    List<SolicitacaoLiberacao> findByEmpresaIdAndStatusOrderByCriadoEmDesc(UUID empresaId, String status);

    List<SolicitacaoLiberacao> findByEmpresaIdOrderByCriadoEmDesc(UUID empresaId);

    // SUPER_ADMIN: todas as empresas filtradas por status
    List<SolicitacaoLiberacao> findByStatusOrderByCriadoEmDesc(String status);

    // SUPER_ADMIN: todas as empresas, todos os status
    List<SolicitacaoLiberacao> findAllByOrderByCriadoEmDesc();
}
