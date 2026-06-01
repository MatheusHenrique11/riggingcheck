package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.ResultadoInspecao;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inspecoes_acessorio")
@Data
public class InspecaoAcessorio {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "acessorio_id", nullable = false)
    private UUID acessorioId;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "inspetor_id")
    private UUID inspetorId;

    @Column(name = "inspetor_nome", length = 200)
    private String inspetorNome;

    @Column(name = "data_inspecao", nullable = false)
    private LocalDate dataInspecao;

    @Enumerated(EnumType.STRING)
    @Column(name = "resultado", nullable = false, columnDefinition = "VARCHAR(30)")
    private ResultadoInspecao resultado;

    @Column(name = "observacoes", columnDefinition = "TEXT")
    private String observacoes;

    @Column(name = "fotos", columnDefinition = "TEXT")
    private String fotos;

    @Column(name = "proxima_inspecao")
    private LocalDate proximaInspecao;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
