package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.InspecaoAcessorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InspecaoAcessorioRepository extends JpaRepository<InspecaoAcessorio, UUID> {

    List<InspecaoAcessorio> findByAcessorioIdOrderByDataInspecaoDesc(UUID acessorioId);

    Optional<InspecaoAcessorio> findTopByAcessorioIdOrderByDataInspecaoDesc(UUID acessorioId);

    List<InspecaoAcessorio> findByEmpresaIdAndAcessorioId(UUID empresaId, UUID acessorioId);
}
