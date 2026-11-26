import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack,
  Typography
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CustomFormControl from '../components/CustomFormControl.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Login() {
  const navigate = useNavigate();
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

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
        body: JSON.stringify({ nombreUsuario: nombreUsuario.trim(), contrasena })
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error || 'Usuario o contraseña incorrectos');
        return;
      }

      localStorage.setItem('usuario', JSON.stringify(datos.usuario));
      navigate('/');
    } catch (requestError) {
      console.error('Error al conectar con el servidor:', requestError);
      setError('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack sx={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%' }}>
        <Box sx={{ m: { xs: 1, sm: 3 } }}>
          <Card
            sx={{
              maxWidth: { xs: 400, lg: 475 },
              m: { xs: 2.5, md: 3 },
              border: 'none',
              '& > *': { flexGrow: 1, flexBasis: '50%' }
            }}
          >
            <Box sx={{ p: { xs: 2, sm: 3, xl: 5 } }}>
              <Stack sx={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Box sx={{ mb: 1, textAlign: 'center' }}>
                  <Typography variant="h2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    Consultorio Eli Ruiz &amp; Cía.
                  </Typography>
                </Box>

                <Stack sx={{ alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Typography variant={downMD ? 'h3' : 'h2'} sx={{ color: 'secondary.main' }}>
                    Iniciar Sesión
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '15px', textAlign: 'center' }}>
                    Ingresa tus credenciales para acceder al sistema
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: 1 }}>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}
                  <CustomFormControl fullWidth>
                    <InputLabel htmlFor="outlined-adornment-usuario-login">Nombre de usuario</InputLabel>
                    <OutlinedInput
                      id="outlined-adornment-usuario-login"
                      fullWidth
                      type="text"
                      value={nombreUsuario}
                      onChange={(event) => setNombreUsuario(event.target.value)}
                      name="nombreUsuario"
                      label="Nombre de usuario"
                      autoFocus
                    />
                  </CustomFormControl>
                  <CustomFormControl fullWidth>
                    <InputLabel htmlFor="outlined-adornment-password-login">Contraseña</InputLabel>
                    <OutlinedInput
                      id="outlined-adornment-password-login"
                      fullWidth
                      type={showPassword ? 'text' : 'password'}
                      value={contrasena}
                      onChange={(event) => setContrasena(event.target.value)}
                      name="contrasena"
                      label="Contraseña"
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="mostrar u ocultar contraseña"
                            onClick={() => setShowPassword((previous) => !previous)}
                            onMouseDown={(event) => event.preventDefault()}
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
                    <Button color="primary" fullWidth size="large" type="submit" variant="contained" disabled={cargando}>
                      {cargando ? 'Ingresando...' : 'Entrar'}
                    </Button>
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}
