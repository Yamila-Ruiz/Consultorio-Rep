import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { IconCalendar, IconUsers, IconHeartbeat, IconCash, IconFileInvoice, IconUserCheck } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

const ROLES_SISTEMA = ['RECEPCIONISTA', 'TERAPEUTA'];

const modulos = [
  { titulo: 'CITAS', ruta: '/citas', icono: IconCalendar },
  { titulo: 'PACIENTES', ruta: '/pacientes', icono: IconUsers },
  { titulo: 'SERVICIOS', ruta: '/servicios', icono: IconHeartbeat },
  { titulo: 'PAGOS', ruta: '/pagos', icono: IconCash },
  { titulo: 'FACTURACIÓN', ruta: '/facturacion', icono: IconFileInvoice },
  { titulo: 'TERAPEUTAS', ruta: '/terapeutas', icono: IconUserCheck }
];

export default function Inicio() {
  const navigate = useNavigate();

  const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || 'null');
  const rolDetectado = (usuarioGuardado?.rol || '').trim().toUpperCase();
  const rol = ROLES_SISTEMA.includes(rolDetectado) ? rolDetectado : '';

  const primerNombre = (usuarioGuardado?.perfil?.nombre || '').trim().split(/\s+/)[0]?.toUpperCase();
  const nombreUsuario = (usuarioGuardado?.nombreUsuario || '').trim().toUpperCase();

  let nombreMostrar = 'SIN SESIÓN';
  if (rol) {
    if (primerNombre) {
      nombreMostrar = `${rol} ${primerNombre}`;
    } else if (nombreUsuario.startsWith(`${rol} `)) {
      nombreMostrar = nombreUsuario;
    } else if (nombreUsuario) {
      nombreMostrar = `${rol} ${nombreUsuario}`;
    } else {
      nombreMostrar = rol;
    }
  } else if (nombreUsuario) {
    nombreMostrar = nombreUsuario;
  }

  return (
    <MainCard>
      <Typography variant="h4" color="text.secondary" sx={{ mb: 4 }}>
        USUARIO: <strong>{nombreMostrar}</strong>
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
          },
          gap: 3,
          py: 2
        }}
      >
        {modulos.map((mod) => {
          const Icono = mod.icono;
          return (
            <Button
              key={mod.ruta}
              variant="outlined"
              color="primary"
              onClick={() => navigate(mod.ruta)}
              startIcon={<Icono size={22} />}
              sx={{
                py: 2.5,
                px: 3,
                borderRadius: '50px',
                borderWidth: 2,
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                bgcolor: 'primary.light',
                '&:hover': {
                  borderWidth: 2,
                  bgcolor: 'primary.main',
                  color: '#fff'
                }
              }}
            >
              {mod.titulo}
            </Button>
          );
        })}
      </Box>
    </MainCard>
  );
}
