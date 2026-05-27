"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
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

type ViewOnlyMapProps = {
  latitude: number;
  longitude: number;
};

/**
 * Mapa Leaflet/OpenStreetMap de solo lectura.
 * Muestra la ubicación del incidente sin permitir interacción.
 * Importar con dynamic() y ssr: false (igual que InteractiveMap).
 */
export default function ViewOnlyMap({ latitude, longitude }: ViewOnlyMapProps) {
  return (
    <div
      style={{
        height: 200,
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        border: "1px solid var(--color-border-light)",
      }}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={17}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={customIcon} />
      </MapContainer>
    </div>
  );
}