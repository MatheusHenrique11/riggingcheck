package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.OperationalAlert;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.SeveridadeAlerta;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusAlerta;
import com.riggingcheck.riggingcheckapi.dto.AlertSummaryResponse;
import com.riggingcheck.riggingcheckapi.dto.OperationalAlertResponse;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.OperationalAlertRepository;
import com.riggingcheck.riggingcheckapi.shared.AuthorizationHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OperationalAlertService {

    private static final List<StatusAlerta> ATIVOS = List.of(StatusAlerta.NOVO, StatusAlerta.VISUALIZADO);

    private final OperationalAlertRepository  alertRepository;
    private final FuncionarioRepository       funcionarioRepository;
    private final AuthorizationHelper         authHelper;
    private final OperationalAlertGeneratorService generator;

    public OperationalAlertService(OperationalAlertRepository alertRepository,
                                   FuncionarioRepository funcionarioRepository,
                                   AuthorizationHelper authHelper,
                                   OperationalAlertGeneratorService generator) {
        this.alertRepository    = alertRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.authHelper         = authHelper;
        this.generator          = generator;
    }

    // ── Listar ────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OperationalAlertResponse> listar(String email, String status) {
        Funcionario actor = getActor(email);
        authHelper.requireAdmin(actor);

        List<OperationalAlert> alertas;
        boolean isSuper = actor.getRole() == RoleEnum.SUPER_ADMIN;

        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("TODOS")) {
            StatusAlerta s = StatusAlerta.valueOf(status.toUpperCase());
            alertas = isSuper
                ? alertRepository.findAll().stream()
                    .filter(a -> a.getStatus() == s).toList()
                : alertRepository.findByEmpresaIdAndStatusOrderByCreatedAtDesc(actor.getEmpresaId(), s);
        } else {
            alertas = isSuper
                ? alertRepository.findAllByOrderByCreatedAtDesc()
                : alertRepository.findByEmpresaIdOrderByCreatedAtDesc(actor.getEmpresaId());
        }

        return alertas.stream().map(this::toResponse).toList();
    }

    // ── Resumo + geração automática ──────────────────────────────────────────────

    @Transactional
    public AlertSummaryResponse resumo(String email) {
        Funcionario actor = getActor(email);
        authHelper.requireAdmin(actor);

        boolean isSuper = actor.getRole() == RoleEnum.SUPER_ADMIN;

        // Gera novos alertas somente se não houver nenhum ativo
        int gerados = 0;
        long totalAtivo = isSuper
            ? alertRepository.countByStatus(StatusAlerta.NOVO) + alertRepository.countByStatus(StatusAlerta.VISUALIZADO)
            : alertRepository.countByEmpresaIdAndStatus(actor.getEmpresaId(), StatusAlerta.NOVO)
              + alertRepository.countByEmpresaIdAndStatus(actor.getEmpresaId(), StatusAlerta.VISUALIZADO);

        if (totalAtivo == 0) {
            gerados = isSuper ? generator.gerarParaTodas() : generator.gerarParaEmpresa(actor.getEmpresaId());
        }

        // Recarrega após possível geração
        List<OperationalAlert> ativos = isSuper
            ? alertRepository.findAll().stream()
                .filter(a -> ATIVOS.contains(a.getStatus())).toList()
            : alertRepository.findByEmpresaIdOrderByCreatedAtDesc(actor.getEmpresaId()).stream()
                .filter(a -> ATIVOS.contains(a.getStatus())).toList();

        long novo       = ativos.stream().filter(a -> a.getStatus() == StatusAlerta.NOVO).count();
        long visualizado = ativos.stream().filter(a -> a.getStatus() == StatusAlerta.VISUALIZADO).count();
        long bloqueados = ativos.stream().filter(a -> a.getSeveridade() == SeveridadeAlerta.BLOCKED).count();
        long restritos  = ativos.stream().filter(a -> a.getSeveridade() == SeveridadeAlerta.RESTRICTED).count();
        long avisos     = ativos.stream().filter(a -> a.getSeveridade() == SeveridadeAlerta.WARNING).count();
        long infos      = ativos.stream().filter(a -> a.getSeveridade() == SeveridadeAlerta.INFO).count();

        Map<String, Long> porTipoMap = ativos.stream()
            .collect(Collectors.groupingBy(a -> a.getTipo().name(), Collectors.counting()));

        List<AlertSummaryResponse.PorTipo> porTipo = porTipoMap.entrySet().stream()
            .map(e -> AlertSummaryResponse.PorTipo.builder()
                .tipo(e.getKey())
                .count(e.getValue())
                .severidade(severidadePorTipo(e.getKey()))
                .build())
            .toList();

        return AlertSummaryResponse.builder()
            .totalNovo(novo)
            .totalVisualizado(visualizado)
            .totalAtivo(novo + visualizado)
            .bloqueados(bloqueados)
            .restritos(restritos)
            .avisos(avisos)
            .infos(infos)
            .gerados(gerados)
            .porTipo(porTipo)
            .build();
    }

    // ── Geração explícita ────────────────────────────────────────────────────────

    @Transactional
    public int gerar(String email) {
        Funcionario actor = getActor(email);
        authHelper.requireAdmin(actor);
        return actor.getRole() == RoleEnum.SUPER_ADMIN
            ? generator.gerarParaTodas()
            : generator.gerarParaEmpresa(actor.getEmpresaId());
    }

    // ── Atualização de status ─────────────────────────────────────────────────────

    @Transactional
    public OperationalAlertResponse visualizar(UUID alertId, String email) {
        return atualizarStatus(alertId, email, StatusAlerta.VISUALIZADO);
    }

    @Transactional
    public OperationalAlertResponse resolver(UUID alertId, String email) {
        return atualizarStatus(alertId, email, StatusAlerta.RESOLVIDO);
    }

    @Transactional
    public OperationalAlertResponse ignorar(UUID alertId, String email) {
        return atualizarStatus(alertId, email, StatusAlerta.IGNORADO);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private OperationalAlertResponse atualizarStatus(UUID alertId, String email, StatusAlerta novoStatus) {
        Funcionario actor = getActor(email);
        authHelper.requireAdmin(actor);

        OperationalAlert alerta = alertRepository.findById(alertId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Alerta"));

        if (actor.getRole() != RoleEnum.SUPER_ADMIN
                && !alerta.getEmpresaId().equals(actor.getEmpresaId())) {
            throw new AcessoNegadoException();
        }

        alerta.setStatus(novoStatus);
        alerta.setAcknowledgedAt(LocalDateTime.now());
        alerta.setAcknowledgedById(actor.getId());
        return toResponse(alertRepository.save(alerta));
    }

    private Funcionario getActor(String email) {
        return funcionarioRepository.findByEmail(email)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private OperationalAlertResponse toResponse(OperationalAlert a) {
        return new OperationalAlertResponse(
            a.getId(), a.getEmpresaId(),
            a.getTipo() != null ? a.getTipo().name() : null,
            a.getSeveridade() != null ? a.getSeveridade().name() : null,
            a.getTitulo(), a.getMensagem(),
            a.getEntidadeTipo(), a.getEntidadeId(),
            a.getStatus() != null ? a.getStatus().name() : null,
            a.getCreatedAt(), a.getAcknowledgedAt(), a.getAcknowledgedById()
        );
    }

    private static String severidadePorTipo(String tipo) {
        return switch (tipo) {
            case "CERTIFICADO_VENCIDO", "INSPECAO_VENCIDA", "ACESSORIO_REPROVADO",
                 "ASO_VENCIDO", "NR11_VENCIDA", "PLANO_BLOQUEADO" -> "BLOCKED";
            case "NR35_VENCIDA" -> "RESTRICTED";
            case "CERTIFICADO_A_VENCER", "ASO_A_VENCER",
                 "NR11_A_VENCER", "NR35_A_VENCER" -> "WARNING";
            case "PLANO_AGUARDANDO_APROVACAO" -> "INFO";
            default -> "WARNING";
        };
    }
}
