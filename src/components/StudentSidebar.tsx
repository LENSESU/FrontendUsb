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
    href: "/dashboard/estudiante",
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
    label: "Mis reportes",
    href: "/dashboard/estudiante/reportes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    label: "Sugerencias",
    href: "/dashboard/estudiante/sugerencias",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

function getInitials(email: string) {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

function getFirstName(email: string) {
  const raw = email.split("@")[0];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function StudentSidebar({ auth, onLogout, isLoggingOut, isOpen, onClose }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard/estudiante") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className={`student-sidebar${isOpen ? " sidebar-mobile-open" : ""}`}>

      {/* Botón cerrar — solo mobile */}
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

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <p className="sidebar-logo-title">USB LENS</p>
          <p className="sidebar-logo-sub">Sistema de Incidentes</p>
        </div>
      </div>

      {/* Nav principal */}
      <nav className="sidebar-nav" aria-label="Principal">
        <p className="sidebar-section-label">PRINCIPAL</p>
        <ul role="list">
          {NAV_MAIN.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
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

      {/* Nav cuenta */}
      <nav className="sidebar-nav" aria-label="Cuenta">
        <p className="sidebar-section-label">CUENTA</p>
        <ul role="list">
          <li>
            <Link
              href="/dashboard/estudiante/perfil"
              onClick={onClose}
              className={`sidebar-nav-item${isActive("/dashboard/estudiante/perfil") ? " sidebar-nav-item-active" : ""}`}
              aria-current={isActive("/dashboard/estudiante/perfil") ? "page" : undefined}
            >
              <span className="sidebar-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <span>Perfil</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <ThemeToggle />
        {auth && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {getInitials(auth.email ?? "US")}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{getFirstName(auth.email ?? "Usuario")}</p>
              <p className="sidebar-user-role">Estudiante · Ing. Sistemas</p>
            </div>
          </div>
        )}
        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
          disabled={isLoggingOut}
          aria-label="Cerrar sesión"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isLoggingOut ? "Saliendo..." : "Cerrar Sesión"}
        </button>
      </div>
    </aside>
  );
}
