package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class InspecaoRequest {

    @NotNull(message = "Data da inspeção é obrigatória")
    private LocalDate dataInspecao;

    @NotBlank(message = "Resultado é obrigatório")
    private String resultado;

    private String observacoes;
    private String fotos;
    private LocalDate proximaInspecao;
}
