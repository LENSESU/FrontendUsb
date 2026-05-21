"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Suggestion = {
  id: string;
  titulo: string;
  contenido: string;
  estudiante_id: string;
  total_votos: number;
  foto_url: string | null;
  comentario_institucional: string | null;
  etiquetas: string[];
  created_at: string;
};

function formatDate(iso: string): string {
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

export default function AdminSugerenciasPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const session = await restoreAuthSession();
        if (!session?.accessToken) {
          setSuggestions([]);
          return;
        }

        const res = await fetch(`${API}/api/v1/suggestions/?order_by=fecha`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        if (!res.ok) throw new Error("No se pudieron cargar las sugerencias.");

        const data = await res.json();
        const items: Suggestion[] = Array.isArray(data) ? data : data.items ?? [];
        setSuggestions(items);
      } catch {
        setError("No se pudieron cargar las sugerencias.");
      } finally {
        setLoading(false);
      }
    }

    void fetchSuggestions();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suggestions;

    return suggestions.filter(
      (suggestion) =>
        suggestion.titulo.toLowerCase().includes(q) ||
        suggestion.contenido.toLowerCase().includes(q) ||
        suggestion.etiquetas.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [search, suggestions]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-0 sm:p-6 lg:px-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Sugerencias
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Revisa las sugerencias publicadas y responde institucionalmente cuando corresponda.
        </p>
      </header>

      {error && (
        <div className="alert-error mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="card mb-6" style={{ padding: "12px 16px" }}>
        <label htmlFor="admin-suggestion-search" className="sr-only">
          Buscar sugerencias
        </label>
        <input
          id="admin-suggestion-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por titulo, contenido o etiqueta..."
          className="w-full"
        />
      </div>

      <div className="card">
        <div className="card-stripe" />
        <div className="card-body">
          {loading ? (
            <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">
              Cargando sugerencias...
            </p>
          ) : filtered.length === 0 ? (
            <div className="card-body-center">
              <div className="icon-wrap-circle" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-semibold text-[var(--color-text-primary)]">
                Sin sugerencias
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                No hay sugerencias para mostrar con los filtros actuales.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[var(--color-bg-muted)] text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                    <th className="rounded-l-md px-3 py-2">Sugerencia</th>
                    <th className="px-3 py-2">Etiquetas</th>
                    <th className="px-3 py-2">Votos</th>
                    <th className="px-3 py-2">Respuesta</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="rounded-r-md px-3 py-2">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((suggestion) => (
                    <tr
                      key={suggestion.id}
                      className="border-b border-[var(--color-border-light)] last:border-0"
                    >
                      <td className="max-w-[280px] px-3 py-3">
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {suggestion.titulo}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">
                          {suggestion.contenido}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {suggestion.etiquetas.length > 0 ? (
                            suggestion.etiquetas.slice(0, 2).map((tag) => (
                              <span key={tag} className="badge">{tag}</span>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--color-text-hint)]">Sin etiquetas</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-[var(--color-primary)]">
                        {suggestion.total_votos}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          suggestion.comentario_institucional
                            ? "bg-green-50 text-green-700"
                            : "bg-orange-50 text-orange-700"
                        }`}>
                          {suggestion.comentario_institucional ? "Respondida" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[var(--color-text-secondary)]">
                        {formatDate(suggestion.created_at)}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="btn-link !mt-0"
                          onClick={() => router.push(`/dashboard/admin/sugerencia-detalle?id=${suggestion.id}`)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
