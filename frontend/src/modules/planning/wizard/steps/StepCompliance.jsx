/**
 * Etapa 8 — Compliance Automático.
 * Executa validação local com base nos dados do planData antes de submeter.
 * Não chama API — calcula regras no frontend para feedback imediato.
 */

import { useMemo } from "react";

const BLOCKED_COLOR    = "#ef4444";
const RESTRICTED_COLOR = "#f97316";
const WARNING_COLOR    = "#f59e0b";
const COMPLIANT_COLOR  = "#22c55e";

function severityOrder(s) {
  return { BLOCKED: 3, RESTRICTED: 2, WARNING: 1, COMPLIANT: 0 }[s] ?? 0;
}

function runLocalCompliance(planData) {
  const violations = [];
  const {
    tensao, utilizacaoGuindaste, pressaoPatolasKpa, resistenciaSoloKpa,
    doisOuMaisGuindastes, areaClassificada, redeEletricaValidada,
    certificadosValidados, checklistCompleto,
  } = planData;

  // Regra 1 — Ângulo lingada < 30°
  const angulo = tensao?.inputs?.angulo ? parseFloat(tensao.inputs.angulo) : null;
  if (angulo !== null && angulo < 30) {
    violations.push({ severity: "BLOCKED", ruleId: "ANGULO_LINGADA", message: `Ângulo da lingada ${angulo}° é inferior ao mínimo de 30°.`, norm: "ABNT NBR 13541 / NR-11", action: "Aumente o comprimento das pernas ou reduza o número de pernas." });
  } else if (angulo !== null && angulo < 45) {
    violations.push({ severity: "WARNING", ruleId: "ANGULO_LINGADA", message: `Ângulo da lingada ${angulo}° está abaixo de 45°.`, norm: "ABNT NBR 13541", action: "Considere reconfigurar para ângulo acima de 45°." });
  }

  // Regra 2 — WLL eslinga < carga/perna
  const wll = tensao?.wll;
  const tensaoPerna = tensao?.tensao;
  if (wll != null && tensaoPerna != null && wll < tensaoPerna) {
    violations.push({ severity: "BLOCKED", ruleId: "WLL_ESLINGA", message: `WLL da eslinga (${Math.round(wll)} kg) < carga por perna (${Math.round(tensaoPerna)} kg).`, norm: "ABNT NBR 13541 / NBR 15637", action: "Substitua a eslinga por uma com WLL superior." });
  }

  // Regra 3 — Utilização guindaste
  const uso = utilizacaoGuindaste?.pct;
  if (uso != null && uso >= 100) {
    violations.push({ severity: "BLOCKED", ruleId: "UTILIZACAO_GUINDASTE", message: `Utilização do guindaste ${uso.toFixed(1)}% excede 100%.`, norm: "ABNT NBR 11900 / NR-11", action: "Reduza a carga ou use guindaste de maior capacidade." });
  } else if (uso != null && uso >= 90) {
    violations.push({ severity: "RESTRICTED", ruleId: "UTILIZACAO_GUINDASTE", message: `Utilização ${uso.toFixed(1)}% na faixa crítica (90–100%).`, norm: "ABNT NBR 11900 / NR-11", action: "Operação somente com autorização da supervisão." });
  }

  // Regra 4 — Pressão patolas
  const p = pressaoPatolasKpa != null ? parseFloat(pressaoPatolasKpa) : null;
  const r = resistenciaSoloKpa != null ? parseFloat(resistenciaSoloKpa) : null;
  if (p !== null && r !== null && !isNaN(p) && !isNaN(r) && p > r) {
    violations.push({ severity: "BLOCKED", ruleId: "PRESSAO_PATOLAS", message: `Pressão nas patolas (${p.toFixed(1)} kPa) excede resistência do solo (${r.toFixed(1)} kPa).`, norm: "Petrobras N-2869 / ISO 4308-1", action: "Instale pranchas de distribuição ou escolha local com solo mais resistente." });
  }

  // Regra 5 — Checklist incompleto
  if (checklistCompleto === false) {
    violations.push({ severity: "RESTRICTED", ruleId: "CHECKLIST_COMPLETO", message: "Checklist operacional está incompleto.", norm: "NR-11 / Petrobras N-2869", action: "Complete todos os itens do checklist antes de submeter." });
  } else if (checklistCompleto == null) {
    violations.push({ severity: "WARNING", ruleId: "CHECKLIST_COMPLETO", message: "Checklist operacional não foi informado.", norm: "NR-11", action: "Preencha o checklist na etapa anterior." });
  }

  // Regra 6 — Dois guindastes
  if (doisOuMaisGuindastes) {
    violations.push({ severity: "RESTRICTED", ruleId: "DOIS_GUINDASTES", message: "Operação com dois ou mais guindastes simultâneos.", norm: "Petrobras N-2869 item 6.4 / ISO 4308-1", action: "Elabore plano conjunto com sincronização de movimentos." });
  }

  // Regra 7 — Área classificada
  if (areaClassificada) {
    violations.push({ severity: "RESTRICTED", ruleId: "AREA_CLASSIFICADA", message: "Operação em área classificada.", norm: "ABNT NBR IEC 60079-14 / NR-10", action: "Utilize apenas equipamentos certificados Ex." });
  }

  // Regra 8 — Rede elétrica
  if (redeEletricaValidada === false) {
    violations.push({ severity: "BLOCKED", ruleId: "REDE_ELETRICA", message: "Rede elétrica próxima sem validação de distância.", norm: "NR-10 Tabela 1 / Petrobras N-2869", action: "Meça as distâncias de segurança ou solicite desenergização." });
  } else if (redeEletricaValidada === null) {
    violations.push({ severity: "WARNING", ruleId: "REDE_ELETRICA", message: "Proximidade com rede elétrica não foi informada.", norm: "NR-10", action: "Informe se há rede elétrica na área de operação." });
  }

  // Regra 9 — Certificados (campo legado)
  if (certificadosValidados === false) {
    violations.push({ severity: "BLOCKED", ruleId: "CERTIFICADO_VALIDADE", message: "Certificado ausente ou vencido no inventário.", norm: "NR-11 item 11.3.7", action: "Substitua o equipamento ou providencie nova inspeção." });
  }

  // Regras 10–15 — Acessórios vinculados no inventário
  const acessorios = planData.acessoriosSelecionados ?? [];
  const cargaBruta = planData.cargaBruta?.total ?? null;

  acessorios.forEach(a => {
    const codigo = a.codigoInterno;

    // Regra 10 — Status do acessório
    if (a.status && a.status !== "ATIVO") {
      violations.push({ severity: "BLOCKED", ruleId: "ACESSORIO_STATUS", message: `Acessório ${codigo}: status "${a.status}" impede o uso.`, norm: "NR-11 item 11.3 / ABNT NBR 15637", action: `Regularize o acessório ${codigo} antes de utilizá-lo.` });
    }

    // Regra 11 — Certificado do acessório
    const certStatus = a.ultimoCertificado?.status ?? "AUSENTE";
    if (certStatus === "VENCIDO") {
      violations.push({ severity: "BLOCKED", ruleId: "ACESSORIO_CERT_VENCIDO", message: `Acessório ${codigo}: certificado VENCIDO.`, norm: "NR-11 item 11.3.7", action: "Providencie nova certificação antes do içamento." });
    } else if (certStatus === "AUSENTE") {
      violations.push({ severity: "RESTRICTED", ruleId: "ACESSORIO_CERT_AUSENTE", message: `Acessório ${codigo}: sem certificado registrado.`, norm: "NR-11 item 11.3.7", action: "Vincule o certificado no inventário." });
    } else if (certStatus === "A_VENCER") {
      violations.push({ severity: "WARNING", ruleId: "ACESSORIO_CERT_A_VENCER", message: `Acessório ${codigo}: certificado a vencer em breve.`, norm: "NR-11 item 11.3.7", action: "Agende renovação do certificado." });
    }

    // Regra 12 — Inspeção do acessório
    const inspRes = a.ultimaInspecao?.resultado;
    if (inspRes === "REPROVADO") {
      violations.push({ severity: "BLOCKED", ruleId: "ACESSORIO_INSP_REPROVADO", message: `Acessório ${codigo}: última inspeção REPROVADA.`, norm: "NR-11 item 11.3.5", action: "Retire o acessório de serviço e realize nova inspeção." });
    } else if (inspRes === "APROVADO_COM_RESTRICAO") {
      violations.push({ severity: "RESTRICTED", ruleId: "ACESSORIO_INSP_RESTRICAO", message: `Acessório ${codigo}: aprovado com restrição.`, norm: "NR-11 item 11.3.5", action: "Verifique as restrições apontadas na inspeção antes de usar." });
    }

    // Regra 13 — WLL vs. carga bruta
    if (cargaBruta && a.capacidadeWllKg && a.capacidadeWllKg < cargaBruta) {
      violations.push({ severity: "BLOCKED", ruleId: "ACESSORIO_WLL", message: `Acessório ${codigo}: WLL ${a.capacidadeWllKg} kg < carga bruta ${cargaBruta} kg.`, norm: "ABNT NBR 13541 / NR-11", action: "Substitua por acessório com WLL superior à carga bruta." });
    }
  });

  const sorted = violations.sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity));
  const overallSeverity = sorted.length > 0 ? sorted[0].severity : "COMPLIANT";
  return { overallSeverity, violations: sorted };
}

const SEVERITY_CFG = {
  BLOCKED:    { label: "Bloqueado",  color: BLOCKED_COLOR,    icon: "⛔" },
  RESTRICTED: { label: "Restrito",  color: RESTRICTED_COLOR, icon: "🚫" },
  WARNING:    { label: "Atenção",    color: WARNING_COLOR,    icon: "⚠" },
  COMPLIANT:  { label: "Conforme",   color: COMPLIANT_COLOR,  icon: "✓"  },
};

function ViolationCard({ v }) {
  const cfg = SEVERITY_CFG[v.severity] ?? SEVERITY_CFG.WARNING;
  return (
    <div style={{ border: `1px solid ${cfg.color}33`, borderRadius: 8, padding: "12px 16px", background: cfg.color + "11", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ background: cfg.color + "22", color: cfg.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
          {cfg.icon} {cfg.label}
        </span>
        <span style={{ color: "#64748b", fontSize: 11 }}>{v.ruleId}</span>
      </div>
      <p style={{ color: "#e2e8f0", margin: "0 0 4px", fontSize: 14 }}>{v.message}</p>
      <p style={{ color: "#64748b", margin: "0 0 2px", fontSize: 12 }}>📋 {v.norm}</p>
      <p style={{ color: "#94a3b8", margin: 0, fontSize: 12, fontStyle: "italic" }}>💡 {v.action}</p>
    </div>
  );
}

export default function StepCompliance({ planData }) {
  const result = useMemo(() => runLocalCompliance(planData), [planData]);
  const cfg = SEVERITY_CFG[result.overallSeverity];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>🔬 Compliance Automático</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Validação técnica baseada nas normas NR-11, ABNT NBR 13541, ISO 4308-1 e Petrobras N-2869.
        </p>
      </div>

      {/* Status geral */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: 12, background: cfg.color + "18", border: `2px solid ${cfg.color}`, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{cfg.icon}</span>
        <div>
          <div style={{ color: cfg.color, fontWeight: 700, fontSize: 18 }}>
            Status Técnico: {cfg.label}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
            {result.violations.length === 0
              ? "Nenhuma violação encontrada. Plano em conformidade técnica."
              : `${result.violations.length} violação(ões) encontrada(s) — revise antes de submeter.`}
          </div>
        </div>
      </div>

      {/* Aviso BLOCKED */}
      {result.overallSeverity === "BLOCKED" && (
        <div style={{ background: "#1c0a0a", border: "1px solid #ef4444", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#fca5a5", fontSize: 13 }}>
          ⛔ <strong>Plano BLOQUEADO:</strong> Existem violações críticas que impedem a aprovação normal.
          Apenas SUPERADMIN ou SAFETY_ADMIN podem liberar com justificativa obrigatória.
          Corrija as violações abaixo antes de enviar para aprovação.
        </div>
      )}

      {/* Lista de violações */}
      {result.violations.map((v, i) => <ViolationCard key={i} v={v} />)}

      {/* Estado conforme */}
      {result.violations.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", border: "1px dashed #22c55e44", borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 16 }}>Plano tecnicamente conforme</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Avance para submeter à aprovação.</div>
        </div>
      )}

      <div style={{ marginTop: 16, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#475569" }}>
        Esta validação é local e preliminar. O backend executará a Compliance Engine completa ao submeter — incluindo
        verificação de competências da equipe (NR-11, ASO). Violações de equipe são detalhadas na etapa <b>Equipe</b> e
        no painel de compliance da Central de Aprovação.
      </div>
    </div>
  );
}
