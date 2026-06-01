package com.riggingcheck.riggingcheckapi.dto;

/**
 * DTO de validação pública de plano aprovado — Fase 20.
 * Expõe apenas dados mínimos, sem informações sensíveis.
 * Retornado por GET /api/public/planos/{token}/validacao (sem autenticação).
 */
public record PublicPlanValidationResponse(

    // Identificação do plano
    String codigoPlano,
    String empresaNome,
    String localOperacao,
    String dataOperacao,

    // Status técnico e de aprovação
    String statusTecnico,
    String statusAprovacao,
    String resultadoCompliance,

    // Aprovação
    String dataAprovacao,
    String aprovadorCargo,
    String versaoPlano,

    // Recursos vinculados (apenas contagens)
    int quantidadeAcessorios,
    int quantidadeMembrosEquipe,

    // Resultado da validação
    String mensagemValidacao,
    String dataGeracaoConsulta
) {}
