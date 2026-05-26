package com.riggingcheck.riggingcheckapi.tenant;

import org.hibernate.Session;
import org.springframework.orm.jpa.vendor.HibernateJpaDialect;
import org.springframework.transaction.TransactionDefinition;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import java.sql.SQLException;
import java.util.UUID;

/**
 * Estende HibernateJpaDialect para habilitar o filtro Hibernate de tenant
 * imediatamente após a abertura de cada transação.
 *
 * Fluxo: JpaTransactionManager → beginTransaction() → super abre sessão Hibernate
 *        → habilitamos o filtro na sessão ativa → toda query subsequente
 *        da transação recebe automaticamente WHERE empresa_id = :empresaId.
 *
 * SUPER_ADMIN: TenantContext.get() == null → filtro não é habilitado.
 */
public class TenantAwareHibernateJpaDialect extends HibernateJpaDialect {

    @Override
    public Object beginTransaction(EntityManager entityManager,
                                   TransactionDefinition definition)
            throws PersistenceException, SQLException {

        Object txHandle = super.beginTransaction(entityManager, definition);

        UUID empresaId = TenantContext.get();
        if (empresaId != null) {
            entityManager.unwrap(Session.class)
                    .enableFilter(TenantContext.FILTER_NAME)
                    .setParameter(TenantContext.PARAM_NAME, empresaId);
        }

        return txHandle;
    }
}
