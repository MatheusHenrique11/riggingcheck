package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Resposta pública do acessório — sem dados sensíveis da empresa ou do usuário.
 * Exibida via QR Code sem autenticação.
 */
@Data
@Builder
public class PublicAcessorioResponse {

    private UUID id;
    private String codigoInterno;
    private String tipo;
    private String descricao;
    private String fabricante;
    private String modelo;
    private Double capacidadeWllKg;

    // Status do acessório
    private String statusAcessorio;

    // Dados do certificado (sem emissor, sem URL de arquivo)
    private String statusCertificado;
    private LocalDate validadeCertificado;

    // Dados da última inspeção (sem nome do inspetor)
    private String resultadoUltimaInspecao;
    private LocalDate dataUltimaInspecao;
    private LocalDate proximaInspecao;

    // Mensagem calculada para exibição principal
    private String mensagemStatus;
    private String corStatus; // HEX: #22c55e / #f59e0b / #ef4444
}
