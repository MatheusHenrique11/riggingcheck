package com.riggingcheck.riggingcheckapi.dto;

import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class LoginResponse {
    private String token;
    private UUID userId;
    private String userName;
    private RoleEnum role;
    private UUID empresaId;
    private String empresaName;
}