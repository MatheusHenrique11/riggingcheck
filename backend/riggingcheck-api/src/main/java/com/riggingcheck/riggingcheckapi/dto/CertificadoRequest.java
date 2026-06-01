package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CertificadoRequest {

    @NotBlank(message = "Número do certificado é obrigatório")
    private String numeroCertificado;

    private String emissor;

    @NotNull(message = "Data de emissão é obrigatória")
    private LocalDate dataEmissao;

    @NotNull(message = "Data de validade é obrigatória")
    private LocalDate dataValidade;

    private String arquivoUrl;
    private String observacoes;
}
