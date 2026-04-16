package com.riggingcheck.riggingcheckapi.shared;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class RiskCalculatorTest {

    // ── fromUsagePercent ─────────────────────────────────────────────────────────

    @Test
    void fromUsagePercent_belowSafeThreshold_returnsSafe() {
        assertThat(RiskCalculator.fromUsagePercent(0.0)).isEqualTo("SAFE");
        assertThat(RiskCalculator.fromUsagePercent(50.0)).isEqualTo("SAFE");
        assertThat(RiskCalculator.fromUsagePercent(69.99)).isEqualTo("SAFE");
    }

    @Test
    void fromUsagePercent_exactlySafeThreshold_returnsWarning() {
        // 70.0 is NOT below 70 → WARNING
        assertThat(RiskCalculator.fromUsagePercent(70.0)).isEqualTo("WARNING");
    }

    @Test
    void fromUsagePercent_betweenThresholds_returnsWarning() {
        assertThat(RiskCalculator.fromUsagePercent(75.0)).isEqualTo("WARNING");
        assertThat(RiskCalculator.fromUsagePercent(80.0)).isEqualTo("WARNING");
        assertThat(RiskCalculator.fromUsagePercent(89.99)).isEqualTo("WARNING");
    }

    @Test
    void fromUsagePercent_exactlyWarningThreshold_returnsDanger() {
        // 90.0 is NOT below 90 → DANGER
        assertThat(RiskCalculator.fromUsagePercent(90.0)).isEqualTo("DANGER");
    }

    @Test
    void fromUsagePercent_aboveWarningThreshold_returnsDanger() {
        assertThat(RiskCalculator.fromUsagePercent(95.0)).isEqualTo("DANGER");
        assertThat(RiskCalculator.fromUsagePercent(100.0)).isEqualTo("DANGER");
        assertThat(RiskCalculator.fromUsagePercent(200.0)).isEqualTo("DANGER");
    }

    // ── worst ────────────────────────────────────────────────────────────────────

    @Test
    void worst_safeVsWarning_returnsWarning() {
        assertThat(RiskCalculator.worst("SAFE", "WARNING")).isEqualTo("WARNING");
        assertThat(RiskCalculator.worst("WARNING", "SAFE")).isEqualTo("WARNING");
    }

    @Test
    void worst_safeVsDanger_returnsDanger() {
        assertThat(RiskCalculator.worst("SAFE", "DANGER")).isEqualTo("DANGER");
        assertThat(RiskCalculator.worst("DANGER", "SAFE")).isEqualTo("DANGER");
    }

    @Test
    void worst_warningVsDanger_returnsDanger() {
        assertThat(RiskCalculator.worst("WARNING", "DANGER")).isEqualTo("DANGER");
        assertThat(RiskCalculator.worst("DANGER", "WARNING")).isEqualTo("DANGER");
    }

    @Test
    void worst_equalLevels_returnsSameLevel() {
        assertThat(RiskCalculator.worst("SAFE", "SAFE")).isEqualTo("SAFE");
        assertThat(RiskCalculator.worst("WARNING", "WARNING")).isEqualTo("WARNING");
        assertThat(RiskCalculator.worst("DANGER", "DANGER")).isEqualTo("DANGER");
    }
}
