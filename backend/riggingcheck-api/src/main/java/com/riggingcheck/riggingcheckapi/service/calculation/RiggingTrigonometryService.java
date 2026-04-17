package com.riggingcheck.riggingcheckapi.service.calculation;

import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import org.springframework.stereotype.Service;

/**
 * Cálculos trigonométricos para içamento de cargas.
 * Referência: ABNT NBR 13541-1:2014 — Eslingas de Cabo de Aço.
 *
 * Convenções de variáveis:
 *   Ce = comprimento da eslinga (m)
 *   He = altura efetiva de içamento (m)
 *   D  = distância horizontal entre ponto de gancho e carga (m)
 *   ang = ângulo da eslinga em relação à horizontal (graus)
 */
@Service
public class RiggingTrigonometryService {

    /** Ce = √(D² + He²) */
    public double calcSlingLength(double distHorizontal, double alturaEfetiva) {
        validatePositive(distHorizontal, "Distância horizontal");
        validatePositive(alturaEfetiva, "Altura efetiva");
        return Math.sqrt(distHorizontal * distHorizontal + alturaEfetiva * alturaEfetiva);
    }

    /** D = √(Ce² - He²) */
    public double calcHorizontalDistance(double ce, double he) {
        validatePositive(ce, "Comprimento da eslinga (Ce)");
        validatePositive(he, "Altura efetiva (He)");
        if (ce < he) throw new RegraDeNegocioException("Ce deve ser ≥ He para que D seja real");
        return Math.sqrt(ce * ce - he * he);
    }

    /** ang = arcsin(He / Ce) em graus */
    public double calcAngleDeg(double he, double ce) {
        validatePositive(he, "Altura efetiva (He)");
        validatePositive(ce, "Comprimento da eslinga (Ce)");
        if (ce < he) throw new RegraDeNegocioException("Ce deve ser ≥ He");
        return Math.toDegrees(Math.asin(he / ce));
    }

    /** Ce = He / sin(ang) — comprimento a partir do ângulo */
    public double calcSlingFromAngle(double he, double angGraus) {
        validatePositive(he, "Altura efetiva (He)");
        if (angGraus <= 0 || angGraus > 90)
            throw new RegraDeNegocioException("Ângulo deve estar entre 0° (exclusivo) e 90°");
        double sinAng = Math.sin(Math.toRadians(angGraus));
        return he / sinAng;
    }

    /** Fator de carga por ângulo: 1/sin(ang). Mesma lógica do SlingService. */
    public double calcLoadFactor(double angGraus) {
        if (angGraus <= 0 || angGraus > 90)
            throw new RegraDeNegocioException("Ângulo deve estar entre 0° (exclusivo) e 90°");
        return 1.0 / Math.sin(Math.toRadians(angGraus));
    }

    // ── Conversões de unidade ────────────────────────────────────────────────

    public double metersToFeet(double metros) { return metros / 0.3048; }
    public double feetToMeters(double pes)    { return pes * 0.3048; }
    public double kgToLbs(double kg)          { return kg / 0.4536; }
    public double lbsToKg(double lbs)         { return lbs * 0.4536; }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void validatePositive(double value, String name) {
        if (value <= 0) throw new RegraDeNegocioException(name + " deve ser maior que zero");
    }
}
