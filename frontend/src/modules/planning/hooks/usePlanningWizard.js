import { useState, useCallback } from "react";

const STORAGE_KEY = "rc_wizard_plan";

const STEPS = [
  { id: "operation",  label: "Operação",          icon: "📋", description: "Identificação e dados gerais" },
  { id: "load",       label: "Carga & Guindaste",  icon: "⚖",  description: "Peso, volume, SWL e utilização" },
  { id: "sling",      label: "Lingada",            icon: "🪝",  description: "Eslingas, ângulo e CG" },
  { id: "ground",     label: "Solo & Ambiente",    icon: "🦺",  description: "Patolamento e condições especiais" },
  { id: "accessories",label: "Acessórios",         icon: "🔗",  description: "Vincular e validar acessórios" },
  { id: "team",       label: "Equipe",             icon: "👥",  description: "Equipe operacional e treinamentos" },
  { id: "checklist",  label: "Checklist",          icon: "✔",  description: "Verificações de campo" },
  { id: "compliance", label: "Compliance",         icon: "🔬",  description: "Validação automática NR-11" },
  { id: "submit",     label: "Aprovação",          icon: "📤",  description: "Envio para autorização" },
  { id: "report",     label: "Relatório Final",    icon: "📄",  description: "PDF e encerramento" },
];

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

export default function usePlanningWizard() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [planData, setPlanData] = useState(loadFromStorage);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const currentStep = STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast  = currentStepIndex === STEPS.length - 1;

  const savePlanData = useCallback((key, value) => {
    setPlanData(prev => {
      const next = { ...prev, [key]: value };
      saveToStorage(next);
      return next;
    });
  }, []);

  const markStepComplete = useCallback((stepId) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  }, []);

  const goToStep = useCallback((index) => {
    if (index >= 0 && index < STEPS.length) {
      setCurrentStepIndex(index);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const goNext = useCallback(() => {
    markStepComplete(STEPS[currentStepIndex].id);
    goToStep(currentStepIndex + 1);
  }, [currentStepIndex, goToStep, markStepComplete]);

  const goPrev = useCallback(() => {
    goToStep(currentStepIndex - 1);
  }, [currentStepIndex, goToStep]);

  const resetWizard = useCallback(() => {
    if (!window.confirm("Limpar todos os dados do plano e recomeçar?")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("rc_plan_data");
    localStorage.removeItem("rc_checklist_campo");
    setPlanData({});
    setCompletedSteps(new Set());
    setCurrentStepIndex(0);
  }, []);

  const stepStatus = useCallback((stepId) => {
    if (completedSteps.has(stepId)) return "done";
    if (STEPS[currentStepIndex].id === stepId) return "active";
    return "pending";
  }, [completedSteps, currentStepIndex]);

  return {
    steps: STEPS,
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
    totalSteps: STEPS.length,
  };
}
