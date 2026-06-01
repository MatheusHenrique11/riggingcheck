package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class InspecaoResponse {
    private UUID id;
    private UUID acessorioId;
    private String inspetorNome;
    private LocalDate dataInspecao;
    private String resultado;
    private String observacoes;
    private String fotos;
    private LocalDate proximaInspecao;
    private LocalDateTime criadoEm;
}
