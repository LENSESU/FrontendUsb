"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// ── Tipos exportados ──────────────────────────────────────────────────────────

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

export type CriticalZone = {
  zone: string;
  latitude: number;
  longitude: number;
  incidentCount: number;
  score: number;
  criticality: string;
};

// ── Bounds fijos del campus USB Cali ─────────────────────────────────────────

const USB_CENTER: [number, number] = [3.3454, -76.5444];

const USB_BOUNDS = L.latLngBounds(
  [3.3420, -76.5480],
  [3.3490, -76.5410],
);

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  incidents: IncidentMarker[];
  criticalZones?: CriticalZone[];
  defaultCenter?: [number, number];
  defaultZoom?: number;
  onMarkerClick?: (id: string) => void;
};

// ── Iconos de pin ─────────────────────────────────────────────────────────────

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
  Alta:    buildPinIcon("#dc2626"),
  Media:   buildPinIcon("#f97316"),
  Baja:    buildPinIcon("#16a34a"),
  Default: buildPinIcon("#6b7280"),
};

function priorityIcon(priority: string | null): L.DivIcon {
  if (!priority) return PIN_BY_PRIORITY.Default;
  return PIN_BY_PRIORITY[priority] ?? PIN_BY_PRIORITY.Default;
}

// ── Color por criticidad ──────────────────────────────────────────────────────

function zoneColor(criticality: string): string {
  if (criticality === "Alta")  return "#dc2626";
  if (criticality === "Media") return "#f97316";
  return "#16a34a";
}

// Radio en metros proporcional al score (15–80 m)
function zoneRadius(score: number): number {
  return Math.max(15, Math.min(80, Math.sqrt(score) * 10));
}

// ── Helpers de formato ────────────────────────────────────────────────────────

function statusLabel(status: string | null): string {
  if (!status) return "—";
  if (status === "En_proceso") return "En progreso";
  return status;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit", month: "short", year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function shortId(value: string): string {
  return value.slice(0, 8).toUpperCase();
}

// ── Popup HTML para un marcador ───────────────────────────────────────────────

function buildPopupHtml(incident: IncidentMarker, withButton: boolean): string {
  const lugar = incident.campusPlace
    ? `<p style="font-size:12px;margin:2px 0"><strong>Lugar:</strong> ${incident.campusPlace}</p>`
    : "";
  const btn = withButton
    ? `<button
         type="button"
         data-incident-id="${incident.id}"
         style="margin-top:6px;background:#f97316;color:white;border:none;border-radius:4px;
                padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;width:100%">
         Ver detalle →
       </button>`
    : "";

  return `
    <div style="min-width:200px;font-family:sans-serif">
      <p style="font-size:11px;font-weight:700;color:#f97316;text-transform:uppercase;margin:0">
        #${shortId(incident.id)}
      </p>
      <p style="font-weight:700;margin:4px 0 6px">${incident.category}</p>
      <p style="font-size:12px;margin:2px 0"><strong>Estado:</strong> ${statusLabel(incident.status)}</p>
      <p style="font-size:12px;margin:2px 0"><strong>Prioridad:</strong> ${incident.priority ?? "—"}</p>
      ${lugar}
      <p style="font-size:11px;color:#9ca3af;margin:4px 0 2px">${formatDate(incident.createdAt)}</p>
      ${btn}
    </div>
  `.trim();
}

// ── Sub-componente: bounds + minZoom ──────────────────────────────────────────

function BoundsController() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(USB_BOUNDS);
    map.setMinZoom(17);
    if (!USB_BOUNDS.contains(map.getCenter())) {
      map.setView(USB_CENTER, 17);
    }
  }, [map]);
  return null;
}

// ── Sub-componente: cluster layer nativo ──────────────────────────────────────

function ClusterLayer({
  incidents,
  onMarkerClick,
}: {
  incidents: IncidentMarker[];
  onMarkerClick?: (id: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const LX = L as typeof L & {
      markerClusterGroup: (opts: object) => L.Layer & { addLayer: (l: L.Layer) => void };
    };
    const cluster = LX.markerClusterGroup({
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (clusterGroup: { getChildCount: () => number }) => {
        const count = clusterGroup.getChildCount();
        const size = count > 9 ? 40 : 34;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:#f97316;border:2.5px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,.35);
            display:flex;align-items:center;justify-content:center;
            font-size:13px;font-weight:700;color:#fff;
          ">${count}</div>`,
          className: "incident-cluster-icon",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    for (const incident of incidents) {
      const marker = L.marker(
        [incident.latitude, incident.longitude],
        { icon: priorityIcon(incident.priority) },
      );

      const popup = L.popup({ maxWidth: 240 }).setContent(
        buildPopupHtml(incident, !!onMarkerClick),
      );
      marker.bindPopup(popup);

      // Delegación de eventos: detecta clic en el botón dentro del popup
      if (onMarkerClick) {
        marker.on("popupopen", () => {
          const btn = document.querySelector<HTMLButtonElement>(
            `[data-incident-id="${incident.id}"]`,
          );
          btn?.addEventListener("click", () => onMarkerClick(incident.id));
        });
      }

      cluster.addLayer(marker);
    }

    map.addLayer(cluster);

    return () => {
      map.removeLayer(cluster);
    };
  }, [map, incidents, onMarkerClick]);

  return null;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function IncidentsMap({
  incidents,
  criticalZones = [],
  defaultCenter = USB_CENTER,
  defaultZoom = 17,
  onMarkerClick,
}: Props) {
  const center = useMemo<[number, number]>(() => {
    if (incidents.length > 0) {
      const { latitude: lat, longitude: lng } = incidents[0];
      if (USB_BOUNDS.contains([lat, lng])) return [lat, lng];
    }
    return defaultCenter;
  }, [incidents, defaultCenter]);

  return (
    <div
      style={{
        height: "clamp(360px, 55vw, 560px)",
        borderRadius: "0.5rem",
        overflow: "hidden",
        border: "1px solid var(--color-border-light)",
      }}
    >
      <MapContainer
        center={center}
        zoom={defaultZoom}
        minZoom={17}
        maxZoom={19}
        maxBounds={USB_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <BoundsController />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Capa 1: zonas críticas (círculos debajo de los pines) */}
        {criticalZones.map((zone) => {
          const color = zoneColor(zone.criticality);
          return (
            <Circle
              key={zone.zone}
              center={[zone.latitude, zone.longitude]}
              radius={zoneRadius(zone.score)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.18,
                weight: 1.5,
                opacity: 0.7,
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <p style={{ fontWeight: 700, margin: "0 0 2px" }}>{zone.zone}</p>
                  <p style={{ margin: 0 }}>
                    {zone.incidentCount} incidente{zone.incidentCount !== 1 ? "s" : ""}
                    {" · "}score {zone.score}
                  </p>
                  <p style={{ margin: "2px 0 0", fontWeight: 600, color }}>
                    Criticidad {zone.criticality}
                  </p>
                </div>
              </Tooltip>
            </Circle>
          );
        })}

        {/* Capa 2: marcadores con clustering nativo */}
        <ClusterLayer incidents={incidents} onMarkerClick={onMarkerClick} />
      </MapContainer>
    </div>
  );
}