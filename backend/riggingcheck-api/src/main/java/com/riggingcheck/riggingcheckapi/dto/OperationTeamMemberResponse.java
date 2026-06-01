package com.riggingcheck.riggingcheckapi.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record OperationTeamMemberResponse(

    UUID id,
    UUID solicitacaoLiberacaoId,
    UUID funcionarioId,

    // Dados do funcionário
    String nome,
    String email,
    String role,
    String funcaoOperacional,
    Boolean responsavel,
    String observacao,

    // Status de treinamentos (VALIDO | A_VENCER | VENCIDO | AUSENTE)
    String statusNr11,
    String dataVencimentoNr11,

    String statusNr35,
    String dataVencimentoNr35,

    String statusAso,
    String dataVencimentoAso,

    // Status geral de competência (APTO | RESTRITO | BLOQUEADO)
    String competencyStatus,

    LocalDateTime createdAt
) {}
