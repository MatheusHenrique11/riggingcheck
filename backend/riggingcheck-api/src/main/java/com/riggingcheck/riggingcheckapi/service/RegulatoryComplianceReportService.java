package com.riggingcheck.riggingcheckapi.service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceResult;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceValidationService;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.*;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.dto.OperationTeamMemberResponse;
import com.riggingcheck.riggingcheckapi.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Gera o Relatório de Conformidade Regulatória NR-11 / Petrobras N-2869.
 * Independente do DatabookService — template HTML próprio, foco em auditoria.
 */
@Service
public class RegulatoryComplianceReportService {

    private static final Logger log = LoggerFactory.getLogger(RegulatoryComplianceReportService.class);
    private static final DateTimeFormatter FMT_D = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int DIAS_ALERTA            = 30;

    // ── Mapeamento item → norma e criticidade ────────────────────────────────────

    private static final Map<String, String> ITEM_NORMA = new LinkedHashMap<>();
    private static final Set<String> ALTA_CRITICIDADE = new HashSet<>();

    static {
        // Guindastes & Solo
        ITEM_NORMA.put("c1", "NR-11 item 11.3.2 / ISO 4308-1");
        ITEM_NORMA.put("c2", "NR-11 item 11.3.2 / Petrobras N-2869");
        ITEM_NORMA.put("c3", "NR-11 item 11.3.2 / ISO 4308-1");
        ITEM_NORMA.put("c4", "NR-11 item 11.3.2 / ISO 4308-1");
        // Equipamentos
        ITEM_NORMA.put("c5", "NR-11 item 11.3.1");
        ITEM_NORMA.put("c6", "NR-11 item 11.3.1");
        ITEM_NORMA.put("c7", "NR-11 item 11.3.1");
        ITEM_NORMA.put("c8", "NR-11 item 11.3.1 / ISO 4308-1");
        // Acessórios
        ITEM_NORMA.put("c9",  "NR-11 item 11.3.7 / ABNT NBR 13541");
        ITEM_NORMA.put("c10", "NR-11 item 11.3.7 / ABNT NBR 15637");
        ITEM_NORMA.put("c11", "NR-11 item 11.3.7");
        ITEM_NORMA.put("c12", "NR-11 item 11.3.7 / ABNT NBR 13541");
        // Pessoal
        ITEM_NORMA.put("c13", "NR-11 item 11.3.3");
        ITEM_NORMA.put("c14", "NR-11 item 11.3.3");
        ITEM_NORMA.put("c15", "NR-11 item 11.3.3");
        ITEM_NORMA.put("c16", "NR-11 item 11.3.3");
        // Ambiente
        ITEM_NORMA.put("c17", "NR-11 item 11.3.4 / Petrobras N-2869");
        ITEM_NORMA.put("c18", "NR-11 item 11.3.4");
        ITEM_NORMA.put("c19", "NR-11 item 11.3.4 / NR-10 Tabela 1");
        ITEM_NORMA.put("c20", "NR-11 item 11.3.4");
        // N-2869
        ITEM_NORMA.put("c21", "Petrobras N-2869 item 5.1");
        ITEM_NORMA.put("c22", "Petrobras N-2869 item 5.2 / NR-11");
        ITEM_NORMA.put("c23", "Petrobras N-2869 item 5.3");
        ITEM_NORMA.put("c24", "Petrobras N-2869 item 6.4");
        ITEM_NORMA.put("c25", "Petrobras N-2869 item 5.4");
        ITEM_NORMA.put("c26", "Petrobras N-2869 item 5.5");

        // Criticidade ALTA
        Collections.addAll(ALTA_CRITICIDADE, "c3", "c7", "c9", "c10", "c17", "c19", "c21", "c24");
    }

    private final SolicitacaoLiberacaoRepository  liberacaoRepository;
    private final ChecklistRespostaRepository      checklistRespostaRepository;
    private final RiggingPlanAccessoryRepository   planAccessoryRepository;
    private final ApprovalDecisionRepository       decisionRepository;
    private final FuncionarioRepository            funcionarioRepository;
    private final ComplianceValidationService      complianceService;
    private final OperationTeamMemberRepository    teamRepository;
    private final OperationTeamService             teamService;

    public RegulatoryComplianceReportService(
            SolicitacaoLiberacaoRepository liberacaoRepository,
            ChecklistRespostaRepository checklistRespostaRepository,
            RiggingPlanAccessoryRepository planAccessoryRepository,
            ApprovalDecisionRepository decisionRepository,
            FuncionarioRepository funcionarioRepository,
            ComplianceValidationService complianceService,
            OperationTeamMemberRepository teamRepository,
            OperationTeamService teamService) {
        this.liberacaoRepository         = liberacaoRepository;
        this.checklistRespostaRepository = checklistRespostaRepository;
        this.planAccessoryRepository     = planAccessoryRepository;
        this.decisionRepository          = decisionRepository;
        this.funcionarioRepository       = funcionarioRepository;
        this.complianceService           = complianceService;
        this.teamRepository              = teamRepository;
        this.teamService                 = teamService;
    }

    @Transactional(readOnly = true)
    public byte[] gerarRelatorio(UUID liberacaoId, String email) {
        Funcionario actor = funcionarioRepository.findByEmail(email)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usu&#225;rio"));

        SolicitacaoLiberacao sol = liberacaoRepository.findById(liberacaoId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Solicita&#231;&#227;o"));

        if (actor.getRole() != RoleEnum.SUPER_ADMIN
                && !sol.getEmpresaId().equals(actor.getEmpresaId())) {
            throw new AcessoNegadoException();
        }

        List<ChecklistResposta> checklist = checklistRespostaRepository
            .findBySolicitacaoLiberacaoIdOrderByCodigoItemAsc(liberacaoId);

        List<RiggingPlanAccessory> acessorios = planAccessoryRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(liberacaoId);

        List<ApprovalDecision> decisoes = decisionRepository
            .findByPlanIdOrderByDecidedAtDesc(liberacaoId);

        Optional<Funcionario> riggerOpt = sol.getSolicitadoPorId() != null
            ? funcionarioRepository.findById(sol.getSolicitadoPorId())
            : Optional.empty();

        List<OperationTeamMemberResponse> equipe = teamRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(liberacaoId)
            .stream()
            .map(m -> teamService.toResponse(m, funcionarioRepository.findById(m.getFuncionarioId()).orElse(null)))
            .collect(Collectors.toList());

        ComplianceResult compliance = complianceService.validate(sol);

        String html = buildHtml(sol, checklist, acessorios, decisoes, riggerOpt.orElse(null), equipe, compliance);
        return renderPdf(html, liberacaoId);
    }

    // ── Renderização ──────────────────────────────────────────────────────────────

    private byte[] renderPdf(String html, UUID id) {
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(os);
            builder.run();
            return os.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de conformidade {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Falha ao gerar PDF do relatório de conformidade.", e);
        }
    }

    // ── Template HTML ─────────────────────────────────────────────────────────────

    private String buildHtml(SolicitacaoLiberacao sol,
                              List<ChecklistResposta> checklist,
                              List<RiggingPlanAccessory> acessorios,
                              List<ApprovalDecision> decisoes,
                              Funcionario rigger,
                              List<OperationTeamMemberResponse> equipe,
                              ComplianceResult compliance) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.append("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">");
        sb.append("<html xmlns=\"http://www.w3.org/1999/xhtml\"><head>");
        sb.append("<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"/>");
        sb.append("<title>Relat&#243;rio de Conformidade — ").append(esc(sol.getOperacaoOs())).append("</title>");
        sb.append("<style>").append(css()).append("</style>");
        sb.append("</head><body>");

        appendCapa(sb, sol, compliance);
        sb.append("<div style=\"page-break-after:always;\"></div>");

        appendEscopoRegulatorio(sb);
        appendMatrizChecklist(sb, checklist, sol);
        appendNaoConformidades(sb, checklist, compliance);
        appendPetrobras(sb, sol, checklist);
        appendEquipe(sb, rigger, sol, equipe);
        appendAcessorios(sb, acessorios);
        appendConclusao(sb, sol, checklist, compliance, decisoes);
        appendRodape(sb, sol);

        sb.append("</body></html>");
        return sb.toString();
    }

    // ── Seções ────────────────────────────────────────────────────────────────────

    private void appendCapa(StringBuilder sb, SolicitacaoLiberacao sol, ComplianceResult compliance) {
        String conclusao = calcularConclusao(sol, compliance, Collections.emptyList());
        String corConclusao = conclusao.contains("N&#195;O") ? "#991b1b"
            : conclusao.contains("RESTRI") ? "#92400e" : "#166534";

        sb.append("<div class=\"capa\">");
        sb.append("<div class=\"capa-logo\">RIGGINGCHECK</div>");
        sb.append("<div class=\"capa-sub\">Relat&#243;rio de Conformidade Regulat&#243;ria</div>");
        sb.append("<div class=\"capa-sub2\">NR-11 &#8226; Petrobras N-2869 &#8226; ABNT NBR 13541</div>");
        sb.append("<div class=\"capa-line\"></div>");
        sb.append("<table class=\"capa-table\"><tbody>");
        row2(sb, "Empresa", esc(sol.getEmpresaNome()));
        row2(sb, "OS / Opera&#231;&#227;o", esc(sol.getOperacaoOs()));
        row2(sb, "Local", esc(sol.getLocalOperacao()));
        row2(sb, "Data da Opera&#231;&#227;o", sol.getDataOperacao() != null ? sol.getDataOperacao().format(FMT_D) : "&#8212;");
        row2(sb, "Respons&#225;vel / Rigger", esc(sol.getRiggerNome()));
        row2(sb, "Supervisor", esc(sol.getSupervisorNome()));
        row2(sb, "Status T&#233;cnico", techLabel(sol.getTechnicalStatus()));
        row2(sb, "Status Aprova&#231;&#227;o", esc(sol.getStatus() != null ? sol.getStatus().name() : "&#8212;"));
        sb.append("</tbody></table>");
        sb.append("<div style=\"margin-top:28px;padding:16px 28px;border:3px solid ").append(corConclusao)
          .append(";border-radius:6px;display:inline-block;\">");
        sb.append("<div style=\"font-size:10pt;color:#374151;margin-bottom:4px\">CONCLUS&#195;O REGULAT&#211;RIA</div>");
        sb.append("<div style=\"font-size:16pt;font-weight:bold;color:").append(corConclusao).append("\">")
          .append(conclusao).append("</div>");
        sb.append("</div>");
        sb.append("</div>");
    }

    private void appendEscopoRegulatorio(StringBuilder sb) {
        section(sb, "1. Escopo Regulat&#243;rio");
        sb.append("<table class=\"info-table\"><tbody>");
        row2(sb, "NR-11", "Seguran&#231;a no Trabalho em Opera&#231;&#245;es de Içamento, Movimentação e Transporte de Materiais");
        row2(sb, "Petrobras N-2869", "Requisitos para Projetos e Execu&#231;&#227;o de Içamentos — Rev.B");
        row2(sb, "ABNT NBR 13541", "Movimentação de Cargas — Cintas de Fibra Sintética");
        row2(sb, "ABNT NBR 15637", "Acess&#243;rios para Içamento — Requisitos de Desempenho");
        row2(sb, "ISO 4308-1", "Cranes and Lifting Appliances — Selection of Wire Ropes");
        row2(sb, "NR-10", "Seguran&#231;a em Instala&#231;&#245;es e Servi&#231;os em Eletricidade");
        sb.append("</tbody></table>");
        sb.append("<p class=\"note\">Este relat&#243;rio &#233; baseado exclusivamente nos dados informados e evid&#234;ncias registradas no sistema RiggingCheck. ");
        sb.append("N&#227;o substitui laudo t&#233;cnico assinado por profissional habilitado.</p>");
    }

    private void appendMatrizChecklist(StringBuilder sb, List<ChecklistResposta> checklist, SolicitacaoLiberacao sol) {
        section(sb, "2. Matriz de Conformidade do Checklist");

        if (checklist.isEmpty()) {
            sb.append("<p class=\"empty\">Checklist individual n&#227;o registrado nesta submiss&#227;o.</p>");
            if (Boolean.TRUE.equals(sol.getChecklistCompleto())) {
                sb.append("<p class=\"ok\">&#10003; Checklist marcado como conclu&#237;do pelo operador no momento da submiss&#227;o.</p>");
            }
            return;
        }

        long ok  = checklist.stream().filter(c -> Boolean.TRUE.equals(c.getRespondido())).count();
        long nok = checklist.size() - ok;
        sb.append("<p><b>").append(ok).append(" de ").append(checklist.size())
          .append(" itens verificados</b> &mdash; ").append(nok).append(" n&#227;o verificado(s).</p>");

        sb.append("<table><thead><tr>");
        for (String h : new String[]{"C&#243;d.", "Categoria", "Item", "Resp.", "Norma", "Criticidade"}) {
            sb.append("<th>").append(h).append("</th>");
        }
        sb.append("</tr></thead><tbody>");

        for (ChecklistResposta c : checklist) {
            boolean respondido = Boolean.TRUE.equals(c.getRespondido());
            boolean alta = ALTA_CRITICIDADE.contains(c.getCodigoItem());
            String norma = ITEM_NORMA.getOrDefault(c.getCodigoItem(), "NR-11");
            sb.append("<tr>");
            sb.append("<td class=\"mono\">").append(esc(c.getCodigoItem())).append("</td>");
            sb.append("<td>").append(esc(c.getCategoriaItem())).append("</td>");
            sb.append("<td>").append(esc(c.getPerguntaItem())).append("</td>");
            sb.append("<td class=\"").append(respondido ? "status-ok" : "status-blocked").append("\">")
              .append(respondido ? "&#10003;" : "&#10007;").append("</td>");
            sb.append("<td class=\"small\">").append(norma).append("</td>");
            sb.append("<td class=\"").append(alta ? "status-blocked" : "status-warn").append("\">")
              .append(alta ? "ALTA" : "M&#201;DIA").append("</td>");
            sb.append("</tr>");
        }
        sb.append("</tbody></table>");
    }

    private void appendNaoConformidades(StringBuilder sb, List<ChecklistResposta> checklist, ComplianceResult compliance) {
        section(sb, "3. N&#227;o Conformidades Identificadas");

        List<ChecklistResposta> pendentes = checklist.stream()
            .filter(c -> !Boolean.TRUE.equals(c.getRespondido()))
            .collect(Collectors.toList());

        boolean temNc = !pendentes.isEmpty()
            || (compliance.violations() != null && !compliance.violations().isEmpty());

        if (!temNc) {
            sb.append("<p class=\"ok\">&#10003; Nenhuma n&#227;o conformidade identificada.</p>");
            return;
        }

        // Itens de checklist não verificados
        if (!pendentes.isEmpty()) {
            sb.append("<h3 class=\"subsection\">3.1 Itens do Checklist N&#227;o Verificados</h3>");
            sb.append("<table><thead><tr><th>C&#243;d.</th><th>Item</th><th>Norma</th><th>Criticidade</th></tr></thead><tbody>");
            for (ChecklistResposta c : pendentes) {
                boolean alta = ALTA_CRITICIDADE.contains(c.getCodigoItem());
                String norma = ITEM_NORMA.getOrDefault(c.getCodigoItem(), "NR-11");
                sb.append("<tr>");
                sb.append("<td class=\"mono\">").append(esc(c.getCodigoItem())).append("</td>");
                sb.append("<td>").append(esc(c.getPerguntaItem())).append("</td>");
                sb.append("<td class=\"small\">").append(norma).append("</td>");
                sb.append("<td class=\"").append(alta ? "status-blocked" : "status-warn").append("\">")
                  .append(alta ? "ALTA" : "M&#201;DIA").append("</td>");
                sb.append("</tr>");
            }
            sb.append("</tbody></table>");
        }

        // Violações da Compliance Engine
        if (compliance.violations() != null && !compliance.violations().isEmpty()) {
            sb.append("<h3 class=\"subsection\">3.2 Viola&#231;&#245;es da Compliance Engine</h3>");
            sb.append("<table><thead><tr><th>Severidade</th><th>Regra</th><th>Mensagem</th><th>Norma</th><th>A&#231;&#227;o</th></tr></thead><tbody>");
            for (ComplianceViolation v : compliance.violations()) {
                String sev = v.severity() != null ? v.severity().name() : "&#8212;";
                String cls = "BLOCKED".equals(sev) ? "status-blocked"
                    : "RESTRICTED".equals(sev) ? "status-warn" : "status-warn";
                sb.append("<tr>");
                sb.append("<td class=\"").append(cls).append("\">").append(sev).append("</td>");
                sb.append("<td class=\"mono\">").append(esc(v.ruleId())).append("</td>");
                sb.append("<td>").append(esc(v.message())).append("</td>");
                sb.append("<td class=\"small\">").append(esc(v.norm())).append("</td>");
                sb.append("<td>").append(esc(v.recommendedAction())).append("</td>");
                sb.append("</tr>");
            }
            sb.append("</tbody></table>");
        }
    }

    private void appendPetrobras(StringBuilder sb, SolicitacaoLiberacao sol, List<ChecklistResposta> checklist) {
        section(sb, "4. Conformidade Petrobras N-2869");

        // Itens N-2869 do checklist (c21–c26)
        List<ChecklistResposta> itensN2869 = checklist.stream()
            .filter(c -> c.getCodigoItem() != null && c.getCodigoItem().matches("c2[1-6]"))
            .collect(Collectors.toList());

        if (!itensN2869.isEmpty()) {
            sb.append("<h3 class=\"subsection\">Checklist N-2869</h3>");
            sb.append("<table><thead><tr><th>C&#243;d.</th><th>Requisito N-2869</th><th>Status</th></tr></thead><tbody>");
            for (ChecklistResposta c : itensN2869) {
                boolean ok = Boolean.TRUE.equals(c.getRespondido());
                sb.append("<tr>");
                sb.append("<td class=\"mono\">").append(esc(c.getCodigoItem())).append("</td>");
                sb.append("<td>").append(esc(c.getPerguntaItem())).append("</td>");
                sb.append("<td class=\"").append(ok ? "status-ok" : "status-blocked").append("\">")
                  .append(ok ? "&#10003; Verificado" : "&#10007; N&#227;o verificado").append("</td>");
                sb.append("</tr>");
            }
            sb.append("</tbody></table>");
        }

        // Dados adicionais do JSON Petrobras
        String json = sol.getPetrobrasDataJson();
        if (json != null && !json.isBlank()) {
            sb.append("<h3 class=\"subsection\">Dados do M&#243;dulo N-2869</h3>");
            sb.append("<p class=\"note\">Dados registrados na submiss&#227;o do Wizard:</p>");
            // Extrai campos legíveis do JSON sem biblioteca externa
            sb.append("<table class=\"info-table\"><tbody>");
            appendJsonField(sb, json, "classificacao", "Classifica&#231;&#227;o da Opera&#231;&#227;o");
            appendJsonField(sb, json, "tandem", "Opera&#231;&#227;o Tandem (2 guindastes)");
            appendJsonField(sb, json, "sobreAreaHabitada", "Sobre &#225;rea habitada");
            appendJsonField(sb, json, "cargaEspecial", "Carga especial");
            appendJsonField(sb, json, "todosMarcados", "Todos os requisitos marcados");
            sb.append("</tbody></table>");
        } else if (itensN2869.isEmpty()) {
            sb.append("<p class=\"empty\">M&#243;dulo Petrobras N-2869 n&#227;o ativado nesta submiss&#227;o.</p>");
        }
    }

    private void appendEquipe(StringBuilder sb, Funcionario rigger, SolicitacaoLiberacao sol,
                               List<OperationTeamMemberResponse> equipe) {
        section(sb, "5. Equipe e Treinamentos");

        if (!equipe.isEmpty()) {
            // Equipe completa vinculada formalmente ao plano
            sb.append("<p><b>").append(equipe.size()).append(" membro(s) formalmente vinculado(s) ao plano.</b></p>");
            sb.append("<table><thead><tr>");
            for (String h : new String[]{"Nome", "Fun&#231;&#227;o Op.", "NR-11", "NR-35", "ASO", "Compet&#234;ncia"}) {
                sb.append("<th>").append(h).append("</th>");
            }
            sb.append("</tr></thead><tbody>");
            for (OperationTeamMemberResponse m : equipe) {
                sb.append("<tr>");
                sb.append("<td>").append(esc(m.nome()))
                  .append(Boolean.TRUE.equals(m.responsavel()) ? " <b>(Resp.)</b>" : "").append("</td>");
                sb.append("<td>").append(esc(m.funcaoOperacional())).append("</td>");
                sb.append("<td>").append(trainSpan(m.statusNr11(), m.dataVencimentoNr11())).append("</td>");
                sb.append("<td>").append(trainSpan(m.statusNr35(), m.dataVencimentoNr35())).append("</td>");
                sb.append("<td>").append(trainSpan(m.statusAso(),  m.dataVencimentoAso())).append("</td>");
                sb.append("<td class=\"").append(competClass(m.competencyStatus())).append("\">")
                  .append(esc(m.competencyStatus())).append("</td>");
                sb.append("</tr>");
            }
            sb.append("</tbody></table>");
        } else {
            // Fallback: mostra apenas o rigger que submeteu
            sb.append("<p class=\"note\">Equipe n&#227;o vinculada formalmente ao plano nesta submiss&#227;o. ");
            sb.append("Exibindo apenas o respons&#225;vel pela submiss&#227;o.</p>");
            if (rigger == null) {
                sb.append("<p class=\"empty\">Dados do respons&#225;vel n&#227;o dispon&#237;veis.</p>");
                return;
            }
            LocalDate hoje = LocalDate.now();
            sb.append("<table><thead><tr>");
            for (String h : new String[]{"Nome", "Fun&#231;&#227;o", "E-mail", "NR-11", "NR-35", "ASO"}) {
                sb.append("<th>").append(h).append("</th>");
            }
            sb.append("</tr></thead><tbody><tr>");
            sb.append("<td>").append(esc(rigger.getNome())).append("</td>");
            sb.append("<td>").append(esc(rigger.getRole() != null ? rigger.getRole().name() : "&#8212;")).append("</td>");
            sb.append("<td>").append(esc(rigger.getEmail())).append("</td>");
            sb.append("<td>").append(statusTreinamento(rigger.getVencimentoNr11(), hoje)).append("</td>");
            sb.append("<td>").append(statusTreinamento(rigger.getVencimentoNr35(), hoje)).append("</td>");
            sb.append("<td>").append(statusTreinamento(rigger.getVencimentoAso(), hoje)).append("</td>");
            sb.append("</tr></tbody></table>");
            if (sol.getRiggerNome() != null && !rigger.getNome().equalsIgnoreCase(sol.getRiggerNome())) {
                sb.append("<p class=\"note\">Rigger informado no plano: <b>").append(esc(sol.getRiggerNome()))
                  .append("</b>.</p>");
            }
        }
    }

    private static String trainSpan(String status, String data) {
        String cls = switch (status != null ? status : "") {
            case "VENCIDO", "AUSENTE" -> "status-blocked";
            case "A_VENCER"           -> "status-warn";
            case "VALIDO"             -> "status-ok";
            default                   -> "status-gray";
        };
        String label = status != null ? status : "&#8212;";
        return "<span class=\"" + cls + "\">" + label + (data != null ? " (" + data + ")" : "") + "</span>";
    }

    private static String competClass(String s) {
        if (s == null) return "status-gray";
        return switch (s) {
            case "BLOQUEADO" -> "status-blocked";
            case "RESTRITO"  -> "status-warn";
            case "APTO"      -> "status-ok";
            default          -> "status-gray";
        };
    }

    private void appendAcessorios(StringBuilder sb, List<RiggingPlanAccessory> acessorios) {
        section(sb, "6. Acess&#243;rios e Certificados Vinculados");

        if (acessorios.isEmpty()) {
            sb.append("<p class=\"empty\">Nenhum acess&#243;rio vinculado formalmente a este plano.</p>");
            return;
        }

        sb.append("<table><thead><tr>");
        for (String h : new String[]{"C&#243;digo", "Tipo", "WLL (kg)", "Status", "Certificado", "&#218;lt. Inspe&#231;&#227;o"}) {
            sb.append("<th>").append(h).append("</th>");
        }
        sb.append("</tr></thead><tbody>");
        for (RiggingPlanAccessory a : acessorios) {
            sb.append("<tr>");
            sb.append("<td class=\"mono\">").append(esc(a.getCodigoInternoSnapshot())).append("</td>");
            sb.append("<td>").append(esc(a.getTipoSnapshot())).append("</td>");
            sb.append("<td>").append(fmtNum(a.getWllKgSnapshot())).append("</td>");
            sb.append("<td class=\"").append(accStatusClass(a.getStatusSnapshot())).append("\">")
              .append(esc(a.getStatusSnapshot())).append("</td>");
            sb.append("<td class=\"").append(certClass(a.getCertificadoStatusSnapshot())).append("\">")
              .append(esc(a.getCertificadoStatusSnapshot())).append("</td>");
            sb.append("<td class=\"").append(inspClass(a.getUltimaInspecaoResultadoSnapshot())).append("\">")
              .append(esc(a.getUltimaInspecaoResultadoSnapshot())).append("</td>");
            sb.append("</tr>");
        }
        sb.append("</tbody></table>");
    }

    private void appendConclusao(StringBuilder sb, SolicitacaoLiberacao sol,
                                  List<ChecklistResposta> checklist,
                                  ComplianceResult compliance,
                                  List<ApprovalDecision> decisoes) {
        section(sb, "7. Conclus&#227;o Regulat&#243;ria");

        String conclusao = calcularConclusao(sol, compliance, checklist);
        String cor = conclusao.contains("N&#195;O") ? "#991b1b"
            : conclusao.contains("RESTRI") ? "#92400e" : "#166534";

        sb.append("<div style=\"border:2px solid ").append(cor)
          .append(";border-radius:6px;padding:14px 20px;margin-bottom:16px;\">");
        sb.append("<div style=\"font-size:14pt;font-weight:bold;color:").append(cor).append("\">")
          .append(conclusao).append("</div>");
        sb.append("</div>");

        // Base da conclusão
        sb.append("<table class=\"info-table\"><tbody>");
        row2(sb, "Status T&#233;cnico (Compliance Engine)", techLabel(compliance.overallStatus()));
        long clOk  = checklist.stream().filter(c -> Boolean.TRUE.equals(c.getRespondido())).count();
        if (!checklist.isEmpty()) {
            row2(sb, "Checklist", clOk + " de " + checklist.size() + " itens verificados");
        } else {
            row2(sb, "Checklist", "N&#227;o registrado individualmente");
        }
        long accBloq = planAccessoryRepository.findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(sol.getId())
            .stream().filter(a -> !"ATIVO".equals(a.getStatusSnapshot())).count();
        row2(sb, "Acess&#243;rios vinculados", planAccessoryRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(sol.getId()).size()
            + " total" + (accBloq > 0 ? " / " + accBloq + " n&#227;o ATIVO" : ""));
        row2(sb, "Status de Aprova&#231;&#227;o", sol.getStatus() != null ? sol.getStatus().name() : "&#8212;");
        if (!decisoes.isEmpty()) {
            ApprovalDecision ultima = decisoes.get(0);
            row2(sb, "&#218;ltima decis&#227;o", ultima.getDecision() != null ? ultima.getDecision().name() : "&#8212;");
            row2(sb, "Decidido por", esc(ultima.getDecidedByName()));
        }
        sb.append("</tbody></table>");

        sb.append("<p class=\"note\" style=\"margin-top:16px;\">Este relat&#243;rio &#233; gerado automaticamente e n&#227;o substitui a an&#225;lise cr&#237;tica por profissional habilitado. ");
        sb.append("Todas as decis&#245;es s&#227;o de responsabilidade do Respons&#225;vel T&#233;cnico pela opera&#231;&#227;o.</p>");
    }

    private void appendRodape(StringBuilder sb, SolicitacaoLiberacao sol) {
        sb.append("<hr/>");
        sb.append("<div class=\"rodape\">");
        sb.append("RiggingCheck &#8212; Relat&#243;rio de Conformidade Regulat&#243;ria NR-11 / Petrobras N-2869");
        sb.append(" &#8212; OS: ").append(esc(sol.getOperacaoOs()));
        sb.append("<br/>Documento gerado automaticamente. Verificar dados antes de operar.");
        sb.append("</div>");
    }

    // ── CSS ───────────────────────────────────────────────────────────────────────

    private String css() {
        return """
            body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; margin: 0; padding: 20px; }
            h2.section { background: #1e3a5f; color: #fff; font-size: 11pt; padding: 5px 10px; margin: 20px 0 8px; border-left: 4px solid #3b82f6; }
            h3.subsection { font-size: 10pt; color: #1e3a5f; margin: 14px 0 6px; border-bottom: 1px solid #c8d9f5; padding-bottom: 3px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th { background: #e8f0fe; color: #1e3a5f; font-size: 9pt; padding: 4px 7px; text-align: left; border: 1px solid #c8d9f5; }
            td { font-size: 9pt; padding: 4px 7px; border: 1px solid #d1d5db; vertical-align: top; }
            tr:nth-child(even) td { background: #f8faff; }
            .info-table td:first-child { background: #f1f5fd; font-weight: bold; width: 35%; color: #1e3a5f; }
            .mono { font-family: monospace; font-size: 9pt; }
            .small { font-size: 8pt; }
            .ok { color: #166534; font-weight: bold; }
            .empty { color: #6b7280; font-style: italic; }
            .note { color: #6b7280; font-size: 8pt; margin-top: 4px; }
            .capa { text-align: center; padding: 50px 40px; }
            .capa-logo { font-size: 24pt; font-weight: bold; color: #1e3a5f; letter-spacing: 2px; }
            .capa-sub { font-size: 13pt; color: #374151; margin: 6px 0 4px; }
            .capa-sub2 { font-size: 9pt; color: #6b7280; }
            .capa-line { border-top: 3px solid #1e3a5f; margin: 14px auto; width: 60%; }
            .capa-table { width: 65%; margin: 20px auto; text-align: left; border: none; }
            .capa-table td { border: none; padding: 4px 10px; }
            .capa-table td:first-child { font-weight: bold; color: #1e3a5f; width: 40%; }
            .rodape { font-size: 7pt; color: #6b7280; text-align: center; margin-top: 20px; }
            hr { border: none; border-top: 1px solid #d1d5db; margin: 16px 0; }
            .status-ok { color: #166534; font-weight: bold; }
            .status-blocked { color: #991b1b; font-weight: bold; }
            .status-warn { color: #92400e; font-weight: bold; }
            .status-gray { color: #374151; }
            @page { margin: 14mm; }
            """;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private static void section(StringBuilder sb, String title) {
        sb.append("<h2 class=\"section\">").append(title).append("</h2>");
    }

    private static void row2(StringBuilder sb, String label, String value) {
        sb.append("<tr><td>").append(label).append("</td><td>").append(value).append("</td></tr>");
    }

    private String calcularConclusao(SolicitacaoLiberacao sol, ComplianceResult compliance,
                                      List<ChecklistResposta> checklist) {
        if (sol.getStatus() != null && "PARAR".equals(sol.getStatus().name())) {
            return "N&#195;O CONFORME";
        }
        if (compliance.overallStatus() == TechnicalStatus.BLOCKED) {
            return "N&#195;O CONFORME / BLOQUEADO";
        }
        if (compliance.overallStatus() == TechnicalStatus.RESTRICTED) {
            return "CONFORME COM RESTRI&#199;&#213;ES";
        }
        long nok = checklist.stream().filter(c -> !Boolean.TRUE.equals(c.getRespondido())).count();
        if (nok > 0 || compliance.overallStatus() == TechnicalStatus.WARNING) {
            return "CONFORME COM RESTRI&#199;&#213;ES";
        }
        return "CONFORME";
    }

    private String statusTreinamento(LocalDate validade, LocalDate hoje) {
        if (validade == null) return "<span class=\"status-gray\">AUSENTE</span>";
        if (validade.isBefore(hoje)) return "<span class=\"status-blocked\">VENCIDO " + validade.format(FMT_D) + "</span>";
        if (validade.isBefore(hoje.plusDays(DIAS_ALERTA))) return "<span class=\"status-warn\">A VENCER " + validade.format(FMT_D) + "</span>";
        return "<span class=\"status-ok\">V&#193;LIDO " + validade.format(FMT_D) + "</span>";
    }

    private void appendJsonField(StringBuilder sb, String json, String key, String label) {
        // Extração simples sem biblioteca Jackson — busca "key":"value" ou "key":value
        String pattern1 = "\"" + key + "\":\"";
        String pattern2 = "\"" + key + "\":";
        String value = null;
        int idx = json.indexOf(pattern1);
        if (idx >= 0) {
            int start = idx + pattern1.length();
            int end = json.indexOf("\"", start);
            if (end > start) value = json.substring(start, end);
        } else {
            idx = json.indexOf(pattern2);
            if (idx >= 0) {
                int start = idx + pattern2.length();
                int end = json.indexOf(",", start);
                if (end < 0) end = json.indexOf("}", start);
                if (end > start) value = json.substring(start, end).trim().replace("\"", "");
            }
        }
        if (value != null && !value.isBlank()) {
            row2(sb, label, esc(value));
        }
    }

    private static String esc(String s) {
        if (s == null) return "&#8212;";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String fmtNum(Double v) {
        if (v == null) return "&#8212;";
        return String.format("%.0f", v);
    }

    private static String techLabel(TechnicalStatus ts) {
        if (ts == null) return "&#8212;";
        return switch (ts) {
            case COMPLIANT  -> "<span class=\"status-ok\">Conforme</span>";
            case WARNING    -> "<span class=\"status-warn\">Aten&#231;&#227;o</span>";
            case RESTRICTED -> "<span class=\"status-warn\">Restrito</span>";
            case BLOCKED    -> "<span class=\"status-blocked\">Bloqueado</span>";
        };
    }

    private static String accStatusClass(String s) {
        if (s == null) return "status-gray";
        return switch (s) {
            case "REPROVADO", "DESCARTADO", "VENCIDO" -> "status-blocked";
            case "EM_INSPECAO" -> "status-warn";
            default -> "status-ok";
        };
    }

    private static String certClass(String s) {
        if (s == null) return "status-gray";
        return switch (s) {
            case "VENCIDO", "AUSENTE" -> "status-blocked";
            case "A_VENCER"           -> "status-warn";
            default                   -> "status-ok";
        };
    }

    private static String inspClass(String s) {
        if (s == null) return "status-gray";
        return switch (s) {
            case "REPROVADO"              -> "status-blocked";
            case "APROVADO_COM_RESTRICAO" -> "status-warn";
            default                       -> "status-ok";
        };
    }
}
