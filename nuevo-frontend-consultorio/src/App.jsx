import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import MainLayout from './layout/MainLayout.jsx';
import theme from './theme.js';
import { getStoredUser } from './utils/session.js';

const Login = lazy(() => import('./views/Login.jsx'));
const Inicio = lazy(() => import('./views/inicio/index.jsx'));
const InicioTerapeuta = lazy(() => import('./views/terapeuta/InicioTerapeuta.jsx'));
const Citas = lazy(() => import('./views/modulos/Citas.jsx'));
const Pacientes = lazy(() => import('./views/modulos/Pacientes.jsx'));
const Servicios = lazy(() => import('./views/modulos/Servicios.jsx'));
const Pagos = lazy(() => import('./views/modulos/Pagos.jsx'));
const Multas = lazy(() => import('./views/modulos/Multas.jsx'));
const Facturacion = lazy(() => import('./views/modulos/Facturacion.jsx'));
const Terapeutas = lazy(() => import('./views/modulos/Terapeutas.jsx'));

function RutaProtegida() {
  return getStoredUser() ? <Outlet /> : <Navigate to="/pages/login" replace />;
}

function RutaNoTerapeuta() {
  return getStoredUser()?.rol === 'terapeuta' ? <Navigate to="/" replace /> : <Outlet />;
}

function InicioPorRol() {
  return getStoredUser()?.rol === 'terapeuta' ? <InicioTerapeuta /> : <Inicio />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/pages/login" element={<Login />} />
            <Route path="/" element={<RutaProtegida />}>
              <Route element={<MainLayout />}>
                <Route index element={<InicioPorRol />} />
                <Route element={<RutaNoTerapeuta />}>
                  <Route path="citas" element={<Citas />} />
                  <Route path="pacientes" element={<Pacientes />} />
                  <Route path="servicios" element={<Servicios />} />
                  <Route path="pagos" element={<Pagos />} />
                  <Route path="multas" element={<Multas />} />
                  <Route path="facturacion" element={<Facturacion />} />
                  <Route path="terapeutas" element={<Terapeutas />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
