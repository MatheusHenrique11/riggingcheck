package com.riggingcheck.riggingcheckapi.compliance.rules;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceRule;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.OperationTeamMember;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.OperationTeamMemberRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Regra de Compliance de Equipe — Fase 17.
 *
 * Avalia as competências (NR-11, NR-35, ASO) dos membros formalmente vinculados ao plano.
 * Auto-descoberta pelo Spring via List<ComplianceRule> em ComplianceValidationService.
 * Retorna a pior violação encontrada (ou null se equipe conforme).
 * Detalhes por membro disponíveis em GET /api/planos/{id}/equipe/compliance.
 */
@Component
public class TeamCompetencyComplianceRule implements ComplianceRule {

    private static final int DIAS_ALERTA = 30;
    private static final DateTimeFormatter FMT_D = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final Set<String> FUNCOES_CRITICAS_NR11 = Set.of(
        "RIGGER", "OPERADOR_GUINDASTE", "SINALEIRO", "AMARRADOR"
    );

    private final OperationTeamMemberRepository teamRepository;
    private final FuncionarioRepository funcionarioRepository;

    public TeamCompetencyComplianceRule(OperationTeamMemberRepository teamRepository,
                                        FuncionarioRepository funcionarioRepository) {
        this.teamRepository      = teamRepository;
        this.funcionarioRepository = funcionarioRepository;
    }

    @Override
    public ComplianceViolation evaluate(SolicitacaoLiberacao plan) {
        List<OperationTeamMember> membros = teamRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(plan.getId());

        // Regra 8 — Nenhum membro vinculado → RESTRICTED
        if (membros.isEmpty()) {
            return new ComplianceViolation(
                TechnicalStatus.RESTRICTED,
                "EQUIPE_NAO_VINCULADA",
                "Nenhum membro de equipe formalmente vinculado ao plano.",
                "NR-11 item 11.3.3",
                "Vincule a equipe operacional ao plano na etapa Equipe do Wizard."
            );
        }

        LocalDate hoje = LocalDate.now();
        boolean alturaExigida = Boolean.TRUE.equals(plan.getAreaClassificada());

        List<ComplianceViolation> todas = new ArrayList<>();

        for (OperationTeamMember m : membros) {
            Optional<Funcionario> funcOpt = funcionarioRepository.findById(m.getFuncionarioId());
            if (funcOpt.isEmpty()) continue;

            Funcionario f = funcOpt.get();
            String nome   = f.getNome() != null ? f.getNome() : "ID " + m.getFuncionarioId();
            String funcao = m.getFuncaoOperacional() != null ? m.getFuncaoOperacional().name() : null;
            boolean funcaoCritica = FUNCOES_CRITICAS_NR11.contains(funcao);

            // Regra 1+2 — ASO vencido ou ausente → BLOCKED
            ComplianceViolation asoViolation = avaliarAso(f.getVencimentoAso(), nome, funcao, hoje);
            if (asoViolation != null) todas.add(asoViolation);

            // Regra 3+4 — NR-11 vencida/ausente em função crítica → BLOCKED
            if (funcaoCritica) {
                ComplianceViolation nr11Violation = avaliarNr11Critica(f.getVencimentoNr11(), nome, funcao, hoje);
                if (nr11Violation != null) todas.add(nr11Violation);
            }

            // Regra 5 — NR-35 vencida → BLOCKED se altura exigida, RESTRICTED caso contrário
            ComplianceViolation nr35Violation = avaliarNr35(f.getVencimentoNr35(), nome, funcao, hoje, alturaExigida);
            if (nr35Violation != null) todas.add(nr35Violation);

            // Regra 6 — Treinamento a vencer em ≤ 30 dias → RESTRICTED
            ComplianceViolation aVencerViolation = avaliarAVencer(f, nome, funcao, hoje);
            if (aVencerViolation != null) todas.add(aVencerViolation);

            // Regra 7 — Sem função operacional → WARNING
            if (funcao == null) {
                todas.add(new ComplianceViolation(
                    TechnicalStatus.WARNING,
                    "EQUIPE_SEM_FUNCAO",
                    nome + ": membro sem função operacional definida.",
                    "NR-11 item 11.3.3",
                    "Defina a função operacional do membro ao vinculá-lo ao plano."
                ));
            }
        }

        return worstViolation(todas);
    }

    // ── Avaliadores por regra ─────────────────────────────────────────────────────

    private ComplianceViolation avaliarAso(LocalDate validade, String nome, String funcao, LocalDate hoje) {
        String ref = "NR-7 / NR-11";
        if (validade == null) {
            return new ComplianceViolation(TechnicalStatus.BLOCKED, "EQUIPE_ASO_AUSENTE",
                nome + " (" + funcao + "): ASO sem registro de validade.",
                ref, "Cadastre a validade do ASO de " + nome + " na gestão de equipes.");
        }
        if (validade.isBefore(hoje)) {
            return new ComplianceViolation(TechnicalStatus.BLOCKED, "EQUIPE_ASO_VENCIDO",
                nome + " (" + funcao + "): ASO vencido em " + validade.format(FMT_D) + ".",
                ref, "Renove o ASO de " + nome + " antes de operar.");
        }
        return null;
    }

    private ComplianceViolation avaliarNr11Critica(LocalDate validade, String nome, String funcao, LocalDate hoje) {
        String ref = "NR-11 item 11.3.3";
        if (validade == null) {
            return new ComplianceViolation(TechnicalStatus.BLOCKED, "EQUIPE_NR11_AUSENTE",
                nome + " (" + funcao + "): NR-11 sem registro de validade. Função exige habilitação.",
                ref, "Cadastre a validade de NR-11 de " + nome + " na gestão de equipes.");
        }
        if (validade.isBefore(hoje)) {
            return new ComplianceViolation(TechnicalStatus.BLOCKED, "EQUIPE_NR11_VENCIDO",
                nome + " (" + funcao + "): NR-11 vencida em " + validade.format(FMT_D) + ".",
                ref, "Renove a NR-11 de " + nome + " antes de operar.");
        }
        return null;
    }

    private ComplianceViolation avaliarNr35(LocalDate validade, String nome, String funcao,
                                             LocalDate hoje, boolean alturaExigida) {
        if (validade == null || validade.isBefore(hoje)) {
            TechnicalStatus severity = alturaExigida ? TechnicalStatus.BLOCKED : TechnicalStatus.RESTRICTED;
            String ruleId = validade == null ? "EQUIPE_NR35_AUSENTE" : "EQUIPE_NR35_VENCIDO";
            String msg = validade == null
                ? nome + " (" + funcao + "): NR-35 sem registro de validade."
                : nome + " (" + funcao + "): NR-35 vencida em " + validade.format(FMT_D) + ".";
            String action = alturaExigida
                ? "Renove NR-35 de " + nome + " — operação em área classificada exige NR-35 válida."
                : "Regularize NR-35 de " + nome + " antes da próxima submissão.";
            return new ComplianceViolation(severity, ruleId, msg, "NR-35 item 7.1", action);
        }
        return null;
    }

    private ComplianceViolation avaliarAVencer(Funcionario f, String nome, String funcao, LocalDate hoje) {
        LocalDate limite = hoje.plusDays(DIAS_ALERTA);
        List<String> treinamentos = new ArrayList<>();
        if (f.getVencimentoNr11() != null && !f.getVencimentoNr11().isBefore(hoje) && f.getVencimentoNr11().isBefore(limite)) {
            treinamentos.add("NR-11 (" + f.getVencimentoNr11().format(FMT_D) + ")");
        }
        if (f.getVencimentoNr35() != null && !f.getVencimentoNr35().isBefore(hoje) && f.getVencimentoNr35().isBefore(limite)) {
            treinamentos.add("NR-35 (" + f.getVencimentoNr35().format(FMT_D) + ")");
        }
        if (f.getVencimentoAso() != null && !f.getVencimentoAso().isBefore(hoje) && f.getVencimentoAso().isBefore(limite)) {
            treinamentos.add("ASO (" + f.getVencimentoAso().format(FMT_D) + ")");
        }
        if (treinamentos.isEmpty()) return null;
        return new ComplianceViolation(
            TechnicalStatus.RESTRICTED,
            "EQUIPE_TREINAMENTO_A_VENCER",
            nome + " (" + funcao + "): treinamento(s) a vencer em 30 dias: " + String.join(", ", treinamentos) + ".",
            "NR-11 / NR-35 / NR-7",
            "Planeje renovação dos treinamentos de " + nome + " nos próximos 30 dias."
        );
    }

    // ── Seleciona pior violação ───────────────────────────────────────────────────

    private static ComplianceViolation worstViolation(List<ComplianceViolation> violations) {
        if (violations.isEmpty()) return null;
        return violations.stream()
            .max((a, b) -> severity(a.severity()) - severity(b.severity()))
            .orElse(null);
    }

    private static int severity(TechnicalStatus ts) {
        if (ts == null) return 0;
        return switch (ts) {
            case COMPLIANT  -> 0;
            case WARNING    -> 1;
            case RESTRICTED -> 2;
            case BLOCKED    -> 3;
        };
    }
}
