package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.dto.SlingCalculateRequest;
import com.riggingcheck.riggingcheckapi.dto.SlingCalculateResponse;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import org.springframework.stereotype.Service;

@Service
public class SlingService {

    // Limiar mínimo de sin(ângulo) para evitar divisão por zero/Infinity
    private static final double SIN_MINIMO = 0.001;

    public SlingCalculateResponse calculate(SlingCalculateRequest req) {
        if (req.wll() != null && req.wll() <= 0) {
            throw new RegraDeNegocioException("WLL deve ser maior que zero");
        }

        double angleRad = Math.toRadians(req.angleFromHorizontal());
        double sinAngle = Math.max(Math.sin(angleRad), SIN_MINIMO);
        double loadFactor = 1.0 / sinAngle;
        double tension = (req.loadWeight() / req.numberOfLegs()) * loadFactor;

        String risk = "SAFE";
        Double wllUsage = null;
        if (req.wll() != null) {
            wllUsage = (tension / req.wll()) * 100;
            risk = wllUsage < 70 ? "SAFE" : wllUsage < 90 ? "WARNING" : "DANGER";
        }

        return new SlingCalculateResponse(tension, loadFactor, wllUsage, risk, req.angleFromHorizontal() < 45);
    }
}
