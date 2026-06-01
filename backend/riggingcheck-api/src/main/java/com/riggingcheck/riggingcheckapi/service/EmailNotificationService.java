package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.OperationalAlert;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Envia e-mails de notificação. Captura toda exceção SMTP para não quebrar o fluxo principal.
 * Quando SMTP não está configurado, usa InMemoryMailSender (no-op).
 */
@Service
public class EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);
    private static final int MAX_ITEMS_DIGEST = 10;

    private final JavaMailSender mailSender;

    @Value("${alert.digest.from:noreply@riggingcheck.com}")
    private String fromEmail;

    @Value("${alert.digest.base-url:https://riggingcheck.app}")
    private String baseUrl;

    public EmailNotificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Envia digest de alertas para um destinatário.
     * Erros SMTP são logados e NÃO relançados.
     *
     * @return true se enviado com sucesso, false se houve erro ou skip
     */
    public boolean enviarDigest(String toEmail, String toNome, String empresaNome,
                                 List<OperationalAlert> alertas) {
        if (alertas.isEmpty()) {
            log.debug("Digest pulado para {} — nenhum alerta crítico.", toEmail);
            return false;
        }

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, StandardCharsets.UTF_8.name());

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("[RiggingCheck] Alertas críticos — " + empresaNome);
            helper.setText(buildHtml(toNome, empresaNome, alertas), true);

            mailSender.send(msg);
            log.info("Digest enviado para {} ({}) — {} alertas.", toEmail, empresaNome, alertas.size());
            return true;
        } catch (Exception e) {
            log.error("Falha ao enviar digest para {} ({}): {}", toEmail, empresaNome, e.getMessage());
            return false;
        }
    }

    // ── Template HTML ─────────────────────────────────────────────────────────────

    private String buildHtml(String nome, String empresa, List<OperationalAlert> alertas) {
        long bloqueados = alertas.stream()
            .filter(a -> "BLOCKED".equals(a.getSeveridade() != null ? a.getSeveridade().name() : ""))
            .count();
        long restritos = alertas.size() - bloqueados;

        List<OperationalAlert> exibir = alertas.size() > MAX_ITEMS_DIGEST
            ? alertas.subList(0, MAX_ITEMS_DIGEST)
            : alertas;

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html lang=\"pt-BR\"><head>")
          .append("<meta charset=\"UTF-8\">")
          .append("<style>")
          .append("body{font-family:Arial,sans-serif;font-size:14px;color:#111;background:#f4f7fb;margin:0;padding:20px}")
          .append(".card{background:#fff;border-radius:10px;padding:28px 32px;max-width:600px;margin:0 auto;box-shadow:0 2px 8px #0001}")
          .append(".header{background:#1e3a5f;color:#fff;border-radius:8px;padding:16px 24px;margin-bottom:24px}")
          .append(".logo{font-size:20px;font-weight:800;letter-spacing:1px}")
          .append(".subtitle{font-size:13px;color:#93c5fd;margin-top:4px}")
          .append(".kpi-row{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}")
          .append(".kpi{flex:1;min-width:100px;text-align:center;border-radius:8px;padding:14px;border:1px solid #e5e7eb}")
          .append(".kpi-num{font-size:28px;font-weight:800;line-height:1}")
          .append(".kpi-label{font-size:11px;color:#6b7280;margin-top:4px}")
          .append(".blocked{color:#dc2626;background:#fef2f2;border-color:#fecaca}")
          .append(".restricted{color:#ea580c;background:#fff7ed;border-color:#fed7aa}")
          .append(".alert-item{border-left:3px solid #ef4444;padding:10px 14px;margin-bottom:10px;background:#fafafa;border-radius:0 6px 6px 0}")
          .append(".alert-item.restricted{border-left-color:#f97316}")
          .append(".alert-title{font-weight:700;font-size:14px;margin-bottom:2px}")
          .append(".alert-msg{font-size:12px;color:#6b7280}")
          .append(".cta{display:block;text-align:center;margin:24px 0;padding:12px 24px;background:#1e3a5f;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}")
          .append(".footer{font-size:11px;color:#9ca3af;text-align:center;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:16px}")
          .append("</style></head><body><div class=\"card\">");

        // Header
        sb.append("<div class=\"header\">")
          .append("<div class=\"logo\">RIGGINGCHECK</div>")
          .append("<div class=\"subtitle\">Digest de Alertas Operacionais — ").append(empresa).append("</div>")
          .append("</div>");

        // Greeting
        sb.append("<p>Olá, <strong>").append(escHtml(nome)).append("</strong>!</p>")
          .append("<p>Resumo dos alertas críticos e restritivos da empresa <strong>")
          .append(escHtml(empresa)).append("</strong>:</p>");

        // KPIs
        sb.append("<div class=\"kpi-row\">")
          .append("<div class=\"kpi\"><div class=\"kpi-num\" style=\"color:#111\">").append(alertas.size()).append("</div><div class=\"kpi-label\">Total</div></div>")
          .append("<div class=\"kpi blocked\"><div class=\"kpi-num\">").append(bloqueados).append("</div><div class=\"kpi-label\">Bloqueados</div></div>")
          .append("<div class=\"kpi restricted\"><div class=\"kpi-num\">").append(restritos).append("</div><div class=\"kpi-label\">Restritos</div></div>")
          .append("</div>");

        // Lista de alertas
        sb.append("<h3 style=\"font-size:14px;color:#374151;margin-bottom:12px\">")
          .append("Principais alertas</h3>");

        for (OperationalAlert a : exibir) {
            boolean blocked = a.getSeveridade() != null && "BLOCKED".equals(a.getSeveridade().name());
            sb.append("<div class=\"alert-item").append(blocked ? "" : " restricted").append("\">")
              .append("<div class=\"alert-title\">").append(escHtml(a.getTitulo())).append("</div>")
              .append("<div class=\"alert-msg\">").append(escHtml(a.getMensagem())).append("</div>")
              .append("</div>");
        }

        if (alertas.size() > MAX_ITEMS_DIGEST) {
            sb.append("<p style=\"font-size:12px;color:#6b7280\">+ ")
              .append(alertas.size() - MAX_ITEMS_DIGEST)
              .append(" alerta(s) adicional(is). Acesse o RiggingCheck para ver todos.</p>");
        }

        // CTA
        sb.append("<a href=\"").append(baseUrl).append("/app/alertas\" class=\"cta\">")
          .append("Ver todos os alertas no RiggingCheck</a>");

        // Footer
        sb.append("<div class=\"footer\">")
          .append("Este e-mail é um resumo automático gerado pelo RiggingCheck.<br/>")
          .append("Para gerenciar notificações, acesse sua conta.<br/>")
          .append("Consulte o sistema para detalhes completos antes de tomar qualquer ação operacional.")
          .append("</div>");

        sb.append("</div></body></html>");
        return sb.toString();
    }

    private static String escHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
