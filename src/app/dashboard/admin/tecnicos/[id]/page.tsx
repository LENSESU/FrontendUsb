"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";
import { IncidentPriorityBadge } from "@/components/IncidentPriorityBadge";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Technician = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

type Incident = {
  id: string;
  description: string;
  status: string;
  priority: string;
  campus_place: string;
  created_at: string;
  updated_at: string;
};

type TechnicianIncidentsResponse = {
  technician: Technician;
  incidents: Incident[];
  total: number;
};

type EditForm = {
  first_name: string;
  last_name: string;
  email: string;
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    Nuevo: "Abierto",
    En_proceso: "En progreso",
    "En progreso": "En progreso",
    Resuelto: "Resuelto",
    Cerrado: "Cerrado",
  };
  return map[status] ?? status;
}

function getStatusBadgeClass(status: string) {
  if (status === "Nuevo") return "badge-warning";
  if (status === "En_proceso" || status === "En progreso") return "badge-in-progress";
  if (status === "Resuelto") return "badge-success";
  if (status === "Cerrado") return "badge-closed";
  return "";
}

export default function TechnicianDetailPage() {
  const router = useRouter();
  const params = useParams();
  const technicianId = params?.id as string;

  const [data, setData] = useState<TechnicianIncidentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toggle active state
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [toggleFeedback, setToggleFeedback] = useState<string | null>(null);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ first_name: "", last_name: "", email: "" });
  const [editErrors, setEditErrors] = useState<Partial<EditForm>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const session = await restoreAuthSession();
      if (!session?.accessToken) throw new Error("Sesion no encontrada.");

      const res = await fetch(`${API}/api/v1/technicians/${technicianId}/incidents`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Tecnico no encontrado.");
        throw new Error("No se pudo cargar la informacion del tecnico.");
      }

      const json = (await res.json()) as TechnicianIncidentsResponse;
      setData(json);
      setEditForm({
        first_name: json.technician.first_name,
        last_name: json.technician.last_name,
        email: json.technician.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (technicianId) void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicianId]);

  async function handleToggleActive() {
    if (!data) return;
    const { technician } = data;
    const action = technician.is_active ? "deactivate" : "activate";
    const label = technician.is_active ? "desactivar" : "activar";

    const confirmed = window.confirm(
      `Estas seguro de ${label} a ${technician.first_name} ${technician.last_name}?`
    );
    if (!confirmed) return;

    setToggling(true);
    setToggleError(null);
    setToggleFeedback(null);

    try {
      const session = await restoreAuthSession();
      if (!session?.accessToken) throw new Error("Sesion no encontrada.");

      const res = await fetch(`${API}/api/v1/technicians/${technician.id}/${action}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          (typeof body?.detail === "string" && body.detail) ||
          "No se pudo actualizar el estado.";
        throw new Error(msg);
      }

      const updated = (await res.json()) as Technician;
      setData((prev) =>
        prev ? { ...prev, technician: updated } : prev
      );
      setToggleFeedback(
        updated.is_active
          ? "Tecnico activado correctamente."
          : "Tecnico desactivado correctamente."
      );
      setTimeout(() => setToggleFeedback(null), 4000);
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setToggling(false);
    }
  }

  function validateEdit(form: EditForm): Partial<EditForm> {
    const errors: Partial<EditForm> = {};
    if (!form.first_name.trim()) errors.first_name = "El nombre es requerido.";
    if (!form.last_name.trim()) errors.last_name = "El apellido es requerido.";
    if (!form.email.trim()) {
      errors.email = "El correo es requerido.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Ingresa un correo valido.";
    }
    return errors;
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateEdit(editForm);
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const session = await restoreAuthSession();
      if (!session?.accessToken) throw new Error("Sesion no encontrada.");

      const res = await fetch(`${API}/api/v1/technicians/${technicianId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          email: editForm.email.trim().toLowerCase(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          (typeof body?.detail === "string" && body.detail) ||
          "No se pudo actualizar el tecnico.";
        throw new Error(msg);
      }

      const updated = (await res.json()) as Technician;
      setData((prev) => prev ? { ...prev, technician: updated } : prev);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  // ---- Render states ----

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8">
        <span className="spinner spinner-dark" />
        <p className="text-sm text-secondary">Cargando tecnico...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button type="button" className="btn-back mb-4" onClick={() => router.push("/dashboard/admin/tecnicos")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </button>
        <div className="alert-error"><p>{error}</p></div>
      </div>
    );
  }

  if (!data) return null;

  const { technician, incidents, total } = data;

  const openIncidents = incidents.filter(
    (i) => i.status !== "Resuelto" && i.status !== "Cerrado"
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-8 pt-0 sm:p-6 lg:px-8">
      {/* Back */}
      <button type="button" className="btn-back mb-4" onClick={() => router.push("/dashboard/admin/tecnicos")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a tecnicos
      </button>

      {/* Feedback banners */}
      {toggleFeedback && (
        <div className="alert-success mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p>{toggleFeedback}</p>
        </div>
      )}
      {toggleError && (
        <div className="alert-error mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{toggleError}</p>
        </div>
      )}

      {/* Profile card */}
      <div className="card mb-5">
        <div className="card-stripe" />
        <div className="card-body">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Avatar + info */}
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "var(--radius-full)",
                  background: technician.is_active ? "var(--color-primary)" : "var(--color-text-disabled)",
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {getInitials(technician.first_name, technician.last_name)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                    {technician.first_name} {technician.last_name}
                  </h1>
                  <span className={`badge ${technician.is_active ? "badge-success" : "badge-error"}`}>
                    {technician.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{technician.email}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-hint)]">
                  Registrado el {formatDate(technician.created_at)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "auto", padding: "8px 16px", minHeight: "36px", fontSize: "12px" }}
                onClick={() => {
                  setEditing(true);
                  setSaveError(null);
                  setEditErrors({});
                  setEditForm({
                    first_name: technician.first_name,
                    last_name: technician.last_name,
                    email: technician.email,
                  });
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar datos
              </button>
              <button
                type="button"
                disabled={toggling}
                onClick={handleToggleActive}
                style={{
                  width: "auto",
                  padding: "8px 16px",
                  minHeight: "36px",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-family)",
                  fontWeight: "600",
                  borderRadius: "var(--radius-lg)",
                  border: `2px solid ${technician.is_active ? "var(--color-error)" : "var(--color-success)"}`,
                  background: "transparent",
                  color: technician.is_active ? "var(--color-error)" : "var(--color-success)",
                  cursor: toggling ? "not-allowed" : "pointer",
                  opacity: toggling ? 0.6 : 1,
                  transition: "background var(--transition-normal)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {toggling ? (
                  <>
                    <span className="spinner" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "currentColor" }} aria-hidden="true" />
                    Procesando...
                  </>
                ) : technician.is_active ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    Desactivar
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    Activar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Edit form (inline) */}
          {editing && (
            <div
              style={{
                marginTop: "var(--space-lg)",
                borderTop: "1px solid var(--color-border-light)",
                paddingTop: "var(--space-lg)",
              }}
            >
              <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
                Editar datos del tecnico
              </h2>

              {saveError && (
                <div className="alert-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p>{saveError}</p>
                </div>
              )}

              <form onSubmit={handleSaveEdit} noValidate>
                <div className="flex flex-col gap-0 sm:flex-row sm:gap-3">
                  <div className="field flex-1">
                    <label htmlFor="edit_first_name">Nombre</label>
                    <input
                      id="edit_first_name"
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => {
                        setEditForm((p) => ({ ...p, first_name: e.target.value }));
                        setEditErrors((p) => ({ ...p, first_name: undefined }));
                      }}
                      className={editErrors.first_name ? "input-error" : ""}
                      disabled={saving}
                    />
                    {editErrors.first_name && <p className="field-error-text">{editErrors.first_name}</p>}
                  </div>
                  <div className="field flex-1">
                    <label htmlFor="edit_last_name">Apellido</label>
                    <input
                      id="edit_last_name"
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => {
                        setEditForm((p) => ({ ...p, last_name: e.target.value }));
                        setEditErrors((p) => ({ ...p, last_name: undefined }));
                      }}
                      className={editErrors.last_name ? "input-error" : ""}
                      disabled={saving}
                    />
                    {editErrors.last_name && <p className="field-error-text">{editErrors.last_name}</p>}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="edit_email">Correo electronico</label>
                  <input
                    id="edit_email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => {
                      setEditForm((p) => ({ ...p, email: e.target.value }));
                      setEditErrors((p) => ({ ...p, email: undefined }));
                    }}
                    className={editErrors.email ? "input-error" : ""}
                    disabled={saving}
                  />
                  {editErrors.email && <p className="field-error-text">{editErrors.email}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button type="submit" className="btn-primary" style={{ width: "auto", padding: "10px 24px" }} disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Guardando...
                      </>
                    ) : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "auto", padding: "10px 24px" }}
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card tech-stat-card">
          <p className="stat-label">Incidentes asignados</p>
          <p className="stat-value">{total}</p>
        </div>
        <div className="card tech-stat-card">
          <p className="stat-label">Incidentes abiertos</p>
          <p className="stat-value" style={{ color: openIncidents > 0 ? "var(--color-warning)" : "var(--color-text-primary)" }}>
            {openIncidents}
          </p>
        </div>
        <div className="card tech-stat-card col-span-2 sm:col-span-1">
          <p className="stat-label">Resueltos</p>
          <p className="stat-value" style={{ color: "var(--color-success)" }}>
            {incidents.filter((i) => i.status === "Resuelto" || i.status === "Cerrado").length}
          </p>
        </div>
      </div>

      {/* Incidents list */}
      <section className="card">
        <div className="border-b border-[var(--color-border-light)] px-4 py-3">
          <h2 className="font-semibold text-[var(--color-text-primary)]">
            Historial de incidentes
            <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">
              {total} en total
            </span>
          </h2>
        </div>

        {incidents.length === 0 ? (
          <div className="card-body-center p-8">
            <p className="font-semibold text-[var(--color-text-primary)]">Sin incidentes asignados</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Este tecnico no tiene incidentes registrados aun.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[var(--color-bg-muted)] text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                    <th className="rounded-l-md px-4 py-2">ID</th>
                    <th className="px-4 py-2">Descripcion</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Prioridad</th>
                    <th className="px-4 py-2">Lugar</th>
                    <th className="rounded-r-md px-4 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="border-b border-[var(--color-border-light)] transition hover:bg-[var(--color-bg-muted)]"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="font-medium text-[var(--color-primary)] hover:underline"
                          onClick={() => router.push(`/dashboard/admin/dashboard/incidente-detalle?id=${incident.id}`)}
                        >
                          #{incident.id.slice(0, 8).toUpperCase()}
                        </button>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={incident.description}>
                        {incident.description}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${getStatusBadgeClass(incident.status)}`}>
                          {getStatusLabel(incident.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <IncidentPriorityBadge priority={incident.priority} />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {incident.campus_place}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {formatDate(incident.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-[var(--color-border-light)] md:hidden">
              {incidents.map((incident) => (
                <li key={incident.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--color-primary)]">
                      #{incident.id.slice(0, 8).toUpperCase()}
                    </p>
                    <span className="text-xs text-[var(--color-text-hint)] flex-shrink-0">
                      {formatDate(incident.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-primary)] leading-snug">
                    {incident.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`badge ${getStatusBadgeClass(incident.status)}`}>
                      {getStatusLabel(incident.status)}
                    </span>
                    <IncidentPriorityBadge priority={incident.priority} />
                    <span className="text-xs text-[var(--color-text-hint)]">{incident.campus_place}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}