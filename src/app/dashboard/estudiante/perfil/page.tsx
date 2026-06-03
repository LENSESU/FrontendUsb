"use client";

import { useEffect, useState } from "react";
import { restoreAuthSession, normalizeRole, type AuthData } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ── Types ──────────────────────────────────────────────────────────────────

type UserProfile = {
    user_id: string;
    email: string;
    role_id: string;
    first_name?: string;
    last_name?: string;
    role_name?: string;
    created_at?: string;
    is_active?: boolean;
};

type RoleConfig = {
    label: string;
    color: string;
    colorDark: string;
    bgColor: string;
    bgHero: string;
    borderColor: string;
    description: string;
    capabilities: { icon: string; text: string }[];
};

// ── Role configuration ─────────────────────────────────────────────────────

function getRoleConfig(role: string | undefined): RoleConfig {
    const normalized = normalizeRole(role ?? "");

    if (normalized === "administrator") {
        return {
            label: "Administrador",
            color: "#7C3AED",
            colorDark: "#5B21B6",
            bgColor: "#F5F3FF",
            bgHero: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
            borderColor: "#DDD6FE",
            description: "Gestión general del sistema universitario",
            capabilities: [
                { icon: "👁", text: "Ver todos los incidentes del campus" },
                { icon: "⚡", text: "Cambiar estado de cualquier incidente" },
                { icon: "👷", text: "Asignar técnicos a incidentes" },
                { icon: "🗂", text: "Gestionar categorías del sistema" },
                { icon: "📊", text: "Acceder a estadísticas globales" },
                { icon: "💬", text: "Responder sugerencias institucionales" },
            ],
        };
    }

    if (normalized === "technician") {
        return {
            label: "Técnico",
            color: "#0369A1",
            colorDark: "#075985",
            bgColor: "#F0F9FF",
            bgHero: "linear-gradient(135deg, #0369A1 0%, #075985 100%)",
            borderColor: "#BAE6FD",
            description: "Resolución de incidentes en el campus",
            capabilities: [
                { icon: "📋", text: "Ver incidentes asignados" },
                { icon: "🔄", text: "Actualizar estado de incidentes" },
                { icon: "📷", text: "Subir evidencia fotográfica" },
                { icon: "✅", text: "Cerrar incidentes resueltos" },
                { icon: "📍", text: "Ver ubicación de incidentes" },
                { icon: "🔔", text: "Recibir notificaciones de asignación" },
            ],
        };
    }

    // Student (default)
    return {
        label: "Estudiante",
        color: "#EF630F",
        colorDark: "#C2410C",
        bgColor: "#FFF7ED",
        bgHero: "linear-gradient(135deg, #EF630F 0%, #C2410C 100%)",
        borderColor: "#FED7AA",
        description: "Reporte y seguimiento de incidentes",
        capabilities: [
            { icon: "📝", text: "Reportar incidentes en el campus" },
            { icon: "🔍", text: "Seguir el estado de mis reportes" },
            { icon: "💡", text: "Publicar y votar sugerencias" },
            { icon: "📸", text: "Adjuntar fotos a mis reportes" },
            { icon: "📍", text: "Indicar ubicación exacta" },
            { icon: "🗓", text: "Ver historial de mis incidentes" },
        ],
    };
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

function formatMemberSince(iso: string | undefined): string {
    if (!iso) return "";
    try {
        return new Intl.DateTimeFormat("es-CO", {
            month: "long",
            year: "numeric",
        }).format(new Date(iso));
    } catch {
        return "";
    }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch {
        return {};
    }
}

// ── Main component ─────────────────────────────────────────────────────────

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

                const meRes = await fetch(`${API}/api/v1/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!meRes.ok) throw new Error("No se pudo obtener el perfil.");

                const meData = (await meRes.json()) as {
                    user_id: string;
                    email: string;
                    role_id: string;
                };

                const jwtPayload = decodeJwtPayload(token);

                let extraData: Partial<UserProfile> = {};
                try {
                    const userRes = await fetch(
                        `${API}/api/v1/users/${meData.user_id}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    );
                    if (userRes.ok)
                        extraData =
                            (await userRes.json()) as Partial<UserProfile>;
                } catch {
                    // fallback to JWT data
                }

                const roleName: string | undefined =
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
                    err instanceof Error
                        ? err.message
                        : "Error al cargar el perfil.",
                );
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, []);

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
                        <p>{error ?? "No se pudo cargar el perfil."}</p>
                    </div>
                </div>
            </div>
        );
    }

    const rc = getRoleConfig(profile.role_name ?? auth?.role ?? undefined);
    const initials = getInitials(profile);
    const fullName = getFullName(profile);
    const memberSince = formatMemberSince(profile.created_at);

    return (
        <div
            style={{
                maxWidth: 640,
                margin: "0 auto",
                padding: "0 16px 48px",
            }}
        >
            {/* ── Hero card ── */}
            <div
                style={{
                    borderRadius: 20,
                    overflow: "hidden",
                    marginBottom: 16,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                }}
            >
                {/* Coloured top band */}
                <div
                    style={{
                        background: rc.bgHero,
                        padding: "32px 28px 56px",
                        position: "relative",
                    }}
                >
                    {/* Decorative circles */}
                    <div
                        aria-hidden
                        style={{
                            position: "absolute",
                            top: -30,
                            right: -30,
                            width: 140,
                            height: 140,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.08)",
                        }}
                    />
                    <div
                        aria-hidden
                        style={{
                            position: "absolute",
                            bottom: 10,
                            right: 60,
                            width: 70,
                            height: 70,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.06)",
                        }}
                    />

                    {/* Name + role */}
                    <h1
                        style={{
                            fontSize: 26,
                            fontWeight: 800,
                            color: "#fff",
                            lineHeight: 1.15,
                            letterSpacing: "-0.02em",
                            marginBottom: 6,
                        }}
                    >
                        {fullName}
                    </h1>
                    <p
                        style={{
                            fontSize: 14,
                            color: "rgba(255,255,255,0.75)",
                            marginBottom: 0,
                            fontWeight: 500,
                        }}
                    >
                        {profile.email}
                    </p>
                </div>

                {/* White bottom of hero — avatar overlapping the band */}
                <div
                    style={{
                        background: "var(--color-bg-card, #fff)",
                        padding: "0 28px 24px",
                        position: "relative",
                    }}
                >
                    {/* Avatar — overlaps the colour band */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "space-between",
                            marginTop: -36,
                            marginBottom: 16,
                        }}
                    >
                        <div
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: "50%",
                                background: rc.bgHero,
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 26,
                                fontWeight: 800,
                                flexShrink: 0,
                                letterSpacing: "-0.02em",
                                border: "4px solid var(--color-bg-card, #fff)",
                                boxShadow: "0 2px 12px rgba(0,0,0,0.14)",
                            }}
                        >
                            {initials}
                        </div>

                        {/* Role badge */}
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: rc.bgColor,
                                border: `1px solid ${rc.borderColor}`,
                                borderRadius: 999,
                                padding: "5px 14px",
                                fontSize: 12,
                                fontWeight: 700,
                                color: rc.color,
                                letterSpacing: "0.02em",
                                marginBottom: 4,
                            }}
                        >
                            {rc.label}
                        </span>
                    </div>

                    {/* Role description + member since */}
                    <p
                        style={{
                            fontSize: 13,
                            color: "var(--color-text-secondary)",
                            lineHeight: 1.5,
                            marginBottom: memberSince ? 8 : 0,
                        }}
                    >
                        {rc.description}
                    </p>
                    {memberSince && (
                        <p
                            style={{
                                fontSize: 12,
                                color: "var(--color-text-hint)",
                                marginBottom: 0,
                            }}
                        >
                            Miembro desde{" "}
                            <strong
                                style={{
                                    color: "var(--color-text-secondary)",
                                    fontWeight: 600,
                                }}
                            >
                                {memberSince}
                            </strong>
                        </p>
                    )}
                </div>
            </div>

            {/* ── Contact info ── */}
            <div
                className="card"
                style={{
                    marginBottom: 16,
                    borderRadius: 16,
                    overflow: "hidden",
                }}
            >
                <SectionHeader label="Datos de contacto" />
                <div style={{ padding: "4px 20px 16px" }}>
                    <InfoRow
                        label="Correo electrónico"
                        value={profile.email}
                        accent={rc.color}
                    />
                </div>
            </div>

            {/* ── Capabilities ── */}
            <div
                className="card"
                style={{
                    marginBottom: 16,
                    borderRadius: 16,
                    overflow: "hidden",
                }}
            >
                <SectionHeader label="Lo que puedes hacer" />
                <div
                    style={{
                        padding: "12px 20px 20px",
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 8,
                    }}
                >
                    {rc.capabilities.map((cap) => (
                        <div
                            key={cap.text}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 12px",
                                borderRadius: 10,
                                background: rc.bgColor,
                                border: `1px solid ${rc.borderColor}`,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 16,
                                    lineHeight: 1,
                                    flexShrink: 0,
                                }}
                            >
                                {cap.icon}
                            </span>
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: rc.colorDark,
                                    lineHeight: 1.3,
                                }}
                            >
                                {cap.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <p
                style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: "var(--color-text-hint)",
                    marginTop: 24,
                }}
            >
                © {new Date().getFullYear()} Universidad San Buenaventura Cali ·
                USB LENS
            </p>
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
    return (
        <div
            style={{
                padding: "12px 20px",
                borderBottom: "1px solid var(--color-border-light)",
            }}
        >
            <span
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    color: "var(--color-text-hint)",
                }}
            >
                {label}
            </span>
        </div>
    );
}

function InfoRow({
    label,
    value,
    accent,
    isLast,
}: {
    label: string;
    value: string;
    accent?: string;
    isLast?: boolean;
}) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                paddingTop: 14,
                paddingBottom: 14,
                borderBottom: isLast
                    ? "none"
                    : "1px solid var(--color-border-light)",
            }}
        >
            <span
                style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--color-text-hint)",
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: accent ?? "var(--color-text-primary)",
                    wordBreak: "break-word",
                }}
            >
                {value}
            </span>
        </div>
    );
}
