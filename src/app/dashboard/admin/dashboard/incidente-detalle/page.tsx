"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { restoreAuthSession, type AuthData } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ── Carga dinámica del mapa (Leaflet no funciona en SSR) ──
const ViewOnlyMap = dynamic(() => import("@/components/ViewOnlyMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 220,
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

function getStatusBadgeStyle(status: string): React.CSSProperties {
  if (status === "Nuevo")
    return { background: "#fff3e0", color: "#e65100", border: "1px solid #ffcc80" };
  if (status === "En_proceso" || status === "En progreso")
    return { background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9" };
  if (status === "Resuelto")
    return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
  return { background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-light)" };
}

function formatStatusLabel(status: string): string {
  if (status === "En_proceso") return "En progreso";
  return status;
}

// ── Lightbox para visualizar fotos sin recorte ──
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
      {/* Botón cerrar */}
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

      {/* Imagen: contiene cualquier aspect ratio sin recortar */}
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

// ── Tarjeta de foto con soporte 16:9 y 9:16 sin recorte ──
function PhotoCard({
  url,
  label,
  badge,
  badgeColor,
  onView,
}: {
  url: string | null;
  label: string;
  badge?: string;
  badgeColor?: string;
  onView: (src: string) => void;
}) {
  const [available, setAvailable] = useState(true);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-hint)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </p>
        {badge && url && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: badgeColor ?? "var(--color-primary)",
            }}
          >
            {badge}
          </span>
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
            // El contenedor no impone relación de aspecto fija;
            // la imagen dicta su propio alto sin ser recortada.
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
              // Sin maxHeight fijo: la imagen puede ser 9:16 y mostrarse completa.
              // En desktop el contenedor de la card limita el ancho naturalmente.
              objectFit: "contain",
              display: "block",
              background: "var(--color-bg-muted)",
            }}
          />
          {/* Botón de ampliar superpuesto */}
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Ver completa
          </button>
        </div>
      ) : (
        <div
          style={{
            height: 140,
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-hint)" }}>
            {!url ? "Sin foto registrada" : "Imagen no disponible"}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AdminIncidenteDetallePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const incidentId = searchParams.get("id");

  const [auth, setAuth] = useState<AuthData | null>(null);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // ── Asignación de técnico ──
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [assignedTechnician, setAssignedTechnician] = useState<Technician | null>(null);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const handleOpenLightbox = useCallback((src: string) => {
    setLightboxSrc(src);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxSrc(null);
  }, []);

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
        const [incRes, catRes, techRes] = await Promise.all([
          fetch(`${API}/api/v1/incidents/${incidentId}/`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API}/api/v1/categories/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/v1/technicians/available`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!incRes.ok) throw new Error("No se pudo cargar el incidente.");

        const incData = (await incRes.json()) as IncidentDetail;
        setIncident(incData);

        if (incData.technician_id) {
          setSelectedTechnicianId(incData.technician_id);
          setLoadingAssigned(true);
          try {
            const assignedRes = await fetch(
              `${API}/api/v1/technicians/${incData.technician_id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (assignedRes.ok) {
              const assignedData = (await assignedRes.json()) as Technician;
              setAssignedTechnician(assignedData);
            }
          } catch {
            // no-op
          } finally {
            setLoadingAssigned(false);
          }
        }

        if (catRes.ok) {
          const catData = (await catRes.json()) as { items?: Category[] } | Category[];
          const cats: Category[] = Array.isArray(catData)
            ? catData
            : (catData.items ?? []);
          const found = cats.find((c) => c.id === incData.category_id);
          setCategoryName(found?.name ?? "Sin categoría");
        }

        if (techRes.ok) {
          const techData = (await techRes.json()) as Technician[];
          setTechnicians(techData);
        }
      } catch {
        setError("No se pudo cargar la información del incidente.");
      } finally {
        setLoading(false);
        setLoadingTechnicians(false);
      }
    }

    void fetchData();
  }, [auth, incidentId]);

  async function handleAssignTechnician() {
    if (!selectedTechnicianId || !auth?.accessToken || !incidentId) return;

    setAssigning(true);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      const res = await fetch(`${API}/api/v1/incidents/${incidentId}/technician`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ technician_id: selectedTechnicianId }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message =
          typeof errorBody?.detail === "string"
            ? errorBody.detail
            : "No se pudo asignar el técnico.";
        setAssignError(message);
        return;
      }

      setIncident((prev) =>
        prev ? { ...prev, technician_id: selectedTechnicianId } : prev
      );
      const justAssigned =
        technicians.find((t) => t.id === selectedTechnicianId) ?? null;
      setAssignedTechnician(justAssigned);
      setAssignSuccess("Técnico asignado correctamente.");
    } catch {
      setAssignError("Error de conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setAssigning(false);
    }
  }

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
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.back()}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const hasCoords =
    incident.latitude != null && incident.longitude != null;

  const mapsUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=17/${incident.latitude}/${incident.longitude}`
    : null;

  return (
    <>
      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <PhotoLightbox
          src={lightboxSrc}
          alt="Evidencia fotográfica del incidente"
          onClose={handleCloseLightbox}
        />
      )}

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 16px 48px",
        }}
      >
        {/* ── Barra de navegación ── */}
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
              Incidentes
            </button>
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-hint)",
              }}
            >
              ›
            </span>
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-secondary)",
              }}
            >
              Detalle del Incidente
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
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 18l-6-6 6-6"
              />
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
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                lineHeight: 1.2,
              }}
            >
              Incidente{" "}
              <span style={{ color: "var(--color-primary)" }}>
                #{incident.id.slice(0, 8).toUpperCase()}
              </span>
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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                    ? {
                        background: "#fef2f2",
                        color: "#b91c1c",
                        border: "1px solid #fca5a5",
                      }
                    : incident.priority === "Media"
                    ? {
                        background: "#fff7ed",
                        color: "#c2410c",
                        border: "1px solid #fdba74",
                      }
                    : {
                        background: "var(--color-bg-muted)",
                        color: "var(--color-text-secondary)",
                        border: "1px solid var(--color-border-light)",
                      }),
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    display: "inline-block",
                    background: "currentColor",
                  }}
                />
                {incident.priority.toUpperCase()}
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
                ...getStatusBadgeStyle(incident.status),
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  display: "inline-block",
                  background: "currentColor",
                }}
              />
              {formatStatusLabel(incident.status).toUpperCase()}
            </span>
          </div>
        </div>

        {/* ══ GRID PRINCIPAL ══
            En móvil: columna única
            En tablet/desktop: dos columnas
        */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* ════ COLUMNA 1: Reporte + Mapa ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Información del reporte */}
            <div className="card">
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
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
                  Información del Reporte
                </span>
              </div>

              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Categoría */}
                <div>
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
                    Categoría
                  </p>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A2 2 0 0 1 3 12V7a4 4 0 0 1 4-4z"
                      />
                    </svg>
                    <span
                      style={{
                        fontSize: "var(--font-size-small)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {categoryName}
                    </span>
                  </div>
                </div>

                {/* Descripción */}
                <div>
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
                    Descripción
                  </p>
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
                    gridTemplateColumns: incident.updated_at
                      ? "1fr 1fr"
                      : "1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text-hint)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 2,
                      }}
                    >
                      Fecha de reporte
                    </p>
                    <p
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {formatDate(incident.created_at)}
                    </p>
                  </div>
                  {incident.updated_at && (
                    <div>
                      <p
                        style={{
                          fontSize: "var(--font-size-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--color-text-hint)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: 2,
                        }}
                      >
                        Ultima actualizacion
                      </p>
                      <p
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {formatDate(incident.updated_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mapa de ubicación */}
            <div className="card">
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
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
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
                  Ubicacion del Incidente
                </span>
              </div>

              <div style={{ padding: 16 }}>
                {hasCoords ? (
                  <>
                    {/* Mapa bloqueado: zoom fijo, sin interacción de zoom */}
                    <div
                      style={{
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                        border: "1px solid var(--color-border-light)",
                        marginBottom: 10,
                        // pointer-events none en el contenedor no aplica
                        // porque necesitamos el scroll del mapa; el lock
                        // se hace en ViewOnlyMap via zoomControl:false y
                        // scrollWheelZoom:false (ya está implementado así)
                      }}
                    >
                      <ViewOnlyMap
                        latitude={incident.latitude!}
                        longitude={incident.longitude!}
                      />
                    </div>

                    {/* Etiqueta de ubicación */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        background: "var(--color-bg-muted)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)",
                        padding: "8px 12px",
                        marginBottom: 8,
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="2"
                        style={{ flexShrink: 0, marginTop: 1 }}
                      >
                        <polygon points="3 11 22 2 13 21 11 13 3 11" />
                      </svg>
                      <div style={{ minWidth: 0 }}>
                        {incident.campus_place && (
                          <p
                            style={{
                              fontSize: "var(--font-size-small)",
                              fontWeight: "var(--font-weight-semibold)",
                              color: "var(--color-text-primary)",
                              lineHeight: 1.4,
                            }}
                          >
                            {incident.campus_place}
                          </p>
                        )}
                        <p
                          style={{
                            fontSize: "var(--font-size-xs)",
                            color: "var(--color-text-hint)",
                            marginTop: incident.campus_place ? 2 : 0,
                            fontFamily: "monospace",
                          }}
                        >
                          {incident.latitude?.toFixed(6)},{" "}
                          {incident.longitude?.toFixed(6)}
                        </p>
                      </div>
                    </div>

                    {/* Enlace externo */}
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
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Abrir en OpenStreetMap
                    </a>
                  </>
                ) : incident.campus_place ? (
                  /* Solo lugar de campus, sin coordenadas */
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      background: "var(--color-bg-muted)",
                      border: "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 12px",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ flexShrink: 0, marginTop: 1 }}
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div>
                      <p
                        style={{
                          fontSize: "var(--font-size-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--color-text-hint)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: 2,
                        }}
                      >
                        Lugar en campus
                      </p>
                      <p
                        style={{
                          fontSize: "var(--font-size-small)",
                          color: "var(--color-text-primary)",
                          fontWeight: "var(--font-weight-semibold)",
                        }}
                      >
                        {incident.campus_place}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: "var(--font-size-small)",
                      color: "var(--color-text-hint)",
                      textAlign: "center",
                      padding: "24px 0",
                    }}
                  >
                    Sin ubicacion registrada para este incidente
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ════ COLUMNA 2: Fotos + Asignación técnico ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Evidencia fotográfica — siempre visible */}
            <div className="card">
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
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
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
                  Evidencia Fotografica
                </span>
              </div>

              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {/* Foto ANTES — siempre se muestra, vacía o con imagen */}
                <PhotoCard
                  url={incident.before_photo_url}
                  label="Antes (Reporte)"
                  badge={incident.before_photo_url ? "JPG" : undefined}
                  badgeColor="var(--color-primary)"
                  onView={handleOpenLightbox}
                />

                <div
                  style={{
                    height: 1,
                    background: "var(--color-border-light)",
                  }}
                />

                {/* Foto DESPUÉS — siempre se muestra, vacía o con imagen */}
                <PhotoCard
                  url={incident.after_photo_url}
                  label="Resolucion (Despues)"
                  badge={incident.after_photo_url ? "JPG" : undefined}
                  badgeColor="#4CAF50"
                  onView={handleOpenLightbox}
                />
              </div>
            </div>

            {/* Asignación de técnico */}
            <div className="card">
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
                  Asignacion de Tecnico
                </span>
              </div>

              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Técnico asignado actualmente */}
                {loadingAssigned ? (
                  <p
                    style={{
                      fontSize: "var(--font-size-small)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Cargando tecnico asignado...
                  </p>
                ) : assignedTechnician ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "var(--color-primary-bg, #e8f0fe)",
                      border: "1px solid var(--color-primary-border, #c5d8fd)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "var(--color-primary)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-bold)",
                        flexShrink: 0,
                        textTransform: "uppercase",
                      }}
                    >
                      {assignedTechnician.first_name[0]}
                      {assignedTechnician.last_name[0]}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontSize: "var(--font-size-small)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--color-text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {assignedTechnician.first_name}{" "}
                        {assignedTechnician.last_name}
                      </p>
                      <p
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {assignedTechnician.email}
                      </p>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 600,
                        background: "#e8f5e9",
                        color: "#2e7d32",
                        border: "1px solid #a5d6a7",
                        borderRadius: "var(--radius-full)",
                        padding: "3px 8px",
                      }}
                    >
                      Asignado
                    </span>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: "var(--font-size-small)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Este incidente aun no tiene un tecnico asignado.
                  </p>
                )}

                {/* Selector */}
                <div>
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
                    {incident.technician_id
                      ? "Reasignar tecnico"
                      : "Seleccionar tecnico"}
                  </p>

                  {loadingTechnicians ? (
                    <p
                      style={{
                        fontSize: "var(--font-size-small)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Cargando tecnicos disponibles...
                    </p>
                  ) : technicians.length === 0 ? (
                    <p
                      style={{
                        fontSize: "var(--font-size-small)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      No hay tecnicos disponibles en este momento.
                    </p>
                  ) : (
                    <select
                      value={selectedTechnicianId}
                      onChange={(e) =>
                        setSelectedTechnicianId(e.target.value)
                      }
                      style={{
                        width: "100%",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)",
                        padding: "8px 10px",
                        fontSize: "var(--font-size-small)",
                        color: "var(--color-text-primary)",
                        background: "var(--color-bg-card)",
                        appearance: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">-- Selecciona un tecnico --</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.first_name} {t.last_name} · {t.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Feedback */}
                {assignError && (
                  <div className="alert-error" role="alert">
                    <p>{assignError}</p>
                  </div>
                )}
                {assignSuccess && (
                  <div
                    style={{
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid #a5d6a7",
                      background: "#e8f5e9",
                      padding: "8px 12px",
                      fontSize: "var(--font-size-small)",
                      color: "#2e7d32",
                    }}
                    role="status"
                  >
                    {assignSuccess}
                  </div>
                )}

                {/* Botón asignar */}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAssignTechnician}
                  disabled={
                    assigning ||
                    !selectedTechnicianId ||
                    selectedTechnicianId === incident.technician_id
                  }
                  style={{ width: "100%" }}
                >
                  {assigning
                    ? "Asignando..."
                    : incident.technician_id
                    ? "Reasignar tecnico"
                    : "Asignar tecnico"}
                </button>
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