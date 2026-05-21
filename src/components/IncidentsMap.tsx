"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type IncidentMarker = {
  id: string;
  category: string;
  status: string | null;
  priority: string | null;
  latitude: number;
  longitude: number;
  campusPlace: string | null;
  createdAt: string;
};

type Props = {
  incidents: IncidentMarker[];
  // Coordenadas iniciales por defecto (USB Cali aprox).
  defaultCenter?: [number, number];
  defaultZoom?: number;
  onMarkerClick?: (id: string) => void;
};

// Pin SVG coloreado en data-URI, para no depender de assets externos.
function buildPinIcon(color: string): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 40" width="28" height="40">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10 14 26 14 26s14-16 14-26C28 6.27 21.73 0 14 0z"
            fill="${color}" stroke="#1f2937" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  `.trim();

  return L.divIcon({
    html: svg,
    className: "incident-map-pin",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

const PIN_BY_PRIORITY: Record<string, L.DivIcon> = {
  Alta: buildPinIcon("#dc2626"),
  Media: buildPinIcon("#f97316"),
  Baja: buildPinIcon("#16a34a"),
  Default: buildPinIcon("#6b7280"),
};

function priorityIcon(priority: string | null): L.DivIcon {
  if (!priority) return PIN_BY_PRIORITY.Default;
  return PIN_BY_PRIORITY[priority] ?? PIN_BY_PRIORITY.Default;
}

function statusLabel(status: string | null): string {
  if (!status) return "—";
  if (status === "En_proceso") return "En progreso";
  return status;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function shortId(value: string): string {
  return value.slice(0, 8).toUpperCase();
}

const USB_CALI_DEFAULT: [number, number] = [3.3771, -76.5377];

export default function IncidentsMap({
  incidents,
  defaultCenter = USB_CALI_DEFAULT,
  defaultZoom = 17,
  onMarkerClick,
}: Props) {
  // Centro inicial: primer incidente o default.
  const center = useMemo<[number, number]>(() => {
    if (incidents.length > 0) {
      return [incidents[0].latitude, incidents[0].longitude];
    }
    return defaultCenter;
  }, [incidents, defaultCenter]);

  return (
    <div
      style={{
        height: 520,
        borderRadius: "0.5rem",
        overflow: "hidden",
        border: "1px solid var(--color-border-light)",
      }}
    >
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
            icon={priorityIcon(incident.priority)}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  #{shortId(incident.id)}
                </p>
                <p style={{ fontWeight: 700, margin: "4px 0 6px" }}>
                  {incident.category}
                </p>
                <p style={{ fontSize: 12, margin: "2px 0" }}>
                  <strong>Estado:</strong> {statusLabel(incident.status)}
                </p>
                <p style={{ fontSize: 12, margin: "2px 0" }}>
                  <strong>Prioridad:</strong> {incident.priority ?? "—"}
                </p>
                {incident.campusPlace ? (
                  <p style={{ fontSize: 12, margin: "2px 0" }}>
                    <strong>Lugar:</strong> {incident.campusPlace}
                  </p>
                ) : null}
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-hint)",
                    margin: "4px 0 8px",
                  }}
                >
                  {formatDate(incident.createdAt)}
                </p>
                {onMarkerClick ? (
                  <button
                    type="button"
                    onClick={() => onMarkerClick(incident.id)}
                    style={{
                      background: "var(--color-primary)",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Ver detalle →
                  </button>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
