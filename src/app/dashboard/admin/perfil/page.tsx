"use client";

import { useEffect, useState } from "react";
import { restoreAuthSession, normalizeRole, type AuthData } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ── Tipos ──────────────────────────────────────────────────────────────────

type UserProfile = {
  user_id: string;
  email: string;
  role_id: string;
  // Del endpoint /api/v1/users/:id (si existe) o del JWT enriquecido
  first_name?: string;
  last_name?: string;
  role_name?: string;
  created_at?: string;
  is_active?: boolean;
};

type RoleConfig = {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  icon: React.ReactNode;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getRoleConfig(role: string | undefined): RoleConfig {
  const normalized = normalizeRole(role ?? "");
  if (normalized === "administrator") {
    return {
      label: "Administrador",
      color: "#7C3AED",
      bgColor: "#F5F3FF",
      borderColor: "#DDD6FE",
      description: "Gestión general del sistema",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    };
  }
  if (normalized === "technician") {
    return {
      label: "Técnico",
      color: "#2397f5",
      bgColor: "#e6f3ff",
      borderColor: "#cce5ff",
      description: "Resolución de incidentes asignados",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    };
  }
  // student (default)
  return {
    label: "Estudiante",
    color: "#EF630F",
    bgColor: "#FFF3EE",
    borderColor: "#FDDCCC",
    description: "Reporte y seguimiento de incidentes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  };
}

function getInitials(profile: UserProfile): string {
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
  }
  return profile.email.slice(0, 2).toUpperCase();
}

function getFullName(profile: UserProfile): string {
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  return profile.email.split("@")[0];
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// Intenta extraer datos extra del JWT (first_name, last_name, role_name, etc.)
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
}

// ── Componente principal ───────────────────────────────────────────────────

export default function ProfilePage() {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const session = await restoreAuthSession();
        if (!session?.accessToken) {
          setError("No se encontró una sesión activa.");
          setLoading(false);
          return;
        }
        setAuth(session);

        const token = session.accessToken;

        // 1. Llamar a /auth/me para obtener datos básicos del JWT
        const meRes = await fetch(`${API}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          throw new Error("No se pudo obtener el perfil del usuario.");
        }

        const meData = (await meRes.json()) as {
          user_id: string;
          email: string;
          role_id: string;
        };

        // 2. Enriquecer con datos del JWT payload (first_name, last_name, role_name si existen)
        const jwtPayload = decodeJwtPayload(token);

        // 3. Intentar obtener más datos del endpoint de usuario por ID (si el backend lo expone)
        let extraData: Partial<UserProfile> = {};
        try {
          const userRes = await fetch(`${API}/api/v1/users/${meData.user_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userRes.ok) {
            extraData = (await userRes.json()) as Partial<UserProfile>;
          }
        } catch {
          // El endpoint puede no existir; se usa el JWT como fallback
        }

        // 4. Intentar obtener role_name desde /roles si no está en el JWT
        let roleName: string | undefined =
          (jwtPayload.role_name as string | undefined) ??
          (extraData.role_name as string | undefined) ??
          session.role ??
          undefined;

        setProfile({
          user_id: meData.user_id,
          email: meData.email,
          role_id: meData.role_id,
          first_name:
            (extraData.first_name as string | undefined) ??
            (jwtPayload.first_name as string | undefined),
          last_name:
            (extraData.last_name as string | undefined) ??
            (jwtPayload.last_name as string | undefined),
          role_name: roleName,
          created_at:
            (extraData.created_at as string | undefined) ??
            (jwtPayload.created_at as string | undefined),
          is_active:
            (extraData.is_active as boolean | undefined) ?? true,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar el perfil."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  // ── Estados de carga ──

  if (loading) {
    return (
      <div className="page-centered" style={{ minHeight: "60vh" }}>
        <div className="flex items-center gap-sm">
          <span className="spinner spinner-dark" />
          <p className="text-secondary">Cargando perfil…</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-centered" style={{ minHeight: "60vh" }}>
        <div className="form-wrapper">
          <div className="alert-error">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error ?? "No se pudo cargar el perfil."}</p>
          </div>
        </div>
      </div>
    );
  }

  const roleConfig = getRoleConfig(profile.role_name ?? auth?.role ?? undefined);
  const initials = getInitials(profile);
  const fullName = getFullName(profile);

  return (
    <div
      className="mx-auto px-4 pb-8 pt-0 sm:p-6"
      style={{ maxWidth: 680 }}
    >
      {/* ── Avatar + nombre + rol ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-stripe" />
        <div className="card-body">
          <div
            className="flex items-center gap-md"
            style={{ flexWrap: "wrap" }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "var(--radius-full)",
                background: roleConfig.color,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: "var(--font-weight-bold)",
                flexShrink: 0,
                letterSpacing: "-0.02em",
              }}
            >
              {initials}
            </div>

            {/* Info principal */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontSize: "var(--font-size-h3)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--color-text-primary)",
                  marginBottom: 4,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {fullName}
              </h1>

              <p
                className="text-secondary"
                style={{
                  fontSize: "var(--font-size-small)",
                  marginBottom: 10,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile.email}
              </p>

              {/* Badge de rol */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: roleConfig.bgColor,
                  border: `1px solid ${roleConfig.borderColor}`,
                  borderRadius: "var(--radius-full)",
                  padding: "4px 12px",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: roleConfig.color,
                }}
              >
                <span style={{ color: roleConfig.color }}>
                  {roleConfig.icon}
                </span>
                {roleConfig.label}
              </span>
            </div>

            {/* Indicador activo */}
            {profile.is_active !== false && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  alignSelf: "flex-start",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "var(--radius-full)",
                    background: "var(--color-success)",
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-success)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  Activo
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Información de la cuenta ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid var(--color-border-light)",
            padding: "12px 16px",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-text-secondary)",
            }}
          >
            Información de la cuenta
          </span>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 0 }}>
          <ProfileField
            label="Nombre completo"
            value={
              profile.first_name && profile.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : "—"
            }
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
          <ProfileField
            label="Correo electrónico"
            value={profile.email}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
          />
          <ProfileField
            label="Rol"
            value={roleConfig.label}
            valueColor={roleConfig.color}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
            }
            description={roleConfig.description}
          />
          {profile.created_at && (
            <ProfileField
              label="Miembro desde"
              value={formatDate(profile.created_at)}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
              isLast
            />
          )}
        </div>
      </div>

      {/* ── Identificación del sistema ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid var(--color-border-light)",
            padding: "12px 16px",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-text-secondary)",
            }}
          >
            Identificación del sistema
          </span>
        </div>

        <div style={{ padding: 16 }}>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-hint)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            ID de usuario
          </p>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "var(--font-size-small)",
              color: "var(--color-text-primary)",
              background: "var(--color-bg-muted)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              wordBreak: "break-all",
              lineHeight: 1.6,
            }}
          >
            {profile.user_id}
          </p>
        </div>
      </div>

      {/* ── Permisos por rol ── */}
      <RolePermissionsCard
        role={profile.role_name ?? auth?.role ?? undefined}
        roleConfig={roleConfig}
      />

      <p className="page-footer">
        © {new Date().getFullYear()} Universidad San Buenaventura Cali · USB LENS
      </p>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function ProfileField({
  label,
  value,
  icon,
  description,
  valueColor,
  isLast,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  description?: string;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottom: isLast ? "none" : "1px solid var(--color-border-light)",
      }}
    >
      {icon && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-sm)",
            background: "var(--color-bg-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--color-text-hint)",
            marginTop: 2,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-hint)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 3,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: "var(--font-size-small)",
            fontWeight: "var(--font-weight-medium)",
            color: valueColor ?? "var(--color-text-primary)",
            wordBreak: "break-word",
          }}
        >
          {value}
        </p>
        {description && (
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-hint)",
              marginTop: 2,
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function RolePermissionsCard({
  role,
  roleConfig,
}: {
  role: string | undefined;
  roleConfig: RoleConfig;
}) {
  const normalized = normalizeRole(role ?? "");

  const permissions: { label: string; available: boolean }[] =
    normalized === "administrator"
      ? [
          { label: "Ver todos los incidentes", available: true },
          { label: "Cambiar estado de incidentes", available: true },
          { label: "Asignar técnicos a incidentes", available: true },
          { label: "Gestionar categorías", available: true },
          { label: "Ver estadísticas globales", available: true },
          { label: "Reportar incidentes", available: false },
        ]
      : normalized === "technician"
      ? [
          { label: "Ver incidentes asignados", available: true },
          { label: "Actualizar estado de incidentes", available: true },
          { label: "Subir evidencia fotográfica", available: true },
          { label: "Ver todos los incidentes", available: false },
          { label: "Asignar técnicos", available: false },
          { label: "Gestionar categorías", available: false },
        ]
      : [
          { label: "Reportar incidentes", available: true },
          { label: "Ver mis incidentes", available: true },
          { label: "Votar sugerencias", available: true },
          { label: "Ver estadísticas globales", available: false },
          { label: "Asignar técnicos", available: false },
          { label: "Cambiar estado de incidentes", available: false },
        ];

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--color-border-light)",
          padding: "12px 16px",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-text-secondary)",
          }}
        >
          Permisos del rol
        </span>
      </div>

      <div style={{ padding: 16 }}>
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-secondary)",
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          Como <strong style={{ color: roleConfig.color }}>{roleConfig.label}</strong>{" "}
          tienes acceso a las siguientes funciones:
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 8,
          }}
        >
          {permissions.map((perm) => (
            <div
              key={perm.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                background: perm.available
                  ? "var(--color-success-bg)"
                  : "var(--color-bg-muted)",
                border: `1px solid ${
                  perm.available
                    ? "var(--color-success-border)"
                    : "var(--color-border-light)"
                }`,
              }}
            >
              {perm.available ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-success)"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-text-disabled)"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)",
                  color: perm.available
                    ? "var(--color-success)"
                    : "var(--color-text-disabled)",
                  lineHeight: 1.3,
                }}
              >
                {perm.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}