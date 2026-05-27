"use client";

import { IncidentPriorityBadge } from "@/components/IncidentPriorityBadge";
import { IncidentStatusBadge } from "@/components/IncidentStatusBadge";
import { getPriorityCardClass } from "@/utils/incidentPriority";

export type TechnicianIncident = {
  id: string;
  status: string;
  priority: string | null;
  created_at: string;
  category_id: string;
  campus_place: string | null;
  technician_id: string | null;
};

type Props = {
  incident: TechnicianIncident;
  categoryName: string;
  onOpen: () => void;
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

export default function TechnicianIncidentCard({
  incident,
  categoryName,
  onOpen,
}: Props) {
  return (
    <div
      className={`card card-clickable ${getPriorityCardClass(incident.priority)}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onOpen();
        }
      }}
    >
      <div className="card-stripe" />

      <div className="card-body">
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
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <IncidentStatusBadge status={incident.status} />
            <IncidentPriorityBadge priority={incident.priority} />
          </div>
        </div>

        <p className="card-title-sm mb-xs" style={{ fontSize: "var(--font-size-body)" }}>
          {categoryName}
        </p>

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
            {incident.campus_place || "Sin ubicacion"}
          </span>
        </div>

        <div
          style={{
            height: 1,
            background: "var(--color-border-light)",
            marginBottom: "var(--space-sm)",
          }}
        />

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
  );
}
