"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type InteractiveMapProps = {
  latitude: number;
  longitude: number;
  /** Centro del mapa — independiente del marcador. Si se omite usa latitude/longitude. */
  centerLat?: number;
  centerLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
};

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

/**
 * Recentra el mapa cuando cambia centerLat/centerLng (zona seleccionada),
 * sin mover el marcador.
 */
function MapCenterUpdater({ centerLat, centerLng }: { centerLat: number; centerLng: number }) {
  const map = useMap();
  const prevRef = useRef({ centerLat, centerLng });

  useEffect(() => {
    const prev = prevRef.current;
    const dist = Math.sqrt(
      Math.pow(centerLat - prev.centerLat, 2) +
      Math.pow(centerLng - prev.centerLng, 2),
    );
    if (dist > 0.0001) {
      map.setView([centerLat, centerLng], map.getZoom());
      prevRef.current = { centerLat, centerLng };
    }
  }, [centerLat, centerLng, map]);

  return null;
}

function DraggableMarker({
  latitude,
  longitude,
  onDragEnd,
}: {
  latitude: number;
  longitude: number;
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onDragEnd(pos.lat, pos.lng);
      }
    },
  };
  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[latitude, longitude]}
      ref={markerRef}
      icon={customIcon}
    />
  );
}

export default function InteractiveMap({
  latitude,
  longitude,
  centerLat,
  centerLng,
  onLocationSelect,
}: InteractiveMapProps) {
  const effectiveCenterLat = centerLat ?? latitude;
  const effectiveCenterLng = centerLng ?? longitude;

  return (
    <div
      style={{
        height: 250,
        borderRadius: "0.5rem",
        overflow: "hidden",
        border: "1px solid var(--color-border)",
      }}
    >
      <MapContainer
        center={[effectiveCenterLat, effectiveCenterLng]}
        zoom={17}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker
          latitude={latitude}
          longitude={longitude}
          onDragEnd={onLocationSelect}
        />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        {/* Centra la vista en la zona seleccionada sin mover el marcador */}
        <MapCenterUpdater
          centerLat={effectiveCenterLat}
          centerLng={effectiveCenterLng}
        />
      </MapContainer>
    </div>
  );
}