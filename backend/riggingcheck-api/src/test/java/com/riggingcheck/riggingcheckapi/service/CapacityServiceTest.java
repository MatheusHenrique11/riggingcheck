package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.dto.CapacityVerifyRequest;
import com.riggingcheck.riggingcheckapi.dto.CapacityVerifyResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Testa o serviço de verificação de capacidade do guindaste.
 * Thresholds (ABNT NBR 11900 / NR-11):
 *   < 70%  → SAFE    (approved = true)
 *   70-89% → WARNING (approved = true)
 *   >= 90% → DANGER  (approved = false)
 */
class CapacityServiceTest {

    private CapacityService service;

    @BeforeEach
    void setUp() {
        service = new CapacityService();
    }

    // ── Cálculo de carga total ───────────────────────────────────────────────────

    @Test
    void verify_totalLoadIsSumOfLoadAndRigging() {
        CapacityVerifyRequest req = new CapacityVerifyRequest(10_000, 5_000, 500);
        CapacityVerifyResponse res = service.verify(req);
        assertThat(res.totalLoad()).isEqualTo(5_500.0);
    }

    @Test
    void verify_zeroRiggingWeight_totalLoadEqualsLoadWeight() {
        CapacityVerifyRequest req = new CapacityVerifyRequest(10_000, 6_000, 0);
        CapacityVerifyResponse res = service.verify(req);
        assertThat(res.totalLoad()).isEqualTo(6_000.0);
    }

    @Test
    void verify_availableMarginIsCorrect() {
        CapacityVerifyRequest req = new CapacityVerifyRequest(10_000, 5_000, 500);
        CapacityVerifyResponse res = service.verify(req);
        assertThat(res.availableMargin()).isEqualTo(4_500.0);
    }

    // ── Zona SAFE (<70%) ─────────────────────────────────────────────────────────

    @Test
    void verify_safeLoad_returnsSafeAndApproved() {
        // 5500 / 10000 = 55% → SAFE
        CapacityVerifyRequest req = new CapacityVerifyRequest(10_000, 5_000, 500);
        CapacityVerifyResponse res = service.verify(req);

        assertThat(res.usagePercent()).isCloseTo(55.0, within(0.001));
        assertThat(res.riskLevel()).isEqualTo("SAFE");
        assertThat(res.approved()).isTrue();
    }

    // ── Zona WARNING (70-89.99%) ─────────────────────────────────────────────────

    @Test
    void verify_exactSafeThreshold_returnsWarningAndApproved() {
        // 7000 / 10000 = 70% — primeira entrada em WARNING
        CapacityVerifyRequest req = new CapacityVerifyRequest(10_000, 6_500, 500);
        CapacityVerifyResponse res = service.verify(req);

        assertThat(res.usagePercent()).isEqualTo(70.0);
        assertThat(res.riskLevel()).isEqualTo("WARNING");
        assertThat(res.approved()).isTrue();
    }

    @Test
    void verify_midWarning_returnsWarningAndApproved() {
        // 8000 / 10000 = 80% → WARNING
        CapacityVerifyRequest req = new CapacityVerifyRequest(10_000, 7_500, 500);
        CapacityVerifyResponse res = service.verify(req);

        assertThat(res.usagePercent()).isEqualTo(80.0);
        assertThat(res.riskLevel()).isEqualTo("WARNING");
        assertThat(res.approved()).isTrue();
    }

    // ── Zona DANGER (>=90%) ──────────────────────────────────────────────────────

    @Test
    void verify_exactWarningThreshold_returnsDangerAndNotApproved() {
        // 9000 / 10000 = 90% — primeira entrada em DANGER
        CapacityVerifyRequest req = new CapacityVerifyRequest(10_000, 8_500, 500);
        CapacityVerifyResponse res = service.verify(req);

        assertThat(res.usagePercent()).isEqualTo(90.0);
        assertThat(res.riskLevel()).isEqualTo("DANGER");
        assertThat(res.approved()).isFalse();
    }

    @Test
    void verify_overloadedCrane_returnsDangerAndNotApproved() {
        // 9500 / 10000 = 95% → DANGER
        CapacityVerifyRequest req = new CapacityVerifyRequest(10_000, 9_000, 500);
        CapacityVerifyResponse res = service.verify(req);

        assertThat(res.usagePercent()).isEqualTo(95.0);
        assertThat(res.riskLevel()).isEqualTo("DANGER");
        assertThat(res.approved()).isFalse();
    }

    @Test
    void verify_loadExceedsCraneCapacity_returnsDanger() {
        // 11000 / 10000 = 110% → DANGER
        CapacityVerifyRequest req = new CapacityVerifyRequest(10_000, 10_500, 500);
        CapacityVerifyResponse res = service.verify(req);

        assertThat(res.usagePercent()).isCloseTo(110.0, within(0.001));
        assertThat(res.riskLevel()).isEqualTo("DANGER");
        assertThat(res.approved()).isFalse();
        assertThat(res.availableMargin()).isCloseTo(-1_000.0, within(0.001));
    }
}
