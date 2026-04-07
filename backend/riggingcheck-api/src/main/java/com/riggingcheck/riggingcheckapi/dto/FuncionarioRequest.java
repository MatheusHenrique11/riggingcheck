package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FuncionarioRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 6, message = "Senha deve ter pelo menos 6 caracteres")
    private String senha;

    @NotBlank(message = "Cargo é obrigatório")
    private String role; // RIGGER, GERENTE_OPERACOES, ADMIN_EMPRESA (apenas SUPER_ADMIN)
}
