package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmpresaRepository extends JpaRepository<Empresa, UUID> {
    Optional<Empresa> findByCnpj(String cnpj);
    List<Empresa> findAllByOrderByCriadoEmDesc();

    @Query("SELECT COUNT(f) FROM Funcionario f WHERE f.empresaId = :empresaId AND f.ativo = true")
    long countFuncionariosAtivos(UUID empresaId);
}
