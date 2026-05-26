package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class LgpdExportResponse {

    private DadosPessoais dadosPessoais;
    private DadosEmpresa dadosEmpresa;
    private List<RegistroAuditoria> registrosDeAuditoria;
    private LocalDateTime dataExportacao;

    @Data
    @Builder
    public static class DadosPessoais {
        private UUID id;
        private String nome;
        private String email;
        private String role;
        private LocalDate vencimentoNr11;
        private LocalDate vencimentoNr35;
        private LocalDate vencimentoAso;
        private Boolean acceptedTerms;
        private Boolean acceptedPrivacyPolicy;
        private LocalDateTime consentDate;
        private LocalDateTime criadoEm;
    }

    @Data
    @Builder
    public static class DadosEmpresa {
        private UUID id;
        private String razaoSocial;
        private String cnpj;
    }

    @Data
    @Builder
    public static class RegistroAuditoria {
        private UUID id;
        private String operacaoOs;
        private String status;
        private LocalDateTime criadoEm;
        private LocalDateTime resolvidoEm;
    }
}
