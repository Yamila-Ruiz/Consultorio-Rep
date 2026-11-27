import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import PageCard from '../../components/PageCard.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const nombre = (persona) =>
  `${persona?.nombre || ''} ${persona?.aPaterno || ''} ${persona?.aMaterno || ''}`.trim().toUpperCase();
const horaLocal = (valor) => {
  if (typeof valor !== 'string') return '—';
  const coincidencia = valor.match(/T(\d{2}:\d{2})/) || valor.match(/^(\d{2}:\d{2})/);
  return coincidencia ? coincidencia[1] : valor.slice(0, 5);
};

export default function Multas() {
  const navigate = useNavigate();
  const [multas, setMultas] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState('TODAS');
  const [error, setError] = useState('');

  useEffect(() => {
    let activa = true;
    const cargarMultas = async () => {
      try {
        const respuesta = await fetch(`${API_URL}/multas`);
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudieron cargar las multas.');
        if (!Array.isArray(datos)) throw new Error('El servidor devolvió una lista de multas inválida.');
        if (activa) setMultas(datos);
      } catch (requestError) {
        if (activa) setError(requestError instanceof Error ? requestError.message : 'Error al cargar multas.');
      }
    };
    cargarMultas();
    return () => {
      activa = false;
    };
  }, []);

  const lista = useMemo(
    () => multas.filter((multa) => estadoFiltro === 'TODAS' || multa.estado === estadoFiltro),
    [multas, estadoFiltro]
  );
  const totalPendiente = multas
    .filter((multa) => multa.estado === 'PENDIENTE')
    .reduce((total, multa) => total + Number(multa.monto || 0), 0);

  return (
    <PageCard
      title="Control de multas"
      secondary={
        <Button variant="outlined" onClick={() => navigate('/')}>
          Inicio
        </Button>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="filtro-multas-label">Estado</InputLabel>
          <Select
            labelId="filtro-multas-label"
            label="Estado"
            value={estadoFiltro}
            onChange={(event) => setEstadoFiltro(event.target.value)}
          >
            <MenuItem value="TODAS">Todas</MenuItem>
            <MenuItem value="PENDIENTE">Pendientes</MenuItem>
            <MenuItem value="PAGADA">Pagadas</MenuItem>
            <MenuItem value="CANCELADA">Canceladas</MenuItem>
          </Select>
        </FormControl>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">Total pendiente</Typography>
          <Typography variant="h5" fontWeight={800}>${totalPendiente.toFixed(2)}</Typography>
        </Paper>
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="Registro de multas por inasistencia">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Paciente</TableCell>
              <TableCell>Terapeuta</TableCell>
              <TableCell>Servicio</TableCell>
              <TableCell>Hora</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Monto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.map((multa) => {
              const cita = multa.cita;
              const fecha = cita?.slotdisponibilidad?.fecha;
              return (
                <TableRow key={multa.idMulta}>
                  <TableCell>{fecha ? String(fecha).slice(0, 10) : String(multa.fechaGeneracion).slice(0, 10)}</TableCell>
                  <TableCell>{nombre(cita?.paciente) || '—'}</TableCell>
                  <TableCell>{nombre(cita?.slotdisponibilidad?.terapeuta) || '—'}</TableCell>
                  <TableCell>{cita?.servicio?.nombre || '—'}</TableCell>
                  <TableCell>{horaLocal(cita?.slotdisponibilidad?.inicio)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={multa.estado}
                      color={multa.estado === 'PENDIENTE' ? 'warning' : multa.estado === 'PAGADA' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">${Number(multa.monto || 0).toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
            {!lista.length && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay multas para el estado seleccionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </PageCard>
  );
}
