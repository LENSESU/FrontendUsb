"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
	getDashboardPathByRole,
	normalizeRole,
	restoreAuthSession,
	type AuthData,
} from "@/utils/auth";

import IncidentResponseModal from "@/components/IncidentResponseModal";

type SuggestionErrors = {
	title?: string;
	content?: string;
	tags?: string;
	image?: string;
};

type CategoryOption = {
	id: string;
	name: string;
};

const API =
	process.env.NEXT_PUBLIC_API_URL ??
	"http://localhost:8080";

const CATEGORY_FALLBACK_OPTIONS: CategoryOption[] = [
	{ id: "1", name: "Infraestructura" },
	{ id: "2", name: "Tecnología" },
	{ id: "3", name: "Seguridad" },
	{ id: "4", name: "Servicios" },
	{ id: "5", name: "Bienestar" },
];

function parseCategoryOptions(
	payload: unknown,
): CategoryOption[] {
	let source: unknown[] = [];

	if (Array.isArray(payload)) {
		source = payload;
	} else if (
		payload &&
		typeof payload === "object"
	) {
		const p = payload as Record<
			string,
			unknown
		>;

		if (Array.isArray(p.items)) {
			source = p.items;
		} else if (
			Array.isArray(p.categories)
		) {
			source = p.categories;
		}
	}

	const options: CategoryOption[] = [];

	for (const item of source) {
		if (
			item &&
			typeof item === "object"
		) {
			const candidate =
				item as Record<
					string,
					unknown
				>;

			const id =
				typeof candidate.id ===
				"string"
					? candidate.id
					: "";

			const name =
				typeof candidate.name ===
				"string"
					? candidate.name.trim()
					: typeof candidate.label ===
							  "string"
						? candidate.label.trim()
						: "";

			if (name) {
				options.push({
					id,
					name,
				});
			}
		}
	}

	return options;
}

export default function CrearSugerenciaPage() {
	const router = useRouter();

	const imageInputRef =
		useRef<HTMLInputElement | null>(
			null,
		);

	const videoRef =
		useRef<HTMLVideoElement | null>(
			null,
		);

	const canvasRef =
		useRef<HTMLCanvasElement | null>(
			null,
		);

	const mediaStreamRef =
		useRef<MediaStream | null>(null);

	const [auth, setAuth] =
		useState<AuthData | null>(null);

	const [isLoading, setIsLoading] =
		useState(true);

	const [title, setTitle] =
		useState("");

	const [content, setContent] =
		useState("");

	const [selectedTags, setSelectedTags] =
		useState<string[]>([]);

	const [image, setImage] =
		useState<File | null>(null);

	const [
		imagePreviewUrl,
		setImagePreviewUrl,
	] = useState<string | null>(null);

	const [
		categoryOptions,
		setCategoryOptions,
	] = useState<CategoryOption[]>(
		CATEGORY_FALLBACK_OPTIONS,
	);

	const [
		isLoadingCategories,
		setIsLoadingCategories,
	] = useState(true);

	const [
		categoriesLoadError,
		setCategoriesLoadError,
	] = useState<string | null>(null);

	const [isSubmitting, setIsSubmitting] =
		useState(false);

	const [errors, setErrors] =
		useState<SuggestionErrors>({});

	const [modalOpen, setModalOpen] =
		useState(false);

	const [modalMessage, setModalMessage] =
		useState("");

	const [modalIsError, setModalIsError] =
		useState(false);

	const [isCameraOpen, setIsCameraOpen] =
		useState(false);

	const [
		isStartingCamera,
		setIsStartingCamera,
	] = useState(false);

	const [cameraError, setCameraError] =
		useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function loadSession() {
			const restoredAuth =
				await restoreAuthSession();

			if (!isMounted) return;

			if (!restoredAuth) {
				router.replace("/");
				return;
			}

			const normalizedRole =
				normalizeRole(
					restoredAuth.role,
				);

			if (!normalizedRole) {
				router.replace("/");
				return;
			}

			if (
				normalizedRole !==
				"student"
			) {
				router.replace(
					getDashboardPathByRole(
						restoredAuth.role,
					),
				);

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
		if (!auth?.accessToken) return;

		let isMounted = true;

		async function loadCategories() {
			setIsLoadingCategories(true);

			setCategoriesLoadError(null);

			try {
				const response =
					await fetch(
						`${API}/api/v1/categories/`,
						{
							method: "GET",
							headers: {
								Authorization: `Bearer ${auth!.accessToken}`,
							},
						},
					);

				if (!response.ok) {
					throw new Error(
						"No se pudieron cargar las categorías.",
					);
				}

				const data =
					(await response.json()) as unknown;

				const parsedOptions =
					parseCategoryOptions(data);

				if (!parsedOptions.length) {
					throw new Error(
						"No llegaron categorías válidas.",
					);
				}

				if (!isMounted) return;

				setCategoryOptions(
					parsedOptions,
				);
			} catch {
				if (!isMounted) return;

				setCategoryOptions(
					CATEGORY_FALLBACK_OPTIONS,
				);

				setCategoriesLoadError(
					"No fue posible cargar categorías desde backend.",
				);
			} finally {
				if (isMounted) {
					setIsLoadingCategories(
						false,
					);
				}
			}
		}

		void loadCategories();

		return () => {
			isMounted = false;
		};
	}, [auth]);

	useEffect(() => {
		if (!image) {
			setImagePreviewUrl(null);
			return;
		}

		const previewUrl =
			URL.createObjectURL(image);

		setImagePreviewUrl(previewUrl);

		return () =>
			URL.revokeObjectURL(previewUrl);
	}, [image]);

	useEffect(() => {
		return () => {
			handleCloseCamera();
		};
	}, []);

	function clearFieldError(
		field: keyof SuggestionErrors,
	) {
		setErrors((current) => {
			if (!current[field]) {
				return current;
			}

			return {
				...current,
				[field]: undefined,
			};
		});
	}

	function resetForm() {
		setTitle("");
		setContent("");
		setSelectedTags([]);
		setImage(null);
		setErrors({});
		setCameraError(null);

		handleCloseCamera();
	}

	function validateForm(): SuggestionErrors {
		const nextErrors: SuggestionErrors =
			{};

		const trimmedTitle =
			title.trim();

		const trimmedContent =
			content.trim();

		if (!trimmedTitle) {
			nextErrors.title =
				"El título es obligatorio.";
		} else if (
			trimmedTitle.length < 4
		) {
			nextErrors.title =
				"El título debe tener al menos 4 caracteres.";
		} else if (
			trimmedTitle.length > 200
		) {
			nextErrors.title =
				"El título no puede superar los 200 caracteres.";
		}

		if (!trimmedContent) {
			nextErrors.content =
				"La descripción es obligatoria.";
		} else if (
			trimmedContent.length < 10
		) {
			nextErrors.content =
				"La descripción debe tener al menos 10 caracteres.";
		}

		if (
			selectedTags.length === 0
		) {
			nextErrors.tags =
				"Selecciona al menos una categoría.";
		}

		if (image) {
			const allowedTypes = [
				"image/jpeg",
				"image/png",
			];

			const maxSize =
				5 * 1024 * 1024;

			if (
				!allowedTypes.includes(
					image.type,
				)
			) {
				nextErrors.image =
					"Solo se permiten imágenes JPEG o PNG.";
			} else if (
				image.size > maxSize
			) {
				nextErrors.image =
					"La imagen no puede superar los 5MB.";
			}
		}

		return nextErrors;
	}

	function handleImageChange(
		event: React.ChangeEvent<HTMLInputElement>,
	) {
		const selectedFile =
			event.target.files?.[0] ?? null;

		setImage(selectedFile);

		if (!selectedFile) {
			clearFieldError("image");
			return;
		}

		const allowedTypes = [
			"image/jpeg",
			"image/png",
		];

		const maxSize =
			5 * 1024 * 1024;

		if (
			!allowedTypes.includes(
				selectedFile.type,
			)
		) {
			setErrors((current) => ({
				...current,
				image:
					"Solo se permiten imágenes JPEG o PNG.",
			}));

			return;
		}

		if (selectedFile.size > maxSize) {
			setErrors((current) => ({
				...current,
				image:
					"La imagen no puede superar los 5MB.",
			}));

			return;
		}

		clearFieldError("image");
	}

	function handleOpenFilePicker() {
		handleCloseCamera();

		imageInputRef.current?.click();
	}

	async function handleOpenCamera() {
		if (
			!navigator.mediaDevices
				?.getUserMedia
		) {
			setCameraError(
				"Tu navegador no soporta acceso a la cámara.",
			);

			return;
		}

		setCameraError(null);
		setIsStartingCamera(true);

		try {
			handleCloseCamera();

			const stream =
				await navigator.mediaDevices.getUserMedia(
					{
						video: {
							facingMode: {
								ideal:
									"environment",
							},
							width: {
								ideal: 1280,
							},
							height: {
								ideal: 720,
							},
						},
						audio: false,
					},
				);

			mediaStreamRef.current =
				stream;

			setIsCameraOpen(true);

			setTimeout(async () => {
				if (videoRef.current) {
					videoRef.current.srcObject =
						stream;

					try {
						await videoRef.current.play();
					} catch {
						setCameraError(
							"No se pudo iniciar la cámara.",
						);
					}
				}
			}, 200);
		} catch {
			setCameraError(
				"No se pudo abrir la cámara. Verifica permisos.",
			);
		} finally {
			setIsStartingCamera(false);
		}
	}

	function handleCloseCamera() {
		if (mediaStreamRef.current) {
			mediaStreamRef.current
				.getTracks()
				.forEach((track) =>
					track.stop(),
				);

			mediaStreamRef.current = null;
		}

		if (videoRef.current) {
			videoRef.current.srcObject =
				null;
		}

		setIsCameraOpen(false);
	}

	function handleTakePhoto() {
		if (
			!videoRef.current ||
			!canvasRef.current
		) {
			setCameraError(
				"No se pudo capturar la foto.",
			);

			return;
		}

		const video =
			videoRef.current;

		const canvas =
			canvasRef.current;

		const width =
			video.videoWidth;

		const height =
			video.videoHeight;

		if (!width || !height) {
			setCameraError(
				"La cámara aún no está lista.",
			);

			return;
		}

		canvas.width = width;
		canvas.height = height;

		const ctx =
			canvas.getContext("2d");

		if (!ctx) {
			setCameraError(
				"No se pudo procesar la imagen.",
			);

			return;
		}

		ctx.drawImage(
			video,
			0,
			0,
			width,
			height,
		);

		canvas.toBlob(
			(blob) => {
				if (!blob) {
					setCameraError(
						"No se pudo generar la foto.",
					);

					return;
				}

				const file =
					new File(
						[blob],
						`foto-${Date.now()}.jpg`,
						{
							type: "image/jpeg",
						},
					);

				setImage(file);

				clearFieldError(
					"image",
				);

				handleCloseCamera();
			},
			"image/jpeg",
			0.95,
		);
	}

	function toggleTag(tag: string) {
		setSelectedTags((current) => {
			if (
				current.includes(tag)
			) {
				return current.filter(
					(t) => t !== tag,
				);
			}

			return [
				...current,
				tag,
			];
		});

		clearFieldError("tags");
	}

	async function handleSubmit(
		event: React.FormEvent<HTMLFormElement>,
	) {
		event.preventDefault();

		const validationErrors =
			validateForm();

		if (
			Object.values(
				validationErrors,
			).some(Boolean)
		) {
			setErrors(
				validationErrors,
			);

			return;
		}

		if (!auth?.accessToken) {
			setModalIsError(true);

			setModalMessage(
				"Debes iniciar sesión.",
			);

			setModalOpen(true);

			return;
		}

		setErrors({});
		setIsSubmitting(true);

		try {
			const formData =
				new FormData();

			formData.append(
				"titulo",
				title.trim(),
			);

			formData.append(
				"contenido",
				content.trim(),
			);

			formData.append(
				"etiquetas",
				selectedTags.join(","),
			);

			if (image) {
				formData.append(
					"photo",
					image,
					image.name,
				);
			}

			const response =
				await fetch(
					`${API}/api/v1/suggestions/`,
					{
						method: "POST",
						headers: {
                            Accept: "application/json",
							Authorization: `Bearer ${auth.accessToken}`,
						},
						body: formData,
					},
				);

			let data: any = null;

			try {
				data =
					await response.json();
			} catch {
				data = null;
			}

			if (!response.ok) {
				console.log(
					"ERROR BACKEND:",
					data,
				);

				const detail =
					typeof data?.detail ===
					"string"
						? data.detail
						: typeof data?.detail
								  ?.message ===
							  "string"
							? data.detail
									.message
							: typeof data?.message ===
								  "string"
								? data.message
								: "No se pudo crear la sugerencia.";

				setModalIsError(true);

				setModalMessage(
					detail,
				);

				setModalOpen(true);

				return;
			}

			console.log(
				"SUGERENCIA CREADA:",
				data,
			);

			setModalIsError(false);

			setModalMessage(
				"Sugerencia publicada correctamente.",
			);

			setModalOpen(true);

			resetForm();
		} catch (error) {
			console.error(error);

			setModalIsError(true);

			setModalMessage(
				"Error de conexión. Intenta nuevamente.",
			);

			setModalOpen(true);
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isLoading) {
		return null;
	}

	return (
		<div className="page-centered">
			<div className="form-wrapper">
				<div className="card">
					<div className="card-stripe" />

					<div className="card-body-center">
						<h1 className="card-form-title">
							Publicar sugerencia
						</h1>

						{auth?.email ? (
							<p className="otp-hint">
								Publicando como{" "}
								<strong>
									{auth.email}
								</strong>
							</p>
						) : null}

						<form
							onSubmit={
								handleSubmit
							}
							noValidate
						>
							<div className="field">
								<label htmlFor="suggestion-title">
									Título
								</label>

								<input
									id="suggestion-title"
									type="text"
									placeholder="Ej: Nuevos espacios de estudio"
									value={title}
									maxLength={200}
									onChange={(
										event,
									) => {
										setTitle(
											event.target
												.value,
										);

										clearFieldError(
											"title",
										);
									}}
									className={
										errors.title
											? "input-error"
											: ""
									}
								/>

								{errors.title ? (
									<p className="field-error-text">
										{
											errors.title
										}
									</p>
								) : null}
							</div>

							<div className="field">
								<label htmlFor="suggestion-content">
									Contenido
								</label>

								<textarea
									id="suggestion-content"
									placeholder="Describe tu propuesta de mejora..."
									value={content}
									maxLength={1000}
									onChange={(
										event,
									) => {
										setContent(
											event.target
												.value,
										);

										clearFieldError(
											"content",
										);
									}}
									className={
										errors.content
											? "input-error"
											: ""
									}
								/>

								{errors.content ? (
									<p className="field-error-text">
										{
											errors.content
										}
									</p>
								) : null}
							</div>

							<div className="field">
								<label>
									Categorías
								</label>

								{isLoadingCategories ? (
									<p className="text-small text-secondary">
										Cargando categorías...
									</p>
								) : (
									<div
										style={{
											display:
												"flex",
											flexWrap:
												"wrap",
											gap: "0.5rem",
											marginTop:
												"0.75rem",
										}}
									>
										{categoryOptions.map(
											(
												option,
											) => {
												const selected =
													selectedTags.includes(
														option.name,
													);

												return (
													<button
														key={
															option.id ||
															option.name
														}
														type="button"
														onClick={() =>
															toggleTag(
																option.name,
															)
														}
														className={
															selected
																? "badge badge-success"
																: "badge"
														}
													>
														{
															option.name
														}
													</button>
												);
											},
										)}
									</div>
								)}

								{categoriesLoadError ? (
									<p className="text-small text-secondary">
										{
											categoriesLoadError
										}
									</p>
								) : null}

								{errors.tags ? (
									<p className="field-error-text">
										{
											errors.tags
										}
									</p>
								) : null}
							</div>

							<div className="field">
								<label>
									Foto de apoyo
									(opcional)
								</label>

								<div
									style={{
										display: "flex",
										gap: "1rem",
										marginTop: "1rem",
										flexWrap: "wrap",
										alignItems: "center",
									}}
								>
									<button
										type="button"
										className="btn-secondary"
										onClick={
											handleOpenFilePicker
										}
									>
										📁 Subir
										archivo
									</button>

									<button
										type="button"
										className="btn-primary"
										onClick={
											handleOpenCamera
										}
										disabled={
											isStartingCamera
										}
									>
										📷{" "}
										{isStartingCamera
											? "Abriendo..."
											: "Tomar foto"}
									</button>
								</div>

								<input
									ref={
										imageInputRef
									}
									type="file"
									accept="image/png,image/jpeg"
									onChange={
										handleImageChange
									}
									hidden
								/>

								{cameraError ? (
									<p className="field-error-text">
										{
											cameraError
										}
									</p>
								) : null}

								{isCameraOpen ? (
									<div
										style={{
											marginTop:
												"1rem",
										}}
									>
										<video
											ref={
												videoRef
											}
											autoPlay
											playsInline
											muted
											style={{
												width:
													"100%",
												borderRadius:
													"0.75rem",
												background:
													"#000",
											}}
										/>

										<canvas
											ref={
												canvasRef
											}
											hidden
										/>

										<div
											style={{
												display:
													"flex",
												gap: "0.75rem",
												marginTop:
													"0.75rem",
											}}
										>
											<button
												type="button"
												className="btn-primary"
												onClick={
													handleTakePhoto
												}
											>
												Capturar
											</button>

											<button
												type="button"
												className="btn-secondary"
												onClick={
													handleCloseCamera
												}
											>
												Cancelar
											</button>
										</div>
									</div>
								) : null}

								{imagePreviewUrl ? (
									<div
										style={{
											marginTop:
												"1rem",
											position:
												"relative",
											width:
												"100%",
											aspectRatio:
												"4 / 3",
											borderRadius:
												"0.75rem",
											overflow:
												"hidden",
											border:
												"1px solid var(--color-border)",
										}}
									>
										<Image
											src={
												imagePreviewUrl
											}
											alt="Vista previa"
											fill
											style={{
												objectFit:
													"cover",
											}}
											unoptimized
										/>
									</div>
								) : null}

								{image ? (
									<p className="text-small text-secondary">
										Archivo: {image.name}
									</p>
								) : null}

								{errors.image ? (
									<p className="field-error-text">
										{
											errors.image
										}
									</p>
								) : null}
							</div>

							<div
								style={{
									display:
										"flex",
									gap: "0.75rem",
									marginTop:
										"1rem",
								}}
							>
								<button
									type="button"
									className="btn-secondary"
									onClick={
										resetForm
									}
								>
									Limpiar
								</button>

								<button
									type="submit"
									className="btn-primary"
									disabled={
										isSubmitting
									}
								>
									{isSubmitting
										? "Publicando..."
										: "Publicar sugerencia"}
								</button>
							</div>
						</form>
					</div>
				</div>

				<p className="page-footer">
					©{" "}
					{new Date().getFullYear()}{" "}
					Universidad San
					Buenaventura Cali ·
					USB LENS
				</p>
			</div>

			<IncidentResponseModal
				open={modalOpen}
				message={modalMessage}
				isError={modalIsError}
				onClose={() =>
					setModalOpen(false)
				}
			/>
		</div>
	);
}












