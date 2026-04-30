"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IncidentPriorityBadge } from "@/components/IncidentPriorityBadge";
import { IncidentStatusBadge } from "@/components/IncidentStatusBadge";
import { restoreAuthSession } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type TechnicianAssignment = {
  id: string;
  categoria: string;
  location: string | null;
  status: "Nuevo" | "En_proceso" | "Resuelto";
  created_at: string;
  assigned_by_admin: string;
};

export default function TechnicianDashboardHome() {
  const router = useRouter();

  const [incidents, setIncidents] = useState<TechnicianAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssignments() {
      try {
        setLoading(true);
        setError(null);

        const session = await restoreAuthSession();

        if (!session?.accessToken) {
          setError("No se encontró sesión activa.");
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${API}/api/v1/dashboard/technician/assignments`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("No se pudieron cargar las asignaciones.");
        }

        const data = await res.json();
        const assignments = Array.isArray(data) ? data : data.items || [];
        setIncidents(assignments);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error cargando asignaciones."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { total: incidents.length, nuevo: 0, enProceso: 0, resuelto: 0 };
    incidents.forEach((incident) => {
      if (incident.status === "Nuevo") counts.nuevo += 1;
      else if (incident.status === "En_proceso") counts.enProceso += 1;
      else if (incident.status === "Resuelto") counts.resuelto += 1;
    });
    return counts;
  }, [incidents]);

  const recentIncidents = incidents.slice(0, 5);

  if (loading) {
    return (
      <div
        style={{
          padding: "var(--space-xl)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          justifyContent: "center",
        }}
      >
        <span className="spinner spinner-dark" />
        <p className="text-secondary">Cargando panel tecnico…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: "var(--space-xl)" }}>
        <div className="alert-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: "var(--space-xl)" }}>

      {/* ── Título ── */}
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Panel del Tecnico
        </h1>
        <p className="text-secondary" style={{ marginTop: 6 }}>
          Resumen de tus asignaciones activas.
        </p>
      </div>

      {/* ── Grid de estadísticas: 2 cols en mobile, 4 en desktop ── */}
      <div className="tech-stats-grid">
        <div className="card tech-stat-card">
          <p className="stat-label">Total asignados</p>
          <p className="stat-value">{statusCounts.total}</p>
        </div>

        <div className="card tech-stat-card">
          <p className="stat-label">En progreso</p>
          <p className="stat-value">{statusCounts.enProceso}</p>
        </div>

        <div className="card tech-stat-card">
          <p className="stat-label">Nuevos</p>
          <p className="stat-value">{statusCounts.nuevo}</p>
        </div>

        <div className="card tech-stat-card">
          <p className="stat-label">Resueltos</p>
          <p className="stat-value">{statusCounts.resuelto}</p>
        </div>
      </div>

      {/* ── Card de incidentes recientes ── */}
      <div className="card" style={{ padding: 16 }}>

        {/* Cabecera */}
        <div className="tech-incidents-header">
          <div>
            <p style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
              Incidentes recientes
            </p>
            <p className="text-xs text-secondary">
              {recentIncidents.length === 0
                ? "No tienes incidentes asignados todavia."
                : "Ultimos incidentes asignados por el administrador."}
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary btn-secondary-compact"
            onClick={() => router.push("/dashboard/tecnico/incidentes")}
          >
            Ver todos
          </button>
        </div>

        {/* Contenido */}
        {recentIncidents.length === 0 ? (
          <div className="card-body-center">
            <p className="card-desc" style={{ marginBottom: 0 }}>
              Cuando tengas asignaciones apareceran aqui.
            </p>
          </div>
        ) : (
          <>
            {/* ── Tabla: solo tablet+ (≥ 640px) ── */}
            <div className="tech-incidents-table-wrap hide-mobile">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "var(--color-bg-muted)", textAlign: "left" }}>
                    <th style={{ padding: 10, fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-secondary)" }}>ID</th>
                    <th style={{ padding: 10, fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-secondary)" }}>Categoria</th>
                    <th style={{ padding: 10, fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-secondary)" }}>Lugar</th>
                    <th style={{ padding: 10, fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-secondary)" }}>Estado</th>
                    <th style={{ padding: 10, fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-secondary)" }}>Fecha</th>
                    <th style={{ padding: 10, fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-secondary)" }}>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() =>
                        router.push(
                          `/dashboard/tecnico/incidente-detalle?id=${incident.id}`
                        )
                      }
                      style={{
                        borderBottom: "1px solid var(--color-border-light)",
                        cursor: "pointer",
                        transition: "background var(--transition-fast)",
                      }}
                    >
                      <td style={{ padding: 10, fontWeight: 700, color: "var(--color-primary)", fontSize: "var(--font-size-small)" }}>
                        #{incident.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={{ padding: 10, fontSize: "var(--font-size-small)" }}>
                        {incident.categoria}
                      </td>
                      <td style={{ padding: 10, fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)" }}>
                        {incident.location || "Sin ubicación"}
                      </td>
                      <td style={{ padding: 10 }}>
                        <IncidentStatusBadge status={incident.status} />
                      </td>
                      <td style={{ padding: 10, fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(incident.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 10, fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)" }}>
                        {incident.assigned_by_admin}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Lista de tarjetas: solo mobile (< 640px) ── */}
            <div className="tech-incidents-list hide-desktop">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="tech-incident-card"
                  onClick={() =>
                    router.push(
                      `/dashboard/tecnico/incidente-detalle?id=${incident.id}`
                    )
                  }
                >
                  {/* Fila superior: ID + badge de estado */}
                  <div className="tech-incident-card-top">
                    <span className="tech-incident-card-id">
                      #{incident.id.slice(0, 8).toUpperCase()}
                    </span>
                    <IncidentStatusBadge status={incident.status} />
                  </div>

                  {/* Categoría */}
                  <span className="tech-incident-card-category">
                    {incident.categoria}
                  </span>

                  {/* Meta: ubicación + fecha */}
                  <div className="tech-incident-card-meta">
                    <span className="tech-incident-card-location">
                      {incident.location || "Sin ubicación"}
                    </span>
                    <span className="tech-incident-card-date">
                      {new Date(incident.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Leyenda de badges ── */}
      {recentIncidents.length > 0 && (
        <div className="tech-legend">
          <IncidentStatusBadge status="Nuevo" showIcon />
          <IncidentStatusBadge status="En_proceso" showIcon />
          <IncidentStatusBadge status="Resuelto" showIcon />
          <IncidentPriorityBadge priority="Alta" />
          <IncidentPriorityBadge priority="Media" />
          <IncidentPriorityBadge priority="Baja" />
        </div>
      )}
    </div>
  );
}