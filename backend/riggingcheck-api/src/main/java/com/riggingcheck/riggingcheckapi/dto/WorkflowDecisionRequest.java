package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.Size;

public record WorkflowDecisionRequest(
        @Size(max = 2000)
        String justification,

        /** Obrigatório para exceção de plano BLOCKED. */
        Boolean isException
) {}
