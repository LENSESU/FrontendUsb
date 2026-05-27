"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { restoreAuthSession, type AuthData } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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

function getStatusBadgeClass(status: string): string {
  if (status === "Nuevo") return "bg-yellow-100 text-yellow-700";
  if (status === "En_proceso" || status === "En progreso") return "bg-blue-100 text-blue-700";
  if (status === "Resuelto") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

function formatStatusLabel(status: string): string {
  if (status === "En_proceso") return "En progreso";
  return status;
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

  // ── Estados asignación de técnico ──
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [assignedTechnician, setAssignedTechnician] = useState<Technician | null>(null);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  // ── Carga de sesión ──
  useEffect(() => {
    async function loadSession() {
      const session = await restoreAuthSession();
      setAuth(session);
    }
    void loadSession();
  }, []);

  // ── Carga de incidente, categoría y técnicos disponibles ──
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

        // Si tiene técnico asignado, buscarlo por separado
        if (incData.technician_id) {
          setSelectedTechnicianId(incData.technician_id);
          setLoadingAssigned(true);
          try {
            const assignedRes = await fetch(`${API}/api/v1/technicians/${incData.technician_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (assignedRes.ok) {
              const assignedData = (await assignedRes.json()) as Technician;
              setAssignedTechnician(assignedData);
            }
          } catch {
            // Si falla, simplemente no se muestra el técnico asignado
          } finally {
            setLoadingAssigned(false);
          }
        }

        if (catRes.ok) {
          const catData = (await catRes.json()) as { items?: Category[] } | Category[];
          const cats: Category[] = Array.isArray(catData) ? catData : (catData.items ?? []);
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

  // ── Asignar técnico ──
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

      // Actualizar el incidente y el técnico asignado localmente
      setIncident((prev) =>
        prev ? { ...prev, technician_id: selectedTechnicianId } : prev
      );
      const justAssigned = technicians.find((t) => t.id === selectedTechnicianId) ?? null;
      setAssignedTechnician(justAssigned);
      setAssignSuccess("Técnico asignado correctamente.");
    } catch {
      setAssignError("Error de conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setAssigning(false);
    }
  }

  // ── Estados de carga y error ──
  if (loading) {
    return (
      <div className="page-centered">
        <p className="text-secondary">Cargando incidente...</p>
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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-0 sm:p-6">

      {/* ── Botón volver ── */}
      <button
        type="button"
        className="btn-link mb-4"
        onClick={() => router.back()}
      >
        ← Volver a incidentes
      </button>

      <div className="card">
        <div className="card-stripe" />
        <div className="card-body">

          {/* ── Encabezado: ID + badge estado ── */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-hint)",
                letterSpacing: "0.04em",
              }}
            >
              #{incident.id.slice(0, 8).toUpperCase()}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(incident.status)}`}
            >
              {formatStatusLabel(incident.status)}
            </span>
          </div>

          <h1 className="card-form-title">Detalle del incidente</h1>

          {/* ── Categoría ── */}
          <div className="field">
            <label>Categoría</label>
            <p style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-primary)", fontWeight: "var(--font-weight-medium)" }}>
              {categoryName}
            </p>
          </div>

          {/* ── Prioridad ── */}
          {incident.priority && (
            <div className="field">
              <label>Prioridad</label>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                  incident.priority === "Alta"
                    ? "bg-red-100 text-red-700"
                    : incident.priority === "Media"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {incident.priority}
              </span>
            </div>
          )}

          {/* ── Ubicación ── */}
          <div className="field">
            <label>Ubicación</label>
            <div className="flex items-center gap-xs">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                style={{ fill: "none", stroke: "var(--color-text-hint)", strokeWidth: 2, flexShrink: 0 }}
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-small text-secondary">
                {incident.campus_place ?? "Sin ubicación registrada"}
              </p>
            </div>
          </div>

          {/* ── Descripción ── */}
          <div className="field">
            <label>Descripción</label>
            <div
              style={{
                background: "var(--color-bg-muted)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-md)",
                fontSize: "var(--font-size-small)",
                color: "var(--color-text-primary)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                border: "1px solid var(--color-border-light)",
              }}
            >
              {incident.description || "Sin descripción"}
            </div>
          </div>

          {/* ── Coordenadas GPS ── */}
          {(incident.latitude != null || incident.longitude != null) && (
            <div className="field">
              <label>Coordenadas GPS</label>
              <p className="text-small text-secondary">
                Lat: {incident.latitude} — Lng: {incident.longitude}
              </p>
            </div>
          )}

          {/* ── Fecha de reporte ── */}
          <div className="field">
            <label>Fecha de reporte</label>
            <div className="flex items-center gap-xs">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                style={{ fill: "none", stroke: "var(--color-text-hint)", strokeWidth: 2, flexShrink: 0 }}
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p className="text-small text-secondary">{formatDate(incident.created_at)}</p>
            </div>
          </div>

          {/* ── Última actualización ── */}
          {incident.updated_at && (
            <div className="field">
              <label>Última actualización</label>
              <p className="text-small text-secondary">{formatDate(incident.updated_at)}</p>
            </div>
          )}

          {/* ════════════════════════════════════
              SECCIÓN: Asignación de técnico
          ════════════════════════════════════ */}
          <div
            style={{
              marginTop: "var(--space-lg)",
              borderTop: "1px solid var(--color-border-light)",
              paddingTop: "var(--space-lg)",
            }}
          >
            <h2
              style={{
                fontSize: "var(--font-size-body)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-md)",
              }}
            >
              Asignación de técnico
            </h2>

            {/* Técnico actualmente asignado */}
            {loadingAssigned ? (
              <p className="text-small text-secondary mb-4">Cargando técnico asignado...</p>
            ) : assignedTechnician ? (
              <div
                className="flex items-center gap-3 mb-4 rounded-lg px-3 py-2"
                style={{
                  background: "var(--color-primary-bg)",
                  border: "1px solid var(--color-primary-border)",
                }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-xs font-bold"
                >
                  {assignedTechnician.first_name[0]}{assignedTechnician.last_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    style={{
                      fontSize: "var(--font-size-small)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {assignedTechnician.first_name} {assignedTechnician.last_name}
                  </p>
                  <p className="text-small text-secondary">{assignedTechnician.email}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  Asignado
                </span>
              </div>
            ) : (
              <p className="text-small text-secondary mb-4">
                Este incidente aún no tiene un técnico asignado.
              </p>
            )}

            {/* Select de técnicos disponibles */}
            <div className="field">
              <label htmlFor="technician-select">
                {incident.technician_id ? "Reasignar técnico" : "Seleccionar técnico"}
              </label>

              {loadingTechnicians ? (
                <p className="text-small text-secondary">Cargando técnicos disponibles...</p>
              ) : technicians.length === 0 ? (
                <p className="text-small text-secondary">No hay técnicos disponibles en este momento.</p>
              ) : (
                <select
                  id="technician-select"
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  className="rounded-md border border-[var(--color-border-light)] px-3 py-2 text-sm w-full"
                >
                  <option value="">-- Selecciona un técnico --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} · {t.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Feedback de asignación */}
            {assignError && (
              <div className="alert-error mt-2" role="alert">
                <p>{assignError}</p>
              </div>
            )}
            {assignSuccess && (
              <div
                className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                role="status"
              >
                {assignSuccess}
              </div>
            )}

            {/* Botón asignar */}
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={handleAssignTechnician}
              disabled={
                assigning ||
                !selectedTechnicianId ||
                selectedTechnicianId === incident.technician_id
              }
            >
              {assigning ? "Asignando..." : incident.technician_id ? "Reasignar técnico" : "Asignar técnico"}
            </button>
          </div>

        </div>
      </div>

      <p className="page-footer">
        © {new Date().getFullYear()} Universidad San Buenaventura Cali · USB LENS
      </p>
    </div>
  );
}
