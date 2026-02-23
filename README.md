<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1be1c016-89fc-4b0c-8d0e-32ef802e8757

## Run Locally

**Prerequisites:**  Node.js


1. Instala las dependencias:
   `npm install`
2. Inicia el backend (opcional para persistencia local):
   `npm run server`
3. En otra terminal, inicia el frontend:
   `npm run dev`

O ejecuta ambos simultáneamente:
`npm run dev:all`

## Despliegue Estático (GitHub Pages / Netlify)

Esta aplicación es compatible con hosting estático. Si el backend no está disponible, la aplicación entrará automáticamente en **Modo Estático**, guardando todos los proyectos, credenciales e historial en el **LocalStorage** de tu navegador.

### GitHub Pages
El despliegue es **automático**. Cada vez que hagas un `push` a la rama `main`, GitHub Actions construirá la aplicación y la desplegará.

**Configuración requerida en GitHub:**
1. Ve a **Settings** > **Pages** en tu repositorio.
2. En la sección **Build and deployment** > **Source**, selecciona **GitHub Actions**.

### Netlify
1. Conecta tu repositorio a Netlify.
2. Comando de construcción: `npm run build`.
3. Directorio de publicación: `dist`.
