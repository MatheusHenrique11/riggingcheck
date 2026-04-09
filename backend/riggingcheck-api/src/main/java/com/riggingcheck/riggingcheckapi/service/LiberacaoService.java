package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoRequest;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoResponse;
import com.riggingcheck.riggingcheckapi.dto.ResolverLiberacaoRequest;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class LiberacaoService {

    private final SolicitacaoLiberacaoRepository liberacaoRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final EmpresaRepository empresaRepository;

    public LiberacaoService(SolicitacaoLiberacaoRepository liberacaoRepository,
                            FuncionarioRepository funcionarioRepository,
                            EmpresaRepository empresaRepository) {
        this.liberacaoRepository = liberacaoRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.empresaRepository = empresaRepository;
    }

    @Transactional
    public LiberacaoResponse solicitar(LiberacaoRequest request, String emailSolicitante) {
        Funcionario solicitante = buscarFuncionario(emailSolicitante);
        Empresa empresa = empresaRepository.findById(solicitante.getEmpresaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));

        SolicitacaoLiberacao sol = new SolicitacaoLiberacao();
        sol.setEmpresaId(solicitante.getEmpresaId());
        sol.setEmpresaNome(empresa.getRazaoSocial());
        sol.setOperacaoOs(request.getOperacaoOs());
        sol.setRiggerNome(request.getRiggerNome());
        sol.setSolicitadoPorId(solicitante.getId());

        LiberacaoRequest.DadosCapacidade cap = request.getDadosCapacidade();
        sol.setCapGuindasteKg(cap.getCapGuindasteKg());
        sol.setCapCargaKg(cap.getCapCargaKg());
        sol.setCapAparelhoKg(cap.getCapAparelhoKg());
        sol.setCapTotalKg(cap.getCapTotalKg());
        sol.setCapUsoPercent(cap.getCapUsoPercent());
        sol.setCapRisco(cap.getCapRisco());

        LiberacaoRequest.DadosEslinga esl = request.getDadosEslinga();
        sol.setEslNumPernas(esl.getEslNumPernas());
        sol.setEslAnguloGraus(esl.getEslAnguloGraus());
        sol.setEslTensaoPorPernaKg(esl.getEslTensaoPorPernaKg());
        sol.setEslFatorCarga(esl.getEslFatorCarga());
        sol.setEslRisco(esl.getEslRisco());
        sol.setEslAnguloAviso(esl.getEslAnguloAviso());

        return toResponse(liberacaoRepository.save(sol));
    }

    public List<LiberacaoResponse> listar(String statusParam, String emailUsuario) {
        Funcionario usuario = buscarFuncionario(emailUsuario);
        validarPermissaoAdmin(usuario);

        boolean isSuperAdmin = usuario.getRole() == RoleEnum.SUPER_ADMIN;
        boolean filtrarStatus = statusParam != null && !statusParam.isBlank()
                && !statusParam.equalsIgnoreCase("TODOS");

        StatusLiberacao status = filtrarStatus ? parseStatus(statusParam) : null;

        if (isSuperAdmin) {
            return (status != null
                    ? liberacaoRepository.findByStatusOrderByCriadoEmDesc(status.name())
                    : liberacaoRepository.findAllByOrderByCriadoEmDesc())
                    .stream().map(this::toResponse).toList();
        }

        return (status != null
                ? liberacaoRepository.findByEmpresaIdAndStatusOrderByCriadoEmDesc(usuario.getEmpresaId(), status.name())
                : liberacaoRepository.findByEmpresaIdOrderByCriadoEmDesc(usuario.getEmpresaId()))
                .stream().map(this::toResponse).toList();
    }

    public LiberacaoResponse buscar(UUID id, String emailUsuario) {
        Funcionario usuario = buscarFuncionario(emailUsuario);

        SolicitacaoLiberacao sol = liberacaoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitação"));

        boolean isSuperAdmin = usuario.getRole() == RoleEnum.SUPER_ADMIN;
        if (!isSuperAdmin && !sol.getEmpresaId().equals(usuario.getEmpresaId())) {
            throw new AcessoNegadoException();
        }

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

    private LiberacaoResponse resolver(UUID id, StatusLiberacao novoStatus, String observacao, String emailAdmin) {
        Funcionario admin = buscarFuncionario(emailAdmin);
        validarPermissaoAdmin(admin);

        SolicitacaoLiberacao sol = liberacaoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitação"));

        boolean isSuperAdmin = admin.getRole() == RoleEnum.SUPER_ADMIN;
        if (!isSuperAdmin && !sol.getEmpresaId().equals(admin.getEmpresaId())) {
            throw new AcessoNegadoException();
        }

        if (sol.getStatus() != StatusLiberacao.ANALISAR) {
            throw new RegraDeNegocioException("Solicitação já foi resolvida");
        }

        sol.setStatus(novoStatus);
        sol.setAprovadoPorId(admin.getId());
        sol.setAprovadoPorNome(admin.getNome());
        sol.setObservacao(observacao);
        sol.setResolvidoEm(LocalDateTime.now());

        return toResponse(liberacaoRepository.save(sol));
    }

    private Funcionario buscarFuncionario(String email) {
        return funcionarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private void validarPermissaoAdmin(Funcionario funcionario) {
        if (funcionario.getRole() != RoleEnum.ADMIN_EMPRESA
                && funcionario.getRole() != RoleEnum.GERENTE_OPERACOES
                && funcionario.getRole() != RoleEnum.SUPER_ADMIN) {
            throw new AcessoNegadoException();
        }
    }

    private StatusLiberacao parseStatus(String valor) {
        try {
            return StatusLiberacao.valueOf(valor.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException("Status inválido: " + valor + ". Valores aceitos: ANALISAR, PROSSEGUIR, PARAR, TODOS");
        }
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
                .build();
    }
}
