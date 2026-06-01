import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import App from "./App.jsx";
import PricingPage from "./components/PricingPage.jsx";
import PrivacyCenterPage from "./components/PrivacyCenterPage.jsx";

// Enterprise pages
import Dashboard        from "./pages/Dashboard.jsx";
import ApprovalCenter  from "./pages/ApprovalCenter.jsx";
import TeamManagement  from "./pages/TeamManagement.jsx";
import PlanningWorkspace from "./pages/PlanningWorkspace.jsx";
import PlanningWizardPage from "./pages/PlanningWizardPage.jsx";
import AccessoriesInventory from "./pages/AccessoriesInventory.jsx";
import AlertsCenter from "./pages/AlertsCenter.jsx";
import PublicAccessoryConsult from "./pages/public/PublicAccessoryConsult.jsx";
import PublicPlanValidation   from "./pages/public/PublicPlanValidation.jsx";

/**
 * Guard: exige autenticação ativa.
 */
function RequireAuth() {
  const { authenticated } = useAuth();
  const location = useLocation();
  if (!authenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

/**
 * Guard: bloqueia se assinatura expirada/cancelada.
 */
function RequireActiveSubscription() {
  const { user } = useAuth();
  const blocked = user?.subscriptionStatus === "PAST_DUE" ||
                  user?.subscriptionStatus === "CANCELED";
  if (blocked) {
    return <Navigate to="/pricing" />;
  }
  return <Outlet />;
}

function PrivacyCenterRouted() {
  return <PrivacyCenterPage onVoltar={() => window.history.back()} />;
}

function PricingRouted() {
  const { user } = useAuth();
  return (
    <PricingPage
      subscriptionStatus={user?.subscriptionStatus}
      onVoltar={() => window.history.back()}
    />
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Rotas públicas ─────────────────────────────────────────────────── */}
          <Route path="/" element={<App />} />
          <Route path="/pricing" element={<PricingRouted />} />
          {/* Consulta pública de acessório via QR Code — sem autenticação */}
          <Route path="/public/acessorios/:id"    element={<PublicAccessoryConsult />} />
          {/* Validação pública de plano aprovado via QR Code — sem autenticação */}
          <Route path="/public/planos/:token"     element={<PublicPlanValidation />} />

          {/* ── Rotas autenticadas ──────────────────────────────────────────────── */}
          <Route element={<RequireAuth />}>
            <Route path="/privacidade" element={<PrivacyCenterRouted />} />

            {/* Compatibilidade legada */}
            <Route path="/central-aprovacao" element={<Navigate to="/app/central-aprovacao" replace />} />

            {/* Rotas enterprise — exigem assinatura ativa */}
            <Route element={<RequireActiveSubscription />}>

              {/* Legado mantido para links/bookmarks existentes */}
              <Route path="/admin"     element={<App adminMode />} />
              <Route path="/checklist" element={<App checklistMode />} />

              {/* ── Nova estrutura /app ────────────────────────────────────────── */}

              {/* /app → redireciona para dashboard */}
              <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />

              {/* Dashboard enterprise (role-aware) */}
              <Route path="/app/dashboard" element={<Dashboard />} />

              {/* Central de aprovação */}
              <Route path="/app/central-aprovacao" element={<ApprovalCenter />} />

              {/* Planejamento / workspace de içamento */}
              <Route path="/app/operacoes" element={<PlanningWorkspace />} />
              {/* Wizard guiado — Fase 9 */}
              <Route path="/app/operacoes/novo" element={<PlanningWizardPage />} />

              {/* Gestão de equipe */}
              <Route path="/app/equipes" element={<TeamManagement />} />

              {/* Inventário de acessórios */}
              <Route path="/app/acessorios" element={<AccessoriesInventory />} />

              {/* Central de Alertas */}
              <Route path="/app/alertas" element={<AlertsCenter />} />

              {/* Tabelas técnicas (reutiliza App com aba de tabelas) */}
              <Route path="/app/tabelas" element={<App tabInicial="equipamentos" />} />

            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
