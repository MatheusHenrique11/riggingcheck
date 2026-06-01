package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AlertSummaryResponse {

    private long totalNovo;
    private long totalVisualizado;
    private long totalAtivo;
    private long bloqueados;
    private long restritos;
    private long avisos;
    private long infos;
    private int gerados;
    private List<PorTipo> porTipo;

    @Data
    @Builder
    public static class PorTipo {
        private String tipo;
        private long count;
        private String severidade;
    }
}
