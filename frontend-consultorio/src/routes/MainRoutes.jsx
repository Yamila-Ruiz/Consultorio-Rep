import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';

// vistas del consultorio
const Inicio = Loadable(lazy(() => import('views/inicio')));
const Citas = Loadable(lazy(() => import('views/modulos/Citas')));
const Pacientes = Loadable(lazy(() => import('views/modulos/Pacientes')));
const Servicios = Loadable(lazy(() => import('views/modulos/Servicios')));
const Pagos = Loadable(lazy(() => import('views/modulos/Pagos')));
const Facturacion = Loadable(lazy(() => import('views/modulos/Facturacion')));
const Terapeutas = Loadable(lazy(() => import('views/modulos/Terapeutas')));

function RutaProtegida({ children }) {
  const usuario = localStorage.getItem('usuario');
  if (!usuario) {
    return <Navigate to="/pages/login" replace />;
  }
  return children;
}
// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: (
      <RutaProtegida>
        <MainLayout />
      </RutaProtegida>
  ),
  children: [
    {
      path: '/',
      element: <Inicio />
    },
    {
      path: 'citas',
      element: <Citas />
    },
    {
      path: 'pacientes',
      element: <Pacientes />
    },
    {
      path: 'servicios',
      element: <Servicios />
    },
    {
      path: 'pagos',
      element: <Pagos />
    },
    {
      path: 'facturacion',
      element: <Facturacion />
    },
    {
      path: 'terapeutas',
      element: <Terapeutas />
    }
  ]
};

export default MainRoutes;
