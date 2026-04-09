package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
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

    @Column(name = "empresa_nome", nullable = false)
    private String empresaNome;

    @Column(name = "operacao_os", nullable = false)
    private String operacaoOs;

    @Column(name = "rigger_nome", nullable = false)
    private String riggerNome;

    @Column(name = "solicitado_por_id", nullable = false)
    private UUID solicitadoPorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private StatusLiberacao status;

    // ── Dados de Capacidade ──────────────────────────────────────────────────────
    @Column(name = "cap_guindaste_kg")
    private Double capGuindasteKg;

    @Column(name = "cap_carga_kg")
    private Double capCargaKg;

    @Column(name = "cap_aparelho_kg")
    private Double capAparelhoKg;

    @Column(name = "cap_total_kg")
    private Double capTotalKg;

    @Column(name = "cap_uso_percent")
    private Double capUsoPercent;

    @Column(name = "cap_risco")
    private String capRisco;

    // ── Dados de Eslinga ─────────────────────────────────────────────────────────
    @Column(name = "esl_num_pernas")
    private Integer eslNumPernas;

    @Column(name = "esl_angulo_graus")
    private Double eslAnguloGraus;

    @Column(name = "esl_tensao_por_perna_kg")
    private Double eslTensaoPorPernaKg;

    @Column(name = "esl_fator_carga")
    private Double eslFatorCarga;

    @Column(name = "esl_risco")
    private String eslRisco;

    @Column(name = "esl_angulo_aviso")
    private Boolean eslAnguloAviso;

    // ── Resolução ────────────────────────────────────────────────────────────────
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
        status = StatusLiberacao.ANALISAR;
    }
}
