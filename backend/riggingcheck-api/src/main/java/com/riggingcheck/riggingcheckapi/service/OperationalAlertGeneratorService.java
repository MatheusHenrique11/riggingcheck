package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.AcessorioIcamento;
import com.riggingcheck.riggingcheckapi.domain.CertificadoAcessorio;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.InspecaoAcessorio;
import com.riggingcheck.riggingcheckapi.domain.OperationalAlert;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.SeveridadeAlerta;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusAcessorio;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusAlerta;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusCertificado;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import com.riggingcheck.riggingcheckapi.domain.enums.TipoAlerta;
import com.riggingcheck.riggingcheckapi.domain.enums.WorkflowStatus;
import com.riggingcheck.riggingcheckapi.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Gerador de alertas operacionais — Fase 19A.
 * Avalia condições críticas de acessórios, funcionários e planos,
 * criando alertas sem duplicar os já ativos (NOVO ou VISUALIZADO).
 */
@Service
public class OperationalAlertGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(OperationalAlertGeneratorService.class);
    private static final int DIAS_ALERTA = 30;

    private static final List<StatusAlerta> ATIVOS = List.of(StatusAlerta.NOVO, StatusAlerta.VISUALIZADO);
    private static final List<WorkflowStatus> AGUARDANDO = List.of(
        WorkflowStatus.SUBMITTED, WorkflowStatus.UNDER_REVIEW, WorkflowStatus.RESUBMITTED
    );

    private final OperationalAlertRepository alertRepository;
    private final EmpresaRepository          empresaRepository;
    private final AcessorioIcamentoRepository acessorioRepository;
    private final CertificadoAcessorioRepository certRepository;
    private final InspecaoAcessorioRepository inspRepository;
    private final FuncionarioRepository      funcionarioRepository;
    private final SolicitacaoLiberacaoRepository liberacaoRepository;

    public OperationalAlertGeneratorService(
            OperationalAlertRepository alertRepository,
            EmpresaRepository empresaRepository,
            AcessorioIcamentoRepository acessorioRepository,
            CertificadoAcessorioRepository certRepository,
            InspecaoAcessorioRepository inspRepository,
            FuncionarioRepository funcionarioRepository,
            SolicitacaoLiberacaoRepository liberacaoRepository) {
        this.alertRepository     = alertRepository;
        this.empresaRepository   = empresaRepository;
        this.acessorioRepository = acessorioRepository;
        this.certRepository      = certRepository;
        this.inspRepository      = inspRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.liberacaoRepository = liberacaoRepository;
    }

    /**
     * Gera alertas para uma empresa específica. Retorna contagem de alertas criados.
     */
    @Transactional
    public int gerarParaEmpresa(UUID empresaId) {
        int criados = 0;
        LocalDate hoje   = LocalDate.now();
        LocalDate limite = hoje.plusDays(DIAS_ALERTA);

        // ── Acessórios ────────────────────────────────────────────────────────────
        List<AcessorioIcamento> acessorios = acessorioRepository.findByEmpresaIdOrderByDataCadastroDesc(empresaId);
        for (AcessorioIcamento a : acessorios) {
            // Reprovado
            if (a.getStatus() == StatusAcessorio.REPROVADO) {
                criados += criarSeInexistente(empresaId, TipoAlerta.ACESSORIO_REPROVADO, SeveridadeAlerta.BLOCKED,
                    "Acessório reprovado: " + a.getCodigoInterno(),
                    "O acessório " + a.getCodigoInterno() + " está com status REPROVADO e não deve ser utilizado.",
                    "ACESSORIO", a.getId());
            }

            // Certificado
            Optional<CertificadoAcessorio> certOpt = certRepository
                .findByAcessorioIdOrderByCriadoEmDesc(a.getId()).stream().findFirst();
            if (certOpt.isPresent()) {
                CertificadoAcessorio cert = certOpt.get();
                if (cert.getStatus() == StatusCertificado.VENCIDO
                        || (cert.getDataValidade() != null && cert.getDataValidade().isBefore(hoje))) {
                    criados += criarSeInexistente(empresaId, TipoAlerta.CERTIFICADO_VENCIDO, SeveridadeAlerta.BLOCKED,
                        "Certificado vencido: " + a.getCodigoInterno(),
                        "O certificado do acessório " + a.getCodigoInterno() + " está vencido.",
                        "ACESSORIO", a.getId());
                } else if (cert.getDataValidade() != null
                        && !cert.getDataValidade().isBefore(hoje)
                        && cert.getDataValidade().isBefore(limite)) {
                    criados += criarSeInexistente(empresaId, TipoAlerta.CERTIFICADO_A_VENCER, SeveridadeAlerta.WARNING,
                        "Certificado a vencer: " + a.getCodigoInterno(),
                        "O certificado do acessório " + a.getCodigoInterno()
                            + " vence em " + cert.getDataValidade() + ".",
                        "ACESSORIO", a.getId());
                }
            }

            // Inspeção vencida
            Optional<InspecaoAcessorio> inspOpt = inspRepository
                .findTopByAcessorioIdOrderByDataInspecaoDesc(a.getId());
            if (inspOpt.isPresent() && inspOpt.get().getProximaInspecao() != null
                    && inspOpt.get().getProximaInspecao().isBefore(hoje)) {
                criados += criarSeInexistente(empresaId, TipoAlerta.INSPECAO_VENCIDA, SeveridadeAlerta.BLOCKED,
                    "Inspeção vencida: " + a.getCodigoInterno(),
                    "A inspeção do acessório " + a.getCodigoInterno()
                        + " estava prevista para " + inspOpt.get().getProximaInspecao() + ".",
                    "ACESSORIO", a.getId());
            }
        }

        // ── Funcionários ─────────────────────────────────────────────────────────
        List<Funcionario> funcionarios = funcionarioRepository.findByEmpresaIdAndAtivoTrue(empresaId);
        for (Funcionario f : funcionarios) {
            // ASO
            criados += alertarTreinamento(empresaId, f, f.getVencimentoAso(),
                "ASO", TipoAlerta.ASO_VENCIDO, TipoAlerta.ASO_A_VENCER,
                SeveridadeAlerta.BLOCKED, hoje, limite);

            // NR-11
            criados += alertarTreinamento(empresaId, f, f.getVencimentoNr11(),
                "NR-11", TipoAlerta.NR11_VENCIDA, TipoAlerta.NR11_A_VENCER,
                SeveridadeAlerta.BLOCKED, hoje, limite);

            // NR-35
            criados += alertarTreinamento(empresaId, f, f.getVencimentoNr35(),
                "NR-35", TipoAlerta.NR35_VENCIDA, TipoAlerta.NR35_A_VENCER,
                SeveridadeAlerta.RESTRICTED, hoje, limite);
        }

        // ── Planos ───────────────────────────────────────────────────────────────
        List<SolicitacaoLiberacao> bloqueados = liberacaoRepository
            .findByEmpresaIdAndTechnicalStatus(empresaId, TechnicalStatus.BLOCKED);
        for (SolicitacaoLiberacao p : bloqueados) {
            criados += criarSeInexistente(empresaId, TipoAlerta.PLANO_BLOQUEADO, SeveridadeAlerta.BLOCKED,
                "Plano bloqueado: OS " + p.getOperacaoOs(),
                "O plano " + p.getOperacaoOs() + " está tecnicamente BLOQUEADO e não pode ser aprovado sem exceção.",
                "PLANO", p.getId());
        }

        List<SolicitacaoLiberacao> aguardando = liberacaoRepository
            .findByEmpresaIdAndWorkflowStatusIn(empresaId, AGUARDANDO);
        for (SolicitacaoLiberacao p : aguardando) {
            criados += criarSeInexistente(empresaId, TipoAlerta.PLANO_AGUARDANDO_APROVACAO, SeveridadeAlerta.INFO,
                "Plano aguardando aprovação: OS " + p.getOperacaoOs(),
                "O plano " + p.getOperacaoOs() + " está aguardando decisão de aprovação.",
                "PLANO", p.getId());
        }

        log.info("Alertas gerados para empresa {}: {}", empresaId, criados);
        return criados;
    }

    /**
     * Gera alertas para todas as empresas (SUPER_ADMIN). Retorna total criado.
     */
    @Transactional
    public int gerarParaTodas() {
        return empresaRepository.findAll().stream()
            .mapToInt(e -> gerarParaEmpresa(e.getId()))
            .sum();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private int alertarTreinamento(UUID empresaId, Funcionario f, LocalDate validade,
                                    String nome, TipoAlerta tipoVencido, TipoAlerta tipoAVencer,
                                    SeveridadeAlerta sevVencido, LocalDate hoje, LocalDate limite) {
        int criados = 0;
        String nomeFuncionario = f.getNome() != null ? f.getNome() : f.getEmail();
        if (validade == null || validade.isBefore(hoje)) {
            String msg = validade == null
                ? nome + " de " + nomeFuncionario + " não registrado."
                : nome + " de " + nomeFuncionario + " venceu em " + validade + ".";
            criados += criarSeInexistente(empresaId, tipoVencido, sevVencido,
                nome + " vencido: " + nomeFuncionario, msg, "FUNCIONARIO", f.getId());
        } else if (!validade.isBefore(hoje) && validade.isBefore(limite)) {
            criados += criarSeInexistente(empresaId, tipoAVencer, SeveridadeAlerta.WARNING,
                nome + " a vencer: " + nomeFuncionario,
                nome + " de " + nomeFuncionario + " vence em " + validade + ".",
                "FUNCIONARIO", f.getId());
        }
        return criados;
    }

    private int criarSeInexistente(UUID empresaId, TipoAlerta tipo, SeveridadeAlerta severidade,
                                    String titulo, String mensagem, String entidadeTipo, UUID entidadeId) {
        if (alertRepository.existsByEmpresaIdAndTipoAndEntidadeIdAndStatusIn(
                empresaId, tipo, entidadeId, ATIVOS)) {
            return 0;
        }
        alertRepository.save(OperationalAlert.builder()
            .empresaId(empresaId)
            .tipo(tipo)
            .severidade(severidade)
            .titulo(titulo)
            .mensagem(mensagem)
            .entidadeTipo(entidadeTipo)
            .entidadeId(entidadeId)
            .status(StatusAlerta.NOVO)
            .build());
        return 1;
    }
}
