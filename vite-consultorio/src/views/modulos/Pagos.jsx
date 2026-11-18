import { Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';

export default function Pagos() {
  const navigate = useNavigate();
  return (
    <MainCard
      title="Registro de Pagos"
      secondary={
        <Button variant="outlined" size="small" onClick={() => navigate('/')}>
          Volver a Inicio
        </Button>
      }
    >
      <Typography variant="body1">Aquí conectaremos el historial y registro de pagos de citas.</Typography>
    </MainCard>
  );
}
