/**
 * Orquestrador do Wizard de Planejamento de Içamento.
 * Une: usePlanningWizard + WizardProgress + WizardSummaryPanel + WizardFooterActions + steps.
 * Não contém lógica de cálculo — delega integralmente aos componentes de step.
 */

import usePlanningWizard from "../hooks/usePlanningWizard";
import WizardProgress     from "./WizardProgress";
import WizardSummaryPanel from "./WizardSummaryPanel";
import WizardFooterActions from "./WizardFooterActions";

import StepOperationData  from "./steps/StepOperationData";
import StepLoad           from "./steps/StepLoad";
import StepSling          from "./steps/StepSling";
import StepGroundEnv      from "./steps/StepGroundEnv";
import StepChecklist      from "./steps/StepChecklist";
import StepCompliance     from "./steps/StepCompliance";
import StepAccessories    from "./steps/StepAccessories";
import StepTeam           from "./steps/StepTeam";
import StepApprovalSubmit from "./steps/StepApprovalSubmit";
import StepFinalReport    from "./steps/StepFinalReport";

function StepPlaceholder() {
  return (
    <div style={{ color: "#64748b", padding: 32, textAlign: "center" }}>
      Etapa em desenvolvimento.
    </div>
  );
}

const STEP_COMPONENTS = {
  operation:   StepOperationData,
  load:        StepLoad,
  sling:       StepSling,
  ground:      StepGroundEnv,
  accessories: StepAccessories,
  team:        StepTeam,
  checklist:   StepChecklist,
  compliance:  StepCompliance,
  submit:      StepApprovalSubmit,
  report:      StepFinalReport,
};

export default function PlanningWizard() {
  const {
    steps,
    currentStep,
    currentStepIndex,
    isFirst,
    isLast,
    planData,
    savePlanData,
    goNext,
    goPrev,
    goToStep,
    resetWizard,
    stepStatus,
    totalSteps,
  } = usePlanningWizard();

  const StepComponent = STEP_COMPONENTS[currentStep.id] ?? StepPlaceholder;

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }} className="rc-wizard-root">
      <style>{`
        @media (max-width: 768px) {
          .rc-wizard-root { flex-direction: column !important; gap: 0 !important; }
          .wizard-mobile-nav { width: 100%; margin-bottom: 16px; }
        }
      `}</style>

      {/* Navegação lateral (desktop) / chips (mobile) */}
      <WizardProgress
        steps={steps}
        currentIndex={currentStepIndex}
        stepStatus={stepStatus}
        onGoToStep={goToStep}
      />

      {/* Conteúdo principal */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Cabeçalho da etapa */}
        <div style={{
          background: "#0a0f1e",
          border: "1px solid #1e293b",
          borderRadius: 10,
          padding: "12px 20px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1 }}>
              Etapa {currentStepIndex + 1} de {totalSteps}
            </span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginTop: 2 }}>
              {currentStep.icon} {currentStep.label}
            </div>
          </div>
          {/* Barra de progresso compacta no topo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 100, height: 4, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.round((currentStepIndex / (totalSteps - 1)) * 100)}%`,
                background: "linear-gradient(90deg,#3b82f6,#22c55e)",
                borderRadius: 99,
                transition: "width 0.4s",
              }} />
            </div>
            <span style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700 }}>
              {Math.round((currentStepIndex / (totalSteps - 1)) * 100)}%
            </span>
          </div>
        </div>

        {/* Componente da etapa atual */}
        <StepComponent
          planData={planData}
          onSave={savePlanData}
          onNext={goNext}
          onReset={resetWizard}
        />

        {/* Rodapé de navegação */}
        <WizardFooterActions
          isFirst={isFirst}
          isLast={isLast}
          onPrev={goPrev}
          onNext={goNext}
          onReset={resetWizard}
          currentStep={currentStep}
          totalSteps={totalSteps}
          currentIndex={currentStepIndex}
        />
      </div>

      {/* Painel de resumo lateral (desktop ≥ 1100px) */}
      <WizardSummaryPanel planData={planData} currentStep={currentStep} />
    </div>
  );
}
