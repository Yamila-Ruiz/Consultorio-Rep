import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Chip, Stack } from '@mui/material';
import {
    IconCalendar,
    IconUsers,
    IconHeartbeat,
    IconCash,
    IconFileInvoice,
    IconUserCheck
} from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

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

    // Más adelante tomará el nombre real desde el Login
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || 'null');
    const nombreMostrar =
        usuarioGuardado?.perfil?.nombreCompleto ||
        usuarioGuardado?.nombreUsuario ||
        'Recepcionista Fulana';

    return (
        <MainCard title="Inicio">
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1}
                sx={{ mb: 4 }}
            >
                <Typography variant="h4" color="text.secondary">
                    USUARIO: <strong>{nombreMostrar}</strong>
                </Typography>
                <Chip
                    label={usuarioGuardado?.rol ? usuarioGuardado.rol.toUpperCase() : 'SESIÓN ACTIVA'}
                    color="primary"
                    variant="outlined"
                    size="small"
                />
            </Stack>

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