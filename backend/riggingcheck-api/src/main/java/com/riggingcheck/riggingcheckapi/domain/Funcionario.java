package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "funcionarios")
@Data
public class Funcionario {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "nome", nullable = false)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private RoleEnum role;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "vencimento_nr11")
    private LocalDate vencimentoNr11;

    @Column(name = "vencimento_nr35")
    private LocalDate vencimentoNr35;

    @Column(name = "vencimento_aso")
    private LocalDate vencimentoAso;

    @Column(name = "ativo", nullable = false)
    private Boolean ativo = true;

    @Column(name = "chave_api", unique = true)
    private String chaveApi;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}