"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";
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
};

type FormState = {
    nombre: string;
    motivo: string;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin: string;
    lugar_campus: string;
};

type FormErrors = {
    nombre?: string;
    motivo?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
};

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

const DEFAULT_FORM: FormState = {
    nombre: "",
    motivo: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_fin: "",
    lugar_campus: "",
};

export default function NuevaAreaPage() {
    const router = useRouter();
    const [form, setForm] = useState<FormState>({
        ...DEFAULT_FORM,
        fecha_inicio: new Date().toISOString().slice(0, 16),
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sugerencias de áreas existentes para el mismo lugar
    const [areasExistentes, setAreasExistentes] = useState<AreaInhabilitada[]>(
        [],
    );
    const [loadingAreas, setLoadingAreas] = useState(false);
    const [areaSeleccionada, setAreaSeleccionada] = useState<string | null>(
        null,
    );
    // null = sin decidir, "nueva" = ignorar y crear nueva, id = asociar a existente
    const [decision, setDecision] = useState<"nueva" | string | null>(null);

    const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function getToken(): Promise<string | null> {
        const session = await restoreAuthSession();
        return session?.accessToken ?? null;
    }

    // Cuando cambia el lugar del campus, buscar áreas vigentes en ese lugar
    useEffect(() => {
        if (!form.lugar_campus) {
            setAreasExistentes([]);
            setDecision(null);
            setAreaSeleccionada(null);
            return;
        }

        if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
        fetchTimerRef.current = setTimeout(async () => {
            setLoadingAreas(true);
            try {
                const token = await getToken();
                if (!token) return;
                // Usa el query param lugar_campus que el backend ya soporta
                const res = await fetch(
                    `${API}/api/v1/areas-inhabilitadas/?lugar_campus=${encodeURIComponent(form.lugar_campus)}&page=1&limit=20`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (!res.ok) return;
                const data = await res.json();
                const items: AreaInhabilitada[] = (data.items ?? []).filter(
                    (a: AreaInhabilitada) => a.activa, // solo las vigentes
                );
                setAreasExistentes(items);
                setDecision(null);
                setAreaSeleccionada(null);
            } catch {
                // silencioso — no bloquear el formulario
            } finally {
                setLoadingAreas(false);
            }
        }, 400);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.lugar_campus]);

    function validateForm(): FormErrors {
        const errors: FormErrors = {};
        if (!form.nombre.trim()) errors.nombre = "El nombre es obligatorio.";
        else if (form.nombre.trim().length > 150)
            errors.nombre = "Máximo 150 caracteres.";
        if (!form.motivo.trim()) errors.motivo = "El motivo es obligatorio.";
        if (!form.fecha_inicio)
            errors.fecha_inicio = "La fecha de inicio es obligatoria.";
        if (
            form.fecha_fin &&
            form.fecha_inicio &&
            form.fecha_fin < form.fecha_inicio
        )
            errors.fecha_fin =
                "La fecha de fin no puede ser anterior a la de inicio.";
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

            // Si el usuario decidió asociar a un área existente, redirigir a edición de esa área
            if (decision && decision !== "nueva") {
                router.push(
                    `/dashboard/admin/areas-inhabilitadas/${decision}/editar`,
                );
                return;
            }

            const payload: Record<string, unknown> = {
                nombre: form.nombre.trim(),
                motivo: form.motivo.trim(),
                descripcion: form.descripcion.trim() || null,
                fecha_inicio: new Date(form.fecha_inicio).toISOString(),
                fecha_fin: form.fecha_fin
                    ? new Date(form.fecha_fin).toISOString()
                    : null,
                lugar_campus: form.lugar_campus || null,
            };

            const res = await fetch(`${API}/api/v1/areas-inhabilitadas/`, {
                method: "POST",
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
                        : (body?.detail?.message ?? "Error al registrar.");
                throw new Error(msg);
            }

            router.push("/dashboard/admin/areas-inhabilitadas?registrada=1");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error inesperado.");
        } finally {
            setSaving(false);
        }
    }

    const mostrarSugerencias = areasExistentes.length > 0 && decision === null;
    const areaAsociar = areasExistentes.find((a) => a.id === decision);

    return (
        <div
            style={{
                padding: "var(--space-lg)",
                maxWidth: 760,
                margin: "0 auto",
            }}
        >
            {/* ── Breadcrumb / Back ── */}
            <button
                type="button"
                onClick={() => router.back()}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--color-text-secondary)",
                    fontSize: "var(--font-size-small)",
                    marginBottom: "var(--space-lg)",
                    transition: "color var(--transition-fast)",
                }}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--color-primary)")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.color =
                        "var(--color-text-secondary)")
                }
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                Áreas inhabilitadas
            </button>

            {/* ── Header ── */}
            <div style={{ marginBottom: "var(--space-xl)" }}>
                <h1
                    style={{
                        fontSize: "var(--font-size-h2)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--color-text-primary)",
                        margin: 0,
                    }}
                >
                    Registrar nueva área inhabilitada
                </h1>
                <p
                    style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "var(--font-size-small)",
                        margin: "6px 0 0",
                    }}
                >
                    Completa los datos del espacio del campus que quedará fuera
                    de servicio.
                </p>
            </div>

            {error && (
                <div
                    className="alert-error"
                    style={{ marginBottom: "var(--space-md)" }}
                >
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
                <div
                    className="card"
                    style={{
                        padding: "var(--space-lg)",
                        marginBottom: "var(--space-lg)",
                    }}
                >
                    <div className="card-stripe" />
                    <div style={{ padding: 0 }}>
                        <h2
                            style={{
                                fontSize: "var(--font-size-h3)",
                                fontWeight: "var(--font-weight-semibold)",
                                color: "var(--color-text-primary)",
                                margin: "0 0 var(--space-lg)",
                            }}
                        >
                            Información general
                        </h2>

                        <div className="field">
                            <label htmlFor="nombre">Nombre del área *</label>
                            <input
                                id="nombre"
                                type="text"
                                placeholder="Ej. Laboratorio de Sistemas Bloque A"
                                maxLength={150}
                                value={form.nombre}
                                onChange={(e) => {
                                    setForm({
                                        ...form,
                                        nombre: e.target.value,
                                    });
                                    setFormErrors({
                                        ...formErrors,
                                        nombre: undefined,
                                    });
                                }}
                                className={
                                    formErrors.nombre ? "input-error" : ""
                                }
                                aria-invalid={
                                    formErrors.nombre ? "true" : "false"
                                }
                            />
                            {formErrors.nombre && (
                                <p className="field-error-text">
                                    {formErrors.nombre}
                                </p>
                            )}
                        </div>

                        <div className="field">
                            <label htmlFor="motivo">
                                Motivo de inhabilitación *
                            </label>
                            <textarea
                                id="motivo"
                                rows={3}
                                placeholder="Ej. Mantenimiento preventivo de instalaciones eléctricas"
                                value={form.motivo}
                                onChange={(e) => {
                                    setForm({
                                        ...form,
                                        motivo: e.target.value,
                                    });
                                    setFormErrors({
                                        ...formErrors,
                                        motivo: undefined,
                                    });
                                }}
                                className={
                                    formErrors.motivo ? "input-error" : ""
                                }
                                aria-invalid={
                                    formErrors.motivo ? "true" : "false"
                                }
                                style={{ resize: "vertical" }}
                            />
                            {formErrors.motivo && (
                                <p className="field-error-text">
                                    {formErrors.motivo}
                                </p>
                            )}
                        </div>

                        <div className="field">
                            <label htmlFor="descripcion">
                                Descripción adicional
                            </label>
                            <textarea
                                id="descripcion"
                                rows={2}
                                placeholder="Información adicional (opcional)"
                                maxLength={300}
                                value={form.descripcion}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        descripcion: e.target.value,
                                    })
                                }
                                style={{ resize: "vertical" }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Bloque lugar + sugerencias ── */}
                <div
                    className="card"
                    style={{
                        padding: "var(--space-lg)",
                        marginBottom: "var(--space-lg)",
                    }}
                >
                    <div className="card-stripe" />
                    <h2
                        style={{
                            fontSize: "var(--font-size-h3)",
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--color-text-primary)",
                            margin: "0 0 var(--space-lg)",
                        }}
                    >
                        Ubicación
                    </h2>

                    <div
                        className="field"
                        style={{
                            marginBottom: mostrarSugerencias
                                ? "var(--space-sm)"
                                : undefined,
                        }}
                    >
                        <label htmlFor="lugar_campus">Lugar del campus</label>
                        <select
                            id="lugar_campus"
                            value={form.lugar_campus}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    lugar_campus: e.target.value,
                                })
                            }
                        >
                            <option value="">— Sin especificar —</option>
                            {CAMPUS_ZONES.map((z) => (
                                <option key={z.value} value={z.value}>
                                    {z.label}
                                </option>
                            ))}
                        </select>
                        {loadingAreas && form.lugar_campus && (
                            <p
                                style={{
                                    fontSize: "var(--font-size-xs)",
                                    color: "var(--color-text-hint)",
                                    margin: "6px 0 0",
                                }}
                            >
                                Buscando áreas existentes en esta zona…
                            </p>
                        )}
                    </div>

                    {/* ── Sugerencias de áreas vigentes ── */}
                    {mostrarSugerencias && (
                        <div className="nueva-area-sugerencias">
                            <div className="nueva-area-sugerencias-header">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>
                                    Ya existe
                                    {areasExistentes.length > 1 ? "n" : ""}{" "}
                                    <strong>
                                        {areasExistentes.length} área
                                        {areasExistentes.length > 1 ? "s" : ""}{" "}
                                        vigente
                                        {areasExistentes.length > 1 ? "s" : ""}
                                    </strong>{" "}
                                    en <strong>{form.lugar_campus}</strong>
                                </span>
                            </div>

                            <p
                                style={{
                                    fontSize: "var(--font-size-xs)",
                                    color: "var(--color-text-secondary)",
                                    margin: "0 0 var(--space-sm)",
                                }}
                            >
                                ¿Deseas asociar tu incidente a una de estas
                                áreas o registrar una nueva?
                            </p>

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                    marginBottom: "var(--space-md)",
                                }}
                            >
                                {areasExistentes.map((area) => (
                                    <label
                                        key={area.id}
                                        className={`nueva-area-sugerencia-item${areaSeleccionada === area.id ? " selected" : ""}`}
                                        htmlFor={`area-opt-${area.id}`}
                                    >
                                        <input
                                            id={`area-opt-${area.id}`}
                                            type="radio"
                                            name="area-existente"
                                            value={area.id}
                                            checked={
                                                areaSeleccionada === area.id
                                            }
                                            onChange={() =>
                                                setAreaSeleccionada(area.id)
                                            }
                                            style={{ flexShrink: 0 }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontWeight:
                                                        "var(--font-weight-semibold)",
                                                    fontSize:
                                                        "var(--font-size-small)",
                                                    color: "var(--color-text-primary)",
                                                }}
                                            >
                                                {area.nombre}
                                            </p>
                                            <p
                                                style={{
                                                    margin: "2px 0 0",
                                                    fontSize:
                                                        "var(--font-size-xs)",
                                                    color: "var(--color-text-secondary)",
                                                }}
                                            >
                                                {area.motivo}
                                            </p>
                                            <p
                                                style={{
                                                    margin: "4px 0 0",
                                                    fontSize:
                                                        "var(--font-size-xs)",
                                                    color: "var(--color-text-hint)",
                                                }}
                                            >
                                                Desde{" "}
                                                {formatDate(area.fecha_inicio)}
                                                {area.fecha_fin
                                                    ? ` · Hasta ${formatDate(area.fecha_fin)}`
                                                    : " · Sin fecha de fin"}
                                            </p>
                                        </div>
                                        <span
                                            style={{
                                                flexShrink: 0,
                                                display: "inline-block",
                                                padding: "3px 8px",
                                                borderRadius:
                                                    "var(--radius-full)",
                                                fontSize: "var(--font-size-xs)",
                                                fontWeight:
                                                    "var(--font-weight-semibold)",
                                                background:
                                                    "var(--color-error-bg)",
                                                color: "var(--color-error)",
                                                border: "1px solid var(--color-error-border)",
                                            }}
                                        >
                                            Vigente
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: 10,
                                    flexWrap: "wrap",
                                }}
                            >
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{
                                        width: "auto",
                                        padding: "9px 20px",
                                        fontSize: "var(--font-size-small)",
                                    }}
                                    disabled={!areaSeleccionada}
                                    onClick={() => {
                                        if (areaSeleccionada)
                                            setDecision(areaSeleccionada);
                                    }}
                                >
                                    Usar área seleccionada
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{
                                        width: "auto",
                                        padding: "9px 20px",
                                        fontSize: "var(--font-size-small)",
                                    }}
                                    onClick={() => setDecision("nueva")}
                                >
                                    Ignorar y crear nueva
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Confirmación: asociar a área existente */}
                    {decision && decision !== "nueva" && areaAsociar && (
                        <div className="nueva-area-decision-box nueva-area-decision-existente">
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 10,
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="var(--color-primary)"
                                    strokeWidth="2"
                                    style={{ flexShrink: 0, marginTop: 2 }}
                                >
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                                <div style={{ flex: 1 }}>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontWeight:
                                                "var(--font-weight-semibold)",
                                            fontSize: "var(--font-size-small)",
                                            color: "var(--color-text-primary)",
                                        }}
                                    >
                                        Se asociará al área:{" "}
                                        <em>{areaAsociar.nombre}</em>
                                    </p>
                                    <p
                                        style={{
                                            margin: "4px 0 0",
                                            fontSize: "var(--font-size-xs)",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        Al confirmar serás redirigido a la
                                        edición de esa área para completar la
                                        asociación.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDecision(null);
                                        setAreaSeleccionada(null);
                                    }}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--color-text-hint)",
                                        padding: 0,
                                    }}
                                    aria-label="Cambiar decisión"
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Confirmación: crear nueva (ignorando sugerencias) */}
                    {decision === "nueva" && areasExistentes.length > 0 && (
                        <div className="nueva-area-decision-box nueva-area-decision-nueva">
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    style={{ flexShrink: 0 }}
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 8 12 12 14 14" />
                                </svg>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: "var(--font-size-xs)",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    Se creará una nueva área aunque ya existen
                                    registros vigentes para{" "}
                                    <strong>{form.lugar_campus}</strong>.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setDecision(null)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--color-text-hint)",
                                        padding: 0,
                                        marginLeft: "auto",
                                    }}
                                    aria-label="Volver a las sugerencias"
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Bloque fechas ── */}
                {(decision === "nueva" || areasExistentes.length === 0) && (
                    <div
                        className="card"
                        style={{
                            padding: "var(--space-lg)",
                            marginBottom: "var(--space-lg)",
                        }}
                    >
                        <div className="card-stripe" />
                        <h2
                            style={{
                                fontSize: "var(--font-size-h3)",
                                fontWeight: "var(--font-weight-semibold)",
                                color: "var(--color-text-primary)",
                                margin: "0 0 var(--space-lg)",
                            }}
                        >
                            Vigencia
                        </h2>
                        <div className="areas-dates-grid">
                            <div className="field" style={{ marginBottom: 0 }}>
                                <label htmlFor="fecha_inicio">
                                    Fecha de inicio *
                                </label>
                                <input
                                    id="fecha_inicio"
                                    type="datetime-local"
                                    value={form.fecha_inicio}
                                    onChange={(e) => {
                                        setForm({
                                            ...form,
                                            fecha_inicio: e.target.value,
                                        });
                                        setFormErrors({
                                            ...formErrors,
                                            fecha_inicio: undefined,
                                        });
                                    }}
                                    className={
                                        formErrors.fecha_inicio
                                            ? "input-error"
                                            : ""
                                    }
                                    aria-invalid={
                                        formErrors.fecha_inicio
                                            ? "true"
                                            : "false"
                                    }
                                />
                                {formErrors.fecha_inicio && (
                                    <p className="field-error-text">
                                        {formErrors.fecha_inicio}
                                    </p>
                                )}
                            </div>
                            <div className="field" style={{ marginBottom: 0 }}>
                                <label htmlFor="fecha_fin">
                                    Fecha estimada de rehabilitación
                                </label>
                                <input
                                    id="fecha_fin"
                                    type="datetime-local"
                                    value={form.fecha_fin}
                                    onChange={(e) => {
                                        setForm({
                                            ...form,
                                            fecha_fin: e.target.value,
                                        });
                                        setFormErrors({
                                            ...formErrors,
                                            fecha_fin: undefined,
                                        });
                                    }}
                                    className={
                                        formErrors.fecha_fin
                                            ? "input-error"
                                            : ""
                                    }
                                    aria-invalid={
                                        formErrors.fecha_fin ? "true" : "false"
                                    }
                                />
                                {formErrors.fecha_fin && (
                                    <p className="field-error-text">
                                        {formErrors.fecha_fin}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Acciones ── */}
                <div
                    style={{
                        display: "flex",
                        gap: "var(--space-md)",
                        justifyContent: "flex-end",
                        flexWrap: "wrap",
                    }}
                >
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ width: "auto", padding: "10px 24px" }}
                        onClick={() => router.back()}
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: "auto", padding: "10px 28px" }}
                        disabled={saving}
                    >
                        {saving
                            ? "Guardando..."
                            : decision && decision !== "nueva"
                              ? "Ir a área existente →"
                              : "Registrar área"}
                    </button>
                </div>
            </form>

            <style>{`
                .areas-dates-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
                @media (max-width: 540px) { .areas-dates-grid { grid-template-columns: 1fr; } }

                .nueva-area-sugerencias {
                    background: var(--color-warning-bg, #fffbeb);
                    border: 1px solid var(--color-warning-border, #fcd34d);
                    border-radius: var(--radius-md);
                    padding: var(--space-md);
                    margin-top: var(--space-sm);
                }
                .nueva-area-sugerencias-header {
                    display: flex; align-items: center; gap: 8px;
                    font-size: var(--font-size-small);
                    color: var(--color-text-primary);
                    margin-bottom: var(--space-sm);
                    font-weight: var(--font-weight-medium);
                }

                .nueva-area-sugerencia-item {
                    display: flex; align-items: flex-start; gap: 12px;
                    padding: var(--space-sm) var(--space-md);
                    border: 1px solid var(--color-border-light);
                    border-radius: var(--radius-sm);
                    background: var(--color-bg-card);
                    cursor: pointer;
                    transition: border-color var(--transition-fast), background var(--transition-fast);
                }
                .nueva-area-sugerencia-item:hover {
                    border-color: var(--color-primary);
                    background: var(--color-bg-muted);
                }
                .nueva-area-sugerencia-item.selected {
                    border-color: var(--color-primary);
                    background: var(--color-primary-bg, rgba(var(--color-primary-rgb, 59 130 246) / 0.06));
                }

                .nueva-area-decision-box {
                    margin-top: var(--space-sm);
                    padding: var(--space-sm) var(--space-md);
                    border-radius: var(--radius-sm);
                    border: 1px solid;
                }
                .nueva-area-decision-existente {
                    background: var(--color-primary-bg, rgba(59, 130, 246, 0.06));
                    border-color: var(--color-primary);
                }
                .nueva-area-decision-nueva {
                    background: var(--color-bg-muted);
                    border-color: var(--color-border-light);
                }
            `}</style>
        </div>
    );
}
