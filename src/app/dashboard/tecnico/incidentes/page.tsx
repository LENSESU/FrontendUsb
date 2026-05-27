"use client";

import { useRouter } from "next/navigation";
import TechnicianIncidentCard from "../components/TechnicianIncidentCard";
import { useTechnicianAssignments } from "../hooks/useTechnicianAssignments";

export default function TecnicoIncidentesPage() {
  const router = useRouter();
  const { incidents, categoriesMap, loading, error } = useTechnicianAssignments();

  if (loading) {
    return (
      <div style={{ padding: "var(--space-xl)", display: "flex", alignItems: "center", gap: "var(--space-sm)", justifyContent: "center" }}>
        <span className="spinner spinner-dark" />
        <p className="text-secondary">Cargando incidentes asignados…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: "var(--space-xl)" }}>
        <div className="form-wrapper">
          <div className="alert-error">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: "var(--space-xl)" }}>
      <div className="section-header" style={{ margin: "0 auto var(--space-xl)" }}>
          <div className="flex items-center justify-center gap-sm mb-sm">
            <div className="icon-wrap-circle">
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h1>Incidentes asignados</h1>
          <p>
            {incidents.length === 0
              ? "No tienes incidentes asignados aun."
              : `${incidents.length} incidente${incidents.length !== 1 ? "s" : ""} asignado${incidents.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {incidents.length === 0 ? (
          <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
            <div className="card-body-center">
              <div className="icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
              </div>
              <p className="card-form-title text-center" style={{ marginBottom: "var(--space-sm)" }}>
                Sin asignaciones
              </p>
              <p className="card-desc text-center" style={{ marginBottom: 0 }}>
                Cuando el administrador te asigne un incidente aparecera aqui.
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
              gap: "var(--space-md)",
              width: "100%",
            }}
          >
            {incidents.map((incident) => (
              <TechnicianIncidentCard
                key={incident.id}
                incident={incident}
                categoryName={categoriesMap[incident.category_id] ?? "Sin categoria"}
                onOpen={() =>
                  router.push(`/dashboard/tecnico/incidente-detalle?id=${incident.id}`)
                }
              />
            ))}
          </div>
        )}
    </div>
  );
}
