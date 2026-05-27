"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthData } from "@/utils/auth";

type Props = {
  auth: AuthData | null;
  onLogout: () => void;
  isLoggingOut: boolean;
};

const NAV_MAIN = [
  {
    label: "Panel",
    href: "/dashboard/admin",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 12h.01M12 12h.01M16 12h.01" />
        <path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    label: "Áreas inhabilitadas",
    href: "/dashboard/admin/areas-inhabilitadas",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
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

export default function AdminSidebar({ auth, onLogout, isLoggingOut }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard/admin") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="student-sidebar">
      {/* LOGO */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🛠️</div>
        <div>
          <p className="sidebar-logo-title">ADMIN</p>
          <p className="sidebar-logo-sub">Sistema</p>
        </div>
      </div>

      {/* NAV */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">MENÚ</p>
        <ul>
          {NAV_MAIN.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`sidebar-nav-item${isActive(item.href) ? " sidebar-nav-item-active" : ""}`}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* FOOTER */}
      <div className="sidebar-footer">
        {auth && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {getInitials(auth.email ?? "AD")}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">
                {getFirstName(auth.email ?? "Admin")}
              </p>
              <p className="sidebar-user-role">Administrador</p>
            </div>
          </div>
        )}

        <button
          className="sidebar-logout"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}