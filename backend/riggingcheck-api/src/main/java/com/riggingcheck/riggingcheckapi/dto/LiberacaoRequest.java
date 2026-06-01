package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

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

    /** Lista opcional de acessórios selecionados no Wizard. Null ou vazia = sem vínculos. */
    private List<AcessorioVinculoRequest> acessorios;

    /** Dados operacionais completos do Wizard — opcional para compatibilidade. */
    private DadosOperacionais dadosOperacionais;

    /** Itens individuais do checklist NR-11 / N-2869. */
    private List<ChecklistItemRequest> checklistItens;

    /** JSON serializado do módulo Petrobras N-2869 — opcional. */
    private String petrobrasDataJson;

    @Data
    public static class DadosOperacionais {
        private String localOperacao;
        private LocalDate dataOperacao;
        private String supervisorNome;
        private String descricaoAtividade;
    }

    @Data
    public static class ChecklistItemRequest {
        @NotBlank(message = "Código do item é obrigatório")
        private String codigoItem;
        private String categoriaItem;
        private String perguntaItem;
        private Boolean respondido;
    }

    @Data
    public static class AcessorioVinculoRequest {
        @NotNull(message = "ID do acessório é obrigatório")
        private UUID acessorioId;
        private Double cargaAplicadaKg;
        private String observacao;
    }

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
        private Double eslWllKg;
        private Double eslWllUsoPercent;
        private Boolean eslTemManilha;
        private Double eslManilhaCapacidadeKg;
        private Double eslManilhaUsoPercent;
        private Boolean eslManilhaCompativel;
    }
}
