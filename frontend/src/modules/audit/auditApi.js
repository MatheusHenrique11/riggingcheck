import { authFetch } from "../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

/**
 * Consulta o trilho de auditoria com filtros e paginação.
 * @param {{entityType?:string, action?:string, userId?:string, from?:string, to?:string, page?:number, size?:number}} params
 */
export const fetchAuditLog = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  const query = qs.toString();
  return authFetch(`${API}/api/auditoria${query ? `?${query}` : ""}`)
    .then(r => (r.ok ? r.json() : null));
};
