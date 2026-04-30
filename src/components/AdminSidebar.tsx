"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthData } from "@/utils/auth";

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
    href: "/dashboard/admin",
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
    label: "Sugerencias",
    href: "/dashboard/admin/sugerencias",
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

export default function AdminSidebar({ auth, onLogout, isLoggingOut, isOpen, onClose }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard/admin") return pathname === href;
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p className="sidebar-logo-title">ADMIN</p>
          <p className="sidebar-logo-sub">Sistema</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" aria-label="Principal">
        <p className="sidebar-section-label">MENÚ</p>
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

      {/* Footer */}
      <div className="sidebar-footer">
        {auth && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {getInitials(auth.email ?? "AD")}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{getFirstName(auth.email ?? "Admin")}</p>
              <p className="sidebar-user-role">Administrador</p>
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
          {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}