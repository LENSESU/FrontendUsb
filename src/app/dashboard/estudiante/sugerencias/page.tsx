"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ── Tipos ──────────────────────────────────────────────────────────────────

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

type FilterSort = "popularidad" | "fecha";

// ── Helpers ────────────────────────────────────────────────────────────────

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.user_id || payload.id || null;
  } catch {
    return null;
  }
}

function formatDateRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "Hoy";
    if (days === 1) return "Hace 1 día";
    if (days < 30) return `Hace ${days} días`;
    const months = Math.floor(days / 30);
    if (months === 1) return "Hace 1 mes";
    return `Hace ${months} meses`;
  } catch {
    return iso;
  }
}

// ── Skeletons ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "var(--space-lg) var(--space-md)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span className="skeleton" style={{ width: 100, height: 12 }} />
          <span className="skeleton" style={{ width: 56, height: 22, borderRadius: 999 }} />
        </div>
        <span className="skeleton" style={{ width: "75%", height: 18, display: "block", marginBottom: 10 }} />
        <span className="skeleton" style={{ width: "100%", height: 13, display: "block", marginBottom: 6 }} />
        <span className="skeleton" style={{ width: "80%", height: 13, display: "block", marginBottom: 16 }} />
        <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: 12 }} />
        <div className="flex items-center gap-2">
          <span className="skeleton" style={{ width: 48, height: 20, borderRadius: 999 }} />
          <span className="skeleton" style={{ width: 64, height: 20, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}

// ── Componente de tarjeta de sugerencia ────────────────────────────────────

function SuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: Suggestion;
  onClick: () => void;
}) {
  const hasResponse = Boolean(suggestion.comentario_institucional);

  return (
    <div
      className="card card-clickable"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {/* Respuesta institucional fijada arriba (si existe) */}
      {hasResponse && (
        <div
          style={{
            background: "linear-gradient(135deg, var(--color-primary-bg) 0%, #fff7ed 100%)",
            borderBottom: "1px solid var(--color-primary-border, #fdba74)",
            padding: "10px var(--space-md)",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          {/* Icono institución */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "var(--color-primary)",
              color: "#fff",
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-primary)",
                marginBottom: 2,
              }}
            >
              Respuesta Institucional
            </p>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-secondary)",
                lineHeight: 1.5,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
                fontStyle: "italic",
              }}
            >
              {suggestion.comentario_institucional}
            </p>
          </div>
        </div>
      )}

      {/* Cuerpo de la tarjeta */}
      <div className="card-body" style={{ flex: 1 }}>

        {/* Título + votos */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p
            style={{
              fontSize: "var(--font-size-body)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              lineHeight: 1.4,
              flex: 1,
            }}
          >
            {suggestion.titulo}
          </p>

          {/* Badge votos */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexShrink: 0,
              background: suggestion.total_votos > 50 ? "var(--color-primary-bg)" : "var(--color-bg-muted)",
              border: `1px solid ${suggestion.total_votos > 50 ? "var(--color-primary-border, #fdba74)" : "var(--color-border-light)"}`,
              borderRadius: "var(--radius-sm)",
              padding: "4px 8px",
              minWidth: 44,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke={suggestion.total_votos > 50 ? "var(--color-primary)" : "var(--color-text-hint)"}
              strokeWidth="2.5"
            >
              <path d="M5 15l7-7 7 7" />
            </svg>
            <span
              style={{
                fontSize: "var(--font-size-body)",
                fontWeight: "var(--font-weight-bold)",
                color: suggestion.total_votos > 50 ? "var(--color-primary)" : "var(--color-text-primary)",
                lineHeight: 1,
              }}
            >
              {suggestion.total_votos}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: "var(--font-weight-semibold)",
                color: suggestion.total_votos > 50 ? "var(--color-primary)" : "var(--color-text-hint)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              votos
            </span>
          </div>
        </div>

        {/* Extracto del contenido */}
        <p
          style={{
            fontSize: "var(--font-size-small)",
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical" as const,
            marginBottom: "var(--space-md)",
          }}
        >
          {suggestion.contenido}
        </p>

        {/* Divisor */}
        <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-sm)" }} />

        {/* Footer: etiquetas + fecha */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-1">
            {suggestion.etiquetas.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10,
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-secondary)",
                  background: "var(--color-bg-muted)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: 999,
                  padding: "2px 8px",
                  textTransform: "lowercase",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-hint)",
              flexShrink: 0,
            }}
          >
            {formatDateRelative(suggestion.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Vista detalle inline (modal-like expandible) ────────────────────────────

function SuggestionDetailModal({
  suggestion,
  onClose,
}: {
  suggestion: Suggestion;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        padding: "0",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--color-bg-card, #fff)",
          borderRadius: "var(--radius-lg, 1rem) var(--radius-lg, 1rem) 0 0",
          padding: "var(--space-lg) var(--space-md)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-light)", margin: "0 auto var(--space-md)" }} />

        {/* Respuesta institucional destacada (si existe) */}
        {suggestion.comentario_institucional && (
          <div
            style={{
              position: "relative",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-primary-border, #fdba74)",
              background: "linear-gradient(135deg, var(--color-primary-bg) 0%, #fff7ed 100%)",
              padding: "var(--space-md) var(--space-md) var(--space-md) calc(var(--space-md) + 14px)",
              overflow: "hidden",
              marginBottom: "var(--space-lg)",
            }}
          >
            {/* Barra lateral */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: "var(--color-primary)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: "var(--color-primary)",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--color-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Respuesta Institucional
              </p>
            </div>
            <p
              style={{
                fontSize: "var(--font-size-small)",
                color: "var(--color-text-primary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                fontStyle: "italic",
              }}
            >
              {suggestion.comentario_institucional}
            </p>
            <p
              style={{
                marginTop: "var(--space-sm)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-primary)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              — Universidad San Buenaventura Cali
            </p>
          </div>
        )}

        {/* Título */}
        <h2
          style={{
            fontSize: "var(--font-size-lg, 1.125rem)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-sm)",
            lineHeight: 1.35,
          }}
        >
          {suggestion.titulo}
        </h2>

        {/* Votos */}
        <div style={{ marginBottom: "var(--space-md)", display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-primary)",
              background: "var(--color-primary-bg)",
              border: "1px solid var(--color-primary-border, #fdba74)",
              borderRadius: 999,
              padding: "3px 10px",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 15l7-7 7 7" />
            </svg>
            {suggestion.total_votos} votos
          </span>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-hint)" }}>
            {formatDateRelative(suggestion.created_at)}
          </span>
        </div>

        {/* Contenido */}
        <p
          style={{
            fontSize: "var(--font-size-small)",
            color: "var(--color-text-primary)",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            marginBottom: "var(--space-md)",
          }}
        >
          {suggestion.contenido}
        </p>

        {/* Foto */}
        {suggestion.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={suggestion.foto_url}
            alt="Imagen adjunta"
            style={{
              width: "100%",
              borderRadius: "var(--radius-sm)",
              objectFit: "cover",
              maxHeight: 260,
              marginBottom: "var(--space-md)",
            }}
          />
        )}

        {/* Etiquetas */}
        {suggestion.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestion.etiquetas.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-secondary)",
                  background: "var(--color-bg-muted)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn-secondary"
          onClick={onClose}
          style={{ width: "100%", marginTop: "var(--space-sm)" }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export default function MisSugerenciasPage() {
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<FilterSort>("fecha");
  const [filterTag, setFilterTag] = useState("Todas");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Suggestion | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const session = await restoreAuthSession();
        if (!session?.accessToken) {
          setSuggestions([]);
          return;
        }

        const userId = getUserIdFromToken(session.accessToken);
        if (!userId) {
          setError("No se pudo identificar tu usuario.");
          setSuggestions([]);
          return;
        }

        const params = new URLSearchParams({ order_by: sortBy });
        if (filterTag !== "Todas") params.set("tags", filterTag);

        const res = await fetch(`${API}/api/v1/suggestions/?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        if (!res.ok) throw new Error("No se pudieron cargar las sugerencias.");
        const data = await res.json();
        const items: Suggestion[] = Array.isArray(data) ? data : data.items ?? [];
        setSuggestions(items.filter((suggestion) => suggestion.estudiante_id === userId));
      } catch {
        setError("No se pudieron cargar las sugerencias.");
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [sortBy, filterTag]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    suggestions.forEach((s) => s.etiquetas.forEach((t) => tagSet.add(t)));
    return ["Todas", ...Array.from(tagSet)];
  }, [suggestions]);

  const filtered = useMemo(() => {
    if (!search.trim()) return suggestions;
    const q = search.trim().toLowerCase();
    return suggestions.filter(
      (s) =>
        s.titulo.toLowerCase().includes(q) ||
        s.contenido.toLowerCase().includes(q) ||
        s.etiquetas.some((t) => t.toLowerCase().includes(q))
    );
  }, [suggestions, search]);

  // Separar las que tienen respuesta institucional (van arriba)
  const withResponse = filtered.filter((s) => s.comentario_institucional);
  const withoutResponse = filtered.filter((s) => !s.comentario_institucional);

  const hasFilters = filterTag !== "Todas" || search.trim() !== "";

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-0 sm:p-6 lg:px-8">

        {/* ── Header ── */}
        <header className="mb-6 sm:mb-8">
          <div className="-mx-4 bg-[var(--color-bg-muted)] px-4 py-4 mb-4 md:hidden">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Mis sugerencias</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Seguimiento de tus aportes.
            </p>
          </div>
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Mis sugerencias</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Consulta tus aportes y la recepcion que han tenido en la comunidad.
            </p>
          </div>
        </header>

        {/* ── Error ── */}
        {error && (
          <div className="alert-error mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* ── Filtros ── */}
        <div className="card mb-6" style={{ padding: "12px 16px" }}>
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
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setFilterTag("Todas"); setSearch(""); }}
                style={{
                  fontSize: "var(--font-size-xs)", color: "var(--color-primary)",
                  background: "none", border: "none", cursor: "pointer",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                Limpiar
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
            {/* Búsqueda */}
            <div style={{ position: "relative" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-hint)" strokeWidth="2"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", height: 36, paddingLeft: 30, paddingRight: 10,
                  border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-small)", color: "var(--color-text-primary)",
                  background: "var(--color-bg-input)", outline: "none",
                }}
              />
            </div>

            {/* Ordenar */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as FilterSort)}
              style={{
                height: 36, border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
                padding: "0 10px", fontSize: "var(--font-size-small)", outline: "none", cursor: "pointer",
                background: "var(--color-bg-input)", color: "var(--color-text-primary)",
              }}
            >
              <option value="fecha">Más recientes</option>
              <option value="popularidad">Más populares</option>
            </select>

            {/* Etiqueta */}
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              style={{
                height: 36, border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
                padding: "0 10px", fontSize: "var(--font-size-small)", outline: "none", cursor: "pointer",
                background: filterTag !== "Todas" ? "var(--color-primary-bg)" : "var(--color-bg-input)",
                color: filterTag !== "Todas" ? "var(--color-primary)" : "var(--color-text-primary)",
                fontWeight: filterTag !== "Todas" ? "var(--font-weight-semibold)" : undefined,
              }}
            >
              {allTags.map((t) => <option key={t} value={t}>{t === "Todas" ? "Todas las etiquetas" : t}</option>)}
            </select>
          </div>
        </div>

        {/* Contador */}
        {!loading && (
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: 12 }}>
            {filtered.length} sugerencia{filtered.length !== 1 ? "s" : ""}
            {hasFilters ? " encontrada" + (filtered.length !== 1 ? "s" : "") : ""}
          </p>
        )}

        {/* ── Bloque: sugerencias con respuesta institucional ── */}
        {!loading && withResponse.length > 0 && (
          <section style={{ marginBottom: "var(--space-xl, 2rem)" }}>
            {/* Cabecera de sección */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: "var(--space-md)",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                background: "linear-gradient(135deg, var(--color-primary-bg) 0%, #fff7ed 100%)",
                border: "1px solid var(--color-primary-border, #fdba74)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "var(--color-primary)",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--color-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Con respuesta institucional · {withResponse.length}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                gap: "var(--space-md)",
              }}
            >
              {withResponse.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} onClick={() => setSelected(s)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Bloque: resto de sugerencias ── */}
        {!loading && withoutResponse.length > 0 && (
          <section>
            {withResponse.length > 0 && (
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: "var(--space-md)",
                }}
              >
                Otras sugerencias · {withoutResponse.length}
              </p>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                gap: "var(--space-md)",
              }}
            >
              {withoutResponse.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} onClick={() => setSelected(s)} />
              ))}
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
              gap: "var(--space-md)",
            }}
          >
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        )}

        {/* Estado vacío */}
        {!loading && filtered.length === 0 && (
          <div className="card" style={{ maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
            <div className="card-body-center">
              <div className="icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="card-form-title text-center" style={{ marginBottom: "var(--space-sm)" }}>
                {hasFilters ? "Sin resultados" : "Sin sugerencias"}
              </p>
              <p className="card-desc text-center">
                {hasFilters
                  ? "Ninguna sugerencia coincide con los filtros."
                  : "Aun no has publicado sugerencias."}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setFilterTag("Todas"); setSearch(""); }}
                  style={{ width: "auto", padding: "8px 20px", marginTop: "var(--space-md)" }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal detalle ── */}
      {selected && (
        <SuggestionDetailModal
          suggestion={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
