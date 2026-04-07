package com.riggingcheck.riggingcheckapi.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class LiberacaoResponse {
    private UUID id;
    private String operacaoOs;
    private String riggerNome;
    private String status;
    private String aprovadoPorNome;
    private String observacao;
    private LocalDateTime criadoEm;
    private LocalDateTime resolvidoEm;
}
