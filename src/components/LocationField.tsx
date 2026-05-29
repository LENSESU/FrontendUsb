"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  CAMPUS_ZONES,
  USB_CENTER,
  ZONE_RADIUS_M,
  getCampusZoneByValue,
} from "@/data/campusZones";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type GpsCoordinates = { latitude: number; longitude: number } | null;

type LocationFieldProps = {
  zone: string;
  detail: string;
  onZoneChange: (value: string) => void;
  onDetailChange: (value: string) => void;
  onGpsChange?: (coords: GpsCoordinates) => void;
  error?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getZoneMeta(value: string) {
  return getCampusZoneByValue(value) ?? null;
}

function isWithinZone(lat: number, lng: number, zoneValue: string): boolean {
  const meta = getZoneMeta(zoneValue);
  if (!meta || meta.lat == null || meta.lng == null) return true;
  return haversineMeters(lat, lng, meta.lat, meta.lng) <= ZONE_RADIUS_M;
}

// ── Mapa (SSR-safe) ───────────────────────────────────────────────────────────

const InteractiveMap = dynamic(
  () =>
    import("./InteractiveMap").then((mod) => {
      const Original = mod.default;

      function WrappedMap(props: {
        latitude: number;
        longitude: number;
        centerLat: number;
        centerLng: number;
        onLocationSelect: (lat: number, lng: number) => void;
      }) {
        return (
          <Original
            latitude={props.latitude}
            longitude={props.longitude}
            centerLat={props.centerLat}
            centerLng={props.centerLng}
            onLocationSelect={props.onLocationSelect}
          />
        );
      }
      return WrappedMap;
    }),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 250,
          background: "var(--color-bg-muted)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-hint)",
        }}
      >
        Cargando mapa...
      </div>
    ),
  },
);

// ── Componente ────────────────────────────────────────────────────────────────

export default function LocationField({
  zone,
  detail,
  onZoneChange,
  onDetailChange,
  onGpsChange,
  error,
}: LocationFieldProps) {
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [gpsCoords, setGpsCoords] = useState<GpsCoordinates>(null);
  const [showMap, setShowMap] = useState(false);
  const [outOfZone, setOutOfZone] = useState(false);

  const [mapCenter, setMapCenter] = useState(USB_CENTER);

  useEffect(() => {
    const meta = getZoneMeta(zone);
    const newCenter =
      meta?.lat != null && meta?.lng != null
        ? { lat: meta.lat, lng: meta.lng }
        : USB_CENTER;

    setMapCenter(newCenter);

    if (gpsCoords && zone) {
      const valid = isWithinZone(gpsCoords.latitude, gpsCoords.longitude, zone);
      setOutOfZone(!valid);
      if (!valid) onGpsChange?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone]);

  function applyCoords(coords: GpsCoordinates) {
    if (!coords) {
      setGpsCoords(null);
      setOutOfZone(false);
      onGpsChange?.(null);
      return;
    }
    const valid = !zone || isWithinZone(coords.latitude, coords.longitude, zone);
    setGpsCoords(coords);
    setOutOfZone(!valid);
    onGpsChange?.(valid ? coords : null);
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsStatus("success");
        setShowMap(true);
        applyCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setGpsStatus("error");
        onGpsChange?.(null);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleMapClick(lat: number, lng: number) {
    applyCoords({ latitude: lat, longitude: lng });
  }

  function openMapManually() {
    setShowMap(true);
  }

  function clearMap() {
    setShowMap(false);
    setGpsCoords(null);
    setGpsStatus("idle");
    setOutOfZone(false);
    onGpsChange?.(null);
  }

  const gpsLabel = {
    idle: "Capturar mi ubicación GPS",
    loading: "Obteniendo ubicación...",
    success: "Ubicación capturada",
    error: "No se pudo obtener GPS — Reintentar",
  }[gpsStatus];

  const selectedZoneMeta = getZoneMeta(zone);
  const zoneHasCenter = selectedZoneMeta?.lat != null;

  const markerLat = gpsCoords?.latitude ?? mapCenter.lat;
  const markerLng = gpsCoords?.longitude ?? mapCenter.lng;

  return (
    <div className="field location-field">
      <label htmlFor="location-zone">
        Ubicación <span className="field-required">*</span>
      </label>

      <select
        id="location-zone"
        value={zone}
        onChange={(e) => {
          onZoneChange(e.target.value);
          const meta = getZoneMeta(e.target.value);
          if (meta?.lat != null) setShowMap(true);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "location-error" : "location-help"}
        className={error ? "input-error" : ""}
      >
        <option value="">Selecciona una zona del campus</option>
        {CAMPUS_ZONES.map((z) => (
          <option key={z.value} value={z.value}>
            {z.label}
          </option>
        ))}
      </select>

      <div style={{ marginTop: "0.5rem" }}>
        <input
          id="location-detail"
          type="text"
          placeholder="Detalle: Ej. Salón 204, segundo piso (opcional)"
          value={detail}
          maxLength={100}
          onChange={(e) => onDetailChange(e.target.value)}
          aria-label="Detalle de ubicación"
          aria-describedby="location-detail-hint"
        />
        <p
          id="location-detail-hint"
          className="text-small text-secondary"
          style={{
            marginTop: "0.25rem",
            color: detail.length >= 100 ? "var(--color-error)" : undefined,
          }}
        >
          {detail.length}/100 caracteres
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={captureGps}
          disabled={gpsStatus === "loading"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "var(--font-size-xs)",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-sm)",
            background:
              gpsStatus === "success"
                ? "var(--color-success-bg, #e8f5e9)"
                : "var(--color-bg-muted)",
            color:
              gpsStatus === "success"
                ? "var(--color-success, #2e7d32)"
                : gpsStatus === "error"
                  ? "var(--color-error)"
                  : "var(--color-text-secondary)",
            cursor: gpsStatus === "loading" ? "wait" : "pointer",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {gpsLabel}
        </button>

        {!showMap && (
          <button
            type="button"
            onClick={openMapManually}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "var(--font-size-xs)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-bg-muted)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            Seleccionar en mapa
          </button>
        )}
      </div>

      {showMap && (
        <div style={{ marginTop: "0.75rem" }}>
          <InteractiveMap
            latitude={markerLat}
            longitude={markerLng}
            centerLat={mapCenter.lat}
            centerLng={mapCenter.lng}
            onLocationSelect={handleMapClick}
          />

          {zoneHasCenter && (
            <div
              style={{
                marginTop: "0.5rem",
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-xs)",
                background: outOfZone ? "#fef2f2" : "var(--color-bg-muted)",
                border: `1px solid ${outOfZone ? "#fca5a5" : "var(--color-border-light)"}`,
                color: outOfZone ? "#b91c1c" : "var(--color-text-secondary)",
                transition: "background 0.2s, border-color 0.2s, color 0.2s",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                {outOfZone ? (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </>
                ) : (
                  <>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </>
                )}
              </svg>
              <span>
                {outOfZone
                  ? `El punto está fuera del área de "${selectedZoneMeta?.label}". Ajusta el marcador dentro del radio permitido (${ZONE_RADIUS_M} m).`
                  : `Coloca el marcador dentro del área de "${selectedZoneMeta?.label}".`}
              </span>
            </div>
          )}

          {gpsCoords && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginTop: "0.5rem",
                padding: "0.4rem 0.75rem",
                background: "var(--color-bg-muted)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span style={{ fontFamily: "monospace" }}>
                {gpsCoords.latitude.toFixed(6)}, {gpsCoords.longitude.toFixed(6)}
                {outOfZone && (
                  <span style={{ marginLeft: 6, color: "#b91c1c", fontFamily: "inherit" }}>
                    — fuera de zona
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={clearMap}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-hint)",
                  padding: "0 2px",
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label="Quitar ubicación del mapa"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-hint)",
              marginTop: "0.25rem",
              textAlign: "center",
            }}
          >
            Haz clic en el mapa o arrastra el marcador para ajustar la ubicación
          </p>
        </div>
      )}

      {error ? (
        <p id="location-error" className="field-error-text">
          {error}
        </p>
      ) : (
        <p id="location-help" className="field-hint">
          Selecciona la zona y opcionalmente añade un detalle específico.
        </p>
      )}
    </div>
  );
}
