package com.riggingcheck.riggingcheckapi.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para POST /api/capacity/verify.
 * Usa contexto Spring completo com banco H2 em memória.
 *
 * Nota: @WithMockUser não é compatível com Spring Security 7 (SecurityContextHolderFilter
 * usa contexto deferido). Usamos .with(user(...)) que integra corretamente.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
class CapacityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String URL = "/api/capacity/verify";

    // ── Caminho feliz ────────────────────────────────────────────────────────────

    @Test
    void verify_safeLoad_returns200WithCorrectRisk() throws Exception {
        // 5500 / 10000 = 55% → SAFE, approved = true
        String body = """
                {
                  "craneCapacity": 10000,
                  "loadWeight": 5000,
                  "riggingWeight": 500
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLoad").value(5500.0))
                .andExpect(jsonPath("$.usagePercent").isNumber())
                .andExpect(jsonPath("$.availableMargin").value(4500.0))
                .andExpect(jsonPath("$.riskLevel").value("SAFE"))
                .andExpect(jsonPath("$.approved").value(true));
    }

    @Test
    void verify_dangerLoad_returns200WithDangerAndNotApproved() throws Exception {
        // 9500 / 10000 = 95% → DANGER, approved = false
        String body = """
                {
                  "craneCapacity": 10000,
                  "loadWeight": 9000,
                  "riggingWeight": 500
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.riskLevel").value("DANGER"))
                .andExpect(jsonPath("$.approved").value(false));
    }

    @Test
    void verify_warningLoad_returns200WithWarningAndApproved() throws Exception {
        // 8000 / 10000 = 80% → WARNING, approved = true (< 90%)
        String body = """
                {
                  "craneCapacity": 10000,
                  "loadWeight": 7500,
                  "riggingWeight": 500
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.riskLevel").value("WARNING"))
                .andExpect(jsonPath("$.approved").value(true));
    }

    // ── Segurança ────────────────────────────────────────────────────────────────

    @Test
    void verify_unauthenticated_returnsAccessDenied() throws Exception {
        // Spring Security 7 sem AuthenticationEntryPoint configurado →
        // acesso anônimo retorna 403 (Http403ForbiddenEntryPoint padrão)
        String body = """
                {
                  "craneCapacity": 10000,
                  "loadWeight": 5000,
                  "riggingWeight": 500
                }
                """;

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    // ── Validação de entrada ─────────────────────────────────────────────────────

    @Test
    void verify_craneCapacityZero_returns400() throws Exception {
        // @Positive exige > 0; craneCapacity=0 deve ser rejeitado
        String body = """
                {
                  "craneCapacity": 0,
                  "loadWeight": 5000,
                  "riggingWeight": 500
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verify_negativeLoadWeight_returns400() throws Exception {
        // @PositiveOrZero exige >= 0; loadWeight=-1 deve ser rejeitado
        String body = """
                {
                  "craneCapacity": 10000,
                  "loadWeight": -1,
                  "riggingWeight": 500
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verify_negativeRiggingWeight_returns400() throws Exception {
        String body = """
                {
                  "craneCapacity": 10000,
                  "loadWeight": 5000,
                  "riggingWeight": -100
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verify_emptyBody_returns400() throws Exception {
        // craneCapacity omitido → padrão double 0.0 → @Positive falha
        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
