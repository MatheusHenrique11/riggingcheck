package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LiberacaoRequest {

    @NotBlank(message = "Número da OS é obrigatório")
    private String operacaoOs;

    @NotBlank(message = "Nome do Rigger é obrigatório")
    private String riggerNome;

    @NotNull(message = "Dados de capacidade são obrigatórios")
    private DadosCapacidade dadosCapacidade;

    @NotNull(message = "Dados de eslinga são obrigatórios")
    private DadosEslinga dadosEslinga;

    @Data
    public static class DadosCapacidade {
        private Double capGuindasteKg;
        private Double capCargaKg;
        private Double capAparelhoKg;
        private Double capTotalKg;
        private Double capUsoPercent;
        private String capRisco;
    }

    @Data
    public static class DadosEslinga {
        private Integer eslNumPernas;
        private Double eslAnguloGraus;
        private Double eslTensaoPorPernaKg;
        private Double eslFatorCarga;
        private String eslRisco;
        private Boolean eslAnguloAviso;
    }
}
