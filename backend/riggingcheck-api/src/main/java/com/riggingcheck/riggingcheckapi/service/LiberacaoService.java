package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoRequest;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoResponse;
import com.riggingcheck.riggingcheckapi.dto.ResolverLiberacaoRequest;
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
        Funcionario solicitante = funcionarioRepository.findByEmail(emailSolicitante)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Empresa empresa = empresaRepository.findById(solicitante.getEmpresaId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

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

    public List<LiberacaoResponse> listar(String status, String emailUsuario) {
        Funcionario usuario = funcionarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        validarAdmin(usuario);

        boolean isSuperAdmin = usuario.getRole() == RoleEnum.SUPER_ADMIN;
        boolean filtrarStatus = status != null && !status.isBlank() && !status.equalsIgnoreCase("TODOS");

        if (isSuperAdmin) {
            return (filtrarStatus
                    ? liberacaoRepository.findByStatusOrderByCriadoEmDesc(status.toUpperCase())
                    : liberacaoRepository.findAllByOrderByCriadoEmDesc())
                    .stream().map(this::toResponse).toList();
        }

        return (filtrarStatus
                ? liberacaoRepository.findByEmpresaIdAndStatusOrderByCriadoEmDesc(usuario.getEmpresaId(), status.toUpperCase())
                : liberacaoRepository.findByEmpresaIdOrderByCriadoEmDesc(usuario.getEmpresaId()))
                .stream().map(this::toResponse).toList();
    }

    public LiberacaoResponse buscar(UUID id, String emailUsuario) {
        Funcionario usuario = funcionarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        SolicitacaoLiberacao sol = liberacaoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitação não encontrada"));

        boolean isSuperAdmin = usuario.getRole() == RoleEnum.SUPER_ADMIN;
        if (!isSuperAdmin && !sol.getEmpresaId().equals(usuario.getEmpresaId())) {
            throw new RuntimeException("Acesso negado");
        }

        return toResponse(sol);
    }

    @Transactional
    public LiberacaoResponse aprovar(UUID id, ResolverLiberacaoRequest request, String emailAdmin) {
        return resolver(id, "APROVADO", request.getObservacao(), emailAdmin);
    }

    @Transactional
    public LiberacaoResponse negar(UUID id, ResolverLiberacaoRequest request, String emailAdmin) {
        return resolver(id, "NEGADO", request.getObservacao(), emailAdmin);
    }

    private LiberacaoResponse resolver(UUID id, String novoStatus, String observacao, String emailAdmin) {
        Funcionario admin = funcionarioRepository.findByEmail(emailAdmin)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        validarAdmin(admin);

        SolicitacaoLiberacao sol = liberacaoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitação não encontrada"));

        boolean isSuperAdmin = admin.getRole() == RoleEnum.SUPER_ADMIN;
        if (!isSuperAdmin && !sol.getEmpresaId().equals(admin.getEmpresaId())) {
            throw new RuntimeException("Acesso negado");
        }

        if (!"PENDENTE".equals(sol.getStatus())) {
            throw new RuntimeException("Solicitação já foi resolvida");
        }

        sol.setStatus(novoStatus);
        sol.setAprovadoPorId(admin.getId());
        sol.setAprovadoPorNome(admin.getNome());
        sol.setObservacao(observacao);
        sol.setResolvidoEm(LocalDateTime.now());

        return toResponse(liberacaoRepository.save(sol));
    }

    private void validarAdmin(Funcionario funcionario) {
        if (funcionario.getRole() != RoleEnum.ADMIN_EMPRESA
                && funcionario.getRole() != RoleEnum.GERENTE_OPERACOES
                && funcionario.getRole() != RoleEnum.SUPER_ADMIN) {
            throw new RuntimeException("Acesso negado: apenas administradores podem realizar esta ação");
        }
    }

    private LiberacaoResponse toResponse(SolicitacaoLiberacao sol) {
        return LiberacaoResponse.builder()
                .id(sol.getId())
                .empresaNome(sol.getEmpresaNome())
                .operacaoOs(sol.getOperacaoOs())
                .riggerNome(sol.getRiggerNome())
                .status(sol.getStatus())
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
