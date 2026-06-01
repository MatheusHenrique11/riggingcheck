package com.riggingcheck.riggingcheckapi.service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceResult;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceValidationService;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.ApprovalDecision;
import com.riggingcheck.riggingcheckapi.domain.AuditLog;
import com.riggingcheck.riggingcheckapi.domain.ChecklistResposta;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.OperationTeamMember;
import com.riggingcheck.riggingcheckapi.domain.RiggingPlanAccessory;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import com.riggingcheck.riggingcheckapi.dto.OperationTeamMemberResponse;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.ApprovalDecisionRepository;
import com.riggingcheck.riggingcheckapi.repository.AuditLogRepository;
import com.riggingcheck.riggingcheckapi.repository.ChecklistRespostaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.OperationTeamMemberRepository;
import com.riggingcheck.riggingcheckapi.repository.RiggingPlanAccessoryRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class DatabookService {

    private static final Logger log = LoggerFactory.getLogger(DatabookService.class);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int MAX_ACC_DISPLAY = 20;

    @org.springframework.beans.factory.annotation.Value("${alert.digest.base-url:https://riggingcheck.app}")
    private String baseUrl;

    private final SolicitacaoLiberacaoRepository  liberacaoRepository;
    private final RiggingPlanAccessoryRepository  planAccessoryRepository;
    private final ApprovalDecisionRepository      decisionRepository;
    private final AuditLogRepository              auditLogRepository;
    private final FuncionarioRepository           funcionarioRepository;
    private final ComplianceValidationService     complianceService;
    private final ChecklistRespostaRepository     checklistRespostaRepository;
    private final OperationTeamMemberRepository   teamRepository;
    private final OperationTeamService            teamService;

    public DatabookService(
            SolicitacaoLiberacaoRepository liberacaoRepository,
            RiggingPlanAccessoryRepository planAccessoryRepository,
            ApprovalDecisionRepository decisionRepository,
            AuditLogRepository auditLogRepository,
            FuncionarioRepository funcionarioRepository,
            ComplianceValidationService complianceService,
            ChecklistRespostaRepository checklistRespostaRepository,
            OperationTeamMemberRepository teamRepository,
            OperationTeamService teamService) {
        this.liberacaoRepository     = liberacaoRepository;
        this.planAccessoryRepository = planAccessoryRepository;
        this.decisionRepository      = decisionRepository;
        this.auditLogRepository      = auditLogRepository;
        this.funcionarioRepository   = funcionarioRepository;
        this.complianceService       = complianceService;
        this.checklistRespostaRepository = checklistRespostaRepository;
        this.teamRepository          = teamRepository;
        this.teamService             = teamService;
    }

    @Transactional(readOnly = true)
    public byte[] gerarDatabook(UUID liberacaoId, String email) {
        Funcionario actor = funcionarioRepository.findByEmail(email)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));

        SolicitacaoLiberacao sol = liberacaoRepository.findById(liberacaoId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitação"));

        if (actor.getRole() != RoleEnum.SUPER_ADMIN
                && !sol.getEmpresaId().equals(actor.getEmpresaId())) {
            throw new AcessoNegadoException();
        }

        List<RiggingPlanAccessory> acessorios = planAccessoryRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(liberacaoId);

        List<ApprovalDecision> decisoes = decisionRepository
            .findByPlanIdOrderByDecidedAtDesc(liberacaoId);

        List<AuditLog> auditoria = auditLogRepository
            .findByEntityIdOrderByCreatedAtDesc(liberacaoId);

        List<ChecklistResposta> checklist = checklistRespostaRepository
            .findBySolicitacaoLiberacaoIdOrderByCodigoItemAsc(liberacaoId);

        List<OperationTeamMember> teamMembers = teamRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(liberacaoId);

        List<OperationTeamMemberResponse> teamResponses = teamMembers.stream()
            .map(m -> teamService.toResponse(m, funcionarioRepository.findById(m.getFuncionarioId()).orElse(null)))
            .toList();

        ComplianceResult compliance = complianceService.validate(sol);

        String html = buildHtml(sol, acessorios, decisoes, auditoria, checklist, teamResponses, compliance);
        return renderPdf(html, liberacaoId);
    }

    // ── Renderização HTML → PDF ───────────────────────────────────────────────────

    private byte[] renderPdf(String html, UUID id) {
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(os);
            builder.run();
            return os.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar databook para liberacao {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Falha ao gerar PDF do databook.", e);
        }
    }

    // ── Template HTML ─────────────────────────────────────────────────────────────

    private String buildHtml(SolicitacaoLiberacao sol,
                              List<RiggingPlanAccessory> acessorios,
                              List<ApprovalDecision> decisoes,
                              List<AuditLog> auditoria,
                              List<ChecklistResposta> checklist,
                              List<OperationTeamMemberResponse> equipe,
                              ComplianceResult compliance) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.append("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">");
        sb.append("<html xmlns=\"http://www.w3.org/1999/xhtml\"><head>");
        sb.append("<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"/>");
        sb.append("<title>Databook — ").append(esc(sol.getOperacaoOs())).append("</title>");
        sb.append("<style>").append(css()).append("</style>");
        sb.append("</head><body>");

        // 1. CAPA
        appendCapa(sb, sol);

        // 2. Dados da Operação
        appendSection(sb, "1. Dados da Opera&#231;&#227;o");
        appendTable2col(sb, new String[][] {
            {"OS / C&#243;digo", esc(sol.getOperacaoOs())},
            {"Rigger / Operador", esc(sol.getRiggerNome())},
            {"Supervisor", esc(sol.getSupervisorNome())},
            {"Empresa", esc(sol.getEmpresaNome())},
            {"Local da Opera&#231;&#227;o", esc(sol.getLocalOperacao())},
            {"Data da Opera&#231;&#227;o", sol.getDataOperacao() != null ? sol.getDataOperacao().toString() : "&#8212;"},
            {"Descri&#231;&#227;o / Atividade", esc(sol.getDescricaoAtividade())},
            {"Solicitado em", sol.getCriadoEm() != null ? sol.getCriadoEm().format(FMT) : "&#8212;"},
            {"Status T&#233;cnico", techStatusLabel(sol.getTechnicalStatus())},
            {"Status do Fluxo", sol.getWorkflowStatus() != null ? sol.getWorkflowStatus().name() : "&#8212;"},
        });

        // 3. Guindaste e Carga
        appendSection(sb, "2. Guindaste e Carga");
        appendTable2col(sb, new String[][] {
            {"Capacidade do guindaste", fmt(sol.getCapGuindasteKg()) + " kg"},
            {"Carga transportada", fmt(sol.getCapCargaKg()) + " kg"},
            {"Aparelho (eslingas + manilhas)", fmt(sol.getCapAparelhoKg()) + " kg"},
            {"Carga total içada", fmt(sol.getCapTotalKg()) + " kg"},
            {"Taxa de utiliza&#231;&#227;o", fmt(sol.getCapUsoPercent()) + "%"},
            {"Risco de capacidade", esc(sol.getCapRisco())},
        });

        // 4. Lingada e Eslinga
        appendSection(sb, "3. Lingada e Eslinga");
        appendTable2col(sb, new String[][] {
            {"N&#250;mero de pernas", sol.getEslNumPernas() != null ? String.valueOf(sol.getEslNumPernas()) : "&#8212;"},
            {"&#194;ngulo vertical (&#176;)", fmt(sol.getEslAnguloGraus())},
            {"Tens&#227;o por perna (kgf)", fmt(sol.getEslTensaoPorPernaKg())},
            {"Fator de carga", fmt(sol.getEslFatorCarga())},
            {"WLL da eslinga (kg)", fmt(sol.getEslWllKg())},
            {"Taxa WLL utilizada (%)", fmt(sol.getEslWllUsoPercent())},
            {"Risco da eslinga", esc(sol.getEslRisco())},
            {"Aviso de &#226;ngulo (&lt;45&#176;)", boolLabel(sol.getEslAnguloAviso())},
        });

        // 5. Acessórios Vinculados
        appendSection(sb, "4. Acess&#243;rios Vinculados");
        if (acessorios.isEmpty()) {
            sb.append("<p class=\"empty\">Nenhum acess&#243;rio foi vinculado a este plano.</p>");
        } else {
            sb.append("<table><thead><tr>");
            for (String h : new String[]{"C&#243;digo", "Tipo", "Descri&#231;&#227;o", "WLL (kg)", "Status", "Certificado", "&#218;lt. Inspe&#231;&#227;o"}) {
                sb.append("<th>").append(h).append("</th>");
            }
            sb.append("</tr></thead><tbody>");
            int shown = Math.min(acessorios.size(), MAX_ACC_DISPLAY);
            for (int i = 0; i < shown; i++) {
                RiggingPlanAccessory a = acessorios.get(i);
                sb.append("<tr>");
                sb.append("<td class=\"mono\">").append(esc(a.getCodigoInternoSnapshot())).append("</td>");
                sb.append("<td>").append(esc(a.getTipoSnapshot())).append("</td>");
                sb.append("<td>").append(esc(a.getDescricaoSnapshot())).append("</td>");
                sb.append("<td>").append(fmt(a.getWllKgSnapshot())).append("</td>");
                sb.append("<td class=\"").append(statusClass(a.getStatusSnapshot())).append("\">").append(esc(a.getStatusSnapshot())).append("</td>");
                sb.append("<td class=\"").append(certClass(a.getCertificadoStatusSnapshot())).append("\">").append(esc(a.getCertificadoStatusSnapshot())).append("</td>");
                sb.append("<td class=\"").append(inspClass(a.getUltimaInspecaoResultadoSnapshot())).append("\">").append(esc(a.getUltimaInspecaoResultadoSnapshot())).append("</td>");
                sb.append("</tr>");
            }
            sb.append("</tbody></table>");
            if (acessorios.size() > MAX_ACC_DISPLAY) {
                sb.append("<p class=\"note\">+ ").append(acessorios.size() - MAX_ACC_DISPLAY).append(" acess&#243;rio(s) n&#227;o exibido(s) (m&#225;ximo ").append(MAX_ACC_DISPLAY).append(").</p>");
            }
        }

        // 5a. Checklist de Campo
        appendSection(sb, "5. Checklist de Campo NR-11 / N-2869");
        if (checklist.isEmpty()) {
            sb.append("<p class=\"empty\">Checklist n&#227;o enviado ao servidor nesta submiss&#227;o.</p>");
            if (Boolean.TRUE.equals(sol.getChecklistCompleto())) {
                sb.append("<p class=\"ok\">&#10003; Checklist marcado como conclu&#237;do pelo operador.</p>");
            }
        } else {
            long respondidos = checklist.stream().filter(c -> Boolean.TRUE.equals(c.getRespondido())).count();
            sb.append("<p><b>").append(respondidos).append(" de ").append(checklist.size()).append(" itens verificados.</b></p>");
            sb.append("<table><thead><tr><th>C&#243;d.</th><th>Categoria</th><th>Item</th><th>Verificado</th></tr></thead><tbody>");
            for (ChecklistResposta c : checklist) {
                boolean ok = Boolean.TRUE.equals(c.getRespondido());
                sb.append("<tr>");
                sb.append("<td class=\"mono\">").append(esc(c.getCodigoItem())).append("</td>");
                sb.append("<td>").append(esc(c.getCategoriaItem())).append("</td>");
                sb.append("<td>").append(esc(c.getPerguntaItem())).append("</td>");
                sb.append("<td class=\"").append(ok ? "status-ok" : "status-blocked").append("\">")
                  .append(ok ? "&#10003; Sim" : "&#10007; N&#227;o").append("</td>");
                sb.append("</tr>");
            }
            sb.append("</tbody></table>");
        }

        // 5b. Dados Petrobras N-2869
        if (sol.getPetrobrasDataJson() != null && !sol.getPetrobrasDataJson().isBlank()) {
            appendSection(sb, "5b. M&#243;dulo Petrobras N-2869");
            sb.append("<p class=\"note\">Dados do m&#243;dulo Petrobras N-2869 registrados na submiss&#227;o.</p>");
            sb.append("<pre style=\"font-size:8pt;color:#374151;background:#f8faff;padding:8px;border:1px solid #d1d5db;white-space:pre-wrap;\">")
              .append(esc(sol.getPetrobrasDataJson().length() > 2000
                  ? sol.getPetrobrasDataJson().substring(0, 2000) + "...(truncado)"
                  : sol.getPetrobrasDataJson()))
              .append("</pre>");
        }

        // 6. Compliance
        appendSection(sb, "6. Compliance T&#233;cnico");
        String tsLabel = techStatusLabel(compliance.overallStatus());
        sb.append("<p><b>Status Geral: </b><span class=\"").append(tsClass(compliance.overallStatus())).append("\">").append(tsLabel).append("</span></p>");
        if (compliance.violations() == null || compliance.violations().isEmpty()) {
            sb.append("<p class=\"ok\">Nenhuma viola&#231;&#227;o encontrada. Plano em conformidade.</p>");
        } else {
            sb.append("<table><thead><tr><th>Severidade</th><th>Regra</th><th>Mensagem</th><th>Norma</th><th>A&#231;&#227;o</th></tr></thead><tbody>");
            for (ComplianceViolation v : compliance.violations()) {
                sb.append("<tr>");
                sb.append("<td class=\"").append(tsClass(v.severity())).append("\">").append(v.severity().name()).append("</td>");
                sb.append("<td class=\"mono\">").append(esc(v.ruleId())).append("</td>");
                sb.append("<td>").append(esc(v.message())).append("</td>");
                sb.append("<td>").append(esc(v.norm())).append("</td>");
                sb.append("<td>").append(esc(v.recommendedAction())).append("</td>");
                sb.append("</tr>");
            }
            sb.append("</tbody></table>");
        }

        // 7. Histórico de Aprovação
        appendSection(sb, "7. Hist&#243;rico de Aprova&#231;&#227;o");
        if (decisoes.isEmpty()) {
            sb.append("<p class=\"empty\">Nenhuma decis&#227;o de aprova&#231;&#227;o registrada ainda.</p>");
        } else {
            sb.append("<table><thead><tr><th>Data</th><th>Decis&#227;o</th><th>Respons&#225;vel</th><th>Fun&#231;&#227;o</th><th>Justificativa</th><th>Exce&#231;&#227;o</th></tr></thead><tbody>");
            for (ApprovalDecision d : decisoes) {
                sb.append("<tr>");
                sb.append("<td>").append(d.getDecidedAt() != null ? d.getDecidedAt().format(FMT) : "&#8212;").append("</td>");
                sb.append("<td>").append(esc(d.getDecision() != null ? d.getDecision().name() : "&#8212;")).append("</td>");
                sb.append("<td>").append(esc(d.getDecidedByName())).append("</td>");
                sb.append("<td>").append(esc(d.getDecidedByRole())).append("</td>");
                sb.append("<td>").append(esc(d.getJustification())).append("</td>");
                sb.append("<td>").append(Boolean.TRUE.equals(d.getIsException()) ? "Sim" : "N&#227;o").append("</td>");
                sb.append("</tr>");
            }
            sb.append("</tbody></table>");
        }

        // 8. Auditoria Resumida
        appendSection(sb, "8. Auditoria Resumida");
        if (auditoria.isEmpty()) {
            sb.append("<p class=\"empty\">Nenhum evento de auditoria registrado.</p>");
        } else {
            sb.append("<table><thead><tr><th>Data</th><th>A&#231;&#227;o</th><th>Usu&#225;rio</th><th>Detalhes</th></tr></thead><tbody>");
            int maxAudit = Math.min(auditoria.size(), 20);
            for (int i = 0; i < maxAudit; i++) {
                AuditLog a = auditoria.get(i);
                sb.append("<tr>");
                sb.append("<td>").append(a.getCreatedAt() != null ? a.getCreatedAt().format(FMT) : "&#8212;").append("</td>");
                sb.append("<td class=\"mono\">").append(esc(a.getAction())).append("</td>");
                sb.append("<td>").append(esc(a.getUserEmail())).append("</td>");
                sb.append("<td>").append(esc(a.getDetails())).append("</td>");
                sb.append("</tr>");
            }
            sb.append("</tbody></table>");
        }

        // 9. Equipe Operacional
        appendEquipe(sb, equipe);

        // 10. Validação Pública
        appendValidacaoPublica(sb, sol);

        // RODAPÉ
        appendRodape(sb, sol);

        sb.append("</body></html>");
        return sb.toString();
    }

    // ── Blocos de template ────────────────────────────────────────────────────────

    private void appendCapa(StringBuilder sb, SolicitacaoLiberacao sol) {
        sb.append("<div class=\"capa\">");
        sb.append("<div class=\"capa-logo\">RIGGINGCHECK</div>");
        sb.append("<div class=\"capa-sub\">Databook Enterprise do Plano de I&#231;amento</div>");
        sb.append("<div class=\"capa-line\"></div>");
        sb.append("<table class=\"capa-table\"><tbody>");
        sb.append("<tr><td class=\"capa-label\">Empresa</td><td class=\"capa-value\">").append(esc(sol.getEmpresaNome())).append("</td></tr>");
        sb.append("<tr><td class=\"capa-label\">OS / Opera&#231;&#227;o</td><td class=\"capa-value\">").append(esc(sol.getOperacaoOs())).append("</td></tr>");
        sb.append("<tr><td class=\"capa-label\">Rigger / Operador</td><td class=\"capa-value\">").append(esc(sol.getRiggerNome())).append("</td></tr>");
        sb.append("<tr><td class=\"capa-label\">Emitido em</td><td class=\"capa-value\">").append(sol.getCriadoEm() != null ? sol.getCriadoEm().format(FMT) : "&#8212;").append("</td></tr>");
        sb.append("<tr><td class=\"capa-label\">Status T&#233;cnico</td><td class=\"capa-value\">").append(techStatusLabel(sol.getTechnicalStatus())).append("</td></tr>");
        sb.append("<tr><td class=\"capa-label\">Status de Aprova&#231;&#227;o</td><td class=\"capa-value\">").append(sol.getStatus() != null ? sol.getStatus().name() : "&#8212;").append("</td></tr>");
        if (sol.getAprovadoPorNome() != null) {
            sb.append("<tr><td class=\"capa-label\">Aprovado por</td><td class=\"capa-value\">").append(esc(sol.getAprovadoPorNome())).append("</td></tr>");
        }
        sb.append("</tbody></table>");
        sb.append("</div>");
        sb.append("<div style=\"page-break-after:always;\"></div>");
    }

    private void appendSection(StringBuilder sb, String title) {
        sb.append("<h2 class=\"section\">").append(title).append("</h2>");
    }

    private void appendTable2col(StringBuilder sb, String[][] rows) {
        sb.append("<table class=\"info-table\"><tbody>");
        for (String[] row : rows) {
            sb.append("<tr><td class=\"label\">").append(row[0]).append("</td><td>").append(row[1]).append("</td></tr>");
        }
        sb.append("</tbody></table>");
    }

    private void appendEquipe(StringBuilder sb, List<OperationTeamMemberResponse> equipe) {
        appendSection(sb, "9. Equipe Operacional");
        if (equipe.isEmpty()) {
            sb.append("<p class=\"empty\">Nenhum membro formalmente vinculado a este plano.</p>");
            return;
        }
        sb.append("<table><thead><tr>");
        for (String h : new String[]{"Nome", "Fun&#231;&#227;o Op.", "Role", "NR-11", "NR-35", "ASO", "Compet&#234;ncia"}) {
            sb.append("<th>").append(h).append("</th>");
        }
        sb.append("</tr></thead><tbody>");
        for (OperationTeamMemberResponse m : equipe) {
            sb.append("<tr>");
            sb.append("<td>").append(esc(m.nome()))
              .append(Boolean.TRUE.equals(m.responsavel()) ? " <b>(Resp.)</b>" : "").append("</td>");
            sb.append("<td>").append(esc(m.funcaoOperacional())).append("</td>");
            sb.append("<td>").append(esc(m.role())).append("</td>");
            sb.append("<td class=\"").append(trainClass(m.statusNr11())).append("\">").append(esc(m.statusNr11()))
              .append(m.dataVencimentoNr11() != null ? "<br/><small>" + m.dataVencimentoNr11() + "</small>" : "").append("</td>");
            sb.append("<td class=\"").append(trainClass(m.statusNr35())).append("\">").append(esc(m.statusNr35()))
              .append(m.dataVencimentoNr35() != null ? "<br/><small>" + m.dataVencimentoNr35() + "</small>" : "").append("</td>");
            sb.append("<td class=\"").append(trainClass(m.statusAso())).append("\">").append(esc(m.statusAso()))
              .append(m.dataVencimentoAso() != null ? "<br/><small>" + m.dataVencimentoAso() + "</small>" : "").append("</td>");
            sb.append("<td class=\"").append(competClass(m.competencyStatus())).append("\">").append(esc(m.competencyStatus())).append("</td>");
            sb.append("</tr>");
        }
        sb.append("</tbody></table>");
    }

    private void appendValidacaoPublica(StringBuilder sb, SolicitacaoLiberacao sol) {
        appendSection(sb, "10. Valida&#231;&#227;o P&#250;blica");
        String token = sol.getPublicValidationToken();
        if (token == null || token.isBlank()) {
            sb.append("<p class=\"empty\">Valida&#231;&#227;o p&#250;blica indispon&#237;vel para este plano. ");
            sb.append("Apenas planos aprovados ap&#243;s a Fase 20 do RiggingCheck possuem URL de valida&#231;&#227;o.</p>");
            return;
        }
        String url = baseUrl + "/public/planos/" + token;
        sb.append("<p>Consulte a autenticidade deste plano sem login:</p>");
        sb.append("<p><b>URL: </b><span style=\"font-family:monospace;font-size:9pt\">").append(esc(url)).append("</span></p>");

        // Gera QR Code como imagem PNG base64
        try {
            com.google.zxing.qrcode.QRCodeWriter writer = new com.google.zxing.qrcode.QRCodeWriter();
            com.google.zxing.common.BitMatrix matrix = writer.encode(url,
                com.google.zxing.BarcodeFormat.QR_CODE, 200, 200);
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            com.google.zxing.client.j2se.MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            String base64 = java.util.Base64.getEncoder().encodeToString(baos.toByteArray());
            sb.append("<img src=\"data:image/png;base64,").append(base64).append("\" ")
              .append("alt=\"QR Code de validação\" style=\"width:120px;height:120px;margin-top:8px\"/>");
        } catch (Exception e) {
            log.warn("Falha ao gerar QR Code para plano {}: {}", sol.getId(), e.getMessage());
            sb.append("<p class=\"note\">QR Code indispon&#237;vel — use a URL acima.</p>");
        }

        sb.append("<p class=\"note\">Este QR Code direciona para a p&#225;gina de valida&#231;&#227;o p&#250;blica do RiggingCheck. ");
        sb.append("Qualquer pessoa pode verificar a autenticidade deste plano sem necessidade de login.</p>");
    }

    private void appendRodape(StringBuilder sb, SolicitacaoLiberacao sol) {
        sb.append("<hr/>");
        sb.append("<div class=\"rodape\">");
        sb.append("RiggingCheck &#8212; NR-11 &#8226; ABNT NBR 13541 &#8226; ISO 4308-1 &#8226; Petrobras N-2869");
        sb.append(" &#8212; OS: ").append(esc(sol.getOperacaoOs()));
        sb.append(" &#8212; ID: ").append(sol.getId());
        sb.append("<br/>Documento gerado automaticamente. Verificar dados f&#237;sicos antes de operar.");
        sb.append("</div>");
    }

    // ── CSS ───────────────────────────────────────────────────────────────────────

    private String css() {
        return """
            body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; margin: 0; padding: 20px; }
            h2.section { background: #1e3a5f; color: #fff; font-size: 12pt; padding: 6px 12px; margin: 24px 0 10px; border-left: 4px solid #3b82f6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
            th { background: #e8f0fe; color: #1e3a5f; font-size: 10pt; padding: 5px 8px; text-align: left; border: 1px solid #c8d9f5; }
            td { font-size: 10pt; padding: 5px 8px; border: 1px solid #d1d5db; vertical-align: top; }
            tr:nth-child(even) td { background: #f8faff; }
            .info-table td.label { background: #f1f5fd; font-weight: bold; width: 35%; color: #1e3a5f; }
            .mono { font-family: monospace; font-size: 10pt; }
            .ok { color: #166534; font-weight: bold; }
            .empty { color: #6b7280; font-style: italic; }
            .note { color: #6b7280; font-size: 9pt; margin-top: 4px; }
            .capa { text-align: center; padding: 60px 40px; }
            .capa-logo { font-size: 28pt; font-weight: bold; color: #1e3a5f; letter-spacing: 3px; }
            .capa-sub { font-size: 13pt; color: #374151; margin: 8px 0 24px; }
            .capa-line { border-top: 3px solid #1e3a5f; margin: 16px auto; width: 60%; }
            .capa-table { width: 70%; margin: 24px auto; text-align: left; }
            .capa-label { font-weight: bold; color: #1e3a5f; width: 40%; padding: 6px 10px; border: none; }
            .capa-value { padding: 6px 10px; border: none; }
            .rodape { font-size: 8pt; color: #6b7280; text-align: center; margin-top: 24px; }
            hr { border: none; border-top: 1px solid #d1d5db; margin: 20px 0; }
            .status-blocked { color: #991b1b; font-weight: bold; }
            .status-restricted { color: #9a3412; font-weight: bold; }
            .status-warning { color: #92400e; font-weight: bold; }
            .status-ok { color: #166534; font-weight: bold; }
            .status-gray { color: #374151; }
            @page { margin: 15mm; }
            """;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private static String esc(String s) {
        if (s == null) return "&#8212;";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String fmt(Double v) {
        if (v == null) return "&#8212;";
        return String.format("%.2f", v).replace(".", ",");
    }

    private static String boolLabel(Boolean b) {
        if (b == null) return "&#8212;";
        return b ? "Sim" : "N&#227;o";
    }

    private static String techStatusLabel(TechnicalStatus ts) {
        if (ts == null) return "&#8212;";
        return switch (ts) {
            case COMPLIANT  -> "Conforme";
            case WARNING    -> "Aten&#231;&#227;o";
            case RESTRICTED -> "Restrito";
            case BLOCKED    -> "Bloqueado";
        };
    }

    private static String tsClass(TechnicalStatus ts) {
        if (ts == null) return "status-gray";
        return switch (ts) {
            case BLOCKED    -> "status-blocked";
            case RESTRICTED -> "status-restricted";
            case WARNING    -> "status-warning";
            case COMPLIANT  -> "status-ok";
        };
    }

    private static String statusClass(String s) {
        if (s == null) return "status-gray";
        return switch (s) {
            case "REPROVADO", "DESCARTADO", "VENCIDO" -> "status-blocked";
            case "EM_INSPECAO" -> "status-warning";
            default -> "status-ok";
        };
    }

    private static String certClass(String s) {
        if (s == null) return "status-gray";
        return switch (s) {
            case "VENCIDO", "AUSENTE" -> "status-blocked";
            case "A_VENCER"           -> "status-warning";
            default                   -> "status-ok";
        };
    }

    private static String inspClass(String s) {
        if (s == null) return "status-gray";
        return switch (s) {
            case "REPROVADO"               -> "status-blocked";
            case "APROVADO_COM_RESTRICAO"  -> "status-warning";
            default                        -> "status-ok";
        };
    }

    private static String trainClass(String s) {
        if (s == null) return "status-gray";
        return switch (s) {
            case "VENCIDO", "AUSENTE" -> "status-blocked";
            case "A_VENCER"           -> "status-warning";
            case "VALIDO"             -> "status-ok";
            default                   -> "status-gray";
        };
    }

    private static String competClass(String s) {
        if (s == null) return "status-gray";
        return switch (s) {
            case "BLOQUEADO" -> "status-blocked";
            case "RESTRITO"  -> "status-warning";
            case "APTO"      -> "status-ok";
            default          -> "status-gray";
        };
    }
}
