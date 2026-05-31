"use client";

import { useEffect, useState } from "react";
import { restoreAuthSession } from "@/utils/auth";
import { DayPicker, type DateRange } from "@daypicker/react";
import { es } from "date-fns/locale";
import { CAMPUS_ZONES } from "@/data/campusZones";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type AreaInhabilitada = {
  id: string;
  nombre: string;
  motivo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  activa: boolean;
  lugar_campus: string | null;
  latitud: number | null;
  longitud: number | null;
  registrada_por_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type FormState = {
  nombre: string;
  motivo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  lugar_campus: string;
  activa: boolean;
};

type FormErrors = {
  nombre?: string;
  motivo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
};

type IncidenteRelacionado = {
  id: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
};

type AreaIncidentesMap = Record<string, number>;

type IncidentesModalState = {
  open: boolean;
  areaId: string | null;
  areaNombre: string;
};

const DEFAULT_FORM: FormState = {
  nombre: "",
  motivo: "",
  descripcion: "",
  fecha_inicio: "",
  fecha_fin: "",
  lugar_campus: "",
  activa: true,
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  // Shift to local wall-clock time so datetime-local shows the correct local hour
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getAreaDateRange(area: AreaInhabilitada): { start: Date; end: Date | null } {
  const start = new Date(area.fecha_inicio);
  const end = area.fecha_fin ? new Date(area.fecha_fin) : null;
  return { start, end: end && !Number.isNaN(end.getTime()) ? end : null };
}

function doesAreaOverlapRange(area: AreaInhabilitada, range: DateRange): boolean {
  if (!range.from || !range.to) return true;
  const { start, end } = getAreaDateRange(area);
  if (Number.isNaN(start.getTime())) return false;
  const areaStart = start;
  const areaEnd = end ?? new Date(8640000000000000); // “infinito” para áreas sin fecha fin
  const rangeStart = startOfDay(range.from);
  const rangeEnd = endOfDay(range.to);
  return areaStart <= rangeEnd && areaEnd >= rangeStart;
}

export default function AreasInhabilitadasHome() {
  const [areas, setAreas] = useState<AreaInhabilitada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter
  const [soloActivas, setSoloActivas] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(undefined);
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>(undefined);

  const [incidentesCount, setIncidentesCount] =
  useState<AreaIncidentesMap>({});

  const [incidentesArea, setIncidentesArea] =
    useState<IncidenteRelacionado[]>([]);

  const [loadingIncidentes, setLoadingIncidentes] =
    useState(false);

  const [incidentesModal, setIncidentesModal] =
    useState<IncidentesModalState>({
      open: false,
      areaId: null,
      areaNombre: "",
    });

  useEffect(() => {
    // Propósito: ajustar UI responsiva (móvil vs escritorio) sin dependencias extra.
    // Nota: matchMedia solo existe en navegador; este componente es client-only.
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    loadAreas();
  }, [soloActivas]);

  async function getToken(): Promise<string | null> {
    const session = await restoreAuthSession();
    return session?.accessToken ?? null;
  }

  async function loadIncidentesByArea(
    areaId: string
  ): Promise<IncidenteRelacionado[]> {
    const token = await getToken();

    if (!token) return [];

    const res = await fetch(
      `${API}/api/v1/areas-inhabilitadas/${areaId}/incidentes`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(
        "No fue posible cargar los incidentes asociados."
      );
    }

    return await res.json();
  }

  async function loadAreas() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        `${API}/api/v1/areas-inhabilitadas/?page=1&limit=100&solo_activas=${soloActivas}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Error al cargar las áreas inhabilitadas.");
      const data = await res.json();

      const loadedAreas = data.items ?? [];

      setAreas(loadedAreas);

      const counts: AreaIncidentesMap = {};

      await Promise.all(
        loadedAreas.map(async (area: AreaInhabilitada) => {
          try {
            const incidents =
              await loadIncidentesByArea(area.id);

            counts[area.id] = incidents.length;
          } catch {
            counts[area.id] = 0;
          }
        })
      );

      setIncidentesCount(counts);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, fecha_inicio: new Date().toISOString().slice(0, 16) });
    setFormErrors({});
    setShowForm(true);
  }

  function openEdit(area: AreaInhabilitada) {
    setEditingId(area.id);
    setForm({
      nombre: area.nombre,
      motivo: area.motivo,
      descripcion: area.descripcion ?? "",
      fecha_inicio: toDatetimeLocal(area.fecha_inicio),
      fecha_fin: toDatetimeLocal(area.fecha_fin),
      lugar_campus: area.lugar_campus ?? "",
      activa: area.activa,
    });
    setFormErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormErrors({});
  }

  async function openIncidentesModal(
    areaId: string,
    areaNombre: string
  ) {
    try {
      setLoadingIncidentes(true);

      const incidents =
        await loadIncidentesByArea(areaId);

      setIncidentesArea(incidents);

      setIncidentesModal({
        open: true,
        areaId,
        areaNombre,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error cargando incidentes."
      );
    } finally {
      setLoadingIncidentes(false);
    }
  }

  function closeIncidentesModal() {
    setIncidentesModal({
      open: false,
      areaId: null,
      areaNombre: "",
    });

    setIncidentesArea([]);
  }

  function validateForm(): FormErrors {
    const errors: FormErrors = {};
    if (!form.nombre.trim()) errors.nombre = "El nombre es obligatorio.";
    else if (form.nombre.trim().length > 150) errors.nombre = "Máximo 150 caracteres.";
    if (!form.motivo.trim()) errors.motivo = "El motivo es obligatorio.";
    if (!form.fecha_inicio) errors.fecha_inicio = "La fecha de inicio es obligatoria.";
    if (form.fecha_fin && form.fecha_inicio && form.fecha_fin < form.fecha_inicio) {
      errors.fecha_fin = "La fecha de fin no puede ser anterior a la fecha de inicio.";
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;

      const payload: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        motivo: form.motivo.trim(),
        descripcion: form.descripcion.trim() || null,
        fecha_inicio: form.fecha_inicio ? new Date(form.fecha_inicio).toISOString() : undefined,
        fecha_fin: form.fecha_fin ? new Date(form.fecha_fin).toISOString() : null,
        lugar_campus: form.lugar_campus || null,
      };

      if (editingId) {
        payload.activa = form.activa;
      }

      const url = editingId
        ? `${API}/api/v1/areas-inhabilitadas/${editingId}`
        : `${API}/api/v1/areas-inhabilitadas/`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          typeof body?.detail === "string"
            ? body.detail
            : body?.detail?.message ?? (editingId ? "Error al actualizar." : "Error al registrar.");
        throw new Error(msg);
      }

      setFeedback(editingId ? "Área actualizada correctamente." : "Área registrada correctamente.");
      setTimeout(() => setFeedback(null), 4000);
      cancelForm();
      await loadAreas();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API}/api/v1/areas-inhabilitadas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail?.message ?? "Error al eliminar.");
      }
      setFeedback("Área eliminada correctamente.");
      setTimeout(() => setFeedback(null), 4000);
      setConfirmDeleteId(null);
      await loadAreas();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setDeleting(false);
    }
  }

  const filteredAreas =
    appliedRange?.from && appliedRange?.to
      ? areas.filter((a) => doesAreaOverlapRange(a, appliedRange))
      : areas;

  return (
    <div style={{ padding: "var(--space-lg)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-lg)",
          flexWrap: "wrap",
          gap: "var(--space-sm)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--font-size-h2)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Áreas Inhabilitadas
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-small)", margin: "4px 0 0" }}>
            Espacios del campus temporalmente fuera de servicio
          </p>
        </div>
        <button className="btn-primary" style={{ width: "auto", padding: "10px 20px" }} onClick={openCreate}>
          + Nueva Área
        </button>
      </div>

      {/* Feedback / Error */}
      {feedback && (
        <div className="alert-success" style={{ marginBottom: "var(--space-md)" }}>
          {feedback}
        </div>
      )}
      {error && (
        <div className="alert-error" style={{ marginBottom: "var(--space-md)" }}>
          {error}
        </div>
      )}

      {/* Form Panel */}
      {showForm && (
        <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
          <div className="card-stripe" />
          <div className="card-body" style={{ padding: "var(--space-lg)" }}>
            <h2 className="card-form-title" style={{ marginBottom: "var(--space-lg)" }}>
              {editingId ? "Editar Área Inhabilitada" : "Registrar Nueva Área Inhabilitada"}
            </h2>
            <form onSubmit={handleSubmit} noValidate>
              {/* Nombre */}
              <div className="field">
                <label htmlFor="nombre">Nombre del área *</label>
                <input
                  id="nombre"
                  type="text"
                  placeholder="Ej. Laboratorio de Sistemas Bloque A"
                  maxLength={150}
                  value={form.nombre}
                  onChange={(e) => { setForm({ ...form, nombre: e.target.value }); setFormErrors({ ...formErrors, nombre: undefined }); }}
                  className={formErrors.nombre ? "input-error" : ""}
                  aria-invalid={formErrors.nombre ? "true" : "false"}
                />
                {formErrors.nombre && <p className="field-error-text">{formErrors.nombre}</p>}
              </div>

              {/* Motivo */}
              <div className="field">
                <label htmlFor="motivo">Motivo de inhabilitación *</label>
                <textarea
                  id="motivo"
                  rows={3}
                  placeholder="Ej. Mantenimiento preventivo de instalaciones eléctricas"
                  value={form.motivo}
                  onChange={(e) => { setForm({ ...form, motivo: e.target.value }); setFormErrors({ ...formErrors, motivo: undefined }); }}
                  className={formErrors.motivo ? "input-error" : ""}
                  aria-invalid={formErrors.motivo ? "true" : "false"}
                  style={{ resize: "vertical" }}
                />
                {formErrors.motivo && <p className="field-error-text">{formErrors.motivo}</p>}
              </div>

              {/* Descripción */}
              <div className="field">
                <label htmlFor="descripcion">Descripción adicional</label>
                <textarea
                  id="descripcion"
                  rows={2}
                  placeholder="Información adicional (opcional)"
                  maxLength={300}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Fechas */}
              <div
                style={{
                  display: "grid",
                  gap: "var(--space-md)",
                }}
                className="dates-grid"
              >
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="fecha_inicio">Fecha de inicio *</label>
                  <input
                    id="fecha_inicio"
                    type="datetime-local"
                    value={form.fecha_inicio}
                    onChange={(e) => { setForm({ ...form, fecha_inicio: e.target.value }); setFormErrors({ ...formErrors, fecha_inicio: undefined }); }}
                    className={formErrors.fecha_inicio ? "input-error" : ""}
                    aria-invalid={formErrors.fecha_inicio ? "true" : "false"}
                  />
                  {formErrors.fecha_inicio && <p className="field-error-text">{formErrors.fecha_inicio}</p>}
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="fecha_fin">Fecha estimada de rehabilitación</label>
                  <input
                    id="fecha_fin"
                    type="datetime-local"
                    value={form.fecha_fin}
                    onChange={(e) => { setForm({ ...form, fecha_fin: e.target.value }); setFormErrors({ ...formErrors, fecha_fin: undefined }); }}
                    className={formErrors.fecha_fin ? "input-error" : ""}
                    aria-invalid={formErrors.fecha_fin ? "true" : "false"}
                  />
                  {formErrors.fecha_fin && <p className="field-error-text">{formErrors.fecha_fin}</p>}
                </div>
              </div>
              <div style={{ marginBottom: "var(--space-md)" }} />

              {/* Lugar del campus */}
              <div className="field">
                <label htmlFor="lugar_campus">Lugar del campus</label>
                <select
                  id="lugar_campus"
                  value={form.lugar_campus}
                  onChange={(e) => setForm({ ...form, lugar_campus: e.target.value })}
                >
                  <option value="">— Sin especificar —</option>
                  {CAMPUS_ZONES.map((z) => (
                    <option key={z.value} value={z.value}>{z.label}</option>
                  ))}
                  {form.lugar_campus &&
                    !CAMPUS_ZONES.some((z) => z.value === form.lugar_campus) && (
                      <option value={form.lugar_campus}>
                        {form.lugar_campus} (valor del sistema)
                      </option>
                    )}
                </select>
              </div>

              {/* Activa (solo en edición) */}
              {editingId && (
                <div className="field" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <input
                    id="activa"
                    type="checkbox"
                    checked={form.activa}
                    onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="activa" style={{ margin: 0, cursor: "pointer" }}>
                    Área actualmente inhabilitada
                  </label>
                </div>
              )}

              {/* Botones */}
              <div className="area-form-actions" style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-lg)" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "auto", padding: "10px 24px" }}
                  onClick={cancelForm}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: "auto", padding: "10px 24px" }}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar área"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filtro */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <button
            className={`text-xs px-3 py-1 rounded-full font-medium cursor-pointer border transition-all ${
              !soloActivas
                ? "border-2 border-orange-500 bg-orange-500 text-white font-semibold shadow-sm"
                : "border border-[var(--color-border-light)] bg-white text-[var(--color-text-primary)] hover:border-orange-400 hover:text-orange-500"
            }`}
            onClick={() => setSoloActivas(false)}
          >
            Todas
          </button>
          <button
            className={`text-xs px-3 py-1 rounded-full font-medium cursor-pointer border transition-all ${
              soloActivas
                ? "border-2 border-orange-500 bg-orange-500 text-white font-semibold shadow-sm"
                : "border border-[var(--color-border-light)] bg-white text-[var(--color-text-primary)] hover:border-orange-400 hover:text-orange-500"
            }`}
            onClick={() => setSoloActivas(true)}
          >
            Solo inhabilitadas
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: "auto", padding: "8px 14px" }}
            onClick={() => {
              setIsDateFilterOpen(true);
              setDraftRange(appliedRange);
            }}
          >
            {appliedRange?.from && appliedRange?.to
              ? `Filtrar: ${formatDateKey(appliedRange.from)} → ${formatDateKey(appliedRange.to)}`
              : "Filtrar por rango"}
          </button>
        </div>
      </div>

      {/* Modal: filtro por rango */}
      {isDateFilterOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtrar áreas por rango de fechas"
          onClick={() => setIsDateFilterOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-lg)",
            zIndex: 50,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(920px, 100%)", padding: "var(--space-lg)" }}
          >
            <div className="range-modal">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-md)" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "var(--font-size-h3)", fontWeight: "var(--font-weight-bold)" }}>
                  Filtrar por rango
                </h2>
                <p style={{ margin: "6px 0 0", color: "var(--color-text-secondary)", fontSize: "var(--font-size-small)" }}>
                  Selecciona una fecha de inicio y una fecha de fin.
                </p>
              </div>
              <button type="button" className="btn-secondary" style={{ width: "auto", padding: "8px 12px" }} onClick={() => setIsDateFilterOpen(false)}>
                Cerrar
              </button>
            </div>

            <div className="range-modal-body" style={{ marginTop: "var(--space-md)", display: "flex", justifyContent: "center" }}>
              <DayPicker
                mode="range"
                selected={draftRange}
                onSelect={setDraftRange}
                locale={es}
                numberOfMonths={isMobile ? 1 : 2}
                showOutsideDays
              />
            </div>

            <div style={{ marginTop: "var(--space-md)", display: "flex", justifyContent: "space-between", gap: "var(--space-sm)", flexWrap: "wrap" }}>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-small)" }}>
                {draftRange?.from && draftRange?.to ? (
                  <>
                    Rango seleccionado: <strong>{formatDateKey(draftRange.from)}</strong> → <strong>{formatDateKey(draftRange.to)}</strong>
                  </>
                ) : (
                  "Selecciona un rango para habilitar “Aplicar”."
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-link"
                  style={{ width: "auto", margin: 0 }}
                  onClick={() => {
                    setDraftRange(undefined);
                    setAppliedRange(undefined);
                  }}
                  disabled={!draftRange?.from && !draftRange?.to && !appliedRange?.from && !appliedRange?.to}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: "auto", padding: "10px 18px" }}
                  onClick={() => {
                    setAppliedRange(draftRange);
                    setIsDateFilterOpen(false);
                  }}
                  disabled={!draftRange?.from || !draftRange?.to}
                >
                  Aplicar
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--color-text-secondary)" }}>
          Cargando áreas inhabilitadas...
        </div>
      )}

      {/* Empty state */}
      {!loading && areas.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-xxl)" }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-body)" }}>
            No hay áreas inhabilitadas registradas.
          </p>
          <button className="btn-primary" style={{ width: "auto", padding: "10px 24px", marginTop: "var(--space-md)" }} onClick={openCreate}>
            Registrar la primera área
          </button>
        </div>
      )}

      {/* Estado vacío cuando hay filtro aplicado y no hay coincidencias */}
      {!loading && areas.length > 0 && filteredAreas.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-xxl)" }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-body)" }}>
            No hay áreas que coincidan con el rango seleccionado.
          </p>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: "auto", padding: "10px 24px", marginTop: "var(--space-md)" }}
            onClick={() => setAppliedRange(undefined)}
          >
            Limpiar filtro
          </button>
        </div>
      )}

      {/* Desktop table */}
      {!loading && filteredAreas.length > 0 && (
        <>
          <div className="card" style={{ overflowX: "auto" }} id="areas-table-desktop">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-small)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border-light)" }}>
                  {["Nombre", "Motivo", "Lugar", "Inicio", "Fin estimado", "Estado", "Incidentes", "Acciones"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAreas.map((area) => (
                  <tr
                    key={area.id}
                    style={{ borderBottom: "1px solid var(--color-border-light)" }}
                    className="hover:bg-gray-50"
                  >
                    <td style={{ padding: "12px 16px", fontWeight: "var(--font-weight-medium)", maxWidth: "200px" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {area.nombre}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)", maxWidth: "200px" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {area.motivo}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {area.lugar_campus ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                      {formatDate(area.fecha_inicio)}
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                      {formatDate(area.fecha_fin)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "9999px",
                          fontSize: "var(--font-size-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          background: area.activa ? "#FEE2E2" : "#DCFCE7",
                          color: area.activa ? "#DC2626" : "#16A34A",
                        }}
                      >
                        {area.activa ? "Inhabilitada" : "Rehabilitada"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            minWidth: "28px",
                            textAlign: "center",
                            borderRadius: "999px",
                            padding: "4px 8px",
                            background:
                              (incidentesCount[area.id] ?? 0) > 0
                                ? "#FEE2E2"
                                : "#F3F4F6",
                          }}
                        >
                          {incidentesCount[area.id] ?? 0}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            openIncidentesModal(
                              area.id,
                              area.nombre
                            )
                          }
                        >
                          Ver
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => openEdit(area)}
                          style={{
                            padding: "4px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--color-primary)",
                            color: "var(--color-primary)",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: "var(--font-size-xs)",
                            fontWeight: "var(--font-weight-medium)",
                          }}
                        >
                          Editar
                        </button>
                        {confirmDeleteId === area.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(area.id)}
                              disabled={deleting}
                              style={{
                                padding: "4px 12px",
                                borderRadius: "6px",
                                border: "none",
                                background: "#DC2626",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "var(--font-size-xs)",
                                fontWeight: "var(--font-weight-medium)",
                              }}
                            >
                              {deleting ? "..." : "Confirmar"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "1px solid var(--color-border-light)",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: "var(--font-size-xs)",
                              }}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(area.id)}
                            style={{
                              padding: "4px 12px",
                              borderRadius: "6px",
                              border: "1px solid #DC2626",
                              color: "#DC2626",
                              background: "transparent",
                              cursor: "pointer",
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "var(--font-weight-medium)",
                            }}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="areas-mobile-list">
            {filteredAreas.map((area) => (
              <div key={area.id} className="card" style={{ marginBottom: "var(--space-md)", padding: "var(--space-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <span
                    style={{
                      fontWeight: "var(--font-weight-semibold)",
                      fontSize: "var(--font-size-body)",
                      color: "var(--color-text-primary)",
                      flex: 1,
                      marginRight: "8px",
                    }}
                  >
                    {area.nombre}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: "9999px",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      background: area.activa ? "#FEE2E2" : "#DCFCE7",
                      color: area.activa ? "#DC2626" : "#16A34A",
                      flexShrink: 0,
                    }}
                  >
                    {area.activa ? "Inhabilitada" : "Rehabilitada"}
                  </span>
                </div>

                <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-small)", marginBottom: "8px" }}>
                  <strong>Motivo:</strong> {area.motivo}
                </p>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "var(--font-size-small)",
                    marginBottom: "4px",
                  }}
                >
                  <strong>Incidentes:</strong>{" "}
                  {incidentesCount[area.id] ?? 0}
                </p>

                <button
                  onClick={() =>
                    openIncidentesModal(
                      area.id,
                      area.nombre
                    )
                  }
                >
                  Ver incidentes
                </button>

                {area.lugar_campus && (
                  <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-small)", marginBottom: "4px" }}>
                    <strong>Lugar:</strong> {area.lugar_campus}
                  </p>
                )}

                <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-small)", marginBottom: "4px" }}>
                  <strong>Inicio:</strong> {formatDate(area.fecha_inicio)}
                </p>

                {area.fecha_fin && (
                  <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-small)", marginBottom: "4px" }}>
                    <strong>Fin estimado:</strong> {formatDate(area.fecha_fin)}
                  </p>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "var(--space-md)" }}>
                  <button
                    onClick={() => openEdit(area)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid var(--color-primary)",
                      color: "var(--color-primary)",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: "var(--font-size-small)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    Editar
                  </button>
                  {confirmDeleteId === area.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(area.id)}
                        disabled={deleting}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#DC2626",
                          color: "white",
                          cursor: "pointer",
                          fontSize: "var(--font-size-small)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        {deleting ? "..." : "Confirmar"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "8px",
                          border: "1px solid var(--color-border-light)",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "var(--font-size-small)",
                        }}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(area.id)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid #DC2626",
                        color: "#DC2626",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "var(--font-size-small)",
                        fontWeight: "var(--font-weight-medium)",
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {incidentesModal.open && (
        <div
          className="incidentes-modal-overlay"
          onClick={closeIncidentesModal}
        >
          <div
            className="card incidentes-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderRadius: "16px",
              padding: "0",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid #F3F4F6",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  Incidentes relacionados
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#6B7280",
                    }}
                  >
                    Área inhabilitada:
                  </span>
                  <span
                    style={{
                      background: "#FFF7ED",
                      color: "#EA580C",
                      border: "1px solid #FED7AA",
                      padding: "2px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {incidentesModal.areaNombre}
                  </span>
                </div>
              </div>
              {/* Botón X */}
              <button
                onClick={closeIncidentesModal}
                style={{
                  background: "#F3F4F6",
                  border: "none",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  color: "#6B7280",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#E5E7EB";
                  (e.currentTarget as HTMLButtonElement).style.color = "#111827";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#F3F4F6";
                  (e.currentTarget as HTMLButtonElement).style.color = "#6B7280";
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {loadingIncidentes ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                    padding: "40px 0",
                    color: "#9CA3AF",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "3px solid #F3F4F6",
                      borderTop: "3px solid #EA580C",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span style={{ fontSize: "14px" }}>Cargando incidentes...</span>
                </div>
              ) : incidentesArea.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 24px",
                    background: "#F9FAFB",
                    borderRadius: "12px",
                    border: "1px dashed #D1D5DB",
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
                  <p style={{ margin: 0, color: "#6B7280", fontSize: "14px" }}>
                    No existen incidentes asociados a esta área.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {incidentesArea.map((incident) => {
                    const priorityConfig = {
                      HIGH:   { bg: "#FEE2E2", color: "#DC2626", label: "Alta",  dot: "🔴" },
                      MEDIUM: { bg: "#FEF3C7", color: "#D97706", label: "Media", dot: "🟡" },
                      LOW:    { bg: "#DCFCE7", color: "#15803D", label: "Baja",  dot: "🟢" },
                    }[incident.priority] ?? { bg: "#F3F4F6", color: "#6B7280", label: incident.priority, dot: "⚪" };

                    return (
                      <div
                        key={incident.id}
                        style={{
                          border: "1px solid #E5E7EB",
                          borderLeft: `4px solid ${priorityConfig.color}`,
                          borderRadius: "12px",
                          padding: "16px",
                          background: "#FAFAFA",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 12px 0",
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          {incident.description || "Incidente sin descripción"}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            marginBottom: "12px",
                          }}
                        >
                          <span
                            style={{
                              background: "#DBEAFE",
                              color: "#1D4ED8",
                              padding: "3px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 500,
                            }}
                          >
                            {incident.status}
                          </span>
                          <span
                            style={{
                              background: priorityConfig.bg,
                              color: priorityConfig.color,
                              padding: "3px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 500,
                            }}
                          >
                            {priorityConfig.dot} {priorityConfig.label}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "4px",
                          }}
                        >
                          <span style={{ fontSize: "13px", color: "#6B7280" }}>
                            {new Date(incident.created_at).toLocaleString("es-CO", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#D1D5DB",
                              fontFamily: "monospace",
                            }}
                          >
                            #{incident.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── FOOTER ── */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #F3F4F6",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={closeIncidentesModal}
                style={{
                  padding: "10px 24px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#EA580C",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#C2410C")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#EA580C")
                }
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive style override */}
      <style>{`
        #areas-table-desktop { display: block; }
        .areas-mobile-list { display: none; }
        @media (max-width: 767px) {
          #areas-table-desktop { display: none !important; }
          .areas-mobile-list { display: block; }
        }

        /* Form responsive */
        @media (max-width: 540px) {
          .card-body {
            padding: var(--space-md) !important;
          }
          .area-form-actions {
            flex-direction: column;
          }
          .area-form-actions > button {
            width: 100% !important;
          }
        }

        .dates-grid {
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 768px) {
          .dates-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Modal filtro por rango */
        .range-modal {
          max-height: min(78vh, 720px);
          display: flex;
          flex-direction: column;
        }
        .range-modal-body {
          overflow: auto;
          padding: 6px;
        }
        .incidentes-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.45);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999;
        }

        .incidentes-modal {
          width: min(700px, 95vw);
          max-height: 80vh;
          overflow-y: auto;
        }
        @media (max-width: 640px) {
          .range-modal-body :global(.rdp) {
            width: 100%;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
