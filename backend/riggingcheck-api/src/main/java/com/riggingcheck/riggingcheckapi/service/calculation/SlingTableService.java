package com.riggingcheck.riggingcheckapi.service.calculation;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Tabelas de capacidade de carga conforme ABNT NBR 13541-1, ABNT NBR 15637, e ABNT NBR 13545.
 * FS = 5:1 para cabos de aço  |  FS = 7:1 para cintas sintéticas.
 */
@Service
public class SlingTableService {

    // ── Laços de Cabo de Aço 6×19 AF ────────────────────────────────────────

    public record CaboAcoEntry(
            String diametro,       // ex: "3/8\""
            double diametroMm,
            double simples,        // WLL toneladas, modo simples (vertical)
            double forca,          // WLL toneladas, modo forca (choker)
            double cesto           // WLL toneladas, modo cesto (basket)
    ) {}

    public List<CaboAcoEntry> getCaboAcoTable() {
        return List.of(
            new CaboAcoEntry("3/8\"",   9.5,  0.98,  0.69,  1.96),
            new CaboAcoEntry("1/2\"",  12.7,  1.76,  1.24,  3.52),
            new CaboAcoEntry("9/16\"", 14.3,  2.22,  1.57,  4.44),
            new CaboAcoEntry("5/8\"",  15.9,  2.74,  1.94,  5.48),
            new CaboAcoEntry("3/4\"",  19.1,  3.96,  2.80,  7.92),
            new CaboAcoEntry("7/8\"",  22.2,  5.40,  3.81, 10.80),
            new CaboAcoEntry("1\"",    25.4,  7.04,  4.97, 14.08),
            new CaboAcoEntry("1.1/8\"",28.6,  8.88,  6.27, 17.76),
            new CaboAcoEntry("1.1/4\"",31.8, 11.00,  7.77, 22.00),
            new CaboAcoEntry("1.3/8\"",34.9, 13.20,  9.33, 26.40),
            new CaboAcoEntry("1.1/2\"",38.1, 15.60, 11.00, 31.20)
        );
    }

    // ── Cintas Sintéticas (ABNT NBR 15637-1 e 2, FS = 7:1) ────────────────────────

    public record CintaSinteticaEntry(
            String cor,
            double vertical,   // WLL toneladas
            double choker,     // 0.8 × vertical
            double cesto,      // 2.0 × vertical
            double ang45,      // Angular 0-45°: 1.4 × vertical
            double ang30       // Angular 45-60°: 1.0 × vertical
    ) {}

    public List<CintaSinteticaEntry> getCintaTable() {
        return List.of(
            buildCinta("Violeta", 1.0),
            buildCinta("Verde",   2.0),
            buildCinta("Amarelo", 3.0),
            buildCinta("Cinza",   4.0),
            buildCinta("Vermelho",5.0),
            buildCinta("Marrom",  6.0),
            buildCinta("Azul",    8.0),
            buildCinta("Laranja", 10.0)
        );
    }

    private CintaSinteticaEntry buildCinta(String cor, double wll) {
        return new CintaSinteticaEntry(
            cor,
            round2(wll),
            round2(wll * 0.8),
            round2(wll * 2.0),
            round2(wll * 1.4),
            round2(wll * 1.0)
        );
    }

    // ── Manilhas (ABNT NBR 13545 Grau 6) ──────────────────────────────────

    public record ManilhaEntry(
            double diametroMm,
            double swlCurva,   // Manilha tipo Ômega / Curva (t)
            double swlReta     // Manilha tipo Reta / Cadeia (t)
    ) {}

    public List<ManilhaEntry> getManilhaTable() {
        return List.of(
            new ManilhaEntry( 6.5,  0.50,  0.50),
            new ManilhaEntry( 8.0,  0.75,  0.75),
            new ManilhaEntry( 9.5,  1.00,  1.00),
            new ManilhaEntry(11.0,  1.50,  1.50),
            new ManilhaEntry(12.7,  2.00,  2.00),
            new ManilhaEntry(16.0,  3.25,  3.25),
            new ManilhaEntry(19.0,  4.75,  4.75),
            new ManilhaEntry(22.0,  6.50,  6.50),
            new ManilhaEntry(25.4,  8.50,  8.50),
            new ManilhaEntry(29.0,  9.50,  9.50),
            new ManilhaEntry(32.0, 12.00, 12.00),
            new ManilhaEntry(35.0, 13.50, 13.50),
            new ManilhaEntry(38.0, 17.00, 17.00),
            new ManilhaEntry(44.0, 25.00, 25.00),
            new ManilhaEntry(51.0, 35.00, 35.00)
        );
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
