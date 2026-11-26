# Frontend del Consultorio

## Iniciar la aplicación

Desde esta carpeta instala las dependencias y arranca Vite:

```bash
npm install
npm run dev
```

La aplicación se sirve en `http://localhost:3000`. Para que el inicio de sesión y los módulos carguen sus datos, inicia también el backend desde `../backend-api` con `npm run dev`; la API se sirve en `http://localhost:3001/api`.

Si la API está en otra dirección, configúrala con `VITE_API_URL` en un archivo `.env` de esta carpeta.
