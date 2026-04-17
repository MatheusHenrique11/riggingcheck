package com.riggingcheck.riggingcheckapi.service.calculation;

import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.shared.RiskCalculator;
import org.springframework.stereotype.Service;

/**
 * Calculadora de Momento de Carga para operações de Munck / guindaste articulado.
 * M = F × D  (toneladas-metro)
 * Uso: comparar o momento calculado com a tabela de alcance do fabricante.
 */
@Service
public class MunckMomentService {

    /**
     * @param forcaToneladas  carga bruta total em toneladas
     * @param distanciaMetros alcance horizontal do lança em metros
     * @return momento em t·m e percentual em relação ao limite
     */
    public MomentResult calcMomento(double forcaToneladas, double distanciaMetros, double limiteCapacidade) {
        if (forcaToneladas <= 0) throw new RegraDeNegocioException("Força deve ser maior que zero");
        if (distanciaMetros <= 0) throw new RegraDeNegocioException("Distância deve ser maior que zero");
        if (limiteCapacidade <= 0) throw new RegraDeNegocioException("Limite de capacidade deve ser maior que zero");

        double momento  = forcaToneladas * distanciaMetros;
        double usoPct   = (momento / limiteCapacidade) * 100.0;
        String risco    = RiskCalculator.fromUsagePercent(usoPct);

        return new MomentResult(momento, usoPct, risco, usoPct < RiskCalculator.WARNING_THRESHOLD);
    }

    public record MomentResult(
            double momento,       // t·m
            double usoPct,
            String risco,
            boolean aprovado
    ) {}
}
