package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.AcessorioIcamento;
import com.riggingcheck.riggingcheckapi.domain.CertificadoAcessorio;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.RiggingPlanAccessory;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoRequest;
import com.riggingcheck.riggingcheckapi.dto.RiggingPlanAccessoryResponse;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.AcessorioIcamentoRepository;
import com.riggingcheck.riggingcheckapi.repository.CertificadoAcessorioRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.InspecaoAcessorioRepository;
import com.riggingcheck.riggingcheckapi.repository.RiggingPlanAccessoryRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RiggingPlanAccessoryService {

    private static final Logger log = LoggerFactory.getLogger(RiggingPlanAccessoryService.class);

    private static final Set<RoleEnum> ROLES_GESTAO = EnumSet.of(
        RoleEnum.SUPER_ADMIN, RoleEnum.SAFETY_ADMIN,
        RoleEnum.ADMIN_EMPRESA, RoleEnum.LIDER_EQUIPE, RoleEnum.GERENTE_OPERACOES
    );

    private final RiggingPlanAccessoryRepository planAccessoryRepository;
    private final AcessorioIcamentoRepository    acessorioRepository;
    private final CertificadoAcessorioRepository certificadoRepository;
    private final InspecaoAcessorioRepository    inspecaoRepository;
    private final SolicitacaoLiberacaoRepository liberacaoRepository;
    private final FuncionarioRepository          funcionarioRepository;
    private final AuditLogService                auditLogService;

    public RiggingPlanAccessoryService(
            RiggingPlanAccessoryRepository planAccessoryRepository,
            AcessorioIcamentoRepository acessorioRepository,
            CertificadoAcessorioRepository certificadoRepository,
            InspecaoAcessorioRepository inspecaoRepository,
            SolicitacaoLiberacaoRepository liberacaoRepository,
            FuncionarioRepository funcionarioRepository,
            AuditLogService auditLogService) {
        this.planAccessoryRepository = planAccessoryRepository;
        this.acessorioRepository     = acessorioRepository;
        this.certificadoRepository   = certificadoRepository;
        this.inspecaoRepository      = inspecaoRepository;
        this.liberacaoRepository     = liberacaoRepository;
        this.funcionarioRepository   = funcionarioRepository;
        this.auditLogService         = auditLogService;
    }

    /**
     * Vincula uma lista de acessórios a um plano recém-criado.
     * Chamado dentro da transação de LiberacaoService.solicitar() — não abre nova transação.
     * O rollback da transação pai desfaz os vínculos em caso de erro.
     */
    public void vincularLista(UUID solicitacaoId, UUID empresaId,
                              List<LiberacaoRequest.AcessorioVinculoRequest> requests,
                              Funcionario actor) {
        if (requests == null || requests.isEmpty()) return;

        for (LiberacaoRequest.AcessorioVinculoRequest req : requests) {
            vincularUm(solicitacaoId, empresaId, req, actor);
        }
    }

    @Transactional(readOnly = true)
    public List<RiggingPlanAccessoryResponse> listar(UUID solicitacaoId, String email) {
        Funcionario actor = buscarFuncionario(email);
        SolicitacaoLiberacao sol = buscarPlano(solicitacaoId);
        requireAcesso(actor, sol.getEmpresaId());
        return planAccessoryRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(solicitacaoId)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public RiggingPlanAccessoryResponse vincular(UUID solicitacaoId,
                                                  LiberacaoRequest.AcessorioVinculoRequest req,
                                                  String email) {
        Funcionario actor = buscarFuncionario(email);
        requireGestao(actor);
        SolicitacaoLiberacao sol = buscarPlano(solicitacaoId);
        requireAcesso(actor, sol.getEmpresaId());

        RiggingPlanAccessory salvo = vincularUm(solicitacaoId, sol.getEmpresaId(), req, actor);
        auditLogService.log(actor, "PLANO_ACESSORIO_VINCULADO", "RIGGING_PLAN", solicitacaoId,
            "Acessório " + salvo.getCodigoInternoSnapshot() + " vinculado ao plano");
        return toResponse(salvo);
    }

    @Transactional
    public void remover(UUID solicitacaoId, UUID acessorioId, String email) {
        Funcionario actor = buscarFuncionario(email);
        requireGestao(actor);
        SolicitacaoLiberacao sol = buscarPlano(solicitacaoId);
        requireAcesso(actor, sol.getEmpresaId());

        if (!planAccessoryRepository.existsBySolicitacaoLiberacaoIdAndAcessorioId(solicitacaoId, acessorioId)) {
            throw new RecursoNaoEncontradoException("Vínculo");
        }
        planAccessoryRepository.deleteBySolicitacaoLiberacaoIdAndAcessorioId(solicitacaoId, acessorioId);
        auditLogService.log(actor, "PLANO_ACESSORIO_REMOVIDO", "RIGGING_PLAN", solicitacaoId,
            "Acessório " + acessorioId + " removido do plano");
        log.info("Acessório {} removido do plano {} por {}", acessorioId, solicitacaoId, email);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private RiggingPlanAccessory vincularUm(UUID solicitacaoId, UUID empresaIdPlano,
                                             LiberacaoRequest.AcessorioVinculoRequest req,
                                             Funcionario actor) {
        AcessorioIcamento acessorio = acessorioRepository.findById(req.getAcessorioId())
            .orElseThrow(() -> new RecursoNaoEncontradoException("Acessório " + req.getAcessorioId()));

        // Valida multiempresa: SUPER_ADMIN pode vincular qualquer acessório à empresa do plano
        if (actor.getRole() != RoleEnum.SUPER_ADMIN
                && !acessorio.getEmpresaId().equals(empresaIdPlano)) {
            throw new RegraDeNegocioException(
                "Acessório " + acessorio.getCodigoInterno() + " pertence a outra empresa.");
        }

        if (planAccessoryRepository.existsBySolicitacaoLiberacaoIdAndAcessorioId(solicitacaoId, acessorio.getId())) {
            throw new RegraDeNegocioException(
                "Acessório " + acessorio.getCodigoInterno() + " já está vinculado a este plano.");
        }

        String certStatus = certificadoRepository
            .findByAcessorioIdOrderByCriadoEmDesc(acessorio.getId())
            .stream().findFirst()
            .map(CertificadoAcessorio::getStatus)
            .map(Enum::name)
            .orElse("AUSENTE");

        String inspStatus = inspecaoRepository
            .findTopByAcessorioIdOrderByDataInspecaoDesc(acessorio.getId())
            .map(i -> i.getResultado() != null ? i.getResultado().name() : null)
            .orElse(null);

        RiggingPlanAccessory vínculo = RiggingPlanAccessory.builder()
            .solicitacaoLiberacaoId(solicitacaoId)
            .acessorioId(acessorio.getId())
            .empresaId(empresaIdPlano)
            .codigoInternoSnapshot(acessorio.getCodigoInterno())
            .tipoSnapshot(acessorio.getTipo() != null ? acessorio.getTipo().name() : null)
            .descricaoSnapshot(acessorio.getDescricao())
            .wllKgSnapshot(acessorio.getCapacidadeWllKg())
            .statusSnapshot(acessorio.getStatus() != null ? acessorio.getStatus().name() : null)
            .certificadoStatusSnapshot(certStatus)
            .ultimaInspecaoResultadoSnapshot(inspStatus)
            .cargaAplicadaKg(req.getCargaAplicadaKg())
            .observacao(req.getObservacao())
            .build();

        return planAccessoryRepository.save(vínculo);
    }

    private void requireGestao(Funcionario actor) {
        if (!actor.getAtivo()) throw new AcessoNegadoException();
        if (!ROLES_GESTAO.contains(actor.getRole())) throw new AcessoNegadoException();
    }

    private void requireAcesso(Funcionario actor, UUID empresaAlvo) {
        if (actor.getRole() != RoleEnum.SUPER_ADMIN
                && !actor.getEmpresaId().equals(empresaAlvo)) {
            throw new AcessoNegadoException();
        }
    }

    private Funcionario buscarFuncionario(String email) {
        return funcionarioRepository.findByEmail(email)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private SolicitacaoLiberacao buscarPlano(UUID id) {
        return liberacaoRepository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Plano"));
    }

    private RiggingPlanAccessoryResponse toResponse(RiggingPlanAccessory a) {
        return RiggingPlanAccessoryResponse.builder()
            .id(a.getId())
            .solicitacaoLiberacaoId(a.getSolicitacaoLiberacaoId())
            .acessorioId(a.getAcessorioId())
            .codigoInternoSnapshot(a.getCodigoInternoSnapshot())
            .tipoSnapshot(a.getTipoSnapshot())
            .descricaoSnapshot(a.getDescricaoSnapshot())
            .wllKgSnapshot(a.getWllKgSnapshot())
            .statusSnapshot(a.getStatusSnapshot())
            .certificadoStatusSnapshot(a.getCertificadoStatusSnapshot())
            .ultimaInspecaoResultadoSnapshot(a.getUltimaInspecaoResultadoSnapshot())
            .cargaAplicadaKg(a.getCargaAplicadaKg())
            .observacao(a.getObservacao())
            .createdAt(a.getCreatedAt())
            .build();
    }
}
