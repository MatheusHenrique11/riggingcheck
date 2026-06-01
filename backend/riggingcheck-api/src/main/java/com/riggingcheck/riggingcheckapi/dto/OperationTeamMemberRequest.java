package com.riggingcheck.riggingcheckapi.dto;

import com.riggingcheck.riggingcheckapi.domain.enums.FuncaoOperacional;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record OperationTeamMemberRequest(

    @NotNull(message = "funcionarioId é obrigatório")
    UUID funcionarioId,

    @NotNull(message = "funcaoOperacional é obrigatória")
    FuncaoOperacional funcaoOperacional,

    Boolean responsavel,

    String observacao
) {}
