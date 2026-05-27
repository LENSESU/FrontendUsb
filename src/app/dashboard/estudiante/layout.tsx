"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  restoreAuthSession,
  normalizeRole,
  getDashboardPathByRole,
  clearAuth,
  type AuthData,
} from "@/utils/auth";
import StudentSidebar from "@/components/StudentSidebar";

export default function EstudianteDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const restored = await restoreAuthSession();
      if (!isMounted) return;

      if (!restored) {
        router.replace("/login/estudiante");
        return;
      }

      const role = normalizeRole(restored.role);
      if (role !== "student") {
        router.replace(getDashboardPathByRole(restored.role));
        return;
      }

      setAuth(restored);
      setIsReady(true);
    }

    void init();
    return () => { isMounted = false; };
  }, [router]);

  // Cierra el sidebar si se cambia a desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleLogout() {
    setIsLoggingOut(true);
    clearAuth();
    router.replace("/login/estudiante");
  }

  if (!isReady) return null;

  return (
    <div className="dashboard-layout">
      <StudentSidebar
        auth={auth}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="dashboard-main">
        {/* Topbar mobile */}
        <header className="mobile-topbar">
          <button
            type="button"
            className="mobile-topbar-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6"  x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <span className="mobile-topbar-title">
            <span className="logo-dot" aria-hidden="true" />
            USB<span style={{ color: "var(--color-primary)" }}>Lens</span>
          </span>

          <div style={{ width: 40 }} aria-hidden="true" />
        </header>

        {children}
      </main>
    </div>
  );
}