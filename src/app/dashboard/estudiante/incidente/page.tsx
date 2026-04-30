"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
	getDashboardPathByRole,
	normalizeRole,
	restoreAuthSession,
	type AuthData,
} from "@/utils/auth";
import LocationField from "@/components/LocationField";
import Image from "next/image";

type GpsCoordinates = {
	latitude: number;
	longitude: number;
} | null;
import IncidentResponseModal from "@/components/IncidentResponseModal";

type IncidentErrors = {
	title?: string;
	category?: string;
	location?: string;
	description?: string;
	image?: string;
};

type CategoryOption = { id: string; name: string };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const CATEGORY_FALLBACK_OPTIONS: CategoryOption[] = [
	{ id: "", name: "Infraestructura" },
	{ id: "", name: "Tecnologia" },
	{ id: "", name: "Seguridad" },
	{ id: "", name: "Servicios" },
	{ id: "", name: "Otro" },
];

function parseCategoryOptions(payload: unknown): CategoryOption[] {
	let source: unknown[] = [];

	if (Array.isArray(payload)) {
		source = payload;
	} else if (payload && typeof payload === "object") {
		const p = payload as Record<string, unknown>;
		if (Array.isArray(p.items)) source = p.items;
		else if (Array.isArray(p.categories)) source = p.categories;
	}

	const options: CategoryOption[] = [];
	for (const item of source) {
		if (item && typeof item === "object") {
			const candidate = item as Record<string, unknown>;
			const id = typeof candidate.id === "string" ? candidate.id : "";
			const name =
				typeof candidate.name === "string"
					? candidate.name.trim()
					: typeof candidate.label === "string"
						? candidate.label.trim()
						: "";
			if (name) options.push({ id, name });
		}
	}

	return options;
}

export default function EstudianteIncidentePage() {
	const router = useRouter();
	const imageInputRef = useRef<HTMLInputElement | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const [auth, setAuth] = useState<AuthData | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [title, setTitle] = useState("");
	const [category, setCategory] = useState("");
	const [locationZone, setLocationZone] = useState("");
	const [locationDetail, setLocationDetail] = useState("");
	const [gpsCoords, setGpsCoords] = useState<GpsCoordinates>(null);
	const [description, setDescription] = useState("");
	const [image, setImage] = useState<File | null>(null);
	const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
	const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(CATEGORY_FALLBACK_OPTIONS);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingCategories, setIsLoadingCategories] = useState(true);
	const [categoriesLoadError, setCategoriesLoadError] = useState<string | null>(null);

	const [errors, setErrors] = useState<IncidentErrors>({});
	const [submitMessage, setSubmitMessage] = useState<string | null>(null);
	const [isCameraOpen, setIsCameraOpen] = useState(false);
	const [isStartingCamera, setIsStartingCamera] = useState(false);
	const [cameraError, setCameraError] = useState<string | null>(null);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalMessage, setModalMessage] = useState("");
	const [modalIsError, setModalIsError] = useState(false);

	useEffect(() => {
		let isMounted = true;

		async function loadSession() {
			const restoredAuth = await restoreAuthSession();

			if (!isMounted) return;

			if (!restoredAuth) {
				setAuth({
					accessToken: "dev-mock",
					refreshToken: null,
					expiresIn: null,
					email: "dev@correo.usbcali.edu.co",
					role: "student",
				});
				setIsLoading(false);
				return;
			}

			const normalizedRole = normalizeRole(restoredAuth.role);
			if (!normalizedRole) {
				router.replace("/");
				return;
			}

			if (normalizedRole !== "student") {
				router.replace(getDashboardPathByRole(restoredAuth.role));
				return;
			}

			setAuth(restoredAuth);
			setIsLoading(false);
		}

		void loadSession();

		return () => {
			isMounted = false;
		};
	}, [router]);

	useEffect(() => {
		// No cargar categorías hasta tener autenticación
		if (!auth?.accessToken) return;

		let isMounted = true;

		async function loadCategories() {
			setIsLoadingCategories(true);
			setCategoriesLoadError(null);

			try {
				const response = await fetch(`${API}/api/v1/categories/`, {
					method: "GET",
					headers:{  "Content-Type": "application/json",
    						"Authorization": `Bearer ${auth!.accessToken}`,
				}		});

				if (!response.ok) {
					throw new Error("No se pudo obtener categorias.");
				}

				const data = (await response.json()) as unknown;
				const parsedOptions = parseCategoryOptions(data);

				if (!parsedOptions.length) {
					throw new Error("No llegaron categorias validas.");
				}

				if (!isMounted) return;
				setCategoryOptions(parsedOptions);
				setCategoriesLoadError(null);
			} catch {
				if (!isMounted) return;
				setCategoryOptions(CATEGORY_FALLBACK_OPTIONS);
				setCategoriesLoadError("No fue posible cargar categorias desde backend.");
			} finally {
				if (isMounted) {
					setIsLoadingCategories(false);
				}
			}
		}

		void loadCategories();

		return () => {
			isMounted = false;
		};
	}, [auth]);

	useEffect(() => {
		return () => {
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach((track) => track.stop());
				mediaStreamRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!image) {
			setImagePreviewUrl(null);
			return;
		}

		// Crear y limpiar Object URL para previsualizar archivo local sin fugas de memoria.
		const nextPreviewUrl = URL.createObjectURL(image);
		setImagePreviewUrl(nextPreviewUrl);
		return () => URL.revokeObjectURL(nextPreviewUrl);
	}, [image]);

	function clearFieldError(field: keyof IncidentErrors) {
		setErrors((current) => {
			if (!current[field]) return current;
			return { ...current, [field]: undefined };
		});
	}

	function resetForm() {
		setTitle("");
		setCategory("");
		setLocationZone("");
		setLocationDetail("");
		setGpsCoords(null);
		setDescription("");
		setImage(null);
		setErrors({});
		setSubmitMessage(null);
	}

	function validateForm(): IncidentErrors {
		const nextErrors: IncidentErrors = {};
		const trimmedTitle = title.trim();
		const trimmedDescription = description.trim();

		if (!trimmedTitle) {
			nextErrors.title = "El titulo del incidente es obligatorio.";
		} else if (trimmedTitle.length < 4) {
			nextErrors.title = "El titulo debe tener al menos 4 caracteres.";
		} else if (trimmedTitle.length > 20) {
			nextErrors.title = "El titulo no puede superar los 20 caracteres.";
		}

		if (!category) {
			nextErrors.category = "Selecciona una categoria.";
		}

		if (!locationZone) {
			nextErrors.location = "Selecciona una zona del campus.";
		}

		if (!trimmedDescription) {
			nextErrors.description = "La descripcion es obligatoria.";
		} else if (trimmedDescription.length < 10) {
			nextErrors.description = "La descripcion debe tener al menos 10 caracteres.";
		} else if (trimmedDescription.length > 200) {
			nextErrors.description = "La descripcion no puede superar los 200 caracteres.";
		}

		if (image) {
			const allowedTypes = ["image/jpeg", "image/png"];
			const maxSize = 5 * 1024 * 1024;
			if (!allowedTypes.includes(image.type)) {
				nextErrors.image = "Solo se permiten imágenes JPEG o PNG.";
			} else if (image.size > maxSize) {
				nextErrors.image = "La imagen no puede superar los 5 MB.";
			}
		}

		return nextErrors;
	}

	function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
		const selectedFile = event.target.files?.[0] ?? null;
		setImage(selectedFile);
		setSubmitMessage(null);

		if (!selectedFile) {
			clearFieldError("image");
			return;
		}

		const allowedTypes = ["image/jpeg", "image/png"];
		const maxSize = 5 * 1024 * 1024;

		if (!allowedTypes.includes(selectedFile.type)) {
			setErrors((current) => ({ ...current, image: "Solo se permiten imágenes JPEG o PNG." }));
		} else if (selectedFile.size > maxSize) {
			setErrors((current) => ({ ...current, image: "La imagen no puede superar los 5 MB." }));
		} else {
			clearFieldError("image");
		}
	}

	function handleOpenFilePicker() {
		imageInputRef.current?.click();
	}

	async function handleOpenCamera() {
		if (!navigator.mediaDevices?.getUserMedia) {
			setCameraError("Tu navegador no soporta acceso a la camara.");
			return;
		}

		setCameraError(null);
		setIsStartingCamera(true);

		try {
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach((track) => track.stop());
				mediaStreamRef.current = null;
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: "environment" } },
				audio: false,
			});

			mediaStreamRef.current = stream;
			setIsCameraOpen(true);

			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
			}
		} catch {
			setCameraError("No se pudo abrir la camara. Verifica permisos del navegador.");
		} finally {
			setIsStartingCamera(false);
		}
	}

	function handleCloseCamera() {
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
		setIsCameraOpen(false);
	}

	function handleTakePhoto() {
		if (!videoRef.current || !canvasRef.current) {
			setCameraError("No se pudo capturar la foto.");
			return;
		}

		const video = videoRef.current;
		const canvas = canvasRef.current;

		if (!video.videoWidth || !video.videoHeight) {
			setCameraError("La camara aun no esta lista. Intenta de nuevo.");
			return;
		}

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			setCameraError("No se pudo procesar la imagen capturada.");
			return;
		}

		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		canvas.toBlob(
			(blob) => {
				if (!blob) {
					setCameraError("No se pudo generar la foto capturada.");
					return;
				}

				const capturedFile = new File([blob], `incidente-${Date.now()}.jpg`, {
					type: "image/jpeg",
				});

				setImage(capturedFile);
				setSubmitMessage(null);
				clearFieldError("image");
				handleCloseCamera();
			},
			"image/jpeg",
			0.92,
		);
	}

	function handleCancel() {
		resetForm();
		handleCloseCamera();
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitMessage(null);

		const validationErrors = validateForm();
		if (Object.values(validationErrors).some(Boolean)) {
			setErrors(validationErrors);
			return;
		}

		if (!auth?.accessToken || auth.accessToken === "dev-mock") {
			setSubmitMessage("Debes iniciar sesion para enviar un incidente.");
			return;
		}

		setErrors({});
		setIsSubmitting(true);

		// El detalle específico se añade a la descripción
		const fullDescription = locationDetail.trim()
			? `${description.trim()}\n\n📍 Ubicación específica: ${locationDetail.trim()}`
			: description.trim();

		try {
			const res = await fetch(`${API}/api/v1/incidents/`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${auth.accessToken}`,
				},
				body: JSON.stringify({
					category_id: category,
					description: fullDescription,
					campus_place: locationZone || null,
					latitude: gpsCoords?.latitude ?? null,
					longitude: gpsCoords?.longitude ?? null,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				const detail = typeof data?.detail === "string"
					? data.detail
					: Array.isArray(data?.detail)
					? (data.detail as Array<{ msg?: string }>).map((e) => e.msg).join(", ")
					: "No se pudo guardar el incidente.";
				setModalIsError(true);
				setModalMessage(detail);
				setModalOpen(true);
				return;
			}

			const incidentId: string = data?.id || data?.incident_id || "N/A";

			// Subir imagen de evidencia si el usuario adjuntó una
			if (image && incidentId !== "N/A") {
				const formData = new FormData();
				formData.append("photo", image);

				const evidenceRes = await fetch(
					`${API}/api/v1/incidents/${incidentId}/evidence`,
					{
						method: "POST",
						headers: { Authorization: `Bearer ${auth.accessToken}` },
						body: formData,
					},
				);

				if (!evidenceRes.ok) {
					// El incidente se creó pero la imagen falló
					setModalIsError(false);
					setModalMessage(
						`Incidente creado (Ticket #${incidentId}), pero no se pudo adjuntar la imagen.`,
					);
					setModalOpen(true);
					resetForm();
					return;
				}
			}

			setModalIsError(false);
			setModalMessage(`Incidente reportado con éxito. Ticket #${incidentId}`);
			setModalOpen(true);
			resetForm();

		} catch {
			setModalIsError(true);
			setModalMessage("Error de conexión. Verifica tu red e intenta de nuevo.");
			setModalOpen(true);
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isLoading) return null;

	return (
		<div className="page-centered">
			<div className="form-wrapper">
				<div className="card">
					<div className="card-stripe" />
					<div className="card-body-center">
						<h1 className="card-form-title">Crear incidente</h1>

						{auth?.email ? (
							<p className="otp-hint">
								Reporte como <strong>{auth.email}</strong>
							</p>
						) : null}

						{submitMessage ? (
							<div className="alert-success" role="status">
								<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
									<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
								</svg>
								<p>{submitMessage}</p>
							</div>
						) : null}

						<form onSubmit={handleSubmit} noValidate>
							<div className="field">
								<label htmlFor="incident-title">Titulo del incidente</label>
								<input
									id="incident-title"
									type="text"
									placeholder="Ej: Fuga de agua en laboratorio"
									value={title}
									maxLength={60}
									onChange={(event) => {
										setTitle(event.target.value);
										setSubmitMessage(null);
										clearFieldError("title");
									}}
									aria-invalid={Boolean(errors.title)}
									aria-describedby={errors.title ? "incident-title-error" : "incident-title-hint"}
									className={errors.title ? "input-error" : ""}
								/>
								{!errors.title && (
									<p
										id="incident-title-hint"
										className="text-small text-secondary"
										style={{ color: title.trim().length >= 60 ? "var(--color-error)" : undefined }}
									>
										{title.trim().length}/20 caracteres
									</p>
								)}
								{errors.title ? (
									<p id="incident-title-error" className="field-error-text">
										{errors.title}
									</p>
								) : null}
							</div>

							<div className="field">
								<label htmlFor="incident-category">
									Categoria <span aria-hidden="true" className="field-required">*</span>
								</label>
								<select
									id="incident-category"
									value={category}
									disabled={isLoadingCategories}
									required
									aria-required="true"
									onChange={(event) => {
										setCategory(event.target.value);
										setSubmitMessage(null);
										clearFieldError("category");
									}}
									aria-invalid={Boolean(errors.category)}
									aria-describedby={errors.category ? "incident-category-error" : undefined}
									className={errors.category ? "input-error" : ""}
								>
									<option value="">
										{isLoadingCategories ? "Cargando categorias..." : "Selecciona una categoria"}
									</option>
									{categoryOptions.map((option) => (
										<option key={option.id || option.name} value={option.id}>
											{option.name}
										</option>
									))}
								</select>
								{categoriesLoadError ? <p className="text-small text-secondary">{categoriesLoadError}</p> : null}
								{errors.category ? (
									<p id="incident-category-error" className="field-error-text">
										{errors.category}
									</p>
								) : null}
							</div>

							<LocationField
								zone={locationZone}
								detail={locationDetail}
								onZoneChange={(value) => {
									setLocationZone(value);
									setSubmitMessage(null);
									clearFieldError("location");
								}}
								onDetailChange={(value) => {
									setLocationDetail(value);
									setSubmitMessage(null);
								}}
								onGpsChange={(coords) => setGpsCoords(coords)}
								error={errors.location}
							/>

							<div className="field">
								<label htmlFor="incident-description">
									Descripcion <span aria-hidden="true" className="field-required">*</span>
								</label>
								<textarea
									id="incident-description"
									placeholder="Describe brevemente lo ocurrido... (mínimo 10 caracteres)"
									value={description}
									required
									aria-required="true"
									minLength={10}
									maxLength={200}
									onChange={(event) => {
										setDescription(event.target.value);
										setSubmitMessage(null);
										clearFieldError("description");
									}}
									aria-invalid={Boolean(errors.description)}
									aria-describedby={
										errors.description
											? "incident-description-error"
											: "incident-description-hint"
									}
									className={errors.description ? "input-error" : ""}
								/>
								{!errors.description && (
									<p
										id="incident-description-hint"
										className="text-small text-secondary"
										style={{ color: description.trim().length >= 200 ? "var(--color-error)" : undefined }}
									>
										{description.trim().length}/200 caracteres
									</p>
								)}
								{errors.description ? (
									<p id="incident-description-error" className="field-error-text">
										{errors.description}
									</p>
								) : null}
							</div>

							<div className="field">
								<label htmlFor="incident-image">Subir imagen</label>
								<div className="input-wrap">
									<input
										id="incident-image-display"
										type="text"
										readOnly
										value={image ? image.name : "Seleccionar archivo o tomar foto"}
										onClick={handleOpenFilePicker}
										aria-invalid={Boolean(errors.image)}
										aria-describedby={errors.image ? "incident-image-error" : undefined}
										className={errors.image ? "input-error" : ""}
									/>
									<button
										type="button"
										className="input-icon-right"
										onClick={handleOpenCamera}
										aria-label="Tomar foto o seleccionar archivo"
										disabled={isStartingCamera}
									>
										<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
											<path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5A2.5 2.5 0 015.5 6h2.1a1 1 0 00.8-.4l.7-.9A1 1 0 019.9 4h4.2a1 1 0 01.8.4l.7.9a1 1 0 00.8.4h2.1A2.5 2.5 0 0121 8.5v8A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5v-8zM12 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
										</svg>
									</button>
								</div>
								<button type="button" className="btn-link" onClick={handleOpenFilePicker}>
									Subir archivo desde el dispositivo
								</button>
								{isStartingCamera ? <p className="text-small text-secondary">Abriendo camara...</p> : null}
								{cameraError ? <p className="field-error-text">{cameraError}</p> : null}
								{isCameraOpen ? (
									<div className="field" aria-live="polite">
										<video ref={videoRef} autoPlay playsInline muted />
										<canvas ref={canvasRef} hidden />
										<button type="button" className="btn-primary" onClick={handleTakePhoto}>
											Tomar foto
										</button>
										<button type="button" className="btn-secondary" onClick={handleCloseCamera}>
											Cerrar camara
										</button>
									</div>
								) : null}
								<input
									ref={imageInputRef}
									id="incident-image"
									type="file"
									accept="image/*"
									onChange={handleImageChange}
									hidden
								/>
								{imagePreviewUrl ? (
									<div style={{ marginTop: "0.75rem" }}>
										<Image
											src={imagePreviewUrl}
											alt="Vista previa de evidencia del incidente"
											fill
											style={{
												objectFit: "cover",
												borderRadius: "0.5rem",
												border: "1px solid var(--color-border)",
											}}
											unoptimized
										/>
									</div>
								) : null}
								{image ? <p className="text-small text-secondary">Archivo: {image.name}</p> : null}
								{errors.image ? (
									<p id="incident-image-error" className="field-error-text">
										{errors.image}
									</p>
								) : null}
							</div>

							<button type="button" className="btn-secondary" onClick={handleCancel}>
								Cancelar
							</button>
							<button type="submit" className="btn-primary" disabled={isSubmitting}>
								{isSubmitting ? "Enviando..." : "Enviar incidente"}
							</button>
						</form>
					</div>
				</div>

				<p className="page-footer">
					© {new Date().getFullYear()} Universidad San Buenaventura Cali · USB LENS
				</p>
			</div>
			<IncidentResponseModal
			open={modalOpen}
			message={modalMessage}
			isError={modalIsError}
			onClose={() => setModalOpen(false)}
			redirectOnClose={!modalIsError ? "/dashboard/estudiante" : undefined}
		/>
			
		</div>
	);
}
