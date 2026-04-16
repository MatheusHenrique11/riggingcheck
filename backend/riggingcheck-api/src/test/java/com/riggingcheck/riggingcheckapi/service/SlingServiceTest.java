package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.dto.SlingCalculateRequest;
import com.riggingcheck.riggingcheckapi.dto.SlingCalculateResponse;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

/**
 * Testa o serviço de cálculo de lingada.
 *
 * Fórmula principal:
 *   tensão/perna = (carga / pernas) * (1 / sin(ângulo))
 *
 * Limites NR-11 / ABNT NBR 13541:
 *   ângulo < 45°  → aviso obrigatório
 *   WLL usage < 70% → SAFE
 *   WLL usage 70-89.99% → WARNING
 *   WLL usage >= 90% → DANGER
 */
class SlingServiceTest {

    private SlingService service;

    @BeforeEach
    void setUp() {
        service = new SlingService();
    }

    // ── Tensão por perna ─────────────────────────────────────────────────────────

    @Test
    void calculate_90degrees_tensionEqualsLoadDividedByLegs() {
        // sin(90°) = 1 → tensão = carga / pernas
        SlingCalculateRequest req = new SlingCalculateRequest(4_000, 2, 90.0, 3_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.tensionPerLeg()).isCloseTo(2_000.0, within(0.01));
    }

    @Test
    void calculate_60degrees_tensionIsCorrect() {
        // sin(60°) = √3/2 ≈ 0.8660; tensão = (10000/2) / 0.8660 ≈ 5773.5
        SlingCalculateRequest req = new SlingCalculateRequest(10_000, 2, 60.0, 9_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        double expected = (10_000.0 / 2) / Math.sin(Math.toRadians(60));
        assertThat(res.tensionPerLeg()).isCloseTo(expected, within(0.1));
    }

    @Test
    void calculate_4legs_90degrees_tensionIsQuarterOfLoad() {
        SlingCalculateRequest req = new SlingCalculateRequest(8_000, 4, 90.0, 5_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.tensionPerLeg()).isCloseTo(2_000.0, within(0.01));
    }

    // ── Aviso de ângulo ──────────────────────────────────────────────────────────

    @Test
    void calculate_angleLessThan45_triggersAngleWarning() {
        SlingCalculateRequest req = new SlingCalculateRequest(5_000, 2, 30.0, 5_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.angleWarning()).isTrue();
    }

    @Test
    void calculate_angleExactly45_noAngleWarning() {
        SlingCalculateRequest req = new SlingCalculateRequest(5_000, 2, 45.0, 5_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.angleWarning()).isFalse();
    }

    @Test
    void calculate_angleAbove45_noAngleWarning() {
        SlingCalculateRequest req = new SlingCalculateRequest(5_000, 2, 60.0, 5_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.angleWarning()).isFalse();
    }

    // ── Percentual de uso do WLL e nível de risco ────────────────────────────────

    @Test
    void calculate_wllUsagePercent_calculatedCorrectly() {
        // 90°, 2 pernas, 4000 kg → tensão = 2000; wll = 4000 → uso = 50% → SAFE
        SlingCalculateRequest req = new SlingCalculateRequest(4_000, 2, 90.0, 4_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.wllUsagePercent()).isCloseTo(50.0, within(0.01));
        assertThat(res.riskLevel()).isEqualTo("SAFE");
    }

    @Test
    void calculate_wllUsageAbove90_returnsDanger() {
        // tensão = 2000; wll = 2000 → uso = 100% → DANGER
        SlingCalculateRequest req = new SlingCalculateRequest(4_000, 2, 90.0, 2_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.wllUsagePercent()).isCloseTo(100.0, within(0.01));
        assertThat(res.riskLevel()).isEqualTo("DANGER");
    }

    // ── Manilha (shackle) ────────────────────────────────────────────────────────

    @Test
    void calculate_withCompatibleShackle_returnsCorrectManilhaData() {
        // tensão = 2000 kg; manilha = 3000 kg → compatível, uso = 66.7%
        SlingCalculateRequest req = new SlingCalculateRequest(4_000, 2, 90.0, 4_000.0, true, 3_000.0);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.temManilha()).isTrue();
        assertThat(res.manilhaCompativel()).isTrue();
        assertThat(res.manilhaUsoPercent()).isCloseTo((2_000.0 / 3_000.0) * 100, within(0.1));
        assertThat(res.manilhaCapacidadeKg()).isEqualTo(3_000.0);
    }

    @Test
    void calculate_withIncompatibleShackle_setsManilhaCompativelFalseAndElevatesRisk() {
        // tensão = 2000 kg; manilha = 1500 kg → incompatível, uso = 133% → DANGER
        // WLL uso = 50% → SAFE; worst(SAFE, DANGER) = DANGER
        SlingCalculateRequest req = new SlingCalculateRequest(4_000, 2, 90.0, 4_000.0, true, 1_500.0);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.manilhaCompativel()).isFalse();
        assertThat(res.manilhaUsoPercent()).isCloseTo((2_000.0 / 1_500.0) * 100, within(0.1));
        assertThat(res.riskLevel()).isEqualTo("DANGER");
    }

    @Test
    void calculate_withoutShackle_manilhaFieldsAreNull() {
        SlingCalculateRequest req = new SlingCalculateRequest(4_000, 2, 90.0, 4_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.temManilha()).isFalse();
        assertThat(res.manilhaCompativel()).isNull();
        assertThat(res.manilhaUsoPercent()).isNull();
        assertThat(res.manilhaCapacidadeKg()).isNull();
    }

    // ── Validação de manilha ─────────────────────────────────────────────────────

    @Test
    void calculate_shackleRequiredButNoCapacity_throwsRegraDeNegocioException() {
        SlingCalculateRequest req = new SlingCalculateRequest(4_000, 2, 90.0, 4_000.0, true, null);

        assertThatThrownBy(() -> service.calculate(req))
            .isInstanceOf(RegraDeNegocioException.class)
            .hasMessageContaining("manilha");
    }

    @Test
    void calculate_shackleRequiredWithZeroCapacity_throwsRegraDeNegocioException() {
        SlingCalculateRequest req = new SlingCalculateRequest(4_000, 2, 90.0, 4_000.0, true, 0.0);

        assertThatThrownBy(() -> service.calculate(req))
            .isInstanceOf(RegraDeNegocioException.class);
    }

    // ── Proteção SIN_MINIMO (ângulo próximo de zero) ──────────────────────────────

    @Test
    void calculate_verySmallAngle_doesNotProduceInfinityOrNaN() {
        // Ângulo mínimo aceito pelo @DecimalMin é 1°; SIN_MINIMO garante tensão finita
        SlingCalculateRequest req = new SlingCalculateRequest(1_000, 1, 1.0, 50_000.0, false, null);
        SlingCalculateResponse res = service.calculate(req);

        assertThat(res.tensionPerLeg()).isFinite().isPositive();
        assertThat(res.loadFactor()).isFinite().isPositive();
    }
}
