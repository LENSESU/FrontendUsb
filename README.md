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

| Comando   | Descripción              |
| --------- | ------------------------ |
| `npm run dev`   | Servidor de desarrollo   |
| `npm run build` | Build de producción      |
| `npm start`     | Servidor de producción   |
| `npm run lint`  | Ejecutar ESLint          |

## Dependencias principales

Este proyecto usa las siguientes dependencias clave:

- **next**: framework principal para el frontend.
- **react / react-dom**: librería de UI y renderizado.
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

- `[ADD]`    → cuando agregas nuevo código o funcionalidad.
- `[UPDATE]` → cuando actualizas o mejoras algo existente.
- `[DELETE]` → cuando eliminas código, archivos o funcionalidades.
- `[FIX]`    → cuando corriges un bug o comportamiento incorrecto.


### Ejemplos correctos

- `git commit -m "[ADD]Crea página de login"`
- `git commit -m "[UPDATE]Actualiza estilos del header"`
- `git commit -m "[DELETE]Elimina componente no usado"`
- `git commit -m "[FIX]Corrige validación del formulario de registro"`


### Ejemplos incorrectos (serán rechazados por el hook)

- `git commit -m "feat: agrega login"`  ← falta el formato `[TIPO]texto`
- `git commit -m "[ADD]"`               ← falta descripción luego del tipo
- `git commit -m "ADD agrega login"`    ← falta corchetes `[ADD]`

Si el mensaje no respeta este formato, el hook `commit-msg` bloqueará el commit.

---

## Docker

### Construir la imagen

```bash
docker build -t frontend-usb .
```

### Ejecutar el contenedor

```bash
docker run -p 3000:3000 frontend-usb
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).


---

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto antes de correr el proyecto:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> El backend debe estar corriendo (en Docker según su README) para que las llamadas a la API funcionen.

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
src/app/
├── globals.css               ← estilos globales, NO tocar sin avisar al equipo
├── layout.tsx
├── page.tsx                  ← pantalla de selección de rol
├── login/
│   ├── admin/page.tsx        ← login admin/técnico
│   ├── estudiante/page.tsx   ← login estudiante OTP
│   └── tecnico/page.tsx
└── dashboard/
    ├── admin/page.tsx
    ├── estudiante/page.tsx
    └── tecnico/page.tsx
    ...
```

Los archivos se llaman `page.tsx` porque Next.js define las rutas por carpeta, no por nombre de archivo. Si el archivo no se llama exactamente `page.tsx`, la ruta no existe.