package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "empresas")
@Data
public class Empresa {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "razao_social", nullable = false)
    private String razaoSocial;

    @Column(name = "cnpj", unique = true, nullable = false)
    private String cnpj;

    @Column(name = "marca_dagua_relatorio")
    private String marcaDaguaRelatorio;

    @Column(name = "ativo")
    private Boolean ativo = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_status", columnDefinition = "VARCHAR(20)")
    private SubscriptionStatus subscriptionStatus = SubscriptionStatus.TRIALING;

    @Column(name = "stripe_customer_id")
    private String stripeCustomerId;

    @Column(name = "stripe_subscription_id")
    private String stripeSubscriptionId;

    @Column(name = "subscription_expires_at")
    private LocalDateTime subscriptionExpiresAt;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
