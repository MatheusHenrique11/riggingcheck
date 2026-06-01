package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.AcessorioIcamento;
import com.riggingcheck.riggingcheckapi.domain.CertificadoAcessorio;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.InspecaoAcessorio;
import com.riggingcheck.riggingcheckapi.domain.enums.*;
import com.riggingcheck.riggingcheckapi.dto.*;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.AcessorioIcamentoRepository;
import com.riggingcheck.riggingcheckapi.repository.CertificadoAcessorioRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.InspecaoAcessorioRepository;
import com.riggingcheck.riggingcheckapi.shared.AuthorizationHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AcessorioService {

    private static final Logger log = LoggerFactory.getLogger(AcessorioService.class);

    private static final Set<RoleEnum> ROLES_GESTAO = EnumSet.of(
        RoleEnum.SUPER_ADMIN, RoleEnum.SAFETY_ADMIN,
        RoleEnum.ADMIN_EMPRESA, RoleEnum.LIDER_EQUIPE, RoleEnum.GERENTE_OPERACOES
    );

    private static final Set<RoleEnum> ROLES_STATUS = EnumSet.of(
        RoleEnum.SUPER_ADMIN, RoleEnum.SAFETY_ADMIN, RoleEnum.ADMIN_EMPRESA
    );

    private final AcessorioIcamentoRepository acessorioRepository;
    private final CertificadoAcessorioRepository certificadoRepository;
    private final InspecaoAcessorioRepository inspecaoRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final AuthorizationHelper authHelper;
    private final AuditLogService auditLogService;

    @Value("${app.base-url:https://riggingcheck.com}")
    private String baseUrl;

    public AcessorioService(
            AcessorioIcamentoRepository acessorioRepository,
            CertificadoAcessorioRepository certificadoRepository,
            InspecaoAcessorioRepository inspecaoRepository,
            FuncionarioRepository funcionarioRepository,
            AuthorizationHelper authHelper,
            AuditLogService auditLogService) {
        this.acessorioRepository = acessorioRepository;
        this.certificadoRepository = certificadoRepository;
        this.inspecaoRepository = inspecaoRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.authHelper = authHelper;
        this.auditLogService = auditLogService;
    }

    // ── Acessórios ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AcessorioResponse> search(String q, String email) {
        Funcionario actor = buscarFuncionario(email);
        List<AcessorioIcamento> todos = actor.getRole() == RoleEnum.SUPER_ADMIN
            ? acessorioRepository.findAll()
            : acessorioRepository.findByEmpresaIdOrderByDataCadastroDesc(actor.getEmpresaId());

        String term = q == null ? "" : q.toLowerCase().trim();
        if (term.isEmpty()) {
            return todos.stream().map(a -> toResponse(a, false)).collect(Collectors.toList());
        }
        return todos.stream()
            .filter(a ->
                (a.getCodigoInterno() != null && a.getCodigoInterno().toLowerCase().contains(term)) ||
                (a.getDescricao()     != null && a.getDescricao().toLowerCase().contains(term))     ||
                (a.getTipo()          != null && a.getTipo().name().toLowerCase().contains(term))   ||
                (a.getFabricante()    != null && a.getFabricante().toLowerCase().contains(term))
            )
            .map(a -> toResponse(a, false))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AcessorioResponse> listar(String email) {
        Funcionario actor = buscarFuncionario(email);
        List<AcessorioIcamento> lista = actor.getRole() == RoleEnum.SUPER_ADMIN
            ? acessorioRepository.findAll()
            : acessorioRepository.findByEmpresaIdOrderByDataCadastroDesc(actor.getEmpresaId());
        return lista.stream().map(a -> toResponse(a, false)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AcessorioResponse buscar(UUID id, String email) {
        Funcionario actor = buscarFuncionario(email);
        AcessorioIcamento acessorio = buscarAcessorioComAcesso(id, actor);
        CertificadoResponse ultimoCert = certificadoRepository
            .findByAcessorioIdOrderByCriadoEmDesc(id)
            .stream().findFirst()
            .map(this::toCertificadoResponse).orElse(null);
        InspecaoResponse ultimaInsp = inspecaoRepository
            .findTopByAcessorioIdOrderByDataInspecaoDesc(id)
            .map(this::toInspecaoResponse).orElse(null);
        AcessorioResponse response = toResponse(acessorio, false);
        response.setUltimoCertificado(ultimoCert);
        response.setUltimaInspecao(ultimaInsp);
        return response;
    }

    @Transactional
    public AcessorioResponse criar(AcessorioRequest req, String email) {
        Funcionario actor = buscarFuncionario(email);
        requireGestao(actor);

        UUID empresaId = actor.getRole() == RoleEnum.SUPER_ADMIN
            ? actor.getEmpresaId()
            : actor.getEmpresaId();

        if (acessorioRepository.existsByEmpresaIdAndCodigoInterno(empresaId, req.getCodigoInterno())) {
            throw new RegraDeNegocioException("Código interno '" + req.getCodigoInterno() + "' já existe nesta empresa.");
        }

        AcessorioIcamento acessorio = new AcessorioIcamento();
        acessorio.setEmpresaId(empresaId);
        acessorio.setCadastradoPorId(actor.getId());
        acessorio.setCadastradoPorNome(actor.getNome());
        mapFromRequest(req, acessorio);
        AcessorioIcamento salvo = acessorioRepository.save(acessorio);

        auditLogService.log(actor, "ACESSORIO_CRIADO", "ACESSORIO", salvo.getId(),
            "Código: " + salvo.getCodigoInterno() + " | Tipo: " + salvo.getTipo());
        log.info("Acessório criado: {} por {}", salvo.getId(), email);
        return toResponse(salvo, false);
    }

    @Transactional
    public AcessorioResponse atualizar(UUID id, AcessorioRequest req, String email) {
        Funcionario actor = buscarFuncionario(email);
        requireGestao(actor);
        AcessorioIcamento acessorio = buscarAcessorioComAcesso(id, actor);

        if (!acessorio.getCodigoInterno().equals(req.getCodigoInterno())
                && acessorioRepository.existsByEmpresaIdAndCodigoInterno(acessorio.getEmpresaId(), req.getCodigoInterno())) {
            throw new RegraDeNegocioException("Código interno '" + req.getCodigoInterno() + "' já existe nesta empresa.");
        }

        mapFromRequest(req, acessorio);
        AcessorioIcamento salvo = acessorioRepository.save(acessorio);

        auditLogService.log(actor, "ACESSORIO_ATUALIZADO", "ACESSORIO", salvo.getId(),
            "Código: " + salvo.getCodigoInterno());
        return toResponse(salvo, false);
    }

    @Transactional
    public AcessorioResponse atualizarStatus(UUID id, AtualizarStatusAcessorioRequest req, String email) {
        Funcionario actor = buscarFuncionario(email);
        requireStatus(actor);
        AcessorioIcamento acessorio = buscarAcessorioComAcesso(id, actor);

        StatusAcessorio novoStatus;
        try {
            novoStatus = StatusAcessorio.valueOf(req.getStatus());
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException("Status inválido: " + req.getStatus());
        }

        StatusAcessorio statusAnterior = acessorio.getStatus();
        acessorio.setStatus(novoStatus);
        acessorioRepository.save(acessorio);

        auditLogService.log(actor, "ACESSORIO_STATUS_ALTERADO", "ACESSORIO", id,
            statusAnterior + " → " + novoStatus + " | Motivo: " + req.getMotivo());
        log.info("Status do acessório {} alterado: {} → {} por {}", id, statusAnterior, novoStatus, email);
        return toResponse(acessorio, false);
    }

    // ── Certificados ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CertificadoResponse> listarCertificados(UUID acessorioId, String email) {
        Funcionario actor = buscarFuncionario(email);
        buscarAcessorioComAcesso(acessorioId, actor);
        return certificadoRepository.findByAcessorioIdOrderByCriadoEmDesc(acessorioId)
            .stream().map(this::toCertificadoResponse).collect(Collectors.toList());
    }

    @Transactional
    public CertificadoResponse adicionarCertificado(UUID acessorioId, CertificadoRequest req, String email) {
        Funcionario actor = buscarFuncionario(email);
        requireGestao(actor);
        AcessorioIcamento acessorio = buscarAcessorioComAcesso(acessorioId, actor);

        CertificadoAcessorio cert = new CertificadoAcessorio();
        cert.setAcessorioId(acessorioId);
        cert.setEmpresaId(acessorio.getEmpresaId());
        cert.setNumeroCertificado(req.getNumeroCertificado());
        cert.setEmissor(req.getEmissor());
        cert.setDataEmissao(req.getDataEmissao());
        cert.setDataValidade(req.getDataValidade());
        cert.setArquivoUrl(req.getArquivoUrl());
        cert.setObservacoes(req.getObservacoes());
        cert.setStatus(calcularStatusCertificado(req.getDataValidade()));

        CertificadoAcessorio salvo = certificadoRepository.save(cert);
        auditLogService.log(actor, "CERTIFICADO_ADICIONADO", "ACESSORIO", acessorioId,
            "Cert: " + req.getNumeroCertificado() + " | Validade: " + req.getDataValidade());
        return toCertificadoResponse(salvo);
    }

    // ── Inspeções ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<InspecaoResponse> listarInspecoes(UUID acessorioId, String email) {
        Funcionario actor = buscarFuncionario(email);
        buscarAcessorioComAcesso(acessorioId, actor);
        return inspecaoRepository.findByAcessorioIdOrderByDataInspecaoDesc(acessorioId)
            .stream().map(this::toInspecaoResponse).collect(Collectors.toList());
    }

    @Transactional
    public InspecaoResponse registrarInspecao(UUID acessorioId, InspecaoRequest req, String email) {
        Funcionario actor = buscarFuncionario(email);
        requireGestao(actor);
        AcessorioIcamento acessorio = buscarAcessorioComAcesso(acessorioId, actor);

        ResultadoInspecao resultado;
        try {
            resultado = ResultadoInspecao.valueOf(req.getResultado());
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException("Resultado inválido: " + req.getResultado());
        }

        InspecaoAcessorio inspecao = new InspecaoAcessorio();
        inspecao.setAcessorioId(acessorioId);
        inspecao.setEmpresaId(acessorio.getEmpresaId());
        inspecao.setInspetorId(actor.getId());
        inspecao.setInspetorNome(actor.getNome());
        inspecao.setDataInspecao(req.getDataInspecao());
        inspecao.setResultado(resultado);
        inspecao.setObservacoes(req.getObservacoes());
        inspecao.setFotos(req.getFotos());
        inspecao.setProximaInspecao(req.getProximaInspecao());

        if (resultado == ResultadoInspecao.REPROVADO) {
            acessorio.setStatus(StatusAcessorio.REPROVADO);
            acessorioRepository.save(acessorio);
        } else if (resultado == ResultadoInspecao.APROVADO) {
            acessorio.setStatus(StatusAcessorio.ATIVO);
            acessorioRepository.save(acessorio);
        }

        InspecaoAcessorio salva = inspecaoRepository.save(inspecao);
        auditLogService.log(actor, "INSPECAO_REGISTRADA", "ACESSORIO", acessorioId,
            "Resultado: " + resultado + " | Data: " + req.getDataInspecao());
        return toInspecaoResponse(salva);
    }

    // ── Dashboard de Integridade ──────────────────────────────────────────────────

    private static final int DIAS_ALERTA_CERTIFICADO = 30;
    private static final int MAX_ITENS_CRITICOS      = 10;

    @Transactional(readOnly = true)
    public InventoryHealthResponse getDashboardIntegridade(String email) {
        Funcionario actor = buscarFuncionario(email);
        List<AcessorioIcamento> lista = actor.getRole() == RoleEnum.SUPER_ADMIN
            ? acessorioRepository.findAll()
            : acessorioRepository.findByEmpresaIdOrderByDataCadastroDesc(actor.getEmpresaId());

        LocalDate hoje        = LocalDate.now();
        LocalDate limiteAlerta = hoje.plusDays(DIAS_ALERTA_CERTIFICADO);

        int ativos = 0, bloqueados = 0, certsVencidos = 0, certsAVencer = 0;
        int inspecoesVencidas = 0, semCert = 0, semInsp = 0;

        Map<String, int[]> porTipoMap = new LinkedHashMap<>();
        List<InventoryHealthResponse.ItemCritico> criticos = new ArrayList<>();

        for (AcessorioIcamento a : lista) {
            String tipo = a.getTipo() != null ? a.getTipo().name() : "OUTRO";
            porTipoMap.computeIfAbsent(tipo, k -> new int[3]); // [total, bloqueados, alertas]
            porTipoMap.get(tipo)[0]++;

            boolean ehBloqueado = a.getStatus() != StatusAcessorio.ATIVO;
            if (ehBloqueado) {
                bloqueados++;
                porTipoMap.get(tipo)[1]++;
                addCritico(criticos, a, a.getStatus().name(), "Acessório " + a.getStatus().name().toLowerCase(), null);
            } else {
                ativos++;
            }

            // Certificado
            Optional<CertificadoAcessorio> certOpt = certificadoRepository
                .findByAcessorioIdOrderByCriadoEmDesc(a.getId())
                .stream().findFirst();

            if (certOpt.isEmpty()) {
                semCert++;
                porTipoMap.get(tipo)[2]++;
                addCritico(criticos, a, "SEM_CERTIFICADO", "Sem certificado registrado", null);
            } else {
                CertificadoAcessorio cert = certOpt.get();
                if (cert.getStatus() == StatusCertificado.VENCIDO) {
                    certsVencidos++;
                    porTipoMap.get(tipo)[2]++;
                    String dataLimite = cert.getDataValidade() != null ? cert.getDataValidade().toString() : null;
                    addCritico(criticos, a, "CERTIFICADO_VENCIDO", "Certificado vencido", dataLimite);
                } else if (cert.getDataValidade() != null
                        && !cert.getDataValidade().isBefore(hoje)
                        && cert.getDataValidade().isBefore(limiteAlerta)) {
                    certsAVencer++;
                    porTipoMap.get(tipo)[2]++;
                    addCritico(criticos, a, "CERTIFICADO_A_VENCER",
                        "Certificado vence em " + DIAS_ALERTA_CERTIFICADO + " dias",
                        cert.getDataValidade().toString());
                }
            }

            // Inspeção
            Optional<com.riggingcheck.riggingcheckapi.domain.InspecaoAcessorio> inspOpt =
                inspecaoRepository.findTopByAcessorioIdOrderByDataInspecaoDesc(a.getId());

            if (inspOpt.isEmpty()) {
                semInsp++;
            } else {
                com.riggingcheck.riggingcheckapi.domain.InspecaoAcessorio insp = inspOpt.get();
                if (insp.getProximaInspecao() != null && insp.getProximaInspecao().isBefore(hoje)) {
                    inspecoesVencidas++;
                    porTipoMap.get(tipo)[2]++;
                    addCritico(criticos, a, "INSPECAO_VENCIDA", "Inspeção vencida",
                        insp.getProximaInspecao().toString());
                }
            }
        }

        List<InventoryHealthResponse.PorTipo> porTipoList = porTipoMap.entrySet().stream()
            .map(e -> InventoryHealthResponse.PorTipo.builder()
                .tipo(e.getKey())
                .total(e.getValue()[0])
                .bloqueados(e.getValue()[1])
                .alertas(e.getValue()[2])
                .build())
            .collect(Collectors.toList());

        return InventoryHealthResponse.builder()
            .totalAcessorios(lista.size())
            .ativos(ativos)
            .bloqueados(bloqueados)
            .certificadosVencidos(certsVencidos)
            .certificadosAVencer(certsAVencer)
            .inspecoesVencidas(inspecoesVencidas)
            .semCertificado(semCert)
            .semInspecao(semInsp)
            .porTipo(porTipoList)
            .itensCriticos(criticos.size() > MAX_ITENS_CRITICOS
                ? criticos.subList(0, MAX_ITENS_CRITICOS) : criticos)
            .build();
    }

    private void addCritico(List<InventoryHealthResponse.ItemCritico> lista,
                             AcessorioIcamento a, String status, String motivo, String dataLimite) {
        if (lista.size() >= MAX_ITENS_CRITICOS * 2) return; // evita lista excessiva antes de cortar
        lista.add(InventoryHealthResponse.ItemCritico.builder()
            .id(a.getId())
            .codigoInterno(a.getCodigoInterno())
            .tipo(a.getTipo() != null ? a.getTipo().name() : null)
            .status(status)
            .motivo(motivo)
            .dataLimite(dataLimite)
            .build());
    }

    // ── QR Code ───────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AcessorioQrResponse gerarQr(UUID id, String email) {
        Funcionario actor = buscarFuncionario(email);
        AcessorioIcamento acessorio = buscarAcessorioComAcesso(id, actor);
        String url = baseUrl + "/public/acessorios/" + id;
        return new AcessorioQrResponse(
            id, url,
            acessorio.getCodigoInterno(),
            acessorio.getTipo().name(),
            acessorio.getStatus().name(),
            acessorio.getCapacidadeWllKg()
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private Funcionario buscarFuncionario(String email) {
        return funcionarioRepository.findByEmail(email)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private AcessorioIcamento buscarAcessorioComAcesso(UUID id, Funcionario actor) {
        AcessorioIcamento acessorio = acessorioRepository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Acessório"));
        if (actor.getRole() != RoleEnum.SUPER_ADMIN
                && !acessorio.getEmpresaId().equals(actor.getEmpresaId())) {
            throw new AcessoNegadoException();
        }
        return acessorio;
    }

    private void requireGestao(Funcionario actor) {
        if (!actor.getAtivo()) throw new AcessoNegadoException();
        if (!ROLES_GESTAO.contains(actor.getRole())) {
            throw new AcessoNegadoException();
        }
    }

    private void requireStatus(Funcionario actor) {
        if (!actor.getAtivo()) throw new AcessoNegadoException();
        if (!ROLES_STATUS.contains(actor.getRole())) {
            throw new AcessoNegadoException();
        }
    }

    private void mapFromRequest(AcessorioRequest req, AcessorioIcamento acessorio) {
        acessorio.setCodigoInterno(req.getCodigoInterno());
        acessorio.setDescricao(req.getDescricao());
        acessorio.setFabricante(req.getFabricante());
        acessorio.setModelo(req.getModelo());
        acessorio.setNumeroSerie(req.getNumeroSerie());
        acessorio.setCapacidadeWllKg(req.getCapacidadeWllKg());
        acessorio.setUnidade(req.getUnidade());
        acessorio.setDataFabricacao(req.getDataFabricacao());
        acessorio.setLocalizacao(req.getLocalizacao());
        acessorio.setObservacoes(req.getObservacoes());
        try {
            acessorio.setTipo(TipoAcessorio.valueOf(req.getTipo()));
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException("Tipo inválido: " + req.getTipo());
        }
    }

    private StatusCertificado calcularStatusCertificado(LocalDate validade) {
        if (validade == null) return StatusCertificado.AUSENTE;
        LocalDate hoje = LocalDate.now();
        if (validade.isBefore(hoje)) return StatusCertificado.VENCIDO;
        if (validade.isBefore(hoje.plusDays(30))) return StatusCertificado.A_VENCER;
        return StatusCertificado.VALIDO;
    }

    private AcessorioResponse toResponse(AcessorioIcamento a, boolean withDetails) {
        return AcessorioResponse.builder()
            .id(a.getId())
            .empresaId(a.getEmpresaId())
            .codigoInterno(a.getCodigoInterno())
            .tipo(a.getTipo() != null ? a.getTipo().name() : null)
            .descricao(a.getDescricao())
            .fabricante(a.getFabricante())
            .modelo(a.getModelo())
            .numeroSerie(a.getNumeroSerie())
            .capacidadeWllKg(a.getCapacidadeWllKg())
            .unidade(a.getUnidade())
            .dataFabricacao(a.getDataFabricacao())
            .dataCadastro(a.getDataCadastro())
            .status(a.getStatus() != null ? a.getStatus().name() : null)
            .localizacao(a.getLocalizacao())
            .observacoes(a.getObservacoes())
            .cadastradoPorNome(a.getCadastradoPorNome())
            .build();
    }

    private CertificadoResponse toCertificadoResponse(CertificadoAcessorio c) {
        return CertificadoResponse.builder()
            .id(c.getId())
            .acessorioId(c.getAcessorioId())
            .numeroCertificado(c.getNumeroCertificado())
            .emissor(c.getEmissor())
            .dataEmissao(c.getDataEmissao())
            .dataValidade(c.getDataValidade())
            .arquivoUrl(c.getArquivoUrl())
            .status(c.getStatus() != null ? c.getStatus().name() : null)
            .observacoes(c.getObservacoes())
            .criadoEm(c.getCriadoEm())
            .build();
    }

    private InspecaoResponse toInspecaoResponse(InspecaoAcessorio i) {
        return InspecaoResponse.builder()
            .id(i.getId())
            .acessorioId(i.getAcessorioId())
            .inspetorNome(i.getInspetorNome())
            .dataInspecao(i.getDataInspecao())
            .resultado(i.getResultado() != null ? i.getResultado().name() : null)
            .observacoes(i.getObservacoes())
            .fotos(i.getFotos())
            .proximaInspecao(i.getProximaInspecao())
            .criadoEm(i.getCriadoEm())
            .build();
    }
}
