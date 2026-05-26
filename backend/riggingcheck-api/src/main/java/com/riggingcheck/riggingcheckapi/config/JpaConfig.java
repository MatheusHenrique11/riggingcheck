package com.riggingcheck.riggingcheckapi.config;

import com.riggingcheck.riggingcheckapi.tenant.TenantAwareHibernateJpaDialect;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.JpaTransactionManager;

/**
 * Substitui o JpaTransactionManager auto-configurado pelo Spring Boot
 * por uma versão que usa TenantAwareHibernateJpaDialect.
 * O @ConditionalOnMissingBean(PlatformTransactionManager) do Spring Boot
 * garante que o auto-configurado seja ignorado quando este bean existe.
 */
@Configuration
public class JpaConfig {

    @Bean
    public JpaTransactionManager transactionManager(EntityManagerFactory emf) {
        JpaTransactionManager txManager = new JpaTransactionManager(emf);
        txManager.setJpaDialect(new TenantAwareHibernateJpaDialect());
        return txManager;
    }
}
