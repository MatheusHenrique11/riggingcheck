package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.CertificadoAcessorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CertificadoAcessorioRepository extends JpaRepository<CertificadoAcessorio, UUID> {

    List<CertificadoAcessorio> findByAcessorioIdOrderByCriadoEmDesc(UUID acessorioId);

    List<CertificadoAcessorio> findByEmpresaIdAndAcessorioId(UUID empresaId, UUID acessorioId);
}
