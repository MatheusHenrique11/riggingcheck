package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.ProcessedStripeEvent;
import com.riggingcheck.riggingcheckapi.domain.enums.SubscriptionStatus;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.ProcessedStripeEventRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;

@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @Value("${stripe.price.basic}")
    private String priceBasic;

    @Value("${stripe.price.unlimited}")
    private String priceUnlimited;

    @Value("${stripe.success-url}")
    private String successUrl;

    @Value("${stripe.cancel-url}")
    private String cancelUrl;

    private final EmpresaRepository empresaRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final ProcessedStripeEventRepository processedEventRepository;

    private static final Map<String, String> PLAN_LABELS = Map.of(
            "basic", "Básico — até 5 equipamentos",
            "unlimited", "Ilimitado"
    );

    public BillingService(EmpresaRepository empresaRepository,
                          FuncionarioRepository funcionarioRepository,
                          ProcessedStripeEventRepository processedEventRepository) {
        this.empresaRepository      = empresaRepository;
        this.funcionarioRepository  = funcionarioRepository;
        this.processedEventRepository = processedEventRepository;
    }

    @PostConstruct
    void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    public String criarCheckoutSession(UUID empresaId, UUID funcionarioId, String planId) {
        if (!PLAN_LABELS.containsKey(planId)) {
            throw new RegraDeNegocioException("Plano inválido: " + planId);
        }

        Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));
        Funcionario funcionario = funcionarioRepository.findById(funcionarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Funcionário"));

        String priceId = "basic".equals(planId) ? priceBasic : priceUnlimited;

        try {
            SessionCreateParams.Builder params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setCustomerEmail(funcionario.getEmail())
                    .setSuccessUrl(successUrl + "?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(cancelUrl)
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setPrice(priceId)
                                    .setQuantity(1L)
                                    .build()
                    )
                    .putMetadata("empresaId", empresaId.toString())
                    .putMetadata("planId", planId);

            // Reutiliza o customerId do Stripe se já existe para evitar duplicatas
            if (empresa.getStripeCustomerId() != null) {
                params.setCustomer(empresa.getStripeCustomerId());
            }

            Session session = Session.create(params.build());
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Erro ao criar Stripe Checkout Session para empresa {}: {}", empresaId, e.getMessage());
            throw new RegraDeNegocioException("Não foi possível iniciar o checkout. Tente novamente.");
        }
    }

    @Transactional
    public void processarWebhook(String payload, String sigHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("Assinatura Stripe inválida: {}", e.getMessage());
            throw new RegraDeNegocioException("Assinatura do webhook inválida.");
        }

        log.info("Evento Stripe recebido: {} | id: {}", event.getType(), event.getId());

        // Idempotência: se o evento já foi processado com sucesso, ignoramos.
        // A constraint UNIQUE(stripe_event_id) no banco garante atomicidade
        // mesmo em cenários de processamento concorrente.
        if (processedEventRepository.existsByStripeEventId(event.getId())) {
            log.info("Evento Stripe {} já processado — ignorando reentrega.", event.getId());
            return;
        }

        switch (event.getType()) {
            case "checkout.session.completed"    -> handleCheckoutCompleted(event);
            case "invoice.payment_failed"        -> handlePaymentFailed(event);
            case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
            case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
            default -> log.debug("Evento Stripe ignorado: {}", event.getType());
        }

        // Persiste o ID do evento APÓS o processamento bem-sucedido.
        // Se uma exceção foi lançada acima, esta linha não executa, permitindo reprocessamento.
        processedEventRepository.save(new ProcessedStripeEvent(event.getId(), event.getType()));
    }

    private void handleCheckoutCompleted(Event event) {
        Session session = (Session) event.getDataObjectDeserializer()
                .getObject()
                .orElseThrow(() -> new RegraDeNegocioException("Payload inválido no webhook checkout.session.completed"));

        String empresaIdStr = session.getMetadata().get("empresaId");
        if (empresaIdStr == null) return;

        empresaRepository.findById(UUID.fromString(empresaIdStr)).ifPresent(empresa -> {
            empresa.setSubscriptionStatus(SubscriptionStatus.ACTIVE);
            empresa.setStripeCustomerId(session.getCustomer());
            empresa.setStripeSubscriptionId(session.getSubscription());
            empresaRepository.save(empresa);
            log.info("Assinatura ativada para empresa {}", empresaIdStr);
        });
    }

    private void handlePaymentFailed(Event event) {
        atualizarStatusPorSubscriptionId(event, SubscriptionStatus.PAST_DUE);
    }

    private void handleSubscriptionDeleted(Event event) {
        atualizarStatusPorSubscriptionId(event, SubscriptionStatus.CANCELED);
    }

    private void handleSubscriptionUpdated(Event event) {
        Subscription subscription = (Subscription) event.getDataObjectDeserializer()
                .getObject().orElse(null);
        if (subscription == null) return;

        SubscriptionStatus novoStatus = switch (subscription.getStatus()) {
            case "active"   -> SubscriptionStatus.ACTIVE;
            case "past_due" -> SubscriptionStatus.PAST_DUE;
            case "canceled", "unpaid" -> SubscriptionStatus.CANCELED;
            case "trialing" -> SubscriptionStatus.TRIALING;
            default -> null;
        };

        if (novoStatus == null) return;

        SubscriptionStatus statusFinal = novoStatus;
        empresaRepository.findByStripeSubscriptionId(subscription.getId()).ifPresent(empresa -> {
            empresa.setSubscriptionStatus(statusFinal);

            if (subscription.getCurrentPeriodEnd() != null) {
                empresa.setSubscriptionExpiresAt(
                        LocalDateTime.ofInstant(
                                Instant.ofEpochSecond(subscription.getCurrentPeriodEnd()),
                                ZoneId.systemDefault()));
            }
            empresaRepository.save(empresa);
        });
    }

    private void atualizarStatusPorSubscriptionId(Event event, SubscriptionStatus status) {
        Subscription subscription = (Subscription) event.getDataObjectDeserializer()
                .getObject().orElse(null);
        if (subscription == null) return;

        empresaRepository.findByStripeSubscriptionId(subscription.getId()).ifPresent(empresa -> {
            empresa.setSubscriptionStatus(status);
            empresaRepository.save(empresa);
            log.info("Status da empresa {} atualizado para {}", empresa.getId(), status);
        });
    }
}
