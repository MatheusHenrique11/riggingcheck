package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.ChecklistResposta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChecklistRespostaRepository extends JpaRepository<ChecklistResposta, UUID> {

    List<ChecklistResposta> findBySolicitacaoLiberacaoIdOrderByCodigoItemAsc(UUID solicitacaoLiberacaoId);

    boolean existsBySolicitacaoLiberacaoId(UUID solicitacaoLiberacaoId);

    long countBySolicitacaoLiberacaoIdAndRespondidoTrue(UUID solicitacaoLiberacaoId);
}
