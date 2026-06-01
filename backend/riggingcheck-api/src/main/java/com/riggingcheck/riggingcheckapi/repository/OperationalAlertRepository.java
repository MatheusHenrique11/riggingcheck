package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.OperationalAlert;
import com.riggingcheck.riggingcheckapi.domain.enums.SeveridadeAlerta;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusAlerta;
import com.riggingcheck.riggingcheckapi.domain.enums.TipoAlerta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OperationalAlertRepository extends JpaRepository<OperationalAlert, UUID> {

    List<OperationalAlert> findByEmpresaIdOrderByCreatedAtDesc(UUID empresaId);

    List<OperationalAlert> findByEmpresaIdAndStatusOrderByCreatedAtDesc(UUID empresaId, StatusAlerta status);

    List<OperationalAlert> findByEmpresaIdAndSeveridadeOrderByCreatedAtDesc(UUID empresaId, SeveridadeAlerta severidade);

    List<OperationalAlert> findAllByOrderByCreatedAtDesc();

    long countByEmpresaIdAndStatus(UUID empresaId, StatusAlerta status);

    long countByStatus(StatusAlerta status);

    long countByEmpresaIdAndSeveridade(UUID empresaId, SeveridadeAlerta severidade);

    /** Anti-duplicidade: verifica se já existe alerta ativo para este tipo + entidade. */
    boolean existsByEmpresaIdAndTipoAndEntidadeIdAndStatusIn(
        UUID empresaId, TipoAlerta tipo, UUID entidadeId, List<StatusAlerta> statuses);
}
