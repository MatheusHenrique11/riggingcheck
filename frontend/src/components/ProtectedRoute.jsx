import { Navigate } from "react-router-dom";

/**
 * Guard de assinatura para renderização inline (tabs protegidas).
 * Para proteção de rotas completas, use RequireActiveSubscription em AppRouter.jsx.
 *
 * Se a assinatura do tenant for PAST_DUE ou CANCELED:
 *  - Redireciona para /pricing usando React Router (preserva histórico).
 *
 * Uso (dentro de uma rota já montada):
 *   <ProtectedRoute subscriptionStatus={user?.subscriptionStatus}>
 *     <ComponenteProtegido />
 *   </ProtectedRoute>
 */

const BLOCKED_STATUSES = ["PAST_DUE", "CANCELED"];

export default function ProtectedRoute({ subscriptionStatus, children }) {
  if (BLOCKED_STATUSES.includes(subscriptionStatus)) {
    return <Navigate to="/pricing" replace />;
  }
  return children;
}
