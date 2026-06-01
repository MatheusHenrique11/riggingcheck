package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class InventoryHealthResponse {

    private int totalAcessorios;
    private int ativos;
    private int bloqueados;
    private int certificadosVencidos;
    private int certificadosAVencer;
    private int inspecoesVencidas;
    private int semCertificado;
    private int semInspecao;
    private List<PorTipo> porTipo;
    private List<ItemCritico> itensCriticos;

    @Data
    @Builder
    public static class PorTipo {
        private String tipo;
        private int total;
        private int bloqueados;
        private int alertas;
    }

    @Data
    @Builder
    public static class ItemCritico {
        private UUID id;
        private String codigoInterno;
        private String tipo;
        private String status;
        private String motivo;
        private String dataLimite;
    }
}
