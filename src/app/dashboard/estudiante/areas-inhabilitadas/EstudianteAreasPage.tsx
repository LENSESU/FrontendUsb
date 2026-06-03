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
    fecha_inicio: string;
    fecha_fin: string | null;
    activa: boolean;
    lugar_campus: string | null;
};

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

async function getToken(): Promise<string | null> {
    const session = await restoreAuthSession();
    return session?.accessToken ?? null;
}

export default function EstudianteAreasPage() {
    const router = useRouter();

    const [areas, setAreas] = useState<AreaInhabilitada[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [soloActivas, setSoloActivas] = useState(true);
    const [lugarFiltro, setLugarFiltro] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const LIMIT = 10;

    useEffect(() => {
        loadAreas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [soloActivas, lugarFiltro, page]);

    async function loadAreas() {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) return;
            const params = new URLSearchParams({
                page: String(page),
                limit: String(LIMIT),
                solo_activas: String(soloActivas),
            });
            if (lugarFiltro) params.set("lugar_campus", lugarFiltro);
            const res = await fetch(
                `${API}/api/v1/areas-inhabilitadas/?${params}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok) throw new Error("Error al cargar las áreas.");
            const data = await res.json();
            setAreas(data.items ?? []);
            setTotal(data.total ?? 0);
            setTotalPages(data.total_pages ?? 1);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error inesperado.");
        } finally {
            setLoading(false);
        }
    }

    const hayFiltros = !soloActivas || !!lugarFiltro;

    function resetFiltros() {
        setSoloActivas(true);
        setLugarFiltro("");
        setPage(1);
    }

    return (
        <div className="container" style={{ paddingBottom: "var(--space-xl)" }}>
            {/* Header */}
            <div className="mb-lg">
                <h1 style={{ marginBottom: 4 }}>Áreas inhabilitadas</h1>
                <p className="text-secondary text-small">
                    Espacios del campus temporalmente fuera de servicio.
                </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-sm mb-md">
                <div className="flex gap-xs flex-wrap">
                    <button
                        type="button"
                        onClick={() => {
                            setSoloActivas(true);
                            setPage(1);
                        }}
                        className={`areas-tab${soloActivas ? " areas-tab--active" : ""}`}
                    >
                        Vigentes
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSoloActivas(false);
                            setPage(1);
                        }}
                        className={`areas-tab${!soloActivas ? " areas-tab--active" : ""}`}
                    >
                        Todas
                    </button>
                </div>

                <select
                    value={lugarFiltro}
                    onChange={(e) => {
                        setLugarFiltro(e.target.value);
                        setPage(1);
                    }}
                    className="areas-filter-select"
                    aria-label="Filtrar por lugar"
                >
                    <option value="">Todos los lugares</option>
                    {CAMPUS_ZONES.map((z) => (
                        <option key={z.value} value={z.value}>
                            {z.label}
                        </option>
                    ))}
                </select>

                {hayFiltros && (
                    <button
                        type="button"
                        onClick={resetFiltros}
                        className="btn-link"
                        style={{
                            width: "auto",
                            minHeight: "unset",
                            padding: "4px 0",
                            margin: 0,
                            fontSize: "var(--font-size-xs)",
                        }}
                    >
                        Limpiar filtros
                    </button>
                )}

                <span
                    className="text-hint text-xs"
                    style={{ marginLeft: "auto" }}
                >
                    {loading ? "…" : `${total} área${total !== 1 ? "s" : ""}`}
                </span>
            </div>

            {/* Error */}
            {error && (
                <div className="alert-error mb-md">
                    <p>{error}</p>
                </div>
            )}

            {/* Skeleton */}
            {loading && (
                <div className="flex flex-col gap-sm">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="card"
                            style={{
                                padding: "var(--space-md)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                            }}
                        >
                            <div
                                className="skeleton"
                                style={{
                                    height: 16,
                                    width: "50%",
                                    borderRadius: 4,
                                }}
                            />
                            <div
                                className="skeleton"
                                style={{
                                    height: 13,
                                    width: "70%",
                                    borderRadius: 4,
                                }}
                            />
                            <div
                                className="skeleton"
                                style={{
                                    height: 13,
                                    width: "35%",
                                    borderRadius: 4,
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty */}
            {!loading && areas.length === 0 && (
                <div className="card areas-empty">
                    <div className="icon-wrap">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            strokeWidth="1.6"
                        >
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            <circle cx="12" cy="9" r="2.5" />
                        </svg>
                    </div>
                    <p className="font-semibold" style={{ margin: 0 }}>
                        {hayFiltros
                            ? "Sin resultados"
                            : "No hay áreas registradas"}
                    </p>
                    <p
                        className="text-secondary text-small"
                        style={{ margin: 0 }}
                    >
                        {hayFiltros
                            ? "Prueba ajustando los filtros."
                            : "No hay áreas inhabilitadas en este momento."}
                    </p>
                </div>
            )}

            {/* Cards */}
            {!loading && areas.length > 0 && (
                <div className="flex flex-col gap-sm">
                    {areas.map((area) => (
                        <div
                            key={area.id}
                            className="card card-clickable"
                            style={{ padding: "var(--space-md)" }}
                            onClick={() =>
                                router.push(
                                    `/dashboard/estudiante/areas-inhabilitadas/${area.id}`,
                                )
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) =>
                                e.key === "Enter" &&
                                router.push(
                                    `/dashboard/estudiante/areas-inhabilitadas/${area.id}`,
                                )
                            }
                        >
                            {/* Fila superior */}
                            <div className="flex items-start justify-between gap-sm mb-xs">
                                <p
                                    className="font-semibold"
                                    style={{ margin: 0, lineHeight: 1.3 }}
                                >
                                    {area.nombre}
                                </p>
                                <span
                                    className={`badge ${area.activa ? "badge-error" : "badge-success"}`}
                                >
                                    {area.activa ? "Vigente" : "Rehabilitada"}
                                </span>
                            </div>

                            {/* Motivo */}
                            <p
                                className="text-secondary text-small"
                                style={{
                                    margin: "4px 0 var(--space-sm)",
                                    lineHeight: 1.4,
                                }}
                            >
                                {area.motivo}
                            </p>

                            {/* Meta */}
                            <div
                                className="flex flex-col gap-xs"
                                style={{
                                    borderTop:
                                        "1px solid var(--color-border-light)",
                                    paddingTop: "var(--space-sm)",
                                }}
                            >
                                {area.lugar_campus && (
                                    <span className="areas-meta-chip">
                                        <svg
                                            width="11"
                                            height="11"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2.5"
                                        >
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                            <circle cx="12" cy="9" r="2.5" />
                                        </svg>
                                        {area.lugar_campus}
                                    </span>
                                )}
                                <span className="areas-meta-chip">
                                    <svg
                                        width="11"
                                        height="11"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2.5"
                                    >
                                        <rect
                                            x="3"
                                            y="4"
                                            width="18"
                                            height="18"
                                            rx="2"
                                            ry="2"
                                        />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    {formatDate(area.fecha_inicio)}
                                    {area.fecha_fin
                                        ? ` → ${formatDate(area.fecha_fin)}`
                                        : " · Sin fecha de fin"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Paginación */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center flex-wrap gap-md mt-md">
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ width: "auto", padding: "8px 16px" }}
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        ← Anterior
                    </button>
                    <span className="text-secondary text-small">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ width: "auto", padding: "8px 16px" }}
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Siguiente →
                    </button>
                </div>
            )}

            <style>{`
                .areas-tab {
                    padding: 6px 14px;
                    border-radius: var(--radius-full);
                    border: 1px solid var(--color-border-light);
                    background: var(--color-bg-card);
                    color: var(--color-text-secondary);
                    font-size: var(--font-size-xs);
                    font-weight: var(--font-weight-medium);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    white-space: nowrap;
                }
                .areas-tab:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }
                .areas-tab--active {
                    background: var(--color-primary);
                    border-color: var(--color-primary);
                    color: #fff;
                    font-weight: var(--font-weight-semibold);
                }
                .areas-filter-select {
                    padding: 7px 12px;
                    border: 1px solid var(--color-border-light);
                    border-radius: var(--radius-sm);
                    background: var(--color-bg-muted);
                    color: var(--color-text-primary);
                    font-size: var(--font-size-small);
                    cursor: pointer;
                    outline: none;
                    font-family: var(--font-family);
                    transition: border-color var(--transition-fast);
                }
                .areas-filter-select:focus { border-color: var(--color-primary); }
                .areas-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--space-sm);
                    padding: var(--space-xl) var(--space-lg);
                    text-align: center;
                    max-width: 380px;
                    margin: 0 auto;
                }
                .areas-meta-chip {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: var(--font-size-xs);
                    color: var(--color-text-hint);
                }
                .areas-meta-chip svg {
                    fill: none;
                    stroke: currentColor;
                    flex-shrink: 0;
                }
            `}</style>
        </div>
    );
}
