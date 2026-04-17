package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.MomentRequest;
import com.riggingcheck.riggingcheckapi.dto.MomentResponse;
import com.riggingcheck.riggingcheckapi.dto.TrigCalcRequest;
import com.riggingcheck.riggingcheckapi.dto.TrigCalcResponse;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.service.calculation.MunckMomentService;
import com.riggingcheck.riggingcheckapi.service.calculation.RiggingTrigonometryService;
import com.riggingcheck.riggingcheckapi.service.calculation.SlingTableService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calculation")
public class CalculationController {

    private final RiggingTrigonometryService trigService;
    private final SlingTableService          tableService;
    private final MunckMomentService         momentService;

    public CalculationController(RiggingTrigonometryService trigService,
                                  SlingTableService tableService,
                                  MunckMomentService momentService) {
        this.trigService    = trigService;
        this.tableService   = tableService;
        this.momentService  = momentService;
    }

    // ── Trigonometria ────────────────────────────────────────────────────────

    @PostMapping("/trig")
    public ResponseEntity<TrigCalcResponse> trig(@Valid @RequestBody TrigCalcRequest req) {
        return ResponseEntity.ok(executeTrig(req));
    }

    private TrigCalcResponse executeTrig(TrigCalcRequest req) {
        return switch (req.modo()) {
            case "CE_DE_D_HE" -> {
                double ce  = trigService.calcSlingLength(req.distHorizontal(), req.alturaEfetiva());
                double ang = trigService.calcAngleDeg(req.alturaEfetiva(), ce);
                double fator = trigService.calcLoadFactor(ang);
                String aviso = ang < 45 ? "Ângulo abaixo de 45° — risco de sobrecarga elevado" : null;
                yield new TrigCalcResponse(req.modo(), ce, req.distHorizontal(), req.alturaEfetiva(), ang, fator, aviso);
            }
            case "D_DE_CE_HE" -> {
                double d   = trigService.calcHorizontalDistance(req.ce(), req.alturaEfetiva());
                double ang = trigService.calcAngleDeg(req.alturaEfetiva(), req.ce());
                double fator = trigService.calcLoadFactor(ang);
                String aviso = ang < 45 ? "Ângulo abaixo de 45° — risco de sobrecarga elevado" : null;
                yield new TrigCalcResponse(req.modo(), req.ce(), d, req.alturaEfetiva(), ang, fator, aviso);
            }
            case "ANGULO_DE_HE_CE" -> {
                double ang   = trigService.calcAngleDeg(req.alturaEfetiva(), req.ce());
                double d     = trigService.calcHorizontalDistance(req.ce(), req.alturaEfetiva());
                double fator = trigService.calcLoadFactor(ang);
                String aviso = ang < 45 ? "Ângulo abaixo de 45° — risco de sobrecarga elevado" : null;
                yield new TrigCalcResponse(req.modo(), req.ce(), d, req.alturaEfetiva(), ang, fator, aviso);
            }
            case "CE_DE_HE_ANGULO" -> {
                double ce    = trigService.calcSlingFromAngle(req.alturaEfetiva(), req.angGraus());
                double d     = trigService.calcHorizontalDistance(ce, req.alturaEfetiva());
                double fator = trigService.calcLoadFactor(req.angGraus());
                String aviso = req.angGraus() < 45 ? "Ângulo abaixo de 45° — risco de sobrecarga elevado" : null;
                yield new TrigCalcResponse(req.modo(), ce, d, req.alturaEfetiva(), req.angGraus(), fator, aviso);
            }
            default -> throw new RegraDeNegocioException("Modo inválido: " + req.modo());
        };
    }

    // ── Conversões de unidade ────────────────────────────────────────────────

    @GetMapping("/convert/m-to-ft")
    public ResponseEntity<Map<String, Double>> metersToFeet(@RequestParam double value) {
        return ResponseEntity.ok(Map.of("result", trigService.metersToFeet(value)));
    }

    @GetMapping("/convert/ft-to-m")
    public ResponseEntity<Map<String, Double>> feetToMeters(@RequestParam double value) {
        return ResponseEntity.ok(Map.of("result", trigService.feetToMeters(value)));
    }

    @GetMapping("/convert/kg-to-lbs")
    public ResponseEntity<Map<String, Double>> kgToLbs(@RequestParam double value) {
        return ResponseEntity.ok(Map.of("result", trigService.kgToLbs(value)));
    }

    @GetMapping("/convert/lbs-to-kg")
    public ResponseEntity<Map<String, Double>> lbsToKg(@RequestParam double value) {
        return ResponseEntity.ok(Map.of("result", trigService.lbsToKg(value)));
    }

    // ── Tabelas de Capacidade ────────────────────────────────────────────────

    @GetMapping("/tables/cabo-aco")
    public ResponseEntity<List<SlingTableService.CaboAcoEntry>> caboAcoTable() {
        return ResponseEntity.ok(tableService.getCaboAcoTable());
    }

    @GetMapping("/tables/cinta-sintetica")
    public ResponseEntity<List<SlingTableService.CintaSinteticaEntry>> cintaTable() {
        return ResponseEntity.ok(tableService.getCintaTable());
    }

    @GetMapping("/tables/manilha")
    public ResponseEntity<List<SlingTableService.ManilhaEntry>> manilhaTable() {
        return ResponseEntity.ok(tableService.getManilhaTable());
    }

    // ── Momento de Carga (Munck) ─────────────────────────────────────────────

    @PostMapping("/munck/momento")
    public ResponseEntity<MomentResponse> calcMomento(@Valid @RequestBody MomentRequest req) {
        MunckMomentService.MomentResult r = momentService.calcMomento(
                req.forcaToneladas(), req.distanciaMetros(), req.limiteCapacidade());
        return ResponseEntity.ok(new MomentResponse(r.momento(), r.usoPct(), r.risco(), r.aprovado()));
    }
}
