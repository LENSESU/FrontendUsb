"use client";

import { useEffect, useState } from "react";
import { restoreAuthSession } from "@/utils/auth";
import { IncidentPriorityBadge } from "@/components/IncidentPriorityBadge";
import {
    getPriorityRowClass,
    getPriorityCardClass,
} from "@/utils/incidentPriority";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Props = {
    auth: any;
    onLogout: () => void;
    isLoggingOut: boolean;
};

type Incident = {
    id: string;
    realId: string;
    category: string;
    user: string;
    status: string | null;
    priority: string;
    place: string;
    date: string;
    rawDate: number; // timestamp para ordenar
};

const STATUS_OPTIONS = [
    { value: "Nuevo", label: "Abierto" },
    { value: "En_proceso", label: "En progreso" },
    { value: "Resuelto", label: "Resuelto" },
] as const;

type SortKey = "priority" | "date_desc" | "date_asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "priority", label: "Prioridad" },
    { value: "date_desc", label: "Más reciente" },
    { value: "date_asc", label: "Más antiguo" },
];

const PRIORITY_ORDER: Record<string, number> = { Alta: 0, Media: 1, Baja: 2 };

function normalizeIncidentStatus(status: string | null | undefined): string {
    if (!status) return "Nuevo";
    if (status === "En progreso") return "En_proceso";
    return status;
}

function formatIncidentStatusLabel(status: string | null): string {
    const normalized = normalizeIncidentStatus(status);
    return (
        STATUS_OPTIONS.find((option) => option.value === normalized)?.label ??
        normalized
    );
}

function getStatusSelectOptions(): Array<(typeof STATUS_OPTIONS)[number]> {
    return [...STATUS_OPTIONS];
}

function getStatusBadgeClass(status: string | null): string {
    const normalized = normalizeIncidentStatus(status);
    if (normalized === "Nuevo") return "bg-yellow-100 text-yellow-700";
    if (normalized === "En_proceso") return "bg-blue-100 text-blue-700";
    return "bg-green-100 text-green-700";
}

function getFirstName(email: string) {
    return email.split("@")[0];
}

function selectClass(active: boolean) {
    return active
        ? "text-xs px-3 py-1 rounded-full font-semibold cursor-pointer border-2 border-orange-500 bg-orange-500 text-white shadow-sm focus:outline-none transition-all"
        : "text-xs px-3 py-1 rounded-full font-medium cursor-pointer border border-[var(--color-border-light)] bg-white text-[var(--color-text-primary)] hover:border-orange-400 hover:text-orange-500 focus:outline-none transition-all";
}

function selectClassMobile(active: boolean) {
    return active
        ? "text-[11px] px-3 py-1.5 w-full rounded-full font-semibold cursor-pointer border-2 border-orange-500 bg-orange-500 text-white shadow-sm focus:outline-none transition-all"
        : "text-[11px] px-3 py-1.5 w-full rounded-full font-medium cursor-pointer border border-[var(--color-border-light)] bg-white text-[var(--color-text-primary)] hover:border-orange-400 hover:text-orange-500 focus:outline-none transition-all";
}

export default function AdminDashboardHome({ auth }: Props) {
    const router = useRouter();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(
        null,
    );
    const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>(
        {},
    );
    const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);

    const [filterStatus, setFilterStatus] = useState("Todos");
    const [filterPriority, setFilterPriority] = useState("Todas");
    const [filterCategory, setFilterCategory] = useState("Todas");
    const [sortKey, setSortKey] = useState<SortKey>("date_desc");
    const [categories, setCategories] = useState<string[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        async function fetchData() {
            try {
                const session = await restoreAuthSession();
                if (!session?.accessToken) return;

                const token = session.accessToken;

                const [incRes, catRes] = await Promise.all([
                    fetch(`${API}/api/v1/incidents/?page=1&limit=100`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${API}/api/v1/categories/`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                if (!incRes.ok) throw new Error("Error cargando incidentes");
                if (!catRes.ok) throw new Error("Error cargando categorías");

                const incidentsData = await incRes.json();
                const categoriesData = await catRes.json();

                const incidentsArray = incidentsData.items || [];
                const categoriesArray = categoriesData.items || [];

                const categoryMap: Record<string, string> = {};
                categoriesArray.forEach((cat: any) => {
                    categoryMap[cat.id] = cat.name;
                });

                setCategories(categoriesArray.map((cat: any) => cat.name));

                const mapped: Incident[] = incidentsArray.map((i: any) => ({
                    id: `#${String(i.id).slice(0, 8).toUpperCase()}`,
                    realId: i.id,
                    category: categoryMap[i.category_id] || "Sin categoría",
                    user: i.student_id
                        ? String(i.student_id).slice(0, 8).toUpperCase()
                        : "—",
                    status: normalizeIncidentStatus(i.status),
                    priority: i.priority || "Sin prioridad",
                    place: i.campus_place || "Sin ubicación",
                    date: new Date(i.created_at).toLocaleDateString(),
                    rawDate: new Date(i.created_at).getTime(),
                }));

                setIncidents(mapped);
                setStatusDrafts(
                    mapped.reduce<Record<string, string>>((acc, incident) => {
                        acc[incident.realId] = normalizeIncidentStatus(
                            incident.status,
                        );
                        return acc;
                    }, {}),
                );
            } catch (err) {
                console.error(err);
                const mockIncidents: Incident[] = [
                    {
                        id: "#A1B2C3D4",
                        realId: "a1b2c3d4-0000-0000-0000-000000000001",
                        category: "Infraestructura",
                        user: "estudiante@correo.usbcali.edu.co",
                        status: "Nuevo",
                        priority: "Alta",
                        place: "Bloque A – Piso 2",
                        date: new Date().toLocaleDateString(),
                        rawDate: Date.now(),
                    },
                    {
                        id: "#B2C3D4E5",
                        realId: "b2c3d4e5-0000-0000-0000-000000000002",
                        category: "Electricidad",
                        user: "juan@correo.usbcali.edu.co",
                        status: "Nuevo",
                        priority: "Alta",
                        place: "Cafetería Central",
                        date: new Date().toLocaleDateString(),
                        rawDate: Date.now() - 3600000,
                    },
                    {
                        id: "#C3D4E5F6",
                        realId: "c3d4e5f6-0000-0000-0000-000000000003",
                        category: "Plomería",
                        user: "maria@correo.usbcali.edu.co",
                        status: "En_proceso",
                        priority: "Media",
                        place: "Laboratorio 101",
                        date: new Date(
                            Date.now() - 86400000,
                        ).toLocaleDateString(),
                        rawDate: Date.now() - 86400000,
                    },
                    {
                        id: "#D4E5F6G7",
                        realId: "d4e5f6g7-0000-0000-0000-000000000004",
                        category: "Limpieza",
                        user: "pedro@correo.usbcali.edu.co",
                        status: "En_proceso",
                        priority: "Media",
                        place: "Biblioteca – P3",
                        date: new Date(
                            Date.now() - 86400000,
                        ).toLocaleDateString(),
                        rawDate: Date.now() - 90000000,
                    },
                    {
                        id: "#E5F6G7H8",
                        realId: "e5f6g7h8-0000-0000-0000-000000000005",
                        category: "Iluminación",
                        user: "ana@correo.usbcali.edu.co",
                        status: "Resuelto",
                        priority: "Baja",
                        place: "Parqueadero Norte",
                        date: new Date(
                            Date.now() - 172800000,
                        ).toLocaleDateString(),
                        rawDate: Date.now() - 172800000,
                    },
                    {
                        id: "#F6G7H8I9",
                        realId: "f6g7h8i9-0000-0000-0000-000000000006",
                        category: "Infraestructura",
                        user: "luis@correo.usbcali.edu.co",
                        status: "Resuelto",
                        priority: "Baja",
                        place: "Aula 205",
                        date: new Date(
                            Date.now() - 259200000,
                        ).toLocaleDateString(),
                        rawDate: Date.now() - 259200000,
                    },
                ];
                setIncidents(mockIncidents);
                setCategories([
                    "Infraestructura",
                    "Electricidad",
                    "Plomería",
                    "Limpieza",
                    "Iluminación",
                ]);
                setStatusDrafts(
                    mockIncidents.reduce<Record<string, string>>((acc, i) => {
                        acc[i.realId] = i.status ?? "Nuevo";
                        return acc;
                    }, {}),
                );
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [refreshKey]);

    // ── FILTRAR Y ORDENAR ──
    const filtered = incidents
        .filter((i) => {
            const normalizedStatus = normalizeIncidentStatus(i.status);
            const matchStatus =
                filterStatus === "Todos" || normalizedStatus === filterStatus;
            const matchPriority =
                filterPriority === "Todas" || i.priority === filterPriority;
            const matchCategory =
                filterCategory === "Todas" || i.category === filterCategory;
            return matchStatus && matchPriority && matchCategory;
        })
        .sort((a, b) => {
            if (sortKey === "date_desc") return b.rawDate - a.rawDate;
            if (sortKey === "date_asc") return a.rawDate - b.rawDate;
            // priority
            return (
                (PRIORITY_ORDER[a.priority] ?? 3) -
                (PRIORITY_ORDER[b.priority] ?? 3)
            );
        });

    const hasActiveFilters =
        filterStatus !== "Todos" ||
        filterPriority !== "Todas" ||
        filterCategory !== "Todas" ||
        sortKey !== "date_desc";

    const clearFilters = () => {
        setFilterStatus("Todos");
        setFilterPriority("Todas");
        setFilterCategory("Todas");
        setSortKey("date_desc");
    };

    async function handleStatusUpdate(incident: Incident) {
        const draftStatus =
            statusDrafts[incident.realId] ??
            normalizeIncidentStatus(incident.status);
        const currentStatus = normalizeIncidentStatus(incident.status);
        if (draftStatus === currentStatus) return;

        setUpdatingIncidentId(incident.realId);
        setStatusError(null);
        setStatusFeedback(null);

        try {
            const session = await restoreAuthSession();
            if (!session?.accessToken) {
                setStatusError(
                    "No se pudo validar la sesión. Inicia sesión nuevamente.",
                );
                return;
            }
            const token = session.accessToken;

            async function patchIncidentStatus(nextStatus: string) {
                const response = await fetch(
                    `${API}/api/v1/incidents/${incident.realId}/status`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ estado: nextStatus }),
                    },
                );
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => null);
                    const errorMessage =
                        (typeof errorBody?.detail === "string" &&
                            errorBody.detail) ||
                        errorBody?.detail?.message ||
                        "No se pudo actualizar el estado.";
                    throw new Error(errorMessage);
                }
                return response.json();
            }

            if (currentStatus === "Nuevo" && draftStatus === "Resuelto") {
                await patchIncidentStatus("En_proceso");
            }

            const updatedIncident = await patchIncidentStatus(draftStatus);
            const updatedStatus = normalizeIncidentStatus(
                updatedIncident.status ?? draftStatus,
            );

            setIncidents((prev) =>
                prev.map((item) =>
                    item.realId === incident.realId
                        ? { ...item, status: updatedStatus }
                        : item,
                ),
            );
            setStatusDrafts((prev) => ({
                ...prev,
                [incident.realId]: updatedStatus,
            }));
            setStatusFeedback(`Estado actualizado para ${incident.id}.`);
            setTimeout(() => setStatusFeedback(null), 4000);
            setRefreshKey((k) => k + 1);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Error inesperado actualizando estado.";
            setStatusError(message);
        } finally {
            setUpdatingIncidentId(null);
        }
    }

    if (!auth) return <div>cargando...</div>;

    // ── Selector de orden reutilizable ──
    const SortToggle = ({ mobile }: { mobile?: boolean }) => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: mobile ? 6 : 4,
                flexWrap: mobile ? "wrap" : "nowrap",
            }}
        >
            <span
                style={{
                    fontSize: mobile ? 11 : 12,
                    fontWeight: 600,
                    color: "var(--color-text-hint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                }}
            >
                Ordenar:
            </span>
            {SORT_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortKey(opt.value)}
                    style={{
                        fontSize: mobile ? 11 : 12,
                        padding: mobile ? "5px 12px" : "4px 11px",
                        borderRadius: 999,
                        fontWeight: sortKey === opt.value ? 700 : 500,
                        cursor: "pointer",
                        border:
                            sortKey === opt.value
                                ? "2px solid var(--color-primary)"
                                : "1px solid var(--color-border-light)",
                        background:
                            sortKey === opt.value
                                ? "var(--color-primary)"
                                : "#fff",
                        color:
                            sortKey === opt.value
                                ? "#fff"
                                : "var(--color-text-primary)",
                        transition: "all 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                    }}
                >
                    {opt.value === "date_desc" && (
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            <polyline points="18 15 12 9 6 15" />
                        </svg>
                    )}
                    {opt.value === "date_asc" && (
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    )}
                    {opt.label}
                </button>
            ))}
        </div>
    );

    const FilterSelects = ({ mobile }: { mobile?: boolean }) => (
        <div
            className={
                mobile
                    ? "flex flex-col gap-2"
                    : "flex items-center justify-center gap-7 px-8"
            }
        >
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={
                    mobile
                        ? selectClassMobile(filterStatus !== "Todos")
                        : selectClass(filterStatus !== "Todos")
                }
            >
                <option value="Todos">Todos los estados</option>
                <option value="Nuevo">Nuevo</option>
                <option value="En_proceso">En progreso</option>
                <option value="Resuelto">Resuelto</option>
            </select>

            <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className={
                    mobile
                        ? selectClassMobile(filterPriority !== "Todas")
                        : selectClass(filterPriority !== "Todas")
                }
            >
                <option value="Todas">Todas las prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
            </select>

            <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={
                    mobile
                        ? selectClassMobile(filterCategory !== "Todas")
                        : selectClass(filterCategory !== "Todas")
                }
            >
                <option value="Todas">Todas las categorías</option>
                {categories.map((cat) => (
                    <option key={cat} value={cat}>
                        {cat}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-0 sm:p-6 lg:px-8">
            {/* ── HEADER ── */}
            <header className="mb-6 sm:mb-8">
                {/* MOBILE */}
                <div className="-mx-4 mb-4 md:hidden">
                    <div className="bg-[var(--color-bg-muted)] px-4 py-4">
                        <p className="font-bold text-[var(--color-text-primary)]">
                            ¡Hola, {getFirstName(auth.email ?? "Admin")}!
                        </p>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Gestión general del sistema.
                        </p>
                        <h2 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)] text-center">
                            Gestión de incidentes
                        </h2>

                        <div className="mt-3 card p-3 w-full">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                    </svg>
                                    Filtros y orden
                                </p>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-[11px] text-[var(--color-primary)] hover:underline"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            <FilterSelects mobile />
                            <div style={{ marginTop: 8 }}>
                                <SortToggle mobile />
                            </div>
                        </div>
                    </div>
                </div>

                {/* DESKTOP */}
                <div className="hidden md:flex justify-between items-start">
                    <div className="w-full">
                        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                            Panel Administrador
                        </h1>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            Bienvenido, {getFirstName(auth.email ?? "Admin")}
                        </p>
                        <h2 className="mt-4 text-3xl font-bold text-[var(--color-text-primary)] text-center">
                            Gestión de incidentes
                        </h2>

                        <div className="mt-3 card p-3 w-full">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                                    <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                    </svg>
                                    Filtros y orden
                                </p>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-xs text-[var(--color-primary)] hover:underline"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                            {/* Filtros + ordenamiento en una sola fila */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: 8,
                                }}
                            >
                                <FilterSelects />
                                <div style={{ paddingRight: 8 }}>
                                    <SortToggle />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── TABLA ── */}
            <section className="card">
                <div className="border-b px-4 py-3 font-semibold flex items-center justify-between">
                    <span>
                        Incidentes Recientes
                        {hasActiveFilters && (
                            <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">
                                ({filtered.length} resultado
                                {filtered.length !== 1 ? "s" : ""})
                            </span>
                        )}
                    </span>
                    {/* Indicador del orden activo */}
                    <span
                        style={{
                            fontSize: 11,
                            color: "var(--color-text-hint)",
                            fontWeight: 500,
                        }}
                    >
                        {SORT_OPTIONS.find((o) => o.value === sortKey)?.label}
                    </span>
                </div>

                {statusError && (
                    <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {statusError}
                    </div>
                )}
                {statusFeedback && (
                    <div className="mx-4 mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        {statusFeedback}
                    </div>
                )}

                {/* DESKTOP */}
                <div className="hidden md:block p-4">
                    {loading ? (
                        <p>Cargando...</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-secondary)] py-6 text-center">
                            No hay incidentes con los filtros seleccionados.
                        </p>
                    ) : (
                        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                            <thead>
                                <tr className="bg-[var(--color-bg-muted)] text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                                    <th className="rounded-l-md px-3 py-2">
                                        ID
                                    </th>
                                    <th className="px-3 py-2">Categoría</th>
                                    <th className="px-3 py-2">Usuario</th>
                                    <th className="px-3 py-2">Estado</th>
                                    <th className="px-3 py-2">Prioridad</th>
                                    <th className="px-3 py-2">Lugar</th>
                                    <th
                                        className="px-3 py-2 cursor-pointer select-none"
                                        onClick={() =>
                                            setSortKey(
                                                sortKey === "date_desc"
                                                    ? "date_asc"
                                                    : "date_desc",
                                            )
                                        }
                                        title="Clic para cambiar orden"
                                        style={{ whiteSpace: "nowrap" }}
                                    >
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                            }}
                                        >
                                            Fecha
                                            {sortKey === "date_desc" && (
                                                <svg
                                                    width="10"
                                                    height="10"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                >
                                                    <polyline points="18 15 12 9 6 15" />
                                                </svg>
                                            )}
                                            {sortKey === "date_asc" && (
                                                <svg
                                                    width="10"
                                                    height="10"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                >
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            )}
                                            {sortKey === "priority" && (
                                                <svg
                                                    width="10"
                                                    height="10"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    style={{ opacity: 0.35 }}
                                                >
                                                    <line
                                                        x1="12"
                                                        y1="5"
                                                        x2="12"
                                                        y2="19"
                                                    />
                                                    <polyline points="19 12 12 19 5 12" />
                                                </svg>
                                            )}
                                        </span>
                                    </th>
                                    <th className="rounded-r-md px-3 py-2">
                                        Acción
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((i) => (
                                    <tr
                                        key={i.id}
                                        className={`border-b border-[var(--color-border-light)] transition ${getPriorityRowClass(i.priority)} ${i.priority !== "Alta" ? "hover:bg-[var(--color-bg-muted)]" : ""}`}
                                    >
                                        <td
                                            className="px-3 py-3 font-medium text-[var(--color-primary)] cursor-pointer"
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/admin/dashboard/incidente-detalle?id=${i.realId}`,
                                                )
                                            }
                                        >
                                            {i.id}
                                        </td>
                                        <td className="px-3 py-3">
                                            {i.category}
                                        </td>
                                        <td className="px-3 py-3">{i.user}</td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(i.status)}`}
                                            >
                                                {formatIncidentStatusLabel(
                                                    i.status,
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <IncidentPriorityBadge
                                                priority={i.priority}
                                            />
                                        </td>
                                        <td className="px-3 py-3">{i.place}</td>
                                        <td className="px-3 py-3 text-[var(--color-text-secondary)]">
                                            {i.date}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={
                                                        statusDrafts[
                                                            i.realId
                                                        ] ??
                                                        normalizeIncidentStatus(
                                                            i.status,
                                                        )
                                                    }
                                                    onChange={(e) =>
                                                        setStatusDrafts(
                                                            (prev) => ({
                                                                ...prev,
                                                                [i.realId]:
                                                                    e.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                    className="rounded-md border border-[var(--color-border-light)] px-2 py-1 text-xs"
                                                    disabled={
                                                        updatingIncidentId ===
                                                        i.realId
                                                    }
                                                >
                                                    {getStatusSelectOptions().map(
                                                        (option) => (
                                                            <option
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                                <button
                                                    onClick={() =>
                                                        handleStatusUpdate(i)
                                                    }
                                                    className="rounded-md border border-[var(--color-primary)] px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                                                    disabled={
                                                        updatingIncidentId ===
                                                            i.realId ||
                                                        (statusDrafts[
                                                            i.realId
                                                        ] ??
                                                            normalizeIncidentStatus(
                                                                i.status,
                                                            )) ===
                                                            normalizeIncidentStatus(
                                                                i.status,
                                                            )
                                                    }
                                                >
                                                    {updatingIncidentId ===
                                                    i.realId
                                                        ? "Guardando..."
                                                        : "Guardar"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MOBILE */}
                <ul className="md:hidden divide-y">
                    {loading ? (
                        <li className="p-4 text-sm">Cargando...</li>
                    ) : filtered.length === 0 ? (
                        <li className="p-4 text-sm text-[var(--color-text-secondary)]">
                            No hay incidentes con los filtros seleccionados.
                        </li>
                    ) : (
                        filtered.map((i) => (
                            <li
                                key={i.id}
                                className={`p-4 ${getPriorityCardClass(i.priority)}`}
                            >
                                <p className="font-semibold text-[var(--color-primary)]">
                                    {i.id}
                                </p>
                                <p className="text-sm">{i.category}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                    {i.user}
                                </p>
                                <p className="text-xs flex items-center gap-1 flex-wrap">
                                    <span>
                                        Estado:{" "}
                                        {formatIncidentStatusLabel(i.status)}
                                    </span>
                                    <span>·</span>
                                    <span>Prioridad:</span>
                                    <IncidentPriorityBadge
                                        priority={i.priority}
                                    />
                                </p>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                    {i.place} · {i.date}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <select
                                        value={
                                            statusDrafts[i.realId] ??
                                            normalizeIncidentStatus(i.status)
                                        }
                                        onChange={(e) =>
                                            setStatusDrafts((prev) => ({
                                                ...prev,
                                                [i.realId]: e.target.value,
                                            }))
                                        }
                                        className="rounded-md border border-[var(--color-border-light)] px-2 py-1 text-xs"
                                        disabled={
                                            updatingIncidentId === i.realId
                                        }
                                    >
                                        {getStatusSelectOptions().map(
                                            (option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                    <button
                                        onClick={() => handleStatusUpdate(i)}
                                        className="rounded-md border border-[var(--color-primary)] px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={
                                            updatingIncidentId === i.realId ||
                                            (statusDrafts[i.realId] ??
                                                normalizeIncidentStatus(
                                                    i.status,
                                                )) ===
                                                normalizeIncidentStatus(
                                                    i.status,
                                                )
                                        }
                                    >
                                        {updatingIncidentId === i.realId
                                            ? "Guardando..."
                                            : "Guardar"}
                                    </button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </section>
        </div>
    );
}
