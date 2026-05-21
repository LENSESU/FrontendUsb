"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { restoreAuthSession, type AuthData } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type SuggestionDetail = {
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
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminSugerenciaDetallePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const suggestionId = searchParams.get("id");

  const [auth, setAuth] = useState<AuthData | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Estado respuesta institucional ──
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const session = await restoreAuthSession();
      setAuth(session);
    }
    void loadSession();
  }, []);

  useEffect(() => {
    if (!auth?.accessToken || !suggestionId) {
      if (!suggestionId) setError("No se especificó una sugerencia.");
      return;
    }

    async function fetchSuggestion() {
      try {
        const res = await fetch(`${API}/api/v1/suggestions/${suggestionId}`, {
          headers: { Authorization: `Bearer ${auth!.accessToken}` },
        });
        if (!res.ok) throw new Error("No se pudo cargar la sugerencia.");
        const data = (await res.json()) as SuggestionDetail;
        setSuggestion(data);
        setComment(data.comentario_institucional ?? "");
        if (data.comentario_institucional) setIsEditing(false);
        else setIsEditing(true);
      } catch {
        setError("No se pudo cargar la información de la sugerencia.");
      } finally {
        setLoading(false);
      }
    }

    void fetchSuggestion();
  }, [auth, suggestionId]);

  async function handleSaveComment() {
    if (!auth?.accessToken || !suggestionId || !comment.trim()) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch(`${API}/api/v1/suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ comentario_institucional: comment.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          typeof body?.detail === "string"
            ? body.detail
            : "No se pudo guardar la respuesta.";
        setSaveError(msg);
        return;
      }

      const updated = (await res.json()) as SuggestionDetail;
      setSuggestion(updated);
      setComment(updated.comentario_institucional ?? "");
      setSaveSuccess("Respuesta institucional guardada correctamente.");
      setIsEditing(false);
    } catch {
      setSaveError("Error de conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-centered">
        <p className="text-secondary">Cargando sugerencia...</p>
      </div>
    );
  }

  if (error || !suggestion) {
    return (
      <div className="page-centered">
        <div className="form-wrapper">
          <div className="alert-error">
            <p>{error ?? "Sugerencia no encontrada."}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-0 sm:p-6">
      <button
        type="button"
        className="btn-link mb-4"
        onClick={() => router.back()}
      >
        ← Volver a sugerencias
      </button>

      <div className="card">
        <div className="card-stripe" />
        <div className="card-body">

          {/* ── Encabezado ── */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-hint)",
                letterSpacing: "0.04em",
              }}
            >
              #{suggestion.id.slice(0, 8).toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              {/* Badge votos */}
              <span
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
                  <path d="M5 15l7-7 7 7" />
                </svg>
                {suggestion.total_votos} votos
              </span>
            </div>
          </div>

          <h1 className="card-form-title">{suggestion.titulo}</h1>

          {/* ── Etiquetas ── */}
          {suggestion.etiquetas.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {suggestion.etiquetas.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border-light)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* ── Contenido ── */}
          <div className="field">
            <label>Contenido</label>
            <div
              style={{
                background: "var(--color-bg-muted)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-md)",
                fontSize: "var(--font-size-small)",
                color: "var(--color-text-primary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                border: "1px solid var(--color-border-light)",
              }}
            >
              {suggestion.contenido}
            </div>
          </div>

          {/* ── Foto ── */}
          {suggestion.foto_url && (
            <div className="field">
              <label>Imagen adjunta</label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={suggestion.foto_url}
                alt="Imagen adjunta a la sugerencia"
                style={{
                  width: "100%",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border-light)",
                  objectFit: "cover",
                  maxHeight: 320,
                }}
              />
            </div>
          )}

          {/* ── Fecha ── */}
          <div className="field">
            <label>Fecha de publicación</label>
            <p className="text-small text-secondary">{formatDate(suggestion.created_at)}</p>
          </div>

          {/* ══════════════════════════════════════
              SECCIÓN: Respuesta Institucional
          ══════════════════════════════════════ */}
          <div
            style={{
              marginTop: "var(--space-lg)",
              borderTop: "1px solid var(--color-border-light)",
              paddingTop: "var(--space-lg)",
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2
                style={{
                  fontSize: "var(--font-size-body)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-xs)",
                }}
              >
                {/* Icono institución */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-primary-bg)",
                    color: "var(--color-primary)",
                    flexShrink: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </span>
                Respuesta Institucional
              </h2>

              {/* Si ya hay respuesta y no estamos editando, botón editar */}
              {suggestion.comentario_institucional && !isEditing && (
                <button
                  type="button"
                  className="btn-link"
                  style={{ marginTop: 0 }}
                  onClick={() => {
                    setIsEditing(true);
                    setSaveSuccess(null);
                  }}
                >
                  Editar respuesta
                </button>
              )}
            </div>

            {/* Respuesta existente (modo lectura) */}
            {suggestion.comentario_institucional && !isEditing && (
              <div
                style={{
                  position: "relative",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-primary-border, #f97316)",
                  background: "var(--color-primary-bg)",
                  padding: "var(--space-md) var(--space-md) var(--space-md) calc(var(--space-md) + 14px)",
                  overflow: "hidden",
                }}
              >
                {/* Barra lateral de acento */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: "var(--color-primary)",
                    borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
                  }}
                />
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

            {/* Formulario para redactar / editar respuesta */}
            {isEditing && (
              <div>
                {!suggestion.comentario_institucional && (
                  <p className="text-small text-secondary mb-3">
                    Esta sugerencia aún no tiene una respuesta institucional. Redacta una para que los estudiantes la vean destacada.
                  </p>
                )}

                <div className="field">
                  <label htmlFor="institutional-comment">
                    {suggestion.comentario_institucional ? "Editar respuesta" : "Redactar respuesta"}
                  </label>
                  <textarea
                    id="institutional-comment"
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setSaveError(null);
                    }}
                    placeholder="Escribe aquí la respuesta oficial de la institución a esta sugerencia..."
                    rows={5}
                    maxLength={1000}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      minHeight: 110,
                    }}
                  />
                  <p
                    className="text-small text-secondary"
                    style={{
                      color: comment.length >= 950 ? "var(--color-error)" : undefined,
                    }}
                  >
                    {comment.length}/1000 caracteres
                  </p>
                </div>

                {saveError && (
                  <div className="alert-error mt-2" role="alert">
                    <p>{saveError}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap mt-4">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveComment}
                    disabled={saving || !comment.trim()}
                    style={{ flex: "0 0 auto" }}
                  >
                    {saving ? "Guardando..." : "Publicar respuesta"}
                  </button>

                  {suggestion.comentario_institucional && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setComment(suggestion.comentario_institucional ?? "");
                        setIsEditing(false);
                        setSaveError(null);
                      }}
                      style={{ flex: "0 0 auto" }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            )}

            {saveSuccess && (
              <div
                className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                role="status"
              >
                {saveSuccess}
              </div>
            )}
          </div>

        </div>
      </div>

      <p className="page-footer">
        © {new Date().getFullYear()} Universidad San Buenaventura Cali · USB LENS
      </p>
    </div>
  );
}