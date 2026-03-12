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

## Autenticación (login/logout)

Este proyecto incluye una implementación simple de autenticación de frontend
para la historia de usuario de login. Se utiliza un contexto React que guarda
un flag `isLoggedIn` en `localStorage`.

1. Abre `/loginAdmin` para ingresar un correo y contraseña cualquiera.
2. Si el login tiene éxito, serás redirigido a la página principal `/`.
3. Un encabezado aparece con un botón **Cerrar sesión** cuando estás autenticado.
4. Pulsar el botón elimina la sesión y te lleva de nuevo a `/loginAdmin`.

Puedes reemplazar esta lógica de ejemplo por llamadas reales a tu API cuando
desarrolles el backend.

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
git clone https://github.com/Chologalactico/FrontendUsb.git
cd FRONTEND
```


### Crear y usar una rama nueva

Para trabajar en una funcionalidad o corrección sin afectar la rama principal:

1. **Crear una rama nueva** (por ejemplo `feature/mi-funcionalidad` o `fix/correccion`):

   ```bash
   git checkout -b nombre-de-tu-rama
   ```

2. **Trabajar en la rama**: haz commits normalmente.

   ```bash
   git add .
   git commit -m "[ADD]Descripción del cambio"
   ```

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

Cada persona puede crear y manejar sus propias ramas; se recomienda integrar los cambios a `main` mediante Pull Requests o Merge Requests.

> ⚠️ Al trabajar en nuevas funcionalidades asegúrate de: instalar dependencias con `npm install` y seguir la convención de mensajes de commit descrita más abajo antes de hacer push.

## Convención de mensajes de commit

Los mensajes de commit **deben** seguir el siguiente formato:

```bash
git commit -m "[TIPO]Descripción del cambio"
```

Donde `TIPO` puede ser uno de:

- `[ADD]`   → cuando agregas nuevo código o funcionalidad.
- `[UPDATE]` → cuando actualizas o mejoras algo existente.
- `[DELETE]` → cuando eliminas código, archivos o funcionalidades.
- `[FIX]`   → cuando corriges un bug o comportamiento incorrecto.


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
