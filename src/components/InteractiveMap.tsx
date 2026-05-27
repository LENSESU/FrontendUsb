"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix para el ícono de Leaflet en Next.js
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
	onLocationSelect: (lat: number, lng: number) => void;
};

/** Componente para manejar clics en el mapa */
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
	useMapEvents({
		click(e) {
			onLocationSelect(e.latlng.lat, e.latlng.lng);
		},
	});
	return null;
}

/** Componente para centrar el mapa cuando cambian las coordenadas */
function MapCenterUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
	const map = useMap();
	const prevCoordsRef = useRef({ latitude, longitude });

	useEffect(() => {
		// Solo re-centrar si las coordenadas cambiaron significativamente
		const prevCoords = prevCoordsRef.current;
		const distance = Math.sqrt(
			Math.pow(latitude - prevCoords.latitude, 2) + Math.pow(longitude - prevCoords.longitude, 2)
		);
		
		if (distance > 0.0001) {
			map.setView([latitude, longitude], map.getZoom());
			prevCoordsRef.current = { latitude, longitude };
		}
	}, [latitude, longitude, map]);

	return null;
}

/** Componente para marcador draggable */
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
			draggable={true}
			eventHandlers={eventHandlers}
			position={[latitude, longitude]}
			ref={markerRef}
			icon={customIcon}
		/>
	);
}

export default function InteractiveMap({ latitude, longitude, onLocationSelect }: InteractiveMapProps) {
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
				center={[latitude, longitude]}
				zoom={17}
				style={{ height: "100%", width: "100%" }}
				scrollWheelZoom={true}
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
				<MapCenterUpdater latitude={latitude} longitude={longitude} />
			</MapContainer>
		</div>
	);
}
