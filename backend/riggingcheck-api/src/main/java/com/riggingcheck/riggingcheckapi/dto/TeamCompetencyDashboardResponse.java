package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TeamCompetencyDashboardResponse {

    private int totalFuncionarios;
    private int aptos;
    private int bloqueados;
    private int aVencer;
    private int asoVencido;
    private int nr11Vencida;
    private int nr35Vencida;

    private List<PorFuncao> porFuncao;
    private List<ItemCritico> itensCriticos;

    @Data
    @Builder
    public static class PorFuncao {
        private String funcao;
        private int total;
        private int aptos;
        private int bloqueados;
        private int aVencer;
    }

    @Data
    @Builder
    public static class ItemCritico {
        private UUID funcionarioId;
        private String nome;
        private String funcao;
        private String motivo;
        private String dataVencimento;
        private String severidade;
    }
}
