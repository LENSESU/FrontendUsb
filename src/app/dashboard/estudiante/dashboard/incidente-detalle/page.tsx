"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { restoreAuthSession, type AuthData } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const ViewOnlyMap = dynamic(() => import("@/components/ViewOnlyMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 160,
        background: "var(--color-bg-muted)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--color-border-light)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "var(--font-size-xs)",
        color: "var(--color-text-hint)",
      }}
    >
      Cargando mapa...
    </div>
  ),
});

type IncidentDetail = {
  id: string;
  status: string;
  priority: string | null;
  created_at: string;
  updated_at: string | null;
  category_id: string;
  campus_place: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  student_id: string;
  technician_id: string | null;
  before_photo_id: string | null;
  after_photo_id: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
};

type Category = {
  id: string;
  name: string;
};

type Technician = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Status helpers ──
type StatusMeta = {
  label: string;
  badge: React.CSSProperties;
  bannerBg: string;
  bannerBorder: string;
  bannerColor: string;
  techMessage: string | null;
  techSubtext: string | null;
};

function getStatusMeta(status: string, hasTechnician: boolean): StatusMeta {
  if (status === "Resuelto") {
    return {
      label: "Resuelto",
      badge: { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" },
      bannerBg: "#e8f5e9",
      bannerBorder: "#a5d6a7",
      bannerColor: "#1b5e20",
      techMessage: "Tu incidente fue resuelto.",
      techSubtext: "Revisa la foto de resolución para confirmar el cierre.",
    };
  }
  if (status === "En_proceso" || status === "En progreso") {
    return {
      label: "En progreso",
      badge: { background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9" },
      bannerBg: "#e3f2fd",
      bannerBorder: "#90caf9",
      bannerColor: "#0d47a1",
      techMessage: hasTechnician ? "Ya hay alguien atendiendo tu caso." : "Tu reporte está siendo procesado.",
      techSubtext: hasTechnician
        ? "El técnico asignado está trabajando en la solución."
        : null,
    };
  }
  // Nuevo / default
  return {
    label: "Nuevo",
    badge: { background: "#fff3e0", color: "#e65100", border: "1px solid #ffcc80" },
    bannerBg: "#fff8f0",
    bannerBorder: "#ffcc80",
    bannerColor: "#bf360c",
    techMessage: "Tu reporte fue recibido.",
    techSubtext: "Pronto será revisado y asignado a un técnico.",
  };
}

// ── Lightbox ──
function PhotoLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "50%",
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
        }}
        aria-label="Cerrar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "min(100%, 960px)",
          maxHeight: "calc(100dvh - 64px)",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          borderRadius: "var(--radius-sm)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          display: "block",
        }}
      />
    </div>
  );
}

// ── PhotoCard (sin recorte, igual que admin) ──
function PhotoCard({
  url,
  label,
  sublabel,
  accent,
  onView,
}: {
  url: string | null;
  label: string;
  sublabel?: string;
  accent?: string;
  onView: (src: string) => void;
}) {
  const [available, setAvailable] = useState(true);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: 6 }}>
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            color: accent ?? "var(--color-text-hint)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            lineHeight: 1.3,
          }}
        >
          {label}
        </p>
        {sublabel && (
          <p
            style={{
              fontSize: 10,
              color: "var(--color-text-hint)",
              marginTop: 1,
            }}
          >
            {sublabel}
          </p>
        )}
      </div>

      {url && available ? (
        <div
          style={{
            position: "relative",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            border: "1px solid var(--color-border-light)",
            background: "var(--color-bg-muted)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            onError={() => setAvailable(false)}
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              display: "block",
              background: "var(--color-bg-muted)",
            }}
          />
          <button
            type="button"
            onClick={() => onView(url)}
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "var(--radius-sm)",
              padding: "5px 10px",
              display: "flex",
              alignItems: "center",
              gap: 5,
              cursor: "pointer",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              backdropFilter: "blur(4px)",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Ver completa
          </button>
        </div>
      ) : (
        <div
          style={{
            height: 120,
            border: "1px dashed var(--color-border-light)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-bg-muted)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-hint)", textAlign: "center", padding: "0 8px" }}>
            {!url ? "Aún sin foto de resolución" : "Imagen no disponible"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Section header reutilizable ──
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderBottom: "1px solid var(--color-border-light)",
        padding: "12px 16px",
      }}
    >
      {icon}
      <span
        style={{
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-semibold)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--color-text-secondary)",
        }}
      >
        {title}
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-semibold)",
        color: "var(--color-text-hint)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 4,
      }}
    >
      {children}
    </p>
  );
}

export default function EstudianteIncidenteDetallePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const incidentId = searchParams.get("id");

  const [auth, setAuth] = useState<AuthData | null>(null);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [categoryName, setCategoryName] = useState<string>("");
  const [assignedTechnician, setAssignedTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleOpenLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const handleCloseLightbox = useCallback(() => setLightboxSrc(null), []);

  useEffect(() => {
    async function loadSession() {
      const session = await restoreAuthSession();
      setAuth(session);
    }
    void loadSession();
  }, []);

  useEffect(() => {
    if (!auth?.accessToken || !incidentId) {
      if (!incidentId) setError("No se especificó un incidente.");
      return;
    }
    const token = auth.accessToken;

    async function fetchData() {
      try {
        const [incRes, catRes] = await Promise.all([
          fetch(`${API}/api/v1/incidents/${incidentId}/`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API}/api/v1/categories/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!incRes.ok) throw new Error("No se pudo cargar el incidente.");

        const incData = (await incRes.json()) as IncidentDetail;
        setIncident(incData);

        if (catRes.ok) {
          const catData = (await catRes.json()) as { items?: Category[] } | Category[];
          const cats: Category[] = Array.isArray(catData)
            ? catData
            : (catData.items ?? []);
          const found = cats.find((c) => c.id === incData.category_id);
          setCategoryName(found?.name ?? "Sin categoría");
        }

        // Cargar técnico si está asignado
        if (incData.technician_id) {
          try {
            const techRes = await fetch(
              `${API}/api/v1/technicians/${incData.technician_id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (techRes.ok) {
              const techData = (await techRes.json()) as Technician;
              setAssignedTechnician(techData);
            }
          } catch {
            // no-op
          }
        }
      } catch {
        setError("No se pudo cargar la información del incidente.");
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [auth, incidentId]);

  if (loading) {
    return (
      <div className="page-centered">
        <span className="spinner spinner-dark" />
        <p className="text-secondary" style={{ marginTop: 8 }}>
          Cargando incidente...
        </p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="page-centered">
        <div className="form-wrapper">
          <div className="alert-error">
            <p>{error ?? "Incidente no encontrado."}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = getStatusMeta(incident.status, !!incident.technician_id);
  const hasCoords = incident.latitude != null && incident.longitude != null;
  const mapsUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=17/${incident.latitude}/${incident.longitude}`
    : null;
  const isResolved = incident.status === "Resuelto";

  return (
    <>
      {lightboxSrc && (
        <PhotoLightbox
          src={lightboxSrc}
          alt="Evidencia fotográfica del incidente"
          onClose={handleCloseLightbox}
        />
      )}

      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "0 16px 48px",
        }}
      >
        {/* ── Nav ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 0 8px",
            borderBottom: "1px solid var(--color-border-light)",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
              Mis incidentes
            </button>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-hint)" }}>›</span>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
              Detalle
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-lg)",
              padding: "7px 18px",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
            Volver
          </button>
        </div>

        {/* ── Encabezado ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-hint)",
                fontFamily: "monospace",
                letterSpacing: "0.04em",
                marginBottom: 4,
              }}
            >
              #{incident.id.slice(0, 8).toUpperCase()}
            </p>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                lineHeight: 1.2,
              }}
            >
              {categoryName}
            </h1>
            <p
              style={{
                fontSize: "var(--font-size-small)",
                color: "var(--color-text-secondary)",
                marginTop: 4,
              }}
            >
              Reportado el {formatDate(incident.created_at)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {incident.priority && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: "var(--radius-full)",
                  padding: "5px 14px",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  ...(incident.priority === "Alta"
                    ? { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }
                    : incident.priority === "Media"
                    ? { background: "#fff7ed", color: "#c2410c", border: "1px solid #fdba74" }
                    : { background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-light)" }),
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: "currentColor" }} />
                {incident.priority}
              </span>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: "var(--radius-full)",
                padding: "5px 14px",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                ...statusMeta.badge,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: "currentColor" }} />
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* ── Banner de estado ── */}
        <div
          style={{
            background: statusMeta.bannerBg,
            border: `1px solid ${statusMeta.bannerBorder}`,
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          {/* Icono según estado */}
          {isResolved ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={statusMeta.bannerColor} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : incident.technician_id ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={statusMeta.bannerColor} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={statusMeta.bannerColor} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <div>
            <p
              style={{
                fontSize: "var(--font-size-small)",
                fontWeight: "var(--font-weight-semibold)",
                color: statusMeta.bannerColor,
                lineHeight: 1.4,
              }}
            >
              {statusMeta.techMessage}
            </p>
            {statusMeta.techSubtext && (
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: statusMeta.bannerColor,
                  opacity: 0.75,
                  marginTop: 3,
                }}
              >
                {statusMeta.techSubtext}
              </p>
            )}
            {/* Nombre del técnico si está asignado */}
            {assignedTechnician && !isResolved && (
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: statusMeta.bannerColor,
                  marginTop: 6,
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                Técnico: {assignedTechnician.first_name} {assignedTechnician.last_name}
              </p>
            )}
          </div>
        </div>

        {/* ══ GRID PRINCIPAL ══ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* ════ COLUMNA 1: Reporte + ubicación ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Información del reporte */}
            <div className="card">
              <SectionHeader
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                }
                title="Tu reporte"
              />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Descripción */}
                <div>
                  <FieldLabel>Descripción</FieldLabel>
                  <div
                    style={{
                      background: "var(--color-bg-muted)",
                      border: "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 10px",
                      fontSize: "var(--font-size-small)",
                      color: "var(--color-text-primary)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {incident.description || "Sin descripción"}
                  </div>
                </div>

                {/* Fechas */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: incident.updated_at ? "1fr 1fr" : "1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <FieldLabel>Fecha de reporte</FieldLabel>
                    <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                      {formatDate(incident.created_at)}
                    </p>
                  </div>
                  {incident.updated_at && (
                    <div>
                      <FieldLabel>Última actualización</FieldLabel>
                      <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                        {formatDate(incident.updated_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ubicación — compacta */}
            <div className="card">
              <SectionHeader
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                }
                title="Ubicación"
              />
              <div style={{ padding: 16 }}>
                {/* Etiqueta de lugar */}
                {incident.campus_place && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: hasCoords ? 10 : 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                    <p style={{ fontSize: "var(--font-size-small)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>
                      {incident.campus_place}
                    </p>
                  </div>
                )}

                {hasCoords ? (
                  <>
                    <div
                      style={{
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                        border: "1px solid var(--color-border-light)",
                        marginBottom: 8,
                      }}
                    >
                      <ViewOnlyMap
                        latitude={incident.latitude!}
                        longitude={incident.longitude!}
                      />
                    </div>
                    <a
                      href={mapsUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-primary)",
                        textDecoration: "none",
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Ver en OpenStreetMap
                    </a>
                  </>
                ) : !incident.campus_place ? (
                  <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-hint)", padding: "8px 0" }}>
                    Sin ubicación registrada.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* ════ COLUMNA 2: Fotos ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Foto enviada */}
            <div className="card">
              <SectionHeader
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                }
                title="Foto que enviaste"
              />
              <div style={{ padding: 16 }}>
                <PhotoCard
                  url={incident.before_photo_url}
                  label="Al momento del reporte"
                  sublabel="Evidencia registrada por ti"
                  accent="var(--color-text-secondary)"
                  onView={handleOpenLightbox}
                />
              </div>
            </div>

            {/* Respuesta / resolución */}
            <div className="card">
              <SectionHeader
                icon={
                  isResolved ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  )
                }
                title={isResolved ? "Resolución" : "Esperando respuesta"}
              />
              <div style={{ padding: 16 }}>
                {!isResolved && !incident.after_photo_url && (
                  <div
                    style={{
                      background: "var(--color-bg-muted)",
                      border: "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 12px",
                      marginBottom: 12,
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {incident.technician_id
                      ? "El técnico tomará una foto al resolver el problema. Aparecerá aquí cuando esté lista."
                      : "Cuando el incidente sea atendido y resuelto, verás aquí la foto de confirmación."}
                  </div>
                )}
                <PhotoCard
                  url={incident.after_photo_url}
                  label={isResolved ? "Foto de resolución" : "Sin foto aún"}
                  sublabel={isResolved ? "Registrada por el técnico" : undefined}
                  accent={isResolved ? "#2e7d32" : undefined}
                  onView={handleOpenLightbox}
                />
              </div>
            </div>

          </div>
        </div>

        <p
          style={{
            marginTop: 32,
            textAlign: "center",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-hint)",
          }}
        >
          {new Date().getFullYear()} Universidad San Buenaventura Cali · USB LENS
        </p>
      </div>
    </>
  );
}