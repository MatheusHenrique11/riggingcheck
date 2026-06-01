package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.OperationalAlert;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.SeveridadeAlerta;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusAlerta;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.OperationalAlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Orquestra o envio do digest de alertas por empresa.
 * Respeita o flag ALERT_DIGEST_ENABLED e evita envio vazio.
 */
@Service
public class AlertDigestService {

    private static final Logger log = LoggerFactory.getLogger(AlertDigestService.class);

    private static final Set<RoleEnum> DESTINATARIOS = Set.of(
        RoleEnum.ADMIN_EMPRESA,
        RoleEnum.SAFETY_ADMIN,
        RoleEnum.GERENTE_OPERACOES,
        RoleEnum.LIDER_EQUIPE
    );

    private static final List<StatusAlerta> ATIVOS = List.of(StatusAlerta.NOVO, StatusAlerta.VISUALIZADO);

    @Value("${alert.digest.enabled:false}")
    private boolean digestEnabled;

    private final OperationalAlertRepository alertRepository;
    private final FuncionarioRepository      funcionarioRepository;
    private final EmpresaRepository          empresaRepository;
    private final EmailNotificationService   emailService;

    public AlertDigestService(OperationalAlertRepository alertRepository,
                               FuncionarioRepository funcionarioRepository,
                               EmpresaRepository empresaRepository,
                               EmailNotificationService emailService) {
        this.alertRepository     = alertRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.empresaRepository   = empresaRepository;
        this.emailService        = emailService;
    }

    /**
     * Envia digest para uma empresa específica.
     * @return número de e-mails enviados com sucesso
     */
    @Transactional(readOnly = true)
    public int enviarDigestParaEmpresa(UUID empresaId) {
        if (!digestEnabled) {
            log.debug("Digest desabilitado (ALERT_DIGEST_ENABLED=false). Empresa: {}", empresaId);
            return 0;
        }

        List<OperationalAlert> alertasCriticos = alertRepository
            .findByEmpresaIdOrderByCreatedAtDesc(empresaId)
            .stream()
            .filter(a -> ATIVOS.contains(a.getStatus()))
            .filter(a -> a.getSeveridade() == SeveridadeAlerta.BLOCKED
                      || a.getSeveridade() == SeveridadeAlerta.RESTRICTED)
            .toList();

        if (alertasCriticos.isEmpty()) {
            log.debug("Digest pulado para empresa {} — sem alertas críticos.", empresaId);
            return 0;
        }

        String empresaNome = empresaRepository.findById(empresaId)
            .map(e -> e.getRazaoSocial())
            .orElse("Empresa #" + empresaId);

        List<Funcionario> destinatarios = funcionarioRepository
            .findByEmpresaIdAndAtivoTrue(empresaId)
            .stream()
            .filter(f -> DESTINATARIOS.contains(f.getRole()))
            .toList();

        if (destinatarios.isEmpty()) {
            log.warn("Digest para empresa {} — sem destinatários qualificados.", empresaNome);
            return 0;
        }

        int enviados = 0;
        for (Funcionario dest : destinatarios) {
            boolean ok = emailService.enviarDigest(
                dest.getEmail(), dest.getNome(), empresaNome, alertasCriticos
            );
            if (ok) enviados++;
        }

        log.info("Digest concluído para empresa '{}': {} e-mail(s) enviado(s) de {} destinatário(s).",
            empresaNome, enviados, destinatarios.size());
        return enviados;
    }

    /**
     * Envia digest para todas as empresas (chamado pelo scheduler ou SUPER_ADMIN).
     * @return total de e-mails enviados
     */
    @Transactional(readOnly = true)
    public int enviarDigestParaTodas() {
        if (!digestEnabled) {
            log.debug("Digest desabilitado globalmente.");
            return 0;
        }
        return empresaRepository.findAll().stream()
            .mapToInt(e -> enviarDigestParaEmpresa(e.getId()))
            .sum();
    }
}
