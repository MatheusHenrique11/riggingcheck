package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterEmpresaRequest {
    @NotBlank(message = "Razão social é obrigatória")
    @Size(min = 2, max = 255, message = "Razão social deve ter entre 2 e 255 caracteres")
    private String razaoSocial;

    @NotBlank(message = "CNPJ é obrigatório")
    @Pattern(regexp = "\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}", message = "CNPJ inválido")
    private String cnpj;

    @NotBlank(message = "Nome do administrador é obrigatório")
    @Size(min = 2, max = 255, message = "Nome deve ter entre 2 e 255 caracteres")
    private String adminName;

    @NotBlank(message = "Email do administrador é obrigatório")
    @Email(message = "Email inválido")
    private String adminEmail;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 8, message = "Senha deve ter no mínimo 8 caracteres")
    private String adminPassword;
}