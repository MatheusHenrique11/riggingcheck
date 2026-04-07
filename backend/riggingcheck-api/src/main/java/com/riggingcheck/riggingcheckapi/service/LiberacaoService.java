package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoRequest;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoResponse;
import com.riggingcheck.riggingcheckapi.dto.ResolverLiberacaoRequest;
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

    public LiberacaoService(SolicitacaoLiberacaoRepository liberacaoRepository,
                            FuncionarioRepository funcionarioRepository) {
        this.liberacaoRepository = liberacaoRepository;
        this.funcionarioRepository = funcionarioRepository;
    }

    @Transactional
    public LiberacaoResponse solicitar(LiberacaoRequest request, String emailSolicitante) {
        Funcionario solicitante = funcionarioRepository.findByEmail(emailSolicitante)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        SolicitacaoLiberacao sol = new SolicitacaoLiberacao();
        sol.setEmpresaId(solicitante.getEmpresaId());
        sol.setOperacaoOs(request.getOperacaoOs());
        sol.setRiggerNome(request.getRiggerNome());
        sol.setSolicitadoPorId(solicitante.getId());

        return toResponse(liberacaoRepository.save(sol));
    }

    public List<LiberacaoResponse> listarPendentes(String emailAdmin) {
        Funcionario admin = funcionarioRepository.findByEmail(emailAdmin)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        validarAdmin(admin);

        return liberacaoRepository
                .findByEmpresaIdAndStatusOrderByCriadoEmDesc(admin.getEmpresaId(), "PENDENTE")
                .stream().map(this::toResponse).toList();
    }

    public LiberacaoResponse buscar(UUID id, String emailUsuario) {
        Funcionario usuario = funcionarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        SolicitacaoLiberacao sol = liberacaoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitação não encontrada"));

        if (!sol.getEmpresaId().equals(usuario.getEmpresaId())) {
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

        if (!sol.getEmpresaId().equals(admin.getEmpresaId())) {
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
                .operacaoOs(sol.getOperacaoOs())
                .riggerNome(sol.getRiggerNome())
                .status(sol.getStatus())
                .aprovadoPorNome(sol.getAprovadoPorNome())
                .observacao(sol.getObservacao())
                .criadoEm(sol.getCriadoEm())
                .resolvidoEm(sol.getResolvidoEm())
                .build();
    }
}
