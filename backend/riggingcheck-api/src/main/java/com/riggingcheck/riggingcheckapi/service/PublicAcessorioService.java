package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.AcessorioIcamento;
import com.riggingcheck.riggingcheckapi.domain.CertificadoAcessorio;
import com.riggingcheck.riggingcheckapi.domain.InspecaoAcessorio;
import com.riggingcheck.riggingcheckapi.domain.enums.ResultadoInspecao;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusAcessorio;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusCertificado;
import com.riggingcheck.riggingcheckapi.dto.PublicAcessorioResponse;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.AcessorioIcamentoRepository;
import com.riggingcheck.riggingcheckapi.repository.CertificadoAcessorioRepository;
import com.riggingcheck.riggingcheckapi.repository.InspecaoAcessorioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PublicAcessorioService {

    private final AcessorioIcamentoRepository acessorioRepository;
    private final CertificadoAcessorioRepository certificadoRepository;
    private final InspecaoAcessorioRepository inspecaoRepository;

    public PublicAcessorioService(
            AcessorioIcamentoRepository acessorioRepository,
            CertificadoAcessorioRepository certificadoRepository,
            InspecaoAcessorioRepository inspecaoRepository) {
        this.acessorioRepository = acessorioRepository;
        this.certificadoRepository = certificadoRepository;
        this.inspecaoRepository = inspecaoRepository;
    }

    @Transactional(readOnly = true)
    public PublicAcessorioResponse consultar(UUID id) {
        AcessorioIcamento acessorio = acessorioRepository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Acessório"));

        CertificadoAcessorio ultimoCert = certificadoRepository
            .findByAcessorioIdOrderByCriadoEmDesc(id)
            .stream().findFirst().orElse(null);

        InspecaoAcessorio ultimaInsp = inspecaoRepository
            .findTopByAcessorioIdOrderByDataInspecaoDesc(id)
            .orElse(null);

        String mensagem = calcularMensagem(acessorio, ultimoCert, ultimaInsp);
        String cor      = calcularCor(mensagem);

        return PublicAcessorioResponse.builder()
            .id(acessorio.getId())
            .codigoInterno(acessorio.getCodigoInterno())
            .tipo(acessorio.getTipo() != null ? acessorio.getTipo().name() : null)
            .descricao(acessorio.getDescricao())
            .fabricante(acessorio.getFabricante())
            .modelo(acessorio.getModelo())
            .capacidadeWllKg(acessorio.getCapacidadeWllKg())
            .statusAcessorio(acessorio.getStatus() != null ? acessorio.getStatus().name() : null)
            .statusCertificado(ultimoCert != null && ultimoCert.getStatus() != null ? ultimoCert.getStatus().name() : StatusCertificado.AUSENTE.name())
            .validadeCertificado(ultimoCert != null ? ultimoCert.getDataValidade() : null)
            .resultadoUltimaInspecao(ultimaInsp != null && ultimaInsp.getResultado() != null ? ultimaInsp.getResultado().name() : null)
            .dataUltimaInspecao(ultimaInsp != null ? ultimaInsp.getDataInspecao() : null)
            .proximaInspecao(ultimaInsp != null ? ultimaInsp.getProximaInspecao() : null)
            .mensagemStatus(mensagem)
            .corStatus(cor)
            .build();
    }

    private String calcularMensagem(AcessorioIcamento a, CertificadoAcessorio cert, InspecaoAcessorio insp) {
        // Status do acessório bloqueia imediatamente
        StatusAcessorio status = a.getStatus();
        if (status == StatusAcessorio.REPROVADO)  return "REPROVADO";
        if (status == StatusAcessorio.DESCARTADO) return "DESCARTADO";
        if (status == StatusAcessorio.VENCIDO)    return "BLOQUEADO";

        // Inspeção reprovada bloqueia
        if (insp != null && insp.getResultado() == ResultadoInspecao.REPROVADO) {
            return "BLOQUEADO";
        }

        // Certificado vencido bloqueia
        if (cert == null || cert.getStatus() == StatusCertificado.AUSENTE) {
            return "CERTIFICADO_AUSENTE";
        }
        if (cert.getStatus() == StatusCertificado.VENCIDO) {
            return "CERTIFICADO_VENCIDO";
        }

        // Restrições não bloqueantes
        if (insp != null && insp.getResultado() == ResultadoInspecao.APROVADO_COM_RESTRICAO) {
            return "USO_COM_RESTRICAO";
        }
        if (cert.getStatus() == StatusCertificado.A_VENCER) {
            return "CERTIFICADO_A_VENCER";
        }

        return "LIBERADO_PARA_USO";
    }

    private String calcularCor(String mensagem) {
        return switch (mensagem) {
            case "LIBERADO_PARA_USO"  -> "#22c55e";
            case "USO_COM_RESTRICAO",
                 "CERTIFICADO_A_VENCER" -> "#f59e0b";
            default                    -> "#ef4444";
        };
    }
}
