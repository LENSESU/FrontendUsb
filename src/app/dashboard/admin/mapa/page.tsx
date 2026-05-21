"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";
import type { IncidentMarker } from "@/components/IncidentsMap";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// react-leaflet requiere window; lo cargamos en cliente.
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

type RawIncident = {
  id: string;
  category_id: string;
  status: string | null;
  priority: string | null;
  latitude: number | null;
  longitude: number | null;
  campus_place: string | null;
  created_at: string;
};

type Category = { id: string; name: string };

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

function selectClass(active: boolean) {
  return active
    ? "text-xs px-3 py-1.5 rounded-full font-semibold cursor-pointer border-2 border-orange-500 bg-orange-500 text-white shadow-sm focus:outline-none transition-all"
    : "text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer border border-[var(--color-border-light)] bg-white text-[var(--color-text-primary)] hover:border-orange-400 hover:text-orange-500 focus:outline-none transition-all";
}

export default function AdminMapPage() {
  const router = useRouter();

  const [estado, setEstado] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [incidents, setIncidents] = useState<IncidentMarker[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.id] = c.name;
    return map;
  }, [categories]);

  // Cargar categorías una sola vez (poblar el filtro).
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const session = await restoreAuthSession();
        if (!session?.accessToken) return;
        const res = await fetch(`${API}/api/v1/categories/`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const items: Category[] = Array.isArray(data) ? data : data.items ?? [];
        if (isMounted) setCategories(items);
      } catch {
        // Silencioso: si falla, el filtro de categoría queda vacío.
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cargar incidentes cada vez que cambian los filtros.
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

        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "100");
        if (estado) params.set("estado", estado);
        if (categoriaId) params.set("categoria_id", categoriaId);
        if (prioridad) params.set("prioridad", prioridad);
        if (fechaInicio) {
          // <input type="date"> da YYYY-MM-DD; backend espera ISO 8601.
          params.set("fecha_inicio", `${fechaInicio}T00:00:00`);
        }
        if (fechaFin) {
          params.set("fecha_fin", `${fechaFin}T23:59:59`);
        }

        const res = await fetch(
          `${API}/api/v1/incidents/?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          },
        );

        if (!res.ok) throw new Error("No se pudieron cargar los incidentes.");

        const data = await res.json();
        const items: RawIncident[] = Array.isArray(data) ? data : data.items ?? [];

        const markers: IncidentMarker[] = [];
        let skipped = 0;
        for (const raw of items) {
          if (raw.latitude == null || raw.longitude == null) {
            skipped += 1;
            continue;
          }
          markers.push({
            id: raw.id,
            category: categoryNameById[raw.category_id] ?? "Sin categoría",
            status: raw.status,
            priority: raw.priority,
            latitude: raw.latitude,
            longitude: raw.longitude,
            campusPlace: raw.campus_place,
            createdAt: raw.created_at,
          });
        }

        if (isMounted) {
          setIncidents(markers);
          setSkippedCount(skipped);
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
  }, [estado, categoriaId, prioridad, fechaInicio, fechaFin, categoryNameById]);

  const hasActiveFilters =
    estado !== "" ||
    categoriaId !== "" ||
    prioridad !== "" ||
    fechaInicio !== "" ||
    fechaFin !== "";

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

  return (
    <div className="mx-auto max-w-7xl px-4 pb-6 pt-0 sm:p-6 lg:px-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Mapa de incidentes
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Visualiza los incidentes reportados y filtra por estado, categoría,
            prioridad o rango de fechas.
          </p>
        </div>
        <span className="badge w-fit">Panel Administrador</span>
      </header>

      {/* ── Barra de filtros ── */}
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
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              className={
                fechaInicio
                  ? "rounded-md border-2 border-orange-500 bg-orange-50 px-2 py-1 text-xs font-medium text-[var(--color-text-primary)]"
                  : "rounded-md border border-[var(--color-border-light)] bg-white px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:border-orange-400"
              }
            />
          </div>

          {/* Fecha hasta */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase text-[var(--color-text-hint)]">
              Hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => setFechaFin(e.target.value)}
              className={
                fechaFin
                  ? "rounded-md border-2 border-orange-500 bg-orange-50 px-2 py-1 text-xs font-medium text-[var(--color-text-primary)]"
                  : "rounded-md border border-[var(--color-border-light)] bg-white px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:border-orange-400"
              }
            />
          </div>
        </div>

        {/* Leyenda + contador */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-light)] pt-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: "#dc2626" }}
              />
              Alta
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: "#f97316" }}
              />
              Media
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: "#16a34a" }}
              />
              Baja
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: "#6b7280" }}
              />
              Sin prioridad
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {loading ? (
              "Cargando…"
            ) : (
              <>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {incidents.length}
                </span>{" "}
                incidente{incidents.length !== 1 ? "s" : ""} en el mapa
                {skippedCount > 0 ? (
                  <span className="ml-2 text-[var(--color-text-hint)]">
                    ({skippedCount} sin coordenadas)
                  </span>
                ) : null}
              </>
            )}
          </p>
        </div>
      </section>

      {/* ── Errores ── */}
      {error ? (
        <div className="alert-error mb-3">
          <p>{error}</p>
        </div>
      ) : null}

      {/* ── Mapa ── */}
      <section>
        <IncidentsMap incidents={incidents} onMarkerClick={handleMarkerClick} />
        {!loading && !error && incidents.length === 0 ? (
          <p className="mt-3 text-center text-sm text-[var(--color-text-secondary)]">
            {hasActiveFilters
              ? "Ningún incidente coincide con los filtros aplicados."
              : "Aún no hay incidentes con coordenadas para mostrar."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
