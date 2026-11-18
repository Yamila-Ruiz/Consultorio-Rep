import { Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';

export default function Facturacion() {
  const navigate = useNavigate();
  return (
    <MainCard
      title="Facturación"
      secondary={
        <Button variant="outlined" size="small" onClick={() => navigate('/')}>
          Volver a Inicio
        </Button>
      }
    >
      <Typography variant="body1">
        Aquí mostraremos los pagos marcados con facturación requerida y los datos fiscales del paciente.
      </Typography>
    </MainCard>
  );
}
