"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";
import { DayPicker, type DateRange } from "@daypicker/react";
import { es } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type AreaInhabilitada = {
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

type AreaIncidentesMap = Record<string, number>;

// ─── Utilidades ──────────────────────────────────────────────────────────────

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
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0,
        0,
        0,
        0,
    );
}

function endOfDay(date: Date): Date {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999,
    );
}

function doesAreaOverlapRange(
    area: AreaInhabilitada,
    range: DateRange,
): boolean {
    if (!range.from || !range.to) return true;
    const start = new Date(area.fecha_inicio);
    const end = area.fecha_fin ? new Date(area.fecha_fin) : null;
    if (Number.isNaN(start.getTime())) return false;
    const areaEnd =
        end && !Number.isNaN(end.getTime()) ? end : new Date(8640000000000000);
    return start <= endOfDay(range.to) && areaEnd >= startOfDay(range.from);
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

/**
 * Badge de estado:
 *   activa = true  → el área SIGUE inhabilitada (vigente)
 *   activa = false → el área ya fue rehabilitada (histórico)
 */
function EstadoBadge({ activa }: { activa: boolean }) {
    return (
        <span
            style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                background: activa
                    ? "var(--color-error-bg)"
                    : "var(--color-success-bg)",
                color: activa ? "var(--color-error)" : "var(--color-success)",
                border: `1px solid ${activa ? "var(--color-error-border)" : "var(--color-success-border)"}`,
                whiteSpace: "nowrap",
            }}
        >
            {activa ? "Vigente" : "Rehabilitada"}
        </span>
    );
}

function ContadorIncidentes({
    count,
    onVer,
}: {
    count: number;
    onVer: () => void;
}) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
                style={{
                    minWidth: 28,
                    textAlign: "center",
                    borderRadius: "var(--radius-full)",
                    padding: "3px 8px",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    background:
                        count > 0
                            ? "var(--color-error-bg)"
                            : "var(--color-bg-muted)",
                    color:
                        count > 0
                            ? "var(--color-error)"
                            : "var(--color-text-hint)",
                    border: `1px solid ${count > 0 ? "var(--color-error-border)" : "var(--color-border-light)"}`,
                }}
            >
                {count}
            </span>
            <button
                type="button"
                onClick={onVer}
                style={{
                    background: "none",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: "var(--radius-sm)",
                    padding: "3px 10px",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                    transition:
                        "border-color var(--transition-fast), color var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "var(--color-primary)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--color-primary)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "var(--color-border-light)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--color-text-secondary)";
                }}
            >
                Ver
            </button>
        </div>
    );
}

type IncidenteRelacionado = {
    id: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
};

function getPriorityStyle(priority: string): {
    bg: string;
    color: string;
    label: string;
} {
    const map: Record<string, { bg: string; color: string; label: string }> = {
        Alta: {
            bg: "var(--color-priority-alta-bg)",
            color: "var(--color-priority-alta)",
            label: "Alta",
        },
        Media: {
            bg: "var(--color-priority-media-bg)",
            color: "var(--color-priority-media)",
            label: "Media",
        },
        Baja: {
            bg: "var(--color-priority-baja-bg)",
            color: "var(--color-priority-baja)",
            label: "Baja",
        },
        HIGH: {
            bg: "var(--color-priority-alta-bg)",
            color: "var(--color-priority-alta)",
            label: "Alta",
        },
        MEDIUM: {
            bg: "var(--color-priority-media-bg)",
            color: "var(--color-priority-media)",
            label: "Media",
        },
        LOW: {
            bg: "var(--color-priority-baja-bg)",
            color: "var(--color-priority-baja)",
            label: "Baja",
        },
    };
    return (
        map[priority] ?? {
            bg: "var(--color-bg-muted)",
            color: "var(--color-text-secondary)",
            label: priority,
        }
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AreasInhabilitadasHome() {
    const router = useRouter();
    const [areas, setAreas] = useState<AreaInhabilitada[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    /**
     * FILTRO DE ESTADO:
     *   "todas"       → trae todo (solo_activas=false)
     *   "vigentes"    → solo las que siguen inhabilitadas (activa=true)
     *   "rehabilitadas" → solo el histórico (activa=false), filtro local
     *
     * El backend solo soporta solo_activas=true/false, por lo que el filtro
     * "rehabilitadas" se aplica en el cliente sobre la lista completa.
     */
    const [filtroEstado, setFiltroEstado] = useState<
        "todas" | "vigentes" | "rehabilitadas"
    >("todas");
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
    const [draftRange, setDraftRange] = useState<DateRange | undefined>(
        undefined,
    );
    const [appliedRange, setAppliedRange] = useState<DateRange | undefined>(
        undefined,
    );

    const [incidentesCount, setIncidentesCount] = useState<AreaIncidentesMap>(
        {},
    );

    // Modal incidentes
    const [incidentesArea, setIncidentesArea] = useState<
        IncidenteRelacionado[]
    >([]);
    const [loadingIncidentes, setLoadingIncidentes] = useState(false);
    const [incidentesModal, setIncidentesModal] = useState<{
        open: boolean;
        areaId: string | null;
        areaNombre: string;
    }>({ open: false, areaId: null, areaNombre: "" });

    useEffect(() => {
        const media = window.matchMedia("(max-width: 640px)");
        const update = () => setIsMobile(media.matches);
        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        loadAreas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroEstado]);

    async function getToken(): Promise<string | null> {
        const session = await restoreAuthSession();
        return session?.accessToken ?? null;
    }

    async function loadIncidentesByArea(
        areaId: string,
    ): Promise<IncidenteRelacionado[]> {
        const token = await getToken();
        if (!token) return [];
        const res = await fetch(
            `${API}/api/v1/areas-inhabilitadas/${areaId}/incidentes`,
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        if (!res.ok)
            throw new Error("No fue posible cargar los incidentes asociados.");
        return res.json();
    }

    async function loadAreas() {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) return;

            // Para "vigentes" usamos solo_activas=true; para el resto traemos todo
            const soloActivas = filtroEstado === "vigentes";
            const res = await fetch(
                `${API}/api/v1/areas-inhabilitadas/?page=1&limit=100&solo_activas=${soloActivas}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok)
                throw new Error("Error al cargar las áreas inhabilitadas.");
            const data = await res.json();
            const loadedAreas: AreaInhabilitada[] = data.items ?? [];
            setAreas(loadedAreas);

            const counts: AreaIncidentesMap = {};
            await Promise.all(
                loadedAreas.map(async (area) => {
                    try {
                        const incidents = await loadIncidentesByArea(area.id);
                        counts[area.id] = incidents.length;
                    } catch {
                        counts[area.id] = 0;
                    }
                }),
            );
            setIncidentesCount(counts);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error inesperado.");
        } finally {
            setLoading(false);
        }
    }

    async function openIncidentesModal(areaId: string, areaNombre: string) {
        setLoadingIncidentes(true);
        try {
            const incidents = await loadIncidentesByArea(areaId);
            setIncidentesArea(incidents);
            setIncidentesModal({ open: true, areaId, areaNombre });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Error cargando incidentes.",
            );
        } finally {
            setLoadingIncidentes(false);
        }
    }

    function closeIncidentesModal() {
        setIncidentesModal({ open: false, areaId: null, areaNombre: "" });
        setIncidentesArea([]);
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

    // Filtro local de "rehabilitadas" (activa = false) — el backend no lo soporta directamente
    const filteredByEstado =
        filtroEstado === "rehabilitadas"
            ? areas.filter((a) => !a.activa)
            : areas;

    const filteredAreas =
        appliedRange?.from && appliedRange?.to
            ? filteredByEstado.filter((a) =>
                  doesAreaOverlapRange(a, appliedRange),
              )
            : filteredByEstado;

    // ─── RENDER ────────────────────────────────────────────────────────────────

    return (
        <div style={{ padding: "var(--space-lg)" }}>
            {/* ── Header ── */}
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
                    <p
                        style={{
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--font-size-small)",
                            margin: "4px 0 0",
                        }}
                    >
                        Espacios del campus temporalmente fuera de servicio
                    </p>
                </div>
                <button
                    type="button"
                    className="btn-primary"
                    style={{ width: "auto", padding: "10px 20px" }}
                    onClick={() =>
                        router.push(
                            "/dashboard/admin/areas-inhabilitadas/nueva",
                        )
                    }
                >
                    + Nueva área
                </button>
            </div>

            {/* ── Feedback / Error ── */}
            {feedback && (
                <div
                    className="alert-success"
                    style={{ marginBottom: "var(--space-md)" }}
                >
                    <p>{feedback}</p>
                </div>
            )}
            {error && (
                <div
                    className="alert-error"
                    style={{ marginBottom: "var(--space-md)" }}
                >
                    <p>{error}</p>
                </div>
            )}

            {/* ── Filtros ── */}
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
                {/* Filtro de estado: Todas / Vigentes / Rehabilitadas */}
                <div
                    style={{
                        display: "flex",
                        gap: "var(--space-sm)",
                        flexWrap: "wrap",
                    }}
                >
                    {(
                        [
                            { label: "Todas", value: "todas" },
                            { label: "Vigentes", value: "vigentes" },
                            { label: "Rehabilitadas", value: "rehabilitadas" },
                        ] as const
                    ).map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFiltroEstado(opt.value)}
                            style={{
                                padding: "4px 14px",
                                borderRadius: "var(--radius-full)",
                                fontSize: "var(--font-size-xs)",
                                fontWeight:
                                    filtroEstado === opt.value
                                        ? "var(--font-weight-semibold)"
                                        : "var(--font-weight-medium)",
                                cursor: "pointer",
                                border:
                                    filtroEstado === opt.value
                                        ? "2px solid var(--color-primary)"
                                        : "1px solid var(--color-border-light)",
                                background:
                                    filtroEstado === opt.value
                                        ? "var(--color-primary)"
                                        : "var(--color-bg-card)",
                                color:
                                    filtroEstado === opt.value
                                        ? "#fff"
                                        : "var(--color-text-primary)",
                                transition: "all var(--transition-fast)",
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Filtro por rango de fechas */}
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
                        ? `${formatDateKey(appliedRange.from)} — ${formatDateKey(appliedRange.to)}`
                        : "Filtrar por rango"}
                </button>
            </div>

            {/* ── Modal: filtro por rango ── */}
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
                        style={{
                            width: "min(920px, 100%)",
                            padding: "var(--space-lg)",
                        }}
                    >
                        <div
                            style={{
                                maxHeight: "min(78vh, 720px)",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: "var(--space-md)",
                                }}
                            >
                                <div>
                                    <h2
                                        style={{
                                            margin: 0,
                                            fontSize: "var(--font-size-h3)",
                                            fontWeight:
                                                "var(--font-weight-bold)",
                                        }}
                                    >
                                        Filtrar por rango
                                    </h2>
                                    <p
                                        style={{
                                            margin: "6px 0 0",
                                            color: "var(--color-text-secondary)",
                                            fontSize: "var(--font-size-small)",
                                        }}
                                    >
                                        Selecciona una fecha de inicio y una
                                        fecha de fin.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{
                                        width: "auto",
                                        padding: "8px 12px",
                                    }}
                                    onClick={() => setIsDateFilterOpen(false)}
                                >
                                    Cerrar
                                </button>
                            </div>
                            <div
                                style={{
                                    marginTop: "var(--space-md)",
                                    display: "flex",
                                    justifyContent: "center",
                                    overflow: "auto",
                                    padding: 6,
                                }}
                            >
                                <DayPicker
                                    mode="range"
                                    selected={draftRange}
                                    onSelect={setDraftRange}
                                    locale={es}
                                    numberOfMonths={isMobile ? 1 : 2}
                                    showOutsideDays
                                />
                            </div>
                            <div
                                style={{
                                    marginTop: "var(--space-md)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "var(--space-sm)",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                }}
                            >
                                <p
                                    style={{
                                        fontSize: "var(--font-size-small)",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    {draftRange?.from && draftRange?.to ? (
                                        <>
                                            Rango seleccionado:{" "}
                                            <strong>
                                                {formatDateKey(draftRange.from)}
                                            </strong>
                                            {" — "}
                                            <strong>
                                                {formatDateKey(draftRange.to)}
                                            </strong>
                                        </>
                                    ) : (
                                        "Selecciona un rango para habilitar Aplicar."
                                    )}
                                </p>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                        type="button"
                                        className="btn-link"
                                        style={{ width: "auto", margin: 0 }}
                                        onClick={() => {
                                            setDraftRange(undefined);
                                            setAppliedRange(undefined);
                                        }}
                                        disabled={
                                            !draftRange?.from &&
                                            !draftRange?.to &&
                                            !appliedRange?.from &&
                                            !appliedRange?.to
                                        }
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        style={{
                                            width: "auto",
                                            padding: "10px 18px",
                                        }}
                                        onClick={() => {
                                            setAppliedRange(draftRange);
                                            setIsDateFilterOpen(false);
                                        }}
                                        disabled={
                                            !draftRange?.from || !draftRange?.to
                                        }
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Loading ── */}
            {loading && (
                <div
                    style={{
                        textAlign: "center",
                        padding: "var(--space-xl)",
                        color: "var(--color-text-secondary)",
                    }}
                >
                    Cargando áreas inhabilitadas...
                </div>
            )}

            {/* ── Empty: sin datos ── */}
            {!loading && areas.length === 0 && (
                <div
                    className="card"
                    style={{ textAlign: "center", padding: "var(--space-xxl)" }}
                >
                    <p
                        style={{
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--font-size-body)",
                            marginBottom: "var(--space-md)",
                        }}
                    >
                        No hay áreas inhabilitadas registradas.
                    </p>
                    <button
                        type="button"
                        className="btn-primary"
                        style={{
                            width: "auto",
                            padding: "10px 24px",
                            margin: "0 auto",
                        }}
                        onClick={() =>
                            router.push(
                                "/dashboard/admin/areas-inhabilitadas/nueva",
                            )
                        }
                    >
                        Registrar la primera área
                    </button>
                </div>
            )}

            {/* ── Empty: sin coincidencias con filtro ── */}
            {!loading && areas.length > 0 && filteredAreas.length === 0 && (
                <div
                    className="card"
                    style={{ textAlign: "center", padding: "var(--space-xxl)" }}
                >
                    <p
                        style={{
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--font-size-body)",
                            marginBottom: "var(--space-md)",
                        }}
                    >
                        No hay áreas que coincidan con los filtros aplicados.
                    </p>
                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            justifyContent: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        {appliedRange?.from && (
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ width: "auto", padding: "10px 24px" }}
                                onClick={() => setAppliedRange(undefined)}
                            >
                                Limpiar filtro de fechas
                            </button>
                        )}
                        {filtroEstado !== "todas" && (
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ width: "auto", padding: "10px 24px" }}
                                onClick={() => setFiltroEstado("todas")}
                            >
                                Ver todas
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ══ TABLA DESKTOP ══ */}
            {!loading && filteredAreas.length > 0 && (
                <>
                    <div className="card areas-table-wrap">
                        <table className="areas-table">
                            <thead>
                                <tr className="areas-table-header-row">
                                    {[
                                        "Nombre",
                                        "Motivo",
                                        "Lugar",
                                        "Inicio",
                                        "Fin estimado",
                                        "Estado",
                                        "Incidentes",
                                        "Acciones",
                                    ].map((h) => (
                                        <th key={h} className="areas-th">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAreas.map((area) => (
                                    <tr
                                        key={area.id}
                                        className="areas-table-row"
                                    >
                                        <td className="areas-td areas-td-nombre">
                                            <button
                                                type="button"
                                                className="areas-link-nombre"
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/admin/areas-inhabilitadas/${area.id}`,
                                                    )
                                                }
                                                title={area.nombre}
                                            >
                                                {area.nombre}
                                            </button>
                                        </td>
                                        <td className="areas-td areas-td-motivo">
                                            <span
                                                className="areas-truncate"
                                                title={area.motivo}
                                            >
                                                {area.motivo}
                                            </span>
                                        </td>
                                        <td className="areas-td areas-td-lugar">
                                            {area.lugar_campus ? (
                                                <span className="badge">
                                                    {area.lugar_campus}
                                                </span>
                                            ) : (
                                                <span
                                                    style={{
                                                        color: "var(--color-text-hint)",
                                                    }}
                                                >
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="areas-td areas-td-fecha">
                                            {formatDate(area.fecha_inicio)}
                                        </td>
                                        <td className="areas-td areas-td-fecha">
                                            {formatDate(area.fecha_fin)}
                                        </td>
                                        <td className="areas-td">
                                            <EstadoBadge activa={area.activa} />
                                        </td>
                                        <td className="areas-td">
                                            <ContadorIncidentes
                                                count={
                                                    incidentesCount[area.id] ??
                                                    0
                                                }
                                                onVer={() =>
                                                    openIncidentesModal(
                                                        area.id,
                                                        area.nombre,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="areas-td">
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 8,
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/admin/areas-inhabilitadas/${area.id}/editar`,
                                                        )
                                                    }
                                                    style={{
                                                        padding: "4px 12px",
                                                        borderRadius:
                                                            "var(--radius-sm)",
                                                        cursor: "pointer",
                                                        fontSize:
                                                            "var(--font-size-xs)",
                                                        fontWeight:
                                                            "var(--font-weight-medium)",
                                                        border: "1px solid var(--color-primary)",
                                                        color: "var(--color-primary)",
                                                        background:
                                                            "transparent",
                                                        transition:
                                                            "background var(--transition-fast)",
                                                    }}
                                                >
                                                    Editar
                                                </button>
                                                {confirmDeleteId === area.id ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    area.id,
                                                                )
                                                            }
                                                            disabled={deleting}
                                                            style={{
                                                                padding:
                                                                    "4px 12px",
                                                                borderRadius:
                                                                    "var(--radius-sm)",
                                                                cursor: "pointer",
                                                                fontSize:
                                                                    "var(--font-size-xs)",
                                                                fontWeight:
                                                                    "var(--font-weight-medium)",
                                                                border: "none",
                                                                background:
                                                                    "var(--color-error)",
                                                                color: "#fff",
                                                            }}
                                                        >
                                                            {deleting
                                                                ? "..."
                                                                : "Confirmar"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setConfirmDeleteId(
                                                                    null,
                                                                )
                                                            }
                                                            style={{
                                                                padding:
                                                                    "4px 12px",
                                                                borderRadius:
                                                                    "var(--radius-sm)",
                                                                cursor: "pointer",
                                                                fontSize:
                                                                    "var(--font-size-xs)",
                                                                fontWeight:
                                                                    "var(--font-weight-medium)",
                                                                border: "1px solid var(--color-border-light)",
                                                                background:
                                                                    "transparent",
                                                                color: "var(--color-text-secondary)",
                                                            }}
                                                        >
                                                            No
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setConfirmDeleteId(
                                                                area.id,
                                                            )
                                                        }
                                                        style={{
                                                            padding: "4px 12px",
                                                            borderRadius:
                                                                "var(--radius-sm)",
                                                            cursor: "pointer",
                                                            fontSize:
                                                                "var(--font-size-xs)",
                                                            fontWeight:
                                                                "var(--font-weight-medium)",
                                                            border: "1px solid var(--color-error)",
                                                            color: "var(--color-error)",
                                                            background:
                                                                "transparent",
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

                    {/* ══ CARDS MOBILE ══ */}
                    <div className="areas-mobile-list">
                        {filteredAreas.map((area) => (
                            <div
                                key={area.id}
                                className="card areas-mobile-card"
                            >
                                <div className="areas-mobile-card-header">
                                    <button
                                        type="button"
                                        className="areas-link-nombre areas-mobile-card-nombre"
                                        onClick={() =>
                                            router.push(
                                                `/dashboard/admin/areas-inhabilitadas/${area.id}`,
                                            )
                                        }
                                    >
                                        {area.nombre}
                                    </button>
                                    <EstadoBadge activa={area.activa} />
                                </div>
                                <div className="areas-mobile-card-meta">
                                    <p className="areas-mobile-card-row">
                                        <span className="areas-mobile-label">
                                            Motivo
                                        </span>
                                        <span>{area.motivo}</span>
                                    </p>
                                    {area.lugar_campus && (
                                        <p className="areas-mobile-card-row">
                                            <span className="areas-mobile-label">
                                                Lugar
                                            </span>
                                            <span
                                                className="badge"
                                                style={{
                                                    fontSize:
                                                        "var(--font-size-xs)",
                                                }}
                                            >
                                                {area.lugar_campus}
                                            </span>
                                        </p>
                                    )}
                                    <p className="areas-mobile-card-row">
                                        <span className="areas-mobile-label">
                                            Inicio
                                        </span>
                                        <span>
                                            {formatDate(area.fecha_inicio)}
                                        </span>
                                    </p>
                                    {area.fecha_fin && (
                                        <p className="areas-mobile-card-row">
                                            <span className="areas-mobile-label">
                                                Fin estimado
                                            </span>
                                            <span>
                                                {formatDate(area.fecha_fin)}
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <div className="areas-mobile-card-incidents">
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <span className="areas-mobile-label">
                                            Incidentes
                                        </span>
                                        <ContadorIncidentes
                                            count={
                                                incidentesCount[area.id] ?? 0
                                            }
                                            onVer={() =>
                                                openIncidentesModal(
                                                    area.id,
                                                    area.nombre,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="areas-mobile-card-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.push(
                                                `/dashboard/admin/areas-inhabilitadas/${area.id}/editar`,
                                            )
                                        }
                                        style={{
                                            flex: 1,
                                            padding: "8px",
                                            borderRadius: "var(--radius-sm)",
                                            cursor: "pointer",
                                            fontSize: "var(--font-size-small)",
                                            fontWeight:
                                                "var(--font-weight-medium)",
                                            border: "1px solid var(--color-primary)",
                                            color: "var(--color-primary)",
                                            background: "transparent",
                                        }}
                                    >
                                        Editar
                                    </button>
                                    {confirmDeleteId === area.id ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDelete(area.id)
                                                }
                                                disabled={deleting}
                                                style={{
                                                    flex: 1,
                                                    padding: "8px",
                                                    borderRadius:
                                                        "var(--radius-sm)",
                                                    cursor: "pointer",
                                                    fontSize:
                                                        "var(--font-size-small)",
                                                    fontWeight:
                                                        "var(--font-weight-medium)",
                                                    border: "none",
                                                    background:
                                                        "var(--color-error)",
                                                    color: "#fff",
                                                }}
                                            >
                                                {deleting ? "..." : "Confirmar"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmDeleteId(null)
                                                }
                                                style={{
                                                    flex: 1,
                                                    padding: "8px",
                                                    borderRadius:
                                                        "var(--radius-sm)",
                                                    cursor: "pointer",
                                                    fontSize:
                                                        "var(--font-size-small)",
                                                    fontWeight:
                                                        "var(--font-weight-medium)",
                                                    border: "1px solid var(--color-border-light)",
                                                    background: "transparent",
                                                    color: "var(--color-text-secondary)",
                                                }}
                                            >
                                                No
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConfirmDeleteId(area.id)
                                            }
                                            style={{
                                                flex: 1,
                                                padding: "8px",
                                                borderRadius:
                                                    "var(--radius-sm)",
                                                cursor: "pointer",
                                                fontSize:
                                                    "var(--font-size-small)",
                                                fontWeight:
                                                    "var(--font-weight-medium)",
                                                border: "1px solid var(--color-error)",
                                                color: "var(--color-error)",
                                                background: "transparent",
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

            {/* ══ MODAL: INCIDENTES RELACIONADOS ══ */}
            {incidentesModal.open && (
                <div
                    className="modal-overlay areas-incidents-overlay"
                    onClick={closeIncidentesModal}
                >
                    <div
                        className="card areas-incidents-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="areas-incidents-modal-header">
                            <div>
                                <h3 className="areas-incidents-modal-title">
                                    Incidentes relacionados
                                </h3>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginTop: 6,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "var(--font-size-xs)",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        Área:
                                    </span>
                                    <span className="badge">
                                        {incidentesModal.areaNombre}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeIncidentesModal}
                                className="areas-incidents-close-btn"
                                aria-label="Cerrar"
                            >
                                <svg
                                    width="16"
                                    height="16"
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
                        <div className="areas-incidents-modal-body">
                            {loadingIncidentes ? (
                                <div className="areas-incidents-loading">
                                    <span className="spinner spinner-dark" />
                                    <span
                                        style={{
                                            fontSize: "var(--font-size-small)",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        Cargando incidentes...
                                    </span>
                                </div>
                            ) : incidentesArea.length === 0 ? (
                                <div className="areas-incidents-empty">
                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="var(--color-text-hint)"
                                        strokeWidth="1.5"
                                    >
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    <p
                                        style={{
                                            margin: 0,
                                            color: "var(--color-text-secondary)",
                                            fontSize: "var(--font-size-small)",
                                        }}
                                    >
                                        No existen incidentes asociados a esta
                                        área.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 12,
                                    }}
                                >
                                    {incidentesArea.map((incident) => {
                                        const pStyle = getPriorityStyle(
                                            incident.priority,
                                        );
                                        return (
                                            <div
                                                key={incident.id}
                                                className="areas-incident-item"
                                                style={{
                                                    borderLeftColor:
                                                        pStyle.color,
                                                }}
                                            >
                                                <p className="areas-incident-desc">
                                                    {incident.description ||
                                                        "Incidente sin descripción"}
                                                </p>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 8,
                                                        flexWrap: "wrap",
                                                        marginBottom: 10,
                                                    }}
                                                >
                                                    <span
                                                        className="badge badge-in-progress"
                                                        style={{
                                                            fontSize:
                                                                "var(--font-size-xs)",
                                                        }}
                                                    >
                                                        {incident.status}
                                                    </span>
                                                    <span
                                                        style={{
                                                            display:
                                                                "inline-block",
                                                            padding: "3px 10px",
                                                            borderRadius:
                                                                "var(--radius-full)",
                                                            fontSize:
                                                                "var(--font-size-xs)",
                                                            fontWeight:
                                                                "var(--font-weight-medium)",
                                                            background:
                                                                pStyle.bg,
                                                            color: pStyle.color,
                                                        }}
                                                    >
                                                        {pStyle.label}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        flexWrap: "wrap",
                                                        gap: 4,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize:
                                                                "var(--font-size-xs)",
                                                            color: "var(--color-text-secondary)",
                                                        }}
                                                    >
                                                        {new Date(
                                                            incident.created_at,
                                                        ).toLocaleString(
                                                            "es-CO",
                                                            {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            },
                                                        )}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize:
                                                                "var(--font-size-xs)",
                                                            color: "var(--color-text-hint)",
                                                            fontFamily:
                                                                "monospace",
                                                        }}
                                                    >
                                                        #
                                                        {incident.id.slice(
                                                            0,
                                                            8,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="areas-incidents-modal-footer">
                            <button
                                type="button"
                                className="btn-primary"
                                style={{ width: "auto", padding: "10px 24px" }}
                                onClick={closeIncidentesModal}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .areas-link-nombre {
                    background: none; border: none; padding: 0; cursor: pointer;
                    font-weight: var(--font-weight-medium);
                    color: var(--color-primary);
                    text-align: left;
                    text-decoration: none;
                    transition: text-decoration var(--transition-fast);
                    display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .areas-link-nombre:hover { text-decoration: underline; }

                .areas-table-wrap { overflow-x: auto; }
                .areas-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-small); min-width: 700px; }
                .areas-table-header-row { border-bottom: 2px solid var(--color-border-light); }
                .areas-th { padding: 10px 14px; text-align: left; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
                .areas-table-row { border-bottom: 1px solid var(--color-border-light); transition: background var(--transition-fast); }
                .areas-table-row:hover { background: var(--color-bg-muted); }
                .areas-td { padding: 12px 14px; vertical-align: middle; }
                .areas-td-nombre { font-weight: var(--font-weight-medium); max-width: 180px; }
                .areas-td-motivo { color: var(--color-text-secondary); max-width: 200px; }
                .areas-td-lugar { white-space: nowrap; }
                .areas-td-fecha { white-space: nowrap; color: var(--color-text-secondary); font-size: var(--font-size-xs); }
                .areas-truncate { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

                .areas-mobile-card { margin-bottom: var(--space-md); padding: var(--space-md); border-radius: var(--radius-md); }
                .areas-mobile-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: var(--space-sm); }
                .areas-mobile-card-nombre { font-weight: var(--font-weight-semibold); font-size: var(--font-size-body); flex: 1; line-height: 1.3; }
                .areas-mobile-card-meta { display: flex; flex-direction: column; gap: 6px; margin-bottom: var(--space-sm); padding-bottom: var(--space-sm); border-bottom: 1px solid var(--color-border-light); }
                .areas-mobile-card-row { display: flex; align-items: baseline; gap: 8px; font-size: var(--font-size-small); color: var(--color-text-primary); }
                .areas-mobile-label { font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-hint); text-transform: uppercase; letter-spacing: 0.06em; flex-shrink: 0; min-width: 72px; }
                .areas-mobile-card-incidents { padding-bottom: var(--space-sm); margin-bottom: var(--space-sm); border-bottom: 1px solid var(--color-border-light); }
                .areas-mobile-card-actions { display: flex; gap: 8px; padding-top: 2px; }

                .areas-incidents-overlay { z-index: 999; }
                .areas-incidents-modal { width: min(640px, 95vw); max-height: 82vh; display: flex; flex-direction: column; overflow: hidden; border-radius: var(--radius-md); }
                .areas-incidents-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 20px 24px 16px; border-bottom: 1px solid var(--color-border-light); flex-shrink: 0; }
                .areas-incidents-modal-title { font-size: var(--font-size-h3); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0; }
                .areas-incidents-close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-light); background: var(--color-bg-muted); color: var(--color-text-secondary); cursor: pointer; flex-shrink: 0; transition: background var(--transition-fast), color var(--transition-fast); }
                .areas-incidents-close-btn:hover { background: var(--color-error-bg); color: var(--color-error); }
                .areas-incidents-modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
                .areas-incidents-modal-footer { padding: 14px 24px; border-top: 1px solid var(--color-border-light); display: flex; justify-content: flex-end; flex-shrink: 0; }
                .areas-incidents-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 0; }
                .areas-incidents-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 24px; background: var(--color-bg-muted); border-radius: var(--radius-sm); border: 1px dashed var(--color-border-light); text-align: center; }
                .areas-incident-item { border: 1px solid var(--color-border-light); border-left: 4px solid; border-radius: var(--radius-sm); padding: var(--space-md); background: var(--color-bg-muted); }
                .areas-incident-desc { font-size: var(--font-size-small); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); margin-bottom: 10px; line-height: 1.4; }

                .areas-table-wrap { display: block; }
                .areas-mobile-list { display: none; }
                @media (max-width: 767px) {
                    .areas-table-wrap { display: none !important; }
                    .areas-mobile-list { display: block; }
                }
            `}</style>
        </div>
    );
}
