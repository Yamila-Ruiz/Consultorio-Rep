import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const nombre = (p) => `${p?.nombre || ''} ${p?.aPaterno || ''} ${p?.aMaterno || ''}`.trim().toUpperCase();

// Muestra los datos de facturación registrados por pago; no consulta ni modifica el expediente del paciente.
export default function Facturacion() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${API_URL}/pagos`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'No se pudieron consultar las facturas');
        setPagos(d.filter((p) => p.facturacion));
      })
      .catch((e) => setError(e.message));
  }, []);
  const lista = useMemo(
    () =>
      pagos.filter((p) =>
        `${p.nombreFacturacion} ${p.correoFacturacion} ${nombre(p.cita?.paciente)}`.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [pagos, busqueda]
  );
  return (
    <MainCard
      title="Facturación"
      secondary={
        <Button variant="outlined" onClick={() => navigate('/')}>
          Inicio
        </Button>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Este módulo conserva los datos solicitados para facturación por cada pago. No genera CFDI.
      </Typography>
      <TextField
        fullWidth
        size="small"
        label="Buscar paciente, nombre o correo de facturación"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha de pago</TableCell>
              <TableCell>Paciente</TableCell>
              <TableCell>Nombre de facturación</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Servicio</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.map((p) => (
              <TableRow key={p.idPago}>
                <TableCell>{String(p.fecha).slice(0, 10)}</TableCell>
                <TableCell>{nombre(p.cita?.paciente)}</TableCell>
                <TableCell>{p.nombreFacturacion}</TableCell>
                <TableCell>{p.correoFacturacion}</TableCell>
                <TableCell>{p.cita?.servicio?.nombre}</TableCell>
                <TableCell align="right">${Number(p.monto || 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Chip size="small" label="Datos registrados" color="success" />
                </TableCell>
              </TableRow>
            ))}
            {!lista.length && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay pagos con datos de facturación.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </MainCard>
  );
}
