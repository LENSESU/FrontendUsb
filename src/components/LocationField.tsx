"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

/** Zonas del campus válidas según el backend */
const CAMPUS_ZONES = [
	{ value: "Biblioteca", label: "Biblioteca" },
	{ value: "Lago", label: "Lago" },
	{ value: "Cedro", label: "Cedro" },
	{ value: "Central", label: "Central" },
	{ value: "Farrallones", label: "Farrallones" },
	{ value: "Parqueadero_estudiantes", label: "Parqueadero Estudiantes" },
	{ value: "Parque tecnologico", label: "Parque Tecnológico" },
	{ value: "Naranjos", label: "Naranjos" },
	{ value: "Higuerones", label: "Higuerones" },
	{ value: "Cancha", label: "Cancha" },
	{ value: "Otros", label: "Otros" },
];

/** Coordenadas por defecto solicitadas para el centro del mapa */
const USB_CENTER = { lat: 3.3453045315865504, lng: -76.5440884444818 };

function getMapUrl(latitude: number, longitude: number): string {
	return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.002},${latitude - 0.002},${longitude + 0.002},${latitude + 0.002}&layer=mapnik&marker=${latitude},${longitude}`;
}

type GpsCoordinates = {
	latitude: number;
	longitude: number;
} | null;

type LocationFieldProps = {
	zone: string;
	detail: string;
	onZoneChange: (value: string) => void;
	onDetailChange: (value: string) => void;
	onGpsChange?: (coords: GpsCoordinates) => void;
	error?: string;
};

/** Carga dinámica del mapa (Leaflet no funciona en SSR) */
const InteractiveMap = dynamic(() => import("./InteractiveMap"), {
	ssr: false,
	loading: () => (
		<div style={{ height: 250, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "0.5rem" }}>
			Cargando mapa...
		</div>
	),
});

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

	function captureGps() {
		if (!navigator.geolocation) {
			setGpsStatus("error");
			return;
		}

		setGpsStatus("loading");

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const coords = {
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				};
				setGpsCoords(coords);
				setGpsStatus("success");
				setShowMap(true);
				onGpsChange?.(coords);
			},
			() => {
				setGpsStatus("error");
				onGpsChange?.(null);
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}

	function handleMapClick(lat: number, lng: number) {
		const coords = { latitude: lat, longitude: lng };
		setGpsCoords(coords);
		setGpsStatus("success");
		onGpsChange?.(coords);
	}

	function openMapManually() {
		setShowMap(true);
		if (!gpsCoords) {
			// Usar centro del campus como default
			const defaultCoords = { latitude: USB_CENTER.lat, longitude: USB_CENTER.lng };
			setGpsCoords(defaultCoords);
			onGpsChange?.(defaultCoords);
		}
	}

	return (
		<div className="field location-field">
			<label htmlFor="location-zone">
				Ubicación <span className="field-required">*</span>
			</label>

			{/* Dropdown de zona del campus */}
			<select
				id="location-zone"
				value={zone}
				onChange={(e) => onZoneChange(e.target.value)}
				aria-invalid={Boolean(error)}
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

			{/* Input de detalle específico */}
			<div className="location-detail-wrap" style={{ marginTop: "0.5rem" }}>
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
					style={{ marginTop: "0.25rem", color: detail.length >= 100 ? "var(--color-error)" : undefined }}
				>
					{detail.length}/100 caracteres
				</p>
			</div>

			{/* Botones de acción */}
			<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
				{/* Botón GPS */}
				<button
					type="button"
					className="btn-gps"
					onClick={captureGps}
					disabled={gpsStatus === "loading"}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						padding: "0.5rem 1rem",
						fontSize: "0.875rem",
						border: "1px solid var(--color-border)",
						borderRadius: "0.5rem",
						background: gpsStatus === "success" ? "var(--color-success-bg)" : "var(--color-bg-muted)",
						color: gpsStatus === "success" ? "var(--color-success)" : "var(--color-text-secondary)",
						cursor: gpsStatus === "loading" ? "wait" : "pointer",
					}}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
						<path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					{gpsStatus === "idle" && "📍 Capturar mi ubicación"}
					{gpsStatus === "loading" && "Obteniendo..."}
					{gpsStatus === "success" && "✅ Ubicación capturada"}
					{gpsStatus === "error" && "❌ Reintentar GPS"}
				</button>

				{/* Botón para abrir mapa manualmente */}
				{!showMap && (
					<button
						type="button"
						onClick={openMapManually}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							padding: "0.5rem 1rem",
							fontSize: "0.875rem",
							border: "1px solid var(--color-border)",
							borderRadius: "0.5rem",
							background: "var(--color-bg-muted)",
							color: "var(--color-text-secondary)",
							cursor: "pointer",
						}}
					>
						🗺️ Seleccionar en mapa
					</button>
				)}
			</div>

			{/* Mapa interactivo Leaflet */}
			{showMap && (
				<div style={{ marginTop: "0.75rem" }}>
					<InteractiveMap
						latitude={gpsCoords?.latitude ?? USB_CENTER.lat}
						longitude={gpsCoords?.longitude ?? USB_CENTER.lng}
						onLocationSelect={handleMapClick}
					/>
					<p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.25rem", textAlign: "center" }}>
						Haz clic en el mapa o arrastra el marcador para ajustar la ubicación
					</p>
				</div>
			)}

			{/* Coordenadas capturadas */}
			{gpsCoords && (
				<div style={{
					marginTop: "0.5rem",
					padding: "0.5rem",
					background: "var(--color-bg-muted)",
					borderRadius: "0.25rem",
					fontSize: "0.75rem",
					color: "var(--color-text-secondary)",
					textAlign: "center",
				}}>
					📍 Coordenadas: {gpsCoords.latitude.toFixed(6)}, {gpsCoords.longitude.toFixed(6)}
			{/* Botón GPS */}
			<button
				type="button"
				className="btn-gps"
				onClick={captureGps}
				disabled={gpsStatus === "loading"}
				style={{
					marginTop: "0.5rem",
					display: "flex",
					alignItems: "center",
					gap: "0.5rem",
					padding: "0.5rem 1rem",
					fontSize: "0.875rem",
					border: "1px solid var(--color-border)",
					borderRadius: "0.5rem",
					background: gpsStatus === "success" ? "var(--color-success-bg)" : "var(--color-bg-muted)",
					color: gpsStatus === "success" ? "var(--color-success)" : "var(--color-text-secondary)",
					cursor: gpsStatus === "loading" ? "wait" : "pointer",
				}}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
					<path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				{gpsStatus === "idle" && "📍 Capturar mi ubicación GPS"}
				{gpsStatus === "loading" && "Obteniendo ubicación..."}
				{gpsStatus === "success" && "✅ Ubicación capturada"}
				{gpsStatus === "error" && "❌ No se pudo obtener GPS - Intenta de nuevo"}
			</button>

			{/* Mini mapa OpenStreetMap */}
			{gpsStatus === "success" && gpsCoords && (
				<div
					style={{
						marginTop: "0.75rem",
						borderRadius: "0.5rem",
						overflow: "hidden",
						border: "1px solid var(--color-border)",
					}}
				>
					<iframe
						title="Ubicación en el mapa"
						width="100%"
						height="200"
						style={{ border: 0, display: "block" }}
						src={getMapUrl(gpsCoords.latitude, gpsCoords.longitude)}
						allowFullScreen={false}
						loading="lazy"
					/>
					<div
						style={{
							padding: "0.5rem",
							background: "var(--color-bg-muted)",
							fontSize: "0.75rem",
							color: "var(--color-text-secondary)",
							textAlign: "center",
						}}
					>
						📍 {gpsCoords.latitude.toFixed(6)}, {gpsCoords.longitude.toFixed(6)}
					</div>
				</div>
			)}

			{error ? (
				<p id="location-error" className="field-error-text">{error}</p>
			) : (
				<p id="location-help" className="field-hint">
					Selecciona la zona y opcionalmente añade un detalle específico.
				</p>
			)}
		</div>
	)}
	</div>
	);
}