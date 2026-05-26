package com.riggingcheck.riggingcheckapi.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tabela de idempotência para webhooks do Stripe.
 * O Stripe pode reenviar o mesmo evento várias vezes (retry automático).
 * Antes de processar qualquer evento, verificamos se o ID já existe aqui.
 * A constraint UNIQUE(stripe_event_id) garante atomicidade: se dois threads
 * tentarem inserir o mesmo ID simultâneamente, apenas um terá sucesso.
 */
@Entity
@Table(
    name = "processed_stripe_events",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_stripe_event_id",
        columnNames = "stripe_event_id"
    )
)
@Data
@NoArgsConstructor
public class ProcessedStripeEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "stripe_event_id", nullable = false, length = 100)
    private String stripeEventId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "processed_at", nullable = false)
    private LocalDateTime processedAt;

    public ProcessedStripeEvent(String stripeEventId, String eventType) {
        this.stripeEventId = stripeEventId;
        this.eventType     = eventType;
        this.processedAt   = LocalDateTime.now();
    }
}
