"use client";

import { useEffect, useState } from "react";
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
    latitud: number | null;
    longitud: number | null;
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

function toDatetimeLocal(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

export default function EditarAreaPage({
    areaId,
    backPath,
    successPath,
}: {
    areaId: string;
    backPath?: string;
    successPath?: string;
}) {
    const router = useRouter();
    const [area, setArea] = useState<AreaInhabilitada | null>(null);
    const [loadingArea, setLoadingArea] = useState(true);
    const [form, setForm] = useState<FormState | null>(null);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function getToken(): Promise<string | null> {
        const session = await restoreAuthSession();
        return session?.accessToken ?? null;
    }

    useEffect(() => {
        async function loadArea() {
            setLoadingArea(true);
            setError(null);
            try {
                const token = await getToken();
                if (!token) return;
                const res = await fetch(
                    `${API}/api/v1/areas-inhabilitadas/${areaId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );
                if (!res.ok) {
                    if (res.status === 404)
                        throw new Error("Área no encontrada.");
                    throw new Error("Error al cargar el área.");
                }
                const data: AreaInhabilitada = await res.json();
                setArea(data);
                setForm({
                    nombre: data.nombre,
                    motivo: data.motivo,
                    descripcion: data.descripcion ?? "",
                    fecha_inicio: toDatetimeLocal(data.fecha_inicio),
                    fecha_fin: toDatetimeLocal(data.fecha_fin),
                    lugar_campus: data.lugar_campus ?? "",
                    activa: data.activa,
                });
            } catch (e) {
                setError(e instanceof Error ? e.message : "Error inesperado.");
            } finally {
                setLoadingArea(false);
            }
        }
        loadArea();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [areaId]);

    function validateForm(): FormErrors {
        if (!form) return {};
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
        if (!form) return;
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
                activa: form.activa,
            };

            const res = await fetch(
                `${API}/api/v1/areas-inhabilitadas/${areaId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg =
                    typeof body?.detail === "string"
                        ? body.detail
                        : (body?.detail?.message ?? "Error al actualizar.");
                throw new Error(msg);
            }

            router.push(
                `/dashboard/admin/areas-inhabilitadas/${areaId}?actualizada=1`,
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error inesperado.");
        } finally {
            setSaving(false);
        }
    }

    if (loadingArea) {
        return (
            <div
                style={{
                    padding: "var(--space-lg)",
                    maxWidth: 760,
                    margin: "0 auto",
                }}
            >
                <div
                    style={{
                        height: 18,
                        width: 140,
                        background: "var(--color-bg-muted)",
                        borderRadius: 4,
                        marginBottom: "var(--space-lg)",
                    }}
                />
                <div
                    style={{
                        height: 32,
                        width: "50%",
                        background: "var(--color-bg-muted)",
                        borderRadius: 4,
                        marginBottom: "var(--space-xl)",
                    }}
                />
                <div
                    className="card"
                    style={{ height: 300, background: "var(--color-bg-muted)" }}
                />
            </div>
        );
    }

    if (!form || !area) {
        return (
            <div style={{ padding: "var(--space-lg)" }}>
                <div className="alert-error">
                    <p>{error ?? "No se pudo cargar el área."}</p>
                </div>
                <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "auto", marginTop: "var(--space-md)" }}
                    onClick={() => router.back()}
                >
                    Volver
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                padding: "var(--space-lg)",
                maxWidth: 760,
                margin: "0 auto",
            }}
        >
            {/* Back */}
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
                {area.nombre}
            </button>

            {/* Header */}
            <div style={{ marginBottom: "var(--space-xl)" }}>
                <h1
                    style={{
                        fontSize: "var(--font-size-h2)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--color-text-primary)",
                        margin: 0,
                    }}
                >
                    Editar área inhabilitada
                </h1>
                <p
                    style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "var(--font-size-small)",
                        margin: "6px 0 0",
                    }}
                >
                    Modifica los datos del área <strong>{area.nombre}</strong>.
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
                {/* Información general */}
                <div
                    className="card"
                    style={{
                        padding: "var(--space-lg)",
                        marginBottom: "var(--space-lg)",
                    }}
                >
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
                            maxLength={150}
                            value={form.nombre}
                            onChange={(e) => {
                                setForm({ ...form, nombre: e.target.value });
                                setFormErrors({
                                    ...formErrors,
                                    nombre: undefined,
                                });
                            }}
                            className={formErrors.nombre ? "input-error" : ""}
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
                            value={form.motivo}
                            onChange={(e) => {
                                setForm({ ...form, motivo: e.target.value });
                                setFormErrors({
                                    ...formErrors,
                                    motivo: undefined,
                                });
                            }}
                            className={formErrors.motivo ? "input-error" : ""}
                            style={{ resize: "vertical" }}
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

                {/* Ubicación */}
                <div
                    className="card"
                    style={{
                        padding: "var(--space-lg)",
                        marginBottom: "var(--space-lg)",
                    }}
                >
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
                    <div className="field" style={{ marginBottom: 0 }}>
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
                            {form.lugar_campus &&
                                !CAMPUS_ZONES.some(
                                    (z) => z.value === form.lugar_campus,
                                ) && (
                                    <option value={form.lugar_campus}>
                                        {form.lugar_campus} (valor del sistema)
                                    </option>
                                )}
                        </select>
                    </div>
                </div>

                {/* Vigencia */}
                <div
                    className="card"
                    style={{
                        padding: "var(--space-lg)",
                        marginBottom: "var(--space-lg)",
                    }}
                >
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
                    <div className="editar-area-dates-grid">
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
                                    formErrors.fecha_inicio ? "input-error" : ""
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
                                    formErrors.fecha_fin ? "input-error" : ""
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

                {/* Estado */}
                <div
                    className="card"
                    style={{
                        padding: "var(--space-lg)",
                        marginBottom: "var(--space-lg)",
                    }}
                >
                    <h2
                        style={{
                            fontSize: "var(--font-size-h3)",
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--color-text-primary)",
                            margin: "0 0 var(--space-md)",
                        }}
                    >
                        Estado
                    </h2>
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            cursor: "pointer",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={form.activa}
                            onChange={(e) =>
                                setForm({ ...form, activa: e.target.checked })
                            }
                            style={{ width: 18, height: 18, cursor: "pointer" }}
                        />
                        <div>
                            <p
                                style={{
                                    margin: 0,
                                    fontWeight: "var(--font-weight-medium)",
                                    fontSize: "var(--font-size-small)",
                                    color: "var(--color-text-primary)",
                                }}
                            >
                                Área actualmente inhabilitada (vigente)
                            </p>
                            <p
                                style={{
                                    margin: "2px 0 0",
                                    fontSize: "var(--font-size-xs)",
                                    color: "var(--color-text-secondary)",
                                }}
                            >
                                Desmarca esta opción para marcarla como
                                rehabilitada en el historial.
                            </p>
                        </div>
                    </label>
                </div>

                {/* Acciones */}
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
                        {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </form>

            <style>{`
                .editar-area-dates-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
                @media (max-width: 540px) { .editar-area-dates-grid { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}
