package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.StatusCertificado;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "certificados_acessorio")
@Data
public class CertificadoAcessorio {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "acessorio_id", nullable = false)
    private UUID acessorioId;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "numero_certificado", nullable = false, length = 200)
    private String numeroCertificado;

    @Column(name = "emissor", length = 300)
    private String emissor;

    @Column(name = "data_emissao")
    private LocalDate dataEmissao;

    @Column(name = "data_validade")
    private LocalDate dataValidade;

    @Column(name = "arquivo_url", length = 1000)
    private String arquivoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(20)")
    private StatusCertificado status;

    @Column(name = "observacoes", columnDefinition = "TEXT")
    private String observacoes;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
        if (status == null) status = StatusCertificado.VALIDO;
    }
}
