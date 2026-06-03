# Proyecto USB - Frontend

Frontend del Proyecto USB desarrollado con **Next.js**, TypeScript y Tailwind CSS.

## Requisitos

- Node.js 18+
- npm (o pnpm / yarn)

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Build y producción

```bash
npm run build
npm start
```

## Scripts

| Comando         | Descripción            |
| --------------- | ---------------------- |
| `npm run dev`   | Servidor de desarrollo |
| `npm run build` | Build de producción    |
| `npm start`     | Servidor de producción |
| `npm run lint`  | Ejecutar ESLint        |

## Dependencias principales

Este proyecto usa las siguientes dependencias clave:

- **next**: framework principal para el frontend.
- **react / react-dom**: librería de UI y renderizado.
- **leaflet** y **react-leaflet**: mapa interactivo para selección y visualización de ubicaciones de incidentes.
- **@types/leaflet**: tipos de TypeScript para Leaflet.
- **tailwindcss**: librería de estilos utilitarios.
- **eslint** y **eslint-config-next**: reglas de linting para mantener un código consistente.
- **typescript**: tipado estático para el proyecto.
- **husky**: para ejecutar hooks de Git (por ejemplo, `pre-commit` y `commit-msg`).

---

## Trabajo con el repositorio

### Clonar el repositorio

```bash
git clone https://github.com/LENSESU/FrontendUsb.git
cd FrontendUsb
```

### Crear y usar una rama nueva

Para trabajar en una funcionalidad o corrección sin afectar la rama principal:

1. **Crear una rama nueva** (por ejemplo `feature/mi-funcionalidad` o `fix/correccion`):

   ```bash
   git checkout -b nombre-de-tu-rama
   ```

2. **Trabajar en la rama**: haz commits normalmente — siempre desde la **terminal**, no desde la UI de VSCode:

   ```bash
   git add .
   git commit -m "[ADD]Descripción del cambio"
   ```

   > ⚠️ El hook `commit-msg` rechaza commits hechos desde la UI de VSCode porque no respetan el formato. Usa siempre la terminal.

3. **Subir tu rama al remoto** (para que otros la vean o para abrir un Pull Request):

   ```bash
   git push -u origin nombre-de-tu-rama
   ```

4. **Cambiar entre ramas**:

   ```bash
   git checkout main        # volver a main
   git checkout nombre-de-tu-rama   # volver a tu rama
   ```

5. **Listar ramas**:

   ```bash
   git branch -a
   ```

Cada persona puede crear y manejar sus propias ramas; se recomienda integrar los cambios a `dev` mediante Pull Requests.

## Convención de mensajes de commit

Los mensajes de commit **deben** seguir el siguiente formato:

```bash
git commit -m "[TIPO]Descripción del cambio"
```

Donde `TIPO` puede ser uno de:

- `[ADD]` → cuando agregas nuevo código o funcionalidad.
- `[UPDATE]` → cuando actualizas o mejoras algo existente.
- `[DELETE]` → cuando eliminas código, archivos o funcionalidades.
- `[FIX]` → cuando corriges un bug o comportamiento incorrecto.

### Ejemplos correctos

- `git commit -m "[ADD]Crea página de login"`
- `git commit -m "[UPDATE]Actualiza estilos del header"`
- `git commit -m "[DELETE]Elimina componente no usado"`
- `git commit -m "[FIX]Corrige validación del formulario de registro"`

### Ejemplos incorrectos (serán rechazados por el hook)

- `git commit -m "feat: agrega login"` ← falta el formato `[TIPO]texto`
- `git commit -m "[ADD]"` ← falta descripción luego del tipo
- `git commit -m "ADD agrega login"` ← falta corchetes `[ADD]`

Si el mensaje no respeta este formato, el hook `commit-msg` bloqueará el commit.

---

## Docker

### Arranque estándar con backend local

Desde la raíz de `BackendUsb`, levanta el backend:

```bash
docker compose up -d --build
```

Desde la raíz de `FrontendUsb`, reconstruye el frontend inyectando la URL del backend en tiempo de build:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080 -t frontend-usb:dockerfix .
```

Levanta el contenedor del frontend:

```bash
docker run -d --name frontend-usb-web -p 3000:3000 frontend-usb:dockerfix
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

Si el puerto `3000` está ocupado, elimina el contenedor viejo y vuelve a levantar el frontend:

```bash
docker ps
docker rm -f nombre_contenedor_viejo
docker run -d --name frontend-usb-web -p 3000:3000 frontend-usb:dockerfix
```

Verificación rápida del backend:

```bash
curl -i http://127.0.0.1:8080/health
curl -i -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@usbcali.edu.co","password":"admin123"}'
```

### Diagnóstico rápido

- Si Swagger o `curl` hacen login con `200`, pero el frontend muestra `Sin conexión`, revisa que la imagen del frontend no sea vieja y que haya sido construida con `NEXT_PUBLIC_API_URL`.
- Si en Network aparece una petición a `localhost:3000/api/v1/...`, la URL base de la API quedó mal inyectada en el frontend.
- Si abren el frontend en `0.0.0.0:3000` y falla CORS, usen `localhost:3000` o `127.0.0.1:3000`.
- Si aparece `Not Found` en rutas de photos, esa ruta no está implementada actualmente en el backend.

> En Next.js, las variables públicas `NEXT_PUBLIC_` se inyectan al compilar. En Docker no basta con cambiar `.env.local` si la imagen ya fue construida sin ese valor: hay que reconstruirla con `--build-arg`.

---

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto antes de correr el proyecto:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

> El backend debe estar corriendo (en Docker según su README) para que las llamadas a la API funcionen. Para Docker, usa también el `--build-arg` del apartado anterior, porque esta variable se fija durante el build de Next.js.

---

## Estilos — globals.css

**Toda la estética del proyecto está definida en `src/app/globals.css`.**

- No uses `style={{}}` en los componentes.
- No uses atributos visuales (`stroke`, `fill`, `color`) en los SVGs del JSX.
- No escribas `<style>` dentro de los componentes.
- Usa las clases definidas en `globals.css` y variables CSS como `var(--color-primary)`.

---

## Estructura de carpetas

La estructura ya está creada. Cada quien trabaja **únicamente en su carpeta asignada**. No renombres archivos ni crees carpetas nuevas sin avisar.

```
src/
├── app/
│   ├── globals.css                                      ← estilos globales, NO tocar sin avisar al equipo
│   ├── layout.tsx
│   ├── page.tsx                                         ← pantalla de selección de rol
│   ├── login/
│   │   ├── estudiante/page.tsx                          ← login estudiante OTP
│   │   └── personal/page.tsx                            ← login admin/técnico
│   ├── loginAdmin/page.tsx
│   ├── loginTec/page.tsx
│   ├── register/
│   │   └── estudiante/page.tsx                          ← registro de estudiantes
│   ├── verify-code/page.tsx                             ← verificación OTP
│   └── dashboard/
│       ├── admin/page.tsx
│       ├── tecnico/page.tsx
│       └── estudiante/
│           ├── layout.tsx
│           ├── page.tsx
│           ├── dashboard/
│           │   ├── StudentDashboardHome.tsx
│           │   └── incidente-detalle/page.tsx
│           ├── incidente/page.tsx                       ← reporte de nuevo incidente
│           └── reportes/page.tsx
├── components/
│   ├── AuthProvider.tsx                                 ← contexto de autenticación
│   ├── CodeInput.tsx                                    ← input para código OTP
│   ├── IncidentResponseModal.tsx                        ← modal de respuesta a incidentes
│   ├── IncidentStatusBadge.tsx                          ← badge de estado de incidente
│   ├── InteractiveMap.tsx                               ← mapa interactivo (Leaflet)
│   ├── LocationField.tsx                                ← campo de selección de ubicación en mapa
│   ├── ProtectedDashboard.tsx                           ← wrapper de rutas protegidas
│   ├── StaffLoginForm.tsx                               ← formulario de login para staff
│   └── StudentSidebar.tsx                               ← sidebar del dashboard estudiantil
└── utils/
    ├── auth.ts                                          ← utilidades de autenticación
    ├── incidentStatus.ts                                ← helpers de estado de incidentes
    └── jwt.ts                                           ← manejo de JWT
```

Los archivos se llaman `page.tsx` porque Next.js define las rutas por carpeta, no por nombre de archivo. Si el archivo no se llama exactamente `page.tsx`, la ruta no existe.
