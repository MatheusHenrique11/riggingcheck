package com.riggingcheck.riggingcheckapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ApprovalCommentRequest(
        @NotBlank @Size(max = 2000)
        String content,

        String fieldRef
) {}
