import AppShell from "../layouts/AppShell";
import PlanningWizard from "../modules/planning/wizard/PlanningWizard";

/**
 * Página do Wizard Guiado de Içamento — /app/operacoes/novo.
 * Envolve PlanningWizard no AppShell enterprise.
 */
export default function PlanningWizardPage() {
  return (
    <AppShell
      breadcrumb={[
        { label: "Operações", path: "/app/operacoes" },
        { label: "Novo Plano (Wizard)" },
      ]}
    >
      <PlanningWizard />
    </AppShell>
  );
}
