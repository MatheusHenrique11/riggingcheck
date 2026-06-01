import { authFetch } from "../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

export const fetchAlertsSummary  = () => authFetch(`${API}/api/alertas/resumo`).then(r => r.ok ? r.json() : null);
export const fetchAlerts         = (status) => authFetch(`${API}/api/alertas${status ? `?status=${status}` : ""}`).then(r => r.ok ? r.json() : []);
export const gerarAlertas        = () => authFetch(`${API}/api/alertas/gerar`, { method: "POST" }).then(r => r.ok ? r.json() : null);
export const visualizarAlerta    = (id) => authFetch(`${API}/api/alertas/${id}/visualizar`, { method: "PATCH" }).then(r => r.ok ? r.json() : null);
export const resolverAlerta      = (id) => authFetch(`${API}/api/alertas/${id}/resolver`,   { method: "PATCH" }).then(r => r.ok ? r.json() : null);
export const ignorarAlerta       = (id) => authFetch(`${API}/api/alertas/${id}/ignorar`,    { method: "PATCH" }).then(r => r.ok ? r.json() : null);
