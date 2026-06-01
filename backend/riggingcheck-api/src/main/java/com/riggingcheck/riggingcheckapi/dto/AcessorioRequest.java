package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AcessorioRequest {

    @NotBlank(message = "Código interno é obrigatório")
    private String codigoInterno;

    @NotBlank(message = "Tipo é obrigatório")
    private String tipo;

    @NotBlank(message = "Descrição é obrigatória")
    private String descricao;

    private String fabricante;
    private String modelo;
    private String numeroSerie;

    @NotNull(message = "Capacidade WLL é obrigatória")
    @Positive(message = "Capacidade WLL deve ser positiva")
    private Double capacidadeWllKg;

    private String unidade;
    private LocalDate dataFabricacao;
    private String localizacao;
    private String observacoes;
}
