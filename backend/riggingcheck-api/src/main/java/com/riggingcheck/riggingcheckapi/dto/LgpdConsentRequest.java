package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LgpdConsentRequest {

    @NotNull(message = "Aceite dos termos é obrigatório")
    private Boolean acceptedTerms;

    @NotNull(message = "Aceite da política de privacidade é obrigatório")
    private Boolean acceptedPrivacyPolicy;
}
