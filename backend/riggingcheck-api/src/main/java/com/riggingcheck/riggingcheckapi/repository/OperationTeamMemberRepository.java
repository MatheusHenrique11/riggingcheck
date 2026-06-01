package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.OperationTeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OperationTeamMemberRepository extends JpaRepository<OperationTeamMember, UUID> {

    List<OperationTeamMember> findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(UUID solicitacaoLiberacaoId);

    boolean existsBySolicitacaoLiberacaoIdAndFuncionarioId(UUID solicitacaoLiberacaoId, UUID funcionarioId);

    List<OperationTeamMember> findByEmpresaId(UUID empresaId);
}
