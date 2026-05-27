/**
 * Componente reutilizable para renderizar la prioridad de un incidente.
 * Recibe la prioridad del backend y la mapea a su representación visual.
 */

import { getPriorityConfig } from "@/utils/incidentPriority";

interface IncidentPriorityBadgeProps {
  /** Prioridad del incidente devuelta por el backend (ej: "Alta", "Media", "Baja") */
  priority: string | null | undefined;
  /** Mostrar ícono junto al texto (opcional, default: true) */
  showIcon?: boolean;
}

export function IncidentPriorityBadge({
  priority,
  showIcon = true,
}: IncidentPriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  return (
    <span className={config.className} aria-label={`Prioridad ${config.label}`}>
      {showIcon && <span aria-hidden="true">{config.icon}</span>}
      {config.label}
    </span>
  );
}
