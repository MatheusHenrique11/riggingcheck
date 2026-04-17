package com.riggingcheck.riggingcheckapi.service.calculation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class SlingTableServiceTest {

    private SlingTableService svc;

    @BeforeEach
    void setUp() { svc = new SlingTableService(); }

    // ── Tabela Cabo de Aço ───────────────────────────────────────────────────

    @Test
    void caboAco_tamanhoTabela_11entradas() {
        assertThat(svc.getCaboAcoTable()).hasSize(11);
    }

    @Test
    void caboAco_primeiraEntrada_38polegadas() {
        var first = svc.getCaboAcoTable().get(0);
        assertThat(first.diametro()).isEqualTo("3/8\"");
        assertThat(first.diametroMm()).isCloseTo(9.5, within(0.01));
    }

    @Test
    void caboAco_cestoSempreMaiorQueSimples() {
        for (var entry : svc.getCaboAcoTable()) {
            assertThat(entry.cesto())
                .as("Cesto deve ser > simples para " + entry.diametro())
                .isGreaterThan(entry.simples());
        }
    }

    @Test
    void caboAco_simplesDecrescente_forcaMenorQueSimples() {
        for (var entry : svc.getCaboAcoTable()) {
            assertThat(entry.forca())
                .as("Forca deve ser < simples para " + entry.diametro())
                .isLessThan(entry.simples());
        }
    }

    @Test
    void caboAco_capacidadesCrescentes_comDiametro() {
        var tabela = svc.getCaboAcoTable();
        for (int i = 1; i < tabela.size(); i++) {
            assertThat(tabela.get(i).simples())
                .as("Capacidade simples deve crescer com o diâmetro")
                .isGreaterThan(tabela.get(i - 1).simples());
        }
    }

    @Test
    void caboAco_cestoAproximadamente2xSimples() {
        for (var entry : svc.getCaboAcoTable()) {
            double ratio = entry.cesto() / entry.simples();
            assertThat(ratio).as("Relação cesto/simples para " + entry.diametro())
                .isCloseTo(2.0, within(0.02));
        }
    }

    // ── Tabela Cinta Sintética ───────────────────────────────────────────────

    @Test
    void cinta_tamanhoTabela_8cores() {
        assertThat(svc.getCintaTable()).hasSize(8);
    }

    @Test
    void cinta_primeiraCor_violeta() {
        assertThat(svc.getCintaTable().get(0).cor()).isEqualTo("Violeta");
    }

    @Test
    void cinta_ultimaCor_laranja() {
        var tabela = svc.getCintaTable();
        assertThat(tabela.get(tabela.size() - 1).cor()).isEqualTo("Laranja");
    }

    @Test
    void cinta_chokerE80PorcentoDaVertical() {
        for (var entry : svc.getCintaTable()) {
            assertThat(entry.choker())
                .as("Choker deve ser 0.8 × vertical para " + entry.cor())
                .isCloseTo(entry.vertical() * 0.8, within(0.01));
        }
    }

    @Test
    void cinta_cestoE2xVertical() {
        for (var entry : svc.getCintaTable()) {
            assertThat(entry.cesto())
                .as("Cesto deve ser 2 × vertical para " + entry.cor())
                .isCloseTo(entry.vertical() * 2.0, within(0.01));
        }
    }

    @Test
    void cinta_ang45MaiorQueVertical() {
        for (var entry : svc.getCintaTable()) {
            assertThat(entry.ang45()).isGreaterThan(entry.vertical());
        }
    }

    @Test
    void cinta_ang30IgualVertical() {
        for (var entry : svc.getCintaTable()) {
            assertThat(entry.ang30())
                .as("ang30 deve ser ≈ vertical para " + entry.cor())
                .isCloseTo(entry.vertical(), within(0.05));
        }
    }

    // ── Tabela Manilhas ──────────────────────────────────────────────────────

    @Test
    void manilha_tamanhoTabela_15entradas() {
        assertThat(svc.getManilhaTable()).hasSize(15);
    }

    @Test
    void manilha_swlCresceComDiametro() {
        var tabela = svc.getManilhaTable();
        for (int i = 1; i < tabela.size(); i++) {
            assertThat(tabela.get(i).swlCurva())
                .as("SWL Curva deve crescer com diâmetro")
                .isGreaterThanOrEqualTo(tabela.get(i - 1).swlCurva());
        }
    }

    @Test
    void manilha_swlCurvaIgualSwlReta() {
        for (var entry : svc.getManilhaTable()) {
            assertThat(entry.swlCurva())
                .as("SWL Curva == SWL Reta para diâmetro " + entry.diametroMm())
                .isEqualTo(entry.swlReta());
        }
    }

    @Test
    void manilha_primeiraDiametro_65mm() {
        assertThat(svc.getManilhaTable().get(0).diametroMm()).isCloseTo(6.5, within(0.01));
    }

    @Test
    void manilha_ultimaDiametro_51mm() {
        var tabela = svc.getManilhaTable();
        assertThat(tabela.get(tabela.size() - 1).diametroMm()).isCloseTo(51.0, within(0.01));
    }
}
