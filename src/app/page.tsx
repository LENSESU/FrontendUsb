import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Proyecto USB - Frontend
        </h1>
        <p className="text-gray-600 mb-8">
          Aplicación Next.js para gestión de incidencias
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-2xl">
          {/* Card: Reportar Incidencia */}
          <Link href="/incident-report">
            <div className="p-8 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-blue-600">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Reportar Incidencia
              </h2>
              <p className="text-gray-600 text-sm">
                Adjunta fotos y detalles de un incidente nuevo
              </p>
            </div>
          </Link>

          {/* Card: Login Admin */}
          <Link href="/loginAdmin">
            <div className="p-8 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-green-600">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Panel Admin
              </h2>
              <p className="text-gray-600 text-sm">
                Acceso administrativo al sistema
              </p>
            </div>
          </Link>
        </div>

        {/* Información de funcionalidades */}
        <div className="mt-12 p-6 bg-blue-50 rounded-lg max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-3">Funcionalidades:</h3>
          <ul className="text-left text-sm text-gray-700 space-y-2">
            <li className="flex items-center">
              <span className="text-blue-600 mr-2">✓</span>
              Carga de evidencia fotográfica
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2">✓</span>
              Validación de archivos (JPEG, PNG, WebP)
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2">✓</span>
              Preview de imágenes
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2">✓</span>
              Conversión a Base64 para backend
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
