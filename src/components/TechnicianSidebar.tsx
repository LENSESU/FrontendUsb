"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthData } from "@/utils/auth";
import ThemeToggle from "@/components/ThemeToggle";

type Props = {
  auth: AuthData | null;
  onLogout: () => void;
  isLoggingOut: boolean;
  isOpen: boolean;
  onClose: () => void;
};

const NAV_MAIN = [
  {
    label: "Panel",
    href: "/dashboard/tecnico",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Incidentes",
    href: "/dashboard/tecnico/incidentes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    label: "Alertas",
    href: "/dashboard/tecnico/alertas",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V7l-8-4-8 4v5c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "Perfil",
    href: "/dashboard/tecnico/perfil",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
] as const;

function getInitials(email: string) {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

function getFirstName(email: string) {
  const raw = email.split("@")[0];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function TechnicianSidebar({ auth, onLogout, isLoggingOut, isOpen, onClose }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard/tecnico") return pathname === href;
    if (href === "/dashboard/tecnico/incidentes") {
      return (
        pathname.startsWith("/dashboard/tecnico/incidentes") ||
        pathname.startsWith("/dashboard/tecnico/incidente-detalle")
      );
    }
    return pathname.startsWith(href);
  }

  // Al navegar en mobile, cierra el drawer
  function handleNavClick() {
    onClose();
  }

  return (
    <aside className={`student-sidebar${isOpen ? " sidebar-mobile-open" : ""}`}>

      {/* ── Botón cerrar (solo mobile) ── */}
      <button
        type="button"
        className="sidebar-close-btn"
        onClick={onClose}
        aria-label="Cerrar menú"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div>
          <p className="sidebar-logo-title">TECNICO</p>
          <p className="sidebar-logo-sub">Asignaciones</p>
        </div>
      </div>

      {/* ── Navegación ── */}
      <nav className="sidebar-nav" aria-label="Principal">
        <p className="sidebar-section-label">MENU</p>
        <ul role="list">
          {NAV_MAIN.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={handleNavClick}
                className={`sidebar-nav-item${isActive(item.href) ? " sidebar-nav-item-active" : ""}`}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {isActive(item.href) && <span className="sidebar-nav-dot" aria-hidden="true" />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Footer: usuario + logout ── */}
      <div className="sidebar-footer">
        <ThemeToggle />
        {auth && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {getInitials(auth.email ?? "TC")}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{getFirstName(auth.email ?? "Tecnico")}</p>
              <p className="sidebar-user-role">Tecnico · Mantenimiento</p>
            </div>
          </div>
        )}
        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
          disabled={isLoggingOut}
          aria-label="Cerrar sesion"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isLoggingOut ? "Saliendo..." : "Cerrar Sesion"}
        </button>
      </div>
    </aside>
  );
}
