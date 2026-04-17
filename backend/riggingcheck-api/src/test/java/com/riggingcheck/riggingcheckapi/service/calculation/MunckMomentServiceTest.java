package com.riggingcheck.riggingcheckapi.service.calculation;

import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class MunckMomentServiceTest {

    private MunckMomentService svc;

    @BeforeEach
    void setUp() { svc = new MunckMomentService(); }

    // ── Cálculo do momento ───────────────────────────────────────────────────

    @Test
    void momento_calculoBasico_2t_x_5m_equals_10tm() {
        var r = svc.calcMomento(2.0, 5.0, 20.0);
        assertThat(r.momento()).isCloseTo(10.0, within(0.001));
    }

    @Test
    void momento_usoPct_50pct() {
        var r = svc.calcMomento(2.0, 5.0, 20.0); // momento=10, limite=20
        assertThat(r.usoPct()).isCloseTo(50.0, within(0.001));
    }

    // ── Classificação de risco ───────────────────────────────────────────────

    @Test
    void risco_abaixo70pct_SAFE() {
        var r = svc.calcMomento(1.0, 1.0, 100.0); // 1% de uso
        assertThat(r.risco()).isEqualTo("SAFE");
        assertThat(r.aprovado()).isTrue();
    }

    @Test
    void risco_exatamente70pct_WARNING() {
        var r = svc.calcMomento(7.0, 1.0, 10.0); // 70%
        assertThat(r.risco()).isEqualTo("WARNING");
        assertThat(r.aprovado()).isTrue();
    }

    @Test
    void risco_exatamente90pct_DANGER() {
        var r = svc.calcMomento(9.0, 1.0, 10.0); // 90%
        assertThat(r.risco()).isEqualTo("DANGER");
        assertThat(r.aprovado()).isFalse();
    }

    @Test
    void risco_acima90pct_DANGER() {
        var r = svc.calcMomento(5.0, 2.0, 10.0); // 100%
        assertThat(r.risco()).isEqualTo("DANGER");
        assertThat(r.aprovado()).isFalse();
    }

    @Test
    void risco_entre70e89pct_WARNING_aprovado() {
        var r = svc.calcMomento(8.5, 1.0, 10.0); // 85%
        assertThat(r.risco()).isEqualTo("WARNING");
        assertThat(r.aprovado()).isTrue();
    }

    // ── Validações de entrada ────────────────────────────────────────────────

    @Test
    void forcaZero_lancaExcecao() {
        assertThatThrownBy(() -> svc.calcMomento(0.0, 5.0, 20.0))
            .isInstanceOf(RegraDeNegocioException.class);
    }

    @Test
    void distanciaZero_lancaExcecao() {
        assertThatThrownBy(() -> svc.calcMomento(2.0, 0.0, 20.0))
            .isInstanceOf(RegraDeNegocioException.class);
    }

    @Test
    void limiteZero_lancaExcecao() {
        assertThatThrownBy(() -> svc.calcMomento(2.0, 5.0, 0.0))
            .isInstanceOf(RegraDeNegocioException.class);
    }

    @Test
    void forcaNegativa_lancaExcecao() {
        assertThatThrownBy(() -> svc.calcMomento(-1.0, 5.0, 20.0))
            .isInstanceOf(RegraDeNegocioException.class);
    }
}
