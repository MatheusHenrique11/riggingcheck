package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CertificadoResponse {
    private UUID id;
    private UUID acessorioId;
    private String numeroCertificado;
    private String emissor;
    private LocalDate dataEmissao;
    private LocalDate dataValidade;
    private String arquivoUrl;
    private String status;
    private String observacoes;
    private LocalDateTime criadoEm;
}
