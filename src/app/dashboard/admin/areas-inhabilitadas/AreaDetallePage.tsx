"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type IncidenteAsociado = {
    id: string;
    descripcion: string;
    status: string;
    priority: string;
    campus_place: string | null;
    created_at: string;
};

// Incidente de búsqueda en el modal (viene de GET /incidents/)
type IncidenteBusqueda = {
    id: string;
    description: string;
    status: string;
    priority: string;
    campus_place: string | null;
    category_id: string | null;
    created_at: string;
    student_id: string;
};

type Categoria = {
    id: string;
    name: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
        Nuevo: "badge-new",
        En_proceso: "badge-in-progress",
        Resuelto: "badge-resolved",
    };
    return map[status] ?? "";
}

function StatusIcon({ activa }: { activa: boolean }) {
    if (activa) {
        return (
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-error)"
                strokeWidth="2"
            >
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
        );
    }
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-success)"
            strokeWidth="2"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

// ─── Modal de asociación ──────────────────────────────────────────────────────

type AsociarModalProps = {
    areaId: string;
    areaName: string;
    areaLugar: string | null; // si existe, filtrar incidentes a ese lugar
    incidentesYaAsociados: string[]; // ids ya asociados
    onClose: () => void;
    onAsociado: (incidente: IncidenteAsociado) => void;
    currentUserId: string | null;
    userRole: string;
};

function AsociarIncidenteModal({
    areaId,
    areaName,
    areaLugar,
    incidentesYaAsociados,
    onClose,
    onAsociado,
    currentUserId,
    userRole,
}: AsociarModalProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [resultados, setResultados] = useState<IncidenteBusqueda[]>([]);
    const [loading, setLoading] = useState(false);
    const [asociando, setAsociando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [seleccionado, setSeleccionado] = useState<string | null>(null);
    const [exitoso, setExitoso] = useState(false);

    // Filtros
    const [busqueda, setBusqueda] = useState("");
    const [categoriaId, setCategoriaId] = useState("");
    const [estado, setEstado] = useState("");
    const [prioridad, setPrioridad] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    async function getToken(): Promise<string | null> {
        const session = await restoreAuthSession();
        return session?.accessToken ?? null;
    }

    // Cargar categorías para el filtro
    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const res = await fetch(`${API}/api/v1/incident-categories/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setCategorias(data.items ?? data ?? []);
                }
            } catch {
                // silencioso
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Buscar incidentes con debounce
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            buscarIncidentes();
        }, 350);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busqueda, categoriaId, estado, prioridad, fechaDesde, fechaHasta]);

    async function buscarIncidentes() {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) return;

            const params = new URLSearchParams({ page: "1", limit: "20" });
            if (estado) params.set("estado", estado);
            if (categoriaId) params.set("categoria_id", categoriaId);
            if (prioridad) params.set("prioridad", prioridad);
            if (fechaDesde)
                params.set("fecha_inicio", new Date(fechaDesde).toISOString());
            if (fechaHasta)
                params.set("fecha_fin", new Date(fechaHasta).toISOString());
            // Técnico: solo ve sus propios incidentes activos
            if (userRole === "technician" && currentUserId) {
                params.set("technician_id", currentUserId);
                // Si no hay filtro de estado manual, preseleccionar solo activos
                if (!estado) params.set("estado", "Nuevo,En_proceso");
            }

            const res = await fetch(`${API}/api/v1/incidents/?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Error al buscar incidentes.");
            const data = await res.json();
            let items: IncidenteBusqueda[] = data.items ?? [];

            // Filtro cliente: solo incidentes del mismo lugar que el área (si tiene lugar)
            if (areaLugar) {
                items = items.filter((i) => i.campus_place === areaLugar);
            }

            // Filtro local por texto de descripción
            if (busqueda.trim()) {
                const q = busqueda.trim().toLowerCase();
                items = items.filter(
                    (i) =>
                        i.description?.toLowerCase().includes(q) ||
                        i.id.toLowerCase().includes(q),
                );
            }

            setResultados(items);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error inesperado.");
        } finally {
            setLoading(false);
        }
    }

    async function handleAsociar() {
        if (!seleccionado) return;
        setAsociando(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) return;

            const res = await fetch(
                `${API}/api/v1/areas-inhabilitadas/${areaId}/incidentes`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ incidente_id: seleccionado }),
                },
            );

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg =
                    typeof body?.detail === "string"
                        ? body.detail
                        : (body?.detail?.message ?? "Error al asociar.");
                // 409 = ya estaba asociado, igual lo mostramos
                throw new Error(msg);
            }

            // Buscar el incidente completo para actualizar la lista local
            const inc = resultados.find((i) => i.id === seleccionado);
            if (inc) {
                onAsociado({
                    id: inc.id,
                    descripcion: inc.description,
                    status: inc.status,
                    priority: inc.priority,
                    campus_place: inc.campus_place,
                    created_at: inc.created_at,
                });
            }
            setExitoso(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error inesperado.");
        } finally {
            setAsociando(false);
        }
    }

    // Cerrar con Escape
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            ref={overlayRef}
            className="modal-overlay"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            <div
                className="modal-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Asociar incidente"
            >
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Asociar incidente</h2>
                        <p className="modal-subtitle">
                            {userRole === "technician"
                                ? "Solo se muestran tus incidentes activos"
                                : "Área:"}{" "}
                            {userRole !== "technician" && (
                                <strong>{areaName}</strong>
                            )}
                            {areaLugar && (
                                <span className="modal-lugar-pill">
                                    <svg
                                        width="10"
                                        height="10"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {areaLugar}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="modal-close-btn"
                        aria-label="Cerrar"
                    >
                        <svg
                            width="20"
                            height="20"
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

                {exitoso ? (
                    /* ── Estado de éxito ── */
                    <div className="modal-success">
                        <div className="modal-success-icon">
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--color-success)"
                                strokeWidth="2"
                            >
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <p className="modal-success-text">
                            Incidente asociado correctamente.
                        </p>
                        <button
                            type="button"
                            className="btn-primary"
                            style={{ width: "auto", padding: "9px 24px" }}
                            onClick={onClose}
                        >
                            Listo
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ── Filtros ── */}
                        <div className="modal-filters">
                            {/* Búsqueda por texto */}
                            <div className="modal-search-wrap">
                                <svg
                                    className="modal-search-icon"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <line
                                        x1="21"
                                        y1="21"
                                        x2="16.65"
                                        y2="16.65"
                                    />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Buscar por descripción o ID…"
                                    value={busqueda}
                                    onChange={(e) =>
                                        setBusqueda(e.target.value)
                                    }
                                    className="modal-search-input"
                                    autoFocus
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda("")}
                                        className="modal-search-clear"
                                        aria-label="Limpiar búsqueda"
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <line
                                                x1="18"
                                                y1="6"
                                                x2="6"
                                                y2="18"
                                            />
                                            <line
                                                x1="6"
                                                y1="6"
                                                x2="18"
                                                y2="18"
                                            />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Fila de selects */}
                            <div className="modal-filters-row">
                                {userRole !== "technician" && (
                                    <select
                                        value={estado}
                                        onChange={(e) =>
                                            setEstado(e.target.value)
                                        }
                                        className="modal-filter-select"
                                        aria-label="Filtrar por estado"
                                    >
                                        <option value="">
                                            Todos los estados
                                        </option>
                                        <option value="Nuevo">Nuevo</option>
                                        <option value="En_proceso">
                                            En proceso
                                        </option>
                                        <option value="Resuelto">
                                            Resuelto
                                        </option>
                                    </select>
                                )}

                                <select
                                    value={prioridad}
                                    onChange={(e) =>
                                        setPrioridad(e.target.value)
                                    }
                                    className="modal-filter-select"
                                    aria-label="Filtrar por prioridad"
                                >
                                    <option value="">
                                        Todas las prioridades
                                    </option>
                                    <option value="Alta">Alta</option>
                                    <option value="Media">Media</option>
                                    <option value="Baja">Baja</option>
                                </select>

                                <select
                                    value={categoriaId}
                                    onChange={(e) =>
                                        setCategoriaId(e.target.value)
                                    }
                                    className="modal-filter-select"
                                    aria-label="Filtrar por categoría"
                                >
                                    <option value="">
                                        Todas las categorías
                                    </option>
                                    {categorias.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Fechas */}
                            <div className="modal-filters-row">
                                <div className="modal-date-field">
                                    <label className="modal-date-label">
                                        Desde
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaDesde}
                                        onChange={(e) =>
                                            setFechaDesde(e.target.value)
                                        }
                                        className="modal-filter-select"
                                    />
                                </div>
                                <div className="modal-date-field">
                                    <label className="modal-date-label">
                                        Hasta
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaHasta}
                                        onChange={(e) =>
                                            setFechaHasta(e.target.value)
                                        }
                                        className="modal-filter-select"
                                    />
                                </div>
                                {(fechaDesde ||
                                    fechaHasta ||
                                    estado ||
                                    prioridad ||
                                    categoriaId) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEstado("");
                                            setPrioridad("");
                                            setCategoriaId("");
                                            setFechaDesde("");
                                            setFechaHasta("");
                                        }}
                                        className="modal-clear-filters"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Error ── */}
                        {error && (
                            <div className="modal-error">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    style={{ flexShrink: 0 }}
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* ── Lista de resultados ── */}
                        <div className="modal-results">
                            {loading ? (
                                <div className="modal-loading">
                                    <div className="modal-spinner" />
                                    <span>Buscando incidentes…</span>
                                </div>
                            ) : resultados.length === 0 ? (
                                <div className="modal-empty">
                                    <svg
                                        width="28"
                                        height="28"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="var(--color-text-hint)"
                                        strokeWidth="1.5"
                                    >
                                        <circle cx="11" cy="11" r="8" />
                                        <line
                                            x1="21"
                                            y1="21"
                                            x2="16.65"
                                            y2="16.65"
                                        />
                                    </svg>
                                    <p>
                                        No se encontraron incidentes con esos
                                        filtros.
                                    </p>
                                </div>
                            ) : (
                                resultados.map((inc) => {
                                    const yaAsociado =
                                        incidentesYaAsociados.includes(inc.id);
                                    const isSelected = seleccionado === inc.id;
                                    const pStyle = getPriorityStyle(
                                        inc.priority,
                                    );
                                    return (
                                        <label
                                            key={inc.id}
                                            htmlFor={`inc-opt-${inc.id}`}
                                            className={`modal-result-item${isSelected ? " selected" : ""}${yaAsociado ? " already-associated" : ""}`}
                                        >
                                            <input
                                                id={`inc-opt-${inc.id}`}
                                                type="radio"
                                                name="incidente-seleccionado"
                                                value={inc.id}
                                                disabled={yaAsociado}
                                                checked={isSelected}
                                                onChange={() => {
                                                    if (!yaAsociado)
                                                        setSeleccionado(inc.id);
                                                }}
                                                style={{
                                                    flexShrink: 0,
                                                    marginTop: 2,
                                                }}
                                            />
                                            <div
                                                style={{ flex: 1, minWidth: 0 }}
                                            >
                                                <p className="modal-result-desc">
                                                    {inc.description ||
                                                        "Sin descripción"}
                                                </p>
                                                <div className="modal-result-badges">
                                                    <span
                                                        className={`badge ${getStatusBadgeClass(inc.status)}`}
                                                        style={{
                                                            fontSize:
                                                                "var(--font-size-xs)",
                                                        }}
                                                    >
                                                        {inc.status}
                                                    </span>
                                                    <span
                                                        style={{
                                                            display:
                                                                "inline-block",
                                                            padding: "2px 8px",
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
                                                    {inc.campus_place && (
                                                        <span
                                                            className="badge"
                                                            style={{
                                                                fontSize:
                                                                    "var(--font-size-xs)",
                                                            }}
                                                        >
                                                            {inc.campus_place}
                                                        </span>
                                                    )}
                                                    {yaAsociado && (
                                                        <span className="modal-badge-associated">
                                                            Ya asociado
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="modal-result-date">
                                                    {formatDate(inc.created_at)}{" "}
                                                    · #{inc.id.slice(0, 8)}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>

                        {/* ── Footer ── */}
                        <div className="modal-footer">
                            <span className="modal-count">
                                {resultados.length > 0
                                    ? `${resultados.length} resultado${resultados.length !== 1 ? "s" : ""}`
                                    : ""}
                            </span>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{
                                        width: "auto",
                                        padding: "9px 20px",
                                    }}
                                    onClick={onClose}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{
                                        width: "auto",
                                        padding: "9px 24px",
                                    }}
                                    disabled={!seleccionado || asociando}
                                    onClick={handleAsociar}
                                >
                                    {asociando
                                        ? "Asociando…"
                                        : "Asociar incidente"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

type AreaDetalleProps = {
    areaId: string;
    userRole?: "administrator" | "technician" | "student" | string;
    editPath?: string;
    incidentBasePath?: string;
};

export default function AreaDetallePage({
    areaId,
    userRole = "student",
    editPath,
    incidentBasePath,
}: AreaDetalleProps) {
    const router = useRouter();
    const [area, setArea] = useState<AreaInhabilitada | null>(null);
    const [incidentes, setIncidentes] = useState<IncidenteAsociado[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const isAdmin = userRole === "administrator";
    const isTechOrAdmin = isAdmin || userRole === "technician";
    const defaultEditPath =
        editPath ?? `/dashboard/admin/areas-inhabilitadas/${areaId}/editar`;

    const resolveIncidentPath = (incidentId: string) => {
        if (incidentBasePath) return `${incidentBasePath}?id=${incidentId}`;
        return `/dashboard/admin/dashboard/incidente-detalle?id=${incidentId}`;
    };

    async function getToken(): Promise<string | null> {
        const session = await restoreAuthSession();
        return session?.accessToken ?? null;
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [areaId]);

    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) return;
            const headers = { Authorization: `Bearer ${token}` };

            const [areaRes, incRes] = await Promise.all([
                fetch(`${API}/api/v1/areas-inhabilitadas/${areaId}`, {
                    headers,
                }),
                fetch(
                    `${API}/api/v1/areas-inhabilitadas/${areaId}/incidentes`,
                    { headers },
                ),
            ]);

            if (!areaRes.ok) {
                if (areaRes.status === 404)
                    throw new Error("Área no encontrada.");
                throw new Error("Error al cargar el área.");
            }

            const areaData = await areaRes.json();
            const incData = incRes.ok ? await incRes.json() : [];
            setArea(areaData);
            setIncidentes(incData);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error inesperado.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        (async () => {
            const token = await getToken();
            if (!token) return;
            const res = await fetch(`${API}/api/v1/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentUserId(data.user_id ?? null);
            }
        })();
    }, []);

    async function handleDelete() {
        if (!area) return;
        setDeleting(true);
        try {
            const token = await getToken();
            if (!token) return;
            const res = await fetch(
                `${API}/api/v1/areas-inhabilitadas/${area.id}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            if (!res.ok && res.status !== 204) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.detail?.message ?? "Error al eliminar.");
            }
            router.push("/dashboard/admin/areas-inhabilitadas?eliminada=1");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error inesperado.");
            setDeleting(false);
        }
    }

    function handleIncidenteAsociado(nuevoInc: IncidenteAsociado) {
        setIncidentes((prev) => [nuevoInc, ...prev]);
    }

    // ── Loading skeleton ──
    if (loading) {
        return (
            <div style={{ padding: "var(--space-lg)" }}>
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
                        width: "60%",
                        background: "var(--color-bg-muted)",
                        borderRadius: 4,
                        marginBottom: "var(--space-sm)",
                    }}
                />
                <div
                    style={{
                        height: 16,
                        width: "40%",
                        background: "var(--color-bg-muted)",
                        borderRadius: 4,
                        marginBottom: "var(--space-xl)",
                    }}
                />
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="card"
                        style={{
                            height: 120,
                            marginBottom: "var(--space-md)",
                            background: "var(--color-bg-muted)",
                            borderRadius: "var(--radius-md)",
                        }}
                    />
                ))}
            </div>
        );
    }

    if (error || !area) {
        return (
            <div style={{ padding: "var(--space-lg)" }}>
                <div
                    className="alert-error"
                    style={{ marginBottom: "var(--space-md)" }}
                >
                    <p>{error ?? "Área no encontrada."}</p>
                </div>
                <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "auto" }}
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
                maxWidth: 900,
                margin: "0 auto",
            }}
        >
            {/* Breadcrumb */}
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

            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "var(--space-md)",
                    marginBottom: "var(--space-xl)",
                    flexWrap: "wrap",
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 6,
                            flexWrap: "wrap",
                        }}
                    >
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 12px",
                                borderRadius: "var(--radius-full)",
                                fontSize: "var(--font-size-xs)",
                                fontWeight: "var(--font-weight-semibold)",
                                background: area.activa
                                    ? "var(--color-error-bg)"
                                    : "var(--color-success-bg)",
                                color: area.activa
                                    ? "var(--color-error)"
                                    : "var(--color-success)",
                                border: `1px solid ${area.activa ? "var(--color-error-border)" : "var(--color-success-border)"}`,
                            }}
                        >
                            <StatusIcon activa={area.activa} />
                            {area.activa
                                ? "Vigente — fuera de servicio"
                                : "Rehabilitada"}
                        </span>
                        {area.lugar_campus && (
                            <span
                                className="badge"
                                style={{ fontSize: "var(--font-size-xs)" }}
                            >
                                {area.lugar_campus}
                            </span>
                        )}
                    </div>
                    <h1
                        style={{
                            fontSize: "var(--font-size-h2)",
                            fontWeight: "var(--font-weight-bold)",
                            color: "var(--color-text-primary)",
                            margin: 0,
                            lineHeight: 1.2,
                        }}
                    >
                        {area.nombre}
                    </h1>
                </div>

                {isTechOrAdmin && (
                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            flexShrink: 0,
                            flexWrap: "wrap",
                        }}
                    >
                        {(isAdmin ||
                            area.registrada_por_id === currentUserId) && (
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ width: "auto", padding: "9px 20px" }}
                                onClick={() => router.push(defaultEditPath)}
                            >
                                Editar
                            </button>
                        )}
                        {isAdmin &&
                            (confirmDelete ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        style={{
                                            width: "auto",
                                            padding: "9px 20px",
                                            borderRadius: "var(--radius-sm)",
                                            cursor: "pointer",
                                            fontSize: "var(--font-size-small)",
                                            fontWeight:
                                                "var(--font-weight-medium)",
                                            border: "none",
                                            background: "var(--color-error)",
                                            color: "#fff",
                                        }}
                                    >
                                        {deleting
                                            ? "Eliminando..."
                                            : "Confirmar eliminación"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(false)}
                                        style={{
                                            width: "auto",
                                            padding: "9px 16px",
                                            borderRadius: "var(--radius-sm)",
                                            cursor: "pointer",
                                            fontSize: "var(--font-size-small)",
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
                                    onClick={() => setConfirmDelete(true)}
                                    style={{
                                        width: "auto",
                                        padding: "9px 20px",
                                        borderRadius: "var(--radius-sm)",
                                        cursor: "pointer",
                                        fontSize: "var(--font-size-small)",
                                        fontWeight: "var(--font-weight-medium)",
                                        border: "1px solid var(--color-error)",
                                        color: "var(--color-error)",
                                        background: "transparent",
                                    }}
                                >
                                    Eliminar
                                </button>
                            ))}
                    </div>
                )}
            </div>

            {error && (
                <div
                    className="alert-error"
                    style={{ marginBottom: "var(--space-md)" }}
                >
                    <p>{error}</p>
                </div>
            )}

            {/* Grid principal */}
            <div className="area-detalle-grid">
                {/* Columna izquierda */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-md)",
                    }}
                >
                    {/* Motivo */}
                    <div
                        className="card"
                        style={{ padding: "var(--space-lg)" }}
                    >
                        <h2 className="area-detalle-section-title">
                            Motivo de inhabilitación
                        </h2>
                        <p
                            style={{
                                fontSize: "var(--font-size-body)",
                                color: "var(--color-text-primary)",
                                lineHeight: 1.6,
                                margin: 0,
                            }}
                        >
                            {area.motivo}
                        </p>
                        {area.descripcion && (
                            <>
                                <div
                                    style={{
                                        height: 1,
                                        background: "var(--color-border-light)",
                                        margin: "var(--space-md) 0",
                                    }}
                                />
                                <p
                                    style={{
                                        fontSize: "var(--font-size-small)",
                                        color: "var(--color-text-secondary)",
                                        lineHeight: 1.6,
                                        margin: 0,
                                    }}
                                >
                                    {area.descripcion}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Vigencia */}
                    <div
                        className="card"
                        style={{ padding: "var(--space-lg)" }}
                    >
                        <h2 className="area-detalle-section-title">Vigencia</h2>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                            }}
                        >
                            <div className="area-detalle-meta-row">
                                <span className="area-detalle-meta-label">
                                    Inicio
                                </span>
                                <span className="area-detalle-meta-value">
                                    {formatDate(area.fecha_inicio)}
                                </span>
                            </div>
                            <div className="area-detalle-meta-row">
                                <span className="area-detalle-meta-label">
                                    Fin estimado
                                </span>
                                <span className="area-detalle-meta-value">
                                    {area.fecha_fin ? (
                                        formatDate(area.fecha_fin)
                                    ) : (
                                        <span
                                            style={{
                                                color: "var(--color-text-hint)",
                                                fontStyle: "italic",
                                            }}
                                        >
                                            Sin fecha definida
                                        </span>
                                    )}
                                </span>
                            </div>
                            {area.fecha_fin && area.activa && (
                                <div
                                    style={{
                                        padding: "8px 12px",
                                        background:
                                            "var(--color-warning-bg, #fffbeb)",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--color-warning-border, #fcd34d)",
                                    }}
                                >
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: "var(--font-size-xs)",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        La rehabilitación está programada para
                                        el {formatDate(area.fecha_fin)}.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Registro */}
                    <div
                        className="card"
                        style={{ padding: "var(--space-lg)" }}
                    >
                        <h2 className="area-detalle-section-title">
                            Registro del sistema
                        </h2>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                            }}
                        >
                            <div className="area-detalle-meta-row">
                                <span className="area-detalle-meta-label">
                                    Creado
                                </span>
                                <span className="area-detalle-meta-value">
                                    {formatDate(area.created_at)}
                                </span>
                            </div>
                            {area.updated_at && (
                                <div className="area-detalle-meta-row">
                                    <span className="area-detalle-meta-label">
                                        Actualizado
                                    </span>
                                    <span className="area-detalle-meta-value">
                                        {formatDate(area.updated_at)}
                                    </span>
                                </div>
                            )}
                            <div className="area-detalle-meta-row">
                                <span className="area-detalle-meta-label">
                                    ID
                                </span>
                                <code
                                    style={{
                                        fontSize: "var(--font-size-xs)",
                                        color: "var(--color-text-hint)",
                                        fontFamily: "monospace",
                                    }}
                                >
                                    {area.id}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna derecha: incidentes */}
                <div>
                    <div
                        className="card"
                        style={{ padding: "var(--space-lg)" }}
                    >
                        {/* Header de la sección */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "var(--space-md)",
                                gap: 10,
                                flexWrap: "wrap",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                            >
                                <h2
                                    className="area-detalle-section-title"
                                    style={{ margin: 0 }}
                                >
                                    Incidentes asociados
                                </h2>
                                <span
                                    style={{
                                        minWidth: 28,
                                        textAlign: "center",
                                        borderRadius: "var(--radius-full)",
                                        padding: "3px 8px",
                                        fontSize: "var(--font-size-xs)",
                                        fontWeight:
                                            "var(--font-weight-semibold)",
                                        background:
                                            incidentes.length > 0
                                                ? "var(--color-error-bg)"
                                                : "var(--color-bg-muted)",
                                        color:
                                            incidentes.length > 0
                                                ? "var(--color-error)"
                                                : "var(--color-text-hint)",
                                        border: `1px solid ${incidentes.length > 0 ? "var(--color-error-border)" : "var(--color-border-light)"}`,
                                    }}
                                >
                                    {incidentes.length}
                                </span>
                            </div>

                            {/* Botón asociar — solo admin */}
                            {isTechOrAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(true)}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                        padding: "7px 14px",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--color-primary)",
                                        background: "transparent",
                                        color: "var(--color-primary)",
                                        fontSize: "var(--font-size-xs)",
                                        fontWeight:
                                            "var(--font-weight-semibold)",
                                        cursor: "pointer",
                                        transition:
                                            "background var(--transition-fast), color var(--transition-fast)",
                                        whiteSpace: "nowrap",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background =
                                            "var(--color-primary)";
                                        e.currentTarget.style.color = "#fff";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background =
                                            "transparent";
                                        e.currentTarget.style.color =
                                            "var(--color-primary)";
                                    }}
                                >
                                    <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Asociar incidente
                                </button>
                            )}
                        </div>

                        {incidentes.length === 0 ? (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "var(--space-xl) var(--space-lg)",
                                    background: "var(--color-bg-muted)",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px dashed var(--color-border-light)",
                                    textAlign: "center",
                                }}
                            >
                                <svg
                                    width="28"
                                    height="28"
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
                                    No hay incidentes asociados a esta área.
                                </p>
                                {isTechOrAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(true)}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 6,
                                            padding: "7px 16px",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--color-primary)",
                                            background: "transparent",
                                            color: "var(--color-primary)",
                                            fontSize: "var(--font-size-xs)",
                                            fontWeight:
                                                "var(--font-weight-semibold)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <svg
                                            width="13"
                                            height="13"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <line
                                                x1="12"
                                                y1="5"
                                                x2="12"
                                                y2="19"
                                            />
                                            <line
                                                x1="5"
                                                y1="12"
                                                x2="19"
                                                y2="12"
                                            />
                                        </svg>
                                        Asociar el primer incidente
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 10,
                                }}
                            >
                                {incidentes.map((incident) => {
                                    const pStyle = getPriorityStyle(
                                        incident.priority,
                                    );
                                    return (
                                        <div
                                            key={incident.id}
                                            onClick={() =>
                                                router.push(
                                                    resolveIncidentPath(
                                                        incident.id,
                                                    ),
                                                )
                                            }
                                            style={{
                                                border: "1px solid var(--color-border-light)",
                                                borderLeft: `4px solid ${pStyle.color}`,
                                                borderRadius:
                                                    "var(--radius-sm)",
                                                padding:
                                                    "var(--space-sm) var(--space-md)",
                                                background:
                                                    "var(--color-bg-muted)",
                                                cursor: "pointer",
                                                transition:
                                                    "background var(--transition-fast), box-shadow var(--transition-fast)",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background =
                                                    "var(--color-bg-card)";
                                                e.currentTarget.style.boxShadow =
                                                    "0 2px 8px rgba(0,0,0,0.08)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background =
                                                    "var(--color-bg-muted)";
                                                e.currentTarget.style.boxShadow =
                                                    "none";
                                            }}
                                        >
                                            <p
                                                style={{
                                                    margin: "0 0 8px",
                                                    fontWeight:
                                                        "var(--font-weight-semibold)",
                                                    fontSize:
                                                        "var(--font-size-small)",
                                                    color: "var(--color-primary)",
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                {incident.descripcion ||
                                                    "Sin descripción"}
                                            </p>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 6,
                                                    flexWrap: "wrap",
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <span
                                                    className={`badge ${getStatusBadgeClass(incident.status)}`}
                                                    style={{
                                                        fontSize:
                                                            "var(--font-size-xs)",
                                                    }}
                                                >
                                                    {incident.status}
                                                </span>
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        padding: "3px 10px",
                                                        borderRadius:
                                                            "var(--radius-full)",
                                                        fontSize:
                                                            "var(--font-size-xs)",
                                                        fontWeight:
                                                            "var(--font-weight-medium)",
                                                        background: pStyle.bg,
                                                        color: pStyle.color,
                                                    }}
                                                >
                                                    {pStyle.label}
                                                </span>
                                                {incident.campus_place && (
                                                    <span
                                                        className="badge"
                                                        style={{
                                                            fontSize:
                                                                "var(--font-size-xs)",
                                                        }}
                                                    >
                                                        {incident.campus_place}
                                                    </span>
                                                )}
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
                                                    {formatDate(
                                                        incident.created_at,
                                                    )}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize:
                                                            "var(--font-size-xs)",
                                                        color: "var(--color-text-hint)",
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
                </div>
            </div>

            {/* Modal */}
            {modalOpen && area && (
                <AsociarIncidenteModal
                    areaId={area.id}
                    areaName={area.nombre}
                    areaLugar={area.lugar_campus}
                    incidentesYaAsociados={incidentes.map((i) => i.id)}
                    onClose={() => setModalOpen(false)}
                    onAsociado={handleIncidenteAsociado}
                    currentUserId={currentUserId}
                    userRole={userRole}
                />
            )}

            <style>{`
                /* ── Layout ── */
                .area-detalle-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-md);
                    align-items: start;
                }
                @media (max-width: 720px) {
                    .area-detalle-grid { grid-template-columns: 1fr; }
                }

                /* ── Tipografía de detalle ── */
                .area-detalle-section-title {
                    font-size: var(--font-size-small);
                    font-weight: var(--font-weight-semibold);
                    color: var(--color-text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    margin: 0 0 var(--space-md);
                }
                .area-detalle-meta-row {
                    display: flex;
                    align-items: baseline;
                    gap: var(--space-md);
                }
                .area-detalle-meta-label {
                    font-size: var(--font-size-xs);
                    font-weight: var(--font-weight-semibold);
                    color: var(--color-text-hint);
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    flex-shrink: 0;
                    min-width: 100px;
                }
                .area-detalle-meta-value {
                    font-size: var(--font-size-small);
                    color: var(--color-text-primary);
                }

                /* ── Modal overlay ── */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.45);
                    backdrop-filter: blur(2px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: var(--space-md);
                }

                /* ── Modal panel ── */
                .modal-panel {
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border-light);
                    border-radius: var(--radius-lg, 12px);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
                    width: 100%;
                    max-width: 640px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                /* ── Modal header ── */
                .modal-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: var(--space-md);
                    padding: var(--space-lg) var(--space-lg) var(--space-md);
                    border-bottom: 1px solid var(--color-border-light);
                    flex-shrink: 0;
                }
                .modal-title {
                    font-size: var(--font-size-h3);
                    font-weight: var(--font-weight-bold);
                    color: var(--color-text-primary);
                    margin: 0 0 4px;
                }
                .modal-subtitle {
                    font-size: var(--font-size-xs);
                    color: var(--color-text-secondary);
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .modal-lugar-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                    font-size: var(--font-size-xs);
                    font-weight: var(--font-weight-semibold);
                    background: var(--color-primary-bg, rgba(59,130,246,0.08));
                    color: var(--color-primary);
                    border: 1px solid var(--color-primary);
                    opacity: 0.8;
                }
                .modal-close-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--color-text-hint);
                    padding: 4px;
                    border-radius: var(--radius-sm);
                    flex-shrink: 0;
                    transition: color var(--transition-fast), background var(--transition-fast);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-close-btn:hover {
                    color: var(--color-text-primary);
                    background: var(--color-bg-muted);
                }

                /* ── Modal filtros ── */
                .modal-filters {
                    padding: var(--space-md) var(--space-lg);
                    border-bottom: 1px solid var(--color-border-light);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-sm);
                    flex-shrink: 0;
                }
                .modal-search-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .modal-search-icon {
                    position: absolute;
                    left: 12px;
                    color: var(--color-text-hint);
                    pointer-events: none;
                }
                .modal-search-input {
                    width: 100%;
                    padding: 9px 36px 9px 36px;
                    border: 1px solid var(--color-border-light);
                    border-radius: var(--radius-sm);
                    background: var(--color-bg-muted);
                    color: var(--color-text-primary);
                    font-size: var(--font-size-small);
                    outline: none;
                    transition: border-color var(--transition-fast);
                }
                .modal-search-input:focus {
                    border-color: var(--color-primary);
                    background: var(--color-bg-card);
                }
                .modal-search-clear {
                    position: absolute;
                    right: 10px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--color-text-hint);
                    padding: 2px;
                    display: flex;
                    align-items: center;
                }
                .modal-search-clear:hover { color: var(--color-text-primary); }

                .modal-filters-row {
                    display: flex;
                    gap: var(--space-sm);
                    flex-wrap: wrap;
                    align-items: center;
                }
                .modal-filter-select {
                    flex: 1;
                    min-width: 120px;
                    padding: 7px 10px;
                    border: 1px solid var(--color-border-light);
                    border-radius: var(--radius-sm);
                    background: var(--color-bg-muted);
                    color: var(--color-text-primary);
                    font-size: var(--font-size-xs);
                    outline: none;
                    cursor: pointer;
                }
                .modal-filter-select:focus { border-color: var(--color-primary); }

                .modal-date-field {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    flex: 1;
                    min-width: 120px;
                }
                .modal-date-label {
                    font-size: var(--font-size-xs);
                    color: var(--color-text-hint);
                    font-weight: var(--font-weight-medium);
                }
                .modal-clear-filters {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: var(--font-size-xs);
                    color: var(--color-text-secondary);
                    text-decoration: underline;
                    padding: 0;
                    white-space: nowrap;
                    align-self: flex-end;
                }
                .modal-clear-filters:hover { color: var(--color-primary); }

                /* ── Error inline ── */
                .modal-error {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0 var(--space-lg);
                    padding: 10px 14px;
                    background: var(--color-error-bg);
                    border: 1px solid var(--color-error-border);
                    border-radius: var(--radius-sm);
                    font-size: var(--font-size-xs);
                    color: var(--color-error);
                    flex-shrink: 0;
                }

                /* ── Resultados ── */
                .modal-results {
                    flex: 1;
                    overflow-y: auto;
                    padding: var(--space-md) var(--space-lg);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .modal-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: var(--space-xl);
                    color: var(--color-text-secondary);
                    font-size: var(--font-size-small);
                }
                .modal-spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid var(--color-border-light);
                    border-top-color: var(--color-primary);
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .modal-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    padding: var(--space-xl);
                    text-align: center;
                    color: var(--color-text-secondary);
                    font-size: var(--font-size-small);
                }
                .modal-empty p { margin: 0; }

                /* ── Item de resultado ── */
                .modal-result-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: var(--space-sm) var(--space-md);
                    border: 1px solid var(--color-border-light);
                    border-radius: var(--radius-sm);
                    background: var(--color-bg-muted);
                    cursor: pointer;
                    transition: border-color var(--transition-fast), background var(--transition-fast);
                }
                .modal-result-item:hover:not(.already-associated) {
                    border-color: var(--color-primary);
                    background: var(--color-bg-card);
                }
                .modal-result-item.selected {
                    border-color: var(--color-primary);
                    background: var(--color-primary-bg, rgba(59,130,246,0.06));
                }
                .modal-result-item.already-associated {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .modal-result-desc {
                    margin: 0 0 6px;
                    font-weight: var(--font-weight-semibold);
                    font-size: var(--font-size-small);
                    color: var(--color-text-primary);
                    line-height: 1.4;
                    /* Truncar a 2 líneas en pantallas pequeñas */
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .modal-result-badges {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    margin-bottom: 6px;
                }
                .modal-result-date {
                    font-size: var(--font-size-xs);
                    color: var(--color-text-hint);
                }
                .modal-badge-associated {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                    font-size: var(--font-size-xs);
                    font-weight: var(--font-weight-semibold);
                    background: var(--color-success-bg);
                    color: var(--color-success);
                    border: 1px solid var(--color-success-border);
                }

                /* ── Footer del modal ── */
                .modal-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-md);
                    padding: var(--space-md) var(--space-lg);
                    border-top: 1px solid var(--color-border-light);
                    flex-shrink: 0;
                    flex-wrap: wrap;
                }
                .modal-count {
                    font-size: var(--font-size-xs);
                    color: var(--color-text-hint);
                }

                /* ── Estado de éxito ── */
                .modal-success {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-md);
                    padding: var(--space-xl) var(--space-lg);
                    text-align: center;
                    flex: 1;
                }
                .modal-success-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: var(--color-success-bg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-success-text {
                    font-size: var(--font-size-body);
                    font-weight: var(--font-weight-semibold);
                    color: var(--color-text-primary);
                    margin: 0;
                }

                /* ── Responsive modal ── */
                @media (max-width: 480px) {
                    .modal-panel { max-height: 100vh; border-radius: var(--radius-md) var(--radius-md) 0 0; align-self: flex-end; }
                    .modal-overlay { align-items: flex-end; padding: 0; }
                    .modal-filters-row { flex-direction: column; }
                    .modal-filter-select { min-width: unset; width: 100%; }
                    .modal-footer { flex-direction: column-reverse; align-items: stretch; }
                    .modal-footer > div { width: 100%; justify-content: stretch; }
                    .modal-footer > div button { flex: 1; }
                    .modal-count { text-align: center; }
                }
            `}</style>
        </div>
    );
}
