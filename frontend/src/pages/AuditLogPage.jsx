import AppShell from "../layouts/AppShell";
import AuditLogPanel from "../modules/audit/AuditLogPanel";

export default function AuditLogPage() {
  return (
    <AppShell breadcrumb={[
      { label: "Dashboard", path: "/app/dashboard" },
      { label: "Auditoria" },
    ]}>
      <AuditLogPanel />
    </AppShell>
  );
}
