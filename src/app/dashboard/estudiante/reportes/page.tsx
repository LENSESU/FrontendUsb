"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";
import { IncidentStatusBadge } from "@/components/IncidentStatusBadge";
import { IncidentStatus } from "@/utils/incidentStatus";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ── Tipos ──────────────────────────────────────────────────────────────────

type Incident = {
  id: string;
  realId: string;
  category: string;
  place: string;
  date: string;
  fullDate: string;
  rawDate: Date;
  status: IncidentStatus;
};

type FilterStatus = "Todos" | "Nuevo" | "En_proceso" | "Resuelto";
type FilterSort   = "newest" | "oldest";
type ViewMode     = "cards" | "table";

// ── Helpers ────────────────────────────────────────────────────────────────

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.user_id || payload.id || null;
  } catch {
    return null;
  }
}

function formatDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateFull(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function normalizeStatus(raw: string | null | undefined): IncidentStatus {
  if (raw === "En_proceso" || raw === "En progreso") return "En_proceso";
  if (raw === "Resuelto") return "Resuelto";
  return "Nuevo";
}

const STATUS_LABELS: Record<FilterStatus, string> = {
  Todos:      "Todos los estados",
  Nuevo:      "Abierto",
  En_proceso: "En progreso",
  Resuelto:   "Resuelto",
};

// ── Skeletons ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ height: 6, background: "var(--color-border-light)" }} />
      <div style={{ padding: "var(--space-lg) var(--space-md)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span className="skeleton" style={{ width: 80, height: 12 }} />
          <span className="skeleton" style={{ width: 64, height: 22, borderRadius: 999 }} />
        </div>
        <span className="skeleton" style={{ width: "70%", height: 16, display: "block", marginBottom: 10 }} />
        <span className="skeleton" style={{ width: "50%", height: 13, display: "block", marginBottom: 16 }} />
        <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: 12 }} />
        <span className="skeleton" style={{ width: "45%", height: 12, display: "block" }} />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--color-border-light)]">
      {[80, 120, 110, 80, 90].map((w, i) => (
        <td key={i} style={{ padding: "12px" }}>
          <span className="skeleton" style={{ width: w, height: 14 }} />
        </td>
      ))}
    </tr>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export default function MisReportesPage() {
  const router = useRouter();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [viewMode, setViewMode]   = useState<ViewMode>("cards");

  const [filterStatus, setFilterStatus]     = useState<FilterStatus>("Todos");
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [filterSort, setFilterSort]         = useState<FilterSort>("newest");
  const [search, setSearch]                 = useState("");

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(incidents.map((i) => i.category)))],
    [incidents]
  );

  // ── Fetch ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      try {
        const session = await restoreAuthSession();
        if (!session?.accessToken) return;

        const token  = session.accessToken;
        const userId = getUserIdFromToken(token);

        const [incRes, catRes] = await Promise.all([
          fetch(`${API}/api/v1/incidents/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/v1/categories/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!incRes.ok) throw new Error("No se pudieron cargar los incidentes.");

        const incData = await incRes.json();
        const catData = await catRes.json();

        const incArray: any[] = Array.isArray(incData) ? incData : incData.items ?? [];
        const catArray: any[] = catData.items ?? [];

        const categoryMap: Record<string, string> = {};
        catArray.forEach((c: any) => { categoryMap[c.id] = c.name; });

        const mapped: Incident[] = incArray
          .filter((i: any) => i.student_id === userId)
          .map((i: any) => ({
            id:       `#${String(i.id).slice(0, 8).toUpperCase()}`,
            realId:   i.id,
            category: categoryMap[i.category_id] ?? "Sin categoría",
            place:    i.campus_place ?? "Sin ubicación",
            date:     formatDateShort(i.created_at),
            fullDate: formatDateFull(i.created_at),
            rawDate:  new Date(i.created_at),
            status:   normalizeStatus(i.status),
          }));

        setIncidents(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, []);

  // ── Filtrado ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = incidents;

    if (filterStatus !== "Todos") {
      result = result.filter((i) => i.status === filterStatus);
    }
    if (filterCategory !== "Todas") {
      result = result.filter((i) => i.category === filterCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.id.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.place.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) =>
      filterSort === "newest"
        ? b.rawDate.getTime() - a.rawDate.getTime()
        : a.rawDate.getTime() - b.rawDate.getTime()
    );
  }, [incidents, filterStatus, filterCategory, filterSort, search]);

  const hasFilters =
    filterStatus !== "Todos" || filterCategory !== "Todas" || search.trim() !== "";

  function clearFilters() {
    setFilterStatus("Todos");
    setFilterCategory("Todas");
    setSearch("");
  }

  function goToDetail(realId: string) {
    router.push(`/dashboard/estudiante/dashboard/incidente-detalle?id=${realId}`);
  }

  const counts = useMemo(() => ({
    total:     incidents.length,
    nuevo:     incidents.filter((i) => i.status === "Nuevo").length,
    enProceso: incidents.filter((i) => i.status === "En_proceso").length,
    resuelto:  incidents.filter((i) => i.status === "Resuelto").length,
  }), [incidents]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-0 sm:p-6 lg:px-8">

      {/* ── Header ── */}
      <header className="mb-6 sm:mb-8">
        <div className="-mx-4 bg-[var(--color-bg-muted)] px-4 py-4 mb-4 md:hidden">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Mis Reportes</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Historial de tus incidentes.</p>
        </div>
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Mis Reportes</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Historial completo de tus incidentes reportados.
          </p>
        </div>

        {/* Stats rápidas */}
        {!loading && incidents.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 16 }}>
            {[
              { label: "Total",       value: counts.total,     color: "var(--color-text-primary)" },
              { label: "Abiertos",    value: counts.nuevo,     color: "var(--color-primary)" },
              { label: "En progreso", value: counts.enProceso, color: "#2397f5" },
              { label: "Resueltos",   value: counts.resuelto,  color: "var(--color-success)" },
            ].map((stat) => (
              <div key={stat.label} className="card" style={{ padding: "10px 12px" }}>
                <p style={{ fontSize: 22, fontWeight: "var(--font-weight-bold)", color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 4 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── Error ── */}
      {error && (
        <div className="alert-error mb-6">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{error}</p>
        </div>
      )}

      {/* ── Filtros + toggle de vista ── */}
      <div className="card mb-4" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            color: "var(--color-text-secondary)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtros
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  fontSize: "var(--font-size-xs)", color: "var(--color-primary)",
                  background: "none", border: "none", cursor: "pointer",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                Limpiar
              </button>
            )}

            {/* Toggle vista — solo desktop */}
            <div
              className="hidden md:flex"
              style={{
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
              }}
            >
              {(["cards", "table"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  title={mode === "cards" ? "Vista en tarjetas" : "Vista en tabla"}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, border: "none", cursor: "pointer",
                    background: viewMode === mode ? "var(--color-primary)" : "transparent",
                    color: viewMode === mode ? "#fff" : "var(--color-text-hint)",
                    transition: "background var(--transition-fast), color var(--transition-fast)",
                  }}
                >
                  {mode === "cards" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6"  x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inputs de filtro */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="2"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text" placeholder="Buscar..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", height: 36, paddingLeft: 30, paddingRight: 10,
                border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-small)", color: "var(--color-text-primary)",
                background: "var(--color-bg-input)", outline: "none",
              }}
            />
          </div>

          <select
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            style={{
              height: 36, border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
              padding: "0 10px", fontSize: "var(--font-size-small)", outline: "none", cursor: "pointer",
              background: filterStatus !== "Todos" ? "var(--color-primary-bg)" : "var(--color-bg-input)",
              color: filterStatus !== "Todos" ? "var(--color-primary)" : "var(--color-text-primary)",
              fontWeight: filterStatus !== "Todos" ? "var(--font-weight-semibold)" : undefined,
            }}
          >
            {(Object.keys(STATUS_LABELS) as FilterStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select
            value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              height: 36, border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
              padding: "0 10px", fontSize: "var(--font-size-small)", outline: "none", cursor: "pointer",
              background: filterCategory !== "Todas" ? "var(--color-primary-bg)" : "var(--color-bg-input)",
              color: filterCategory !== "Todas" ? "var(--color-primary)" : "var(--color-text-primary)",
              fontWeight: filterCategory !== "Todas" ? "var(--font-weight-semibold)" : undefined,
            }}
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filterSort} onChange={(e) => setFilterSort(e.target.value as FilterSort)}
            style={{
              height: 36, border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
              padding: "0 10px", fontSize: "var(--font-size-small)", outline: "none", cursor: "pointer",
              background: "var(--color-bg-input)", color: "var(--color-text-primary)",
            }}
          >
            <option value="newest">Más reciente</option>
            <option value="oldest">Más antiguo</option>
          </select>
        </div>
      </div>

      {/* Contador */}
      {hasFilters && !loading && (
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: 12 }}>
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ══════════════════════════════════════════
          VISTA CARDS
          Mobile: siempre | Desktop: cuando viewMode === "cards"
          ══════════════════════════════════════════ */}
      <div className={viewMode === "table" ? "md:hidden" : ""}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "var(--space-md)" }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "var(--space-md)" }}>
            {filtered.map((incident) => (
              <div
                key={incident.realId}
                className="card card-clickable"
                onClick={() => goToDetail(incident.realId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") goToDetail(incident.realId); }}
              >
                <div className="card-stripe" />
                <div className="card-body">

                  {/* ID + badge */}
                  <div className="flex items-center justify-between mb-sm" style={{ flexWrap: "wrap", gap: "var(--space-xs)" }}>
                    <span style={{ color: "var(--color-text-hint)", fontFamily: "monospace", fontSize: "var(--font-size-xs)", letterSpacing: "0.04em" }}>
                      {incident.id}
                    </span>
                    <IncidentStatusBadge status={incident.status} />
                  </div>

                  {/* Categoría */}
                  <p className="card-title-sm mb-xs" style={{ fontSize: "var(--font-size-body)" }}>
                    {incident.category}
                  </p>

                  {/* Lugar */}
                  <div className="flex items-center gap-xs mb-md">
                    <svg width="13" height="13" viewBox="0 0 24 24"
                      style={{ fill: "none", stroke: "var(--color-text-hint)", strokeWidth: 2, flexShrink: 0 }}
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="text-small text-secondary">{incident.place}</span>
                  </div>

                  {/* Divisor */}
                  <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-sm)" }} />

                  {/* Fecha completa (igual que ListaIncidentesPage) */}
                  <div className="flex items-center gap-xs">
                    <svg width="13" height="13" viewBox="0 0 24 24"
                      style={{ fill: "none", stroke: "var(--color-text-hint)", strokeWidth: 2, flexShrink: 0 }}
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="text-xs text-secondary">{incident.fullDate}</span>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          VISTA TABLA — solo desktop, solo cuando viewMode === "table"
          ══════════════════════════════════════════ */}
      {viewMode === "table" && (
        <div className="hidden md:block">
          <div className="card">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr style={{ background: "var(--color-bg-muted)", textAlign: "left" }}>
                    {["ID", "Categoría", "Lugar", "Estado", "Fecha"].map((h) => (
                      <th key={h} style={{
                        padding: "8px 12px",
                        fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text-secondary)", textTransform: "uppercase",
                        letterSpacing: "0.06em", whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center" }}>
                        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((i) => (
                      <tr
                        key={i.realId}
                        onClick={() => goToDetail(i.realId)}
                        style={{ borderBottom: "1px solid var(--color-border-light)", cursor: "pointer", transition: "background var(--transition-fast)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--color-bg-muted)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                      >
                        <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", whiteSpace: "nowrap" }}>
                          {i.id}
                        </td>
                        <td style={{ padding: "12px", fontSize: "var(--font-size-small)" }}>{i.category}</td>
                        <td style={{ padding: "12px", fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {i.place}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <IncidentStatusBadge status={i.status} />
                        </td>
                        <td style={{ padding: "12px", fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                          {i.date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="card" style={{ maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
      <div className="card-body-center">
        <div className="icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        </div>
        <p className="card-form-title text-center" style={{ marginBottom: "var(--space-sm)" }}>
          {hasFilters ? "Sin resultados" : "Sin incidentes"}
        </p>
        <p className="card-desc text-center" style={{ marginBottom: hasFilters ? "var(--space-md)" : 0 }}>
          {hasFilters
            ? "Ningún incidente coincide con los filtros aplicados."
            : "No tienes incidentes registrados en el sistema."}
        </p>
        {hasFilters && (
          <button
            type="button" className="btn-secondary" onClick={onClear}
            style={{ width: "auto", padding: "8px 20px" }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}