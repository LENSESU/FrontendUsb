'use client';

import { useState, useRef } from 'react';

interface PhotoEvidenceUploaderProps {
  onPhotoSubmit?: (photoData: PhotoData) => void;
  maxFileSize?: number; // en MB
  acceptedFormats?: string[];
}

export interface PhotoData {
  file: File;
  preview: string; // URL para preview
  base64: string; // Base64 para enviar al backend
  fileName: string;
  fileSize: number;
  fileType: string;
}

export default function PhotoEvidenceUploader({
  onPhotoSubmit,
  maxFileSize = 5, // 5 MB por defecto
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
}: PhotoEvidenceUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File | null) => {
    setError('');
    
    if (!file) return;

    // Validar tipo de archivo
    if (!acceptedFormats.includes(file.type)) {
      setError(`Formato no válido. Acepta: ${acceptedFormats.map(f => f.split('/')[1]).join(', ').toUpperCase()}`);
      return;
    }

    // Validar tamaño
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      setError(`El archivo no debe superar ${maxFileSize}MB. Tu archivo: ${fileSizeMB.toFixed(2)}MB`);
      return;
    }

    setLoading(true);
    setFileName(file.name);
    setFileSize(file.size);

    try {
      // Crear preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Convertir a Base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setLoading(false);

        // Si hay callback, enviar los datos
        if (onPhotoSubmit) {
          onPhotoSubmit({
            file,
            preview: previewUrl,
            base64: base64String,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error al procesar la imagen');
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setFileName('');
    setFileSize(0);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Cargar Evidencia Fotográfica
      </h2>

      {/* Area de carga */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed border-gray-300 rounded-lg p-8 text-center
          transition-all duration-200 cursor-pointer
          hover:border-blue-400 hover:bg-blue-50
          ${preview ? 'border-green-300 bg-green-50' : ''}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleInputChange}
          className="hidden"
          aria-label="Seleccionar imagen"
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-600">Procesando imagen...</p>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="text-green-600 font-semibold">✓ Imagen cargada</div>
            <p className="text-gray-600 text-sm">{fileName}</p>
            <p className="text-gray-500 text-xs">{formatFileSize(fileSize)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <svg
              className="w-12 h-12 mx-auto text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <p className="text-gray-700 font-semibold">
              Arrastra una imagen aquí o haz clic
            </p>
            <p className="text-gray-500 text-sm">
              Formatos: JPEG, PNG, WebP | Máx: {maxFileSize}MB
            </p>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="mt-6 space-y-4">
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={preview}
              alt="Preview de la imagen"
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Detalles del archivo:
            </h3>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Archivo:</dt>
                <dd className="text-gray-900 font-medium">{fileName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Tamaño:</dt>
                <dd className="text-gray-900 font-medium">
                  {formatFileSize(fileSize)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Mensajes de error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
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
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Botones de acción */}
      {preview && (
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
          >
            Limpiar
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
          >
            Cambiar imagen
          </button>
        </div>
      )}
    </div>
  );
}
