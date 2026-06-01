/* global global */
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { getToken, getUser, saveAuth, clearAuth, authFetch } from "../api.js";

// jsdom fornece localStorage funcional — limpamos antes de cada teste
beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// ── getToken ────────────────────────────────────────────────────────────────────

describe("getToken", () => {
  it("retorna null quando não há token armazenado", () => {
    expect(getToken()).toBeNull();
  });

  it("retorna o token armazenado", () => {
    localStorage.setItem("rc_token", "meu-jwt-token");
    expect(getToken()).toBe("meu-jwt-token");
  });
});

// ── getUser ─────────────────────────────────────────────────────────────────────

describe("getUser", () => {
  it("retorna null quando não há usuário armazenado", () => {
    expect(getUser()).toBeNull();
  });

  it("retorna o objeto do usuário desserializado", () => {
    const user = { userId: "123", role: "LIDER_EQUIPE", userName: "João" };
    localStorage.setItem("rc_user", JSON.stringify(user));
    expect(getUser()).toEqual(user);
  });

  it("retorna null se o JSON estiver corrompido", () => {
    localStorage.setItem("rc_user", "json-invalido{{");
    expect(getUser()).toBeNull();
  });
});

// ── saveAuth ────────────────────────────────────────────────────────────────────

describe("saveAuth", () => {
  it("persiste token e usuário no localStorage", () => {
    const user = { userId: "abc", role: "ADMIN_EMPRESA" };
    saveAuth("token-xyz", user);

    expect(localStorage.getItem("rc_token")).toBe("token-xyz");
    expect(JSON.parse(localStorage.getItem("rc_user"))).toEqual(user);
  });

  it("sobrescreve credenciais anteriores", () => {
    saveAuth("token-antigo", { userId: "1" });
    saveAuth("token-novo",   { userId: "2" });

    expect(getToken()).toBe("token-novo");
    expect(getUser()).toEqual({ userId: "2" });
  });
});

// ── clearAuth ───────────────────────────────────────────────────────────────────

describe("clearAuth", () => {
  it("remove token e usuário do localStorage", () => {
    saveAuth("token", { userId: "1" });
    clearAuth();

    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it("não lança erro quando chamado sem sessão ativa", () => {
    expect(() => clearAuth()).not.toThrow();
  });
});

// ── authFetch ───────────────────────────────────────────────────────────────────

describe("authFetch", () => {
  /**
   * Cria um fetch mock que responde com o status e body especificados.
   * Retorna o spy para inspeção das chamadas.
   */
  const mockFetch = (status = 200, body = {}) => {
    // Objeto simples compatível com a interface Response — authFetch só usa .status
    const response = {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
    const spy = jest.fn().mockResolvedValue(response);
    global.fetch = spy;
    return spy;
  };

  it("injeta Authorization header quando há token", async () => {
    const fetchSpy = mockFetch(200);
    saveAuth("meu-jwt", {});

    await authFetch("https://api.exemplo.com/dados");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer meu-jwt");
  });

  it("não injeta Authorization header quando não há token", async () => {
    const fetchSpy = mockFetch(200);

    await authFetch("https://api.exemplo.com/publico");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("sempre envia Content-Type application/json", async () => {
    const fetchSpy = mockFetch(200);

    await authFetch("https://api.exemplo.com/dados");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("permite sobrescrever headers via options", async () => {
    const fetchSpy = mockFetch(200);

    await authFetch("https://api.exemplo.com/dados", {
      headers: { "X-Custom": "valor" },
    });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers["X-Custom"]).toBe("valor");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("retorna a resposta sem modificações para 2xx", async () => {
    mockFetch(200, { resultado: "ok" });

    const res = await authFetch("https://api.exemplo.com/dados");

    expect(res.status).toBe(200);
  });

  it("em 401 chama clearAuth e dispara evento rc_session_expired", async () => {
    mockFetch(401);
    saveAuth("token-expirado", { userId: "123" });

    const eventListener = jest.fn();
    window.addEventListener("rc_session_expired", eventListener);

    await authFetch("https://api.exemplo.com/protegido");

    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
    expect(eventListener).toHaveBeenCalledTimes(1);

    window.removeEventListener("rc_session_expired", eventListener);
  });

  it("em 403 NÃO limpa a sessão (acesso negado ≠ expiração)", async () => {
    mockFetch(403);
    saveAuth("token-valido", { userId: "123" });

    await authFetch("https://api.exemplo.com/admin");

    expect(getToken()).toBe("token-valido");
  });

  it("em 403 NÃO dispara evento rc_session_expired", async () => {
    mockFetch(403);
    const eventListener = jest.fn();
    window.addEventListener("rc_session_expired", eventListener);

    await authFetch("https://api.exemplo.com/admin");

    expect(eventListener).not.toHaveBeenCalled();

    window.removeEventListener("rc_session_expired", eventListener);
  });

  it("passa method e body das options para o fetch", async () => {
    const fetchSpy = mockFetch(200);

    await authFetch("https://api.exemplo.com/dados", {
      method: "POST",
      body: JSON.stringify({ key: "value" }),
    });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ key: "value" }));
  });
});
