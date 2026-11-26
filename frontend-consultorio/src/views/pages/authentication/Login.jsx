import useMediaQuery from '@mui/material/useMediaQuery';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import AuthWrapper1 from './AuthWrapper1';
import AuthCardWrapper from './AuthCardWrapper';
import AuthLogin from '../auth-forms/AuthLogin';

// ================================|| LOGIN CONSULTORIO ||================================ //

export default function Login() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));

  return (
      <AuthWrapper1>
        <Stack sx={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Box sx={{ m: { xs: 1, sm: 3 } }}>
            <AuthCardWrapper>
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

                <Box sx={{ width: 1 }}>
                  <AuthLogin />
                </Box>
              </Stack>
            </AuthCardWrapper>
          </Box>
        </Stack>
      </AuthWrapper1>
  );
}
