/**
 * Utilitários de autenticação e comunicação com a API RiggingCheck.
 */

export const API =
  import.meta.env?.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const TOKEN_KEY = "rc_token";
const USER_KEY  = "rc_user";

/** Lê o JWT armazenado no localStorage. */
export const getToken = () => localStorage.getItem(TOKEN_KEY);

/** Lê o objeto do usuário armazenado no localStorage. */
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};

/** Persiste o JWT e o objeto de usuário no localStorage. */
export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/** Remove as credenciais do localStorage (logout). */
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Wrapper de fetch autenticado.
 *  - Injeta o header `Authorization: Bearer <token>` quando há sessão ativa.
 *  - Em resposta 401, limpa a sessão e dispara o evento `rc_session_expired`.
 *  - Em resposta 403, mantém a sessão (acesso negado ao recurso, não expiração).
 */
export const authFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event("rc_session_expired"));
  }

  return res;
};
