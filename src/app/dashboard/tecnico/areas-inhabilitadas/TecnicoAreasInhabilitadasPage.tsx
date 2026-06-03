"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    registrada_por_id: string | null;
    created_at: string;
};

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function TecnicoAreasInhabilitadasPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [areas, setAreas] = useState<AreaInhabilitada[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [soloActivas, setSoloActivas] = useState(false);
    const [lugarFiltro, setLugarFiltro] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const LIMIT = 10;

    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function getToken(): Promise<string | null> {
        const session = await restoreAuthSession();
        return session?.accessToken ?? null;
    }

    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const res = await fetch(`${API}/api/v1/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUserId(data.user_id ?? null);
                }
            } catch {
                // silencioso
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (searchParams.get("registrada") === "1") {
            setToastMsg("Área registrada correctamente.");
            toastTimer.current = setTimeout(() => setToastMsg(null), 4000);
            const url = new URL(window.location.href);
            url.searchParams.delete("registrada");
            window.history.replaceState({}, "", url.toString());
        }
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        };
    }, [searchParams]);

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

    function resetFiltros() {
        setSoloActivas(false);
        setLugarFiltro("");
        setPage(1);
    }

    const hayFiltros = soloActivas || !!lugarFiltro;

    return (
        <div className="container" style={{ paddingBottom: "var(--space-xl)" }}>
            {/* ── Toast ── */}
            {toastMsg && (
                <div className="alert-success" role="status">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                    >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <p>{toastMsg}</p>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div>
                    <h1 style={{ marginBottom: 4 }}>Áreas inhabilitadas</h1>
                    <p className="text-secondary text-small">
                        Espacios del campus temporalmente fuera de servicio.
                    </p>
                </div>
                <button
                    type="button"
                    className="btn-primary"
                    style={{
                        width: "auto",
                        padding: "10px 20px",
                        whiteSpace: "nowrap",
                    }}
                    onClick={() =>
                        router.push(
                            "/dashboard/tecnico/areas-inhabilitadas/nueva",
                        )
                    }
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Registrar área
                </button>
            </div>

            {/* ── Filtros ── */}
            <div className="flex flex-wrap items-center gap-sm mb-6">
                {/* Tabs estado */}
                <div className="flex gap-xs flex-wrap">
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
                    <button
                        type="button"
                        onClick={() => {
                            setSoloActivas(true);
                            setPage(1);
                        }}
                        className={`areas-tab${soloActivas ? " areas-tab--active" : ""}`}
                    >
                        Solo vigentes
                    </button>
                </div>

                {/* Select lugar */}
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

                <span className="text-hint text-xs ml-auto">
                    {loading ? "…" : `${total} área${total !== 1 ? "s" : ""}`}
                </span>
            </div>

            {/* ── Error ── */}
            {error && (
                <div
                    className="alert-error"
                    style={{ marginBottom: "var(--space-md)" }}
                >
                    <p>{error}</p>
                </div>
            )}

            {/* ── Skeleton ── */}
            {loading && (
                <div className="areas-table-wrap card">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="areas-skeleton-row">
                            <div
                                className="skeleton"
                                style={{
                                    height: 14,
                                    width: "30%",
                                    borderRadius: 4,
                                }}
                            />
                            <div
                                className="skeleton"
                                style={{
                                    height: 14,
                                    width: "40%",
                                    borderRadius: 4,
                                }}
                            />
                            <div
                                className="skeleton"
                                style={{
                                    height: 14,
                                    width: "15%",
                                    borderRadius: 4,
                                }}
                            />
                            <div
                                className="skeleton"
                                style={{
                                    height: 22,
                                    width: 70,
                                    borderRadius: 20,
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Empty ── */}
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
                            : "Registra la primera área inhabilitada."}
                    </p>
                    {!hayFiltros && (
                        <button
                            type="button"
                            className="btn-primary"
                            style={{ width: "auto", padding: "9px 20px" }}
                            onClick={() =>
                                router.push(
                                    "/dashboard/tecnico/areas-inhabilitadas/nueva",
                                )
                            }
                        >
                            Registrar área
                        </button>
                    )}
                </div>
            )}

            {/* ── Tabla desktop ── */}
            {!loading && areas.length > 0 && (
                <>
                    <div
                        className="card areas-table-wrap"
                        id="areas-table-desktop"
                    >
                        <table className="areas-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Motivo</th>
                                    <th>Lugar</th>
                                    <th>Inicio</th>
                                    <th>Fin estimado</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {areas.map((area) => {
                                    const esMia =
                                        area.registrada_por_id ===
                                        currentUserId;
                                    return (
                                        <tr
                                            key={area.id}
                                            className="areas-table-row"
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/tecnico/areas-inhabilitadas/${area.id}`,
                                                )
                                            }
                                            tabIndex={0}
                                            onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                router.push(
                                                    `/dashboard/tecnico/areas-inhabilitadas/${area.id}`,
                                                )
                                            }
                                        >
                                            <td>
                                                <div className="flex items-center gap-xs flex-wrap">
                                                    <span className="areas-table-nombre">
                                                        {area.nombre}
                                                    </span>
                                                    {esMia && (
                                                        <span
                                                            className="badge"
                                                            style={{
                                                                fontSize:
                                                                    "var(--font-size-xs)",
                                                                padding:
                                                                    "1px 8px",
                                                            }}
                                                        >
                                                            Mía
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="areas-table-motivo">
                                                {area.motivo}
                                            </td>
                                            <td
                                                className="text-secondary"
                                                style={{ whiteSpace: "nowrap" }}
                                            >
                                                {area.lugar_campus ?? "—"}
                                            </td>
                                            <td
                                                className="text-secondary"
                                                style={{
                                                    whiteSpace: "nowrap",
                                                    fontSize:
                                                        "var(--font-size-xs)",
                                                }}
                                            >
                                                {formatDate(area.fecha_inicio)}
                                            </td>
                                            <td
                                                className="text-secondary"
                                                style={{
                                                    whiteSpace: "nowrap",
                                                    fontSize:
                                                        "var(--font-size-xs)",
                                                }}
                                            >
                                                {area.fecha_fin
                                                    ? formatDate(area.fecha_fin)
                                                    : "—"}
                                            </td>
                                            <td>
                                                <span
                                                    className={
                                                        area.activa
                                                            ? "badge badge-error"
                                                            : "badge badge-success"
                                                    }
                                                    style={{
                                                        fontSize:
                                                            "var(--font-size-xs)",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {area.activa
                                                        ? "Vigente"
                                                        : "Rehabilitada"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Cards mobile ── */}
                    <div className="areas-mobile-list">
                        {areas.map((area) => {
                            const esMia =
                                area.registrada_por_id === currentUserId;
                            return (
                                <div
                                    key={area.id}
                                    className="card areas-mobile-card"
                                    onClick={() =>
                                        router.push(
                                            `/dashboard/tecnico/areas-inhabilitadas/${area.id}`,
                                        )
                                    }
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) =>
                                        e.key === "Enter" &&
                                        router.push(
                                            `/dashboard/tecnico/areas-inhabilitadas/${area.id}`,
                                        )
                                    }
                                >
                                    {/* Fila superior: nombre + estado */}
                                    <div className="flex items-start justify-between gap-sm mb-1">
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p className="areas-mobile-nombre">
                                                {area.nombre}
                                            </p>
                                            {esMia && (
                                                <span
                                                    className="badge"
                                                    style={{
                                                        fontSize:
                                                            "var(--font-size-xs)",
                                                        padding: "1px 8px",
                                                        marginTop: 4,
                                                        display: "inline-block",
                                                    }}
                                                >
                                                    Registrada por ti
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={
                                                area.activa
                                                    ? "badge badge-error"
                                                    : "badge badge-success"
                                            }
                                            style={{
                                                fontSize: "var(--font-size-xs)",
                                                flexShrink: 0,
                                            }}
                                        >
                                            {area.activa
                                                ? "Vigente"
                                                : "Rehabilitada"}
                                        </span>
                                    </div>

                                    {/* Motivo */}
                                    <p className="areas-mobile-motivo">
                                        {area.motivo}
                                    </p>

                                    {/* Meta */}
                                    <div className="areas-mobile-meta">
                                        {area.lugar_campus && (
                                            <span className="areas-meta-chip">
                                                <svg
                                                    width="11"
                                                    height="11"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                >
                                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                                    <circle
                                                        cx="12"
                                                        cy="9"
                                                        r="2.5"
                                                    />
                                                </svg>
                                                {area.lugar_campus}
                                            </span>
                                        )}
                                        <span className="areas-meta-chip">
                                            <svg
                                                width="11"
                                                height="11"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
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
                                                <line
                                                    x1="16"
                                                    y1="2"
                                                    x2="16"
                                                    y2="6"
                                                />
                                                <line
                                                    x1="8"
                                                    y1="2"
                                                    x2="8"
                                                    y2="6"
                                                />
                                                <line
                                                    x1="3"
                                                    y1="10"
                                                    x2="21"
                                                    y2="10"
                                                />
                                            </svg>
                                            {formatDate(area.fecha_inicio)}
                                            {area.fecha_fin
                                                ? ` → ${formatDate(area.fecha_fin)}`
                                                : " · Sin fin"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ── Paginación ── */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center flex-wrap gap-md mt-4">
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
                /* ── Tabs de estado ── */
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

                /* ── Select de filtro ── */
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

                /* ── Empty ── */
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

                /* ── Skeleton rows ── */
                .areas-skeleton-row {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: 14px var(--space-lg);
                    border-bottom: 1px solid var(--color-border-light);
                }
                .areas-skeleton-row:last-child { border-bottom: none; }

                /* ── Tabla desktop ── */
                #areas-table-desktop { display: block; }
                .areas-mobile-list   { display: none; }
                @media (max-width: 767px) {
                    #areas-table-desktop { display: none !important; }
                    .areas-mobile-list   { display: flex; flex-direction: column; gap: var(--space-sm); }
                }

                .areas-table-wrap { overflow-x: auto; }
                .areas-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: var(--font-size-small);
                }
                .areas-table thead tr {
                    border-bottom: 2px solid var(--color-border-light);
                }
                .areas-table th {
                    padding: 12px 16px;
                    text-align: left;
                    font-size: var(--font-size-xs);
                    font-weight: var(--font-weight-semibold);
                    color: var(--color-text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    white-space: nowrap;
                }
                .areas-table tbody tr {
                    border-bottom: 1px solid var(--color-border-light);
                }
                .areas-table tbody tr:last-child { border-bottom: none; }
                .areas-table-row {
                    cursor: pointer;
                    transition: background var(--transition-fast);
                    outline: none;
                }
                .areas-table-row:hover,
                .areas-table-row:focus-visible {
                    background: var(--color-bg-muted);
                }
                .areas-table td {
                    padding: 13px 16px;
                    vertical-align: middle;
                }
                .areas-table-nombre {
                    font-weight: var(--font-weight-semibold);
                    color: var(--color-text-primary);
                    max-width: 200px;
                    display: block;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .areas-table-motivo {
                    color: var(--color-text-secondary);
                    max-width: 240px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                /* ── Mobile card ── */
                .areas-mobile-card {
                    padding: var(--space-md);
                    cursor: pointer;
                    transition: box-shadow var(--transition-fast), transform var(--transition-fast);
                    outline: none;
                    -webkit-tap-highlight-color: rgba(239,99,15,0.06);
                }
                .areas-mobile-card:hover,
                .areas-mobile-card:focus-visible {
                    box-shadow: var(--shadow-hover);
                    transform: translateY(-1px);
                }
                .areas-mobile-nombre {
                    font-weight: var(--font-weight-semibold);
                    font-size: var(--font-size-body);
                    color: var(--color-text-primary);
                    margin: 0;
                    line-height: 1.3;
                    /* 2 líneas máximo */
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .areas-mobile-motivo {
                    font-size: var(--font-size-small);
                    color: var(--color-text-secondary);
                    margin: 6px 0 var(--space-sm);
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .areas-mobile-meta {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    border-top: 1px solid var(--color-border-light);
                    padding-top: var(--space-sm);
                }
                .areas-meta-chip {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: var(--font-size-xs);
                    color: var(--color-text-hint);
                }

                /* ── Header responsive ── */
                @media (max-width: 480px) {
                    .flex.items-start.justify-between.flex-wrap { flex-direction: column; }
                    .flex.items-start.justify-between.flex-wrap .btn-primary { width: 100%; justify-content: center; }
                }
            `}</style>
        </div>
    );
}
