/**
 * Ejemplos de Integración con Backend para Carga de Evidencia Fotográfica
 * ==========================================================================
 */

// 1. ENVÍO CON BASE64 (Recomendado para imágenes pequeñas)
// ========================================================

export async function submitIncidentWithBase64(
  title: string,
  description: string,
  location: string,
  base64Image: string,
  fileName: string,
  fileType: string
) {
  try {
    const response = await fetch('/api/incidents/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        location,
        evidence: {
          fileName,
          fileType,
          base64: base64Image, // Imagen como Base64
        },
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al enviar el reporte:', error);
    throw error;
  }
}

// 2. ENVÍO CON FormData (Recomendado para imágenes grandes)
// ==========================================================

export async function submitIncidentWithFormData(
  title: string,
  description: string,
  location: string,
  file: File
) {
  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('location', location);
    formData.append('evidence', file); // Archivo directamente
    formData.append('timestamp', new Date().toISOString());

    const response = await fetch('/api/incidents/report', {
      method: 'POST',
      body: formData, // No incluir Content-Type, el navegador lo ajusta automáticamente
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al enviar el reporte:', error);
    throw error;
  }
}

// 3. USO EN EL COMPONENTE (Ejemplo de actualización)
// ==================================================

/*
En IncidentReportForm.tsx, en el handleSubmit:

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setErrorMessage('');

  // Validaciones...

  setSubmitting(true);

  try {
    const result = await submitIncidentWithBase64(
      formData.title,
      formData.description,
      formData.location,
      formData.photo!.base64,
      formData.photo!.fileName,
      formData.photo!.fileType
    );

    console.log('Reporte enviado:', result);
    setSuccess(true);
    // Limpiar formulario...
  } catch (error) {
    setErrorMessage('Error al enviar el reporte');
  } finally {
    setSubmitting(false);
  }
};
*/

// 4. ESTRUCTURA ESPERADA EN EL BACKEND (Node.js/Express ejemplo)
// ===============================================================

/*
router.post('/incidents/report', async (req, res) => {
  try {
    const { title, description, location, evidence, timestamp } = req.body;

    // Validar datos
    if (!title || !description || !location || !evidence) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Decodificar Base64 a Buffer
    const base64Data = evidence.base64.split(',')[1]; // Remover data:image/png;base64,
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Guardar imagen en servidor o nube
    const fileName = `incident_${Date.now()}_${evidence.fileName}`;
    const imagePath = path.join(__dirname, 'uploads', fileName);
    
    fs.writeFileSync(imagePath, imageBuffer);

    // Guardar información en BD
    const incident = await Incident.create({
      title,
      description,
      location,
      evidenceFileName: fileName,
      evidencePath: imagePath,
      fileType: evidence.fileType,
      fileSize: evidence.fileSize,
      createdAt: timestamp,
    });

    res.json({
      success: true,
      incidentId: incident.id,
      message: 'Reporte registrado correctamente',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar el reporte' });
  }
});
*/

// 5. ESTRUCTURA DE RESPUESTA ESPERADA
// ===================================

interface ReportResponse {
  success: boolean;
  incidentId: string;
  message: string;
  evidenceUrl?: string; // URL si la imagen se guaró en cloud
}

// 6. MANEJO DE ERRORES COMUNES
// ============================

export const ErrorMessages = {
  INVALID_FORMAT: 'Formato de archivo no válido',
  FILE_TOO_LARGE: 'El archivo excede el tamaño máximo permitido',
  MISSING_FIELDS: 'Faltan campos obligatorios',
  UPLOAD_FAILED: 'Error al cargar la imagen',
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde',
};

// 7. COMPRESIÓN DE IMÁGENES (Opcional, para mejorar rendimiento)
// =============================================================

export async function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Limitar dimensiones máximas
      let { width, height } = img;
      const maxWidth = 1920;
      const maxHeight = 1080;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      // Si falla la compresión, devolver el archivo original
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
}
