# 📸 Sistema de Carga de Evidencia Fotográfica

## Descripción

Sistema completo para cargar y procesar evidencia fotográfica de incidencias. Incluye validación, preview, compresión y conversión a Base64 para envío al backend.

## Componentes Creados

### 1. `PhotoEvidenceUploader.tsx`
Componente reutilizable para cargar fotos con:
- Drag and drop
- Selección de archivo
- Preview de imagen
- Validación de formato y tamaño
- Conversión a Base64
- Manejo de errores

**Props:**
```typescript
interface PhotoEvidenceUploaderProps {
  onPhotoSubmit?: (photoData: PhotoData) => void; // Callback cuando se carga foto
  maxFileSize?: number; // Tamaño máximo en MB (default: 5)
  acceptedFormats?: string[]; // Formatos MIME aceptados
}
```

**Evento:**
```typescript
interface PhotoData {
  file: File;
  preview: string; // URL para preview
  base64: string; // Cadena Base64 para backend
  fileName: string;
  fileSize: number;
  fileType: string;
}
```

### 2. `IncidentReportForm.tsx`
Formulario completo de reporte de incidencias con:
- Campos de texto (título, descripción, ubicación)
- Integración del cargador de fotos
- Validación de formulario
- Manejo de errores
- Mensaje de éxito

### 3. `incidentAPI.ts`
Utilidades para conectar con el backend:
- Funciones para envío con Base64
- Funciones para envío con FormData
- Ejemplos de backend (Node.js/Express)
- Compresión de imágenes
- Manejo de errores

### 4. Página: `/incident-report`
Página accesible en `http://localhost:3000/incident-report`

## Características

✅ **Validación de Archivos**
- Solo acepta: JPEG, PNG, WebP
- Límite de tamaño: 5MB (configurable)

✅ **Interfaz Amigable**
- Drag & drop
- Preview instantáneo
- Indicadores visuales
- Mensajes de error claros

✅ **Preparación para Backend**
- Conversión a Base64
- Metadata del archivo
- Timestamp de envío

✅ **Responsive Design**
- Tailwind CSS
- Mobile-friendly
- Accesible

## Uso

### Básico - Solo Cargador de Fotos

```tsx
import PhotoEvidenceUploader from '@/components/PhotoEvidenceUploader';

export default function MyComponent() {
  const handlePhotoSubmit = (photoData) => {
    console.log('Foto cargada:', photoData);
    // Enviar al backend usar photoData.base64
  };

  return (
    <PhotoEvidenceUploader
      onPhotoSubmit={handlePhotoSubmit}
      maxFileSize={5}
    />
  );
}
```

### Completo - Formulario de Reporte

```tsx
import IncidentReportForm from '@/components/IncidentReportForm';

export default function Page() {
  return <IncidentReportForm />;
}
```

## Integración con Backend

### Opción 1: Con Base64 (Recomendado para imágenes pequeñas)

```typescript
import { submitIncidentWithBase64 } from '@/components/incidentAPI';

const result = await submitIncidentWithBase64(
  'Título',
  'Descripción',
  'Ubicación',
  photoData.base64,
  photoData.fileName,
  photoData.fileType
);
```

### Opción 2: Con FormData (Recomendado para imágenes grandes)

```typescript
import { submitIncidentWithFormData } from '@/components/incidentAPI';

const result = await submitIncidentWithFormData(
  'Título',
  'Descripción',
  'Ubicación',
  photoFile
);
```

### Backend (Node.js/Express - Ejemplo)

```javascript
router.post('/incidents/report', async (req, res) => {
  const { title, description, location, evidence } = req.body;

  // Decodificar Base64
  const base64Data = evidence.base64.split(',')[1];
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Guardar archivo
  const fileName = `incident_${Date.now()}_${evidence.fileName}`;
  fs.writeFileSync(`uploads/${fileName}`, imageBuffer);

  // Guardar en BD
  const incident = await Incident.create({
    title,
    description,
    location,
    evidenceFile: fileName,
  });

  res.json({ success: true, incidentId: incident.id });
});
```

## Estructura de Datos Enviados

```json
{
  "title": "Daño en la puerta",
  "description": "Hay un agujero en la puerta del piso 3",
  "location": "Piso 3, Oficina 301",
  "evidence": {
    "fileName": "foto_incidente.jpg",
    "fileType": "image/jpeg",
    "fileSize": 2048576,
    "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  },
  "timestamp": "2026-03-19T10:30:00.000Z"
}
```

## Personalización

### Cambiar FormatsAceptados

```tsx
<PhotoEvidenceUploader
  acceptedFormats={['image/jpeg', 'image/png']}
/>
```

### Cambiar Tamaño Máximo

```tsx
<PhotoEvidenceUploader
  maxFileSize={10} // 10 MB
/>
```

### Usar Compresión de Imágenes

```typescript
import { compressImage } from '@/components/incidentAPI';

const compressed = await compressImage(file, 0.7); // 70% de calidad
```

## Validaciones Incluidas

- ✓ Formato de archivo válido
- ✓ Tamaño no supera límite
- ✓ Todos los campos requeridos
- ✓ Foto adjunta antes de enviar

## Errores Comunes

| Error | Solución |
|-------|----------|
| "Formato no válido" | Asegúrate de usar JPEG, PNG o WebP |
| "Archivo muy grande" | Comprime la imagen o aumenta el límite |
| "La foto es obligatoria" | Adjunta una foto antes de enviar |

## Próximos Pasos

1. Conectar endpoint del backend en `incidentAPI.ts`
2. Implementar almacenamiento de imágenes (local, AWS S3, etc.)
3. Agregar modal de confirmación antes de enviar
4. Implementar historial de reportes
5. Agregar descarga de reportes generados

## Archivos Creados

```
src/
├── components/
│   ├── PhotoEvidenceUploader.tsx     (Componente de carga)
│   ├── IncidentReportForm.tsx        (Formulario completo)
│   └── incidentAPI.ts               (Funciones para backend)
└── app/
    ├── page.tsx                      (Actualizado con enlaces)
    └── incident-report/
        └── page.tsx                  (Página del formulario)
```

## Notas Importantes

- El Base64 puede ser bastante grande para imágenes grandes (3-4x el tamaño original)
- Se recomienda comprimir imágenes antes de enviar para optimizar ancho de banda
- El backend debe decodificar el Base64 antes de guardar
- Implementar comprobación de virus en el servidor

---

**Estado:** ✅ Funcionalidad completamente implementada y lista para usar.
