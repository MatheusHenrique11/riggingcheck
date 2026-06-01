package com.riggingcheck.riggingcheckapi.config;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Fornece JavaMailSender no-op (InMemoryMailSender) quando SMTP não está configurado.
 * Em produção, Spring Boot auto-configura JavaMailSenderImpl via spring.mail.host.
 * Em testes e sem SMTP configurado, esta implementação captura mensagens em memória.
 */
@Configuration
public class MailConfig {

    @Bean
    @ConditionalOnMissingBean(JavaMailSender.class)
    public JavaMailSender inMemoryMailSender() {
        return new InMemoryMailSender();
    }

    public static class InMemoryMailSender implements JavaMailSender {

        private static final Logger log = LoggerFactory.getLogger(InMemoryMailSender.class);
        private final List<MimeMessage> capturedMessages = Collections.synchronizedList(new ArrayList<>());

        @Override
        public MimeMessage createMimeMessage() {
            try {
                return new MimeMessage((jakarta.mail.Session) null);
            } catch (Exception e) {
                throw new RuntimeException("Erro ao criar MimeMessage stub", e);
            }
        }

        @Override
        public MimeMessage createMimeMessage(InputStream contentStream) throws MailException {
            return createMimeMessage();
        }

        @Override
        public void send(MimeMessage mimeMessage) throws MailException {
            capturedMessages.add(mimeMessage);
            log.debug("[InMemoryMailSender] Mensagem capturada (SMTP não configurado).");
        }

        @Override
        public void send(MimeMessage... mimeMessages) throws MailException {
            for (MimeMessage m : mimeMessages) send(m);
        }

        @Override
        public void send(MimeMessagePreparator mimeMessagePreparator) throws MailException {
            log.debug("[InMemoryMailSender] MimeMessagePreparator capturado.");
        }

        @Override
        public void send(MimeMessagePreparator... mimeMessagePreparators) throws MailException {
            for (MimeMessagePreparator p : mimeMessagePreparators) send(p);
        }

        @Override
        public void send(SimpleMailMessage simpleMessage) throws MailException {
            log.debug("[InMemoryMailSender] SimpleMailMessage capturado para: {}",
                (Object) simpleMessage.getTo());
        }

        @Override
        public void send(SimpleMailMessage... simpleMessages) throws MailException {
            for (SimpleMailMessage m : simpleMessages) send(m);
        }

        public List<MimeMessage> getCapturedMessages() {
            return Collections.unmodifiableList(capturedMessages);
        }

        public void clear() {
            capturedMessages.clear();
        }
    }
}
