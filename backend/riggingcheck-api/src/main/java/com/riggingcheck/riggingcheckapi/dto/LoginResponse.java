package com.riggingcheck.riggingcheckapi.dto;

import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.SubscriptionStatus;
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
    private String empresaCnpj;
    private SubscriptionStatus subscriptionStatus;
    private Boolean acceptedTerms;
    private Boolean acceptedPrivacyPolicy;
}