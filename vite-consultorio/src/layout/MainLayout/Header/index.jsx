import { useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// project imports
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

// assets
import { IconMenu2, IconLogout } from '@tabler/icons-react';

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

export default function Header() {
    const theme = useTheme();
    const navigate = useNavigate();

    const { menuMaster } = useGetMenuMaster();
    const drawerOpen = menuMaster.isDashboardDrawerOpened;

    const handleCerrarSesion = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/pages/login');
    };

    return (
        <>
            {/* botón de menú lateral y título del consultorio */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                    variant="rounded"
                    sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.mediumAvatar,
                        overflow: 'hidden',
                        transition: 'all .2s ease-in-out',
                        cursor: 'pointer',
                        color: theme.vars.palette.secondary.dark,
                        background: theme.vars.palette.secondary.light,
                        '&:hover': {
                            color: theme.vars.palette.secondary.light,
                            background: theme.vars.palette.secondary.dark
                        }
                    }}
                    onClick={() => handlerDrawerOpen(!drawerOpen)}
                >
                    <IconMenu2 stroke={1.5} size="20px" />
                </Avatar>

                <Typography
                    variant="h3"
                    onClick={() => navigate('/')}
                    sx={{
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: theme.vars.palette.primary.main,
                        whiteSpace: 'nowrap',
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}
                >
                    Consultorio Eli Ruiz &amp; Cía.
                </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* botón cerrar sesión */}
            <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<IconLogout size={18} />}
                onClick={handleCerrarSesion}
                sx={{
                    fontWeight: 600,
                    borderRadius: '8px',
                    textTransform: 'uppercase'
                }}
            >
                Cerrar sesión
            </Button>
        </>
    );
}
