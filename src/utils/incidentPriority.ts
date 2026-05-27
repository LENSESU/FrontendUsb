/**
 * Configuración de prioridades de incidentes.
 * Mapea los valores devueltos por el backend a su representación visual.
 *
 * Prioridades del backend: "Alta", "Media", "Baja"
 */

export type IncidentPriority = "Alta" | "Media" | "Baja";

export interface PriorityConfig {
  label: string;
  className: string;
  icon: string;
  color: string;
}

export const INCIDENT_PRIORITY_CONFIG: Record<IncidentPriority, PriorityConfig> = {
  Alta: {
    label: "Alta",
    className: "badge badge-priority-alta",
    icon: "▲",
    color: "#DC2626",
  },
  Media: {
    label: "Media",
    className: "badge badge-priority-media",
    icon: "●",
    color: "#EA580C",
  },
  Baja: {
    label: "Baja",
    className: "badge badge-priority-baja",
    icon: "▼",
    color: "#16A34A",
  },
};

const UNKNOWN_PRIORITY_CONFIG: PriorityConfig = {
  label: "Sin prioridad",
  className: "badge",
  icon: "○",
  color: "#6B7280",
};

export function getPriorityConfig(priority: string | null | undefined): PriorityConfig {
  if (!priority) return UNKNOWN_PRIORITY_CONFIG;
  return (
    INCIDENT_PRIORITY_CONFIG[priority as IncidentPriority] ?? UNKNOWN_PRIORITY_CONFIG
  );
}

/** Clase CSS para resaltar filas de tabla según prioridad */
export function getPriorityRowClass(priority: string | null | undefined): string {
  if (priority === "Alta") return "incident-row-alta";
  if (priority === "Media") return "incident-row-media";
  return "";
}

/** Clase CSS para resaltar tarjetas móviles según prioridad */
export function getPriorityCardClass(priority: string | null | undefined): string {
  if (priority === "Alta") return "incident-card-alta";
  if (priority === "Media") return "incident-card-media";
  return "";
}
