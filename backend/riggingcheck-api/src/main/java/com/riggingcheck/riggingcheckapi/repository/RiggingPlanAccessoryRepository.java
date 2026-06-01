package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.RiggingPlanAccessory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RiggingPlanAccessoryRepository extends JpaRepository<RiggingPlanAccessory, UUID> {

    List<RiggingPlanAccessory> findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(UUID solicitacaoLiberacaoId);

    Optional<RiggingPlanAccessory> findBySolicitacaoLiberacaoIdAndAcessorioId(UUID solicitacaoLiberacaoId, UUID acessorioId);

    boolean existsBySolicitacaoLiberacaoIdAndAcessorioId(UUID solicitacaoLiberacaoId, UUID acessorioId);

    void deleteBySolicitacaoLiberacaoIdAndAcessorioId(UUID solicitacaoLiberacaoId, UUID acessorioId);
}
