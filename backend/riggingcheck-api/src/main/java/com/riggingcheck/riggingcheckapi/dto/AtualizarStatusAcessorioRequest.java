package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AtualizarStatusAcessorioRequest {

    @NotBlank(message = "Novo status é obrigatório")
    private String status;

    @Size(max = 1000)
    private String motivo;
}
