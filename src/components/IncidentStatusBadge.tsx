/**
 * Componente reutilizable para renderizar el estado de un incidente.
 * Recibe el estado del backend y lo mapea dinámicamente a su representación visual.
 */

import { getStatusConfig } from "@/utils/incidentStatus";

interface IncidentStatusBadgeProps {
  /** Estado del incidente devuelto por el backend (ej: "Nuevo", "En_proceso", "Resuelto") */
  status: string;
  /** Mostrar ícono junto al texto (opcional, default: false) */
  showIcon?: boolean;
}

export function IncidentStatusBadge({
  status,
  showIcon = false,
}: IncidentStatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span className={config.className}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </span>
  );
}
