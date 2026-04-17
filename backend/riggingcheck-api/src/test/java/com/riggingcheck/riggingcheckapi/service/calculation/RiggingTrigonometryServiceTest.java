package com.riggingcheck.riggingcheckapi.service.calculation;

import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class RiggingTrigonometryServiceTest {

    private RiggingTrigonometryService svc;

    @BeforeEach
    void setUp() { svc = new RiggingTrigonometryService(); }

    // ── calcSlingLength ──────────────────────────────────────────────────────

    @Test
    void calcSlingLength_pitagoras_3_4_5() {
        assertThat(svc.calcSlingLength(3.0, 4.0)).isCloseTo(5.0, within(0.001));
    }

    @Test
    void calcSlingLength_entradaZero_lancaExcecao() {
        assertThatThrownBy(() -> svc.calcSlingLength(0, 4.0))
            .isInstanceOf(RegraDeNegocioException.class);
    }

    @Test
    void calcSlingLength_entradaNegativa_lancaExcecao() {
        assertThatThrownBy(() -> svc.calcSlingLength(3.0, -1.0))
            .isInstanceOf(RegraDeNegocioException.class);
    }

    // ── calcHorizontalDistance ───────────────────────────────────────────────

    @Test
    void calcHorizontalDistance_pitagoras_5_4_3() {
        assertThat(svc.calcHorizontalDistance(5.0, 4.0)).isCloseTo(3.0, within(0.001));
    }

    @Test
    void calcHorizontalDistance_ceMenorQueHe_lancaExcecao() {
        assertThatThrownBy(() -> svc.calcHorizontalDistance(3.0, 5.0))
            .isInstanceOf(RegraDeNegocioException.class);
    }

    @Test
    void calcHorizontalDistance_ceIgualHe_retornaZero() {
        assertThat(svc.calcHorizontalDistance(5.0, 5.0)).isCloseTo(0.0, within(0.001));
    }

    // ── calcAngleDeg ─────────────────────────────────────────────────────────

    @Test
    void calcAngleDeg_90graus_heIgualCe() {
        assertThat(svc.calcAngleDeg(5.0, 5.0)).isCloseTo(90.0, within(0.001));
    }

    @Test
    void calcAngleDeg_30graus_heMetadeCe() {
        double ce = 10.0;
        double he = ce * Math.sin(Math.toRadians(30));
        assertThat(svc.calcAngleDeg(he, ce)).isCloseTo(30.0, within(0.01));
    }

    @Test
    void calcAngleDeg_45graus() {
        double ce = 10.0;
        double he = ce * Math.sin(Math.toRadians(45));
        assertThat(svc.calcAngleDeg(he, ce)).isCloseTo(45.0, within(0.01));
    }

    // ── calcSlingFromAngle ───────────────────────────────────────────────────

    @Test
    void calcSlingFromAngle_90graus_ceIgualHe() {
        assertThat(svc.calcSlingFromAngle(5.0, 90.0)).isCloseTo(5.0, within(0.001));
    }

    @Test
    void calcSlingFromAngle_30graus_ceDuploDoHeSeno() {
        double ce = svc.calcSlingFromAngle(5.0, 30.0);
        assertThat(ce * Math.sin(Math.toRadians(30))).isCloseTo(5.0, within(0.001));
    }

    @Test
    void calcSlingFromAngle_anguloZero_lancaExcecao() {
        assertThatThrownBy(() -> svc.calcSlingFromAngle(5.0, 0.0))
            .isInstanceOf(RegraDeNegocioException.class);
    }

    @Test
    void calcSlingFromAngle_anguloAcima90_lancaExcecao() {
        assertThatThrownBy(() -> svc.calcSlingFromAngle(5.0, 91.0))
            .isInstanceOf(RegraDeNegocioException.class);
    }

    // ── calcLoadFactor ───────────────────────────────────────────────────────

    @Test
    void calcLoadFactor_90graus_retorna1() {
        assertThat(svc.calcLoadFactor(90.0)).isCloseTo(1.0, within(0.001));
    }

    @Test
    void calcLoadFactor_30graus_retorna2() {
        assertThat(svc.calcLoadFactor(30.0)).isCloseTo(2.0, within(0.001));
    }

    @Test
    void calcLoadFactor_45graus_retornaRaiz2() {
        assertThat(svc.calcLoadFactor(45.0)).isCloseTo(Math.sqrt(2), within(0.001));
    }

    // ── Conversões ───────────────────────────────────────────────────────────

    @Test
    void metersToFeet_1metro_328pes() {
        assertThat(svc.metersToFeet(1.0)).isCloseTo(3.28084, within(0.001));
    }

    @Test
    void feetToMeters_1pe_0304metros() {
        assertThat(svc.feetToMeters(1.0)).isCloseTo(0.3048, within(0.0001));
    }

    @Test
    void kgToLbs_1kg_220lbs() {
        assertThat(svc.kgToLbs(1.0)).isCloseTo(2.20459, within(0.001));
    }

    @Test
    void lbsToKg_1lb_0454kg() {
        assertThat(svc.lbsToKg(1.0)).isCloseTo(0.4536, within(0.0001));
    }

    @Test
    void conversoes_roundtrip_metros_pes() {
        double original = 7.5;
        assertThat(svc.feetToMeters(svc.metersToFeet(original))).isCloseTo(original, within(0.001));
    }

    @Test
    void conversoes_roundtrip_kg_lbs() {
        double original = 1000.0;
        assertThat(svc.lbsToKg(svc.kgToLbs(original))).isCloseTo(original, within(0.1));
    }
}
