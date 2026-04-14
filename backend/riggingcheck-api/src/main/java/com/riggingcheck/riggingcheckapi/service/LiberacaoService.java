package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoRequest;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoResponse;
import com.riggingcheck.riggingcheckapi.dto.ResolverLiberacaoRequest;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
import com.riggingcheck.riggingcheckapi.shared.AuthorizationHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class LiberacaoService {

    private static final Logger log = LoggerFactory.getLogger(LiberacaoService.class);

    private final SolicitacaoLiberacaoRepository liberacaoRepository;
    private final FuncionarioRepository          funcionarioRepository;
    private final EmpresaRepository              empresaRepository;
    private final AuthorizationHelper            authorizationHelper;

    public LiberacaoService(SolicitacaoLiberacaoRepository liberacaoRepository,
                            FuncionarioRepository funcionarioRepository,
                            EmpresaRepository empresaRepository,
                            AuthorizationHelper authorizationHelper) {
        this.liberacaoRepository = liberacaoRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.empresaRepository   = empresaRepository;
        this.authorizationHelper = authorizationHelper;
    }

    @Transactional
    public LiberacaoResponse solicitar(LiberacaoRequest request, String emailSolicitante) {
        Funcionario solicitante = buscarFuncionarioOuLancar(emailSolicitante);
        Empresa empresa = buscarEmpresaOuLancar(solicitante.getEmpresaId());

        SolicitacaoLiberacao sol = montarSolicitacao(solicitante, empresa, request);

        log.info("Solicitação criada: OS={} | rigger={} | empresa={}",
                request.getOperacaoOs(), request.getRiggerNome(), empresa.getRazaoSocial());
        return toResponse(liberacaoRepository.save(sol));
    }

    public List<LiberacaoResponse> listar(String statusParam, String emailUsuario) {
        Funcionario usuario = buscarFuncionarioOuLancar(emailUsuario);
        authorizationHelper.requireAdmin(usuario);

        boolean isSuperAdmin  = usuario.getRole().name().equals("SUPER_ADMIN");
        StatusLiberacao status = parsarStatusOpcional(statusParam);

        List<SolicitacaoLiberacao> lista = isSuperAdmin
                ? listarGlobal(status)
                : listarPorEmpresa(usuario.getEmpresaId(), status);

        return lista.stream().map(this::toResponse).toList();
    }

    public LiberacaoResponse buscar(UUID id, String emailUsuario) {
        Funcionario usuario = buscarFuncionarioOuLancar(emailUsuario);
        SolicitacaoLiberacao sol = buscarSolicitacaoOuLancar(id);

        authorizationHelper.requireMesmaEmpresaOuSuper(usuario, sol.getEmpresaId());
        return toResponse(sol);
    }

    @Transactional
    public LiberacaoResponse aprovar(UUID id, ResolverLiberacaoRequest request, String emailAdmin) {
        return resolver(id, StatusLiberacao.PROSSEGUIR, request.getObservacao(), emailAdmin);
    }

    @Transactional
    public LiberacaoResponse negar(UUID id, ResolverLiberacaoRequest request, String emailAdmin) {
        return resolver(id, StatusLiberacao.PARAR, request.getObservacao(), emailAdmin);
    }

    // ── Helpers privados ─────────────────────────────────────────────────────────

    private LiberacaoResponse resolver(UUID id, StatusLiberacao novoStatus,
                                       String observacao, String emailAdmin) {
        Funcionario admin = buscarFuncionarioOuLancar(emailAdmin);
        authorizationHelper.requireAdminComResolucao(admin);

        SolicitacaoLiberacao sol = buscarSolicitacaoOuLancar(id);
        authorizationHelper.requireMesmaEmpresaOuSuper(admin, sol.getEmpresaId());

        if (sol.getStatus() != StatusLiberacao.ANALISAR) {
            throw new RegraDeNegocioException("Solicitação já foi resolvida");
        }

        sol.setStatus(novoStatus);
        sol.setAprovadoPorId(admin.getId());
        sol.setAprovadoPorNome(admin.getNome());
        sol.setObservacao(observacao);
        sol.setResolvidoEm(LocalDateTime.now());

        log.info("Solicitação {} {} por {}", id, novoStatus, emailAdmin);
        return toResponse(liberacaoRepository.save(sol));
    }

    private SolicitacaoLiberacao montarSolicitacao(Funcionario solicitante,
                                                   Empresa empresa,
                                                   LiberacaoRequest request) {
        SolicitacaoLiberacao sol = new SolicitacaoLiberacao();
        sol.setEmpresaId(solicitante.getEmpresaId());
        sol.setEmpresaNome(empresa.getRazaoSocial());
        sol.setOperacaoOs(request.getOperacaoOs());
        sol.setRiggerNome(request.getRiggerNome());
        sol.setSolicitadoPorId(solicitante.getId());

        mapearCapacidade(sol, request.getDadosCapacidade());
        mapearEslinga(sol, request.getDadosEslinga());

        return sol;
    }

    private void mapearCapacidade(SolicitacaoLiberacao sol, LiberacaoRequest.DadosCapacidade cap) {
        sol.setCapGuindasteKg(cap.getCapGuindasteKg());
        sol.setCapCargaKg(cap.getCapCargaKg());
        sol.setCapAparelhoKg(cap.getCapAparelhoKg());
        sol.setCapTotalKg(cap.getCapTotalKg());
        sol.setCapUsoPercent(cap.getCapUsoPercent());
        sol.setCapRisco(cap.getCapRisco());
    }

    private void mapearEslinga(SolicitacaoLiberacao sol, LiberacaoRequest.DadosEslinga esl) {
        sol.setEslNumPernas(esl.getEslNumPernas());
        sol.setEslAnguloGraus(esl.getEslAnguloGraus());
        sol.setEslTensaoPorPernaKg(esl.getEslTensaoPorPernaKg());
        sol.setEslFatorCarga(esl.getEslFatorCarga());
        sol.setEslRisco(esl.getEslRisco());
        sol.setEslAnguloAviso(esl.getEslAnguloAviso());
        sol.setEslWllKg(esl.getEslWllKg());
        sol.setEslWllUsoPercent(esl.getEslWllUsoPercent());
        sol.setEslTemManilha(esl.getEslTemManilha());
        sol.setEslManilhaCapacidadeKg(esl.getEslManilhaCapacidadeKg());
        sol.setEslManilhaUsoPercent(esl.getEslManilhaUsoPercent());
        sol.setEslManilhaCompativel(esl.getEslManilhaCompativel());
    }

    private List<SolicitacaoLiberacao> listarGlobal(StatusLiberacao status) {
        return status != null
                ? liberacaoRepository.findByStatusOrderByCriadoEmDesc(status)
                : liberacaoRepository.findAllByOrderByCriadoEmDesc();
    }

    private List<SolicitacaoLiberacao> listarPorEmpresa(UUID empresaId, StatusLiberacao status) {
        return status != null
                ? liberacaoRepository.findByEmpresaIdAndStatusOrderByCriadoEmDesc(empresaId, status)
                : liberacaoRepository.findByEmpresaIdOrderByCriadoEmDesc(empresaId);
    }

    private StatusLiberacao parsarStatusOpcional(String statusParam) {
        if (statusParam == null || statusParam.isBlank() || statusParam.equalsIgnoreCase("TODOS")) {
            return null;
        }
        try {
            return StatusLiberacao.valueOf(statusParam.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException(
                "Status inválido: " + statusParam + ". Valores aceitos: ANALISAR, PROSSEGUIR, PARAR, TODOS");
        }
    }

    private Funcionario buscarFuncionarioOuLancar(String email) {
        return funcionarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private Empresa buscarEmpresaOuLancar(UUID empresaId) {
        return empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));
    }

    private SolicitacaoLiberacao buscarSolicitacaoOuLancar(UUID id) {
        return liberacaoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitação"));
    }

    private LiberacaoResponse toResponse(SolicitacaoLiberacao sol) {
        return LiberacaoResponse.builder()
                .id(sol.getId())
                .empresaNome(sol.getEmpresaNome())
                .operacaoOs(sol.getOperacaoOs())
                .riggerNome(sol.getRiggerNome())
                .status(sol.getStatus() != null ? sol.getStatus().name() : null)
                .aprovadoPorNome(sol.getAprovadoPorNome())
                .observacao(sol.getObservacao())
                .criadoEm(sol.getCriadoEm())
                .resolvidoEm(sol.getResolvidoEm())
                .capGuindasteKg(sol.getCapGuindasteKg())
                .capCargaKg(sol.getCapCargaKg())
                .capAparelhoKg(sol.getCapAparelhoKg())
                .capTotalKg(sol.getCapTotalKg())
                .capUsoPercent(sol.getCapUsoPercent())
                .capRisco(sol.getCapRisco())
                .eslNumPernas(sol.getEslNumPernas())
                .eslAnguloGraus(sol.getEslAnguloGraus())
                .eslTensaoPorPernaKg(sol.getEslTensaoPorPernaKg())
                .eslFatorCarga(sol.getEslFatorCarga())
                .eslRisco(sol.getEslRisco())
                .eslAnguloAviso(sol.getEslAnguloAviso())
                .eslWllKg(sol.getEslWllKg())
                .eslWllUsoPercent(sol.getEslWllUsoPercent())
                .eslTemManilha(sol.getEslTemManilha())
                .eslManilhaCapacidadeKg(sol.getEslManilhaCapacidadeKg())
                .eslManilhaUsoPercent(sol.getEslManilhaUsoPercent())
                .eslManilhaCompativel(sol.getEslManilhaCompativel())
                .build();
    }
}
