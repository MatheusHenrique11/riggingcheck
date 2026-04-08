package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class EmpresaAdminResponse {
    private UUID id;
    private String razaoSocial;
    private String cnpj;
    private Boolean ativo;
    private LocalDateTime criadoEm;
    private String adminNome;
    private String adminEmail;
    private long totalFuncionarios;
}
