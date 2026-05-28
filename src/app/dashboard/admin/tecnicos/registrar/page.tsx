"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAuthSession } from "@/utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.first_name.trim()) errors.first_name = "El nombre es requerido.";
  if (!form.last_name.trim()) errors.last_name = "El apellido es requerido.";
  if (!form.email.trim()) {
    errors.email = "El correo es requerido.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Ingresa un correo valido.";
  }
  if (!form.password) {
    errors.password = "La contrasena es requerida.";
  } else if (form.password.length < 8) {
    errors.password = "Debe tener al menos 8 caracteres.";
  }
  if (!form.confirm_password) {
    errors.confirm_password = "Confirma la contrasena.";
  } else if (form.password !== form.confirm_password) {
    errors.confirm_password = "Las contrasenas no coinciden.";
  }
  return errors;
}

export default function RegisterTechnicianPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (apiError) setApiError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const session = await restoreAuthSession();
      if (!session?.accessToken) throw new Error("Sesion no encontrada.");

      const res = await fetch(`${API}/api/v1/technicians`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          (typeof body?.detail === "string" && body.detail) ||
          body?.detail?.message ||
          "No se pudo registrar el tecnico.";
        throw new Error(msg);
      }

      setSuccess(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="card">
          <div className="card-stripe" />
          <div className="card-body-center">
            <div className="success-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="card-form-title" style={{ marginBottom: "8px" }}>Tecnico registrado</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              <strong>{form.first_name} {form.last_name}</strong> fue registrado correctamente en el sistema.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => router.push("/dashboard/admin/tecnicos")}
              >
                Ver lista de tecnicos
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setForm({ first_name: "", last_name: "", email: "", password: "", confirm_password: "" });
                  setSuccess(false);
                  setFieldErrors({});
                }}
              >
                Registrar otro tecnico
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
      {/* Back */}
      <button
        type="button"
        className="btn-back mb-4"
        onClick={() => router.push("/dashboard/admin/tecnicos")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a tecnicos
      </button>

      <div className="card">
        <div className="card-stripe" />
        <div className="card-body">
          <h1 className="card-form-title">Registrar nuevo tecnico</h1>

          {apiError && (
            <div className="alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Nombre y Apellido lado a lado en sm+ */}
            <div className="flex flex-col gap-0 sm:flex-row sm:gap-3">
              <div className="field flex-1">
                <label htmlFor="first_name">Nombre</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Juan"
                  value={form.first_name}
                  onChange={handleChange}
                  className={fieldErrors.first_name ? "input-error" : ""}
                  disabled={submitting}
                />
                {fieldErrors.first_name && (
                  <p className="field-error-text">{fieldErrors.first_name}</p>
                )}
              </div>

              <div className="field flex-1">
                <label htmlFor="last_name">Apellido</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Perez"
                  value={form.last_name}
                  onChange={handleChange}
                  className={fieldErrors.last_name ? "input-error" : ""}
                  disabled={submitting}
                />
                {fieldErrors.last_name && (
                  <p className="field-error-text">{fieldErrors.last_name}</p>
                )}
              </div>
            </div>

            <div className="field">
              <label htmlFor="email">Correo electronico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tecnico@correo.usbcali.edu.co"
                value={form.email}
                onChange={handleChange}
                className={fieldErrors.email ? "input-error" : ""}
                disabled={submitting}
              />
              {fieldErrors.email && (
                <p className="field-error-text">{fieldErrors.email}</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="password">Contrasena</label>
              <div className="input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Minimo 8 caracteres"
                  value={form.password}
                  onChange={handleChange}
                  className={fieldErrors.password ? "input-error" : ""}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="field-error-text">{fieldErrors.password}</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="confirm_password">Confirmar contrasena</label>
              <div className="input-wrap">
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repite la contrasena"
                  value={form.confirm_password}
                  onChange={handleChange}
                  className={fieldErrors.confirm_password ? "input-error" : ""}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Ocultar confirmacion" : "Mostrar confirmacion"}
                >
                  {showConfirm ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirm_password && (
                <p className="field-error-text">{fieldErrors.confirm_password}</p>
              )}
            </div>

            <div style={{ marginTop: "var(--space-lg)" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Registrando...
                  </>
                ) : (
                  "Registrar tecnico"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}