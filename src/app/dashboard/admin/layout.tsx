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
import AdminSidebar from "@/components/AdminSidebar";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const session = await restoreAuthSession();

        if (!isMounted) return;

        if (!session) {
          router.replace("/login/personal");
          return;
        }

        const role = normalizeRole(session.role);
        if (role !== "administrator") {
          router.replace(getDashboardPathByRole(session.role));
          return;
        }

        setAuth(session);
        setIsReady(true);
      } catch (error) {
        console.error("Error cargando sesión:", error);
        router.replace("/login/personal");
      }
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
    router.replace("/login/personal");
  }

  if (!isReady) {
    return (
      <div className="page-centered">
        <p>Cargando panel...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <AdminSidebar
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

          <ThemeToggle compact />
        </header>

        {children}
      </main>
    </div>
  );
}
