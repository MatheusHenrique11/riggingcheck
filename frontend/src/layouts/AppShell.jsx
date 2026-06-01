import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

/**
 * Shell enterprise: sidebar persistente (desktop) + topbar + área de conteúdo.
 * Envolve todas as páginas autenticadas da área /app.
 */
export default function AppShell({ children, title, breadcrumb }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const needsRenewal = user?.subscriptionStatus === "PAST_DUE" ||
                       user?.subscriptionStatus === "CANCELED";

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area — pushes right on desktop */}
      <div className="rc-main-with-sidebar" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <header style={{
          position: "sticky",
          top: 0,
          background: "#0a0f1e",
          borderBottom: "1px solid #1e293b",
          zIndex: 50,
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: "transparent",
                border: "1px solid #334155",
                color: "#94a3b8",
                borderRadius: 6,
                padding: "5px 9px",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
                display: "none",
              }}
              className="rc-hamburger"
            >
              ☰
            </button>

            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {breadcrumb && breadcrumb.map((crumb, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span style={{ color: "#334155", fontSize: 13 }}>/</span>}
                  {crumb.path ? (
                    <button
                      onClick={() => navigate(crumb.path)}
                      style={{
                        background: "transparent", border: "none",
                        color: "#64748b", cursor: "pointer",
                        fontSize: 13, padding: 0,
                      }}
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
              {title && !breadcrumb && (
                <span style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700 }}>{title}</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {needsRenewal && (
              <button
                onClick={() => navigate("/pricing")}
                style={{
                  background: "#ef4444",
                  border: "none",
                  color: "#fff",
                  borderRadius: 20,
                  padding: "4px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Renovar Assinatura
              </button>
            )}
            <button
              onClick={() => navigate("/app/dashboard")}
              style={{
                background: "transparent",
                border: "1px solid #1e293b",
                color: "#64748b",
                borderRadius: 6,
                padding: "5px 12px",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Dashboard
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "24px 20px", maxWidth: 1100, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: "1px solid #1e293b",
          padding: "12px 20px",
          textAlign: "center",
          color: "#334155",
          fontSize: 11,
        }}>
          RiggingCheck · NR-11 · ABNT NBR 13541 · ISO 4308-1 · Petrobras N-2869
        </footer>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .rc-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
