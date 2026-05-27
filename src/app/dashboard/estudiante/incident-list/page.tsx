"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession, type AuthData } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

//  función para sacar el userId del token
function getUserIdFromToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.user_id || payload.id || null;
  } catch {
    return null;
  }
}

type Incident = {
  id: string;
  status: string;
  created_at: string;
  category_id: string;
  campus_place: string | null;
  student_id: string; //  necesario para filtrar
};

type Category = {
  id: string;
  name: string;
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

export default function ListaIncidentesPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restaurar sesión
  useEffect(() => {
    async function loadSession() {
      const session = await restoreAuthSession();
      setAuth(session);
    }

    loadSession();
  }, []);

  // Traer datos
  useEffect(() => {
    if (!auth?.accessToken) return;

    const token = auth.accessToken;

    async function fetchData() {
      try {
        const [incRes, catRes] = await Promise.all([
          fetch(`${API}/api/v1/incidents/`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API}/api/v1/categories/`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!incRes.ok) throw new Error("Error al traer incidentes");
        if (!catRes.ok) throw new Error("Error al traer categorías");

        const incidentsData = await incRes.json();
        const categoriesData = await catRes.json();

        const incidentsArray = Array.isArray(incidentsData)
          ? incidentsData
          : incidentsData.items || [];

        const categoriesArray = categoriesData.items || [];

        // mapa de categorías
        const map: Record<string, string> = {};
        categoriesArray.forEach((cat: Category) => {
          map[cat.id] = cat.name;
        });

        setCategoriesMap(map);

        // obtener userId desde el token
        const userId = getUserIdFromToken(token);

        // filtrar solo incidentes del usuario
        const filtered = incidentsArray.filter(
          (i: Incident) => i.student_id === userId
        );

        setIncidents(filtered);
      } catch (err) {
        setError("No se pudieron cargar los incidentes");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [auth]);

  // Estados
  if (loading) {
    return (
      <div className="page-centered">
        <div className="flex items-center gap-sm">
          <span className="spinner spinner-dark" />
          <p className="text-secondary">Cargando incidentes…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-centered">
        <div className="form-wrapper">
          <div className="alert-error">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render
  return (
    <div className="page-centered">
      <div className="container">

        {/* Section header */}
        <div className="section-header" style={{ margin: "0 auto var(--space-xl)" }}>
          <div className="flex items-center justify-center gap-sm mb-sm">
            <div className="icon-wrap-circle">
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path
                  d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <h1>Lista de Incidentes</h1>
          <p>
            {incidents.length === 0
              ? "No hay incidentes registrados aún."
              : `${incidents.length} incidente${incidents.length !== 1 ? "s" : ""} encontrado${incidents.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {incidents.length === 0 ? (
          /* Estado vacío */
          <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
            <div className="card-body-center">
              <div className="icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
              </div>
              <p
                className="card-form-title text-center"
                style={{ marginBottom: "var(--space-sm)" }}
              >
                Sin incidentes
              </p>
              <p className="card-desc text-center" style={{ marginBottom: 0 }}>
                No tienes incidentes registrados en el sistema.
              </p>
            </div>
          </div>
        ) : (
          /* Grid de cards */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
              gap: "var(--space-md)",
              width: "100%",
            }}
          >
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="card card-clickable"
                onClick={() =>
                  router.push(
                    `/dashboard/estudiante/dashboard/incidente-detalle?id=${incident.id}`
                  )
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    router.push(
                      `/dashboard/estudiante/dashboard/incidente-detalle?id=${incident.id}`
                    );
                }}
              >
                <div className="card-stripe" />

                <div className="card-body">
                  {/* ID + badge de estado */}
                  <div
                    className="flex items-center justify-between mb-sm"
                    style={{ flexWrap: "wrap", gap: "var(--space-xs)" }}
                  >
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: "var(--color-text-hint)",
                        fontFamily: "monospace",
                        letterSpacing: "0.04em",
                      }}
                    >
                      #{incident.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={
                        incident.status === "Nuevo" ? "badge"
                        : incident.status === "En_proceso" ? "badge badge-in-progress"
                        : incident.status === "Resuelto" ? "badge badge-success"
                        : "badge"
                      }
                    >
                      {incident.status === "Nuevo" ? "Abierto"
                      : incident.status === "En_proceso" ? "En progreso"
                      : incident.status === "Resuelto" ? "Resuelto"
                      : incident.status}
                    </span>
                  </div>

                  {/* Categoría */}
                  <p
                    className="card-title-sm mb-xs"
                    style={{ fontSize: "var(--font-size-body)" }}
                  >
                    {categoriesMap[incident.category_id] || "Sin categoría"}
                  </p>

                  {/* Lugar */}
                  <div className="flex items-center gap-xs mb-md">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      style={{
                        fill: "none",
                        stroke: "var(--color-text-hint)",
                        strokeWidth: 2,
                        flexShrink: 0,
                      }}
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="text-small text-secondary">
                      {incident.campus_place || "Sin ubicación"}
                    </span>
                  </div>

                  {/* Divisor */}
                  <div
                    style={{
                      height: 1,
                      background: "var(--color-border-light)",
                      marginBottom: "var(--space-sm)",
                    }}
                  />

                  {/* Fecha */}
                  <div className="flex items-center gap-xs">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      style={{
                        fill: "none",
                        stroke: "var(--color-text-hint)",
                        strokeWidth: 2,
                        flexShrink: 0,
                      }}
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="text-xs text-secondary">
                      {formatDate(incident.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}