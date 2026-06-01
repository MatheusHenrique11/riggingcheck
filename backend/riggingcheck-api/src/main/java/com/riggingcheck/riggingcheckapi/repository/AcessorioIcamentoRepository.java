package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.AcessorioIcamento;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusAcessorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AcessorioIcamentoRepository extends JpaRepository<AcessorioIcamento, UUID> {

    List<AcessorioIcamento> findByEmpresaIdOrderByDataCadastroDesc(UUID empresaId);

    List<AcessorioIcamento> findByEmpresaIdAndStatusOrderByDataCadastroDesc(UUID empresaId, StatusAcessorio status);

    Optional<AcessorioIcamento> findByIdAndEmpresaId(UUID id, UUID empresaId);

    boolean existsByEmpresaIdAndCodigoInterno(UUID empresaId, String codigoInterno);

    long countByEmpresaIdAndStatus(UUID empresaId, StatusAcessorio status);
}
