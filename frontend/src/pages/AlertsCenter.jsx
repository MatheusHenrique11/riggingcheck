import AppShell from "../layouts/AppShell";
import AlertsPanel from "../modules/alerts/AlertsPanel";

export default function AlertsCenter() {
  return (
    <AppShell breadcrumb={[
      { label: "Dashboard", path: "/app/dashboard" },
      { label: "Central de Alertas" },
    ]}>
      <AlertsPanel />
    </AppShell>
  );
}
