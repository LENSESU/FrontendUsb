"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";
import type { IncidentMarker, CriticalZone } from "@/components/IncidentsMap";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const IncidentsMap = dynamic(() => import("@/components/IncidentsMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: 520 }}
      className="flex items-center justify-center rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-muted)]"
    >
      <p className="text-sm text-[var(--color-text-secondary)]">Cargando mapa…</p>
    </div>
  ),
});

// ── Tipos ────────────────────────────────────────────────────────────────────

type RawGeoIncident = {
  id: string;
  category_name: string;
  status: string | null;
  priority: string | null;
  latitude: number;
  longitude: number;
  campus_place: string | null;
  created_at: string;
};

type RawCriticalZone = {
  zone: string;
  latitude: number | null;
  longitude: number | null;
  incident_count: number;
  score: number;
  criticality: string;
};

type Category = { id: string; name: string };

// ── Opciones de filtro ────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Nuevo", label: "Nuevo" },
  { value: "En_proceso", label: "En progreso" },
  { value: "Resuelto", label: "Resuelto" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas las prioridades" },
  { value: "Alta", label: "Alta" },
  { value: "Media", label: "Media" },
  { value: "Baja", label: "Baja" },
] as const;

// ── Helpers de estilo ─────────────────────────────────────────────────────────

function selectClass(active: boolean) {
  return active
    ? "text-xs px-3 py-1.5 rounded-full font-semibold cursor-pointer border-2 border-orange-500 bg-orange-500 text-white shadow-sm focus:outline-none transition-all"
    : "text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer border border-[var(--color-border-light)] bg-white text-[var(--color-text-primary)] hover:border-orange-400 hover:text-orange-500 focus:outline-none transition-all";
}

function dateInputClass(active: boolean) {
  return active
    ? "rounded-md border-2 border-orange-500 bg-orange-50 px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] w-full"
    : "rounded-md border border-[var(--color-border-light)] bg-white px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:border-orange-400 w-full";
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AdminMapPage() {
  const router = useRouter();

  // Filtros
  const [estado, setEstado] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Datos crudos (se cargan una sola vez)
  const [categories, setCategories] = useState<Category[]>([]);
  const [allIncidents, setAllIncidents] = useState<IncidentMarker[]>([]);
  const [criticalZones, setCriticalZones] = useState<CriticalZone[]>([]);

  // Estado UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Lookup categoría id → nombre (para el filtro de select) ──────────────
  const categoryNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.id] = c.name;
    return map;
  }, [categories]);

  // ── Carga inicial: categorías + incidentes geo + zonas críticas ───────────
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const session = await restoreAuthSession();
        if (!session?.accessToken) {
          throw new Error("No se encontró una sesión activa.");
        }

        const headers = { Authorization: `Bearer ${session.accessToken}` };

        // Tres fetches en paralelo
        const [catRes, geoRes, zonesRes] = await Promise.all([
          fetch(`${API}/api/v1/categories/`, { headers }),
          fetch(`${API}/api/v1/incidents/geo?page=1&limit=100`, { headers }),
          fetch(`${API}/api/v1/incidents/critical-zones`, { headers }),
        ]);

        // Categorías (no crítico, solo el select)
        if (catRes.ok) {
          const catData = await catRes.json();
          const items: Category[] = Array.isArray(catData)
            ? catData
            : catData.items ?? [];
          if (isMounted) setCategories(items);
        }

        // Incidentes geo
        if (!geoRes.ok) throw new Error("No se pudieron cargar los incidentes.");
        const geoData = await geoRes.json();
        const rawItems: RawGeoIncident[] = Array.isArray(geoData)
          ? geoData
          : geoData.items ?? [];

        const markers: IncidentMarker[] = rawItems.map((raw) => ({
          id: raw.id,
          category: raw.category_name ?? "Sin categoría",
          // Guardamos category_name también como categoryName para filtrar
          // por nombre cuando el usuario elige del select de categorías
          categoryId: "", // no viene del endpoint geo; filtraremos por nombre
          status: raw.status,
          priority: raw.priority,
          latitude: raw.latitude,
          longitude: raw.longitude,
          campusPlace: raw.campus_place,
          createdAt: raw.created_at,
        }));

        if (isMounted) setAllIncidents(markers);

        // Zonas críticas
        if (zonesRes.ok) {
          const zonesData: RawCriticalZone[] = await zonesRes.json();
          const zones: CriticalZone[] = zonesData
            .filter((z) => z.latitude != null && z.longitude != null)
            .map((z) => ({
              zone: z.zone,
              latitude: z.latitude as number,
              longitude: z.longitude as number,
              incidentCount: z.incident_count,
              score: z.score,
              criticality: z.criticality,
            }));
          if (isMounted) setCriticalZones(zones);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los incidentes.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Filtrado en memoria ───────────────────────────────────────────────────
  const filteredIncidents = useMemo(() => {
    return allIncidents.filter((inc) => {
      // Estado
      if (estado && inc.status !== estado) return false;

      // Categoría: comparamos el nombre porque /geo no retorna category_id
      if (categoriaId) {
        const expectedName = categoryNameById[categoriaId];
        if (expectedName && inc.category !== expectedName) return false;
      }

      // Prioridad
      if (prioridad && inc.priority !== prioridad) return false;

      // Fecha inicio
      if (fechaInicio) {
        const from = new Date(`${fechaInicio}T00:00:00`);
        if (new Date(inc.createdAt) < from) return false;
      }

      // Fecha fin
      if (fechaFin) {
        const to = new Date(`${fechaFin}T23:59:59`);
        if (new Date(inc.createdAt) > to) return false;
      }

      return true;
    });
  }, [allIncidents, estado, categoriaId, prioridad, fechaInicio, fechaFin, categoryNameById]);

  // ── Flags ─────────────────────────────────────────────────────────────────
  const hasActiveFilters =
    estado !== "" ||
    categoriaId !== "" ||
    prioridad !== "" ||
    fechaInicio !== "" ||
    fechaFin !== "";

  const skippedCount = allIncidents.length - filteredIncidents.length;

  function clearFilters() {
    setEstado("");
    setCategoriaId("");
    setPrioridad("");
    setFechaInicio("");
    setFechaFin("");
  }

  function handleMarkerClick(id: string) {
    router.push(`/dashboard/admin/dashboard/incidente-detalle?id=${id}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-4 pb-6 pt-0 sm:p-6 lg:px-8">

      {/* Encabezado */}
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Mapa de incidentes
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Visualiza incidentes y zonas críticas del campus. Los círculos
            indican concentración por zona; los pines, incidentes individuales.
          </p>
        </div>
        <span className="badge w-fit">Panel Administrador</span>
      </header>

      {/* Barra de filtros */}
      <section className="card p-3 sm:p-4 mb-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtros
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Grid de controles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">

          {/* Estado */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase text-[var(--color-text-hint)]">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className={selectClass(estado !== "")}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase text-[var(--color-text-hint)]">
              Categoría
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className={selectClass(categoriaId !== "")}
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Prioridad */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase text-[var(--color-text-hint)]">
              Prioridad
            </label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className={selectClass(prioridad !== "")}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha desde */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase text-[var(--color-text-hint)]">
              Desde
            </label>
            <input
              type="date"
              value={fechaInicio}
              max={fechaFin || undefined}
              onChange={(e) => setFechaInicio(e.target.value)}
              className={dateInputClass(fechaInicio !== "")}
            />
          </div>

          {/* Fecha hasta */}
          <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
            <label className="text-[11px] font-semibold uppercase text-[var(--color-text-hint)]">
              Hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => {
                const value = e.target.value;
                if (fechaInicio && value && value < fechaInicio) {
                  setFechaFin(fechaInicio);
                } else if (fechaFin && value && value > fechaFin) {
                  setFechaFin("");
                } else {
                  setFechaFin(value);
                }
              }}
              className={dateInputClass(fechaFin !== "")}
            />
          </div>
        </div>

        {/* Leyenda + contadores */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-light)] pt-3">

          {/* Leyenda prioridad (marcadores) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--color-text-secondary)]">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-hint)] mr-1">
              Pines
            </span>
            {[
              { color: "#dc2626", label: "Alta" },
              { color: "#f97316", label: "Media" },
              { color: "#16a34a", label: "Baja" },
              { color: "#6b7280", label: "Sin prioridad" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                {label}
              </span>
            ))}
          </div>

          {/* Leyenda zonas críticas */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--color-text-secondary)]">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-hint)] mr-1">
              Zonas
            </span>
            {[
              { color: "#dc2626", label: "Crítica alta" },
              { color: "#f97316", label: "Crítica media" },
              { color: "#16a34a", label: "Crítica baja" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-full border flex-shrink-0"
                  style={{ background: color, opacity: 0.4, borderColor: color }}
                />
                {label}
              </span>
            ))}
          </div>

          {/* Contador */}
          <p className="text-xs text-[var(--color-text-secondary)] ml-auto">
            {loading ? (
              "Cargando…"
            ) : (
              <>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {filteredIncidents.length}
                </span>{" "}
                incidente{filteredIncidents.length !== 1 ? "s" : ""} en el mapa
                {hasActiveFilters && skippedCount > 0 && (
                  <span className="ml-2 text-[var(--color-text-hint)]">
                    ({skippedCount} ocultado{skippedCount !== 1 ? "s" : ""} por filtros)
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="alert-error mb-3">
          <p>{error}</p>
        </div>
      )}

      {/* Mapa */}
      <section>
        <IncidentsMap
          incidents={filteredIncidents}
          criticalZones={criticalZones}
          onMarkerClick={handleMarkerClick}
        />
        {!loading && !error && filteredIncidents.length === 0 && (
          <p className="mt-3 text-center text-sm text-[var(--color-text-secondary)]">
            {hasActiveFilters
              ? "Ningún incidente coincide con los filtros aplicados."
              : "Aún no hay incidentes con coordenadas para mostrar."}
          </p>
        )}
      </section>
    </div>
  );
}