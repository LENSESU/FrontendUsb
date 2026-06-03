"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";
import { CAMPUS_ZONES } from "@/data/campusZones";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type AreaVigente = {
    id: string;
    nombre: string;
    motivo: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    lugar_campus: string | null;
};

type IncidenteAsignado = {
    id: string;
    description: string;
    status: string;
    priority: string;
    campus_place: string | null;
    created_at: string;
    technician_id: string | null;
};

type FormState = {
    nombre: string;
    motivo: string;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin: string;
    lugar_campus: string;
    incidente_id: string;
};

type FormErrors = {
    nombre?: string;
    motivo?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    incidente_id?: string;
};

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateShort(iso: string): string {
    return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

const PRIORITY_LABEL: Record<string, string> = {
    Alta: "Alta",
    Media: "Media",
    Baja: "Baja",
};

const STATUS_LABEL: Record<string, string> = {
    Nuevo: "Nuevo",
    En_proceso: "En proceso",
};

const DEFAULT_FORM: FormState = {
    nombre: "",
    motivo: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_fin: "",
    lugar_campus: "",
    incidente_id: "",
};

export default function NuevaAreaPage({
    backPath,
    successPath,
    userRole,
}: {
    backPath?: string;
    successPath?: string;
    userRole?: string;
} = {}) {
    const router = useRouter();
    const isTechnician = userRole === "Technician";

    const [form, setForm] = useState<FormState>({
        ...DEFAULT_FORM,
        fecha_inicio: new Date().toISOString().slice(0, 16),
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [areasVigentes, setAreasVigentes] = useState<AreaVigente[]>([]);
    const [loadingAreas, setLoadingAreas] = useState(false);

    const [incidentes, setIncidentes] = useState<IncidenteAsignado[]>([]);
    const [loadingIncidentes, setLoadingIncidentes] = useState(false);
    const [incidentesError, setIncidentesError] = useState<string | null>(null);

    const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function getToken(): Promise<string | null> {
        const session = await restoreAuthSession();
        return session?.accessToken ?? null;
    }

    function mapIncident(i: {
        id: string;
        description: string;
        status: string;
        priority: string;
        campus_place?: string | null;
        technician_id?: string | null;
        created_at: string;
    }): IncidenteAsignado {
        return {
            id: i.id,
            description: i.description,
            status: i.status,
            priority: i.priority,
            campus_place: i.campus_place ?? null,
            technician_id: i.technician_id ?? null,
            created_at: i.created_at,
        };
    }

    // Cargar incidentes:
    // - Technician: al montar, todos sus incidentes activos asignados
    // - Administrator: cuando cambia lugar_campus, todos los activos filtrados en cliente
    useEffect(() => {
        if (!isTechnician) return;
        (async () => {
            setLoadingIncidentes(true);
            setIncidentesError(null);
            try {
                const session = await restoreAuthSession();
                const token = session?.accessToken ?? null;
                if (!token) return;
                const meRes = await fetch(`${API}/api/v1/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const currentUserId: string | null = meRes.ok
                    ? ((await meRes.json()).user_id ?? null)
                    : null;

                const [r1, r2] = await Promise.all([
                    fetch(`${API}/api/v1/incidents/?estado=Nuevo&limit=100`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(
                        `${API}/api/v1/incidents/?estado=En_proceso&limit=100`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    ),
                ]);
                const [d1, d2] = await Promise.all([
                    r1.ok ? r1.json() : { items: [] },
                    r2.ok ? r2.json() : { items: [] },
                ]);
                const all: IncidenteAsignado[] = [
                    ...(d1.items ?? []).map(mapIncident),
                    ...(d2.items ?? []).map(mapIncident),
                ];
                // Filtrar solo los asignados al técnico autenticado
                const mine = currentUserId
                    ? all.filter((i) => i.technician_id === currentUserId)
                    : all;
                setIncidentes(mine);
            } catch {
                setIncidentesError("Error al conectar con el servidor.");
            } finally {
                setLoadingIncidentes(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTechnician]);
    // Admin: cargar incidentes activos cuando cambia lugar_campus
    useEffect(() => {
        if (isTechnician || userRole !== "Administrator") return;
        if (!form.lugar_campus) {
            setIncidentes([]);
            return;
        }
        const timer = setTimeout(async () => {
            setLoadingIncidentes(true);
            setIncidentesError(null);
            try {
                const token = await getToken();
                if (!token) return;

                const [res1, res2] = await Promise.all([
                    fetch(`${API}/api/v1/incidents/?estado=Nuevo&limit=100`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(
                        `${API}/api/v1/incidents/?estado=En_proceso&limit=100`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    ),
                ]);

                const [d1, d2] = await Promise.all([
                    res1.ok ? res1.json() : { items: [] },
                    res2.ok ? res2.json() : { items: [] },
                ]);

                const all: IncidenteAsignado[] = [
                    ...(d1.items ?? []).map(mapIncident),
                    ...(d2.items ?? []).map(mapIncident),
                ];

                // Filtrar en cliente por campus_place
                setIncidentes(
                    all.filter(
                        (i) =>
                            i.campus_place?.toLowerCase() ===
                            form.lugar_campus.toLowerCase(),
                    ),
                );
            } catch {
                setIncidentesError("Error al conectar con el servidor.");
            } finally {
                setLoadingIncidentes(false);
            }
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.lugar_campus, userRole]);

    // Cargar áreas vigentes por zona
    useEffect(() => {
        if (!form.lugar_campus) {
            setAreasVigentes([]);
            return;
        }
        if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
        fetchTimerRef.current = setTimeout(async () => {
            setLoadingAreas(true);
            try {
                const token = await getToken();
                if (!token) return;
                const res = await fetch(
                    `${API}/api/v1/areas-inhabilitadas/?lugar_campus=${encodeURIComponent(form.lugar_campus)}&page=1&limit=20`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (!res.ok) return;
                const data = await res.json();
                setAreasVigentes(
                    (data.items ?? []).filter(
                        (a: AreaVigente & { activa: boolean }) => a.activa,
                    ),
                );
            } catch {
                // silencioso
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
        if (isTechnician && !form.incidente_id)
            errors.incidente_id =
                "Debes seleccionar el incidente asociado a esta área.";
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
                fecha_inicio: new Date(form.fecha_inicio).toISOString(),
                fecha_fin: form.fecha_fin
                    ? new Date(form.fecha_fin).toISOString()
                    : null,
                lugar_campus: form.lugar_campus || null,
            };

            if (form.incidente_id) {
                payload.incidente_id = form.incidente_id;
            }

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

            router.push(
                successPath ??
                    "/dashboard/admin/areas-inhabilitadas?registrada=1",
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error inesperado.");
        } finally {
            setSaving(false);
        }
    }

    // Incidente seleccionado (para mostrar resumen)
    const incidenteSeleccionado = incidentes.find(
        (i) => i.id === form.incidente_id,
    );

    return (
        <div
            className="container"
            style={{ paddingBottom: "var(--space-xl)", maxWidth: 760 }}
        >
            {/* Breadcrumb */}
            <button
                type="button"
                className="btn-back"
                onClick={() =>
                    backPath ? router.push(backPath) : router.back()
                }
            >
                <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                Áreas inhabilitadas
            </button>

            {/* Header */}
            <div style={{ marginBottom: "var(--space-xl)" }}>
                <h1>Registrar área inhabilitada</h1>
                <p
                    className="text-secondary text-small"
                    style={{ marginTop: 6 }}
                >
                    Completa los datos del espacio del campus que quedará fuera
                    de servicio.
                </p>
            </div>

            {error && (
                <div className="alert-error">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
                {/* ── Incidente asociado ── */}
                {/* Técnico: siempre visible, obligatorio */}
                {/* Admin: aparece al seleccionar lugar_campus, opcional */}
                {(isTechnician ||
                    (userRole === "Administrator" && !!form.lugar_campus)) && (
                    <div
                        className="card"
                        style={{ marginBottom: "var(--space-lg)" }}
                    >
                        <div className="card-stripe" />
                        <div className="card-body">
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "baseline",
                                    gap: "var(--space-sm)",
                                    marginBottom: "var(--space-sm)",
                                }}
                            >
                                <h2
                                    className="card-form-title"
                                    style={{ marginBottom: 0 }}
                                >
                                    Incidente asociado
                                </h2>
                                {!isTechnician && (
                                    <span
                                        className="text-hint text-xs"
                                        style={{
                                            fontWeight:
                                                "var(--font-weight-medium)",
                                        }}
                                    >
                                        opcional
                                    </span>
                                )}
                            </div>
                            <p
                                className="text-secondary text-small"
                                style={{ marginBottom: "var(--space-lg)" }}
                            >
                                {isTechnician
                                    ? "Selecciona el incidente activo asignado a ti que motiva esta inhabilitación."
                                    : `Incidentes activos en ${form.lugar_campus}. Puedes asociar uno o continuar sin seleccionar.`}
                            </p>

                            {loadingIncidentes && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "var(--space-sm)",
                                        padding: "var(--space-md) 0",
                                    }}
                                >
                                    <span className="spinner spinner-dark" />
                                    <p className="text-secondary text-small">
                                        Cargando incidentes…
                                    </p>
                                </div>
                            )}

                            {!loadingIncidentes && incidentesError && (
                                <div className="alert-error">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line
                                            x1="12"
                                            y1="16"
                                            x2="12.01"
                                            y2="16"
                                        />
                                    </svg>
                                    <p>{incidentesError}</p>
                                </div>
                            )}

                            {!loadingIncidentes &&
                                !incidentesError &&
                                incidentes.length === 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "var(--space-sm)",
                                            maxHeight: 320,
                                            overflowY: "auto",
                                            paddingRight: 2,
                                        }}
                                    >
                                        <p
                                            className="text-secondary text-small"
                                            style={{ margin: 0 }}
                                        >
                                            {isTechnician
                                                ? "No tienes incidentes activos asignados en este momento."
                                                : `No hay incidentes activos en ${form.lugar_campus}.`}
                                        </p>
                                    </div>
                                )}

                            {!loadingIncidentes &&
                                !incidentesError &&
                                incidentes.length > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "var(--space-sm)",
                                        }}
                                    >
                                        {incidentes.map((inc) => {
                                            const selected =
                                                form.incidente_id === inc.id;
                                            return (
                                                <button
                                                    key={inc.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm({
                                                            ...form,
                                                            incidente_id:
                                                                selected
                                                                    ? ""
                                                                    : inc.id,
                                                        });
                                                        setFormErrors({
                                                            ...formErrors,
                                                            incidente_id:
                                                                undefined,
                                                        });
                                                    }}
                                                    style={{
                                                        display: "flex",
                                                        alignItems:
                                                            "flex-start",
                                                        justifyContent:
                                                            "space-between",
                                                        gap: "var(--space-md)",
                                                        width: "100%",
                                                        textAlign: "left",
                                                        background: selected
                                                            ? "var(--color-primary-bg)"
                                                            : "var(--color-bg-card)",
                                                        border: selected
                                                            ? "2px solid var(--color-primary)"
                                                            : "1px solid var(--color-border-light)",
                                                        borderRadius:
                                                            "var(--radius-sm)",
                                                        padding:
                                                            "12px var(--space-md)",
                                                        cursor: "pointer",
                                                        transition:
                                                            "border-color var(--transition-normal), background var(--transition-normal)",
                                                    }}
                                                    aria-pressed={selected}
                                                >
                                                    <div
                                                        style={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontSize:
                                                                    "var(--font-size-small)",
                                                                fontWeight:
                                                                    "var(--font-weight-semibold)",
                                                                color: selected
                                                                    ? "var(--color-primary)"
                                                                    : "var(--color-text-primary)",
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {inc.description}
                                                        </p>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                flexWrap:
                                                                    "wrap",
                                                                gap: "var(--space-xs)",
                                                                marginTop: 6,
                                                            }}
                                                        >
                                                            {inc.campus_place && (
                                                                <span
                                                                    style={{
                                                                        fontSize:
                                                                            "var(--font-size-xs)",
                                                                        color: "var(--color-text-hint)",
                                                                    }}
                                                                >
                                                                    {
                                                                        inc.campus_place
                                                                    }
                                                                    {" ·"}
                                                                </span>
                                                            )}
                                                            <span
                                                                style={{
                                                                    fontSize:
                                                                        "var(--font-size-xs)",
                                                                    color: "var(--color-text-hint)",
                                                                }}
                                                            >
                                                                {formatDateShort(
                                                                    inc.created_at,
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection:
                                                                "column",
                                                            alignItems:
                                                                "flex-end",
                                                            gap: "var(--space-xs)",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <span
                                                            className={`badge badge-${
                                                                inc.priority ===
                                                                "Alta"
                                                                    ? "priority-alta"
                                                                    : inc.priority ===
                                                                        "Media"
                                                                      ? "priority-media"
                                                                      : "priority-baja"
                                                            }`}
                                                        >
                                                            {PRIORITY_LABEL[
                                                                inc.priority
                                                            ] ?? inc.priority}
                                                        </span>
                                                        <span
                                                            className={`badge ${inc.status === "En_proceso" ? "badge-in-progress" : ""}`}
                                                        >
                                                            {STATUS_LABEL[
                                                                inc.status
                                                            ] ?? inc.status}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                            {formErrors.incidente_id && (
                                <p
                                    className="field-error-text"
                                    style={{ marginTop: "var(--space-sm)" }}
                                >
                                    {formErrors.incidente_id}
                                </p>
                            )}

                            {incidenteSeleccionado && (
                                <div
                                    className="alert-success"
                                    style={{
                                        marginTop: "var(--space-md)",
                                        marginBottom: 0,
                                    }}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <p>
                                        Incidente seleccionado:{" "}
                                        <strong>
                                            {incidenteSeleccionado.description}
                                        </strong>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Información general ── */}
                <div
                    className="card"
                    style={{ marginBottom: "var(--space-lg)" }}
                >
                    <div className="card-stripe" />
                    <div className="card-body">
                        <h2 className="card-form-title">Información general</h2>

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
                            />
                            {formErrors.motivo && (
                                <p className="field-error-text">
                                    {formErrors.motivo}
                                </p>
                            )}
                        </div>

                        <div className="field" style={{ marginBottom: 0 }}>
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
                            />
                        </div>
                    </div>
                </div>

                {/* ── Ubicación ── */}
                <div
                    className="card"
                    style={{ marginBottom: "var(--space-lg)" }}
                >
                    <div className="card-stripe" />
                    <div className="card-body">
                        <h2 className="card-form-title">Ubicación</h2>

                        <div
                            className="field"
                            style={{
                                marginBottom:
                                    areasVigentes.length > 0
                                        ? "var(--space-sm)"
                                        : undefined,
                            }}
                        >
                            <label htmlFor="lugar_campus">
                                Lugar del campus
                            </label>
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
                                <p className="field-hint">
                                    Buscando áreas existentes en esta zona…
                                </p>
                            )}
                        </div>

                        {/* Aviso informativo de áreas vigentes */}
                        {areasVigentes.length > 0 && (
                            <div
                                className="alert-warning"
                                style={{
                                    alignItems: "flex-start",
                                    flexDirection: "column",
                                    gap: "var(--space-sm)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="var(--color-warning)"
                                        strokeWidth="2"
                                        style={{ flexShrink: 0 }}
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line
                                            x1="12"
                                            y1="16"
                                            x2="12.01"
                                            y2="16"
                                        />
                                    </svg>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: "var(--font-size-small)",
                                            color: "#856404",
                                            fontWeight:
                                                "var(--font-weight-semibold)",
                                        }}
                                    >
                                        Ya existe
                                        {areasVigentes.length > 1
                                            ? "n"
                                            : ""}{" "}
                                        {areasVigentes.length} área
                                        {areasVigentes.length > 1
                                            ? "s"
                                            : ""}{" "}
                                        vigente
                                        {areasVigentes.length > 1
                                            ? "s"
                                            : ""} en{" "}
                                        <strong>{form.lugar_campus}</strong>
                                    </p>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                        width: "100%",
                                    }}
                                >
                                    {areasVigentes.map((area) => (
                                        <div
                                            key={area.id}
                                            style={{
                                                background:
                                                    "var(--color-bg-card)",
                                                border: "1px solid var(--color-warning-border)",
                                                borderRadius:
                                                    "var(--radius-sm)",
                                                padding: "10px 12px",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                gap: 12,
                                            }}
                                        >
                                            <div
                                                style={{ flex: 1, minWidth: 0 }}
                                            >
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
                                                    {formatDate(
                                                        area.fecha_inicio,
                                                    )}
                                                    {area.fecha_fin
                                                        ? ` · Hasta ${formatDate(area.fecha_fin)}`
                                                        : " · Sin fecha de fin"}
                                                </p>
                                            </div>
                                            <span
                                                className="badge badge-error"
                                                style={{
                                                    flexShrink: 0,
                                                    fontSize:
                                                        "var(--font-size-xs)",
                                                }}
                                            >
                                                Vigente
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: "var(--font-size-xs)",
                                        color: "#856404",
                                    }}
                                >
                                    Puedes continuar si el espacio afectado es
                                    diferente.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Vigencia ── */}
                <div
                    className="card"
                    style={{ marginBottom: "var(--space-lg)" }}
                >
                    <div className="card-stripe" />
                    <div className="card-body">
                        <h2 className="card-form-title">Vigencia</h2>
                        <div className="nueva-area-dates-grid">
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
                </div>

                {/* ── Acciones ── */}
                <div className="nueva-area-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ width: "auto", padding: "10px 24px" }}
                        onClick={() =>
                            backPath ? router.push(backPath) : router.back()
                        }
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
                        {saving ? "Guardando…" : "Registrar área"}
                    </button>
                </div>
            </form>

            <style>{`
                .nueva-area-dates-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-md);
                }
                @media (max-width: 540px) {
                    .nueva-area-dates-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .nueva-area-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-md);
                    flex-wrap: wrap;
                }
                @media (max-width: 480px) {
                    .nueva-area-actions {
                        flex-direction: column-reverse;
                    }
                    .nueva-area-actions button {
                        width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}
