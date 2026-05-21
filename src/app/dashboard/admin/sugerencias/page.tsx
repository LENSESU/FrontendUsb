"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Suggestion = {
  id: string;
  estudiante_id: string;
  titulo: string;
  contenido: string;
  total_votos: number;
  foto_url?: string | null;
  comentario_institucional: string | null;
  created_at: string;
  etiquetas: string[];
};

type SuggestionsResponse = {
  total?: number;
  items?: Suggestion[];
};

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

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function formatRelativeDateEs(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const days = Math.floor((Date.now() - parsed.getTime()) / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

export default function AdminSuggestionsPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [totalSuggestions, setTotalSuggestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSuggestions() {
      try {
        setLoading(true);
        setError(null);

        const session = await restoreAuthSession();
        if (!session?.accessToken) {
          throw new Error("No se encontró una sesión activa.");
        }

        const response = await fetch(
          `${API}/api/v1/suggestions/?page=1&limit=100&order_by=fecha`,
          { headers: { Authorization: `Bearer ${session.accessToken}` } },
        );

        if (!response.ok) throw new Error("No se pudieron cargar las sugerencias.");

        const data = (await response.json()) as SuggestionsResponse | Suggestion[];
        const items = Array.isArray(data) ? data : data.items ?? [];

        if (isMounted) {
          setSuggestions(items);
          setTotalSuggestions(Array.isArray(data) ? items.length : data.total ?? items.length);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las sugerencias.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadSuggestions();
    return () => { isMounted = false; };
  }, []);

  const totalVotes = useMemo(
    () => suggestions.reduce((total, s) => total + s.total_votos, 0),
    [suggestions],
  );
  const topSuggestions = useMemo(
    () => [...suggestions].sort((a, b) => b.total_votos - a.total_votos).slice(0, 3),
    [suggestions],
  );
  const latestSuggestion = suggestions[0];
  const topVotes = topSuggestions[0]?.total_votos ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-6 pt-0 sm:p-6 lg:px-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Panel Administrador
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Sugerencias creadas por la comunidad estudiantil.
          </p>
        </div>
        <span className="badge w-fit">Comunidad estudiantil</span>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card tech-stat-card">
          <p className="stat-label">Sugerencias recibidas</p>
          <p className="stat-value">{totalSuggestions}</p>
        </div>
        <div className="card tech-stat-card">
          <p className="stat-label">Votos acumulados</p>
          <p className="stat-value">{totalVotes}</p>
        </div>
        <div className="card tech-stat-card">
          <p className="stat-label">Mayor votación</p>
          <p className="stat-value">{topVotes}</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-h-[240px]">
          <div className="border-b border-[var(--color-border-light)] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                Muro de sugerencias
              </h2>
              <span className="text-xs font-semibold uppercase text-[var(--color-primary)]">
                Recientes
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {loading && (
              <div className="flex items-center gap-2">
                <span className="spinner spinner-dark" />
                <p className="text-secondary">Cargando sugerencias...</p>
              </div>
            )}

            {error && <div className="alert-error"><p>{error}</p></div>}

            {!loading && !error && suggestions.length === 0 && (
              <div className="card-body-center">
                <p className="font-semibold text-[var(--color-text-primary)]">
                  No hay sugerencias registradas.
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Cuando los estudiantes creen sugerencias aparecerán aquí.
                </p>
              </div>
            )}

            {!loading && !error && suggestions.length > 0 && (
              <div className="flex flex-col gap-3">
                {suggestions.map((suggestion, index) => {
                  const tags = suggestion.etiquetas ?? [];
                  const highlightVotes = index < 2;

                  return (
                    <article
                      key={suggestion.id}
                      className="card-clickable flex items-start gap-3 rounded-lg border border-[var(--color-border-light)] p-3 cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/admin/sugerencia-detalle?id=${suggestion.id}`)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          router.push(`/dashboard/admin/sugerencia-detalle?id=${suggestion.id}`);
                      }}
                    >
                      <div
                        className={
                          highlightVotes
                            ? "flex min-w-[64px] flex-col items-center justify-center rounded-lg border border-orange-300 bg-orange-50 px-2 py-1 text-orange-600"
                            : "flex min-w-[64px] flex-col items-center justify-center rounded-lg border border-[var(--color-closed-border)] bg-[var(--color-closed-bg)] px-2 py-1 text-[var(--color-closed)]"
                        }
                      >
                        <svg className="-rotate-90" width="18" height="18" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-lg font-bold leading-none">{suggestion.total_votos}</span>
                        <span className="mt-1 text-[10px] font-semibold uppercase">votos</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase text-[var(--color-primary)]">
                              #{shortId(suggestion.id)}
                            </p>
                            <h3 className="mt-1 text-sm font-bold text-[var(--color-text-primary)] sm:text-base">
                              {suggestion.titulo}
                            </h3>
                          </div>
                          <span className="text-xs text-[var(--color-text-hint)]">
                            {formatRelativeDateEs(suggestion.created_at)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                          {suggestion.contenido}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          {tags.length > 0 ? (
                            tags.slice(0, 3).map((tag) => (
                              <span key={`${suggestion.id}-${tag}`} className="badge">{tag}</span>
                            ))
                          ) : (
                            <span className="text-[var(--color-text-hint)]">Sin etiquetas</span>
                          )}
                          <span className="text-[var(--color-text-hint)]">
                            Estudiante #{shortId(suggestion.estudiante_id)}
                          </span>
                          <span className="text-[var(--color-text-hint)]">
                            {formatDate(suggestion.created_at)}
                          </span>
                        </div>

                        {suggestion.comentario_institucional && (
                          <div className="mt-3 flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[var(--color-primary)] text-white flex-shrink-0">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                              </svg>
                            </span>
                            <span className="text-xs font-semibold text-[var(--color-primary)]">
                              Respondida
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="card h-fit">
          <div className="border-b border-[var(--color-border-light)] px-4 py-3 text-center">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Sugerencias populares
            </h2>
          </div>
          <div className="space-y-4 p-4 text-sm text-[var(--color-text-secondary)]">
            <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-muted)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-hint)]">
                Última publicación
              </p>
              <p className="mt-1 font-semibold text-[var(--color-text-primary)]">
                {latestSuggestion ? latestSuggestion.titulo : "Sin datos"}
              </p>
              {latestSuggestion && (
                <p className="mt-1 text-xs">{formatRelativeDateEs(latestSuggestion.created_at)}</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-[var(--color-text-hint)]">
                Más votadas
              </p>
              <div className="flex flex-col gap-2">
                {topSuggestions.length > 0 ? (
                  topSuggestions.map((suggestion) => (
                    <div
                      key={`top-${suggestion.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border-light)] px-3 py-2 cursor-pointer card-clickable"
                      onClick={() =>
                        router.push(`/dashboard/admin/sugerencia-detalle?id=${suggestion.id}`)
                      }
                    >
                      <span className="min-w-0 truncate font-semibold text-[var(--color-text-primary)]">
                        {suggestion.titulo}
                      </span>
                      <span className="badge badge-success">{suggestion.total_votos}</span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-[var(--color-border-light)] px-3 py-4 text-center text-xs">
                    Aún no hay votos registrados.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
