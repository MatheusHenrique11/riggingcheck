package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.OperationTeamMember;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import com.riggingcheck.riggingcheckapi.dto.OperationTeamMemberRequest;
import com.riggingcheck.riggingcheckapi.dto.OperationTeamMemberResponse;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.OperationTeamMemberRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class OperationTeamService {

    private static final int DIAS_ALERTA = 30;
    private static final DateTimeFormatter FMT_D = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final OperationTeamMemberRepository teamRepository;
    private final SolicitacaoLiberacaoRepository liberacaoRepository;
    private final FuncionarioRepository funcionarioRepository;

    public OperationTeamService(
            OperationTeamMemberRepository teamRepository,
            SolicitacaoLiberacaoRepository liberacaoRepository,
            FuncionarioRepository funcionarioRepository) {
        this.teamRepository      = teamRepository;
        this.liberacaoRepository = liberacaoRepository;
        this.funcionarioRepository = funcionarioRepository;
    }

    @Transactional(readOnly = true)
    public List<OperationTeamMemberResponse> listar(UUID planId, String email) {
        Funcionario actor = getActor(email);
        SolicitacaoLiberacao sol = getPlan(planId);
        checkAccess(actor, sol);

        return teamRepository.findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(planId)
            .stream()
            .map(m -> toResponse(m, funcionarioRepository.findById(m.getFuncionarioId()).orElse(null)))
            .toList();
    }

    @Transactional
    public OperationTeamMemberResponse adicionar(UUID planId, OperationTeamMemberRequest req, String email) {
        Funcionario actor = getActor(email);
        SolicitacaoLiberacao sol = getPlan(planId);
        checkAccess(actor, sol);

        Funcionario membro = funcionarioRepository.findById(req.funcionarioId())
            .orElseThrow(() -> new RecursoNaoEncontradoException("Funcionário"));

        if (!membro.getEmpresaId().equals(sol.getEmpresaId())) {
            throw new RegraDeNegocioException("Funcionário não pertence à empresa do plano.");
        }

        if (teamRepository.existsBySolicitacaoLiberacaoIdAndFuncionarioId(planId, req.funcionarioId())) {
            throw new RegraDeNegocioException("Funcionário já está vinculado a este plano.");
        }

        OperationTeamMember member = OperationTeamMember.builder()
            .solicitacaoLiberacaoId(planId)
            .funcionarioId(req.funcionarioId())
            .empresaId(sol.getEmpresaId())
            .funcaoOperacional(req.funcaoOperacional())
            .responsavel(Boolean.TRUE.equals(req.responsavel()))
            .observacao(req.observacao())
            .build();

        member = teamRepository.save(member);
        return toResponse(member, membro);
    }

    @Transactional
    public void remover(UUID planId, UUID membroId, String email) {
        Funcionario actor = getActor(email);
        SolicitacaoLiberacao sol = getPlan(planId);
        checkAccess(actor, sol);

        OperationTeamMember member = teamRepository.findById(membroId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Membro da equipe"));

        if (!member.getSolicitacaoLiberacaoId().equals(planId)) {
            throw new AcessoNegadoException();
        }

        teamRepository.delete(member);
    }

    // ── Avaliação de competências da equipe (retorna violações no padrão Compliance) ────

    public List<ComplianceViolation> evaluateCompetencies(List<OperationTeamMember> membros) {
        List<ComplianceViolation> violations = new ArrayList<>();
        LocalDate hoje = LocalDate.now();

        for (OperationTeamMember m : membros) {
            funcionarioRepository.findById(m.getFuncionarioId()).ifPresent(f -> {
                String nome = f.getNome() != null ? f.getNome() : m.getFuncionarioId().toString();
                String funcao = m.getFuncaoOperacional() != null ? m.getFuncaoOperacional().name() : "OUTRO";

                // NR-11 — BLOCKED se vencida/ausente
                violations.addAll(evaluarTreinamento(f.getVencimentoNr11(), "NR-11",
                    nome, funcao, hoje, "NR-11 item 11.3.3", TechnicalStatus.BLOCKED));

                // NR-35 — RESTRICTED se vencida (endpoint informativo; ComplianceRule usa areaClassificada)
                violations.addAll(evaluarTreinamento(f.getVencimentoNr35(), "NR-35",
                    nome, funcao, hoje, "NR-35 item 7.1", TechnicalStatus.RESTRICTED));

                // ASO
                violations.addAll(evaluarAso(f.getVencimentoAso(), nome, funcao, hoje));
            });
        }

        return violations;
    }

    private List<ComplianceViolation> evaluarTreinamento(
            LocalDate validade, String treinamento,
            String nome, String funcao, LocalDate hoje, String norma,
            TechnicalStatus vencidoSeverity) {

        List<ComplianceViolation> v = new ArrayList<>();
        if (validade == null) {
            v.add(new ComplianceViolation(
                vencidoSeverity,
                "EQUIPE_" + treinamento.replace("-", "") + "_AUSENTE",
                nome + " (" + funcao + "): " + treinamento + " sem registro de validade.",
                norma,
                "Cadastrar validade de " + treinamento + " para o funcionário antes de operar."
            ));
        } else if (validade.isBefore(hoje)) {
            v.add(new ComplianceViolation(
                vencidoSeverity,
                "EQUIPE_" + treinamento.replace("-", "") + "_VENCIDO",
                nome + " (" + funcao + "): " + treinamento + " vencido em " + validade.format(FMT_D) + ".",
                norma,
                "Renovar " + treinamento + " de " + nome + " antes de operar."
            ));
        } else if (validade.isBefore(hoje.plusDays(DIAS_ALERTA))) {
            v.add(new ComplianceViolation(
                TechnicalStatus.RESTRICTED,
                "EQUIPE_" + treinamento.replace("-", "") + "_A_VENCER",
                nome + " (" + funcao + "): " + treinamento + " vence em " + validade.format(FMT_D) + ".",
                norma,
                "Planejar renovação de " + treinamento + " de " + nome + " nos próximos 30 dias."
            ));
        }
        return v;
    }

    private List<ComplianceViolation> evaluarAso(
            LocalDate validade, String nome, String funcao, LocalDate hoje) {

        List<ComplianceViolation> v = new ArrayList<>();
        if (validade == null) {
            v.add(new ComplianceViolation(
                TechnicalStatus.BLOCKED,
                "EQUIPE_ASO_AUSENTE",
                nome + " (" + funcao + "): ASO sem registro de validade.",
                "NR-7 / NR-11",
                "Cadastrar validade do ASO para o funcionário antes de operar."
            ));
        } else if (validade.isBefore(hoje)) {
            v.add(new ComplianceViolation(
                TechnicalStatus.BLOCKED,
                "EQUIPE_ASO_VENCIDO",
                nome + " (" + funcao + "): ASO vencido em " + validade.format(FMT_D) + ".",
                "NR-7 / NR-11",
                "Renovar ASO de " + nome + " antes de operar."
            ));
        } else if (validade.isBefore(hoje.plusDays(DIAS_ALERTA))) {
            v.add(new ComplianceViolation(
                TechnicalStatus.RESTRICTED,
                "EQUIPE_ASO_A_VENCER",
                nome + " (" + funcao + "): ASO vence em " + validade.format(FMT_D) + ".",
                "NR-7 / NR-11",
                "Planejar renovação do ASO de " + nome + " nos próximos 30 dias."
            ));
        }
        return v;
    }

    // ── Helpers internos ──────────────────────────────────────────────────────────

    private Funcionario getActor(String email) {
        return funcionarioRepository.findByEmail(email)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private SolicitacaoLiberacao getPlan(UUID planId) {
        return liberacaoRepository.findById(planId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Plano"));
    }

    private void checkAccess(Funcionario actor, SolicitacaoLiberacao sol) {
        if (actor.getRole() == RoleEnum.SUPER_ADMIN) return;
        if (!sol.getEmpresaId().equals(actor.getEmpresaId())) {
            throw new AcessoNegadoException();
        }
    }

    // ── Mapeamento para response ──────────────────────────────────────────────────

    public OperationTeamMemberResponse toResponse(OperationTeamMember m, Funcionario f) {
        LocalDate hoje = LocalDate.now();

        String nr11Status  = statusTreinamento(f != null ? f.getVencimentoNr11()  : null, hoje);
        String nr35Status  = statusTreinamento(f != null ? f.getVencimentoNr35()  : null, hoje);
        String asoStatus   = statusTreinamento(f != null ? f.getVencimentoAso()   : null, hoje);
        String competency  = calcularCompetencia(nr11Status, nr35Status, asoStatus);

        return new OperationTeamMemberResponse(
            m.getId(),
            m.getSolicitacaoLiberacaoId(),
            m.getFuncionarioId(),
            f != null ? f.getNome()  : null,
            f != null ? f.getEmail() : null,
            f != null && f.getRole() != null ? f.getRole().name() : null,
            m.getFuncaoOperacional() != null ? m.getFuncaoOperacional().name() : null,
            m.getResponsavel(),
            m.getObservacao(),
            nr11Status,
            formatDate(f != null ? f.getVencimentoNr11() : null),
            nr35Status,
            formatDate(f != null ? f.getVencimentoNr35() : null),
            asoStatus,
            formatDate(f != null ? f.getVencimentoAso()  : null),
            competency,
            m.getCreatedAt()
        );
    }

    private String statusTreinamento(LocalDate validade, LocalDate hoje) {
        if (validade == null)               return "AUSENTE";
        if (validade.isBefore(hoje))        return "VENCIDO";
        if (validade.isBefore(hoje.plusDays(DIAS_ALERTA))) return "A_VENCER";
        return "VALIDO";
    }

    private String formatDate(LocalDate d) {
        return d != null ? d.format(FMT_D) : null;
    }

    private String calcularCompetencia(String nr11, String nr35, String aso) {
        if ("VENCIDO".equals(nr11) || "AUSENTE".equals(nr11)
                || "VENCIDO".equals(aso)  || "AUSENTE".equals(aso)) {
            return "BLOQUEADO";
        }
        if ("A_VENCER".equals(nr11) || "VENCIDO".equals(nr35)
                || "A_VENCER".equals(nr35) || "A_VENCER".equals(aso)) {
            return "RESTRITO";
        }
        return "APTO";
    }
}
