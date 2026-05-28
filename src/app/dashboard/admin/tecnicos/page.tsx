"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Technician = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

type FilterActivity = "todos" | "activos" | "inactivos";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default function TechniciansPage() {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterActivity, setFilterActivity] = useState<FilterActivity>("todos");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const session = await restoreAuthSession();
        if (!session?.accessToken) throw new Error("Sesion no encontrada.");

        const res = await fetch(`${API}/api/v1/technicians`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        if (!res.ok) throw new Error("No se pudieron cargar los tecnicos.");

        const data = await res.json();
        const items: Technician[] = Array.isArray(data) ? data : data.items ?? [];

        if (isMounted) setTechnicians(items);
      } catch (err) {
        if (isMounted)
          setError(err instanceof Error ? err.message : "Error al cargar tecnicos.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => { isMounted = false; };
  }, []);

  const filtered = useMemo(() => {
    return technicians.filter((t) => {
      const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
      const emailMatch = t.email.toLowerCase().includes(search.toLowerCase());
      const nameMatch = fullName.includes(search.toLowerCase());
      const matchSearch = search === "" || nameMatch || emailMatch;

      const matchActivity =
        filterActivity === "todos" ||
        (filterActivity === "activos" && t.is_active) ||
        (filterActivity === "inactivos" && !t.is_active);

      return matchSearch && matchActivity;
    });
  }, [technicians, search, filterActivity]);

  const totalActive = technicians.filter((t) => t.is_active).length;
  const totalInactive = technicians.filter((t) => !t.is_active).length;

  const hasFilters = search !== "" || filterActivity !== "todos";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-6 pt-0 sm:p-6 lg:px-8">
      {/* Header */}
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Gestion de tecnicos
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Consulta, registra y administra el equipo tecnico del sistema.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ width: "auto", padding: "10px 20px" }}
          onClick={() => router.push("/dashboard/admin/tecnicos/registrar")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Registrar tecnico
        </button>
      </header>

      {/* Stats */}
      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card tech-stat-card">
          <p className="stat-label">Total tecnicos</p>
          <p className="stat-value">{technicians.length}</p>
        </div>
        <div className="card tech-stat-card">
          <p className="stat-label">Activos</p>
          <p className="stat-value" style={{ color: "var(--color-success)" }}>{totalActive}</p>
        </div>
        <div className="card tech-stat-card col-span-2 sm:col-span-1">
          <p className="stat-label">Inactivos</p>
          <p className="stat-value" style={{ color: "var(--color-error)" }}>{totalInactive}</p>
        </div>
      </section>

      {/* Filters */}
      <div className="card mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-hint)]" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                paddingLeft: "36px",
                paddingRight: "12px",
                fontFamily: "var(--font-family)",
                fontSize: "14px",
                color: "var(--color-text-primary)",
                background: "var(--color-bg-input)",
                outline: "none",
              }}
            />
          </div>

          {/* Activity filter tabs */}
          <div
            role="tablist"
            aria-label="Filtrar por actividad"
            className="inline-flex gap-1 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-muted)] p-1"
          >
            {(["todos", "activos", "inactivos"] as FilterActivity[]).map((opt) => {
              const labels: Record<FilterActivity, string> = {
                todos: "Todos",
                activos: "Activos",
                inactivos: "Inactivos",
              };
              const active = filterActivity === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilterActivity(opt)}
                  className={
                    active
                      ? "rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
                      : "rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
                  }
                >
                  {labels[opt]}
                </button>
              );
            })}
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearch(""); setFilterActivity("todos"); }}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <section className="card">
        <div className="border-b border-[var(--color-border-light)] px-4 py-3">
          <span className="font-semibold text-[var(--color-text-primary)]">
            Tecnicos registrados
          </span>
          {hasFilters && (
            <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
              ({filtered.length} resultado{filtered.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 p-6">
            <span className="spinner spinner-dark" />
            <p className="text-secondary text-sm">Cargando tecnicos...</p>
          </div>
        )}

        {error && (
          <div className="m-4">
            <div className="alert-error"><p>{error}</p></div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="card-body-center p-8">
            <p className="font-semibold text-[var(--color-text-primary)]">
              {hasFilters ? "Ningun tecnico coincide con los filtros." : "No hay tecnicos registrados."}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {hasFilters
                ? "Prueba ajustando los filtros de busqueda."
                : "Registra el primer tecnico del sistema."}
            </p>
          </div>
        )}

        {/* Desktop table */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[var(--color-bg-muted)] text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                    <th className="rounded-l-md px-4 py-2">Tecnico</th>
                    <th className="px-4 py-2">Correo</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Registro</th>
                    <th className="rounded-r-md px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-[var(--color-border-light)] transition hover:bg-[var(--color-bg-muted)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "var(--radius-full)",
                              background: t.is_active ? "var(--color-primary)" : "var(--color-text-disabled)",
                              color: "#fff",
                              fontSize: "12px",
                              fontWeight: "700",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                            aria-hidden="true"
                          >
                            {getInitials(t.first_name, t.last_name)}
                          </div>
                          <button
                            type="button"
                            className="text-left font-semibold text-[var(--color-primary)] hover:underline"
                            onClick={() => router.push(`/dashboard/admin/tecnicos/${t.id}`)}
                          >
                            {t.first_name} {t.last_name}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{t.email}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${t.is_active ? "badge-success" : "badge-error"}`}>
                          {t.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/admin/tecnicos/${t.id}`)}
                          className="rounded-md border border-[var(--color-border-light)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-[var(--color-border-light)] md:hidden">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="w-full p-4 text-left transition active:bg-[var(--color-bg-muted)]"
                    onClick={() => router.push(`/dashboard/admin/tecnicos/${t.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "var(--radius-full)",
                          background: t.is_active ? "var(--color-primary)" : "var(--color-text-disabled)",
                          color: "#fff",
                          fontSize: "13px",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      >
                        {getInitials(t.first_name, t.last_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[var(--color-text-primary)] truncate">
                            {t.first_name} {t.last_name}
                          </p>
                          <span className={`badge flex-shrink-0 ${t.is_active ? "badge-success" : "badge-error"}`}>
                            {t.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] truncate">{t.email}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-hint)]">
                          Desde {formatDate(t.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}