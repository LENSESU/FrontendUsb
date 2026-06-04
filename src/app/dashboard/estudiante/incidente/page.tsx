"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getDashboardPathByRole,
  normalizeRole,
  restoreAuthSession,
  type AuthData,
} from "@/utils/auth";
import LocationField from "@/components/LocationField";
import IncidentResponseModal from "@/components/IncidentResponseModal";
import { useOnboarding } from "@/utils/onBoardingEstudiante";
import OnboardingTour from "@/components/OnBoardingTourEstudiante";

type GpsCoordinates = { latitude: number; longitude: number } | null;

type IncidentErrors = {
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

  // Campos del formulario
  const [category, setCategory] = useState("");
  const [locationZone, setLocationZone] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [gpsCoords, setGpsCoords] = useState<GpsCoordinates>(null);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Estado de categorías
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(
    CATEGORY_FALLBACK_OPTIONS
  );
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesLoadError, setCategoriesLoadError] = useState<string | null>(
    null
  );

  // Estado de envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<IncidentErrors>({});

  // Cámara
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Modal de respuesta
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalIsError, setModalIsError] = useState(false);

  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding("onboarding_incident_form");

  const INCIDENT_STEPS = [
    { targetId: "incident-category", title: "Categoría", description: "Selecciona el tipo de problema: infraestructura, seguridad, tecnología, servicios u otro." },
    { targetId: "incident-description", title: "Descripción", description: "Explica brevemente qué ocurrió. Mínimo 10 caracteres — más detalle significa una solución más rápida." },
    { targetId: "onboarding-location", title: "Ubicación", description: "Indica la zona del campus donde ocurrió el problema. Puedes añadir detalles específicos o usar el GPS." },
    { targetId: "onboarding-image", title: "Evidencia", description: "Adjunta una foto del problema si tienes una. Puedes subirla desde tu dispositivo o tomarla con la cámara." },
    { targetId: "onboarding-submit", title: "¡Enviar!", description: "Cuando hayas completado los campos, pulsa aquí para registrar tu reporte. ¡Gracias por contribuir!" },
  ];

  // ── Sesión ──
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const restoredAuth = await restoreAuthSession();
      if (!isMounted) return;

      if (!restoredAuth) {
        router.replace("/");
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
    return () => { isMounted = false; };
  }, [router]);

  // ── Categorías ──
  useEffect(() => {
    if (!auth?.accessToken) return;

    let isMounted = true;

    async function loadCategories() {
      setIsLoadingCategories(true);
      setCategoriesLoadError(null);

      try {
        const response = await fetch(`${API}/api/v1/categories/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth!.accessToken}`,
          },
        });

        if (!response.ok) throw new Error("No se pudo obtener categorias.");

        const data = (await response.json()) as unknown;
        const parsedOptions = parseCategoryOptions(data);

        if (!parsedOptions.length)
          throw new Error("No llegaron categorias validas.");

        if (!isMounted) return;
        setCategoryOptions(parsedOptions);
        setCategoriesLoadError(null);
      } catch {
        if (!isMounted) return;
        setCategoryOptions(CATEGORY_FALLBACK_OPTIONS);
        setCategoriesLoadError(
          "No fue posible cargar categorias desde el servidor."
        );
      } finally {
        if (isMounted) setIsLoadingCategories(false);
      }
    }

    void loadCategories();
    return () => { isMounted = false; };
  }, [auth]);

  // ── Limpieza de stream de cámara al desmontar ──
  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Preview de imagen ──
  useEffect(() => {
    if (!image) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  // ── Video listo ──
  useEffect(() => {
    if (!isCameraOpen || !videoRef.current || !mediaStreamRef.current) return;
    const video = videoRef.current;
    setIsCameraReady(false);
    video.srcObject = mediaStreamRef.current;

    function onCanPlay() { setIsCameraReady(true); }
    video.addEventListener("canplay", onCanPlay);
    void video.play().catch(() =>
      setCameraError("No se pudo iniciar la reproducción del video.")
    );
    return () => video.removeEventListener("canplay", onCanPlay);
  }, [isCameraOpen]);

  // ── Helpers ──
  function clearFieldError(field: keyof IncidentErrors) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  }

  function resetForm() {
    setCategory("");
    setLocationZone("");
    setLocationDetail("");
    setGpsCoords(null);
    setDescription("");
    setImage(null);
    setErrors({});
  }

  function validateForm(): IncidentErrors {
    const next: IncidentErrors = {};
    const trimDesc = description.trim();

    if (!category) next.category = "Selecciona una categoria.";

    if (!locationZone) next.location = "Selecciona una zona del campus.";

    if (!trimDesc) {
      next.description = "La descripcion es obligatoria.";
    } else if (trimDesc.length < 10) {
      next.description = "La descripcion debe tener al menos 10 caracteres.";
    } else if (trimDesc.length > 200) {
      next.description = "La descripcion no puede superar los 200 caracteres.";
    }

    if (image) {
      const allowed = ["image/jpeg", "image/png"];
      const maxSize = 5 * 1024 * 1024;
      if (!allowed.includes(image.type))
        next.image = "Solo se permiten imagenes JPEG o PNG.";
      else if (image.size > maxSize)
        next.image = "La imagen no puede superar los 5 MB.";
    }

    return next;
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImage(file);

    if (!file) {
      clearFieldError("image");
      return;
    }

    const allowed = ["image/jpeg", "image/png"];
    const maxSize = 5 * 1024 * 1024;

    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: "Solo se permiten imagenes JPEG o PNG.",
      }));
    } else if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        image: "La imagen no puede superar los 5 MB.",
      }));
    } else {
      clearFieldError("image");
    }
  }

  async function handleOpenCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Tu navegador no soporta acceso a la camara.");
      return;
    }

    setCameraError(null);
    setIsStartingCamera(true);

    try {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      setCameraError(
        "No se pudo abrir la camara. Verifica permisos del navegador."
      );
    } finally {
      setIsStartingCamera(false);
    }
  }

  function handleCloseCamera() {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    setIsCameraOpen(false);
    setIsCameraReady(false);
  }

  function handleTakePhoto() {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError("No se pudo capturar la foto.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("No se pudo procesar la imagen capturada.");
      return;
    }

    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("No se pudo generar la foto capturada.");
          return;
        }
        const file = new File([blob], `incidente-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setImage(file);
        clearFieldError("image");
        handleCloseCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }

    if (!auth?.accessToken) {
      setModalIsError(true);
      setModalMessage("Debes iniciar sesion para enviar un incidente.");
      setModalOpen(true);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const fullDescription = locationDetail.trim()
      ? `${description.trim()}\n\nUbicación específica: ${locationDetail.trim()}`
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
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
            ? (data.detail as Array<{ msg?: string }>)
                .map((err) => err.msg)
                .join(", ")
            : "No se pudo guardar el incidente.";
        setModalIsError(true);
        setModalMessage(detail);
        setModalOpen(true);
        return;
      }

      const incidentId: string = data?.id ?? data?.incident_id ?? "N/A";

      if (image && incidentId !== "N/A") {
        const formData = new FormData();
        formData.append("photo", image);

        const evidenceRes = await fetch(
          `${API}/api/v1/incidents/${incidentId}/evidence`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${auth.accessToken}` },
            body: formData,
          }
        );

        if (!evidenceRes.ok) {
          setModalIsError(false);
          setModalMessage(
            `Incidente creado (Ticket #${incidentId}), pero no se pudo adjuntar la imagen.`
          );
          setModalOpen(true);
          resetForm();
          return;
        }
      }

      setModalIsError(false);
      setModalMessage(`Incidente reportado con exito. Ticket #${incidentId}`);
      setModalOpen(true);
      resetForm();
    } catch {
      setModalIsError(true);
      setModalMessage(
        "Error de conexion. Verifica tu red e intenta de nuevo."
      );
      setModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return null;

  return (
    <>
      {showOnboarding && (
        <OnboardingTour steps={INCIDENT_STEPS} onDismiss={dismissOnboarding} />
      )}
      <style>{`
        @media (min-width: 768px) {
          .incident-form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0 32px;
            align-items: start;
          }
          .incident-form-full {
            grid-column: 1 / -1;
          }
        }
      `}</style>

      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "24px 16px 48px",
          width: "100%",
        }}
      >
        <div className="card">
          <div className="card-stripe" />
          <div className="card-body-center" style={{ maxWidth: "100%" }}>

            {/* Encabezado */}
            <div style={{ marginBottom: 24 }}>
              <h1 className="card-form-title" style={{ marginBottom: 4 }}>
                Crear incidente
              </h1>
              {auth?.email && (
                <p className="otp-hint">
                  Reportando como <strong>{auth.email}</strong>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="incident-form-grid">

                {/* ── Categoría ── */}
                <div className="field">
                  <label htmlFor="incident-category">
                    Categoria{" "}
                    <span aria-hidden="true" className="field-required">
                      *
                    </span>
                  </label>
                  <select
                    id="incident-category"
                    value={category}
                    disabled={isLoadingCategories}
                    required
                    aria-required="true"
                    onChange={(e) => {
                      setCategory(e.target.value);
                      clearFieldError("category");
                    }}
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={
                      errors.category ? "incident-category-error" : undefined
                    }
                    className={errors.category ? "input-error" : ""}
                  >
                    <option value="">
                      {isLoadingCategories
                        ? "Cargando categorias..."
                        : "Selecciona una categoria"}
                    </option>
                    {categoryOptions.map((option) => (
                      <option
                        key={option.id || option.name}
                        value={option.id}
                      >
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {categoriesLoadError && (
                    <p className="text-small text-secondary">
                      {categoriesLoadError}
                    </p>
                  )}
                  {errors.category && (
                    <p
                      id="incident-category-error"
                      className="field-error-text"
                    >
                      {errors.category}
                    </p>
                  )}
                </div>

                {/* ── Descripción ── */}
                <div className="field">
                  <label htmlFor="incident-description">
                    Descripcion{" "}
                    <span aria-hidden="true" className="field-required">
                      *
                    </span>
                  </label>
                  <textarea
                    id="incident-description"
                    placeholder="Describe brevemente lo ocurrido... (mínimo 10 caracteres)"
                    value={description}
                    required
                    aria-required="true"
                    minLength={10}
                    maxLength={200}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      clearFieldError("description");
                    }}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description
                        ? "incident-description-error"
                        : "incident-description-hint"
                    }
                    className={errors.description ? "input-error" : ""}
                    style={{ minHeight: 100, resize: "vertical" }}
                  />
                  {!errors.description && (
                    <p
                      id="incident-description-hint"
                      className="text-small text-secondary"
                      style={{
                        color:
                          description.trim().length >= 200
                            ? "var(--color-error)"
                            : undefined,
                      }}
                    >
                      {description.trim().length}/200 caracteres
                    </p>
                  )}
                  {errors.description && (
                    <p
                      id="incident-description-error"
                      className="field-error-text"
                    >
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* ── Ubicación — ocupa ancho completo ── */}
                <div id="onboarding-location" className="incident-form-full">
                  <LocationField
                    zone={locationZone}
                    detail={locationDetail}
                    onZoneChange={(v) => {
                      setLocationZone(v);
                      clearFieldError("location");
                    }}
                    onDetailChange={(v) => setLocationDetail(v)}
                    onGpsChange={(coords) => setGpsCoords(coords)}
                    error={errors.location}
                  />
                </div>

                {/* ── Imagen — ocupa ancho completo ── */}
                <div id="onboarding-image" className="field incident-form-full">
                  <label htmlFor="incident-image">
                    Imagen de evidencia{" "}
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-hint)",
                        fontWeight: 400,
                      }}
                    >
                      (opcional)
                    </span>
                  </label>

                  {/* Selector de archivo + botón cámara */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                    }}
                  >
                    <div className="input-wrap">
                      <input
                        id="incident-image-display"
                        type="text"
                        readOnly
                        value={
                          image
                            ? image.name
                            : "Seleccionar archivo o tomar foto"
                        }
                        onClick={() => imageInputRef.current?.click()}
                        aria-invalid={Boolean(errors.image)}
                        aria-describedby={
                          errors.image ? "incident-image-error" : undefined
                        }
                        className={errors.image ? "input-error" : ""}
                        style={{ cursor: "pointer" }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenCamera}
                      disabled={isStartingCamera}
                      aria-label="Abrir cámara"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 16px",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--color-bg-muted)",
                        color: "var(--color-text-secondary)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        cursor: isStartingCamera ? "wait" : "pointer",
                        whiteSpace: "nowrap",
                        opacity: isStartingCamera ? 0.6 : 1,
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 8.5A2.5 2.5 0 015.5 6h2.1a1 1 0 00.8-.4l.7-.9A1 1 0 019.9 4h4.2a1 1 0 01.8.4l.7.9a1 1 0 00.8.4h2.1A2.5 2.5 0 0121 8.5v8A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5v-8zM12 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                        />
                      </svg>
                      {isStartingCamera ? "Abriendo..." : "Camara"}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => imageInputRef.current?.click()}
                    style={{ marginTop: 4 }}
                  >
                    Subir archivo desde el dispositivo
                  </button>

                  {/* Input file oculto */}
                  <input
                    ref={imageInputRef}
                    id="incident-image"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageChange}
                    hidden
                  />
                  <canvas ref={canvasRef} hidden />

                  {/* Vista de cámara activa */}
                  {isCameraOpen && (
                    <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          position: "relative",
                          borderRadius: "var(--radius-sm)",
                          overflow: "hidden",
                          border: "2px solid var(--color-primary)",
                          background: "#000",
                          minHeight: 120,
                        }}
                      >
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{
                            width: "100%",
                            height: "auto",
                            maxHeight: 320,
                            display: "block",
                          }}
                        />
                        {!isCameraReady && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              background: "rgba(0,0,0,0.7)",
                            }}
                          >
                            <span
                              className="spinner"
                              style={{
                                borderColor: "rgba(255,255,255,0.3)",
                                borderTopColor: "#fff",
                                width: 20,
                                height: 20,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 11,
                                color: "#fff",
                                fontWeight: 500,
                              }}
                            >
                              Iniciando cámara...
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={!isCameraReady}
                          onClick={handleTakePhoto}
                          style={{
                            opacity: isCameraReady ? 1 : 0.5,
                            cursor: isCameraReady ? "pointer" : "not-allowed",
                          }}
                        >
                          Tomar foto
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={handleCloseCamera}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <p
                      className="field-error-text"
                      style={{ marginTop: 4 }}
                    >
                      {cameraError}
                    </p>
                  )}

                  {/* Preview de imagen sin forzar aspect ratio */}
                  {imagePreviewUrl && (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                        border: "1px solid var(--color-border-light)",
                        background: "var(--color-bg-muted)",
                        // Sin aspectRatio fijo: la imagen dicta su alto
                        // para no recortar fotos 9:16 ni 16:9
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreviewUrl}
                        alt="Vista previa de evidencia del incidente"
                        style={{
                          width: "100%",
                          height: "auto",
                          // maxHeight limita fotos muy altas en desktop
                          // sin recortar: el usuario puede ver siempre
                          // la imagen completa
                          maxHeight: 400,
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </div>
                  )}

                  {image && (
                    <p
                      className="text-small text-secondary"
                      style={{ marginTop: 4 }}
                    >
                      {image.name} &middot;{" "}
                      {(image.size / 1024).toFixed(0)} KB
                    </p>
                  )}

                  {errors.image && (
                    <p
                      id="incident-image-error"
                      className="field-error-text"
                    >
                      {errors.image}
                    </p>
                  )}
                </div>

                {/* ── Botones de acción — ancho completo ── */}
                <div
                  className="incident-form-full"
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      resetForm();
                      handleCloseCamera();
                    }}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    id="onboarding-submit"
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Enviando..." : "Enviar incidente"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <p className="page-footer">
          &copy; {new Date().getFullYear()} Universidad San Buenaventura Cali
          &middot; USB LENS
        </p>
      </div>

      <IncidentResponseModal
        open={modalOpen}
        message={modalMessage}
        isError={modalIsError}
        onClose={() => setModalOpen(false)}
        redirectOnClose={
          !modalIsError ? "/dashboard/estudiante" : undefined
        }
      />
    </>
  );
}