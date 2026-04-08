package com.riggingcheck.riggingcheckapi.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "empresas")
@Data
public class Empresa {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "razao_social", nullable = false)
    private String razaoSocial;

    @Column(name = "cnpj", unique = true, nullable = false)
    private String cnpj;

    @Column(name = "marca_dagua_relatorio")
    private String marcaDaguaRelatorio;

    @Column(name = "ativo", nullable = false)
    private Boolean ativo = true;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
