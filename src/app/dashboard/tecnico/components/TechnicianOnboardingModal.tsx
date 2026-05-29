"use client";

import { useEffect, useState } from "react";

export type TechnicianOnboardingStep = {
  title: string;
  text: string;
  target: string;
};

type TechnicianOnboardingScope = "flujo" | "panel" | "incidentes";

type TechnicianOnboardingModalProps = {
  steps: TechnicianOnboardingStep[];
  onComplete: () => void;
  onSkip?: () => void;
  completeLabel?: string;
  skipLabel?: string;
};

const ONBOARDING_KEY_PREFIX = "technician_onboarding_seen";

function getOnboardingStorageKey(
  scope: TechnicianOnboardingScope,
  email: string | null,
): string {
  return `${ONBOARDING_KEY_PREFIX}:${scope}:${email ?? "current"}`;
}

export function hasSeenTechnicianOnboarding(
  scope: TechnicianOnboardingScope,
  email: string | null,
): boolean {
  return localStorage.getItem(getOnboardingStorageKey(scope, email)) === "true";
}

export function markTechnicianOnboardingSeen(
  scope: TechnicianOnboardingScope,
  email: string | null,
): void {
  localStorage.setItem(getOnboardingStorageKey(scope, email), "true");
}

export function completeTechnicianOnboarding(email: string | null): void {
  markTechnicianOnboardingSeen("flujo", email);
  markTechnicianOnboardingSeen("panel", email);
  markTechnicianOnboardingSeen("incidentes", email);
}

export const technicianPanelOnboardingSteps: TechnicianOnboardingStep[] = [
  {
    title: "Este es tu panel",
    text: "Aqui ves un resumen de tus asignaciones activas antes de entrar al detalle.",
    target: '[data-onboarding="panel-stats"]',
  },
  {
    title: "Estados de trabajo",
    text: "Los contadores te ayudan a separar casos nuevos, en proceso y resueltos.",
    target: '[data-onboarding="panel-status"]',
  },
  {
    title: "Incidente asignado",
    text: "Abre este incidente de practica para revisar el reporte y simular la atencion tecnica.",
    target: '[data-onboarding="panel-recent"]',
  },
];

export const technicianIncidentsOnboardingSteps: TechnicianOnboardingStep[] = [
  {
    title: "Incidentes asignados",
    text: "Aqui encuentras las tareas que el administrador te asigno.",
    target: '[data-onboarding="incidents-header"]',
  },
  {
    title: "Prioridad y estado",
    text: "Identifica rapidamente que atender primero segun prioridad y estado.",
    target: '[data-onboarding="incidents-list"]',
  },
  {
    title: "Abrir detalle",
    text: "Selecciona un incidente para revisar el reporte y practicar el cierre.",
    target: '[data-onboarding="incidents-list"]',
  },
];

export const technicianDetailOnboardingSteps: TechnicianOnboardingStep[] = [
  {
    title: "Reporte del estudiante",
    text: "Primero revisa la categoria, descripcion y ubicacion del problema reportado.",
    target: '[data-onboarding="detail-report"]',
  },
  {
    title: "Evidencia visual",
    text: "Compara la evidencia inicial con la foto final que subiras al cerrar el caso.",
    target: '[data-onboarding="detail-evidence"]',
  },
  {
    title: "Gestion tecnica",
    text: "Inicia la atencion, adjunta evidencia y cambia el estado cuando termines.",
    target: '[data-onboarding="detail-management"]',
  },
  {
    title: "Cerrar el incidente",
    text: "Cuando el trabajo quede listo, marca el incidente como completado y vuelve al panel.",
    target: '[data-onboarding="detail-complete"]',
  },
];

export default function TechnicianOnboardingModal({
  steps,
  onComplete,
  onSkip,
  completeLabel = "Finalizar",
  skipLabel = "Omitir guia",
}: TechnicianOnboardingModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const handleSkip = onSkip ?? onComplete;

  const goToPreviousStep = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const goToNextStep = () => {
    if (isLastStep) {
      onComplete();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(step.target);
    if (!target) return;

    target.classList.add("technician-onboarding-target");
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    return () => {
      target.classList.remove("technician-onboarding-target");
    };
  }, [step.target]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleSkip();
      }

      if (event.key === "ArrowLeft") {
        setStepIndex((current) => Math.max(current - 1, 0));
      }

      if (event.key === "ArrowRight") {
        if (isLastStep) {
          onComplete();
          return;
        }

        setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSkip, isLastStep, onComplete, steps.length]);

  return (
    <div
      className="modal-overlay technician-onboarding-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-container technician-onboarding-modal">
        <div className="modal-stripe" />

        <div className="technician-onboarding-body">
          <div className="technician-onboarding-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.9-2.9a5.5 5.5 0 0 1-7.2 7.2l-6 6a2 2 0 0 1-2.8-2.8l6-6a5.5 5.5 0 0 1 7.2-7.2l-3.1 3.1Z" />
            </svg>
          </div>

          <div className="technician-onboarding-heading" aria-live="polite">
            <p className="technician-onboarding-kicker">Guia tecnico</p>
            <p className="technician-onboarding-count">
              Paso {stepIndex + 1} de {steps.length}
            </p>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
          </div>

          <div
            className="technician-onboarding-progress"
            aria-label="Progreso de onboarding"
          >
            {steps.map((item, index) => (
              <span
                key={item.title}
                className={index <= stepIndex ? "is-active" : ""}
                aria-current={index === stepIndex ? "step" : undefined}
              />
            ))}
          </div>

          <div className="technician-onboarding-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={goToPreviousStep}
              disabled={stepIndex === 0}
            >
              Anterior
            </button>

            <button type="button" className="btn-primary" onClick={goToNextStep}>
              {isLastStep ? completeLabel : "Siguiente"}
            </button>
          </div>

          <button
            type="button"
            className="technician-onboarding-skip"
            onClick={handleSkip}
          >
            {skipLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
