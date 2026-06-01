package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.AlterarSenhaRequest;
import com.riggingcheck.riggingcheckapi.dto.AtualizarFuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioResponse;
import com.riggingcheck.riggingcheckapi.dto.TeamCompetencyDashboardResponse;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.shared.AuthorizationHelper;
import com.riggingcheck.riggingcheckapi.shared.FuncionarioMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class FuncionarioService {

    private static final Logger log = LoggerFactory.getLogger(FuncionarioService.class);

    private static final Set<RoleEnum> ROLES_PERMITIDAS_ADMIN = Set.of(
        RoleEnum.RIGGER, RoleEnum.OPERADOR_GUINDASTE, RoleEnum.GERENTE_OPERACOES, RoleEnum.LIDER_EQUIPE
    );

    private static final Set<RoleEnum> ROLES_PERMITIDAS_SUPER = Set.of(
        RoleEnum.RIGGER, RoleEnum.OPERADOR_GUINDASTE, RoleEnum.GERENTE_OPERACOES,
        RoleEnum.LIDER_EQUIPE, RoleEnum.ADMIN_EMPRESA
    );

    private final FuncionarioRepository funcionarioRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final AuthorizationHelper authorizationHelper;
    private final FuncionarioMapper mapper;

    public FuncionarioService(FuncionarioRepository funcionarioRepository,
                              BCryptPasswordEncoder passwordEncoder,
                              AuthorizationHelper authorizationHelper,
                              FuncionarioMapper mapper) {
        this.funcionarioRepository = funcionarioRepository;
        this.passwordEncoder        = passwordEncoder;
        this.authorizationHelper    = authorizationHelper;
        this.mapper                 = mapper;
    }

    @Transactional
    public FuncionarioResponse criar(FuncionarioRequest request, String emailAdmin) {
        Funcionario admin = buscarPorEmailOuLancar(emailAdmin);
        authorizationHelper.requireGestorFuncionarios(admin);

        RoleEnum role = resolverRole(request.getRole());
        validarRolePermitida(role, admin);
        validarEmailDisponivel(request.getEmail());

        Funcionario novo = new Funcionario();
        novo.setEmpresaId(admin.getEmpresaId());
        novo.setNome(request.getNome());
        novo.setEmail(request.getEmail());
        novo.setPasswordHash(passwordEncoder.encode(request.getSenha()));
        novo.setRole(role);
        novo.setAtivo(true);

        log.info("Funcionário criado: {} | role: {} | por: {}", novo.getEmail(), role, emailAdmin);
        return mapper.toResponse(funcionarioRepository.save(novo));
    }

    @Transactional(readOnly = true)
    public List<FuncionarioResponse> listar(String emailAdmin) {
        Funcionario admin = buscarPorEmailOuLancar(emailAdmin);
        authorizationHelper.requireAdmin(admin);

        return funcionarioRepository
                .findByEmpresaIdOrderByCriadoEmDesc(admin.getEmpresaId())
                .stream()
                .filter(f -> !f.getId().equals(admin.getId()))
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional
    public void desativar(UUID id, String emailAdmin) {
        Funcionario admin       = buscarPorEmailOuLancar(emailAdmin);
        Funcionario funcionario = buscarPorIdOuLancar(id);

        authorizationHelper.requireGestorFuncionarios(admin);
        authorizationHelper.requireMesmaEmpresaOuSuper(admin, funcionario.getEmpresaId());

        if (funcionario.getId().equals(admin.getId())) {
            throw new RegraDeNegocioException("Não é possível desativar sua própria conta");
        }

        funcionario.setAtivo(false);
        funcionarioRepository.save(funcionario);
        log.info("Funcionário desativado: {} | por: {}", id, emailAdmin);
    }

    @Transactional
    public void reativar(UUID id, String emailAdmin) {
        Funcionario admin       = buscarPorEmailOuLancar(emailAdmin);
        Funcionario funcionario = buscarPorIdOuLancar(id);

        authorizationHelper.requireGestorFuncionarios(admin);
        authorizationHelper.requireMesmaEmpresaOuSuper(admin, funcionario.getEmpresaId());

        funcionario.setAtivo(true);
        funcionarioRepository.save(funcionario);
        log.info("Funcionário reativado: {} | por: {}", id, emailAdmin);
    }

    @Transactional
    public void alterarSenha(String emailFuncionario, AlterarSenhaRequest request) {
        Funcionario funcionario = buscarPorEmailOuLancar(emailFuncionario);

        if (!passwordEncoder.matches(request.getSenhaAtual(), funcionario.getPasswordHash())) {
            throw new RegraDeNegocioException("Senha atual incorreta");
        }

        funcionario.setPasswordHash(passwordEncoder.encode(request.getNovaSenha()));
        funcionarioRepository.save(funcionario);
        log.info("Senha alterada para: {}", emailFuncionario);
    }

    @Transactional
    public FuncionarioResponse atualizar(UUID id, AtualizarFuncionarioRequest request, String emailAdmin) {
        Funcionario admin       = buscarPorEmailOuLancar(emailAdmin);
        Funcionario funcionario = buscarPorIdOuLancar(id);

        authorizationHelper.requireGestorFuncionarios(admin);
        authorizationHelper.requireMesmaEmpresaOuSuper(admin, funcionario.getEmpresaId());

        RoleEnum role = resolverRole(request.getRole());
        validarRolePermitida(role, admin);

        boolean emailAlterado = !funcionario.getEmail().equalsIgnoreCase(request.getEmail());
        if (emailAlterado) validarEmailDisponivel(request.getEmail());

        funcionario.setNome(request.getNome());
        funcionario.setEmail(request.getEmail());
        funcionario.setRole(role);

        log.info("Funcionário atualizado: {} | role: {} | por: {}", id, role, emailAdmin);
        return mapper.toResponse(funcionarioRepository.save(funcionario));
    }

    // ── Dashboard de Competências ────────────────────────────────────────────────

    private static final int DIAS_ALERTA_COMP  = 30;
    private static final int MAX_ITENS_CRITICOS = 50;
    private static final DateTimeFormatter FMT_D = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public TeamCompetencyDashboardResponse getDashboardCompetencias(String email) {
        Funcionario actor = buscarPorEmailOuLancar(email);
        authorizationHelper.requireAdmin(actor);

        List<Funcionario> lista = actor.getRole() == RoleEnum.SUPER_ADMIN
            ? funcionarioRepository.findAll()
            : funcionarioRepository.findByEmpresaIdAndAtivoTrue(actor.getEmpresaId());

        LocalDate hoje   = LocalDate.now();
        LocalDate limite = hoje.plusDays(DIAS_ALERTA_COMP);

        int aptos = 0, bloqueados = 0, aVencer = 0;
        int asoVencido = 0, nr11Vencida = 0, nr35Vencida = 0;

        Map<String, int[]> porFuncaoMap = new LinkedHashMap<>(); // [total, aptos, bloqueados, aVencer]
        List<TeamCompetencyDashboardResponse.ItemCritico> itensCriticos = new ArrayList<>();

        for (Funcionario f : lista) {
            String funcao = f.getRole() != null ? f.getRole().name() : "OUTRO";
            porFuncaoMap.computeIfAbsent(funcao, k -> new int[4]);
            porFuncaoMap.get(funcao)[0]++;

            boolean bloqueado = ehBloqueado(f, hoje);
            boolean aVencerFlag = !bloqueado && estaAVencer(f, hoje, limite);

            if (bloqueado) {
                bloqueados++;
                porFuncaoMap.get(funcao)[2]++;
                coletarItensCriticos(itensCriticos, f, funcao, hoje);
            } else if (aVencerFlag) {
                aVencer++;
                porFuncaoMap.get(funcao)[3]++;
                coletarItensCriticos(itensCriticos, f, funcao, hoje);
            } else {
                aptos++;
                porFuncaoMap.get(funcao)[1]++;
            }

            // Contadores individuais de causa
            if (f.getVencimentoAso() == null || f.getVencimentoAso().isBefore(hoje)) asoVencido++;
            if (f.getVencimentoNr11() == null || f.getVencimentoNr11().isBefore(hoje)) nr11Vencida++;
            if (f.getVencimentoNr35() == null || f.getVencimentoNr35().isBefore(hoje)) nr35Vencida++;
        }

        List<TeamCompetencyDashboardResponse.PorFuncao> porFuncaoList = porFuncaoMap.entrySet().stream()
            .map(e -> TeamCompetencyDashboardResponse.PorFuncao.builder()
                .funcao(e.getKey())
                .total(e.getValue()[0])
                .aptos(e.getValue()[1])
                .bloqueados(e.getValue()[2])
                .aVencer(e.getValue()[3])
                .build())
            .toList();

        List<TeamCompetencyDashboardResponse.ItemCritico> criticosFinal = itensCriticos.size() > MAX_ITENS_CRITICOS
            ? itensCriticos.subList(0, MAX_ITENS_CRITICOS)
            : itensCriticos;

        return TeamCompetencyDashboardResponse.builder()
            .totalFuncionarios(lista.size())
            .aptos(aptos)
            .bloqueados(bloqueados)
            .aVencer(aVencer)
            .asoVencido(asoVencido)
            .nr11Vencida(nr11Vencida)
            .nr35Vencida(nr35Vencida)
            .porFuncao(porFuncaoList)
            .itensCriticos(criticosFinal)
            .build();
    }

    private boolean ehBloqueado(Funcionario f, LocalDate hoje) {
        return f.getVencimentoAso() == null  || f.getVencimentoAso().isBefore(hoje)
            || f.getVencimentoNr11() == null || f.getVencimentoNr11().isBefore(hoje);
    }

    private boolean estaAVencer(Funcionario f, LocalDate hoje, LocalDate limite) {
        return isAVencer(f.getVencimentoNr11(), hoje, limite)
            || isAVencer(f.getVencimentoNr35(), hoje, limite)
            || isAVencer(f.getVencimentoAso(),  hoje, limite);
    }

    private boolean isAVencer(LocalDate d, LocalDate hoje, LocalDate limite) {
        return d != null && !d.isBefore(hoje) && d.isBefore(limite);
    }

    private void coletarItensCriticos(List<TeamCompetencyDashboardResponse.ItemCritico> lista,
                                       Funcionario f, String funcao, LocalDate hoje) {
        if (lista.size() >= MAX_ITENS_CRITICOS * 2) return;

        // ASO
        if (f.getVencimentoAso() == null) {
            lista.add(buildCritico(f, funcao, "ASO ausente", null, "BLOCKED"));
        } else if (f.getVencimentoAso().isBefore(hoje)) {
            lista.add(buildCritico(f, funcao, "ASO vencido", f.getVencimentoAso().format(FMT_D), "BLOCKED"));
        } else if (isAVencer(f.getVencimentoAso(), hoje, hoje.plusDays(DIAS_ALERTA_COMP))) {
            lista.add(buildCritico(f, funcao, "ASO a vencer", f.getVencimentoAso().format(FMT_D), "RESTRICTED"));
        }

        // NR-11
        if (f.getVencimentoNr11() == null) {
            lista.add(buildCritico(f, funcao, "NR-11 ausente", null, "BLOCKED"));
        } else if (f.getVencimentoNr11().isBefore(hoje)) {
            lista.add(buildCritico(f, funcao, "NR-11 vencida", f.getVencimentoNr11().format(FMT_D), "BLOCKED"));
        } else if (isAVencer(f.getVencimentoNr11(), hoje, hoje.plusDays(DIAS_ALERTA_COMP))) {
            lista.add(buildCritico(f, funcao, "NR-11 a vencer", f.getVencimentoNr11().format(FMT_D), "RESTRICTED"));
        }

        // NR-35
        if (f.getVencimentoNr35() != null) {
            if (f.getVencimentoNr35().isBefore(hoje)) {
                lista.add(buildCritico(f, funcao, "NR-35 vencida", f.getVencimentoNr35().format(FMT_D), "RESTRICTED"));
            } else if (isAVencer(f.getVencimentoNr35(), hoje, hoje.plusDays(DIAS_ALERTA_COMP))) {
                lista.add(buildCritico(f, funcao, "NR-35 a vencer", f.getVencimentoNr35().format(FMT_D), "RESTRICTED"));
            }
        }
    }

    private TeamCompetencyDashboardResponse.ItemCritico buildCritico(
            Funcionario f, String funcao, String motivo, String dataVencimento, String severidade) {
        return TeamCompetencyDashboardResponse.ItemCritico.builder()
            .funcionarioId(f.getId())
            .nome(f.getNome())
            .funcao(funcao)
            .motivo(motivo)
            .dataVencimento(dataVencimento)
            .severidade(severidade)
            .build();
    }

    // ── Helpers privados ────────────────────────────────────────────────────────

    private Funcionario buscarPorEmailOuLancar(String email) {
        return funcionarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private Funcionario buscarPorIdOuLancar(UUID id) {
        return funcionarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Funcionário"));
    }

    private RoleEnum resolverRole(String roleStr) {
        try {
            return RoleEnum.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException("Cargo inválido: " + roleStr);
        }
    }

    private void validarRolePermitida(RoleEnum role, Funcionario admin) {
        Set<RoleEnum> permitidas = admin.getRole() == RoleEnum.SUPER_ADMIN
                ? ROLES_PERMITIDAS_SUPER : ROLES_PERMITIDAS_ADMIN;
        if (!permitidas.contains(role)) {
            throw new AcessoNegadoException();
        }
    }

    private void validarEmailDisponivel(String email) {
        if (funcionarioRepository.findByEmail(email).isPresent()) {
            throw new RegraDeNegocioException("Email já cadastrado");
        }
    }
}
