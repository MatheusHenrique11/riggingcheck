package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.StatusAcessorio;
import com.riggingcheck.riggingcheckapi.domain.enums.TipoAcessorio;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.Filter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "acessorios_icamento", uniqueConstraints = {
    @UniqueConstraint(name = "uk_acessorio_codigo_empresa", columnNames = {"empresa_id", "codigo_interno"})
})
@Data
@Filter(name = "tenantFilter", condition = "empresa_id = :empresaId")
public class AcessorioIcamento {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "codigo_interno", nullable = false, length = 100)
    private String codigoInterno;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, columnDefinition = "VARCHAR(30)")
    private TipoAcessorio tipo;

    @Column(name = "descricao", nullable = false, length = 500)
    private String descricao;

    @Column(name = "fabricante", length = 200)
    private String fabricante;

    @Column(name = "modelo", length = 200)
    private String modelo;

    @Column(name = "numero_serie", length = 100)
    private String numeroSerie;

    @Column(name = "capacidade_wll_kg")
    private Double capacidadeWllKg;

    @Column(name = "unidade", length = 20)
    private String unidade;

    @Column(name = "data_fabricacao")
    private LocalDate dataFabricacao;

    @Column(name = "data_cadastro", nullable = false)
    private LocalDateTime dataCadastro;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(20)")
    private StatusAcessorio status;

    @Column(name = "localizacao", length = 300)
    private String localizacao;

    @Column(name = "observacoes", columnDefinition = "TEXT")
    private String observacoes;

    @Column(name = "cadastrado_por_id")
    private UUID cadastradoPorId;

    @Column(name = "cadastrado_por_nome", length = 200)
    private String cadastradoPorNome;

    @PrePersist
    protected void onCreate() {
        dataCadastro = LocalDateTime.now();
        if (status == null) status = StatusAcessorio.ATIVO;
    }
}
