package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.dto.LgpdConsentRequest;
import com.riggingcheck.riggingcheckapi.dto.LgpdExportResponse;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class LgpdService {

    private static final Logger log = LoggerFactory.getLogger(LgpdService.class);
    private static final String NOME_ANONIMO = "Operador Excluído";

    private final FuncionarioRepository funcionarioRepository;
    private final EmpresaRepository empresaRepository;
    private final SolicitacaoLiberacaoRepository solicitacaoRepository;

    public LgpdService(FuncionarioRepository funcionarioRepository,
                       EmpresaRepository empresaRepository,
                       SolicitacaoLiberacaoRepository solicitacaoRepository) {
        this.funcionarioRepository = funcionarioRepository;
        this.empresaRepository = empresaRepository;
        this.solicitacaoRepository = solicitacaoRepository;
    }

    @Transactional
    public void atualizarConsentimento(UUID funcionarioId, LgpdConsentRequest request) {
        Funcionario funcionario = buscarFuncionario(funcionarioId);
        funcionario.setAcceptedTerms(request.getAcceptedTerms());
        funcionario.setAcceptedPrivacyPolicy(request.getAcceptedPrivacyPolicy());
        funcionario.setConsentDate(LocalDateTime.now());
        funcionarioRepository.save(funcionario);
        log.info("Consentimento LGPD atualizado para funcionário {}", funcionarioId);
    }

    /**
     * LGPD Art. 18 — Direito à eliminação.
     * Checklists de segurança NÃO são deletados (requisito de auditoria industrial).
     * Os dados pessoais identificáveis são anonimizados; o registro de liberação permanece
     * com referência ao ID do operador, mas sem informações pessoais rastreáveis.
     */
    @Transactional
    public void anonimizarConta(UUID funcionarioId) {
        Funcionario funcionario = buscarFuncionario(funcionarioId);

        if (NOME_ANONIMO.equals(funcionario.getNome())) {
            throw new RegraDeNegocioException("Conta já foi anonimizada.");
        }

        String emailAnonimo = "excluido-" + UUID.randomUUID() + "@riggingcheck.invalid";

        funcionario.setNome(NOME_ANONIMO);
        funcionario.setEmail(emailAnonimo);
        funcionario.setPasswordHash("ACCOUNT_DELETED");
        funcionario.setVencimentoNr11(null);
        funcionario.setVencimentoNr35(null);
        funcionario.setVencimentoAso(null);
        funcionario.setChaveApi(null);
        funcionario.setAtivo(false);
        funcionario.setAcceptedTerms(false);
        funcionario.setAcceptedPrivacyPolicy(false);
        funcionario.setConsentDate(null);
        funcionarioRepository.save(funcionario);

        // Anonimiza o nome do rigger nos registros de auditoria para remover PII
        // mantendo os registros operacionais (operacaoOs, status, cargas) intactos
        List<SolicitacaoLiberacao> registros =
                solicitacaoRepository.findBySolicitadoPorIdOrderByCriadoEmDesc(funcionarioId);
        registros.forEach(r -> r.setRiggerNome(NOME_ANONIMO));
        solicitacaoRepository.saveAll(registros);

        log.info("Conta anonimizada (LGPD Art. 18) para funcionário ID {}", funcionarioId);
    }

    public LgpdExportResponse exportarDados(UUID funcionarioId) {
        Funcionario funcionario = buscarFuncionario(funcionarioId);
        Empresa empresa = empresaRepository.findById(funcionario.getEmpresaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));
        List<SolicitacaoLiberacao> registros =
                solicitacaoRepository.findBySolicitadoPorIdOrderByCriadoEmDesc(funcionarioId);

        List<LgpdExportResponse.RegistroAuditoria> auditoria = registros.stream()
                .map(r -> LgpdExportResponse.RegistroAuditoria.builder()
                        .id(r.getId())
                        .operacaoOs(r.getOperacaoOs())
                        .status(r.getStatus().name())
                        .criadoEm(r.getCriadoEm())
                        .resolvidoEm(r.getResolvidoEm())
                        .build())
                .toList();

        return LgpdExportResponse.builder()
                .dadosPessoais(LgpdExportResponse.DadosPessoais.builder()
                        .id(funcionario.getId())
                        .nome(funcionario.getNome())
                        .email(funcionario.getEmail())
                        .role(funcionario.getRole().name())
                        .vencimentoNr11(funcionario.getVencimentoNr11())
                        .vencimentoNr35(funcionario.getVencimentoNr35())
                        .vencimentoAso(funcionario.getVencimentoAso())
                        .acceptedTerms(funcionario.getAcceptedTerms())
                        .acceptedPrivacyPolicy(funcionario.getAcceptedPrivacyPolicy())
                        .consentDate(funcionario.getConsentDate())
                        .criadoEm(funcionario.getCriadoEm())
                        .build())
                .dadosEmpresa(LgpdExportResponse.DadosEmpresa.builder()
                        .id(empresa.getId())
                        .razaoSocial(empresa.getRazaoSocial())
                        .cnpj(empresa.getCnpj())
                        .build())
                .registrosDeAuditoria(auditoria)
                .dataExportacao(LocalDateTime.now())
                .build();
    }

    private Funcionario buscarFuncionario(UUID id) {
        return funcionarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Funcionário"));
    }
}
