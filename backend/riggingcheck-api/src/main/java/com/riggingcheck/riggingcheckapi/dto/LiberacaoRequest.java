package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LiberacaoRequest {
    @NotBlank(message = "Número da OS é obrigatório")
    private String operacaoOs;

    @NotBlank(message = "Nome do Rigger é obrigatório")
    private String riggerNome;
}
