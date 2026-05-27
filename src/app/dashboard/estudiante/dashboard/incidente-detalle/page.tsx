"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { restoreAuthSession, type AuthData } from "@/utils/auth";
import { getStatusConfig } from "@/utils/incidentStatus";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type IncidentDetail = {
	id: string;
	status: string;
	priority: string | null;
	created_at: string;
	updated_at: string | null;
	category_id: string;
	campus_place: string | null;
	description: string;
	latitude: number | null;
	longitude: number | null;
	student_id: string;
	technician_id: string | null;
	before_photo_id: string | null;
	after_photo_id: string | null;
};

type Category = {
	id: string;
	name: string;
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

export default function EstudianteIncidenteDetallePage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const incidentId = searchParams.get("id");

	const [auth, setAuth] = useState<AuthData | null>(null);
	const [incident, setIncident] = useState<IncidentDetail | null>(null);
	const [categoryName, setCategoryName] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function loadSession() {
			const session = await restoreAuthSession();
			setAuth(session);
		}
		void loadSession();
	}, []);

	useEffect(() => {
		if (!auth?.accessToken || !incidentId) {
			if (!incidentId) setError("No se especificó un incidente.");
			return;
		}

		const token = auth.accessToken;

		async function fetchData() {
			try {
				const [incRes, catRes] = await Promise.all([
					fetch(`${API}/api/v1/incidents/${incidentId}/`, {
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
					}),
					fetch(`${API}/api/v1/categories/`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
				]);

				if (!incRes.ok) throw new Error("No se pudo cargar el incidente.");

				const incData = (await incRes.json()) as IncidentDetail;
				setIncident(incData);

				if (catRes.ok) {
					const catData = (await catRes.json()) as { items?: Category[] } | Category[];
					const cats: Category[] = Array.isArray(catData)
						? catData
						: (catData.items ?? []);
					const found = cats.find((c) => c.id === incData.category_id);
					setCategoryName(found?.name ?? "Sin categoría");
				}
			} catch {
				setError("No se pudo cargar la información del incidente.");
			} finally {
				setLoading(false);
			}
		}

		void fetchData();
	}, [auth, incidentId]);

	if (loading) {
		return (
			<div className="page-centered">
				<div className="flex items-center gap-sm">
					<span className="spinner spinner-dark" />
					<p className="text-secondary">Cargando incidente…</p>
				</div>
			</div>
		);
	}

	if (error || !incident) {
		return (
			<div className="page-centered">
				<div className="form-wrapper">
					<div className="alert-error">
						<p>{error ?? "Incidente no encontrado."}</p>
					</div>
					<button
						type="button"
						className="btn-secondary"
						onClick={() => router.back()}
					>
						Volver
					</button>
				</div>
			</div>
		);
	}

	const statusConfig = getStatusConfig(incident.status);

	return (
		<div className="page-centered">
			<div className="form-wrapper">
				<div className="card">
					<div className="card-stripe" />
					<div className="card-body">

						<button
							type="button"
							className="btn-link"
							onClick={() => router.back()}
							style={{ marginBottom: "var(--space-md)" }}
						>
							← Volver a mis incidentes
						</button>

						<div
							className="flex items-center justify-between"
							style={{ flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}
						>
							<span
								style={{
									fontFamily: "monospace",
									fontSize: "var(--font-size-xs)",
									color: "var(--color-text-hint)",
									letterSpacing: "0.04em",
								}}
							>
								#{incident.id.slice(0, 8).toUpperCase()}
							</span>
							<span className={statusConfig.className}>{statusConfig.label}</span>
						</div>

						<h1 className="card-form-title">Detalle del incidente</h1>

						<div className="field">
							<label>Categoría</label>
							<p style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-primary)", fontWeight: "var(--font-weight-medium)" }}>
								{categoryName}
							</p>
						</div>

						<div className="field">
							<label>Ubicación</label>
							<div className="flex items-center gap-xs">
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									style={{ fill: "none", stroke: "var(--color-text-hint)", strokeWidth: 2, flexShrink: 0 }}
								>
									<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
									<circle cx="12" cy="10" r="3" />
								</svg>
								<p className="text-small text-secondary">
									{incident.campus_place ?? "Sin ubicación registrada"}
								</p>
							</div>
						</div>

						<div className="field">
							<label>Descripción</label>
							<div
								style={{
									background: "var(--color-bg-muted)",
									borderRadius: "var(--radius-sm)",
									padding: "var(--space-md)",
									fontSize: "var(--font-size-small)",
									color: "var(--color-text-primary)",
									lineHeight: 1.6,
									whiteSpace: "pre-wrap",
									border: "1px solid var(--color-border-light)",
								}}
							>
								{incident.description || "Sin descripción"}
							</div>
						</div>

{(incident.latitude != null || incident.longitude != null) && (
							<div className="field">
								<label>Coordenadas GPS</label>
								<p className="text-small text-secondary">
									Lat: {incident.latitude} — Lng: {incident.longitude}
								</p>
							</div>
						)}

						<div className="field">
							<label>Fecha de reporte</label>
							<div className="flex items-center gap-xs">
								<svg
									width="13"
									height="13"
									viewBox="0 0 24 24"
									style={{ fill: "none", stroke: "var(--color-text-hint)", strokeWidth: 2, flexShrink: 0 }}
								>
									<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
									<line x1="16" y1="2" x2="16" y2="6" />
									<line x1="8" y1="2" x2="8" y2="6" />
									<line x1="3" y1="10" x2="21" y2="10" />
								</svg>
								<p className="text-small text-secondary">{formatDate(incident.created_at)}</p>
							</div>
						</div>

					</div>
				</div>

				<p className="page-footer">
					© {new Date().getFullYear()} Universidad San Buenaventura Cali · USB LENS
				</p>
			</div>
		</div>
	);
}
