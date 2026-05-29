"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TechnicianOnboardingModal, {
  completeTechnicianOnboarding,
  technicianIncidentsOnboardingSteps,
} from "../components/TechnicianOnboardingModal";
import TechnicianIncidentCard from "../components/TechnicianIncidentCard";
import { useTechnicianAssignments } from "../hooks/useTechnicianAssignments";
import { TECHNICIAN_ONBOARDING_DEMO_INCIDENT_ID } from "../components/technicianOnboardingDemo";

export default function TecnicoIncidentesPage() {
  const router = useRouter();
  const { auth, incidents, categoriesMap, isOnboardingMode, loading, error } =
    useTechnicianAssignments();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && !error && auth) {
      setShowOnboarding(isOnboardingMode);
    }
  }, [auth, isOnboardingMode, loading, error]);

  function openIncident(incidentId: string) {
    if (isOnboardingMode) {
      router.push(
        `/dashboard/tecnico/incidente-detalle?id=${TECHNICIAN_ONBOARDING_DEMO_INCIDENT_ID}&onboarding=1`,
      );
      return;
    }

    router.push(`/dashboard/tecnico/incidente-detalle?id=${incidentId}`);
  }

  function skipOnboarding() {
    completeTechnicianOnboarding();
    window.location.reload();
  }

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
      {showOnboarding ? (
        <TechnicianOnboardingModal
          steps={technicianIncidentsOnboardingSteps}
          completeLabel="Abrir detalle"
          skipLabel="Omitir recorrido"
          onComplete={() => openIncident(TECHNICIAN_ONBOARDING_DEMO_INCIDENT_ID)}
          onSkip={skipOnboarding}
        />
      ) : null}

      <div
        className="section-header"
        style={{ margin: "0 auto var(--space-xl)" }}
        data-onboarding="incidents-header"
      >
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
              ? "No tienes incidentes asignados aún."
              : `${incidents.length} incidente${incidents.length !== 1 ? "s" : ""} asignado${incidents.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {incidents.length === 0 ? (
          <div
            className="card"
            style={{ maxWidth: 420, margin: "0 auto" }}
            data-onboarding="incidents-list"
          >
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
                Cuando el administrador te asigne un incidente aparecerá aquí.
              </p>
            </div>
          </div>
        ) : (
          <div
            data-onboarding="incidents-list"
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
                categoryName={categoriesMap[incident.category_id] ?? "Sin categoría"}
                onOpen={() => openIncident(incident.id)}
              />
            ))}
          </div>
        )}
    </div>
  );
}
