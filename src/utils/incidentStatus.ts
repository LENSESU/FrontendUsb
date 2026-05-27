/**
 * Configuración de estados de incidentes.
 * Mapea los valores devueltos por el backend a su representación visual.
 *
 * Estados del backend: "Nuevo", "En_proceso", "Resuelto"
 */

export type IncidentStatus = "Nuevo" | "En_proceso" | "Resuelto";

export interface StatusConfig {
  label: string;
  className: string;
  icon: string;
  color: string;
}

/**
 * Diccionario de configuración visual para cada estado de incidente.
 * - label: Texto a mostrar en la UI
 * - className: Clases CSS del badge
 * - icon: Emoji o caracter representativo
 * - color: Color hexadecimal principal
 */
export const INCIDENT_STATUS_CONFIG: Record<IncidentStatus, StatusConfig> = {
  Nuevo: {
    label: "Nuevo",
    className: "badge",
    icon: "🆕",
    color: "#EF630F",
  },
  En_proceso: {
    label: "En Progreso",
    className: "badge badge-in-progress",
    icon: "🔄",
    color: "#2397f5",
  },
  Resuelto: {
    label: "Resuelto",
    className: "badge badge-success",
    icon: "✅",
    color: "#4CAF50",
  },
};

/**
 * Obtiene la configuración visual de un estado de incidente.
 * Si el estado no existe en el diccionario, devuelve configuración por defecto (Nuevo).
 */
export function getStatusConfig(status: string): StatusConfig {
  return (
    INCIDENT_STATUS_CONFIG[status as IncidentStatus] ??
    INCIDENT_STATUS_CONFIG.Nuevo
  );
}
