"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { restoreAuthSession, type AuthData } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ── Carga dinámica del mapa (Leaflet no funciona en SSR) ──
const ViewOnlyMap = dynamic(() => import("@/components/ViewOnlyMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 200,
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
      Cargando mapa…
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

type EvidenciaResponse = {
  incident_id: string;
  filename: string;
  content_type: string;
  storage_object_name: string;
  file_url: string;
  message: string;
};

type ApiError = {
  detail:
    | { loc: [string, number]; msg: string; type: string }[]
    | { message: string; error_code: string }
    | string;
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

function formatStatusLabel(status: string): string {
  if (status === "En_proceso") return "EN PROGRESO";
  if (status === "Nuevo") return "NUEVO";
  if (status === "Resuelto") return "RESUELTO";
  return status.toUpperCase();
}

function getStatusDotColor(status: string): string {
  if (status === "Nuevo") return "#EF630F";
  if (status === "En_proceso") return "#2397f5";
  if (status === "Resuelto") return "#4CAF50";
  return "#9E9E9E";
}

function getPriorityDotColor(priority: string): string {
  if (priority === "Alta") return "#F44336";
  if (priority === "Media") return "#EF630F";
  return "#9E9E9E";
}

function canUploadAfter(incident: IncidentDetail): { allowed: boolean; reason: string | null } {
  if (!incident.technician_id) {
    return {
      allowed: false,
      reason: "No hay técnico asignado aún. La foto de resolución se habilitará una vez que se asigne un técnico.",
    };
  }
  if (incident.status !== "En_proceso" && incident.status !== "Resuelto") {
    return {
      allowed: false,
      reason: `El incidente debe estar en estado "En progreso" o "Resuelto" para subir la foto de resolución. Estado actual: ${formatStatusLabel(incident.status)}.`,
    };
  }
  return { allowed: true, reason: null };
}

async function subirEvidencia(
  incidentId: string,
  photo: File,
  photoType: "before" | "after" = "after",
  token: string
): Promise<{ ok: boolean; data: EvidenciaResponse | null; error: string | null }> {
  const formData = new FormData();
  formData.append("photo", photo);

  const response = await fetch(
    `${API}/api/v1/incidents/${incidentId}/evidence?photo_type=${photoType}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );

  if (response.ok) {
    const data: EvidenciaResponse = await response.json();
    return { ok: true, data, error: null };
  }

  const errorBody: ApiError = await response.json().catch(() => ({ detail: "Error desconocido." }));
  let mensajeError = "Error desconocido.";
  if (typeof errorBody.detail === "string") {
    mensajeError = errorBody.detail;
  } else if (Array.isArray(errorBody.detail)) {
    mensajeError = errorBody.detail[0]?.msg ?? mensajeError;
  } else if (typeof errorBody.detail === "object" && "message" in errorBody.detail) {
    mensajeError = errorBody.detail.message;
  }
  return { ok: false, data: null, error: mensajeError };
}

function EmptyPhoto({ label }: { label: string }) {
  return (
    <div
      style={{
        height: 160,
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-hint)" }}>{label}</span>
    </div>
  );
}

function TecnicoIncidenteDetalleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const incidentId = searchParams.get("id");

  const [auth, setAuth] = useState<AuthData | null>(null);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [beforePhotoAvailable, setBeforePhotoAvailable] = useState(true);

  const [confirmedAfterUrl, setConfirmedAfterUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!isCameraOpen || !videoRef.current || !mediaStreamRef.current) return;
    const video = videoRef.current;
    setIsCameraReady(false);
    video.srcObject = mediaStreamRef.current;

    function onCanPlay() {
      setIsCameraReady(true);
    }

    video.addEventListener("canplay", onCanPlay);
    void video.play().catch(() => setCameraError("No se pudo iniciar la reproducción del video."));

    return () => {
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [isCameraOpen]);

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
        setBeforePhotoAvailable(true);
        const [incRes, catRes] = await Promise.all([
          fetch(`${API}/api/v1/incidents/${incidentId}`, {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/v1/categories/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!incRes.ok) throw new Error("No se pudo cargar el incidente.");

        const incData = (await incRes.json()) as IncidentDetail;
        setIncident(incData);
        setConfirmedAfterUrl(incData.after_photo_url ?? null);

        if (catRes.ok) {
          const catData = (await catRes.json()) as { items?: Category[] } | Category[];
          const cats: Category[] = Array.isArray(catData) ? catData : (catData.items ?? []);
          const found = cats.find((c) => c.id === incData.category_id);
          setCategoryName(found?.name ?? "Sin categoría");
        }
      } catch {
        setError("No se pudo cargar la información del incidente.");
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [auth, incidentId, refreshKey]);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-xl)", display: "flex", alignItems: "center", gap: "var(--space-sm)", justifyContent: "center" }}>
        <span className="spinner spinner-dark" />
        <p className="text-secondary">Cargando incidente...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="container" style={{ paddingTop: "var(--space-xl)" }}>
        <div className="form-wrapper">
          <div className="alert-error"><p>{error ?? "Incidente no encontrado."}</p></div>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Volver</button>
        </div>
      </div>
    );
  }

  const hasCoords = incident.latitude != null && incident.longitude != null;

  const mapsUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=17/${incident.latitude}/${incident.longitude}`
    : null;

  const uploadGuard = canUploadAfter(incident);

  async function patchIncidentStatus(nextStatus: "En_proceso" | "Resuelto") {
    if (!auth?.accessToken || !incident) throw new Error("No hay sesión activa.");
    const res = await fetch(`${API}/api/v1/incidents/${incident.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ estado: nextStatus }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg = (typeof body?.detail === "string" && body.detail) || body?.detail?.message || "No se pudo actualizar el estado.";
      throw new Error(msg);
    }
  }

  async function handleStatusUpdate(newStatus: "En_proceso" | "Resuelto") {
    if (!auth?.accessToken || !incident) return;
    setUpdatingStatus(true);
    setStatusError(null);
    setStatusFeedback(null);
    try {
      await patchIncidentStatus(newStatus);
      const label = newStatus === "En_proceso" ? "En progreso" : "Resuelto";
      setStatusFeedback(`Estado actualizado a "${label}" correctamente.`);
      setTimeout(() => setStatusFeedback(null), 5000);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Error inesperado al actualizar.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleOpenFilePicker() {
    if (!uploadGuard.allowed || uploading) return;
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    setMensaje(null);
    setCameraError(null);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCancelPending() {
    setPendingFile(null);
    setPendingPreview(null);
    setImageError(null);
    setMensaje(null);
  }

  async function handleConfirmUpload() {
    if (!pendingFile || !incident || !auth?.accessToken) return;
    setUploading(true);
    setImageError(null);
    setMensaje(null);

    try {
      const { ok, data, error: uploadErr } = await subirEvidencia(
        incident.id,
        pendingFile,
        "after",
        auth.accessToken
      );

      if (ok && data) {
        setConfirmedAfterUrl(data.file_url);
        setMensaje(data.message ?? "Foto cargada correctamente.");
        setPendingFile(null);
        setPendingPreview(null);
        setRefreshKey((k) => k + 1);
      } else {
        setImageError(uploadErr ?? "Error al subir la imagen.");
      }
    } catch {
      setImageError("No se pudo conectar con el servidor.");
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Tu navegador no soporta acceso a la cámara.");
      return;
    }
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      setCameraError("No se pudo abrir la cámara. Verifica los permisos del navegador.");
    } finally {
      setIsStartingCamera(false);
    }
  }

  function handleCloseCamera() {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    setIsCameraOpen(false);
    setIsCameraReady(false);
  }

  function handleTakePhoto() {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError("No se pudo capturar la foto.");
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const w = video.videoWidth || video.clientWidth || 640;
    const h = video.videoHeight || video.clientHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) { setCameraError("No se pudo procesar la imagen."); return; }

    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) { setCameraError("No se pudo generar la foto."); return; }
        const capturedFile = new File([blob], `evidencia-${Date.now()}.jpg`, { type: "image/jpeg" });
        setImageError(null);
        setMensaje(null);
        setPendingFile(capturedFile);
        setPendingPreview(URL.createObjectURL(capturedFile));
        handleCloseCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  // Estilos reutilizables para las imágenes — respetan el aspect ratio original
  const photoImgStyle: React.CSSProperties = {
    width: "100%",
    height: "auto",
    maxHeight: 300,
    objectFit: "contain",
    background: "var(--color-bg-muted)",
    display: "block",
  };

  const thumbnailImgStyle: React.CSSProperties = {
    width: "100%",
    height: "auto",
    maxHeight: 220,
    objectFit: "contain",
    background: "var(--color-bg-muted)",
    display: "block",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 40px" }}>

      {/* ══ BARRA SUPERIOR ══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 0 8px",
          borderBottom: "1px solid var(--color-border-light)",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)",
              display: "flex", alignItems: "center", gap: 4, padding: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
            Panel
          </button>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-hint)" }}>›</span>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>Detalle del Incidente</span>
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--color-primary)", color: "#fff", border: "none",
            borderRadius: "var(--radius-lg)", padding: "7px 18px",
            fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", cursor: "pointer",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          Volver
        </button>
      </div>

      {/* ══ HEADER ══ */}
      <div
        style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12, marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
            Incidente{" "}
            <span style={{ color: "var(--color-primary)" }}>#{incident.id.slice(0, 8).toUpperCase()}</span>
          </h1>
          <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)", marginTop: 4 }}>
            Reportado el {formatDate(incident.created_at)}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {incident.priority && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              border: `1px solid ${getPriorityDotColor(incident.priority)}`,
              borderRadius: "var(--radius-full)", padding: "5px 14px",
              fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
              color: getPriorityDotColor(incident.priority), background: "#fff",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: getPriorityDotColor(incident.priority), display: "inline-block" }} />
              NIVEL DE PRIORIDAD: {incident.priority.toUpperCase()}
            </span>
          )}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: `1px solid ${getStatusDotColor(incident.status)}`,
            borderRadius: "var(--radius-full)", padding: "5px 14px",
            fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
            color: getStatusDotColor(incident.status), background: "#fff",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: getStatusDotColor(incident.status), display: "inline-block" }} />
            {formatStatusLabel(incident.status)}
          </span>
        </div>
      </div>

      {/* ══ GRID PRINCIPAL ══ */}
      <div
        className="incident-detail-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >

        {/* ════ COLUMNA 1: Información del reporte ════ */}
        <div className="card" style={{ overflow: "visible" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            borderBottom: "1px solid var(--color-border-light)", padding: "12px 16px",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>
              Información del Reporte
            </span>
          </div>

          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", padding: 12 }}>
              <p style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Reporte de Estudiante
              </p>

              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Categoría
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A2 2 0 0 1 3 12V7a4 4 0 0 1 4-4z" />
                  </svg>
                  <span style={{ fontSize: "var(--font-size-small)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>
                    {categoryName}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Descripción
                </p>
                <div style={{
                  background: "var(--color-bg-muted)", border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)", padding: "8px 10px",
                  fontSize: "var(--font-size-small)", color: "var(--color-text-primary)",
                  lineHeight: 1.55, whiteSpace: "pre-wrap",
                }}>
                  {incident.description || "Sin descripción"}
                </div>
              </div>

              {/* ── Mapa OpenStreetMap / Leaflet ── */}
              {hasCoords ? (
                <div>
                  {/* Mapa Leaflet solo lectura */}
                  <div style={{ marginBottom: 6 }}>
                    <ViewOnlyMap
                      latitude={incident.latitude!}
                      longitude={incident.longitude!}
                    />
                  </div>

                  {/* Link "Abrir en OpenStreetMap" */}
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
                      marginBottom: 6,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Abrir en OpenStreetMap
                  </a>

                  {/* Coordenadas + lugar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>Ubicación Detallada</span>
                  </div>
                  <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-primary)", marginTop: 2, paddingLeft: 19 }}>
                    {incident.campus_place ?? `${incident.latitude}, ${incident.longitude}`}
                  </p>
                </div>
              ) : incident.campus_place ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Ubicación Detallada
                    </span>
                  </div>
                  <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-primary)", marginTop: 4, paddingLeft: 19 }}>
                    {incident.campus_place}
                  </p>
                </div>
              ) : null}
            </div>

            {incident.updated_at && (
              <div>
                <p style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                  Última Actualización
                </p>
                <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)" }}>
                  {formatDate(incident.updated_at)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ════ COLUMNA 2: Solo previsualización de fotos ════ */}
        <div className="card">
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            borderBottom: "1px solid var(--color-border-light)", padding: "12px 16px",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>
              Evidencia Visual
            </span>
          </div>

          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Foto ANTES */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-hint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Antes (Reporte)
                </p>
                {incident.before_photo_url && (
                  <span style={{ fontSize: 10, color: "var(--color-primary)", fontWeight: 600 }}>JPG</span>
                )}
              </div>

              {incident.before_photo_url ? (
                <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--color-border-light)", background: "var(--color-bg-muted)" }}>
                  {beforePhotoAvailable ? (
                    <Image
                      src={incident.before_photo_url}
                      alt="Foto antes del incidente"
                      width={400}
                      height={300}
                      style={photoImgStyle}
                      onError={() => setBeforePhotoAvailable(false)}
                      unoptimized
                    />
                  ) : (
                    <EmptyPhoto label="Evidencia no disponible" />
                  )}
                </div>
              ) : (
                <EmptyPhoto label="Sin foto de reporte" />
              )}
            </div>

            {/* Divisor */}
            <div style={{ height: 1, background: "var(--color-border-light)" }} />

            {/* Foto DESPUÉS */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-hint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Resolución (Después)
                </p>
                {(confirmedAfterUrl || pendingPreview) && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: pendingPreview && !confirmedAfterUrl ? "#f59e0b" : "#4CAF50",
                  }}>
                    {pendingPreview && !confirmedAfterUrl ? "PENDIENTE" : "JPG"}
                  </span>
                )}
              </div>

              {pendingPreview ? (
                <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", border: "2px dashed #f59e0b", position: "relative", background: "var(--color-bg-muted)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingPreview}
                    alt="Vista previa — pendiente de confirmar"
                    style={photoImgStyle}
                  />
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "rgba(245,158,11,0.85)", padding: "4px 8px",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                    <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>Confirmar desde el panel derecho</span>
                  </div>
                </div>
              ) : confirmedAfterUrl ? (
                <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--color-border-light)", background: "var(--color-bg-muted)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={confirmedAfterUrl}
                    alt="Foto resolución del incidente"
                    style={photoImgStyle}
                  />
                </div>
              ) : (
                <EmptyPhoto label={uploadGuard.allowed ? "Pendiente de resolución" : "Sin foto de resolución"} />
              )}
            </div>
          </div>
        </div>

        {/* ════ COLUMNA 3: Gestión técnica + subida de evidencia ════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid var(--color-border-light)", padding: "12px 16px",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>
                Gestión Técnica
              </span>
            </div>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ── Estado del incidente ── */}
              <div>
                <p style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Estado del incidente
                </p>

                {statusError && <div className="alert-error" style={{ marginBottom: 10 }}><p>{statusError}</p></div>}
                {statusFeedback && <div className="alert-success" style={{ marginBottom: 10 }}><p>{statusFeedback}</p></div>}

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {incident.status === "Nuevo" ? (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleStatusUpdate("En_proceso")}
                      style={{
                        padding: "10px 8px", borderRadius: "var(--radius-sm)", border: "none",
                        background: "#e6f3ff", color: "#2397f5",
                        fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                        cursor: updatingStatus ? "not-allowed" : "pointer",
                        opacity: updatingStatus ? 0.7 : 1, transition: "opacity 0.15s",
                      }}
                    >
                      {updatingStatus ? "Guardando..." : "Iniciar atención (En progreso)"}
                    </button>
                  ) : (
                    <div
                      style={{
                        padding: "10px 8px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid #2397f5",
                        background: "#e6f3ff",
                        color: "#2397f5",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Atención iniciada
                    </div>
                  )}
                </div>

                <div style={{
                  width: "100%", padding: "10px", borderRadius: "var(--radius-sm)",
                  border: `1px solid ${getStatusDotColor(incident.status)}`,
                  background: "var(--color-bg-card)",
                  fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                  color: getStatusDotColor(incident.status),
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: getStatusDotColor(incident.status), display: "inline-block", flexShrink: 0 }} />
                  Estado actual: {formatStatusLabel(incident.status)}
                </div>
              </div>

              {/* ── Separador ── */}
              <div style={{ height: 1, background: "var(--color-border-light)" }} />

              {/* ── Subida de evidencia final ── */}
              <div>
                <p style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Foto de evidencia final
                </p>

                {!uploadGuard.allowed && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    background: "#fff8e1", border: "1px solid #ffe082",
                    borderRadius: "var(--radius-sm)", padding: "8px 10px", marginBottom: 10,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                    <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5, margin: 0 }}>{uploadGuard.reason}</p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileSelected}
                />

                <canvas ref={canvasRef} hidden />

                {/* ── Vista de cámara activa ── */}
                {isCameraOpen && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", border: "2px solid var(--color-primary)", marginBottom: 8, position: "relative", minHeight: 120, background: "#000" }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: "100%", height: "auto", maxHeight: 220, display: "block" }}
                      />
                      {!isCameraReady && (
                        <div style={{
                          position: "absolute", inset: 0,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                          background: "rgba(0,0,0,0.7)",
                        }}>
                          <span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff", width: 20, height: 20 }} />
                          <span style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>Iniciando cámara...</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!isCameraReady}
                        onClick={handleTakePhoto}
                        style={{ fontSize: "var(--font-size-xs)", padding: "8px 4px", opacity: isCameraReady ? 1 : 0.5, cursor: isCameraReady ? "pointer" : "not-allowed" }}
                      >
                        Tomar foto
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCloseCamera}
                        style={{ fontSize: "var(--font-size-xs)", padding: "8px 4px" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {cameraError && <p style={{ fontSize: 11, color: "var(--color-error)", marginBottom: 8 }}>{cameraError}</p>}

                {/* ── Botones de selección ── */}
                {!isCameraOpen && !pendingPreview && uploadGuard.allowed && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      disabled={isStartingCamera || uploading}
                      onClick={handleOpenCamera}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px 6px", borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border-light)",
                        background: "var(--color-bg-muted)",
                        fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text-primary)",
                        cursor: isStartingCamera || uploading ? "not-allowed" : "pointer",
                        opacity: isStartingCamera ? 0.6 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5A2.5 2.5 0 015.5 6h2.1a1 1 0 00.8-.4l.7-.9A1 1 0 019.9 4h4.2a1 1 0 01.8.4l.7.9a1 1 0 00.8.4h2.1A2.5 2.5 0 0121 8.5v8A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5v-8zM12 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                      </svg>
                      {isStartingCamera ? "Abriendo..." : "Cámara"}
                    </button>

                    <button
                      type="button"
                      disabled={uploading}
                      onClick={handleOpenFilePicker}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px 6px", borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border-light)",
                        background: "var(--color-bg-muted)",
                        fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text-primary)",
                        cursor: uploading ? "not-allowed" : "pointer",
                        transition: "opacity 0.15s",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Subir archivo
                    </button>
                  </div>
                )}

                {/* ── Pending preview + confirmar/cancelar ── */}
                {pendingPreview && !isCameraOpen && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{
                      borderRadius: "var(--radius-sm)", overflow: "hidden",
                      border: "2px dashed #f59e0b", marginBottom: 8, position: "relative",
                      background: "var(--color-bg-muted)",
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pendingPreview}
                        alt="Vista previa pendiente"
                        style={thumbnailImgStyle}
                      />
                      {uploading && (
                        <div style={{
                          position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                        }}>
                          <span className="spinner" style={{ borderColor: "#fff", borderTopColor: "transparent" }} />
                          <span style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>Subiendo...</span>
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: 11, color: "var(--color-text-hint)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pendingFile?.name}
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={handleConfirmUpload}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          padding: "9px 6px", borderRadius: "var(--radius-sm)", border: "none",
                          background: uploading ? "var(--color-bg-muted)" : "var(--color-primary)",
                          color: uploading ? "var(--color-text-hint)" : "#fff",
                          fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                          cursor: uploading ? "not-allowed" : "pointer", transition: "opacity 0.15s",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Confirmar
                      </button>

                      <button
                        type="button"
                        disabled={uploading}
                        onClick={handleCancelPending}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          padding: "9px 6px", borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-border-light)",
                          background: "var(--color-bg-muted)",
                          fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                          color: "var(--color-text-secondary)",
                          cursor: uploading ? "not-allowed" : "pointer",
                          opacity: uploading ? 0.5 : 1, transition: "opacity 0.15s",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Foto ya confirmada: opción de cambiar */}
                {confirmedAfterUrl && !pendingPreview && !isCameraOpen && uploadGuard.allowed && (
                  <button
                    type="button"
                    onClick={handleOpenFilePicker}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px", borderRadius: "var(--radius-sm)",
                      border: "1px dashed var(--color-border-light)",
                      background: "transparent",
                      fontSize: "var(--font-size-xs)", color: "var(--color-text-hint)",
                      cursor: "pointer", transition: "border-color 0.15s",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Cambiar foto de evidencia
                  </button>
                )}

                {mensaje && <p style={{ fontSize: 11, color: "var(--color-success)", marginTop: 6 }}>{mensaje}</p>}
                {imageError && <p style={{ fontSize: 11, color: "var(--color-error)", marginTop: 6 }}>{imageError}</p>}
              </div>
            </div>
          </div>

          {/* ── Botón Incidente Completado ── */}
          <button
            type="button"
            disabled={incident.status !== "En_proceso" || updatingStatus}
            onClick={() => handleStatusUpdate("Resuelto")}
            style={{
              width: "100%", padding: "16px", borderRadius: "var(--radius-md)", border: "none",
              background: incident.status === "Resuelto"
                ? "var(--color-success)"
                : incident.status === "En_proceso"
                  ? "var(--color-primary)"
                  : "var(--color-bg-muted)",
              color: "#fff",
              fontSize: "var(--font-size-small)", fontWeight: "var(--font-weight-bold)",
              cursor: incident.status !== "En_proceso" || updatingStatus ? "not-allowed" : "pointer",
              opacity: incident.status === "En_proceso" ? 1 : 0.7,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              textTransform: "uppercase", letterSpacing: "0.08em",
              transition: "opacity 0.15s, background 0.2s",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {updatingStatus
              ? "Guardando..."
              : incident.status === "Resuelto"
                ? "Incidente Completado ✓"
                : "Marcar como Completado"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TecnicoIncidenteDetallePage() {
  return (
    <Suspense fallback={<div className="page-centered"><p className="text-secondary">Cargando...</p></div>}>
      <TecnicoIncidenteDetalleContent />
    </Suspense>
  );
}