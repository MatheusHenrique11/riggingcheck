package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class LiberacaoResponse {
    private UUID id;
    private String empresaNome;
    private String operacaoOs;
    private String riggerNome;
    private String status;
    private String aprovadoPorNome;
    private String observacao;
    private LocalDateTime criadoEm;
    private LocalDateTime resolvidoEm;

    // Dados de Capacidade
    private Double capGuindasteKg;
    private Double capCargaKg;
    private Double capAparelhoKg;
    private Double capTotalKg;
    private Double capUsoPercent;
    private String capRisco;

    // Dados de Eslinga
    private Integer eslNumPernas;
    private Double eslAnguloGraus;
    private Double eslTensaoPorPernaKg;
    private Double eslFatorCarga;
    private String eslRisco;
    private Boolean eslAnguloAviso;
}
