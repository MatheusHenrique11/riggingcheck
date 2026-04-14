package com.riggingcheck.riggingcheckapi.shared;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioResponse;
import org.springframework.stereotype.Component;

@Component
public class FuncionarioMapper {

    public FuncionarioResponse toResponse(Funcionario f) {
        return FuncionarioResponse.builder()
                .id(f.getId())
                .nome(f.getNome())
                .email(f.getEmail())
                .role(f.getRole().name())
                .ativo(f.getAtivo())
                .criadoEm(f.getCriadoEm())
                .build();
    }
}
