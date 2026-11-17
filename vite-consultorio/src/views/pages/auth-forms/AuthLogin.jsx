import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Box from '@mui/material/Box';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import CustomFormControl from 'ui-component/extended/Form/CustomFormControl';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ===============================|| LOGIN API ||=============================== //

export default function AuthLogin() {
    const navigate = useNavigate();

    const [nombreUsuario, setNombreUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleClickShowPassword = () => {
        setShowPassword((prev) => !prev);
    };

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!nombreUsuario.trim() || !contrasena.trim()) {
            setError('Debes ingresar usuario y contraseña');
            return;
        }

        setCargando(true);
        try {
            const respuesta = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombreUsuario: nombreUsuario.trim(),
                    contrasena
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                setError(datos.error || 'Usuario o contraseña incorrectos');
                return;
            }

            // Guardamos el usuario autenticado (con su rol y perfil) y entramos a Inicio
            localStorage.setItem('usuario', JSON.stringify(datos.usuario));
            navigate('/');
        } catch (err) {
            console.error('Error al conectar con el servidor:', err);
            setError('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <CustomFormControl fullWidth>
                <InputLabel htmlFor="outlined-adornment-usuario-login">Nombre de usuario</InputLabel>
                <OutlinedInput
                    id="outlined-adornment-usuario-login"
                    type="text"
                    value={nombreUsuario}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    name="nombreUsuario"
                    label="Nombre de usuario"
                    autoFocus
                />
            </CustomFormControl>

            <CustomFormControl fullWidth>
                <InputLabel htmlFor="outlined-adornment-password-login">Contraseña</InputLabel>
                <OutlinedInput
                    id="outlined-adornment-password-login"
                    type={showPassword ? 'text' : 'password'}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    name="contrasena"
                    label="Contraseña"
                    endAdornment={
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="mostrar u ocultar contraseña"
                                onClick={handleClickShowPassword}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                                size="large"
                            >
                                {showPassword ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                        </InputAdornment>
                    }
                />
            </CustomFormControl>

            <Box sx={{ mt: 3 }}>
                <AnimateButton>
                    <Button
                        color="primary"
                        fullWidth
                        size="large"
                        type="submit"
                        variant="contained"
                        disabled={cargando}
                    >
                        {cargando ? 'Ingresando...' : 'Entrar'}
                    </Button>
                </AnimateButton>
            </Box>
        </Box>
    );
}