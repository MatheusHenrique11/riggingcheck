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
 * Testes de integração para POST /api/sling/calculate.
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
class SlingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String URL = "/api/sling/calculate";

    // ── Caminho feliz ────────────────────────────────────────────────────────────

    @Test
    void calculate_validRequest60Degrees_returns200WithAllFields() throws Exception {
        String body = """
                {
                  "loadWeight": 10000,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 60.0,
                  "wll": 9000,
                  "temManilha": false
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tensionPerLeg").isNumber())
                .andExpect(jsonPath("$.loadFactor").isNumber())
                .andExpect(jsonPath("$.wllUsagePercent").isNumber())
                .andExpect(jsonPath("$.riskLevel").exists())
                .andExpect(jsonPath("$.angleWarning").value(false));
    }

    @Test
    void calculate_90Degrees_tensionEqualsHalfLoad() throws Exception {
        // sin(90°) = 1 → tensão/perna = 10000/2 = 5000 kg
        String body = """
                {
                  "loadWeight": 10000,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 90.0,
                  "wll": 8000,
                  "temManilha": false
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tensionPerLeg").value(5000.0))
                .andExpect(jsonPath("$.angleWarning").value(false));
    }

    @Test
    void calculate_angleBelow45_returnsAngleWarningTrue() throws Exception {
        String body = """
                {
                  "loadWeight": 5000,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 30.0,
                  "wll": 5000,
                  "temManilha": false
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.angleWarning").value(true));
    }

    @Test
    void calculate_withCompatibleShackle_returnsManilhaCompativel() throws Exception {
        // tensão/perna = 5000 kg (90°, 2 pernas, 10000kg); manilha = 6000 kg → compatível
        String body = """
                {
                  "loadWeight": 10000,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 90.0,
                  "wll": 8000,
                  "temManilha": true,
                  "manilhaCapacidadeKg": 6000
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temManilha").value(true))
                .andExpect(jsonPath("$.manilhaCompativel").value(true))
                .andExpect(jsonPath("$.manilhaCapacidadeKg").value(6000.0));
    }

    @Test
    void calculate_withIncompatibleShackle_returnsManilhaIncompativel() throws Exception {
        // tensão/perna = 5000 kg; manilha = 3000 kg → incompatível
        String body = """
                {
                  "loadWeight": 10000,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 90.0,
                  "wll": 8000,
                  "temManilha": true,
                  "manilhaCapacidadeKg": 3000
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.manilhaCompativel").value(false))
                .andExpect(jsonPath("$.riskLevel").value("DANGER"));
    }

    // ── Segurança ────────────────────────────────────────────────────────────────

    @Test
    void calculate_unauthenticated_returnsAccessDenied() throws Exception {
        // Spring Security 7 sem AuthenticationEntryPoint configurado → 403
        String body = """
                {
                  "loadWeight": 5000,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 60.0,
                  "wll": 5000,
                  "temManilha": false
                }
                """;

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    // ── Validação de entrada ─────────────────────────────────────────────────────

    @Test
    void calculate_negativeLoadWeight_returns400() throws Exception {
        String body = """
                {
                  "loadWeight": -1,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 60.0,
                  "wll": 5000,
                  "temManilha": false
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void calculate_angleBelowMinimum_returns400() throws Exception {
        // @DecimalMin(1.0) — ângulo 0 deve ser rejeitado
        String body = """
                {
                  "loadWeight": 5000,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 0,
                  "wll": 5000,
                  "temManilha": false
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void calculate_angleAboveMaximum_returns400() throws Exception {
        // @DecimalMax(90.0) — ângulo 91 deve ser rejeitado
        String body = """
                {
                  "loadWeight": 5000,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 91,
                  "wll": 5000,
                  "temManilha": false
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void calculate_nullWll_returns400() throws Exception {
        // wll é @NotNull — campo omitido deve ser rejeitado
        String body = """
                {
                  "loadWeight": 5000,
                  "numberOfLegs": 2,
                  "angleFromHorizontal": 60.0,
                  "temManilha": false
                }
                """;

        mockMvc.perform(post(URL)
                        .with(user("testuser"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
