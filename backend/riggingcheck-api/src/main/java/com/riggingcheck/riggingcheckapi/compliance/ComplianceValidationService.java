package com.riggingcheck.riggingcheckapi.compliance;

import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Avalia todas as regras de compliance registradas e retorna o resultado agregado.
 * Regras são injetadas automaticamente via List<ComplianceRule> pelo Spring.
 */
@Service
public class ComplianceValidationService {

    private final List<ComplianceRule> rules;

    public ComplianceValidationService(List<ComplianceRule> rules) {
        this.rules = rules;
    }

    public ComplianceResult validate(SolicitacaoLiberacao plan) {
        List<ComplianceViolation> violations = new ArrayList<>();

        for (ComplianceRule rule : rules) {
            ComplianceViolation violation = rule.evaluate(plan);
            if (violation != null) {
                violations.add(violation);
            }
        }

        TechnicalStatus overall = computeOverallStatus(violations);
        return new ComplianceResult(overall, violations);
    }

    private TechnicalStatus computeOverallStatus(List<ComplianceViolation> violations) {
        if (violations.isEmpty()) return TechnicalStatus.COMPLIANT;

        TechnicalStatus worst = TechnicalStatus.COMPLIANT;
        for (ComplianceViolation v : violations) {
            if (severity(v.severity()) > severity(worst)) {
                worst = v.severity();
            }
        }
        return worst;
    }

    private int severity(TechnicalStatus status) {
        return switch (status) {
            case COMPLIANT   -> 0;
            case WARNING     -> 1;
            case RESTRICTED  -> 2;
            case BLOCKED     -> 3;
        };
    }
}
