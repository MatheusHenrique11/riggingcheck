package com.riggingcheck.riggingcheckapi.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "solicitacoes_liberacao")
@Data
public class SolicitacaoLiberacao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "operacao_os", nullable = false)
    private String operacaoOs;

    @Column(name = "rigger_nome", nullable = false)
    private String riggerNome;

    @Column(name = "solicitado_por_id", nullable = false)
    private UUID solicitadoPorId;

    @Column(name = "status", nullable = false)
    private String status; // PENDENTE, APROVADO, NEGADO

    @Column(name = "aprovado_por_id")
    private UUID aprovadoPorId;

    @Column(name = "aprovado_por_nome")
    private String aprovadoPorNome;

    @Column(name = "observacao")
    private String observacao;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "resolvido_em")
    private LocalDateTime resolvidoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
        status = "PENDENTE";
    }
}
