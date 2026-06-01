package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class RiggingPlanAccessoryResponse {
    private UUID id;
    private UUID solicitacaoLiberacaoId;
    private UUID acessorioId;
    private String codigoInternoSnapshot;
    private String tipoSnapshot;
    private String descricaoSnapshot;
    private Double wllKgSnapshot;
    private String statusSnapshot;
    private String certificadoStatusSnapshot;
    private String ultimaInspecaoResultadoSnapshot;
    private Double cargaAplicadaKg;
    private String observacao;
    private LocalDateTime createdAt;
}
