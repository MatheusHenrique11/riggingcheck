package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.PasswordResetToken;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.ForgotPasswordRequest;
import com.riggingcheck.riggingcheckapi.dto.LoginRequest;
import com.riggingcheck.riggingcheckapi.dto.LoginResponse;
import com.riggingcheck.riggingcheckapi.dto.RegisterEmpresaRequest;
import com.riggingcheck.riggingcheckapi.dto.ResetPasswordRequest;
import com.riggingcheck.riggingcheckapi.dto.SetupRequest;
import com.riggingcheck.riggingcheckapi.exception.CredenciaisInvalidasException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.PasswordResetTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String CNPJ_SISTEMA = "00.000.000/0000-00";
    private static final int RESET_TOKEN_BYTES = 32;
    private static final long RESET_TOKEN_VALID_HOURS = 1;

    private final FuncionarioRepository funcionarioRepository;
    private final EmpresaRepository empresaRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailNotificationService emailNotificationService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.base-url:https://riggingcheck.app}")
    private String appBaseUrl;

    public AuthService(FuncionarioRepository funcionarioRepository,
                       EmpresaRepository empresaRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       JwtService jwtService,
                       BCryptPasswordEncoder passwordEncoder,
                       EmailNotificationService emailNotificationService) {
        this.funcionarioRepository = funcionarioRepository;
        this.empresaRepository = empresaRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.emailNotificationService = emailNotificationService;
    }

    public LoginResponse login(LoginRequest request) {
        Optional<Funcionario> funcionarioOpt = funcionarioRepository.findByEmail(request.getEmail());

        if (funcionarioOpt.isEmpty()
                || Boolean.FALSE.equals(funcionarioOpt.get().getAtivo())
                || !passwordEncoder.matches(request.getPassword(), funcionarioOpt.get().getPasswordHash())) {
            log.warn("Falha de login para o email: {}", request.getEmail());
            throw new CredenciaisInvalidasException();
        }

        Funcionario funcionario = funcionarioOpt.get();

        Empresa empresa = empresaRepository.findById(funcionario.getEmpresaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));

        if (Boolean.FALSE.equals(empresa.getAtivo())) {
            throw new CredenciaisInvalidasException();
        }

        return LoginResponse.builder()
                .token(jwtService.generateToken(funcionario))
                .userId(funcionario.getId())
                .userName(funcionario.getNome())
                .role(funcionario.getRole())
                .empresaId(empresa.getId())
                .empresaName(empresa.getRazaoSocial())
                .empresaCnpj(empresa.getCnpj())
                .subscriptionStatus(empresa.getSubscriptionStatus())
                .acceptedTerms(funcionario.getAcceptedTerms())
                .acceptedPrivacyPolicy(funcionario.getAcceptedPrivacyPolicy())
                .build();
    }

    /**
     * Cria o primeiro SUPER_ADMIN do sistema.
     * Isolamento SERIALIZABLE previne race condition em chamadas simultâneas.
     * Só funciona se ainda não existe nenhum SUPER_ADMIN no banco.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void setupSuperAdmin(SetupRequest request) {
        if (!funcionarioRepository.findByRole(RoleEnum.SUPER_ADMIN).isEmpty()) {
            throw new RegraDeNegocioException("Setup já realizado. SUPER_ADMIN já existe.");
        }

        Empresa empresaSistema = empresaRepository.findByCnpj(CNPJ_SISTEMA)
                .orElseGet(() -> {
                    Empresa e = new Empresa();
                    e.setRazaoSocial("RiggingCheck Sistema");
                    e.setCnpj(CNPJ_SISTEMA);
                    e.setAtivo(true);
                    return empresaRepository.save(e);
                });

        Funcionario superAdmin = new Funcionario();
        superAdmin.setEmpresaId(empresaSistema.getId());
        superAdmin.setNome(request.getNome());
        superAdmin.setEmail(request.getEmail());
        superAdmin.setPasswordHash(passwordEncoder.encode(request.getSenha()));
        superAdmin.setRole(RoleEnum.SUPER_ADMIN);
        superAdmin.setAtivo(true);
        funcionarioRepository.save(superAdmin);
    }

    @Transactional
    public void registerEmpresa(RegisterEmpresaRequest request) {
        if (empresaRepository.findByCnpj(request.getCnpj()).isPresent()) {
            throw new RegraDeNegocioException("CNPJ já cadastrado");
        }
        if (funcionarioRepository.findByEmail(request.getAdminEmail()).isPresent()) {
            throw new RegraDeNegocioException("Email já cadastrado");
        }

        Empresa empresa = new Empresa();
        empresa.setRazaoSocial(request.getRazaoSocial());
        empresa.setCnpj(request.getCnpj());
        empresa = empresaRepository.save(empresa);

        Funcionario admin = new Funcionario();
        admin.setEmpresaId(empresa.getId());
        admin.setNome(request.getAdminName());
        admin.setEmail(request.getAdminEmail());
        admin.setPasswordHash(passwordEncoder.encode(request.getAdminPassword()));
        admin.setRole(RoleEnum.ADMIN_EMPRESA);
        admin.setAtivo(true);
        funcionarioRepository.save(admin);
    }

    // ── Esqueci minha senha ──────────────────────────────────────────────────────

    /**
     * Solicita redefinição de senha. SEMPRE retorna normalmente, exista ou não
     * o e-mail — não revela ao chamador se o e-mail está cadastrado, para
     * evitar enumeração de contas. Se o funcionário existir e estiver ativo,
     * gera um token de uso único e envia o link por e-mail.
     */
    @Transactional
    public void solicitarResetSenha(ForgotPasswordRequest request) {
        Optional<Funcionario> funcionarioOpt = funcionarioRepository.findByEmail(request.getEmail());
        if (funcionarioOpt.isEmpty() || Boolean.FALSE.equals(funcionarioOpt.get().getAtivo())) {
            log.info("Reset de senha solicitado para e-mail não encontrado ou inativo: {}", request.getEmail());
            return;
        }

        Funcionario funcionario = funcionarioOpt.get();

        String tokenBruto = gerarTokenBruto();
        PasswordResetToken token = PasswordResetToken.builder()
                .funcionarioId(funcionario.getId())
                .empresaId(funcionario.getEmpresaId())
                .tokenHash(hashToken(tokenBruto))
                .expiresAt(LocalDateTime.now().plusHours(RESET_TOKEN_VALID_HOURS))
                .build();
        passwordResetTokenRepository.save(token);

        String resetLink = appBaseUrl + "/redefinir-senha?token=" + tokenBruto;
        emailNotificationService.enviarRedefinicaoSenha(funcionario.getEmail(), funcionario.getNome(), resetLink);
        log.info("Token de redefinição de senha gerado para: {}", funcionario.getEmail());
    }

    /**
     * Efetiva a redefinição de senha a partir de um token válido (não usado,
     * não expirado). Invalida também os demais tokens pendentes do mesmo
     * funcionário, para que um link antigo não continue utilizável.
     */
    @Transactional
    public void redefinirSenha(ResetPasswordRequest request) {
        String hash = hashToken(request.getToken());
        PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new RegraDeNegocioException("Link de redefinição inválido ou já utilizado."));

        if (!token.isValido()) {
            throw new RegraDeNegocioException("Link de redefinição inválido, expirado ou já utilizado.");
        }

        Funcionario funcionario = funcionarioRepository.findById(token.getFuncionarioId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));

        funcionario.setPasswordHash(passwordEncoder.encode(request.getNovaSenha()));
        funcionarioRepository.save(funcionario);

        LocalDateTime agora = LocalDateTime.now();
        token.setUsedAt(agora);
        passwordResetTokenRepository.save(token);

        // Invalida quaisquer outros tokens pendentes do mesmo funcionário.
        List<PasswordResetToken> outros = passwordResetTokenRepository
                .findByFuncionarioIdAndUsedAtIsNull(funcionario.getId());
        outros.forEach(t -> t.setUsedAt(agora));
        passwordResetTokenRepository.saveAll(outros);

        log.info("Senha redefinida via link de recuperação para: {}", funcionario.getEmail());
    }

    private String gerarTokenBruto() {
        byte[] bytes = new byte[RESET_TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String tokenBruto) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(tokenBruto.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 é garantido pela JVM (java.security.Security) — nunca deve ocorrer.
            throw new IllegalStateException("Algoritmo SHA-256 indisponível na JVM", e);
        }
    }
}
