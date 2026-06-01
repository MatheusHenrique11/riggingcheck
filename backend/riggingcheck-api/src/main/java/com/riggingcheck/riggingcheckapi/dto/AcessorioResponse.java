package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AcessorioResponse {
    private UUID id;
    private UUID empresaId;
    private String codigoInterno;
    private String tipo;
    private String descricao;
    private String fabricante;
    private String modelo;
    private String numeroSerie;
    private Double capacidadeWllKg;
    private String unidade;
    private LocalDate dataFabricacao;
    private LocalDateTime dataCadastro;
    private String status;
    private String localizacao;
    private String observacoes;
    private String cadastradoPorNome;
    private CertificadoResponse ultimoCertificado;
    private InspecaoResponse ultimaInspecao;
}
