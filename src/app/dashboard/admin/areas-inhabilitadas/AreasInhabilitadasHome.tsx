"use client";

import { useEffect, useState } from "react";
import { restoreAuthSession } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const CAMPUS_OPTIONS = [
  "Biblioteca",
  "Lago",
  "Cedro",
  "Central",
  "Farrallones",
  "Parqueadero_estudiantes",
  "Parque tecnologico",
  "Naranjos",
  "Higuerones",
  "Cancha",
  "Otros",
];

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

export default function AreasInhabilitadasHome() {
  const [areas, setAreas] = useState<AreaInhabilitada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  useEffect(() => {
    loadAreas();
  }, [soloActivas]);

  async function getToken(): Promise<string | null> {
    const session = await restoreAuthSession();
    return session?.accessToken ?? null;
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
      setAreas(data.items ?? []);
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
                  aria-invalid={Boolean(formErrors.nombre)}
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
                  aria-invalid={Boolean(formErrors.motivo)}
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
                  gridTemplateColumns: "1fr 1fr",
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
                    aria-invalid={Boolean(formErrors.fecha_inicio)}
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
                    aria-invalid={Boolean(formErrors.fecha_fin)}
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
                  {CAMPUS_OPTIONS.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
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
              <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-lg)" }}>
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
      <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-md)", flexWrap: "wrap" }}>
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

      {/* Desktop table */}
      {!loading && areas.length > 0 && (
        <>
          <div className="card" style={{ overflowX: "auto" }} id="areas-table-desktop">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-small)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border-light)" }}>
                  {["Nombre", "Motivo", "Lugar", "Inicio", "Fin estimado", "Estado", "Acciones"].map((h) => (
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
                {areas.map((area) => (
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
            {areas.map((area) => (
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

      {/* Responsive style override */}
      <style>{`
        #areas-table-desktop { display: block; }
        .areas-mobile-list { display: none; }
        @media (max-width: 767px) {
          #areas-table-desktop { display: none !important; }
          .areas-mobile-list { display: block; }
        }
        .dates-grid {
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 540px) {
          .dates-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
