import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import App from "./App.jsx";
import PricingPage from "./components/PricingPage.jsx";
import PrivacyCenterPage from "./components/PrivacyCenterPage.jsx";

/**
 * Guard: exige autenticação ativa.
 * Redireciona para / onde LoginScreen é renderizado se não autenticado.
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
 * Guard: bloqueia rotas protegidas se assinatura expirada/cancelada.
 * Usuários com PAST_DUE ou CANCELED são redirecionados para /pricing,
 * preservando o histórico de navegação (replace=false).
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
          {/* Rota pública — tela principal + login interno */}
          <Route path="/" element={<App />} />

          {/* Rota pública — planos e pagamento */}
          <Route path="/pricing" element={<PricingRouted />} />

          {/* Rotas autenticadas */}
          <Route element={<RequireAuth />}>
            <Route path="/privacidade" element={<PrivacyCenterRouted />} />

            {/* /admin e /checklist exigem assinatura ativa */}
            <Route element={<RequireActiveSubscription />}>
              <Route path="/admin" element={<App adminMode />} />
              <Route path="/checklist" element={<App checklistMode />} />
            </Route>
          </Route>

          {/* Rota catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
