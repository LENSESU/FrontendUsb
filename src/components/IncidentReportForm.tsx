'use client';

import { useState } from 'react';
import PhotoEvidenceUploader, { PhotoData } from './PhotoEvidenceUploader';

interface IncidentFormData {
  title: string;
  description: string;
  location: string;
  photo: PhotoData | null;
}

export default function IncidentReportForm() {
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    description: '',
    location: '',
    photo: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoSubmit = (photoData: PhotoData) => {
    setFormData((prev) => ({
      ...prev,
      photo: photoData,
    }));
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccess(false);

    // Validaciones
    if (!formData.title.trim()) {
      setErrorMessage('El título es obligatorio');
      return;
    }

    if (!formData.description.trim()) {
      setErrorMessage('La descripción es obligatoria');
      return;
    }

    if (!formData.location.trim()) {
      setErrorMessage('La ubicación es obligatoria');
      return;
    }

    if (!formData.photo) {
      setErrorMessage('La fotografía de evidencia es obligatoria');
      return;
    }

    setSubmitting(true);

    try {
      // Preparar datos para enviar al backend
      const payload = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        evidence: {
          fileName: formData.photo.fileName,
          fileType: formData.photo.fileType,
          fileSize: formData.photo.fileSize,
          base64: formData.photo.base64, // Imagen codificada en Base64
          // O si prefieres enviar el archivo directamente:
          // file: formData.photo.file (requiere FormData)
        },
        timestamp: new Date().toISOString(),
      };

      console.log('Datos a enviar al backend:', payload);

      // Ejemplo de cómo sería la petición al backend:
      // const response = await fetch('/api/incidents/report', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(payload),
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Error al enviar el reporte');
      // }
      //
      // const result = await response.json();
      // console.log('Respuesta del backend:', result);

      // Simular envío exitoso
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        location: '',
        photo: null,
      });

      // Limpiar mensaje de éxito después de 5 segundos
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Error al enviar el reporte. Intenta nuevamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Reporte de Incidencia
        </h1>
        <p className="text-gray-600">
          Completa el formulario con los detalles del incidente e incluye
          fotografía como evidencia.
        </p>
      </div>

      {/* Mensaje de éxito */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
          <svg
            className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-green-900">¡Reporte enviado!</h3>
            <p className="text-sm text-green-700 mt-1">
              Tu incidencia ha sido registrada correctamente.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campos de texto */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Información del Incidente
          </h2>

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Título del Incidente *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Ej: Daño en la puerta principal"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Ubicación *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Ej: Piso 3, Oficina 301"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Descripción Detallada *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe el incidente con el mayor detalle posible..."
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>
        </div>

        {/* Cargador de fotos */}
        <PhotoEvidenceUploader
          onPhotoSubmit={handlePhotoSubmit}
          maxFileSize={5}
          acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
        />

        {/* Mensaje de error general */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Botón de envío */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() =>
              setFormData({
                title: '',
                description: '',
                location: '',
                photo: null,
              })
            }
            className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`
              px-6 py-2 text-white font-medium rounded-lg transition
              ${
                submitting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {submitting ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </div>
      </form>

      {/* Información útil */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Recomendaciones:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Toma fotografías con buena iluminación</li>
          <li>✓ Asegúrate de que la evidencia sea clara y visible</li>
          <li>✓ Incluye múltiples ángulos si es posible</li>
          <li>✓ El archivo debe ser menor a 5MB</li>
        </ul>
      </div>
    </div>
  );
}
