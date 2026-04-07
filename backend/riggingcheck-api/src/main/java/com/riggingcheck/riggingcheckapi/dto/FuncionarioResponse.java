package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class FuncionarioResponse {
    private UUID id;
    private String nome;
    private String email;
    private String role;
    private Boolean ativo;
    private LocalDateTime criadoEm;
}
