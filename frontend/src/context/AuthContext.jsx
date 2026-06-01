import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getToken, getUser, saveAuth, clearAuth } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(() => !!getToken());
  const [user, setUser] = useState(() => getUser());

  const login = useCallback((token, userData) => {
    saveAuth(token, userData);
    setUser(userData);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setAuthenticated(false);
  }, []);

  const refreshUser = useCallback(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("rc_session_expired", handler);
    return () => window.removeEventListener("rc_session_expired", handler);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ authenticated, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
