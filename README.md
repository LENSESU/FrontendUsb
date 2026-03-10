# Proyecto USB - Frontend

Frontend del Proyecto USB desarrollado con **Next.js**, TypeScript y Tailwind CSS.

## Requisitos

- Node.js 18+
- npm (o pnpm / yarn)

---

## Cómo probar la rama de login

### 1. Clonar el repositorio y cambiar a la rama

```bash
git clone https://github.com/LENSESU/FrontendUsb.git
cd FrontendUsb
git checkout feature/dev
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> El backend debe estar corriendo (en Docker según su README) para que las llamadas a la API funcionen.

### 4. Correr el proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Scripts

| Comando         | Descripción              |
| --------------- | ------------------------ |
| `npm run dev`   | Servidor de desarrollo   |
| `npm run build` | Build de producción      |
| `npm start`     | Servidor de producción   |
| `npm run lint`  | Ejecutar ESLint          |

## Dependencias principales

- **next**: framework principal para el frontend.
- **react / react-dom**: librería de UI y renderizado.
- **tailwindcss**: librería de estilos utilitarios.
- **eslint** y **eslint-config-next**: reglas de linting para mantener un código consistente.
- **typescript**: tipado estático para el proyecto.
- **husky**: para ejecutar hooks de Git (`pre-commit` y `commit-msg`).

---

## Trabajo con el repositorio

### Crear y usar una rama nueva

1. **Crear una rama nueva**:

   ```bash
   git checkout -b feature/mi-funcionalidad
   ```

2. **Hacer commits** — siempre desde la **terminal**, no desde la UI de VSCode:

   ```bash
   git add src/app/mi-archivo.tsx
   git commit -m "[ADD]Descripción del cambio"
   ```

   > ⚠️ El hook `commit-msg` rechaza commits hechos desde la UI de VSCode porque no respetan el formato. Usa siempre la terminal.

3. **Subir la rama al remoto**:

   ```bash
   git push -u origin feature/mi-funcionalidad
   ```

4. **Cambiar entre ramas**:

   ```bash
   git checkout main
   git checkout feature/mi-funcionalidad
   ```

5. **Listar ramas**:

   ```bash
   git branch -a
   ```

Se recomienda integrar cambios a `main` mediante Pull Requests.

---

## Convención de mensajes de commit

Los mensajes **deben** seguir este formato exacto:

```bash
git commit -m "[TIPO]Descripción del cambio"
```

| Tipo       | Cuándo usarlo                               |
| ---------- | ------------------------------------------- |
| `[ADD]`    | Agregas nuevo código o funcionalidad        |
| `[UPDATE]` | Actualizas o mejoras algo existente         |
| `[DELETE]` | Eliminas código, archivos o funcionalidades |
| `[FIX]`    | Corriges un bug o comportamiento incorrecto |

### Ejemplos correctos

```bash
git commit -m "[ADD]Crea página de login"
git commit -m "[UPDATE]Actualiza estilos del header"
git commit -m "[DELETE]Elimina componente no usado"
git commit -m "[FIX]Corrige validación del formulario de registro"
```

### Ejemplos incorrectos (el hook los bloqueará)

```bash
git commit -m "feat: agrega login"     # falta el formato [TIPO]
git commit -m "[ADD]"                  # falta descripción
git commit -m "ADD agrega login"       # faltan los corchetes
```

---

## Estilos — globals.css

**Toda la estética del proyecto está definida en `src/app/globals.css`.**

- No uses `style={{}}` en los componentes.
- No uses atributos visuales (`stroke`, `fill`, `color`) en los SVGs del JSX.
- No escribas `<style>` dentro de los componentes.
- Usa las clases definidas en `globals.css` y variables CSS como `var(--color-primary)`.