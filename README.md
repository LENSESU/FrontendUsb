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
   git commit -m "Descripción del cambio"
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
